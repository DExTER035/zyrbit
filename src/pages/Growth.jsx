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

import TodayTab from '../components/growth/TodayTab.jsx';
import ProjectsTab from '../components/growth/ProjectsTab.jsx';
import GoalsTab from '../components/growth/GoalsTab.jsx';
import SprintsTab from '../components/growth/SprintsTab.jsx';
import SkillsTab from '../components/growth/SkillsTab.jsx';
import FocusSessionView from '../components/growth/FocusSessionView.jsx';
import ProjectDetailView from '../components/growth/ProjectDetailView.jsx';

export default function Growth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState('today');          // today | projects | goals | sprints | skills
  const [view, setView] = useState('list');          // list | project-detail
  const [prevTab, setPrevTab] = useState('today');
  const [selectedProject, setSelectedProject] = useState(null);

  // ── Data ───────────────────────────────────────────────────────────────────
  const [projects,        setProjects]        = useState([]);
  const [tasks,           setTasks]           = useState([]);
  const [goals,           setGoals]           = useState([]);
  const [activeSprint,    setActiveSprint]    = useState(null);
  const [sprintProjectIds, setSprintProjectIds] = useState([]);
  const [skills,          setSkills]          = useState([]);
  const [sessions,        setSessions]        = useState([]);
  const [skillSessions,   setSkillSessions]   = useState([]); // all sessions w/ skill_id for hours calc
  const [streak,          setStreak]          = useState({ current_streak: 0, longest_streak: 0, last_active_date: null });
  const [todayFocusMin,   setTodayFocusMin]   = useState(0);
  const [todayTasksDone,  setTodayTasksDone]  = useState(0);

  // ── Focus Session ──────────────────────────────────────────────────────────
  const [focusMode,      setFocusMode]      = useState(null); // null | setup | active | done
  const [focusProject,   setFocusProject]   = useState(null);
  const [focusSkill,     setFocusSkill]     = useState(null);
  const [focusType,      setFocusType]      = useState('open'); // open | timed
  const [focusTimedMin,  setFocusTimedMin]  = useState(45);
  const [focusElapsed,   setFocusElapsed]   = useState(0);
  const [focusPaused,    setFocusPaused]    = useState(false);
  const [focusDoneMin,   setFocusDoneMin]   = useState(0);
  const timerRef = useRef(null);

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [modalProject,   setModalProject]   = useState(false);
  const [modalGoal,      setModalGoal]      = useState(false);
  const [modalSprint,    setModalSprint]    = useState(false);
  const [modalSkill,     setModalSkill]     = useState(false);
  const [modalEndSprint, setModalEndSprint] = useState(false);
  const [modalQuickTask, setModalQuickTask] = useState(false);
  const [modalLogTime,   setModalLogTime]   = useState(false);

  // ── Forms ──────────────────────────────────────────────────────────────────
  const [formProject, setFormProject] = useState({ name: '', icon: '📁', deadline: '' });
  const [formGoal,    setFormGoal]    = useState({ name: '', target_value: '1', unit: 'done', deadline: '', project_id: '' });
  const [formSprint,  setFormSprint]  = useState({ name: '', duration_days: 21, daily_focus_minutes: 90, project_ids: [] });
  const [formSkill,   setFormSkill]   = useState({ name: '', icon: '⚡', category: 'technical' });
  const [formQuick,   setFormQuick]   = useState({ name: '', project_id: '', priority: 3, due_date: '' });
  const [formLog,     setFormLog]     = useState({ project_id: '', skill_id: '', hours: '1', minutes: '0', date: todayStr(), notes: '' });



  const loadData = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();
    try {
      const [
        { data: proj }, { data: taskData }, { data: goalData },
        { data: sprintData }, { data: skillData }, { data: sessData },
        { data: skillSessData }, { data: streakData }, { data: dailyData },
      ] = await Promise.all([
        supabase.from('growth_projects').select('*').eq('user_id', uid).neq('status', 'archived').order('created_at', { ascending: false }),
        supabase.from('growth_tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('study_goals').select('*').eq('user_id', uid).eq('pillar', 'growth').order('created_at', { ascending: false }),
        supabase.from('growth_sprints').select('*').eq('user_id', uid).eq('status', 'active').limit(1),
        supabase.from('growth_skills').select('*').eq('user_id', uid).order('created_at', { ascending: false }),
        supabase.from('growth_focus_sessions').select('*').eq('user_id', uid).order('session_date', { ascending: false }).limit(50),
        supabase.from('growth_focus_sessions').select('skill_id, duration_minutes').eq('user_id', uid).not('skill_id', 'is', null),
        supabase.from('dexos_streaks').select('*').eq('user_id', uid).single(),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).eq('log_date', today).single(),
      ]);

      setProjects(proj || []);
      setTasks(taskData || []);
      setGoals(goalData || []);
      setSkills(skillData || []);
      setSessions(sessData || []);
      setSkillSessions(skillSessData || []);
      setStreak(streakData || { current_streak: 0, longest_streak: 0, last_active_date: null });

      if (dailyData) {
        setTodayFocusMin(dailyData.focus_minutes || 0);
        setTodayTasksDone(dailyData.tasks_completed || 0);
      } else {
        const todaySess = (sessData || []).filter(s => s.session_date === today);
        setTodayFocusMin(todaySess.reduce((s, x) => s + x.duration_minutes, 0));
        setTodayTasksDone((taskData || []).filter(t => t.completed_at?.startsWith(today)).length);
      }

      const sprint = sprintData?.[0] || null;
      setActiveSprint(sprint);
      if (sprint) {
        setSprintProjectIds((proj || []).map(p => p.id));
      } else {
        setSprintProjectIds([]);
      }
    } catch (e) {
      console.warn('Growth load error (tables may not exist yet):', e.message);
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

  const skillHoursMap = useMemo(() => {
    const map = {};
    for (const s of skillSessions) {
      if (s.skill_id) map[s.skill_id] = (map[s.skill_id] || 0) + s.duration_minutes;
    }
    return map;
  }, [skillSessions]);

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

  const sprintProgress = useMemo(() => {
    if (!activeSprint) return { day: 0, totalDays: 21, pct: 0, focusPct: 0 };
    const start = new Date(activeSprint.start_date + 'T00:00:00');
    const end   = new Date(activeSprint.end_date + 'T00:00:00');
    const totalDays = Math.max(1, Math.round((end - start) / 86400000));
    const day = Math.max(1, Math.min(totalDays, Math.ceil((Date.now() - start.getTime()) / 86400000)));
    const totalTarget = activeSprint.daily_focus_minutes * totalDays;
    const focusLogged = activeSprint.focus_logged_minutes || 0;
    return {
      day, totalDays, pct: Math.round((day / totalDays) * 100),
      focusPct: totalTarget > 0 ? Math.min(Math.round((focusLogged / totalTarget) * 100), 100) : 0,
      focusLogged, totalTarget,
    };
  }, [activeSprint]);

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
    const sprintHi   = candidates.filter(t => sprintProjectIds.includes(t.project_id) && t.priority <= 2 && !dueToday.find(d => d.id === t.id));
    const anyHi      = candidates.filter(t => t.priority <= 2 && !dueToday.find(d => d.id === t.id) && !sprintHi.find(s => s.id === t.id));
    const dueSoon    = candidates.filter(t => { const d = daysUntil(t.due_date); return d !== null && d > 0 && d <= 3 && !dueToday.find(x => x.id === t.id); });

    const doToday = [];
    const seen = new Set();
    for (const t of [...dueToday, ...sprintHi, ...anyHi, ...dueSoon]) {
      if (!seen.has(t.id) && doToday.length < 3) { seen.add(t.id); doToday.push(t); }
    }

    const deadlines = [
      ...projects.filter(p => { const d = daysUntil(p.deadline); return d !== null && d >= 0 && d <= 7; })
        .map(p => ({ name: p.name, icon: p.icon, days: daysUntil(p.deadline), type: 'project' })),
      ...goals.filter(g => { const d = daysUntil(g.deadline); return d !== null && d >= 0 && d <= 7 && !g.is_complete; })
        .map(g => ({ name: g.name, icon: '🎯', days: daysUntil(g.deadline), type: 'goal' })),
    ].sort((a, b) => a.days - b.days);

    return { overdue, doToday, deadlines };
  }, [tasks, projects, goals, sprintProjectIds]);

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
    if (activeSprint && todayFocusMin === 0 && new Date().getHours() >= 18) {
      return `0/${activeSprint.daily_focus_minutes}m logged today. Sprint target unmet.`;
    }
    if (todayView.overdue.length > 0) {
      return `${todayView.overdue.length} overdue task${todayView.overdue.length > 1 ? 's' : ''}. Start with the oldest.`;
    }
    if (streak.current_streak >= 3) {
      return `Day ${streak.current_streak} streak. Don't break it — log at least 10 minutes today.`;
    }
    return 'Every focused session compounds. Open a project and start.';
  }, [projects, sessions, activeSprint, todayFocusMin, streak, todayView.overdue]);

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
        skill_id:   focusSkill?.id   || null,
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
    setFocusSkill(null);
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

  const createGoal = async (goalForm) => {
    if (!goalForm.name.trim() || !goalForm.project_id || !user) return;
    try {
      await supabase.from('study_goals').insert([{
        name: goalForm.name,
        target_value: Number(goalForm.target_value) || 1,
        current_value: 0,
        unit: goalForm.unit || 'done',
        deadline: goalForm.deadline || null,
        user_id: user.id,
        project_id: goalForm.project_id,
        pillar: 'growth'
      }]);
      showToast('🎯 Goal set!', 'success');
      loadData(user.id);
    } catch { showToast('Error creating goal', 'error'); }
  };

  const createGoalFromTab = async () => {
    if (!formGoal.name.trim() || !formGoal.project_id || !user) return;
    await createGoal(formGoal);
    setFormGoal({ name: '', target_value: '1', unit: 'done', deadline: '', project_id: '' });
    setModalGoal(false);
  };

  const updateGoalProgress = async (goal, newVal) => {
    const v = Math.max(0, Math.min(Number(newVal), Number(goal.target_value)));
    const isComplete = v >= Number(goal.target_value);
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, current_value: v, is_complete: isComplete } : g));
    try {
      await supabase.from('study_goals').update({ current_value: v, is_complete: isComplete }).eq('id', goal.id);
      if (isComplete) showToast('🏁 Goal complete!', 'success');
    } catch { showToast('Error updating goal', 'error'); }
  };

  const createSprint = async () => {
    if (!formSprint.name.trim() || !user) return;
    if (activeSprint) { showToast('End your current sprint first.', 'warning'); return; }
    try {
      const start = new Date();
      const end   = new Date(); end.setDate(end.getDate() + formSprint.duration_days);
      const { error } = await supabase.from('growth_sprints').insert([{
        name: formSprint.name,
        daily_focus_minutes: formSprint.daily_focus_minutes,
        start_date: start.toISOString().split('T')[0],
        end_date:   end.toISOString().split('T')[0],
        user_id: user.id,
      }]);
      if (error) throw error;
      showToast('⚡ Sprint started!', 'success');
      setModalSprint(false);
      setFormSprint({ name: '', duration_days: 21, daily_focus_minutes: 90, project_ids: [] });
      loadData(user.id);
    } catch { showToast('Error creating sprint', 'error'); }
  };

  const confirmEndSprint = async () => {
    if (!activeSprint) return;
    try {
      await supabase.from('growth_sprints').update({ status: 'completed' }).eq('id', activeSprint.id);
      showToast('Sprint completed.', 'success');
      setModalEndSprint(false);
      loadData(user.id);
    } catch { showToast('Error ending sprint', 'error'); }
  };

  const createSkill = async () => {
    if (!formSkill.name.trim() || !user) return;
    try {
      await supabase.from('growth_skills').insert([{ ...formSkill, user_id: user.id }]);
      showToast('⚡ Skill added!', 'success');
      setModalSkill(false);
      setFormSkill({ name: '', icon: '⚡', category: 'technical' });
      loadData(user.id);
    } catch { showToast('Error creating skill', 'error'); }
  };

  const logTime = async () => {
    const mins = Math.max(1, (Number(formLog.hours) || 0) * 60 + (Number(formLog.minutes) || 0));
    if (!formLog.project_id || !user || mins < 1) { showToast('Select a project and enter time.', 'warning'); return; }
    try {
      await supabase.from('growth_focus_sessions').insert([{
        user_id: user.id,
        project_id: formLog.project_id,
        skill_id: formLog.skill_id || null,
        duration_minutes: mins,
        notes: formLog.notes || null,
        session_date: formLog.date || todayStr(),
        created_at: new Date().toISOString(),
      }]);
      showToast(`✅ ${fmtHours(mins)} logged!`, 'success');
      setModalLogTime(false);
      setFormLog({ project_id: '', skill_id: '', hours: '1', minutes: '0', date: todayStr(), notes: '' });
      loadData(user.id);
    } catch { showToast('Error logging time', 'error'); }
  };


  const openProjectDetail = (p) => {
    setPrevTab(tab);
    setSelectedProject(p);
    setView('project-detail');
  };

  // ─── RENDER — Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${C.growth}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '2px' }}>LOADING GROWTH</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
        skills={skills}
        focusProject={focusProject}
        setFocusProject={setFocusProject}
        focusSkill={focusSkill}
        setFocusSkill={setFocusSkill}
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
        goals={goals}
        sessions={sessions}
        projectStatsMap={projectStatsMap}
        completeTask={completeTask}
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
          { id: 'goals',    label: 'Goals',    col: C.goal },
          { id: 'sprints',  label: 'Sprint',   col: C.sprint },
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
            activeSprint={activeSprint}
            sprintProgress={sprintProgress}
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
            sprintProjectIds={sprintProjectIds}
            openProjectDetail={openProjectDetail}
            setModalProject={setModalProject}
          />
        )}
        {tab === 'goals' && (
          <GoalsTab
            goals={goals}
            projectMap={projectMap}
            updateGoalProgress={updateGoalProgress}
            setModalGoal={setModalGoal}
          />
        )}
        {tab === 'sprints' && (
          <SprintsTab
            activeSprint={activeSprint}
            sprintProgress={sprintProgress}
            sprintProjectIds={sprintProjectIds}
            projects={projects}
            projectStatsMap={projectStatsMap}
            tasks={tasks}
            completeTask={completeTask}
            openProjectDetail={openProjectDetail}
            setModalSprint={setModalSprint}
            setModalEndSprint={setModalEndSprint}
          />
        )}
        {tab === 'skills' && (
          <SkillsTab
            skills={skills}
            skillHoursMap={skillHoursMap}
            sessions={sessions}
            setModalSkill={setModalSkill}
            now={nowTimestamp}
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
      {/* Log Time (bottom left, visible on other tabs) */}
      {tab !== 'today' && (
        <button onClick={() => setModalLogTime(true)}
          style={{ position: 'fixed', left: '20px', bottom: '84px', background: C.surface, border: `1px solid ${C.focus}60`, borderRadius: '14px', height: '44px', padding: '0 14px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', zIndex: 50 }}>
          <Timer size={14} color={C.focus} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: C.focus }}>Log Time</span>
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

      {/* Log Time */}
      {modalLogTime && (
        <Modal title="Log Study Time" onClose={() => setModalLogTime(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <FLabel>PROJECT</FLabel>
              <FSelect value={formLog.project_id} onChange={e => setFormLog(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </FSelect>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>HOURS</FLabel>
                <FInput type="number" placeholder="1" value={formLog.hours} onChange={e => setFormLog(p => ({ ...p, hours: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>MINUTES</FLabel>
                <FSelect value={formLog.minutes} onChange={e => setFormLog(p => ({ ...p, minutes: e.target.value }))}>
                  <option value="0">0</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="45">45</option>
                </FSelect>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>SKILL (OPTIONAL)</FLabel>
                <FSelect value={formLog.skill_id} onChange={e => setFormLog(p => ({ ...p, skill_id: e.target.value }))}>
                  <option value="">None</option>
                  {skills.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                </FSelect>
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>DATE</FLabel>
                <FInput type="date" value={formLog.date} onChange={e => setFormLog(p => ({ ...p, date: e.target.value }))} />
              </div>
            </div>
            <FInput placeholder="Note (optional)..." value={formLog.notes} onChange={e => setFormLog(p => ({ ...p, notes: e.target.value }))} />
            <BtnPrimary label={`Log ${fmtHours((Number(formLog.hours) || 0) * 60 + (Number(formLog.minutes) || 0))}`} onClick={logTime} color={C.focus} disabled={!formLog.project_id} />
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

      {/* New Goal from Goals tab */}
      {modalGoal && (
        <Modal title="New Goal" onClose={() => setModalGoal(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Goal name..." value={formGoal.name} onChange={e => setFormGoal(p => ({ ...p, name: e.target.value }))} />
            <div>
              <FLabel>PROJECT</FLabel>
              <FSelect value={formGoal.project_id} onChange={e => setFormGoal(p => ({ ...p, project_id: e.target.value }))}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </FSelect>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>TARGET</FLabel>
                <FInput type="number" placeholder="10" value={formGoal.target_value} onChange={e => setFormGoal(p => ({ ...p, target_value: e.target.value }))} />
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>UNIT</FLabel>
                <FInput placeholder="problems, pages..." value={formGoal.unit} onChange={e => setFormGoal(p => ({ ...p, unit: e.target.value }))} />
              </div>
            </div>
            <FInput type="date" value={formGoal.deadline} onChange={e => setFormGoal(p => ({ ...p, deadline: e.target.value }))} />
            <BtnPrimary label="Set Goal" onClick={createGoalFromTab} color={C.goal} disabled={!formGoal.name.trim() || !formGoal.project_id} />
          </div>
        </Modal>
      )}

      {/* New Sprint */}
      {modalSprint && (
        <Modal title="Start Sprint" onClose={() => setModalSprint(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <FInput placeholder='Sprint name (e.g. "DSA Blitz · July")' value={formSprint.name} onChange={e => setFormSprint(p => ({ ...p, name: e.target.value }))} />
            <div>
              <FLabel>DURATION</FLabel>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[7, 14, 21].map(d => (
                  <button key={d} onClick={() => setFormSprint(p => ({ ...p, duration_days: d }))}
                    style={{ flex: 1, background: formSprint.duration_days === d ? `${C.sprint}20` : C.surface, border: `1px solid ${formSprint.duration_days === d ? C.sprint : C.border}`, borderRadius: '10px', padding: '8px', fontSize: '12px', fontWeight: 800, color: formSprint.duration_days === d ? C.sprint : C.sub, cursor: 'pointer' }}>
                    {d}d
                  </button>
                ))}
                <div style={{ flex: 1 }}>
                  <FInput type="number" placeholder="Custom" value={[7, 14, 21].includes(formSprint.duration_days) ? '' : String(formSprint.duration_days)} onChange={e => setFormSprint(p => ({ ...p, duration_days: Number(e.target.value) || 21 })) } style={{ padding: '8px', textAlign: 'center', fontSize: '12px' }} />
                </div>
              </div>
            </div>
            <div>
              <FLabel>DAILY FOCUS TARGET</FLabel>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[60, 90, 120, 180].map(m => (
                  <button key={m} onClick={() => setFormSprint(p => ({ ...p, daily_focus_minutes: m }))}
                    style={{ flex: 1, background: formSprint.daily_focus_minutes === m ? `${C.sprint}20` : C.surface, border: `1px solid ${formSprint.daily_focus_minutes === m ? C.sprint : C.border}`, borderRadius: '10px', padding: '8px', fontSize: '11px', fontWeight: 800, color: formSprint.daily_focus_minutes === m ? C.sprint : C.sub, cursor: 'pointer' }}>
                    {m}m
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: `${C.sprint}10`, border: `1px solid ${C.sprint}30`, borderRadius: '12px', padding: '10px 14px' }}>
              <span style={{ fontSize: '11px', color: C.sub, lineHeight: 1.5 }}>
                {formSprint.duration_days}d sprint · {formSprint.daily_focus_minutes}m/day · {fmtHours(formSprint.duration_days * formSprint.daily_focus_minutes)} total target
              </span>
            </div>
            <BtnPrimary label="⚡ Start Sprint" onClick={createSprint} color={C.sprint} disabled={!formSprint.name.trim()} />
          </div>
        </Modal>
      )}

      {/* New Skill */}
      {modalSkill && (
        <Modal title="Add Skill" onClose={() => setModalSkill(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FInput placeholder="Skill name (e.g. DSA, React, Writing)" value={formSkill.name} onChange={e => setFormSkill(p => ({ ...p, name: e.target.value }))} />
            <FInput placeholder="Icon (emoji)" value={formSkill.icon} onChange={e => setFormSkill(p => ({ ...p, icon: e.target.value }))} />
            <div>
              <FLabel>CATEGORY</FLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {['technical', 'academic', 'creative', 'professional'].map(cat => (
                  <button key={cat} onClick={() => setFormSkill(p => ({ ...p, category: cat }))}
                    style={{ background: formSkill.category === cat ? `${C.skill}20` : C.surface, border: `1px solid ${formSkill.category === cat ? C.skill : C.border}`, borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: formSkill.category === cat ? C.skill : C.sub, transition: 'all 0.2s', textTransform: 'capitalize' }}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <BtnPrimary label="Add Skill" onClick={createSkill} color={C.skill} disabled={!formSkill.name.trim()} />
          </div>
        </Modal>
      )}

      {/* End Sprint Confirmation */}
      {modalEndSprint && activeSprint && (
        <Modal title="End Sprint?" onClose={() => setModalEndSprint(false)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: `${C.danger}10`, border: `1px solid ${C.danger}30`, borderRadius: '14px', padding: '14px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>⚠</span>
                <div style={{ fontSize: '12px', color: C.sub, lineHeight: 1.5 }}>This is irreversible. The sprint will be closed and a new one can be started.</div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Sprint', value: activeSprint.name },
                { label: 'Day', value: `${sprintProgress.day} of ${sprintProgress.totalDays}` },
                { label: 'Focus logged', value: fmtHours(sprintProgress.focusLogged || 0) },
                { label: 'Total target', value: fmtHours(sprintProgress.totalTarget || 0) },
                { label: 'Completion', value: `${sprintProgress.focusPct}%` },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: C.muted }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: C.text }}>{r.value}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalEndSprint(false)}
                style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px', color: C.sub, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Keep Going
              </button>
              <button onClick={confirmEndSprint}
                style={{ flex: 1, background: C.danger, border: 'none', borderRadius: '14px', padding: '12px', color: '#fff', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}>
                End Sprint
              </button>
            </div>
          </div>
        </Modal>
      )}

      <BottomNav activeTab="growth" onTabChange={t => navigate(`/${t}`)} />
    </div>
  );
}
