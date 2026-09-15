import React, { useState } from 'react';
import { BookmarkCheck, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { FC, FBtn } from './shared.jsx';
import { supabase } from '../../../lib/supabase/index.js';
import { showToast } from '../../ui/Toast.jsx';

const MEAL_EMOJI = { breakfast: '☀️', lunch: '🌤️', dinner: '🌙', snack: '🍎' };

export default function SavedMealsSection({ savedMeals, onLogSavedMeal, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  if (!savedMeals || savedMeals.length === 0) return null;

  const handleLog = (meal) => {
    onLogSavedMeal(meal);
    showToast(`🍱 ${meal.name} logged!`, 'success');
  };

  const handleDelete = async (id) => {
    onDelete(id);
    try {
      await supabase.from('saved_meals').delete().eq('id', id);
    } catch (err) {
      console.warn('saved_meals delete failed:', err.message);
    }
  };

  return (
    <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '20px', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <BookmarkCheck size={16} color={FC.food} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>Saved Meals</div>
          <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>{savedMeals.length} template{savedMeals.length !== 1 ? 's' : ''} · tap to log in 1 tap</div>
        </div>
        {expanded ? <ChevronUp size={16} color={FC.muted} /> : <ChevronDown size={16} color={FC.muted} />}
      </button>

      {expanded && (
        <div style={{ padding: '0 12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {savedMeals.map(meal => (
            <div key={meal.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: FC.elev, borderRadius: '14px', padding: '12px 14px' }}>
              <span style={{ fontSize: '20px', flexShrink: 0 }}>{MEAL_EMOJI[meal.meal_type] || '🍽️'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: FC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meal.name}</div>
                <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px' }}>
                  {meal.total_cal} kcal · {(meal.items || []).length} item{(meal.items || []).length !== 1 ? 's' : ''}
                </div>
              </div>
              <button
                onClick={() => handleLog(meal)}
                style={{ background: FC.food, border: 'none', borderRadius: '10px', padding: '7px 12px', color: '#000', fontSize: '11px', fontWeight: 800, cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
              >
                Log
              </button>
              <button
                onClick={() => handleDelete(meal.id)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: FC.muted, display: 'flex', alignItems: 'center', borderRadius: '6px', transition: 'color 0.15s', flexShrink: 0 }}
                onMouseEnter={e => e.currentTarget.style.color = FC.over}
                onMouseLeave={e => e.currentTarget.style.color = FC.muted}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Save current meal as template ────────────────────────────────────────── */
export function SaveMealButton({ logs = [], mealType, userId, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [name, setName] = useState('');

  if (logs.length === 0) return null;

  const handleSave = async () => {
    if (!name.trim()) { showToast('Enter a name for this meal', 'error'); return; }
    setSaving(true);
    const totalCal     = Math.round(logs.reduce((s, l) => s + (l.calories || 0), 0));
    const total_protein = logs.reduce((s, l) => s + (l.protein  || 0), 0);
    const total_carbs   = logs.reduce((s, l) => s + (l.carbs    || 0), 0);
    const total_fat     = logs.reduce((s, l) => s + (l.fat      || 0), 0);
    const total_fiber   = logs.reduce((s, l) => s + (l.fiber    || 0), 0);
    const items         = logs.map(({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }) =>
      ({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber })
    );
    const row = {
      user_id: userId,
      name: name.trim(),
      meal_type: mealType,
      items,
      total_cal: totalCal,
      total_protein, total_carbs, total_fat, total_fiber,
    };
    try {
      const { data, error } = await supabase.from('saved_meals').insert([row]).select().single();
      if (error) throw error;
      onSaved(data || { ...row, id: Math.random().toString() });
      showToast(`💾 "${name}" saved!`, 'success');
    } catch (err) {
      console.warn('saved_meals insert failed:', err.message);
      onSaved({ ...row, id: Math.random().toString() });
      showToast(`💾 "${name}" saved locally!`, 'success');
    }
    setSaving(false);
    setShowNameInput(false);
    setName('');
  };

  if (!showNameInput) {
    return (
      <button
        onClick={() => setShowNameInput(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'transparent', border: 'none', cursor: 'pointer', color: FC.muted, fontSize: '11px', fontWeight: 700, padding: '4px 0', transition: 'color 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.color = FC.food}
        onMouseLeave={e => e.currentTarget.style.color = FC.muted}
      >
        <BookmarkCheck size={12} /> Save this meal
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
      <input
        autoFocus
        type="text"
        placeholder="Meal name…"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowNameInput(false); }}
        style={{ flex: 1, background: FC.elev, border: `1px solid ${FC.border2}`, borderRadius: '10px', color: FC.text, padding: '8px 12px', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
      />
      <button onClick={handleSave} disabled={saving} style={{ background: FC.food, border: 'none', borderRadius: '10px', padding: '8px 14px', color: '#000', fontSize: '12px', fontWeight: 800, cursor: saving ? 'not-allowed' : 'pointer' }}>
        {saving ? '…' : 'Save'}
      </button>
      <button onClick={() => setShowNameInput(false)} style={{ background: FC.dim, border: 'none', borderRadius: '10px', padding: '8px 12px', color: FC.sub, fontSize: '12px', cursor: 'pointer' }}>
        ✕
      </button>
    </div>
  );
}
