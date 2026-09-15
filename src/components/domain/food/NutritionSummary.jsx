import React from 'react';
import { FC, FProgressBar } from './shared.jsx';
import { DEFAULT_MACRO_GOALS } from '../../../data/foods/index.js';

export default function NutritionSummary({ totals, macroGoals = DEFAULT_MACRO_GOALS, onRepeatYesterday }) {
  const { protein = 0, carbs = 0, fat = 0, fiber = 0 } = totals;

  const rows = [
    { label: 'Protein', value: protein, goal: macroGoals.protein, color: FC.protein },
    { label: 'Carbs',   value: carbs,   goal: macroGoals.carbs,   color: FC.carbs   },
    { label: 'Fat',     value: fat,     goal: macroGoals.fat,     color: FC.fat     },
    { label: 'Fiber',   value: fiber,   goal: macroGoals.fiber,   color: FC.fiber   },
  ];

  return (
    <div style={{
      background: FC.surface,
      border: `1px solid ${FC.border}`,
      borderRadius: '20px',
      padding: '18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 800, color: FC.text, letterSpacing: '0.5px' }}>
          NUTRITION SUMMARY
        </div>
        {onRepeatYesterday && (
          <button
            onClick={onRepeatYesterday}
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: FC.food,
              background: `${FC.food}10`,
              border: `1px solid ${FC.food}28`,
              borderRadius: '8px',
              padding: '4px 10px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Repeat Yesterday
          </button>
        )}
      </div>

      {/* Macro rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {rows.map(row => {
          const pct = Math.min(Math.round((row.value / row.goal) * 100), 100);
          return (
            <div key={row.label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: FC.text }}>{row.label}</span>
                <span style={{ fontSize: '12px', color: row.color, fontWeight: 700 }}>
                  {Math.round(row.value)}g / {row.goal}g
                  <span style={{ color: FC.muted, fontWeight: 500 }}> ({pct}%)</span>
                </span>
              </div>
              <FProgressBar value={row.value} max={row.goal} color={row.color} height={6} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
