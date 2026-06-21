import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import BottomNav from '../components/BottomNav.jsx';
import GravityRing from '../components/GravityRing.jsx';
import { showToast } from '../components/Toast.jsx';
import { CheckCircle2 } from 'lucide-react';

// ─── colour tokens (Zenith Premium palette) ─────────────────────────────────
const C = {
  bg:        '#020204',
  surface:   '#0A0A14',
  surfaceAlt:'#0E0E1A',
  border:    '#1A1A2A',
  border2:   '#242438',
  accent:    '#8B7FFF',   // violet  – OS Score
  cyan:      '#00E5FF',   // cyan    – briefing
  green:     '#10B981',   // emerald – completed
  amber:     '#F59E0B',
  red:       '#EF4444',
  muted:     '#525270',
  text:      '#F0F0FA',
  subtext:   '#9292AA',
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

  // Core state
  const [osScore,          setOsScore]          = useState(0);
  const [osBreakdown,      setOsBreakdown]      = useState({ growth: 0, health: 0, wealth: 0 });
  const [bestStreak,       setBestStreak]       = useState(0);
  const [winsCount,        setWinsCount]        = useState(0);
  const [recoveryScore,    setRecoveryScore]    = useState(100);
  const [aiBriefing,       setAiBriefing]       = useState('Initializing DexOS cognitive arrays…');
  const [priorities,       setPriorities]       = useState([]);
  const [timeline,         setTimeline]         = useState([]);

  // Support metrics
  const [ctx, setCtx] = useState({
    completedTasks:    0,
    totalTasks:        0,
    focusHours:        0,
    sleep:             0,
    sleepDebt:         0,
    water:             0,
    spent:             0,
    limit:             500,
    sprintActive:      false,
    sprintDailyTarget: 90,
    sprintTargetToDate: 0,
    sprintLoggedToDate: 0,
    liquidCash:        0,
    runwayMonths:      99,
    nextBill:          null,
    overdueTasksCount: 0,
    goalsCount:        0,
    completedGoals:    0,
  });



  const loadData = useCallback(async (uid) => {
    console.log('Zenith.jsx: loadData started for uid:', uid);
    setLoading(true);
    try {
      const today = getTodayStr();
      const startOfWeekStr = getStartOfWeekStr();
      console.log('Zenith.jsx: triggering all queries in parallel...');
      const [
        profRes,
        tasksRes,
        sleepRes,
        waterRes,
        moveRes,
        focusRes,
        sprintRes,
        settingsRes,
        incomeRes,
        expensesRes,
        billsRes,
        goalsRes,
        habitsRes,
        activityRes,
        streaksRes
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', uid).single(),
        supabase.from('growth_tasks').select('*, growth_projects(name)').eq('user_id', uid),
        supabase.from('health_sleep_logs').select('*').eq('user_id', uid).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
        supabase.from('health_water_logs').select('*').eq('user_id', uid).eq('log_date', today),
        supabase.from('health_move_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false }),
        supabase.from('growth_focus_sessions').select('started_at, duration_minutes, session_date').eq('user_id', uid).eq('session_date', today),
        supabase.from('growth_sprints').select('*').eq('user_id', uid).eq('status', 'active').limit(1),
        supabase.from('wealth_settings').select('monthly_budget').eq('user_id', uid).maybeSingle(),
        supabase.from('wealth_income').select('amount').eq('user_id', uid),
        supabase.from('money_expenses').select('amount, created_at, note, category, expense_date').eq('user_id', uid),
        supabase.from('wealth_bills').select('*').eq('user_id', uid),
        supabase.from('study_goals').select('*').eq('user_id', uid),
        supabase.from('habits').select('id, name, icon').eq('user_id', uid),
        supabase.from('activity_log').select('*').eq('user_id', uid).eq('completed_date', today),
        supabase.from('user_streaks').select('*').eq('user_id', uid)
      ]);
      console.log('Zenith.jsx: all parallel queries completed.');

      // Extract results
      const prof = profRes.data;
      if (profRes.error) console.warn('Zenith.jsx: prof query warning:', profRes.error);
      if (prof) setProfile(prof);

      const tasks = tasksRes.data || [];
      if (tasksRes.error) console.warn('Zenith.jsx: tasks query warning:', tasksRes.error);

      const sleepLogs = sleepRes.data || [];
      if (sleepRes.error) console.warn('Zenith.jsx: sleep logs query warning:', sleepRes.error);

      const waterLogs = waterRes.data || [];
      if (waterRes.error) console.warn('Zenith.jsx: water logs query warning:', waterRes.error);

      const moveLogs = moveRes.data || [];
      if (moveRes.error) console.warn('Zenith.jsx: move logs query warning:', moveRes.error);

      const focusSessions = focusRes.data || [];
      if (focusRes.error) console.warn('Zenith.jsx: focus sessions query warning:', focusRes.error);

      const sprintData = sprintRes.data || [];
      if (sprintRes.error) console.warn('Zenith.jsx: sprints query warning:', sprintRes.error);

      const expSettings = settingsRes.data;
      if (settingsRes.error && settingsRes.error.code !== 'PGRST116') console.warn('Zenith.jsx: settings query warning:', settingsRes.error);

      const allIncome = incomeRes.data || [];
      if (incomeRes.error) console.warn('Zenith.jsx: income query warning:', incomeRes.error);

      const allExpenses = expensesRes.data || [];
      if (expensesRes.error) console.warn('Zenith.jsx: expenses query warning:', expensesRes.error);

      const allBills = billsRes.data || [];
      if (billsRes.error) console.warn('Zenith.jsx: bills query warning:', billsRes.error);

      const allGoals = goalsRes.data || [];
      if (goalsRes.error) console.warn('Zenith.jsx: goals query warning:', goalsRes.error);

      const habits = habitsRes.data || [];
      const activityLog = activityRes.data || [];

      const streaks = streaksRes.data || [];
      const streakVal = streaks.reduce((max, s) => Math.max(max, s.current_streak || 0), 0) || 0;
      setBestStreak(streakVal);

      // Calculations using extracted data
      const completedTasksToday = tasks.filter(t => t.status === 'done' && isTodayLocal(t.completed_at, today)).length;
      const totalTasksToday = tasks.filter(t => t.due_date === today || (t.status === 'done' && isTodayLocal(t.completed_at, today))).length;

      const lastSleep = sleepLogs[0];
      const sleepHrs = (lastSleep && lastSleep.sleep_date === today) ? Number(lastSleep.duration_hours) : 0;

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

      const recovery = Math.max(0, Math.min(100, Math.round(sleepContribution + hydrationContribution - strainPenalty)));
      setRecoveryScore(recovery);

      const focusMins = focusSessions ? focusSessions.reduce((s, f) => s + (f.duration_minutes || 0), 0) : 0;

      const activeSprint = sprintData?.[0] || null;
      let sprintActive = !!activeSprint;
      let sprintDailyTarget = activeSprint?.daily_focus_minutes || 90;
      let sprintLoggedToDate = activeSprint?.focus_logged_minutes || 0;
      let sprintTargetToDate = 0;
      if (activeSprint) {
        const start = new Date(activeSprint.start_date + 'T00:00:00');
        const end = new Date(activeSprint.end_date + 'T00:00:00');
        const totalDays = Math.max(1, Math.round((end - start) / 86400000));
        const day = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000)));
        sprintTargetToDate = activeSprint.daily_focus_minutes * day;
      }

      const totalIncome = allIncome.reduce((s, i) => s + Number(i.amount), 0);
      const totalExpenseAllTime = allExpenses.reduce((s, e) => s + Number(e.amount), 0);
      const liquidCash = totalIncome - totalExpenseAllTime;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const burnLast30 = allExpenses.filter(e => e.expense_date >= thirtyDaysAgoStr).reduce((s, e) => s + Number(e.amount), 0);
      const runwayMonths = burnLast30 > 0 ? (liquidCash / burnLast30) : 99;

      const todayExps = allExpenses.filter(e => e.expense_date === today);
      const spent = todayExps.reduce((s, e) => s + Number(e.amount), 0);
      const dailyLimit = expSettings?.monthly_budget ? Number(expSettings.monthly_budget) / 30 : 500;

      const upcomingUnpaidBills = allBills.filter(b => b.status === 'unpaid').sort((a, b) => new Date(a.due_date) - new Date(b.due_date));
      const nextBill = upcomingUnpaidBills[0] || null;

      const goalsCount = allGoals.length;
      const completedGoals = allGoals.filter(g => g.is_complete).length;

      const overdueTasksCount = tasks.filter(t => t.status === 'todo' && t.due_date && t.due_date < today).length;

      const scoreObj = calculateOsScore(
        completedTasksToday, totalTasksToday,
        focusMins, sprintDailyTarget, sprintTargetToDate, sprintLoggedToDate, sprintActive,
        recovery, sleepHrs, todayWater,
        spent, expSettings?.monthly_budget || 15000, runwayMonths
      );
      setOsScore(scoreObj.total);
      setOsBreakdown({ growth: scoreObj.growth, health: scoreObj.health, wealth: scoreObj.wealth });

      let winsToday = completedTasksToday;
      if (focusMins > 0 && focusMins >= sprintDailyTarget) winsToday += 1;
      if (todayWater > 0 && todayWater >= dynamicWaterTarget) winsToday += 1;
      if (sleepHrs > 0) winsToday += 1;
      if (todayExerciseMins > 0) winsToday += 1;
      setWinsCount(winsToday);

      setCtx({
        completedTasks:    completedTasksToday,
        totalTasks:        totalTasksToday,
        focusHours:        Number((focusMins / 60).toFixed(1)),
        sleep:             sleepHrs,
        sleepDebt:         sleepDebt,
        water:             todayWater,
        spent,
        limit:             Math.round(dailyLimit),
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
      });

      const briefingText = compileCyberneticDirectives(
        scoreObj.total,
        recovery,
        sleepHrs,
        sleepDebt,
        todayWater,
        completedTasksToday,
        totalTasksToday,
        spent,
        dailyLimit,
        focusMins,
        runwayMonths
      );
      setAiBriefing(briefingText);

      const overdueTasksList = tasks.filter(t => t.status === 'todo' && t.due_date && t.due_date < today);
      const tasksDueTodayList = tasks.filter(t => t.status === 'todo' && t.due_date === today);
      const monthlyBudgetExceeded = spent > (expSettings?.monthly_budget || 15000);

      const computedPriorities = compileTopPriorities(
        recovery,
        monthlyBudgetExceeded,
        overdueTasksList,
        focusMins,
        sprintDailyTarget,
        sprintActive,
        tasksDueTodayList
      );
      setPriorities(computedPriorities);

      // Build timeline from today's real events — no extra queries needed
      const rawEvents = [];

      // Orbit habit completions
      activityLog.filter(l => l.status === 'completed').forEach(log => {
        const h = habits.find(x => x.id === log.habit_id);
        rawEvents.push({
          ts: new Date(log.created_at || today + 'T07:00:00').getTime(),
          type: 'task',
          text: `${h ? h.icon : '✅'} Habit done: ${h ? h.name : 'Unknown'}`
        });
      });

      // Growth task completions
      tasks.filter(t => t.status === 'done' && isTodayLocal(t.completed_at, today)).forEach(t => {
        rawEvents.push({
          ts: new Date(t.completed_at || today + 'T11:00:00').getTime(),
          type: 'task',
          text: `Task done: ${t.name}`
        });
      });

      // Sleep (logged for today or the most recent log)
      if (lastSleep && lastSleep.sleep_date === today) {
        rawEvents.push({
          ts: new Date(today + 'T06:00:00').getTime(),
          type: 'sleep',
          text: `Slept ${Number(lastSleep.duration_hours).toFixed(1)}h — Quality ${lastSleep.quality}/5`
        });
      }

      // Water logs
      waterLogs.forEach(w => {
        rawEvents.push({
          ts: new Date(w.created_at || today + 'T08:00:00').getTime(),
          type: 'water',
          text: `Hydration +${w.amount_ml}ml`
        });
      });

      // Workouts
      moveLogs.filter(m => m.log_date === today).forEach(m => {
        rawEvents.push({
          ts: new Date(m.created_at || today + 'T09:00:00').getTime(),
          type: 'workout',
          text: `${m.activity_type} — ${m.active_minutes}min (RPE ${m.rpe})`
        });
      });

      // Focus sessions
      focusSessions.filter(f => f.session_date === today).forEach(f => {
        rawEvents.push({
          ts: new Date(f.started_at || today + 'T10:00:00').getTime(),
          type: 'focus',
          text: `Focus session — ${f.duration_minutes}min`
        });
      });

      // Expenses
      todayExps.forEach(e => {
        rawEvents.push({
          ts: new Date(e.created_at || today + 'T12:00:00').getTime(),
          type: 'expense',
          text: `₹${Number(e.amount).toFixed(0)} — ${e.note || e.category || 'Expense'}`
        });
      });

      rawEvents.sort((a, b) => a.ts - b.ts);
      setTimeline(rawEvents.map(e => ({
        time: new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        type: e.type,
        text: e.text
      })));

      console.log('Zenith.jsx: loadData successful!');
    } catch (e) {
      console.error('Zenith load error:', e);
    } finally {
      console.log('Zenith.jsx: loadData finally block, setting loading to false.');
      setLoading(false);
    }
  }, []);

  // ── load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    console.log('Zenith.jsx: useEffect checking user auth status...');
    supabase.auth.getUser().then(({ data: { user } }) => {
      console.log('Zenith.jsx: useEffect auth check completed, user is:', user?.id || null);
      if (user) { setUser(user); loadData(user.id); }
      else {
        console.log('Zenith.jsx: user is null, checking if there is a session...');
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('Zenith.jsx: session checked, session user is:', session?.user?.id || null);
          if (session?.user) {
            setUser(session.user);
            loadData(session.user.id);
          } else {
            console.log('Zenith.jsx: No active session. Transitioning loading to false.');
            setLoading(false);
          }
        });
      }
    });
  }, [loadData]);

  // ── Toggle priority done ──────────────────────────────────────────────────
  const togglePriority = async (p) => {
    if (p.done || !user) return;
    if (p.type !== 'task') {
      if (p.type === 'health_action') navigate('/health');
      if (p.type === 'wealth_action') navigate('/wealth');
      if (p.type === 'growth_action') navigate('/growth');
      return;
    }
    setPriorities(prev => prev.map(x => x.id === p.id ? { ...x, done: true } : x));
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('growth_tasks')
        .update({ status: 'done', completed_at: now })
        .eq('id', p.id);

      if (error) throw error;
      showToast('🎯 Priority complete!', 'success');
      loadData(user.id);
    } catch (e) {
      console.error(e);
      showToast('Failed to complete priority', 'error');
      setPriorities(prev => prev.map(x => x.id === p.id ? { ...x, done: false } : x));
    }
  };

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', border: `2.5px solid ${C.accent}30`, borderTopColor: C.accent, animation: 'spin 0.8s linear infinite', boxShadow: `0 0 20px ${C.accent}20` }} />
        <span style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '2.5px' }}>BOOTING DEXOS</span>
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
    { label: 'TASKS', value: `${ctx.completedTasks}/${ctx.totalTasks}`, icon: '📋', color: C.green },
    { label: 'FOCUS', value: `${ctx.focusHours}h`, icon: '🎯', color: C.accent },
    { label: 'SLEEP', value: `${ctx.sleep}h`, icon: '🌙', color: '#8B5CF6' },
    { label: 'WATER', value: `${(ctx.water/1000).toFixed(1)}L`, icon: '💧', color: C.cyan },
  ];

  return (
    <div className="app-container page-enter" style={{ background: C.bg, minHeight: '100vh', color: C.text, position: 'relative' }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '9px', color: C.accent, fontWeight: 800, letterSpacing: '2.5px', marginBottom: '6px', opacity: 0.8 }}>ZENITH · COMMAND CENTER</div>
          <h1 style={{ fontSize: '26px', fontWeight: 900, lineHeight: 1.15, margin: 0 }}>
            <span style={{ color: C.text }}>{greeting},</span><br />
            <span style={{ background: `linear-gradient(135deg, ${C.accent} 0%, ${C.cyan} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{name}.</span>
          </h1>
        </div>
        <div
          onClick={() => navigate('/profile')}
          style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: C.surface, border: `1.5px solid ${C.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', overflow: 'hidden', flexShrink: 0, marginTop: '4px',
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
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
        {recoveryScore < 50 && (
          <div style={{
            padding: '12px 16px', background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px',
            borderLeft: '3px solid #EF4444',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'fadeSlideUp 0.3s ease forwards',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, lineHeight: 1.4 }}>
              CAPACITY ALERT: Recovery depleted ({recoveryScore}%). Rest protocol enforced.
            </span>
          </div>
        )}

        {ctx.runwayMonths < 3.0 && (
          <div style={{
            padding: '12px 16px', background: 'rgba(251, 191, 36, 0.06)',
            border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: '16px',
            borderLeft: '3px solid #FBBF24',
            display: 'flex', alignItems: 'center', gap: '10px',
            animation: 'fadeSlideUp 0.3s 0.05s ease forwards',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700, lineHeight: 1.4 }}>
              RUNWAY ALERT: {ctx.runwayMonths.toFixed(1)} months remaining. Freeze discretionary spend.
            </span>
          </div>
        )}

        {ctx.spent > ctx.limit * 30 && (
          <div style={{
            padding: '12px 16px', background: 'rgba(239, 68, 68, 0.06)',
            border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '16px',
            borderLeft: '3px solid #EF4444',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '14px', flexShrink: 0 }}>💸</span>
            <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, lineHeight: 1.4 }}>
              BUDGET CAP EXCEEDED: Monthly limit crossed.
            </span>
          </div>
        )}
      </div>

      {/* ── OS SCORE RING + BRIEFING ────────────────────────────────────── */}
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: '12px', alignItems: 'stretch' }}>

        {/* Score Ring */}
        <div style={{
          flex: '0 0 112px', height: '112px',
          background: `linear-gradient(145deg, ${C.surface} 0%, ${C.surfaceAlt} 100%)`,
          borderRadius: '24px', border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.accent}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          boxShadow: `0 8px 32px rgba(139,127,255,0.08), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}>
          <GravityRing score={osScore} size={84} />
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontSize: '24px', fontWeight: 900, lineHeight: 1,
              background: `linear-gradient(135deg, #fff 0%, ${C.accent} 100%)`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>{osScore}</span>
            <span style={{ fontSize: '7px', color: C.muted, fontWeight: 800, letterSpacing: '1.5px', marginTop: '3px' }}>DEX INDEX</span>
          </div>
        </div>

        {/* Briefing Card */}
        <div style={{
          flex: 1,
          background: `linear-gradient(145deg, ${C.surface} 0%, ${C.surfaceAlt} 100%)`,
          borderRadius: '24px', border: `1px solid ${C.border}`,
          borderLeft: `3px solid ${C.cyan}`,
          padding: '14px 14px 12px',
          display: 'flex', flexDirection: 'column', gap: '6px',
          boxShadow: `0 8px 32px rgba(0,229,255,0.05), inset 0 1px 0 rgba(255,255,255,0.03)`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '8px', color: C.cyan, fontWeight: 800, letterSpacing: '1.5px' }}>DEXOS BRIEFING</span>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: 'glowPulse 2s ease-in-out infinite' }} />
          </div>
          <p style={{ fontSize: '11px', lineHeight: 1.55, color: C.subtext, margin: 0 }}>{aiBriefing}</p>
          <div style={{ marginTop: 'auto', borderTop: `1px solid ${C.border}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <span style={{ fontSize: '7px', color: C.muted, fontWeight: 800, letterSpacing: '1px' }}>RECOMMENDED</span>
            <div style={{ fontSize: '10px', color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.green, flexShrink: 0 }} /> {healthAction}
            </div>
            <div style={{ fontSize: '10px', color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: C.accent, flexShrink: 0 }} /> {growthAction}
            </div>
          </div>
        </div>
      </div>

      {/* ── TELEMETRY BREAKDOWN & STREAKS ────────────────────────────────── */}
      <div style={{ padding: '16px 20px 0' }}>
        <div style={{
          background: `linear-gradient(145deg, ${C.surface} 0%, ${C.surfaceAlt} 100%)`,
          borderRadius: '24px', border: `1px solid ${C.border}`,
          padding: '16px 20px',
          display: 'flex', flexDirection: 'column', gap: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: C.accent, fontWeight: 800, letterSpacing: '2.5px', textTransform: 'uppercase' }}>OS TELEMETRY BREAKDOWN</span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: C.green, background: `${C.green}15`, border: `1px solid ${C.green}30`, borderRadius: '8px', padding: '4px 10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                🏆 {winsCount} {winsCount === 1 ? 'WIN' : 'WINS'} TODAY
              </span>
              <span style={{ fontSize: '10px', color: C.amber, background: `${C.amber}15`, border: `1px solid ${C.amber}30`, borderRadius: '8px', padding: '4px 10px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                🔥 {bestStreak} DAY STREAK
              </span>
            </div>
          </div>

          {/* Breakdown bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Growth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                <span style={{ color: C.text }}>🚀 Growth Engine</span>
                <span style={{ color: C.subtext }}>{osBreakdown.growth} / 40</span>
              </div>
              <div style={{ height: '5px', background: C.border, borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.growth / 40) * 100}%`, background: `linear-gradient(90deg, ${C.accent}, ${C.cyan})`, borderRadius: '100px' }} />
              </div>
            </div>

            {/* Health */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                <span style={{ color: C.text }}>❤️ Bio telemetry</span>
                <span style={{ color: C.subtext }}>{osBreakdown.health} / 30</span>
              </div>
              <div style={{ height: '5px', background: C.border, borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.health / 30) * 100}%`, background: C.green, borderRadius: '100px' }} />
              </div>
            </div>

            {/* Wealth */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 800, marginBottom: '4px' }}>
                <span style={{ color: C.text }}>💰 Capital runway</span>
                <span style={{ color: C.subtext }}>{osBreakdown.wealth} / 30</span>
              </div>
              <div style={{ height: '5px', background: C.border, borderRadius: '100px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(osBreakdown.wealth / 30) * 100}%`, background: C.amber, borderRadius: '100px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── QUICK STATS ROW ────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
        {statCards.map((s) => (
          <div key={s.label} style={{
            background: C.surface, borderRadius: '16px', border: `1px solid ${C.border}`,
            padding: '12px 8px', textAlign: 'center',
            transition: 'border-color 0.2s',
          }}>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>{s.icon}</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '7px', color: C.muted, fontWeight: 800, letterSpacing: '1px', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── TOP 3 PRIORITIES ───────────────────────────────────────────── */}
      <div style={{ padding: '22px 20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Top Priorities</span>
          <span style={{ fontSize: '9px', color: C.accent, fontWeight: 800 }}>{priorities.filter(p=>p.done).length}/{priorities.length}</span>
        </div>

        {priorities.length === 0 ? (
          <div style={{
            textAlign: 'center', color: C.muted, fontSize: '12px', padding: '28px 0',
            background: C.surface, borderRadius: '20px', border: `1px solid ${C.border}`,
          }}>
            No priorities active today. Maintain steady focus.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {priorities.map((p, idx) => (
              <div
                key={p.id}
                id={`priority-item-${idx}`}
                onClick={() => togglePriority(p)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: p.done ? `${C.green}08` : C.surface,
                  border: `1px solid ${p.done ? `${C.green}25` : C.border}`,
                  borderLeft: p.done ? `3px solid ${C.green}` : `3px solid ${C.border}`,
                  padding: '14px 16px', borderRadius: '18px',
                  cursor: p.done ? 'default' : 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: p.done ? `0 4px 16px ${C.green}10` : 'none',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '10px', flexShrink: 0,
                    background: p.done ? `${C.green}15` : `${C.accent}10`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <span style={{ fontSize: '14px' }}>{p.done ? '✅' : '🎯'}</span>
                  </div>
                  <span style={{
                    fontSize: '13px', fontWeight: 700,
                    color: p.done ? C.muted : C.text,
                    textDecoration: p.done ? 'line-through' : 'none',
                    transition: 'all 0.25s ease',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{p.name}</span>
                </div>
                {p.type === 'task' ? (
                  <CheckCircle2 size={20} style={{ color: p.done ? C.green : C.border, transition: 'color 0.25s ease', flexShrink: 0 }} />
                ) : (
                  <span style={{
                    fontSize: '9px', color: C.accent, fontWeight: 800, letterSpacing: '1px',
                    background: `${C.accent}12`, padding: '4px 10px', borderRadius: '8px',
                    border: `1px solid ${C.accent}25`,
                  }}>GO ➔</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── UNIFIED TIMELINE ───────────────────────────────────────────── */}
      <div style={{ padding: '22px 20px 120px' }}>
        <span style={{ fontSize: '9px', color: C.muted, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>Today's Timeline</span>

        {timeline.length === 0 ? (
          <div style={{
            textAlign: 'center', color: C.muted, fontSize: '12px', padding: '32px 16px', marginTop: '12px',
            background: C.surface, borderRadius: '20px', border: `1px solid ${C.border}`,
            borderLeft: `3px solid ${C.border}`,
          }}>
            Timeline awaiting entries. Start logging to see your day unfold.
          </div>
        ) : (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '0', borderLeft: `2px solid ${C.border}`, marginLeft: '7px', paddingLeft: '18px' }}>
            {timeline.map((item, idx) => (
              <div key={idx} style={{ position: 'relative', paddingBottom: '20px' }}>
                {/* Dot */}
                <div style={{
                  position: 'absolute', left: '-25px', top: '4px',
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: nodeColor[item.type] || C.muted,
                  border: `2.5px solid ${C.bg}`,
                  boxShadow: `0 0 8px ${nodeColor[item.type] || C.muted}60`,
                }} />
                <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, marginBottom: '3px', letterSpacing: '0.5px' }}>{item.time}</div>
                <div style={{ fontSize: '13px', color: C.text, fontWeight: 600, lineHeight: 1.4 }}>{item.text}</div>
              </div>
            ))}
            {/* "now" marker */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '-25px', top: '3px',
                width: '10px', height: '10px', borderRadius: '50%',
                background: C.accent, border: `2.5px solid ${C.bg}`,
                boxShadow: `0 0 12px ${C.accent}`,
                animation: 'glowPulse 2s ease-in-out infinite',
              }} />
              <div style={{ fontSize: '9px', color: C.accent, fontWeight: 800, letterSpacing: '2px' }}>NOW</div>
            </div>
          </div>
        )}
      </div>

      <BottomNav activeTab="zenith" onTabChange={(t) => navigate(`/${t}`)} />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
