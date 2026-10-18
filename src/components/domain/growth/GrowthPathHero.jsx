import React from 'react';
import { ArrowRight, ChevronRight, Check } from 'lucide-react';

export default function GrowthPathHero({
  goals = [],
  tasks = [],
  streak = { current_streak: 0 },
  onCompleteTask,
  onStartFocus,
}) {
  // Active goal (or fallback default)
  const activeGoal = goals[0] || {
    name: 'Crack DSA',
    target_date: '2026-10-15',
    progress: 22,
  };

  // Top uncompleted tasks + completed tracking
  const uncompleted = tasks.filter(t => t.status !== 'done');

  const moves = [
    {
      id: uncompleted[0]?.id || 'm-1',
      num: '01',
      title: uncompleted[0]?.name || 'Trees revision',
      time: '35 min',
      color: '#2DE09A',
      realTask: uncompleted[0] || null,
    },
    {
      id: uncompleted[1]?.id || 'm-2',
      num: '02',
      title: uncompleted[1]?.name || 'Solve 3 graph problems',
      time: '45 min',
      color: '#F97316',
      realTask: uncompleted[1] || null,
    },
    {
      id: uncompleted[2]?.id || 'm-3',
      num: '03',
      title: uncompleted[2]?.name || 'Read 20 pages',
      time: '20 min',
      color: '#A855F7',
      realTask: uncompleted[2] || null,
    },
  ];

  return (
    <div className="growth-content-grid">
      {/* ── LEFT / TOP: CURRENT QUEST HERO & READY FOR DEEP WORK ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Current Quest Card */}
        <div style={{
          background: '#111A15',
          border: '1px solid #1A2B23',
          borderRadius: '24px',
          padding: '24px 22px',
          position: 'relative',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.45)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: '#2DE09A',
                }}>
                  CURRENT QUEST
                </span>
                {streak?.current_streak > 0 && (
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'rgba(249, 115, 22, 0.15)',
                    color: '#F97316',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}>
                    🔥 {streak.current_streak}d streak
                  </span>
                )}
              </div>
              <h2 style={{
                margin: '0 0 4px',
                fontSize: '24px',
                fontWeight: 900,
                color: '#F1F5F3',
                letterSpacing: '-0.02em',
                fontFamily: "'Space Grotesk', -apple-system, sans-serif",
              }}>
                {activeGoal.name}
              </h2>
              <div style={{ fontSize: '13px', color: '#7E948A' }}>
                Arrays & Trees · {activeGoal.progress || 22}% complete
              </div>
            </div>

            {/* Top-Right Mint Action Button (Launches Focus for Quest) */}
            <button
              type="button"
              onClick={() => {
                if (onStartFocus) {
                  onStartFocus('timed', 25, activeGoal.name);
                } else {
                  window.dispatchEvent(new CustomEvent('dexos:start-focus', { detail: { duration: 25, mode: 'timed' } }));
                }
              }}
              aria-label="Start Quest Sprint"
              title="Launch 25-minute sprint for this quest"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: '#2DE09A',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#060B08',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(45, 224, 154, 0.4)',
                transition: 'transform 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <ArrowRight size={20} strokeWidth={2.6} style={{ transform: 'rotate(-45deg)' }} />
            </button>
          </div>

          {/* Quest Progress Bar */}
          <div style={{
            width: '100%',
            height: '6px',
            borderRadius: '9999px',
            background: '#1A2B23',
            overflow: 'hidden',
            marginTop: '16px',
          }}>
            <div style={{
              width: `${Math.max(10, activeGoal.progress || 22)}%`,
              height: '100%',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #10B981 0%, #2DE09A 100%)',
              boxShadow: '0 0 10px rgba(45, 224, 154, 0.4)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Ready for Deep Work Launcher */}
        <div style={{
          background: '#111A15',
          border: '1px solid #1A2B23',
          borderRadius: '22px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#2DE09A',
              marginBottom: '4px',
            }}>
              READY FOR DEEP WORK?
            </div>
            <div style={{ fontSize: '14px', color: '#F1F5F3', fontWeight: 600 }}>
              One clean 25-minute sprint
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (onStartFocus) {
                onStartFocus('timed', 25, activeGoal.name || 'Deep Work Sprint');
              } else {
                window.dispatchEvent(new CustomEvent('dexos:start-focus', { detail: { duration: 25, mode: 'timed' } }));
              }
            }}
            style={{
              width: '100%',
              background: '#2DE09A',
              border: 'none',
              borderRadius: '14px',
              padding: '14px',
              color: '#060B08',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(45, 224, 154, 0.35)',
              letterSpacing: '0.04em',
              transition: 'opacity 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <span>START FOCUS</span>
            <ArrowRight size={16} strokeWidth={2.8} />
          </button>
        </div>
      </div>

      {/* ── RIGHT / SECOND COLUMN: TODAY'S MOVES ── */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: '#7E948A',
          }}>
            TODAY'S MOVES
          </div>
          <span style={{
            color: '#2DE09A',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>
            {uncompleted.length} REMAINING
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {moves.map((item) => {
            const fullTask = tasks.find(t => t.id === item.id) || item.realTask;
            const isDone = fullTask?.status === 'done';

            return (
              <div
                key={item.id}
                style={{
                  background: '#111A15',
                  border: `1px solid ${isDone ? '#2DE09A33' : '#1A2B23'}`,
                  borderRadius: '18px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.15s ease',
                  opacity: isDone ? 0.65 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  {/* Numbered circular badge */}
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: `${item.color}18`,
                    border: `1.5px solid ${item.color}60`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: item.color,
                    flexShrink: 0,
                  }}>
                    {item.num}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isDone ? '#7E948A' : '#F1F5F3',
                      letterSpacing: '-0.01em',
                      textDecoration: isDone ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#7E948A', marginTop: '2px' }}>
                      {item.time}
                    </div>
                  </div>
                </div>

                {/* Interactive Checkbox Action */}
                <button
                  type="button"
                  onClick={() => {
                    if (fullTask && onCompleteTask) {
                      onCompleteTask(fullTask);
                    }
                  }}
                  aria-label={`Complete ${item.title}`}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isDone ? '#2DE09A' : 'rgba(26, 43, 35, 0.6)',
                    border: `1.5px solid ${isDone ? '#2DE09A' : '#2DE09A55'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: isDone ? '#060B08' : '#2DE09A',
                    transition: 'all 0.15s ease',
                    marginLeft: '12px',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (!isDone) {
                      e.currentTarget.style.background = 'rgba(45, 224, 154, 0.2)';
                      e.currentTarget.style.borderColor = '#2DE09A';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDone) {
                      e.currentTarget.style.background = 'rgba(26, 43, 35, 0.6)';
                      e.currentTarget.style.borderColor = '#2DE09A55';
                    }
                  }}
                >
                  <Check size={16} strokeWidth={isDone ? 3 : 2.2} />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
