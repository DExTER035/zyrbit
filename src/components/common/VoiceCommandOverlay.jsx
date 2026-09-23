import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mic, MicOff, X, Check, AlertCircle, ArrowRight, CornerDownLeft, Volume2 } from 'lucide-react';
import { useVoiceInput, isVoiceSupported, VOICE_STATUS, VOICE_LANGUAGES } from '../../voice/index.js';
import { processUserInput, DEX_RESULT_TYPE } from '../../dex/index.js';

// Domain mapping helper for live UI invalidation
function getActionDomain(action) {
  if (['create_task', 'complete_task', 'start_focus'].includes(action)) return 'growth';
  if (['log_water', 'log_sleep', 'log_activity', 'log_weight', 'log_meal'].includes(action)) return 'health';
  if (['add_expense', 'add_income', 'add_bill'].includes(action)) return 'wealth';
  if (['complete_habit', 'skip_habit'].includes(action)) return 'zenith';
  return null;
}

export default function VoiceCommandOverlay({ userId, isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const isSupported = isVoiceSupported();
  const [overlayStatus, setOverlayStatus] = useState(
    isSupported ? VOICE_STATUS.LISTENING : VOICE_STATUS.UNSUPPORTED
  );
  const [displayText, setDisplayText] = useState(
    isSupported ? '' : "Voice input isn't available in this browser."
  );
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [pendingClarification, setPendingClarification] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);

  const autoCloseTimerRef = useRef(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  // Primary execution handler passing transcript through standard processUserInput pipeline
  const handleProcessTranscript = useCallback(async (transcriptText, options = {}) => {
    if (!transcriptText || !transcriptText.trim()) return;

    if (!userId) {
      setOverlayStatus(VOICE_STATUS.ERROR);
      setDisplayText('Authentication required. Please log in.');
      return;
    }

    setOverlayStatus(VOICE_STATUS.PROCESSING);
    setDisplayText('Processing...');

    try {
      const result = await processUserInput({
        userId,
        userMessage: transcriptText.trim(),
        confirmed: Boolean(options.confirmed),
        pendingAction: options.pendingAction || pendingClarification?.action || null,
        pendingParams: options.pendingParams || pendingClarification?.params || null,
        metadata: {
          source: 'voice',
          language: options.language || 'en-IN',
        },
      });

      if (result.type === DEX_RESULT_TYPE.CONFIRMATION_REQUIRED) {
        setPendingConfirmation({
          action: result.action,
          params: result.params,
          message: result.displayMessage,
        });
        setPendingClarification(null);
        setOverlayStatus(VOICE_STATUS.CONFIRMING);
        setDisplayText(result.displayMessage);
      } else if (result.type === DEX_RESULT_TYPE.CLARIFICATION_NEEDED) {
        setPendingClarification({
          action: result.action || null,
          params: result.params || null,
        });
        setPendingConfirmation(null);
        setOverlayStatus(VOICE_STATUS.CLARIFICATION_REQUIRED);
        setDisplayText(result.displayMessage);
      } else if (result.type === DEX_RESULT_TYPE.SUCCESS) {
        setPendingConfirmation(null);
        setPendingClarification(null);
        setOverlayStatus(VOICE_STATUS.SUCCESS);
        setDisplayText(result.displayMessage);

        // Special handling for focus session
        if (result.action === 'start_focus') {
          window.dispatchEvent(
            new CustomEvent('dexos:start-focus', {
              detail: {
                minutes: result.data?.durationMinutes || 25,
                notes: result.data?.notes || '',
                projectId: result.data?.projectId || null,
              },
            })
          );
          if (!location.pathname.includes('growth')) {
            navigate('/growth');
          }
        }

        // Special handling for navigation
        if (result.action === 'navigate' && result.data?.route) {
          navigate(result.data.route);
        }

        // Broadcast domain refresh
        const domain = getActionDomain(result.action);
        if (domain) {
          window.dispatchEvent(
            new CustomEvent('dexos:refresh', {
              detail: { action: result.action, domain },
            })
          );
        }

        // Auto close after calm delay
        autoCloseTimerRef.current = setTimeout(() => {
          onClose();
        }, 2200);
      } else if (result.type === DEX_RESULT_TYPE.CONVERSATIONAL) {
        setPendingConfirmation(null);
        setPendingClarification(null);
        setOverlayStatus(VOICE_STATUS.SUCCESS);
        setDisplayText(result.displayMessage);
      } else {
        setPendingConfirmation(null);
        setPendingClarification(null);
        setOverlayStatus(VOICE_STATUS.ERROR);
        const raw = result.displayMessage || '';
        const safeMsg = (raw && !raw.includes('non-2xx') && !raw.includes('Edge Function'))
          ? raw
          : "Dex couldn't process that request. Try speaking a direct command like 'Log 500 ml water'.";
        setDisplayText(safeMsg);
      }
    } catch (err) {
      setOverlayStatus(VOICE_STATUS.ERROR);
      const raw = err.message || '';
      const safeMsg = (raw && !raw.includes('non-2xx') && !raw.includes('Edge Function'))
        ? raw
        : 'Dex AI is momentarily unavailable. Direct voice actions work offline.';
      setDisplayText(safeMsg);
    }
  }, [userId, pendingClarification, location.pathname, navigate, onClose]);

  // Hook up voice input
  const {
    transcript,
    interimTranscript,
    language,
    setLanguage,
    start,
    cancel,
    reset,
  } = useVoiceInput({
    language: VOICE_LANGUAGES.EN_IN,
    onError: (err) => {
      setOverlayStatus(VOICE_STATUS.ERROR);
      setDisplayText(err?.message || "I couldn't hear that. Please try speaking again.");
    },
    onFinalTranscript: (finalText) => {
      handleProcessTranscript(finalText, { language });
    },
  });

  // Auto-start listening on mount when open
  useEffect(() => {
    if (isOpen && isSupported) {
      start();
    }
    return () => {
      cancel();
      reset();
    };
  }, [isOpen, isSupported, start, cancel, reset]);

  const handleCancel = useCallback(() => {
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    cancel();
    reset();
    setPendingConfirmation(null);
    setPendingClarification(null);
    onClose();
  }, [cancel, reset, onClose]);

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  const handleConfirmAction = async () => {
    if (!pendingConfirmation) return;
    const pending = pendingConfirmation;
    setPendingConfirmation(null);

    setOverlayStatus(VOICE_STATUS.EXECUTING);
    setDisplayText('Executing...');

    try {
      const result = await processUserInput({
        userId,
        userMessage: 'Confirm',
        confirmed: true,
        pendingAction: pending.action,
        pendingParams: pending.params,
        metadata: { source: 'voice', language },
      });

      if (result.type === DEX_RESULT_TYPE.SUCCESS) {
        setOverlayStatus(VOICE_STATUS.SUCCESS);
        setDisplayText(result.displayMessage);

        const domain = getActionDomain(result.action);
        if (domain) {
          window.dispatchEvent(
            new CustomEvent('dexos:refresh', {
              detail: { action: result.action, domain },
            })
          );
        }

        autoCloseTimerRef.current = setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setOverlayStatus(VOICE_STATUS.ERROR);
        const raw = result.displayMessage || '';
        const safeMsg = (raw && !raw.includes('non-2xx') && !raw.includes('Edge Function'))
          ? raw
          : 'Action failed to execute. Please try again.';
        setDisplayText(safeMsg);
      }
    } catch (err) {
      setOverlayStatus(VOICE_STATUS.ERROR);
      const raw = err.message || '';
      const safeMsg = (raw && !raw.includes('non-2xx') && !raw.includes('Edge Function'))
        ? raw
        : 'Execution failed. Please try again.';
      setDisplayText(safeMsg);
    }
  };

  const handleRetryListening = () => {
    setDisplayText('');
    setPendingConfirmation(null);
    setPendingClarification(null);
    setOverlayStatus(VOICE_STATUS.LISTENING);
    start();
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const text = manualInput.trim();
    setManualInput('');
    setShowManualInput(false);
    handleProcessTranscript(text, { language });
  };

  if (!isOpen) return null;

  const activeTranscript = transcript || interimTranscript;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dex Voice Operator"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(11, 13, 15, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: '#15181B',
          border: '1px solid #2A3038',
          borderRadius: '24px',
          padding: '28px 24px',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleCancel}
          aria-label="Close voice input"
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F5F5F5')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
        >
          <X size={18} />
        </button>

        {/* Language selector chips */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
          {[
            { id: VOICE_LANGUAGES.EN_IN, label: 'EN-IN' },
            { id: VOICE_LANGUAGES.HI_IN, label: 'HI-IN' },
            { id: VOICE_LANGUAGES.EN_US, label: 'EN-US' },
          ].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                setLanguage(l.id);
                if (overlayStatus === VOICE_STATUS.LISTENING) {
                  stop();
                  setTimeout(() => start(), 100);
                }
              }}
              style={{
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '3px 8px',
                borderRadius: '12px',
                background: language === l.id ? 'rgba(31, 163, 111, 0.2)' : '#1B1F23',
                color: language === l.id ? '#1FA36F' : '#6B7280',
                border: `1px solid ${language === l.id ? 'rgba(31, 163, 111, 0.4)' : '#2A3038'}`,
                cursor: 'pointer',
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Central Icon & Pulse Indicator */}
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          {overlayStatus === VOICE_STATUS.LISTENING && (
            <div
              style={{
                position: 'absolute',
                inset: '-12px',
                borderRadius: '50%',
                background: 'rgba(31, 163, 111, 0.15)',
                animation: 'pulse 1.8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
              }}
            />
          )}

          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background:
                overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED
                  ? 'rgba(239, 68, 68, 0.12)'
                  : overlayStatus === VOICE_STATUS.SUCCESS
                  ? 'rgba(31, 163, 111, 0.2)'
                  : overlayStatus === VOICE_STATUS.CONFIRMING
                  ? 'rgba(245, 158, 11, 0.15)'
                  : 'rgba(31, 163, 111, 0.15)',
              border: `1px solid ${
                overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED
                  ? 'rgba(239, 68, 68, 0.3)'
                  : overlayStatus === VOICE_STATUS.CONFIRMING
                  ? 'rgba(245, 158, 11, 0.3)'
                  : 'rgba(31, 163, 111, 0.4)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color:
                overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED
                  ? '#EF4444'
                  : overlayStatus === VOICE_STATUS.CONFIRMING
                  ? '#F59E0B'
                  : '#1FA36F',
              position: 'relative',
              transition: 'all 0.2s ease',
            }}
          >
            {overlayStatus === VOICE_STATUS.SUCCESS ? (
              <Check size={28} />
            ) : overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED ? (
              <AlertCircle size={28} />
            ) : overlayStatus === VOICE_STATUS.CONFIRMING ? (
              <AlertCircle size={28} />
            ) : (
              <Mic size={26} />
            )}
          </div>
        </div>

        {/* State Label */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color:
              overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED
                ? '#EF4444'
                : overlayStatus === VOICE_STATUS.CONFIRMING
                ? '#F59E0B'
                : '#1FA36F',
            marginBottom: '8px',
          }}
        >
          {overlayStatus === VOICE_STATUS.LISTENING && 'Listening...'}
          {overlayStatus === VOICE_STATUS.PROCESSING && 'Interpreting...'}
          {overlayStatus === VOICE_STATUS.CONFIRMING && 'Confirmation Required'}
          {overlayStatus === VOICE_STATUS.CLARIFICATION_REQUIRED && 'Clarification Needed'}
          {overlayStatus === VOICE_STATUS.EXECUTING && 'Executing...'}
          {overlayStatus === VOICE_STATUS.SUCCESS && 'Completed'}
          {overlayStatus === VOICE_STATUS.ERROR && 'Voice Error'}
          {overlayStatus === VOICE_STATUS.UNSUPPORTED && 'Not Supported'}
        </div>

        {/* Main Content Area */}
        <div
          style={{
            fontSize: '16px',
            fontWeight: 600,
            lineHeight: 1.4,
            color: '#F5F5F5',
            minHeight: '44px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            wordBreak: 'break-word',
          }}
        >
          {overlayStatus === VOICE_STATUS.LISTENING ? (
            activeTranscript ? (
              <span style={{ color: '#F5F5F5' }}>"{activeTranscript}"</span>
            ) : (
              <span style={{ color: '#6B7280', fontWeight: 500, fontSize: '14px' }}>
                Say something like "Log 500 ml water" or "Add 200 food expense"
              </span>
            )
          ) : (
            displayText || '...'
          )}
        </div>

        {/* Confirmation Buttons */}
        {overlayStatus === VOICE_STATUS.CONFIRMING && (
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '6px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: '#1A1E24',
                border: '1px solid #2A3038',
                color: '#9CA3AF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: '#1FA36F',
                border: 'none',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirm
            </button>
          </div>
        )}

        {/* Clarification / Reply Controls */}
        {overlayStatus === VOICE_STATUS.CLARIFICATION_REQUIRED && (
          <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRetryListening}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                background: '#1FA36F',
                border: 'none',
                color: '#000000',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
              }}
            >
              <Mic size={16} /> Tap to Speak Answer
            </button>
            <button
              type="button"
              onClick={() => setShowManualInput(!showManualInput)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6B7280',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {showManualInput ? 'Hide keyboard input' : 'Or type answer'}
            </button>
          </div>
        )}

        {/* Retry / Error Controls */}
        {(overlayStatus === VOICE_STATUS.ERROR || overlayStatus === VOICE_STATUS.UNSUPPORTED) && (
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                background: '#1A1E24',
                border: '1px solid #2A3038',
                color: '#9CA3AF',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
            {isSupported && (
              <button
                type="button"
                onClick={handleRetryListening}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#1FA36F',
                  border: 'none',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {/* Manual Type Fallback Input when requested */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} style={{ width: '100%', marginTop: '12px', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              autoFocus
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Type your response..."
              style={{
                flex: 1,
                background: '#0B0D0F',
                border: '1px solid #2A3038',
                borderRadius: '10px',
                padding: '10px 14px',
                color: '#F5F5F5',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                background: '#1FA36F',
                border: 'none',
                borderRadius: '10px',
                padding: '0 14px',
                color: '#000000',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CornerDownLeft size={16} />
            </button>
          </form>
        )}

        {/* Stop listening manually when active */}
        {overlayStatus === VOICE_STATUS.LISTENING && activeTranscript && (
          <button
            type="button"
            onClick={stop}
            style={{
              marginTop: '10px',
              background: '#1A1E24',
              border: '1px solid #2A3038',
              borderRadius: '20px',
              padding: '6px 14px',
              color: '#9CA3AF',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Done speaking</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
