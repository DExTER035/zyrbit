/**
 * Zyrbit / DexOS — Wealth Domain Service
 * Pure JavaScript domain operations for expenses, income, bills, and budget settings.
 * Pure Supabase mutations without React state dependencies.
 */

import { supabase } from '../lib/supabase/index.js';
import {
  computeTotalIncome,
  computeTotalExpense,
  isTransferExpense,
  isTransferIncome,
  isBorrowIncome,
  isPrincipalExpense,
  isRepaymentIncome,
} from '../engines/wealth/index.js';

import { todayStr } from '../lib/dateUtils.js';

export { todayStr };

/**
 * Adds an expense transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.amount - Expense amount (must be > 0)
 * @param {string} [params.category='Other'] - Expense category
 * @param {string} [params.note=''] - Optional description/note
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD expense date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function addExpense({
  id = null,
  userId,
  amount,
  category = 'Other',
  note = '',
  date = todayStr(),
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Expense amount must be a positive number.' };
  }

  const payload = {
    id: id || crypto.randomUUID(),
    user_id: userId,
    amount: numericAmount,
    category: category || 'Other',
    note: (note || '').trim(),
    expense_date: date,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('money_expenses')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || payload };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to record expense.' };
  }
}

/**
 * Updates an expense transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Expense UUID
 * @param {number} params.amount - Expense amount
 * @param {string} params.category - Category
 * @param {string} params.note - Description
 * @param {string} params.date - Date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateExpense({ userId, id, amount, category, note, date }) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Expense ID are required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Expense amount must be a positive number.' };
  }

  const payload = {
    amount: numericAmount,
    category: category || 'Other',
    note: (note || '').trim(),
    expense_date: date,
  };

  try {
    const { data, error } = await supabase
      .from('money_expenses')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update expense.' };
  }
}

/**
 * Deletes an expense transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Expense UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteExpense({ userId, id }) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Expense ID are required.' };
  }

  try {
    // 1. Fetch expense first to detect cross-domain food logging
    const { data: exp } = await supabase
      .from('money_expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    const { error } = await supabase
      .from('money_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Clean up associated food entry if this was a food expense
    if (exp && (exp.category || '').toLowerCase() === 'food' && exp.note) {
      const foodName = exp.note.trim();
      await supabase
        .from('meal_logs')
        .delete()
        .eq('user_id', userId)
        .eq('date', exp.expense_date)
        .ilike('food_name', foodName);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
      }
    }

    // 3. Clean up associated receivable promise if this was a Lend expense
    if (exp && (exp.category || '').toLowerCase() === 'lend') {
      const pName = (exp.note || '').trim();
      if (pName) {
        const person = pName.replace(/^lent to\s+/i, '').replace(/^loan to\s+/i, '').trim();
        const { data: linkedBills } = await supabase
          .from('wealth_bills')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'receivable')
          .ilike('name', `%${person || pName}%`)
          .limit(1);

        if (linkedBills && linkedBills.length > 0) {
          await supabase.from('wealth_bills').delete().eq('id', linkedBills[0].id).eq('user_id', userId);
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete expense.' };
  }
}

/**
 * Adds an income transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {number} params.amount - Income amount (must be > 0)
 * @param {string} [params.source='other'] - Income source
 * @param {string} [params.note=''] - Description / note
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD income date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function addIncome({
  id = null,
  userId,
  amount,
  source = 'other',
  note = '',
  date = todayStr(),
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Income amount must be a positive number.' };
  }

  const payload = {
    id: id || crypto.randomUUID(),
    user_id: userId,
    amount: numericAmount,
    source: source || 'other',
    note: (note || '').trim(),
    income_date: date,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('wealth_income')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || payload };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to record income.' };
  }
}

/**
 * Updates an income transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Income UUID
 * @param {number} params.amount - Income amount
 * @param {string} params.source - Income source
 * @param {string} params.note - Description / note
 * @param {string} params.date - Income date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateIncome({ userId, id, amount, source, note, date }) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Income ID are required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Income amount must be a positive number.' };
  }

  const payload = {
    amount: numericAmount,
    source: source || 'other',
    note: (note || '').trim(),
    income_date: date,
  };

  try {
    const { data, error } = await supabase
      .from('wealth_income')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update income.' };
  }
}

/**
 * Deletes an income transaction.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Income UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteIncome({ userId, id }) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Income ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('wealth_income')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete income.' };
  }
}

/**
 * Adds an upcoming bill obligation.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Bill name
 * @param {number} params.amount - Bill amount (must be > 0)
 * @param {string} params.dueDate - YYYY-MM-DD due date
 * @param {string} [params.frequency='monthly'] - 'monthly' | 'yearly' | 'one_off'
 * @param {string} [params.status='unpaid'] - 'unpaid' | 'paid'
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function addBill({
  id = null,
  userId,
  name,
  amount,
  dueDate,
  frequency = 'monthly',
  status = 'unpaid',
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Bill name cannot be empty.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Bill amount must be a positive number.' };
  }
  if (!dueDate) {
    return { success: false, error: 'Due date is required.' };
  }

  const payload = {
    id: id || crypto.randomUUID(),
    user_id: userId,
    name: cleanName,
    amount: numericAmount,
    due_date: dueDate,
    frequency: frequency || 'monthly',
    status: status || 'unpaid',
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('wealth_bills')
      .insert([payload])
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || payload };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to record bill.' };
  }
}

/**
 * Updates an existing bill obligation.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Bill UUID
 * @param {string} params.name - Bill name
 * @param {number} params.amount - Bill amount
 * @param {string} params.dueDate - YYYY-MM-DD due date
 * @param {string} [params.frequency='monthly'] - 'monthly' | 'yearly' | 'one_off'
 * @param {string} [params.status='unpaid'] - 'unpaid' | 'paid'
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateBill({
  userId,
  id,
  name,
  amount,
  dueDate,
  frequency = 'monthly',
  status = 'unpaid',
}) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Bill ID are required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Bill name cannot be empty.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Bill amount must be a positive number.' };
  }
  if (!dueDate) {
    return { success: false, error: 'Due date is required.' };
  }

  const payload = {
    name: cleanName,
    amount: numericAmount,
    due_date: dueDate,
    frequency: frequency || 'monthly',
    status: status || 'unpaid',
  };

  try {
    const { data, error } = await supabase
      .from('wealth_bills')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update bill.' };
  }
}

/**
 * Toggles or updates bill payment status ('paid' or 'unpaid').
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.billId - Bill UUID
 * @param {string} params.status - 'paid' | 'unpaid'
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function toggleBillStatus({ userId, billId, status }) {
  if (!userId || !billId) {
    return { success: false, error: 'User ID and Bill ID are required.' };
  }

  try {
    const { data, error } = await supabase
      .from('wealth_bills')
      .update({ status })
      .eq('id', billId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to toggle bill status.' };
  }
}

/**
 * Fetches all bills and promises for an authenticated user.
 * @param {Object} params
 * @param {string} params.userId
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export async function getBills({ userId }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  try {
    const { data, error } = await supabase
      .from('wealth_bills')
      .select('*')
      .eq('user_id', userId)
      .order('due_date', { ascending: true });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch bills.' };
  }
}

/**
 * Deletes a bill.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.id - Bill UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteBill({ userId, id }) {
  if (!userId || !id) {
    return { success: false, error: 'User ID and Bill ID are required.' };
  }

  try {
    // 1. Fetch bill first to detect linked loan/borrow obligation
    const { data: bill } = await supabase
      .from('wealth_bills')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    const { error } = await supabase
      .from('wealth_bills')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }

    // 2. Clean up associated expense if this was a receivable promise
    if (bill && bill.status === 'receivable') {
      const pName = (bill.name || '').trim();
      const person = pName.replace(/^owed by\s+/i, '').replace(/\s+owes you$/i, '').trim();
      if (person) {
        const { data: linkedExps } = await supabase
          .from('money_expenses')
          .select('id')
          .eq('user_id', userId)
          .eq('category', 'Lend')
          .ilike('note', `%${person}%`)
          .limit(1);

        if (linkedExps && linkedExps.length > 0) {
          await supabase.from('money_expenses').delete().eq('id', linkedExps[0].id).eq('user_id', userId);
        }
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete bill.' };
  }
}

/**
 * Upserts wealth settings (monthly budget and currency).
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.currency='INR'] - 'INR' | 'USD' | 'EUR'
 * @param {number} [params.monthlyBudget=15000] - Target monthly budget
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveWealthSettings({ userId, currency = 'INR', monthlyBudget = 15000 }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const numericBudget = Number(monthlyBudget);
  const budget = (monthlyBudget !== undefined && monthlyBudget !== null && isFinite(numericBudget) && numericBudget >= 0)
    ? Math.max(0, numericBudget)
    : 15000;

  const payload = {
    id: userId,
    user_id: userId,
    currency: currency || 'INR',
    monthly_budget: budget,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Primary path: Upsert using primary key 'id' matching auth.users PK in Postgres schema
    const { data, error } = await supabase
      .from('wealth_settings')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (!error) {
      return { success: true, data: data || payload };
    }

    console.warn('saveWealthSettings upsert with id failed, trying fallback:', error.message);

    // 2. Fallback: Check for existing record by id or user_id
    const { data: existing, error: findError } = await supabase
      .from('wealth_settings')
      .select('id, user_id')
      .or(`id.eq.${userId},user_id.eq.${userId}`)
      .maybeSingle();

    if (findError) {
      return { success: false, error: findError.message };
    }

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('wealth_settings')
        .update({
          user_id: userId,
          currency: currency || 'INR',
          monthly_budget: budget,
        })
        .eq('id', existing.id)
        .select()
        .maybeSingle();

      if (updateError) {
        return { success: false, error: updateError.message };
      }
      return { success: true, data: updated || payload };
    } else {
      const { data: inserted, error: insertError } = await supabase
        .from('wealth_settings')
        .insert([payload])
        .select()
        .maybeSingle();

      if (insertError) {
        return { success: false, error: insertError.message };
      }
      return { success: true, data: inserted || payload };
    }
  } catch (err) {
    return { success: false, error: err.message || 'Failed to save wealth settings.' };
  }
}

/**
 * Fetches all raw wealth data for a user in one round-trip.
 * The Wealth page uses this instead of querying Supabase directly.
 *
 * @param {string} userId - Authenticated user UUID
 * @returns {Promise<{success: boolean, data?: {settings, expenses, incomes, bills}, error?: string}>}
 */
