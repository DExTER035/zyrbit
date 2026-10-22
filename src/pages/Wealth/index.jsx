import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import { showToast } from '../../components/ui/Toast.jsx';
import BottomNav from '../../components/layout/BottomNav.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import {
  ArrowLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Repeat,
  Link as LinkIcon,
  Wallet,
  Landmark,
  PiggyBank,
  Sparkles,
  Users,
  Calendar,
  Lock,
  Clock,
  Settings2,
  Check,
  Plus,
  Search,
  X,
  SlidersHorizontal,
  ArrowRight,
} from 'lucide-react';

// ─── Money State Domain Modals ────────────────────────────────────────────────
import {
  MoneyEventModal,
  CashCalibrationModal,
  BillFormModal,
  TransactionFormModal,
  PromiseFormModal,
  AssetAdjustmentModal,
  ConnectMoneyModal,
} from '../../components/domain/wealth/index.js';

// ─── Service Facade & Pure Engine ─────────────────────────────────────────────
import {
  getWealthSnapshot,
  recordMoneyEvent,
  calibrateCashBalance,
  resolveMoneyPromise,
  toggleBillStatus,
  saveWealthSettings,
  addBill,
  updateBill,
  deleteBill,
  addExpense,
  updateExpense,
  deleteExpense,
  addIncome,
  updateIncome,
  deleteIncome,
} from '../../services/wealthService.js';
import { computeMoneyState } from '../../engines/wealth/moneyState.js';
import WealthFlowHero from '../../components/domain/wealth/WealthFlowHero.jsx';
import WealthRecentEvents from '../../components/domain/wealth/WealthRecentEvents.jsx';

// ── Stage 1: Warm Ivory Design Tokens ──────────────────────────────────────
const W = {
  // Canvas & surfaces
  bg: '#F4F0E8',
  surface: '#FFFFFF',
  surfaceCard: '#FFFFFF',
  border: '#E5E0D8',
  borderMid: '#D8D2C8',
  // Typography
  text: '#111A20',
  sub: '#5A6D75',
  muted: '#8A9CA3',
  // Brand
  petrol: '#174A55',
  softTeal: '#DDE9EB',
  // Status
  emerald: '#1FA36F',
  danger: '#EF4444',
  amber: '#E9B44C',
  // Legacy aliases (kept so sub-view inline styles compile)
  accent: '#174A55',
  cyan: '#DDE9EB',
};

const getLocalYMD = (d = new Date()) => {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().split('T')[0];
};

