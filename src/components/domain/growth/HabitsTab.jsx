import React, { useState, useMemo } from 'react';
import { Plus, Flame, Award, Calendar } from 'lucide-react';
import HabitCard from '../zenith/HabitCard.jsx';
import HeatmapGrid from '../../common/HeatmapGrid.jsx';
import { C } from './shared.jsx';

const ZONE_OPTIONS = [
  { id: 'all', label: 'All Zones', icon: '✨' },
  { id: 'mind', label: 'Mind', icon: '🧠' },
  { id: 'body', label: 'Body', icon: '⚡' },
  { id: 'growth', label: 'Growth', icon: '🌱' },
  { id: 'soul', label: 'Soul', icon: '🌌' },
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── SUMMARY STATS BANNER ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '10px',
      }}>
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Today
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#1FA36F' }}>
            {completedTodayCount} / {habits.length}
          </div>
          <div style={{ fontSize: '11px', color: C.sub }}>completed</div>
        </div>

        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Best Streak
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B' }}>
            🔥 {bestStreak}d
          </div>
          <div style={{ fontSize: '11px', color: C.sub }}>current record</div>
        </div>

        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
          padding: '14px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: C.muted, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
            Total Habits
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#5EE6F5' }}>
            {habits.length}
          </div>
          <div style={{ fontSize: '11px', color: C.sub }}>active routines</div>
        </div>
      </div>

      {/* ── ZONE FILTERS & ADD HABIT ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
          {ZONE_OPTIONS.map(z => {
            const isSel = selectedZone === z.id;
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(z.id)}
                style={{
                  background: isSel ? 'rgba(31, 163, 111, 0.15)' : C.surface,
                  border: `1px solid ${isSel ? '#1FA36F' : C.border}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  color: isSel ? '#1FA36F' : C.muted,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>{z.icon}</span>
                <span>{z.label}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onAddHabit}
          style={{
            background: '#1FA36F',
            color: '#0B0D0F',
            border: 'none',
            borderRadius: '10px',
            padding: '7px 14px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(31, 163, 111, 0.3)',
            transition: 'opacity 0.2s',
          }}
        >
          <Plus size={14} />
          <span>New Habit</span>
        </button>
      </div>

      {/* ── HABITS LIST ── */}
      {filteredHabits.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '36px 20px',
          border: `1px dashed ${C.border}`,
          borderRadius: '18px',
          background: C.surface,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{ fontSize: '32px' }}>🌱</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: C.text }}>
            {selectedZone === 'all' ? 'No habits created yet' : `No habits in ${selectedZone} zone`}
          </div>
          <div style={{ fontSize: '12px', color: C.muted, maxWidth: '280px' }}>
            Habits compound over time. Add daily routines that move you forward.
          </div>
          <button
            type="button"
            onClick={onAddHabit}
            style={{
              background: '#1FA36F',
              color: '#0B0D0F',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              marginTop: '6px',
            }}
          >
            + Create First Habit
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredHabits.map(habit => {
            const habitLogs = activity.filter(l => l.habit_id === habit.id);
            const isDone = habitLogs.some(l => l.completed_date === today && l.status === 'completed');
            const isSkipped = habitLogs.some(l => l.completed_date === today && l.status === 'skipped');
            const habitStreak = streaks[habit.id] || 0;
            const longestStreak = longestStreaks[habit.id] || habitStreak;
            const impact = habitImpacts[habit.id] || null;

            return (
              <HabitCard
                key={habit.id}
                habit={habit}
                logs={habitLogs}
                streak={habitStreak}
                longestStreak={longestStreak}
                isCompleted={isDone}
                isSkipped={isSkipped}
                isSubmitting={!!submittingHabits[habit.id]}
                impactInsight={impact?.insight || null}
                onToggle={onToggleHabit}
                onSkip={onSkipHabit}
                onEdit={onEditHabit}
                onDelete={onDeleteHabit}
              />
            );
          })}
        </div>
      )}

      {/* ── 90-DAY HABIT CONSISTENCY HEATMAP ── */}
      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '20px',
        padding: '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: '#1FA36F', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            Habit Consistency Grid (90 Days)
          </div>
          <span style={{ fontSize: '11px', color: C.muted }}>Daily completions</span>
        </div>
        <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
          <HeatmapGrid
            color="#1FA36F"
            dataMap={yearlyCompletionsMap}
            days={91}
          />
        </div>
      </div>
    </div>
  );
}
