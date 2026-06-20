import React from 'react';
import {
  C,
  fmtHours,
  SectionHeader,
  EmptyState,
  Card,
  ProgressBar
} from './shared.jsx';

export default function SkillsTab({
  skills,
  skillHoursMap,
  sessions,
  setModalSkill,
  now
}) {
  return (
    <div>
      <SectionHeader title={`${skills.length} Skills`} action={() => setModalSkill(true)} actionLabel="Add" />
      {skills.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="No skills yet"
          sub="Add skills to track how many hours you spend on each domain."
          action={() => setModalSkill(true)}
          actionLabel="Add First Skill"
        />
      ) : (
        skills.map(s => {
          const totalMin = skillHoursMap[s.id] || 0;
          const lastSess = sessions.find(x => x.skill_id === s.id);
          const lastDays = lastSess ? Math.ceil((now - new Date(lastSess.session_date + 'T00:00:00').getTime()) / 86400000) : null;
          const barMax = Math.max(totalMin, 6000); // 100 hours (6000 minutes)

          return (
            <Card key={s.id} accent={totalMin > 0 ? C.skill : C.border} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: totalMin > 0 ? '10px' : 0 }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '22px' }}>{s.icon}</span>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 800 }}>{s.name}</div>
                    <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px', textTransform: 'capitalize' }}>{s.category}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {totalMin > 0 ? (
                    <div style={{ fontSize: '16px', fontWeight: 900, color: C.skill }}>{fmtHours(totalMin)}</div>
                  ) : (
                    <div style={{ fontSize: '11px', color: C.muted }}>No sessions yet</div>
                  )}
                  {lastDays !== null && (
                    <div style={{ fontSize: '9px', color: lastDays >= 7 ? C.danger : C.muted, marginTop: '2px' }}>
                      {lastDays === 0 ? 'Today' : lastDays === 1 ? '1d ago' : `${lastDays}d ago`}
                    </div>
                  )}
                </div>
              </div>
              {totalMin > 0 && (
                <ProgressBar value={totalMin} max={barMax} color={C.skill} height={4} />
              )}
              {totalMin === 0 && (
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '6px' }}>
                  Start a focus session and tag this skill to log hours.
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
