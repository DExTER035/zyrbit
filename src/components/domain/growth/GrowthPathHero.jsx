/**
 * GrowthPathHero — The Visual Execution Path
 * Metaphor: PATH ("Where am I going, and what is moving?")
 * Renders the Curving Milestone Roadbed, Goal Card, and Today's 3 Milestones.
 */
import React from 'react';
import { Target, Check, Play, AlertCircle, ChevronRight } from 'lucide-react';

export default function GrowthPathHero({
  goals = [],
  tasks = [],
  onCompleteTask,
}) {
  // Active goal (or fallback default)
  const activeGoal = goals[0] || {
    name: 'Crack DSA Exam',
    target_date: '2026-10-15',
    progress: 22,
  };

  // Top 3 Milestones for Today
  const uncompleted = tasks.filter(t => t.status !== 'done');

  const milestones = [
    {
      id: uncompleted[0]?.id || 'm-1',
      title: uncompleted[0]?.name || 'Trees revision',
      time: '45 min',
      isDone: false,
      priority: 1,
    },
    {
      id: uncompleted[1]?.id || 'm-2',
      title: uncompleted[1]?.name || 'Read 20 pages',
      time: '30 min',
      isDone: false,
      priority: 2,
    },
    {
      id: uncompleted[2]?.id || 'm-3',
      title: uncompleted[2]?.name || '200 pushups + squats',
      time: '20 min',
      isDone: false,
      priority: 3,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── GOAL HERO CARD ── */}
      <div style={{
        background: '#15161B',
        border: '1px solid #26272D',
        borderRadius: '20px',
        padding: '18px 20px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(233, 180, 76, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E9B44C',
            }}>
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#ECE8DF', letterSpacing: '-0.01em' }}>
                {activeGoal.name}
              </div>
              <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🎯 {activeGoal.progress || 22}%</span>
                <span>•</span>
                <span>Target Oct 15</span>
              </div>
            </div>
          </div>

          {/* Progress Ring / Target Badge */}
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: '#9A978F',
            textAlign: 'right',
          }}>
            <div>Target</div>
            <div style={{ color: '#ECE8DF', fontWeight: 700 }}>Oct 15</div>
          </div>
        </div>

        {/* ── THE CURVING PATH VISUALIZATION (SVG) ── */}
        <div style={{ marginTop: '20px', position: 'relative', paddingLeft: '8px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            {/* SVG Path Ribbon on the Left */}
            <div style={{ width: '28px', position: 'relative', flexShrink: 0 }}>
              <svg viewBox="0 0 28 200" style={{ width: '100%', height: '200px', overflow: 'visible' }}>
                {/* Continuous S-Curve Path Line */}
                <path
                  d="M 14 10 C 26 50, 2 80, 14 110 C 26 140, 2 170, 14 190"
                  fill="none"
                  stroke="#E9B44C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                {/* Waypoint 1: Moving */}
                <circle cx="14" cy="18" r="6" fill="#15161B" stroke="#E9B44C" strokeWidth="2.5" />
                <circle cx="14" cy="18" r="3" fill="#10B981" />

                {/* Waypoint 2: Stuck Blocker */}
                <circle cx="14" cy="110" r="6" fill="#15161B" stroke="#EF4444" strokeWidth="2.5" />

                {/* Waypoint 3: Upcoming */}
                <circle cx="14" cy="185" r="5" fill="#15161B" stroke="#6B7280" strokeWidth="2" />
              </svg>
            </div>

            {/* Waypoint Content Blocks */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '200px', flex: 1, padding: '4px 0' }}>
              {/* Node 1 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ECE8DF' }}>
                    Arrays & Trees
                  </div>
                  <div style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#10B981',
                    background: 'rgba(16, 185, 129, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px',
                  }}>
                    Moving
                  </div>
                </div>
                <ChevronRight size={16} color="#6B7280" />
              </div>

              {/* Node 2: Blocker */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ECE8DF' }}>
                    Graphs
                  </div>
                  <div style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#EF4444',
                    background: 'rgba(239, 68, 68, 0.12)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px',
                  }}>
                    Stuck 6 days
                  </div>
                </div>
                <ChevronRight size={16} color="#6B7280" />
              </div>

              {/* Node 3 */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ECE8DF' }}>
                    Mock Tests
                  </div>
                  <div style={{
                    display: 'inline-block',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: '#9A978F',
                    background: 'rgba(255, 255, 255, 0.06)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    marginTop: '2px',
                  }}>
                    Upcoming
                  </div>
                </div>
                <ChevronRight size={16} color="#6B7280" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── TODAY'S 3 MILESTONES ── */}
      <div>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#ECE8DF',
          letterSpacing: '-0.01em',
          marginBottom: '12px',
        }}>
          Today's 3 milestones
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {milestones.map((item) => (
            <div
              key={item.id}
              onClick={() => onCompleteTask && onCompleteTask(item.id)}
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
                {/* Priority Bead */}
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  border: item.priority === 1 ? '1.5px solid #10B981' : '1.5px solid #E9B44C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: item.priority === 1 ? '#10B981' : '#E9B44C',
                  background: item.priority === 1 ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                }}>
                  {item.priority === 1 ? <Check size={14} /> : item.priority}
                </div>

                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: item.priority === 1 ? '#ECE8DF' : '#ECE8DF',
                    letterSpacing: '-0.01em',
                  }}>
                    {item.title}
                  </div>
                  {item.time && (
                    <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px' }}>
                      {item.time}
                    </div>
                  )}
                </div>
              </div>

              <ChevronRight size={16} color="#6B7280" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
