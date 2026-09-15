import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { FC } from './shared.jsx';

const formatLogTime = (createdAt) => {
  if (!createdAt) return '';
  try {
    const date = new Date(createdAt);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return '';
  }
};

export default function MealLogCard({ log, onDelete, onEdit }) {
  const timeStr = formatLogTime(log.created_at);

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
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: FC.muted }}>
            {log.quantity_g}g{timeStr ? ` · ${timeStr}` : ''}
          </span>
          {log.protein > 0 && (
            <span style={{ fontSize: '10px', color: FC.protein, fontWeight: 600 }}>P {Math.round(log.protein)}g</span>
          )}
          {log.carbs > 0 && (
            <span style={{ fontSize: '10px', color: FC.carbs, fontWeight: 600 }}>C {Math.round(log.carbs)}g</span>
          )}
          {log.fat > 0 && (
            <span style={{ fontSize: '10px', color: FC.fat, fontWeight: 600 }}>F {Math.round(log.fat)}g</span>
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

      {/* Actions */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        {onEdit && (
          <button
            onClick={() => onEdit(log)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: FC.sub,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = FC.food}
            onMouseLeave={e => e.currentTarget.style.color = FC.sub}
            aria-label="Edit meal log"
            title="Edit quantity"
          >
            <Edit2 size={13} />
          </button>
        )}
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
          }}
          onMouseEnter={e => e.currentTarget.style.color = FC.over}
          onMouseLeave={e => e.currentTarget.style.color = FC.muted}
          aria-label="Delete meal log"
          title="Delete meal"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
