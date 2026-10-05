import React, { useMemo } from 'react';
import { Target, Plus, CheckCircle, ChevronRight, ArrowUpRight, Trash2 } from 'lucide-react';
import { C, daysUntil, ProgressBar, Card, EmptyState, SectionLabel } from './shared.jsx';

export default function GoalsTab({
  goals = [],
  tasks = [],
  projectMap = {},
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  onOpenProject,
}) {
  const activeGoals = useMemo(() => {
    return goals.filter(g => !g.is_complete);
  }, [goals]);

  const _completedGoals = useMemo(() => {
    return goals.filter(g => g.is_complete);
  }, [goals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, sans-serif' }}>
      {/* ── HEADER ROW ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <SectionLabel>Strategic Goals ({activeGoals.length})</SectionLabel>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '-6px' }}>
            Where you are going and what connects to execution
          </div>
        </div>

        <button
          type="button"
          onClick={onAddGoal}
          style={{
            background: 'rgba(233, 180, 76, 0.15)',
            border: '1px solid rgba(233, 180, 76, 0.35)',
            color: '#E9B44C',
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
          <Plus size={13} />
          <span>New Goal</span>
        </button>
      </div>

      {/* ── GOALS CONTENT ── */}
      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="What are you trying to make happen?"
          sub="Goals connect your high-level ambitions to projects, milestones, and daily focus sessions."
          action={onAddGoal}
          actionLabel="Create Goal"
          examples={['Crack DSA Exam', 'Ship SaaS V1', 'Run 10K', 'Read 24 Books This Year']}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {goals.map(g => {
            const current = Number(g.current_value || 0);
            const target = Number(g.target_value || 100);
            const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
            const project = g.project_id ? projectMap[g.project_id] : null;
            const days = daysUntil(g.deadline);
            const isComplete = g.is_complete || pct >= 100;

            // Connected tasks for this project
            const connectedTasks = g.project_id
              ? tasks.filter(t => t.project_id === g.project_id && t.status !== 'done').slice(0, 2)
              : [];

            return (
              <Card
                key={g.id}
                accent={isComplete ? C.success : '#E9B44C'}
                style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                {/* Header line */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: isComplete ? 'rgba(16, 185, 129, 0.15)' : 'rgba(233, 180, 76, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isComplete ? '#10B981' : '#E9B44C',
                      flexShrink: 0,
                    }}>
                      <Target size={18} />
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: '11px', color: C.muted, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {project ? (
                          <span
                            onClick={() => onOpenProject && onOpenProject(project)}
                            style={{ color: '#E9B44C', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                          >
                            📁 {project.name} <ArrowUpRight size={10} />
                          </span>
                        ) : (
                          <span>Direct Goal</span>
                        )}
                        <span>•</span>
                        <span>{days !== null ? (days <= 0 ? '⚠ Target passed' : `${days}d remaining`) : 'Ongoing'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right stats & action */}
                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: isComplete ? '#10B981' : '#E9B44C' }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize: '10px', color: C.muted }}>
                      {current} / {target} {g.unit || ''}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <ProgressBar
                  value={current}
                  max={target}
                  color={isComplete ? '#10B981' : '#E9B44C'}
                  height={6}
                />

                {/* Connected Execution Section */}
                {connectedTasks.length > 0 && (
                  <div style={{
                    paddingTop: '10px',
                    borderTop: '1px solid #1C1D21',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                      Connected Milestones
                    </div>
                    {connectedTasks.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#ECE8DF' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#E9B44C' }} />
                          <span>{t.name}</span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#6B7280' }}>Priority {t.priority || 3}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                  {onDeleteGoal ? (
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(g)}
                      aria-label="Delete goal"
                      title="Delete goal"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6B7280',
                        cursor: 'pointer',
                        padding: '4px 6px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        transition: 'color 0.15s ease',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : <div />}

                  {!isComplete && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => onUpdateGoalProgress && onUpdateGoalProgress(g, Math.min(target, current + 1))}
                        style={{
                          background: '#1D1E24',
                          border: '1px solid #26272D',
                          color: '#ECE8DF',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        +1 {g.unit || 'step'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateGoalProgress && onUpdateGoalProgress(g, target)}
                        style={{
                          background: 'rgba(16, 185, 129, 0.1)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          color: '#10B981',
                          borderRadius: '6px',
                          padding: '4px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <CheckCircle size={12} />
                        <span>Complete Goal</span>
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
