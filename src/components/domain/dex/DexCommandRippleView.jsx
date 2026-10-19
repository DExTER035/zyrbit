/**
 * DexCommandRippleView — The Master Command & Ripple Console
 * Metaphor: COMMAND / RIPPLE ("Tell me what's going on.")
 * Renders the Luminous Dex Orb, Large Input Pill, Suggestion Chips,
 * Multi-Domain Ripple Proposal Card, and Confirmation/Undo State.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Sparkles, Check, RotateCcw, X, Utensils, Wallet, Compass, Plus, ArrowRight } from 'lucide-react';

export default function DexCommandRippleView({
  onCommandSubmit,
  onAttachImage,
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
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      onAttachImage?.({
        file,
        dataUrl: event.target?.result,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

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
      padding: '10px 16px 24px',
      color: '#FFFFFF',
      position: 'relative',
      width: '100%',
      maxWidth: '480px',
      margin: '0 auto',
      flexShrink: 0,
    }}>
      {/* ── CENTRAL WHITE COMPANION CARD (Screen 11 Reference) ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '24px',
        padding: '22px 20px',
        border: '1.5px solid var(--brand-border, #E5E0D8)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Top Greeting Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--brand-petrol, #174A55)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '16px',
            flexShrink: 0,
          }}>
            Z
          </div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, color: '#111A20', letterSpacing: '-0.01em' }}>
              Hey, I'm Dex.
            </div>
            <div style={{ fontSize: '12px', color: '#8A9CA3', marginTop: '2px' }}>
              I can help you plan, track and make progress.
            </div>
          </div>
        </div>

        {/* 4 Action Suggestion Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { label: 'Plan my day', cmd: 'Plan my day', icon: '📅' },
            { label: 'Analyze my meal', cmd: 'Analyze my meal', icon: '🥗' },
            { label: 'Review my spending', cmd: 'Review my spending this month', icon: '💳' },
            { label: 'Check my habits', cmd: 'Check my habit streak and momentum', icon: '🎯' },
          ].map((act, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onCommandSubmit(act.cmd)}
              style={{
                background: '#F9F8F5',
                border: '1px solid #ECE8DF',
                borderRadius: '14px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--brand-petrol, #174A55)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#ECE8DF'; }}
            >
              <span style={{ fontSize: '16px' }}>{act.icon}</span>
              <span style={{ fontSize: '14px', fontWeight: 600, color: '#111A20' }}>{act.label}</span>
            </button>
          ))}
        </div>

        {/* Chat input inside card */}
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          alignItems: 'center',
          background: '#FFFFFF',
          border: '1.5px solid var(--brand-border, #E5E0D8)',
          borderRadius: '9999px',
          padding: '4px 6px 4px 14px',
          marginTop: '4px',
        }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Dex anything..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontSize: '13px',
              color: '#111A20',
            }}
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: inputText.trim() ? 'var(--brand-petrol, #174A55)' : '#DDE9EB',
              color: inputText.trim() ? '#FFFFFF' : '#8A9CA3',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'background 0.15s ease',
            }}
          >
            <ArrowRight size={14} />
          </button>
        </form>
      </div>

      {/* ── CONTEXT READY PILL (Screen 5 Reference) ── */}
      <div style={{
        background: '#111A15',
        border: '1px solid #1A2B23',
        borderRadius: '14px',
        padding: '10px 14px',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2DE09A' }} />
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#2DE09A', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            CONTEXT READY
          </span>
        </div>
        <div style={{ fontSize: '12px', color: '#7E948A' }}>
          Habits · Meals · Goals · Ledger
        </div>
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
        /* ── LARGE COMMAND INPUT PILL (Screen 5 Reference) ── */
        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            background: '#111A15',
            border: '1px solid #1A2B23',
            borderRadius: '9999px',
            padding: '6px 8px 6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px',
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            data-testid="dex-attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            aria-label="Attach screenshot or image"
            title="Attach screenshot or image"
            style={{
              background: 'transparent',
              color: '#7E948A',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#2DE09A')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#7E948A')}
          >
            <Plus size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Dex anything..."
            disabled={loading}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              color: '#F1F5F3',
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
              color: '#2DE09A',
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
              background: inputText.trim() ? '#2DE09A' : '#15221C',
              color: inputText.trim() ? '#060B08' : '#7E948A',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              boxShadow: inputText.trim() ? '0 0 14px rgba(45, 224, 154, 0.4)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={15} color={inputText.trim() ? '#060B08' : '#7E948A'} />
          </button>
        </form>
      )}

      {/* ── SUGGESTION CHIPS ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        width: '100%',
        marginBottom: '20px',
      }}>
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onCommandSubmit(s)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: '#111A15',
              border: '1px solid #1A2B23',
              borderRadius: '14px',
              color: '#F1F5F3',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              wordBreak: 'break-word',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#2DE09A';
              e.currentTarget.style.background = '#15221C';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1A2B23';
              e.currentTarget.style.background = '#111A15';
            }}
          >
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
            <span style={{ color: '#2DE09A', fontSize: '13px', flexShrink: 0 }}>↗</span>
          </button>
        ))}
      </div>

      {/* ── FOOTER NOTE ── */}
      <div style={{
        fontSize: '11px',
        color: 'var(--text-secondary, #68758A)',
        textAlign: 'center',
        lineHeight: 1.4,
      }}>
        Commands and queries run deterministically. AI is used for advice and planning.
      </div>
    </div>
  );
}
