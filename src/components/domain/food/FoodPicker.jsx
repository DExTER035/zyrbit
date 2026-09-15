import React, { useState, useMemo, useCallback } from 'react';
import { Search, PlusCircle, X, Trash2, Edit2 } from 'lucide-react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import {
  FOOD_DB,
  FOOD_CATEGORIES,
  searchFoods,
  getFoodsByCategory,
} from '../../../data/foods/index.js';
import { calculateScaledNutrition } from '../../../engines/food/index.js';

// ── Portion presets ────────────────────────────────────────────────────────────
const PORTION_PRESETS = [
  { label: 'Half',       multiplier: 0.5 },
  { label: '1 Serving',  multiplier: 1.0 },
  { label: '2 Servings', multiplier: 2.0 },
];

export default function FoodPicker({
  mealType,
  recentFoodIds = [],
  personalFoods = [],
  onLog,
  onCreatePersonalFood,
  onDeletePersonalFood,
  onUpdatePersonalFood,
  onClose,
}) {
  const [query, setQuery]           = useState('');
  const [category, setCategory]     = useState('all');
  const [selectedFood, setSelected] = useState(null);
  const [portion, setPortion]       = useState(1.0);
  const [customG, setCustomG]       = useState('');
  const [useCustom, setUseCustom]   = useState(false);

  // Custom personal food form state
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [editingPersonalFood, setEditingPersonalFood] = useState(null);
  const [customName,    setCustomName]    = useState('');
  const [customServing, setCustomServing] = useState('100');
  const [customCal,     setCustomCal]     = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs,   setCustomCarbs]   = useState('');
  const [customFat,     setCustomFat]     = useState('');
  const [customFiber,   setCustomFiber]   = useState('');
  const [isSubmitting, setIsSubmitting]   = useState(false);

  // ── Categories list including My Foods ──────────────────────────────────────
  const categoriesList = useMemo(() => {
    const list = [
      { id: 'all', emoji: '🍽️', label: 'All' },
      { id: 'my_foods', emoji: '⭐', label: `My Foods (${personalFoods.length})` },
    ];
    FOOD_CATEGORIES.forEach(c => {
      if (c.id !== 'all') list.push(c);
    });
    return list;
  }, [personalFoods]);

  // ── Search & Filter Foods ───────────────────────────────────────────────────
  const matchingPersonalFoods = useMemo(() => {
    if (!personalFoods.length) return [];
    if (!query.trim()) {
      return category === 'my_foods' || category === 'all' ? personalFoods : [];
    }
    const q = query.toLowerCase().trim();
    return personalFoods.filter(f => f.food_name.toLowerCase().includes(q));
  }, [personalFoods, query, category]);

  const displayFoods = useMemo(() => {
    if (category === 'my_foods') return [];
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

  // ── Nutrition preview calculation ───────────────────────────────────────────
  const effectiveGrams = useMemo(() => {
    if (!selectedFood) return 0;
    if (useCustom && customG) return parseFloat(customG) || 0;
    const baseServing = selectedFood.defaultServingG || selectedFood.serving_size_g || 100;
    return baseServing * portion;
  }, [selectedFood, portion, useCustom, customG]);

  const preview = useMemo(() => {
    if (!selectedFood || effectiveGrams <= 0) return null;
    const baseFood = {
      serving_size_g: selectedFood.defaultServingG || selectedFood.serving_size_g || 100,
      calories: selectedFood.per100g ? (selectedFood.per100g.cal * (selectedFood.defaultServingG || 100) / 100) : selectedFood.calories,
      protein: selectedFood.per100g ? (selectedFood.per100g.protein * (selectedFood.defaultServingG || 100) / 100) : selectedFood.protein,
      carbs: selectedFood.per100g ? (selectedFood.per100g.carbs * (selectedFood.defaultServingG || 100) / 100) : selectedFood.carbs,
      fat: selectedFood.per100g ? (selectedFood.per100g.fat * (selectedFood.defaultServingG || 100) / 100) : selectedFood.fat,
      fiber: selectedFood.per100g ? (selectedFood.per100g.fiber * (selectedFood.defaultServingG || 100) / 100) : selectedFood.fiber,
    };
    return calculateScaledNutrition(baseFood, effectiveGrams);
  }, [selectedFood, effectiveGrams]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectFood = useCallback((food) => {
    setSelected(food);
    setPortion(1.0);
    setUseCustom(false);
    setCustomG('');
    setShowCustomForm(false);
  }, []);

  const handleLog = useCallback(() => {
    if (!selectedFood || effectiveGrams <= 0 || !preview) return;
    onLog({
      food_id:    selectedFood.id || null,
      food_name:  selectedFood.name || selectedFood.food_name,
      quantity_g: effectiveGrams,
      calories:   preview.calories,
      protein:    preview.protein,
      carbs:      preview.carbs,
      fat:        preview.fat,
      fiber:      preview.fiber,
    });
    onClose();
  }, [selectedFood, effectiveGrams, preview, onLog, onClose]);

  const handleOpenCustomForm = (personalFood = null) => {
    if (personalFood) {
      setEditingPersonalFood(personalFood);
      setCustomName(personalFood.food_name || '');
      setCustomServing(String(personalFood.serving_size_g || 100));
      setCustomCal(String(personalFood.calories || ''));
      setCustomProtein(String(personalFood.protein || ''));
      setCustomCarbs(String(personalFood.carbs || ''));
      setCustomFat(String(personalFood.fat || ''));
      setCustomFiber(String(personalFood.fiber || ''));
    } else {
      setEditingPersonalFood(null);
      setCustomName('');
      setCustomServing('100');
      setCustomCal('');
      setCustomProtein('');
      setCustomCarbs('');
      setCustomFat('');
      setCustomFiber('');
    }
    setShowCustomForm(true);
  };

  const handleSavePersonalFood = async () => {
    const cal = parseFloat(customCal);
    const sG = parseFloat(customServing) || 100;
    if (!customName.trim() || isNaN(cal) || cal < 0 || sG <= 0 || isSubmitting) return;

    setIsSubmitting(true);
    const foodPayload = {
      food_name: customName.trim().slice(0, 150),
      serving_size_g: sG,
      calories: Math.max(0, Math.min(10000, cal)),
      protein: Math.max(0, Math.min(2000, parseFloat(customProtein) || 0)),
      carbs: Math.max(0, Math.min(2000, parseFloat(customCarbs) || 0)),
      fat: Math.max(0, Math.min(2000, parseFloat(customFat) || 0)),
      fiber: Math.max(0, Math.min(2000, parseFloat(customFiber) || 0)),
    };

    try {
      if (editingPersonalFood && onUpdatePersonalFood) {
        await onUpdatePersonalFood({ ...editingPersonalFood, ...foodPayload });
      } else if (onCreatePersonalFood) {
        await onCreatePersonalFood(foodPayload);
      }
      setShowCustomForm(false);
      setEditingPersonalFood(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const mealLabel = mealType.charAt(0).toUpperCase() + mealType.slice(1);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <FBottomSheet title={`Add to ${mealLabel}`} onClose={onClose}>
      {!selectedFood ? (
        /* ── FOOD SEARCH VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: FC.muted, pointerEvents: 'none' }} />
            <FInput
              placeholder="Search Indian foods or My Foods…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
              autoFocus
            />
          </div>

          {/* Category chips */}
          {!query.trim() && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categoriesList.map(cat => (
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

          {/* My Personal Foods Section */}
          {matchingPersonalFoods.length > 0 && (
            <div>
              <div style={{ fontSize: '10px', color: FC.food, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                ⭐ My Foods Library ({matchingPersonalFoods.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {matchingPersonalFoods.map(pf => (
                  <PersonalFoodRow
                    key={pf.id}
                    food={pf}
                    onSelect={() => handleSelectFood({
                      id: pf.id,
                      name: pf.food_name,
                      food_name: pf.food_name,
                      emoji: '⭐',
                      servingLabel: `${pf.serving_size_g}g serving`,
                      defaultServingG: pf.serving_size_g,
                      calories: pf.calories,
                      protein: pf.protein,
                      carbs: pf.carbs,
                      fat: pf.fat,
                      fiber: pf.fiber,
                    })}
                    onEdit={() => handleOpenCustomForm(pf)}
                    onDelete={() => onDeletePersonalFood && onDeletePersonalFood(pf.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recent foods */}
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

          {/* Indian Foods list */}
          {category !== 'my_foods' && (
            <div>
              {showRecent && !query.trim() && (
                <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                  Indian Foods Database
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '240px', overflowY: 'auto' }}>
                {displayFoods.length === 0 && !matchingPersonalFoods.length && query.trim() ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: FC.muted, fontSize: '13px' }}>
                    No food matches for "{query}"
                  </div>
                ) : (
                  displayFoods.map(food => (
                    <FoodRow key={food.id} food={food} onSelect={handleSelectFood} />
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── Create Personal Food Button ── */}
          {!showCustomForm ? (
            <button
              onClick={() => handleOpenCustomForm()}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '12px 14px', borderRadius: '14px',
                background: FC.elev,
                border: `1px dashed ${FC.border2}`,
                color: FC.sub, fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = FC.food; e.currentTarget.style.color = FC.food; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = FC.border2; e.currentTarget.style.color = FC.sub; }}
            >
              <PlusCircle size={14} />
              + Create New Personal Food
            </button>
          ) : (
            /* ── Personal Food Form ── */
            <div style={{ background: FC.elev, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeSlideUp 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>
                  {editingPersonalFood ? 'Edit Personal Food' : 'Create Personal Food'}
                </span>
                <button onClick={() => setShowCustomForm(false)} style={{ background: FC.dim, border: 'none', borderRadius: '50%', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: FC.sub }}>
                  <X size={12} />
                </button>
              </div>

              <FInput placeholder="Food name (e.g. Akurdi Poha) *" value={customName} onChange={e => setCustomName(e.target.value)} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <FInput type="number" placeholder="Serving size (g) *" value={customServing} onChange={e => setCustomServing(e.target.value)} />
                <FInput type="number" placeholder="Calories (kcal) *" value={customCal} onChange={e => setCustomCal(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { ph: 'Protein (g)',  val: customProtein, set: setCustomProtein },
                  { ph: 'Carbs (g)',    val: customCarbs,   set: setCustomCarbs   },
                  { ph: 'Fat (g)',      val: customFat,     set: setCustomFat     },
                  { ph: 'Fiber (g)',    val: customFiber,   set: setCustomFiber   },
                ].map(({ ph, val, set }) => (
                  <FInput key={ph} type="number" placeholder={ph} value={val} onChange={e => set(e.target.value)} />
                ))}
              </div>

              <FBtn
                label={isSubmitting ? 'Saving...' : (editingPersonalFood ? 'Update Personal Food 💾' : 'Save to My Foods ⭐')}
                onClick={handleSavePersonalFood}
                disabled={!customName.trim() || !customCal || isSubmitting}
              />
            </div>
          )}
        </div>
      ) : (
        /* ── PORTION PICKER VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Selected food header */}
          <div style={{ background: FC.elev, borderRadius: '16px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.text }}>{selectedFood.name || selectedFood.food_name}</div>
              <div style={{ fontSize: '11px', color: FC.muted, marginTop: '2px' }}>
                {Math.round(selectedFood.calories || (selectedFood.per100g ? selectedFood.per100g.cal : 0))} kcal per {selectedFood.defaultServingG || selectedFood.serving_size_g || 100}g
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
              Portion — Default: {selectedFood.servingLabel || `${selectedFood.serving_size_g || 100}g`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PORTION_PRESETS.map(p => {
                const baseG = selectedFood.defaultServingG || selectedFood.serving_size_g || 100;
                return (
                  <button
                    key={p.label}
                    onClick={() => { setPortion(p.multiplier); setUseCustom(false); setCustomG(''); }}
                    style={{
                      flex: 1, padding: '12px 6px', borderRadius: '12px',
                      background: (!useCustom && portion === p.multiplier) ? FC.food : FC.elev,
                      border: `1px solid ${(!useCustom && portion === p.multiplier) ? FC.food : FC.border2}`,
                      color: (!useCustom && portion === p.multiplier) ? '#000' : FC.text,
                      fontWeight: 800, fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s', outline: 'none',
                    }}
                  >
                    {p.label}
                    <div style={{ fontSize: '9px', fontWeight: 600, marginTop: '2px', opacity: 0.7 }}>
                      {Math.round(baseG * p.multiplier)}g
                    </div>
                  </button>
                );
              })}
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
            <div style={{ background: `${FC.food}0D`, border: `1px solid ${FC.food}22`, borderRadius: '14px', padding: '14px 16px', display: 'flex', justifyContent: 'space-around' }}>
              <NutritionPill label="Cals"   value={Math.round(preview.calories)} color={FC.food}    />
              <NutritionPill label="Protein" value={`${preview.protein}g`}        color={FC.protein} />
              <NutritionPill label="Carbs"   value={`${preview.carbs}g`}          color={FC.carbs}   />
              <NutritionPill label="Fat"     value={`${preview.fat}g`}            color={FC.fat}     />
            </div>
          )}

          <FBtn
            label={`Log ${selectedFood.name || selectedFood.food_name} ⚡`}
            onClick={handleLog}
            disabled={!preview || effectiveGrams <= 0}
          />
        </div>
      )}
      <style>{`@keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </FBottomSheet>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────
function PersonalFoodRow({ food, onSelect, onEdit, onDelete }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '12px',
        background: FC.elev,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: '20px', flexShrink: 0 }}>⭐</span>
      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={onSelect}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: FC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {food.food_name}
        </div>
        <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>
          {food.serving_size_g}g serving · P {Math.round(food.protein)}g · C {Math.round(food.carbs)}g · F {Math.round(food.fat)}g
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginRight: '4px' }}>
        <div style={{ fontSize: '13px', fontWeight: 800, color: FC.food }}>
          {Math.round(food.calories)}
        </div>
        <div style={{ fontSize: '9px', color: FC.muted }}>kcal</div>
      </div>
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            style={{ background: 'transparent', border: 'none', color: FC.sub, cursor: 'pointer', padding: '4px' }}
            title="Edit personal food"
          >
            <Edit2 size={12} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{ background: 'transparent', border: 'none', color: FC.muted, cursor: 'pointer', padding: '4px' }}
            title="Delete personal food"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

function FoodRow({ food, onSelect }) {
  return (
    <button
      onClick={() => onSelect(food)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 12px', borderRadius: '12px',
        background: 'transparent', border: 'none',
        cursor: 'pointer', width: '100%', textAlign: 'left',
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
        <div style={{ fontSize: '10px', color: FC.muted, marginTop: '1px' }}>{food.servingLabel}</div>
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
