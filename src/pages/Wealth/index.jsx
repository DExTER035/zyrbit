import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import { showToast } from '../../components/ui/Toast.jsx';
import BottomNav from '../../components/layout/BottomNav.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import TransactionFormModal from '../../components/domain/wealth/TransactionFormModal.jsx';
import BillFormModal from '../../components/domain/wealth/BillFormModal.jsx';
import SafeToSpendBanner from '../../components/domain/wealth/SafeToSpendBanner.jsx';
import {
  addExpense as serviceAddExpense,
  updateExpense as serviceUpdateExpense,
  deleteExpense as serviceDeleteExpense,
  addIncome as serviceAddIncome,
  updateIncome as serviceUpdateIncome,
  deleteIncome as serviceDeleteIncome,
  addBill as serviceAddBill,
  updateBill as serviceUpdateBill,
  toggleBillStatus as serviceToggleBillStatus,
  deleteBill as serviceDeleteBill,
  saveWealthSettings as serviceSaveWealthSettings,
} from '../../services/wealthService';
import {
  computeTotalIncome,
  computeTotalExpense,
  computeNetBalance,
  computeMonthExpenses,
  computeBurnRateAndRunway,
  computeBudgetStats,
  computeSafeToSpend,
  computeSpendingPace,
} from '../../engines/wealth/index.js';
import { X, TrendingDown, TrendingUp, Settings2, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';

// ─── Design Tokens (Wealth pillar — teal accent) ────────────────────────────
const W = {
  bg:      '#0B0D0F',
  surface: '#15181B',
  card:    '#1B1F23',
  border:  '#1C1D21',
  border2: '#26272C',
  text:    '#F5F5F5',
  sub:     '#9CA3AF',
  muted:   '#71717A',
  dim:     '#2A3038',
  accent:  '#1FA36F',
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
  if (isNaN(n) || !isFinite(n)) return `${sym}0`;
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

const CAT_COLORS = {
  'Food':                  '#F59E0B',
  'Rent & Bills':          '#EF4444',
  'Tools & Subscriptions': '#8B7FFF',
  'Leisure':               '#EC4899',
  'Other':                 '#6B7280',
  'Salary':      '#10B981',
  'Freelance':   '#1FA36F',
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
          border: `1px solid ${W.border}`,
          borderRadius: '16px 16px 0 0',
          width: '100%', maxWidth: '430px',
          padding: '24px 20px 52px',
          animation: 'slideUpSheet 0.25s cubic-bezier(0.4,0,0.2,1)',
          maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 700, color: W.text }}>{title}</span>
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

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '10px' }}>
      {children}
    </div>
  );
}

