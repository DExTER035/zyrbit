import React, { useState, useMemo } from 'react';
import { Plus, FolderPlus } from 'lucide-react';
import {
  C,
  daysUntil,
  todayStr,
  SectionHeader,
  SectionLabel,
  Card,
  ProgressBar,
  TaskRow,
  EmptyState
} from './shared.jsx';
import { resolveTaskState, getTaskDependencies } from '../../../engines/growth/index.js';

export default function PlanTab({
  projects = [],
  projectStatsMap = {},
  openProjectDetail,
  setModalProject,
  tasks = [],
  dependencies = [],
  projectMap = {},
  completeTask,
  deleteTask,
  addTask,
  createTask,
  onInstantFocus,
}) {
  const [taskFilter, setTaskFilter] = useState('active'); // active | due_soon | overdue | completed
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [taskInput, setTaskInput] = useState('');
  const [taskTargetProject, setTaskTargetProject] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [taskPriority, setTaskPriority] = useState(3);
  const [taskDueDate, setTaskDueDate] = useState('');

  const today = todayStr();

  // Metrics
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter(t => t.due_date && t.due_date < today), [activeTasks, today]);
  const dueSoonTasks = useMemo(() => activeTasks.filter(t => {
    const d = daysUntil(t.due_date);
    return d !== null && d >= 0 && d <= 3;
  }), [activeTasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);

  // Filtered Task List
  const displayedTasks = useMemo(() => {
    let list = [...tasks];

    // Filter by project
    if (selectedProjectId !== 'all') {
      list = list.filter(t => t.project_id === selectedProjectId);
    }

    // Filter by status/deadline
    if (taskFilter === 'active') {
      list = list.filter(t => t.status !== 'done');
      // Sort: overdue first, then priority, then due date
      list.sort((a, b) => {
        const aOverdue = a.due_date && a.due_date < today ? 1 : 0;
        const bOverdue = b.due_date && b.due_date < today ? 1 : 0;
        if (aOverdue !== bOverdue) return bOverdue - aOverdue;
        const pDiff = (a.priority || 3) - (b.priority || 3);
        if (pDiff !== 0) return pDiff;
        return (a.due_date || '9999').localeCompare(b.due_date || '9999');
      });
    } else if (taskFilter === 'due_soon') {
      list = list.filter(t => {
        if (t.status === 'done') return false;
        const d = daysUntil(t.due_date);
        return d !== null && d >= 0 && d <= 3;
      });
    } else if (taskFilter === 'overdue') {
      list = list.filter(t => t.status !== 'done' && t.due_date && t.due_date < today);
    } else if (taskFilter === 'completed') {
      list = list.filter(t => t.status === 'done');
    }

    return list;
  }, [tasks, selectedProjectId, taskFilter, today]);

  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    if (showAdvanced && createTask && taskTargetProject) {
      createTask(taskTargetProject, {
        name: taskInput.trim(),
        priority: Number(taskPriority) || 3,
        due_date: taskDueDate || null,
      });
    } else {
      addTask(taskInput.trim(), taskTargetProject || null);
    }

    setTaskInput('');
    setTaskDueDate('');
    setTaskPriority(3);
    setTaskTargetProject('');
    setShowAdvanced(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', fontFamily: 'Inter, sans-serif' }}>

      {/* ── 1. ACTIVE PROJECTS ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <SectionLabel>Active Projects ({projects.length})</SectionLabel>
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '-6px' }}>
              Initiatives you are currently building
            </div>
          </div>
          <button
            type="button"
            onClick={() => setModalProject(true)}
            style={{
              background: 'rgba(31, 163, 111, 0.15)',
              border: '1px solid rgba(31, 163, 111, 0.35)',
              color: '#1FA36F',
              borderRadius: '10px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FolderPlus size={13} />
            <span>New Project</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <EmptyState
            icon="🚀"
            title="Create Your First Project"
            sub="Projects organize your meaningful initiatives, goals, and dependency-linked tasks."
            action={() => setModalProject(true)}
            actionLabel="Create Project"
            examples={['Launch SaaS', 'Learn System Design', 'Strength Training', 'Master React 19']}
          />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {projects.map(p => {
              const s = projectStatsMap[p.id] || { pct: 0, done: 0, total: 0 };
              const days = daysUntil(p.deadline);
              const isOverdue = days !== null && days <= 0;
              const isUrgent = days !== null && days > 0 && days <= 3;

              return (
                <Card
                  key={p.id}
                  accent={isOverdue ? C.danger : isUrgent ? C.warn : C.project}
                  onClick={() => openProjectDetail(p)}
                  style={{ cursor: 'pointer', padding: '16px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: '22px', flexShrink: 0 }}>{p.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>
                          {days !== null ? (
                            <span style={{ fontWeight: 700, color: isOverdue ? C.danger : isUrgent ? C.warn : C.muted }}>
                              {isOverdue ? '⚠ Overdue' : days === 1 ? '⏰ Tomorrow' : `📅 ${days}d left`}
                            </span>
                          ) : (
                            'No deadline'
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#1FA36F' }}>{s.pct}%</div>
                      <div style={{ fontSize: '10px', color: C.muted }}>{s.done}/{s.total} done</div>
                    </div>
                  </div>

                  <ProgressBar
                    value={s.done}
                    max={Math.max(s.total, 1)}
                    color={isOverdue ? C.danger : isUrgent ? C.warn : '#1FA36F'}
                    height={4}
                  />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. TASK BACKLOG ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <SectionLabel>Task Backlog</SectionLabel>
            <div style={{ fontSize: '11px', color: C.muted, marginTop: '-6px' }}>
              Execution tasks with dependency awareness
            </div>
          </div>

          {/* Project Scope Filter */}
          {projects.length > 0 && (
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: '8px',
                color: C.sub,
                padding: '6px 10px',
                fontSize: '11px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Filter Badges */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            { id: 'active',    label: `Active (${activeTasks.length})` },
            { id: 'due_soon',  label: `Due Soon (${dueSoonTasks.length})` },
            { id: 'overdue',   label: `Overdue (${overdueTasks.length})` },
            { id: 'completed', label: `Done (${completedTasks.length})` },
          ].map(f => {
            const isSel = taskFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setTaskFilter(f.id)}
                style={{
                  background: isSel ? 'rgba(31, 163, 111, 0.15)' : C.surface,
                  border: `1px solid ${isSel ? '#1FA36F' : C.border}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: isSel ? '#1FA36F' : C.muted,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Inline Task Creation Form */}
        <form onSubmit={handleCreateTask} style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add a new task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
              style={{
                flex: 1,
                background: '#0B0D0F',
                border: `1px solid ${C.border2}`,
                borderRadius: '12px',
                color: C.text,
                padding: '10px 14px',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!taskInput.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                background: taskInput.trim() ? '#1FA36F' : C.dim,
                border: 'none',
                color: taskInput.trim() ? '#0B0D0F' : C.muted,
                fontWeight: 800,
                fontSize: '12px',
                cursor: taskInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Plus size={14} />
              <span>Add</span>
            </button>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            {projects.length > 0 && (
              <select
                value={taskTargetProject}
                onChange={e => setTaskTargetProject(e.target.value)}
                style={{
                  background: '#0B0D0F',
                  border: `1px solid ${C.border2}`,
                  borderRadius: '8px',
                  color: C.sub,
                  padding: '5px 8px',
                  fontSize: '11px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="">Project: None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced(p => !p)}
              style={{
                background: 'transparent',
                border: 'none',
                color: C.muted,
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {showAdvanced ? '▲ Less options' : '▼ Due date & priority'}
            </button>
          </div>

          {showAdvanced && (
            <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: `1px solid ${C.border2}` }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px' }}>Due Date</span>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={e => setTaskDueDate(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#0B0D0F',
                    border: `1px solid ${C.border2}`,
                    borderRadius: '8px',
                    color: C.text,
                    padding: '6px 8px',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '10px', color: C.muted, display: 'block', marginBottom: '4px' }}>Priority</span>
                <select
                  value={taskPriority}
                  onChange={e => setTaskPriority(Number(e.target.value))}
                  style={{
                    width: '100%',
                    background: '#0B0D0F',
                    border: `1px solid ${C.border2}`,
                    borderRadius: '8px',
                    color: C.text,
                    padding: '6px 8px',
                    fontSize: '11px',
                    outline: 'none'
                  }}
                >
                  <option value={1}>🔥 Critical</option>
                  <option value={2}>⚡ High</option>
                  <option value={3}>Normal</option>
                </select>
              </div>
            </div>
          )}
        </form>

        {/* Task List */}
        {displayedTasks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '30px 16px',
            border: `1px dashed ${C.border}`,
            borderRadius: '16px',
            background: C.surface,
            color: C.muted,
            fontSize: '12px',
          }}>
            No tasks found in this view.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {displayedTasks.map(t => {
              const state = resolveTaskState(t, dependencies, tasks);
              const taskDeps = getTaskDependencies(t.id, dependencies);
              const blockedReason = state === 'BLOCKED' && taskDeps.length > 0
                ? `${taskDeps.length} prerequisite${taskDeps.length > 1 ? 's' : ''}`
                : null;

              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  onComplete={completeTask}
                  onDelete={deleteTask}
                  onFocus={() => onInstantFocus('timed', 25, t.name, projectMap[t.project_id] || null)}
                  projectName={projectMap[t.project_id]?.name}
                  state={state}
                  blockedReason={blockedReason}
                />
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
