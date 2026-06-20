import React from 'react';
import { Bolt, AlertTriangle } from 'lucide-react';
import {
  C,
  fmtHours,
  ProgressBar,
  SectionLabel,
  TaskRow,
  EmptyState
} from './shared.jsx';
import HeatmapGrid from '../HeatmapGrid.jsx';

export default function TodayTab({
  activeSprint,
  sprintProgress,
  todayFocusMin,
  todayView,
  dexosInsight,
  setTab,
  completeTask,
  setModalProject,
  setModalSprint,
  projectMap,
  heatmapData = {}
}) {
  const sp = sprintProgress;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Sprint focus target */}
      {activeSprint && sp && (
        <div onClick={() => setTab('sprints')}
          style={{ background: `linear-gradient(135deg, ${C.sprint}15, ${C.focus}08)`, border: `1px solid ${C.sprint}40`, borderRadius: '18px', padding: '14px 16px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bolt size={13} color={C.sprint} />
              <span style={{ fontSize: '12px', fontWeight: 800, color: C.sprint }}>{activeSprint.name}</span>
            </div>
            <span style={{ fontSize: '10px', color: C.sub }}>Day {sp.day}/{sp.totalDays}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: C.muted, marginBottom: '6px' }}>
            <span>Today: {fmtHours(todayFocusMin)} / {fmtHours(activeSprint.daily_focus_minutes)} target</span>
            <span style={{ color: C.sprint, fontWeight: 700 }}>
              {todayFocusMin >= activeSprint.daily_focus_minutes ? '✓ Target hit' : `${fmtHours(activeSprint.daily_focus_minutes - todayFocusMin)} to go`}
            </span>
          </div>
          <ProgressBar value={todayFocusMin} max={activeSprint.daily_focus_minutes} color={todayFocusMin >= activeSprint.daily_focus_minutes ? C.goal : C.sprint} height={5} />
        </div>
      )}

      {/* Overdue */}
      {todayView.overdue.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <AlertTriangle size={13} color={C.danger} />
            <SectionLabel>OVERDUE ({todayView.overdue.length})</SectionLabel>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayView.overdue.map(t => (
              <TaskRow key={t.id} task={t} onComplete={completeTask} projectName={projectMap[t.project_id]?.name} />
            ))}
          </div>
        </div>
      )}

      {/* Do Today */}
      {todayView.doToday.length > 0 && (
        <div>
          <SectionLabel>📍 DO TODAY</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {todayView.doToday.map(t => (
              <TaskRow key={t.id} task={t} onComplete={completeTask} projectName={projectMap[t.project_id]?.name} />
            ))}
          </div>
        </div>
      )}

      {/* Deadlines this week */}
      {todayView.deadlines.length > 0 && (
        <div>
          <SectionLabel>📅 DEADLINES THIS WEEK</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {todayView.deadlines.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '14px' }}>{d.icon}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: C.text }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 800, color: d.days <= 1 ? C.danger : d.days <= 3 ? C.warn : C.muted }}>
                  {d.days === 0 ? 'Today' : d.days === 1 ? 'Tomorrow' : `${d.days}d`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DexOS Insight */}
      <div style={{ background: `${C.growth}08`, border: `1px solid ${C.growth}25`, borderRadius: '16px', padding: '14px 16px' }}>
        <div style={{ fontSize: '9px', color: C.growth, fontWeight: 800, letterSpacing: '1.5px', marginBottom: '6px' }}>DEXOS</div>
        <div style={{ fontSize: '13px', color: C.sub, lineHeight: 1.5 }}>"{dexosInsight}"</div>
      </div>

      {/* Heatmap Grid */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '16px' }}>
        <HeatmapGrid color={C.growth} dataMap={heatmapData} label="Consistency Grid (90 Days)" />
      </div>

      {/* Empty state */}
      {todayView.overdue.length === 0 && todayView.doToday.length === 0 && todayView.deadlines.length === 0 && !activeSprint && (
        <EmptyState
          icon={projectMap ? '🎯' : '📁'}
          title={Object.keys(projectMap).length === 0 ? 'No projects yet' : 'Nothing urgent today'}
          sub={Object.keys(projectMap).length === 0
            ? 'Create your first project and add tasks to get started.'
            : 'Start a sprint to define your daily focus, or add tasks with deadlines.'}
          action={Object.keys(projectMap).length === 0 ? () => setModalProject(true) : () => setModalSprint(true)}
          actionLabel={Object.keys(projectMap).length === 0 ? 'Create Project' : 'Start Sprint'}
        />
      )}
    </div>
  );
}
