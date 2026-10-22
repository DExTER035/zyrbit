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

  // 1. ASSETS VIEW (holdings + flow)
  const renderAssetsView = () => {
    const assetItems = [
      { id: 'cash', icon: Wallet, label: 'Cash', desc: 'Your current liquid money', amount: moneyState.assets?.cash || liquidCash, actionLabel: 'Calibrate' },
      { id: 'savings', icon: PiggyBank, label: 'Savings', desc: "Money you've set aside", amount: moneyState.assets?.savings || 0, actionLabel: 'Adjust' },
      { id: 'investments', icon: Landmark, label: 'Investments', desc: 'Current value', amount: moneyState.assets?.invested || 0, actionLabel: 'Adjust' },
      { id: 'gold', icon: Sparkles, label: 'Gold', desc: 'Your gold holdings', amount: moneyState.assets?.gold || 0, actionLabel: 'Adjust' },
      { id: 'owed', icon: Users, label: 'Owed to you', desc: 'Money others owe you', amount: moneyState.assets?.owedToYou || 0, actionLabel: 'View Promises' },
    ];

    const netFlow = (moneyState.flow?.income || 0) - (moneyState.flow?.spent || 0);

    return (
      <div className="flex flex-col">
        <SubHeader
          title="Assets"
          subtitle="Where your money lives"
          actionLabel="Allocate"
          onAction={() => { setActiveAssetKey('savings'); setIsAssetAdjustOpen(true); }}
        />

        {/* Sub-tabs: Holdings / Flow */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '6px' }}>
          {[{ id: 'holdings', label: 'Holdings' }, { id: 'flow', label: 'Month Flow' }].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setAssetsTab(tab.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1.5px solid ${assetsTab === tab.id ? W.petrol : W.border}`,
                background: assetsTab === tab.id ? W.petrol : W.surface,
                color: assetsTab === tab.id ? '#FFFFFF' : W.sub,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {assetsTab === 'holdings' ? (
          <div style={{ padding: '0 20px calc(160px + env(safe-area-inset-bottom, 24px))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {assetItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'cash') setIsCalibrateModalOpen(true);
                    else if (item.id === 'owed') { setPlanTab('promises'); setActiveView('plan'); }
                    else { setActiveAssetKey(item.id); setIsAssetAdjustOpen(true); }
                  }}
                  style={{
                    background: W.surfaceCard,
                    border: `1.5px solid ${W.border}`,
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: W.softTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: W.petrol }}>
                      <Icon size={17} />
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: W.text }}>{item.label}</div>
                      <div style={{ fontSize: '11.5px', color: W.sub, marginTop: '1px' }}>{item.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: W.text }}>{fmtFull(item.amount)}</div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: W.petrol, background: W.softTeal, padding: '3px 8px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <span>{item.actionLabel}</span>
                      <ChevronRight size={11} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Flow sub-tab */
          <div style={{ padding: '0 20px calc(160px + env(safe-area-inset-bottom, 24px))', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: W.petrol, borderRadius: '20px', padding: '22px 20px', boxShadow: '0 4px 16px rgba(23,74,85,0.2)' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: W.softTeal, letterSpacing: '0.04em' }}>NET CASH FLOW (THIS MONTH)</div>
              <div style={{ fontSize: '34px', fontWeight: 800, color: netFlow >= 0 ? '#6FDDBA' : '#FF8080', letterSpacing: '-0.02em', margin: '8px 0 4px' }}>
                {netFlow >= 0 ? '+' : ''}{fmtFull(netFlow)}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(221,233,235,0.75)' }}>
                {netFlow >= 0 ? 'Cash positive this month' : 'Net cash outflow this month'}
              </div>
            </div>

            <div style={{ background: W.surface, border: `1.5px solid ${W.border}`, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: W.text }}>Flow Breakdown</div>
              {[
                { label: 'Income', amount: moneyState.flow?.income || 0, color: W.emerald, prefix: '+' },
                { label: 'Spent (Everyday)', amount: moneyState.flow?.spent || 0, color: W.text, prefix: '-' },
                { label: 'Transfers to Savings', amount: moneyState.flow?.transfers || 0, color: W.petrol, prefix: '' },
                { label: 'Lent to People', amount: moneyState.flow?.lent || 0, color: '#8B5CF6', prefix: '' },
                { label: 'Invested', amount: moneyState.flow?.invested || 0, color: W.amber, prefix: '' },
                { label: 'Borrowed', amount: moneyState.flow?.borrowed || 0, color: W.amber, prefix: '+' },
                { label: 'Refunds Received', amount: moneyState.flow?.refunds || 0, color: W.emerald, prefix: '+' },
              ].map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 6 ? `1px solid ${W.border}` : 'none' }}>
                  <span style={{ fontSize: '13px', color: W.sub }}>{f.label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: f.color }}>{f.prefix}{fmtFull(f.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. PLAN VIEW (Commitments + Promises consolidated)
  const renderPlanView = () => {
    // Commitments list for the plan view
    let filteredList = [];
    if (commitmentsTab === 'upcoming') {
      filteredList = bills.filter(
        (b) => b.status !== 'receivable' && b.status !== 'paid' && b.frequency !== 'monthly' && b.frequency !== 'weekly'
      );
    } else if (commitmentsTab === 'recurring') {
      filteredList = bills.filter(
        (b) => b.status !== 'receivable' && (b.frequency === 'monthly' || b.frequency === 'weekly' || b.frequency === 'yearly')
      );
    } else {
      filteredList = bills.filter((b) => b.status === 'paid');
    }

    const owedToMe = moneyState.moneyPromises || [];
    const iOwe = bills.filter((b) => (b.name || '').toLowerCase().includes('return to') || (b.name || '').toLowerCase().includes('borrow'));
    const activePromises = promisesTab === 'owed_to_me' ? owedToMe : iOwe;

    return (
      <div className="flex flex-col">
        <SubHeader
          title="Plan"
          subtitle="Commitments & promises"
          actionLabel={planTab === 'commitments' ? 'Add Bill' : 'Add Promise'}
          onAction={() => {
            if (planTab === 'commitments') { setEditingBill(null); setIsBillModalOpen(true); }
            else { setEditingPromise(null); setIsPromiseModalOpen(true); }
          }}
        />

        {/* Plan top-level tabs: Commitments / Promises */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '6px' }}>
          {[{ id: 'commitments', label: 'Commitments' }, { id: 'promises', label: 'Promises' }].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPlanTab(tab.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1.5px solid ${planTab === tab.id ? W.petrol : W.border}`,
                background: planTab === tab.id ? W.petrol : W.surface,
                color: planTab === tab.id ? '#FFFFFF' : W.sub,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {planTab === 'commitments' ? (
          <>
            {/* Commitments sub-tabs */}
            <div style={{ padding: '0 20px 14px', display: 'flex', gap: '6px' }}>
              {[{ id: 'upcoming', label: 'Upcoming' }, { id: 'recurring', label: 'Recurring' }, { id: 'past', label: 'Paid' }].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCommitmentsTab(tab.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: `1.5px solid ${commitmentsTab === tab.id ? W.petrol : W.border}`,
                    background: commitmentsTab === tab.id ? W.softTeal : 'transparent',
                    color: commitmentsTab === tab.id ? W.petrol : W.muted,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '0 20px calc(160px + env(safe-area-inset-bottom, 24px))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: W.muted, fontSize: '13px' }}>
                  No commitments in this tab.
                </div>
              ) : (
                filteredList.map((bill) => (
                  <div
                    key={bill.id}
                    onClick={() => { setEditingBill(bill); setIsBillModalOpen(true); }}
                    style={{
                      background: W.surfaceCard,
                      border: `1.5px solid ${W.border}`,
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: W.softTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', color: W.petrol }}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: W.text }}>{bill.name}</div>
                        <div style={{ fontSize: '11px', color: W.sub, marginTop: '1px' }}>
                          {bill.frequency && bill.frequency !== 'one_off' ? `${bill.frequency} · ` : ''}Due {bill.due_date || 'soon'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: W.text }}>{fmtFull(bill.amount)}</div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={(e) => { e.stopPropagation(); handleToggleBill(bill); }}
                        style={{
                          background: bill.status === 'paid' ? 'rgba(31,163,111,0.1)' : W.softTeal,
                          border: `1.5px solid ${bill.status === 'paid' ? W.emerald : W.border}`,
                          color: bill.status === 'paid' ? W.emerald : W.petrol,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1,
                        }}
                      >
                        {bill.status === 'paid' ? '✓ Paid' : 'Mark paid'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          /* Promises sub-tab */
          <>
            <div style={{ padding: '0 20px 14px', display: 'flex', gap: '6px' }}>
              {[{ id: 'owed_to_me', label: 'Owed to me' }, { id: 'i_owe', label: 'I owe' }].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPromisesTab(tab.id)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: `1.5px solid ${promisesTab === tab.id ? W.petrol : W.border}`,
                    background: promisesTab === tab.id ? W.softTeal : 'transparent',
                    color: promisesTab === tab.id ? W.petrol : W.muted,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '0 20px calc(160px + env(safe-area-inset-bottom, 24px))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {activePromises.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: W.muted, fontSize: '13px' }}>
                  {promisesTab === 'owed_to_me' ? 'Nobody owes you money right now.' : 'You have no outstanding loans.'}
                </div>
              ) : (
                activePromises.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => { setEditingPromise(r.raw || r); setIsPromiseModalOpen(true); }}
                    style={{
                      background: W.surfaceCard,
                      border: `1.5px solid ${W.border}`,
                      borderRadius: '14px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = promisesTab === 'owed_to_me' ? W.emerald : W.danger; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: W.softTeal, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: W.petrol, fontSize: '14px' }}>
                        {((r.person || r.name || 'N').charAt(0)).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: W.text }}>{r.person || r.name || 'Contact'}</div>
                        <div style={{ fontSize: '11px', color: W.sub, marginTop: '1px' }}>Due {r.dueDate || r.due_date || 'Soon'}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: promisesTab === 'owed_to_me' ? W.emerald : W.danger }}>
                        {fmtFull(r.amount)}
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolvePromise({ id: r.id, amount: r.amount, person: r.person || r.name });
                        }}
                        style={{
                          background: promisesTab === 'owed_to_me' ? 'rgba(31,163,111,0.1)' : 'rgba(239,68,68,0.1)',
                          border: `1.5px solid ${promisesTab === 'owed_to_me' ? W.emerald : W.danger}`,
                          color: promisesTab === 'owed_to_me' ? W.emerald : W.danger,
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '8px',
                          cursor: isSubmitting ? 'not-allowed' : 'pointer',
                          opacity: isSubmitting ? 0.6 : 1,
                        }}
                      >
                        {promisesTab === 'owed_to_me' ? 'Received' : 'Mark paid'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  // 3. ACTIVITY VIEW (was: Recent + old promises view — now unified)
  const renderActivityView = () => {
    let allTx = [
      ...expenses.map((e) => ({ ...e, txType: 'expense', date: e.expense_date, title: e.note || e.category || 'Expense' })),
      ...incomes.map((i) => ({ ...i, txType: 'income', date: i.income_date, title: i.note || i.source || 'Income' })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    if (recentFilter === 'expense') {
      allTx = allTx.filter((t) => t.txType === 'expense');
    } else if (recentFilter === 'income') {
      allTx = allTx.filter((t) => t.txType === 'income');
    }

    return (
      <div className="flex flex-col">
        <SubHeader
          title="Activity"
          subtitle="All money movements"
          actionLabel="Log"
          onAction={() => { setEditingTransaction(null); setTransactionModalType('expense'); setIsTransactionModalOpen(true); }}
        />

        {/* Filter tabs */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '6px' }}>
          {[{ id: 'all', label: 'All' }, { id: 'expense', label: 'Expenses' }, { id: 'income', label: 'Income' }].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRecentFilter(tab.id)}
              style={{
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
                border: `1.5px solid ${recentFilter === tab.id ? W.petrol : W.border}`,
                background: recentFilter === tab.id ? W.petrol : W.surface,
                color: recentFilter === tab.id ? '#FFFFFF' : W.sub,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px calc(160px + env(safe-area-inset-bottom, 24px))', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {allTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: W.muted, fontSize: '13px' }}>
              No transactions recorded yet.
            </div>
          ) : (
            allTx.map((tx) => {
              const isCredit = tx.txType === 'income';
              return (
                <div
                  key={tx.id}
                  onClick={() => { setEditingTransaction(tx); setTransactionModalType(tx.txType); setIsTransactionModalOpen(true); }}
                  style={{
                    background: W.surfaceCard,
                    border: `1.5px solid ${W.border}`,
                    borderRadius: '14px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: isCredit ? 'rgba(31,163,111,0.12)' : W.softTeal, color: isCredit ? W.emerald : W.petrol, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
                      {isCredit ? '↓' : '↑'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: W.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tx.title}
                      </div>
                      <div style={{ fontSize: '11px', color: W.sub, marginTop: '2px' }}>
                        {tx.category || tx.source || 'General'} · {tx.date || 'Today'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: isCredit ? W.emerald : W.text }}>
                      {isCredit ? '+' : '-'}{fmtFull(tx.amount)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
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

  // HOME VIEW
  const renderHomeView = () => {
    const activeCommitments = bills.filter((b) => b.status !== 'paid');
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
      <div className="flex flex-col">
        {/* ── Top Header Row (Matching Screen 10 Reference) ── */}
        <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              Wealth
            </h1>
            <p style={{
              margin: '3px 0 0',
              fontSize: '13px',
              color: '#8A9CA3',
            }}>
              Spend with intention.
            </p>
          </div>

          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--brand-petrol, #174A55)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '13px',
          }}>
            Z
          </div>
        </div>

        {/* ── PILL FILTER BAR (Screen 10 Reference: Overview, Expenses, Income) ── */}
        <div style={{
          padding: '0 20px',
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'expense',  label: 'Expenses' },
            { id: 'income',   label: 'Income' },
          ].map(p => {
            const isActive = (recentFilter === p.id) || (p.id === 'overview' && (!recentFilter || recentFilter === 'all'));
            return (
              <button
                key={p.id}
                onClick={() => setRecentFilter(p.id === 'overview' ? 'all' : p.id)}
                style={{
                  background: isActive ? '#FFFFFF' : '#1A262B',
                  border: `1px solid ${isActive ? '#FFFFFF' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '9999px',
                  padding: '6px 18px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: isActive ? '#111A20' : 'rgba(255,255,255,0.7)',
                  transition: 'all 0.15s ease',
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="wealth-content-grid" style={{ padding: '0 20px calc(130px + env(safe-area-inset-bottom, 24px))' }}>
          {/* ── CARD 1: AVAILABLE TO SPEND HERO CARD (Screen 10 Reference) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #174A55 0%, #112F37 100%)',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: '0 4px 20px rgba(23, 74, 85, 0.25)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--brand-soft-teal, #DDE9EB)',
                letterSpacing: '0.04em',
              }}>
                Available to Spend
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                margin: '8px 0 4px',
              }}>
                {currencySymbol} {Number(moneyState?.unencumberedCash ?? moneyState?.liquidCash ?? 0).toLocaleString()}
              </div>
              <div
                onClick={() => setActiveView('flow')}
                style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>
                  {(moneyState?.monthlyBudget !== null && moneyState?.monthlyBudget !== undefined) 
                    ? `of ${currencySymbol} ${Number(moneyState.monthlyBudget).toLocaleString()} monthly budget` 
                    : (settings?.monthly_budget !== null && settings?.monthly_budget !== undefined && isFinite(Number(settings.monthly_budget)) && Number(settings.monthly_budget) >= 0)
                      ? `of ${currencySymbol} ${Number(settings.monthly_budget).toLocaleString()} monthly budget`
                      : 'Set monthly budget'}
                </span>
                <ChevronRight size={12} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTransaction(null);
                    setTransactionModalType('expense');
                    setIsTransactionModalOpen(true);
                  }}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: 'none',
                    color: 'var(--brand-petrol, #174A55)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <Plus size={15} />
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
                    padding: '10px 16px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.12)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  + Income
                </button>
              </div>
            </div>
          </div>

          {/* ── CARD 2: RECENT TRANSACTIONS (Screen 10 Reference) ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 800,
                color: '#FFFFFF',
              }}>
                Recent Transactions
              </h2>
              <span
                onClick={() => setActiveView('activity')}
                style={{ fontSize: '12px', fontWeight: 600, color: W.petrol, cursor: 'pointer' }}
              >
                View all ›
              </span>
            </div>

            <div style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '16px',
              border: '1.5px solid var(--brand-border, #E5E0D8)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}>
              {homeTx.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  color: 'var(--brand-muted, #5A6D75)',
                  fontSize: '13px',
                }}>
                  No financial events recorded yet.
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
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '12px',
                        background: '#F9F8F5',
                        border: '1px solid #ECE8DF',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '50%',
                          background: isCredit ? 'rgba(31, 163, 111, 0.15)' : 'var(--brand-soft-teal, #DDE9EB)',
                          color: isCredit ? '#1FA36F' : 'var(--brand-petrol, #174A55)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '12px',
                          flexShrink: 0,
                        }}>
                          {isCredit ? '↓' : '↑'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#111A20',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {tx.merchant || tx.title || tx.name || (isCredit ? 'Income' : 'Expense')}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8A9CA3', marginTop: '2px' }}>
                            {tx.category || (isCredit ? 'Income' : 'General')}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: 700,
                          color: isCredit ? '#1FA36F' : '#111A20',
                        }}>
                          {isCredit ? '+' : '-'} ₹{Number(tx.amount || 0).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8A9CA3', marginTop: '2px' }}>
                          {tx.date ? tx.date.split('T')[0] : 'Today'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── SECONDARY DOMAIN DRILL-DOWN & CONNECT MONEY ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <button
                type="button"
                onClick={() => { setAssetsTab('flow'); setActiveView('assets'); }}
                style={{
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: W.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📊</span> Flow & Assets
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '3px' }}>
                    {fmtShort(moneyState.monthSpend || 0)} spent · {fmtShort(liquidCash)} balance
                  </div>
                </div>
                <ChevronRight size={14} color="#7E948A" />
              </button>

              <button
                type="button"
                onClick={() => { setPlanTab('commitments'); setActiveView('plan'); }}
                style={{
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📅</span> Commitments
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '3px' }}>
                    {activeCommitments.length} upcoming ({fmtShort(committedTotal)})
                  </div>
                </div>
                <ChevronRight size={14} color="#7E948A" />
              </button>

              <button
                type="button"
                onClick={() => { setPlanTab('promises'); setPromisesTab('owed_to_me'); setActiveView('plan'); }}
                style={{
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>👥</span> Promises
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '3px' }}>
                    {fmtShort(moneyState.assets?.owedToYou || 0)} owed to you
                  </div>
                </div>
                <ChevronRight size={14} color="#7E948A" />
              </button>

              <button
                type="button"
                onClick={() => setIsConnectMoneyOpen(true)}
                style={{
                  background: W.surface,
                  border: `1.5px solid ${W.border}`,
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = W.petrol; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = W.border; }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#F1F5F3', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🔗</span> Connect Money
                  </div>
                  <div style={{ fontSize: '11px', color: '#7E948A', marginTop: '3px' }}>
                    Import statement & reconciliation
                  </div>
                </div>
                <ChevronRight size={14} color="#7E948A" />
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
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col"
            style={{ background: W.surface, border: `1.5px solid ${W.border}` }}
          >
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: `1px solid ${W.border}` }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: W.text }}>Wealth Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: W.softTeal, border: 'none', color: W.petrol, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '12px', fontWeight: 700, color: W.sub }}>Currency</label>
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
                      className="py-2.5 rounded-xl border font-bold text-sm transition"
                      style={{
                        background: budgetForm.currency === c.code ? W.softTeal : W.bg,
                        borderColor: budgetForm.currency === c.code ? W.petrol : W.border,
                        color: budgetForm.currency === c.code ? W.petrol : W.sub,
                      }}
                    >
                      {c.sym} ({c.code})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '12px', fontWeight: 700, color: W.sub }}>
                  Monthly Spending Budget Cap
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={budgetForm.budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })}
                  style={{ padding: '10px 14px', borderRadius: '12px', background: W.bg, border: `1.5px solid ${W.border}`, fontSize: '14px', fontWeight: 700, color: W.text, outline: 'none' }}
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: W.petrol, border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); setIsCalibrateModalOpen(true); }}
                  style={{ width: '100%', padding: '10px', borderRadius: '12px', background: W.softTeal, border: `1.5px solid ${W.border}`, color: W.petrol, fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}
                >
                  Set / Calibrate Cash Balance
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
