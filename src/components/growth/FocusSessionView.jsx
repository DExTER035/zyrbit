import React, { useEffect } from 'react';
import { Play, Pause, Check } from 'lucide-react';
import {
  C,
  fmtTime,
  BtnPrimary
} from './shared.jsx';

export default function FocusSessionView({
  focusMode,
  focusProject,
  focusNotes,
  focusType,
  focusTimedMin,
  focusElapsed,
  focusPaused,
  setFocusPaused,
  focusDoneMin,
  startFocusSession,
  endFocusSession,
  closeFocusDone
}) {
  // If we ever get directed to the legacy setup state, instantly trigger the session
  useEffect(() => {
    if (focusMode === 'setup') {
      startFocusSession();
    }
  }, [focusMode, startFocusSession]);

  // Color tokens aligned to specification
  const ACCENT = '#14B8A6';
  const BG_COLOR = '#0B0D0F';
  const SURFACE_COLOR = '#15181B';

  // ─── Active Screen ────────────────────────────────────────────────────────
  if (focusMode === 'active') {
    const isTimed = focusType === 'timed';
    const displaySecs = isTimed 
      ? Math.max(0, focusTimedMin * 60 - focusElapsed) 
      : focusElapsed;

    return (
      <div style={{
        background: BG_COLOR,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '60px 24px 80px',
        color: C.text,
        fontFamily: 'Inter, sans-serif'
      }}>
        {/* Topic Header */}
        <div style={{ textAlign: 'center', width: '100%', maxWidth: '360px' }}>
          <div style={{ fontSize: '11px', color: ACCENT, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase', marginBottom: '8px' }}>
            {focusProject ? `${focusProject.icon} ${focusProject.name}` : 'General Focus'}
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: C.text, wordBreak: 'break-word', lineHeight: 1.4 }}>
            {focusNotes || 'Focused Work'}
          </h2>
        </div>

        {/* Hero Large Timer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            fontSize: '76px',
            fontWeight: 900,
            fontFamily: 'monospace',
            letterSpacing: '-2px',
            color: focusPaused ? C.sub : '#fff',
            lineHeight: 1,
            transition: 'color 0.3s'
          }}>
            {fmtTime(displaySecs)}
          </div>
          <div style={{
            fontSize: '11px',
            color: focusPaused ? C.warn : ACCENT,
            fontWeight: 800,
            letterSpacing: '2.5px',
            marginTop: '16px',
            textTransform: 'uppercase'
          }}>
            {focusPaused ? 'PAUSED' : 'FOCUSED'}
          </div>
        </div>

        {/* Exactly 3 Controls (Pause, Resume, Finish) */}
        <div style={{ display: 'flex', gap: '16px', width: '100%', maxWidth: '320px', justifyContent: 'center' }}>
          {!focusPaused ? (
            <button
              onClick={() => setFocusPaused(true)}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                background: SURFACE_COLOR,
                border: `1px solid ${C.border}`,
                color: C.text,
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              <Pause size={16} /> Pause
            </button>
          ) : (
            <button
              onClick={() => setFocusPaused(false)}
              style={{
                flex: 1,
                padding: '16px',
                borderRadius: '16px',
                background: `${ACCENT}15`,
                border: `1px solid ${ACCENT}`,
                color: ACCENT,
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                outline: 'none',
                transition: 'all 0.2s'
              }}
            >
              <Play size={16} /> Resume
            </button>
          )}

          <button
            onClick={() => endFocusSession(focusElapsed)}
            style={{
              flex: 1,
              padding: '16px',
              borderRadius: '16px',
              background: C.danger,
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              outline: 'none',
              transition: 'all 0.2s'
            }}
          >
            <Check size={16} /> Finish
          </button>
        </div>
      </div>
    );
  }

  // ─── Completed Screen ─────────────────────────────────────────────────────
  if (focusMode === 'done') {
    const encouragement = focusDoneMin >= 45 
      ? "Exceptional focus. You are building momentum." 
      : focusDoneMin >= 25 
        ? "Great session. Consistency is the secret." 
        : "Every minute counts. Keep going.";

    return (
      <div style={{
        background: BG_COLOR,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        color: C.text,
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '360px',
          background: SURFACE_COLOR,
          border: `1px solid ${C.border}`,
          borderRadius: '24px',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.4)'
        }}>
          <div style={{ fontSize: '11px', color: ACCENT, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase' }}>
            Session Complete
          </div>

          <div style={{
            width: '110px',
            height: '110px',
            borderRadius: '50%',
            border: `3px solid ${ACCENT}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 32px ${ACCENT}20`
          }}>
            <span style={{ fontSize: '38px', fontWeight: 900, color: ACCENT }}>{focusDoneMin}m</span>
          </div>

          {/* Calm Telemetry Summary */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border2}`, fontSize: '13px' }}>
              <span style={{ color: C.sub }}>Focus Time</span>
              <strong style={{ color: C.text }}>{focusDoneMin} mins</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${C.border2}`, fontSize: '13px' }}>
              <span style={{ color: C.sub }}>XP Earned</span>
              <strong style={{ color: ACCENT }}>+{focusDoneMin} XP</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: '13px' }}>
              <span style={{ color: C.sub }}>Topic</span>
              <strong style={{ color: C.text, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {focusNotes || 'Focused Work'}
              </strong>
            </div>
          </div>

          {/* Encourage sentence */}
          <p style={{
            fontSize: '13px',
            color: C.sub,
            lineHeight: 1.5,
            textAlign: 'center',
            margin: '8px 0 0',
            fontStyle: 'italic'
          }}>
            "{encouragement}"
          </p>

          <BtnPrimary label="Done" onClick={closeFocusDone} color={ACCENT} style={{ marginTop: '8px' }} />
        </div>
      </div>
    );
  }

  return null;
}
