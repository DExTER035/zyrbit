import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import BottomNav from '../components/BottomNav.jsx';
import GravityRing from '../components/GravityRing.jsx';
import { showToast } from '../components/Toast.jsx';
import { CheckCircle2 } from 'lucide-react';
import HabitCard from '../components/HabitCard.jsx';
import ZoneTab from '../components/ZoneTab.jsx';
import StreakShield from '../components/StreakShield.jsx';
import HeatmapGrid from '../components/HeatmapGrid.jsx';
import { earnZyrons, getWallet } from '../lib/zyrons.js';
import { getRankByZyrons } from '../lib/ranks.js';
import ErrorState from '../components/ErrorState.jsx';

// ─── colour tokens (Zenith Premium palette) ─────────────────────────────────
const C = {
  bg:        '#121214',
  surface:   '#17181B',
  surfaceAlt:'#1C1D21',
  border:    '#26272C',
  border2:   '#2E2F35',
  accent:    '#8B7FFF',   // violet  – OS Score
  cyan:      '#5EE6F5',   // cyan    – briefing
  green:     '#10B981',   // emerald – completed
  amber:     '#F59E0B',
  red:       '#EF4444',
  muted:     '#71717A',
  text:      '#FFFFFF',
  subtext:   '#A1A1AA',
};

// Timeline node colours keyed by type
const nodeColor = {
  sleep:   '#8B5CF6',
  water:   '#06B6D4',
  food:    '#F59E0B',
  workout: '#EC4899',
  focus:   '#7F77DD',
  task:    '#10B981',
  expense: '#FF9800',
};

// Reflection questions for perfect-day reflections
const REFLECTION_QUESTIONS = [
  'What was the hardest habit to complete today?',
  'What are you most proud of today?',
  'What would you do differently tomorrow?',
  'Which habit gave you the most energy?',
  "What's one thing you learned about yourself today?",
];

// Utility mapping for habit zone colors
const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
};

// Helpers
const getTodayStr = () => new Date().toLocaleDateString('en-CA');
const getStartOfWeekStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toLocaleDateString('en-CA');
};

const isTodayLocal = (timestampStr, todayVal) => {
  if (!timestampStr) return false;
  return new Date(timestampStr).toLocaleDateString('en-CA') === todayVal;
};



const compileCyberneticDirectives = (os, recovery, sleepHrs, debt, water, tasksDone, tasksTotal, spent, limit, focusMins, runwayMonths) => {
  let p1 = "";
  if (os >= 80) {
    p1 = `DexOS operating at peak performance (OS Score: ${os}/100). Momentum is established.`;
  } else if (os >= 60) {
    p1 = `DexOS status nominal (OS Score: ${os}/100). Maintain steady execution.`;
  } else {
    p1 = `DexOS status critical (OS Score: ${os}/100). Gravitational decay detected. Execute priority backlog.`;
  }

  let p2 = "";
  if (runwayMonths < 3.0) {
    p2 = `Runway depletion is critical. Discretionary spending must be frozen.`;
  } else if (focusMins >= 120) {
    p2 = `Cognitive focus limits achieved. Transition to active recovery.`;
  } else {
    p2 = `Focus blocks logged: ${Math.round(focusMins)}m. Clear the priority backlog.`;
  }

  return `${p1} ${p2}`;
};

const calculateOsScore = (
  completedTasksToday, totalTasksToday,
  focusMins, sprintDailyTarget, sprintTargetToDate, sprintLoggedToDate, sprintActive,
  recoveryScore, sleepHrs, waterMlToday,
  monthTotalSpent, monthlyBudget, runwayMonths
) => {
  let tasksRatio = 1.0;
  if (totalTasksToday > 0) {
    tasksRatio = completedTasksToday / totalTasksToday;
  } else {
    tasksRatio = completedTasksToday > 0 ? 1.0 : 0.8;
  }
  const tasksScore = tasksRatio * 15;

  const focusTarget = sprintDailyTarget || 90;
  const focusRatio = Math.min(1.0, focusMins / focusTarget);
  const focusContribution = focusRatio * 15;

  let sprintRatio = 0.8;
  if (sprintActive && sprintTargetToDate > 0) {
    sprintRatio = Math.min(1.0, sprintLoggedToDate / sprintTargetToDate);
  }
  const sprintContribution = sprintRatio * 10;
  const growthTotal = tasksScore + focusContribution + sprintContribution;

  const recoveryContribution = (recoveryScore / 100) * 15;
  const sleepRatio = Math.min(1.0, sleepHrs / 7.5);
  const sleepContribution = sleepRatio * 10;
  const waterRatio = Math.min(1.0, waterMlToday / 3000);
  const waterContribution = waterRatio * 5;
  const healthTotal = recoveryContribution + sleepContribution + waterContribution;

  const spentRatio = monthlyBudget > 0 ? Math.min(1.0, monthTotalSpent / monthlyBudget) : 0;
  const budgetRatio = Math.max(0.0, 1.0 - spentRatio);
  const budgetContribution = budgetRatio * 15;

  const runwayRatio = Math.min(1.0, runwayMonths / 6.0);
  const runwayContribution = runwayRatio * 15;
  const wealthTotal = budgetContribution + runwayContribution;

  const total = Math.max(0, Math.min(100, Math.round(growthTotal + healthTotal + wealthTotal)));
  return {
    total,
    growth: Math.round(growthTotal),
    health: Math.round(healthTotal),
    wealth: Math.round(wealthTotal)
  };
};

const compileTopPriorities = (
  recoveryScore,
  monthlyBudgetExceeded,
  overdueTasks,
  focusMins,
  sprintDailyTarget,
  sprintActive,
  tasksDueToday
) => {
  const candidates = [];

  if (recoveryScore < 50) {
    candidates.push({
      id: 'low_recovery_protocol',
      name: `Active Recovery Protocol: Focus sleep & water (${recoveryScore}% Recovery)`,
      pScore: 95,
      type: 'health_action'
    });
  }

  if (monthlyBudgetExceeded) {
    candidates.push({
      id: 'discretionary_freeze',
      name: 'Freeze Discretionary Capital: Monthly budget exceeded',
      pScore: 90,
      type: 'wealth_action'
    });
  }

  const sprintDeficit = sprintActive ? Math.max(0, (sprintDailyTarget || 90) - focusMins) : 0;
  if (sprintActive && sprintDeficit > 0) {
    candidates.push({
      id: 'sprint_deficit',
      name: `Sprint Deficit: Log ${sprintDeficit}m focus target today`,
      pScore: 75 + Math.min(20, sprintDeficit / 10),
      type: 'growth_action'
    });
  }

  for (const t of overdueTasks) {
    const daysOverdue = Math.max(1, Math.round((Date.now() - new Date(t.due_date).getTime()) / 86400000));
    const priority = t.priority ?? 3;
    const priorityWeight = priority === 1 ? 10 : priority === 2 ? 5 : 0;
    candidates.push({
      id: t.id,
      name: `Overdue: ${t.name} (${t.growth_projects?.name || 'Project'})`,
      pScore: Math.min(93, 80 + priorityWeight + daysOverdue),
      type: 'task',
      taskObj: t
    });
  }

  for (const t of tasksDueToday) {
    const priority = t.priority ?? 3;
    const priorityWeight = priority === 1 ? 10 : priority === 2 ? 5 : 0;
    candidates.push({
      id: t.id,
      name: `${t.name} (${t.growth_projects?.name || 'Project'})`,
      pScore: 60 + priorityWeight,
      type: 'task',
      taskObj: t
    });
  }

  candidates.sort((a, b) => b.pScore - a.pScore);
  return candidates.slice(0, 3);
};

