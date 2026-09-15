import React, { useState } from 'react';
import { Bolt, AlertTriangle, Plus, Play, Lock } from 'lucide-react';
import {
  C,
  fmtHours,
  ProgressBar,
  SectionLabel,
  TaskRow,
  EmptyState
} from './shared.jsx';
import HeatmapGrid from '../../common/HeatmapGrid.jsx';
import { getAvailableTasks, getBlockedTasks } from '../../../engines/growth/index.js';

export default function TodayTab({
  activeSprint,
  sprintProgress,
  todayFocusMin,
  todayView,
  dexosInsight,
  setTab,
  completeTask,
  addTask,
  tasks = [],
  dependencies = [],
  projects,
  projectMap,
  heatmapData = {},
  navigate,
  onInstantFocus,
  focusProject,
  setFocusProject
}) {
  const sp = sprintProgress;
  const ACCENT = '#14B8A6';
  const CARD_BG = '#1B1F23';
  const SURFACE_BG = '#15181B';

  // State for Today's Focus Hero Card
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(25);
  const [showCustomSetup, setShowCustomSetup] = useState(false);

  // State for inline task creator
  const [taskName, setTaskName] = useState('');
  const [selectedTaskProject, setSelectedTaskProject] = useState('');

  const handleStartSession = () => {
    onInstantFocus('timed', duration, topic || 'General Focus', focusProject);
  };

  const handleStartPreset = (mins) => {
    onInstantFocus('timed', mins, 'General Focus', null);
  };

  const handleAddTaskSubmit = (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;
    addTask(taskName, selectedTaskProject || null);
    setTaskName('');
    setSelectedTaskProject('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontFamily: 'Inter, sans-serif' }}>
      
      {/* ── HERO: TODAY'S FOCUS ── */}
      <div style={{
        background: CARD_BG,
        border: `1px solid ${C.border}`,
        borderRadius: '24px',
        padding: '24px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: ACCENT, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Today's Focus
          </div>
          <div style={{ fontSize: '12px', color: C.sub }}>Start a focused session in one tap</div>
        </div>

        {/* 1-Tap Preset Focus Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {[25, 45, 60, 90].map(mins => (
            <button
              key={mins}
              type="button"
              onClick={() => handleStartPreset(mins)}
              style={{
                padding: '12px',
                borderRadius: '12px',
                background: SURFACE_BG,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: '13px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                outline: 'none',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = ACCENT;
                e.currentTarget.style.background = `${ACCENT}08`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.background = SURFACE_BG;
              }}
            >
              ⚡ {mins}m
            </button>
          ))}
        </div>

        {/* Divider & Custom Expander Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4px' }}>
          <button
            type="button"
            onClick={() => setShowCustomSetup(p => !p)}
            style={{
              background: 'transparent',
              border: 'none',
              color: ACCENT,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {showCustomSetup ? '▲ Hide Custom Options' : '▼ Custom Session Setup'}
          </button>
        </div>

        {/* Collapsible Custom Setup Section */}
        {showCustomSetup && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', paddingTop: '10px', borderTop: `1px solid ${C.border2}`, animation: 'fadeSlideUp 0.2s ease-out' }}>
            {/* Focus Topic Input */}
            <div>
              <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>Topic</div>
              <input
                type="text"
                placeholder="What are you working on?..."
                value={topic}
                onChange={e => setTopic(e.target.value)}
                style={{
                  background: SURFACE_BG,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  color: C.text,
                  padding: '12px 14px',
                  fontSize: '14px',
                  width: '100%',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            {/* Optional Project Selector */}
            {projects && projects.length > 0 && (
              <div>
                <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>Project</div>
                <select
                  value={focusProject?.id || ''}
                  onChange={e => {
                    const found = projects.find(p => p.id === e.target.value);
                    setFocusProject(found || null);
                  }}
                  style={{
                    background: SURFACE_BG,
                    border: `1px solid ${C.border}`,
                    borderRadius: '12px',
                    color: C.text,
                    padding: '12px 14px',
                    fontSize: '13px',
                    width: '100%',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  <option value="">None (General Focus)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom Duration Selection */}
            <div>
              <div style={{ fontSize: '10px', color: C.muted, fontWeight: 700, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '6px' }}>Duration</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[25, 45, 60].map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setDuration(m)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: '10px',
                      background: duration === m ? `${ACCENT}15` : SURFACE_BG,
                      border: `1px solid ${duration === m ? ACCENT : C.border}`,
                      color: duration === m ? ACCENT : C.sub,
                      fontSize: '12px',
                      fontWeight: 850,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none'
                    }}
                  >
                    {m} min
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={handleStartSession}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: ACCENT,
                border: 'none',
                color: '#000',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                textAlign: 'center',
                outline: 'none',
                boxShadow: `0 4px 14px ${ACCENT}30`,
                transition: 'opacity 0.2s',
                marginTop: '6px'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = 0.9}
              onMouseLeave={e => e.currentTarget.style.opacity = 1}
            >
              START CUSTOM SESSION
            </button>
          </div>
        )}
      </div>

      {/* ── LIGHTWEIGHT TASKS SECTION ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <SectionLabel>Tasks</SectionLabel>
          <span style={{ fontSize: '11px', color: C.muted }}>{todayView.doToday.length} open today</span>
        </div>

        {/* Inline Task Creator */}
        <form onSubmit={handleAddTaskSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Add a task deserving your focus..."
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              style={{
                flex: 1,
                background: CARD_BG,
                border: `1px solid ${C.border}`,
                borderRadius: '12px',
                color: C.text,
                padding: '10px 12px',
                fontSize: '13px',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={!taskName.trim()}
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                background: taskName.trim() ? ACCENT : C.dim,
                border: 'none',
                color: taskName.trim() ? '#000' : C.muted,
                cursor: taskName.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none'
              }}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Optional inline project assignment for task */}
          {projects && projects.length > 0 && taskName.trim() && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '4px' }}>
              <span style={{ fontSize: '10px', color: C.muted }}>Assign Project (optional):</span>
              <select
                value={selectedTaskProject}
                onChange={e => setSelectedTaskProject(e.target.value)}
                style={{
                  background: SURFACE_BG,
                  border: `1px solid ${C.border2}`,
                  borderRadius: '6px',
                  color: C.sub,
                  padding: '2px 6px',
                  fontSize: '10px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">None</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
          )}
        </form>

        {/* Ready to Execute Task Section */}
        {(() => {
          const availTasks = getAvailableTasks(tasks, dependencies);
          const blockTasks = getBlockedTasks(tasks, dependencies);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '10px', color: ACCENT, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                READY TO EXECUTE ({availTasks.length} AVAILABLE)
              </div>

              {availTasks.length === 0 && blockTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  border: `1px dashed ${C.border}`,
                  borderRadius: '14px',
                  fontSize: '12px',
                  color: C.muted
                }}>
                  No open tasks. Create a task above to get started.
                </div>
              ) : (
                <>
                  {/* Available Unblocked Tasks */}
                  {availTasks.map(t => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: CARD_BG, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => completeTask(t)}
                          style={{ background: 'none', border: `1.5px solid ${C.muted}`, width: '18px', height: '18px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}
                        />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                          {projectMap[t.project_id] && (
                            <div style={{ fontSize: '10px', color: C.sub, marginTop: '2px' }}>{projectMap[t.project_id].icon} {projectMap[t.project_id].name}</div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onInstantFocus('timed', 25, t.name, projectMap[t.project_id] || null)}
                        style={{
                          background: `${ACCENT}15`,
                          border: `1px solid ${ACCENT}40`,
                          color: ACCENT,
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '11px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginLeft: '8px',
                          flexShrink: 0,
                        }}
                      >
                        <Play size={12} fill={ACCENT} /> Focus
                      </button>
                    </div>
                  ))}

                  {/* Blocked Tasks */}
                  {blockTasks.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      <div style={{ fontSize: '10px', color: C.warn, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>
                        BLOCKED TASKS ({blockTasks.length})
                      </div>
                      {blockTasks.map(t => (
                        <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: SURFACE_BG, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 12px', marginBottom: '6px', opacity: 0.8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Lock size={12} color={C.warn} />
                            <span style={{ fontSize: '12px', fontWeight: 700, color: C.text }}>{t.name}</span>
                          </div>
                          <div style={{ fontSize: '10px', color: C.muted, paddingLeft: '20px' }}>
                            Blocked by: {t.blockingTasks.map(b => b.name).join(', ') || 'Incomplete prerequisite'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

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

      {/* Challenge Mode discovery card */}
      {!activeSprint && navigate && (
        <div
          onClick={() => navigate('/challenge')}
          style={{
            background: `${C.focus}08`, border: `1px solid ${C.focus}30`,
            borderRadius: '16px', padding: '14px 16px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ fontSize: '9px', color: C.focus, fontWeight: 800, letterSpacing: '1.5px', marginBottom: '4px' }}>CHALLENGE MODE</div>
            <div style={{ fontSize: '13px', color: C.sub }}>Commit to a 7, 21, or 30-day streak</div>
          </div>
          <span style={{ fontSize: '18px', opacity: 0.7 }}>🎯</span>
        </div>
      )}
    </div>
  );
}
