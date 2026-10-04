import React, { useState, useMemo } from 'react';
import { Plus, ArrowRight, Play } from 'lucide-react';
import { todayStr } from './shared.jsx';
import { getAvailableTasks, getBlockedTasks } from '../../../engines/growth/index.js';
import GrowthPathHero from './GrowthPathHero.jsx';

export default function TodayTab({
  todayFocusMin = 0,
  setTab,
  completeTask,
  addTask,
  tasks = [],
  dependencies = [],
  projects = [],
  projectMap = {},
  onInstantFocus,
  habits = [],
  activity = [],
}) {
  const today = todayStr();

  // State for inline quick-add
  const [taskName, setTaskName] = useState('');
  const [selectedTaskProject, setSelectedTaskProject] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Available unblocked tasks
  const availableTasks = useMemo(() => {
    return getAvailableTasks(tasks, dependencies);
  }, [tasks, dependencies]);

  // Blocked tasks count
  const blockedCount = useMemo(() => {
    return getBlockedTasks(tasks, dependencies).length;
  }, [tasks, dependencies]);

  // Tasks completed today
  const completedTodayTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'done' && (t.completed_at ? t.completed_at.startsWith(today) : true));
  }, [tasks, today]);

  // Primary objective = first available task or celebration
  const primaryTask = availableTasks[0] || null;
  const _primaryObjective = primaryTask ? primaryTask.name : (completedTodayTasks.length > 0 ? 'All milestones complete today.' : 'Nothing needs your attention yet.');

  // Completed habits count
  const completedHabitsCount = useMemo(() => {
    return activity.filter(l => l.completed_date === today && l.status === 'completed').length;
  }, [activity, today]);

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    addTask(taskName.trim(), selectedTaskProject || null);
    setTaskName('');
    setSelectedTaskProject('');
    setShowAddForm(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* ── THE VISUAL PATH HERO ── */}
      <GrowthPathHero
        tasks={tasks}
        projects={projects}
        onCompleteTask={completeTask}
        onStartFocus={onInstantFocus}
      />

      {/* ── CURRENT FOCUS ── */}
      <div style={{
        padding: '18px 0',
        borderTop: '1px solid #1C1D21',
        borderBottom: '1px solid #1C1D21',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#1FA36F',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            CURRENT FOCUS
          </div>
          <div style={{
            fontSize: '15px',
            fontWeight: 600,
            color: '#F5F5F5',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {primaryTask ? primaryTask.name : 'Deep Work Session'}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            {todayFocusMin > 0 ? `${todayFocusMin}m completed today · 45 min recommended` : '45 min recommended block'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onInstantFocus('timed', 45, primaryTask?.name || 'Deep Work', primaryTask ? projectMap[primaryTask.project_id] : null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#1FA36F',
            border: 'none',
            color: '#0B0D0F',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            flexShrink: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <Play size={13} fill="#0B0D0F" />
          <span>Start 45m</span>
        </button>
      </div>

      {/* ── QUICK ACTION ── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          marginBottom: showAddForm ? '12px' : '0',
        }}>
          <button
            type="button"
            onClick={() => setShowAddForm(p => !p)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#E9B44C',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 0',
            }}
          >
            <Plus size={14} />
            <span>{showAddForm ? 'Cancel' : 'Add Action'}</span>
          </button>
        </div>

        {/* Quick inline add form */}
        {showAddForm && (
          <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              autoFocus
              placeholder="What needs to move forward next?..."
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              style={{
                flex: 1,
                background: '#15181B',
                border: '1px solid #1C1D21',
                borderRadius: '8px',
                color: '#ECE8DF',
                padding: '9px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            {projects.length > 0 && (
              <select
                value={selectedTaskProject}
                onChange={e => setSelectedTaskProject(e.target.value)}
                style={{
                  background: '#15181B',
                  border: '1px solid #1C1D21',
                  borderRadius: '8px',
                  color: '#9CA3AF',
                  padding: '0 8px',
                  fontSize: '11px',
                  outline: 'none',
                  maxWidth: '120px',
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
                padding: '9px 14px',
                borderRadius: '8px',
                background: taskName.trim() ? '#E9B44C' : '#23272E',
                border: 'none',
                color: taskName.trim() ? '#0B0D0F' : '#6B7280',
                cursor: taskName.trim() ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Add
            </button>
          </form>
        )}
      </div>

      {/* ── PROGRESSIVE DISCLOSURE: BLOCKED & HABITS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid #1C1D21', paddingTop: '18px' }}>
        {blockedCount > 0 && (
          <div
            onClick={() => setTab('plan')}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              cursor: 'pointer',
              color: '#9CA3AF',
              fontSize: '12px',
              padding: '6px 0',
            }}
          >
            <span>🔒 {blockedCount} task{blockedCount === 1 ? '' : 's'} waiting on prerequisites</span>
            <span style={{ color: '#1FA36F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
              Plan <ArrowRight size={11} />
            </span>
          </div>
        )}

        <div
          onClick={() => setTab('habits')}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'pointer',
            color: '#9CA3AF',
            fontSize: '12px',
            padding: '6px 0',
          }}
        >
          <span>Maintenance: {completedHabitsCount} of {habits.length} habits logged today</span>
          <span style={{ color: '#1FA36F', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
            Habits <ArrowRight size={11} />
          </span>
        </div>
      </div>

    </div>
  );
}
