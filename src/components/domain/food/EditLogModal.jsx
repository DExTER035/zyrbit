import React, { useState, useMemo } from 'react';
import { Minus, Plus, Sparkles } from 'lucide-react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import { calculateScaledNutrition } from '../../../engines/food/index.js';

const MEAL_OPTIONS = [
  { value: 'breakfast', label: '☀️ Breakfast' },
  { value: 'lunch',     label: '🌤️ Lunch' },
  { value: 'dinner',    label: '🌙 Dinner' },
  { value: 'snack',     label: '🍎 Snack' },
];

const PRESET_MULTIPLIERS = [
  { label: '0.5×', mult: 0.5 },
  { label: '1×',   mult: 1.0 },
  { label: '1.5×', mult: 1.5 },
  { label: '2×',   mult: 2.0 },
];

export default function EditLogModal({ log, onSave, onClose }) {
  const initialQty = Number(log?.quantity_g) || 100;
  const baseServing = Number(log?.serving_size_g) || initialQty || 100;

  const [quantityG, setQuantityG] = useState(String(initialQty));
  const [mealType, setMealType]   = useState(log?.meal_type || 'lunch');
  const [isSaving, setIsSaving]   = useState(false);

  // Scaled nutrition preview using existing canonical nutrition engine
  const preview = useMemo(() => {
    const qty = Math.max(0, parseFloat(quantityG) || 0);
    const baseFood = {
      serving_size_g: initialQty > 0 ? initialQty : 100,
      calories: log?.calories || 0,
      protein: log?.protein || 0,
      carbs: log?.carbs || 0,
      fat: log?.fat || 0,
      fiber: log?.fiber || 0,
    };
    return calculateScaledNutrition(baseFood, qty);
  }, [log, quantityG, initialQty]);

  const handleMultiplier = (m) => {
    const newQty = Math.round(baseServing * m);
    setQuantityG(String(newQty));
  };

  const handleStep = (delta) => {
    const curr = parseFloat(quantityG) || baseServing;
    const stepSize = Math.max(10, Math.round(baseServing * 0.5));
    const nextVal = Math.max(10, Math.min(50000, curr + delta * stepSize));
    setQuantityG(String(nextVal));
  };

  const handleSave = async () => {
    const qty = Math.max(1, Math.min(50000, parseFloat(quantityG) || 0));
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
    <FBottomSheet title={`Edit Portion — ${log?.food_name || 'Food'}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Meal Type selection */}
        <div>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
            Meal Period
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {MEAL_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setMealType(opt.value)}
                style={{
                  padding: '8px 4px',
                  borderRadius: '10px',
                  background: mealType === opt.value ? FC.food : FC.elev,
                  border: `1px solid ${mealType === opt.value ? FC.food : FC.border2}`,
                  color: mealType === opt.value ? '#000' : FC.text,
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textAlign: 'center',
                }}
              >
                {opt.label.split(' ')[0]} {opt.label.split(' ')[1]}
              </button>
            ))}
          </div>
        </div>

        {/* Portion Stepper & Multipliers */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Portion
            </span>
            <span style={{ fontSize: '11px', color: FC.food, fontWeight: 700 }}>
              {quantityG} grams
            </span>
          </div>

          {/* Stepper */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: FC.elev,
            border: `1px solid ${FC.border2}`,
            borderRadius: '12px',
            padding: '6px 10px',
            marginBottom: '10px',
          }}>
            <button
              type="button"
              onClick={() => handleStep(-1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: FC.dim,
                border: 'none',
                color: FC.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Decrease portion"
            >
              <Minus size={15} />
            </button>

            <span style={{ fontSize: '15px', fontWeight: 800, color: FC.text }}>
              {quantityG}g
            </span>

            <button
              type="button"
              onClick={() => handleStep(1)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: FC.dim,
                border: 'none',
                color: FC.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              title="Increase portion"
            >
              <Plus size={15} />
            </button>
          </div>

          {/* Quick Multipliers: [0.5x] [1x] [1.5x] [2x] */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {PRESET_MULTIPLIERS.map(({ label, mult }) => {
              const target = Math.round(baseServing * mult);
              const isActive = Math.abs(parseFloat(quantityG) - target) < 2;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleMultiplier(mult)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '10px',
                    background: isActive ? `${FC.food}22` : FC.elev,
                    border: `1px solid ${isActive ? FC.food : FC.border2}`,
                    color: isActive ? FC.food : FC.sub,
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Custom exact grams input */}
          <FInput
            type="number"
            placeholder="Custom amount (grams)"
            value={quantityG}
            onChange={(e) => setQuantityG(e.target.value)}
          />
        </div>

        {/* Live Scaled Preview */}
        {preview && (
          <div style={{
            background: `${FC.food}0D`,
            border: `1px solid ${FC.food}22`,
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            justifyContent: 'space-around',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, color: FC.food }}>{preview.calories}</div>
              <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 700 }}>kcal</div>
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

        {/* Save button */}
        <FBtn
          label={isSaving ? 'Saving…' : 'Save Changes'}
          onClick={handleSave}
          disabled={isSaving || !quantityG || parseFloat(quantityG) <= 0}
        />
      </div>
    </FBottomSheet>
  );
}
