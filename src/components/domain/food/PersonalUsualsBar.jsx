import React from 'react';
import { Sparkles, Star } from 'lucide-react';
import { FC } from './shared.jsx';

export default function PersonalUsualsBar({ usuals = [], onSelectUsual }) {
  if (!usuals || usuals.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        background: FC.surface,
        border: `1px solid ${FC.border}`,
        borderRadius: '20px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={14} color={FC.food} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: FC.text, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            My Usuals & Favorites
          </span>
        </div>
        <span style={{ fontSize: '10px', color: FC.muted }}>1-Tap Log</span>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {usuals.map((food, idx) => {
          const cal = Math.round(food.calories || 0);
          const serving = food.serving_size_g || 100;
          const isFav = food.is_favorite !== false;
          return (
            <button
              key={food.id || `${food.food_name}_${idx}`}
              type="button"
              onClick={() => onSelectUsual(food)}
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '9px 12px',
                borderRadius: '14px',
                background: FC.elev,
                border: `1px solid ${FC.border2}`,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                minWidth: '120px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = FC.food;
                e.currentTarget.style.background = `${FC.food}0D`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = FC.border2;
                e.currentTarget.style.background = FC.elev;
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
                {isFav && <Star size={11} fill="#F59E0B" stroke="#F59E0B" style={{ flexShrink: 0 }} />}
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: FC.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {food.food_name}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '4px', alignItems: 'baseline' }}>
                <span style={{ fontSize: '10px', color: FC.muted }}>{serving}g</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: FC.food }}>{cal} kcal</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
