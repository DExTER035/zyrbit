/**
 * BrainDumpEntry
 *
 * The first-class brain dump experience on Zenith.
 * Single purpose: capture → interpret → confirm → act → Dex response → Focus CTA.
 *
 * Architecture:
 * - parseBrainDump() → AI extraction of domain signals (display only)
 * - User sees "Understood as" panel — domain-grouped, editable awareness
 * - On confirm → each signal processed via processUserInput (dexOrchestrator)
 * - dexos:refresh event updates domain pages automatically
 * - Dex shows 2-3 sentence contextual response + optional Focus CTA
 *
 * Rules:
 * - NO direct Supabase calls here
 * - NO duplicate state management
 * - NO chatbot UI — this is a capture surface, not a conversation
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Check, RotateCcw, Timer, X, Loader } from 'lucide-react';
import { parseBrainDump } from '../../../dex/brainDumpParser.js';
import { processUserInput, DEX_RESULT_TYPE } from '../../../dex/index.js';
import { showToast } from '../../ui/Toast.jsx';

// ─── Design tokens (Zyrbit palette) ──────────────────────────────────────────
const T = {
  bg:      '#0B0D0F',
  surface: '#15181B',
  border:  '#23272E',
  borderSubtle: 'rgba(255,255,255,0.06)',
  text:    '#F5F5F5',
  sub:     '#9CA3AF',
  muted:   '#6B7280',
  accent:  '#1FA36F',
  amber:   '#F59E0B',
  danger:  '#EF4444',
};

// Domain display config
const DOMAIN_CONFIG = {
  health: { label: 'Health', color: '#F59E0B', dot: '#F59E0B' },
  growth: { label: 'Growth', color: '#1FA36F', dot: '#1FA36F' },
  wealth: { label: 'Wealth', color: '#60A5FA', dot: '#60A5FA' },
  zenith: { label: 'Context', color: '#9CA3AF', dot: '#9CA3AF' },
};

// ─── Phase machine ────────────────────────────────────────────────────────────
// idle → parsing → understood → confirming → done
// idle → parsing → error

/**
 * @param {{ userId: string, onStateChange: () => void }} props
 */
