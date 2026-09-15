import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X, Send, Sparkles, AlertCircle, CheckCircle2, RotateCcw, CornerDownLeft } from 'lucide-react';
import { processUserInput, DEX_RESULT_TYPE } from '../../dex/index.js';

// Domain mapping helper for live UI invalidation
function getActionDomain(action) {
  if (['create_task', 'complete_task', 'start_focus'].includes(action)) return 'growth';
  if (['log_water', 'log_sleep', 'log_activity'].includes(action)) return 'health';
  if (['log_meal'].includes(action)) return 'food';
  if (['add_expense', 'add_income', 'add_bill'].includes(action)) return 'wealth';
  if (['complete_habit', 'skip_habit'].includes(action)) return 'zenith';
  return null;
}

export default function DexCommandModal({ userId, isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingConfirmation, setPendingConfirmation] = useState(null);
  const [pendingClarification, setPendingClarification] = useState(null);
  const [pendingPlan, setPendingPlan] = useState(null);


  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Contextual command suggestions based on current route
  const suggestions = useMemo(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('growth')) {
      return [
        'What should I work on?',
        'Start a 45 min focus',
        'Create task: Complete assignment',
      ];
    }
    if (path.includes('health')) {
      return [
        'I drank 500ml water',
        'How is my recovery?',
        'Log workout: 45 min strength RPE 7',
      ];
    }
    if (path.includes('food')) {
      return [
        'I ate 4 eggs and a banana',
        'How many calories today?',
        'I drank 300ml water',
      ];
    }
    if (path.includes('wealth')) {
      return [
        'I spent ₹200 on lunch',
        'How much did I spend today?',
        'I earned ₹5000 from freelancing',
      ];
    }
    // Default Zenith / Command Center suggestions
    return [
      'What should I focus on today?',
      'How am I doing today?',
      'Plan my evening',
    ];
  }, [location.pathname]);

  const handleSend = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    if (!userId) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'dex',
          type: 'error',
          content: 'Authentication required. Please log in to interact with Dex.',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    // Add user message to history
    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setPendingConfirmation(null);

    try {
      const result = await processUserInput({
        userId,
        userMessage: query,
        pendingAction: pendingClarification?.action || null,
        pendingParams: pendingClarification?.params || null,
        pendingPlan: pendingPlan || null,
      });

      if (result.type === DEX_RESULT_TYPE.PLAN_PROPOSED) {
        setPendingClarification(null);
        setPendingConfirmation(null);
        setPendingPlan(result.plan);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'plan_proposed',
            content: result.displayMessage,
            plan: result.plan,
            timestamp: Date.now(),
          },
        ]);
      } else if (result.type === DEX_RESULT_TYPE.PLAN_EXECUTED) {
        setPendingClarification(null);
        setPendingConfirmation(null);
        setPendingPlan(null);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'plan_executed',
            content: result.displayMessage,
            plan: result.plan,
            status: result.status,
            executedSteps: result.executedSteps,
            timestamp: Date.now(),
          },
        ]);

        const focusStep = result.executedSteps?.find((s) => s.action === 'start_focus' && s.success);
        if (focusStep) {
          window.dispatchEvent(
            new CustomEvent('dexos:start-focus', {
              detail: {
                minutes: focusStep.data?.durationMinutes || 25,
                notes: focusStep.data?.notes || '',
                projectId: focusStep.data?.projectId || null,
              },
            })
          );
          if (!location.pathname.includes('growth')) {
            navigate('/growth');
          }
        }

        if (result.affectedDomains && result.affectedDomains.length > 0) {
          result.affectedDomains.forEach((domain) => {
            window.dispatchEvent(
              new CustomEvent('dexos:refresh', {
                detail: { domain, planExecuted: true },
              })
            );
          });
        }
      } else if (result.type === DEX_RESULT_TYPE.CONFIRMATION_REQUIRED) {
        setPendingClarification(null);
        setPendingPlan(null);
        setPendingConfirmation({
          action: result.action,
          params: result.params,
          message: result.displayMessage,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'confirmation',
            content: result.displayMessage,
            action: result.action,
            params: result.params,
            timestamp: Date.now(),
          },
        ]);
      } else if (result.type === DEX_RESULT_TYPE.SUCCESS) {
        setPendingClarification(null);
        setPendingPlan(null);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'success',
            content: result.displayMessage,
            action: result.action,
            data: result.data,
            timestamp: Date.now(),
          },
        ]);

        // Specific handling: launch interactive focus experience
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

        // Broadcast live refresh for affected domain
        const domain = getActionDomain(result.action);
        window.dispatchEvent(
          new CustomEvent('dexos:refresh', {
            detail: { action: result.action, domain },
          })
        );
      } else if (result.type === DEX_RESULT_TYPE.CLARIFICATION_NEEDED) {
        setPendingPlan(null);
        setPendingClarification({
          action: result.action || null,
          params: result.params || null,
        });
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'clarification',
            content: result.displayMessage,
            question: result.question,
            timestamp: Date.now(),
          },
        ]);
      } else if (result.type === DEX_RESULT_TYPE.CONVERSATIONAL) {
        setPendingClarification(null);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'conversational',
            content: result.displayMessage,
            timestamp: Date.now(),
          },
        ]);
      } else if (result.type === DEX_RESULT_TYPE.UNSUPPORTED) {
        setPendingClarification(null);
        setPendingPlan(null);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'unsupported',
            content: result.displayMessage,
            timestamp: Date.now(),
          },
        ]);
      } else {
        // Technical or validation error
        setPendingClarification(null);
        setPendingPlan(null);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'error',
            content: result.displayMessage || 'Dex encountered an issue. Please try again.',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'dex',
          type: 'error',
          content: err.message || 'Service temporarily unavailable.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (pending) => {
    if (!pending || loading) return;
    setLoading(true);
    setPendingConfirmation(null);

    try {
      const result = await processUserInput({
        userId,
        userMessage: 'Confirm',
        confirmed: true,
        pendingAction: pending.action,
        pendingParams: pending.params,
      });

      if (result.type === DEX_RESULT_TYPE.SUCCESS) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'success',
            content: result.displayMessage,
            action: result.action,
            data: result.data,
            timestamp: Date.now(),
          },
        ]);

        const domain = getActionDomain(result.action);
        window.dispatchEvent(
          new CustomEvent('dexos:refresh', {
            detail: { action: result.action, domain },
          })
        );
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'error',
            content: result.displayMessage || 'Action failed during execution.',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'dex',
          type: 'error',
          content: err.message || 'Confirmation execution failed.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPlan = async (planToExecute) => {
    if (!planToExecute || loading) return;
    setLoading(true);
    setPendingPlan(null);

    try {
      const result = await processUserInput({
        userId,
        userMessage: 'Start plan',
        confirmed: true,
        pendingPlan: planToExecute,
      });

      if (result.type === DEX_RESULT_TYPE.PLAN_EXECUTED) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'plan_executed',
            content: result.displayMessage,
            plan: result.plan,
            status: result.status,
            executedSteps: result.executedSteps,
            timestamp: Date.now(),
          },
        ]);

        const focusStep = result.executedSteps?.find((s) => s.action === 'start_focus' && s.success);
        if (focusStep) {
          window.dispatchEvent(
            new CustomEvent('dexos:start-focus', {
              detail: {
                minutes: focusStep.data?.durationMinutes || 25,
                notes: focusStep.data?.notes || '',
                projectId: focusStep.data?.projectId || null,
              },
            })
          );
          if (!location.pathname.includes('growth')) {
            navigate('/growth');
          }
        }

        if (result.affectedDomains && result.affectedDomains.length > 0) {
          result.affectedDomains.forEach((domain) => {
            window.dispatchEvent(
              new CustomEvent('dexos:refresh', {
                detail: { domain, planExecuted: true },
              })
            );
          });
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'dex',
            type: 'error',
            content: result.displayMessage || 'Plan execution failed.',
            timestamp: Date.now(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'dex',
          type: 'error',
          content: err.message || 'Plan execution failed.',
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissPlan = () => {
    setPendingPlan(null);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'dex',
        type: 'neutral',
        content: 'Plan dismissed. No actions were executed.',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleCancel = () => {
    setPendingConfirmation(null);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: 'dex',
        type: 'neutral',
        content: 'Action cancelled.',
        timestamp: Date.now(),
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearSession = () => {
    setMessages([]);
    setPendingConfirmation(null);
    setPendingClarification(null);
    setPendingPlan(null);
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dex Operator Command Panel"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '580px',
          background: '#15181B',
          border: '1px solid #262B31',
          borderRadius: '16px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '85vh',
          height: '620px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #262B31',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#111316',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'rgba(31, 163, 111, 0.15)',
                border: '1px solid rgba(31, 163, 111, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1FA36F',
              }}
            >
              <Sparkles size={16} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: '#F5F5F5',
                    fontFamily: 'monospace',
                  }}
                >
                  DEX OPERATOR
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#1FA36F',
                    background: 'rgba(31, 163, 111, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    border: '1px solid rgba(31, 163, 111, 0.25)',
                  }}
                >
                  LIVE
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={handleClearSession}
                title="Clear current session history"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F5F5F5')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
              >
                <RotateCcw size={15} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Dex"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9CA3AF',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#F5F5F5')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {messages.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
                padding: '24px 12px',
                gap: '14px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#9CA3AF',
                  letterSpacing: '0.04em',
                }}
              >
                OPERATING SYSTEM READY
              </div>
              <p
                style={{
                  fontSize: '14px',
                  color: '#D1D5DB',
                  maxWidth: '380px',
                  lineHeight: '1.5',
                  margin: 0,
                }}
              >
                Tell Dex what you did or ask for guidance. Your command directly operates habits, tasks, recovery, food, and finances.
              </p>

              {/* Suggestions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  width: '100%',
                  maxWidth: '360px',
                  marginTop: '8px',
                }}
              >
                <span
                  style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    textAlign: 'left',
                    fontWeight: 600,
                  }}
                >
                  Suggested for this screen:
                </span>
                {suggestions.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => handleSend(sug)}
                    style={{
                      background: '#1A1E23',
                      border: '1px solid #2B313A',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      color: '#E5E7EB',
                      fontSize: '13px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#1FA36F';
                      e.currentTarget.style.background = '#22272E';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#2B313A';
                      e.currentTarget.style.background = '#1A1E23';
                    }}
                  >
                    → {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    background: isUser ? '#1E232A' : '#171B20',
                    border: `1px solid ${
                      isUser
                        ? '#303844'
                        : msg.type === 'plan_proposed'
                        ? 'rgba(31, 163, 111, 0.45)'
                        : msg.type === 'plan_executed'
                        ? (msg.status === 'partially_completed' ? 'rgba(245, 158, 11, 0.45)' : 'rgba(31, 163, 111, 0.4)')
                        : msg.type === 'confirmation'
                        ? 'rgba(245, 158, 11, 0.4)'
                        : msg.type === 'error'
                        ? 'rgba(239, 68, 68, 0.4)'
                        : msg.type === 'success'
                        ? 'rgba(31, 163, 111, 0.35)'
                        : msg.type === 'conversational'
                        ? 'rgba(31, 163, 111, 0.25)'
                        : '#2A3039'
                    }`,
                    color: '#F5F5F5',
                    fontSize: '13.5px',
                    lineHeight: '1.5',
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        color:
                          msg.type === 'plan_proposed'
                            ? '#1FA36F'
                            : msg.type === 'plan_executed'
                            ? (msg.status === 'partially_completed' ? '#F59E0B' : '#1FA36F')
                            : msg.type === 'confirmation'
                            ? '#F59E0B'
                            : msg.type === 'error'
                            ? '#EF4444'
                            : msg.type === 'success' || msg.type === 'conversational'
                            ? '#1FA36F'
                            : '#9CA3AF',
                        fontFamily: 'monospace',
                      }}
                    >
                      {msg.type === 'plan_proposed' && <Sparkles size={12} />}
                      {msg.type === 'plan_executed' && <CheckCircle2 size={12} />}
                      {msg.type === 'success' && <CheckCircle2 size={12} />}
                      {msg.type === 'conversational' && <Sparkles size={12} />}
                      {msg.type === 'confirmation' && <AlertCircle size={12} />}
                      {msg.type === 'error' && <AlertCircle size={12} />}
                      {msg.type === 'plan_proposed'
                        ? 'DEX — PROPOSED PLAN'
                        : msg.type === 'plan_executed'
                        ? 'DEX — PLAN EXECUTED'
                        : 'DEX'}
                    </div>
                  )}

                  <div>{msg.content}</div>

                  {/* Plan Proposal Card */}
                  {msg.type === 'plan_proposed' && msg.plan && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <span style={{ fontWeight: 600, color: '#F5F5F5', fontSize: '13.5px' }}>{msg.plan.goal}</span>
                        {msg.plan.availableMinutes && (
                          <span style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '4px', background: 'rgba(31, 163, 111, 0.15)', color: '#1FA36F', border: '1px solid rgba(31, 163, 111, 0.3)', fontWeight: 600 }}>
                            {msg.plan.availableMinutes}m available
                          </span>
                        )}
                      </div>

                      {/* Executable Steps */}
                      {msg.plan.steps && msg.plan.steps.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {msg.plan.steps.map((step, idx) => (
                            <div key={step.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '6px', fontSize: '12.5px' }}>
                              <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(31, 163, 111, 0.2)', color: '#1FA36F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                                {idx + 1}
                              </span>
                              <span style={{ color: '#E5E7EB', flex: 1 }}>{step.label}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Informational Guidance (non-executable recommendations) */}
                      {msg.plan.recommendations && msg.plan.recommendations.length > 0 && (
                        <div style={{ fontSize: '11.5px', color: '#9CA3AF', fontStyle: 'italic', paddingLeft: '4px' }}>
                          {msg.plan.recommendations.map((rec, rIdx) => (
                            <div key={rIdx}>💡 {rec}</div>
                          ))}
                        </div>
                      )}

                      {/* Context-driven rationale */}
                      {msg.plan.rationale && (
                        <div style={{ fontSize: '11.5px', color: '#6B7280', paddingTop: '4px' }}>
                          Reason: {msg.plan.rationale}
                        </div>
                      )}

                      {/* Action buttons if this plan is still pending */}
                      {pendingPlan && pendingPlan.id === msg.plan.id && (
                        <div style={{ marginTop: '6px', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => handleStartPlan(pendingPlan)}
                            disabled={loading}
                            style={{
                              background: '#1FA36F',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 14px',
                              fontSize: '12.5px',
                              fontWeight: 600,
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            Start Plan
                          </button>
                          <button
                            type="button"
                            onClick={handleDismissPlan}
                            disabled={loading}
                            style={{
                              background: '#232830',
                              color: '#D1D5DB',
                              border: '1px solid #333A44',
                              borderRadius: '6px',
                              padding: '6px 12px',
                              fontSize: '12.5px',
                              cursor: loading ? 'not-allowed' : 'pointer',
                              opacity: loading ? 0.6 : 1,
                            }}
                          >
                            Not Now
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Plan Executed Reflection Card */}
                  {msg.type === 'plan_executed' && msg.executedSteps && (
                    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {msg.executedSteps.map((step, idx) => (
                        <div key={step.stepId || idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: step.success ? '#1FA36F' : '#EF4444' }}>
                          {step.success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                          <span>{step.label}</span>
                          {step.error && <span style={{ color: '#EF4444', fontSize: '11px' }}>({step.error})</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Confirmation Buttons inline if pending */}
                  {msg.type === 'confirmation' && pendingConfirmation && (
                    <div
                      style={{
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleConfirm(pendingConfirmation)}
                        disabled={loading}
                        style={{
                          background: '#1FA36F',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={handleCancel}
                        disabled={loading}
                        style={{
                          background: '#232830',
                          color: '#D1D5DB',
                          border: '1px solid #333A44',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12.5px',
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                color: '#9CA3AF',
                fontSize: '12.5px',
                fontFamily: 'monospace',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#1FA36F',
                  animation: 'pulse 1s infinite',
                }}
              />
              Operating...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #262B31',
            background: '#111316',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#181C21',
              border: '1px solid #2A3039',
              borderRadius: '10px',
              padding: '4px 8px 4px 12px',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Tell Dex what you did, or ask for guidance..."
              aria-label="Dex command input"
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: '#F5F5F5',
                fontSize: '14px',
                outline: 'none',
                padding: '6px 0',
              }}
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !inputText.trim()}
              aria-label="Submit command"
              style={{
                background: inputText.trim() && !loading ? '#1FA36F' : 'transparent',
                color: inputText.trim() && !loading ? '#FFFFFF' : '#4B5563',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: inputText.trim() && !loading ? 'pointer' : 'default',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '6px',
              padding: '0 4px',
              fontSize: '11px',
              color: '#6B7280',
            }}
          >
            <span>Enter sends • Shift+Enter newline</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CornerDownLeft size={10} />
              Quick dispatch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
