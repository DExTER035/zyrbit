import React, { useState, useMemo } from 'react';
import { Plus, ArrowRight } from 'lucide-react';
import {
  C,
  todayStr,
  SectionLabel,
  TaskRow
} from './shared.jsx';
import { getAvailableTasks, getBlockedTasks } from '../../../engines/growth/index.js';

export default function TodayTab({
  todayFocusMin = 0,
  todayView,
  dexosInsight,
  setTab,
  completeTask,
  deleteTask,
  addTask,
  tasks = [],
  dependencies = [],
  projects = [],
  projectMap = {},
  onInstantFocus,
  focusProject,
  setFocusProject,
  habits = [],
  activity = [],
  streaks = {},
  submittingHabits = {},
  onToggleHabit,
  onSkipHabit,
}) {
  const ACCENT = '#1FA36F';
  const CARD_BG = '#15181B';
  const SURFACE_BG = '#0B0D0F';
  const today = todayStr();

  // State for Today's Focus Hero Card
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(25);
  const [showCustomSetup, setShowCustomSetup] = useState(false);

  // State for inline task creator
  const [taskName, setTaskName] = useState('');
  const [selectedTaskProject, setSelectedTaskProject] = useState('');

  const handleStartSession = () => {
    onInstantFocus('timed', duration, topic || 'General Focus', focusProject);
  };

  const handleStartPreset = (mins) => {
    onInstantFocus('timed', mins, 'General Focus', null);
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    addTask(taskName.trim(), selectedTaskProject || null);
    setTaskName('');
    setSelectedTaskProject('');
  };

  // Filter 3–5 unblocked available tasks for Today
  const availableTasks = useMemo(() => {
    return getAvailableTasks(tasks, dependencies).slice(0, 5);
  }, [tasks, dependencies]);

  const blockedCount = useMemo(() => {
    return getBlockedTasks(tasks, dependencies).length;
  }, [tasks, dependencies]);

  // Today's completed habit count
  const completedHabitsCount = useMemo(() => {
    return activity.filter(l => l.completed_date === today && l.status === 'completed').length;
  }, [activity, today]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── HERO: TODAY'S FOCUS LAUNCHER ── */}
      <div style={{
        background: CARD_BG,
        border: `1px solid ${C.border}`,
        borderRadius: '24px',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '10px', color: ACCENT, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
              TODAY'S FOCUS
            </div>
            <div style={{ fontSize: '12px', color: C.sub }}>Start a focused work session in one tap</div>
          </div>
          {todayFocusMin > 0 && (
            <div style={{ background: `${ACCENT}15`, border: `1px solid ${ACCENT}30`, borderRadius: '10px', padding: '4px 10px', fontSize: '11px', fontWeight: 800, color: ACCENT }}>
              ⚡ {todayFocusMin}m today
            </div>
          )}
        </div>

        {/* 1-Tap Preset Focus Pills (25, 45, 60) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[25, 45, 60].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => handleStartPreset(mins)}
              style={{
                padding: '12px',
                borderRadius: '14px',
                background: SURFACE_BG,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = ACCENT;
                e.currentTarget.style.background = `${ACCENT}10`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = SURFACE_BG;
              }}
            >
              ⚡ {mins}m
            </button>
          ))}
        </div>

        {/* Custom Expander Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={() => setShowCustomSetup(p => !p)}
            style={{
              background: 'transparent',
              border: 'none',
              color: ACCENT,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showCustomSetup ? '▲ Hide Custom Options' : '▼ Custom Topic & Duration'}
          </button>
        </div>

        {/* Collapsible Custom Setup */}
        {showCustomSetup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${C.border2}` }}>
            <input
              type="text"
              placeholder="What are you working on?..."
              value={topic}
              onChange={e => setTopic(e.target.value)}
              style={{
                background: SURFACE_BG,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                color: C.text,
                padding: '11px 14px',
                fontSize: '13px',
                width: '100%',
                outline: 'none',
              }}
            />

            {projects && projects.length > 0 && (
              <select
                value={focusProject?.id || ''}
                onChange={e => {
                  const found = projects.find(p => p.id === e.target.value);
                  setFocusProject(found || null);
                }}
                style={{
                  background: SURFACE_BG,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  color: C.text,
                  padding: '10px 12px',
                  fontSize: '12px',
                  width: '100%',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">None (General Focus)</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              {[15, 30, 90].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setDuration(m)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '10px',
                    background: duration === m ? `${ACCENT}15` : SURFACE_BG,
                    border: `1px solid ${duration === m ? ACCENT : C.border}`,
                    color: duration === m ? ACCENT : C.sub,
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {m}m
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStartSession}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: ACCENT,
                border: 'none',
                color: '#0B0D0F',
                fontSize: '13px',
                fontWeight: 900,
                cursor: 'pointer',
                textAlign: 'center',
                boxShadow: `0 4px 14px ${ACCENT}30`,
              }}
            >
              START SESSION
            </button>
          </div>
        )}
      </div>

      {/* ── READY-TO-EXECUTE TASKS (3–5 ITEMS) ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <SectionLabel>Ready to Execute</SectionLabel>
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '-6px' }}>
              {availableTasks.length} unblocked task{availableTasks.length === 1 ? '' : 's'} for today
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('plan')}
            style={{
              background: 'transparent',
              border: 'none',
              color: ACCENT,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            All Tasks <ArrowRight size={12} />
          </button>
        </div>

        {/* Quick Inline Add Task */}
        <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            placeholder="Add an urgent task..."
            value={taskName}
            onChange={e => setTaskName(e.target.value)}
            style={{
              flex: 1,
              background: CARD_BG,
              border: `1px solid ${C.border}`,
              borderRadius: '12px',
              color: C.text,
              padding: '10px 14px',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          {projects.length > 0 && taskName.trim() && (
            <select
              value={selectedTaskProject}
              onChange={e => setSelectedTaskProject(e.target.value)}
              style={{
                background: CARD_BG,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                color: C.sub,
                padding: '0 8px',
                fontSize: '11px',
                outline: 'none',
                maxWidth: '100px',
              }}
            >
              <option value="">No Project</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={!taskName.trim()}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              background: taskName.trim() ? ACCENT : C.dim,
              border: 'none',
              color: taskName.trim() ? '#0B0D0F' : C.muted,
              cursor: taskName.trim() ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
            }}
          >
            <Plus size={16} />
          </button>
        </form>

        {/* Tasks List */}
        {availableTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            border: `1px dashed ${C.border}`,
            borderRadius: '16px',
            background: CARD_BG,
            color: C.muted,
            fontSize: '12px',
          }}>
            No open unblocked tasks for today. Add one above or explore your Plan.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {availableTasks.map(t => (
              <TaskRow
                key={t.id}
                task={t}
                onComplete={completeTask}
                onDelete={deleteTask}
                onFocus={() => onInstantFocus('timed', 25, t.name, projectMap[t.project_id] || null)}
                projectName={projectMap[t.project_id]?.name}
              />
            ))}
          </div>
        )}

        {/* Small note if other tasks are blocked */}
        {blockedCount > 0 && (
          <div
            onClick={() => setTab('plan')}
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              background: `${C.warn}10`,
              border: `1px solid ${C.warn}30`,
              borderRadius: '10px',
              fontSize: '11px',
              color: C.warn,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            <span>🔒 {blockedCount} task{blockedCount === 1 ? '' : 's'} waiting on prerequisites</span>
            <span style={{ fontWeight: 800 }}>View Plan →</span>
          </div>
        )}
      </div>

      {/* ── COMPACT TODAY'S HABITS CHECKLIST ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <SectionLabel>Today's Habits</SectionLabel>
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '-6px' }}>
              {completedHabitsCount}/{habits.length} completed
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab('habits')}
            style={{
              background: 'transparent',
              border: 'none',
              color: ACCENT,
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px'
            }}
          >
            Manage Habits <ArrowRight size={12} />
          </button>
        </div>

        {habits.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '24px 16px',
            border: `1px dashed ${C.border}`,
            borderRadius: '16px',
            background: CARD_BG,
            color: C.muted,
            fontSize: '12px',
          }}>
            No habits configured yet.{' '}
            <span
              onClick={() => setTab('habits')}
              style={{ color: ACCENT, cursor: 'pointer', fontWeight: 700 }}
            >
              Add your core routines →
            </span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {habits.map(habit => {
              const habitLogs = activity.filter(l => l.habit_id === habit.id);
              const isDone = habitLogs.some(l => l.completed_date === today && l.status === 'completed');
              const isSkipped = habitLogs.some(l => l.completed_date === today && l.status === 'skipped');
              const streak = streaks[habit.id] || 0;
              const isSubmitting = !!submittingHabits[habit.id];

              return (
                <div
                  key={habit.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: CARD_BG,
                    border: `1px solid ${isDone ? `${ACCENT}40` : C.border}`,
                    borderRadius: '14px',
                    padding: '10px 14px',
                    opacity: isSkipped ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <div
                    onClick={() => !isSubmitting && onToggleHabit(habit)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, cursor: 'pointer' }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: `1.5px solid ${isDone ? ACCENT : C.muted}`,
                      background: isDone ? ACCENT : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: '#0B0D0F',
                      fontSize: '11px',
                      fontWeight: 900,
                    }}>
                      {isDone && '✓'}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: C.text,
                        textDecoration: isDone ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {habit.icon} {habit.name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {streak > 0 && (
                      <span style={{ fontSize: '10px', fontWeight: 800, color: C.warn }}>
                        🔥 {streak}d
                      </span>
                    )}

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => !isSubmitting && onSkipHabit(habit)}
                        disabled={isSkipped || isSubmitting}
                        style={{
                          background: isSkipped ? `${C.warn}15` : 'transparent',
                          border: `1px solid ${isSkipped ? `${C.warn}40` : C.border2}`,
                          color: isSkipped ? C.warn : C.muted,
                          borderRadius: '6px',
                          padding: '3px 7px',
                          fontSize: '10px',
                          fontWeight: 700,
                          cursor: isSkipped ? 'default' : 'pointer',
                        }}
                      >
                        {isSkipped ? 'Skipped' : 'Skip'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── DEADLINES THIS WEEK (IF ANY) ── */}
      {todayView?.deadlines?.length > 0 && (
        <div style={{ background: CARD_BG, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '14px 16px' }}>
          <SectionLabel>Upcoming Deadlines</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayView.deadlines.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{d.icon} {d.name}</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: d.days <= 1 ? C.danger : d.days <= 3 ? C.warn : C.muted
                }}>
                  {d.days === 0 ? 'Today' : d.days === 1 ? 'Tomorrow' : `${d.days}d left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DETERMINISTIC CONTEXT / INSIGHT ── */}
      {dexosInsight && (
        <div style={{ background: `${ACCENT}08`, border: `1px solid ${ACCENT}25`, borderRadius: '16px', padding: '14px 16px' }}>
          <div style={{ fontSize: '9px', color: ACCENT, fontWeight: 800, letterSpacing: '1.5px', marginBottom: '4px' }}>
            ZYRBIT FOCUS NOTE
          </div>
          <div style={{ fontSize: '12px', color: C.sub, lineHeight: 1.5 }}>
            "{dexosInsight}"
          </div>
        </div>
      )}

    </div>
  );
}