export default function Wealth() {
  const navigate = useNavigate();
  const location = useLocation();
  const todayDate = getLocalYMD();

  // ── Auth & Domain State ───────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Raw domain collections
  const [settings, setSettings] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [bills, setBills] = useState([]);

  // ── Stage 1: Four Destinations ─────────────────────────────────────────
  // 'home' | 'activity' | 'plan' | 'assets'
  // Legacy views (commitments, promises, flow, recent) are now sub-tabs
  const [activeView, setActiveView] = useState(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      const v = params.get('view') || 'home';
      // Map legacy view names to new destinations
      if (v === 'recent') return 'activity';
      if (v === 'commitments' || v === 'promises') return 'plan';
      if (v === 'flow') return 'assets';
      return v;
    }
    return 'home';
  });
  const [commitmentsTab, setCommitmentsTab] = useState('upcoming'); // 'upcoming' | 'recurring' | 'past'
  const [promisesTab, setPromisesTab] = useState(() => {
    if (typeof window !== 'undefined' && window.location) {
      const params = new URLSearchParams(window.location.search);
      return params.get('tab') || 'owed_to_me';
    }
    return 'owed_to_me';
  }); // 'owed_to_me' | 'i_owe'
  // Plan view sub-tab: 'commitments' | 'promises'
  const [planTab, setPlanTab] = useState('commitments');
  // Assets view sub-tab: 'holdings' | 'flow'
  const [assetsTab, setAssetsTab] = useState('holdings');
  const [recentFilter, setRecentFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Modals & deep view editing
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [isPromiseModalOpen, setIsPromiseModalOpen] = useState(false);
  const [editingPromise, setEditingPromise] = useState(null);
  const [isAssetAdjustOpen, setIsAssetAdjustOpen] = useState(false);
  const [activeAssetKey, setActiveAssetKey] = useState('savings');
  const [isConnectMoneyOpen, setIsConnectMoneyOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionModalType, setTransactionModalType] = useState('expense');
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [budgetForm, setBudgetForm] = useState({ budget: 15000, currency: 'INR' });

  // ── Data Fetcher ──────────────────────────────────────────────────────────
  const loadData = useCallback(async (uid, isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setError(null);
    try {
      const res = await getWealthSnapshot(uid);
      if (!res.success) {
        setError(res.error || 'Failed to load wealth state.');
        return;
      }
      const { settings: s, expenses: e, incomes: i, bills: b } = res.data;
      setSettings(s);
      setExpenses(e || []);
      setIncomes(i || []);
      setBills(b || []);

      if (s) {
        const numBudget = Number(s.monthly_budget);
        setBudgetForm({
          budget: (s.monthly_budget !== null && s.monthly_budget !== undefined && isFinite(numBudget) && numBudget >= 0) ? numBudget : 15000,
          currency: s.currency || 'INR',
        });
      }
    } catch (err) {
      setError(err.message || 'Unexpected error loading financial state.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      setUser(session.user);
      loadData(session.user.id);
    });
  }, [navigate, loadData]);

  // Dex Live Invalidation Listener
  useEffect(() => {
    const handler = (e) => {
      if ((e.detail?.domain === 'wealth' || !e.detail?.domain) && user?.id) {
        if (e.detail?.source !== 'wealth_page') {
          loadData(user.id, true);
        }
      }
    };
    window.addEventListener('dexos:refresh', handler);
    return () => window.removeEventListener('dexos:refresh', handler);
  }, [user, loadData]);

  // Sync activeView from navigation state or URL query
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const viewParam = params.get('view') || location.state?.view;
    const tabParam = params.get('tab') || location.state?.tab;
    if (viewParam) {
      // Map legacy view names to four destinations
      const legacyMap = { recent: 'activity', commitments: 'plan', promises: 'plan', flow: 'assets' };
      const mapped = legacyMap[viewParam] || viewParam;
      if (['home', 'activity', 'plan', 'assets'].includes(mapped)) {
        setActiveView(mapped);
        // Set sub-tab if navigating to plan via legacy promise view
        if (viewParam === 'promises') setPlanTab('promises');
        if (viewParam === 'commitments') setPlanTab('commitments');
        // Set sub-tab if navigating to assets via legacy flow view
        if (viewParam === 'flow') setAssetsTab('flow');
      }
    }
    if (tabParam && ['owed_to_me', 'i_owe'].includes(tabParam)) {
      setPromisesTab(tabParam);
    }
  }, [location.search, location.state]);

  // Compute Money State
  const moneyState = useMemo(() => {
    return computeMoneyState({
      incomes,
      expenses,
      bills,
      settings,
      today: todayDate,
    });
  }, [incomes, expenses, bills, settings, todayDate]);

  const currencySymbol =
    settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₹';

  // Format currency shorthand
  const fmtShort = (num) => {
    const n = Number(num) || 0;
    if (n >= 100000) return `${currencySymbol}${(n / 1000).toFixed(0)}k`;
    if (n >= 1000) return `${currencySymbol}${(n / 1000).toFixed(1).replace('.0', '')}k`;
    return `${currencySymbol}${n.toLocaleString()}`;
  };

  const fmtFull = (num) => `${currencySymbol}${Math.round(Number(num) || 0).toLocaleString()}`;

  // Action: Record Money Event
  const handleRecordEvent = async (eventParams) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await recordMoneyEvent({
        userId: user.id,
        ...eventParams,
      });

      if (!res.success) {
        showToast(`Failed: ${res.error}`, 'error');
        return;
      }

      showToast(`Recorded: ${eventParams.title || eventParams.type}`, 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to record event.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Calibrate Cash
  const handleCalibrateCash = async (targetCash) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await calibrateCashBalance({
        userId: user.id,
        targetCash,
      });

      if (!res.success) {
        showToast(`Failed: ${res.error}`, 'error');
        return;
      }

      showToast('Cash balance updated.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Calibration failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Resolve Promise
  const handleResolvePromise = async (promiseItem) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await resolveMoneyPromise({
        userId: user.id,
        billId: promiseItem.id,
        amount: promiseItem.amount,
        person: promiseItem.person,
      });
      if (!res.success) throw new Error(res.error);
      showToast(`Settled with ${promiseItem.person || 'contact'}`, 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to resolve promise.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Save Bill (Create / Update)
  const handleSaveBill = async (billData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let res;
      if (billData.id) {
        res = await updateBill({
          userId: user.id,
          id: billData.id,
          name: billData.name,
          amount: billData.amount,
          dueDate: billData.due_date,
          frequency: billData.frequency,
          status: billData.status || 'unpaid',
        });
      } else {
        res = await addBill({
          userId: user.id,
          name: billData.name,
          amount: billData.amount,
          dueDate: billData.due_date,
          frequency: billData.frequency || 'monthly',
          status: 'unpaid',
        });
      }

      if (!res.success) throw new Error(res.error);
      showToast(billData.id ? 'Commitment updated.' : 'Commitment added.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to save commitment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Delete Bill
  const handleDeleteBill = async (billId) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await deleteBill({ userId: user.id, id: billId });
      if (!res.success) throw new Error(res.error);
      showToast('Commitment deleted.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to delete commitment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Toggle Bill Status (with error checking and submission protection)
  const handleToggleBill = async (bill) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const nextStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
      const res = await toggleBillStatus({ userId: user.id, billId: bill.id, status: nextStatus });
      if (!res?.success) {
        showToast(res?.error || 'Failed to update commitment status.', 'error');
        return;
      }
      showToast(nextStatus === 'paid' ? `Marked ${bill.name} as paid` : `Marked ${bill.name} as unpaid`, 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to update commitment.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Save Promise (Create / Update)
  const handleSavePromise = async (promiseData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (promiseData.id) {
        const res = await updateBill({
          userId: user.id,
          id: promiseData.id,
          name: promiseData.type === 'LEND' ? `${promiseData.person} owes you` : `Return to ${promiseData.person}`,
          amount: promiseData.amount,
          dueDate: promiseData.dueDate,
          status: promiseData.type === 'LEND' ? 'receivable' : 'unpaid',
        });
        if (!res.success) throw new Error(res.error);
        showToast('Promise updated.', 'success');
      } else {
        const res = await recordMoneyEvent({
          userId: user.id,
          type: promiseData.type,
          amount: promiseData.amount,
          person: promiseData.person,
          title: promiseData.type === 'LEND' ? `${promiseData.person} owes you` : `Return to ${promiseData.person}`,
          dueDate: promiseData.dueDate,
          note: promiseData.note,
        });
        if (!res.success) throw new Error(res.error);
        showToast('Promise recorded.', 'success');
      }
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to save promise.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Delete Promise
  const handleDeletePromise = async (promiseId) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await deleteBill({ userId: user.id, id: promiseId });
      if (!res.success) throw new Error(res.error);
      showToast('Promise removed.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to delete promise.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Save Asset Allocation / Holding
  const handleSaveAsset = async (assetData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await recordMoneyEvent({
        userId: user.id,
        ...assetData,
      });
      if (!res.success) throw new Error(res.error);
      showToast('Asset updated.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to update asset.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Save Transaction (Create / Update)
  const handleSaveTransaction = async (txData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let res;
      if (txData.id) {
        if (transactionModalType === 'expense') {
          res = await updateExpense({
            userId: user.id,
            id: txData.id,
            amount: txData.amount,
            category: txData.category,
            note: txData.note,
            date: txData.date,
          });
        } else {
          res = await updateIncome({
            userId: user.id,
            id: txData.id,
            amount: txData.amount,
            source: txData.source,
            note: txData.note,
            date: txData.date,
          });
        }
      } else {
        if (transactionModalType === 'expense') {
          res = await addExpense({
            userId: user.id,
            amount: txData.amount,
            category: txData.category,
            note: txData.note,
            date: txData.date,
          });
        } else {
          res = await addIncome({
            userId: user.id,
            amount: txData.amount,
            source: txData.source,
            note: txData.note,
            date: txData.date,
          });
        }
      }

      if (!res.success) throw new Error(res.error);
      showToast(txData.id ? 'Transaction updated.' : 'Transaction recorded.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to save transaction.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Action: Delete Transaction
  const handleDeleteTransaction = async (txId) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let res;
      if (transactionModalType === 'expense') {
        res = await deleteExpense({ userId: user.id, id: txId });
      } else {
        res = await deleteIncome({ userId: user.id, id: txId });
      }
      if (!res.success) throw new Error(res.error);
      showToast('Transaction deleted.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to delete transaction.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const parsedBudget = parseFloat(budgetForm.budget);
      const monthlyBudget = !isNaN(parsedBudget) && parsedBudget >= 0 ? parsedBudget : 15000;
      const res = await saveWealthSettings({
        userId: user.id,
        monthlyBudget,
        currency: budgetForm.currency,
      });
      if (!res.success) throw new Error(res.error);
      showToast('Wealth settings saved.', 'success');
      setIsSettingsOpen(false);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth', source: 'wealth_page' } }));
      await loadData(user.id, true);
    } catch (err) {
      showToast(err.message || 'Failed to save settings.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !moneyState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: W.bg }}>
        <div style={{ color: W.petrol, fontSize: '13px', fontWeight: 600, opacity: 0.7 }}>
          Loading your finances…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen" style={{ background: W.bg }}>
        <ErrorState message={error} onRetry={() => user && loadData(user.id)} />
        <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
      </div>
    );
  }

  // ── Calculate Hero Figures ──────────────────────────────────────────────
  const liquidCash = Number(moneyState?.liquidCash ?? 0);
  const committedTotal = Number(moneyState?.upcomingBillTotal || moneyState?.committedNext30Total || 0);
  const unencumberedCash = Number(moneyState?.unencumberedCash ?? Math.max(0, liquidCash - committedTotal));
  const safeToSpendDaily = Number(moneyState?.safeToSpendDaily || 0);
  const _runwayDays = (moneyState?.runwayDays > 0) ? moneyState.runwayDays : 31;

  // ── Shared sub-view header helper ──────────────────────────────────────
  const SubHeader = ({ title, subtitle, actionLabel, onAction }) => (
    <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: W.text, letterSpacing: '-0.02em' }}>
          {title}
        </h1>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: '13px', color: W.sub }}>{subtitle}</p>}
      </div>
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            background: W.petrol,
            border: 'none',
            color: '#FFFFFF',
            fontSize: '12px',
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'pointer',
          }}
        >
          <Plus size={13} />
          <span>{actionLabel}</span>
        </button>
      )}
    </div>
  );

  // ── Sub-view Renderers ──────────────────────────────────────────────────

  // ── 1. ASSETS VIEW (Stage 2D: Financial Position & Monthly Flow) ─────────────
  const renderAssetsView = () => {
    // 1. Calculations & Selectors from existing moneyState
    const cashVal = Number(moneyState.assets?.cash ?? liquidCash ?? 0);
    const savingsVal = Number(moneyState.assets?.savings ?? 0);
    const investedVal = Number(moneyState.assets?.invested ?? 0);
    const goldVal = Number(moneyState.assets?.gold ?? 0);
    const owedToYouVal = Number(moneyState.assets?.owedToYou ?? 0);
    const totalRecordedAssets = Number(moneyState.assets?.total ?? (cashVal + savingsVal + investedVal + goldVal + owedToYouVal));
    const netAssetsVal = Number(moneyState.assets?.netAssets ?? totalRecordedAssets);
    const iOweTotalVal = Number(moneyState.liabilities?.total ?? 0);

    const netFlow = Number((moneyState.flow?.income || 0) - (moneyState.flow?.spent || 0));

    // Structured breakdown of individual recorded asset classes
    const assetCategories = [
      {
        id: 'cash',
        icon: Wallet,
        label: 'Liquid Cash',
        desc: 'Spendable wallet & checking money',
        amount: cashVal,
        actionLabel: 'Calibrate',
        color: W.petrol,
        bg: W.softTeal,
        onClick: () => setIsCalibrateModalOpen(true),
      },
      {
        id: 'savings',
        icon: PiggyBank,
        label: 'Savings Reserve',
        desc: 'Capital set aside for security',
        amount: savingsVal,
        actionLabel: 'Adjust',
        color: W.emerald,
        bg: 'rgba(31, 163, 111, 0.12)',
        onClick: () => { setActiveAssetKey('savings'); setIsAssetAdjustOpen(true); },
      },
      {
        id: 'investments',
        icon: Landmark,
        label: 'Investments',
        desc: 'Stocks, mutual funds & growth assets',
        amount: investedVal,
        actionLabel: 'Adjust',
        color: '#2563EB',
        bg: 'rgba(37, 99, 235, 0.12)',
        onClick: () => { setActiveAssetKey('investments'); setIsAssetAdjustOpen(true); },
      },
      {
        id: 'gold',
        icon: Sparkles,
        label: 'Gold Holdings',
        desc: 'Physical & digital gold reserve',
        amount: goldVal,
        actionLabel: 'Adjust',
        color: W.amber,
        bg: 'rgba(233, 180, 76, 0.15)',
        onClick: () => { setActiveAssetKey('gold'); setIsAssetAdjustOpen(true); },
      },
      {
        id: 'owed',
        icon: Users,
        label: 'Owed to You',
        desc: 'Receivables & peer promises lent',
        amount: owedToYouVal,
        actionLabel: 'View in Plan',
        color: '#7C3AED',
        bg: 'rgba(124, 58, 237, 0.12)',
        onClick: () => { setPlanTab('promises'); setPromisesTab('owed_to_me'); setActiveView('plan'); },
      },
    ];

    return (
      <div className="flex flex-col" style={{ width: '100%', maxWidth: '100%' }}>
        {/* ── 1. Page Heading & Concise Supporting Text ── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 800,
              color: W.text,
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Assets
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: W.sub,
              fontWeight: 500,
            }}>
              Recorded assets, cash reserves & monthly flow
            </p>
          </div>

          {/* Quick Action: Allocate / Adjust Holdings (Touch target >= 44px) */}
          <button
            type="button"
            onClick={() => { setActiveAssetKey('savings'); setIsAssetAdjustOpen(true); }}
            aria-label="Adjust Asset Holding"
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              background: W.petrol,
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(23, 74, 85, 0.2)',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Allocate</span>
          </button>
        </div>

        {/* ── Main Assets Scroll Content ── */}
        <div style={{
          padding: '0 20px calc(130px + env(safe-area-inset-bottom, 24px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* ── 2. Financial Overview Hero Card (Clear Distinction: Spendable vs Total Assets) ── */}
          <div style={{
            background: 'linear-gradient(135deg, #174A55 0%, #0F323A 100%)',
            borderRadius: '24px',
            padding: '22px 20px',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(23, 74, 85, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            <div>
              <span style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: W.softTeal,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Total Recorded Assets
              </span>
              <div style={{
                fontSize: '34px',
                fontWeight: 900,
                letterSpacing: '-0.03em',
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                lineHeight: 1.1,
                marginTop: '4px',
              }}>
                {currencySymbol} {totalRecordedAssets.toLocaleString()}
              </div>
            </div>

            {/* Metric Comparison Row: Liquid Cash vs Net Recorded Position */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}>
              <div>
                <div style={{ fontSize: '11px', color: W.softTeal, fontWeight: 600 }}>
                  Liquid Spendable Cash
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {currencySymbol} {cashVal.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: W.softTeal, fontWeight: 600 }}>
                  Net Assets {iOweTotalVal > 0 ? `(-${currencySymbol}${iOweTotalVal.toLocaleString()})` : ''}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                  {currencySymbol} {netAssetsVal.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Quick Calibration Action embedded in hero */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setIsCalibrateModalOpen(true)}
                aria-label="Calibrate Cash Balance"
                style={{
                  minHeight: '44px',
                  padding: '0 16px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Wallet size={15} />
                <span>Calibrate Cash</span>
              </button>
            </div>
          </div>

          {/* ── Destination Navigation Tabs: Holdings vs Month Flow (Touch target >= 44px) ── */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'holdings', label: 'Asset Holdings' },
              { id: 'flow',     label: 'Monthly Cash Flow' },
            ].map((tab) => {
              const isActive = assetsTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setAssetsTab(tab.id)}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    padding: '0 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: `1.5px solid ${isActive ? W.petrol : W.border}`,
                    background: isActive ? W.petrol : W.surface,
                    color: isActive ? '#FFFFFF' : W.sub,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── 3, 4 & 5. SUB-TAB A: HOLDINGS BREAKDOWN ── */}
          {assetsTab === 'holdings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {assetCategories.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    onClick={item.onClick}
                    role="button"
                    tabIndex={0}
                    style={{
                      background: W.surface,
                      border: `1.5px solid ${W.border}`,
                      borderRadius: '18px',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      minHeight: '44px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: item.bg,
                        color: item.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '14.5px',
                          fontWeight: 700,
                          color: W.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '11.5px', color: W.sub, marginTop: '2px' }}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 800,
                          color: W.text,
                          letterSpacing: '-0.01em',
                          fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                        }}>
                          {currencySymbol} {item.amount.toLocaleString()}
                        </div>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: W.petrol,
                          marginTop: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '2px',
                        }}>
                          <span>{item.actionLabel}</span>
                          <ChevronRight size={11} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── 6. SUB-TAB B: MONTH FLOW BREAKDOWN ── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Monthly Net Cash Flow Card */}
              <div style={{
                background: W.surface,
                borderRadius: '20px',
                padding: '20px',
                border: `1.5px solid ${W.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              }}>
                <div style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: W.sub,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  Net Cash Flow (Current Month)
                </div>
                <div style={{
                  fontSize: '30px',
                  fontWeight: 900,
                  color: netFlow >= 0 ? W.emerald : W.amber,
                  letterSpacing: '-0.02em',
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  margin: '6px 0 2px',
                }}>
                  {netFlow >= 0 ? '+' : ''}{currencySymbol} {netFlow.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: W.muted }}>
                  {netFlow >= 0 ? 'Cash flow positive this month' : 'Net cash outflow this month'}
                </div>
              </div>

              {/* Categorical Breakdown Card */}
              <div style={{
                background: W.surface,
                borderRadius: '20px',
                padding: '16px',
                border: `1.5px solid ${W.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                <div style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: W.text,
                  marginBottom: '4px',
                  paddingBottom: '8px',
                  borderBottom: `1px solid ${W.border}`,
                }}>
                  Flow Breakdown
                </div>

                {[
                  { label: 'Earned Inflow', amount: moneyState.flow?.income || 0, color: W.emerald, prefix: '+' },
                  { label: 'Lifestyle Consumption', amount: moneyState.flow?.spent || 0, color: W.text, prefix: '-' },
                  { label: 'Transferred to Savings', amount: moneyState.flow?.transfers || 0, color: W.petrol, prefix: '' },
                  { label: 'Lent to People', amount: moneyState.flow?.lent || 0, color: '#7C3AED', prefix: '' },
                  { label: 'Invested Capital', amount: moneyState.flow?.invested || 0, color: '#2563EB', prefix: '' },
                  { label: 'Borrowed Capital', amount: moneyState.flow?.borrowed || 0, color: W.amber, prefix: '+' },
                  { label: 'Refunds / Returns', amount: moneyState.flow?.refunds || 0, color: W.emerald, prefix: '+' },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderBottom: idx < 6 ? '1px solid #FAF7F2' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '13px', color: W.sub }}>{item.label}</span>
                    <span style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: item.color,
                      fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                    }}>
                      {item.prefix}{currencySymbol} {Number(item.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 2. PLAN VIEW (Stage 2C: Budgets, Commitments & Promises) ───────────────
  const renderPlanView = () => {
    // 1. Calculations & Selectors from existing moneyState and settings
    const monthlyBudgetVal = (moneyState?.monthlyBudget !== null && moneyState?.monthlyBudget !== undefined)
      ? Number(moneyState.monthlyBudget)
      : (settings?.monthly_budget !== null && settings?.monthly_budget !== undefined && isFinite(Number(settings.monthly_budget)) && Number(settings.monthly_budget) >= 0)
        ? Number(settings.monthly_budget)
        : null;

    const monthSpendTotal = Number(moneyState?.monthSpend ?? 0);
    const budgetRemainingVal = monthlyBudgetVal !== null ? Math.max(0, monthlyBudgetVal - monthSpendTotal) : null;
    const budgetPct = monthlyBudgetVal && monthlyBudgetVal > 0
      ? Math.min(100, Math.round((monthSpendTotal / monthlyBudgetVal) * 100))
      : (monthlyBudgetVal === 0 && monthSpendTotal > 0 ? 100 : 0);

    const pace = moneyState?.spendingPace;

    // 2. Commitments list filtering
    let filteredBills = [];
    if (commitmentsTab === 'upcoming') {
      filteredBills = bills.filter(
        (b) => b.status !== 'receivable' && b.status !== 'paid' && b.frequency !== 'monthly' && b.frequency !== 'weekly'
      );
    } else if (commitmentsTab === 'recurring') {
      filteredBills = bills.filter(
        (b) => b.status !== 'receivable' && (b.frequency === 'monthly' || b.frequency === 'weekly' || b.frequency === 'yearly')
      );
    } else {
      filteredBills = bills.filter((b) => b.status === 'paid');
    }

    // 3. Debts & Peer Promises lists
    const owedToMe = moneyState.moneyPromises || [];
    const iOwe = bills.filter((b) => (b.name || '').toLowerCase().includes('return to') || (b.name || '').toLowerCase().includes('borrow'));
    const activePromises = promisesTab === 'owed_to_me' ? owedToMe : iOwe;

    const totalOwedToMe = owedToMe.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalIOwe = iOwe.reduce((s, r) => s + Number(r.amount || 0), 0);

    return (
      <div className="flex flex-col" style={{ width: '100%', maxWidth: '100%' }}>
        {/* ── 1. Page Heading & Concise Supporting Text ── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 800,
              color: W.text,
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Plan
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: W.sub,
              fontWeight: 500,
            }}>
              Budgets, scheduled bills & peer promises
            </p>
          </div>

          {/* Quick Action: Add Commitment or Promise (Touch target >= 44px) */}
          <button
            type="button"
            onClick={() => {
              if (planTab === 'commitments') {
                setEditingBill(null);
                setIsBillModalOpen(true);
              } else {
                setEditingPromise(null);
                setIsPromiseModalOpen(true);
              }
            }}
            aria-label={planTab === 'commitments' ? 'Add Bill' : 'Add Promise'}
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              background: W.petrol,
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(23, 74, 85, 0.2)',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>{planTab === 'commitments' ? 'Add Bill' : 'Add Promise'}</span>
          </button>
        </div>

        {/* ── Main Plan Scroll Content ── */}
        <div style={{
          padding: '0 20px calc(130px + env(safe-area-inset-bottom, 24px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* ── 2 & 3. Monthly Budget Card with Settings Action & Explicit 0 Support ── */}
          <div style={{
            background: W.surface,
            borderRadius: '24px',
            padding: '20px',
            border: `1.5px solid ${W.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
            {/* Top row: Label + Adjust Button (Touch target >= 44px) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: W.sub,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  Monthly Spending Budget
                </span>
                <div style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  color: W.text,
                  letterSpacing: '-0.02em',
                  fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                  marginTop: '2px',
                }}>
                  {monthlyBudgetVal !== null ? `${currencySymbol} ${monthlyBudgetVal.toLocaleString()}` : 'Not set'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                aria-label="Configure Budget"
                style={{
                  minHeight: '44px',
                  padding: '0 14px',
                  borderRadius: '12px',
                  background: '#FAF7F2',
                  border: `1px solid ${W.border}`,
                  color: W.petrol,
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Settings2 size={15} />
                <span>Adjust</span>
              </button>
            </div>

            {/* Pacing status & Progress bar */}
            {monthlyBudgetVal !== null && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', color: W.sub }}>
                    {currencySymbol} {monthSpendTotal.toLocaleString()} spent ({budgetPct}%)
                  </span>
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: pace?.status === 'exceeded' ? W.danger : pace?.status === 'ahead' ? W.amber : W.emerald,
                    background: pace?.status === 'exceeded' ? 'rgba(239, 68, 68, 0.08)' : pace?.status === 'ahead' ? 'rgba(233, 180, 76, 0.12)' : 'rgba(31, 163, 111, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}>
                    {pace?.label || (monthlyBudgetVal === 0 ? 'Zero Budget Limit' : `${budgetPct}% used`)}
                  </span>
                </div>

                <div style={{
                  width: '100%',
                  height: '8px',
                  background: '#FAF7F2',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  border: '1px solid #ECE8DF',
                }}>
                  <div style={{
                    width: `${Math.min(100, budgetPct)}%`,
                    height: '100%',
                    background: budgetPct >= 100 ? W.danger : budgetPct > 80 ? W.amber : W.petrol,
                    borderRadius: '9999px',
                    transition: 'width 0.3s ease',
                  }} />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: W.muted, marginTop: '8px' }}>
                  <span>{currencySymbol} {monthSpendTotal.toLocaleString()} spent</span>
                  <span>{currencySymbol} {budgetRemainingVal !== null ? budgetRemainingVal.toLocaleString() : 0} remaining</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Destination Navigation Tabs: Commitments vs Promises (Touch target >= 44px) ── */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'commitments', label: 'Bills & Commitments', count: bills.filter((b) => b.status !== 'paid').length },
              { id: 'promises',    label: 'Debts & Promises',     count: owedToMe.length + iOwe.length },
            ].map((tab) => {
              const isActive = planTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPlanTab(tab.id)}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    padding: '0 14px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    border: `1.5px solid ${isActive ? W.petrol : W.border}`,
                    background: isActive ? W.petrol : W.surface,
                    color: isActive ? '#FFFFFF' : W.sub,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span style={{
                      fontSize: '11px',
                      background: isActive ? 'rgba(255,255,255,0.2)' : W.softTeal,
                      color: isActive ? '#FFFFFF' : W.petrol,
                      padding: '1px 7px',
                      borderRadius: '9999px',
                      fontWeight: 800,
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* ── 4, 5 & 6. SECTION A: COMMITMENTS ── */}
          {planTab === 'commitments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Commitments Sub-Tabs (Upcoming, Recurring, Paid) */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'upcoming',  label: 'Upcoming' },
                  { id: 'recurring', label: 'Recurring' },
                  { id: 'past',      label: 'Paid' },
                ].map((tab) => {
                  const isActive = commitmentsTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setCommitmentsTab(tab.id)}
                      style={{
                        minHeight: '40px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        border: `1.5px solid ${isActive ? W.petrol : W.border}`,
                        background: isActive ? W.softTeal : W.surface,
                        color: isActive ? W.petrol : W.sub,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Commitments List */}
              <div style={{
                background: W.surface,
                borderRadius: '20px',
                padding: '14px',
                border: `1.5px solid ${W.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {filteredBills.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 16px',
                    color: W.sub,
                    fontSize: '13px',
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>📅</div>
                    <div style={{ fontWeight: 700, color: W.text, marginBottom: '4px' }}>
                      No {commitmentsTab} commitments
                    </div>
                    <div style={{ color: W.muted }}>
                      {commitmentsTab === 'upcoming'
                        ? 'No bills currently due in the upcoming cycle.'
                        : commitmentsTab === 'recurring'
                        ? 'Add subscriptions or monthly recurring bills.'
                        : 'No bills marked as paid yet.'}
                    </div>
                  </div>
                ) : (
                  filteredBills.map((bill) => (
                    <div
                      key={bill.id}
                      onClick={() => { setEditingBill(bill); setIsBillModalOpen(true); }}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#FAF7F2',
                        border: '1px solid #ECE8DF',
                        cursor: 'pointer',
                        minHeight: '44px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: bill.status === 'paid' ? 'rgba(31, 163, 111, 0.12)' : W.softTeal,
                          color: bill.status === 'paid' ? W.emerald : W.petrol,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          flexShrink: 0,
                        }}>
                          {bill.status === 'paid' ? '✓' : '📅'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: W.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {bill.name}
                          </div>
                          <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                            {bill.frequency && bill.frequency !== 'one_off' ? `${bill.frequency} · ` : ''}
                            Due {bill.due_date || 'soon'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{ fontSize: '14.5px', fontWeight: 800, color: W.text }}>
                          {currencySymbol} {Number(bill.amount || 0).toLocaleString()}
                        </div>
                        {/* Working Mark Paid Toggle (Touch target >= 44px) */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleBill(bill);
                          }}
                          aria-label={bill.status === 'paid' ? `Mark ${bill.name} as unpaid` : `Mark ${bill.name} as paid`}
                          style={{
                            minHeight: '44px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            background: bill.status === 'paid' ? 'rgba(31,163,111,0.12)' : W.softTeal,
                            border: `1.5px solid ${bill.status === 'paid' ? W.emerald : W.border}`,
                            color: bill.status === 'paid' ? W.emerald : W.petrol,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {bill.status === 'paid' ? '✓ Paid' : 'Mark paid'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── 7 & 8. SECTION B: DEBTS & PEER PROMISES ── */}
          {planTab === 'promises' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Summary of Owed to me vs I owe */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                <div style={{
                  background: W.surface,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: `1.5px solid ${promisesTab === 'owed_to_me' ? W.emerald : W.border}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
                  onClick={() => setPromisesTab('owed_to_me')}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: W.sub }}>
                    Owed to you
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: W.emerald,
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                    marginTop: '2px',
                  }}>
                    {currencySymbol} {totalOwedToMe.toLocaleString()}
                  </div>
                </div>

                <div style={{
                  background: W.surface,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: `1.5px solid ${promisesTab === 'i_owe' ? W.danger : W.border}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  cursor: 'pointer',
                }}
                  onClick={() => setPromisesTab('i_owe')}
                >
                  <div style={{ fontSize: '11px', fontWeight: 600, color: W.sub }}>
                    You owe others
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: W.danger,
                    fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                    marginTop: '2px',
                  }}>
                    {currencySymbol} {totalIOwe.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Promises Sub-Tabs (Owed to me vs I owe) */}
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'owed_to_me', label: 'Owed to me', count: owedToMe.length },
                  { id: 'i_owe',      label: 'I owe',       count: iOwe.length },
                ].map((tab) => {
                  const isActive = promisesTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setPromisesTab(tab.id)}
                      style={{
                        minHeight: '40px',
                        padding: '0 16px',
                        borderRadius: '12px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        border: `1.5px solid ${isActive ? W.petrol : W.border}`,
                        background: isActive ? W.softTeal : W.surface,
                        color: isActive ? W.petrol : W.sub,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span>{tab.label}</span>
                      {tab.count > 0 && (
                        <span style={{
                          fontSize: '11px',
                          background: 'rgba(0,0,0,0.06)',
                          padding: '1px 6px',
                          borderRadius: '9999px',
                          fontWeight: 700,
                        }}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Promises List */}
              <div style={{
                background: W.surface,
                borderRadius: '20px',
                padding: '14px',
                border: `1.5px solid ${W.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}>
                {activePromises.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '40px 16px',
                    color: W.sub,
                    fontSize: '13px',
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '8px' }}>🤝</div>
                    <div style={{ fontWeight: 700, color: W.text, marginBottom: '4px' }}>
                      {promisesTab === 'owed_to_me' ? 'Nobody owes you money right now' : 'You have no outstanding debts'}
                    </div>
                    <div style={{ color: W.muted }}>
                      {promisesTab === 'owed_to_me'
                        ? 'Track money you lend to friends or colleagues.'
                        : 'Track loans or money you have borrowed to return.'}
                    </div>
                  </div>
                ) : (
                  activePromises.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => { setEditingPromise(r.raw || r); setIsPromiseModalOpen(true); }}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#FAF7F2',
                        border: '1px solid #ECE8DF',
                        cursor: 'pointer',
                        minHeight: '44px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: promisesTab === 'owed_to_me' ? 'rgba(31, 163, 111, 0.14)' : 'rgba(239, 68, 68, 0.12)',
                          color: promisesTab === 'owed_to_me' ? W.emerald : W.danger,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                          flexShrink: 0,
                        }}>
                          {((r.person || r.name || 'N').charAt(0)).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: W.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {r.person || r.name || 'Contact'}
                          </div>
                          <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                            Due {r.dueDate || r.due_date || 'Soon'}
                            {r.note ? ` · ${r.note}` : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{
                          fontSize: '14.5px',
                          fontWeight: 800,
                          color: promisesTab === 'owed_to_me' ? W.emerald : W.danger,
                        }}>
                          {currencySymbol} {Number(r.amount || 0).toLocaleString()}
                        </div>

                        {/* Working Settle Button (Touch target >= 44px) */}
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolvePromise({ id: r.id, amount: r.amount, person: r.person || r.name });
                          }}
                          aria-label={promisesTab === 'owed_to_me' ? `Mark ${r.person || 'contact'} as received` : `Mark loan from ${r.person || 'contact'} as paid`}
                          style={{
                            minHeight: '44px',
                            padding: '0 12px',
                            borderRadius: '10px',
                            background: promisesTab === 'owed_to_me' ? 'rgba(31,163,111,0.12)' : 'rgba(239,68,68,0.12)',
                            border: `1.5px solid ${promisesTab === 'owed_to_me' ? W.emerald : W.danger}`,
                            color: promisesTab === 'owed_to_me' ? W.emerald : W.danger,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: isSubmitting ? 'not-allowed' : 'pointer',
                            opacity: isSubmitting ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {promisesTab === 'owed_to_me' ? 'Received' : 'Mark paid'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── 3. ACTIVITY VIEW (Stage 2B: Unified Money Ledger) ─────────────────────
  const renderActivityView = () => {
    // 1. Calculations & Month-to-date summaries using existing data
    const monthEarned = Number(moneyState?.monthEarned ?? 0);
    const monthSpend = Number(moneyState?.monthSpend ?? 0);
    const netFlow = monthEarned - monthSpend;

    // 2. Build full unified transaction list from real user data
    let allTx = [
      ...expenses.map((e) => ({
        ...e,
        txType: 'expense',
        date: e.expense_date,
        title: e.note || e.category || 'Expense',
        categoryOrSource: e.category || 'General',
        raw: e,
      })),
      ...incomes.map((i) => ({
        ...i,
        txType: 'income',
        date: i.income_date,
        title: i.note || i.source || 'Income',
        categoryOrSource: i.source || 'Income',
        raw: i,
      })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    // 3. Filter by type (All / Expense / Income)
    if (recentFilter === 'expense') {
      allTx = allTx.filter((t) => t.txType === 'expense');
    } else if (recentFilter === 'income') {
      allTx = allTx.filter((t) => t.txType === 'income');
    }

    // 4. Filter by search query (merchant, title, note, category, source, amount, date)
    const query = activitySearchQuery.trim().toLowerCase();
    const filteredTx = query
      ? allTx.filter((t) => {
          const matchTitle = (t.title || '').toLowerCase().includes(query);
          const matchNote = (t.note || '').toLowerCase().includes(query);
          const matchCat = (t.category || '').toLowerCase().includes(query);
          const matchSource = (t.source || '').toLowerCase().includes(query);
          const matchMerchant = (t.merchant || '').toLowerCase().includes(query);
          const matchAmount = String(t.amount || '').includes(query);
          const matchDate = (t.date || '').toLowerCase().includes(query);
          return matchTitle || matchNote || matchCat || matchSource || matchMerchant || matchAmount || matchDate;
        })
      : allTx;

    return (
      <div className="flex flex-col" style={{ width: '100%', maxWidth: '100%' }}>
        {/* ── 1. Page Heading & Subtitle ── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 800,
              color: W.text,
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Activity
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: W.sub,
              fontWeight: 500,
            }}>
              Unified transaction history & statements
            </p>
          </div>

          {/* Quick Action: Log New Transaction (Touch target >= 44px) */}
          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setTransactionModalType('expense');
              setIsTransactionModalOpen(true);
            }}
            aria-label="Add Transaction"
            style={{
              minHeight: '44px',
              padding: '0 16px',
              borderRadius: '12px',
              background: W.petrol,
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(23, 74, 85, 0.2)',
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Record</span>
          </button>
        </div>

        {/* ── Main Activity Scroll Area ── */}
        <div style={{
          padding: '0 20px calc(130px + env(safe-area-inset-bottom, 24px))',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          {/* ── 2. Compact Month-to-date Income & Expense Summary ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
          }}>
            {/* Earned */}
            <div style={{
              background: W.surface,
              borderRadius: '16px',
              padding: '12px 14px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: W.sub }}>
                Earned
              </span>
              <span style={{
                fontSize: '15px',
                fontWeight: 800,
                color: W.emerald,
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                letterSpacing: '-0.02em',
              }}>
                +{fmtShort(monthEarned)}
              </span>
            </div>

            {/* Spent */}
            <div style={{
              background: W.surface,
              borderRadius: '16px',
              padding: '12px 14px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: W.sub }}>
                Spent
              </span>
              <span style={{
                fontSize: '15px',
                fontWeight: 800,
                color: W.text,
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                letterSpacing: '-0.02em',
              }}>
                -{fmtShort(monthSpend)}
              </span>
            </div>

            {/* Net Flow */}
            <div style={{
              background: W.surface,
              borderRadius: '16px',
              padding: '12px 14px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: W.sub }}>
                Net
              </span>
              <span style={{
                fontSize: '15px',
                fontWeight: 800,
                color: netFlow >= 0 ? W.emerald : W.amber,
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
                letterSpacing: '-0.02em',
              }}>
                {netFlow >= 0 ? '+' : ''}{fmtShort(netFlow)}
              </span>
            </div>
          </div>

          {/* ── 7. Prominent but Unobtrusive Connect Money Action (Statement Import) ── */}
          <div
            onClick={() => setIsConnectMoneyOpen(true)}
            role="button"
            tabIndex={0}
            style={{
              background: 'linear-gradient(135deg, #FAF7F2 0%, #FFFFFF 100%)',
              border: `1.5px solid ${W.border}`,
              borderRadius: '18px',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
              minHeight: '44px',
              transition: 'border-color 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: W.softTeal,
                color: W.petrol,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0,
              }}>
                📄
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: W.text }}>
                  Import Bank Statement
                </div>
                <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                  Auto-reconciliation, PDF/CSV parsing & duplicate detection
                </div>
              </div>
            </div>

            <ChevronRight size={15} color={W.muted} />
          </div>

          {/* ── 3. Search Field ── */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
          }}>
            <Search
              size={16}
              color={W.muted}
              style={{
                position: 'absolute',
                left: '14px',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              value={activitySearchQuery}
              onChange={(e) => setActivitySearchQuery(e.target.value)}
              placeholder="Search by note, category, or amount..."
              aria-label="Search transactions"
              style={{
                width: '100%',
                minHeight: '44px',
                borderRadius: '14px',
                background: W.surface,
                border: `1.5px solid ${W.border}`,
                padding: '0 38px 0 38px',
                fontSize: '13.5px',
                color: W.text,
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            />
            {activitySearchQuery && (
              <button
                type="button"
                onClick={() => setActivitySearchQuery('')}
                aria-label="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.06)',
                  border: 'none',
                  color: W.sub,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* ── 4. Filter Controls (All, Expenses, Income) ── */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all',     label: 'All Activity' },
              { id: 'expense', label: 'Expenses' },
              { id: 'income',  label: 'Income' },
            ].map((tab) => {
              const isActive = (recentFilter === tab.id) || (tab.id === 'all' && (!recentFilter || recentFilter === 'all'));
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setRecentFilter(tab.id === 'all' ? 'all' : tab.id)}
                  style={{
                    minHeight: '44px',
                    padding: '0 18px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 600,
                    border: `1.5px solid ${isActive ? W.petrol : W.border}`,
                    background: isActive ? W.petrol : W.surface,
                    color: isActive ? '#FFFFFF' : W.sub,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── 5 & 6. Readable Transaction List + States ── */}
          <div style={{
            background: W.surface,
            borderRadius: '20px',
            padding: '14px',
            border: `1.5px solid ${W.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {/* Empty State: No search results */}
            {query && filteredTx.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px 16px',
                color: W.sub,
                fontSize: '13px',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🔍</div>
                <div style={{ fontWeight: 700, color: W.text, marginBottom: '4px' }}>
                  No transactions match "{activitySearchQuery}"
                </div>
                <div>Check spelling or try a different keyword or category.</div>
                <button
                  type="button"
                  onClick={() => setActivitySearchQuery('')}
                  style={{
                    marginTop: '12px',
                    minHeight: '36px',
                    padding: '0 16px',
                    borderRadius: '8px',
                    background: W.softTeal,
                    border: 'none',
                    color: W.petrol,
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Clear search
                </button>
              </div>
            ) : filteredTx.length === 0 ? (
              /* Empty State: Zero total transactions */
              <div style={{
                textAlign: 'center',
                padding: '48px 16px',
                color: W.sub,
                fontSize: '13px',
              }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>☕</div>
                <div style={{ fontWeight: 700, color: W.text, marginBottom: '4px' }}>
                  No transactions recorded
                </div>
                <div style={{ color: W.muted }}>
                  Log an expense, record income, or import a bank statement.
                </div>
              </div>
            ) : (
              /* Transaction Rows (Touch target >= 44px + Full edit modal trigger) */
              filteredTx.map((tx) => {
                const isCredit = tx.txType === 'income';
                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setEditingTransaction(tx.raw || tx);
                      setTransactionModalType(tx.txType);
                      setIsTransactionModalOpen(true);
                    }}
                    role="button"
                    tabIndex={0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      background: '#FAF7F2',
                      border: '1px solid #ECE8DF',
                      cursor: 'pointer',
                      minHeight: '44px',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: isCredit ? 'rgba(31, 163, 111, 0.14)' : W.softTeal,
                        color: isCredit ? W.emerald : W.petrol,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '13px',
                        flexShrink: 0,
                      }}>
                        {isCredit ? '↓' : '↑'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: W.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {tx.title}
                        </div>
                        <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{tx.categoryOrSource}</span>
                          <span style={{ color: W.muted }}> · {tx.date ? tx.date.split('T')[0] : 'Today'}</span>
                          {tx.note && tx.note !== tx.title && (
                            <span style={{ color: W.muted }}> · {tx.note}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                      <div style={{
                        fontSize: '14.5px',
                        fontWeight: 800,
                        color: isCredit ? W.emerald : W.text,
                      }}>
                        {isCredit ? '+' : '-'}{currencySymbol} {Number(tx.amount || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  // 4. (Removed standalone recent view — merged into renderActivityView)
  // This stub is kept as a safety fallback redirect
  const renderRecentView = () => renderActivityView();

  // 5. (Removed standalone flow view — merged into renderAssetsView flow sub-tab)
  const renderFlowView = () => {
    // Redirect to assets view with flow tab active
    setAssetsTab('flow');
    setActiveView('assets');
    return null;
  };

  // ── 6. HOME VIEW (Stage 2A: Personal Finance Command Center) ─────────────────
  const renderHomeView = () => {
    // 1. Calculations & Selectors from existing moneyState
    const availableToSpend = Number(moneyState?.unencumberedCash ?? moneyState?.liquidCash ?? 0);
    const monthIncomeTotal = Number(moneyState?.monthEarned ?? 0);
    const monthSpendTotal = Number(moneyState?.monthSpend ?? 0);
    const netCashFlow = monthIncomeTotal - monthSpendTotal;
    const monthlyBudgetVal = (moneyState?.monthlyBudget !== null && moneyState?.monthlyBudget !== undefined)
      ? Number(moneyState.monthlyBudget)
      : (settings?.monthly_budget !== null && settings?.monthly_budget !== undefined && isFinite(Number(settings.monthly_budget)) && Number(settings.monthly_budget) >= 0)
        ? Number(settings.monthly_budget)
        : null;

    const budgetPct = monthlyBudgetVal && monthlyBudgetVal > 0
      ? Math.min(100, Math.round((monthSpendTotal / monthlyBudgetVal) * 100))
      : (monthlyBudgetVal === 0 && monthSpendTotal > 0 ? 100 : 0);

    const pace = moneyState?.spendingPace;
    const nextUnpaidBill = moneyState?.nextBill;
    const dexText = moneyState?.dexGuidance;

    // Filter transactions for preview
    let homeTx = [
      ...expenses.map((e) => ({ ...e, txType: 'expense', date: e.expense_date, title: e.note || e.category || 'Expense' })),
      ...incomes.map((i) => ({ ...i, txType: 'income', date: i.income_date, title: i.note || i.source || 'Income' })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (recentFilter === 'expense') {
      homeTx = homeTx.filter((t) => t.txType === 'expense');
    } else if (recentFilter === 'income') {
      homeTx = homeTx.filter((t) => t.txType === 'income');
    }

    return (
      <div className="flex flex-col" style={{ width: '100%', maxWidth: '100%' }}>
        {/* ── 1. Page Heading & Concise Supporting Text ── */}
        <div style={{
          padding: '24px 20px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 800,
              color: W.text,
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Wealth
            </h1>
            <p style={{
              margin: '4px 0 0',
              fontSize: '13px',
              color: W.sub,
              fontWeight: 500,
            }}>
              Spend with intention · Calm command center
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Wealth Settings"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: W.surface,
              border: `1px solid ${W.border}`,
              color: W.petrol,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <Settings2 size={18} />
          </button>
        </div>

        {/* ── Main Scroll Content ── */}
        <div
          className="wealth-content-grid"
          style={{
            padding: '0 20px calc(130px + env(safe-area-inset-bottom, 24px))',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* ── 2. Prominent Safe to Spend / Available to Spend Card ── */}
          <div style={{
            background: 'linear-gradient(135deg, #174A55 0%, #0F323A 100%)',
            borderRadius: '24px',
            padding: '24px 20px',
            color: '#FFFFFF',
            boxShadow: '0 8px 24px rgba(23, 74, 85, 0.22)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top Row: Label & Runway */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 700,
                color: W.softTeal,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}>
                Available to Spend
              </span>
              {moneyState?.runwayDays !== null && moneyState?.runwayDays !== undefined && (
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(221, 233, 235, 0.15)',
                  color: W.softTeal,
                  padding: '3px 9px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(221, 233, 235, 0.25)',
                }}>
                  {moneyState.runwayDays}d runway
                </span>
              )}
            </div>

            {/* Big Amount */}
            <div style={{
              fontSize: '38px',
              fontWeight: 900,
              letterSpacing: '-0.03em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              lineHeight: 1.1,
              marginBottom: '6px',
            }}>
              {currencySymbol} {availableToSpend.toLocaleString()}
            </div>

            {/* Sub-label / Budget drilldown */}
            <div
              onClick={() => { setAssetsTab('flow'); setActiveView('assets'); }}
              role="button"
              tabIndex={0}
              style={{
                fontSize: '12.5px',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '20px',
              }}
            >
              <span>
                {monthlyBudgetVal !== null
                  ? `of ${currencySymbol} ${monthlyBudgetVal.toLocaleString()} monthly budget`
                  : 'Tap to configure monthly budget'}
              </span>
              <ChevronRight size={13} />
            </div>

            {/* ── 7. Primary Quick Actions: Add Expense / Add Income (Embedded in Hero with >=44px touch) ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setTransactionModalType('expense');
                  setIsTransactionModalOpen(true);
                }}
                style={{
                  minHeight: '44px',
                  borderRadius: '12px',
                  background: '#FFFFFF',
                  border: 'none',
                  color: W.petrol,
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                  transition: 'opacity 0.15s ease',
                }}
              >
                <Plus size={16} strokeWidth={2.5} />
                <span>Add Expense</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingTransaction(null);
                  setTransactionModalType('income');
                  setIsTransactionModalOpen(true);
                }}
                style={{
                  minHeight: '44px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.14)',
                  border: '1px solid rgba(255, 255, 255, 0.28)',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 0.15s ease',
                }}
              >
                <TrendingUp size={16} />
                <span>+ Income</span>
              </button>
            </div>
          </div>

          {/* ── 3. Compact Monthly Income and Spending Summary ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}>
            {/* Earned this month */}
            <div style={{
              background: W.surface,
              borderRadius: '18px',
              padding: '16px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(31, 163, 111, 0.12)',
                  color: W.emerald,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                }}>
                  ↓
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: W.sub }}>
                  Earned
                </span>
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 800,
                color: W.text,
                letterSpacing: '-0.02em',
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              }}>
                {currencySymbol} {monthIncomeTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: W.muted }}>
                Current month inflow
              </div>
            </div>

            {/* Spent this month */}
            <div style={{
              background: W.surface,
              borderRadius: '18px',
              padding: '16px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'rgba(23, 74, 85, 0.12)',
                  color: W.petrol,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 800,
                }}>
                  ↑
                </span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: W.sub }}>
                  Spent
                </span>
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: 800,
                color: W.text,
                letterSpacing: '-0.02em',
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              }}>
                {currencySymbol} {monthSpendTotal.toLocaleString()}
              </div>
              <div style={{ fontSize: '11px', color: netCashFlow >= 0 ? W.emerald : W.amber, fontWeight: 500 }}>
                Net: {netCashFlow >= 0 ? '+' : ''}{currencySymbol} {netCashFlow.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ── 4. Budget Pacing / Spending Status ── */}
          {monthlyBudgetVal !== null && monthlyBudgetVal > 0 && (
            <div style={{
              background: W.surface,
              borderRadius: '18px',
              padding: '16px 18px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px' }}>🎯</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: W.text }}>
                    Monthly Budget Pacing
                  </span>
                </div>
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: pace?.status === 'exceeded' ? W.danger : pace?.status === 'ahead' ? W.amber : W.emerald,
                  background: pace?.status === 'exceeded' ? 'rgba(239, 68, 68, 0.08)' : pace?.status === 'ahead' ? 'rgba(233, 180, 76, 0.12)' : 'rgba(31, 163, 111, 0.08)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                }}>
                  {pace?.label || `${budgetPct}% used`}
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{
                width: '100%',
                height: '7px',
                background: '#FAF7F2',
                borderRadius: '9999px',
                overflow: 'hidden',
                margin: '8px 0',
                border: '1px solid #EFEAE1',
              }}>
                <div style={{
                  width: `${Math.min(100, budgetPct)}%`,
                  height: '100%',
                  background: budgetPct >= 100 ? W.danger : budgetPct > 80 ? W.amber : W.petrol,
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: W.sub }}>
                <span>{currencySymbol} {monthSpendTotal.toLocaleString()} spent</span>
                <span>{currencySymbol} {Math.max(0, monthlyBudgetVal - monthSpendTotal).toLocaleString()} remaining</span>
              </div>
            </div>
          )}

          {/* ── 5. Next Upcoming Unpaid Commitment ── */}
          {nextUnpaidBill && (
            <div
              onClick={() => { setPlanTab('commitments'); setActiveView('plan'); }}
              role="button"
              tabIndex={0}
              style={{
                background: W.surface,
                borderRadius: '18px',
                padding: '16px 18px',
                border: `1.5px solid ${W.border}`,
                boxShadow: '0 1px 4px rgba(0,0,0,0.02)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(23, 74, 85, 0.08)',
                  color: W.petrol,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  flexShrink: 0,
                }}>
                  📅
                </div>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: W.sub, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Next Commitment
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: W.text, marginTop: '2px' }}>
                    {nextUnpaidBill.name}
                  </div>
                  <div style={{ fontSize: '11px', color: W.muted, marginTop: '1px' }}>
                    Due {nextUnpaidBill.daysUntil === 0 ? 'today' : nextUnpaidBill.daysUntil === 1 ? 'tomorrow' : `in ${nextUnpaidBill.daysUntil} days`} ({nextUnpaidBill.due_date})
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: W.text }}>
                    {currencySymbol} {Number(nextUnpaidBill.amount || 0).toLocaleString()}
                  </div>
                  <div style={{ fontSize: '11px', color: W.petrol, fontWeight: 600 }}>
                    View in Plan ›
                  </div>
                </div>
                <ChevronRight size={14} color={W.muted} />
              </div>
            </div>
          )}

          {/* ── 6. Existing Dex Financial Guidance ── */}
          {dexText && (
            <div style={{
              background: '#FAF7F2',
              borderRadius: '18px',
              padding: '14px 16px',
              border: `1.5px solid ${W.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: W.petrol,
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '13px',
                flexShrink: 0,
              }}>
                Z
              </div>
              <div style={{ fontSize: '12.5px', color: W.text, lineHeight: 1.4, fontWeight: 500 }}>
                <span style={{ fontWeight: 700, color: W.petrol }}>Dex Insight: </span>
                {dexText}
              </div>
            </div>
          )}

          {/* ── 8. Recent Transactions Preview (Latest 5 + Working Path to Activity) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: W.text,
                letterSpacing: '-0.01em',
              }}>
                Recent Transactions
              </h2>
              <button
                type="button"
                onClick={() => setActiveView('activity')}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: W.petrol,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  padding: '6px 8px',
                  minHeight: '44px',
                }}
              >
                <span>View all</span>
                <ChevronRight size={13} />
              </button>
            </div>

            {/* Transaction Filter Pills (Overview / Expenses / Income) */}
            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'overview', label: 'All' },
                { id: 'expense',  label: 'Expenses' },
                { id: 'income',   label: 'Income' },
              ].map((p) => {
                const isActive = (recentFilter === p.id) || (p.id === 'overview' && (!recentFilter || recentFilter === 'all'));
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setRecentFilter(p.id === 'overview' ? 'all' : p.id)}
                    style={{
                      background: isActive ? W.petrol : W.surface,
                      border: `1px solid ${isActive ? W.petrol : W.border}`,
                      borderRadius: '9999px',
                      padding: '8px 16px',
                      minHeight: '36px',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      color: isActive ? '#FFFFFF' : W.sub,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Transaction List Card */}
            <div style={{
              background: W.surface,
              borderRadius: '20px',
              padding: '14px',
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}>
              {homeTx.length === 0 ? (
                <div style={{
                  padding: '32px 16px',
                  textAlign: 'center',
                  color: W.muted,
                  fontSize: '13px',
                }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>☕</div>
                  No financial activity recorded yet.
                </div>
              ) : (
                homeTx.slice(0, 5).map((tx) => {
                  const isCredit = tx.isCredit || tx.txType === 'income';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => {
                        setEditingTransaction(tx.raw || tx);
                        setTransactionModalType(isCredit ? 'income' : 'expense');
                        setIsTransactionModalOpen(true);
                      }}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#FAF7F2',
                        border: '1px solid #ECE8DF',
                        cursor: 'pointer',
                        minHeight: '44px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: isCredit ? 'rgba(31, 163, 111, 0.14)' : W.softTeal,
                          color: isCredit ? W.emerald : W.petrol,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '13px',
                          flexShrink: 0,
                        }}>
                          {isCredit ? '↓' : '↑'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: W.text,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {tx.merchant || tx.title || tx.name || (isCredit ? 'Income' : 'Expense')}
                          </div>
                          <div style={{ fontSize: '11px', color: W.muted, marginTop: '2px' }}>
                            {tx.category || (isCredit ? 'Income' : 'General')}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 800,
                          color: isCredit ? W.emerald : W.text,
                        }}>
                          {isCredit ? '+' : '-'} {currencySymbol} {Number(tx.amount || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: W.muted, marginTop: '2px' }}>
                          {tx.date ? tx.date.split('T')[0] : 'Today'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Destination Navigation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => { setAssetsTab('flow'); setActiveView('assets'); }}
                style={{
                  minHeight: '48px',
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: W.text, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📊</span> Flow & Assets
                  </div>
                  <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                    {fmtShort(moneyState.monthSpend || 0)} spent · {fmtShort(liquidCash)} cash
                  </div>
                </div>
                <ChevronRight size={13} color={W.muted} />
              </button>

              <button
                type="button"
                onClick={() => { setPlanTab('commitments'); setActiveView('plan'); }}
                style={{
                  minHeight: '48px',
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
              >
                <div>
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: W.text, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span>📅</span> Plan & Bills
                  </div>
                  <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                    {bills.filter((b) => b.status !== 'paid').length} upcoming commitments
                  </div>
                </div>
                <ChevronRight size={13} color={W.muted} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Four-Destination Bottom Bar ─────────────────────────────────────────
  const DEST_TABS = [
    { id: 'home',     label: 'Home',     emoji: '🏠' },
    { id: 'activity', label: 'Activity', emoji: '📋' },
    { id: 'plan',     label: 'Plan',     emoji: '📅' },
    { id: 'assets',   label: 'Assets',   emoji: '💰' },
  ];

  return (
    <div
      className="app-container min-h-screen relative flex flex-col"
      style={{ background: W.bg, color: W.text }}
    >
      {activeView === 'home'     && renderHomeView()}
      {activeView === 'activity' && renderActivityView()}
      {activeView === 'plan'     && renderPlanView()}
      {activeView === 'assets'   && renderAssetsView()}
      {/* Fallback for any stale legacy URL values */}
      {activeView === 'recent'   && renderActivityView()}
      {activeView === 'flow'     && renderAssetsView()}

      {/* ── FOUR-DESTINATION TAB BAR ────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
          left: 0,
          right: 0,
          zIndex: 40,
          display: 'flex',
          background: 'rgba(244,240,232,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: `1.5px solid ${W.border}`,
          padding: '0 8px',
        }}
      >
        {DEST_TABS.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '10px 4px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderTop: isActive ? `2px solid ${W.petrol}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{tab.emoji}</span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? W.petrol : W.muted,
                  letterSpacing: '0.02em',
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── SHARED MODALS (Mounted across all views!) ──────────────────────── */}

      {/* Tell Zyrbit What Happened Bottom Sheet */}
      <MoneyEventModal
        isOpen={isEventModalOpen}
        currencySymbol={currencySymbol}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleRecordEvent}
      />

      {/* Cash Position Calibration Modal */}
      <CashCalibrationModal
        isOpen={isCalibrateModalOpen}
        currentCash={moneyState.liquidCash}
        currencySymbol={currencySymbol}
        onClose={() => setIsCalibrateModalOpen(false)}
        onSave={handleCalibrateCash}
      />

      {/* Bill / Commitment Modal (Add & Edit) */}
      <BillFormModal
        isOpen={isBillModalOpen}
        onClose={() => {
          setIsBillModalOpen(false);
          setEditingBill(null);
        }}
        onSave={handleSaveBill}
        onDelete={handleDeleteBill}
        initialData={editingBill}
        currencySymbol={currencySymbol}
      />

      {/* Promise Modal (Add & Edit) */}
      <PromiseFormModal
        isOpen={isPromiseModalOpen}
        onClose={() => {
          setIsPromiseModalOpen(false);
          setEditingPromise(null);
        }}
        onSave={handleSavePromise}
        onDelete={handleDeletePromise}
        onResolve={handleResolvePromise}
        editingPromise={editingPromise}
        initialData={editingPromise}
        defaultType={promisesTab === 'owed_to_me' ? 'LEND' : 'BORROW'}
        currencySymbol={currencySymbol}
      />

      {/* Asset Adjustment Modal */}
      <AssetAdjustmentModal
        isOpen={isAssetAdjustOpen}
        onClose={() => setIsAssetAdjustOpen(false)}
        onSave={handleSaveAsset}
        assetKey={activeAssetKey}
        currentValues={{
          savings: moneyState.assets?.savings || 0,
          invested: moneyState.assets?.invested || 0,
          gold: moneyState.assets?.gold || 0,
        }}
        currencySymbol={currencySymbol}
      />

      {/* Transaction Modal (Add & Edit Expense or Income) */}
      <TransactionFormModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        type={transactionModalType}
        initialData={editingTransaction}
        currencySymbol={currencySymbol}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div
          onClick={() => setIsSettingsOpen(false)}
          className="fixed inset-0 z-[200] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6 flex flex-col gap-4 max-h-[92vh] overflow-y-auto"
            style={{
              background: W.bg,
              border: `1.5px solid ${W.border}`,
              boxShadow: '0 24px 48px -12px rgba(17, 26, 32, 0.25)',
            }}
          >
            {/* Top bar with icon badge, title/breadcrumbs, and close button */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{ background: W.softTeal, color: W.petrol }}
                >
                  <SlidersHorizontal size={20} className="stroke-[2.2]" />
                </div>
                <div>
                  <h2 style={{ color: W.text }} className="text-base font-bold leading-snug">
                    Wealth settings
                  </h2>
                  <p className="text-[11px] font-medium text-[#68777B]">
                    Preferences · Currency & Budget
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#68777B] hover:text-[#111A20] hover:bg-black/5 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Section Heading & Subtitle */}
            <div>
              <h3 style={{ color: W.text }} className="text-lg font-bold tracking-tight">
                Configure your finances
              </h3>
              <p className="text-xs text-[#68777B] mt-1 leading-relaxed">
                Choose your display currency and adjust your monthly spending budget cap.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-3.5">
              {/* Currency Selector Card */}
              <div
                className="p-3.5 rounded-2xl flex flex-col gap-2"
                style={{
                  background: W.card,
                  border: `1px solid ${W.border}`,
                }}
              >
                <label className="text-xs font-medium text-[#68777B]">
                  Currency
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { code: 'INR', sym: '₹' },
                    { code: 'USD', sym: '$' },
                    { code: 'EUR', sym: '€' },
                  ].map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setBudgetForm({ ...budgetForm, currency: c.code })}
                      className="py-2.5 rounded-xl border font-bold text-xs transition cursor-pointer"
                      style={{
                        background: budgetForm.currency === c.code ? W.softTeal : W.elevated,
                        borderColor: budgetForm.currency === c.code ? W.petrol : W.border,
                        color: budgetForm.currency === c.code ? W.petrol : W.sub,
                      }}
                    >
                      {c.sym} ({c.code})
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Budget Card */}
              <div
                className="p-4 rounded-2xl flex flex-col gap-2"
                style={{
                  background: W.card,
                  border: `1px solid ${W.border}`,
                }}
              >
                <label className="text-xs font-medium text-[#68777B]">
                  Monthly spending budget cap
                </label>
                <div className="flex items-center gap-2 pb-1" style={{ borderBottom: `1px solid ${W.border}` }}>
                  <span className="text-2xl font-bold text-[#174A55] select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    placeholder="15000"
                    value={budgetForm.budget}
                    onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })}
                    className="w-full text-2xl font-bold text-[#111A20] outline-none bg-transparent placeholder:text-[#8A9CA3]"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="submit"
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 transition hover:opacity-95 cursor-pointer shadow-sm"
                  style={{ background: W.petrol }}
                >
                  <span>Save settings</span>
                  <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); setIsCalibrateModalOpen(true); }}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-[#174A55] transition cursor-pointer flex items-center justify-center gap-1.5"
                  style={{
                    background: W.softTeal,
                    border: `1px solid ${W.border}`,
                  }}
                >
                  <Wallet size={15} />
                  <span>Set / Calibrate Cash Balance</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="w-full py-3 rounded-2xl font-bold text-sm text-[#68777B] hover:text-[#111A20] transition cursor-pointer"
                  style={{
                    background: W.elevated,
                    border: `1px solid ${W.border}`,
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect Money Statement Import Modal */}
      <ConnectMoneyModal
        isOpen={isConnectMoneyOpen}
        onClose={() => setIsConnectMoneyOpen(false)}
        userId={user?.id}
        currencySymbol={currencySymbol}
        onImportComplete={() => user && loadData(user.id)}
      />

      {/* ── Global Navigation ────────────────────────────────────────────────── */}
      <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
