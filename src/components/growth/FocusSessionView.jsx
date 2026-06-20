import React from 'react';
import { ChevronLeft, CheckCircle2, Play, Pause, Square, Timer } from 'lucide-react';
import {
  C,
  fmtTime,
  fmtHours,
  FLabel,
  BtnPrimary
} from './shared.jsx';

export default function FocusSessionView({
  focusMode,
  setFocusMode,
  projects,
  skills,
  focusProject,
  setFocusProject,
  focusSkill,
  setFocusSkill,
  focusType,
  setFocusType,
  focusTimedMin,
  setFocusTimedMin,
  focusElapsed,
  focusPaused,
  setFocusPaused,
  focusDoneMin,
  startFocusSession,
  endFocusSession,
  closeFocusDone
}) {
  // ─── Setup Screen ─────────────────────────────────────────────────────────
  if (focusMode === 'setup') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 20px', display: 'flex', flexDirection: 'column', gap: '20px', color: C.text }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setFocusMode(null)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '8px 10px', cursor: 'pointer', color: C.sub }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '18px', fontWeight: 800 }}>Start Focus</span>
        </div>

        <div>
          <FLabel>PROJECT (REQUIRED)</FLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {projects.length === 0 && <div style={{ color: C.muted, fontSize: '12px' }}>Create a project first.</div>}
            {projects.map(p => (
              <div key={p.id} onClick={() => setFocusProject(focusProject?.id === p.id ? null : p)}
                style={{ display: 'flex', alignItems: 'center', gap: '12px', background: focusProject?.id === p.id ? `${C.focus}18` : C.surface, border: `1px solid ${focusProject?.id === p.id ? C.focus : C.border}`, borderRadius: '14px', padding: '12px 14px', cursor: 'pointer', transition: 'all 0.2s' }}>
                <span style={{ fontSize: '18px' }}>{p.icon}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, flex: 1 }}>{p.name}</span>
                {focusProject?.id === p.id && <CheckCircle2 size={16} color={C.focus} />}
              </div>
            ))}
          </div>
        </div>

        <div>
          <FLabel>SKILL — EARNS HOURS (OPTIONAL)</FLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {skills.map(s => (
              <button key={s.id} onClick={() => setFocusSkill(focusSkill?.id === s.id ? null : s)}
                style={{ background: focusSkill?.id === s.id ? `${C.skill}20` : C.surface, border: `1px solid ${focusSkill?.id === s.id ? C.skill : C.border}`, borderRadius: '10px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: focusSkill?.id === s.id ? C.skill : C.sub, transition: 'all 0.2s' }}>
                {s.icon} {s.name}
              </button>
            ))}
            {skills.length === 0 && <span style={{ fontSize: '12px', color: C.muted }}>Add skills in the Skills tab.</span>}
          </div>
        </div>

        <div>
          <FLabel>TIMER MODE</FLabel>
          <div style={{ display: 'flex', gap: '10px', marginBottom: focusType === 'timed' ? '10px' : 0 }}>
            {[{ id: 'open', label: 'Open Session', sub: 'End when done', icon: '∞' }, { id: 'timed', label: 'Timed', sub: `${focusTimedMin}m`, icon: '⏱' }].map(m => (
              <div key={m.id} onClick={() => setFocusType(m.id)}
                style={{ flex: 1, background: focusType === m.id ? `${C.focus}15` : C.surface, border: `1px solid ${focusType === m.id ? C.focus : C.border}`, borderRadius: '14px', padding: '14px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{m.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: focusType === m.id ? C.focus : C.text }}>{m.label}</div>
                <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>{m.sub}</div>
              </div>
            ))}
          </div>
          {focusType === 'timed' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              {[25, 45, 60, 90].map(m => (
                <button key={m} onClick={() => setFocusTimedMin(m)}
                  style={{ flex: 1, background: focusTimedMin === m ? C.focus : C.surface, border: `1px solid ${focusTimedMin === m ? C.focus : C.border}`, borderRadius: '10px', padding: '8px', fontSize: '12px', fontWeight: 800, color: focusTimedMin === m ? '#fff' : C.sub, cursor: 'pointer' }}>
                  {m}m
                </button>
              ))}
            </div>
          )}
        </div>

        <BtnPrimary label="⚡ Start Session" onClick={startFocusSession} color={C.focus} disabled={!focusProject} />
      </div>
    );
  }

  // ─── Active Screen ────────────────────────────────────────────────────────
  if (focusMode === 'active') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '32px', padding: '40px 20px', color: C.text }}>
        <div style={{ position: 'relative', width: '200px', height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${C.focus}30`, animation: 'pulse-ring 2s ease-in-out infinite' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '44px', fontWeight: 900, fontFamily: 'monospace', letterSpacing: '-2px' }}>{fmtTime(focusElapsed)}</div>
            <div style={{ fontSize: '10px', color: focusPaused ? C.warn : C.focus, fontWeight: 800, letterSpacing: '2px', marginTop: '4px' }}>
              {focusPaused ? 'PAUSED' : 'FOCUSED'}
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 800 }}>{focusProject?.icon} {focusProject?.name}</div>
          {focusSkill && <div style={{ fontSize: '12px', color: C.skill, fontWeight: 700, marginTop: '4px' }}>+Hours → {focusSkill.icon} {focusSkill.name}</div>}
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={() => setFocusPaused(p => !p)} style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.surface, border: `1px solid ${C.border2}`, color: C.sub, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {focusPaused ? <Play size={22} /> : <Pause size={22} />}
          </button>
          <button onClick={() => endFocusSession()} style={{ width: '64px', height: '64px', borderRadius: '50%', background: C.danger, border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Square size={22} />
          </button>
        </div>
        {focusType === 'timed' && (
          <div style={{ fontSize: '11px', color: C.dim }}>{Math.max(0, Math.ceil((focusTimedMin * 60 - focusElapsed) / 60))}m remaining</div>
        )}
        <style>{`
          @keyframes pulse-ring {
            0%, 100% { transform: scale(1); opacity: 0.5; }
            50%       { transform: scale(1.05); opacity: 1; }
          }
        `}</style>
      </div>
    );
  }

  // ─── Completed Screen ─────────────────────────────────────────────────────
  if (focusMode === 'done') {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', gap: '24px', color: C.text }}>
        <div style={{ fontSize: '13px', color: C.muted, fontWeight: 800, letterSpacing: '2px' }}>SESSION COMPLETE</div>
        <div style={{ width: '140px', height: '140px', borderRadius: '50%', border: `3px solid ${C.focus}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 48px ${C.focus}30` }}>
          <span style={{ fontSize: '42px', fontWeight: 900, color: C.focus }}>{focusDoneMin}</span>
          <span style={{ fontSize: '11px', color: C.muted, fontWeight: 800 }}>MINUTES</span>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 800 }}>{focusProject?.icon} {focusProject?.name}</div>
          {focusSkill && (
            <div style={{ marginTop: '10px', background: `${C.skill}12`, border: `1px solid ${C.skill}40`, borderRadius: '12px', padding: '8px 16px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: C.skill }}>+{fmtHours(focusDoneMin)} → {focusSkill.icon} {focusSkill.name}</span>
            </div>
          )}
          <div style={{ fontSize: '12px', color: C.muted, marginTop: '10px', lineHeight: 1.5 }}>
            {focusDoneMin >= 90 ? 'Deep work done. Rest, then go again.' : focusDoneMin >= 45 ? 'Good session. Keep building the habit.' : 'Every minute counts. Come back soon.'}
          </div>
        </div>
        <BtnPrimary label="Done" onClick={closeFocusDone} color={C.growth} style={{ maxWidth: '340px' }} />
      </div>
    );
  }

  return null;
}
