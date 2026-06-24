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

export default function Growth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
  const [focusType,      setFocusType]      = useState('open'); // open | timed
  const [focusTimedMin,  setFocusTimedMin]  = useState(45);
  const [focusElapsed,   setFocusElapsed]   = useState(0);
  const [focusPaused,    setFocusPaused]    = useState(false);
  const [focusDoneMin,   setFocusDoneMin]   = useState(0);
  const timerRef = useRef(null);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [modalProject,   setModalProject]   = useState(false);
  const [modalQuickTask, setModalQuickTask] = useState(false);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [formProject, setFormProject] = useState({ name: '', icon: '📁', deadline: '' });
  const [formQuick,   setFormQuick]   = useState({ name: '', project_id: '', priority: 3, due_date: '' });

  const loadData = useCallback(async (uid) => {
    setLoading(true);
    setError(null);
    const today = todayStr();
    try {
      const [
        { data: proj }, { data: taskData }, { data: sessData },
        { data: streakData }, { data: dailyData },
      ] = await Promise.all([
        supabase.from('growth_projects').select('*').eq('user_id', uid).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('growth_tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('growth_focus_sessions').select('*').eq('user_id', uid).order('session_date', { ascending: false }).limit(50),
        supabase.from('dexos_streaks').select('*').eq('user_id', uid).single(),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).eq('log_date', today).single(),
      ]);

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
      console.warn('Growth load error (tables may not exist yet):', e.message);
      setError(e.message);
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

  const nowTimestamp = useMemo(() => Date.now(), []);

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
      const daysSince = Math.ceil((Date.now() - new Date(last.session_date + 'T00:00:00').getTime()) / 86400000);
      return daysSince >= 3;
    });
    if (urgentUntouched) {
      const d = daysUntil(urgentUntouched.deadline);
      const last = sessions.find(s => s.project_id === urgentUntouched.id);
      const gap = last ? Math.ceil((Date.now() - new Date(last.session_date + 'T00:00:00').getTime()) / 86400000) : null;
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
  }, [projects, sessions, todayView.overdue, streak]);

  // ─── Focus Timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (focusMode === 'active' && !focusPaused) {
      timerRef.current = setInterval(() => {
        setFocusElapsed(p => {
          if (focusType === 'timed' && p >= focusTimedMin * 60 - 1) {
            endFocusSession(p + 1); return p + 1;
          }
          return p + 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMode, focusPaused, focusType, focusTimedMin]);

  const startFocusSession = () => {
    setFocusElapsed(0);
    setFocusPaused(false);
    setFocusMode('active');
  };

  const endFocusSession = async (elapsed = focusElapsed) => {
    clearInterval(timerRef.current);
    const mins = Math.max(1, Math.round(elapsed / 60));
    setFocusDoneMin(mins);
    setFocusMode('done');
    if (!user) return;
    try {
      await supabase.from('growth_focus_sessions').insert([{
        user_id: user.id,
        project_id: focusProject?.id || null,
        skill_id:   null,
        duration_minutes: mins,
        session_date: todayStr(),
        started_at:  new Date(Date.now() - elapsed * 1000).toISOString(),
        ended_at:    new Date().toISOString(),
      }]);
      try {
        await supabase.rpc('update_streak', { p_user_id: user.id, p_date: todayStr() });
      } catch { /* optional */ }
    } catch (e) { console.warn('Session save error:', e.message); }
  };

  const closeFocusDone = () => {
    setFocusMode(null);
    setFocusProject(null);
    setFocusDoneMin(0);
    if (user) loadData(user.id);
  };

  // ─── CRUD Functions ────────────────────────────────────────────────────────
  const createProject = async () => {
    if (!formProject.name.trim() || !user) return;
    try {
      await supabase.from('growth_projects').insert([{ ...formProject, deadline: formProject.deadline || null, user_id: user.id }]);
      showToast('📁 Project created!', 'success');
      setModalProject(false);
      setFormProject({ name: '', icon: '📁', deadline: '' });
      loadData(user.id);
    } catch { showToast('Error creating project', 'error'); }
  };

  const createTask = async (projectId, taskForm) => {
    if (!taskForm.name.trim() || !projectId || !user) return;
    try {
      await supabase.from('growth_tasks').insert([{
        name: taskForm.name, priority: taskForm.priority,
        due_date: taskForm.due_date || null,
        user_id: user.id, project_id: projectId,
      }]);
      showToast('✅ Task added!', 'success');
      loadData(user.id);
    } catch { showToast('Error creating task', 'error'); }
  };

  const createQuickTask = async () => {
    if (!formQuick.name.trim() || !formQuick.project_id || !user) return;
    try {
      await supabase.from('growth_tasks').insert([{
        name: formQuick.name, priority: formQuick.priority,
        due_date: formQuick.due_date || null,
        user_id: user.id, project_id: formQuick.project_id,
      }]);
      showToast('✅ Task added!', 'success');
      setModalQuickTask(false);
      setFormQuick({ name: '', project_id: '', priority: 3, due_date: '' });
      loadData(user.id);
    } catch { showToast('Error creating task', 'error'); }
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
    <div className="app-container page-enter" style={{ background: C.bg, minHeight: '100vh', color: C.text }}>

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
            setModalProject={setModalProject}
            projectMap={projectMap}
            heatmapData={heatmapData}
            navigate={navigate}
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

      {/* ── FABs ────────────────────────────────────────────────────── */}
      {/* Quick add task (bottom left, Today tab only) */}
      {tab === 'today' && (
        <button onClick={() => setModalQuickTask(true)}
          style={{ position: 'fixed', left: '20px', bottom: '84px', background: C.surface, border: `1px solid ${C.border2}`, borderRadius: '50%', width: '50px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 50 }}>
          <Plus size={20} color={C.growth} />
        </button>
      )}
      {/* Focus Session FAB (bottom right) */}
      <button id="growth-focus-fab" onClick={() => setFocusMode('setup')}
        style={{ position: 'fixed', right: '20px', bottom: '84px', background: `linear-gradient(135deg, ${C.focus}, #5048C8)`, border: 'none', borderRadius: '50%', width: '56px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 0 0 4px ${C.focus}18, 0 8px 24px ${C.focus}40`, zIndex: 50 }}
        aria-label="Start Focus Session">
        <Timer size={22} color="#fff" />
      </button>

      {/* ── MODALS ──────────────────────────────────────────────────── */}

      {/* Quick Task */}
      {modalQuickTask && (
        <Modal title="Quick Add Task" onClose={() => setModalQuickTask(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Task name..." value={formQuick.name} onChange={e => setFormQuick(p => ({ ...p, name: e.target.value }))} />
            <div>
              <FLabel>PROJECT</FLabel>
              <FSelect value={formQuick.project_id} onChange={e => setFormQuick(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </FSelect>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>PRIORITY</FLabel>
                <FSelect value={formQuick.priority} onChange={e => setFormQuick(p => ({ ...p, priority: Number(e.target.value) }))}>
                  <option value={1}>🔥 Critical</option>
                  <option value={2}>⬆ High</option>
                  <option value={3}>Normal</option>
                </FSelect>
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>DUE DATE</FLabel>
                <FInput type="date" value={formQuick.due_date} onChange={e => setFormQuick(p => ({ ...p, due_date: e.target.value }))} />
              </div>
            </div>
            <BtnPrimary label="Add Task" onClick={createQuickTask} disabled={!formQuick.name.trim() || !formQuick.project_id} />
          </div>
        </Modal>
      )}

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
