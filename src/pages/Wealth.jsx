import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import { earnZyrons } from '../lib/zyrons';
import ErrorState from '../components/ErrorState';
import { X, TrendingDown, TrendingUp, Settings2, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Design Tokens (Wealth pillar — teal accent) ────────────────────────────
const W = {
  bg:      '#0B0D0F',
  surface: '#15181B',
  card:    '#1B1F23',
  border:  '#1E2126',
  border2: '#262B31',
  text:    '#F8FAFC',
  sub:     '#94A3B8',
  muted:   '#64748B',
  dim:     '#2A3038',
  accent:  '#14B8A6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger:  '#EF4444',
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return d.toISOString().split('T')[0];
};

const fmtCurrency = (sym, amount) => {
  const n = Math.abs(Number(amount));
  if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${sym}${n.toLocaleString('en-IN')}`;
  return `${sym}${n.toFixed(0)}`;
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const safeUntilDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(0, days));
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ─── Runway status: calm, supportive language ────────────────────────────────
function getRunwayStatus(days) {
  if (days >= 999) return { color: W.accent, label: 'Stable', message: 'Stable runway. Spending is at zero.' };
  if (days >= 90) return { color: W.success, label: 'Strong', message: "You're well within your budget." };
  if (days >= 60) return { color: W.success, label: 'Safe',   message: "You're spending normally." };
  if (days >= 30) return { color: W.accent,  label: 'Steady', message: 'No action needed today.' };
  if (days >= 14) return { color: W.warning, label: 'Watch',  message: 'Consider slowing spending this week.' };
  return           { color: W.danger,  label: 'Tight',  message: 'Reduce non-essential spending soon.' };
}

// ─── Category maps ───────────────────────────────────────────────────────────
const EXP_CATEGORIES = {
  'Food':                   '🍔',
  'Rent & Bills':           '🏠',
  'Tools & Subscriptions':  '💻',
  'Leisure':                '🎉',
  'Other':                  '📦',
};

const INC_SOURCES = {
  'Salary':      '💼',
  'Freelance':   '🛠',
  'Side Income': '🚀',
  'One-time':    '🎁',
};

// ─── Category color palette (ambient highlights) ────────────────────────────
const CAT_COLORS = {
  // Expenses
  'Food':                  '#F59E0B',
  'Rent & Bills':          '#EF4444',
  'Tools & Subscriptions': '#8B7FFF',
  'Leisure':               '#EC4899',
  'Other':                 '#6B7280',
  // Income
  'Salary':      '#10B981',
  'Freelance':   '#14B8A6',
  'Side Income': '#22C55E',
  'One-time':    '#F59E0B',
};

// ─── Primitive: bottom sheet modal ──────────────────────────────────────────
function BottomSheet({ title, onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 200,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: W.surface,
          border: `1px solid ${W.border2}`,
          borderRadius: '24px 24px 0 0',
          width: '100%', maxWidth: '430px',
          padding: '24px 20px 52px',
          animation: 'slideUpSheet 0.25s cubic-bezier(0.4,0,0.2,1)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: W.text }}>{title}</span>
          <button
            onClick={onClose}
            style={{ background: W.dim, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: W.sub }}
          >
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Primitive: section label ────────────────────────────────────────────────
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

// ─── Primitive: form label ───────────────────────────────────────────────────
function FLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
      {children}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Wealth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const todayDate = getLocalYMD();
  const curMonth  = todayDate.slice(0, 7);

  // ─── Data ──────────────────────────────────────────────────────────────────
  const [settings,   setSettings]   = useState(null);
  const [expenses,   setExpenses]   = useState([]);
  const [incomes,    setIncomes]    = useState([]);
  const [bills,      setBills]      = useState([]);

  // ─── UI State ──────────────────────────────────────────────────────────────
  const [activeModal,        setActiveModal]        = useState(null); // null | 'expense' | 'income' | 'manage' | 'settings'
  const [showAllActivity,    setShowAllActivity]    = useState(false);
  const [confirmSheet,       setConfirmSheet]       = useState(null);

  // ─── Forms ─────────────────────────────────────────────────────────────────
  const [setupForm, setSetupForm] = useState({ currency: '₹', budget: 15000 });
  const [expForm,   setExpForm]   = useState({ amount: '', category: 'Food',       note: '', date: todayDate });
  const [incForm,   setIncForm]   = useState({ amount: '', source:   'Side Income', note: '', date: todayDate });
  const [billForm,  setBillForm]  = useState({ name: '', amount: '', due_date: todayDate, frequency: 'monthly' });

  // ─── LocalStorage helpers ───────────────────────────────────────────────────
  const LS_KEY = (kind) => `dexos_wealth_${kind}_${user?.id}`;
  const lsSet  = (kind, val) => { try { localStorage.setItem(LS_KEY(kind), JSON.stringify(val)); } catch { /* quota */ } };

  // ─── Data fetcher ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    const lsKey = (kind) => `dexos_wealth_${kind}_${uid}`;
    const lsGetU = (kind) => { try { return JSON.parse(localStorage.getItem(lsKey(kind))); } catch { return null; } };
    try {
      const [sRes, eRes, iRes, bRes] = await Promise.all([
        supabase.from('wealth_settings').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('money_expenses').select('*').eq('user_id', uid).order('expense_date', { ascending: false }),
        supabase.from('wealth_income').select('*').eq('user_id', uid).order('income_date', { ascending: false }),
        supabase.from('wealth_bills').select('*').eq('user_id', uid).order('due_date', { ascending: true }),
      ]);

      // Settings — DB first, then localStorage fallback
      let sData = sRes.data;
      if (sRes.error) {
        console.warn('Wealth settings fetch error, using local fallback:', sRes.error.message);
        sData = lsGetU('settings');
      }
      if (sData) {
        setSettings(sData);
        setSetupForm({
          currency: sData.currency === 'INR' ? '₹' : sData.currency === 'USD' ? '$' : '€',
          budget:   sData.monthly_budget,
        });
      } else {
        setSettings(null);
      }

      // Expenses
      if (eRes.error) {
        console.warn('Expenses fetch error, using local fallback:', eRes.error.message);
        setExpenses(lsGetU('expenses') || []);
      } else {
        setExpenses(eRes.data || []);
      }

      // Income
      if (iRes.error) {
        console.warn('Income fetch error, using local fallback:', iRes.error.message);
        setIncomes(lsGetU('income') || []);
      } else {
        setIncomes(iRes.data || []);
      }

      // Bills
      if (bRes.error) {
        console.warn('Bills fetch error, using local fallback:', bRes.error.message);
        setBills(lsGetU('bills') || []);
      } else {
        setBills(bRes.data || []);
      }
    } catch (e) {
      console.warn('Wealth load error:', e.message);
      // Full fallback to localStorage
      const s = lsGetU('settings');
      if (s) {
        setSettings(s);
        setSetupForm({
          currency: s.currency === 'INR' ? '₹' : s.currency === 'USD' ? '$' : '€',
          budget:   s.monthly_budget,
        });
      }
      setExpenses(lsGetU('expenses') || []);
      setIncomes(lsGetU('income') || []);
      setBills(lsGetU('bills') || []);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadData(session.user.id);
      }
    });
  }, [navigate, loadData]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const saveSetup = async (e) => {
    e.preventDefault();
    if (!user) return;
    const settingsObj = {
      user_id:        user.id,
      currency:       setupForm.currency === '₹' ? 'INR' : setupForm.currency === '$' ? 'USD' : 'EUR',
      monthly_budget: Number(setupForm.budget),
      created_at:     new Date().toISOString(),
    };
    // Try Supabase first
    const { data } = await supabase.from('wealth_settings').upsert(settingsObj, { onConflict: 'user_id' }).select().maybeSingle();
    // Always save locally & update state so the user is never blocked
    lsSet('settings', data || settingsObj);
    setSettings(data || settingsObj);
    showToast('💰 Settings saved!', 'success');
    setActiveModal(null);
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    const amt = parseFloat(expForm.amount);
    if (!amt || amt <= 0 || !user) return;
    const newExp = {
      id:           crypto.randomUUID(),
      user_id:      user.id,
      amount:       amt,
      category:     expForm.category,
      note:         expForm.note || expForm.category,
      expense_date: expForm.date,
      created_at:   new Date().toISOString(),
    };
    const { error: dbErr } = await supabase.from('money_expenses').insert(newExp);
    // Update local state immediately
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    lsSet('expenses', updated);
    showToast('💸 Expense logged!', 'success');
    try { await earnZyrons(user.id, 5, 'Money logged'); } catch { /* ok */ }
    setExpForm({ amount: '', category: 'Food', note: '', date: todayDate });
    setActiveModal(null);
    if (!dbErr) loadData(user.id);
  };

  const saveIncome = async (e) => {
    e.preventDefault();
    const amt = parseFloat(incForm.amount);
    if (!amt || amt <= 0 || !user) return;
    const newInc = {
      id:          crypto.randomUUID(),
      user_id:     user.id,
      amount:      amt,
      source:      incForm.source,
      note:        incForm.note,
      income_date: incForm.date,
      created_at:  new Date().toISOString(),
    };
    const { error: dbErr } = await supabase.from('wealth_income').insert(newInc);
    const updated = [newInc, ...incomes];
    setIncomes(updated);
    lsSet('income', updated);
    showToast('💵 Income logged!', 'success');
    try { await earnZyrons(user.id, 10, 'Income logged'); } catch { /* ok */ }
    setIncForm({ amount: '', source: 'Side Income', note: '', date: todayDate });
    setActiveModal(null);
    if (!dbErr) loadData(user.id);
  };

  const saveBill = async (e) => {
    e.preventDefault();
    const amt = parseFloat(billForm.amount);
    if (!amt || amt <= 0 || !billForm.name || !user) return;
    const newBill = {
      id:         crypto.randomUUID(),
      user_id:    user.id,
      name:       billForm.name,
      amount:     amt,
      due_date:   billForm.due_date,
      frequency:  billForm.frequency,
      status:     'unpaid',
      created_at: new Date().toISOString(),
    };
    const { error: dbErr } = await supabase.from('wealth_bills').insert(newBill);
    const updated = [...bills, newBill].sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    setBills(updated);
    lsSet('bills', updated);
    showToast('📅 Bill added!', 'success');
    setBillForm({ name: '', amount: '', due_date: todayDate, frequency: 'monthly' });
    setActiveModal(null);
    if (!dbErr) loadData(user.id);
  };

  const toggleBillStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    await supabase.from('wealth_bills').update({ status: newStatus }).eq('id', id);
    const updated = bills.map(b => b.id === id ? { ...b, status: newStatus } : b);
    setBills(updated);
    lsSet('bills', updated);
    showToast(newStatus === 'paid' ? '✅ Bill paid!' : '⏳ Marked unpaid', 'success');
  };

  const deleteBill = (id) => {
    setConfirmSheet({
      message: 'Delete this bill?',
      onConfirm: async () => {
        await supabase.from('wealth_bills').delete().eq('id', id);
        const updated = bills.filter(b => b.id !== id);
        setBills(updated);
        lsSet('bills', updated);
        showToast('🗑 Bill deleted', 'success');
      },
    });
  };

  const deleteExpense = (id) => {
    setConfirmSheet({
      message: 'Delete this expense?',
      onConfirm: async () => {
        await supabase.from('money_expenses').delete().eq('id', id);
        const updated = expenses.filter(e => e.id !== id);
        setExpenses(updated);
        lsSet('expenses', updated);
        showToast('🗑 Expense deleted', 'success');
      },
    });
  };

  const deleteIncome = (id) => {
    setConfirmSheet({
      message: 'Delete this income entry?',
      onConfirm: async () => {
        await supabase.from('wealth_income').delete().eq('id', id);
        const updated = incomes.filter(i => i.id !== id);
        setIncomes(updated);
        lsSet('income', updated);
        showToast('🗑 Income deleted', 'success');
      },
    });
  };




  // ─── Computations ──────────────────────────────────────────────────────────
  const sym = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₹';

  const presets = useMemo(() => {
    if (sym === '₹') {
      return {
        expense: [100, 200, 500, 1000],
        income: [5000, 10000, 25000, 50000]
      };
    }
    return {
      expense: [5, 10, 20, 50],
      income: [100, 500, 1000, 2000]
    };
  }, [sym]);

  const totalIncome         = useMemo(() => incomes.reduce((s, i) => s + Number(i.amount), 0), [incomes]);
  const totalExpenseAllTime = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);
  const liquidCash          = totalIncome - totalExpenseAllTime;

  // 30-day burn rate
  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return getLocalYMD(d);
  }, []);
  const burnLast30     = useMemo(() => expenses.filter(e => e.expense_date >= thirtyDaysAgoStr).reduce((s, e) => s + Number(e.amount), 0), [expenses, thirtyDaysAgoStr]);
  const dailyBurnRate  = burnLast30 > 0 ? burnLast30 / 30 : 0;
  const runwayDays     = dailyBurnRate > 0 ? Math.round(liquidCash / dailyBurnRate) : 999;
  const runwayStatus   = getRunwayStatus(runwayDays);

  // Today's spend
  const todaySpend     = useMemo(() => expenses.filter(e => e.expense_date === todayDate).reduce((s, e) => s + Number(e.amount), 0), [expenses, todayDate]);
  const yesterdayDate  = useMemo(() => { const d = new Date(); d.setDate(d.getDate() - 1); return getLocalYMD(d); }, []);
  const yesterdaySpend = useMemo(() => expenses.filter(e => e.expense_date === yesterdayDate).reduce((s, e) => s + Number(e.amount), 0), [expenses, yesterdayDate]);

  // Month budget
  const monthBudget = settings?.monthly_budget || 15000;
  const monthTotal  = useMemo(() => expenses.filter(e => e.expense_date.startsWith(curMonth)).reduce((s, e) => s + Number(e.amount), 0), [expenses, curMonth]);
  const budgetPct   = Math.min(100, Math.round((monthTotal / monthBudget) * 100));

  // Next unpaid bill
  const nextBill = useMemo(() => bills.filter(b => b.status === 'unpaid').sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0] || null, [bills]);
  const unpaidBillsTotal = useMemo(() => bills.filter(b => b.status === 'unpaid').reduce((s, b) => s + Number(b.amount), 0), [bills]);

  // ─── Spending breakdown (daily / weekly / monthly / yearly) ────────────────
  const [breakdownPeriod, setBreakdownPeriod] = useState('month');

  const weekStart = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - d.getDay());
    return getLocalYMD(d);
  }, []);
  const curYear = todayDate.slice(0, 4);

  const weeklySpend  = useMemo(() => expenses.filter(e => e.expense_date >= weekStart).reduce((s, e) => s + Number(e.amount), 0), [expenses, weekStart]);
  const yearlySpend  = useMemo(() => expenses.filter(e => e.expense_date.startsWith(curYear)).reduce((s, e) => s + Number(e.amount), 0), [expenses, curYear]);

  // Per-category breakdown for the active period
  const categoryBreakdown = useMemo(() => {
    let filtered;
    if (breakdownPeriod === 'today')      filtered = expenses.filter(e => e.expense_date === todayDate);
    else if (breakdownPeriod === 'week')  filtered = expenses.filter(e => e.expense_date >= weekStart);
    else if (breakdownPeriod === 'month') filtered = expenses.filter(e => e.expense_date.startsWith(curMonth));
    else                                 filtered = expenses.filter(e => e.expense_date.startsWith(curYear));

    const map = {};
    filtered.forEach(e => {
      const cat = e.category || 'Other';
      map[cat] = (map[cat] || 0) + Number(e.amount);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => ({ cat, amt, pct: total > 0 ? Math.round((amt / total) * 100) : 0 }));
  }, [expenses, breakdownPeriod, todayDate, weekStart, curMonth, curYear]);

  const breakdownTotal = useMemo(() => {
    if (breakdownPeriod === 'today') return todaySpend;
    if (breakdownPeriod === 'week')  return weeklySpend;
    if (breakdownPeriod === 'month') return monthTotal;
    return yearlySpend;
  }, [breakdownPeriod, todaySpend, weeklySpend, monthTotal, yearlySpend]);

  // Combined activity feed
  const combinedActivity = useMemo(() => [
    ...expenses.map(e => ({ ...e, _type: 'expense', _date: e.expense_date })),
    ...incomes.map(i  => ({ ...i,  _type: 'income',  _date: i.income_date  })),
  ].sort((a, b) => new Date(b._date) - new Date(a._date)), [expenses, incomes]);

  // Group activity date-by-date for daily tallying
  const activityByDate = useMemo(() => {
    const groups = {};
    combinedActivity.forEach(t => {
      const date = t._date;
      if (!groups[date]) {
        groups[date] = { date, items: [], net: 0, spent: 0, earned: 0 };
      }
      groups[date].items.push(t);
      const amt = Number(t.amount);
      if (t._type === 'income') {
        groups[date].net += amt;
        groups[date].earned += amt;
      } else {
        groups[date].net -= amt;
        groups[date].spent += amt;
      }
    });
    return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [combinedActivity]);

  const formatGroupDate = useCallback((dateStr) => {
    if (dateStr === todayDate) return 'Today';
    if (dateStr === yesterdayDate) return 'Yesterday';
    try {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  }, [todayDate, yesterdayDate]);

  const groupsToShow = useMemo(() => {
    return showAllActivity ? activityByDate : activityByDate.slice(0, 3);
  }, [activityByDate, showAllActivity]);

  // One-line insight
  const insight = useMemo(() => {
    if (runwayDays < 14)                          return `Your runway is low. Pause non-essential spending today.`;
    if (todaySpend === 0)                         return `No spending logged today. You're off to a good start.`;
    if (todaySpend < yesterdaySpend * 0.8)        return `You spent less than yesterday. Good momentum.`;
    if (todaySpend > yesterdaySpend * 1.5 && yesterdaySpend > 0) return `Spending is higher than yesterday. Worth a quick check.`;
    if (budgetPct >= 90)                          return `You've used ${budgetPct}% of your monthly budget.`;
    if (nextBill)                                 return `${nextBill.name} (${sym}${Number(nextBill.amount).toLocaleString()}) is due ${fmtDate(nextBill.due_date)}.`;
    return `Your runway improved. Keep spending normally.`;
  }, [runwayDays, todaySpend, yesterdaySpend, budgetPct, nextBill, sym]);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: W.bg, minHeight: '100vh', padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
            <div className="skeleton-box" style={{ height: '10px', width: '35%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '70%' }} />
          </div>
          <div className="skeleton-box" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '200px', borderRadius: '24px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <div className="skeleton-box" style={{ height: '48px', flex: 1, borderRadius: '14px' }} />
          <div className="skeleton-box" style={{ height: '48px', flex: 1, borderRadius: '14px' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton-box" style={{ height: '72px', borderRadius: '16px' }} />)}
        </div>
      </div>
    );
  }

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ background: W.bg, minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    );
  }

  // ─── First-time setup ──────────────────────────────────────────────────────
  if (!settings) {
    return (
      <div className="app-container" style={{ background: W.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '40px 24px', textAlign: 'center', width: '100%', maxWidth: '360px', margin: '0 auto' }}>
          <div style={{ fontSize: '44px', marginBottom: '16px' }}>💰</div>
          <h1 style={{ color: W.text, fontSize: '22px', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>Set Up Wealth</h1>
          <p style={{ color: W.muted, fontSize: '13px', marginBottom: '32px', lineHeight: 1.5 }}>
            Set your monthly budget so DexOS can calculate your runway.
          </p>
          <form onSubmit={saveSetup}>
            <FLabel>Currency</FLabel>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
              {['₹', '$', '€'].map(c => (
                <button key={c} type="button"
                  onClick={() => setSetupForm({ ...setupForm, currency: c })}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px',
                    border: `2px solid ${setupForm.currency === c ? W.accent : W.border}`,
                    background: setupForm.currency === c ? `${W.accent}15` : W.surface,
                    color: setupForm.currency === c ? W.accent : W.muted,
                    fontSize: '20px', fontWeight: 800, cursor: 'pointer',
                  }}
                >{c}</button>
              ))}
            </div>
            <FLabel>Monthly Budget</FLabel>
            <div style={{ position: 'relative', marginBottom: '28px' }}>
              <span style={{ position: 'absolute', left: '16px', top: '16px', fontSize: '18px', fontWeight: 900, color: W.accent }}>{setupForm.currency}</span>
              <input
                type="number" step="10" min="1" required
                className="input"
                value={setupForm.budget}
                onChange={e => setSetupForm({ ...setupForm, budget: e.target.value })}
                style={{ paddingLeft: '40px', width: '100%', fontSize: '20px', fontWeight: 800, color: W.accent, outline: 'none' }}
              />
            </div>
            <button type="submit" style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: W.accent, color: '#000',
              fontWeight: 900, fontSize: '15px', border: 'none', cursor: 'pointer',
            }}>
              Start Tracking
            </button>
          </form>
        </div>
        <BottomNav activeTab="wealth" onTabChange={t => navigate(t === 'zenith' ? '/' : `/${t}`)} />
      </div>
    );
  }

  // ─── MAIN RENDER ───────────────────────────────────────────────────────────

  return (
    <div
      className="app-container page-enter"
      style={{ background: W.bg, minHeight: '100vh', color: W.text, position: 'relative' }}
    >
      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', color: W.accent, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '4px' }}>WEALTH</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: W.text, letterSpacing: '-0.5px' }}>Financial OS.</h1>
          <div style={{ fontSize: '11px', color: W.muted, marginTop: '3px' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </div>
        </div>
        <button
          onClick={() => setActiveModal('manage')}
          style={{
            background: W.surface, border: `1px solid ${W.border}`,
            borderRadius: '10px', padding: '8px 10px',
            cursor: 'pointer', color: W.muted, display: 'flex', alignItems: 'center', gap: '6px',
            fontSize: '11px', fontWeight: 700,
          }}
        >
          <Settings2 size={14} />
          Manage
        </button>
      </div>

      {/* ─── MAIN FEED ───────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>

        {/* ── 1. RUNWAY HERO ───────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(145deg, ${W.surface} 0%, ${W.card} 100%)`,
          border: `1px solid ${W.border}`,
          borderTop: `3px solid ${runwayStatus.color}`,
          borderRadius: '24px',
          padding: '20px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 0 40px ${runwayStatus.color}0A, 0 4px 24px rgba(0,0,0,0.35)`,
        }}>
          {/* Ambient glow */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '240px', height: '100px',
            background: `radial-gradient(ellipse at top, ${runwayStatus.color}0D 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          {/* Headline row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: runwayStatus.color, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase' }}>
              RUNWAY STATUS
            </div>
            <div style={{ fontSize: '11px', color: runwayStatus.color, fontWeight: 700 }}>
              {runwayStatus.label}
            </div>
          </div>

          {/* Hero Runway Display */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            {runwayDays >= 999 ? (
              <span style={{ fontSize: '44px', fontWeight: 900, color: W.text, letterSpacing: 'var(--ls-tight)', lineHeight: 1 }}>Calm</span>
            ) : (
              <>
                <span style={{ fontSize: '52px', fontWeight: 900, color: W.text, letterSpacing: 'var(--ls-tight)', lineHeight: 1 }}>
                  {runwayDays}
                </span>
                <span style={{ fontSize: '16px', color: W.sub, fontWeight: 700 }}>days</span>
              </>
            )}
          </div>

          {/* Safe until date & human prompt */}
          <div style={{ fontSize: '12px', color: W.sub, fontWeight: 500, marginBottom: '14px' }}>
            {runwayDays < 999 ? (
              <>Safe until <span style={{ color: runwayStatus.color, fontWeight: 700 }}>{safeUntilDate(runwayDays)}</span></>
            ) : (
              runwayStatus.message
            )}
          </div>

          {/* Month budget bar */}
          {budgetPct > 0 && (
            <div style={{ borderTop: `1px solid ${W.border}`, paddingTop: '12px', paddingBottom: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '10px' }}>
                <span style={{ color: W.muted, fontWeight: 700 }}>MONTH BUDGET</span>
                <span style={{ color: budgetPct >= 90 ? W.danger : budgetPct >= 70 ? W.warning : W.success, fontWeight: 800 }}>
                  {budgetPct}% used ({sym}{monthTotal.toLocaleString()} / {sym}{monthBudget.toLocaleString()})
                </span>
              </div>
              <div style={{ height: '4px', background: W.dim, borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${budgetPct}%`,
                  background: budgetPct >= 90 ? W.danger : budgetPct >= 70 ? W.warning : W.success,
                  borderRadius: '4px',
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          )}

          {/* Next Bill Pill (inline inside the hero card if exists) */}
          {nextBill && (
            <div style={{
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid ${W.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                <span style={{ color: W.warning, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', fontSize: '9px' }}>NEXT BILL:</span>
                <span style={{ color: W.text, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextBill.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', flexShrink: 0 }}>
                <strong style={{ color: W.warning }}>{sym}{Number(nextBill.amount).toLocaleString()}</strong>
                <span style={{ color: W.muted, fontSize: '10px' }}>({fmtDate(nextBill.due_date)})</span>
              </div>
            </div>
          )}
        </div>

        {/* ── 2. QUICK ACTIONS ─────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => setActiveModal('expense')}
            style={{
              padding: '14px 16px', borderRadius: '14px',
              background: W.surface,
              border: `1px solid ${W.border}`,
              color: W.text,
              fontWeight: 800, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <TrendingDown size={16} />
            Log Expense
          </button>
          <button
            onClick={() => setActiveModal('income')}
            style={{
              padding: '14px 16px', borderRadius: '14px',
              background: `${W.success}12`,
              border: `1px solid ${W.success}28`,
              color: W.success,
              fontWeight: 800, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              transition: 'all 0.15s',
            }}
          >
            <TrendingUp size={16} />
            Log Income
          </button>
        </div>

        {/* ── 3. TODAY'S SNAPSHOT ──────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          {/* Balance */}
          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Balance</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: liquidCash >= 0 ? W.text : W.danger, letterSpacing: '-0.5px' }}>
              {fmtCurrency(sym, liquidCash)}
            </div>
          </div>

          {/* Today's spend */}
          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Today</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: todaySpend > 0 ? W.danger : W.muted, letterSpacing: '-0.5px' }}>
              {todaySpend > 0 ? `-${fmtCurrency(sym, todaySpend)}` : '—'}
            </div>
          </div>

          {/* Avg daily */}
          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Daily avg</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: W.text, letterSpacing: '-0.5px' }}>
              {dailyBurnRate > 0 ? fmtCurrency(sym, dailyBurnRate) : '—'}
            </div>
          </div>
        </div>

        {/* ── 3b. SPENDING BREAKDOWN ─────────────────────────────────────── */}
        <div style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
          borderRadius: '20px',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {/* Header + Period Tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '10px', color: W.muted, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>Spending</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{ id: 'today', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'year', label: 'Year' }].map(p => (
                <button
                  key={p.id}
                  onClick={() => setBreakdownPeriod(p.id)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: breakdownPeriod === p.id ? `${W.accent}20` : 'transparent',
                    color: breakdownPeriod === p.id ? W.accent : W.muted,
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Total for period */}
          <div>
            <div style={{ fontSize: '24px', fontWeight: 900, color: breakdownTotal > 0 ? W.text : W.muted, letterSpacing: '-0.5px' }}>
              {breakdownTotal > 0 ? fmtCurrency(sym, breakdownTotal) : `${sym}0`}
            </div>
            <div style={{ fontSize: '11px', color: W.muted, marginTop: '2px' }}>
              {breakdownPeriod === 'today' ? 'spent today'
                : breakdownPeriod === 'week' ? 'spent this week'
                : breakdownPeriod === 'month' ? 'spent this month'
                : 'spent this year'}
            </div>
          </div>

          {/* Category bars */}
          {categoryBreakdown.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {categoryBreakdown.slice(0, 5).map(({ cat, amt, pct }) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{EXP_CATEGORIES[cat] || '📦'}</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: W.text }}>{cat}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: W.sub }}>
                      {fmtCurrency(sym, amt)}
                      <span style={{ fontSize: '10px', color: W.muted, fontWeight: 600, marginLeft: '4px' }}>{pct}%</span>
                    </span>
                  </div>
                  <div style={{ height: '4px', background: W.dim, borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: CAT_COLORS[cat] || W.accent,
                      borderRadius: '4px',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: W.muted, textAlign: 'center', padding: '8px 0' }}>
              No expenses logged for this period.
            </div>
          )}
        </div>

        {/* ── 4. RECENT ACTIVITY (DATE BY DATE DAILY TALLY) ────────────────── */}
        {activityByDate.length > 0 && (
          <div>
            <SectionLabel>Recent Activity</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {groupsToShow.map(group => (
                <div key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {/* Daily Date Header + Subtotal Tally */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: W.muted, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {formatGroupDate(group.date)}
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 800, display: 'flex', gap: '8px' }}>
                      {group.earned > 0 && <span style={{ color: W.success }}>+{fmtCurrency(sym, group.earned)}</span>}
                      {group.spent > 0 && <span style={{ color: W.danger }}>-{fmtCurrency(sym, group.spent)}</span>}
                    </div>
                  </div>

                  {/* Daily transactions list */}
                  {group.items.map(t => {
                    const isInc = t._type === 'income';
                    const icon  = isInc ? (INC_SOURCES[t.source] || '💰') : (EXP_CATEGORIES[t.category] || '📦');
                    const catKey = isInc ? t.source : t.category;
                    const dotColor = CAT_COLORS[catKey] || W.muted;
                    return (
                      <div key={t.id} style={{
                        background: W.surface,
                        border: `1px solid ${W.border}`,
                        borderRadius: '14px',
                        padding: '11px 14px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', minWidth: 0 }}>
                          {/* Category dot indicator */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <span style={{ fontSize: '18px' }}>{icon}</span>
                            <div style={{
                              position: 'absolute',
                              bottom: '-1px',
                              right: '-2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: dotColor,
                              boxShadow: `0 0 6px ${dotColor}80`,
                              border: `1.5px solid ${W.surface}`,
                            }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {t.note || t.source || t.category}
                            </div>
                            <div style={{ fontSize: '10px', color: W.muted, marginTop: '2px' }}>
                              {isInc ? t.source : t.category}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flexShrink: 0, marginLeft: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 900, color: isInc ? W.success : W.text }}>
                            {isInc ? '+' : '-'}{fmtCurrency(sym, t.amount)}
                          </div>
                          <button
                            onClick={() => isInc ? deleteIncome(t.id) : deleteExpense(t.id)}
                            style={{ fontSize: '9px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '3px', padding: 0 }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {activityByDate.length > 3 && (
                <button
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  style={{
                    background: 'transparent', border: `1px solid ${W.border}`,
                    borderRadius: '12px', padding: '10px',
                    color: W.muted, fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                  }}
                >
                  {showAllActivity ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllActivity ? 'Show less days' : `Show ${activityByDate.length - 3} more days`}
                </button>
              )}
            </div>
          </div>
        )}

        {activityByDate.length === 0 && (
          <div style={{ textAlign: 'center', color: W.muted, padding: '20px 0', fontSize: '12px' }}>
            No transactions yet. Log your first expense above.
          </div>
        )}

        {/* ── 5. INSIGHT ───────────────────────────────────────────────────── */}
        <div style={{
          background: `${W.accent}08`,
          border: `1px solid ${W.accent}20`,
          borderRadius: '14px',
          padding: '14px 16px',
        }}>
          <div style={{ fontSize: '9px', color: W.accent, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '5px' }}>INSIGHT</div>
          <div style={{ fontSize: '13px', color: W.sub, lineHeight: 1.5 }}>{insight}</div>
        </div>

      </div>

      {/* ─── EXPENSE BOTTOM SHEET ─────────────────────────────────────────────── */}
      {activeModal === 'expense' && (
        <BottomSheet title="Log Expense" onClose={() => setActiveModal(null)}>
          <form onSubmit={saveExpense}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Amount */}
              <div>
                <FLabel>Amount</FLabel>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '15px', fontSize: '18px', fontWeight: 900, color: W.danger }}>{sym}</span>
                  <input
                    type="number" step="0.01" min="0.01" required
                    className="input"
                    placeholder="0"
                    autoFocus
                    style={{ paddingLeft: '38px', fontSize: '20px', fontWeight: 800, width: '100%', outline: 'none' }}
                    value={expForm.amount}
                    onChange={e => setExpForm({ ...expForm, amount: e.target.value })}
                  />
                </div>
                {/* Presets */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {presets.expense.map(val => (
                    <button
                      key={val} type="button"
                      onClick={() => setExpForm({ ...expForm, amount: val.toString() })}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        border: `1px solid ${expForm.amount === val.toString() ? W.accent : W.border}`,
                        background: expForm.amount === val.toString() ? `${W.accent}15` : W.card,
                        color: expForm.amount === val.toString() ? W.accent : W.sub,
                        fontWeight: 700, fontSize: '11px', cursor: 'pointer',
                        outline: 'none', whiteSpace: 'nowrap'
                      }}
                    >
                      {sym}{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category chips */}
              <div>
                <FLabel>Category</FLabel>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(EXP_CATEGORIES).map(([k, v]) => (
                    <button
                      key={k} type="button"
                      onClick={() => setExpForm({ ...expForm, category: k })}
                      style={{
                        padding: '8px 12px', borderRadius: '10px',
                        border: `1px solid ${expForm.category === k ? W.danger : W.border}`,
                        background: expForm.category === k ? `${W.danger}15` : W.card,
                        color: expForm.category === k ? W.danger : W.sub,
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        outline: 'none', transition: 'all 0.15s',
                      }}
                    >
                      {v} {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <FLabel>Note (optional)</FLabel>
                <input
                  type="text"
                  className="input"
                  placeholder="Starbucks, AWS, Gym..."
                  style={{ width: '100%', outline: 'none' }}
                  value={expForm.note}
                  onChange={e => setExpForm({ ...expForm, note: e.target.value })}
                />
              </div>

              {/* Summary */}
              {expForm.amount && (() => {
                const amt = parseFloat(expForm.amount) || 0;
                const projectedCash = liquidCash - amt;
                const projectedRunway = dailyBurnRate > 0 ? Math.round(projectedCash / dailyBurnRate) : 999;
                return (
                  <div style={{ background: `${W.danger}0D`, border: `1px solid ${W.danger}20`, borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: W.sub, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      Logging <strong style={{ color: W.text }}>{sym}{amt.toLocaleString()}</strong> for{' '}
                      <strong style={{ color: W.text }}>{expForm.note || expForm.category}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: W.muted }}>
                      Projected Runway: <strong style={{ color: projectedRunway < 14 ? W.danger : W.text }}>{projectedRunway >= 999 ? 'Calm' : `${projectedRunway} days`}</strong>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: W.danger, border: 'none',
                  color: '#fff', fontWeight: 900, fontSize: '14px', cursor: 'pointer', outline: 'none',
                }}
              >
                Log Expense  +5 ⚡
              </button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ─── INCOME BOTTOM SHEET ──────────────────────────────────────────────── */}
      {activeModal === 'income' && (
        <BottomSheet title="Log Income" onClose={() => setActiveModal(null)}>
          <form onSubmit={saveIncome}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Amount */}
              <div>
                <FLabel>Amount</FLabel>
                <div style={{ position: 'relative', marginBottom: '8px' }}>
                  <span style={{ position: 'absolute', left: '16px', top: '15px', fontSize: '18px', fontWeight: 900, color: W.success }}>{sym}</span>
                  <input
                    type="number" step="0.01" min="0.01" required
                    className="input"
                    placeholder="0"
                    autoFocus
                    style={{ paddingLeft: '38px', fontSize: '20px', fontWeight: 800, width: '100%', outline: 'none' }}
                    value={incForm.amount}
                    onChange={e => setIncForm({ ...incForm, amount: e.target.value })}
                  />
                </div>
                {/* Presets */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                  {presets.income.map(val => (
                    <button
                      key={val} type="button"
                      onClick={() => setIncForm({ ...incForm, amount: val.toString() })}
                      style={{
                        padding: '6px 12px', borderRadius: '8px',
                        border: `1px solid ${incForm.amount === val.toString() ? W.accent : W.border}`,
                        background: incForm.amount === val.toString() ? `${W.accent}15` : W.card,
                        color: incForm.amount === val.toString() ? W.accent : W.sub,
                        fontWeight: 700, fontSize: '11px', cursor: 'pointer',
                        outline: 'none', whiteSpace: 'nowrap'
                      }}
                    >
                      {sym}{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source chips */}
              <div>
                <FLabel>Source</FLabel>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {Object.entries(INC_SOURCES).map(([k, v]) => (
                    <button
                      key={k} type="button"
                      onClick={() => setIncForm({ ...incForm, source: k })}
                      style={{
                        padding: '8px 12px', borderRadius: '10px',
                        border: `1px solid ${incForm.source === k ? W.success : W.border}`,
                        background: incForm.source === k ? `${W.success}15` : W.card,
                        color: incForm.source === k ? W.success : W.sub,
                        fontWeight: 700, fontSize: '12px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                        outline: 'none', transition: 'all 0.15s',
                      }}
                    >
                      {v} {k}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional note */}
              <div>
                <FLabel>Note (optional)</FLabel>
                <input
                  type="text"
                  className="input"
                  placeholder="Client name, project..."
                  style={{ width: '100%', outline: 'none' }}
                  value={incForm.note}
                  onChange={e => setIncForm({ ...incForm, note: e.target.value })}
                />
              </div>

              {/* Summary */}
              {incForm.amount && (() => {
                const amt = parseFloat(incForm.amount) || 0;
                const projectedCash = liquidCash + amt;
                const projectedRunway = dailyBurnRate > 0 ? Math.round(projectedCash / dailyBurnRate) : 999;
                return (
                  <div style={{ background: `${W.success}0D`, border: `1px solid ${W.success}20`, borderRadius: '12px', padding: '12px 14px', fontSize: '12px', color: W.sub, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div>
                      Logging <strong style={{ color: W.text }}>+{sym}{amt.toLocaleString()}</strong> from{' '}
                      <strong style={{ color: W.text }}>{incForm.note || incForm.source}</strong>
                    </div>
                    <div style={{ fontSize: '11px', color: W.muted }}>
                      Projected Runway: <strong style={{ color: W.success }}>{projectedRunway >= 999 ? 'Calm' : `${projectedRunway} days`}</strong>
                    </div>
                  </div>
                );
              })()}

              <button
                type="submit"
                style={{
                  width: '100%', padding: '16px', borderRadius: '14px',
                  background: W.success, border: 'none',
                  color: '#000', fontWeight: 900, fontSize: '14px', cursor: 'pointer', outline: 'none',
                }}
              >
                Log Income  +10 ⚡
              </button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ─── MANAGE BOTTOM SHEET (Bills + Settings) ──────────────────── */}
      {activeModal === 'manage' && (
        <BottomSheet title="Manage" onClose={() => setActiveModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

            {/* ── Settings ── */}
            <div>
              <SectionLabel>Configuration</SectionLabel>
              <form onSubmit={saveSetup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <FLabel>Currency</FLabel>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['₹', '$', '€'].map(c => (
                      <button key={c} type="button"
                        onClick={() => setSetupForm({ ...setupForm, currency: c })}
                        style={{
                          flex: 1, padding: '12px', borderRadius: '12px',
                          border: `2px solid ${setupForm.currency === c ? W.accent : W.border}`,
                          background: setupForm.currency === c ? `${W.accent}15` : W.card,
                          color: setupForm.currency === c ? W.accent : W.muted,
                          fontSize: '18px', fontWeight: 800, cursor: 'pointer', outline: 'none',
                        }}
                      >{c}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <FLabel>Monthly Budget</FLabel>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '15px', fontSize: '16px', fontWeight: 900, color: W.accent }}>{setupForm.currency}</span>
                    <input
                      type="number" min="1" step="10" required
                      className="input"
                      style={{ paddingLeft: '36px', width: '100%', outline: 'none' }}
                      value={setupForm.budget}
                      onChange={e => setSetupForm({ ...setupForm, budget: e.target.value })}
                    />
                  </div>
                </div>
                <button type="submit" style={{
                  padding: '12px', borderRadius: '12px',
                  background: W.accent, border: 'none',
                  color: '#000', fontWeight: 800, fontSize: '13px', cursor: 'pointer', outline: 'none',
                }}>
                  Save Configuration
                </button>
              </form>
            </div>

            {/* ── Bills ── */}
            <div>
              <SectionLabel>Bills ({bills.length})</SectionLabel>
              <form onSubmit={saveBill} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
                <input type="text" required placeholder="Bill name (AWS, Gym...)" className="input" style={{ outline: 'none' }} value={billForm.name} onChange={e => setBillForm({ ...billForm, name: e.target.value })} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: '14px', top: '15px', fontSize: '14px', fontWeight: 900, color: W.sub }}>{sym}</span>
                    <input type="number" step="0.01" min="0.01" required className="input" placeholder="Amount" style={{ paddingLeft: '32px', outline: 'none' }} value={billForm.amount} onChange={e => setBillForm({ ...billForm, amount: e.target.value })} />
                  </div>
                  <input type="date" required className="input" style={{ flex: 1, outline: 'none' }} value={billForm.due_date} onChange={e => setBillForm({ ...billForm, due_date: e.target.value })} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['monthly', 'annual'].map(f => (
                    <button key={f} type="button"
                      onClick={() => setBillForm({ ...billForm, frequency: f })}
                      style={{
                        flex: 1, padding: '10px', borderRadius: '10px',
                        border: `1px solid ${billForm.frequency === f ? W.accent : W.border}`,
                        background: billForm.frequency === f ? `${W.accent}15` : W.card,
                        color: billForm.frequency === f ? W.accent : W.muted,
                        fontSize: '12px', fontWeight: 800, textTransform: 'capitalize', cursor: 'pointer', outline: 'none',
                      }}
                    >{f}</button>
                  ))}
                </div>
                <button type="submit" style={{ padding: '11px', borderRadius: '11px', background: W.surface, border: `1px solid ${W.border}`, color: W.text, fontWeight: 800, fontSize: '13px', cursor: 'pointer', outline: 'none' }}>
                  Add Bill
                </button>
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {bills.map(b => {
                  const isPaid = b.status === 'paid';
                  return (
                    <div key={b.id} style={{ background: W.card, border: `1px solid ${W.border}`, borderRadius: '12px', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: isPaid ? W.muted : W.text, textDecoration: isPaid ? 'line-through' : 'none' }}>{b.name}</div>
                        <div style={{ fontSize: '10px', color: W.muted, marginTop: '2px' }}>{b.frequency} · {fmtDate(b.due_date)}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '14px', fontWeight: 900, color: isPaid ? W.muted : W.text }}>{sym}{Number(b.amount).toLocaleString()}</div>
                          <button onClick={() => deleteBill(b.id)} style={{ fontSize: '9px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', marginTop: '2px', padding: 0 }}>✕</button>
                        </div>
                        <button
                          onClick={() => toggleBillStatus(b.id, b.status)}
                          style={{
                            padding: '5px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', outline: 'none',
                            background: isPaid ? `${W.success}15` : `${W.warning}15`,
                            border: `1px solid ${isPaid ? W.success : W.warning}`,
                            color: isPaid ? W.success : W.warning, minWidth: '56px',
                          }}
                        >
                          {isPaid ? 'PAID' : 'UNPAID'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {bills.length === 0 && <div style={{ textAlign: 'center', color: W.muted, padding: '12px 0', fontSize: '12px' }}>No bills added yet.</div>}
              </div>

              {unpaidBillsTotal > 0 && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: W.warning, fontWeight: 700, textAlign: 'right' }}>
                  Unpaid total: {sym}{unpaidBillsTotal.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ─── CONFIRM DELETE SHEET ─────────────────────────────────────────────── */}
      {confirmSheet && (
        <div
          onClick={() => setConfirmSheet(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: W.surface, borderTop: `1px solid ${W.border}`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '430px', animation: 'slideUpSheet 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            <p style={{ fontSize: '15px', fontWeight: 700, color: W.text, marginBottom: '24px', lineHeight: 1.5 }}>{confirmSheet.message}</p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmSheet(null)} className="btn-ghost" style={{ flex: 1, outline: 'none' }}>Cancel</button>
              <button onClick={async () => { await confirmSheet.onConfirm(); setConfirmSheet(null); }} className="btn-primary" style={{ flex: 1, background: W.danger, outline: 'none' }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="wealth" onTabChange={t => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  );
}
