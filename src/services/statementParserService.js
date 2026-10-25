/**
 * Zyrbit — Connect Money: Statement Parser Service
 *
 * Production-quality parser for Paytm UPI & Wallet transaction exports.
 * Supports:
 * - Paytm Excel (.xlsx, .xls)
 * - Paytm CSV (.csv, ArrayBuffer or string)
 * - Multi-sheet workbook scanning (e.g. Summary vs Passbook)
 * - Deep header scanning (up to 60 rows for statements with preamble metadata)
 * - Normalized explicit header aliases for Indian banking exports (Debit/Withdrawal, Credit/Deposit, Timestamp, Particulars)
 * - Robust Excel serial date parsing with Unix epoch math fallback
 * - Separate Date & Time column handling
 * - Single Amount column with Dr/Cr direction indicators
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
 * Explicit, normalized header aliases to avoid unsafe substring collisions.
 */
const DATE_ALIASES = new Set([
  'date', 'txndate', 'transactiondate', 'paymentdate', 'entrydate', 'valuedate', 'bookingdate',
  'datetime', 'timestamp', 'txnposteddate', 'transactiontimestamp'
]);

const TIME_ALIASES = new Set([
  'time', 'txntime', 'transactiontime', 'timestamp'
]);

const DEBIT_ALIASES = new Set([
  'debit', 'debitamount', 'debitamt', 'withdrawal', 'withdrawalamt', 'withdrawalamount',
  'dr', 'dramount', 'dramt', 'withdrawaldr', 'spent', 'paidout'
]);

const CREDIT_ALIASES = new Set([
  'credit', 'creditamount', 'creditamt', 'deposit', 'depositamt', 'depositamount',
  'cr', 'cramount', 'cramt', 'depositcr', 'received', 'paidin'
]);

const AMOUNT_ALIASES = new Set([
  'amount', 'txnamount', 'transactionamount', 'totalamount', 'netamount', 'transamount', 'amt'
]);

const DETAILS_ALIASES = new Set([
  'transactiondetails', 'details', 'narration', 'particulars', 'description',
  'transactiondescription', 'remarks', 'activity', 'paymentdetails', 'comments',
  'notes', 'reference'
]);

const COUNTERPARTY_ALIASES = new Set([
  'counterparty', 'beneficiary', 'beneficiaryname', 'merchant', 'merchantname',
  'paidto', 'paidtofrom', 'paidtoreceivedfrom', 'sourcename', 'destinationname',
  'payee', 'payer', 'transferto'
]);

const TXN_ID_ALIASES = new Set([
  'txnid', 'transactionid', 'orderid', 'refno', 'referenceno', 'referencenumber',
  'upirefno', 'upiref', 'utr', 'utrno', 'wallettxnid', 'rrn', 'chequerefno'
]);

const STATUS_ALIASES = new Set([
  'status', 'txnstatus', 'transactionstatus', 'paymentstatus'
]);

const TYPE_ALIASES = new Set([
  'type', 'txntype', 'transactiontype', 'drcr', 'crdr', 'direction', 'entrytype'
]);

/**
 * Matches a cleaned column name against an alias set, stripping common currency suffixes.
 * @param {string} key
 * @param {Set<string>} aliasSet
 * @returns {boolean}
 */
function isMatch(key, aliasSet) {
  if (!key) return false;
  if (aliasSet.has(key)) return true;
  const stripped = key.replace(/(inr|rs|inrs)$/, '');
  return aliasSet.has(stripped);
}

const MONTH_NAME_MAP = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12
};

/**
 * Extracts a standardized "HH:mm:ss" string from time column values (strings or Excel time fractions).
 * @param {any} rawTime
 * @returns {string|null}
 */
