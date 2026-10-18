import React, { useEffect } from 'react';
import {
  X,
  Utensils,
  CreditCard,
  Timer,
  CheckCircle2,
  Activity,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

export default function QuickAddSheet({ isOpen, onClose, onSelectAction }) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const actions = [
    {
      id: 'food',
      title: 'Log Meal / Food',
      subtitle: 'Track breakfast, lunch, dinner, or snack',
      icon: Utensils,
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      route: '/food',
    },
    {
      id: 'wealth',
      title: 'Record Expense or Income',
      subtitle: 'Log financial transaction, bill, or inflow',
      icon: CreditCard,
      color: '#E9B44C',
      bgColor: 'rgba(233, 180, 76, 0.12)',
      route: '/wealth',
    },
    {
      id: 'focus',
      title: 'Start Focus Session',
      subtitle: 'Deep work timer & milestone countdown',
      icon: Timer,
      color: '#38BDF8',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      route: '/growth',
      event: 'dexos:open-focus',
    },
    {
      id: 'habit',
      title: 'Check-in Keystone Habit',
      subtitle: "Update today's habit momentum & streak",
      icon: CheckCircle2,
      color: '#A855F7',
      bgColor: 'rgba(168, 85, 247, 0.12)',
      route: '/zenith',
    },
    {
      id: 'health',
      title: 'Log Hydration & Health',
      subtitle: 'Water intake, workout, or sleep entry',
      icon: Activity,
      color: '#F43F5E',
      bgColor: 'rgba(244, 63, 94, 0.12)',
      route: '/health',
    },
    {
      id: 'dex',
      title: 'Use Dex AI Assistant',
      subtitle: 'Natural language capture across any domain',
      icon: Sparkles,
      color: '#1FA36F',
      bgColor: 'rgba(31, 163, 111, 0.18)',
      badge: 'Beta',
      event: 'dexos:open-dex',
    },
  ];

  const handleActionClick = (action) => {
    onClose();
    if (action.event) {
      window.dispatchEvent(new CustomEvent(action.event));
    }
    if (onSelectAction) {
      onSelectAction(action);
    }
  };

  return (
    <div
      className="zyrbit-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="zyrbit-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '20px 20px calc(80px + env(safe-area-inset-bottom, 16px))',
        }}
      >
        {/* Drag handle */}
        <div
          className="md:hidden"
          style={{
            width: '40px',
            height: '4px',
            borderRadius: '2px',
            background: '#22372D',
            margin: '0 auto 16px',
          }}
        />

        {/* Sheet Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '0 4px',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 800,
              color: '#F1F5F3',
              letterSpacing: '-0.02em',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}>
              What would you like to add?
            </h2>
            <p style={{
              margin: '3px 0 0',
              fontSize: '13px',
              color: '#7E948A',
            }}>
              Quick 1-tap capture across your personal operating system
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close action sheet"
            style={{
              background: '#15221C',
              border: '1px solid #1A2B23',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#7E948A',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F1F5F3'; e.currentTarget.style.borderColor = '#2DE09A'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#7E948A'; e.currentTarget.style.borderColor = '#1A2B23'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Action List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                type="button"
                onClick={() => handleActionClick(act)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  background: '#15221C',
                  border: '1px solid #1A2B23',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2DE09A';
                  e.currentTarget.style.background = '#1A2B23';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#1A2B23';
                  e.currentTarget.style.background = '#15221C';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Icon in colored rounded container */}
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: act.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: act.color,
                  flexShrink: 0,
                  transition: 'transform 0.15s ease',
                }}>
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                {/* Text Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: '#F1F5F3',
                      letterSpacing: '-0.01em',
                    }}>
                      {act.title}
                    </span>
                    {act.badge && (
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: act.color,
                        background: act.bgColor,
                        border: `1px solid ${act.color}40`,
                        borderRadius: '4px',
                        padding: '1px 5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {act.badge}
                      </span>
                    )}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#7E948A',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {act.subtitle}
                  </div>
                </div>

                {/* Right Arrow */}
                <div style={{
                  color: '#7E948A',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <ChevronRight size={18} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes slideUpQuickAdd {
          from {
            transform: translateY(100%);
            opacity: 0.5;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