export async function getWealthSnapshot(userId) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const [sRes, eRes, iRes, bRes] = await Promise.all([
      supabase
        .from('wealth_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('money_expenses')
        .select('*')
        .eq('user_id', userId)
        .order('expense_date', { ascending: false })
        .limit(25000),
      supabase
        .from('wealth_income')
        .select('*')
        .eq('user_id', userId)
        .order('income_date', { ascending: false })
        .limit(25000),
      supabase
        .from('wealth_bills')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true })
        .limit(1000),
    ]);

    if (eRes.error) throw new Error(`Failed to fetch expenses: ${eRes.error.message}`);
    if (iRes.error) throw new Error(`Failed to fetch income: ${iRes.error.message}`);
    if (bRes.error) throw new Error(`Failed to fetch bills: ${bRes.error.message}`);

    const snapshotData = {
      settings: sRes.data || null,
      expenses: eRes.data || [],
      incomes:  iRes.data || [],
      bills:    bRes.data || [],
    };

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const totalCount = (snapshotData.expenses?.length || 0) + (snapshotData.incomes?.length || 0);
        if (totalCount <= 1000) {
          window.localStorage.setItem(`zyrbit_wealth_cache_${userId}`, JSON.stringify(snapshotData));
        }
      } catch { /* ignore quota errors */ }
    }

    return {
      success: true,
      data: snapshotData,
    };
  } catch (err) {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cached = window.localStorage.getItem(`zyrbit_wealth_cache_${userId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return { success: true, data: parsed, fromCache: true };
        }
      } catch { /* ignore */ }
    }
    return { success: false, error: err.message || 'Failed to fetch wealth snapshot.' };
  }
}

/**
 * Minimal wealth telemetry for Dex context (current month only).
 * @param {string} userId
 * @param {string} [date]
 */
export async function getWealthTelemetry(userId, date = todayStr()) {
  return getWealthSummary(userId, date);
}
/**
 * Fetches a compact wealth summary (spending today, monthly totals, upcoming bills).
 * Reuses deterministic wealth calculation engines.
 * @param {string} userId - Authenticated user UUID
 * @param {string} [date=todayStr()] - YYYY-MM-DD reference date
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     spentToday: number,
 *     totalExpensesMonth: number,
 *     totalIncomeMonth: number,
 *     upcomingBills: Array<{name: string, amount: number, dueDate: string}>
 *   },
 *   error?: string
 * }>}
 */
export async function getWealthSummary(userId, date = todayStr()) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const today = date || todayStr();
    const monthStart = today.slice(0, 7) + '-01'; // YYYY-MM-01

    const [expRes, incRes, billRes] = await Promise.all([
      supabase
        .from('money_expenses')
        .select('amount, category, note, expense_date')
        .eq('user_id', userId)
        .gte('expense_date', monthStart)
        .order('expense_date', { ascending: false }),
      supabase
        .from('wealth_income')
        .select('amount, source, income_date')
        .eq('user_id', userId)
        .gte('income_date', monthStart),
      supabase
        .from('wealth_bills')
        .select('name, amount, due_date, status, frequency')
        .eq('user_id', userId)
        .eq('status', 'unpaid')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5),
    ]);

    if (expRes.error) {
      return { success: false, error: expRes.error.message };
    }
    if (incRes.error) {
      return { success: false, error: incRes.error.message };
    }
    if (billRes.error) {
      return { success: false, error: billRes.error.message };
    }

    const expenses = expRes.data || [];
    const incomes = incRes.data || [];
    const bills = billRes.data || [];

    const lifestyleExpenses = expenses.filter((e) => !isTransferExpense(e) && !isPrincipalExpense(e));
    const earnedIncomes = incomes.filter((i) => !isTransferIncome(i) && !isBorrowIncome(i) && !isRepaymentIncome(i));
    const totalExpensesMonth = computeTotalExpense(lifestyleExpenses);
    const totalIncomeMonth = computeTotalIncome(earnedIncomes);
    const todayExpenses = lifestyleExpenses.filter((e) => e.expense_date === today);
    const spentToday = computeTotalExpense(todayExpenses);

    const upcomingBills = bills.map((b) => ({
      name: b.name,
      amount: Number(b.amount) || 0,
      dueDate: b.due_date,
    }));

    return {
      success: true,
      data: {
        spentToday: Math.round(spentToday * 100) / 100,
        totalExpensesMonth: Math.round(totalExpensesMonth * 100) / 100,
        totalIncomeMonth: Math.round(totalIncomeMonth * 100) / 100,
        upcomingBills,
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch wealth summary.' };
  }
}

/**
 * ─── Money State V1 Canonical Event Dispatcher ────────────────────────────────
 * Canonical domain abstraction over existing normalized tables.
 * Dispatches to money_expenses, wealth_income, or wealth_bills.
 *
 * Supported semantic types:
 * - SPEND: Food, Transport, Shopping, Education, etc.
 * - INCOME: Salary, Freelance, Editing, etc.
 * - LEND: Lending to someone (creates expense + receivable promise)
 * - BORROW: Taking money (creates income as liability + commitment to return)
 * - COMMITMENT: Recurring bills, rent, subscriptions, SIPs
 * - INVESTMENT: Stocks, mutual funds, gold, crypto
 * - TRANSFER: Moving between savings & cash
 * - REFUND / REIMBURSEMENT: Money returned
 *
 * @param {Object} params
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function recordMoneyEvent({
  id = null,
  billId = null,
  userId,
  type = 'SPEND',
  amount,
  title = '',
  category = 'General',
  source = 'Other',
  note = '',
  date = todayStr(),
  dueDate = null,
  frequency = 'one_off',
  person = '',
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Amount must be a positive number.' };
  }

  const cleanNote = (note || title || '').trim();
  const eventDate = date || todayStr();

  switch (type.toUpperCase()) {
    case 'SPEND': {
      if (id) {
        return await updateExpense({
          userId,
          id,
          amount: numericAmount,
          category: category || 'Other',
          note: cleanNote,
          date: eventDate,
        });
      }
      return await addExpense({
        userId,
        amount: numericAmount,
        category: category || 'Other',
        note: cleanNote,
        date: eventDate,
      });
    }

    case 'INCOME': {
      if (id) {
        return await updateIncome({
          userId,
          id,
          amount: numericAmount,
          source: source || 'Other',
          note: cleanNote,
          date: eventDate,
        });
      }
      return await addIncome({
        userId,
        amount: numericAmount,
        source: source || 'Other',
        note: cleanNote,
        date: eventDate,
      });
    }

    case 'LEND': {
      const stableTxId = id || crypto.randomUUID();
      const stableBillId = billId || crypto.randomUUID();

      // 0. Attempt atomic database RPC if migration has been applied
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('record_loan_atomic', {
          p_user_id: userId,
          p_type: 'LEND',
          p_amount: numericAmount,
          p_person: person || '',
          p_note: cleanNote || '',
          p_date: eventDate,
          p_due_date: dueDate || eventDate,
          p_tx_id: stableTxId,
          p_bill_id: stableBillId,
        });

        if (!rpcErr && rpcData?.success) {
          return {
            success: true,
            data: {
              id: rpcData.expense_id,
              billId: rpcData.bill_id,
              expenseId: rpcData.expense_id,
              amount: rpcData.amount,
              type: rpcData.type,
            },
          };
        }

        const isMissingRpc = rpcErr && (
          rpcErr.code === 'PGRST202' ||
          (rpcErr.message && (
            rpcErr.message.includes('Could not find the function') ||
            rpcErr.message.includes('does not exist')
          ))
        );
        if (rpcErr && !isMissingRpc) {
          return { success: false, error: rpcErr.message };
        }
      } catch (err) {
        const isMissingRpc = err && (
          err.code === 'PGRST202' ||
          (err.message && (
            err.message.includes('Could not find the function') ||
            err.message.includes('does not exist')
          ))
        );
        if (!isMissingRpc) {
          return { success: false, error: err.message || 'Failed to record loan.' };
        }
      }

      // 1. Log or update outgoing cash movement (fallback)
      const expRes = id
        ? await updateExpense({
            userId,
            id,
            amount: numericAmount,
            category: 'Lend',
            note: cleanNote || (person ? `Lent to ${person}` : 'Loan'),
            date: eventDate,
          })
        : await addExpense({
            userId,
            amount: numericAmount,
            category: 'Lend',
            note: cleanNote || (person ? `Lent to ${person}` : 'Loan'),
            date: eventDate,
          });
      if (!expRes.success) return expRes;

      // 2. Create or update receivable promise in wealth_bills
      const promiseName = person ? `${person} owes you` : (cleanNote || 'Money owed to you');
      const billDue = dueDate || eventDate;

      let existingBillId = billId;
      if (!existingBillId && id) {
        const { data: b } = await supabase
          .from('wealth_bills')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'receivable')
          .ilike('name', `%${person || cleanNote || 'owes you'}%`)
          .limit(1)
          .maybeSingle();
        if (b?.id) existingBillId = b.id;
      }

      let billRes;
      if (existingBillId) {
        billRes = await updateBill({
          userId,
          id: existingBillId,
          name: promiseName,
          amount: numericAmount,
          dueDate: billDue,
          frequency: 'one_off',
          status: 'receivable',
        });
      } else {
        billRes = await addBill({
          id: billId || null,
          userId,
          name: promiseName,
          amount: numericAmount,
          dueDate: billDue,
          frequency: 'one_off',
          status: 'receivable',
        });
      }

      // Rollback newly created expense if bill creation failed (compensation)
      if (!billRes.success) {
        if (!id && expRes?.data?.id) {
          await supabase.from('money_expenses').delete().eq('id', expRes.data.id).eq('user_id', userId);
        }
        return {
          success: false,
          error: `Failed to record receivable promise: ${billRes.error}. Expense rolled back.`,
        };
      }

      return {
        success: true,
        data: {
          ...expRes.data,
          billId: billRes?.data?.id || existingBillId,
          expenseId: expRes?.data?.id,
          bill: billRes?.data,
          expense: expRes?.data,
        },
      };
    }

    case 'BORROW': {
      const stableTxId = id || crypto.randomUUID();
      const stableBillId = billId || crypto.randomUUID();

      // 0. Attempt atomic database RPC if migration has been applied
      try {
        const { data: rpcData, error: rpcErr } = await supabase.rpc('record_loan_atomic', {
          p_user_id: userId,
          p_type: 'BORROW',
          p_amount: numericAmount,
          p_person: person || '',
          p_note: cleanNote || '',
          p_date: eventDate,
          p_due_date: dueDate || eventDate,
          p_tx_id: stableTxId,
          p_bill_id: stableBillId,
        });

        if (!rpcErr && rpcData?.success) {
          return {
            success: true,
            data: {
              id: rpcData.income_id,
              billId: rpcData.bill_id,
              incomeId: rpcData.income_id,
              amount: rpcData.amount,
              type: rpcData.type,
            },
          };
        }

        const isMissingRpc = rpcErr && (
          rpcErr.code === 'PGRST202' ||
          (rpcErr.message && (
            rpcErr.message.includes('Could not find the function') ||
            rpcErr.message.includes('does not exist')
          ))
        );
        if (rpcErr && !isMissingRpc) {
          return { success: false, error: rpcErr.message };
        }
      } catch (err) {
        const isMissingRpc = err && (
          err.code === 'PGRST202' ||
          (err.message && (
            err.message.includes('Could not find the function') ||
            err.message.includes('does not exist')
          ))
        );
        if (!isMissingRpc) {
          return { success: false, error: err.message || 'Failed to record borrowing.' };
        }
      }

      // 1. Log or update incoming cash (liability fallback)
      const incRes = id
        ? await updateIncome({
            userId,
            id,
            amount: numericAmount,
            source: 'Borrow',
            note: cleanNote || (person ? `Borrowed from ${person}` : 'Liability'),
            date: eventDate,
          })
        : await addIncome({
            userId,
            amount: numericAmount,
            source: 'Borrow',
            note: cleanNote || (person ? `Borrowed from ${person}` : 'Liability'),
            date: eventDate,
          });
      if (!incRes.success) return incRes;

      // 2. Create or update commitment to return it
      const commitmentName = person ? `Return to ${person}` : (cleanNote || 'Repay debt');
      const billDue = dueDate || eventDate;

      let existingBillId = billId;
      if (!existingBillId && id) {
        const { data: b } = await supabase
          .from('wealth_bills')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${person || cleanNote || 'Return to'}%`)
          .limit(1)
          .maybeSingle();
        if (b?.id) existingBillId = b.id;
      }

      let billRes;
      if (existingBillId) {
        billRes = await updateBill({
          userId,
          id: existingBillId,
          name: commitmentName,
          amount: numericAmount,
          dueDate: billDue,
          frequency: 'one_off',
          status: 'unpaid',
        });
      } else {
        billRes = await addBill({
          id: billId || null,
          userId,
          name: commitmentName,
          amount: numericAmount,
          dueDate: billDue,
          frequency: 'one_off',
          status: 'unpaid',
        });
      }

      // Rollback newly created income if bill creation failed (compensation)
      if (!billRes.success) {
        if (!id && incRes?.data?.id) {
          await supabase.from('wealth_income').delete().eq('id', incRes.data.id).eq('user_id', userId);
        }
        return {
          success: false,
          error: `Failed to record borrowing commitment: ${billRes.error}. Income rolled back.`,
        };
      }

      return {
        success: true,
        data: {
          ...incRes.data,
          billId: billRes?.data?.id || existingBillId,
          incomeId: incRes?.data?.id,
          bill: billRes?.data,
          income: incRes?.data,
        },
      };
    }

    case 'COMMITMENT': {
      if (id) {
        return await updateBill({
          userId,
          id,
          name: cleanNote || 'Scheduled payment',
          amount: numericAmount,
          dueDate: dueDate || eventDate,
          frequency: frequency || 'monthly',
        });
      }
      return await addBill({
        userId,
        name: cleanNote || 'Scheduled payment',
        amount: numericAmount,
        dueDate: dueDate || eventDate,
        frequency: frequency || 'monthly',
        status: 'unpaid',
      });
    }

    case 'INVESTMENT': {
      if (id) {
        return await updateExpense({
          userId,
          id,
          amount: numericAmount,
          category: 'Investment',
          note: cleanNote || 'Investment',
          date: eventDate,
        });
      }
      return await addExpense({
        userId,
        amount: numericAmount,
        category: 'Investment',
        note: cleanNote || 'Investment',
        date: eventDate,
      });
    }

    case 'TRANSFER': {
      if (id) {
        return await updateExpense({
          userId,
          id,
          amount: numericAmount,
          category: 'Transfer',
          note: cleanNote || 'Transfer',
          date: eventDate,
        });
      }
      return await addExpense({
        userId,
        amount: numericAmount,
        category: 'Transfer',
        note: cleanNote || 'Transfer',
        date: eventDate,
      });
    }

    case 'REFUND':
    case 'REIMBURSEMENT': {
      if (id) {
        return await updateIncome({
          userId,
          id,
          amount: numericAmount,
          source: 'Refund',
          note: cleanNote || 'Refund/reimbursement',
          date: eventDate,
        });
      }
      return await addIncome({
        userId,
        amount: numericAmount,
        source: 'Refund',
        note: cleanNote || 'Refund/reimbursement',
        date: eventDate,
      });
    }

    default: {
      if (id) {
        return await updateExpense({
          userId,
          id,
          amount: numericAmount,
          category: category || 'Other',
          note: cleanNote,
          date: eventDate,
        });
      }
      return await addExpense({
        userId,
        amount: numericAmount,
        category: category || 'Other',
        note: cleanNote,
        date: eventDate,
      });
    }
  }
}

