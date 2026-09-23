import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';
import { Plus, Timer, Bolt, Zap, CheckCircle2 } from 'lucide-react';

// Primitives and subcomponents imports
import {
  C,
  fmtHours,
  todayStr,
  daysUntil,
  Card,
  ProgressBar,
  Modal,
  FInput,
  FLabel,
  BtnPrimary,
  FSelect,
  SectionHeader
} from '../../components/domain/growth/shared.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import { hasCycle } from '../../engines/growth/index.js';

import TodayTab from '../../components/domain/growth/TodayTab.jsx';
import PlanTab from '../../components/domain/growth/PlanTab.jsx';
import HabitsTab from '../../components/domain/growth/HabitsTab.jsx';
import FocusSessionView from '../../components/domain/growth/FocusSessionView.jsx';
import ProjectDetailView from '../../components/domain/growth/ProjectDetailView.jsx';
import {
  createTask as serviceCreateTask,
  completeTask as serviceCompleteTask,
  deleteTask as serviceDeleteTask,
  createProject as serviceCreateProject,
  endFocusSession as serviceEndFocusSession,
  createGoal as serviceCreateGoal,
  updateGoalProgress as serviceUpdateGoalProgress,
} from '../../services/growthService.js';
import {
  toggleHabit as serviceToggleHabit,
  skipHabit as serviceSkipHabit,
  createHabit as serviceCreateHabit,
  updateHabit as serviceUpdateHabit,
  deleteHabit as serviceDeleteHabit,
} from '../../services/habitService.js';
import { computeHabitImpact } from '../../engines/zenith/index.js';

const ZONE_OPTIONS = [
  { id: 'mind', label: 'Mind', icon: '🧠' },
  { id: 'body', label: 'Body', icon: '⚡' },
  { id: 'growth', label: 'Growth', icon: '🌱' },
  { id: 'soul', label: 'Soul', icon: '🌌' },
];

const QUICK_ICONS = ['🌱', '⚡', '🧠', '🌌', '💧', '🏃', '📚', '🧘', '🎯', '💤'];

const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
};

