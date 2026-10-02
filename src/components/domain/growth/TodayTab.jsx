import React, { useState, useMemo } from 'react';
import { Plus, ArrowRight, Play, Check } from 'lucide-react';
import { todayStr } from './shared.jsx';
import { getAvailableTasks, getBlockedTasks } from '../../../engines/growth/index.js';

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
  const primaryObjective = primaryTask ? primaryTask.name : (completedTodayTasks.length > 0 ? 'All milestones complete today.' : 'Nothing needs your attention yet.');

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

  // Combine completed today + remaining available tasks for the MomentumPath
  const momentumNodes = useMemo(() => {
    const nodes = [];
    completedTodayTasks.slice(-3).forEach(t => {
      nodes.push({
        ...t,
        status: 'done',
        projectName: projectMap[t.project_id]?.name,
      });
    });
    availableTasks.slice(0, 6).forEach(t => {
      nodes.push({
        ...t,
        status: 'todo',
        projectName: projectMap[t.project_id]?.name,
      });
    });
    return nodes;
  }, [completedTodayTasks, availableTasks, projectMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', fontFamily: 'Inter, sans-serif' }}>

      {/* ── TODAY PRIMARY HERO ── */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#6B7280',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '8px',
        }}>
          TODAY
        </div>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#F5F5F5',
          margin: 0,
          letterSpacing: '-0.03em',
          lineHeight: 1.25,
        }}>
          "{primaryObjective}"
        </h2>
      </div>

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

      {/* ── MOMENTUM PATH ── */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}>
          <div style={{
            fontSize: '10px',
            fontWeight: 700,
            color: '#6B7280',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}>
            MOMENTUM PATH
          </div>
          <button
            type="button"
            onClick={() => setShowAddForm(p => !p)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Plus size={14} />
            <span>Add Action</span>
          </button>
        </div>

        {/* Quick inline add form */}
        {showAddForm && (
          <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
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
                color: '#F5F5F5',
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
                background: taskName.trim() ? '#1FA36F' : '#23272E',
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

        {/* The Vertical Path */}
        {momentumNodes.length === 0 ? (
          <div style={{
            padding: '24px 0',
            textAlign: 'center',
            color: '#6B7280',
            fontSize: '13px',
          }}>
            Nothing needs your attention yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Start marker */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{
                width: '12px',
                display: 'flex',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#6B7280',
                }} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#4B5563', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                START
              </span>
            </div>

            {momentumNodes.map((item, idx) => {
              const isDone = item.status === 'done';
              const isFirstPending = !isDone && (idx === 0 || momentumNodes[idx - 1]?.status === 'done');
              const isLast = idx === momentumNodes.length - 1;

              return (
                <div key={item.id} style={{ display: 'flex', gap: '16px', position: 'relative' }}>
                  {/* Vertical spine & node */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    {/* Node circle */}
                    <button
                      type="button"
                      onClick={() => !isDone && completeTask(item)}
                      title={isDone ? 'Completed' : 'Click to complete'}
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: isDone ? '#1FA36F' : 'transparent',
                        border: `2px solid ${isDone ? '#1FA36F' : isFirstPending ? '#F5F5F5' : '#4B5563'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: isDone ? 'default' : 'pointer',
                        padding: 0,
                        outline: 'none',
                        zIndex: 1,
                        transition: 'all 0.2s',
                        boxShadow: isFirstPending ? '0 0 10px rgba(245,245,245,0.2)' : 'none',
                      }}
                    >
                      {isDone && <Check size={9} color="#0B0D0F" strokeWidth={3} />}
                    </button>

                    {/* Spine line connecting to next */}
                    {!isLast && (
                      <div style={{
                        width: '1px',
                        flex: 1,
                        background: isDone ? '#1FA36F40' : '#1C1D21',
                        minHeight: '36px',
                      }} />
                    )}
                  </div>

                  {/* Content */}
                  <div style={{
                    flex: 1,
                    paddingBottom: isLast ? '12px' : '26px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: isFirstPending ? '16px' : '14px',
                        fontWeight: isFirstPending ? 700 : 500,
                        color: isDone ? '#6B7280' : isFirstPending ? '#F5F5F5' : '#9CA3AF',
                        lineHeight: 1.35,
                        textDecoration: isDone ? 'line-through' : 'none',
                        transition: 'all 0.2s',
                      }}>
                        {item.name}
                      </div>

                      {item.projectName && (
                        <div style={{ fontSize: '11px', color: '#4B5563', marginTop: '3px' }}>
                          {item.projectName}
                        </div>
                      )}
                    </div>

                    {!isDone && (
                      <button
                        type="button"
                        onClick={() => completeTask(item)}
                        style={{
                          background: isFirstPending ? 'rgba(31,163,111,0.12)' : 'transparent',
                          border: `1px solid ${isFirstPending ? '#1FA36F' : '#23272E'}`,
                          borderRadius: '6px',
                          padding: '4px 10px',
                          color: isFirstPending ? '#1FA36F' : '#9CA3AF',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s',
                        }}
                      >
                        Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
