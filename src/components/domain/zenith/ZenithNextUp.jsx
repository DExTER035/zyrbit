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
          color: '#ECE8DF',
          letterSpacing: '-0.01em',
        }}>
          Next up
        </span>
        <button
          onClick={onViewAll}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#38BDF8',
            fontSize: '12px',
            fontWeight: 600,
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
                background: '#15161B',
                border: '1px solid #26272D',
                borderRadius: '16px',
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#3A3B40';
                e.currentTarget.style.background = '#181920';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#26272D';
                e.currentTarget.style.background = '#15161B';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: item.iconBg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Icon size={15} color={item.iconColor} />
                </div>
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#ECE8DF',
                    letterSpacing: '-0.01em',
                  }}>
                    {item.title}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#9A978F',
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
