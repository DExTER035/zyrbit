/**
 * Zyrbit / DexOS — Wealth Domain Service
 * Pure JavaScript domain operations for expenses, income, bills, and budget settings.
 * Pure Supabase mutations without React state dependencies.
 */

import { supabase } from '../lib/supabase/index.js';
import { computeTotalIncome, computeTotalExpense } from '../engines/wealth/index.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

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
    id: crypto.randomUUID(),
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
    const { error } = await supabase
      .from('money_expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
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
    id: crypto.randomUUID(),
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
    id: crypto.randomUUID(),
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
    const { error } = await supabase
      .from('wealth_bills')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
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
  const budget = Math.max(0, Number(monthlyBudget) || 15000);

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

    const totalExpensesMonth = computeTotalExpense(expenses);
    const totalIncomeMonth = computeTotalIncome(incomes);
    const todayExpenses = expenses.filter((e) => e.expense_date === today);
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

