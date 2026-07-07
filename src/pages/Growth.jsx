import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import BottomNav from '../components/BottomNav.jsx';
import { showToast } from '../components/Toast.jsx';
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
} from '../components/growth/shared.jsx';
import ErrorState from '../components/ErrorState.jsx';

import TodayTab from '../components/growth/TodayTab.jsx';
import ProjectsTab from '../components/growth/ProjectsTab.jsx';
import FocusSessionView from '../components/growth/FocusSessionView.jsx';
import ProjectDetailView from '../components/growth/ProjectDetailView.jsx';
import { earnZyrons } from '../lib/zyrons.js';

export default function Growth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mountTime] = useState(() => Date.now());

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('today');          // today | projects
  const [view, setView] = useState('list');          // list | project-detail
  const [prevTab, setPrevTab] = useState('today');
  const [selectedProject, setSelectedProject] = useState(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [projects,        setProjects]        = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [sessions,        setSessions]        = useState([]);
  const [streak,          setStreak]          = useState({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [todayFocusMin,   setTodayFocusMin]   = useState(0);
  const [todayTasksDone,  setTodayTasksDone]  = useState(0);

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

  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    const today = todayStr();
    const lsKey = (kind) => `dexos_growth_${kind}_${uid}`;
    const lsGet = (kind) => { try { return JSON.parse(localStorage.getItem(lsKey(kind))); } catch { return null; } };

    try {
      const [
        pRes,
        tRes,
        sRes,
        stRes,
        dRes
      ] = await Promise.all([
        supabase.from('growth_projects').select('*').eq('user_id', uid).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('growth_tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('growth_focus_sessions').select('*').eq('user_id', uid).order('session_date', { ascending: false }).limit(50),
        supabase.from('dexos_streaks').select('*').eq('user_id', uid).maybeSingle(),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).eq('log_date', today).maybeSingle(),
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
      setSessions(sessData || []);
      setStreak(streakData || { current_streak: 0, longest_streak: 0, last_active_date: null });

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

  const heatmapData = useMemo(() => {
    const map = {};
    // Add completed tasks
    tasks.forEach(t => {
      if (t.status === 'done' && t.completed_at) {
        const dateStr = t.completed_at.split('T')[0];
        map[dateStr] = (map[dateStr] || 0) + 1;
      }
    });
    // Add focus sessions
    sessions.forEach(s => {
      if (s.session_date) {
        map[s.session_date] = (map[s.session_date] || 0) + 1;
      }
    });
    return map;
  }, [tasks, sessions]);

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

  const handleInstantFocus = (type, minutes, notes, project = null) => {
    setFocusType(type);
    setFocusTimedMin(minutes);
    setFocusProject(project);
    setFocusNotes(notes);
    startFocusSession();
  };

  const startFocusSession = () => {
    setFocusElapsed(0);
    setFocusPaused(false);
    setFocusMode('active');
  };

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

    const { error: dbErr } = await supabase.from('growth_focus_sessions').insert([{
      user_id: user.id,
      project_id: focusProject?.id || null,
      skill_id:   null,
      duration_minutes: mins,
      session_date: todayStr(),
      started_at:  newSess.started_at,
      ended_at:    newSess.ended_at,
      notes:       focusNotes || null,
    }]);

    try {
      await earnZyrons(user.id, mins, `Focused work on "${focusNotes || 'Task'}"`, 'focus', 'growth');
    } catch (err) {
      console.warn('Error awarding XP:', err);
    }
    try {
      await supabase.rpc('update_streak', { p_user_id: user.id, p_date: todayStr() });
    } catch { /* optional */ }

    if (!dbErr) loadData(user.id);
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

  // ─── CRUD Functions ────────────────────────────────────────────────────────
  const createProject = async () => {
    if (!formProject.name.trim() || !user) return;
    const newProj = {
      id: crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`,
      user_id: user.id,
      name: formProject.name,
      icon: formProject.icon,
      deadline: formProject.deadline || null,
      status: 'active',
      created_at: new Date().toISOString()
    };

    const updated = [newProj, ...projects];
    setProjects(updated);
    try { localStorage.setItem(`dexos_growth_projects_${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }

    const { error: dbErr } = await supabase.from('growth_projects').insert([{ ...formProject, deadline: formProject.deadline || null, user_id: user.id }]);
    showToast('📁 Project created!', 'success');
    setModalProject(false);
    setFormProject({ name: '', icon: '📁', deadline: '' });
    if (!dbErr) loadData(user.id);
  };

  const createTask = async (projectId, taskForm) => {
    if (!taskForm.name.trim() || !projectId || !user) return;
    const newT = {
      id: crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`,
      user_id: user.id,
      project_id: projectId,
      name: taskForm.name,
      priority: taskForm.priority,
      status: 'todo',
      due_date: taskForm.due_date || null,
      created_at: new Date().toISOString()
    };

    const updated = [newT, ...tasks];
    setTasks(updated);
    try { localStorage.setItem(`dexos_growth_tasks_${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }

    const { error: dbErr } = await supabase.from('growth_tasks').insert([{
      name: taskForm.name, priority: taskForm.priority,
      due_date: taskForm.due_date || null,
      user_id: user.id, project_id: projectId,
    }]);
    showToast('✅ Task added!', 'success');
    if (!dbErr) loadData(user.id);
  };

  const addTask = async (name, projectId = null) => {
    if (!name.trim() || !user) return;
    const newT = {
      id: crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`,
      user_id: user.id,
      project_id: projectId || null,
      name,
      priority: 3,
      status: 'todo',
      due_date: null,
      created_at: new Date().toISOString()
    };

    const updated = [newT, ...tasks];
    setTasks(updated);
    try { localStorage.setItem(`dexos_growth_tasks_${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }

    const { error: dbErr } = await supabase.from('growth_tasks').insert([{
      name,
      priority: 3,
      user_id: user.id,
      project_id: projectId || null,
    }]);
    showToast('✅ Task added!', 'success');
    if (!dbErr) loadData(user.id);
  };

  const deleteTask = async (task) => {
    if (!user) return;
    const updated = tasks.filter(t => t.id !== task.id);
    setTasks(updated);
    try { localStorage.setItem(`dexos_growth_tasks_${user.id}`, JSON.stringify(updated)); } catch { /* ignore */ }
    
    await supabase.from('growth_tasks').delete().eq('id', task.id);
    showToast('🗑 Task deleted', 'success');
  };

  const completeTask = async (task) => {
    if (task.status === 'done') return;
    const now = new Date().toISOString();
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'done', completed_at: now } : t));
    setTodayTasksDone(p => p + 1);
    try {
      await supabase.from('growth_tasks').update({ status: 'done', completed_at: now }).eq('id', task.id);
      showToast('✔ Task complete!', 'success');
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'todo', completed_at: null } : t));
      setTodayTasksDone(p => p - 1);
      showToast('Error completing task', 'error');
    }
  };

  const openProjectDetail = (p) => {
    setPrevTab(tab);
    setSelectedProject(p);
    setView('project-detail');
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
        projects={projects}
        skills={[]}
        focusProject={focusProject}
        setFocusProject={setFocusProject}
        focusNotes={focusNotes}
        setFocusNotes={setFocusNotes}
        focusSkill={null}
        setFocusSkill={() => null}
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
        goals={[]}
        sessions={sessions}
        projectStatsMap={projectStatsMap}
        completeTask={completeTask}
        createTask={createTask}
        createGoal={() => null}
        setFocusProject={setFocusProject}
        setFocusMode={setFocusMode}
        updateGoalProgress={() => null}
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
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, background: `linear-gradient(135deg, ${C.text}, ${C.muted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Build Yourself.</h1>
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
      <div style={{ padding: '14px 20px 0', display: 'flex', gap: '7px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'today',    label: 'Today',    col: C.growth },
          { id: 'projects', label: 'Projects', col: C.project },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ background: tab === t.id ? `${t.col}20` : C.surface, border: `1px solid ${tab === t.id ? t.col : C.border}`, borderRadius: '12px', padding: '7px 14px', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 800, color: tab === t.id ? t.col : C.muted, transition: 'all 0.2s', flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ padding: '18px 20px 120px' }}>
        {tab === 'today' && (
          <TodayTab
            activeSprint={null}
            sprintProgress={null}
            todayFocusMin={todayFocusMin}
            todayView={todayView}
            dexosInsight={dexosInsight}
            setTab={setTab}
            completeTask={completeTask}
            deleteTask={deleteTask}
            addTask={addTask}
            projects={projects}
            projectMap={projectMap}
            heatmapData={heatmapData}
            navigate={navigate}
            onInstantFocus={handleInstantFocus}
            focusProject={focusProject}
            setFocusProject={setFocusProject}
          />
        )}
        {tab === 'projects' && (
          <ProjectsTab
            projects={projects}
            projectStatsMap={projectStatsMap}
            sprintProjectIds={[]}
            openProjectDetail={openProjectDetail}
            setModalProject={setModalProject}
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

      <BottomNav activeTab="growth" onTabChange={t => navigate(`/${t}`)} />
    </div>
  );
}
