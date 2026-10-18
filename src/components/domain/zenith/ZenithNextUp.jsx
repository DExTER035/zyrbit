/**
 * ZenithNextUp — The Next Up 3 Focus Items for Zenith
 * Metaphor: NEXT ("What is immediately ahead in the arc?")
 */
import React from 'react';
import { Play, Dumbbell, Utensils, CheckCircle2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ZenithNextUp({ onViewAll }) {
  const navigate = useNavigate();

  // Combine top uncompleted tasks and habits scheduled for today
  const nextItems = [
    {
      id: 'focus-1',
      title: 'Deep Work (DSA)',
      time: '2:30 – 4:00 PM',
      type: 'focus',
      icon: Play,
      iconBg: 'rgba(233, 180, 76, 0.15)',
      iconColor: '#E9B44C',
      action: () => navigate('/growth'),
    },
    {
      id: 'activity-1',
      title: 'Gym',
      time: '5:30 PM',
      type: 'activity',
      icon: Dumbbell,
      iconBg: 'rgba(16, 185, 129, 0.15)',
      iconColor: '#10B981',
      action: () => navigate('/health'),
    },
    {
      id: 'meal-1',
      title: 'Dinner + Read',
      time: '7:00 PM',
      type: 'routine',
      icon: Utensils,
      iconBg: 'rgba(139, 92, 246, 0.15)',
      iconColor: '#8B5CF6',
      action: () => navigate('/health'),
    },
  ];

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Section Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <span style={{
          fontSize: '15px',
          fontWeight: 700,
          color: 'var(--text-primary, #172033)',
          letterSpacing: '-0.01em',
        }}>
          Next up
        </span>
        <button
          onClick={onViewAll}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#08B878',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '2px 0',
          }}
        >
          View all
        </button>
      </div>

      {/* Items Stack */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {nextItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={item.action}
              style={{
                background: 'var(--bg-card, #FFFFFF)',
                border: '1px solid var(--border-primary, #E4EAF2)',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(15, 23, 42, 0.04))',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.background = '#F8FAFC';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-primary, #E4EAF2)';
                e.currentTarget.style.background = 'var(--bg-card, #FFFFFF)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: item.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={16} color={item.iconColor} />
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--text-primary, #172033)',
                    letterSpacing: '-0.01em',
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary, #68758A)',
                    marginTop: '2px',
                  }}>
                    {item.time}
                  </div>
                </div>
              </div>

              {item.type === 'focus' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/growth');
                  }}
                  aria-label="Start Focus Session"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(233, 180, 76, 0.2)',
                    border: '1px solid rgba(233, 180, 76, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#E9B44C',
                  }}
                >
                  <Play size={13} fill="#E9B44C" />
                </button>
              ) : (
                <ChevronRight size={16} color="#6B7280" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
