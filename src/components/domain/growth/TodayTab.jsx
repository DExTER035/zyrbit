import React, { useState, useMemo } from 'react';
import { Plus, ArrowRight, Play } from 'lucide-react';
import { todayStr } from './shared.jsx';
import { getAvailableTasks, getBlockedTasks } from '../../../engines/growth/index.js';
import GrowthPathHero from './GrowthPathHero.jsx';

export default function TodayTab({
  goals = [],
  streak = { current_streak: 0 },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'Inter, sans-serif' }}>
      {/* ── CARD 1: TODAY'S TASKS (Screen 8 Reference) ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid var(--brand-border, #E5E0D8)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '14px',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 800,
            color: '#111A20',
            letterSpacing: '-0.01em',
          }}>
            Today's Tasks
          </h2>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#8A9CA3' }}>
            {availableTasks.length} pending
          </span>
        </div>

        {/* Task Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          {availableTasks.length === 0 ? (
            <div style={{
              padding: '20px 10px',
              textAlign: 'center',
              color: '#8A9CA3',
              fontSize: '13px',
            }}>
              No tasks pending. Tap + Add task to get started.
            </div>
          ) : (
            availableTasks.slice(0, 5).map(task => (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid #ECE8DF',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <button
                    type="button"
                    onClick={() => completeTask(task)}
                    aria-label={`Complete ${task.name}`}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      border: '2px solid var(--brand-petrol, #174A55)',
                      background: 'transparent',
                      cursor: 'pointer',
                      flexShrink: 0,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#111A20',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {task.name}
                    </div>
                    <div style={{ fontSize: '11px', color: '#8A9CA3', marginTop: '1px' }}>
                      {task.status === 'in_progress' ? 'In progress' : 'Not started'}
                    </div>
                  </div>
                </div>

                <div style={{ color: '#8A9CA3', flexShrink: 0, marginLeft: '8px' }}>
                  <ArrowRight size={14} />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Task Trigger or Form */}
        {showAddForm ? (
          <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <input
              type="text"
              autoFocus
              placeholder="Task name..."
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              style={{
                flex: 1,
                background: '#FFFFFF',
                border: '1.5px solid var(--brand-border, #E5E0D8)',
                borderRadius: '10px',
                color: '#111A20',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!taskName.trim()}
              style={{
                padding: '8px 16px',
                borderRadius: '10px',
                background: taskName.trim() ? 'var(--brand-petrol, #174A55)' : '#DDE9EB',
                border: 'none',
                color: taskName.trim() ? '#FFFFFF' : '#8A9CA3',
                cursor: taskName.trim() ? 'pointer' : 'default',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                background: 'transparent',
                border: '1px solid #E5E0D8',
                color: '#8A9CA3',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              background: 'transparent',
              border: '1.5px dashed var(--brand-soft-teal, #DDE9EB)',
              color: 'var(--brand-petrol, #174A55)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <Plus size={15} />
            <span>Add task</span>
          </button>
        )}
      </div>

      {/* ── CARD 2: FOCUS SESSION (Screen 8 Reference) ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '20px',
        padding: '20px',
        border: '1.5px solid var(--brand-border, #E5E0D8)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#111A20' }}>
          Focus Session
        </div>
        <div style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#111A20',
          letterSpacing: '-0.02em',
          margin: '6px 0 2px',
        }}>
          25:00
        </div>
        <div style={{ fontSize: '13px', color: '#8A9CA3', marginBottom: '16px' }}>
          Deep work
        </div>

        <button
          type="button"
          onClick={() => onInstantFocus('timed', 25, primaryTask?.name || 'Deep work', primaryTask ? projectMap[primaryTask.project_id] : null)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '13px 20px',
            borderRadius: '12px',
            background: 'var(--brand-petrol, #174A55)',
            border: 'none',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <span>START FOCUS</span>
          <ArrowRight size={15} strokeWidth={2.5} />
        </button>
      </div>

    </div>
  );
}
