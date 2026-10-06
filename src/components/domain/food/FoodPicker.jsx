import React, { useState, useMemo, useCallback } from 'react';
import { Search, PlusCircle, X, Trash2, Edit2, Star, Clock, Sparkles } from 'lucide-react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import {
  ALL_CANONICAL_FOODS,
  CANONICAL_FOODS,
  FOOD_DB,
} from '../../../data/foods/index.js';
import { calculateScaledNutrition } from '../../../engines/food/index.js';
import { FEATURES } from '../../../config/features.js';

// ── Portion presets ────────────────────────────────────────────────────────────
const PORTION_PRESETS = [
  { label: 'Half',       multiplier: 0.5 },
  { label: '1 Serving',  multiplier: 1.0 },
  { label: '2 Servings', multiplier: 2.0 },
];

const FILTER_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'my_foods',  label: 'My Foods' },
  { id: 'favorites', label: '★ Favorites' },
  { id: 'recent',    label: 'Recent' },
];

export default function FoodPicker({
  mealType = 'lunch',
  recentFoodIds = [],
  recentMealLogs = [],
  personalFoods = [],
  onLog,
  onCreatePersonalFood,
  onDeletePersonalFood,
  onUpdatePersonalFood,
  onToggleFavorite,
  onClose,
}) {
  const [query, setQuery]           = useState('');
  const [activeTab, setActiveTab]   = useState('all');
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

  // ── Canonical Catalog (Food Knowledge V2 vs Legacy Seed) ─────────────────────
  const canonicalCatalog = useMemo(() => {
    if (FEATURES.FOOD_KNOWLEDGE_V2 && ALL_CANONICAL_FOODS && ALL_CANONICAL_FOODS.length > 0) {
      return ALL_CANONICAL_FOODS;
    }
    return CANONICAL_FOODS || FOOD_DB || [];
  }, []);

  // ── Set of favorite food names for O(1) matching ────────────────────────────
  const favoriteFoodNames = useMemo(() => {
    return new Set(
      (personalFoods || [])
        .filter(f => f.is_favorite !== false)
        .map(f => (f.food_name || '').toLowerCase().trim())
        .filter(Boolean)
    );
  }, [personalFoods]);

  // ── Derived Recent Foods (from actual recentMealLogs / recentFoodIds) ────────
  const recentFoods = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    if (Array.isArray(recentMealLogs)) {
      for (const log of recentMealLogs) {
        const rawName = (log.food_name || log.meal_name || log.name || '').trim();
        const norm = rawName.toLowerCase();
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          const canon = canonicalCatalog.find(f => (f.name || '').toLowerCase() === norm);
          list.push({
            id: log.food_id || canon?.id || `recent_${norm}`,
            name: rawName,
            food_name: rawName,
            emoji: canon?.emoji || '🍱',
            servingLabel: log.quantity_g ? `${log.quantity_g}g` : (canon?.servingLabel || '100g'),
            defaultServingG: log.quantity_g || canon?.defaultServingG || 100,
            calories: log.calories || canon?.calories || (canon?.per100g ? Math.round(canon.per100g.cal * (canon.defaultServingG || 100) / 100) : 0),
            protein: log.protein || canon?.protein || 0,
            carbs: log.carbs || canon?.carbs || 0,
            fat: log.fat || canon?.fat || 0,
            fiber: log.fiber || canon?.fiber || 0,
            per100g: canon?.per100g,
            preparationState: canon?.preparationState || null,
            isRecent: true,
          });
        }
        if (list.length >= 8) break;
      }
    }

    if (list.length < 8 && Array.isArray(recentFoodIds)) {
      for (const id of recentFoodIds) {
        const food = canonicalCatalog.find(f => f.id === id);
        if (food && !seenNames.has((food.name || '').toLowerCase())) {
          seenNames.add((food.name || '').toLowerCase());
          list.push(food);
        }
        if (list.length >= 8) break;
      }
    }

    return list;
  }, [recentMealLogs, recentFoodIds, canonicalCatalog]);

  // ── Frequent / Common Foods (top canonical catalog staples) ─────────────────
  const frequentFoods = useMemo(() => {
    return canonicalCatalog.slice(0, 8);
  }, [canonicalCatalog]);

  // ── Matching Personal Foods (Always prioritized in search) ───────────────────
  const matchingPersonalFoods = useMemo(() => {
    if (!personalFoods.length) return [];
    if (!query.trim()) return personalFoods;
    const q = query.toLowerCase().trim();
    return personalFoods.filter(f => (f.food_name || '').toLowerCase().includes(q));
  }, [personalFoods, query]);

  // ── Favorite Foods (starred personal items) ─────────────────────────────────
  const favoriteFoods = useMemo(() => {
    return (personalFoods || []).filter(f => f.is_favorite !== false);
  }, [personalFoods]);

  // ── Canonical Matches for Query (Ranked: startsWith first, then includes) ───
  const canonicalMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const startsWith = [];
    const contains = [];

    for (const food of canonicalCatalog) {
      const nameLower = (food.name || '').toLowerCase();
      if (nameLower.startsWith(q)) {
        startsWith.push(food);
      } else if (nameLower.includes(q)) {
        contains.push(food);
      }
      if (startsWith.length + contains.length >= 60) break;
    }

    return [...startsWith, ...contains].slice(0, 40);
  }, [query, canonicalCatalog]);

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
      calories: selectedFood.per100g ? (selectedFood.per100g.cal * (selectedFood.defaultServingG || 100) / 100) : (selectedFood.calories || 0),
      protein: selectedFood.per100g ? (selectedFood.per100g.protein * (selectedFood.defaultServingG || 100) / 100) : (selectedFood.protein || 0),
      carbs: selectedFood.per100g ? (selectedFood.per100g.carbs * (selectedFood.defaultServingG || 100) / 100) : (selectedFood.carbs || 0),
      fat: selectedFood.per100g ? (selectedFood.per100g.fat * (selectedFood.defaultServingG || 100) / 100) : (selectedFood.fat || 0),
      fiber: selectedFood.per100g ? (selectedFood.per100g.fiber * (selectedFood.defaultServingG || 100) / 100) : (selectedFood.fiber || 0),
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
      preparation_state: selectedFood.preparationState || null,
      source_type: selectedFood.sourceType || (selectedFood.isPersonal ? 'personal_library' : 'canonical_catalog'),
      nutrition_snapshot: selectedFood.per100g ? {
        per100g: selectedFood.per100g,
        servingSizeG: effectiveGrams,
        servingLabel: selectedFood.servingLabel || `${effectiveGrams}g`,
        preparationState: selectedFood.preparationState || 'raw',
        sourceType: selectedFood.sourceType || 'canonical_catalog',
        sourceName: selectedFood.sourceName || 'ZYRBIT',
        loggedAt: new Date().toISOString(),
      } : null,
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
  const isSearchActive = Boolean(query.trim());

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <FBottomSheet title={`Add to ${mealLabel}`} onClose={onClose}>
      {!selectedFood ? (
        /* ── MAIN SEARCH & FOOD SELECTION VIEW ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Global Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: FC.muted,
                pointerEvents: 'none',
              }}
            />
            <FInput
              placeholder="Search foods, meals, or brands..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ paddingLeft: '36px', paddingRight: query ? '34px' : '12px' }}
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: FC.sub,
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Chips (All, My Foods, Favorites, Recent) */}
          {!isSearchActive && (
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              {FILTER_TABS.map(tab => {
                const isActive = activeTab === tab.id;
                let countBadge = null;
                if (tab.id === 'my_foods' && personalFoods.length > 0) {
                  countBadge = ` (${personalFoods.length})`;
                }
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flexShrink: 0,
                      padding: '6px 14px',
                      borderRadius: '100px',
                      background: isActive ? FC.food : FC.elev,
                      border: `1px solid ${isActive ? FC.food : FC.border2}`,
                      color: isActive ? '#000' : FC.sub,
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}{countBadge}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── CONTENT AREA ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '340px', overflowY: 'auto', paddingRight: '2px' }}>
            {/* 1. SEARCH ACTIVE VIEW */}
            {isSearchActive ? (
              <>
                {/* My Foods section (Personal food priority) */}
                {matchingPersonalFoods.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', color: FC.food, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                      ⭐ My Foods ({matchingPersonalFoods.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {matchingPersonalFoods.map(pf => (
                        <FoodResultRow
                          key={pf.id}
                          food={pf}
                          isPersonal
                          isFavorite={true}
                          onSelect={() => handleSelectFood({
                            id: pf.id,
                            name: pf.food_name,
                            food_name: pf.food_name,
                            emoji: '⭐',
                            servingLabel: `${pf.serving_size_g}g`,
                            defaultServingG: pf.serving_size_g,
                            calories: pf.calories,
                            protein: pf.protein,
                            carbs: pf.carbs,
                            fat: pf.fat,
                            fiber: pf.fiber,
                            isPersonal: true,
                          })}
                          onEdit={() => handleOpenCustomForm(pf)}
                          onDelete={() => onDeletePersonalFood && onDeletePersonalFood(pf.id)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Canonical Global Foods section */}
                {canonicalMatches.length > 0 && (
                  <div>
                    <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                      Foods ({canonicalMatches.length})
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {canonicalMatches.map(food => {
                        const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                        return (
                          <FoodResultRow
                            key={food.id}
                            food={food}
                            isFavorite={isFav}
                            onSelect={handleSelectFood}
                            onToggleFavorite={onToggleFavorite}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Search Empty State */}
                {matchingPersonalFoods.length === 0 && canonicalMatches.length === 0 && (
                  <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <Search size={22} style={{ color: FC.muted, opacity: 0.6 }} />
                    <div style={{ color: FC.sub, fontSize: '13px', fontWeight: 600 }}>
                      No matching food found.
                    </div>
                    <div style={{ color: FC.muted, fontSize: '11px' }}>
                      Create a custom item to save it to your Personal Library.
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 2. DEFAULT VIEW (BY ACTIVE TAB) */
              <>
                {/* TAB: ALL */}
                {activeTab === 'all' && (
                  <>
                    {/* Recent Foods */}
                    {recentFoods.length > 0 && (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                          <Clock size={11} />
                          Recent
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {recentFoods.slice(0, 4).map(food => {
                            const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                            return (
                              <FoodResultRow
                                key={food.id}
                                food={food}
                                isFavorite={isFav}
                                onSelect={handleSelectFood}
                                onToggleFavorite={onToggleFavorite}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Common / Frequent Catalog Foods */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                        <Sparkles size={11} />
                        Common Foods
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {frequentFoods.map(food => {
                          const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                          return (
                            <FoodResultRow
                              key={food.id}
                              food={food}
                              isFavorite={isFav}
                              onSelect={handleSelectFood}
                              onToggleFavorite={onToggleFavorite}
                            />
                          );
                        })}
                      </div>
                    </div>

                    {/* Personal Foods Preview */}
                    {personalFoods.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', color: FC.food, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '8px', textTransform: 'uppercase' }}>
                          ⭐ My Foods
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {personalFoods.slice(0, 3).map(pf => (
                            <FoodResultRow
                              key={pf.id}
                              food={pf}
                              isPersonal
                              isFavorite={true}
                              onSelect={() => handleSelectFood({
                                id: pf.id,
                                name: pf.food_name,
                                food_name: pf.food_name,
                                emoji: '⭐',
                                servingLabel: `${pf.serving_size_g}g`,
                                defaultServingG: pf.serving_size_g,
                                calories: pf.calories,
                                protein: pf.protein,
                                carbs: pf.carbs,
                                fat: pf.fat,
                                fiber: pf.fiber,
                                isPersonal: true,
                              })}
                              onEdit={() => handleOpenCustomForm(pf)}
                              onDelete={() => onDeletePersonalFood && onDeletePersonalFood(pf.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* TAB: MY FOODS */}
                {activeTab === 'my_foods' && (
                  <div>
                    {personalFoods.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '24px' }}>⭐</span>
                        <div style={{ color: FC.sub, fontSize: '13px', fontWeight: 600 }}>
                          You haven't saved any personal foods yet.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {personalFoods.map(pf => (
                          <FoodResultRow
                            key={pf.id}
                            food={pf}
                            isPersonal
                            isFavorite={true}
                            onSelect={() => handleSelectFood({
                              id: pf.id,
                              name: pf.food_name,
                              food_name: pf.food_name,
                              emoji: '⭐',
                              servingLabel: `${pf.serving_size_g}g`,
                              defaultServingG: pf.serving_size_g,
                              calories: pf.calories,
                              protein: pf.protein,
                              carbs: pf.carbs,
                              fat: pf.fat,
                              fiber: pf.fiber,
                              isPersonal: true,
                            })}
                            onEdit={() => handleOpenCustomForm(pf)}
                            onDelete={() => onDeletePersonalFood && onDeletePersonalFood(pf.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: FAVORITES */}
                {activeTab === 'favorites' && (
                  <div>
                    {favoriteFoods.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <Star size={24} style={{ color: FC.muted, opacity: 0.6 }} />
                        <div style={{ color: FC.sub, fontSize: '13px', fontWeight: 600 }}>
                          No favorite foods yet.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {favoriteFoods.map(pf => (
                          <FoodResultRow
                            key={pf.id}
                            food={pf}
                            isPersonal
                            isFavorite={true}
                            onSelect={() => handleSelectFood({
                              id: pf.id,
                              name: pf.food_name,
                              food_name: pf.food_name,
                              emoji: '⭐',
                              servingLabel: `${pf.serving_size_g}g`,
                              defaultServingG: pf.serving_size_g,
                              calories: pf.calories,
                              protein: pf.protein,
                              carbs: pf.carbs,
                              fat: pf.fat,
                              fiber: pf.fiber,
                              isPersonal: true,
                            })}
                            onEdit={() => handleOpenCustomForm(pf)}
                            onDelete={() => onDeletePersonalFood && onDeletePersonalFood(pf.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB: RECENT */}
                {activeTab === 'recent' && (
                  <div>
                    {recentFoods.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <Clock size={24} style={{ color: FC.muted, opacity: 0.6 }} />
                        <div style={{ color: FC.sub, fontSize: '13px', fontWeight: 600 }}>
                          Foods you add will appear here.
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {recentFoods.map(food => {
                          const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                          return (
                            <FoodResultRow
                              key={food.id}
                              food={food}
                              isFavorite={isFav}
                              onSelect={handleSelectFood}
                              onToggleFavorite={onToggleFavorite}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── CREATE PERSONAL FOOD ACTION ── */}
          {!showCustomForm ? (
            <button
              type="button"
              onClick={() => handleOpenCustomForm()}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 14px',
                borderRadius: '14px',
                background: FC.elev,
                border: `1px dashed ${FC.border2}`,
                color: FC.sub,
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                width: '100%',
                marginTop: '4px',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = FC.food; e.currentTarget.style.color = FC.food; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = FC.border2; e.currentTarget.style.color = FC.sub; }}
            >
              <PlusCircle size={15} />
              + Create Personal Food
            </button>
          ) : (
            /* ── PERSONAL FOOD FORM ── */
            <div style={{ background: FC.elev, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', animation: 'fadeSlideUp 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>
                  {editingPersonalFood ? 'Edit Personal Food' : 'Create Personal Food'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomForm(false)}
                  style={{
                    background: FC.dim,
                    border: 'none',
                    borderRadius: '50%',
                    width: '26px',
                    height: '26px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: FC.sub,
                  }}
                >
                  <X size={12} />
                </button>
              </div>

              <FInput
                placeholder="Food name (e.g. Pintola Oats) *"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <FInput
                  type="number"
                  placeholder="Serving size (g) *"
                  value={customServing}
                  onChange={e => setCustomServing(e.target.value)}
                />
                <FInput
                  type="number"
                  placeholder="Calories (kcal) *"
                  value={customCal}
                  onChange={e => setCustomCal(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { ph: 'Protein (g)',  val: customProtein, set: setCustomProtein },
                  { ph: 'Carbs (g)',    val: customCarbs,   set: setCustomCarbs   },
                  { ph: 'Fat (g)',      val: customFat,     set: setCustomFat     },
                  { ph: 'Fiber (g)',    val: customFiber,   set: setCustomFiber   },
                ].map(({ ph, val, set }) => (
                  <FInput
                    key={ph}
                    type="number"
                    placeholder={ph}
                    value={val}
                    onChange={e => set(e.target.value)}
                  />
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
            <div style={{ minWidth: 0, flex: 1, paddingRight: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px' }}>{selectedFood.emoji || '🍽️'}</span>
                <span style={{ fontSize: '15px', fontWeight: 800, color: FC.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFood.name || selectedFood.food_name}
                </span>
                {selectedFood.preparationState && selectedFood.preparationState !== 'raw' && (
                  <span style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: FC.sub,
                    textTransform: 'capitalize',
                  }}>
                    {selectedFood.preparationState}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '11px', color: FC.muted, marginTop: '2px' }}>
                {Math.round(selectedFood.calories || (selectedFood.per100g ? (selectedFood.per100g.cal * (selectedFood.defaultServingG || 100) / 100) : 0))} kcal per {selectedFood.servingLabel || `${selectedFood.defaultServingG || selectedFood.serving_size_g || 100}g`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              style={{ fontSize: '11px', color: FC.food, background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
            >
              Change
            </button>
          </div>

          {/* Portion presets */}
          <div>
            <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', marginBottom: '10px', textTransform: 'uppercase' }}>
              Portion — Default: {selectedFood.servingLabel || `${selectedFood.serving_size_g || selectedFood.defaultServingG || 100}g`}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {PORTION_PRESETS.map(p => {
                const baseG = selectedFood.defaultServingG || selectedFood.serving_size_g || 100;
                const isSelected = !useCustom && portion === p.multiplier;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => { setPortion(p.multiplier); setUseCustom(false); setCustomG(''); }}
                    style={{
                      flex: 1,
                      padding: '12px 6px',
                      borderRadius: '12px',
                      background: isSelected ? FC.food : FC.elev,
                      border: `1px solid ${isSelected ? FC.food : FC.border2}`,
                      color: isSelected ? '#000' : FC.text,
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      outline: 'none',
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
              <NutritionPill label="Cals"    value={Math.round(preview.calories)} color={FC.food}    />
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

// ── Shared Result Row Component ───────────────────────────────────────────────
function FoodResultRow({
  food,
  isPersonal = false,
  isFavorite = false,
  onSelect,
  onToggleFavorite,
  onEdit,
  onDelete,
}) {
  const name = food.name || food.food_name || 'Food';
  const emoji = isPersonal ? '⭐' : (food.emoji || '🍽️');
  const serving = isPersonal
    ? `${food.serving_size_g || 100}g`
    : (food.servingLabel || (food.defaultServingG ? `${food.defaultServingG}g` : '100g'));

  const calories = isPersonal
    ? Math.round(food.calories || 0)
    : Math.round(food.calories || (food.per100g ? (food.per100g.cal * (food.defaultServingG || 100) / 100) : 0));

  const prepState = (!isPersonal && food.preparationState && food.preparationState !== 'raw')
    ? food.preparationState
    : null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        borderRadius: '12px',
        background: 'transparent',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.background = FC.elev}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Emoji */}
      <span style={{ fontSize: '18px', flexShrink: 0, width: '24px', textAlign: 'center' }}>
        {emoji}
      </span>

      {/* Food Details */}
      <div style={{ flex: 1, minWidth: 0 }} onClick={() => onSelect(food)}>
        <div style={{
          fontSize: '13px',
          fontWeight: 700,
          color: FC.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {name}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '11px',
          color: FC.muted,
          marginTop: '2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {isPersonal ? (
            <span style={{ color: FC.food, fontWeight: 700 }}>Your Food</span>
          ) : null}
          <span>{serving}</span>
          {prepState && (
            <span style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              padding: '0 5px',
              fontSize: '10px',
              fontWeight: 600,
              color: FC.sub,
              textTransform: 'capitalize',
            }}>
              {prepState}
            </span>
          )}
        </div>
      </div>

      {/* Calories Block */}
      <div
        style={{ textAlign: 'right', flexShrink: 0, minWidth: '50px', cursor: 'pointer' }}
        onClick={() => onSelect(food)}
      >
        <div style={{ fontSize: '13px', fontWeight: 800, color: FC.food }}>
          {calories}
        </div>
        <div style={{ fontSize: '9px', color: FC.muted }}>kcal</div>
      </div>

      {/* Action Buttons: Star or Personal Edit/Delete */}
      {isPersonal ? (
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
          {onEdit && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{ background: 'transparent', border: 'none', color: FC.sub, cursor: 'pointer', padding: '4px' }}
              title="Edit personal food"
            >
              <Edit2 size={12} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              style={{ background: 'transparent', border: 'none', color: FC.muted, cursor: 'pointer', padding: '4px' }}
              title="Delete personal food"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ) : (
        onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite({
                food_name: name,
                name,
                serving_size_g: food.defaultServingG || 100,
                calories,
                protein: Math.round(food.protein || (food.per100g ? food.per100g.protein * (food.defaultServingG || 100) / 100 : 0)),
                carbs: Math.round(food.carbs || (food.per100g ? food.per100g.carbs * (food.defaultServingG || 100) / 100 : 0)),
                fat: Math.round(food.fat || (food.per100g ? food.per100g.fat * (food.defaultServingG || 100) / 100 : 0)),
                fiber: Math.round(food.fiber || (food.per100g ? food.per100g.fiber * (food.defaultServingG || 100) / 100 : 0)),
              });
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isFavorite ? '#F59E0B' : FC.muted,
              display: 'flex',
              alignItems: 'center',
              borderRadius: '6px',
              flexShrink: 0,
            }}
            title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Star size={14} fill={isFavorite ? '#F59E0B' : 'transparent'} stroke={isFavorite ? '#F59E0B' : FC.muted} />
          </button>
        )
      )}
    </div>
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
