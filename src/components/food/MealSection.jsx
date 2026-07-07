import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { FC } from './shared.jsx';
import MealLogCard from './MealLogCard.jsx';
import { SaveMealButton } from './SavedMealsSection.jsx';

const MEAL_META = {
  breakfast: { label: 'Breakfast', emoji: '☀️', time: '7–10 AM' },
  lunch:     { label: 'Lunch',     emoji: '🌤️',  time: '12–2 PM' },
  dinner:    { label: 'Dinner',    emoji: '🌙',  time: '7–9 PM'  },
  snack:     { label: 'Snacks',    emoji: '🍎',  time: 'Anytime'  },
};

export default function MealSection({ mealType, logs = [], userId, onAddFood, onDeleteLog, onMealSaved }) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = MEAL_META[mealType] ?? { label: mealType, emoji: '🍽️', time: '' };
  const totalCal = logs.reduce((sum, l) => sum + (l.calories || 0), 0);
  const isEmpty = logs.length === 0;

  return (
    <div style={{
      background: FC.surface,
      border: `1px solid ${FC.border}`,
      borderRadius: '20px',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* ── Header ── */}
      <button
        onClick={() => setCollapsed(c => !c)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '20px' }}>{meta.emoji}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>{meta.label}</div>
          <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>
            {isEmpty ? meta.time : `${logs.length} item${logs.length > 1 ? 's' : ''}`}
          </div>
        </div>
        {totalCal > 0 && (
          <span style={{ fontSize: '13px', fontWeight: 800, color: FC.food, marginRight: '4px' }}>
            {Math.round(totalCal)} kcal
          </span>
        )}
        {collapsed
          ? <ChevronDown size={16} color={FC.muted} />
          : <ChevronUp   size={16} color={FC.muted} />
        }
      </button>

      {/* ── Content ── */}
      {!collapsed && (
        <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Log items */}
          {logs.map(log => (
            <MealLogCard key={log.id} log={log} onDelete={onDeleteLog} />
          ))}

          {/* Empty state */}
          {isEmpty && (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: '12px',
              color: FC.muted,
              background: FC.elev,
              borderRadius: '12px',
            }}>
              Nothing logged yet
            </div>
          )}

          {/* Add food button */}
          <button
            onClick={() => onAddFood(mealType)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px',
              borderRadius: '12px',
              background: `${FC.food}0D`,
              border: `1px dashed ${FC.food}40`,
              color: FC.food,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginTop: '2px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${FC.food}18`; e.currentTarget.style.borderColor = `${FC.food}70`; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${FC.food}0D`; e.currentTarget.style.borderColor = `${FC.food}40`; }}
          >
            <Plus size={14} />
            Add Food
          </button>

          {/* Save meal button — only shows when meal has items */}
          {!isEmpty && onMealSaved && (
            <SaveMealButton
              logs={logs}
              mealType={mealType}
              userId={userId}
              onSaved={onMealSaved}
            />
          )}
        </div>
      )}
    </div>
  );
}
