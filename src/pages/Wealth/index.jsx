import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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

const W = {
  bg: '#0B0D0F',
  surface: '#15181B',
  surfaceCard: '#121518',
  border: '#1F242C',
  borderMid: '#262C36',
  text: '#F5F5F5',
  sub: '#9CA3AF',
  muted: '#6B7280',
  accent: '#E9B44C',
  emerald: '#1FA36F',
  cyan: '#38BDF8',
  danger: '#EF4444',
};

const getLocalYMD = (d = new Date()) => {
  const o = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return o.toISOString().split('T')[0];
};

export default function Wealth() {
  const navigate = useNavigate();
  const todayDate = getLocalYMD();

  // ── Auth & Domain State ───────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Raw domain collections
  const [settings, setSettings] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [bills, setBills] = useState([]);

  // Active view: 'home' | 'assets' | 'commitments' | 'promises' | 'flow' | 'recent'
  const [activeView, setActiveView] = useState('home');
  const [commitmentsTab, setCommitmentsTab] = useState('upcoming'); // 'upcoming' | 'recurring' | 'past'
  const [promisesTab, setPromisesTab] = useState('owed_to_me'); // 'owed_to_me' | 'i_owe'
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
  const loadData = useCallback(async (uid) => {
    setLoading(true);
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
        setBudgetForm({
          budget: s.monthly_budget || 15000,
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
        loadData(user.id);
      }
    };
    window.addEventListener('dexos:refresh', handler);
    return () => window.removeEventListener('dexos:refresh', handler);
  }, [user, loadData]);

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
    if (!user) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to record event.', 'error');
    }
  };

  // Action: Calibrate Cash
  const handleCalibrateCash = async (targetCash) => {
    if (!user) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Calibration failed.', 'error');
    }
  };

  // Action: Resolve Promise
  const handleResolvePromise = async (promiseItem) => {
    if (!user) return;
    try {
      const res = await resolveMoneyPromise({
        userId: user.id,
        billId: promiseItem.id,
        amount: promiseItem.amount,
        person: promiseItem.person,
      });
      if (!res.success) throw new Error(res.error);
      showToast(`Settled with ${promiseItem.person || 'contact'}`, 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to resolve promise.', 'error');
    }
  };

  // Action: Save Bill (Create / Update)
  const handleSaveBill = async (billData) => {
    if (!user) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to save commitment.', 'error');
    }
  };

  // Action: Delete Bill
  const handleDeleteBill = async (billId) => {
    if (!user) return;
    try {
      const res = await deleteBill({ userId: user.id, id: billId });
      if (!res.success) throw new Error(res.error);
      showToast('Commitment deleted.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete commitment.', 'error');
    }
  };

  // Action: Save Promise (Create / Update)
  const handleSavePromise = async (promiseData) => {
    if (!user) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to save promise.', 'error');
    }
  };

  // Action: Delete Promise
  const handleDeletePromise = async (promiseId) => {
    if (!user) return;
    try {
      const res = await deleteBill({ userId: user.id, id: promiseId });
      if (!res.success) throw new Error(res.error);
      showToast('Promise removed.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete promise.', 'error');
    }
  };

  // Action: Save Asset Allocation / Holding
  const handleSaveAsset = async (assetData) => {
    if (!user) return;
    try {
      const res = await recordMoneyEvent({
        userId: user.id,
        ...assetData,
      });
      if (!res.success) throw new Error(res.error);
      showToast('Asset updated.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to update asset.', 'error');
    }
  };

  // Action: Save Transaction (Create / Update)
  const handleSaveTransaction = async (txData) => {
    if (!user) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to save transaction.', 'error');
    }
  };

  // Action: Delete Transaction
  const handleDeleteTransaction = async (txId) => {
    if (!user) return;
    try {
      let res;
      if (transactionModalType === 'expense') {
        res = await deleteExpense({ userId: user.id, id: txId });
      } else {
        res = await deleteIncome({ userId: user.id, id: txId });
      }
      if (!res.success) throw new Error(res.error);
      showToast('Transaction deleted.', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to delete transaction.', 'error');
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await saveWealthSettings({
        userId: user.id,
        monthlyBudget: parseFloat(budgetForm.budget) || 15000,
        currency: budgetForm.currency,
      });
      if (!res.success) throw new Error(res.error);
      showToast('Wealth settings saved.', 'success');
      setIsSettingsOpen(false);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
      await loadData(user.id);
    } catch (err) {
      showToast(err.message || 'Failed to save settings.', 'error');
    }
  };

  if (loading && !moneyState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: W.bg }}>
        <div className="text-xs font-semibold text-[#9CA3AF] tracking-wide animate-pulse">
          Loading Money State...
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
  const liquidCash = Math.max(0, Number(moneyState.liquidCash || 0));
  const committedTotal = Number(moneyState.upcomingBillTotal || moneyState.committedNext30Total || 0);
  const safeToSpend = Math.max(0, Number(moneyState.safeToSpendDaily || moneyState.unencumberedCash || (liquidCash - committedTotal)));
  const runwayDays = moneyState.runwayDays > 0 ? moneyState.runwayDays : 31;

  // ── Sub-view Renderers ──────────────────────────────────────────────────

  // 1. ASSETS VIEW
  const renderAssetsView = () => {
    const assetItems = [
      { id: 'cash', icon: Wallet, label: 'Cash', desc: 'Your current liquid money', amount: moneyState.assets?.cash || liquidCash, actionLabel: 'Calibrate' },
      { id: 'savings', icon: PiggyBank, label: 'Savings', desc: "Money you've set aside", amount: moneyState.assets?.savings || 0, actionLabel: 'Adjust' },
      { id: 'investments', icon: Landmark, label: 'Investments', desc: 'Current value', amount: moneyState.assets?.invested || 0, actionLabel: 'Adjust' },
      { id: 'gold', icon: Sparkles, label: 'Gold', desc: 'Your gold holdings', amount: moneyState.assets?.gold || 0, actionLabel: 'Adjust' },
      { id: 'owed', icon: Users, label: 'Owed to you', desc: 'Money others owe you', amount: moneyState.assets?.owedToYou || 0, actionLabel: 'View Promises' },
    ];

    return (
      <div className="flex flex-col">
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="font-serif-state" style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5' }}>
                Assets
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Where your money is now</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setActiveAssetKey('savings');
              setIsAssetAdjustOpen(true);
            }}
            style={{
              background: '#1F2922',
              border: '1px solid #1FA36F40',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Allocate</span>
          </button>
        </div>

        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {assetItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.id === 'cash') setIsCalibrateModalOpen(true);
                  else if (item.id === 'owed') setActiveView('promises');
                  else {
                    setActiveAssetKey(item.id);
                    setIsAssetAdjustOpen(true);
                  }
                }}
                style={{
                  background: W.surfaceCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: '12px',
                  padding: '16px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E9B44C40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = W.border;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1A1E24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E9B44C' }}>
                    <Icon size={17} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{item.label}</div>
                    <div style={{ fontSize: '11.5px', color: '#8E929B' }}>{item.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(item.amount)}</div>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#E9B44C',
                      background: 'rgba(233, 180, 76, 0.1)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span>{item.actionLabel}</span>
                    <ChevronRight size={11} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. COMMITMENTS VIEW
  const renderCommitmentsView = () => {
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
      // past
      filteredList = bills.filter((b) => b.status === 'paid');
    }

    return (
      <div className="flex flex-col">
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="font-serif-state" style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5' }}>
                Commitments
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Money already promised</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingBill(null);
              setIsBillModalOpen(true);
            }}
            style={{
              background: '#1F2922',
              border: '1px solid #1FA36F40',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        {/* Tabs: Upcoming / Recurring / Past */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px' }}>
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'recurring', label: 'Recurring' },
            { id: 'past', label: 'Past' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCommitmentsTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                background: commitmentsTab === tab.id ? '#2A2215' : '#15181B',
                color: commitmentsTab === tab.id ? '#E9B44C' : '#9CA3AF',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>
              No commitments found in this tab.
            </div>
          ) : (
            filteredList.map((bill) => (
              <div
                key={bill.id}
                onClick={() => {
                  setEditingBill(bill);
                  setIsBillModalOpen(true);
                }}
                style={{
                  background: W.surfaceCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E9B44C40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = W.border;
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1A1E24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E9B44C' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{bill.name}</div>
                    <div style={{ fontSize: '11px', color: '#8E929B' }}>
                      {bill.frequency && bill.frequency !== 'one_off' ? `${bill.frequency} · ` : ''}Due {bill.due_date || 'soon'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(bill.amount)}</div>
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const nextStatus = bill.status === 'paid' ? 'unpaid' : 'paid';
                      await toggleBillStatus({ userId: user.id, billId: bill.id, status: nextStatus });
                      showToast(nextStatus === 'paid' ? `Marked ${bill.name} as paid` : `Marked ${bill.name} as unpaid`, 'success');
                      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
                      await loadData(user.id);
                    }}
                    style={{
                      background: bill.status === 'paid' ? '#1F2922' : '#2A2215',
                      border: `1px solid ${bill.status === 'paid' ? '#1FA36F40' : '#E9B44C40'}`,
                      color: bill.status === 'paid' ? '#1FA36F' : '#E9B44C',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '4px 8px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    {bill.status === 'paid' ? 'Paid ✓' : 'Mark paid'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 3. PROMISES VIEW
  const renderPromisesView = () => {
    const owedToMe = moneyState.moneyPromises || [];
    const iOwe = bills.filter((b) => (b.name || '').toLowerCase().includes('return to') || (b.name || '').toLowerCase().includes('borrow'));

    return (
      <div className="flex flex-col">
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="font-serif-state" style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5' }}>
                Promises
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>People and money relationships</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingPromise(null);
              setIsPromiseModalOpen(true);
            }}
            style={{
              background: '#1F2922',
              border: '1px solid #1FA36F40',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Add</span>
          </button>
        </div>

        {/* Tabs: Owed to me / I owe */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px' }}>
          {[
            { id: 'owed_to_me', label: 'Owed to me' },
            { id: 'i_owe', label: 'I owe' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPromisesTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                background: promisesTab === tab.id ? '#2A2215' : '#15181B',
                color: promisesTab === tab.id ? '#E9B44C' : '#9CA3AF',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {promisesTab === 'owed_to_me' ? (
            owedToMe.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>
                Nobody owes you money right now.
              </div>
            ) : (
              owedToMe.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setEditingPromise(r.raw || r);
                    setIsPromiseModalOpen(true);
                  }}
                  style={{
                    background: W.surfaceCard,
                    border: `1px solid ${W.border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#1FA36F40';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = W.border;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#242A34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#E9B44C' }}>
                      {(r.person || 'N').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{r.person || 'Contact'}</div>
                      <div style={{ fontSize: '11px', color: '#8E929B' }}>Due {r.dueDate || 'Soon'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(r.amount)}</div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolvePromise(r);
                      }}
                      style={{
                        background: '#1F2922',
                        border: '1px solid #1FA36F40',
                        color: '#1FA36F',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Received
                    </button>
                  </div>
                </div>
              ))
            )
          ) : (
            iOwe.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>
                You have no outstanding loans to others.
              </div>
            ) : (
              iOwe.map((l) => (
                <div
                  key={l.id}
                  onClick={() => {
                    setEditingPromise(l);
                    setIsPromiseModalOpen(true);
                  }}
                  style={{
                    background: W.surfaceCard,
                    border: `1px solid ${W.border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#EF444440';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = W.border;
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{l.name}</div>
                    <div style={{ fontSize: '11px', color: '#8E929B' }}>Due {l.due_date || 'Soon'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#EF4444' }}>{fmtFull(l.amount)}</div>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleBillStatus({ userId: user.id, billId: l.id, status: 'paid' });
                        showToast(`Paid loan ${l.name}`, 'success');
                        window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
                        await loadData(user.id);
                      }}
                      style={{
                        background: '#2A1F22',
                        border: '1px solid #EF444440',
                        color: '#EF4444',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 8px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                      }}
                    >
                      Mark paid
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>
    );
  };

  // 4. RECENT VIEW
  const renderRecentView = () => {
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
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="font-serif-state" style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5' }}>
                Recent Activity
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>All money movements</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingTransaction(null);
              setTransactionModalType('expense');
              setIsTransactionModalOpen(true);
            }}
            style={{
              background: '#1F2922',
              border: '1px solid #1FA36F40',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Log</span>
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: '8px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'expense', label: 'Expenses' },
            { id: 'income', label: 'Income' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRecentFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                background: recentFilter === tab.id ? '#2A2215' : '#15181B',
                color: recentFilter === tab.id ? '#E9B44C' : '#9CA3AF',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {allTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>
              No transactions recorded yet.
            </div>
          ) : (
            allTx.map((tx) => (
              <div
                key={tx.id}
                onClick={() => {
                  setEditingTransaction(tx);
                  setTransactionModalType(tx.txType);
                  setIsTransactionModalOpen(true);
                }}
                style={{
                  background: W.surfaceCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#E9B44C40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = W.border;
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{tx.title}</div>
                  <div style={{ fontSize: '11px', color: '#8E929B', marginTop: '2px' }}>
                    {tx.category || tx.source || 'General'} · {tx.date || 'Today'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      fontSize: '15px',
                      fontWeight: 700,
                      color: tx.txType === 'income' ? '#1FA36F' : '#F5F5F5',
                    }}
                  >
                    {tx.txType === 'income' ? '+' : ''}{fmtFull(tx.amount)}
                  </div>
                  <ChevronRight size={13} color="#6B7280" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // 5. FLOW VIEW
  const renderFlowView = () => {
    const netFlow = (moneyState.flow?.income || 0) - (moneyState.flow?.spent || 0);

    return (
      <div className="flex flex-col">
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              style={{ background: 'transparent', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="font-serif-state" style={{ fontSize: '24px', fontWeight: 400, color: '#F5F5F5' }}>
                Flow
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>What happened to your money this month</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEventModalOpen(true)}
            style={{
              background: '#1F2922',
              border: '1px solid #1FA36F40',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              padding: '6px 12px',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={13} />
            <span>Capture</span>
          </button>
        </div>

        <div style={{ padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Net Flow summary card */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '20px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#8E929B', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              NET CASH FLOW (THIS MONTH)
            </div>
            <div
              className="font-serif-state"
              style={{
                fontSize: '34px',
                fontWeight: 400,
                color: netFlow >= 0 ? '#1FA36F' : '#EF4444',
                marginTop: '6px',
              }}
            >
              {netFlow >= 0 ? '+' : ''}{fmtFull(netFlow)}
            </div>
            <div style={{ fontSize: '12px', color: '#8E929B', marginTop: '4px' }}>
              {netFlow >= 0 ? 'Cash positive this month' : 'Net cash outflow this month'}
            </div>
          </div>

          {/* Breakdown items */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#F5F5F5' }}>Flow Categories</div>

            {[
              { label: 'Income', amount: moneyState.flow?.income || 0, color: '#1FA36F', prefix: '+' },
              { label: 'Spent (Everyday)', amount: moneyState.flow?.spent || 0, color: '#F5F5F5', prefix: '-' },
              { label: 'Transfers to Savings', amount: moneyState.flow?.transfers || 0, color: '#38BDF8', prefix: '' },
              { label: 'Lent to People', amount: moneyState.flow?.lent || 0, color: '#A78BFA', prefix: '' },
              { label: 'Invested', amount: moneyState.flow?.invested || 0, color: '#E9B44C', prefix: '' },
              { label: 'Borrowed', amount: moneyState.flow?.borrowed || 0, color: '#F59E0B', prefix: '+' },
              { label: 'Refunds Received', amount: moneyState.flow?.refunds || 0, color: '#34D399', prefix: '+' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < 6 ? '1px solid #1A1F26' : 'none' }}>
                <span style={{ fontSize: '13px', color: '#8E929B' }}>{f.label}</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: f.color }}>
                  {f.prefix}{fmtFull(f.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 6. HOME VIEW (Matches Left Column of Reference Image!)
  const renderHomeView = () => {
    const activeCommitments = bills.filter((b) => b.status !== 'paid');
    const recentActivity = moneyState.unifiedRecent || [];

    return (
      <div className="flex flex-col">
        {/* Top Header */}
        <div style={{ padding: '28px 20px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div
              className="font-serif-state"
              style={{
                fontSize: '28px',
                fontWeight: 400,
                color: '#F5F5F5',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              Wealth
            </div>
            <div style={{ fontSize: '12.5px', color: '#8E929B', marginTop: '2px' }}>
              Your money, understood.
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Connect Money Statement Import */}
            <button
              type="button"
              onClick={() => setIsConnectMoneyOpen(true)}
              style={{
                background: 'rgba(31, 163, 111, 0.1)',
                border: '1px solid rgba(31, 163, 111, 0.3)',
                borderRadius: '20px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#1FA36F',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <LinkIcon size={12} />
              <span>Connect</span>
            </button>

            {/* Manage Action */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              style={{
                background: '#15181B',
                border: `1px solid ${W.borderMid}`,
                borderRadius: '20px',
                padding: '6px 13px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#9CA3AF',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#F5F5F5';
                e.currentTarget.style.borderColor = '#9CA3AF50';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#9CA3AF';
                e.currentTarget.style.borderColor = W.borderMid;
              }}
            >
              <Settings2 size={13} />
              <span>Manage</span>
            </button>
          </div>
        </div>

        <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* ── 1. PRIMARY HERO: MONEY STATE CARD ──────────────────────────── */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '18px 18px 16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Top meta row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#1FA36F' }} />
                <span
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#1FA36F',
                  }}
                >
                  MONEY STATE
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
                {moneyState.daysLeft || 30} days left
              </span>
            </div>

            {/* Middle: Safe to spend + Circular Runway ring */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div
                  className="font-serif-state"
                  style={{
                    fontSize: '38px',
                    fontWeight: 400,
                    color: '#F5F5F5',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.05,
                  }}
                >
                  {fmtFull(safeToSpend)}
                </div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F5F5F5', marginTop: '4px' }}>
                  Safe to spend
                </div>
                <div style={{ fontSize: '11.5px', color: '#8E929B', marginTop: '1px' }}>
                  Available for everyday spending
                </div>
              </div>

              {/* Circular Runway Ring */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '50%',
                    border: '2.5px solid #0E7490',
                    borderTopColor: '#38BDF8',
                    borderRightColor: '#38BDF8',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '16px', fontWeight: 800, color: '#38BDF8', lineHeight: 1 }}>
                    {runwayDays}
                  </span>
                  <span style={{ fontSize: '9px', color: '#8E929B', lineHeight: 1, marginTop: '1px' }}>
                    days
                  </span>
                </div>
                <span style={{ fontSize: '10px', color: '#6B7280', fontWeight: 500 }}>
                  Runway
                </span>
              </div>
            </div>

            {/* Bottom stats row: Cash | Committed | Runway */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                paddingTop: '12px',
                borderTop: '1px solid #1A1F26',
                gap: '6px',
              }}
            >
              <div
                onClick={() => setIsCalibrateModalOpen(true)}
                style={{ cursor: 'pointer' }}
                title="Tap to calibrate your cash balance"
              >
                <div style={{ fontSize: '11px', color: '#8E929B' }}>Cash</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F5F5F5', marginTop: '2px' }}>
                  {fmtShort(liquidCash)}
                </div>
              </div>

              <div
                onClick={() => setActiveView('commitments')}
                style={{ cursor: 'pointer' }}
                title="Tap to view commitments"
              >
                <div style={{ fontSize: '11px', color: '#8E929B' }}>Committed</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#F5F5F5', marginTop: '2px' }}>
                  {fmtShort(committedTotal)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#8E929B' }}>Runway</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#38BDF8', marginTop: '2px' }}>
                  {runwayDays} days
                </div>
              </div>
            </div>

            {/* Uncalibrated Cash prompt */}
            {!moneyState.isCalibrated && (
              <button
                type="button"
                onClick={() => setIsCalibrateModalOpen(true)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: '#1A1813',
                  border: '1px dashed #E9B44C50',
                  borderRadius: '8px',
                  color: '#E9B44C',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s',
                }}
              >
                <span>Set your current cash balance →</span>
              </button>
            )}
          </div>

          {/* ── 2. SIDE-BY-SIDE CARDS: FLOW & ASSETS ────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {/* FLOW CARD */}
            <div
              style={{
                background: W.surfaceCard,
                border: `1px solid ${W.border}`,
                borderRadius: '14px',
                padding: '14px 14px 12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px' }}>📊</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em' }}>
                    FLOW
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px', marginBottom: '10px' }}>
                  This month
                </div>

                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <TrendingUp size={11} color="#1FA36F" />
                      <span>Income</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.monthEarned || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <TrendingDown size={11} color="#EF4444" />
                      <span>Spent</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.monthSpend || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <Repeat size={11} color="#38BDF8" />
                      <span>Transfers</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.flow?.transfers || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <LinkIcon size={11} color="#A78BFA" />
                      <span>Lent</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.flow?.lent || 0)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('flow')}
                style={{
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid #1A1F26',
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>View all</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* ASSETS CARD */}
            <div
              style={{
                background: W.surfaceCard,
                border: `1px solid ${W.border}`,
                borderRadius: '14px',
                padding: '14px 14px 12px 14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px' }}>🏛</span>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em' }}>
                    ASSETS
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '1px', marginBottom: '10px' }}>
                  Where your money is now
                </div>

                {/* Rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <Wallet size={11} color="#D1D5DB" />
                      <span>Cash</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.assets?.cash || liquidCash)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <PiggyBank size={11} color="#D1D5DB" />
                      <span>Savings</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.assets?.savings || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <Landmark size={11} color="#D1D5DB" />
                      <span>Invested</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.assets?.invested || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <Sparkles size={11} color="#E9B44C" />
                      <span>Gold</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.assets?.gold || 0)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                      <Users size={11} color="#D1D5DB" />
                      <span>Owed to you</span>
                    </div>
                    <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.assets?.owedToYou || 0)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('assets')}
                style={{
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px solid #1A1F26',
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  fontSize: '11px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                }}
              >
                <span>View all</span>
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* ── 3. COMMITMENTS CARD ─────────────────────────────────────────── */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '16px 16px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '12px' }}>📅</span>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em' }}>
                    COMMITMENTS
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8E929B', marginTop: '1px' }}>
                  Money already promised
                </div>
              </div>

              {/* Amber badge */}
              <div
                style={{
                  background: '#2A2215',
                  color: '#E9B44C',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '14px',
                  border: '1px solid #E9B44C30',
                }}
              >
                Next 30 days · {fmtShort(committedTotal)}
              </div>
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {activeCommitments.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#6B7280', fontSize: '12px' }}>
                  No pending commitments this month.
                </div>
              ) : (
                activeCommitments.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setEditingBill(c);
                      setIsBillModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '4px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <span style={{ fontSize: '13px' }}>📅</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{c.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(c.amount)}</span>
                      <span style={{ fontSize: '11px', color: '#8E929B' }}>{c.due_date || 'Soon'}</span>
                      <ChevronRight size={13} color="#6B7280" />
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={() => setActiveView('commitments')}
              style={{
                paddingTop: '8px',
                borderTop: '1px solid #1A1F26',
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>View all</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {/* ── 4. PROMISES CARD ─────────────────────────────────────────────── */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '16px 16px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '12px' }}>👥</span>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em' }}>
                  PROMISES
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#8E929B', marginTop: '1px' }}>
                People and money relationships
              </div>
            </div>

            {/* Rows: Owed to me & I owe */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setPromisesTab('owed_to_me');
                  setActiveView('promises');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={13} color="#1FA36F" />
                  <span style={{ fontSize: '13px', color: '#D1D5DB' }}>Owed to me</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5F5F5' }}>
                    {fmtFull(moneyState.assets?.owedToYou || 0)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8E929B' }}>
                    {moneyState.moneyPromises?.length || 0} {moneyState.moneyPromises?.length === 1 ? 'person' : 'people'}
                  </span>
                  <ChevronRight size={13} color="#6B7280" />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setPromisesTab('i_owe');
                  setActiveView('promises');
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingDown size={13} color="#EF4444" />
                  <span style={{ fontSize: '13px', color: '#D1D5DB' }}>I owe</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5F5F5' }}>
                    {fmtFull(moneyState.liabilities?.iOweTotal || 0)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8E929B' }}>
                    {moneyState.liabilities?.iOwe?.length || 0} {moneyState.liabilities?.iOwe?.length === 1 ? 'person' : 'people'}
                  </span>
                  <ChevronRight size={13} color="#6B7280" />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('promises')}
              style={{
                paddingTop: '8px',
                borderTop: '1px solid #1A1F26',
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                fontSize: '11px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>View all</span>
              <ChevronRight size={12} />
            </button>
          </div>

          {/* ── CONNECT MONEY CARD ────────────────────────────────────────── */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '16px 16px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LinkIcon size={12} color="#1FA36F" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    Connect Money
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8E929B', marginTop: '1px' }}>
                  Keep your financial picture current
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsConnectMoneyOpen(true)}
                style={{
                  background: 'rgba(31, 163, 111, 0.12)',
                  border: '1px solid rgba(31, 163, 111, 0.3)',
                  color: '#1FA36F',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '5px 11px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>Import</span>
                <ChevronRight size={11} />
              </button>
            </div>

            <div
              onClick={() => setIsConnectMoneyOpen(true)}
              style={{
                background: '#0B0D0F',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(31, 163, 111, 0.3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)'; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(31, 163, 111, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1FA36F' }}>
                  <Repeat size={14} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F5F5F5' }}>Paytm Statement</div>
                  <div style={{ fontSize: '11px', color: '#8E929B' }}>Import UPI Excel / CSV passbook</div>
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#1FA36F', fontWeight: 600 }}>Choose file →</span>
            </div>
          </div>

          {/* ── 5. RECENT CARD ───────────────────────────────────────────────── */}
          <div
            style={{
              background: W.surfaceCard,
              border: `1px solid ${W.border}`,
              borderRadius: '16px',
              padding: '16px 16px 14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Clock size={12} color="#D1D5DB" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#F5F5F5', letterSpacing: '0.08em' }}>
                    RECENT
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8E929B', marginTop: '1px' }}>
                  Latest money activity
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveView('recent')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#6B7280',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                View all &gt;
              </button>
            </div>

            {/* Rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {recentActivity.length === 0 ? (
                <div style={{ padding: '8px 0', color: '#6B7280', fontSize: '12px' }}>
                  No recent activity recorded.
                </div>
              ) : (
                recentActivity.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      setEditingTransaction(r);
                      setTransactionModalType(r.isCredit ? 'income' : 'expense');
                      setIsTransactionModalOpen(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 0',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px' }}>{r.icon || (r.isCredit ? '💰' : '💸')}</span>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{r.name || r.title}</span>
                        <span style={{ fontSize: '11px', color: '#8E929B', marginLeft: '6px' }}>{r.cat || r.category || r.source}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: r.isCredit ? '#1FA36F' : '#F5F5F5' }}>
                        {r.isCredit ? '+' : ''}{fmtFull(r.amount)}
                      </span>
                      <span style={{ fontSize: '11px', color: '#8E929B' }}>{r.date || 'Today'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="app-container min-h-screen text-[#F5F5F5] relative flex flex-col pb-28"
      style={{ background: W.bg }}
    >
      {activeView === 'assets' && renderAssetsView()}
      {activeView === 'commitments' && renderCommitmentsView()}
      {activeView === 'promises' && renderPromisesView()}
      {activeView === 'recent' && renderRecentView()}
      {activeView === 'flow' && renderFlowView()}
      {activeView === 'home' && renderHomeView()}

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
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 flex flex-col"
            style={{ background: W.surface, border: `1px solid ${W.border}` }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-[#F5F5F5]">Wealth Settings</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[#9CA3AF]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#9CA3AF]">Currency</label>
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
                        background: budgetForm.currency === c.code ? 'rgba(31, 163, 111, 0.15)' : '#0B0D0F',
                        borderColor: budgetForm.currency === c.code ? '#1FA36F' : 'rgba(255, 255, 255, 0.08)',
                        color: budgetForm.currency === c.code ? '#1FA36F' : '#F5F5F5',
                      }}
                    >
                      {c.sym} ({c.code})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[#9CA3AF]">
                  Monthly Spending Budget Cap
                </label>
                <input
                  type="number"
                  step="100"
                  min="0"
                  value={budgetForm.budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget: e.target.value })}
                  className="px-3.5 py-2.5 rounded-xl bg-[#0B0D0F] border border-white/10 text-sm font-bold font-mono text-[#F5F5F5] outline-none"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-[#1FA36F] text-[#0B0D0F] font-bold text-xs cursor-pointer"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsCalibrateModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#F5F5F5] font-semibold text-xs cursor-pointer hover:bg-white/10 transition"
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

      {/* ── Navigation ───────────────────────────────────────────── */}
      <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
