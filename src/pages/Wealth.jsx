import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { showToast } from '../components/Toast';
import BottomNav from '../components/BottomNav';
import { earnZyrons } from '../lib/zyrons';
import ErrorState from '../components/ErrorState';

const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000);
  return d.toISOString().split('T')[0];
};

export default function Wealth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const todayDate = getLocalYMD();
  const curMonth = todayDate.slice(0, 7);

  const [activeTab, setActiveTab] = useState('Today'); // Today, Income, Expenses, Bills, Vault, Settings
  
  const [settings, setSettings] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [bills, setBills] = useState([]);
  const [vaultItems, setVaultItems] = useState([]);

  // Forms
  const [setupForm, setSetupForm] = useState({ currency: '₹', budget: 15000 });
  const [expForm, setExpForm] = useState({ amount: '', category: 'Food', note: '', date: todayDate });
  const [incForm, setIncForm] = useState({ amount: '', source: 'Side Income', note: '', date: todayDate });
  const [billForm, setBillForm] = useState({ name: '', amount: '', due_date: todayDate, frequency: 'monthly' });
  const [vaultForm, setVaultForm] = useState({ title: '', payload: '' });

  // UI state
  const [expandedVaultId, setExpandedVaultId] = useState(null);
  const [revealVaultIds, setRevealVaultIds] = useState(new Set());
  // Confirm sheet: { message, onConfirm }
  const [confirmSheet, setConfirmSheet] = useState(null);

  const loadData = async (uid) => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: sDocs }, { data: eDocs }, { data: iDocs }, { data: bDocs }, { data: vDocs }] = await Promise.all([
        supabase.from('wealth_settings').select('*').eq('user_id', uid).single(),
        supabase.from('money_expenses').select('*').eq('user_id', uid).order('expense_date', { ascending: false }),
        supabase.from('wealth_income').select('*').eq('user_id', uid).order('income_date', { ascending: false }),
        supabase.from('wealth_bills').select('*').eq('user_id', uid).order('due_date', { ascending: true }),
        supabase.from('wealth_vault').select('*').eq('user_id', uid).order('created_at', { ascending: false })
      ]);
      if (sDocs) {
        setSettings(sDocs);
        setSetupForm({ currency: sDocs.currency === 'INR' ? '₹' : sDocs.currency === 'USD' ? '$' : '€', budget: sDocs.monthly_budget });
      }
      if (eDocs) setExpenses(eDocs);
      if (iDocs) setIncomes(iDocs);
      if (bDocs) setBills(bDocs);
      if (vDocs) setVaultItems(vDocs);
    } catch (e) {
      console.warn('Wealth load error:', e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadData(session.user.id);
      }
    });
  }, [navigate]);

  const saveSetup = async (e) => {
    e.preventDefault();
    if (!user) return;
    const { data } = await supabase.from('wealth_settings').upsert({
      user_id: user.id,
      currency: setupForm.currency === '₹' ? 'INR' : setupForm.currency === '$' ? 'USD' : 'EUR',
      monthly_budget: setupForm.budget
    }, { onConflict: 'user_id' }).select().single();
    
    if (data) {
      setSettings(data);
      showToast('💰 Settings saved!', 'success');
    }
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    const amt = parseFloat(expForm.amount);
    if (!amt || amt <= 0 || !expForm.note || !user) return;
    
    const { error } = await supabase.from('money_expenses').insert({
      user_id: user.id,
      amount: amt,
      category: expForm.category,
      note: expForm.note,
      expense_date: expForm.date
    });
    
    if (!error) {
      showToast('💸 Expense logged!', 'success');
      await earnZyrons(user.id, 5, 'Money logged');
      setExpForm({ amount: '', category: 'Food', note: '', date: todayDate });
      loadData(user.id);
    } else {
      showToast('❌ Save failed', 'error');
    }
  };

  const saveIncome = async (e) => {
    e.preventDefault();
    const amt = parseFloat(incForm.amount);
    if (!amt || amt <= 0 || !user) return;
    
    const { error } = await supabase.from('wealth_income').insert({
      user_id: user.id,
      amount: amt,
      source: incForm.source,
      note: incForm.note,
      income_date: incForm.date
    });
    
    if (!error) {
      showToast('💵 Income logged!', 'success');
      await earnZyrons(user.id, 10, 'Income logged');
      setIncForm({ amount: '', source: 'Side Income', note: '', date: todayDate });
      loadData(user.id);
    } else {
      showToast('❌ Save failed', 'error');
    }
  };

  const saveBill = async (e) => {
    e.preventDefault();
    const amt = parseFloat(billForm.amount);
    if (!amt || amt <= 0 || !billForm.name || !user) return;

    const { error } = await supabase.from('wealth_bills').insert({
      user_id: user.id,
      name: billForm.name,
      amount: amt,
      due_date: billForm.due_date,
      frequency: billForm.frequency,
      status: 'unpaid'
    });

    if (!error) {
      showToast('📅 Bill added!', 'success');
      setBillForm({ name: '', amount: '', due_date: todayDate, frequency: 'monthly' });
      loadData(user.id);
    } else {
      showToast('❌ Save failed', 'error');
    }
  };

  const toggleBillStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    const { error } = await supabase.from('wealth_bills').update({ status: newStatus }).eq('id', id);
    if (!error) {
      showToast(newStatus === 'paid' ? '✅ Bill marked as Paid!' : '⏳ Bill marked as Unpaid', 'success');
      loadData(user.id);
    } else {
      showToast('❌ Update failed', 'error');
    }
  };

  const deleteBill = async (id) => {
    setConfirmSheet({
      message: 'Delete this bill?',
      onConfirm: async () => {
        const { error } = await supabase.from('wealth_bills').delete().eq('id', id);
        if (!error) { showToast('🗑 Bill deleted', 'success'); loadData(user.id); }
        else showToast('❌ Delete failed', 'error');
      }
    });
  };

  const saveVault = async (e) => {
    e.preventDefault();
    if (!vaultForm.title.trim() || !vaultForm.payload.trim() || !user) return;
    const { error } = await supabase.from('wealth_vault').insert({
      user_id: user.id,
      title: vaultForm.title,
      encrypted_payload: vaultForm.payload
    });
    if (!error) {
      showToast('🔒 Credential stored safely!', 'success');
      setVaultForm({ title: '', payload: '' });
      loadData(user.id);
    } else {
      showToast('❌ Save failed', 'error');
    }
  };

  const deleteVault = async (id) => {
    setConfirmSheet({
      message: 'Permanently delete this item from the secure vault?',
      onConfirm: async () => {
        const { error } = await supabase.from('wealth_vault').delete().eq('id', id);
        if (!error) { showToast('🗑 Credential deleted', 'success'); loadData(user.id); }
        else showToast('❌ Delete failed', 'error');
      }
    });
  };

  const toggleRevealVault = (id) => {
    setRevealVaultIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showToast('📋 Copied to clipboard!', 'success');
  };

  const deleteExpense = async (id) => {
    setConfirmSheet({
      message: 'Delete this expense?',
      onConfirm: async () => {
        await supabase.from('money_expenses').delete().eq('id', id);
        loadData(user.id);
      }
    });
  };

  const deleteIncome = async (id) => {
    setConfirmSheet({
      message: 'Delete this income entry?',
      onConfirm: async () => {
        await supabase.from('wealth_income').delete().eq('id', id);
        loadData(user.id);
      }
    });
  };

  // Computations
  const sym = settings?.currency === 'USD' ? '$' : settings?.currency === 'EUR' ? '€' : '₹';
  
  const totalIncome = incomes.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalExpenseAllTime = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const liquidCash = totalIncome - totalExpenseAllTime;

  // 30 day burn
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = getLocalYMD(thirtyDaysAgo);

  const expensesLast30Days = expenses.filter(e => e.expense_date >= thirtyDaysAgoStr);
  const burnLast30 = expensesLast30Days.reduce((sum, e) => sum + Number(e.amount), 0);
  
  const runwayMonths = burnLast30 > 0 ? (liquidCash / burnLast30).toFixed(1) : '∞';

  // Current month spent
  const monthExps = expenses.filter(e => e.expense_date.startsWith(curMonth));
  const monthTotal = monthExps.reduce((a, b) => a + Number(b.amount), 0);
  
  const monthBudget = settings?.monthly_budget || 15000;
  const budgetPct = Math.min(100, Math.round((monthTotal / monthBudget) * 100));
  const budgetColor = budgetPct > 99 ? '#EF4444' : budgetPct > 85 ? '#FF9800' : '#4CAF50';

  // Category Budget Allocations (default percentages)
  const categoryBudgetLimits = {
    'Food': monthBudget * 0.30,
    'Rent & Bills': monthBudget * 0.40,
    'Tools & Subscriptions': monthBudget * 0.15,
    'Leisure': monthBudget * 0.10,
    'Other': monthBudget * 0.05
  };

  const spentByCategory = {
    'Food': 0,
    'Rent & Bills': 0,
    'Tools & Subscriptions': 0,
    'Leisure': 0,
    'Other': 0
  };
  for (const e of monthExps) {
    if (spentByCategory[e.category] !== undefined) {
      spentByCategory[e.category] += Number(e.amount);
    } else {
      spentByCategory['Other'] += Number(e.amount);
    }
  }

  // Next upcoming bill
  const upcomingUnpaidBills = bills.filter(b => b.status === 'unpaid').sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
  const nextBill = upcomingUnpaidBills[0] || null;

  // Emergency Fund Savings calculation (Target = 3x Monthly Budget)
  const emergencyFundTarget = monthBudget * 3;
  const emergencyFundSaved = Math.min(emergencyFundTarget, Math.max(0, liquidCash * 0.5));
  const emergencyPct = Math.round((emergencyFundSaved / emergencyFundTarget) * 100);

  const expCategories = {
    'Food': '🍔',
    'Rent & Bills': '🏠',
    'Tools & Subscriptions': '💻',
    'Leisure': '🎉',
    'Other': '📦'
  };

  const incSources = {
    'Salary': '💼',
    'Freelance': '🛠',
    'Side Income': '🚀',
    'One-time': '🎁'
  };

  if (error) {
    return (
      <div className="app-container" style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container" style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '32px 20px 120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '50%' }}>
          <div className="skeleton-box" style={{ height: '24px', width: '80%' }} />
          <div className="skeleton-box" style={{ height: '12px', width: '60%' }} />
        </div>
        <div className="skeleton-box" style={{ height: '180px', borderRadius: '24px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
          <div className="skeleton-box" style={{ height: '100px', borderRadius: '16px' }} />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="app-container" style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '40px 20px', textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
          <h3 style={{ color: '#E8E8F0', fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Initialize Wealth</h3>
          <p style={{ color: '#555566', fontSize: 13, marginBottom: 24 }}>Set up your local currency and monthly budget cap to track runway.</p>
          
          <form onSubmit={saveSetup} style={{ maxWidth: 300, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['₹', '$', '€'].map(c => (
                <button key={c} type="button" onClick={() => setSetupForm({...setupForm, currency: c})} style={{ flex: 1, padding: '12px', borderRadius: 12, border: setupForm.currency === c ? '2px solid #5EE6F5' : '2px solid #26272C', background: setupForm.currency === c ? 'rgba(94, 230, 245, 0.15)' : '#17181B', color: setupForm.currency === c ? '#5EE6F5' : '#888', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>{c}</button>
              ))}
            </div>
            
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <span style={{ position: 'absolute', left: 16, top: 16, fontSize: 24, fontWeight: 900, color: '#5EE6F5' }}>{setupForm.currency}</span>
              <input type="number" step="10" min="1" required className="input" value={setupForm.budget} onChange={e => setSetupForm({...setupForm, budget: e.target.value})} style={{ width: '100%', background: '#17181B', border: '1px solid #26272C', color: '#5EE6F5', padding: '16px 16px 16px 48px', borderRadius: 16, fontSize: 24, fontWeight: 900, outline: 'none', height: 62 }} />
              <div style={{ fontSize: 10, color: '#555566', textTransform: 'uppercase', fontWeight: 800, marginTop: 8 }}>Monthly Budget</div>
            </div>
            
            <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#5EE6F5', color: '#121214', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer' }}>
              Save & Start Tracking
            </button>
          </form>
        </div>
        <BottomNav activeTab="wealth" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
      </div>
    );
  }

  return (
    <div className="app-container page-enter" style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* HEADER */}
      <div style={{ padding: '32px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5 }}>Wealth OS</h1>
        </div>
        <p style={{ fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 20 }}>Financial Runway Monitor</p>
        
        {/* TABS */}
        <div style={{ display: 'flex', gap: '8px', paddingBottom: 16, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
          {['Today', 'Expenses', 'Income', 'Bills', 'Vault', 'Settings'].map(t => {
            const isActive = activeTab === t;
            return (
              <button key={t} onClick={() => setActiveTab(t)}
                style={{
                  flexShrink: 0, padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
                  border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                  background: isActive ? '#FFF' : '#0A0A12',
                  color: isActive ? '#000' : '#888',
                  fontWeight: 900, fontSize: 11, transition: 'all 0.2s', textAlign: 'center'
                }}>
                {t}
              </button>
            )
          })}
        </div>
      </div>

      <div className="page-content" style={{ padding: '0 20px 100px' }}>
        
        {/* TODAY TAB */}
        {activeTab === 'Today' && (
          <div>
            {/* RUNWAY CARD */}
            <div style={{ background: '#17181B', border: '1px solid #26272C', borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#5EE6F5', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 4 }}>ESTIMATED RUNWAY</div>
              <div style={{ fontSize: 40, fontWeight: 900, color: '#FFF', letterSpacing: -1, marginBottom: 4 }}>
                {runwayMonths} <span style={{ fontSize: 20, color: '#888' }}>Mon</span>
              </div>
              <div style={{ fontSize: 12, color: '#555', fontWeight: 700, marginBottom: 16 }}>
                Avg Burn Rate: {sym}{Math.round(burnLast30).toLocaleString()}/mo
              </div>
              
              <div style={{ height: 6, background: '#121214', borderRadius: 100, overflow: 'hidden' }}>
                 <div style={{ height: '100%', width: runwayMonths !== '∞' ? `${Math.min(100, Number(runwayMonths) * 10)}%` : '100%', background: '#5EE6F5' }} />
              </div>
            </div>

            {/* CASH FLOW GRID (2x2) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#4CAF50', fontWeight: 800 }}>💳 CASH LEFT</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginTop: 4 }}>{sym}{liquidCash.toLocaleString()}</div>
                <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>(Liquid Balance)</div>
              </div>
              <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: 14 }}>
                <div style={{ fontSize: 10, color: budgetColor, fontWeight: 800 }}>📊 MONTH BUDGET</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: budgetColor, marginTop: 4 }}>{budgetPct}% Spent</div>
                <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>{sym}{monthTotal.toLocaleString()} / {sym}{monthBudget.toLocaleString()}</div>
              </div>
              <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#00C8D4', fontWeight: 800 }}>🎯 EMERGENCY FUND</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: '#FFF', marginTop: 4 }}>{emergencyPct}% Saved</div>
                <div style={{ fontSize: 9, color: '#444', marginTop: 4 }}>{sym}{Math.round(emergencyFundSaved).toLocaleString()} / {sym}{emergencyFundTarget.toLocaleString()}</div>
              </div>
              <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: 14 }}>
                <div style={{ fontSize: 10, color: '#FF9800', fontWeight: 800 }}>📅 NEXT BILL</div>
                {nextBill ? (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextBill.name}</div>
                    <div style={{ fontSize: 9, color: '#FF9800', marginTop: 2 }}>{sym}{Number(nextBill.amount).toLocaleString()} due {nextBill.due_date}</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#555', marginTop: 4 }}>None pending</div>
                    <div style={{ fontSize: 9, color: '#444', marginTop: 2 }}>All bills paid!</div>
                  </>
                )}
              </div>
            </div>

            {/* CATEGORY BUDGETS BREAKDOWN */}
            <div style={{ background: '#17181B', border: '1px solid #26272C', borderRadius: 24, padding: 20, marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#FFF', textTransform: 'uppercase', marginBottom: 14, letterSpacing: 1 }}>Category Budget Monitoring</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(categoryBudgetLimits).map(([cat, limit]) => {
                  const spent = spentByCategory[cat] || 0;
                  const pct = Math.min(100, Math.round((spent / limit) * 100));
                  const isOver = spent > limit;
                  const barColor = isOver ? '#EF4444' : pct > 80 ? '#FF9800' : '#5EE6F5';
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4, fontWeight: 800 }}>
                        <span style={{ color: '#E8E8F0' }}>{expCategories[cat] || '📦'} {cat}</span>
                        <span style={{ color: isOver ? '#EF4444' : '#888' }}>
                          {sym}{Math.round(spent).toLocaleString()} / {sym}{Math.round(limit).toLocaleString()} ({pct}%)
                        </span>
                      </div>
                      <div style={{ height: 4, background: '#1A1A24', borderRadius: 100, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DEXOS DIRECTIVE */}
            {budgetPct > 100 ? (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 16, padding: 16, color: '#EF4444' }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>🤖 DEXOS ACTION DIRECTIVE</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>You are {budgetPct - 100}% above your monthly budget limit. Consider pausing non-essential subscriptions to extend your runway.</div>
              </div>
            ) : (
              <div style={{ background: 'rgba(94, 230, 245, 0.05)', border: '1px solid rgba(94, 230, 245, 0.15)', borderRadius: 16, padding: 16, color: '#5EE6F5' }}>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1, marginBottom: 4 }}>🤖 DEXOS ACTION DIRECTIVE</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>Your spending is within limits. Estimated survival runway stands at {runwayMonths} months. Stay focused.</div>
              </div>
            )}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === 'Expenses' && (
          <div>
            <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginBottom: 16 }}>Log Quick Expense</h3>
              <form onSubmit={saveExpense}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 18, fontWeight: 900, color: '#EF4444' }}>{sym}</span>
                    <input type="number" step="0.01" min="0.01" required className="input" placeholder="Amount" style={{ paddingLeft: 40, width: '100%' }} value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} />
                  </div>
                  <input type="date" required className="input" style={{ flex: 1 }} value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} />
                </div>
                
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, scrollbarWidth: 'none' }}>
                  {Object.entries(expCategories).map(([k, v]) => (
                     <button key={k} type="button" onClick={() => setExpForm({...expForm, category: k})} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 8, border: expForm.category === k ? '1px solid #EF4444' : '1px solid #1A1A24', background: expForm.category === k ? '#EF444415' : '#1A1A24', color: expForm.category === k ? '#EF4444' : '#888', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                       <span>{v}</span>{k}
                     </button>
                  ))}
                </div>

                <input type="text" required placeholder="Note (e.g. Starbucks, AWS)" className="input" style={{ width: '100%', marginBottom: 16 }} value={expForm.note} onChange={e => setExpForm({...expForm, note: e.target.value})} />
                
                <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 13, background: '#EF4444', color: '#FFF' }}>
                  Log Expense
                </button>
              </form>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, color: '#555', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Recent Expenses</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expenses.slice(0, 50).map(e => (
                <div key={e.id} style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 20 }}>{expCategories[e.category] || '📦'}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{e.note}</div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{e.category} · {e.expense_date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#EF4444' }}>-{sym}{Math.abs(e.amount).toLocaleString()}</div>
                    <button onClick={() => deleteExpense(e.id)} style={{ fontSize: 9, color: '#444', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}>✕ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* INCOME TAB */}
        {activeTab === 'Income' && (
          <div>
             <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginBottom: 16 }}>Log Income</h3>
              <form onSubmit={saveIncome}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 18, fontWeight: 900, color: '#4CAF50' }}>{sym}</span>
                    <input type="number" step="0.01" min="0.01" required className="input" placeholder="Amount" style={{ paddingLeft: 40, width: '100%' }} value={incForm.amount} onChange={e => setIncForm({...incForm, amount: e.target.value})} />
                  </div>
                  <input type="date" required className="input" style={{ flex: 1 }} value={incForm.date} onChange={e => setIncForm({...incForm, date: e.target.value})} />
                </div>
                
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, scrollbarWidth: 'none' }}>
                  {Object.entries(incSources).map(([k, v]) => (
                     <button key={k} type="button" onClick={() => setIncForm({...incForm, source: k})} style={{ whiteSpace: 'nowrap', padding: '6px 12px', borderRadius: 8, border: incForm.source === k ? '1px solid #4CAF50' : '1px solid #1A1A24', background: incForm.source === k ? '#4CAF5015' : '#1A1A24', color: incForm.source === k ? '#4CAF50' : '#888', fontWeight: 800, fontSize: 11, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                       <span>{v}</span>{k}
                     </button>
                  ))}
                </div>

                <input type="text" placeholder="Note (Optional)" className="input" style={{ width: '100%', marginBottom: 16 }} value={incForm.note} onChange={e => setIncForm({...incForm, note: e.target.value})} />
                
                <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 13, background: '#4CAF50', color: '#FFF' }}>
                  Log Income
                </button>
              </form>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, color: '#555', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Recent Income</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {incomes.slice(0, 50).map(i => (
                <div key={i.id} style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ fontSize: 20 }}>{incSources[i.source] || '💰'}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{i.note || i.source}</div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{i.source} · {i.income_date}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 900, color: '#4CAF50' }}>+{sym}{Math.abs(i.amount).toLocaleString()}</div>
                    <button onClick={() => deleteIncome(i.id)} style={{ fontSize: 9, color: '#444', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}>✕ Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BILLS TAB */}
        {activeTab === 'Bills' && (
          <div>
            <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginBottom: 16 }}>Log Recurring Bill</h3>
              <form onSubmit={saveBill}>
                <input type="text" required placeholder="Bill Name (e.g. AWS, Vercel, Gym)" className="input" style={{ width: '100%', marginBottom: 12 }} value={billForm.name} onChange={e => setBillForm({...billForm, name: e.target.value})} />
                
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 18, fontWeight: 900, color: '#FFF' }}>{sym}</span>
                    <input type="number" step="0.01" min="0.01" required className="input" placeholder="Amount" style={{ paddingLeft: 40, width: '100%' }} value={billForm.amount} onChange={e => setBillForm({...billForm, amount: e.target.value})} />
                  </div>
                  <input type="date" required className="input" style={{ flex: 1 }} value={billForm.due_date} onChange={e => setBillForm({...billForm, due_date: e.target.value})} />
                </div>
                
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Frequency</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['monthly', 'annual'].map(f => (
                      <button key={f} type="button" onClick={() => setBillForm({...billForm, frequency: f})} style={{ flex: 1, padding: '10px', borderRadius: 10, border: billForm.frequency === f ? '2px solid #5EE6F5' : '1px solid #26272C', background: billForm.frequency === f ? 'rgba(94, 230, 245, 0.15)' : '#17181B', color: billForm.frequency === f ? '#5EE6F5' : '#888', fontSize: 12, fontWeight: 800, textTransform: 'capitalize', cursor: 'pointer' }}>{f}</button>
                    ))}
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 13 }}>
                  Save Bill Tracker
                </button>
              </form>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, color: '#555', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Active Bill Trackers</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bills.map(b => {
                const isPaid = b.status === 'paid';
                return (
                  <div key={b.id} style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 16, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: isPaid ? '#555' : '#E8E8F0', textDecoration: isPaid ? 'line-through' : 'none' }}>🏠 {b.name}</div>
                      <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{b.frequency} · Due {b.due_date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 15, fontWeight: 900, color: isPaid ? '#444' : '#FFF' }}>{sym}{Number(b.amount).toLocaleString()}</div>
                        <button onClick={() => deleteBill(b.id)} style={{ fontSize: 9, color: '#444', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}>✕ Delete</button>
                      </div>
                      <button onClick={() => toggleBillStatus(b.id, b.status)}
                        style={{
                          padding: '6px 12px', borderRadius: 8, fontSize: 10, fontWeight: 900, cursor: 'pointer',
                          background: isPaid ? '#4CAF5020' : '#FF980020',
                          border: isPaid ? '1px solid #4CAF50' : '1px solid #FF9800',
                          color: isPaid ? '#4CAF50' : '#FF9800', width: 62, textAlign: 'center'
                        }}>
                        {isPaid ? 'PAID' : 'UNPAID'}
                      </button>
                    </div>
                  </div>
                );
              })}
              {bills.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: '20px 0', fontSize: 12 }}>No bills monitored yet.</div>}
            </div>
          </div>
        )}

        {/* VAULT TAB */}
        {activeTab === 'Vault' && (
          <div>
            <div style={{ background: '#08080E', border: '1px solid #1E1E38', borderRadius: 24, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>🔒</span>
                <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF' }}>Secure Credentials safe</h3>
              </div>
              <p style={{ fontSize: 11, color: '#556', lineHeight: 1.4, marginBottom: 16 }}>Plaintext items stored locally in Supabase, protected by secure User ID Row-Level Security policies.</p>
              
              <form onSubmit={saveVault}>
                <input type="text" required placeholder="Credential Title (e.g. Supabase production key)" className="input" style={{ width: '100%', marginBottom: 12, background: '#0D0D14', border: '1px solid #1E1E28' }} value={vaultForm.title} onChange={e => setVaultForm({...vaultForm, title: e.target.value})} />
                <textarea required placeholder="Payload/Secret data" className="input" style={{ width: '100%', minHeight: 80, marginBottom: 16, background: '#0D0D14', border: '1px solid #1E1E28', resize: 'vertical', fontFamily: 'monospace' }} value={vaultForm.payload} onChange={e => setVaultForm({...vaultForm, payload: e.target.value})} />
                <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 13, background: '#5EE6F5', color: '#121214' }}>
                  Lock Item in Vault
                </button>
              </form>
            </div>

            <div style={{ fontSize: 11, fontWeight: 900, color: '#555', textTransform: 'uppercase', marginBottom: 12, letterSpacing: 1 }}>Vault Indexes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vaultItems.map(v => {
                const isExpanded = expandedVaultId === v.id;
                const isRevealed = revealVaultIds.has(v.id);
                return (
                  <div key={v.id} style={{ background: '#08080F', border: '1px solid #1E1E30', borderRadius: 16, padding: 14, cursor: 'pointer' }} onClick={() => setExpandedVaultId(isExpanded ? null : v.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 16 }}>🔑</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{v.title}</span>
                      </div>
                      <span style={{ fontSize: 10, color: '#444' }}>{isExpanded ? '▲ Close' : '▼ Expand'}</span>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #141424' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8, justifyContent: 'flex-end' }}>
                          <button onClick={() => toggleRevealVault(v.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #222', background: '#111', color: '#888', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            {isRevealed ? 'Mask' : 'Reveal'}
                          </button>
                          <button onClick={() => copyToClipboard(v.encrypted_payload)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #26272C', background: '#17181B', color: '#5EE6F5', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            Copy Secret
                          </button>
                          <button onClick={() => deleteVault(v.id)} style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: '#EF444420', color: '#EF4444', fontSize: 10, fontWeight: 800, cursor: 'pointer' }}>
                            Delete
                          </button>
                        </div>
                        <div style={{ background: '#121214', padding: '12px 14px', borderRadius: 8, border: '1px solid #26272C', fontFamily: 'monospace', fontSize: 12, color: isRevealed ? '#5EE6F5' : '#444', wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>
                          {isRevealed ? v.encrypted_payload : '••••••••••••••••••••••••••••••••'}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {vaultItems.length === 0 && <div style={{ textAlign: 'center', color: '#444', padding: '20px 0', fontSize: 12 }}>Vault is empty.</div>}
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'Settings' && (
          <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginBottom: 16 }}>Wealth Configuration</h3>
            <form onSubmit={saveSetup}>
               <div style={{ marginBottom: 16 }}>
                 <label style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Monthly Budget Limit</label>
                 <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: 12, fontSize: 18, fontWeight: 900, color: '#5EE6F5' }}>{sym}</span>
                  <input type="number" min="1" step="10" required className="input" style={{ paddingLeft: 40, width: '100%' }} value={setupForm.budget} onChange={e => setSetupForm({...setupForm, budget: e.target.value})} />
                 </div>
               </div>
               
               <div style={{ marginBottom: 24 }}>
                 <label style={{ fontSize: 10, color: '#555', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Currency Symbol</label>
                 <div style={{ display: 'flex', gap: 8 }}>
                  {['₹', '$', '€'].map(c => (
                    <button key={c} type="button" onClick={() => setSetupForm({...setupForm, currency: c})} style={{ flex: 1, padding: '12px', borderRadius: 12, border: setupForm.currency === c ? '2px solid #5EE6F5' : '1px solid #26272C', background: setupForm.currency === c ? 'rgba(94, 230, 245, 0.15)' : '#17181B', color: setupForm.currency === c ? '#5EE6F5' : '#888', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>{c}</button>
                  ))}
                 </div>
               </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', fontSize: 13 }}>
                Update Configuration
              </button>
            </form>
          </div>
        )}

      </div>

      {/* CONFIRM SHEET */}
      {confirmSheet && (
        <div
          onClick={() => setConfirmSheet(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--bg-card)', borderTop: '1px solid var(--border-primary)',
              borderRadius: '24px 24px 0 0', padding: 'var(--space-24)',
              width: '100%', maxWidth: '430px',
              animation: 'slideUpModal 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards'
            }}
          >
            <p style={{ fontSize: 'var(--fs-base)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 'var(--space-24)', lineHeight: 1.5 }}>
              {confirmSheet.message}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button
                onClick={() => setConfirmSheet(null)}
                className="btn-ghost"
                style={{ flex: 1 }}
              >Cancel</button>
              <button
                onClick={async () => { await confirmSheet.onConfirm(); setConfirmSheet(null); }}
                className="btn-primary"
                style={{ flex: 1, background: 'var(--color-error)' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="wealth" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  );
}
