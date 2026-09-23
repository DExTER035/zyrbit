/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';
import { CheckCircle2 } from 'lucide-react';
import HabitCard from '../../components/domain/zenith/HabitCard.jsx';
import ZoneTab from '../../components/domain/zenith/ZoneTab.jsx';
import HeatmapGrid from '../../components/common/HeatmapGrid.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { computeHabitImpact } from '../../engines/zenith/index.js';
import {
  toggleHabit as serviceToggleHabit,
  skipHabit as serviceSkipHabit,
  createHabit as serviceCreateHabit,
  updateHabit as serviceUpdateHabit,
  deleteHabit as serviceDeleteHabit,
  submitDailyReflection as serviceSubmitDailyReflection,
} from '../../services/habitService.js';
import { completeTask as serviceCompleteTask } from '../../services/growthService.js';

const ZONE_OPTIONS = [
  { id: 'mind', label: 'Mind', icon: '🧠' },
  { id: 'body', label: 'Body', icon: '⚡' },
  { id: 'growth', label: 'Growth', icon: '🌱' },
  { id: 'soul', label: 'Soul', icon: '🌌' },
];

const QUICK_ICONS = ['🌱', '⚡', '🧠', '🌌', '💧', '🏃', '📚', '🧘', '🎯', '💤'];

