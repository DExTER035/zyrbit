import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer
} from 'recharts'
import BottomNav from '../components/BottomNav.jsx'
import { showToast } from '../components/Toast.jsx'
import { supabase } from '../lib/supabase.js'
import { askZyra } from '../lib/gemini.js'
import PhantomSelfExpansion from '../components/PhantomSelfExpansion.jsx'
import { earnZyrons } from '../lib/zyrons.js'
import HeatmapGrid from '../components/HeatmapGrid.jsx'
import ErrorState from '../components/ErrorState.jsx'

// ─── Helpers ───────────────────────────────────────
const thirtyDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 30)
  return d.toISOString().split('T')[0]
}
const sevenDaysAgo = () => {
  const d = new Date(); d.setDate(d.getDate() - 7)
  return d.toISOString().split('T')[0]
}
const firstOfMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`
}
const today = () => new Date().toISOString().split('T')[0]

const buildDailyMap = (items, dateKey, valueKey = null, since = 30) => {
  const map = {}
  for (let i = since - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const key = d.toISOString().split('T')[0]
    map[key] = 0
  }
  ;(items || []).forEach(item => {
    const k = item[dateKey]?.split('T')[0]
    if (k && map[k] !== undefined) {
      map[k] += valueKey ? (item[valueKey] || 0) : 1
    }
  })
  return Object.entries(map).map(([date, value]) => ({
    date, value,
    label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0,1)
  }))
}

// ─── Shared UI Components ──────────────────────────
const ChartBadge = ({ type }) => {
  const cfg = {
    LINE: { className: 'badge badge-cyan', label: 'LINE' },
    BAR:  { className: 'badge badge-warning', label: 'BAR' },
    PIE:  { className: 'badge badge-error', label: 'PIE' },
  }[type]
  return (
    <span className={cfg.className} style={{ textTransform: 'uppercase' }}>
      {cfg.label}
    </span>
  )
}

const SectionHeader = ({ id, emoji, title }) => (
  <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-16)', paddingTop: 'var(--space-8)' }}>
    <span style={{ fontSize: 'var(--fs-lg)' }}>{emoji}</span>
    <span style={{ fontSize: 'var(--fs-md)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.5, textTransform: 'uppercase' }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'var(--border-primary)', marginLeft: 'var(--space-8)' }} />
  </div>
)

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-inner)', padding: 'var(--space-16) var(--space-8)', textAlign: 'center' }}>
    <div style={{ fontSize: 'var(--fs-xl)', fontWeight: 900, color: color, letterSpacing: -1, marginBottom: 'var(--space-4)' }}>{value}</div>
    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</div>
    {sub && <div style={{ fontSize: '10px', color: 'var(--text-dim)', marginTop: 'var(--space-4)', fontWeight: 700 }}>{sub}</div>}
  </div>
)

const Card = ({ children, style = {} }) => (
  <div className="card-base" style={{ marginBottom: 'var(--space-16)', ...style }}>
    {children}
  </div>
)

const CardHeader = ({ title, chartType, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
    <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.3 }}>{title}</span>
    <div style={{ display: 'flex', gap: 'var(--space-8)', alignItems: 'center' }}>
      {right}
      {chartType && <ChartBadge type={chartType} />}
    </div>
  </div>
)

const NoData = ({ emoji = '📊', label = 'No data yet', sub = 'Complete activities to see your stats here' }) => (
  <div className="empty-state" style={{ marginTop: 'var(--space-16)' }}>
    <div className="empty-state-emoji">{emoji}</div>
    <div className="empty-state-title">{label}</div>
    <div className="empty-state-subtitle">{sub}</div>
  </div>
)

const Skeleton = ({ height = 120 }) => (
  <div className="skeleton" style={{ height, borderRadius: 'var(--radius-inner)' }} />
)


// ─── Tooltip Styles ────────────────────────────────
const TooltipStyle = { background: '#111118', border: '1px solid #1E1E28', borderRadius: 8, fontSize: 11, color: '#E8E8F0' }

// ─── Chart Templates ───────────────────────────────
const MiniLine = ({ data, color, height = 120, dataKey = 'value' }) => {
  if (!data || !data.some(d => d[dataKey] > 0)) return <NoData />
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5}
          fill={`url(#grad-${color.replace('#','')})`}
          dot={{ r: 3, fill: color, stroke: '#000', strokeWidth: 1.5 }}
          activeDot={{ r: 5 }} />
        <XAxis hide />
        <YAxis hide />
        <Tooltip contentStyle={TooltipStyle} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const MiniBar = ({ data, color = '#5EE6F5', height = 100, useColor = false, labelKey = 'label', valueKey = 'value' }) => {
  if (!data || !data.some(d => d[valueKey] > 0)) return <NoData />
  const FALLBACK_COLORS = ['#00BCD4','#4CAF50','#FF9800','#9C27B0','#E91E63','#FDE047','#FB923C']
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <CartesianGrid horizontal vertical={false} stroke="#0A0A12" />
        <Bar dataKey={valueKey} radius={[3,3,0,0]} opacity={0.85}>
          {data.map((entry, i) => (
            <Cell key={i} fill={useColor ? (entry.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length]) : color} />
          ))}
        </Bar>
        <XAxis dataKey={labelKey} tick={{ fontSize: 7, fill: '#2A2A3A' }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip contentStyle={TooltipStyle} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const MiniPie = ({ data, height = 160 }) => {
  if (!data || !data.some(d => d.value > 0)) return <NoData emoji="🥧" />
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: height * 0.85, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie data={data} innerRadius="52%" outerRadius="80%" paddingAngle={2} dataKey="value">
              {data.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
            </Pie>
            <Tooltip contentStyle={TooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px' }}>
        {data.map((entry, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 9, color: '#E8E8F0', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.name}</div>
              <div style={{ fontSize: 9, color: '#666' }}>{total > 0 ? `${Math.round((entry.value / total) * 100)}%` : ''}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const ToggleBtn = ({ active, label, onClick }) => (
  <button onClick={onClick} style={{ padding: 'var(--space-4) var(--space-8)', borderRadius: 'var(--radius-badge)', border: active ? 'none' : '1px solid var(--border-primary)', background: active ? 'var(--color-accent-cyan)' : 'var(--bg-card)', color: active ? 'var(--bg-root)' : 'var(--text-muted)', fontSize: 10, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
)

const FooterNote = ({ text, color = '#4CAF50' }) => (
  <div style={{ fontSize: 10, color: color, fontWeight: 700, marginTop: 10, textAlign: 'right' }}>{text}</div>
)

// ─── RANK SYSTEM ──────────────────────────────────
const RANKS = [
  { id: 0, name: 'Dust',     emoji: '🌫️' },
  { id: 1, name: 'Iron',     emoji: '⚙️' },
  { id: 2, name: 'Copper',   emoji: '🪙' },
  { id: 3, name: 'Bronze',   emoji: '🥉' },
  { id: 4, name: 'Silver',   emoji: '🥈' },
  { id: 5, name: 'Gold',     emoji: '🥇' },
  { id: 6, name: 'Sapphire', emoji: '💎' },
  { id: 7, name: 'Emerald',  emoji: '🟢' },
  { id: 8, name: 'Ruby',     emoji: '♦️'  },
  { id: 9, name: 'Diamond',  emoji: '💠' },
  { id: 10, name: 'Nebula',  emoji: '🪐' },
]
const RANK_THRESHOLDS = [0, 100, 300, 600, 1000, 2000, 4000, 7000, 11000, 16000, 25000]

// ─── CATEGORY COLORS ──────────────────────────────
const CAT_COLORS = {
  Food: '#FF5252', Transport: '#FF9800', Shopping: '#9C27B0',
  Bills: '#00BCD4', Entertainment: '#E91E63', Health: '#4CAF50',
  Education: '#FDE047', Other: '#888888'
}
const ACT_COLORS = {
  Walk: '#4CAF50', Run: '#FF9800', Cycle: '#00BCD4', Swim: '#E91E63', Gym: '#9C27B0'
}
const SOURCE_COLORS = {
  habits: '#4CAF50', diary: '#9C27B0', move: '#4CAF50', quiz: '#00BCD4', pomodoro: '#FF9800', general: '#666'
}
const SUBJECT_FALLBACK = ['#FDE047','#00BCD4','#9C27B0','#4CAF50','#FB923C','#E91E63','#FF9800']

// ─── ZONE COLORS ──────────────────────────────────
const ZONE_COLORS_MAP = { mind: '#00BCD4', body: '#4CAF50', growth: '#FF9800', soul: '#E91E63' }
const ZONE_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ─── FILTER PILLS ─────────────────────────────────
const FILTERS = [
  { id: 'all', label: 'All' }, { id: 'habits', label: '🪐' },
  { id: 'money', label: '💰' },
  { id: 'study', label: '📚' },
  { id: 'diary', label: '📖' }
]

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function Stats() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [habitRange, setHabitRange] = useState('30D')

  // Data state
  const [habits, setHabits] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [userStreaks, setUserStreaks] = useState([])
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [moneySettings, setMoneySettings] = useState(null)
  const [studySessions, setStudySessions] = useState([])
  const [studyExams, setStudyExams] = useState([])
  const [diaryEntries, setDiaryEntries] = useState([])
  const [diarySettings, setDiarySettings] = useState(null)
  const [profile, setProfile] = useState(null)

  // AI report
  const [weeklyReport, setWeeklyReport] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) { setUser(session.user); fetchAll(session.user.id) }
    })
  }, [])

  const fetchAll = async (uid) => {
    setLoading(true)
    setError(null)
    try {
      const since30 = thirtyDaysAgo()
    const since365 = (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0] })()
    const firstMonth = firstOfMonth()
    const todayStr = today()

    // Use allSettled so missing legacy tables (zyron_wallet etc.) don't crash the page
    const results = await Promise.allSettled([
      supabase.from('habits').select('*').eq('user_id', uid),
      supabase.from('activity_log').select('*').eq('user_id', uid).gte('completed_date', since365),
      supabase.from('user_streaks').select('*').eq('user_id', uid),
      supabase.from('zyron_wallet').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('zyron_transactions').select('*').eq('user_id', uid).gte('created_at', since30),
      supabase.from('money_expenses').select('*').eq('user_id', uid).gte('expense_date', firstMonth),
      supabase.from('money_settings').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('study_sessions').select('*, study_subjects(name, color)').eq('user_id', uid).gte('session_date', firstMonth),
      supabase.from('study_exams').select('*').eq('user_id', uid).gte('exam_date', todayStr),
      supabase.from('diary_entries').select('entry_date, mood').eq('user_id', uid).gte('entry_date', since30),
      supabase.from('diary_settings').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    ])

    const safeData = (idx, fallback = null) =>
      results[idx].status === 'fulfilled' ? (results[idx].value?.data ?? fallback) : fallback

    const hData  = safeData(0, [])
    const alData = safeData(1, [])
    const stData = safeData(2, [])
    const wData  = safeData(3)
    const txData = safeData(4, [])
    const expData= safeData(5, [])
    const msData = safeData(6)
    const ssData = safeData(7, [])
    const seData = safeData(8, [])
    const deData = safeData(9, [])
    const dsData = safeData(10)
    const profData=safeData(11)

    setHabits(hData)
    setActivityLog(alData)
    setUserStreaks(stData)
    setWallet(wData)
    setTransactions(txData)
    setExpenses(expData)
    setMoneySettings(msData)
    setStudySessions(ssData)
    setStudyExams(seData)
    setDiaryEntries(deData)
    setDiarySettings(dsData)
    setProfile(profData)
      // Load cached weekly report
      const weekKey = getWeekKey()
      const cached = localStorage.getItem(`zyrbit_weekly_report_${weekKey}`)
      if (cached) {
        setWeeklyReport(cached)
      } else {
        generateWeeklyReport(uid, hData, alData, wData, txData, stData)
      }
    } catch (e) {
      console.warn('Stats load error:', e.message)
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const getWeekKey = () => {
    const d = new Date()
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${weekNum}`
  }

  const generateWeeklyReport = async (uid, hData, alData, wData, txData, stData) => {
    setLoadingReport(true)
    try {
      const since30Str = thirtyDaysAgo()
      const completions = alData?.filter(l => l.completed_date >= since30Str && l.status === 'completed').length || 0
      const balance = wData?.balance || 0
      const bestStreak = (stData || []).reduce((max, s) => Math.max(max, s.current_streak || 0), 0) || 0
      const context = `Habits tracked: ${hData?.length || 0}. Completions in 30 days: ${completions}. Zyrons balance: ${balance}. Best streak: ${bestStreak} days. This week's earned: ${wData?.daily_earned || 0} Zyrons.`
      const prompt = [{ role: 'user', text: `You are Zyra, AI coach inside Zyrbit. Write a warm, specific weekly report in under 80 words. Include actionable insight. Context: ${context}` }]
      const report = await askZyra(prompt)
      setWeeklyReport(report)
      localStorage.setItem(`zyrbit_weekly_report_${getWeekKey()}`, report)
    } catch (e) {
      setWeeklyReport('Keep growing consistently — every habit you complete adds to your gravity score! 🪐')
    }
    setLoadingReport(false)
  }

  const refreshReport = async () => {
    if (!user) return
    localStorage.removeItem(`zyrbit_weekly_report_${getWeekKey()}`)
    setWeeklyReport('')
    await generateWeeklyReport(user.id, habits, activityLog, wallet, transactions, userStreaks)
    await earnZyrons(user.id, 5, 'Refreshed weekly report', 'stats')
    showToast('+5 ⚡ Report refreshed!', 'success')
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveFilter(id)
  }

  // ─── DERIVED DATA ────────────────────────────────

  // --- Habits ---
  const sinceHabit = habitRange === '7D' ? sevenDaysAgo() : thirtyDaysAgo()
  const filteredLog = activityLog.filter(l => l.completed_date >= sinceHabit)
  const rangeDays = habitRange === '7D' ? 7 : 30

  const completionRate = habits.length > 0
    ? Math.round((filteredLog.filter(l => l.status === 'completed').length / (habits.length * rangeDays)) * 100)
    : 0
  const bestStreak = userStreaks.reduce((m, s) => Math.max(m, s.longest_streak || 0), 0)
  const gravityScore = wallet?.gravity_score || 0

  const yearlyCompletionsMap = React.useMemo(() => {
    const map = {}
    activityLog.forEach(l => {
      if (l.status === 'completed' && l.completed_date) {
        map[l.completed_date] = (map[l.completed_date] || 0) + 1
      }
    })
    return map
  }, [activityLog])

  const dailyCompletions = buildDailyMap(
    filteredLog.filter(l => l.status === 'completed'), 'completed_date', null, rangeDays
  )

  const zoneRows = Object.entries(ZONE_COLORS_MAP).map(([zone, color]) => {
    const total = filteredLog.filter(l => {
      const h = habits.find(hb => hb.id === l.habit_id)
      return h?.zone === zone && l.status === 'completed'
    }).length
    const max = filteredLog.filter(l => l.status === 'completed').length || 1
    return { zone, color, pct: Math.round((total / max) * 100), count: total }
  })

  // Gravity trend (use transaction dates as proxy, climbing cumulatively)
  const gravityData = buildDailyMap(activityLog.filter(l => l.status === 'completed'), 'completed_date', null, rangeDays)
    .map((d, i, arr) => ({ ...d, value: arr.slice(0, i+1).reduce((s, x) => s + x.value, 0) }))

  // --- Zyrons ---
  const rankId = wallet?.rank_id || 0
  const rankInfo = RANKS[Math.min(rankId, RANKS.length - 1)]
  const nextRank = RANKS[Math.min(rankId + 1, RANKS.length - 1)]
  const toNextRank = rankId < RANKS.length - 1
    ? (RANK_THRESHOLDS[rankId + 1] || 0) - (wallet?.total_earned || 0)
    : 0

  const zyronGrowth = (() => {
    const txMap = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      txMap[d.toISOString().split('T')[0]] = 0
    }
    transactions.filter(t => t.amount > 0).forEach(t => {
      const k = t.created_at?.split('T')[0]
      if (k && txMap[k] !== undefined) txMap[k] += t.amount
    })
    let running = 0
    return Object.entries(txMap).map(([date, earned]) => {
      running += earned
      return { date, value: running, label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0,1) }
    })
  })()

  const earnSources = (() => {
    const src = {}
    transactions.filter(t => t.amount > 0 && t.created_at >= sevenDaysAgo()).forEach(t => {
      const cat = t.category || 'general'
      src[cat] = (src[cat] || 0) + t.amount
    })
    return Object.entries(src).map(([name, value]) => ({ name, value, label: name.charAt(0).toUpperCase() + name.slice(1), color: SOURCE_COLORS[name] || '#888' }))
  })()

  // --- Money ---
  const sym = moneySettings?.currency_symbol || '$'
  const budget = moneySettings?.monthly_budget || 0
  const totalSpent = expenses.reduce((s, e) => s + (e.amount || 0), 0)
  const remaining = budget - totalSpent
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const daysPassed = new Date().getDate()
  const dailyAvg = daysPassed > 0 ? (totalSpent / daysPassed).toFixed(1) : 0
  const topCatEntry = (() => {
    const cats = {}
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + (e.amount || 0) })
    const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || '—'
  })()

  const spendByDay = buildDailyMap(expenses, 'expense_date', 'amount', 30)

  const spendByCategory = (() => {
    const cats = {}
    expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + (e.amount || 0) })
    return Object.entries(cats).map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#888' }))
  })()

  // weekend vs weekday spending
  const weekendSpend = spendByDay.filter(d => [0,6].includes(new Date(d.date).getDay()))
  const weekdaySpend = spendByDay.filter(d => ![0,6].includes(new Date(d.date).getDay()))
  const avgWE = weekendSpend.reduce((s,d) => s + d.value, 0) / (weekendSpend.length || 1)
  const avgWD = weekdaySpend.reduce((s,d) => s + d.value, 0) / (weekdaySpend.length || 1)
  const peaksOnWeekend = avgWE > avgWD * 1.5

  // --- Study ---
  const studyHoursMonth = studySessions.reduce((s, ss) => s + (ss.duration_minutes || 0) / 60, 0)
  const studyStreak = 0 // no streak column – placeholder
  const pomodorosCount = studySessions.filter(ss => ss.notes === 'Pomodoro').length
  const examsUpcoming = studyExams.length

  const subjectPie = (() => {
    const subs = {}
    studySessions.forEach(ss => {
      const name = ss.study_subjects?.name || 'General'
      const color = ss.study_subjects?.color
      if (!subs[name]) subs[name] = { name, value: 0, color }
      subs[name].value += ss.duration_minutes / 60
    })
    return Object.values(subs).map((s, i) => ({
      ...s,
      value: parseFloat(s.value.toFixed(1)),
      color: s.color || SUBJECT_FALLBACK[i % SUBJECT_FALLBACK.length]
    }))
  })()

  // --- Diary ---
  const diaryCount = diaryEntries.length
  const diaryStreak = diarySettings?.writing_streak || 0
  const moodScores = diaryEntries.filter(d => d.mood).map(d => {
    const map = { happy: 5, great: 5, calm: 4, neutral: 3, sad: 2, angry: 1 }
    return map[d.mood] || 3
  })
  const avgMood = moodScores.length > 0 ? (moodScores.reduce((s,m) => s+m, 0) / moodScores.length).toFixed(1) : 0
  const moodEmoji = avgMood >= 4.5 ? '😄' : avgMood >= 3.5 ? '🙂' : avgMood >= 2.5 ? '😐' : '😔'

  const moodTrend = (() => {
    const map = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      map[d.toISOString().split('T')[0]] = null
    }
    diaryEntries.forEach(e => {
      const moodMap = { happy: 5, great: 5, calm: 4, neutral: 3, sad: 2, angry: 1 }
      if (e.mood && map[e.entry_date] !== undefined) map[e.entry_date] = moodMap[e.mood] || 3
    })
    return Object.entries(map)
      .filter(([,v]) => v !== null)
      .map(([date, value]) => ({ date, value, label: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }).slice(0,1) }))
  })()

  const moodFirst7 = moodTrend.slice(0,7).reduce((s,d) => s + d.value, 0) / (moodTrend.slice(0,7).length || 1)
  const moodLast7 = moodTrend.slice(-7).reduce((s,d) => s + d.value, 0) / (moodTrend.slice(-7).length || 1)
  const moodImproving = moodLast7 >= moodFirst7

  const writingByDay = (() => {
    const days = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }
    diaryEntries.forEach(e => { days[new Date(e.entry_date).getDay()] = (days[new Date(e.entry_date).getDay()] || 0) + 1 })
    return ZONE_LABELS.map((label, i) => ({
      label,
      value: days[(i + 1) % 7] || 0,
      color: '#9C27B0'
    }))
  })()
  const mostWrittenDay = writingByDay.reduce((max, d) => d.value > max.value ? d : max, writingByDay[0])?.label || '—'

  // --- Community ---
  const friendTag = profile?.friend_tag || '—'

  // ─── RENDER ──────────────────────────────────────────
  if (error) {
    return (
      <div className="app-container" style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => fetchAll(user?.id)} />
      </div>
    )
  }

  return (
    <div className="app-container page-enter" style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: '0 var(--space-24) 100px', color: 'var(--text-primary)' }}>
      
      {/* HEADER */}
      <div style={{ padding: 'var(--space-32) 0 var(--space-24)' }}>
        <h1 style={{ fontSize: 'var(--fs-xxl)', fontWeight: 900, letterSpacing: -1, marginBottom: 'var(--space-4)' }}>Analytics</h1>
        <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 600 }}>Performance data from the last 30 cycles</p>
      </div>

      {/* FILTER PILLS */}
      <div style={{ padding: '0 0 var(--space-32)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-8)' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
          return (
            <button key={f.id} onClick={() => f.id === 'all' ? setActiveFilter('all') : scrollTo(f.id)}
              style={{
                flex: '1 1 calc(25% - 8px)', padding: 'var(--space-8) var(--space-4)', borderRadius: 'var(--radius-badge)', cursor: 'pointer',
                border: isActive ? '1px solid var(--text-primary)' : '1px solid var(--border-primary)',
                background: isActive ? 'var(--text-primary)' : 'var(--bg-card)',
                color: isActive ? 'var(--bg-root)' : 'var(--text-muted)',
                fontWeight: 900, fontSize: 'var(--fs-xs)', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* WEEKLY INSIGHT CARD */}
      <div className="card-base" style={{ marginBottom: 'var(--space-32)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
          <div>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: -0.3 }}>Weekly Report</div>
          </div>
          <button onClick={refreshReport} className="btn-secondary" style={{ padding: 'var(--space-8) var(--space-16)', borderRadius: 'var(--radius-button)', fontSize: 'var(--fs-xs)' }}>
            REFRESH
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', marginBottom: 'var(--space-24)' }}>
          <StatBox label="Completion" value={`${completionRate}%`} color="var(--color-accent-cyan)" />
          <StatBox label="Best Streak" value={`${bestStreak}d`} color="var(--color-warning)" />
        </div>

        <div style={{ background: 'var(--bg-root)', borderRadius: 'var(--radius-inner)', padding: 'var(--space-16)', border: '1px solid var(--border-primary)' }}>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-12)' }}>INSIGHTS</div>
          <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 1.6, fontWeight: 500 }}>
            {loadingReport ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--color-accent-cyan)', animation: 'skeletonPulse 1s infinite' }} />
                <span style={{ color: 'var(--text-muted)' }}>Analyzing patterns...</span>
              </div>
            ) : (
              weeklyReport || 'Complete more habits to get automated insights.'
            )}
          </div>
        </div>
      </div>

      {/* SMART INSIGHT CHIPS */}
      {!loading && (() => {
        const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
        const dayTotals = [0,0,0,0,0,0,0]
        activityLog.filter(l => l.status === 'completed').forEach(l => {
          if (l.completed_date) dayTotals[new Date(l.completed_date).getDay()]++
        })
        const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals))
        const bestDay = dayTotals[bestDayIdx] > 0 ? DAY_NAMES[bestDayIdx] : null

        const avgStreak = userStreaks.length > 0
          ? Math.round(userStreaks.reduce((s, r) => s + (r.longest_streak || 0), 0) / userStreaks.length)
          : null

        const zoneCounts = { mind: 0, body: 0, growth: 0, soul: 0 }
        activityLog.filter(l => l.status === 'completed').forEach(l => {
          const h = habits.find(hb => hb.id === l.habit_id)
          if (h?.zone && zoneCounts[h.zone] !== undefined) zoneCounts[h.zone]++
        })
        const zoneEntries = Object.entries(zoneCounts).filter(([, v]) => v >= 0)
        const weakestZone = zoneEntries.length > 0
          ? zoneEntries.sort((a, b) => a[1] - b[1])[0][0]
          : null

        const chips = [
          bestDay && { icon: '🔥', text: `Best day: ${bestDay}`, color: 'var(--color-warning)' },
          avgStreak && avgStreak < 7 && { icon: '⚠️', text: `Streak typically drops after ${avgStreak} days`, color: 'var(--color-error)' },
          weakestZone && { icon: '📉', text: `Weakest zone: ${weakestZone.charAt(0).toUpperCase() + weakestZone.slice(1)}`, color: 'var(--color-accent)' },
        ].filter(Boolean)

        if (chips.length === 0) return null

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)', marginBottom: 'var(--space-32)' }}>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-4)' }}>PATTERN INTEL</div>
            {chips.map((chip, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-8)',
                background: 'var(--bg-card)', border: `1px solid ${chip.color}33`,
                borderRadius: 'var(--radius-inner)', padding: 'var(--space-12) var(--space-16)'
              }}>
                <span style={{ fontSize: 'var(--fs-base)' }}>{chip.icon}</span>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: chip.color }}>{chip.text}</span>
              </div>
            ))}
          </div>
        )
      })()}

      {/* SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-32)' }}>
        
        {/* HABITS */}
        <div id="habits">
          <SectionHeader emoji="🪐" title="Habits" />
          
          <PhantomSelfExpansion user={user} habits={habits} />

          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                <StatBox label="Active Habits" value={habits.length} color="var(--color-accent)" />
                <StatBox label="Gravity Score" value={gravityScore} color="var(--color-accent-cyan)" />
              </div>
              <Card>
                <CardHeader title="Gravity Score Trend" chartType="LINE" />
                <MiniLine data={gravityData} color="#5EE6F5" height={120} />
              </Card>
              <Card style={{ padding: 'var(--space-16)' }}>
                <CardHeader title="Yearly Consistency Map" />
                <HeatmapGrid color="var(--color-accent-cyan)" dataMap={yearlyCompletionsMap} label="Consistency Grid (365 Days)" days={365} />
              </Card>
              <Card>
                <CardHeader title="Daily Completions" chartType="BAR" />
                <MiniBar data={dailyCompletions.slice(habitRange === '7D' ? -7 : -30)} color="#5EE6F5" height={100} />
              </Card>
              <Card>
                <CardHeader title="Zone Breakdown" />
                {zoneRows.every(z => z.count === 0) ? <NoData emoji="🧬" label="No zone data" /> : (
                  zoneRows.map(z => (
                    <div key={z.zone} style={{ marginBottom: 'var(--space-16)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-8)' }}>
                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{z.zone}</span>
                        <span style={{ fontSize: 'var(--fs-xs)', color: z.color, fontWeight: 900 }}>{z.pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-root)', borderRadius: 'var(--radius-badge)' }}>
                        <div style={{ width: `${z.pct}%`, height: '100%', background: z.color, borderRadius: 'var(--radius-badge)' }} />
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </>
          )}
        </div>


        {/* MONEY */}
        <div id="money">
          <SectionHeader emoji="💰" title="Money" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                <StatBox label="Total Spent" value={`${sym}${totalSpent.toFixed(0)}`} color="var(--color-error)" />
                <StatBox label="Remaining" value={`${sym}${remaining.toFixed(0)}`} color={remaining >= 0 ? 'var(--color-success)' : 'var(--color-error)'} />
              </div>
              <Card>
                <CardHeader title="Spend Trend" chartType="LINE" />
                <MiniLine data={spendByDay} color="#EF4444" height={120} />
              </Card>
              <Card>
                <CardHeader title="Categories" chartType="PIE" />
                <MiniPie data={spendByCategory} height={150} />
              </Card>
            </>
          )}
        </div>

        {/* STUDY */}
        <div id="study">
          <SectionHeader emoji="📚" title="Study" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                <StatBox label="Hours" value={`${studyHoursMonth.toFixed(1)}h`} color="var(--color-accent-cyan)" />
                <StatBox label="Streak" value={`${studyStreak}d`} color="var(--color-warning)" />
              </div>
              <Card>
                <CardHeader title="Subject Focus" chartType="PIE" />
                <MiniPie data={subjectPie} height={150} />
              </Card>
            </>
          )}
        </div>

        {/* DIARY */}
        <div id="diary">
          <SectionHeader emoji="📖" title="Diary" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-16)', marginBottom: 'var(--space-16)' }}>
                <StatBox label="Entries" value={diaryCount} color="var(--color-accent)" />
                <StatBox label="Avg Mood" value={moodEmoji} color="var(--color-success)" />
              </div>
              <Card>
                <CardHeader title="Mood Trend" chartType="LINE" />
                <MiniLine data={moodTrend} color="#FF9800" height={120} />
              </Card>
            </>
          )}
        </div>

      </div>

      <BottomNav activeTab="stats" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  )
}
