import React from 'react';
import {
  C,
  fmtHours,
  EmptyState,
  Card,
  ProgressBar,
  SectionLabel,
  TaskRow
} from './shared.jsx';

export default function SprintsTab({
  activeSprint,
  sprintProgress,
  sprintProjectIds,
  projects,
  projectStatsMap,
  tasks,
  completeTask,
  openProjectDetail,
  setModalSprint,
  setModalEndSprint
}) {
  const sp = sprintProgress;

  return (
    <div>
      {!activeSprint ? (
        <EmptyState
          icon="⚡"
          title="No active sprint"
          sub="A sprint is a commitment window — declare which projects you'll focus on and set a daily time target."
          action={() => setModalSprint(true)}
          actionLabel="Start Sprint"
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <Card accent={C.sprint}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900 }}>{activeSprint.name}</div>
                <div style={{ fontSize: '10px', color: C.sub, marginTop: '2px' }}>{activeSprint.start_date} → {activeSprint.end_date}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '24px', fontWeight: 900, color: C.sprint }}>Day {sp.day}</div>
                <div style={{ fontSize: '10px', color: C.muted }}>of {sp.totalDays}</div>
              </div>
            </div>
            <ProgressBar value={sp.day} max={sp.totalDays} color={C.sprint} height={5} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <span style={{ fontSize: '11px', color: C.muted }}>Focus: {fmtHours(sp.focusLogged || 0)} / {fmtHours(sp.totalTarget || 0)}</span>
              <span style={{ fontSize: '11px', fontWeight: 800, color: C.sprint }}>{sp.focusPct}%</span>
            </div>
            <ProgressBar value={sp.focusLogged || 0} max={Math.max(sp.totalTarget || 1, 1)} color={C.focus} height={3} style={{ marginTop: '6px' }} />
          </Card>

          {/* Sprint projects */}
          <div>
            <SectionLabel>SPRINT PROJECTS</SectionLabel>
            {sprintProjectIds.length === 0 ? (
              <div style={{ fontSize: '12px', color: C.muted }}>No projects scoped to this sprint.</div>
            ) : (
              projects.filter(p => sprintProjectIds.includes(p.id)).map(p => {
                const s = projectStatsMap[p.id] || { pct: 0 };
                const stasks = tasks.filter(t => t.project_id === p.id && t.status !== 'done');
                return (
                  <Card key={p.id} accent={C.sprint} onClick={() => openProjectDetail(p)} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 800 }}>{p.icon} {p.name}</span>
                      <span style={{ fontSize: '12px', fontWeight: 900, color: C.sprint }}>{s.pct}%</span>
                    </div>
                    <ProgressBar value={s.pct} max={100} color={C.sprint} height={3} />
                    {stasks.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                        {stasks.slice(0, 3).map(t => (
                          <TaskRow key={t.id} task={t} onComplete={completeTask} />
                        ))}
                        {stasks.length > 3 && <div style={{ fontSize: '10px', color: C.muted, textAlign: 'center' }}>+{stasks.length - 3} more</div>}
                      </div>
                    )}
                  </Card>
                );
              })
            )}
          </div>

          <button onClick={() => setModalEndSprint(true)}
            style={{ background: 'transparent', border: `1px solid ${C.danger}40`, borderRadius: '14px', padding: '12px', color: C.danger, fontSize: '12px', fontWeight: 700, cursor: 'pointer', width: '100%' }}>
            End Sprint
          </button>
        </div>
      )}
    </div>
  );
}