// ─── colour tokens (Zenith Premium palette) ─────────────────────────────────
const C = {
  bg:        '#0B0D0F',
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
      name: `Rest day — focus on sleep and water (${recoveryScore}% recovery)`,
      pScore: 95,
      type: 'health_action'
    });
  }

  if (monthlyBudgetExceeded) {
    candidates.push({
      id: 'discretionary_freeze',
      name: 'Monthly budget reached — slow down spending today',
      pScore: 90,
      type: 'wealth_action'
    });
  }

  const sprintDeficit = sprintActive ? Math.max(0, (sprintDailyTarget || 90) - focusMins) : 0;
  if (sprintActive && sprintDeficit > 0) {
    candidates.push({
      id: 'sprint_deficit',
      name: `Log ${sprintDeficit}m of focus to stay on sprint track`,
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
      name: `${t.name} — overdue${daysOverdue > 1 ? ` ${daysOverdue}d` : ''}`,
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
      name: t.name,
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
  const [foodLogs, setFoodLogs] = useState([]);   // today's meal_logs

  // Habits State
  const [habits, setHabits] = useState([]);
  const [activity, setActivity] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [longestStreaks, setLongestStreaks] = useState({});
  const [activeZone, setActiveZone] = useState('all');
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

  // Submission Locks
  const [submittingHabits, setSubmittingHabits] = useState({});
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

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
    
    const lastFocusSession = focusSessions.length > 0 ? focusSessions[focusSessions.length - 1] : null;
    const lastFocusTopic = lastFocusSession?.notes || (focusSessions.length > 0 ? 'Deep Work' : 'No focus today');
    const lastFocusMins = Math.round(focusMins);
    const runwayDays = runwayMonths >= 99 ? 9999 : Math.max(0, Math.round(runwayMonths * 30));

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
      runwayDays,
      lastFocusTopic,
      lastFocusMins,
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

  const oneInsight = React.useMemo(() => {
    if (recoveryScore >= 80) {
      return "Your recovery is high today. It's a great day for deep work.";
    } else if (recoveryScore >= 50) {
      return "Steady recovery today. Maintain focus on your main priority.";
    } else {
      return "Your capacity is low today. Prioritize rest and active recovery.";
    }
  }, [recoveryScore]);

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

  // ── Food totals for today ──────────────────────────────────────────────────
  const foodTotals = React.useMemo(() => ({
    calories: Math.round(foodLogs.reduce((s, l) => s + (l.calories || 0), 0)),
    protein:  Math.round(foodLogs.reduce((s, l) => s + (l.protein  || 0), 0)),
    carbs:    Math.round(foodLogs.reduce((s, l) => s + (l.carbs    || 0), 0)),
    fat:      Math.round(foodLogs.reduce((s, l) => s + (l.fat      || 0), 0)),
    meals:    foodLogs.length,
  }), [foodLogs]);

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

    foodLogs.forEach(l => {
      rawEvents.push({
        ts: new Date(l.created_at || today + 'T12:30:00').getTime(),
        type: 'food',
        text: `${l.meal_type ? l.meal_type.charAt(0).toUpperCase() + l.meal_type.slice(1) : 'Meal'}: ${l.food_name} — ${Math.round(l.calories || 0)} kcal`
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
  }, [activity, habits, tasks, sleepLogs, waterLogs, moveLogs, focusSessions, expenses, foodLogs, today]);

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

  const dailyMetrics = React.useMemo(() => {
    const map = {};
    focusSessions.forEach(f => {
      if (f.session_date) {
        map[f.session_date] = (map[f.session_date] || 0) + (f.duration_minutes || 0);
      }
    });
    return Object.keys(map).map(dateStr => ({
      log_date: dateStr,
      focus_minutes: map[dateStr],
      os_score: osScore,
    }));
  }, [focusSessions, osScore]);

  const habitImpacts = React.useMemo(() => {
    const res = {};
    habits.forEach(h => {
      res[h.id] = computeHabitImpact(h.id, activity, dailyMetrics);
    });
    return res;
  }, [habits, activity, dailyMetrics]);

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
    const since365 = (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toLocaleDateString('en-CA') })()
    const results = await Promise.allSettled([
      supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
      supabase.from('activity_log').select('*').eq('user_id', uid).gte('completed_date', since365),
      supabase.from('user_streaks').select('*').eq('user_id', uid)
    ]);

    const habitsRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
    const activityRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
    const streaksRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

    setHabits(habitsRes?.data || []);
    setActivity(activityRes?.data || []);

    const streaksData = streaksRes?.data || [];
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
  }, []);

  const loadGrowthData = useCallback(async (uid) => {
    const results = await Promise.allSettled([
      supabase.from('growth_tasks').select('*, growth_projects(name)').eq('user_id', uid),
      supabase.from('growth_focus_sessions').select('started_at, duration_minutes, session_date').eq('user_id', uid).eq('session_date', today),
      supabase.from('growth_sprints').select('*').eq('user_id', uid).eq('status', 'active').limit(1),
      supabase.from('study_goals').select('*').eq('user_id', uid)
    ]);

    const tasksRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
    const focusRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
    const sprintRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
    const goalsRes = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

    setTasks(tasksRes?.data || []);
    setFocusSessions(focusRes?.data || []);
    setSprintData(sprintRes?.data || []);
    setGoals(goalsRes?.data || []);
  }, [today]);

  const loadHealthData = useCallback(async (uid) => {
    const startOfWeekStr = getStartOfWeekStr();
    const results = await Promise.allSettled([
      supabase.from('health_sleep_logs').select('*').eq('user_id', uid).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
      supabase.from('health_water_logs').select('*').eq('user_id', uid).eq('log_date', today),
      supabase.from('health_move_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false })
    ]);

    const sleepRes = results[0].status === 'fulfilled' ? results[0].value : { data: [] };
    const waterRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
    const moveRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };

    setSleepLogs(sleepRes?.data || []);
    setWaterLogs(waterRes?.data || []);
    setMoveLogs(moveRes?.data || []);
  }, [today]);

  const loadWealthData = useCallback(async (uid) => {
    const results = await Promise.allSettled([
      supabase.from('wealth_settings').select('monthly_budget').eq('user_id', uid).maybeSingle(),
      supabase.from('wealth_income').select('amount').eq('user_id', uid),
      supabase.from('money_expenses').select('amount, created_at, note, category, expense_date').eq('user_id', uid),
      supabase.from('wealth_bills').select('*').eq('user_id', uid)
    ]);

    const settingsRes = results[0].status === 'fulfilled' ? results[0].value : { data: null };
    const incomeRes = results[1].status === 'fulfilled' ? results[1].value : { data: [] };
    const expensesRes = results[2].status === 'fulfilled' ? results[2].value : { data: [] };
    const billsRes = results[3].status === 'fulfilled' ? results[3].value : { data: [] };

    setExpSettings(settingsRes?.data || null);
    setIncome(incomeRes?.data || []);
    setExpenses(expensesRes?.data || []);
    setBills(billsRes?.data || []);
  }, []);

  const loadFoodData = useCallback(async (uid) => {
    const todayStr = getTodayStr();
    const lsKey = `dexos_food_logs_${uid}_${todayStr}`;
    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .select('calories, protein, carbs, fat, food_name, meal_type, created_at')
        .eq('user_id', uid)
        .eq('date', todayStr)
        .order('created_at', { ascending: true });
      if (dbErr) {
        const local = localStorage.getItem(lsKey);
        setFoodLogs(local ? JSON.parse(local) : []);
      } else {
        setFoodLogs(data ?? []);
        try { localStorage.setItem(lsKey, JSON.stringify(data ?? [])); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }, []);

  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([
        supabase.from('profiles').select('*').eq('id', uid).single().then(res => { if (res.data) setProfile(res.data); }),
        loadHabitsAndStreaks(uid),
        loadGrowthData(uid),
        loadHealthData(uid),
        loadWealthData(uid),
        loadFoodData(uid),
      ]);
    } catch (err) {
      console.error('Failed to load Zenith data:', err);
    } finally {
      setLoading(false);
    }
  }, [loadHabitsAndStreaks, loadGrowthData, loadHealthData, loadWealthData, loadFoodData]);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userRef.current = user;
        setUser(user);
        loadData(user.id);
      } else {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            userRef.current = session.user;
            setUser(session.user);
            loadData(session.user.id);
          } else {
            setLoading(false);
          }
        }).catch(() => setLoading(false));
      }
    }).catch(() => setLoading(false));

    // Weekly Review — show every Sunday
    const now = new Date();
    if (now.getDay() === 0) {
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
      const alreadySeen = localStorage.getItem(`dexos_weekly_review_${weekKey}`);
      if (!alreadySeen) {
        setTimeout(() => setShowWeeklyReview(true), 2000);
      }
    }
  }, [loadData]);

  // ─── Dex OS Live Invalidation ───────────────────────────────────────────────
  useEffect(() => {
    const handleDexRefresh = () => {
      const activeUid = userRef.current?.id || user?.id;
      if (activeUid) loadData(activeUid);
    };
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => window.removeEventListener('dexos:refresh', handleDexRefresh);
  }, [user, loadData]);

  const checkAllDone = useCallback(async (optimisticActivity) => {
    const currentUser = userRef.current
    if (!currentUser) return;
    const currentCompleted = new Set(optimisticActivity.filter(l => l.completed_date === today && l.status === 'completed').map(l => l.habit_id))
    const allDone = habits.every(h => currentCompleted.has(h.id))
    
    if (allDone && habits.length > 0 && !celebrationShown) {
      setCelebrationShown(true)
      localStorage.setItem('zyrbit_celebration_date', today)

      // Show reflection first, then celebration
      const q = REFLECTION_QUESTIONS[Math.floor(Math.random() * REFLECTION_QUESTIONS.length)]
      setReflectionQuestion(q)
      setReflectionText('')
      setTimeout(() => setShowReflection(true), 400)
    }
  }, [habits, celebrationShown, today])

  const handleToggle = useCallback(async (habit) => {
    const currentUser = userRef.current;
    if (!currentUser || !habit?.id) return;
    if (submittingHabits[habit.id]) return;

    setSubmittingHabits(prev => ({ ...prev, [habit.id]: true }));

    try {
      const completedToday = new Set(
        activity.filter(log => log.completed_date === today && log.status === 'completed').map(l => l.habit_id)
      );
      const isCompleted = completedToday.has(habit.id);

      const res = await serviceToggleHabit({
        userId: currentUser.id,
        habitId: habit.id,
        date: today,
        isCompleted,
      });

      if (!res.success) {
        showToast(isCompleted ? '❌ Failed to uncheck habit.' : "❌ Failed to log today's habit.", 'error');
      } else {
        if (!isCompleted) {
          showToast('✅ Habit logged!', 'success');
          const nextActivity = [...activity, res.data];
          setActivity(nextActivity);
          checkAllDone(nextActivity);
          await loadHabitsAndStreaks(currentUser.id);
        } else {
          setActivity(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === today && l.status === 'completed')));
          await loadHabitsAndStreaks(currentUser.id);
        }
      }
    } finally {
      setSubmittingHabits(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
    }
  }, [activity, today, loadHabitsAndStreaks, checkAllDone, submittingHabits]);

  const handleSkip = async (habit) => {
    const currentUser = userRef.current;
    if (!currentUser || !habit?.id) return;
    if (submittingHabits[habit.id]) return;

    setSkipTarget(null);
    setSubmittingHabits(prev => ({ ...prev, [habit.id]: true }));

    try {
      const res = await serviceSkipHabit({
        userId: currentUser.id,
        habitId: habit.id,
        date: today,
      });

      if (res.success) {
        showToast('⏭️ Skipped — stay consistent tomorrow!', 'warning');
        setActivity(prev => [...prev, res.data]);
        await loadHabitsAndStreaks(currentUser.id);
      } else {
        showToast('❌ Failed to skip habit.', 'error');
      }
    } finally {
      setSubmittingHabits(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
    }
  };

  const saveHabit = async () => {
    const currentUser = userRef.current;
    if (!form.name.trim() || !currentUser || isSubmittingForm) return;
    setIsSubmittingForm(true);
    const color = ZONE_COLORS[form.zone] || '#5EE6F5';
    
    try {
      if (editHabit) {
        const res = await serviceUpdateHabit({
          userId: currentUser.id,
          habitId: editHabit.id,
          name: form.name.trim(),
          zone: form.zone,
          icon: form.icon,
          frequency: form.frequency,
          reminder_enabled: form.reminder_enabled,
          reminder_time: form.reminder_time,
          color,
        });

        if (res.success) {
          showToast('✅ Habit updated!', 'success');
          setShowModal(false);
          await loadHabitsAndStreaks(currentUser.id);
        } else {
          showToast('❌ Failed to update habit.', 'error');
        }
      } else {
        const res = await serviceCreateHabit({
          userId: currentUser.id,
          name: form.name.trim(),
          zone: form.zone,
          icon: form.icon,
          frequency: form.frequency,
          reminderEnabled: form.reminder_enabled,
          reminderTime: form.reminder_time,
          color,
        });

        if (res.success) {
          showToast('🌱 New habit added!', 'success');
          setShowModal(false);
          await loadHabitsAndStreaks(currentUser.id);
        } else {
          showToast('❌ Failed to add habit.', 'error');
        }
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const deleteHabit = useCallback((target) => {
    const activeTarget = target || editHabit;
    if (!activeTarget) return;
    setDeleteTarget(activeTarget);
  }, [editHabit]);

  const confirmDelete = async () => {
    const currentUser = userRef.current;
    if (!deleteTarget || !currentUser || isSubmittingForm) return;
    setIsSubmittingForm(true);

    try {
      const res = await serviceDeleteHabit({
        userId: currentUser.id,
        habitId: deleteTarget.id,
      });
      if (res.success) {
        setShowModal(false);
        setDeleteTarget(null);
        showToast('🗑️ Habit removed', 'info');
        await loadHabitsAndStreaks(currentUser.id);
      } else {
        showToast('❌ Delete failed. Try again.', 'error');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const saveReflection = async () => {
    const currentUser = userRef.current;
    if (!reflectionText.trim() || !currentUser || isSubmittingForm) return;
    setIsSubmittingForm(true);

    try {
      const completedTodayCount = activity.filter(l => l.completed_date === today && l.status === 'completed').length;
      const completionPct = habits.length > 0 ? Math.round((completedTodayCount / habits.length) * 100) : 0;
      
      const res = await serviceSubmitDailyReflection({
        userId: currentUser.id,
        date: today,
        content: reflectionText.trim(),
        mood: 'good',
        completionPct,
      });
      
      if (res.success) {
        showToast('📝 Daily reflection saved!', 'success');
        setShowReflection(false);
        setReflectionText('');
        setTimeout(() => setShowCelebration(true), 300);
      } else {
        showToast('❌ Failed to save reflection.', 'error');
      }
    } finally {
      setIsSubmittingForm(false);
    }
  };

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
      const res = await serviceCompleteTask({
        userId: user.id,
        taskId: p.id,
        status: 'done',
      });

      if (!res.success) throw new Error(res.error || 'Failed to complete task');
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
  const finalGreeting = (hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening') + '.';

  return (
    <div className="app-container page-enter" style={{
      background: '#0B0D0F',
      minHeight: '100vh',
      color: '#FFFFFF',
      position: 'relative',
      padding: '40px 24px 120px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    }}>
      {/* Greeting */}
      <div>
        <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          {finalGreeting}
        </h1>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Body Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>Body</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#A1A1AA' }}>
          {ctx.sleep > 0 ? `${ctx.sleep.toFixed(1)}h sleep · ${Math.round(ctx.water / 250)} glasses water` : 'No health data yet'}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#1FA36F', marginTop: '2px' }}>{recoveryScore}%</div>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Food Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>Food</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#A1A1AA' }}>
          {foodTotals.meals > 0 ? `${foodTotals.meals} meal${foodTotals.meals > 1 ? 's' : ''} · ${foodTotals.protein}g protein` : 'No meals logged yet'}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
          {foodTotals.calories > 0 ? `${foodTotals.calories} kcal` : '—'}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Money Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>Money</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#A1A1AA' }}>
          {ctx.spent > 0 ? `₹${Math.round(ctx.spent)} spent today` : 'No expenses today'}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: ctx.runwayDays >= 999 ? '#1FA36F' : ctx.runwayDays > 90 ? '#1FA36F' : ctx.runwayDays > 0 ? '#F59E0B' : '#9CA3AF', marginTop: '2px' }}>
          {ctx.runwayDays >= 9999 ? 'Stable ✓' : ctx.runwayDays === 0 ? 'Set up income →' : `${ctx.runwayDays}d runway`}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Focus Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>Focus</div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#A1A1AA' }}>
          {ctx.lastFocusTopic}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 900, color: '#1FA36F', marginTop: '2px' }}>
          {ctx.lastFocusMins > 0 ? `${ctx.lastFocusMins} min` : '—'}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Today's Priorities */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>
          Today's Priorities
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {priorities.map((p) => (
            <div
              key={p.id}
              onClick={() => togglePriority(p)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                userSelect: 'none',
                opacity: p.done ? 0.6 : 1,
                transition: 'opacity 0.2s',
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                border: `2px solid ${p.done ? '#1FA36F' : '#2E2F35'}`,
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: p.done ? '#1FA36F' : '#15181B',
                transition: 'all 0.2s',
              }}>
                {p.done && <span style={{ fontSize: '12px', color: '#0B0D0F', fontWeight: 900 }}>✓</span>}
              </div>
              <span style={{
                fontSize: '16px',
                fontWeight: 700,
                color: '#FFFFFF',
                textDecoration: p.done ? 'line-through' : 'none',
              }}>
                {p.name}
              </span>
            </div>
          ))}
          {priorities.length === 0 && (
            <div style={{ fontSize: '15px', color: '#4B5563', fontWeight: 500, padding: '4px 0' }}>
              All clear — nothing urgent today.
            </div>
          )}
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* One Insight */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>One Insight</div>
        <p style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#E4E4E7',
          lineHeight: 1.5,
          margin: 0,
        }}>
          {oneInsight}
        </p>
      </div>

      <div style={{ borderBottom: '1px solid #1C1D21' }} />

      {/* Habits Section / First-Time Empty State */}
      {habits.length === 0 ? (
        <div style={{
          background: '#15181B',
          border: '1px solid #26272C',
          borderRadius: '16px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>🌌</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1FA36F', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Welcome to DexOS
            </span>
          </div>

          <p style={{
            fontSize: '15px',
            color: '#A1A1AA',
            lineHeight: 1.5,
            margin: 0,
            fontWeight: 500,
          }}>
            DexOS unifies your habits, focus, health, and wealth into one calm operating system.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => {
                setEditHabit(null);
                setForm({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' });
                setShowModal(true);
              }}
              style={{
                background: '#1FA36F',
                color: '#0B0D0F',
                fontWeight: 800,
                fontSize: '14px',
                padding: '12px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'opacity 0.2s',
              }}
            >
              <span>+ Add your first habit</span>
            </button>

            <div style={{
              fontSize: '12px',
              color: '#71717A',
              fontWeight: 500,
              textAlign: 'center',
              padding: '4px 0',
            }}>
              Dex also accepts voice & text commands like <span style={{ color: '#E4E4E7' }}>"I drank 500ml water"</span> or <span style={{ color: '#E4E4E7' }}>"Plan my next 45 minutes"</span>.
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Today's Habits ({activity.filter(l => l.status === 'completed' && l.completed_date === today).length}/{habits.length})
            </div>
            <button
              onClick={() => {
                setEditHabit(null);
                setForm({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' });
                setShowModal(true);
              }}
              style={{
                background: 'transparent',
                border: '1px solid #2E2F35',
                color: '#1FA36F',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Habit
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {habits.map((habit) => {
              const habitLogs = activity.filter(l => l.habit_id === habit.id);
              const isDone = habitLogs.some(l => l.completed_date === today && l.status === 'completed');
              const habitStreak = streaks[habit.id] || 0;
              const longestStreak = longestStreaks[habit.id] || habitStreak;
              const impact = habitImpacts[habit.id] || null;

              return (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  logs={habitLogs}
                  streak={habitStreak}
                  longestStreak={longestStreak}
                  isCompleted={isDone}
                  isSubmitting={!!submittingHabits[habit.id]}
                  impactInsight={impact?.insight || null}
                  onToggle={handleToggle}
                  onEdit={(h) => {
                    setEditHabit(h);
                    setForm({
                      name: h.name,
                      zone: h.zone || 'mind',
                      icon: h.icon || '🌱',
                      frequency: h.frequency || 'daily',
                      reminder_enabled: !!h.reminder_enabled,
                      reminder_time: h.reminder_time || '',
                    });
                    setShowModal(true);
                  }}
                  onDelete={deleteHabit}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* HABIT CREATE / EDIT MODAL */}
      {showModal && (
        <div className="modal-overlay" style={{ background: '#000000D0', zIndex: 210, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, padding: '16px' }}>
          <div style={{
            background: '#15181B',
            border: '1px solid #26272C',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '380px',
            width: '100%',
            animation: 'scaleIn 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                {editHabit ? 'Edit Habit' : 'New Habit'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#71717A', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Habit Name */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Habit Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. 20 min deep reading"
                autoFocus
                style={{
                  background: '#0B0D0F',
                  border: '1px solid #2E2F35',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Zone Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Domain Zone
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ZONE_OPTIONS.map((z) => {
                  const isSel = form.zone === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, zone: z.id }))}
                      style={{
                        background: isSel ? 'rgba(31, 163, 111, 0.15)' : '#0B0D0F',
                        border: `1px solid ${isSel ? '#1FA36F' : '#2E2F35'}`,
                        borderRadius: '8px',
                        padding: '8px',
                        color: isSel ? '#1FA36F' : '#A1A1AA',
                        fontSize: '13px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{z.icon}</span>
                      <span>{z.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Icon Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#71717A', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Icon
              </label>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {QUICK_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, icon: ic }))}
                    style={{
                      background: form.icon === ic ? '#1FA36F' : '#0B0D0F',
                      border: `1px solid ${form.icon === ic ? '#1FA36F' : '#2E2F35'}`,
                      borderRadius: '6px',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{
                  flex: 1,
                  background: '#2E2F35',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!form.name.trim() || isSubmittingForm}
                onClick={saveHabit}
                style={{
                  flex: 1,
                  background: form.name.trim() && !isSubmittingForm ? '#1FA36F' : '#2E2F35',
                  color: form.name.trim() && !isSubmittingForm ? '#0B0D0F' : '#71717A',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: form.name.trim() && !isSubmittingForm ? 'pointer' : 'not-allowed',
                }}
              >
                {isSubmittingForm ? 'Saving...' : editHabit ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="modal-overlay" style={{ background: '#000000D0', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0, padding: '16px' }}>
          <div style={{
            background: '#15181B',
            border: '1px solid #26272C',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '340px',
            width: '100%',
            animation: 'scaleIn 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '36px' }}>🗑️</div>
            <div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>Delete Habit?</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#A1A1AA' }}>
                Are you sure you want to delete "{deleteTarget.name}"? This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#2E2F35', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{ flex: 1, padding: '10px', background: '#EF4444', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PERFECT DAY CELEBRATION */}
      {showCelebration && (
        <div className="modal-overlay" style={{ background: '#000000B0', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div style={{ background: '#15181B', border: '1px solid rgba(31, 163, 111, 0.2)', borderRadius: '16px', padding: '24px', textAlign: 'center', animation: 'scaleIn 0.5s ease', maxWidth: '300px' }}>
            <div style={{ fontSize: '52px', marginBottom: '8px' }}>🏆</div>
            <div style={{ fontSize: '20px', color: '#1FA36F', fontWeight: 900, marginBottom: '4px' }}>Perfect Day!</div>
            <div style={{ fontSize: '14px', color: '#71717A', marginBottom: '24px' }}>All habits completed today!</div>
            <button onClick={() => setShowCelebration(false)} className="btn-primary" style={{ width: '100%', padding: '10px', background: '#1FA36F', border: 'none', borderRadius: '8px', color: '#0B0D0F', fontWeight: 800, cursor: 'pointer' }}>Keep Going 🚀</button>
          </div>
        </div>
      )}

      {/* WEEKLY REVIEW MODAL */}
      {showWeeklyReview && (
        <div className="modal-overlay" style={{ background: '#000000D0', zIndex: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'fixed', inset: 0 }}>
          <div style={{
            background: '#15181B',
            border: '1px solid rgba(20, 184, 166, 0.2)', borderRadius: '16px',
            padding: '32px 24px', maxWidth: '340px', width: '92%',
            animation: 'scaleIn 0.4s ease'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '42px', marginBottom: '8px' }}>📊</div>
              <div style={{ fontSize: '18px', fontWeight: 900, color: '#FFF', marginBottom: '4px' }}>Week Wrapped</div>
              <div style={{ fontSize: '10px', color: '#71717A', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2 }}>Your weekly report</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '24px' }}>
              {[
                { label: 'Streak', value: `${bestStreak}d`, color: '#F59E0B', icon: '🔥' },
                { label: 'OS Score', value: `${osScore}/100`, color: '#8B7FFF', icon: '⚡' },
              ].map((s, i) => (
                <div key={i} style={{ background: '#1C1D21', border: '1px solid #2E2F35', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', marginBottom: '4px' }}>{s.icon}</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: s.color, marginBottom: '2px' }}>{s.value}</div>
                  <div style={{ fontSize: '9px', color: '#71717A', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={dismissWeeklyReview}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', background: '#2E2F35', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Done ✓
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav activeTab="zenith" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}