export function extractTimeStr(rawTime) {
  if (rawTime == null || rawTime === '') return null;

  if (typeof rawTime === 'number' && rawTime >= 0 && rawTime < 1) {
    const totalSeconds = Math.round(rawTime * 86400);
    const H = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const M = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const S = String(totalSeconds % 60).padStart(2, '0');
    return `${H}:${M}:${S}`;
  }

  const str = String(rawTime).trim();
  const ampmMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const s = ampmMatch[3] || '00';
    const meridian = ampmMatch[4].toLowerCase();
    if (meridian === 'pm' && h < 12) h += 12;
    if (meridian === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}:${s}`;
  }

  const hmsMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hmsMatch) {
    const h = String(parseInt(hmsMatch[1], 10)).padStart(2, '0');
    const m = hmsMatch[2];
    const s = hmsMatch[3] || '00';
    return `${h}:${m}:${s}`;
  }

  return null;
}

/**
 * Converts an Excel serial date number or date string into a standardized ISO date & time.
 * Supports separate rawTime input if time is in a different column.
 *
 * @param {any} raw
 * @param {any} [rawTime=null]
 * @returns {{ date: string, time: string, iso: string } | null}
 */
export function parseStatementDate(raw, rawTime = null) {
  if (raw == null || raw === '') return null;

  // Case 1: Excel serial date number
  if (typeof raw === 'number' && raw > 25000 && raw < 75000) {
    let result = null;
    if (XLSX.SSF && typeof XLSX.SSF.parse_date_code === 'function') {
      try {
        const parsed = XLSX.SSF.parse_date_code(raw);
        if (parsed && parsed.y && parsed.m && parsed.d) {
          const y = String(parsed.y).padStart(4, '20');
          const m = String(parsed.m).padStart(2, '0');
          const d = String(parsed.d).padStart(2, '0');
          const H = String(parsed.H || 0).padStart(2, '0');
          const M = String(parsed.M || 0).padStart(2, '0');
          const S = String(Math.floor(parsed.S || 0)).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          const timeStr = `${H}:${M}:${S}`;
          result = { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
        }
      } catch {
        // Fallback to epoch math below
      }
    }

    if (!result) {
      // Deterministic Excel epoch calculation: Excel 1900 day 25569 = Unix 1970-01-01
      const epochMs = Math.round((raw - 25569) * 86400 * 1000);
      const dt = new Date(epochMs);
      if (!isNaN(dt.getTime())) {
        const y = dt.getUTCFullYear();
        const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
        const d = String(dt.getUTCDate()).padStart(2, '0');
        const H = String(dt.getUTCHours()).padStart(2, '0');
        const M = String(dt.getUTCMinutes()).padStart(2, '0');
        const S = String(dt.getUTCSeconds()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        const timeStr = `${H}:${M}:${S}`;
        result = { date: dateStr, time: timeStr, iso: `${dateStr}T${timeStr}Z` };
      }
    }

    if (result && rawTime != null) {
      const explicitTime = extractTimeStr(rawTime);
      if (explicitTime) {
        result.time = explicitTime;
        result.iso = `${result.date}T${explicitTime}Z`;
      }
    }

    return result;
  }

  // Case 2: String date
  const str = String(raw).trim();
  if (!str) return null;

  let parsedDateStr = null;
  let parsedTimeStr = null;

  // Pattern A: "DD-Mon-YYYY" or "DD Mon YYYY" or "DD-Month-YYYY" (e.g. "02-Oct-2026 10:15:00")
  const dMonYMatch = str.match(/^(\d{1,2})[-/\s]+([a-zA-Z]{3,9})[-/\s]+(\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?)?/i);
  if (dMonYMatch) {
    const day = parseInt(dMonYMatch[1], 10);
    const monStr = dMonYMatch[2].toLowerCase();
    const month = MONTH_NAME_MAP[monStr];
    let year = parseInt(dMonYMatch[3], 10);
    if (year < 100) year += 2000;

    if (month) {
      parsedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dMonYMatch[4] != null) {
        let h = parseInt(dMonYMatch[4], 10);
        const m = dMonYMatch[5];
        const s = dMonYMatch[6] || '00';
        const meridian = dMonYMatch[7] ? dMonYMatch[7].toLowerCase() : null;
        if (meridian === 'pm' && h < 12) h += 12;
        if (meridian === 'am' && h === 12) h = 0;
        parsedTimeStr = `${String(h).padStart(2, '0')}:${m}:${s}`;
      }
    }
  }

  // Pattern B: "DD/MM/YYYY" or "DD-MM-YYYY" or "DD.MM.YYYY"
  if (!parsedDateStr) {
    const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?)?/i);
    if (dmyMatch) {
      let day = parseInt(dmyMatch[1], 10);
      let month = parseInt(dmyMatch[2], 10);
      let year = parseInt(dmyMatch[3], 10);
      if (year < 100) year += 2000;

      if (day > 12 && month <= 12) {
        // Standard DD/MM
      } else if (month > 12 && day <= 12) {
        const tmp = day; day = month; month = tmp;
      }

      parsedDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (dmyMatch[4] != null) {
        let h = parseInt(dmyMatch[4], 10);
        const m = dmyMatch[5];
        const s = dmyMatch[6] || '00';
        const meridian = dmyMatch[7] ? dmyMatch[7].toLowerCase() : null;
        if (meridian === 'pm' && h < 12) h += 12;
        if (meridian === 'am' && h === 12) h = 0;
        parsedTimeStr = `${String(h).padStart(2, '0')}:${m}:${s}`;
      }
    }
  }

  // Pattern C: "YYYY-MM-DD"
  if (!parsedDateStr) {
    const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(am|pm))?)?/i);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = String(parseInt(ymdMatch[2], 10)).padStart(2, '0');
      const day = String(parseInt(ymdMatch[3], 10)).padStart(2, '0');
      parsedDateStr = `${year}-${month}-${day}`;
      if (ymdMatch[4] != null) {
        let h = parseInt(ymdMatch[4], 10);
        const m = ymdMatch[5];
        const s = ymdMatch[6] || '00';
        const meridian = ymdMatch[7] ? ymdMatch[7].toLowerCase() : null;
        if (meridian === 'pm' && h < 12) h += 12;
        if (meridian === 'am' && h === 12) h = 0;
        parsedTimeStr = `${String(h).padStart(2, '0')}:${m}:${s}`;
      }
    }
  }

  // Pattern D: Native JS Date fallback
  if (!parsedDateStr) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      parsedDateStr = `${y}-${m}-${day}`;
      parsedTimeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    }
  }

  if (!parsedDateStr) return null;

  // If explicit rawTime is supplied, it overrides or fills in missing time
  if (rawTime != null) {
    const explicitTime = extractTimeStr(rawTime);
    if (explicitTime) {
      parsedTimeStr = explicitTime;
    }
  }

  const finalTime = parsedTimeStr || '12:00:00';
  return {
    date: parsedDateStr,
    time: finalTime,
    iso: `${parsedDateStr}T${finalTime}Z`,
  };
}

/**
 * Extracts numeric value from a string/number.
 * Safely strips currency symbols, commas, accounting parentheses, and direction suffixes (e.g., '1,500.00 Dr').
 *
 * @param {any} val
 * @returns {number|null}
 */
export function parseNumericAmount(val) {
  if (val == null) return null;
  if (typeof val === 'number') {
    return isFinite(val) ? Math.abs(val) : null;
  }
  let clean = String(val).trim();
  clean = clean
    .replace(/[₹$,\s()]/g, '')
    .replace(/^(?:cr|dr|inr|rs\.?)/i, '')
    .replace(/(?:cr|dr|inr|rs\.?)$/i, '')
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
    const isCsv = lowerName.endsWith('.csv') || !lowerName.includes('.');

    if (isCsv) {
      let csvText = null;
      if (typeof fileData === 'string') {
        csvText = fileData;
      } else if (fileData instanceof ArrayBuffer) {
        csvText = new TextDecoder('utf-8').decode(new Uint8Array(fileData));
      } else if (ArrayBuffer.isView(fileData)) {
        csvText = new TextDecoder('utf-8').decode(fileData);
      }

      if (csvText != null) {
        workbook = XLSX.read(csvText, { type: 'string', raw: true });
      } else {
        workbook = XLSX.read(fileData, { type: 'array', raw: true });
      }
    } else if (typeof fileData === 'string') {
      workbook = XLSX.read(fileData, { type: 'string' });
    } else {
      workbook = XLSX.read(fileData, { type: 'array' });
    }

    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { success: false, error: 'Statement file is empty or corrupted.' };
    }

    // Multi-sheet and deep scanning: find worksheet containing standard transaction headers
    let selectedSheetName = null;
    let rawMatrix = [];
    let headerRowIdx = -1;
    let colMap = {};

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
      if (!matrix || matrix.length === 0) continue;

      // Scan up to 60 rows for preamble metadata / disclaimers
      const scanLimit = Math.min(matrix.length, 60);
      for (let i = 0; i < scanLimit; i++) {
        const row = matrix[i];
        if (!Array.isArray(row)) continue;

        const cleaned = row.map(cleanKey);
        const hasDate = cleaned.some(k => isMatch(k, DATE_ALIASES));
        const hasAmount = cleaned.some(k => isMatch(k, AMOUNT_ALIASES) || isMatch(k, DEBIT_ALIASES) || isMatch(k, CREDIT_ALIASES));
        const hasDetails = cleaned.some(k => isMatch(k, DETAILS_ALIASES) || isMatch(k, COUNTERPARTY_ALIASES));

        if (hasDate && hasAmount && hasDetails) {
          selectedSheetName = sheetName;
          rawMatrix = matrix;
          headerRowIdx = i;

          // Map column indices safely via explicit aliases
          row.forEach((colName, cIdx) => {
            const k = cleanKey(colName);
            if (!k) return;
            if (isMatch(k, DATE_ALIASES) && colMap.date == null) colMap.date = cIdx;
            if (isMatch(k, TIME_ALIASES) && colMap.time == null && colMap.date !== cIdx) colMap.time = cIdx;
            if (isMatch(k, DETAILS_ALIASES) && colMap.details == null) colMap.details = cIdx;
            if (isMatch(k, COUNTERPARTY_ALIASES) && colMap.counterparty == null) colMap.counterparty = cIdx;
            if (isMatch(k, TXN_ID_ALIASES) && colMap.txnId == null) colMap.txnId = cIdx;
            if (isMatch(k, DEBIT_ALIASES) && colMap.debit == null) colMap.debit = cIdx;
            if (isMatch(k, CREDIT_ALIASES) && colMap.credit == null) colMap.credit = cIdx;
            if (isMatch(k, AMOUNT_ALIASES) && colMap.amount == null) colMap.amount = cIdx;
            if (isMatch(k, STATUS_ALIASES) && colMap.status == null) colMap.status = cIdx;
            if (isMatch(k, TYPE_ALIASES) && colMap.type == null) colMap.type = cIdx;
          });
          break;
        }
      }

      if (headerRowIdx !== -1) {
        break;
      }
    }

    if (headerRowIdx === -1) {
      // Check if workbook was completely empty
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const firstMatrix = firstSheet ? XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: null }) : [];
      if (!firstMatrix || firstMatrix.length === 0) {
        return {
          success: true,
          rawTransactions: [],
          metadata: {
            source: 'paytm',
            filename,
            sheetName: workbook.SheetNames[0],
            totalRowsParsed: 0,
          },
        };
      }

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

      // Extract date and time
      const rawDateVal = colMap.date != null ? row[colMap.date] : null;
      const rawTimeVal = colMap.time != null ? row[colMap.time] : null;
      const parsedDate = parseStatementDate(rawDateVal, rawTimeVal);
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
        const rawAmtStr = String(row[colMap.amount] || '').trim().toLowerCase();
        const typeStr = colMap.type != null ? String(row[colMap.type] || '').trim().toLowerCase() : '';
        const detailsStr = (colMap.details != null ? String(row[colMap.details] || '') : (colMap.counterparty != null ? String(row[colMap.counterparty] || '') : '')).trim().toLowerCase();

        // Check Type column first if present
        if (typeStr) {
          if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('deposit') || typeStr.includes('received')) {
            direction = 'in';
          } else if (typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('withdrawal') || typeStr.includes('paid')) {
            direction = 'out';
          }
        } else if (/\b(cr|credit)\b/i.test(rawAmtStr) || rawAmtStr.includes('+')) {
          direction = 'in';
        } else if (/\b(dr|debit)\b/i.test(rawAmtStr) || rawAmtStr.includes('-')) {
          direction = 'out';
        } else if (detailsStr.includes('received from') || detailsStr.includes('cashback') || detailsStr.includes('refund')) {
          direction = 'in';
        } else if (detailsStr.includes('paid to') || detailsStr.includes('sent to')) {
          direction = 'out';
        } else {
          direction = 'out';
        }
      }

      if (!amount || amount <= 0) continue;

      // Description & Counterparty
      const rawDescription = colMap.details != null ? String(row[colMap.details] || '').trim() : '';
      const explicitCounterparty = colMap.counterparty != null ? String(row[colMap.counterparty] || '').trim() : '';
      const sourceTxnId = colMap.txnId != null ? String(row[colMap.txnId] || '').trim() : null;

      const finalDescription = rawDescription || explicitCounterparty || 'Paytm Transaction';

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
        rawDescription: finalDescription,
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
        sheetName: selectedSheetName,
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
