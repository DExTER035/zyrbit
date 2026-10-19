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
      title: 'Log Meal / Nutrition',
      subtitle: 'Breakfast, lunch, dinner, or quick macros',
      icon: Utensils,
      color: '#174A55',
      bgColor: '#DDE9EB',
      route: '/food',
    },
    {
      id: 'wealth',
      title: 'Record Expense or Income',
      subtitle: 'Log financial transaction, bill, or cashflow',
      icon: CreditCard,
      color: '#174A55',
      bgColor: '#DDE9EB',
      route: '/wealth',
    },
    {
      id: 'focus',
      title: 'Start Focus Sprint',
      subtitle: 'Deep work timer & milestone countdown',
      icon: Timer,
      color: '#174A55',
      bgColor: '#DDE9EB',
      route: '/growth',
      event: 'dexos:open-focus',
    },
    {
      id: 'habit',
      title: 'Check-in Keystone Habit',
      subtitle: "Update today's habit momentum & streak",
      icon: CheckCircle2,
      color: '#174A55',
      bgColor: '#DDE9EB',
      route: '/zenith',
    },
    {
      id: 'health',
      title: 'Log Hydration & Health',
      subtitle: 'Water intake, workout, or sleep entry',
      icon: Activity,
      color: '#174A55',
      bgColor: '#DDE9EB',
      route: '/health',
    },
    {
      id: 'dex',
      title: 'Ask Dex Companion',
      subtitle: 'Natural language assistance across your day',
      icon: Sparkles,
      color: '#174A55',
      bgColor: '#DDE9EB',
      badge: 'AI',
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
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(17, 26, 32, 0.45)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        className="zyrbit-modal-sheet"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px 24px 0 0',
          borderTop: '1px solid var(--brand-border, #E5E0D8)',
          boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.12)',
          padding: '16px 20px calc(80px + env(safe-area-inset-bottom, 16px))',
          boxSizing: 'border-box',
          animation: 'slideUpSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '36px',
            height: '4px',
            borderRadius: '999px',
            backgroundColor: '#D1CABE',
            margin: '0 auto 16px',
          }}
        />

        {/* Sheet Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '0 2px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--brand-charcoal, #111A20)',
                letterSpacing: '-0.02em',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              Quick Action
            </h2>
            <p
              style={{
                margin: '3px 0 0',
                fontSize: '13px',
                color: 'var(--brand-text-sub, #6B7B82)',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              1-tap capture across your personal operating system
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close action sheet"
            style={{
              background: '#F4F0E8',
              border: '1px solid #E5E0D8',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--brand-charcoal, #111A20)',
              transition: 'all 0.15s ease',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick Action List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  padding: '13px 14px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid var(--brand-border, #E5E0D8)',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-petrol, #174A55)';
                  e.currentTarget.style.backgroundColor = '#FAF8F5';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--brand-border, #E5E0D8)';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                {/* Icon in colored rounded container */}
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: act.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: act.color,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                {/* Text Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 600,
                        color: 'var(--brand-charcoal, #111A20)',
                        letterSpacing: '-0.01em',
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      {act.title}
                    </span>
                    {act.badge && (
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          color: '#174A55',
                          backgroundColor: '#DDE9EB',
                          padding: '1px 6px',
                          borderRadius: '6px',
                        }}
                      >
                        {act.badge}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--brand-text-sub, #6B7B82)',
                      marginTop: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    {act.subtitle}
                  </div>
                </div>

                <ChevronRight size={17} color="#9CA3AF" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