export default function Growth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mountTime] = useState(() => Date.now());

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('today');          // today | plan | habits
  const [view, setView] = useState('list');          // list | project-detail
  const [prevTab, setPrevTab] = useState('today');
  const [selectedProject, setSelectedProject] = useState(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [projects,        setProjects]        = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [dependencies,    setDependencies]    = useState([]);
  const [sessions,        setSessions]        = useState([]);
  const [goals,           setGoals]           = useState([]);
  const [streak,          setStreak]          = useState({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [todayFocusMin,   setTodayFocusMin]   = useState(0);
  const [todayTasksDone,  setTodayTasksDone]  = useState(0);
  const [isSubmitting,    setIsSubmitting]    = useState(false);

  // ── Focus Session ──────────────────────────────────────────────────────────
  const [focusMode,      setFocusMode]      = useState(null); // null | setup | active | done
  const [focusProject,   setFocusProject]   = useState(null);
  const [focusNotes,     setFocusNotes]     = useState('');
  const [focusType,      setFocusType]      = useState('open'); // open | timed
  const [focusTimedMin,  setFocusTimedMin]  = useState(25);
  const [focusElapsed,   setFocusElapsed]   = useState(0);
  const [focusPaused,    setFocusPaused]    = useState(false);
  const [focusDoneMin,   setFocusDoneMin]   = useState(0);
  const timerRef = useRef(null);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [modalProject,   setModalProject]   = useState(false);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [formProject, setFormProject] = useState({ name: '', icon: '📁', deadline: '' });

  // ── Habits State ────────────────────────────────────────────────────────────
  const [habits,             setHabits]             = useState([]);
  const [activity,           setActivity]           = useState([]);
  const [streaks,            setStreaks]            = useState({});
  const [longestStreaks,     setLongestStreaks]     = useState({});
  const [submittingHabits,   setSubmittingHabits]   = useState({});
  const [modalHabit,         setModalHabit]         = useState(false);
  const [editHabit,          setEditHabit]          = useState(null);
  const [deleteHabitTarget,  setDeleteHabitTarget]  = useState(null);
  const [formHabit,          setFormHabit]          = useState({
    name: '',
    zone: 'mind',
    icon: '🌱',
    frequency: 'daily',
    reminder_enabled: false,
    reminder_time: ''
  });

  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    const today = todayStr();
    const lsKey = (kind) => `dexos_growth_${kind}_${uid}`;
    const lsGet = (kind) => { try { return JSON.parse(localStorage.getItem(lsKey(kind))); } catch { return null; } };

    const since365 = (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toLocaleDateString('en-CA'); })();

    try {
      const [
        pRes,
        tRes,
        depRes,
        sRes,
        stRes,
        dRes,
        hRes,
        actRes,
        ustkRes,
        gRes
      ] = await Promise.all([
        supabase.from('growth_projects').select('*').eq('user_id', uid).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('growth_tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('growth_task_dependencies').select('*').eq('user_id', uid),
        supabase.from('growth_focus_sessions').select('*').eq('user_id', uid).order('session_date', { ascending: false }).limit(50),
        supabase.from('dexos_streaks').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).eq('log_date', today).maybeSingle(),
        supabase.from('habits').select('*').eq('user_id', uid).order('created_at', { ascending: true }),
        supabase.from('activity_log').select('*').eq('user_id', uid).gte('completed_date', since365),
        supabase.from('user_streaks').select('*').eq('user_id', uid),
        supabase.from('dexos_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
      ]);

      let proj = pRes.data;
      if (pRes.error) {
        console.warn('growth_projects fetch error, using local fallback:', pRes.error.message);
        proj = lsGet('projects');
      } else {
        try { localStorage.setItem(lsKey('projects'), JSON.stringify(proj || [])); } catch { /* ignore */ }
      }

      let taskData = tRes.data;
      if (tRes.error) {
        console.warn('growth_tasks fetch error, using local fallback:', tRes.error.message);
        taskData = lsGet('tasks');
      } else {
        try { localStorage.setItem(lsKey('tasks'), JSON.stringify(taskData || [])); } catch { /* ignore */ }
      }

      let depData = depRes.data;
      if (depRes.error) {
        console.warn('growth_task_dependencies fetch error:', depRes.error.message);
        depData = [];
      }

      let sessData = sRes.data;
      if (sRes.error) {
        console.warn('growth_focus_sessions fetch error, using local fallback:', sRes.error.message);
        sessData = lsGet('sessions');
      } else {
        try { localStorage.setItem(lsKey('sessions'), JSON.stringify(sessData || [])); } catch { /* ignore */ }
      }

      let streakData = stRes.data;
      if (stRes.error) {
        console.warn('dexos_streaks fetch error, using local fallback:', stRes.error.message);
        streakData = lsGet('streak');
      } else {
        try { localStorage.setItem(lsKey('streak'), JSON.stringify(streakData)); } catch { /* ignore */ }
      }

      let dailyData = dRes.data;
      if (dRes.error) {
        console.warn('dexos_daily_summary fetch error, using local fallback:', dRes.error.message);
        dailyData = lsGet('daily');
      } else {
        try { localStorage.setItem(lsKey('daily'), JSON.stringify(dailyData)); } catch { /* ignore */ }
      }

      setProjects(proj || []);
      setTasks(taskData || []);
      setDependencies(depData || []);
      setSessions(sessData || []);
      setGoals(gRes?.data || []);
      setStreak(streakData || { current_streak: 0, longest_streak: 0, last_active_date: null });

      const habitsData = hRes?.data || [];
      const activityData = actRes?.data || [];
      const streaksData = ustkRes?.data || [];

      setHabits(habitsData);
      setActivity(activityData);

      const smap = {};
      const lmap = {};
      streaksData.forEach(s => {
        smap[s.habit_id] = s.current_streak;
        lmap[s.habit_id] = s.longest_streak || s.current_streak || 0;
      });
      setStreaks(smap);
      setLongestStreaks(lmap);

      if (dailyData) {
        setTodayFocusMin(dailyData.focus_minutes || 0);
        setTodayTasksDone(dailyData.tasks_completed || 0);
      } else {
        const todaySess = (sessData || []).filter(s => s.session_date === today);
        setTodayFocusMin(todaySess.reduce((s, x) => s + x.duration_minutes, 0));
        setTodayTasksDone((taskData || []).filter(t => t.completed_at?.startsWith(today)).length);
      }
    } catch (e) {
      console.warn('Growth load error, using local fallback:', e.message);
      setProjects(lsGet('projects') || []);
      setTasks(lsGet('tasks') || []);
      setSessions(lsGet('sessions') || []);
      setGoals([]);
      setStreak(lsGet('streak') || { current_streak: 0, longest_streak: 0, last_active_date: null });
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUser(user); loadData(user.id); }
    });
  }, [loadData]);

  // ─── Memoised Derived Data ─────────────────────────────────────────────────
  const projectMap = useMemo(() => Object.fromEntries(projects.map(p => [p.id, p])), [projects]);

  const projectStatsMap = useMemo(() => {
    const map = {};
    for (const p of projects) {
      const pt = tasks.filter(t => t.project_id === p.id);
      const done = pt.filter(t => t.status === 'done').length;
      map[p.id] = { total: pt.length, done, pct: pt.length > 0 ? Math.round((done / pt.length) * 100) : 0 };
    }
    return map;
  }, [projects, tasks]);

  const yearlyCompletionsMap = useMemo(() => {
    const map = {};
    activity.forEach(log => {
      if (log.status === 'completed' && log.completed_date) {
        map[log.completed_date] = (map[log.completed_date] || 0) + 1;
      }
    });
    return map;
  }, [activity]);

  const habitImpacts = useMemo(() => {
    const res = {};
    habits.forEach(h => {
      res[h.id] = computeHabitImpact(h.id, activity, []);
    });
    return res;
  }, [habits, activity]);

  const todayView = useMemo(() => {
    const today = todayStr();
    const open  = tasks.filter(t => t.status !== 'done');

    const overdue = open
      .filter(t => t.due_date && t.due_date < today)
      .sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const overdueIds = new Set(overdue.map(t => t.id));
    const candidates = open.filter(t => !overdueIds.has(t.id));
    const dueToday   = candidates.filter(t => t.due_date === today);
    const anyHi      = candidates.filter(t => t.priority <= 2 && !dueToday.find(d => d.id === t.id));
    const dueSoon    = candidates.filter(t => { const d = daysUntil(t.due_date); return d !== null && d > 0 && d <= 3 && !dueToday.find(x => x.id === t.id); });

    const doToday = [];
    const seen = new Set();
    for (const t of [...dueToday, ...anyHi, ...dueSoon]) {
      if (!seen.has(t.id) && doToday.length < 3) { seen.add(t.id); doToday.push(t); }
    }

    const deadlines = projects.filter(p => { const d = daysUntil(p.deadline); return d !== null && d >= 0 && d <= 7; })
      .map(p => ({ name: p.name, icon: p.icon, days: daysUntil(p.deadline), type: 'project' }))
      .sort((a, b) => a.days - b.days);

    return { overdue, doToday, deadlines };
  }, [tasks, projects]);

  const dexosInsight = useMemo(() => {
    const urgentUntouched = projects.find(p => {
      const d = daysUntil(p.deadline);
      if (d === null || d < 0 || d > 5) return false;
      const last = sessions.find(s => s.project_id === p.id);
      if (!last) return true;
      const daysSince = Math.ceil((mountTime - new Date(last.session_date + 'T00:00:00').getTime()) / 86400000);
      return daysSince >= 3;
    });
    if (urgentUntouched) {
      const d = daysUntil(urgentUntouched.deadline);
      const last = sessions.find(s => s.project_id === urgentUntouched.id);
      const gap = last ? Math.ceil((mountTime - new Date(last.session_date + 'T00:00:00').getTime()) / 86400000) : null;
      return gap
        ? `"${urgentUntouched.name}" hasn't been touched in ${gap} days. ${d}d left.`
        : `"${urgentUntouched.name}" has no focus sessions yet. ${d}d until deadline.`;
    }
    if (todayView.overdue.length > 0) {
      return `${todayView.overdue.length} overdue task${todayView.overdue.length > 1 ? 's' : ''}. Start with the oldest.`;
    }
    if (streak.current_streak >= 3) {
      return `Day ${streak.current_streak} streak. Don't break it — log at least 10 minutes today.`;
    }
    return 'Every focused session compounds. Open a project and start.';
  }, [projects, sessions, todayView.overdue, streak, mountTime]);

  const startFocusSession = useCallback(() => {
    setFocusElapsed(0);
    setFocusPaused(false);
    setFocusMode('active');
  }, []);

  const handleInstantFocus = useCallback((type, minutes, notes, project = null) => {
    setFocusType(type);
    setFocusTimedMin(minutes);
    setFocusProject(project);
    setFocusNotes(notes);
    startFocusSession();
  }, [startFocusSession]);

  // ─── Dex OS Event Listeners ────────────────────────────────────────────────
  useEffect(() => {
    const handleDexStartFocus = (e) => {
      const { minutes, notes, projectId } = e.detail || {};
      const proj = projects.find(p => p.id === projectId) || null;
      handleInstantFocus('timed', Number(minutes) || 25, notes || '', proj);
    };

    const handleDexRefresh = (e) => {
      if (e.detail?.domain === 'growth' || !e.detail?.domain) {
        if (user?.id) loadData(user.id);
      }
    };

    window.addEventListener('dexos:start-focus', handleDexStartFocus);
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => {
      window.removeEventListener('dexos:start-focus', handleDexStartFocus);
      window.removeEventListener('dexos:refresh', handleDexRefresh);
    };
  }, [projects, user, loadData, handleInstantFocus]);


  const endFocusSession = useCallback(async (elapsed) => {
    clearInterval(timerRef.current);
    const mins = Math.max(1, Math.round(elapsed / 60));
    setFocusDoneMin(mins);
    setFocusMode('done');
    if (!user) return;

    const newSess = {
      id: crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`,
      user_id: user.id,
      project_id: focusProject?.id || null,
      duration_minutes: mins,
      notes: focusNotes || null,
      session_date: todayStr(),
      started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
      ended_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    const updated = [newSess, ...sessions];
    setSessions(updated);
    try { localStorage.setItem(`dexos_growth_sessions_${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }

    const res = await serviceEndFocusSession({
      userId: user.id,
      projectId: focusProject?.id || null,
      durationMinutes: mins,
      sessionDate: todayStr(),
      startedAt: newSess.started_at,
      endedAt: newSess.ended_at,
      notes: focusNotes || null,
    });

    if (res.success) loadData(user.id);
  }, [user, focusProject, focusNotes, sessions, loadData]);

  // ─── Focus Timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (focusMode === 'active' && !focusPaused) {
      timerRef.current = setInterval(() => {
        setFocusElapsed(p => p + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [focusMode, focusPaused]);

  useEffect(() => {
    if (focusMode === 'active' && focusType === 'timed' && focusElapsed >= focusTimedMin * 60) {
      setTimeout(() => {
        endFocusSession(focusElapsed);
      }, 0);
    }
  }, [focusElapsed, focusMode, focusType, focusTimedMin, endFocusSession]);

  const closeFocusDone = () => {
    setFocusMode(null);
    setFocusProject(null);
    setFocusDoneMin(0);
    setFocusNotes('');
    if (user) loadData(user.id);
  };

  // ─── DB-First CRUD Functions ───────────────────────────────────────────────
  const createProject = async () => {
    if (!formProject.name.trim() || !user || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceCreateProject({
      userId: user.id,
      name: formProject.name,
      icon: formProject.icon,
      deadline: formProject.deadline,
    });

    if (!res.success) {
      showToast(`Failed to create project: ${res.error}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setProjects(prev => [res.data, ...prev]);
    showToast('📁 Project created!', 'success');
    setModalProject(false);
    setFormProject({ name: '', icon: '📁', deadline: '' });
    setIsSubmitting(false);
  };

  const createTask = async (projectId, taskForm) => {
    if (!taskForm.name.trim() || !projectId || !user || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceCreateTask({
      userId: user.id,
      name: taskForm.name,
      priority: taskForm.priority,
      dueDate: taskForm.due_date,
      projectId,
    });

    if (!res.success) {
      showToast(`Failed to create task: ${res.error}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setTasks(prev => [res.data, ...prev]);
    showToast('✅ Task added!', 'success');
    setIsSubmitting(false);
  };

  const addTask = async (name, projectId = null) => {
    if (!name.trim() || !user || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceCreateTask({
      userId: user.id,
      name,
      priority: 3,
      projectId,
    });

    if (!res.success) {
      showToast(`Failed to add task: ${res.error}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setTasks(prev => [res.data, ...prev]);
    showToast('✅ Task added!', 'success');
    setIsSubmitting(false);
  };

  const deleteTask = async (task) => {
    if (!user || !task || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceDeleteTask({ userId: user.id, taskId: task.id });
    if (!res.success) {
      showToast(`Failed to delete task: ${res.error}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setTasks(prev => prev.filter(t => t.id !== task.id));
    setDependencies(prev => prev.filter(d => d.task_id !== task.id && d.depends_on_task_id !== task.id));
    showToast('🗑 Task deleted', 'success');
    setIsSubmitting(false);
  };

  const completeTask = async (task) => {
    if (!user || !task || task.status === 'done' || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceCompleteTask({ userId: user.id, taskId: task.id, status: 'done' });

    if (!res.success) {
      showToast(`Failed to complete task: ${res.error}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setTasks(prev => prev.map(t => t.id === task.id ? res.data : t));
    setTodayTasksDone(p => p + 1);
    showToast('✔ Task complete!', 'success');
    setIsSubmitting(false);
  };

  const addDependency = async (taskId, dependsOnTaskId) => {
    if (!user || !taskId || !dependsOnTaskId || isSubmitting) return;
    if (taskId === dependsOnTaskId) {
      showToast('A task cannot depend on itself.', 'error');
      return;
    }

    const proposedEdges = dependencies.map(d => [d.task_id, d.depends_on_task_id]);
    if (hasCycle(proposedEdges, taskId, dependsOnTaskId)) {
      showToast('That dependency would create a cycle.', 'error');
      return;
    }

    setIsSubmitting(true);

    const { data, error: dbErr } = await supabase
      .from('growth_task_dependencies')
      .insert([{
        user_id: user.id,
        task_id: taskId,
        depends_on_task_id: dependsOnTaskId,
      }])
      .select()
      .single();

    if (dbErr) {
      showToast(`Failed to add dependency: ${dbErr.message}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setDependencies(prev => [...prev, data]);
    showToast('🔗 Dependency added!', 'success');
    setIsSubmitting(false);
  };

  const removeDependency = async (depId) => {
    if (!user || !depId || isSubmitting) return;
    setIsSubmitting(true);

    const { error: dbErr } = await supabase
      .from('growth_task_dependencies')
      .delete()
      .eq('id', depId)
      .eq('user_id', user.id);

    if (dbErr) {
      showToast(`Failed to remove dependency: ${dbErr.message}`, 'error');
      setIsSubmitting(false);
      return;
    }

    setDependencies(prev => prev.filter(d => d.id !== depId));
    showToast('🗑 Dependency removed', 'success');
    setIsSubmitting(false);
  };

  const createGoal = async (goalForm) => {
    if (!goalForm.name?.trim() || !user || isSubmitting) return;
    setIsSubmitting(true);

    const res = await serviceCreateGoal({
      userId: user.id,
      name: goalForm.name,
      projectId: goalForm.project_id || null,
      targetValue: goalForm.target_value,
      unit: goalForm.unit,
      deadline: goalForm.deadline || null,
    });

    if (res.success) {
      setGoals(prev => [res.data, ...prev]);
      showToast('🎯 Goal added!', 'success');
    } else {
      showToast(`Failed to create goal: ${res.error}`, 'error');
    }
    setIsSubmitting(false);
  };

  const updateGoalProgress = async (goal, val) => {
    if (!user || !goal) return;
    const currentVal = Number(val) || 0;
    const isComplete = currentVal >= Number(goal.target_value);

    const res = await serviceUpdateGoalProgress({
      userId: user.id,
      goalId: goal.id,
      currentValue: currentVal,
      isComplete,
    });

    if (res.success) {
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current_value: currentVal, is_complete: isComplete } : g));
    } else {
      showToast(`Failed to update goal: ${res.error}`, 'error');
    }
  };

  const openProjectDetail = (p) => {
    setPrevTab(tab);
    setSelectedProject(p);
    setView('project-detail');
  };

  // ─── Habit Actions ─────────────────────────────────────────────────────────
  const handleToggleHabit = useCallback(async (habit) => {
    if (!user || !habit?.id || submittingHabits[habit.id]) return;
    const today = todayStr();
    setSubmittingHabits(prev => ({ ...prev, [habit.id]: true }));

    try {
      const isCompleted = activity.some(l => l.habit_id === habit.id && l.completed_date === today && l.status === 'completed');
      const res = await serviceToggleHabit({
        userId: user.id,
        habitId: habit.id,
        date: today,
        isCompleted,
      });

      if (!res.success) {
        showToast(isCompleted ? 'Failed to undo habit' : 'Failed to complete habit', 'error');
      } else {
        showToast(isCompleted ? 'Habit undone' : '✅ Habit completed!', 'success');
        if (!isCompleted) {
          setActivity(prev => [...prev, res.data]);
        } else {
          setActivity(prev => prev.filter(l => !(l.habit_id === habit.id && l.completed_date === today && l.status === 'completed')));
        }
        // reload streaks
        const streaksRes = await supabase.from('user_streaks').select('*').eq('user_id', user.id);
        const streaksData = streaksRes?.data || [];
        const smap = {};
        const lmap = {};
        streaksData.forEach(s => {
          smap[s.habit_id] = s.current_streak;
          lmap[s.habit_id] = s.longest_streak || s.current_streak || 0;
        });
        setStreaks(smap);
        setLongestStreaks(lmap);
      }
    } finally {
      setSubmittingHabits(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
    }
  }, [user, activity, submittingHabits]);

  const handleSkipHabit = useCallback(async (habit) => {
    if (!user || !habit?.id || submittingHabits[habit.id]) return;
    const today = todayStr();
    setSubmittingHabits(prev => ({ ...prev, [habit.id]: true }));

    try {
      const res = await serviceSkipHabit({
        userId: user.id,
        habitId: habit.id,
        date: today,
      });

      if (res.success) {
        showToast('⏭️ Habit skipped for today', 'warning');
        setActivity(prev => [...prev, res.data]);
      } else {
        showToast('Failed to skip habit', 'error');
      }
    } finally {
      setSubmittingHabits(prev => {
        const next = { ...prev };
        delete next[habit.id];
        return next;
      });
    }
  }, [user, submittingHabits]);

  const saveHabit = async () => {
    if (!formHabit.name.trim() || !user || isSubmitting) return;
    setIsSubmitting(true);
    const color = ZONE_COLORS[formHabit.zone] || '#1FA36F';

    try {
      if (editHabit) {
        const res = await serviceUpdateHabit({
          userId: user.id,
          habitId: editHabit.id,
          name: formHabit.name.trim(),
          zone: formHabit.zone,
          icon: formHabit.icon,
          frequency: formHabit.frequency,
          reminder_enabled: formHabit.reminder_enabled,
          reminder_time: formHabit.reminder_time,
          color,
        });

        if (res.success) {
          showToast('✅ Habit updated!', 'success');
          setModalHabit(false);
          setEditHabit(null);
          loadData(user.id);
        } else {
          showToast('Failed to update habit', 'error');
        }
      } else {
        const res = await serviceCreateHabit({
          userId: user.id,
          name: formHabit.name.trim(),
          zone: formHabit.zone,
          icon: formHabit.icon,
          frequency: formHabit.frequency,
          reminderEnabled: formHabit.reminder_enabled,
          reminderTime: formHabit.reminder_time,
          color,
        });

        if (res.success) {
          showToast('🌱 Habit added!', 'success');
          setModalHabit(false);
          loadData(user.id);
        } else {
          showToast('Failed to add habit', 'error');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteHabit = async () => {
    if (!deleteHabitTarget || !user || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await serviceDeleteHabit({
        userId: user.id,
        habitId: deleteHabitTarget.id,
      });

      if (res.success) {
        showToast('🗑️ Habit deleted', 'info');
        setDeleteHabitTarget(null);
        loadData(user.id);
      } else {
        showToast('Failed to delete habit', 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── RENDER — Loading & Error ──────────────────────────────────────────────
  if (error) {
    return (
      <div className="app-container" style={{ background: C.bg, minHeight: '100vh', padding: '20px' }}>
        <ErrorState message={error} onRetry={() => loadData(user?.id)} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-container" style={{ background: C.bg, minHeight: '100vh', padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="skeleton-box" style={{ height: '10px', width: '30%' }} />
          <div className="skeleton-box" style={{ height: '24px', width: '70%' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="skeleton-box" style={{ height: '36px', flex: 1, borderRadius: '12px' }} />
          <div className="skeleton-box" style={{ height: '36px', flex: 1, borderRadius: '12px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '150px', borderRadius: '20px' }} />
        <div className="skeleton-box" style={{ height: '80px', borderRadius: '20px' }} />
      </div>
    );
  }

  // ─── RENDER — Focus setup / active / done ──────────────────────────────────
  if (focusMode) {
    return (
      <FocusSessionView
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        focusProject={focusProject}
        setFocusProject={setFocusProject}
        focusNotes={focusNotes}
        setFocusNotes={setFocusNotes}
        focusType={focusType}
        setFocusType={setFocusType}
        focusTimedMin={focusTimedMin}
        setFocusTimedMin={setFocusTimedMin}
        focusElapsed={focusElapsed}
        setFocusElapsed={setFocusElapsed}
        focusPaused={focusPaused}
        setFocusPaused={setFocusPaused}
        focusDoneMin={focusDoneMin}
        startFocusSession={startFocusSession}
        endFocusSession={endFocusSession}
        closeFocusDone={closeFocusDone}
      />
    );
  }

  // ─── RENDER — Project Detail ───────────────────────────────────────────────
  if (view === 'project-detail' && selectedProject) {
    return (
      <ProjectDetailView
        selectedProject={selectedProject}
        setView={setView}
        setTab={setTab}
        prevTab={prevTab}
        tasks={tasks}
        dependencies={dependencies}
        addDependency={addDependency}
        removeDependency={removeDependency}
        goals={goals}
        sessions={sessions}
        projectStatsMap={projectStatsMap}
        completeTask={completeTask}
        deleteTask={deleteTask}
        createTask={createTask}
        createGoal={createGoal}
        setFocusProject={setFocusProject}
        setFocusMode={setFocusMode}
        updateGoalProgress={updateGoalProgress}
      />
    );
  }

  // ─── RENDER — Main Growth Screen ───────────────────────────────────────────
  return (
    <div className="app-container page-enter" style={{
      background: 'var(--bg-root)',
      minHeight: '100vh',
      color: 'var(--text-primary)',
      position: 'relative',
      '--color-accent': '#1FA36F',
      '--color-accent-dim': 'rgba(31, 163, 111, 0.15)',
      '--color-accent-glow': 'rgba(31, 163, 111, 0.08)',
      '--color-accent-cyan': '#1FA36F',
      '--color-accent-cyan-dim': 'rgba(31, 163, 111, 0.15)',
      '--color-accent-cyan-glow': 'rgba(31, 163, 111, 0.08)',
    }}>

      {/* ── HEADER ──────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', color: C.growth, fontWeight: 800, letterSpacing: '2px', marginBottom: '4px' }}>GROWTH</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: C.text, letterSpacing: '-0.5px' }}>Build Yourself.</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          {streak.current_streak > 0 && (
            <div style={{ background: `${C.warn}15`, border: `1px solid ${C.warn}40`, borderRadius: '12px', padding: '6px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 900, color: C.warn }}>🔥 {streak.current_streak}</div>
              <div style={{ fontSize: '8px', color: C.muted, fontWeight: 700 }}>STREAK</div>
            </div>
          )}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: C.focus }}>{fmtHours(todayFocusMin)}</div>
            <div style={{ fontSize: '8px', color: C.muted, fontWeight: 700 }}>FOCUS</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '6px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '14px', fontWeight: 900, color: C.goal }}>{todayTasksDone}</div>
            <div style={{ fontSize: '8px', color: C.muted, fontWeight: 700 }}>DONE</div>
          </div>
        </div>
      </div>

      {/* ── TAB BAR ─────────────────────────────────────────────────── */}
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'today',  label: 'Today',  col: C.growth },
          { id: 'plan',   label: 'Plan',   col: '#5EE6F5' },
          { id: 'habits', label: 'Habits', col: '#1FA36F' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? `${t.col}20` : C.surface,
              border: `1px solid ${tab === t.id ? t.col : C.border}`,
              borderRadius: '12px',
              padding: '7px 16px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '12px',
              fontWeight: 800,
              color: tab === t.id ? t.col : C.muted,
              transition: 'all 0.2s',
              flexShrink: 0
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ padding: '18px 20px 120px' }}>
        {tab === 'today' && (
          <TodayTab
            todayFocusMin={todayFocusMin}
            todayView={todayView}
            dexosInsight={dexosInsight}
            setTab={setTab}
            completeTask={completeTask}
            deleteTask={deleteTask}
            addTask={addTask}
            tasks={tasks}
            dependencies={dependencies}
            projects={projects}
            projectMap={projectMap}
            onInstantFocus={handleInstantFocus}
            focusProject={focusProject}
            setFocusProject={setFocusProject}
            habits={habits}
            activity={activity}
            streaks={streaks}
            submittingHabits={submittingHabits}
            onToggleHabit={handleToggleHabit}
            onSkipHabit={handleSkipHabit}
          />
        )}
        {tab === 'plan' && (
          <PlanTab
            projects={projects}
            projectStatsMap={projectStatsMap}
            openProjectDetail={openProjectDetail}
            setModalProject={setModalProject}
            tasks={tasks}
            dependencies={dependencies}
            projectMap={projectMap}
            completeTask={completeTask}
            deleteTask={deleteTask}
            addTask={addTask}
            createTask={createTask}
            onInstantFocus={handleInstantFocus}
          />
        )}
        {tab === 'habits' && (
          <HabitsTab
            habits={habits}
            activity={activity}
            streaks={streaks}
            longestStreaks={longestStreaks}
            habitImpacts={habitImpacts}
            submittingHabits={submittingHabits}
            onToggleHabit={handleToggleHabit}
            onSkipHabit={handleSkipHabit}
            onEditHabit={(h) => {
              setEditHabit(h);
              setFormHabit({
                name: h.name,
                zone: h.zone || 'mind',
                icon: h.icon || '🌱',
                frequency: h.frequency || 'daily',
                reminder_enabled: !!h.reminder_enabled,
                reminder_time: h.reminder_time || '',
              });
              setModalHabit(true);
            }}
            onDeleteHabit={(h) => setDeleteHabitTarget(h)}
            onAddHabit={() => {
              setEditHabit(null);
              setFormHabit({ name: '', zone: 'mind', icon: '🌱', frequency: 'daily', reminder_enabled: false, reminder_time: '' });
              setModalHabit(true);
            }}
            yearlyCompletionsMap={yearlyCompletionsMap}
          />
        )}
      </div>

      {/* ── MODALS ──────────────────────────────────────────────────── */}

      {/* New Project */}
      {modalProject && (
        <Modal title="New Project" onClose={() => setModalProject(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Project name..." value={formProject.name} onChange={e => setFormProject(p => ({ ...p, name: e.target.value }))} />
            <FInput placeholder="Icon (emoji)" value={formProject.icon} onChange={e => setFormProject(p => ({ ...p, icon: e.target.value }))} />
            <div>
              <FLabel>DEADLINE (OPTIONAL)</FLabel>
              <FInput type="date" value={formProject.deadline} onChange={e => setFormProject(p => ({ ...p, deadline: e.target.value }))} />
            </div>
            <BtnPrimary label="Create Project" onClick={createProject} disabled={!formProject.name.trim()} />
          </div>
        </Modal>
      )}

      {/* Habit Create / Edit Modal */}
      {modalHabit && (
        <Modal title={editHabit ? 'Edit Habit' : 'New Habit'} onClose={() => setModalHabit(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <FLabel>HABIT NAME</FLabel>
              <FInput
                placeholder="e.g. 20 min deep reading..."
                value={formHabit.name}
                onChange={e => setFormHabit(p => ({ ...p, name: e.target.value }))}
                autoFocus
              />
            </div>

            <div>
              <FLabel>ZONE</FLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ZONE_OPTIONS.map(z => {
                  const isSel = formHabit.zone === z.id;
                  return (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setFormHabit(p => ({ ...p, zone: z.id }))}
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

            <div>
              <FLabel>ICON</FLabel>
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                {QUICK_ICONS.map(ic => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setFormHabit(p => ({ ...p, icon: ic }))}
                    style={{
                      background: formHabit.icon === ic ? '#1FA36F' : '#0B0D0F',
                      border: `1px solid ${formHabit.icon === ic ? '#1FA36F' : '#2E2F35'}`,
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

            <BtnPrimary
              label={editHabit ? 'Update Habit' : 'Create Habit'}
              onClick={saveHabit}
              disabled={!formHabit.name.trim()}
            />
          </div>
        </Modal>
      )}

      {/* Delete Habit Confirmation Modal */}
      {deleteHabitTarget && (
        <Modal title="Delete Habit?" onClose={() => setDeleteHabitTarget(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px' }}>🗑️</div>
            <div style={{ fontSize: '14px', color: '#A1A1AA' }}>
              Are you sure you want to delete "{deleteHabitTarget.name}"? This cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDeleteHabitTarget(null)}
                style={{ flex: 1, padding: '10px', background: '#2E2F35', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteHabit}
                style={{ flex: 1, padding: '10px', background: '#EF4444', border: 'none', borderRadius: '8px', color: '#FFF', fontWeight: 800, cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BottomNav activeTab="growth" onTabChange={t => navigate(`/${t}`)} />
    </div>
  );
}
