import React, { useState, useMemo } from 'react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import { calculateScaledNutrition } from '../../../engines/food/index.js';

const MEAL_OPTIONS = [
  { value: 'breakfast', label: '☀️ Breakfast' },
  { value: 'lunch',     label: '🌤️ Lunch' },
  { value: 'dinner',    label: '🌙 Dinner' },
  { value: 'snack',     label: '🍎 Snack' },
];

export default function EditLogModal({ log, onSave, onClose }) {
  const [quantityG, setQuantityG] = useState(String(log.quantity_g || 100));
  const [mealType, setMealType]   = useState(log.meal_type || 'breakfast');
  const [isSaving, setIsSaving]   = useState(false);

  // Scaled nutrition preview
  const preview = useMemo(() => {
    const qty = Math.max(0, parseFloat(quantityG) || 0);
    const baseServing = log.quantity_g || 100;
    const baseFood = {
      serving_size_g: baseServing,
      calories: log.calories,
      protein: log.protein,
      carbs: log.carbs,
      fat: log.fat,
      fiber: log.fiber,
    };
    return calculateScaledNutrition(baseFood, qty);
  }, [log, quantityG]);

  const handleSave = async () => {
    const qty = Math.max(0, Math.min(50000, parseFloat(quantityG) || 0));
    if (qty <= 0 || isSaving || !preview) return;

    setIsSaving(true);
    try {
      await onSave({
        logId: log.id,
        newQty: qty,
        newMealType: mealType,
        calories: preview.calories,
        protein: preview.protein,
        carbs: preview.carbs,
        fat: preview.fat,
        fiber: preview.fiber,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <FBottomSheet title={`Edit ${log.food_name}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Meal Type selection */}
        <div>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
            Meal Period
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {MEAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setMealType(opt.value)}
                style={{
                  padding: '10px 8px',
                  borderRadius: '12px',
                  background: mealType === opt.value ? FC.food : FC.elev,
                  border: `1px solid ${mealType === opt.value ? FC.food : FC.border2}`,
                  color: mealType === opt.value ? '#000' : FC.text,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantity (g) input */}
        <div>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
            Quantity (grams)
          </div>
          <FInput
            type="number"
            placeholder="e.g. 250"
            value={quantityG}
            onChange={e => setQuantityG(e.target.value)}
            autoFocus
          />
        </div>

        {/* Scaled Preview */}
        {preview && (
          <div style={{ background: `${FC.food}0D`, border: `1px solid ${FC.food}22`, borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.food }}>{preview.calories}</div>
              <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600 }}>kcal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.protein }}>{preview.protein}g</div>
              <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600 }}>Protein</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.carbs }}>{preview.carbs}g</div>
              <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600 }}>Carbs</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.fat }}>{preview.fat}g</div>
              <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600 }}>Fat</div>
            </div>
          </div>
        )}

        <FBtn
          label={isSaving ? 'Updating...' : 'Save Changes 💾'}
          onClick={handleSave}
          disabled={!preview || parseFloat(quantityG) <= 0 || isSaving}
        />
      </div>
    </FBottomSheet>
  );
}
