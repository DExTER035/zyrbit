/**
 * Zyrbit — Connect Money: Statement Import Service
 *
 * Full lifecycle orchestrator:
 * - Parsing & Normalization
 * - Semantic Classification via moneyResolver rules
 * - Reliable Deduplication (source ID & fallback fingerprint)
 * - Confirmation & Persistence into Wealth schema
 * - Safe Batch Rollback ("Undo Import")
 */

import { supabase } from '../lib/supabase/index.js';
import { parsePaytmStatement } from './statementParserService.js';
import { normalizeTransaction } from './transactionNormalizer.js';
import { classifyTransaction } from './transactionClassifier.js';
import { recordMoneyEvent, deleteExpense, deleteIncome, deleteBill } from './wealthService.js';

// Local storage fallback key for resilience when running without new SQL tables
const LOCAL_BATCHES_KEY = 'zyrbit_import_batches_fallback';
const LOCAL_TRANSACTIONS_KEY = 'zyrbit_import_txs_fallback';

function getLocalStore(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setLocalStore(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Generates an 4-character uppercase alphanumeric batch code (e.g. "A7F2").
 * @returns {string}
 */
export function generateBatchCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = '';
  for (let i = 0; i < 4; i++) {
    res += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return res;
}

/**
 * Checks for duplicate transactions against existing records and previous imports.
 *
 * @param {string} userId
 * @param {Array<Object>} candidates - Array of normalized/classified transactions
 * @returns {Promise<Array<Object>>} Enriched transactions with duplicate flags
 */
export async function deduplicateTransactions(userId, candidates = []) {
  if (!candidates.length) return [];

  let existingFingerprints = new Set();
  let existingSourceIds = new Set();

  try {
    // 1. Check imported_transactions table in Supabase (with high limit for lifetime history)
    const { data: pastImports, error } = await supabase
      .from('imported_transactions')
      .select('fingerprint, source_transaction_id')
      .eq('user_id', userId)
      .eq('status', 'confirmed')
      .limit(25000);

    if (!error && pastImports) {
      pastImports.forEach(row => {
        if (row.fingerprint) existingFingerprints.add(row.fingerprint);
        if (row.source_transaction_id) existingSourceIds.add(row.source_transaction_id);
      });
    } else {
      // Fallback to local store
      const localTxs = getLocalStore(LOCAL_TRANSACTIONS_KEY).filter(t => t.user_id === userId && t.status === 'confirmed');
      localTxs.forEach(t => {
        if (t.fingerprint) existingFingerprints.add(t.fingerprint);
        if (t.sourceTransactionId) existingSourceIds.add(t.sourceTransactionId);
      });
    }

    // 2. Also check existing money_expenses and wealth_income to prevent double counting
    const minDate = candidates.reduce((min, c) => (!min || c.date < min ? c.date : min), null);
    if (minDate) {
      const [expRes, incRes] = await Promise.all([
        supabase.from('money_expenses').select('amount, expense_date, note').eq('user_id', userId).gte('expense_date', minDate).limit(25000),
        supabase.from('wealth_income').select('amount, income_date, note').eq('user_id', userId).gte('income_date', minDate).limit(25000),
      ]);

      const existingExpenses = expRes.data || [];
      const existingIncomes = incRes.data || [];

      // Build quick lookup keys: "YYYY-MM-DD:AMOUNT"
      const expSet = new Set(existingExpenses.map(e => `${e.expense_date}:${Number(e.amount).toFixed(2)}`));
      const incSet = new Set(existingIncomes.map(i => `${i.income_date}:${Number(i.amount).toFixed(2)}`));

      return candidates.map(tx => {
        const hasMatchingSourceId = tx.sourceTransactionId && existingSourceIds.has(tx.sourceTransactionId);
        const hasMatchingFingerprint = existingFingerprints.has(tx.fingerprint);

        // Check if an expense/income with identical date & amount already exists in user's history
        const dateAmtKey = `${tx.date}:${Number(tx.amount).toFixed(2)}`;
        const hasExistingDirectRecord = tx.direction === 'out' ? expSet.has(dateAmtKey) : incSet.has(dateAmtKey);

        if (hasMatchingSourceId) {
          return {
            ...tx,
            resolutionState: 'duplicate',
            isDuplicate: true,
            duplicateReason: `Already imported (Txn #${tx.sourceTransactionId})`,
          };
        }

        if (hasMatchingFingerprint) {
          return {
            ...tx,
            resolutionState: 'duplicate',
            isDuplicate: true,
            duplicateReason: 'Already imported in a previous statement',
          };
        }

        if (hasExistingDirectRecord && tx.rawDescription && tx.rawDescription.length > 5) {
          // If date & exact amount matches, check if counterparty matches note
          const matchedNote = (tx.direction === 'out' ? existingExpenses : existingIncomes).some(r =>
            r.note && (r.note.toLowerCase().includes(tx.counterparty.toLowerCase()) || tx.counterparty.toLowerCase().includes(r.note.toLowerCase()))
          );
          if (matchedNote) {
            return {
              ...tx,
              resolutionState: 'duplicate',
              isDuplicate: true,
              duplicateReason: `Matches existing logged ${tx.direction === 'out' ? 'expense' : 'income'} on ${tx.date}`,
            };
          }
        }

        return {
          ...tx,
          isDuplicate: false,
        };
      });
    }
  } catch (err) {
    console.warn('Deduplication check error, continuing safely:', err.message);
  }

  return candidates.map(c => ({ ...c, isDuplicate: false }));
}

/**
 * Imports and stages a statement file.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {ArrayBuffer|Uint8Array|string} params.fileData
 * @param {string} params.filename
 * @returns {Promise<{
 *   success: boolean,
 *   batch?: Object,
 *   transactions?: Array<Object>,
 *   summary?: { total: number, ready: number, needsReview: number, duplicates: number },
 *   error?: string,
 * }>}
 */
export async function importStatement({ userId, fileData, filename = 'statement.xlsx' }) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  if (!fileData) return { success: false, error: 'Statement file data is required.' };

  // 1. Parse statement
  const parseRes = await parsePaytmStatement(fileData, filename);
  if (!parseRes.success) {
    return { success: false, error: parseRes.error };
  }

  const rawRows = parseRes.rawTransactions || [];
  if (rawRows.length === 0) {
    return {
      success: true,
      batch: null,
      transactions: [],
      summary: { total: 0, ready: 0, needsReview: 0, duplicates: 0 },
      message: 'No transactions found in the statement.',
    };
  }

  // 2. Normalize transactions
  const normalized = rawRows.map(r => normalizeTransaction(r, 'paytm'));

  // 3. Classify transactions
  const classified = normalized.map(tx => {
    const classification = classifyTransaction(tx);
    return {
      ...tx,
      ...classification,
    };
  });

  // 4. Deduplicate
  const deduplicated = await deduplicateTransactions(userId, classified);

  // 5. Build batch model
  const batchId = crypto.randomUUID();
  const batchCode = generateBatchCode();
  const periodStart = parseRes.metadata?.periodStart || deduplicated[0]?.date || null;
  const periodEnd = parseRes.metadata?.periodEnd || deduplicated[deduplicated.length - 1]?.date || null;

  const duplicatesCount = deduplicated.filter(t => t.isDuplicate).length;
  const needsReviewCount = deduplicated.filter(t => !t.isDuplicate && t.resolutionState === 'needs_review').length;
  const readyCount = deduplicated.filter(t => !t.isDuplicate && t.resolutionState === 'resolved').length;

  const batch = {
    id: batchId,
    user_id: userId,
    batch_code: batchCode,
    source: 'paytm',
    filename,
    period_start: periodStart,
    period_end: periodEnd,
    total_count: deduplicated.length,
    confirmed_count: 0,
    needs_review_count: needsReviewCount,
    status: 'pending_review',
    created_at: new Date().toISOString(),
  };

  const stagedTransactions = deduplicated.map(tx => ({
    ...tx,
    batch_id: batchId,
    user_id: userId,
    status: tx.isDuplicate ? 'ignored' : 'pending',
  }));

  // 6. Persist to Supabase
  try {
    const { error: batchErr } = await supabase
      .from('statement_import_batches')
      .insert([batch]);

    if (batchErr) {
      throw batchErr;
    }

    const dbTxRows = stagedTransactions.map(t => ({
      id: t.id,
      user_id: userId,
      batch_id: batchId,
      source: t.source,
      source_transaction_id: t.sourceTransactionId,
      fingerprint: t.fingerprint,
      occurred_at: t.occurredAt,
      amount: t.amount,
      direction: t.direction,
      counterparty: t.counterparty,
      payment_method: t.paymentMethod,
      raw_description: t.rawDescription,
      resolution_state: t.resolutionState,
      suggested_action: t.suggestedAction,
      suggested_category: t.suggestedCategory,
      suggested_note: t.suggestedNote,
      review_reason: t.reviewReason || null,
      status: t.status,
    }));

    // Insert in chunks of 250 to avoid request payload limit errors on large statements
    const INSERT_CHUNK = 250;
    for (let i = 0; i < dbTxRows.length; i += INSERT_CHUNK) {
      const chunk = dbTxRows.slice(i, i + INSERT_CHUNK);
      const { error: txErr } = await supabase.from('imported_transactions').insert(chunk);
      if (txErr) {
        throw txErr;
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to save statement import to database.',
    };
  }

  return {
    success: true,
    batch,
    transactions: stagedTransactions,
    summary: {
      total: stagedTransactions.length,
      ready: readyCount,
      needsReview: needsReviewCount,
      duplicates: duplicatesCount,
    },
  };
}

/**
 * Confirms a set of transactions into final Wealth state.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.batchId
 * @param {Array<string>} params.transactionIds - IDs of transactions to confirm
 * @param {Object} [params.overrides={}] - Map of txId -> { action, category, note } overrides
 * @returns {Promise<{success: boolean, confirmedCount: number, error?: string}>}
 */
export async function confirmImportTransactions({
  userId,
  batchId,
  transactionIds = [],
  overrides = {},
}) {
  if (!userId || !batchId || !transactionIds.length) {
    return { success: false, error: 'Missing required parameters to confirm import.' };
  }

  // 1. Fetch staged transactions for this batch
  let candidateTxs = [];
  try {
    const { data, error } = await supabase
      .from('imported_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('batch_id', batchId)
      .in('id', transactionIds);

    if (!error && data && data.length > 0) {
      candidateTxs = data;
    } else {
      candidateTxs = getLocalStore(LOCAL_TRANSACTIONS_KEY)
        .filter(t => t.user_id === userId && t.batch_id === batchId && transactionIds.includes(t.id));
    }
  } catch {
    candidateTxs = getLocalStore(LOCAL_TRANSACTIONS_KEY)
      .filter(t => t.user_id === userId && t.batch_id === batchId && transactionIds.includes(t.id));
  }

  if (!candidateTxs.length) {
    return { success: false, error: 'No matching transactions found to confirm.' };
  }

  let confirmedCount = 0;
  const updates = [];
  const bulkExpenses = [];
  const bulkIncomes = [];
  const complexTransactions = [];

  // 2. Classify candidates into bulk insert buckets or complex flows
  for (const tx of candidateTxs) {
    const override = overrides[tx.id] || {};
    const action = override.action || tx.suggested_action || tx.suggestedAction || 'add_expense';
    const category = override.category || tx.suggested_category || tx.suggestedCategory || 'Other';
    const note = override.note || tx.suggested_note || tx.suggestedNote || tx.counterparty || '';
    const date = tx.date || (tx.occurred_at || tx.occurredAt ? (tx.occurred_at || tx.occurredAt).slice(0, 10) : new Date().toISOString().split('T')[0]);
    const amount = Number(tx.amount);

    if (action === 'add_bill' || category === 'Lend') {
      complexTransactions.push({ tx, action, category, note, date, amount });
    } else if (action === 'transfer' || action === 'investment' || action === 'add_expense') {
      const expId = crypto.randomUUID();
      const expCategory = action === 'transfer' ? 'Transfer' : action === 'investment' ? 'Investment' : (category || 'Other');
      bulkExpenses.push({
        txId: tx.id,
        record: {
          id: expId,
          user_id: userId,
          amount,
          category: expCategory,
          note: note.trim(),
          expense_date: date,
          created_at: new Date().toISOString(),
        },
      });
    } else if (action === 'refund' || action === 'add_income') {
      const incId = crypto.randomUUID();
      const incSource = action === 'refund' ? 'Refund' : (category || 'Income');
      bulkIncomes.push({
        txId: tx.id,
        record: {
          id: incId,
          user_id: userId,
          amount,
          source: incSource,
          note: note.trim(),
          income_date: date,
          created_at: new Date().toISOString(),
        },
      });
    }
  }

  const CHUNK_SIZE = 100;

  // 2A. Chunked bulk insert for expenses
  if (bulkExpenses.length > 0) {
    for (let i = 0; i < bulkExpenses.length; i += CHUNK_SIZE) {
      const chunk = bulkExpenses.slice(i, i + CHUNK_SIZE);
      const rows = chunk.map(c => c.record);
      const { error } = await supabase.from('money_expenses').insert(rows);
      if (error) {
        console.error('Failed to insert bulk expenses chunk:', error);
      } else {
        chunk.forEach(c => {
          confirmedCount++;
          updates.push({
            id: c.txId,
            status: 'confirmed',
            linked_expense_id: c.record.id,
            linked_income_id: null,
            linked_bill_id: null,
          });
        });
      }
    }
  }

  // 2B. Chunked bulk insert for incomes
  if (bulkIncomes.length > 0) {
    for (let i = 0; i < bulkIncomes.length; i += CHUNK_SIZE) {
      const chunk = bulkIncomes.slice(i, i + CHUNK_SIZE);
      const rows = chunk.map(c => c.record);
      const { error } = await supabase.from('wealth_income').insert(rows);
      if (error) {
        console.error('Failed to insert bulk incomes chunk:', error);
      } else {
        chunk.forEach(c => {
          confirmedCount++;
          updates.push({
            id: c.txId,
            status: 'confirmed',
            linked_expense_id: null,
            linked_income_id: c.record.id,
            linked_bill_id: null,
          });
        });
      }
    }
  }

  // 2C. Process complex transactions (LEND or COMMITMENT) via canonical recordMoneyEvent
  for (const item of complexTransactions) {
    try {
      const eventType = item.action === 'add_bill' ? 'COMMITMENT' : 'LEND';
      const res = await recordMoneyEvent({
        userId,
        type: eventType,
        amount: item.amount,
        category: item.category,
        note: item.note,
        date: item.date,
      });
      if (res.success) {
        confirmedCount++;
        const linkedId = res.data?.id || null;
        updates.push({
          id: item.tx.id,
          status: 'confirmed',
          linked_expense_id: eventType === 'LEND' ? linkedId : null,
          linked_income_id: null,
          linked_bill_id: eventType === 'COMMITMENT' ? linkedId : null,
        });
      }
    } catch (err) {
      console.error(`Failed to record complex transaction ${item.tx.id}:`, err);
    }
  }

  // 3. Update imported_transactions status and batch progress in concurrent chunks of 25
  try {
    const UPDATE_BATCH = 25;
    for (let i = 0; i < updates.length; i += UPDATE_BATCH) {
      const chunk = updates.slice(i, i + UPDATE_BATCH);
      await Promise.all(chunk.map(u =>
        supabase
          .from('imported_transactions')
          .update({
            status: 'confirmed',
            linked_expense_id: u.linked_expense_id,
            linked_income_id: u.linked_income_id,
            linked_bill_id: u.linked_bill_id,
          })
          .eq('id', u.id)
          .eq('user_id', userId)
      ));
    }

    const { error: bErr } = await supabase
      .from('statement_import_batches')
      .update({
        confirmed_count: confirmedCount,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', batchId)
      .eq('user_id', userId);
    if (bErr) throw bErr;
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Failed to update statement import batch in database.',
    };
  }

  // 4. Trigger global DexOS refresh event so Wealth & Dex update instantaneously
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
  }

  return {
    success: true,
    confirmedCount,
  };
}

/**
 * Rolls back an import batch, safely removing created expenses/incomes.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.batchId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function rollbackImportBatch({ userId, batchId }) {
  if (!userId || !batchId) return { success: false, error: 'User ID and Batch ID are required.' };

  try {
    let txs = [];
    const { data, error } = await supabase
      .from('imported_transactions')
      .select('*')
      .eq('user_id', userId)
      .eq('batch_id', batchId);

    if (!error && data) {
      txs = data;
    } else {
      txs = getLocalStore(LOCAL_TRANSACTIONS_KEY).filter(t => t.user_id === userId && t.batch_id === batchId);
    }

    // Safely delete linked rows
    for (const t of txs) {
      if (t.linked_expense_id) {
        await deleteExpense({ userId, id: t.linked_expense_id });
      }
      if (t.linked_income_id) {
        await deleteIncome({ userId, id: t.linked_income_id });
      }
      if (t.linked_bill_id) {
        await deleteBill({ userId, id: t.linked_bill_id });
      }
    }

    // Mark batch rolled_back
    await supabase
      .from('statement_import_batches')
      .update({ status: 'rolled_back', updated_at: new Date().toISOString() })
      .eq('id', batchId)
      .eq('user_id', userId);

    await supabase
      .from('imported_transactions')
      .update({ status: 'rejected' })
      .eq('batch_id', batchId)
      .eq('user_id', userId);

    // Update local store as well
    const allBatches = getLocalStore(LOCAL_BATCHES_KEY);
    setLocalStore(LOCAL_BATCHES_KEY, allBatches.map(b => b.id === batchId ? { ...b, status: 'rolled_back' } : b));

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to rollback import batch.' };
  }
}

/**
 * Fetches recent statement import batches for the user.
 *
 * @param {string} userId
 * @returns {Promise<{success: boolean, batches?: Array<Object>, error?: string}>}
 */
export async function getImportBatches(userId) {
  if (!userId) return { success: false, batches: [] };

  try {
    const { data, error } = await supabase
      .from('statement_import_batches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return { success: false, error: error.message, batches: [] };
    }
    return { success: true, batches: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch import batches.', batches: [] };
  }
}
