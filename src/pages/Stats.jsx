import React, { useState, useEffect, useRef } from 'react'
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
import { earnZyrons } from '../lib/zyrons.js'
import { askZyra } from '../lib/gemini.js'

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
    LINE: { bg: '#00FFFF10', color: '#00FFFF', label: 'LINE' },
    BAR:  { bg: '#FF980010', color: '#FF9800', label: 'BAR' },
    PIE:  { bg: '#E91E6310', color: '#E91E63', label: 'PIE' },
  }[type]
  return (
    <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`, padding: '4px 10px', borderRadius: 100, fontSize: 9, fontWeight: 900, letterSpacing: 1 }}>
      {cfg.label}
    </span>
  )
}

const SectionHeader = ({ id, emoji, title }) => (
  <div id={id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingTop: 12 }}>
    <span style={{ fontSize: 20 }}>{emoji}</span>
    <span style={{ fontSize: 16, fontWeight: 900, color: '#FFF', letterSpacing: -0.5, textTransform: 'uppercase' }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: '#1A1A24', marginLeft: 6 }} />
  </div>
)

const StatBox = ({ label, value, color, sub }) => (
  <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 20, padding: '16px 14px', textAlign: 'center' }}>
    <div style={{ fontSize: 28, fontWeight: 900, color: color, letterSpacing: -1, marginBottom: 4 }}>{value}</div>
    <div style={{ fontSize: 10, color: '#333', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>{label}</div>
    {sub && <div style={{ fontSize: 10, color: '#222', marginTop: 4, fontWeight: 700 }}>{sub}</div>}
  </div>
)

const Card = ({ children, style = {} }) => (
  <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, marginBottom: 20, ...style }}>
    {children}
  </div>
)

const CardHeader = ({ title, chartType, right }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
    <span style={{ fontSize: 14, fontWeight: 900, color: '#FFF', letterSpacing: -0.3 }}>{title}</span>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {right}
      {chartType && <ChartBadge type={chartType} />}
    </div>
  </div>
)

const NoData = ({ emoji = '📊', label = 'No data yet', sub = 'Complete activities to see your stats here' }) => (
  <div style={{ textAlign: 'center', padding: '28px 16px' }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{emoji}</div>
    <div style={{ fontSize: 13, fontWeight: 700, color: '#666', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 11, color: '#444' }}>{sub}</div>
  </div>
)

const Skeleton = ({ height = 120 }) => (
  <div style={{ height, borderRadius: 10, background: 'linear-gradient(90deg, #1E1E28 25%, #2A2A38 50%, #1E1E28 75%)', backgroundSize: '200% 100%', animation: 'skeletonPulse 1.5s infinite' }} />
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

const MiniBar = ({ data, color = '#00FFFF', height = 100, useColor = false, labelKey = 'label', valueKey = 'value' }) => {
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
  <button onClick={onClick} style={{ padding: '4px 10px', borderRadius: 100, border: active ? 'none' : '1px solid #1A1A24', background: active ? '#00FFFF' : '#0A0A12', color: active ? '#000' : '#666', fontSize: 10, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' }}>{label}</button>
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
  { id: 'zyrons', label: '⚡' }, { id: 'money', label: '💰' },
  { id: 'move', label: '🏃' }, { id: 'study', label: '📚' },
  { id: 'diary', label: '📖' }, { id: 'community', label: '🌍' },
]

// ═══════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════
export default function Stats() {
  const [user, setUser] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [habitRange, setHabitRange] = useState('30D')

  // Data state
  const [habits, setHabits] = useState([])
  const [activityLog, setActivityLog] = useState([])
  const [userStreaks, setUserStreaks] = useState([])
  const [wallet, setWallet] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [expenses, setExpenses] = useState([])
  const [moneySettings, setMoneySettings] = useState(null)
  const [moveLogs, setMoveLogs] = useState([])
  const [moveStreaks, setMoveStreaks] = useState(null)
  const [studySessions, setStudySessions] = useState([])
  const [studyExams, setStudyExams] = useState([])
  const [diaryEntries, setDiaryEntries] = useState([])
  const [diarySettings, setDiarySettings] = useState(null)
  const [profile, setProfile] = useState(null)
  const [battles, setBattles] = useState([])

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
    const since30 = thirtyDaysAgo()
    const firstMonth = firstOfMonth()
    const todayStr = today()

    const [
      { data: hData }, { data: alData }, { data: stData },
      { data: wData }, { data: txData },
      { data: expData }, { data: msData },
      { data: mlData }, { data: mstData },
      { data: ssData }, { data: seData },
      { data: deData }, { data: dsData },
      { data: profData }, { data: btData }
    ] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', uid),
      supabase.from('activity_log').select('*').eq('user_id', uid).gte('completed_date', since30),
      supabase.from('user_streaks').select('*').eq('user_id', uid),
      supabase.from('zyron_wallet').select('*').eq('user_id', uid).single(),
      supabase.from('zyron_transactions').select('*').eq('user_id', uid).gte('created_at', since30),
      supabase.from('money_expenses').select('*').eq('user_id', uid).gte('expense_date', firstMonth),
      supabase.from('money_settings').select('*').eq('user_id', uid).single(),
      supabase.from('move_logs').select('*').eq('user_id', uid).gte('log_date', since30),
      supabase.from('move_streaks').select('*').eq('user_id', uid).single(),
      supabase.from('study_sessions').select('*, study_subjects(name, color)').eq('user_id', uid).gte('session_date', firstMonth),
      supabase.from('study_exams').select('*').eq('user_id', uid).gte('exam_date', todayStr),
      supabase.from('diary_entries').select('entry_date, mood').eq('user_id', uid).gte('entry_date', since30),
      supabase.from('diary_settings').select('*').eq('user_id', uid).single(),
      supabase.from('profiles').select('*').eq('id', uid).single(),
      supabase.from('battles').select('*').or(`challenger_id.eq.${uid},opponent_id.eq.${uid}`).eq('status', 'complete'),
    ])

    setHabits(hData || [])
    setActivityLog(alData || [])
    setUserStreaks(stData || [])
    setWallet(wData)
    setTransactions(txData || [])
    setExpenses(expData || [])
    setMoneySettings(msData)
    setMoveLogs(mlData || [])
    setMoveStreaks(mstData)
    setStudySessions(ssData || [])
    setStudyExams(seData || [])
    setDiaryEntries(deData || [])
    setDiarySettings(dsData)
    setProfile(profData)
    setBattles(btData || [])
    setLoading(false)

    // Load cached weekly report
    const weekKey = getWeekKey()
    const cached = localStorage.getItem(`zyrbit_weekly_report_${weekKey}`)
    if (cached) {
      setWeeklyReport(cached)
    } else {
      generateWeeklyReport(uid, hData, alData, wData, txData)
    }
  }

  const getWeekKey = () => {
    const d = new Date()
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const weekNum = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-W${weekNum}`
  }

  const generateWeeklyReport = async (uid, hData, alData, wData, txData) => {
    setLoadingReport(true)
    try {
      const completions = alData?.length || 0
      const balance = wData?.balance || 0
      const bestStreak = (hData || []).reduce((m, h) => Math.max(m, h.current_streak || 0), 0)
      const context = `Habits tracked: ${hData?.length || 0}. Completions in 30 days: ${completions}. Zyrons balance: ${balance}. Best streak: ${bestStreak} days. This week's earned: ${wData?.daily_earned || 0} Zyrons.`
      const prompt = [{ role: 'user', text: `You are Zyra, AI coach inside Zyrbit. Write a warm, specific weekly orbit report in under 80 words. Include actionable insight. Context: ${context}` }]
      const report = await askZyra(prompt)
      setWeeklyReport(report)
      localStorage.setItem(`zyrbit_weekly_report_${getWeekKey()}`, report)
    } catch (e) {
      setWeeklyReport('Keep orbiting consistently — every habit you complete adds to your gravity score! 🪐')
    }
    setLoadingReport(false)
  }

  const refreshReport = async () => {
    if (!user) return
    localStorage.removeItem(`zyrbit_weekly_report_${getWeekKey()}`)
    setWeeklyReport('')
    await generateWeeklyReport(user.id, habits, activityLog, wallet, transactions)
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

  // --- Move ---
  const totalKm = moveLogs.reduce((s, l) => s + (l.distance_km || 0), 0)
  const moveStreak = moveStreaks?.current_streak || 0
  const moveZyrons = moveLogs.reduce((s, l) => s + (l.zyrons_earned || 0), 0)
  const activeDays = new Set(moveLogs.map(l => l.log_date)).size

  const kmByDay = buildDailyMap(moveLogs, 'log_date', 'distance_km', 30)

  const kmByActivity = (() => {
    const acts = {}
    moveLogs.forEach(l => { acts[l.activity_type] = (acts[l.activity_type] || 0) + (l.distance_km || 0) })
    return Object.entries(acts).map(([name, value]) => ({
      name, value: parseFloat(value.toFixed(1)), label: name, color: ACT_COLORS[name] || '#888'
    }))
  })()

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
  const battlesWon = battles.filter(b => b.winner_id === user?.id).length
  const battlesLost = battles.length - battlesWon
  const friendTag = profile?.friend_tag || '—'

  // ─── RENDER ──────────────────────────────────────────
  return (
    <div style={{ background: '#000', minHeight: '100vh', padding: '0 20px 100px', color: '#FFF' }}>
      
      {/* HEADER */}
      <div style={{ padding: '32px 0 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, marginBottom: 4 }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#444', fontWeight: 600 }}>Performance data from the last 30 cycles</p>
      </div>

      {/* FILTER PILLS */}
      <div style={{ padding: '0 0 32px', overflowX: 'auto', display: 'flex', gap: 10, scrollbarWidth: 'none' }}>
        {FILTERS.map(f => {
          const isActive = activeFilter === f.id
          return (
            <button key={f.id} onClick={() => f.id === 'all' ? setActiveFilter('all') : scrollTo(f.id)}
              style={{
                flexShrink: 0, padding: '10px 20px', borderRadius: 100, cursor: 'pointer',
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                background: isActive ? '#FFF' : '#0A0A12',
                color: isActive ? '#000' : '#444',
                fontWeight: 900, fontSize: 12, transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}>
              {f.label}
            </button>
          )
        })}
      </div>

      {/* WEEKLY INSIGHT CARD */}
      <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 24, marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#FFF', letterSpacing: -0.3 }}>Weekly Orbit Report</div>
            <div style={{ fontSize: 10, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 }}>POWERED BY ZYRA AI</div>
          </div>
          <button onClick={refreshReport} style={{ background: '#111', border: '1px solid #222', padding: '8px 16px', borderRadius: 12, color: '#FFF', fontSize: 11, fontWeight: 900, cursor: 'pointer' }}>
            REFRESH
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <StatBox label="Completion" value={`${completionRate}%`} color="#00FFFF" />
          <StatBox label="Best Streak" value={`${bestStreak}d`} color="#FF9800" />
        </div>

        <div style={{ background: '#000', borderRadius: 16, padding: 16, border: '1px solid #111' }}>
          <div style={{ fontSize: 11, color: '#333', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12 }}>INSIGHTS</div>
          <div style={{ fontSize: 13, color: '#FFF', lineHeight: 1.6, fontWeight: 500 }}>
            {loadingReport ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#00FFFF', animation: 'skeletonPulse 1s infinite' }} />
                <span style={{ color: '#444' }}>Analyzing patterns...</span>
              </div>
            ) : (
              weeklyReport || 'Complete more habits to get automated insights.'
            )}
          </div>
        </div>
      </div>

      {/* SECTIONS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        
        {/* HABITS */}
        <div id="habits">
          <SectionHeader emoji="🪐" title="Habits" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Active Habits" value={habits.length} color="#9C27B0" />
                <StatBox label="Gravity Score" value={gravityScore} color="#00FFFF" />
              </div>
              <Card>
                <CardHeader title="Gravity Score Trend" chartType="LINE" />
                <MiniLine data={gravityData} color="#00FFFF" height={120} />
              </Card>
              <Card>
                <CardHeader title="Daily Completions" chartType="BAR" />
                <MiniBar data={dailyCompletions.slice(habitRange === '7D' ? -7 : -30)} color="#00FFFF" height={100} />
              </Card>
              <Card>
                <CardHeader title="Zone Breakdown" />
                {zoneRows.every(z => z.count === 0) ? <NoData emoji="🧬" label="No zone data" /> : (
                  zoneRows.map(z => (
                    <div key={z.zone} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 12, color: '#333', fontWeight: 800, textTransform: 'uppercase' }}>{z.zone}</span>
                        <span style={{ fontSize: 12, color: z.color, fontWeight: 900 }}>{z.pct}%</span>
                      </div>
                      <div style={{ height: 6, background: '#111', borderRadius: 100 }}>
                        <div style={{ width: `${z.pct}%`, height: '100%', background: z.color, borderRadius: 100 }} />
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </>
          )}
        </div>

        {/* ZYRONS */}
        <div id="zyrons">
          <SectionHeader emoji="⚡" title="Zyrons" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Balance" value={(wallet?.balance || 0).toLocaleString()} color="#FF9800" />
                <StatBox label="Earned Today" value={(wallet?.daily_earned || 0).toLocaleString()} color="#4CAF50" />
              </div>
              <Card>
                <CardHeader title="Growth Chart" chartType="LINE" />
                <MiniLine data={zyronGrowth} color="#FF9800" height={120} />
              </Card>
            </>
          )}
        </div>

        {/* MONEY */}
        <div id="money">
          <SectionHeader emoji="💰" title="Money" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Total Spent" value={`${sym}${totalSpent.toFixed(0)}`} color="#EF4444" />
                <StatBox label="Remaining" value={`${sym}${remaining.toFixed(0)}`} color={remaining >= 0 ? '#4CAF50' : '#EF4444'} />
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

        {/* MOVE */}
        <div id="move">
          <SectionHeader emoji="🏃" title="Move" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Total KM" value={`${totalKm.toFixed(1)}`} color="#4CAF50" />
                <StatBox label="Move Streak" value={`${moveStreak}d`} color="#FF9800" />
              </div>
              <Card>
                <CardHeader title="Distance Trend" chartType="LINE" />
                <MiniLine data={kmByDay} color="#4CAF50" height={120} />
              </Card>
            </>
          )}
        </div>

        {/* STUDY */}
        <div id="study">
          <SectionHeader emoji="📚" title="Study" />
          {loading ? <Skeleton height={200} /> : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Hours" value={`${studyHoursMonth.toFixed(1)}h`} color="#00BCD4" />
                <StatBox label="Streak" value={`${studyStreak}d`} color="#FF9800" />
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <StatBox label="Entries" value={diaryCount} color="#9C27B0" />
                <StatBox label="Avg Mood" value={moodEmoji} color="#4CAF50" />
              </div>
              <Card>
                <CardHeader title="Mood Orbit" chartType="LINE" />
                <MiniLine data={moodTrend} color="#FF9800" height={120} />
              </Card>
            </>
          )}
        </div>

      </div>

      <BottomNav activeTab="stats" onTabChange={(t) => window.location.href = `/${t}`} />
    </div>
  )
}