function FLabel({ children }) {
  return (
    <div style={{ fontSize: '10px', color: W.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>
      {children}
    </div>
  );
}

export default function Wealth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const todayDate = getLocalYMD();
  const curMonth  = todayDate.slice(0, 7);

  // Data State
  const [settings,   setSettings]   = useState(null);
  const [expenses,   setExpenses]   = useState([]);
  const [incomes,    setIncomes]    = useState([]);
  const [bills,      setBills]      = useState([]);

  // UI Modal State
  const [activeModal,        setActiveModal]        = useState(null); // null | 'expense' | 'income' | 'bill' | 'manage' | 'settings'
  const [editingTransaction, setEditingTransaction] = useState(null); // { type: 'expense'|'income', item: Object }
  const [editingBillModal,   setEditingBillModal]   = useState(null); // Object (bill)
  const [showAllActivity,    setShowAllActivity]    = useState(false);
  const [confirmSheet,       setConfirmSheet]       = useState(null);
  const [breakdownPeriod,    setBreakdownPeriod]    = useState('month'); // 'today' | 'week' | 'month' | 'year'

  // Forms
  const [setupForm, setSetupForm] = useState({ currency: '₹', budget: 15000 });

  // Data Fetcher
  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, eRes, iRes, bRes] = await Promise.all([
        supabase.from('wealth_settings').select('*').or(`user_id.eq.${uid},id.eq.${uid}`).maybeSingle(),
        supabase.from('money_expenses').select('*').eq('user_id', uid).order('expense_date', { ascending: false }),
        supabase.from('wealth_income').select('*').eq('user_id', uid).order('income_date', { ascending: false }),
        supabase.from('wealth_bills').select('*').eq('user_id', uid).order('due_date', { ascending: true }),
      ]);

      if (sRes.error) console.warn('Wealth settings fetch error:', sRes.error.message);
      if (eRes.error) console.warn('Expenses fetch error:', eRes.error.message);
      if (iRes.error) console.warn('Income fetch error:', iRes.error.message);
      if (bRes.error) console.warn('Bills fetch error:', bRes.error.message);

      const sData = sRes.data || null;
      setSettings(sData);
      if (sData) {
        setSetupForm({
          currency: sData.currency === 'INR' ? '₹' : sData.currency === 'USD' ? '$' : '€',
          budget:   sData.monthly_budget,
        });
      }

      setExpenses(eRes.data || []);
      setIncomes(iRes.data || []);
      setBills(bRes.data || []);
    } catch (e) {
      console.error('Wealth load error:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auth Hook
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

  // ─── Dex OS Live Invalidation ───────────────────────────────────────────────
  useEffect(() => {
    const handleDexRefresh = (e) => {
      if (e.detail?.domain === 'wealth' || !e.detail?.domain) {
        if (user?.id) loadData(user.id);
      }
    };
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => window.removeEventListener('dexos:refresh', handleDexRefresh);
  }, [user, loadData]);

  // ─── DB-First Handlers with Error Rollback (via wealthService) ──────────────
  
  // Save Settings
  const saveSetup = async (e) => {
    e.preventDefault();
    if (!user) return;
    const originalSettings = settings;

    const settingsObj = {
      id:             user.id,
      user_id:        user.id,
      currency:       setupForm.currency === '₹' ? 'INR' : setupForm.currency === '$' ? 'USD' : 'EUR',
      monthly_budget: Number(setupForm.budget) || 15000,
      created_at:     new Date().toISOString(),
    };

    const res = await serviceSaveWealthSettings({
      userId: user.id,
      currency: setupForm.currency === '₹' ? 'INR' : setupForm.currency === '$' ? 'USD' : 'EUR',
      monthlyBudget: Number(setupForm.budget) || 15000,
    });

    if (!res.success) {
      setSettings(originalSettings);
      showToast(`Failed to save settings: ${res.error}`, 'error');
      return;
    }

    setSettings(res.data || settingsObj);
    showToast('💰 Settings saved!', 'success');
    setActiveModal(null);
  };

  // Save Expense (Create or Edit)
  const handleSaveExpense = async ({ id, amount, category, note, date }) => {
    if (!user) return;
    const isEdit = Boolean(id);
    const targetId = id || crypto.randomUUID();
    const originalExpenses = [...expenses];

    const payload = {
      id: targetId,
      user_id: user.id,
      amount: amount,
      category: category,
      note: note,
      expense_date: date,
      created_at: new Date().toISOString(),
    };

    if (isEdit) {
      const res = await serviceUpdateExpense({
        userId: user.id,
        id: targetId,
        amount,
        category,
        note,
        date,
      });

      if (!res.success) {
        setExpenses(originalExpenses);
        showToast(`Failed to update expense: ${res.error}`, 'error');
        return;
      }

      setExpenses(prev => prev.map(item => item.id === targetId ? { ...item, ...payload } : item));
      showToast('💸 Expense updated!', 'success');
    } else {
      const res = await serviceAddExpense({
        userId: user.id,
        amount,
        category,
        note,
        date,
      });

      if (!res.success) {
        setExpenses(originalExpenses);
        showToast(`Failed to log expense: ${res.error}`, 'error');
        return;
      }

      setExpenses(prev => [res.data || payload, ...prev]);
      showToast('💸 Expense logged!', 'success');
    }
  };

  // Save Income (Create or Edit)
  const handleSaveIncome = async ({ id, amount, source, note, date }) => {
    if (!user) return;
    const isEdit = Boolean(id);
    const targetId = id || crypto.randomUUID();
    const originalIncomes = [...incomes];

    const payload = {
      id: targetId,
      user_id: user.id,
      amount: amount,
      source: source,
      note: note,
      income_date: date,
      created_at: new Date().toISOString(),
    };

    if (isEdit) {
      const res = await serviceUpdateIncome({
        userId: user.id,
        id: targetId,
        amount,
        source,
        note,
        date,
      });

      if (!res.success) {
        setIncomes(originalIncomes);
        showToast(`Failed to update income: ${res.error}`, 'error');
        return;
      }

      setIncomes(prev => prev.map(item => item.id === targetId ? { ...item, ...payload } : item));
      showToast('💵 Income updated!', 'success');
    } else {
      const res = await serviceAddIncome({
        userId: user.id,
        amount,
        source,
        note,
        date,
      });

      if (!res.success) {
        setIncomes(originalIncomes);
        showToast(`Failed to log income: ${res.error}`, 'error');
        return;
      }

      setIncomes(prev => [res.data || payload, ...prev]);
      showToast('💵 Income logged!', 'success');
    }
  };

  // Save Bill (Create or Edit)
  const handleSaveBill = async ({ id, name, amount, due_date, frequency, status }) => {
    if (!user) return;
    const isEdit = Boolean(id);
    const targetId = id || crypto.randomUUID();
    const originalBills = [...bills];

    const payload = {
      id: targetId,
      user_id: user.id,
      name: name,
      amount: amount,
      due_date: due_date,
      frequency: frequency,
      status: status || 'unpaid',
      created_at: new Date().toISOString(),
    };

    if (isEdit) {
      const res = await serviceUpdateBill({
        userId: user.id,
        id: targetId,
        name,
        amount,
        dueDate: due_date,
        frequency,
        status: status || 'unpaid',
      });

      if (!res.success) {
        setBills(originalBills);
        showToast(`Failed to update bill: ${res.error}`, 'error');
        return;
      }

      setBills(prev => prev.map(item => item.id === targetId ? { ...item, ...payload } : item).sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
      showToast('📅 Bill updated!', 'success');
    } else {
      const res = await serviceAddBill({
        userId: user.id,
        name,
        amount,
        dueDate: due_date,
        frequency,
        status: status || 'unpaid',
      });

      if (!res.success) {
        setBills(originalBills);
        showToast(`Failed to add bill: ${res.error}`, 'error');
        return;
      }

      setBills(prev => [...prev, res.data || payload].sort((a, b) => new Date(a.due_date) - new Date(b.due_date)));
      showToast('📅 Bill added!', 'success');
    }
  };

  // Toggle Bill Paid Status
  const toggleBillStatus = async (id, currentStatus) => {
    if (!user) return;
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const originalBills = [...bills];

    setBills(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));

    const res = await serviceToggleBillStatus({
      userId: user.id,
      billId: id,
      status: newStatus,
    });
    if (!res.success) {
      setBills(originalBills);
      showToast(`Failed to update bill status: ${res.error}`, 'error');
      return;
    }

    showToast(newStatus === 'paid' ? '✅ Bill paid!' : '⏳ Marked unpaid', 'success');
  };

  // Delete Bill
  const deleteBill = (id) => {
    setConfirmSheet({
      message: 'Delete this bill?',
      onConfirm: async () => {
        const originalBills = [...bills];
        setBills(prev => prev.filter(b => b.id !== id));

        const res = await serviceDeleteBill({ userId: user.id, id });
        if (!res.success) {
          setBills(originalBills);
          showToast(`Failed to delete bill: ${res.error}`, 'error');
          return;
        }

        showToast('🗑 Bill deleted', 'success');
      },
    });
  };

  // Delete Expense
  const deleteExpense = (id) => {
    setConfirmSheet({
      message: 'Delete this expense?',
      onConfirm: async () => {
        const originalExpenses = [...expenses];
        setExpenses(prev => prev.filter(e => e.id !== id));

        const res = await serviceDeleteExpense({ userId: user.id, id });
        if (!res.success) {
          setExpenses(originalExpenses);
          showToast(`Failed to delete expense: ${res.error}`, 'error');
          return;
        }

        showToast('🗑 Expense deleted', 'success');
      },
    });
  };

  // Delete Income
  const deleteIncome = (id) => {
    setConfirmSheet({
      message: 'Delete this income entry?',
      onConfirm: async () => {
        const originalIncomes = [...incomes];
        setIncomes(prev => prev.filter(i => i.id !== id));

        const res = await serviceDeleteIncome({ userId: user.id, id });
        if (!res.success) {
          setIncomes(originalIncomes);
          showToast(`Failed to delete income: ${res.error}`, 'error');
          return;
        }

        showToast('🗑 Income deleted', 'success');
      },
    });
  };

  // ─── Financial Calculations ────────────────────────────────────────────────
  const sym = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₹';

  const _totalIncome         = useMemo(() => computeTotalIncome(incomes), [incomes]);
  const _totalExpenseAllTime = useMemo(() => computeTotalExpense(expenses), [expenses]);
  const liquidCash          = useMemo(() => computeNetBalance(incomes, expenses), [incomes, expenses]);

  const thirtyDaysAgoStr = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return getLocalYMD(d);
  }, []);

  const { burnLast30: _burnLast30, dailyBurnRate, runwayDays } = useMemo(() => {
    return computeBurnRateAndRunway(expenses, liquidCash, thirtyDaysAgoStr);
  }, [expenses, liquidCash, thirtyDaysAgoStr]);

  const runwayStatus = useMemo(() => getRunwayStatus(runwayDays), [runwayDays]);

  const todaySpend = useMemo(() => {
    return expenses.filter(e => e.expense_date === todayDate).reduce((s, e) => s + Number(e.amount), 0);
  }, [expenses, todayDate]);

  const monthTotal = useMemo(() => computeMonthExpenses(expenses, curMonth), [expenses, curMonth]);
  const { budget: monthBudget, budgetPct } = useMemo(() => computeBudgetStats(settings, monthTotal), [settings, monthTotal]);

  // Deterministic Wealth Intelligence Calculations
  const safeData = useMemo(() => {
    return computeSafeToSpend(incomes, expenses, bills, settings, todayDate);
  }, [incomes, expenses, bills, settings, todayDate]);

  const paceData = useMemo(() => {
    return computeSpendingPace(expenses, settings?.monthly_budget, curMonth, todayDate);
  }, [expenses, settings, curMonth, todayDate]);

  // Breakdown period calculations
  const { breakdownTotal, categoryBreakdown } = useMemo(() => {
    const now = new Date();
    let startDate = todayDate;
    if (breakdownPeriod === 'week') {
      const d = new Date(); d.setDate(d.getDate() - 7);
      startDate = getLocalYMD(d);
    } else if (breakdownPeriod === 'month') {
      startDate = `${curMonth}-01`;
    } else if (breakdownPeriod === 'year') {
      startDate = `${now.getFullYear()}-01-01`;
    }

    const filtered = expenses.filter(e => e.expense_date >= startDate);
    const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);

    const catMap = {};
    filtered.forEach(e => {
      catMap[e.category] = (catMap[e.category] || 0) + Number(e.amount);
    });

    const breakdown = Object.entries(catMap).map(([cat, amt]) => ({
      cat,
      amt,
      pct: total > 0 ? Math.round((amt / total) * 100) : 0,
    })).sort((a, b) => b.amt - a.amt);

    return { breakdownTotal: total, categoryBreakdown: breakdown };
  }, [expenses, breakdownPeriod, todayDate, curMonth]);

  // Group activity by date
  const activityByDate = useMemo(() => {
    const combined = [
      ...expenses.map(e => ({ ...e, _type: 'expense', date: e.expense_date })),
      ...incomes.map(i => ({ ...i, _type: 'income', date: i.income_date })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const groupsMap = {};
    combined.forEach(item => {
      if (!groupsMap[item.date]) {
        groupsMap[item.date] = { date: item.date, items: [], spent: 0, earned: 0 };
      }
      groupsMap[item.date].items.push(item);
      if (item._type === 'expense') groupsMap[item.date].spent += Number(item.amount);
      if (item._type === 'income') groupsMap[item.date].earned += Number(item.amount);
    });

    return Object.values(groupsMap);
  }, [expenses, incomes]);

  const groupsToShow = showAllActivity ? activityByDate : activityByDate.slice(0, 3);
  const nextBill = bills.find(b => b.status === 'unpaid');

  const formatGroupDate = (dateStr) => {
    if (dateStr === todayDate) return 'TODAY';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' }).toUpperCase();
  };

  // Loading state
  if (loading) {
    return (
      <div style={{ background: W.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '13px', color: W.muted, fontWeight: 700 }}>Loading Financial OS...</div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div style={{ background: W.bg, minHeight: '100vh' }}>
        <ErrorState message={error} onRetry={() => user && loadData(user.id)} />
        <BottomNav activeTab="wealth" onTabChange={t => navigate(`/${t}`)} />
      </div>
    );
  }

  // Setup modal for new users without settings
  if (!settings) {
    return (
      <div style={{ background: W.bg, minHeight: '100vh', color: W.text, padding: '24px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '24px 20px' }}>
          <div style={{ fontSize: '10px', color: W.accent, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            SETUP WEALTH
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Set your budget baseline</h2>
          <p style={{ fontSize: '12px', color: W.sub, marginBottom: '20px' }}>
            Choose your primary currency and monthly budget target.
          </p>

          <form onSubmit={saveSetup}>
            <FLabel>Currency</FLabel>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['₹', '$', '€'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSetupForm({ ...setupForm, currency: c })}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: setupForm.currency === c ? W.accent : W.dim,
                    border: `1px solid ${setupForm.currency === c ? W.accent : W.border2}`,
                    color: setupForm.currency === c ? '#000' : W.text,
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
                value={setupForm.budget}
                onChange={e => setSetupForm({ ...setupForm, budget: e.target.value })}
                style={{
                  width: '100%', background: W.bg, border: `1px solid ${W.border2}`, borderRadius: '14px',
                  padding: '14px 14px 14px 40px', fontSize: '20px', fontWeight: 800, color: W.accent, outline: 'none'
                }}
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
        <BottomNav activeTab="wealth" onTabChange={t => navigate(`/${t}`)} />
      </div>
    );
  }

  return (
    <div className="app-container page-enter" style={{ background: W.bg, minHeight: '100vh', color: W.text, position: 'relative' }}>
      
      {/* HEADER */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', color: W.accent, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '4px' }}>WEALTH</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: W.text, letterSpacing: '-0.5px' }}>Financial OS.</h1>
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

      {/* MAIN FEED */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>

        {/* 0. SAFE TO SPEND HERO BANNER */}
        <SafeToSpendBanner
          safeData={safeData}
          paceData={paceData}
          currencySymbol={sym}
        />

        {/* 1. RUNWAY HERO */}
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
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: '240px', height: '100px',
            background: `radial-gradient(ellipse at top, ${runwayStatus.color}0D 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ fontSize: '9px', color: runwayStatus.color, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              RUNWAY STATUS
            </div>
            <div style={{ fontSize: '11px', color: runwayStatus.color, fontWeight: 700 }}>
              {runwayStatus.label}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
            {runwayDays >= 999 ? (
              <span style={{ fontSize: '44px', fontWeight: 900, color: W.text, lineHeight: 1 }}>Calm</span>
            ) : (
              <>
                <span style={{ fontSize: '52px', fontWeight: 900, color: W.text, lineHeight: 1 }}>
                  {runwayDays}
                </span>
                <span style={{ fontSize: '16px', color: W.sub, fontWeight: 700 }}>days</span>
              </>
            )}
          </div>

          <div style={{ fontSize: '12px', color: W.sub, fontWeight: 500, marginBottom: '14px' }}>
            {runwayDays < 999 ? (
              <>Safe until <span style={{ color: runwayStatus.color, fontWeight: 700 }}>{safeUntilDate(runwayDays)}</span></>
            ) : (
              runwayStatus.message
            )}
          </div>

          {/* Month budget progress bar */}
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

          {/* Next Bill */}
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
                <span style={{ color: W.warning, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', fontSize: '9px' }}>NEXT BILL:</span>
                <span style={{ color: W.text, fontWeight: 750, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextBill.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <span style={{ color: W.sub, fontWeight: 700 }}>{fmtCurrency(sym, nextBill.amount)} · {fmtDate(nextBill.due_date)}</span>
                <button
                  onClick={() => toggleBillStatus(nextBill.id, nextBill.status)}
                  style={{
                    background: `${W.accent}20`, border: `1px solid ${W.accent}40`,
                    borderRadius: '6px', color: W.accent,
                    fontSize: '10px', fontWeight: 800, padding: '2px 6px', cursor: 'pointer',
                  }}
                >
                  Pay
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 2. ACTION BUTTONS */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            onClick={() => { setEditingTransaction(null); setActiveModal('expense'); }}
            style={{
              background: W.surface,
              border: `1px solid ${W.danger}40`,
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: W.danger,
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            <TrendingDown size={16} />
            Log Expense
          </button>

          <button
            onClick={() => { setEditingTransaction(null); setActiveModal('income'); }}
            style={{
              background: W.surface,
              border: `1px solid ${W.accent}40`,
              borderRadius: '16px',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              color: W.accent,
              fontWeight: 800,
              fontSize: '13px',
            }}
          >
            <TrendingUp size={16} />
            Log Income
          </button>
        </div>

        {/* 3a. QUICK STATS ROW */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Net Cash</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: liquidCash >= 0 ? W.text : W.danger, letterSpacing: '-0.5px' }}>
              {fmtCurrency(sym, liquidCash)}
            </div>
          </div>

          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Today</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: todaySpend > 0 ? W.danger : W.muted, letterSpacing: '-0.5px' }}>
              {todaySpend > 0 ? `-${fmtCurrency(sym, todaySpend)}` : '—'}
            </div>
          </div>

          <div style={{ background: W.surface, border: `1px solid ${W.border}`, borderRadius: '16px', padding: '14px 12px' }}>
            <div style={{ fontSize: '9px', color: W.muted, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>Daily avg</div>
            <div style={{ fontSize: '16px', fontWeight: 900, color: W.text, letterSpacing: '-0.5px' }}>
              {dailyBurnRate > 0 ? fmtCurrency(sym, dailyBurnRate) : '—'}
            </div>
          </div>
        </div>

        {/* 3b. SPENDING BREAKDOWN */}
        <div style={{
          background: W.surface,
          border: `1px solid ${W.border}`,
          borderRadius: '20px',
          padding: '18px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
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

        {/* 4. RECENT ACTIVITY (WITH EDIT & DELETE ACTIONS) */}
        {activityByDate.length > 0 && (
          <div>
            <SectionLabel>Recent Activity</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {groupsToShow.map(group => (
                <div key={group.date} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: W.sub, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                      {formatGroupDate(group.date)}
                    </span>
                    <div style={{ fontSize: '11px', fontWeight: 800, display: 'flex', gap: '8px' }}>
                      {group.earned > 0 && <span style={{ color: W.success }}>+{fmtCurrency(sym, group.earned)}</span>}
                      {group.spent > 0 && <span style={{ color: W.danger }}>-{fmtCurrency(sym, group.spent)}</span>}
                    </div>
                  </div>

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
                          <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                            <button
                              onClick={() => setEditingTransaction({ type: isInc ? 'income' : 'expense', item: t })}
                              style={{ fontSize: '10px', color: W.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => isInc ? deleteIncome(t.id) : deleteExpense(t.id)}
                              style={{ fontSize: '10px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              ✕
                            </button>
                          </div>
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
            No financial activity yet. Log your first expense or income above!
          </div>
        )}

      </div>

      {/* ── MODALS & SHEETS ─────────────────────────────────────────────────── */}

      {/* Expense Modal (Create or Edit) */}
      {(activeModal === 'expense' || (editingTransaction && editingTransaction.type === 'expense')) && (
        <TransactionFormModal
          type="expense"
          editingItem={editingTransaction ? editingTransaction.item : null}
          currencySymbol={sym}
          onSave={handleSaveExpense}
          onClose={() => { setActiveModal(null); setEditingTransaction(null); }}
        />
      )}

      {/* Income Modal (Create or Edit) */}
      {(activeModal === 'income' || (editingTransaction && editingTransaction.type === 'income')) && (
        <TransactionFormModal
          type="income"
          editingItem={editingTransaction ? editingTransaction.item : null}
          currencySymbol={sym}
          onSave={handleSaveIncome}
          onClose={() => { setActiveModal(null); setEditingTransaction(null); }}
        />
      )}

      {/* Bill Modal (Create or Edit) */}
      {(activeModal === 'bill' || editingBillModal) && (
        <BillFormModal
          editingBill={editingBillModal}
          currencySymbol={sym}
          onSave={handleSaveBill}
          onClose={() => { setActiveModal(null); setEditingBillModal(null); }}
        />
      )}

      {/* Manage Sheet */}
      {activeModal === 'manage' && (
        <BottomSheet title="Manage Wealth OS" onClose={() => setActiveModal(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Settings button */}
            <button
              onClick={() => setActiveModal('settings')}
              style={{
                background: W.card, border: `1px solid ${W.border2}`, borderRadius: '14px',
                padding: '14px', color: W.text, fontSize: '13px', fontWeight: 800,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer',
              }}
            >
              <span>⚙ Settings & Monthly Budget</span>
              <span style={{ color: W.accent }}>{sym}{monthBudget.toLocaleString()}</span>
            </button>

            {/* Recurring Bills section */}
            <div style={{ borderTop: `1px solid ${W.border}`, paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <SectionLabel>Recurring Bills</SectionLabel>
                <button
                  onClick={() => { setEditingBillModal(null); setActiveModal('bill'); }}
                  style={{ fontSize: '11px', color: W.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 800 }}
                >
                  + Add Bill
                </button>
              </div>

              {bills.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {bills.map(b => (
                    <div
                      key={b.id}
                      style={{
                        background: W.card, border: `1px solid ${W.border2}`, borderRadius: '12px',
                        padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: W.text }}>{b.name}</div>
                        <div style={{ fontSize: '10px', color: W.muted, marginTop: '2px' }}>
                          Due {fmtDate(b.due_date)} · {b.frequency}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 900, color: W.text }}>{fmtCurrency(sym, b.amount)}</span>
                        <button
                          onClick={() => setEditingBillModal(b)}
                          style={{ fontSize: '10px', color: W.accent, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBill(b.id)}
                          style={{ fontSize: '10px', color: W.muted, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '11px', color: W.muted, textAlign: 'center', padding: '12px 0' }}>
                  No recurring bills added yet.
                </div>
              )}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <BottomSheet title="Settings & Budget" onClose={() => setActiveModal(null)}>
          <form onSubmit={saveSetup}>
            <FLabel>Currency</FLabel>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {['₹', '$', '€'].map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSetupForm({ ...setupForm, currency: c })}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: setupForm.currency === c ? W.accent : W.dim,
                    border: `1px solid ${setupForm.currency === c ? W.accent : W.border2}`,
                    color: setupForm.currency === c ? '#000' : W.text,
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
                value={setupForm.budget}
                onChange={e => setSetupForm({ ...setupForm, budget: e.target.value })}
                style={{
                  width: '100%', background: W.bg, border: `1px solid ${W.border2}`, borderRadius: '14px',
                  padding: '14px 14px 14px 40px', fontSize: '20px', fontWeight: 800, color: W.accent, outline: 'none'
                }}
              />
            </div>
            <button type="submit" style={{
              width: '100%', padding: '16px', borderRadius: '14px',
              background: W.accent, color: '#000',
              fontWeight: 900, fontSize: '15px', border: 'none', cursor: 'pointer',
            }}>
              Save Settings 💾
            </button>
          </form>
        </BottomSheet>
      )}

      {/* Confirmation Sheet */}
      {confirmSheet && (
        <BottomSheet title="Confirm Action" onClose={() => setConfirmSheet(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: W.text, fontWeight: 600 }}>{confirmSheet.message}</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setConfirmSheet(null)}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  background: W.dim, border: `1px solid ${W.border2}`,
                  color: W.text, fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const fn = confirmSheet.onConfirm;
                  setConfirmSheet(null);
                  if (fn) await fn();
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '12px',
                  background: W.danger, border: 'none',
                  color: '#FFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                }}
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      <BottomNav activeTab="wealth" onTabChange={t => navigate(`/${t}`)} />
    </div>
  );
}
