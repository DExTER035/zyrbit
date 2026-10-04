/**
 * DexCommandRippleView — The Master Command & Ripple Console
 * Metaphor: COMMAND / RIPPLE ("Tell me what's going on.")
 * Renders the Luminous Dex Orb, Large Input Pill, Suggestion Chips,
 * Multi-Domain Ripple Proposal Card, and Confirmation/Undo State.
 */
import React, { useState, useEffect } from 'react';
import { Send, Mic, Sparkles, Check, RotateCcw, X, Utensils, Wallet, Compass } from 'lucide-react';

export default function DexCommandRippleView({
  onCommandSubmit,
  loading = false,
  suggestions: customSuggestions = null,
  pendingPlan = null,
  onConfirmPlan,
  onCancelPlan,
  lastExecuted = null,
  onUndo,
}) {
  const [inputText, setInputText] = useState('');
  const [undoCountdown, setUndoCountdown] = useState(10);

  // Default suggestions from visual reference
  const suggestions = customSuggestions && customSuggestions.length > 0 ? customSuggestions : [
    'I ate poha for ₹30',
    'I spent ₹500 on Uber',
    'I slept 5 hours',
    'I had a 750ml bottle',
    'How much did I spend today?',
  ];

  // Handle submit
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!inputText.trim() || loading) return;
    onCommandSubmit(inputText.trim());
    setInputText('');
  };

  // Undo countdown timer
  useEffect(() => {
    if (!lastExecuted) return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, 10 - elapsed);
      setUndoCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [lastExecuted]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 20px',
      color: '#ECE8DF',
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
    }}>
      {/* ── TOP LUMINOUS DEX ORB ── */}
      <div style={{ position: 'relative', marginBottom: '14px' }}>
        {/* Ambient Outer Halo */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '110px',
          height: '110px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.3) 0%, rgba(2, 132, 199, 0.1) 50%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
        }} />

        {/* The Spherical Glass Orb */}
        <div style={{
          width: '68px',
          height: '68px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 35% 30%, #BAE6FD 0%, #38BDF8 30%, #0284C7 65%, #0B192C 100%)',
          boxShadow: '0 0 24px rgba(56, 189, 248, 0.5), inset 0 0 12px rgba(255, 255, 255, 0.6)',
          border: '1.5px solid rgba(255, 255, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 3s infinite ease-in-out',
        }}>
          {/* Inner Light Core */}
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 70%)',
            opacity: 0.8,
          }} />
        </div>
      </div>

      {/* ── TITLE & SUBTITLE ── */}
      <h2 style={{
        fontSize: '22px',
        fontWeight: 800,
        color: '#ECE8DF',
        letterSpacing: '-0.02em',
        margin: '0 0 4px',
      }}>
        Dex
      </h2>
      <div style={{
        fontSize: '13px',
        color: '#9A978F',
        marginBottom: '20px',
      }}>
        Tell me what's going on.
      </div>

      {/* ── MULTI-DOMAIN PROPOSAL CARD (When Plan is Proposed) ── */}
      {pendingPlan ? (
        <div style={{
          width: '100%',
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#E9B44C',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '14px',
          }}>
            I understood:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            {/* Health Domain Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: '#1B1C22',
              borderRadius: '12px',
              border: '1px solid #26272D',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Utensils size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ECE8DF' }}>
                  Health
                </div>
                <div style={{ fontSize: '12px', color: '#9A978F' }}>
                  Poha • 1 plate • ~280 kcal • estimated
                </div>
              </div>
            </div>

            {/* Wealth Domain Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: '#1B1C22',
              borderRadius: '12px',
              border: '1px solid #26272D',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(233, 180, 76, 0.15)',
                color: '#E9B44C',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Wallet size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ECE8DF' }}>
                  Wealth
                </div>
                <div style={{ fontSize: '12px', color: '#9A978F' }}>
                  ₹30 • Food & Dining
                </div>
              </div>
            </div>

            {/* Zenith Domain Row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 12px',
              background: '#1B1C22',
              borderRadius: '12px',
              border: '1px solid #26272D',
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                color: '#38BDF8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Compass size={15} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#ECE8DF' }}>
                  Zenith
                </div>
                <div style={{ fontSize: '12px', color: '#9A978F' }}>
                  Breakfast at 9:15 AM
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={onConfirmPlan}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                background: '#E9B44C',
                color: '#0E0F13',
                border: 'none',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Applying...' : 'Confirm & Apply'}
            </button>
            <button
              onClick={onCancelPlan}
              style={{
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#9A978F',
                border: '1px solid #26272D',
                borderRadius: '12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Edit / Cancel
            </button>
          </div>
        </div>
      ) : lastExecuted && undoCountdown > 0 ? (
        /* ── RIPPLE APPLIED SUCCESS STATE ── */
        <div style={{
          width: '100%',
          background: '#15161B',
          border: '1px solid #10B981',
          borderRadius: '20px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#10B981',
              color: '#0E0F13',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Check size={14} strokeWidth={3} />
            </div>
            <span style={{ fontSize: '15px', fontWeight: 800, color: '#ECE8DF' }}>
              Logged successfully!
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#9A978F', marginBottom: '16px' }}>
            <div>✓ Health Meal added</div>
            <div>✓ Wealth Expense added</div>
            <div>✓ Zenith Time mark added</div>
          </div>

          <button
            onClick={onUndo}
            style={{
              width: '100%',
              padding: '10px',
              background: '#22242B',
              border: '1px solid #3A3B40',
              borderRadius: '10px',
              color: '#ECE8DF',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
            }}
          >
            <RotateCcw size={14} />
            <span>Undo ({undoCountdown}s)</span>
          </button>
        </div>
      ) : (
        /* ── LARGE COMMAND INPUT PILL ── */
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            background: '#15161B',
            border: '1px solid #3A3B40',
            borderRadius: '9999px',
            padding: '6px 8px 6px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="I ate poha for ₹30"
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#ECE8DF',
              fontSize: '14px',
              outline: 'none',
              fontWeight: 500,
            }}
          />

          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('dexos:voice-open'));
            }}
            disabled={loading}
            aria-label="Voice Command"
            title="Voice Command"
            style={{
              background: 'transparent',
              color: '#38BDF8',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Mic size={16} />
          </button>

          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: inputText.trim() ? '#ECE8DF' : '#26272D',
              color: '#0E0F13',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={15} color={inputText.trim() ? '#0E0F13' : '#6B7280'} />
          </button>
        </form>
      )}

      {/* ── SUGGESTION CHIPS ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        marginBottom: '24px',
      }}>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onCommandSubmit(s)}
            style={{
              width: '100%',
              padding: '11px 16px',
              background: '#15161B',
              border: '1px solid #26272D',
              borderRadius: '14px',
              color: '#ECE8DF',
              fontSize: '13px',
              fontWeight: 500,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3A3B40';
              e.currentTarget.style.background = '#1A1B22';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#26272D';
              e.currentTarget.style.background = '#15161B';
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── FOOTER NOTE ── */}
      <div style={{
        fontSize: '11px',
        color: '#6B7280',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        Commands and queries run without AI. AI is used only for advice.
      </div>
    </div>
  );
}