export default function BrainDumpEntry({ userId, onStateChange }) {
  const navigate = useNavigate();
  const [phase, setPhase] = useState('idle'); // idle | parsing | understood | confirming | done | error
  const [inputText, setInputText] = useState('');
  const [signals, setSignals] = useState([]);
  const [dexResponse, setDexResponse] = useState('');
  const [focusCta, setFocusCta] = useState(null);
  const [focusMinutes, setFocusMinutes] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedCount, setConfirmedCount] = useState(0);
  const [isFocusActive, setIsFocusActive] = useState(false);
  const textareaRef = useRef(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputText]);

  // ── Step 1: Parse brain dump ───────────────────────────────────────────────
  const handleParse = async () => {
    const text = inputText.trim();
    if (!text || phase !== 'idle') return;

    setPhase('parsing');
    setErrorMsg('');

    const result = await parseBrainDump(text);

    if (!result.success || result.signals.length === 0) {
      setErrorMsg(result.error || 'Could not understand that. Try rephrasing with more detail.');
      setPhase('error');
      return;
    }

    setSignals(result.signals);
    setDexResponse(result.dexResponse);
    setFocusCta(result.focusCta);
    setFocusMinutes(result.focusMinutes);
    setPhase('understood');
  };

  // ── Step 2: Confirm all signals → execute via dexOrchestrator ────────────
  const handleConfirm = async () => {
    if (phase !== 'understood' || !userId) return;
    setPhase('confirming');
    setConfirmedCount(0);

    let successCount = 0;

    for (let i = 0; i < signals.length; i++) {
      const signal = signals[i];
      if (!signal.userMessage) {
        setConfirmedCount(i + 1);
        continue;
      }

      try {
        const result = await processUserInput({
          userId,
          userMessage: signal.userMessage,
          confirmed: false,
        });

        // For actions requiring confirmation (e.g. financial), auto-confirm
        if (result.type === DEX_RESULT_TYPE.CONFIRMATION_REQUIRED) {
          await processUserInput({
            userId,
            userMessage: signal.userMessage,
            pendingAction: result.action,
            pendingParams: result.params,
            confirmed: true,
          });
        }

        // For actions that succeeded or are conversational notes — count as done
        if (
          result.type === DEX_RESULT_TYPE.SUCCESS ||
          result.type === DEX_RESULT_TYPE.CONVERSATIONAL ||
          result.type === DEX_RESULT_TYPE.UNSUPPORTED
        ) {
          successCount++;
        } else if (result.type === DEX_RESULT_TYPE.CLARIFICATION_NEEDED) {
          // Clarifications in brain dump context are treated as notes — skip
          successCount++;
        }
      } catch (err) {
        console.warn('[BrainDumpEntry] Signal execution failed:', err.message);
      }

      setConfirmedCount(i + 1);
    }

    // Trigger refresh across all domain pages
    window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: null } }));
    onStateChange?.();

    setPhase('done');

    if (successCount > 0) {
      showToast(`Zyrbit updated · ${successCount} state change${successCount > 1 ? 's' : ''}`, 'success');
    }
  };

  // ── Focus CTA ──────────────────────────────────────────────────────────────
  const handleStartFocus = () => {
    if (isFocusActive) return;
    setIsFocusActive(true);

    const mins = focusMinutes || 45;
    window.dispatchEvent(
      new CustomEvent('dexos:start-focus', {
        detail: {
          minutes: mins,
          notes: 'Focus block from Brain Dump',
          projectId: null,
        },
      })
    );
    navigate('/growth');
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = () => {
    setPhase('idle');
    setInputText('');
    setSignals([]);
    setDexResponse('');
    setFocusCta(null);
    setFocusMinutes(null);
    setErrorMsg('');
    setConfirmedCount(0);
    setIsFocusActive(false);
  };

  // ── Group signals by domain ────────────────────────────────────────────────
  const groupedSignals = signals.reduce((acc, s) => {
    const domain = s.domain || 'zenith';
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(s);
    return acc;
  }, {});

  // ─── Render ────────────────────────────────────────────────────────────────

  if (phase === 'done') {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dex Response */}
        {dexResponse && (
          <div style={{
            padding: '18px 20px',
            borderRadius: '14px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <Sparkles size={14} color={T.accent} style={{ marginTop: '2px', flexShrink: 0 }} />
              <p style={{
                fontSize: '14px',
                color: T.sub,
                lineHeight: 1.6,
                margin: 0,
                fontWeight: 400,
              }}>
                {dexResponse}
              </p>
            </div>

            {/* Focus CTA */}
            {focusCta && (
              <button
                onClick={handleStartFocus}
                disabled={isFocusActive}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: isFocusActive ? 'rgba(31,163,111,0.15)' : T.accent,
                  color: isFocusActive ? T.accent : '#0B0D0F',
                  border: isFocusActive ? `1px solid rgba(31,163,111,0.3)` : 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: isFocusActive ? 'default' : 'pointer',
                  transition: 'all 0.2s',
                  letterSpacing: '-0.01em',
                }}
              >
                <Timer size={14} />
                <span>{isFocusActive ? 'Focus started' : focusCta}</span>
              </button>
            )}
          </div>
        )}

        {/* Reset */}
        <button
          onClick={handleReset}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            color: T.muted,
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            padding: '4px 0',
            alignSelf: 'flex-start',
          }}
        >
          <RotateCcw size={12} />
          <span>New brain dump</span>
        </button>
      </section>
    );
  }

  if (phase === 'understood' || phase === 'confirming') {
    const isConfirming = phase === 'confirming';

    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Understood as header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: T.accent,
              ...(isConfirming ? { animation: 'pulse 1.2s ease-in-out infinite' } : {}),
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: T.sub,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}>
              Understood as
            </span>
          </div>
          {!isConfirming && (
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.muted,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontWeight: 500,
                padding: '2px 4px',
              }}
            >
              <RotateCcw size={11} />
              <span>Rephrase</span>
            </button>
          )}
        </div>

        {/* Domain-grouped signals */}
        <div style={{
          padding: '16px',
          borderRadius: '14px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          {Object.entries(groupedSignals).map(([domain, domainSignals]) => {
            const config = DOMAIN_CONFIG[domain] || DOMAIN_CONFIG.zenith;
            return (
              <div key={domain} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Domain label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: config.dot, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    color: config.color,
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                  }}>
                    {config.label}
                  </span>
                </div>

                {/* Signal labels */}
                {domainSignals.map((signal, idx) => {
                  const signalIndex = signals.indexOf(signal);
                  const isDone = isConfirming && signalIndex < confirmedCount;

                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        paddingLeft: '11px',
                        opacity: isDone ? 0.5 : 1,
                        transition: 'opacity 0.3s',
                      }}
                    >
                      {isDone ? (
                        <Check size={12} color={T.accent} style={{ flexShrink: 0 }} />
                      ) : (
                        <div style={{
                          width: '4px', height: '4px', borderRadius: '50%',
                          background: T.muted, flexShrink: 0,
                        }} />
                      )}
                      <span style={{
                        fontSize: '13px',
                        color: isDone ? T.muted : T.text,
                        fontWeight: 400,
                        lineHeight: 1.4,
                      }}>
                        {signal.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* Progress indicator during confirmation */}
          {isConfirming && (
            <div style={{
              paddingTop: '8px',
              borderTop: `1px solid ${T.borderSubtle}`,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                {signals.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '16px', height: '3px', borderRadius: '2px',
                      background: i < confirmedCount ? T.accent : T.border,
                      transition: 'background 0.3s',
                    }}
                  />
                ))}
              </div>
              <span style={{ fontSize: '11px', color: T.muted }}>
                Updating state...
              </span>
            </div>
          )}
        </div>

        {/* Confirm button */}
        {!isConfirming && (
          <button
            onClick={handleConfirm}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '13px 20px',
              borderRadius: '12px',
              background: T.accent,
              color: '#0B0D0F',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Check size={15} strokeWidth={2.5} />
            <span>Confirm — update state</span>
          </button>
        )}
      </section>
    );
  }

  // ── Idle + parsing + error ─────────────────────────────────────────────────
  const isParsing = phase === 'parsing';
  const isError = phase === 'error';

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {/* Label */}
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        color: T.muted,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}>
        What's going on today?
      </div>

      {/* Input area */}
      <div style={{
        position: 'relative',
        borderRadius: '14px',
        background: T.surface,
        border: `1px solid ${isParsing ? T.accent : isError ? T.danger : T.border}`,
        transition: 'border-color 0.2s',
        overflow: 'hidden',
      }}>
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isParsing}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleParse();
            }
          }}
          placeholder="Slept badly, CEP presentation tomorrow, need to finish Wealth UI today, ₹2,500 commitments this week..."
          rows={3}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            padding: '14px 16px 12px',
            fontSize: '14px',
            color: T.text,
            lineHeight: 1.55,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            minHeight: '80px',
            overflowY: 'hidden',
          }}
        />

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px 10px',
          borderTop: `1px solid ${T.borderSubtle}`,
        }}>
          <span style={{ fontSize: '11px', color: T.muted }}>
            {isParsing ? 'Reading your situation...' : 'Ctrl+Enter to send'}
          </span>

          <button
            onClick={handleParse}
            disabled={!inputText.trim() || isParsing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: !inputText.trim() || isParsing
                ? 'rgba(31,163,111,0.12)'
                : T.accent,
              color: !inputText.trim() || isParsing ? T.accent : '#0B0D0F',
              border: 'none',
              fontWeight: 700,
              fontSize: '12px',
              cursor: !inputText.trim() || isParsing ? 'default' : 'pointer',
              transition: 'all 0.2s',
              letterSpacing: '-0.01em',
            }}
          >
            {isParsing ? (
              <Loader size={12} style={{ animation: 'spin 1s linear infinite' }} />
            ) : (
              <ArrowRight size={12} strokeWidth={2.5} />
            )}
            <span>{isParsing ? 'Reading...' : 'Understand'}</span>
          </button>
        </div>
      </div>

      {/* Error message */}
      {isError && errorMsg && (
        <div style={{
          fontSize: '12px',
          color: T.danger,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 0',
        }}>
          <X size={12} />
          <span>{errorMsg}</span>
          <button
            onClick={() => { setPhase('idle'); setErrorMsg(''); }}
            style={{
              background: 'transparent', border: 'none', color: T.sub,
              fontSize: '11px', cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            Try again
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </section>
  );
}
