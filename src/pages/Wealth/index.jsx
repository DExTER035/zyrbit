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
} from 'lucide-react';

// ─── Money State Domain Modals ────────────────────────────────────────────────
import {
  MoneyEventModal,
  CashCalibrationModal,
} from '../../components/domain/wealth/index.js';

// ─── Service Facade & Pure Engine ─────────────────────────────────────────────
import {
  getWealthSnapshot,
  recordMoneyEvent,
  calibrateCashBalance,
  resolveMoneyPromise,
  toggleBillStatus,
  saveWealthSettings,
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

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isCalibrateModalOpen, setIsCalibrateModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
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

  // ── View: ASSETS DETAIL ─────────────────────────────────────────────────
  if (activeView === 'assets') {
    const assetItems = [
      { id: 'cash', icon: Wallet, label: 'Cash', desc: 'Your current liquid money', amount: moneyState.assets?.cash || liquidCash },
      { id: 'savings', icon: PiggyBank, label: 'Savings', desc: "Money you've set aside", amount: moneyState.assets?.savings || 0 },
      { id: 'investments', icon: Landmark, label: 'Investments', desc: 'Current value', amount: moneyState.assets?.invested || 0 },
      { id: 'gold', icon: Sparkles, label: 'Gold', desc: 'Your gold holdings', amount: moneyState.assets?.gold || 0 },
      { id: 'owed', icon: Users, label: 'Owed to you', desc: 'Money others owe you', amount: moneyState.assets?.owedToYou || 0 },
    ];

    return (
      <div className="app-container min-h-screen text-[#F5F5F5] pb-24" style={{ background: W.bg }}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

        <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {assetItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                style={{
                  background: W.surfaceCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: '12px',
                  padding: '16px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(item.amount)}</div>
                  <ChevronRight size={14} color="#6B7280" />
                </div>
              </div>
            );
          })}
        </div>
        <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
      </div>
    );
  }

  // ── View: COMMITMENTS DETAIL ────────────────────────────────────────────
  if (activeView === 'commitments') {
    const upcomingList = bills.filter((b) => b.status !== 'receivable');

    return (
      <div className="app-container min-h-screen text-[#F5F5F5] pb-24" style={{ background: W.bg }}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          {upcomingList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6B7280', fontSize: '13px' }}>
              No commitments found in this tab.
            </div>
          ) : (
            upcomingList.map((bill) => (
              <div
                key={bill.id}
                style={{
                  background: W.surfaceCard,
                  border: `1px solid ${W.border}`,
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#1A1E24', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E9B44C' }}>
                    <Calendar size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{bill.name}</div>
                    <div style={{ fontSize: '11px', color: '#8E929B' }}>Due {bill.due_date || 'soon'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(bill.amount)}</div>
                  <ChevronRight size={14} color="#6B7280" />
                </div>
              </div>
            ))
          )}
        </div>
        <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
      </div>
    );
  }

  // ── View: PROMISES DETAIL ───────────────────────────────────────────────
  if (activeView === 'promises') {
    const owedToMe = moneyState.moneyPromises || [];
    const iOwe = bills.filter((b) => (b.name || '').toLowerCase().includes('return to') || (b.name || '').toLowerCase().includes('borrow'));

    return (
      <div className="app-container min-h-screen text-[#F5F5F5] pb-24" style={{ background: W.bg }}>
        <div style={{ padding: '24px 20px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                  style={{
                    background: W.surfaceCard,
                    border: `1px solid ${W.border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#242A34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#E9B44C' }}>
                      {(r.person || 'N').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{r.person || 'Contact'}</div>
                      <div style={{ fontSize: '11px', color: '#8E929B' }}>Due {r.dueDate || 'Oct 10'}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(r.amount)}</div>
                    <button
                      type="button"
                      onClick={() => handleResolvePromise(r)}
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
                  style={{
                    background: W.surfaceCard,
                    border: `1px solid ${W.border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#F5F5F5' }}>{l.name}</div>
                    <div style={{ fontSize: '11px', color: '#8E929B' }}>Due {l.due_date || 'Oct 10'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#EF4444' }}>{fmtFull(l.amount)}</div>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleBillStatus({ userId: user.id, billId: l.id, status: 'paid' });
                        showToast(`Paid ${l.name}`, 'success');
                        window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'wealth' } }));
                        await loadData(user.id);
                      }}
                      style={{
                        background: '#2A1C1C',
                        border: '1px solid #EF444440',
                        color: '#EF4444',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '4px 10px',
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
        <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
      </div>
    );
  }

  // ── View: WEALTH HOME (Matches Left Column of Reference Image!) ───────────
  return (
    <div
      className="app-container min-h-screen text-[#F5F5F5] relative flex flex-col pb-28"
      style={{ background: W.bg }}
    >
      {/* ── Top Header ───────────────────────────────────────── */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Ask Dex Pill Button */}
          <button
            type="button"
            onClick={() => setIsEventModalOpen(true)}
            style={{
              background: '#15181B',
              border: `1px solid ${W.borderMid}`,
              borderRadius: '20px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#D1D5DB',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#E9B44C50';
              e.currentTarget.style.color = '#F5F5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = W.borderMid;
              e.currentTarget.style.color = '#D1D5DB';
            }}
          >
            <span style={{ fontSize: '13px' }}>💬</span>
            <span>Ask Dex</span>
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
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8E929B' }}>
                <Wallet size={12} color="#1FA36F" />
                <span>Cash</span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F5F5F5', marginTop: '2px' }}>
                {fmtShort(liquidCash)}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8E929B' }}>
                <Lock size={12} color="#F59E0B" />
                <span>Committed</span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F5F5F5', marginTop: '2px' }}>
                {fmtShort(committedTotal)}
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#8E929B' }}>
                <Calendar size={12} color="#38BDF8" />
                <span>Runway</span>
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#F5F5F5', marginTop: '2px' }}>
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
                  <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.monthEarned || 8000)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                    <TrendingDown size={11} color="#EF4444" />
                    <span>Spent</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.monthSpend || 3420)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                    <Repeat size={11} color="#38BDF8" />
                    <span>Transfers</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.flow?.transfers || 1000)}</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8E929B' }}>
                    <LinkIcon size={11} color="#A78BFA" />
                    <span>Lent</span>
                  </div>
                  <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{fmtShort(moneyState.flow?.lent || 300)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveView('commitments')}
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
              Next 30 days · {fmtShort(committedTotal || 4200)}
            </div>
          </div>

          {/* Rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {[
              { id: 'c1', name: 'Rent', amount: 2500, date: 'Oct 5', icon: '🏠' },
              { id: 'c2', name: 'Spotify', amount: 119, date: 'Oct 8', icon: '🎵' },
              { id: 'c3', name: 'SIP', amount: 1000, date: 'Oct 12', icon: '📈' },
              { id: 'c4', name: 'WiFi', amount: 500, date: 'Oct 15', icon: '📶' },
            ].map((c) => (
              <div
                key={c.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ fontSize: '13px' }}>{c.icon}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{c.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#F5F5F5' }}>{fmtFull(c.amount)}</span>
                  <span style={{ fontSize: '11px', color: '#8E929B' }}>{c.date}</span>
                  <ChevronRight size={13} color="#6B7280" />
                </div>
              </div>
            ))}
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
                  {fmtFull(moneyState.assets?.owedToYou || 300)}
                </span>
                <span style={{ fontSize: '11px', color: '#8E929B' }}>
                  {moneyState.moneyPromises?.length || 1} person
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
                  {currencySymbol}500
                </span>
                <span style={{ fontSize: '11px', color: '#8E929B' }}>1 person</span>
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
              onClick={() => setIsEventModalOpen(true)}
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
            {[
              { id: 'r1', name: 'Poha', cat: 'Food', amount: 30, isCredit: false, date: 'Today', icon: '🍲' },
              { id: 'r2', name: 'Metro', cat: 'Transport', amount: 30, isCredit: false, date: 'Today', icon: '🚇' },
              { id: 'r3', name: 'Editing', cat: 'Freelance', amount: 3000, isCredit: true, date: 'Yesterday', icon: '💻' },
            ].map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '3px 0',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px' }}>{r.icon}</span>
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#F5F5F5' }}>{r.name}</span>
                    <span style={{ fontSize: '11px', color: '#8E929B', marginLeft: '6px' }}>{r.cat}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: r.isCredit ? '#1FA36F' : '#F5F5F5' }}>
                    {r.isCredit ? '+' : ''}{fmtFull(r.amount)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#8E929B' }}>{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

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

      {/* ── Navigation ───────────────────────────────────────────── */}
      <BottomNav activeTab="wealth" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