export default function Zenith() {
  const navigate = useNavigate();
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Raw Database States
  const [tasks, setTasks] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [waterLogs, setWaterLogs] = useState([]);
  const [moveLogs, setMoveLogs] = useState([]);
  const [focusSessions, setFocusSessions] = useState([]);
  const [sprintData, setSprintData] = useState([]);
  const [expSettings, setExpSettings] = useState(null);
  const [income, setIncome] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);

  // Habits State
  const [habits, setHabits] = useState([]);
  const [activity, setActivity] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [longestStreaks, setLongestStreaks] = useState({});
  const [activeZone, setActiveZone] = useState('all');
  const [wallet, setWallet] = useState(null);
  const [xpPopup, setXpPopup] = useState(null); // { amount, label }
  const [celebrationShown, setCelebrationShown] = useState(() => {
    const todayStr = (() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0] })()
    return localStorage.getItem('zyrbit_celebration_date') === todayStr
  });
  const [showCelebration, setShowCelebration] = useState(false);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [bestStreak, setBestStreak] = useState(0);

  const userRef = useRef(null);

  // Reflection State
  const [showReflection, setShowReflection] = useState(false);
  const [reflectionText, setReflectionText] = useState('');
  const [reflectionQuestion, setReflectionQuestion] = useState('');

  // Add/Edit Habit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [skipTarget, setSkipTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' });

  const today = getTodayStr();

  // ── Derived State Calculations (useMemo) ──────────────────────────────────
  const ctx = React.useMemo(() => {
    const completedTasksToday = tasks.filter(t => t.status === 'done' && isTodayLocal(t.completed_at, today)).length;
    const totalTasksToday = tasks.filter(t => t.due_date === today || (t.status === 'done' && isTodayLocal(t.completed_at, today))).length;
    const focusMins = focusSessions ? focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0) : 0;
    const lastSleep = sleepLogs[0];
    const sleepHrs = (lastSleep && lastSleep.sleep_date === today) ? Number(lastSleep.duration_hours) : 0;
    const targetSleep = 7.5;
    const sleepDebt = sleepLogs.reduce((acc, log) => acc + (targetSleep - Number(log.duration_hours)), 0);
    const todayWater = waterLogs.reduce((sum, item) => sum + item.amount_ml, 0);
    const todayExps = expenses.filter(e => e.expense_date === today);
    const spent = todayExps.reduce((s, e) => s + Number(e.amount), 0);
    const dailyLimit = expSettings?.monthly_budget ? Number(expSettings.monthly_budget) / 30 : 500;
    
    const activeSprint = sprintData?.[0] || null;
    const sprintActive = !!activeSprint;
    const sprintDailyTarget = activeSprint?.daily_focus_minutes || 90;
    let sprintLoggedToDate = activeSprint?.focus_logged_minutes || 0;
    let sprintTargetToDate = 0;
    if (activeSprint) {
      const start = new Date(activeSprint.start_date + 'T00:00:00');
      const end = new Date(activeSprint.end_date + 'T00:00:00');
      const totalDays = Math.max(1, Math.round((end - start) / 86400000));
      const day = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000)));
      sprintTargetToDate = activeSprint.daily_focus_minutes * day;
    }
    
    const totalIncome = income.reduce((s, i) => s + Number(i.amount), 0);
    const totalExpenseAllTime = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const liquidCash = totalIncome - totalExpenseAllTime;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    const burnLast30 = expenses.filter(e => e.expense_date >= thirtyDaysAgoStr).reduce((s, e) => s + Number(e.amount), 0);
    const runwayMonths = burnLast30 > 0 ? (liquidCash / burnLast30) : 99;
    
    const upcomingUnpaidBills = bills.filter(b => b.status === 'unpaid').sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
    const nextBill = upcomingUnpaidBills[0] || null;
    
    const goalsCount = goals.length;
    const completedGoals = goals.filter(g => g.is_complete).length;
    const overdueTasksCount = tasks.filter(t => t.status === 'todo' && t.due_date && t.due_date < today).length;
    
    return {
      completedTasks: completedTasksToday,
      totalTasks: totalTasksToday,
      focusHours: Number((focusMins / 60).toFixed(1)),
      sleep: sleepHrs,
      sleepDebt,
      water: todayWater,
      spent,
      limit: Math.round(dailyLimit),
      sprintActive,
      sprintDailyTarget,
      sprintTargetToDate,
      sprintLoggedToDate,
      liquidCash,
      runwayMonths,
      nextBill,
      overdueTasksCount,
      goalsCount,
      completedGoals
    };
  }, [tasks, focusSessions, sleepLogs, waterLogs, expenses, expSettings, sprintData, income, bills, goals, today]);

  const recoveryScore = React.useMemo(() => {
    const lastSleep = sleepLogs[0];
    const targetSleep = 7.5;
    const sleepDebt = sleepLogs.reduce((acc, log) => acc + (targetSleep - Number(log.duration_hours)), 0);
    const sleepScore = Math.max(0, 100 - (sleepDebt * 12));
    const lastQuality = lastSleep ? lastSleep.quality : 3;
    const qualityScore = lastQuality * 20;
    const sleepContribution = (sleepScore * 0.5) + (qualityScore * 0.3);
    
    const todayWater = waterLogs.reduce((sum, item) => sum + item.amount_ml, 0);
    const todayExerciseMins = moveLogs.filter(m => m.log_date === today).reduce((sum, m) => sum + m.active_minutes, 0);
    const dynamicWaterTarget = 3000 + (Math.floor(todayExerciseMins / 30) * 500);
    const waterRatio = Math.min(1.0, todayWater / dynamicWaterTarget);
    const hydrationContribution = waterRatio * 100 * 0.2;
    
    const todayMaxRpe = moveLogs.length > 0 ? Math.max(...moveLogs.map(m => m.rpe), 0) : 5;
    const isOverexerted = todayExerciseMins > 90 && sleepDebt > 3.0;
    const strainPenalty = isOverexerted ? Math.min(15, (todayExerciseMins / 60) * todayMaxRpe) : 0;
    
    return Math.max(0, Math.min(100, Math.round(sleepContribution + hydrationContribution - strainPenalty)));
  }, [sleepLogs, waterLogs, moveLogs, today]);

  const { osScore, osBreakdown } = React.useMemo(() => {
    const focusMins = focusSessions ? focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0) : 0;
    const lastSleep = sleepLogs[0];
    const sleepHrs = (lastSleep && lastSleep.sleep_date === today) ? Number(lastSleep.duration_hours) : 0;
    const todayWater = waterLogs.reduce((sum, item) => sum + item.amount_ml, 0);
    const todayExps = expenses.filter(e => e.expense_date === today);
    const spent = todayExps.reduce((s, e) => s + Number(e.amount), 0);
    const monthlyBudget = expSettings?.monthly_budget || 15000;
    
    const activeSprint = sprintData?.[0] || null;
    const sprintActive = !!activeSprint;
    const sprintDailyTarget = activeSprint?.daily_focus_minutes || 90;
    let sprintLoggedToDate = activeSprint?.focus_logged_minutes || 0;
    let sprintTargetToDate = 0;
    if (activeSprint) {
      const start = new Date(activeSprint.start_date + 'T00:00:00');
      const end = new Date(activeSprint.end_date + 'T00:00:00');
      const totalDays = Math.max(1, Math.round((end - start) / 86400000));
      const day = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000)));
      sprintTargetToDate = activeSprint.daily_focus_minutes * day;
    }
    
    const scoreObj = calculateOsScore(
      ctx.completedTasks, ctx.totalTasks,
      focusMins, sprintDailyTarget, sprintTargetToDate, sprintLoggedToDate, sprintActive,
      recoveryScore, sleepHrs, todayWater,
      spent, monthlyBudget, ctx.runwayMonths
    );
    return {
      osScore: scoreObj.total,
      osBreakdown: { growth: scoreObj.growth, health: scoreObj.health, wealth: scoreObj.wealth }
    };
  }, [ctx, focusSessions, sleepLogs, waterLogs, expenses, expSettings, sprintData, recoveryScore, today]);

  const winsCount = React.useMemo(() => {
    const focusMins = focusSessions ? focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0) : 0;
    const lastSleep = sleepLogs[0];
    const sleepHrs = (lastSleep && lastSleep.sleep_date === today) ? Number(lastSleep.duration_hours) : 0;
    const todayWater = waterLogs.reduce((sum, item) => sum + item.amount_ml, 0);
    const todayExerciseMins = moveLogs.filter(m => m.log_date === today).reduce((sum, m) => sum + m.active_minutes, 0);
    
    const dynamicWaterTarget = 3000 + (Math.floor(todayExerciseMins / 30) * 500);
    
    let winsToday = ctx.completedTasks;
    if (focusMins > 0 && focusMins >= ctx.sprintDailyTarget) winsToday += 1;
    if (todayWater > 0 && todayWater >= dynamicWaterTarget) winsToday += 1;
    if (sleepHrs > 0) winsToday += 1;
    if (todayExerciseMins > 0) winsToday += 1;
    return winsToday;
  }, [ctx, focusSessions, sleepLogs, waterLogs, moveLogs, today]);

  const aiBriefing = React.useMemo(() => {
    return compileCyberneticDirectives(
      osScore,
      recoveryScore,
      ctx.sleep,
      ctx.sleepDebt,
      ctx.water,
      ctx.completedTasks,
      ctx.totalTasks,
      ctx.spent,
      ctx.limit,
      ctx.focusHours * 60,
      ctx.runwayMonths
    );
  }, [osScore, recoveryScore, ctx]);

  const [customPrioritiesDone, setCustomPrioritiesDone] = useState({});

  const priorities = React.useMemo(() => {
    const overdueTasksList = tasks.filter(t => t.status === 'todo' && t.due_date && t.due_date < today);
    const tasksDueTodayList = tasks.filter(t => t.status === 'todo' && t.due_date === today);
    const monthlyBudgetExceeded = ctx.spent > (expSettings?.monthly_budget || 15000);
    const focusMins = focusSessions ? focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0) : 0;
    
    const compiled = compileTopPriorities(
      recoveryScore,
      monthlyBudgetExceeded,
      overdueTasksList,
      focusMins,
      ctx.sprintDailyTarget,
      ctx.sprintActive,
      tasksDueTodayList
    );

    // Apply custom completed state toggles
    return compiled.map(p => ({
      ...p,
      done: p.done || !!customPrioritiesDone[p.id]
    }));
  }, [tasks, recoveryScore, ctx, focusSessions, expSettings, today, customPrioritiesDone]);

  const timeline = React.useMemo(() => {
    const rawEvents = [];
    const todayExps = expenses.filter(e => e.expense_date === today);
    const lastSleep = sleepLogs[0];
    
    activity.filter(l => l.status === 'completed' && l.completed_date === today).forEach(log => {
      const h = habits.find(x => x.id === log.habit_id);
      rawEvents.push({
        ts: new Date(log.created_at || today + 'T07:00:00').getTime(),
        type: 'task',
        text: `${h ? h.icon : '✅'} Habit done: ${h ? h.name : 'Unknown'}`
      });
    });
    
    tasks.filter(t => t.status === 'done' && isTodayLocal(t.completed_at, today)).forEach(t => {
      rawEvents.push({
        ts: new Date(t.completed_at || today + 'T11:00:00').getTime(),
        type: 'task',
        text: `Task done: ${t.name}`
      });
    });
    
    if (lastSleep && lastSleep.sleep_date === today) {
      rawEvents.push({
        ts: new Date(today + 'T06:00:00').getTime(),
        type: 'sleep',
        text: `Slept ${Number(lastSleep.duration_hours).toFixed(1)}h — Quality ${lastSleep.quality}/5`
      });
    }
    
    waterLogs.forEach(w => {
      rawEvents.push({
        ts: new Date(w.created_at || today + 'T08:00:00').getTime(),
        type: 'water',
        text: `Hydration +${w.amount_ml}ml`
      });
    });
    
    moveLogs.filter(m => m.log_date === today).forEach(m => {
      rawEvents.push({
        ts: new Date(m.created_at || today + 'T09:00:00').getTime(),
        type: 'workout',
        text: `${m.activity_type} — ${m.active_minutes}min (RPE ${m.rpe})`
      });
    });
    
    focusSessions.filter(f => f.session_date === today).forEach(f => {
      rawEvents.push({
        ts: new Date(f.started_at || today + 'T10:00:00').getTime(),
        type: 'focus',
        text: `Focus session — ${f.duration_minutes}min`
      });
    });
    
    todayExps.forEach(e => {
      rawEvents.push({
        ts: new Date(e.created_at || today + 'T12:00:00').getTime(),
        type: 'expense',
        text: `₹${Number(e.amount).toFixed(0)} — ${e.note || e.category || 'Expense'}`
      });
    });
    
    rawEvents.sort((a, b) => a.ts - b.ts);
    return rawEvents.map(e => ({
      time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      type: e.type,
      text: e.text
    }));
  }, [activity, habits, tasks, sleepLogs, waterLogs, moveLogs, focusSessions, expenses, today]);

  const yearlyCompletionsMap = React.useMemo(() => {
    const map = {};
    activity.forEach(log => {
      if (log.status === 'completed' && log.completed_date) {
        map[log.completed_date] = (map[log.completed_date] || 0) + 1;
      }
    });
    return map;
  }, [activity]);

  const weeklyCompletionScore = React.useMemo(() => {
    if (habits.length === 0) return 0;
    const sevenDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 6); return d.toLocaleDateString('en-CA') })()
    const comps = activity.filter(log => log.completed_date >= sevenDaysAgoStr && log.status === 'completed').length;
    const maxPossible = habits.length * 7;
    return Math.round((comps / maxPossible) * 100);
  }, [activity, habits]);

  const habitInsights = React.useMemo(() => {
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayTotals = [0,0,0,0,0,0,0];
    
    const thirtyDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toLocaleDateString('en-CA') })()
    const recentLogs = activity.filter(l => l.completed_date >= thirtyDaysAgoStr && l.status === 'completed');
    recentLogs.forEach(l => {
      if (l.completed_date) {
        const d = new Date(l.completed_date);
        dayTotals[d.getDay()]++;
      }
    });
    const bestDayIdx = dayTotals.indexOf(Math.max(...dayTotals));
    const bestDay = dayTotals[bestDayIdx] > 0 ? DAY_NAMES[bestDayIdx] : 'No logs yet';

    let mostConsistent = 'None yet';
    let maxStreak = 0;
    habits.forEach(h => {
      const streakVal = streaks[h.id] || 0;
      if (streakVal > maxStreak) {
        maxStreak = streakVal;
        mostConsistent = h.name;
      }
    });
    if (maxStreak === 0 && habits.length > 0) {
      let bestRate = 0;
      habits.forEach(h => {
        const hLogs = activity.filter(l => l.habit_id === h.id && l.completed_date >= thirtyDaysAgoStr && l.status === 'completed');
        if (hLogs.length > bestRate) {
          bestRate = hLogs.length;
          mostConsistent = h.name;
        }
      });
    }

    const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA') })()
    const missedList = [];
    habits.forEach(h => {
      const hasLog = activity.some(l => l.habit_id === h.id && l.completed_date === yesterdayStr);
      if (!hasLog) {
        missedList.push(h.name);
      }
    });
    const missedText = missedList.length > 0 ? missedList.slice(0, 2).join(', ') + (missedList.length > 2 ? '...' : '') : 'None!';

    return {
      bestDay,
      mostConsistent,
      missedYesterday: missedText
    };
  }, [activity, habits, streaks]);

  const loadHabitsAndStreaks = useCallback(async (uid) => {
    try {
      const since365 = (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toLocaleDateString('en-CA') })()
      const [habitsRes, activityRes, streaksRes] = await Promise.all([
        supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('activity_log').select('*').eq('user_id', uid).gte('completed_date', since365),
        supabase.from('user_streaks').select('*').eq('user_id', uid)
      ]);
      if (habitsRes.data) setHabits(habitsRes.data);
      if (activityRes.data) setActivity(activityRes.data);
      const streaksData = streaksRes.data || [];
      const smap = {};
      const lmap = {};
      streaksData.forEach(s => {
        smap[s.habit_id] = s.current_streak;
        lmap[s.habit_id] = s.longest_streak || s.current_streak || 0;
      });
      setStreaks(smap);
      setLongestStreaks(lmap);
      const streakVal = streaksData.reduce((max, s) => Math.max(max, s.current_streak || 0), 0) || 0;
      setBestStreak(streakVal);
    } catch (e) {
      console.error('Error loading habits/streaks:', e);
    }
  }, []);

  const loadGrowthData = useCallback(async (uid) => {
    try {
      const [tasksRes, focusRes, sprintRes, goalsRes] = await Promise.all([
        supabase.from('growth_tasks').select('*, growth_projects(name)').eq('user_id', uid),
        supabase.from('growth_focus_sessions').select('started_at, duration_minutes, session_date').eq('user_id', uid).eq('session_date', today),
        supabase.from('growth_sprints').select('*').eq('user_id', uid).eq('status', 'active').limit(1),
        supabase.from('study_goals').select('*').eq('user_id', uid)
      ]);
      if (tasksRes.data) setTasks(tasksRes.data);
      if (focusRes.data) setFocusSessions(focusRes.data);
      if (sprintRes.data) setSprintData(sprintRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);
    } catch (e) {
      console.error('Error loading growth data:', e);
    }
  }, [today]);

  const loadHealthData = useCallback(async (uid) => {
    try {
      const startOfWeekStr = getStartOfWeekStr();
      const [sleepRes, waterRes, moveRes] = await Promise.all([
        supabase.from('health_sleep_logs').select('*').eq('user_id', uid).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
        supabase.from('health_water_logs').select('*').eq('user_id', uid).eq('log_date', today),
        supabase.from('health_move_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false })
      ]);
      if (sleepRes.data) setSleepLogs(sleepRes.data);
      if (waterRes.data) setWaterLogs(waterRes.data);
      if (moveRes.data) setMoveLogs(moveRes.data);
    } catch (e) {
      console.error('Error loading health data:', e);
    }
  }, [today]);

  const loadWealthData = useCallback(async (uid) => {
    try {
      const [settingsRes, incomeRes, expensesRes, billsRes] = await Promise.all([
        supabase.from('wealth_settings').select('monthly_budget').eq('user_id', uid).maybeSingle(),
        supabase.from('wealth_income').select('amount').eq('user_id', uid),
        supabase.from('money_expenses').select('amount, created_at, note, category, expense_date').eq('user_id', uid),
        supabase.from('wealth_bills').select('*').eq('user_id', uid)
      ]);
      if (settingsRes.data) setExpSettings(settingsRes.data);
      if (incomeRes.data) setIncome(incomeRes.data);
      if (expensesRes.data) setExpenses(expensesRes.data);
      if (billsRes.data) setBills(billsRes.data);
    } catch (e) {
      console.error('Error loading wealth data:', e);
    }
  }, []);

  const loadData = useCallback(async (uid) => {
    console.log('Zenith.jsx: loadData started for uid:', uid);
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single().then(res => { if (res.data) setProfile(res.data); }),
        loadHabitsAndStreaks(uid),
        loadGrowthData(uid),
        loadHealthData(uid),
        loadWealthData(uid),
        getWallet(uid).then(w => { if (w) setWallet(w); }).catch(() => null)
      ]);
      console.log('Zenith.jsx: loadData successful!');
    } catch (e) {
      console.error('Zenith load error:', e);
      setError(e.message);
    } finally {
      console.log('Zenith.jsx: loadData finally block, setting loading to false.');
      setLoading(false);
    }
  }, [loadHabitsAndStreaks, loadGrowthData, loadHealthData, loadWealthData]);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('Zenith.jsx: useEffect checking user auth status...');
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('Zenith.jsx: useEffect auth check completed, user is:', user?.id || null);
      if (user) {
        userRef.current = user;
        setUser(user);
        loadData(user.id);
      } else {
        console.log('Zenith.jsx: user is null, checking if there is a session...');
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('Zenith.jsx: session checked, session user is:', session?.user?.id || null);
          if (session?.user) {
            userRef.current = session.user;
            setUser(session.user);
            loadData(session.user.id);
          } else {
            console.log('Zenith.jsx: No active session. Transitioning loading to false.');
            setLoading(false);
          }
        });
      }
    });

    // Weekly Review — show every Sunday
    const now = new Date();
    if (now.getDay() === 0) {
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
      const alreadySeen = localStorage.getItem(`zyrbit_weekly_review_${weekKey}`);
      if (!alreadySeen) {
        setTimeout(() => setShowWeeklyReview(true), 2000);
      }
    }
  }, [loadData]);

  // Show floating XP popup then auto-dismiss
  const triggerXpPopup = (amount, label) => {
    setXpPopup({ amount, label })
    setTimeout(() => setXpPopup(null), 2000)
  }

  const checkAllDone = async (optimisticActivity) => {
    const currentUser = userRef.current
    if (!currentUser) return;
    const currentCompleted = new Set(optimisticActivity.filter(l => l.completed_date === today && l.status === 'completed').map(l => l.habit_id))
    const allDone = habits.every(h => currentCompleted.has(h.id))
    
    if (allDone && habits.length > 0 && !celebrationShown) {
      setCelebrationShown(true)
      localStorage.setItem('zyrbit_celebration_date', today)
      // Bonus Zyrons for perfect day
      const updatedWallet = await earnZyrons(currentUser.id, 50, 'Perfect Day — all habits done!', 'habits')
      if (updatedWallet) setWallet(updatedWallet)
      triggerXpPopup(50, '+50 ⚡ Perfect Day!')

      // Show reflection first, then celebration
      const q = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)]
      setReflectionQuestion(q)
      setReflectionText('')
      setTimeout(() => setShowReflection(true), 400)
    }
  }

  const handleToggle = useCallback(async (habit) => {
    const currentUser = userRef.current
    if (!currentUser) return
    const completedToday = new Set(
      activity.filter(log => log.completed_date === today && log.status === 'completed').map(l => l.habit_id)
    )
    const isCompleted = completedToday.has(habit.id)

    if (!isCompleted) {
      // Optimistic UI update
      const newLog = { id: 'opt-' + Date.now(), user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed' }
      const nextActivity = [...activity, newLog]
      setActivity(nextActivity)

      const { error } = await supabase.from('activity_log').insert({
        user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'completed'
      })

      if (!error) {
        showToast('✅ Habit logged!', 'success')
        // Award Zyrons
        const updatedWallet = await earnZyrons(currentUser.id, 10, `Completed: ${habit.name}`, 'habits')
        if (updatedWallet) setWallet(updatedWallet)
        triggerXpPopup(10, '+10 ⚡')
        checkAllDone(nextActivity)
        await loadHabitsAndStreaks(currentUser.id)
      } else {
        // Rollback optimistic update
        setActivity(prev => prev.filter(l => l.id !== newLog.id))
        showToast('❌ Failed to log habit. Try again.', 'error')
      }
    } else {
      // Undo completion
      const previousActivity = [...activity]
      setActivity(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === today && l.status === 'completed')))
      const { error } = await supabase.from('activity_log').delete()
        .eq('user_id', currentUser.id).eq('habit_id', habit.id)
        .eq('completed_date', today).eq('status', 'completed')
      
      if (!error) {
        await loadHabitsAndStreaks(currentUser.id)
      } else {
        setActivity(previousActivity)
        showToast('❌ Failed to uncheck habit.', 'error')
      }
    }
  }, [activity, habits, celebrationShown, today, loadHabitsAndStreaks])

  const handleSkip = async (habit) => {
    const currentUser = userRef.current
    if (!currentUser) return
    setSkipTarget(null)
    const { error } = await supabase.from('activity_log').insert({
      user_id: currentUser.id, habit_id: habit.id, completed_date: today, status: 'skipped'
    })
    if (!error) {
      showToast('⏭️ Skipped — stay consistent tomorrow!', 'warning')
      await loadHabitsAndStreaks(currentUser.id)
    } else {
      showToast('❌ Failed to skip habit.', 'error')
    }
  }

  const saveHabit = async () => {
    const currentUser = userRef.current
    if (!form.name.trim() || !currentUser) return
    const color = ZONE_COLORS[form.zone] || '#5EE6F5'
    
    if (editHabit) {
      const { error } = await supabase.from('habits').update({ name: form.name, zone: form.zone, icon: form.icon, frequency: form.frequency, reminder_enabled: form.reminder_enabled, reminder_time: form.reminder_time, color }).eq('id', editHabit.id)
      if (!error) {
        showToast('✅ Habit updated!', 'success')
      } else {
        showToast('❌ Failed to update habit.', 'error')
      }
    } else {
      const { error } = await supabase.from('habits').insert({ user_id: currentUser.id, name: form.name, zone: form.zone, icon: form.icon, frequency: form.frequency, reminder_enabled: form.reminder_enabled, reminder_time: form.reminder_time, color })
      if (!error) {
        showToast('🌱 New habit added!', 'success')
      } else {
        showToast('❌ Failed to add habit.', 'error')
      }
    }
    
    setShowModal(false)
    await loadHabitsAndStreaks(currentUser.id)
  }

  const deleteHabit = useCallback((target) => {
    const activeTarget = target || editHabit
    if (!activeTarget) return
    setDeleteTarget(activeTarget)
  }, [editHabit])

  const confirmDelete = async () => {
    const currentUser = userRef.current
    if (!deleteTarget || !currentUser) return
    const { error } = await supabase.from('habits').delete().eq('id', deleteTarget.id)
    if (!error) {
      setShowModal(false)
      setDeleteTarget(null)
      showToast('🗑️ Habit removed', 'info')
      await loadHabitsAndStreaks(currentUser.id)
    } else {
      showToast('❌ Delete failed. Try again.', 'error')
    }
  }

  const saveReflection = async () => {
    const currentUser = userRef.current
    if (!reflectionText.trim() || !currentUser) return
    try {
      const completedTodayCount = activity.filter(l => l.completed_date === today && l.status === 'completed').length
      const completionPct = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0
      
      const { error } = await supabase.from('orbit_journal').insert({
        user_id: currentUser.id,
        entry_date: today,
        content: reflectionText,
        mood: 'good',
        completion_rate: completionPct,
        streak_count: bestStreak
      })
      
      if (!error) {
        showToast('📝 Daily reflection saved!', 'success')
      } else {
        console.error('Reflection save error:', error)
      }
    } catch (e) {
      console.error(e)
    }
    setShowReflection(false)
    setTimeout(() => setShowCelebration(true), 300)
  }

  const dismissWeeklyReview = () => {
    const now = new Date()
    const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`
    localStorage.setItem(`zyrbit_weekly_review_${weekKey}`, 'seen')
    setShowWeeklyReview(false)
  }

  // ── Toggle priority done ──────────────────────────────────────────────────
  const togglePriority = async (p) => {
    if (p.done || !user) return;
    if (p.type !== 'task') {
      if (p.type === 'health_action') navigate('/health');
      if (p.type === 'wealth_action') navigate('/wealth');
      if (p.type === 'growth_action') navigate('/growth');
      return;
    }
    setCustomPrioritiesDone(prev => ({ ...prev, [p.id]: true }));
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('growth_tasks')
        .update({ status: 'done', completed_at: now })
        .eq('id', p.id);

      if (error) throw error;
      showToast('🎯 Priority complete!', 'success');
      await loadGrowthData(user.id);
    } catch (e) {
      console.error(e);
      showToast('Failed to complete priority', 'error');
      setCustomPrioritiesDone(prev => ({ ...prev, [p.id]: false }));
    }
  };

  // ── Loading & Error states ──────────────────────────────────────────────────
  if (error) {
    return <ErrorState message={error} onRetry={() => loadData(userRef.current?.id || user?.id || profile?.id)} />;
  }

  if (loading) {
    return (
      <div className="app-container" style={{ background: 'var(--bg-root)', minHeight: '100vh', padding: 'var(--space-32) var(--space-24) 120px', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-24)' }}>
        {/* Header Skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', width: '60%' }}>
            <div className="skeleton-box" style={{ height: '10px', width: '40%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '100%' }} />
          </div>
          <div className="skeleton-box" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        </div>

        {/* OS Score & Briefing Skeleton */}
        <div style={{ display: 'flex', gap: 'var(--space-16)', height: '120px' }}>
          <div className="skeleton-box" style={{ flex: '0 0 112px', borderRadius: 'var(--radius-card)' }} />
          <div className="skeleton-box" style={{ flex: 1, borderRadius: 'var(--radius-card)' }} />
        </div>

        {/* Telemetry Skeleton */}
        <div className="skeleton-box" style={{ height: '150px', borderRadius: 'var(--radius-card)' }} />

        {/* Today's Habits Skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-12)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton-box" style={{ height: '12px', width: '30%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '20%', borderRadius: 'var(--radius-button)' }} />
          </div>
          <div className="skeleton-box" style={{ height: '80px', borderRadius: '20px' }} />
          <div className="skeleton-box" style={{ height: '80px', borderRadius: '20px' }} />
        </div>
      </div>
    );
  }

  // ── Greeting ──────────────────────────────────────────────────────────────
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = profile?.username || profile?.full_name || 'Commander';

  // Recommendations for briefing box
  let healthAction = "Physical indicators stable. Maintain status.";
  if (ctx.water < 2000) {
    healthAction = "Hydrate: Drink 500ml water to restore capacity.";
  } else if (ctx.sleepDebt > 2.0) {
    healthAction = "Prioritize a 8-hour sleep window tonight.";
  } else {
    healthAction = "Execute a 15-minute active recovery walk.";
  }

  let growthAction = "Growth targets nominal. Focus when ready.";
  if (ctx.overdueTasksCount > 0) {
    growthAction = "Resolve oldest overdue task.";
  } else if (ctx.sprintActive && (ctx.sprintLoggedToDate < ctx.sprintTargetToDate)) {
    growthAction = "Log focus session to meet daily sprint target.";
  } else if (ctx.totalTasks > ctx.completedTasks) {
    growthAction = "Complete your high-priority growth tasks.";
  }

  // Quick stat cards for the dashboard
  const statCards = [
    { label: 'FOCUS', value: `${ctx.focusHours}h`, icon: '🎯', color: 'var(--color-accent)' },
    { label: 'SLEEP', value: `${ctx.sleep}h`, icon: '🌙', color: '#8B5CF6' },
    { label: 'WATER', value: `${(ctx.water/1000).toFixed(1)}L`, icon: '💧', color: 'var(--color-accent-cyan)' },
  ];

  return (
    <div className="app-container page-enter" style={{ background: 'var(--bg-root)', minHeight: '100vh', color: 'var(--text-primary)', position: 'relative' }}>

      {/* XP POPUP */}
      {xpPopup && (
        <div style={{
          position: 'fixed', bottom: 170, right: 24, zIndex: 9999,
          background: 'var(--bg-elevated)', border: `1px solid var(--color-accent)`,
          borderRadius: 'var(--radius-badge)', padding: 'var(--space-8) var(--space-16)',
          fontSize: 'var(--fs-sm)', fontWeight: 900, color: 'var(--color-accent)',
          boxShadow: `0 0 20px var(--color-accent-glow)`,
          animation: 'fadeUp 0.3s ease both',
          pointerEvents: 'none'
        }}>
          {xpPopup.label}
        </div>
      )}

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding: 'var(--space-32) var(--space-24) 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '2.5px', marginBottom: 'var(--space-8)', opacity: 0.8 }}>ZENITH · COMMAND CENTER</div>
          <h1 style={{ fontSize: 'var(--fs-xxl)', fontWeight: 900, lineHeight: 1.15, margin: 0 }}>
            <span style={{ color: 'var(--text-primary)' }}>{greeting},</span><br />
            <span style={{ background: `linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{name}.</span>
          </h1>
        </div>
        <div
          onClick={() => navigate('/profile')}
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'var(--bg-card)', border: `1.5px solid var(--border-primary)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', flexShrink: 0, marginTop: 'var(--space-4)',
            boxShadow: `0 4px 16px rgba(0,0,0,0.3)`,
            transition: 'border-color 0.3s, box-shadow 0.3s',
          }}
        >
          {profile?.avatar_url
            ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="avatar" />
            : <span style={{ fontSize: '18px' }}>👤</span>
          }
        </div>
      </div>

      {/* ── ALERTS WARNING SYSTEM ──────────────────────────────────────── */}
      {(() => {
        const warnings = [];
        if (recoveryScore < 50) warnings.push(`Capacity Alert: Recovery depleted (${recoveryScore}%). Rest protocol enforced.`);
        if (ctx.runwayMonths < 3.0) warnings.push(`Runway Alert: ${ctx.runwayMonths.toFixed(1)} months remaining. Freeze discretionary spend.`);
        if (ctx.spent > ctx.limit * 30) warnings.push("Budget Cap Exceeded: Monthly limit crossed.");
        
        if (warnings.length === 0) return null;
        
        return (
          <div style={{ padding: '0 var(--space-24)', display: 'flex', flexDirection: 'column', gap: 'var(--space-8)', marginTop: 'var(--space-16)' }}>
            <div style={{
              padding: 'var(--space-12) var(--space-16)', background: 'var(--color-error-dim)',
              border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-inner)',
              borderLeft: '4px solid var(--color-error)',
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-8)',
              animation: 'pageEnter 0.3s ease forwards',
            }}>
              <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
              <div style={{ fontSize: 'var(--fs-xs)', color: '#F87171', fontWeight: 700, lineHeight: 1.45 }}>
                {warnings.map((w, idx) => <div key={idx}>{w}</div>)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── OS SCORE RING + BRIEFING ────────────────────────────────────── */}
      <div style={{ padding: 'var(--space-24) var(--space-24) 0', display: 'flex', gap: 'var(--space-16)', alignItems: 'stretch' }}>

        {/* Score Ring */}
        <div style={{
          flex: '0 0 112px', height: '112px',
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          borderLeft: `4px solid var(--color-accent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          boxShadow: `0 8px 32px var(--color-accent-glow), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}>
          <GravityRing score={osScore} size={84} />
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: 'var(--fs-xl)', fontWeight: 900, lineHeight: 1,
              background: `linear-gradient(135deg, #fff 0%, var(--color-accent) 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{osScore}</span>
            <span style={{ fontSize: '7px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1.5px', marginTop: '3px' }}>DEX INDEX</span>
          </div>
        </div>

        {/* Briefing Card */}
        <div style={{
          flex: 1,
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          borderLeft: `4px solid var(--color-accent-cyan)`,
          padding: 'var(--space-16)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-8)',
          boxShadow: `0 8px 32px var(--color-accent-cyan-glow), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '8px', color: 'var(--color-accent-cyan)', fontWeight: 800, letterSpacing: '1.5px' }}>DEXOS BRIEFING</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', boxShadow: `0 0 6px var(--color-success)`, animation: 'glowPulse 2s ease-in-out infinite' }} />
          </div>
          <p style={{ fontSize: 'var(--fs-xs)', lineHeight: 1.55, color: 'var(--text-secondary)', margin: 0 }}>{aiBriefing}</p>
        </div>
      </div>

      {/* ── TELEMETRY BREAKDOWN & STREAKS ────────────────────────────────── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0' }}>
        <div style={{
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          padding: 'var(--space-16) var(--space-24)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-16)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>OS TELEMETRY BREAKDOWN</span>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <span className="badge badge-success">
                🏆 {winsCount} {winsCount === 1 ? 'WIN' : 'WINS'} TODAY
              </span>
              <span className="badge badge-warning">
                🔥 {bestStreak} DAY STREAK
              </span>
            </div>
          </div>

          {/* Breakdown bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {/* Growth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
                <span style={{ color: 'var(--text-primary)' }}>🚀 Growth Engine</span>
                <span style={{ color: 'var(--text-secondary)' }}>{osBreakdown.growth} / 40</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-primary)', borderRadius: 'var(--radius-badge)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.growth / 40) * 100}%`, background: `linear-gradient(90deg, var(--color-accent), var(--color-accent-cyan))`, borderRadius: 'var(--radius-badge)' }} />
              </div>
            </div>

            {/* Health */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
                <span style={{ color: 'var(--text-primary)' }}>❤️ Bio telemetry</span>
                <span style={{ color: 'var(--text-secondary)' }}>{osBreakdown.health} / 30</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-primary)', borderRadius: 'var(--radius-badge)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.health / 30) * 100}%`, background: 'var(--color-success)', borderRadius: 'var(--radius-badge)' }} />
              </div>
            </div>

            {/* Wealth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', fontWeight: 800, marginBottom: 'var(--space-4)' }}>
                <span style={{ color: 'var(--text-primary)' }}>💰 Capital runway</span>
                <span style={{ color: 'var(--text-secondary)' }}>{osBreakdown.wealth} / 30</span>
              </div>
              <div style={{ height: '6px', background: 'var(--border-primary)', borderRadius: 'var(--radius-badge)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.wealth / 30) * 100}%`, background: 'var(--color-warning)', borderRadius: 'var(--radius-badge)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ROW ────────────────────────────────────────────── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-8)' }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg-card)', borderRadius: 'var(--radius-inner)', border: `1px solid var(--border-primary)`,
            padding: 'var(--space-16) var(--space-8)', textAlign: 'center',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ fontSize: '14px', marginBottom: 'var(--space-4)' }}>{s.icon}</div>
            <div style={{ fontSize: 'var(--fs-base)', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '7px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginTop: 'var(--space-4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── STREAK SHIELD ── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0' }}>
        <StreakShield user={user} habits={habits} activity={activity} streaks={streaks} />
      </div>

      {/* ── TODAY'S HABITS CHECKLIST ── */}
      <div style={{ padding: 'var(--space-24) var(--space-24) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Daily Habits</span>
          <button 
            onClick={() => { setEditHabit(null); setForm({ name:'', zone:'mind', icon:'🌱', frequency:'daily', reminder_enabled: false, reminder_time: '' }); setShowModal(true); }}
            style={{ 
              background: 'transparent', border: `1px solid var(--color-accent-cyan)`, color: 'var(--color-accent-cyan)', 
              padding: 'var(--space-8) var(--space-16)', borderRadius: 'var(--radius-button)', fontSize: '9px', fontWeight: 800, 
              cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', letterSpacing: '0.5px' 
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `var(--color-accent-cyan-dim)`; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            + Add Habit
          </button>
        </div>

        {/* ZONE FILTERS */}
        <div style={{ marginBottom: 'var(--space-16)' }}>
          <ZoneTab active={activeZone} onChange={setActiveZone} />
        </div>

        {/* HABITS LIST */}
        {(() => {
          const filteredHabits = activeZone === 'all' ? habits : habits.filter(h => h.zone === activeZone)
          if (filteredHabits.length === 0) {
            return (
              <div className="empty-state">
                <div className="empty-state-emoji">🌱</div>
                <div className="empty-state-title">No habits in this domain.</div>
                <div className="empty-state-subtitle">Add a target to begin.</div>
              </div>
            )
          }

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              {filteredHabits.map((habit, index) => {
                const completedToday = new Set(
                  activity.filter(log => log.completed_date === today && log.status === 'completed').map(l => l.habit_id)
                )
                const done = completedToday.has(habit.id)

                // Compute monthly score for this habit
                const habitLogs = activity.filter(log => log.habit_id === habit.id)
                const thirtyDaysAgoStr = (() => { const d = new Date(); d.setDate(d.getDate() - 29); return d.toLocaleDateString('en-CA') })()
                const monthlyDone = habitLogs.filter(l => l.completed_date >= thirtyDaysAgoStr && l.status === 'completed').length
                const monthlyScore = Math.round((monthlyDone / 30) * 100)

                return (
                  <div key={habit.id} style={{ opacity: done ? 0.62 : 1, transition: 'opacity 0.3s' }}>
                    <HabitCard
                      habit={habit}
                      logs={habitLogs}
                      streak={streaks[habit.id] || 0}
                      longestStreak={longestStreaks[habit.id] || 0}
                      monthlyScore={monthlyScore}
                      isCompleted={done}
                      onToggle={handleToggle}
                      onLongPress={setSkipTarget}
                      onDelete={deleteHabit}
                      onStats={() => showToast('Open habit history', 'info')}
                      onEdit={(h) => { setEditHabit(habit); setForm({ name: habit.name, zone: habit.zone, icon: habit.icon||'🌱', frequency: habit.frequency||'daily', reminder_enabled: habit.reminder_enabled||false, reminder_time: habit.reminder_time||'' }); setShowModal(true) }}
                    />
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      {/* ── CONSISTENCY HEATMAP ── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0' }}>
        <div style={{
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          padding: 'var(--space-20) var(--space-24)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
          <span style={{ fontSize: '9px', color: 'var(--color-accent-cyan)', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase', display: 'block', marginBottom: 'var(--space-16)' }}>Yearly Consistency Map</span>
          <HeatmapGrid color="var(--color-accent-cyan)" dataMap={yearlyCompletionsMap} days={365} />
        </div>
      </div>

      {/* ── STREAK SUMMARY & INSIGHTS ── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0' }}>
        <div style={{
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          padding: 'var(--space-20) var(--space-24)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-16)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>Streak Summary</span>
            <span className="badge badge-warning">🔥 {bestStreak} Day Streak</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-12)' }}>
            <div style={{ background: 'var(--bg-root)', padding: 'var(--space-12)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 900, color: 'var(--color-warning)' }}>{bestStreak}d</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginTop: '2px', textTransform: 'uppercase' }}>Best Streak</div>
            </div>
            <div style={{ background: 'var(--bg-root)', padding: 'var(--space-12)', borderRadius: 'var(--radius-inner)', border: '1px solid var(--border-primary)', textAlign: 'center' }}>
              <div style={{ fontSize: 'var(--fs-base)', fontWeight: 900, color: 'var(--color-accent-cyan)' }}>{habits.filter(h => streaks[h.id] > 0).length}</div>
              <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', marginTop: '2px', textTransform: 'uppercase' }}>Active Streaks</div>
            </div>
          </div>

          {/* Habit Insights */}
          <div style={{ borderTop: '1px solid var(--border-primary)', paddingTop: 'var(--space-12)' }}>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 'var(--space-8)' }}>HABIT INSIGHTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>🏆 Most Consistent:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-accent-cyan)', textAlign: 'right' }}>{habitInsights.mostConsistent}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>⚡ Best Day:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-accent)', textAlign: 'right' }}>{habitInsights.bestDay}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>⚠️ Missed Yesterday:</span>
                <span style={{ fontWeight: 700, color: habitInsights.missedYesterday !== 'None!' ? 'var(--color-error)' : 'var(--color-success)', textAlign: 'right' }}>{habitInsights.missedYesterday}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WEEKLY PROGRESS ── */}
      <div style={{ padding: 'var(--space-16) var(--space-24) 0' }}>
        <div style={{
          background: `linear-gradient(145deg, var(--bg-card) 0%, var(--bg-elevated) 100%)`,
          borderRadius: 'var(--radius-card)', border: `1px solid var(--border-primary)`,
          padding: 'var(--space-20) var(--space-24)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-12)' }}>
            <span style={{ fontSize: '9px', color: 'var(--color-success)', fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>Weekly Progress</span>
            <span className="badge badge-success">{weeklyCompletionScore}% completion</span>
          </div>
          <div style={{ height: '8px', background: 'var(--border-primary)', borderRadius: 'var(--radius-badge)', overflow: 'hidden', marginBottom: 'var(--space-8)' }}>
            <div style={{ height: '100%', width: `${weeklyCompletionScore}%`, background: 'var(--color-success)', borderRadius: 'var(--radius-badge)', transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            You completed {weeklyCompletionScore}% of your target habit tasks in the last 7 cycles. Keep it up!
          </div>
        </div>
      </div>

      {/* ── TOP 3 PRIORITIES ───────────────────────────────────────────── */}
      <div style={{ padding: 'var(--space-24) var(--space-24) 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
          <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Top Priorities</span>
          <span style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800 }}>{priorities.filter(p=>p.done).length}/{priorities.length}</span>
        </div>

        {priorities.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-emoji">🎯</div>
            <div className="empty-state-title">No priorities active today.</div>
            <div className="empty-state-subtitle">Maintain steady focus.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
            {priorities.map((p, idx) => (
              <div
                key={p.id}
                id={`priority-item-${idx}`}
                onClick={() => togglePriority(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: p.done ? 'var(--color-success-dim)' : 'var(--bg-card)',
                  border: `1px solid ${p.done ? 'rgba(16, 185, 129, 0.25)' : 'var(--border-primary)'}`,
                  borderLeft: p.done ? '4px solid var(--color-success)' : '4px solid var(--border-primary)',
                  padding: 'var(--space-16)', borderRadius: 'var(--radius-inner)',
                  cursor: p.done ? 'default' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: p.done ? `0 4px 16px rgba(16, 185, 129, 0.1)` : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: 'var(--space-16)', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: 'var(--radius-button)', flexShrink: 0,
                    background: p.done ? 'var(--color-success-dim)' : 'var(--color-accent-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '14px' }}>{p.done ? '✅' : '🎯'}</span>
                  </div>
                  <span style={{
                    fontSize: 'var(--fs-sm)', fontWeight: 700,
                    color: p.done ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: p.done ? 'line-through' : 'none',
                    transition: 'all 0.25s ease',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</span>
                </div>
                {p.type === 'task' ? (
                  <CheckCircle2 size={20} style={{ color: p.done ? 'var(--color-success)' : 'var(--border-primary)', transition: 'color 0.25s ease', flexShrink: 0 }} />
                ) : (
                  <span className="badge badge-accent">GO ➔</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── UNIFIED TIMELINE ───────────────────────────────────────────── */}
      <div style={{ padding: 'var(--space-24) var(--space-24) 120px' }}>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Today's Timeline</span>

        {timeline.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 'var(--space-16)' }}>
            <div className="empty-state-emoji">📊</div>
            <div className="empty-state-title">Timeline awaiting entries.</div>
            <div className="empty-state-subtitle">Start logging to see your day unfold.</div>
          </div>
        ) : (
          <div style={{ marginTop: 'var(--space-16)', display: 'flex', flexDirection: 'column', gap: '0', borderLeft: `2px solid var(--border-primary)`, marginLeft: '7px', paddingLeft: 'var(--space-16)' }}>
            {timeline.map((item, idx) => (
              <div key={idx} style={{ position: 'relative', paddingBottom: 'var(--space-24)' }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: '-23px', top: '4px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: nodeColor[item.type] || 'var(--text-muted)',
                  border: `2.5px solid var(--bg-root)`,
                  boxShadow: `0 0 8px ${nodeColor[item.type] || 'var(--text-muted)'}60`,
                }} />
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 'var(--space-4)', letterSpacing: '0.5px' }}>{item.time}</div>
                <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.4 }}>{item.text}</div>
              </div>
            ))}
            {/* "now" marker */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '-23px', top: '3px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--color-accent)', border: `2.5px solid var(--bg-root)`,
                boxShadow: `0 0 12px var(--color-accent)`,
                animation: 'glowPulse 2s ease-in-out infinite',
              }} />
              <div style={{ fontSize: '9px', color: 'var(--color-accent)', fontWeight: 800, letterSpacing: '2px' }}>NOW</div>
            </div>
          </div>
        )}
      </div>

      {/* DAILY REFLECTION POPUP */}
      {showReflection && (
        <div className="modal-overlay" style={{ background: '#000000B0', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div style={{
            background: 'linear-gradient(135deg, #0D0D18, #111128)',
            border: `1px solid var(--color-accent-dim)`,
            borderRadius: 'var(--radius-card)', padding: 'var(--space-32) var(--space-24)',
            textAlign: 'center', animation: 'scaleIn 0.4s ease',
            maxWidth: '320px', width: '90%'
          }}>
            <div style={{ fontSize: '40px', marginBottom: 'var(--space-16)' }}>✏️</div>
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 800, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 'var(--space-8)' }}>Daily Reflection</div>
            <div style={{ fontSize: 'var(--fs-md)', fontWeight: 700, color: '#FFF', lineHeight: 1.5, marginBottom: 'var(--space-24)' }}>{reflectionQuestion}</div>
            <textarea
              autoFocus
              value={reflectionText}
              onChange={e => setReflectionText(e.target.value)}
              placeholder="Type something short..."
              rows={3}
              style={{
                width: '100%', background: '#0A0A12', border: `1px solid var(--border-primary)`,
                borderRadius: 'var(--radius-inner)', padding: 'var(--space-16)', color: '#FFF', fontSize: 'var(--fs-sm)',
                resize: 'none', outline: 'none', fontFamily: 'inherit', marginBottom: 'var(--space-16)',
                boxSizing: 'border-box', lineHeight: 1.5
              }}
            />
            <button
              onClick={saveReflection}
              className="btn-primary"
              style={{ width: '100%', marginBottom: 'var(--space-8)' }}
            >
              Save & Continue 🚀
            </button>
            <button
              onClick={() => { setShowReflection(false); setTimeout(() => setShowCelebration(true), 300) }}
              className="btn-ghost"
              style={{ border: 'none', background: 'transparent', fontSize: 'var(--fs-xs)', width: '100%' }}
            >
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* PERFECT DAY CELEBRATION */}
      {showCelebration && (
        <div className="modal-overlay" style={{ background: '#000000B0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div style={{ background: 'var(--bg-card)', border: `1px solid var(--color-accent-cyan-dim)`, borderRadius: 'var(--radius-card)', padding: 'var(--space-24)', textAlign: 'center', animation: 'scaleIn 0.5s ease', maxWidth: '300px' }}>
            <div style={{ fontSize: '52px', marginBottom: 'var(--space-8)' }}>🏆</div>
            <div style={{ fontSize: 'var(--fs-xl)', color: 'var(--color-accent-cyan)', fontWeight: 900, marginBottom: 'var(--space-4)' }}>Perfect Day!</div>
            <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-24)' }}>All habits completed today!</div>
            
            <div style={{ display: 'flex', gap: 'var(--space-8)', justifyContent: 'center', marginBottom: 'var(--space-24)' }}>
              <span className="badge badge-cyan">💫 Perfect Day</span>
              <span className="badge badge-success">{habits.length}/{habits.length} Done ✅</span>
            </div>

            <button onClick={() => setShowCelebration(false)} className="btn-primary" style={{ width: '100%' }}>Keep Going 🚀</button>
          </div>
        </div>
      )}

      {/* SKIP DIALOG */}
      {skipTarget && (
        <div className="modal-overlay" onClick={() => setSkipTarget(null)} style={{ background: '#000000B0', zIndex: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div className="animate-slideUpModal" style={{ background: 'var(--bg-card)', borderTop: `1px solid var(--border-primary)`, borderRadius: '24px 24px 0 0', padding: 'var(--space-24)', width: '100%', maxWidth: '430px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-16)' }}>Skip today?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 'var(--space-24)' }}>"{skipTarget.name}" — skipping won't break your streak today, but honesty maintains gravity.</p>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setSkipTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--color-warning)' }} onClick={() => handleSkip(skipTarget)}>Skip Today</button>
            </div>
          </div>
        </div>
      )}

      {/* HABIT MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)} style={{ background: '#000000B0', zIndex: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div className="animate-slideUpModal" style={{ background: 'var(--bg-card)', borderTop: `1px solid var(--border-primary)`, borderRadius: '24px 24px 0 0', padding: 'var(--space-24)', width: '100%', maxWidth: '430px', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-24)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 'var(--fs-lg)' }}>{editHabit ? 'Edit Habit' : 'New Habit'}</h3>
              <div onClick={() => setShowModal(false)} style={{ color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>×</div>
            </div>

            <div style={{ marginBottom: 'var(--space-24)' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-8)', letterSpacing: '1px' }}>HABIT NAME</label>
              <input 
                autoFocus 
                placeholder="e.g., Read 10 pages" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="input"
              />
            </div>

            <div style={{ marginBottom: 'var(--space-24)' }}>
               <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-8)', letterSpacing: '1px' }}>ZONE</label>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)' }}>
                 {Object.entries({ mind: '🧠 Mind', body: '💪 Body', growth: '🌱 Growth', soul: '🔮 Soul' }).map(([k, v]) => (
                   <div 
                     key={k} 
                     onClick={() => setForm({...form, zone: k})} 
                     style={{ 
                       padding: 'var(--space-16)', borderRadius: 'var(--radius-button)', 
                       border: form.zone === k ? `1px solid ${ZONE_COLORS[k]}` : `1px solid var(--border-primary)`, 
                       background: form.zone === k ? `${ZONE_COLORS[k]}10` : 'var(--bg-elevated)', 
                       color: form.zone === k ? ZONE_COLORS[k] : 'var(--text-muted)', 
                       textAlign: 'center', cursor: 'pointer', fontSize: 'var(--fs-sm)', fontWeight: 600, transition: 'all 0.2s' 
                     }}
                   >
                     {v}
                   </div>
                 ))}
               </div>
            </div>

            <div style={{ marginBottom: 'var(--space-24)' }}>
              <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', display: 'block', marginBottom: 'var(--space-8)', letterSpacing: '1px' }}>ICON</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-8)', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                {['💧','🏃','📖','🧘','✍️','😴','💪','🔥','⭐','🎯','🌱','💡','🎨','🎵','🧠','❤️','🙏','💰','📚','🤝','🌊','☀️','🍎','🚴','🏋️'].map(e => (
                  <div 
                     key={e} 
                     onClick={() => setForm({...form, icon: e})}
                     style={{
                       display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40px', borderRadius: '10px',
                       background: form.icon === e ? `var(--color-accent-dim)` : 'var(--bg-elevated)',
                       border: form.icon === e ? `1.5px solid var(--color-accent)` : `1px solid var(--border-primary)`,
                       fontSize: '20px', cursor: 'pointer', transition: 'all 0.2s'
                     }}
                  >
                    {e}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-24)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16)' }}>
                <label style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>SET REMINDER TIME</label>
                <div 
                  style={{ 
                    width: '40px', height: '24px', 
                    background: form.reminder_enabled ? 'var(--color-accent-cyan)' : 'var(--border-primary)', 
                    borderRadius: '100px', position: 'relative', cursor: 'pointer', transition: '0.2s' 
                  }} 
                  onClick={() => setForm({...form, reminder_enabled: !form.reminder_enabled})}
                >
                  <div style={{ position: 'absolute', top: '2px', left: form.reminder_enabled ? '18px' : '2px', width: '20px', height: '20px', background: '#fff', borderRadius: '50%', transition: '0.2s', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
              {form.reminder_enabled && (
                <input 
                  type="time" 
                  value={form.reminder_time || ''} 
                  onChange={e => setForm({...form, reminder_time: e.target.value})} 
                  className="input"
                />
              )}
            </div>

            <button 
              onClick={saveHabit}
              className="btn-primary"
              style={{ width: '100%', marginBottom: 'var(--space-8)' }}
            >
              {editHabit ? 'Save Changes' : 'Add Habit ✓'}
            </button>
            {editHabit && (
              <button 
                onClick={() => deleteHabit()}
                className="btn-ghost"
                style={{ width: '100%', color: 'var(--color-error)' }}
              >
                Delete Habit
              </button>
            )}
          </div>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)} style={{ background: '#000000B0', zIndex: 220, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div className="animate-slideUpModal" style={{ background: 'var(--bg-card)', borderTop: `1px solid var(--border-primary)`, borderRadius: '24px 24px 0 0', padding: 'var(--space-24)', width: '100%', maxWidth: '430px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: 'var(--fs-lg)', marginBottom: 'var(--space-16)' }}>Delete Habit?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-sm)', lineHeight: 1.6, marginBottom: 'var(--space-24)' }}>"{deleteTarget.name}" will be permanently removed along with all its history.</p>
            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: 'var(--color-error)' }} onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* WEEKLY REVIEW MODAL */}
      {showWeeklyReview && (
        <div className="modal-overlay" style={{ background: '#000000D0', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div style={{
            background: 'var(--bg-card)',
            border: `1px solid var(--color-accent-dim)`, borderRadius: 'var(--radius-card)',
            padding: 'var(--space-32) var(--space-24)', maxWidth: '340px', width: '92%',
            animation: 'scaleIn 0.4s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-24)' }}>
              <div style={{ fontSize: '42px', marginBottom: 'var(--space-8)' }}>📊</div>
              <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: '#FFF', marginBottom: 'var(--space-4)' }}>Week Wrapped</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Your weekly report</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-8)', marginBottom: 'var(--space-24)' }}>
              {[
                { label: 'Completions', value: activity.filter(l => {
                  const thisWeekDates = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(); d.setDate(d.getDate() - (6 - i))
                    return d.toLocaleDateString('en-CA')
                  })
                  return thisWeekDates.includes(l.completed_date) && l.status === 'completed'
                }).length, color: 'var(--color-accent-cyan)', icon: '✅' },
                { label: 'Best Streak', value: `${bestStreak}d`, color: 'var(--color-warning)', icon: '🔥' },
                { label: 'Gravity', value: osScore, color: 'var(--color-accent)', icon: '⚡' },
              ].map((s, i) => (
                <div key={i} style={{ background: 'var(--bg-elevated)', border: `1px solid var(--border-primary)`, borderRadius: 'var(--radius-inner)', padding: 'var(--space-16)', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: 'var(--space-4)' }}>{s.icon}</div>
                  <div style={{ fontSize: 'var(--fs-lg)', fontWeight: 900, color: s.color, marginBottom: '2px' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-8)' }}>
              <button
                onClick={() => {
                  const weekComps = activity.filter(l => {
                    const thisWeekDates = Array.from({ length: 7 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - (6 - i))
                      return d.toLocaleDateString('en-CA')
                    })
                    return thisWeekDates.includes(l.completed_date) && l.status === 'completed'
                  }).length
                  const text = `🏆 My Zyrbit Week Wrapped!\n✅ ${weekComps} habits done\n🔥 ${bestStreak} day streak\n⚡ DEX Index: ${osScore}\n\nBuilding habits, one day at a time. #Zyrbit`
                  if (navigator.share) navigator.share({ text }).catch(() => {})
                  else { navigator.clipboard.writeText(text); showToast('📋 Copied to clipboard!', 'success') }
                }}
                className="btn-primary"
                style={{ flex: 1 }}
              >
                Share 📤
              </button>
              <button
                onClick={dismissWeeklyReview}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="zenith" onTabChange={(t) => navigate(`/${t}`)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

