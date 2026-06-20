import React from 'react';
import {
  C,
  SectionHeader,
  EmptyState,
  Card,
  ProgressBar,
  FInput
} from './shared.jsx';

export default function GoalsTab({
  goals,
  projectMap,
  updateGoalProgress,
  setModalGoal
}) {
  return (
    <div>
      <SectionHeader title={`${goals.length} Goals`} action={() => setModalGoal(true)} actionLabel="New" />
      {goals.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="No goals yet"
          sub="Goals are measurable outcomes tied to your projects."
          action={() => setModalGoal(true)}
          actionLabel="Add First Goal"
        />
      ) : (
        goals.map(g => {
          const proj = projectMap[g.project_id];
          const pct  = g.target_value > 0 ? Math.min((Number(g.current_value) / Number(g.target_value)) * 100, 100) : 0;
          return (
            <Card key={g.id} accent={g.is_complete ? C.muted : C.goal} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: g.is_complete ? C.muted : C.text, textDecoration: g.is_complete ? 'line-through' : 'none', flex: 1 }}>{g.name}</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: g.is_complete ? C.muted : C.goal, marginLeft: '8px' }}>{Math.round(pct)}%</span>
              </div>
              <ProgressBar value={Number(g.current_value)} max={Number(g.target_value)} color={g.is_complete ? C.muted : C.goal} />
              {proj && <div style={{ fontSize: '10px', color: C.muted, marginTop: '5px' }}>📁 {proj.name}</div>}
              {!g.is_complete && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <FInput
                    type="number"
                    value={String(g.current_value)}
                    onChange={e => updateGoalProgress(g, e.target.value)}
                    style={{ width: '80px', padding: '5px 8px', fontSize: '13px' }}
                  />
                  <span style={{ fontSize: '10px', color: C.muted }}>/ {g.target_value} {g.unit}</span>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
