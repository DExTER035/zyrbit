import React, { useState, useMemo } from 'react';
import { Plus, Check, Flame, ChevronRight, X, Edit3, Trash2, Calendar, Clock, Bell } from 'lucide-react';
import HeatmapGrid from '../../common/HeatmapGrid.jsx';
import { C } from './shared.jsx';

const ZONE_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'mind', label: 'Mind', color: '#38BDF8' },
  { id: 'body', label: 'Body', color: '#1FA36F' },
  { id: 'growth', label: 'Growth', color: '#E9B44C' },
  { id: 'soul', label: 'Soul', color: '#A78BFA' },
];

export default function HabitsTab({
  habits = [],
  activity = [],
  streaks = {},
  longestStreaks = {},
  habitImpacts = {},
  submittingHabits = {},
  onToggleHabit,
  onSkipHabit,
  onEditHabit,
  onDeleteHabit,
  onAddHabit,
  yearlyCompletionsMap = {},
}) {
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedHabitDetail, setSelectedHabitDetail] = useState(null);
  const [showGlobalHeatmap, setShowGlobalHeatmap] = useState(false);
  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Filter habits by zone
  const filteredHabits = useMemo(() => {
    if (selectedZone === 'all') return habits;
    return habits.filter(h => h.zone === selectedZone);
  }, [habits, selectedZone]);

  const completedTodayCount = useMemo(() => {
    return activity.filter(l => l.completed_date === today && l.status === 'completed').length;
  }, [activity, today]);

  const bestStreak = useMemo(() => {
    return Object.values(streaks).reduce((max, s) => Math.max(max, s || 0), 0);
  }, [streaks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* ── State sentence & Subtle Single-Line Summary ── */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--brand-border, #E5E0D8)',
        borderRadius: '18px',
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
      }}>
        <div style={{
          fontSize: '12px',
          color: '#68777B',
          fontWeight: 500,
        }}>
          "Small actions, repeated."
        </div>
        <div style={{
          fontSize: '14px',
          fontWeight: 700,
          color: '#111A20',
          letterSpacing: '-0.01em',
        }}>
          {completedTodayCount} of {habits.length} habits complete · {bestStreak}d best streak
        </div>
      </div>

      {/* ── Zone Filter Chips & New Habit Action ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {ZONE_OPTIONS.map(z => {
            const isSel = selectedZone === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(z.id)}
                style={{
                  background: isSel ? 'rgba(23, 74, 85, 0.1)' : '#FFFFFF',
                  border: `1px solid ${isSel ? 'var(--brand-petrol, #174A55)' : 'var(--brand-border, #E5E0D8)'}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  color: isSel ? 'var(--brand-petrol, #174A55)' : '#68777B',
                  fontSize: '12px',
                  fontWeight: isSel ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {z.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddHabit}
          style={{
            background: 'var(--brand-petrol, #174A55)',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '10px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            transition: 'opacity 0.2s',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          <Plus size={14} />
          <span>New Habit</span>
        </button>
      </div>

      {/* ── Habits List: Focused, Compact Rows with Primary Completion ── */}
      {filteredHabits.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          border: '1px dashed var(--brand-border, #E5E0D8)',
          borderRadius: '18px',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ fontSize: '32px' }}>🌱</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#111A20' }}>
            {selectedZone === 'all' ? 'What do you want to make automatic?' : `No habits in ${selectedZone}`}
          </div>
          <div style={{ fontSize: '12px', color: '#68777B', maxWidth: '320px', lineHeight: 1.5 }}>
            Optional examples: Read 20 mins, Train, Drink water, Sleep before 11.
          </div>
          <button
            type="button"
            onClick={onAddHabit}
            style={{
              background: 'var(--brand-petrol, #174A55)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 16px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Create Habit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredHabits.map(habit => {
            const habitLogs = activity.filter(l => l.habit_id === habit.id);
            const isDone = habitLogs.some(l => l.completed_date === today && l.status === 'completed');
            const isSkipped = habitLogs.some(l => l.completed_date === today && l.status === 'skipped');
            const habitStreak = streaks[habit.id] || 0;
            const zoneMeta = ZONE_OPTIONS.find(z => z.id === habit.zone) || { label: habit.zone || 'Habit', color: '#1FA36F' };
            const isSubmitting = !!submittingHabits[habit.id];

            return (
              <div
                key={habit.id}
                onClick={() => setSelectedHabitDetail({ habit, logs: habitLogs, streak: habitStreak })}
                style={{
                  background: isDone
                    ? 'rgba(31, 163, 111, 0.06)'
                    : isSkipped ? 'rgba(245, 158, 11, 0.06)' : '#FFFFFF',
                  border: `1px solid ${isDone ? 'rgba(31, 163, 111, 0.35)' : isSkipped ? 'rgba(245, 158, 11, 0.35)' : 'var(--brand-border, #E5E0D8)'}`,
                  borderRadius: '16px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(17, 26, 32, 0.02)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = isDone ? 'rgba(31, 163, 111, 0.5)' : 'var(--brand-petrol, #174A55)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDone ? 'rgba(31, 163, 111, 0.35)' : isSkipped ? 'rgba(245, 158, 11, 0.35)' : 'var(--brand-border, #E5E0D8)';
                }}
              >
                {/* Primary Completion Button + Label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={e => {
                      e.stopPropagation();
                      onToggleHabit(habit);
                    }}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: isDone ? '#1FA36F' : 'transparent',
                      border: `1.5px solid ${isDone ? '#1FA36F' : isSkipped ? '#F59E0B' : '#CBD5E1'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isSubmitting ? 'wait' : 'pointer',
                      color: isDone ? '#FFFFFF' : '#9CA3AF',
                      transition: 'all 0.15s ease',
                      flexShrink: 0,
                    }}
                  >
                    {isDone ? <Check size={16} strokeWidth={3} /> : (isSkipped ? <span style={{ fontSize: '12px', fontWeight: 800 }}>-</span> : null)}
                  </button>

                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: isDone ? '#8A9CA3' : '#111A20',
                      textDecoration: isDone ? 'line-through' : 'none',
                      transition: 'all 0.15s ease',
                    }}>
                      {habit.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        color: zoneMeta.color || '#1FA36F',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}>
                        {zoneMeta.label}
                      </span>
                      <span style={{ fontSize: '10px', color: '#CBD5E1' }}>·</span>
                      <span style={{ fontSize: '11px', color: '#68777B' }}>
                        {habitStreak > 0 ? `${habitStreak} day streak` : '0 days'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Secondary Streak & Drilldown Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {habitStreak > 0 && (
                    <span style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#D97706',
                      background: 'rgba(245, 158, 11, 0.12)',
                      padding: '2px 7px',
                      borderRadius: '8px',
                    }}>
                      🔥 {habitStreak}d
                    </span>
                  )}
                  <ChevronRight size={14} color="#8A9CA3" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Progressive Disclosure: 90-Day Global Habit Consistency ── */}
      <div style={{ marginTop: '8px' }}>
        <button
          type="button"
          onClick={() => setShowGlobalHeatmap(p => !p)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#68777B',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            outline: 'none',
          }}
        >
          <span>{showGlobalHeatmap ? '▲ Hide habit history' : '▼ View 90-day habit history'}</span>
        </button>

        {showGlobalHeatmap && (
          <div style={{
            marginTop: '12px',
            background: '#FFFFFF',
            border: '1px solid var(--brand-border, #E5E0D8)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
          }}>
            <HeatmapGrid
              color="#174A55"
              dataMap={yearlyCompletionsMap}
              label="Habit Consistency (90 Days)"
              days={91}
            />
          </div>
        )}
      </div>

      {/* ── Habit Detail Sheet (On Row Tap) ── */}
      {selectedHabitDetail && (
        <div
          onClick={() => setSelectedHabitDetail(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17, 26, 32, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--brand-border, #E5E0D8)',
              borderRadius: '24px 24px 0 0',
              width: '100%',
              maxWidth: '480px',
              padding: '24px 20px 36px',
              animation: 'slideUpSheet 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: '0 -8px 30px rgba(17, 26, 32, 0.12)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div>
                <div style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--brand-petrol, #174A55)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: '3px',
                }}>
                  Habit Details
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: '#111A20',
                  letterSpacing: '-0.02em',
                }}>
                  {selectedHabitDetail.habit.name}
                </div>
                <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px', textTransform: 'capitalize' }}>
                  {selectedHabitDetail.habit.zone} Zone · {selectedHabitDetail.habit.frequency || 'Daily'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedHabitDetail(null)}
                style={{
                  background: '#FAF7F2',
                  border: '1px solid var(--brand-border, #E5E0D8)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#68777B',
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* Streak & Consistency Metric Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '10px',
              marginBottom: '16px',
            }}>
              <div style={{
                background: '#FAF7F2',
                border: '1px solid var(--brand-border, #E5E0D8)',
                borderRadius: '14px',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '11px', color: '#68777B', fontWeight: 600 }}>Current Streak</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#D97706', marginTop: '2px' }}>
                  🔥 {selectedHabitDetail.streak} days
                </div>
              </div>

              <div style={{
                background: '#FAF7F2',
                border: '1px solid var(--brand-border, #E5E0D8)',
                borderRadius: '14px',
                padding: '12px 14px',
              }}>
                <div style={{ fontSize: '11px', color: '#68777B', fontWeight: 600 }}>Longest Streak</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#1FA36F', marginTop: '2px' }}>
                  ⭐ {longestStreaks[selectedHabitDetail.habit.id] || selectedHabitDetail.streak} days
                </div>
              </div>
            </div>

            {/* Impact Insight */}
            {habitImpacts[selectedHabitDetail.habit.id]?.explanation && (
              <div style={{
                background: '#FAF7F2',
                border: '1px solid var(--brand-border, #E5E0D8)',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <span style={{ fontSize: '14px' }}>⚡</span>
                <span style={{ fontSize: '12px', color: '#111A20' }}>
                  {habitImpacts[selectedHabitDetail.habit.id].explanation}
                </span>
              </div>
            )}

            {/* Habit-specific Heatmap */}
            <div style={{
              background: '#FAF7F2',
              border: '1px solid var(--brand-border, #E5E0D8)',
              borderRadius: '16px',
              padding: '14px',
              marginBottom: '18px',
            }}>
              <div style={{ fontSize: '11px', color: '#68777B', fontWeight: 700, marginBottom: '8px' }}>
                Consistency History (90 Days)
              </div>
              <HeatmapGrid
                color="#174A55"
                dataMap={(() => {
                  const m = {};
                  selectedHabitDetail.logs.forEach(l => {
                    if (l.status === 'completed' && l.completed_date) {
                      m[l.completed_date] = (m[l.completed_date] || 0) + 1;
                    }
                  });
                  return m;
                })()}
                days={91}
              />
            </div>

            {/* Actions: Edit, Skip, Delete */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHabitDetail.habit;
                    setSelectedHabitDetail(null);
                    onEditHabit(h);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: '#FFFFFF',
                    border: '1px solid var(--brand-border, #E5E0D8)',
                    color: '#111A20',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Edit3 size={14} />
                  <span>Edit Habit</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const h = selectedHabitDetail.habit;
                    setSelectedHabitDetail(null);
                    onSkipHabit(h);
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '14px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#D97706',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Skip today</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const h = selectedHabitDetail.habit;
                  setSelectedHabitDetail(null);
                  onDeleteHabit(h);
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#EF4444',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Trash2 size={13} />
                <span>Delete habit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
