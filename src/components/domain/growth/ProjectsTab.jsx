import React from 'react';
import {
  C,
  daysUntil,
  SectionHeader,
  EmptyState,
  Card,
  Pill,
  ProgressBar
} from './shared.jsx';

export default function ProjectsTab({
  projects,
  projectStatsMap,
  sprintProjectIds,
  openProjectDetail,
  setModalProject
}) {
  return (
    <div>
      <SectionHeader title={`${projects.length} Projects`} action={() => setModalProject(true)} actionLabel="New" />
      {projects.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="Create Your First Mission"
          sub="A project is a meaningful initiative you're building, learning, or achieving."
          action={() => setModalProject(true)}
          actionLabel="Create Project"
          examples={['Build DexOS', 'Crack DSA', 'Learn React', 'Gain 5kg', 'Save ₹50,000']}
        />
      ) : (
        projects.map(p => {
          const s = projectStatsMap[p.id] || { pct: 0, done: 0, total: 0 };
          const days = daysUntil(p.deadline);
          const inSprint = sprintProjectIds.includes(p.id);
          return (
            <Card
              key={p.id}
              accent={days !== null && days <= 3 ? C.danger : days !== null && days <= 7 ? C.warn : C.project}
              onClick={() => openProjectDetail(p)}
              style={{ marginBottom: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
                  <span style={{ fontSize: '20px', flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '3px', flexWrap: 'wrap' }}>
                      {inSprint && <Pill label="sprint" color={C.sprint} />}
                      {days !== null && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: days <= 0 ? C.danger : days <= 3 ? C.warn : C.muted }}>
                          {days <= 0 ? '⚠ Overdue' : days === 1 ? '⏰ Tomorrow' : `📅 ${days}d left`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '8px' }}>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: C.project }}>{s.pct}%</div>
                  <div style={{ fontSize: '9px', color: C.muted }}>{s.done}/{s.total}</div>
                </div>
              </div>
              <ProgressBar value={s.done} max={Math.max(s.total, 1)} color={days !== null && days <= 3 ? C.danger : C.project} height={4} />
            </Card>
          );
        })
      )}
    </div>
  );
}
