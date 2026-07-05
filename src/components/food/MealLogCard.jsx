import React from 'react';
import { Trash2 } from 'lucide-react';
import { FC } from './shared.jsx';

export default function MealLogCard({ log, onDelete }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 14px',
        background: FC.elev,
        borderRadius: '12px',
        transition: 'background 0.15s',
      }}
    >
      {/* Food info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: FC.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {log.food_name}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', color: FC.muted }}>{log.quantity_g}g</span>
          {log.protein > 0 && (
            <span style={{ fontSize: '10px', color: FC.protein }}>P {Math.round(log.protein)}g</span>
          )}
          {log.carbs > 0 && (
            <span style={{ fontSize: '10px', color: FC.carbs }}>C {Math.round(log.carbs)}g</span>
          )}
          {log.fat > 0 && (
            <span style={{ fontSize: '10px', color: FC.fat }}>F {Math.round(log.fat)}g</span>
          )}
        </div>
      </div>

      {/* Calories */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 800, color: FC.food }}>
          {Math.round(log.calories)}
        </div>
        <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600 }}>kcal</div>
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(log.id)}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: FC.muted,
          display: 'flex',
          alignItems: 'center',
          borderRadius: '6px',
          transition: 'color 0.15s',
          flexShrink: 0,
        }}
        onMouseEnter={e => e.currentTarget.style.color = FC.over}
        onMouseLeave={e => e.currentTarget.style.color = FC.muted}
        aria-label="Delete meal log"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
