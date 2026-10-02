/**
 * Zyrbit — Connect Money: Statement Parser Service
 *
 * Production-quality parser for Paytm UPI & Wallet transaction exports.
 * Supports:
 * - Paytm Excel (.xlsx, .xls)
 * - Paytm CSV (.csv)
 * - Detects header offsets, serial Excel dates, split Debit/Credit & single Amount columns.
 * - Filters failed / cancelled transactions.
 * - Rejects PDF with clear, constructive explanation.
 */

import * as XLSX from 'xlsx';

/**
 * Normalizes text for matching column names.
 * @param {any} val
 * @returns {string}
 */
function cleanKey(val) {
  if (val == null) return '';
  return String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Converts an Excel serial date number or date string into a standardized ISO date & time.
 * @param {any} raw
 * @returns {{ date: string, time: string, iso: string } | null}
 */
export function parseStatementDate(raw) {
  if (raw == null || raw === '') return null;

  // Case 1: Excel serial date number
  if (typeof raw === 'number' && raw > 30000 && raw < 70000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(raw);
      if (parsed) {
        const y = String(parsed.y).padStart(4, '20');
        const m = String(parsed.m).padStart(2, '0');
        const d = String(parsed.d).padStart(2, '0');
        const H = String(parsed.H || 0).padStart(2, '0');
        const M = String(parsed.M || 0).padStart(2, '0');
        const S = String(Math.floor(parsed.S || 0)).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const timeStr = `${H}:${M}:${S}`;
        return { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
      }
    } catch {
      // fallback
    }
  }

  // Case 2: String date
  const str = String(raw).trim();
  if (!str) return null;

  // "DD/MM/YYYY HH:mm:ss" or "DD-MM-YYYY HH:mm" or "YYYY-MM-DD HH:mm:ss"
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    // Handle MM/DD if month > 12
    if (day > 12 && month <= 12) {
      // standard DD/MM
    } else if (month > 12 && day <= 12) {
      // swap to valid month
      const tmp = day; day = month; month = tmp;
    }

    const H = String(dmyMatch[4] || '12').padStart(2, '0');
    const M = String(dmyMatch[5] || '00').padStart(2, '0');
    const S = String(dmyMatch[6] || '00').padStart(2, '0');
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const timeStr = `${H}:${M}:${S}`;
    return { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
  }

  // "YYYY-MM-DD"
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
    const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
    const H = String(ymdMatch[4] || '12').padStart(2, '0');
    const M = String(ymdMatch[5] || '00').padStart(2, '0');
    const S = String(ymdMatch[6] || '00').padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${H}:${M}:${S}`;
    return { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
  }

  // Native parse fallback
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const H = String(d.getHours()).padStart(2, '0');
    const M = String(d.getMinutes()).padStart(2, '0');
    const S = String(d.getSeconds()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const timeStr = `${H}:${M}:${S}`;
    return { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
  }

  return null;
}

/**
 * Extracts numeric value from a string/number.
 * @param {any} val
 * @returns {number|null}
 */
export function parseNumericAmount(val) {
  if (val == null) return null;
  if (typeof val === 'number') {
    return isFinite(val) ? Math.abs(val) : null;
  }
  const clean = String(val)
    .replace(/[₹$,\s]/g, '')
    .replace(/^(?:cr|dr|inr|rs\.?)/i, '')
    .trim();
  const num = parseFloat(clean);
  return !isNaN(num) && isFinite(num) ? Math.abs(num) : null;
}

/**
 * Parses raw Paytm statement data (ArrayBuffer, Uint8Array, or string).
 *
 * @param {ArrayBuffer|Uint8Array|string} fileData - Binary or text file content
 * @param {string} [filename='statement.xlsx'] - Filename for format detection
 * @returns {Promise<{
 *   success: boolean,
 *   rawTransactions?: Array<Object>,
 *   metadata?: {
 *     source: 'paytm',
 *     filename: string,
 *     periodStart?: string,
 *     periodEnd?: string,
 *     sheetName?: string,
 *     totalRowsParsed: number,
 *   },
 *   error?: string,
 * }>}
 */
export async function parsePaytmStatement(fileData, filename = 'statement.xlsx') {
  if (!fileData) {
    return { success: false, error: 'No statement file provided.' };
  }

  const lowerName = filename.toLowerCase();

  // Reject PDF gracefully with transparent explanation
  if (lowerName.endsWith('.pdf')) {
    return {
      success: false,
      error: 'Paytm PDF statements cannot be parsed reliably due to layout variability and password encryption. Please download and upload the statement in Excel (.xlsx/.xls) or CSV format from the Paytm app for 100% precision.',
    };
  }

  try {
    let workbook;
    if (typeof fileData === 'string' && (lowerName.endsWith('.csv') || !lowerName.includes('.'))) {
      workbook = XLSX.read(fileData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileData, { type: 'array' });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'Statement file is empty or corrupted.' };
    }

    // Pick first valid sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return { success: false, error: 'Statement contains no readable worksheets.' };
    }

    // Convert sheet to array of rows (header: 1 generates 2D array of raw cell values)
    const rawMatrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!rawMatrix || rawMatrix.length === 0) {
      return {
        success: true,
        rawTransactions: [],
        metadata: {
          source: 'paytm',
          filename,
          sheetName,
          totalRowsParsed: 0,
        },
      };
    }

    // Identify header row index by searching for key financial columns
    let headerRowIdx = -1;
    let colMap = {};

    for (let i = 0; i < Math.min(rawMatrix.length, 30); i++) {
      const row = rawMatrix[i];
      if (!Array.isArray(row)) continue;

      const cleaned = row.map(cleanKey);
      const hasDate = cleaned.some(k => k.includes('date') || k === 'time' || k === 'datetime');
      const hasAmount = cleaned.some(k => k.includes('amount') || k.includes('debit') || k.includes('credit') || k.includes('paid'));
      const hasDetails = cleaned.some(k => k.includes('detail') || k.includes('description') || k.includes('narration') || k.includes('activity') || k.includes('remarks') || k.includes('particulars'));

      if (hasDate && (hasAmount || hasDetails)) {
        headerRowIdx = i;
        // Build column index mapping
        row.forEach((colName, cIdx) => {
          const k = cleanKey(colName);
          if (!k) return;
          if (k.includes('date') && !colMap.date) colMap.date = cIdx;
          if ((k === 'time' || k.includes('time')) && !colMap.time) colMap.time = cIdx;
          if ((k.includes('detail') || k.includes('description') || k.includes('activity') || k.includes('narration') || k.includes('particulars')) && !colMap.details) {
            colMap.details = cIdx;
          }
          if ((k.includes('txnid') || k.includes('orderid') || k.includes('refno') || k.includes('upiref') || k.includes('wallettxnid') || k.includes('referenceno') || k.includes('utr')) && !colMap.txnId) {
            colMap.txnId = cIdx;
          }
          if (k.includes('debit') && !colMap.debit) colMap.debit = cIdx;
          if (k.includes('credit') && !colMap.credit) colMap.credit = cIdx;
          if ((k === 'amount' || k.includes('amount') || k.includes('txnammount')) && !colMap.amount) colMap.amount = cIdx;
          if ((k.includes('status') || k.includes('txnstatus')) && !colMap.status) colMap.status = cIdx;
          if ((k.includes('type') || k.includes('dr/cr') || k.includes('drcr')) && !colMap.type) colMap.type = cIdx;
          if ((k.includes('sourc') || k.includes('destination') || k.includes('merchant') || k.includes('beneficiary')) && !colMap.counterparty) {
            colMap.counterparty = cIdx;
          }
        });
        break;
      }
    }

    if (headerRowIdx === -1) {
      return {
        success: false,
        error: 'Could not recognize standard Paytm statement header columns. Please check the uploaded file.',
      };
    }

    // Process data rows
    const rawTransactions = [];
    let minDate = null;
    let maxDate = null;

    for (let r = headerRowIdx + 1; r < rawMatrix.length; r++) {
      const row = rawMatrix[r];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Extract date
      const rawDateVal = colMap.date != null ? row[colMap.date] : null;
      const parsedDate = parseStatementDate(rawDateVal);
      if (!parsedDate) continue; // Skip rows without valid date

      // Check transaction status (ignore failed/cancelled transactions)
      const rawStatus = colMap.status != null ? String(row[colMap.status] || '').toLowerCase() : '';
      if (rawStatus.includes('fail') || rawStatus.includes('cancel') || rawStatus.includes('declined') || rawStatus.includes('refunded to source')) {
        continue;
      }

      // Extract Amount & Direction
      let amount = null;
      let direction = 'out'; // default out for expenses

      const debitVal = colMap.debit != null ? parseNumericAmount(row[colMap.debit]) : null;
      const creditVal = colMap.credit != null ? parseNumericAmount(row[colMap.credit]) : null;
      const genericAmt = colMap.amount != null ? parseNumericAmount(row[colMap.amount]) : null;

      if (debitVal && debitVal > 0) {
        amount = debitVal;
        direction = 'out';
      } else if (creditVal && creditVal > 0) {
        amount = creditVal;
        direction = 'in';
      } else if (genericAmt && genericAmt > 0) {
        amount = genericAmt;
        // Determine direction from raw amount sign or Type column
        const rawAmtStr = String(row[colMap.amount]);
        const typeStr = colMap.type != null ? String(row[colMap.type] || '').toLowerCase() : '';
        const detailsStr = colMap.details != null ? String(row[colMap.details] || '').toLowerCase() : '';

        if (rawAmtStr.includes('-') || typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('paid')) {
          direction = 'out';
        } else if (rawAmtStr.includes('+') || typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('received')) {
          direction = 'in';
        } else if (detailsStr.includes('received from') || detailsStr.includes('cashback') || detailsStr.includes('refund')) {
          direction = 'in';
        } else {
          direction = 'out';
        }
      }

      if (!amount || amount <= 0) continue;

      // Description & Counterparty
      const rawDescription = colMap.details != null ? String(row[colMap.details] || '').trim() : '';
      const explicitCounterparty = colMap.counterparty != null ? String(row[colMap.counterparty] || '').trim() : '';
      const sourceTxnId = colMap.txnId != null ? String(row[colMap.txnId] || '').trim() : null;

      // Track period dates
      if (!minDate || parsedDate.date < minDate) minDate = parsedDate.date;
      if (!maxDate || parsedDate.date > maxDate) maxDate = parsedDate.date;

      rawTransactions.push({
        source: 'paytm',
        sourceTransactionId: sourceTxnId || null,
        occurredAt: parsedDate.iso,
        date: parsedDate.date,
        time: parsedDate.time,
        amount,
        direction,
        explicitCounterparty,
        rawDescription,
        paymentMethod: 'upi',
        status: 'success',
      });
    }

    return {
      success: true,
      rawTransactions,
      metadata: {
        source: 'paytm',
        filename,
        sheetName,
        periodStart: minDate,
        periodEnd: maxDate,
        totalRowsParsed: rawTransactions.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: `Failed to parse statement: ${err.message || 'Unknown error'}`,
    };
  }
}
