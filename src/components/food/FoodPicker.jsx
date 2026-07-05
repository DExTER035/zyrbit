import React, { useState, useMemo, useCallback } from 'react';
import { Search } from 'lucide-react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import {
  FOOD_DB,
  FOOD_CATEGORIES,
  searchFoods,
  getFoodsByCategory,
  computeNutrition,
} from '../../data/indianFoods.js';

// ── Portion presets (shown after food selection) ────────────────────────────
const PORTION_PRESETS = [
  { label: 'Half',       multiplier: 0.5 },
  { label: '1 Serving',  multiplier: 1.0 },
  { label: '2 Servings', multiplier: 2.0 },
];

export default function FoodPicker({ mealType, recentFoodIds = [], onLog, onClose }) {
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState('all');
  const [selectedFood, setSelected] = useState(null);
  const [portion, setPortion]       = useState(1.0);    // multiplier vs defaultServingG
  const [customG, setCustomG]       = useState('');
  const [useCustom, setUseCustom]   = useState(false);

  // ── Food list ──────────────────────────────────────────────────────────────
  const displayFoods = useMemo(() => {
    if (query.trim()) return searchFoods(query);
    return getFoodsByCategory(category === 'all' ? null : category);
  }, [query, category]);

  const recentFoods = useMemo(() => {
    return recentFoodIds
      .map(id => FOOD_DB.find(f => f.id === id))
      .filter(Boolean)
      .slice(0, 8);
  }, [recentFoodIds]);

  const showRecent = !query.trim() && category === 'all' && recentFoods.length > 0;

  // ── Computed nutrition for selected food ───────────────────────────────────
  const effectiveGrams = useMemo(() => {
    if (!selectedFood) return 0;
    if (useCustom && customG) return parseFloat(customG) || 0;
    return selectedFood.defaultServingG * portion;
  }, [selectedFood, portion, useCustom, customG]);

  const preview = useMemo(() => {
    if (!selectedFood || effectiveGrams <= 0) return null;
    return computeNutrition(selectedFood, effectiveGrams);
  }, [selectedFood, effectiveGrams]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelectFood = useCallback((food) => {
    setSelected(food);
    setPortion(1.0);
    setUseCustom(false);
    setCustomG('');
  }, []);

  const handleLog = useCallback(() => {
    if (!selectedFood || effectiveGrams <= 0 || !preview) return;
    onLog({
      food_id:    selectedFood.id,
      food_name:  selectedFood.name,
      quantity_g: effectiveGrams,
      calories:   preview.cal,
      protein:    preview.protein,
      carbs:      preview.carbs,
      fat:        preview.fat,
      fiber:      preview.fiber,
    });
    onClose();
  }, [selectedFood, effectiveGrams, preview, onLog, onClose]);

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <FBottomSheet title={`Add to ${mealLabel}`} onClose={onClose}>
      {!selectedFood ? (
        /* ── FOOD SEARCH VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: FC.muted, pointerEvents: 'none' }} />
            <FInput
              placeholder="Search Indian foods…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
              autoFocus
            />
          </div>

          {/* Category chips */}
          {!query.trim() && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {FOOD_CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  style={{
                    flexShrink: 0,
                    padding: '6px 12px',
                    borderRadius: '100px',
                    background: category === cat.id ? FC.food : FC.elev,
                    border: `1px solid ${category === cat.id ? FC.food : FC.border2}`,
                    color: category === cat.id ? '#000' : FC.sub,
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat.emoji} {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Recent foods (when no search/filter) */}
          {showRecent && (
            <div>
              <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Recently Logged
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {recentFoods.map(food => (
                  <FoodRow key={food.id} food={food} onSelect={handleSelectFood} />
                ))}
              </div>
            </div>
          )}

          {/* Food list */}
          <div>
            {(showRecent && !query.trim()) && (
              <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                All Foods
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
              {displayFoods.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: FC.muted, fontSize: '13px' }}>
                  No foods found for "{query}"
                </div>
              ) : (
                displayFoods.map(food => (
                  <FoodRow key={food.id} food={food} onSelect={handleSelectFood} />
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ── PORTION PICKER VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selected food header */}
          <div style={{
            background: FC.elev,
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.text }}>{selectedFood.name}</div>
              <div style={{ fontSize: '11px', color: FC.muted, marginTop: '2px' }}>
                {selectedFood.per100g.cal} kcal per 100g
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ fontSize: '11px', color: FC.food, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              Change
            </button>
          </div>

          {/* Portion presets */}
          <div>
            <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '10px', textTransform: 'uppercase' }}>
              Portion — Default: {selectedFood.servingLabel}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PORTION_PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => { setPortion(p.multiplier); setUseCustom(false); setCustomG(''); }}
                  style={{
                    flex: 1,
                    padding: '12px 6px',
                    borderRadius: '12px',
                    background: (!useCustom && portion === p.multiplier) ? FC.food : FC.elev,
                    border: `1px solid ${(!useCustom && portion === p.multiplier) ? FC.food : FC.border2}`,
                    color: (!useCustom && portion === p.multiplier) ? '#000' : FC.text,
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: 'none',
                  }}
                >
                  {p.label}
                  <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '2px', opacity: 0.7 }}>
                    {Math.round(selectedFood.defaultServingG * p.multiplier)}g
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom grams */}
          <div>
            <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
              Custom Amount (g)
            </div>
            <FInput
              type="number"
              placeholder="e.g. 200"
              value={customG}
              onChange={e => { setCustomG(e.target.value); setUseCustom(true); }}
              style={{ maxWidth: '140px' }}
            />
          </div>

          {/* Nutrition preview */}
          {preview && (
            <div style={{
              background: `${FC.food}0D`,
              border: `1px solid ${FC.food}22`,
              borderRadius: '14px',
              padding: '14px 16px',
              display: 'flex',
              justifyContent: 'space-around',
            }}>
              <NutritionPill label="Cals" value={Math.round(preview.cal)} color={FC.food} />
              <NutritionPill label="Protein" value={`${Math.round(preview.protein)}g`} color={FC.protein} />
              <NutritionPill label="Carbs" value={`${Math.round(preview.carbs)}g`} color={FC.carbs} />
              <NutritionPill label="Fat" value={`${Math.round(preview.fat)}g`} color={FC.fat} />
            </div>
          )}

          {/* Log button */}
          <FBtn
            label={`Log ${selectedFood.name} +5 ⚡`}
            onClick={handleLog}
            disabled={!preview || effectiveGrams <= 0}
          />
        </div>
      )}
    </FBottomSheet>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function FoodRow({ food, onSelect }) {
  return (
    <button
      onClick={() => onSelect(food)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = FC.elev}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontSize: '22px', flexShrink: 0 }}>{food.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: FC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {food.name}
        </div>
        <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>
          {food.servingLabel}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: FC.food }}>
          {Math.round(food.per100g.cal * food.defaultServingG / 100)}
        </div>
        <div style={{ fontSize: '9px', color: FC.muted }}>kcal</div>
      </div>
    </button>
  );
}

function NutritionPill({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '14px', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 600, marginTop: '1px' }}>{label}</div>
    </div>
  );
}