/**
 * Calibrates the user's cash balance honestly.
 * If user has no income records or needs calibration adjustment,
 * records a baseline income transaction.
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {number} params.targetCash
 * @returns {Promise<{success: boolean, error?: string, data?: Object}>}
 */
export async function calibrateCashBalance({ userId, targetCash }) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const target = Number(targetCash);
  if (!isFinite(target) || isNaN(target) || target < 0) {
    return { success: false, error: 'Target cash must be a non-negative number.' };
  }

  try {
    const snap = await getWealthSnapshot(userId);
    if (!snap.success) return snap;

    const currentTotalInc = (snap.data.incomes || []).reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const currentTotalExp = (snap.data.expenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const currentLiquid = currentTotalInc - currentTotalExp;
    const diff = target - currentLiquid;

    if (diff > 0) {
      return await addIncome({
        userId,
        amount: diff,
        source: 'Starting Balance',
        note: 'Calibrated cash balance',
        date: todayStr(),
      });
    } else if (diff < 0) {
      return await addExpense({
        userId,
        amount: Math.abs(diff),
        category: 'Adjustment',
        note: 'Cash balance calibration adjustment',
        date: todayStr(),
      });
    }

    return { success: true, message: 'Cash already matches target.' };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to calibrate cash.' };
  }
}

