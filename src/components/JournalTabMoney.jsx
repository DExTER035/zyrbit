import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'
// Dynamically import recharts to avoid breaking if not installed, though prompt requested it
let Recharts = null
import('recharts').then(r => Recharts = r).catch(e => console.warn('recharts not found'))

const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

export default function JournalTabMoney({ user }) {
  const todayDate = getLocalYMD()
  const curMonth = todayDate.slice(0, 7)

  const [activeTab, setActiveTab] = useState('Overview') // Overview, Expenses, Budget, Savings
  const [settings, setSettings] = useState(null)
  const [expenses, setExpenses] = useState([])
  const [budgets, setBudgets] = useState([])
  const [savings, setSavings] = useState([])

  const [setupForm, setSetupForm] = useState({ currency: '₹', budget: 10000 })
  const [showAddExp, setShowAddExp] = useState(false)
  const [expForm, setExpForm] = useState({ amount: '', category: 'Food', note: '', date: todayDate })

  // Filters
  const [expFilter, setExpFilter] = useState('All') // Category filter
  const [timeFilter, setTimeFilter] = useState('This Month') // Today, Week, Month, All
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: sDocs }, { data: eDocs }, { data: bDocs }, { data: savDocs }] = await Promise.all([
      supabase.from('money_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('money_expenses').select('*').eq('user_id', user.id).order('expense_date', { ascending: false }),
      supabase.from('money_budgets').select('*').eq('user_id', user.id),
      supabase.from('money_savings_goals').select('*').eq('user_id', user.id)
    ])
    if (sDocs) setSettings(sDocs)
    if (eDocs) setExpenses(eDocs)
    if (bDocs) setBudgets(bDocs)
    if (savDocs) setSavings(savDocs)
  }

  const saveSetup = async (e) => {
    e.preventDefault()
    const { data } = await supabase.from('money_settings').upsert({
      user_id: user.id,
      currency: setupForm.currency === '₹' ? 'INR' : setupForm.currency === '$' ? 'USD' : 'EUR',
      currency_symbol: setupForm.currency,
      monthly_budget: setupForm.budget
    }).select().single()
    setSettings(data)
  }

  const saveExpense = async () => {
    const amt = parseFloat(expForm.amount)
    if (!amt || !expForm.note) return
    await supabase.from('money_expenses').insert({
      user_id: user.id,
      amount: amt,
      category: expForm.category,
      note: expForm.note,
      expense_date: expForm.date
    })
    
    // Earn Zyrons for financial tracking logic? Just standard toast
    showToast(`💸 Expense logged!`, 'success')
    setExpForm({ amount: '', category: 'Food', note: '', date: todayDate })
    setShowAddExp(false)
    loadData()
  }

  const deleteExpense = async (id) => {
    if (!window.confirm("Delete transaction?")) return
    await supabase.from('money_expenses').delete().eq('id', id)
    loadData()
  }

  // --- Constants & Calculations ---
  const cats = {
    'Food': { col: '#FF5252', ico: '🍔' }, 'Transport': { col: '#FF9800', ico: '🚗' },
    'Shopping': { col: '#9C27B0', ico: '🛍️' }, 'Bills': { col: '#00BCD4', ico: '📱' },
    'Entertain': { col: '#E91E63', ico: '🎬' }, 'Health': { col: '#4CAF50', ico: '🏥' },
    'Education': { col: '#FDE047', ico: '📚' }, 'Other': { col: '#888888', ico: '📦' },
    'Income': { col: '#4CAF50', ico: '💰' } // Positive amounts
  }

  const monthExps = expenses.filter(e => e.expense_date.startsWith(curMonth) && e.amount > 0)
  const monthTotal = monthExps.reduce((a, b) => a + Number(b.amount), 0)
  const monthBudget = settings?.monthly_budget || Number.MAX_SAFE_INTEGER
  const budgetPct = Math.min(100, Math.round((monthTotal / monthBudget) * 100))
  const budgetColor = budgetPct > 99 ? '#EF4444' : budgetPct > 85 ? '#FF9800' : '#4CAF50'

  const sym = settings?.currency_symbol || '₹'

  // Chart Data Preparation
  const catSums = monthExps.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount)
    return acc
  }, {})
  const pieData = Object.entries(catSums).map(([k, v]) => ({ name: k, value: v, fill: cats[k]?.col || '#888' }))
  
  // Bar Chart Data (Last 7 days)
  const barData = Array.from({length: 7}).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dt = getLocalYMD(d)
    const lbl = d.toLocaleDateString(undefined, {weekday: 'short'})
    const total = expenses.filter(e => e.expense_date === dt && e.amount > 0).reduce((a,b)=>a+Number(b.amount), 0)
    return { name: lbl, amount: total, isOver: total > (monthBudget/30) }
  })

  // --- RENDERING ---

  if (!settings) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
        <h3 style={{ color: '#E8E8F0', fontSize: 20, fontWeight: 900, marginBottom: 8 }}>Set Your Currency</h3>
        <p style={{ color: '#555566', fontSize: 13, marginBottom: 24 }}>Set up your local currency and monthly budget to start tracking.</p>
        
        <form onSubmit={saveSetup} style={{ maxWidth: 300, margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['₹', '$', '€', '£', '¥'].map(c => (
              <button key={c} type="button" onClick={() => setSetupForm({...setupForm, currency: c})} style={{ flex: 1, padding: '12px', borderRadius: 12, border: setupForm.currency === c ? '2px solid #00FFFF' : '2px solid #1A1A24', background: setupForm.currency === c ? '#00FFFF15' : '#1A1A24', color: setupForm.currency === c ? '#00FFFF' : '#888', fontSize: 20, fontWeight: 800, cursor: 'pointer' }}>{c}</button>
            ))}
          </div>
          
          <div style={{ position: 'relative', marginBottom: 24 }}>
            <span style={{ position: 'absolute', left: 16, top: 16, fontSize: 24, fontWeight: 900, color: '#00FFFF' }}>{setupForm.currency}</span>
            <input type="number" step="10" required value={setupForm.budget} onChange={e => setSetupForm({...setupForm, budget: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: 'none', color: '#00FFFF', padding: '16px 16px 16px 48px', borderRadius: 16, fontSize: 24, fontWeight: 900, outline: 'none' }} />
            <div style={{ fontSize: 10, color: '#555566', textTransform: 'uppercase', fontWeight: 800, marginTop: 8 }}>Monthly Budget</div>
          </div>
          
          <button type="submit" style={{ width: '100%', padding: '16px', borderRadius: 16, background: '#00FFFF', color: '#000', fontWeight: 900, fontSize: 16, border: 'none', cursor: 'pointer' }}>
            Save & Start Tracking
          </button>
        </form>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 16px', paddingBottom: 80, marginTop: 16 }}>
      
      {/* INNER TAB NAV */}
      <div style={{ overflowX: 'auto', display: 'flex', gap: 10, paddingBottom: 20, scrollbarWidth: 'none' }}>
        {['Overview', 'Expenses', 'Budget', 'Savings'].map(t => {
          const isActive = activeTab === t
          return (
            <button key={t} onClick={() => setActiveTab(t)}
              style={{
                flexShrink: 0, padding: '8px 18px', borderRadius: 100, cursor: 'pointer',
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                background: isActive ? '#FFF' : '#0A0A12',
                color: isActive ? '#000' : '#444',
                fontWeight: 900, fontSize: 11, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}>
              {t}
            </button>
          )
        })}
      </div>

      {activeTab === 'Overview' && (
         <div>
            <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 20, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div>
                 <div style={{ fontSize: 11, color: '#444', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1.5, marginBottom: 4 }}>MONTHLY SPENT</div>
                 <div style={{ fontSize: 36, fontWeight: 900, color: budgetColor, letterSpacing: -1, marginBottom: 8 }}>{sym}{monthTotal.toFixed(0)}</div>
                 <div style={{ fontSize: 12, color: '#444', fontWeight: 700 }}>of {sym}{monthBudget} budget · {monthBudget - monthTotal > 0 ? (monthBudget-monthTotal).toFixed(0) : 'Over'} left</div>
               </div>
               <div style={{ width: 76, height: 76, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <svg width="76" height="76" viewBox="0 0 76 76" style={{ position: 'absolute' }}>
                   <circle cx="38" cy="38" r="34" fill="none" stroke="#1A1A24" strokeWidth="8" />
                   <circle cx="38" cy="38" r="34" fill="none" stroke={budgetColor} strokeWidth="8" strokeDasharray={2*Math.PI*34} strokeDashoffset={(2*Math.PI*34) * (1 - budgetPct/100)} strokeLinecap="round" transform="rotate(-90 38 38)" />
                 </svg>
                 <div style={{ fontSize: 14, fontWeight: 900, color: budgetColor }}>{budgetPct}%</div>
               </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
               <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, padding: 12 }}>
                 <div style={{ fontSize: 9, color: '#555566', textTransform: 'uppercase', fontWeight: 800 }}>Biggest Exp</div>
                 <div style={{ fontSize: 16, fontWeight: 900, color: '#EF4444' }}>{sym}{Math.max(...monthExps.map(e=>e.amount), 0).toFixed(0)}</div>
               </div>
               <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, padding: 12 }}>
                 <div style={{ fontSize: 9, color: '#555566', textTransform: 'uppercase', fontWeight: 800 }}>Daily Avg</div>
                 <div style={{ fontSize: 16, fontWeight: 900, color: '#FF9800' }}>{sym}{(monthTotal / new Date().getDate()).toFixed(0)}</div>
               </div>
            </div>

            {/* Recharts Fallback/Implementation */}
            <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, padding: 16, marginBottom: 16 }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: '#E8E8F0', marginBottom: 16 }}>Category Breakdown</div>
               {pieData.length > 0 ? (
                 Recharts && Recharts.PieChart ? (
                   <div style={{ width: '100%', height: 200 }}>
                     <Recharts.ResponsiveContainer width="100%" height="100%">
                        <Recharts.PieChart>
                           <Recharts.Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} stroke="none">
                             {pieData.map((e,i) => <Recharts.Cell key={'c'+i} fill={e.fill} />)}
                           </Recharts.Pie>
                           <Recharts.Tooltip contentStyle={{background: '#1A1A24', border: 'none', borderRadius: 8, color: '#fff'}} itemStyle={{color: '#fff'}} />
                        </Recharts.PieChart>
                     </Recharts.ResponsiveContainer>
                   </div>
                 ) : (
                   <div style={{ height: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
                     {pieData.map(p => (
                       <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                         <div style={{ width: 12, height: 12, borderRadius: '50%', background: p.fill }} />
                         <div style={{ flex: 1, fontSize: 12, color: '#E8E8F0' }}>{p.name}</div>
                         <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{sym}{p.value}</div>
                       </div>
                     ))}
                   </div>
                 )
               ) : (
                 <div style={{ textAlign: 'center', color: '#555566', fontSize: 12, padding: '20px 0' }}>No expenses recorded this month.</div>
               )}
            </div>

            <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, padding: 16, marginBottom: 16 }}>
               <div style={{ fontSize: 11, fontWeight: 800, color: '#E8E8F0', marginBottom: 16 }}>Last 7 Days</div>
               {Recharts && Recharts.BarChart ? (
                 <div style={{ width: '100%', height: 150 }}>
                   <Recharts.ResponsiveContainer width="100%" height="100%">
                      <Recharts.BarChart data={barData}>
                         <Recharts.XAxis dataKey="name" stroke="#555566" fontSize={10} axisLine={false} tickLine={false} />
                         <Recharts.Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                           {barData.map((e,i) => <Recharts.Cell key={'b'+i} fill={e.isOver ? '#EF4444' : '#4CAF50'} />)}
                         </Recharts.Bar>
                         <Recharts.Tooltip cursor={{fill: '#1A1A24'}} contentStyle={{background: '#1A1A24', border: 'none', borderRadius: 8, color: '#fff'}} />
                      </Recharts.BarChart>
                   </Recharts.ResponsiveContainer>
                 </div>
               ) : (
                 <div style={{ height: 120, display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                   {barData.map(b => <div key={b.name} style={{ flex: 1, background: b.isOver ? '#EF4444' : '#4CAF50', height: `${Math.max(5, (b.amount / (monthBudget/10)) * 100)}%`, borderRadius: '4px 4px 0 0' }} title={`${b.name}: ${sym}${b.amount}`} />)}
                 </div>
               )}
            </div>
         </div>
      )}

      {activeTab === 'Expenses' && (
         <div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 4 }}>
               <button onClick={() => setExpFilter('All')} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 100, border: expFilter === 'All' ? '1px solid #00FFFF' : '1px solid #1A1A24', background: expFilter === 'All' ? '#00FFFF15' : '#1A1A24', color: expFilter === 'All' ? '#00FFFF' : '#888', fontWeight: 800, fontSize: 11 }}>All</button>
               {Object.entries(cats).map(([k,v]) => (
                 <button key={k} onClick={() => setExpFilter(k)} style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 100, border: expFilter === k ? `1px solid ${v.col}` : '1px solid #1A1A24', background: expFilter === k ? `${v.col}15` : '#1A1A24', color: expFilter === k ? v.col : '#888', fontWeight: 800, fontSize: 11, display: 'flex', gap: 6 }}>
                   <span>{v.ico}</span>{k}
                 </button>
               ))}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
               <input type="text" placeholder="Search..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1, background: '#0A0A12', border: '1px solid #1A1A24', padding: '10px 14px', borderRadius: 12, color: '#fff', outline: 'none' }} />
               <select value={timeFilter} onChange={e => setTimeFilter(e.target.value)} style={{ width: 110, background: '#0A0A12', border: '1px solid #1A1A24', color: '#fff', padding: '10px', borderRadius: 12, outline: 'none' }}>
                 <option>Today</option><option>This Week</option><option>This Month</option><option>All Time</option>
               </select>
            </div>

             <div style={{ display: 'grid', gap: 10 }}>
               {expenses.filter(e => {
                  if (expFilter !== 'All' && e.category !== expFilter) return false
                  if (searchQ && !e.note.toLowerCase().includes(searchQ.toLowerCase()) && !e.category.toLowerCase().includes(searchQ.toLowerCase())) return false
                  if (timeFilter === 'Today') return e.expense_date === todayDate
                  if (timeFilter === 'This Month') return e.expense_date.startsWith(curMonth)
                  return true
               }).map(e => {
                 const c = cats[e.category] || cats['Other']
                 return (
                   <div key={e.id} style={{ background: '#0A0A12', borderLeft: `3px solid ${c.col}`, borderRight: '1px solid #1A1A24', borderTop: '1px solid #1A1A24', borderBottom: '1px solid #1A1A24', borderRadius: '0 14px 14px 0', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                         <div style={{ fontSize: 24, width: 40, height: 40, background: '#1A1A24', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.ico}</div>
                         <div>
                           <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0', marginBottom: 2 }}>{e.note}</div>
                           <div style={{ fontSize: 11, color: '#555566', fontWeight: 600 }}>{e.category} · {e.expense_date}</div>
                         </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                         <div style={{ fontSize: 16, fontWeight: 900, color: e.amount > 0 ? '#EF4444' : '#4CAF50' }}>{e.amount > 0 ? '' : '+'}{sym}{Math.abs(e.amount).toFixed(2)}</div>
                         <button onClick={() => deleteExpense(e.id)} style={{ fontSize: 10, color: '#555566', background: 'transparent', border: 'none', cursor: 'pointer', marginTop: 4 }}>✕ Del</button>
                      </div>
                   </div>
                 )
               })}
             </div>
         </div>
      )}

      {activeTab === 'Budget' && (
         <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555566' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0' }}>Category Budgets (Pro)</div>
            <p style={{ fontSize: 12, marginTop: 8 }}>Track limits individually for Food, Transport, etc. Coming in an update soon.</p>
         </div>
      )}

      {activeTab === 'Savings' && (
         <div style={{ textAlign: 'center', padding: '40px 20px', color: '#555566' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🎯</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0' }}>Savings Goals</div>
            <p style={{ fontSize: 12, marginTop: 8 }}>Set targets for cars, gadgets, and trips. Coming soon.</p>
         </div>
      )}

      {/* Floating Add Expense Button */}
      {(activeTab === 'Overview' || activeTab === 'Expenses') && !showAddExp && (
         <button onClick={() => setShowAddExp(true)} style={{ position: 'fixed', bottom: 100, right: 24, width: 56, height: 56, borderRadius: '50%', background: '#00FFFF', color: '#000', fontSize: 28, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,255,255,0.4)', zIndex: 50 }}>
           +
         </button>
      )}

      {/* ADD EXPENSE MODAL */}
      {showAddExp && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000E0', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
           <div style={{ background: '#111118', width: '100%', borderRadius: '24px 24px 0 0', padding: 24, paddingBottom: 40, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                 <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E8F0' }}>Add Expense</div>
                 <button onClick={() => setShowAddExp(false)} style={{ background: 'transparent', border: 'none', color: '#555566', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>✕</button>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', marginBottom: 24 }}>
                 <span style={{ fontSize: 28, fontWeight: 900, color: '#EF4444' }}>{sym}</span>
                 <input type="number" step="0.01" value={expForm.amount} onChange={e => setExpForm({...expForm, amount: e.target.value})} placeholder="0.00" autoFocus style={{ width: 160, background: 'transparent', border: 'none', borderBottom: '2px solid #EF4444', color: '#E8E8F0', fontSize: 48, fontWeight: 900, textAlign: 'center', outline: 'none' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 20 }}>
                 {Object.entries(cats).filter(([k]) => k !== 'Income').map(([k,v]) => (
                    <button key={k} onClick={() => setExpForm({...expForm, category: k})} style={{ padding: '12px 0', borderRadius: 14, background: expForm.category === k ? `${v.col}18` : '#1A1A24', border: expForm.category === k ? `1px solid ${v.col}` : '1px solid transparent', color: expForm.category === k ? v.col : '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                       <span style={{ fontSize: 20 }}>{v.ico}</span>
                       <span style={{ fontSize: 9, fontWeight: 800 }}>{k}</span>
                    </button>
                 ))}
                 <button onClick={() => setExpForm({...expForm, category: 'Income'})} style={{ padding: '12px 0', borderRadius: 14, background: expForm.category === 'Income' ? `#4CAF5018` : '#1A1A24', border: expForm.category === 'Income' ? `1px solid #4CAF50` : '1px solid transparent', color: expForm.category === 'Income' ? '#4CAF50' : '#888', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                   <span style={{ fontSize: 20 }}>💰</span><span style={{ fontSize: 9, fontWeight: 800 }}>Income</span>
                 </button>
              </div>

              <input type="text" placeholder="Note (e.g. Starbucks)" value={expForm.note} onChange={e => setExpForm({...expForm, note: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: 'none', color: '#fff', padding: 16, borderRadius: 14, marginBottom: 12, fontSize: 16, outline: 'none' }} />
              <input type="date" value={expForm.date} onChange={e => setExpForm({...expForm, date: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: 'none', color: '#fff', padding: 16, borderRadius: 14, marginBottom: 24, fontSize: 16, outline: 'none' }} />

              <div style={{ textAlign: 'center', fontSize: 13, color: expForm.category === 'Income' ? '#4CAF50' : '#EF4444', fontWeight: 800, marginBottom: 16 }}>
                 Preview: {expForm.category === 'Income' ? '+' : '-'}{sym}{expForm.amount||'0'} from {expForm.category}
              </div>

              <button onClick={saveExpense} disabled={!expForm.amount || !expForm.note} style={{ width: '100%', padding: 16, background: '#00FFFF', border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, fontSize: 16, cursor: 'pointer', opacity: (!expForm.amount || !expForm.note) ? 0.5 : 1 }}>
                 Save Transaction
              </button>
           </div>
        </div>
      )}
    </div>
  )
}
