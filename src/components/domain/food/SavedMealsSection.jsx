import React, { useState } from 'react';
import { BookmarkCheck, ChevronDown, ChevronUp, Trash2, Sparkles } from 'lucide-react';
import { FC } from './shared.jsx';

const MEAL_EMOJI = { breakfast: '☀️', lunch: '🌤️', dinner: '🌙', snack: '🍎' };

export default function SavedMealsSection({ savedMeals = [], onLogSavedMeal, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (!savedMeals || savedMeals.length === 0) return null;

  const handleLog = (meal) => {
    if (onLogSavedMeal) {
      onLogSavedMeal(meal);
    }
  };

  const handleDelete = (id) => {
    if (onDelete) {
      onDelete(id);
    }
  };

  return (
    <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '20px', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
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
        <BookmarkCheck size={16} color={FC.food} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>
            Saved Combos
          </div>
          <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>
            {savedMeals.length} combo{savedMeals.length !== 1 ? 's' : ''} · 1-tap to repeat
          </div>
        </div>
        {expanded ? <ChevronUp size={16} color={FC.muted} /> : <ChevronDown size={16} color={FC.muted} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {savedMeals.map((meal) => {
            const items = meal.items || [];
            const cal = meal.total_cal || items.reduce((s, i) => s + (i.calories || 0), 0);
            return (
              <div
                key={meal.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: FC.elev,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  border: `1px solid ${FC.border2}`,
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>
                  {MEAL_EMOJI[meal.meal_type] || '🍽️'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: FC.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {meal.name}
                  </div>
                  <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px' }}>
                    {Math.round(cal)} kcal · {items.length} item{items.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLog(meal)}
                  style={{
                    background: FC.food,
                    border: 'none',
                    borderRadius: '10px',
                    padding: '7px 12px',
                    color: '#000',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s',
                  }}
                >
                  Log
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(meal.id)}
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
                  aria-label="Delete saved combo"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Save Current Meal Combo (Clean server confirmation, NO fake local IDs) ── */
export function SaveMealButton({ logs = [], mealType = 'lunch', onSaveCombo }) {
  const [saving, setSaving] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const defaultComboName = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} Combo`;
  const [name, setName] = useState(defaultComboName);

  if (!logs || logs.length === 0) return null;

  const handleSave = async () => {
    const cleanName = (name || defaultComboName).trim();
    if (!cleanName || saving) return;

    setSaving(true);
    try {
      if (onSaveCombo) {
        await onSaveCombo({
          name: cleanName,
          mealType,
          items: logs,
        });
      }
      setShowInput(false);
    } finally {
      setSaving(false);
    }
  };

  if (!showInput) {
    return (
      <button
        type="button"
        onClick={() => {
          setName(defaultComboName);
          setShowInput(true);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: FC.sub,
          fontSize: '11px',
          fontWeight: 700,
          padding: '6px 4px',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = FC.food}
        onMouseLeave={e => e.currentTarget.style.color = FC.sub}
      >
        <BookmarkCheck size={13} color={FC.food} />
        <span>Save as {mealType.charAt(0).toUpperCase() + mealType.slice(1)} Combo</span>
      </button>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
      marginTop: '6px',
      padding: '10px 12px',
      background: FC.elev,
      borderRadius: '12px',
      border: `1px solid ${FC.border2}`,
    }}>
      <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        Combo Name
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          autoFocus
          type="text"
          placeholder="Combo name…"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') setShowInput(false);
          }}
          style={{
            flex: 1,
            background: FC.dim,
            border: `1px solid ${FC.border2}`,
            borderRadius: '10px',
            color: FC.text,
            padding: '8px 12px',
            fontSize: '12px',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            background: FC.food,
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            color: '#000',
            fontSize: '11px',
            fontWeight: 800,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? '…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => setShowInput(false)}
          style={{
            background: FC.dim,
            border: 'none',
            borderRadius: '10px',
            padding: '8px 12px',
            color: FC.sub,
            fontSize: '12px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