/**
 * Resolves a money promise when repayment is received or paid.
 * Supports partial repayments without destroying the obligation,
 * settles full repayment, validates against outstanding balance,
 * and isolates loan principal from earned income and lifestyle spend.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.billId - Obligation UUID in wealth_bills
 * @param {number} params.amount - Repayment amount (must be > 0 and <= outstanding)
 * @param {string} [params.person=''] - Contact person
 * @param {string} [params.note=''] - Optional note
 * @param {string} [params.date=todayStr()] - Repayment date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function resolveMoneyPromise({
  userId,
  billId,
  amount,
  person = '',
  note = '',
  date = todayStr(),
  repaymentId = null,
}) {
  if (!userId || !billId) {
    return { success: false, error: 'User ID and Promise/Bill ID are required.' };
  }
  const numericAmount = Number(amount);
  if (!isFinite(numericAmount) || isNaN(numericAmount) || numericAmount <= 0) {
    return { success: false, error: 'Repayment amount must be a positive number.' };
  }

  const stableRepaymentId = repaymentId || crypto.randomUUID();

  // 0. Attempt atomic database RPC if migration has been applied
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('resolve_loan_repayment_atomic', {
      p_user_id: userId,
      p_bill_id: billId,
      p_amount: numericAmount,
      p_person: person || '',
      p_note: note || '',
      p_date: date || todayStr(),
      p_repayment_id: stableRepaymentId,
    });

    if (!rpcErr && rpcData?.success) {
      return {
        success: true,
        data: {
          billId: rpcData.bill_id,
          repaidAmount: rpcData.repaid_amount,
          remainingBalance: rpcData.remaining_balance,
          status: rpcData.status,
          isFullRepayment: rpcData.is_full_repayment,
          cashTxId: rpcData.cash_tx_id,
          idempotentReplay: !!rpcData.idempotent_replay,
        },
      };
    }

    const isMissingRpc = rpcErr && (
      rpcErr.code === 'PGRST202' ||
      (rpcErr.message && (
        rpcErr.message.includes('Could not find the function') ||
        rpcErr.message.includes('does not exist')
      ))
    );
    if (rpcErr && !isMissingRpc) {
      return { success: false, error: rpcErr.message };
    }
  } catch (err) {
    const isMissingRpc = err && (
      err.code === 'PGRST202' ||
      (err.message && (
        err.message.includes('Could not find the function') ||
        err.message.includes('does not exist')
      ))
    );
    if (!isMissingRpc) {
      return { success: false, error: err.message || 'Failed to resolve loan repayment.' };
    }
  }

  try {
    // 1. Fetch current obligation
    const { data: bill, error: fetchErr } = await supabase
      .from('wealth_bills')
      .select('*')
      .eq('id', billId)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchErr) {
      return { success: false, error: fetchErr.message };
    }
    if (!bill) {
      return { success: false, error: 'Obligation record not found.' };
    }
    if (bill.status === 'paid') {
      return { success: false, error: 'Obligation is already fully settled.' };
    }

    const currentOutstanding = Number(bill.amount);
    if (!isFinite(currentOutstanding) || currentOutstanding <= 0) {
      return { success: false, error: 'Obligation has no outstanding balance.' };
    }

    // 2. Validate repayment amount against outstanding balance
    if (numericAmount > currentOutstanding) {
      return {
        success: false,
        error: `Repayment amount (₹${numericAmount}) cannot exceed outstanding balance of ₹${currentOutstanding}.`,
      };
    }

    const remainingBalance = Math.round((currentOutstanding - numericAmount) * 100) / 100;
    const isFullRepayment = remainingBalance <= 0;
    const eventDate = date || todayStr();
    const contactPerson = (person || bill.name || '')
      .replace(/^Owed by\s+/i, '')
      .replace(/\s+owes you$/i, '')
      .replace(/^Return to\s+/i, '')
      .replace(/^Borrowed from\s+/i, '')
      .trim();

    // 3. Update obligation in wealth_bills
    const updatedStatus = isFullRepayment ? 'paid' : bill.status;
    const { data: updatedBill, error: billUpdateErr } = await supabase
      .from('wealth_bills')
      .update({
        amount: isFullRepayment ? 0 : remainingBalance,
        status: updatedStatus,
      })
      .eq('id', billId)
      .eq('user_id', userId)
      .select()
      .maybeSingle();

    if (billUpdateErr) {
      return { success: false, error: billUpdateErr.message };
    }

    // 4. Log repayment cash movement without inflating earned income or lifestyle spend
    const isReceivable = bill.status === 'receivable' || (bill.name || '').toLowerCase().includes('owes you');
    let cashTxRes = null;

    if (isReceivable) {
      // Repayment of money lent to someone (cash received)
      cashTxRes = await addIncome({
        userId,
        amount: numericAmount,
        source: 'Loan Repayment',
        note: (note || (contactPerson ? `Repaid by ${contactPerson}` : 'Loan repayment received')).trim(),
        date: eventDate,
      });
    } else {
      // Repayment of borrowed debt paid back (cash outflow)
      cashTxRes = await addExpense({
        userId,
        amount: numericAmount,
        category: 'Debt Repayment',
        note: (note || (contactPerson ? `Repaid to ${contactPerson}` : 'Debt repayment paid')).trim(),
        date: eventDate,
      });
    }

    // 5. Compensation: if cash movement fails, restore the bill
    if (!cashTxRes.success) {
      await supabase
        .from('wealth_bills')
        .update({
          amount: currentOutstanding,
          status: bill.status,
        })
        .eq('id', billId)
        .eq('user_id', userId);

      return {
        success: false,
        error: `Failed to record repayment cash transaction: ${cashTxRes.error}. Obligation restored.`,
      };
    }

    // 6. Record installment history in money_promise_repayments if table available
    try {
      await supabase
        .from('money_promise_repayments')
        .insert([{
          id: stableRepaymentId,
          user_id: userId,
          promise_id: billId,
          amount: numericAmount,
          repayment_date: eventDate,
          note: note || `Repayment of ₹${numericAmount}`,
        }]);
    } catch {
      // Non-fatal if money_promises FK does not match this bill ID
    }

    return {
      success: true,
      data: {
        billId,
        repaidAmount: numericAmount,
        remainingBalance: isFullRepayment ? 0 : remainingBalance,
        status: updatedStatus,
        isFullRepayment,
        cashTxId: cashTxRes?.data?.id,
        bill: updatedBill,
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to resolve promise.' };
  }
}

/**
 * Fetches pending unclarified imported transactions for Dex context.
 * @param {string} userId
 * @returns {Promise<Array<Object>>}
 */
