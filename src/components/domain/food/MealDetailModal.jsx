import React from 'react';
import { Star, Edit2, Trash2, Clock, Utensils, Flame, Sparkles } from 'lucide-react';
import { FC, FBottomSheet } from './shared.jsx';

const formatLogTime = (createdAt) => {
  if (!createdAt) return 'Today';
  try {
    const date = new Date(createdAt);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Today';
  }
};

export default function MealDetailModal({
  log,
  isFavorite = false,
  onToggleFavorite,
  onEdit,
  onDelete,
  onClose,
}) {
  if (!log) return null;

  const timeStr = formatLogTime(log.created_at);
  const calories = Math.round(log.calories || 0);
  const protein = Math.round((log.protein || 0) * 10) / 10;
  const carbs = Math.round((log.carbs || 0) * 10) / 10;
  const fat = Math.round((log.fat || 0) * 10) / 10;
  const fiber = Math.round((log.fiber || 0) * 10) / 10;
  const quantityG = log.quantity_g || 100;
  const mealTypeCap = (log.meal_type || 'meal').charAt(0).toUpperCase() + (log.meal_type || 'meal').slice(1);

  return (
    <FBottomSheet title="Meal Inspection" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {/* Header Hero */}
        <div style={{
          background: FC.elev,
          border: `1px solid ${FC.border2}`,
          borderRadius: '16px',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: 800,
                color: FC.text,
                letterSpacing: '-0.02em',
              }}>
                {log.food_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: '11px', color: FC.muted }}>
                <Clock size={12} color={FC.muted} />
                <span>{timeStr} · {mealTypeCap}</span>
                <span>•</span>
                <span>{quantityG}g · Estimated</span>
              </div>
            </div>
            <button
              onClick={() => onToggleFavorite && onToggleFavorite(log)}
              style={{
                background: isFavorite ? 'rgba(245, 158, 11, 0.15)' : FC.dim,
                border: `1px solid ${isFavorite ? FC.food : FC.border2}`,
                borderRadius: '10px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isFavorite ? FC.food : FC.sub,
                transition: 'all 0.15s',
              }}
              title={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
            >
              <Star size={16} fill={isFavorite ? FC.food : 'transparent'} />
            </button>
          </div>

          {/* Calorie Hero */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '6px',
            marginTop: '8px',
            paddingTop: '10px',
            borderTop: `1px solid ${FC.border}`,
          }}>
            <Flame size={18} color={FC.food} />
            <span style={{ fontSize: '26px', fontWeight: 900, color: FC.text, lineHeight: 1 }}>
              {calories}
            </span>
            <span style={{ fontSize: '13px', color: FC.muted, fontWeight: 600 }}>kcal</span>
            {isFavorite && (
              <span style={{
                marginLeft: 'auto',
                fontSize: '10px',
                fontWeight: 800,
                color: FC.food,
                background: `${FC.food}15`,
                padding: '3px 8px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}>
                <Sparkles size={11} /> Favorite
              </span>
            )}
          </div>
        </div>

        {/* Nutritional Breakdown Bento */}
        <div>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
            Nutritional Balance
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
            <div style={{ background: FC.elev, border: `1px solid ${FC.border2}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.protein }}>{protein}g</div>
              <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px', fontWeight: 600 }}>Protein</div>
            </div>
            <div style={{ background: FC.elev, border: `1px solid ${FC.border2}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.carbs }}>{carbs}g</div>
              <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px', fontWeight: 600 }}>Carbs</div>
            </div>
            <div style={{ background: FC.elev, border: `1px solid ${FC.border2}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.fat }}>{fat}g</div>
              <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px', fontWeight: 600 }}>Fat</div>
            </div>
            <div style={{ background: FC.elev, border: `1px solid ${FC.border2}`, borderRadius: '12px', padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.fiber }}>{fiber}g</div>
              <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px', fontWeight: 600 }}>Fiber</div>
            </div>
          </div>
        </div>

        {/* Wealth Link / Note */}
        {log.wealth_expense_amount && (
          <div style={{
            background: FC.elev,
            border: `1px solid ${FC.border2}`,
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: '12px', color: FC.sub }}>Linked Food Expense</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#22C55E' }}>
              ₹{log.wealth_expense_amount}
            </span>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
          <button
            onClick={() => {
              onClose();
              if (onEdit) onEdit(log);
            }}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              background: FC.elev,
              border: `1px solid ${FC.border2}`,
              color: FC.text,
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Edit2 size={14} color={FC.food} />
            <span>Edit Portion</span>
          </button>

          <button
            onClick={() => {
              onClose();
              if (onDelete) onDelete(log.id);
            }}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#EF4444',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s',
            }}
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      </div>
    </FBottomSheet>
  );
}