export async function getPendingClarifications(userId) {
  if (!userId) return [];
  try {
    const { data: clarif } = await supabase
      .from('imported_transactions')
      .select('id, counterparty, amount, direction, raw_description, review_reason')
      .eq('user_id', userId)
      .eq('resolution_state', 'needs_review')
      .eq('status', 'pending')
      .limit(10);
    if (clarif && clarif.length) return clarif;

    if (typeof window !== 'undefined') {
      const local = JSON.parse(localStorage.getItem('zyrbit_import_txs_fallback') || '[]');
      return local.filter(t => t.user_id === userId && t.resolution_state === 'needs_review' && t.status === 'pending');
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetches user savings goals.
 * @param {string} userId
 * @returns {Promise<{success: boolean, data: Array<Object>, error?: string}>}
 */
export async function getSavingsGoals(userId) {
  if (!userId) return { success: false, data: [] };
  try {
    const { data, error } = await supabase
      .from('wealth_savings_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) return { success: false, data: [], error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Adds a savings goal.
 */
export async function addSavingsGoal({ userId, name, targetAmount, currentAmount = 0, deadline = null }) {
  if (!userId) return { success: false, error: 'User ID is required.' };
  const cleanName = (name || '').trim();
  if (!cleanName) return { success: false, error: 'Goal name is required.' };
  const numTarget = Number(targetAmount);
  if (!isFinite(numTarget) || numTarget <= 0) return { success: false, error: 'Target amount must be positive.' };

  const payload = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: cleanName,
    target_amount: numTarget,
    current_amount: Math.max(0, Number(currentAmount || 0)),
    deadline: deadline || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('wealth_savings_goals')
      .insert([payload])
      .select()
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || payload };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Updates a savings goal.
 */
export async function updateSavingsGoal({ userId, id, name, targetAmount, currentAmount, deadline }) {
  if (!userId || !id) return { success: false, error: 'User ID and Goal ID are required.' };
  const payload = { updated_at: new Date().toISOString() };
  if (name !== undefined) payload.name = (name || '').trim();
  if (targetAmount !== undefined) payload.target_amount = Number(targetAmount);
  if (currentAmount !== undefined) payload.current_amount = Number(currentAmount);
  if (deadline !== undefined) payload.deadline = deadline;

  try {
    const { data, error } = await supabase
      .from('wealth_savings_goals')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .maybeSingle();
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Deletes a savings goal.
 */
export async function deleteSavingsGoal({ userId, id }) {
  if (!userId || !id) return { success: false, error: 'User ID and Goal ID are required.' };
  try {
    const { error } = await supabase
      .from('wealth_savings_goals')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

