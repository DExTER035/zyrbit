import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  PlusCircle,
  X,
  Trash2,
  Edit2,
  Star,
  Clock,
  ChevronRight,
  Plus,
  Check,
  ChevronLeft,
  ArrowLeft,
  Heart,
  SlidersHorizontal,
} from 'lucide-react';
import { FC, FBottomSheet, FInput, FBtn } from './shared.jsx';
import {
  ALL_CANONICAL_FOODS,
  CANONICAL_FOODS,
  FOOD_DB,
  findCanonicalFood,
} from '../../../data/foods/index.js';
import { calculateScaledNutrition } from '../../../engines/food/index.js';
import { FEATURES, FOOD_AMBIGUITY_CALORIE_THRESHOLD } from '../../../config/features.js';

// ── Design Tokens ─────────────────────────────────────────────────────────────
const ACCENT_GREEN = '#1FA36F';
const SURFACE_CARD = '#1B1F23';
const BORDER_SUBTLE = '#26272C';

// ── Browse Categories for All Foods Tab (Flow 8) ──────────────────────────────
const BROWSE_CATEGORIES = [
  { id: 'grain',     label: 'Grains & Cereals',       emoji: '🌾' },
  { id: 'fruit',     label: 'Fruits',                 emoji: '🍎' },
  { id: 'vegetable', label: 'Vegetables',             emoji: '🥦' },
  { id: 'dairy',     label: 'Dairy & Dairy Products', emoji: '🥛' },
  { id: 'protein',   label: 'Protein Foods',          emoji: '🥩' },
  { id: 'nut',       label: 'Nuts & Seeds',           emoji: '🥜' },
  { id: 'fat',       label: 'Oils & Fats',            emoji: '🫒' },
  { id: 'drink',     label: 'Beverages',              emoji: '🍵' },
];

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch',     label: 'Lunch' },
  { id: 'dinner',    label: 'Dinner' },
  { id: 'snack',     label: 'Snacks' },
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
  // Navigation & View State
  // view: 'picker' | 'details' | 'ambiguity' | 'custom'
  const [view, setView] = useState('picker');
  const [activeTab, setActiveTab] = useState('recent'); // 'recent' | 'favorites' | 'all'
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Active target meal slot (defaults to prop, can be toggled in details view)
  const [targetMealSlot, setTargetMealSlot] = useState(mealType);

  // Selected Food State
  const [selectedFood, setSelectedFood] = useState(null);
  const [portionMultiplier, setPortionMultiplier] = useState(1.0);
  const [customAmountG, setCustomAmountG] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Ambiguity State
  const [ambiguityCandidates, setAmbiguityCandidates] = useState([]);
  const [ambiguityBaseFood, setAmbiguityBaseFood] = useState(null);

  // Personal Food Form State
  const [personalTab, setPersonalTab] = useState('single'); // 'single' | 'recipe'
  const [editingPersonalFood, setEditingPersonalFood] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customCategory, setCustomCategory] = useState('grain');
  const [customServing, setCustomServing] = useState('100');
  const [customCal, setCustomCal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Canonical Catalog ────────────────────────────────────────────────────────
  const canonicalCatalog = useMemo(() => {
    if (FEATURES.FOOD_KNOWLEDGE_V2 && ALL_CANONICAL_FOODS && ALL_CANONICAL_FOODS.length > 0) {
      return ALL_CANONICAL_FOODS;
    }
    return CANONICAL_FOODS || FOOD_DB || [];
  }, []);

  // ── Set of Favorite Food Names ───────────────────────────────────────────────
  const favoriteFoodNames = useMemo(() => {
    return new Set(
      (personalFoods || [])
        .filter((f) => f.is_favorite !== false)
        .map((f) => (f.food_name || '').toLowerCase().trim())
        .filter(Boolean)
    );
  }, [personalFoods]);

  // ── Derived Recent Foods (from recentMealLogs or recentFoodIds) ──────────────
  const recentFoods = useMemo(() => {
    const list = [];
    const seenNames = new Set();

    if (Array.isArray(recentMealLogs)) {
      for (const log of recentMealLogs) {
        const rawName = (log.food_name || log.meal_name || log.name || '').trim();
        const norm = rawName.toLowerCase();
        if (norm && !seenNames.has(norm)) {
          seenNames.add(norm);
          const personal = (personalFoods || []).find((pf) => (pf.food_name || pf.name || '').toLowerCase().trim() === norm);
          const canon = canonicalCatalog.find((f) => (f.name || '').toLowerCase() === norm);
          list.push({
            id: log.food_id || personal?.id || canon?.id || `recent_${norm}`,
            name: rawName,
            food_name: rawName,
            emoji: personal ? '⭐' : (canon?.emoji || '🍱'),
            servingLabel: log.quantity_g ? `${log.quantity_g}g` : (personal ? `${personal.serving_size_g || 100}g` : (canon?.servingLabel || '100g')),
            defaultServingG: log.quantity_g || personal?.serving_size_g || canon?.defaultServingG || 100,
            calories: log.calories || personal?.calories || canon?.calories || (canon?.per100g ? Math.round((canon.per100g.cal * (canon.defaultServingG || 100)) / 100) : 0),
            protein: log.protein || personal?.protein || canon?.protein || 0,
            carbs: log.carbs || personal?.carbs || canon?.carbs || 0,
            fat: log.fat || personal?.fat || canon?.fat || 0,
            fiber: log.fiber || personal?.fiber || canon?.fiber || 0,
            per100g: canon?.per100g,
            preparationState: canon?.preparationState || null,
            isPersonal: Boolean(personal),
            isRecent: true,
          });
        }
        if (list.length >= 8) break;
      }
    }

    if (list.length < 8 && Array.isArray(recentFoodIds)) {
      for (const id of recentFoodIds) {
        const food = canonicalCatalog.find((f) => f.id === id);
        if (food && !seenNames.has((food.name || '').toLowerCase())) {
          seenNames.add((food.name || '').toLowerCase());
          list.push(food);
        }
        if (list.length >= 8) break;
      }
    }

    // Default seed staples if no recent logs yet
    if (list.length === 0) {
      return canonicalCatalog.slice(0, 6);
    }

    return list;
  }, [recentMealLogs, recentFoodIds, canonicalCatalog, personalFoods]);

  // ── Favorite Foods (starred personal items) ──────────────────────────────────
  const favoriteFoods = useMemo(() => {
    return (personalFoods || []).filter((f) => f.is_favorite !== false);
  }, [personalFoods]);

  // ── Search & Filter Logic ────────────────────────────────────────────────────
  const isSearching = Boolean(query.trim());

  // Personal Foods matching current query
  const matchingPersonalFoods = useMemo(() => {
    if (!personalFoods.length) return [];
    if (!isSearching) return personalFoods;
    const q = query.toLowerCase().trim();
    return personalFoods.filter((f) => (f.food_name || '').toLowerCase().includes(q));
  }, [personalFoods, query, isSearching]);

  // Canonical matches (ranked: prefix matches first, then substring)
  const canonicalSearchResults = useMemo(() => {
    if (!isSearching) return [];
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
  }, [query, isSearching, canonicalCatalog]);

  // Category browse items (when inside All Foods and a category is chosen)
  const categoryBrowseFoods = useMemo(() => {
    if (!selectedCategory) return [];
    const cat = selectedCategory.id;
    return canonicalCatalog
      .filter((f) => {
        if (cat === 'grain') return f.category === 'grain' || f.category === 'breakfast';
        if (cat === 'fruit') return f.category === 'fruit' || f.name.toLowerCase().includes('fruit');
        if (cat === 'vegetable') return f.category === 'lunch' && (f.name.toLowerCase().includes('spinach') || f.name.toLowerCase().includes('broccoli') || f.name.toLowerCase().includes('salad') || f.name.toLowerCase().includes('vegetable'));
        if (cat === 'dairy') return f.name.toLowerCase().includes('milk') || f.name.toLowerCase().includes('cheese') || f.name.toLowerCase().includes('yogurt') || f.name.toLowerCase().includes('paneer') || f.name.toLowerCase().includes('curd');
        if (cat === 'protein') return f.category === 'protein' || f.name.toLowerCase().includes('chicken') || f.name.toLowerCase().includes('egg') || f.name.toLowerCase().includes('fish') || f.name.toLowerCase().includes('dal');
        if (cat === 'nut') return f.name.toLowerCase().includes('almond') || f.name.toLowerCase().includes('peanut') || f.name.toLowerCase().includes('walnut') || f.name.toLowerCase().includes('seed');
        if (cat === 'fat') return f.name.toLowerCase().includes('oil') || f.name.toLowerCase().includes('butter') || f.name.toLowerCase().includes('ghee');
        if (cat === 'drink') return f.category === 'drink' || f.name.toLowerCase().includes('tea') || f.name.toLowerCase().includes('coffee') || f.name.toLowerCase().includes('water');
        return f.category === cat;
      })
      .slice(0, 30);
  }, [selectedCategory, canonicalCatalog]);

  // ── Ambiguity Check (20% Materiality Rule) ───────────────────────────────────
  const checkAmbiguityAndOpen = useCallback((food) => {
    // If user clicked an already-disambiguated food (e.g. explicitly says "cooked" or "dry")
    if (food.preparationState && food.preparationState !== 'raw') {
      openFoodDetails(food);
      return;
    }

    // Check if canonical food has multi-variant candidates with >20% calorie spread
    const match = findCanonicalFood(food.name || food.food_name);
    if (match && match.candidates && match.candidates.length > 1) {
      const cals = match.candidates
        .map((c) => c.per100g?.cal || c.calories || 0)
        .filter((c) => c > 0);
      if (cals.length > 1) {
        const min = Math.min(...cals);
        const max = Math.max(...cals);
        if ((max - min) / max >= FOOD_AMBIGUITY_CALORIE_THRESHOLD) {
          setAmbiguityBaseFood(food);
          setAmbiguityCandidates(match.candidates);
          setView('ambiguity');
          return;
        }
      }
    }

    // No material ambiguity -> Open details directly
    openFoodDetails(food);
  }, []);

  // ── Open Food Details & Portion Screen ───────────────────────────────────────
  const openFoodDetails = (food) => {
    setSelectedFood(food);
    setPortionMultiplier(1.0);
    setIsCustomMode(false);
    setCustomAmountG('');
    setView('details');
  };

  // ── Dynamic Scaled Nutrition Preview ─────────────────────────────────────────
  const effectiveGrams = useMemo(() => {
    if (!selectedFood) return 0;
    if (isCustomMode && customAmountG) {
      return parseFloat(customAmountG) || 0;
    }
    const baseServing = selectedFood.defaultServingG || selectedFood.serving_size_g || 100;
    return baseServing * portionMultiplier;
  }, [selectedFood, isCustomMode, customAmountG, portionMultiplier]);

  const nutritionPreview = useMemo(() => {
    if (!selectedFood || effectiveGrams <= 0) return null;
    const baseFood = {
      serving_size_g: selectedFood.defaultServingG || selectedFood.serving_size_g || 100,
      calories: selectedFood.per100g
        ? (selectedFood.per100g.cal * (selectedFood.defaultServingG || 100)) / 100
        : (selectedFood.calories || 0),
      protein: selectedFood.per100g
        ? (selectedFood.per100g.protein * (selectedFood.defaultServingG || 100)) / 100
        : (selectedFood.protein || 0),
      carbs: selectedFood.per100g
        ? (selectedFood.per100g.carbs * (selectedFood.defaultServingG || 100)) / 100
        : (selectedFood.carbs || 0),
      fat: selectedFood.per100g
        ? (selectedFood.per100g.fat * (selectedFood.defaultServingG || 100)) / 100
        : (selectedFood.fat || 0),
      fiber: selectedFood.per100g
        ? (selectedFood.per100g.fiber * (selectedFood.defaultServingG || 100)) / 100
        : (selectedFood.fiber || 0),
    };
    return calculateScaledNutrition(baseFood, effectiveGrams);
  }, [selectedFood, effectiveGrams]);

  // ── Add to Meal Handler (Immediate Save via service) ─────────────────────────
  const handleAddToMeal = useCallback(() => {
    if (!selectedFood || effectiveGrams <= 0 || !nutritionPreview) return;
    onLog({
      food_id: selectedFood.id || null,
      food_name: selectedFood.name || selectedFood.food_name,
      meal_type: targetMealSlot,
      quantity_g: effectiveGrams,
      calories: nutritionPreview.calories,
      protein: nutritionPreview.protein,
      carbs: nutritionPreview.carbs,
      fat: nutritionPreview.fat,
      fiber: nutritionPreview.fiber,
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
  }, [selectedFood, effectiveGrams, nutritionPreview, targetMealSlot, onLog, onClose]);

  // ── Quick Add Handler (Direct tap on '+' button from list) ───────────────────
  const handleQuickAdd = useCallback((food, e) => {
    if (e) e.stopPropagation();
    const servingG = food.defaultServingG || food.serving_size_g || 100;
    const baseCalories = food.per100g
      ? Math.round((food.per100g.cal * servingG) / 100)
      : Math.round(food.calories || 0);

    onLog({
      food_id: food.id || null,
      food_name: food.name || food.food_name,
      meal_type: targetMealSlot,
      quantity_g: servingG,
      calories: baseCalories,
      protein: food.protein || (food.per100g ? Math.round((food.per100g.protein * servingG) / 100) : 0),
      carbs: food.carbs || (food.per100g ? Math.round((food.per100g.carbs * servingG) / 100) : 0),
      fat: food.fat || (food.per100g ? Math.round((food.per100g.fat * servingG) / 100) : 0),
      fiber: food.fiber || (food.per100g ? Math.round((food.per100g.fiber * servingG) / 100) : 0),
      preparation_state: food.preparationState || null,
      source_type: food.sourceType || (food.isPersonal ? 'personal_library' : 'canonical_catalog'),
      nutrition_snapshot: food.per100g ? {
        per100g: food.per100g,
        servingSizeG: servingG,
        servingLabel: food.servingLabel || `${servingG}g`,
        preparationState: food.preparationState || 'raw',
        sourceType: food.sourceType || 'canonical_catalog',
        sourceName: food.sourceName || 'ZYRBIT',
        loggedAt: new Date().toISOString(),
      } : null,
    });
    onClose();
  }, [targetMealSlot, onLog, onClose]);

  // ── Personal Food Form Handlers ──────────────────────────────────────────────
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
    setView('custom');
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
      category: customCategory,
      is_favorite: true,
    };

    try {
      if (editingPersonalFood && onUpdatePersonalFood) {
        await onUpdatePersonalFood({ ...editingPersonalFood, ...foodPayload });
      } else if (onCreatePersonalFood) {
        await onCreatePersonalFood(foodPayload);
      }
      setView('picker');
      setActiveTab('favorites');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mealLabel = targetMealSlot.charAt(0).toUpperCase() + targetMealSlot.slice(1);

  // ════════════════════════════════════════════════════════════════════════════
  // 1. FLOW 7: PREPARATION AMBIGUITY CLARIFICATION SHEET
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'ambiguity' && ambiguityBaseFood) {
    const foodTitle = ambiguityBaseFood.name || ambiguityBaseFood.food_name || 'food';
    return (
      <FBottomSheet title={`Add to ${mealLabel}`} onClose={() => setView('picker')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '4px 0 10px' }}>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: FC.text, marginBottom: '6px' }}>
              Which {foodTitle.toLowerCase()} do you mean?
            </div>
            <div style={{ fontSize: '13px', color: FC.sub, lineHeight: '1.4' }}>
              {foodTitle} can vary significantly in calories depending on preparation method.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ambiguityCandidates.map((candidate) => {
              const cCal = candidate.per100g ? candidate.per100g.cal : (candidate.calories || 0);
              const cServing = candidate.servingLabel || `${candidate.defaultServingG || 100}g`;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => openFoodDetails(candidate)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: '16px',
                    background: SURFACE_CARD,
                    border: `1px solid ${BORDER_SUBTLE}`,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT_GREEN; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER_SUBTLE; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}>
                      {candidate.emoji || '🥣'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: FC.text }}>
                        {candidate.name}
                      </div>
                      <div style={{ fontSize: '12px', color: FC.muted, marginTop: '2px' }}>
                        {Math.round(cCal)} cal · {cServing}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: `2px solid ${BORDER_SUBTLE}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <ChevronRight size={14} color={FC.muted} />
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setView('picker')}
            style={{
              background: 'transparent',
              border: 'none',
              color: FC.sub,
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px',
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            ← Back to Search
          </button>
        </div>
      </FBottomSheet>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 2. FLOW 3: FOOD DETAILS & PORTION SELECTION SHEET
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'details' && selectedFood) {
    const isFav = favoriteFoodNames.has((selectedFood.name || selectedFood.food_name || '').toLowerCase().trim());
    const baseG = selectedFood.defaultServingG || selectedFood.serving_size_g || 100;
    const baseCal = selectedFood.per100g
      ? (selectedFood.per100g.cal * baseG) / 100
      : (selectedFood.calories || 0);

    const portionOptions = [
      { label: `1/2 serving (${Math.round(baseG * 0.5)}g)`, mult: 0.5, cals: Math.round(baseCal * 0.5) },
      { label: `1 serving (${Math.round(baseG)}g)`, mult: 1.0, cals: Math.round(baseCal) },
      { label: `1.5 servings (${Math.round(baseG * 1.5)}g)`, mult: 1.5, cals: Math.round(baseCal * 1.5) },
    ];

    return (
      <FBottomSheet title={`Add to ${mealLabel}`} onClose={onClose}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '10px' }}>
          {/* Top Bar with Back and Favorite */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => setView('picker')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'transparent',
                border: 'none',
                color: FC.sub,
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '4px 0',
              }}
            >
              <ArrowLeft size={16} /> Back
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                onClick={() => onToggleFavorite(selectedFood)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  color: isFav ? '#EF4444' : FC.muted,
                }}
                title={isFav ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Heart size={20} fill={isFav ? '#EF4444' : 'transparent'} stroke={isFav ? '#EF4444' : FC.muted} />
              </button>
            )}
          </div>

          {/* Hero Food Visual Card */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
            <div style={{
              width: '84px',
              height: '84px',
              borderRadius: '24px',
              background: SURFACE_CARD,
              border: `1px solid ${BORDER_SUBTLE}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              {selectedFood.emoji || '🍽️'}
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: FC.text }}>
                {selectedFood.name || selectedFood.food_name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: FC.muted }}>
                  {selectedFood.category ? selectedFood.category.charAt(0).toUpperCase() + selectedFood.category.slice(1) : 'Food'}
                </span>
                {selectedFood.preparationState && selectedFood.preparationState !== 'raw' && (
                  <span style={{
                    background: 'rgba(31,163,111,0.12)',
                    border: '1px solid rgba(31,163,111,0.25)',
                    borderRadius: '6px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: ACCENT_GREEN,
                    textTransform: 'capitalize',
                  }}>
                    {selectedFood.preparationState}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Macro Summary Card (4 Pills) */}
          {nutritionPreview && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px',
              background: SURFACE_CARD,
              border: `1px solid ${BORDER_SUBTLE}`,
              borderRadius: '18px',
              padding: '12px',
            }}>
              <MacroSummaryCell label="Calories" value={`${Math.round(nutritionPreview.calories)}`} unit="kcal" color={FC.text} />
              <MacroSummaryCell label="Protein"  value={`${nutritionPreview.protein}`} unit="g" color={FC.protein} />
              <MacroSummaryCell label="Carbs"    value={`${nutritionPreview.carbs}`}   unit="g" color={FC.carbs} />
              <MacroSummaryCell label="Fat"      value={`${nutritionPreview.fat}`}     unit="g" color={FC.fat} />
            </div>
          )}

          {/* Target Meal Slot Selector */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: FC.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Add to Meal Slot
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
              {MEAL_SLOTS.map((slot) => {
                const isSelected = targetMealSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTargetMealSlot(slot.id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(31,163,111,0.15)' : SURFACE_CARD,
                      border: `1px solid ${isSelected ? ACCENT_GREEN : BORDER_SUBTLE}`,
                      color: isSelected ? ACCENT_GREEN : FC.sub,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Select Portion Size (Radio Options) */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: FC.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>
              Select Portion Size
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {portionOptions.map((opt) => {
                const isSelected = !isCustomMode && portionMultiplier === opt.mult;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setPortionMultiplier(opt.mult);
                      setIsCustomMode(false);
                      setCustomAmountG('');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '14px',
                      background: isSelected ? 'rgba(31,163,111,0.08)' : SURFACE_CARD,
                      border: `1px solid ${isSelected ? ACCENT_GREEN : BORDER_SUBTLE}`,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? FC.text : FC.sub }}>
                      {opt.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: FC.muted }}>
                        {opt.cals} cal
                      </span>
                      <div style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: `2px solid ${isSelected ? ACCENT_GREEN : FC.muted}`,
                        background: isSelected ? ACCENT_GREEN : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {isSelected && <Check size={12} color="#000" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Custom Amount Option */}
              <div style={{
                borderRadius: '14px',
                background: isCustomMode ? 'rgba(31,163,111,0.08)' : SURFACE_CARD,
                border: `1px solid ${isCustomMode ? ACCENT_GREEN : BORDER_SUBTLE}`,
                padding: '12px 16px',
              }}>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: isCustomMode ? 700 : 500, color: isCustomMode ? FC.text : FC.sub }}>
                    ⚖️ Custom Amount
                  </span>
                  <ChevronRight size={16} color={FC.muted} />
                </button>

                {isCustomMode && (
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FInput
                      type="number"
                      placeholder="e.g. 150"
                      value={customAmountG}
                      onChange={(e) => setCustomAmountG(e.target.value)}
                      style={{ maxWidth: '140px', padding: '8px 12px' }}
                      autoFocus
                    />
                    <span style={{ fontSize: '13px', color: FC.muted, fontWeight: 600 }}>grams</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Primary Action Button (Flow 3 & 8) */}
          <button
            type="button"
            onClick={handleAddToMeal}
            disabled={!nutritionPreview || effectiveGrams <= 0}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '16px',
              background: (!nutritionPreview || effectiveGrams <= 0) ? FC.dim : ACCENT_GREEN,
              color: (!nutritionPreview || effectiveGrams <= 0) ? FC.muted : '#FFFFFF',
              border: 'none',
              fontSize: '15px',
              fontWeight: 800,
              cursor: (!nutritionPreview || effectiveGrams <= 0) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 16px rgba(31,163,111,0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            Add to {mealLabel}
          </button>
        </div>
      </FBottomSheet>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 3. FLOW 6: CREATE PERSONAL FOOD SHEET
  // ════════════════════════════════════════════════════════════════════════════
  if (view === 'custom') {
    return (
      <FBottomSheet title={editingPersonalFood ? 'Edit Personal Food' : 'Create Personal Food'} onClose={() => setView('picker')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '10px' }}>
          {/* Segmented Control: Single Food vs Recipe */}
          <div style={{ display: 'flex', background: SURFACE_CARD, borderRadius: '12px', padding: '3px' }}>
            <button
              type="button"
              onClick={() => setPersonalTab('single')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                background: personalTab === 'single' ? ACCENT_GREEN : 'transparent',
                color: personalTab === 'single' ? '#FFF' : FC.sub,
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Single Food
            </button>
            <button
              type="button"
              onClick={() => setPersonalTab('recipe')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '10px',
                background: personalTab === 'recipe' ? ACCENT_GREEN : 'transparent',
                color: personalTab === 'recipe' ? '#FFF' : FC.sub,
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Recipe
            </button>
          </div>

          {/* Food Name Field */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: FC.muted, marginBottom: '6px' }}>Food Name *</div>
            <FInput
              placeholder="e.g. My Homemade Oats"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category Dropdown */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: FC.muted, marginBottom: '6px' }}>Category</div>
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                background: SURFACE_CARD,
                border: `1px solid ${BORDER_SUBTLE}`,
                color: FC.text,
                fontSize: '13px',
                outline: 'none',
              }}
            >
              {BROWSE_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} style={{ background: '#15181B' }}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Nutrition Per 100g */}
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: FC.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
              Nutrition (per 100g)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Calories (kcal) *</div>
                <FInput type="number" placeholder="370" value={customCal} onChange={(e) => setCustomCal(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Protein (g)</div>
                <FInput type="number" placeholder="13" value={customProtein} onChange={(e) => setCustomProtein(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Carbs (g)</div>
                <FInput type="number" placeholder="60" value={customCarbs} onChange={(e) => setCustomCarbs(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Fat (g)</div>
                <FInput type="number" placeholder="7" value={customFat} onChange={(e) => setCustomFat(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Serving Size */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Serving Size (g) *</div>
              <FInput type="number" placeholder="100" value={customServing} onChange={(e) => setCustomServing(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize: '10px', color: FC.muted, marginBottom: '4px' }}>Fiber (g, optional)</div>
              <FInput type="number" placeholder="3" value={customFiber} onChange={(e) => setCustomFiber(e.target.value)} />
            </div>
          </div>

          <FBtn
            label={isSubmitting ? 'Saving...' : (editingPersonalFood ? 'Update Personal Food 💾' : 'Save to My Foods ⭐')}
            onClick={handleSavePersonalFood}
            disabled={!customName.trim() || !customCal || isSubmitting}
            color={ACCENT_GREEN}
          />

          {editingPersonalFood && onDeletePersonalFood && (
            <button
              type="button"
              onClick={async () => {
                if (isSubmitting) return;
                setIsSubmitting(true);
                try {
                  await onDeletePersonalFood(editingPersonalFood.id);
                  setView('picker');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              style={{
                background: 'transparent',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#EF4444',
                padding: '10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Delete from My Foods 🗑️
            </button>
          )}
        </div>
      </FBottomSheet>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // 4. MAIN FLOW 1 & FLOW 2: FOOD PICKER & SEARCH
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <FBottomSheet title={`Add to ${mealLabel}`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Search Field (Flow 1 & 2) */}
        <div style={{ position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '14px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: FC.muted,
              pointerEvents: 'none',
            }}
          />
          <FInput
            placeholder="Search for food (e.g. roti, rice, egg...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ paddingLeft: '40px', paddingRight: query ? '36px' : '14px' }}
            autoFocus={false}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: FC.sub,
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* 3 Tabs: Recent | Favorites | All Foods (Only visible when not searching) */}
        {!isSearching && (
          <div style={{
            display: 'flex',
            borderBottom: `1px solid ${BORDER_SUBTLE}`,
            marginBottom: '4px',
          }}>
            {[
              { id: 'recent',    label: 'Recent' },
              { id: 'favorites', label: 'Favorites' },
              { id: 'all',       label: 'All Foods' },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedCategory(null);
                  }}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `2px solid ${isActive ? ACCENT_GREEN : 'transparent'}`,
                    color: isActive ? ACCENT_GREEN : FC.sub,
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Content List Area */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          maxHeight: '360px',
          overflowY: 'auto',
          paddingRight: '2px',
        }}>
          {/* SEARCH SUGGESTIONS VIEW (FLOW 2) */}
          {isSearching ? (
            <>
              {/* Personal Foods Matching Query */}
              {matchingPersonalFoods.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: ACCENT_GREEN, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '4px 0 6px 4px' }}>
                    Personal Foods ({matchingPersonalFoods.length})
                  </div>
                  {matchingPersonalFoods.map((pf) => (
                    <FoodItemRow
                      key={pf.id}
                      food={pf}
                      isPersonal
                      isFavorite={true}
                      onSelect={() => openFoodDetails({
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
                      onQuickAdd={(e) => handleQuickAdd(pf, e)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              )}

              {/* Canonical Search Results */}
              {canonicalSearchResults.length > 0 && (
                <div>
                  {matchingPersonalFoods.length > 0 && (
                    <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', margin: '8px 0 6px 4px' }}>
                      Foods ({canonicalSearchResults.length})
                    </div>
                  )}
                  {canonicalSearchResults.map((food) => {
                    const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                    return (
                      <FoodItemRow
                        key={food.id}
                        food={food}
                        isFavorite={isFav}
                        onSelect={() => checkAmbiguityAndOpen(food)}
                        onQuickAdd={(e) => handleQuickAdd(food, e)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    );
                  })}
                </div>
              )}

              {/* No Search Results */}
              {matchingPersonalFoods.length === 0 && canonicalSearchResults.length === 0 && (
                <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Search size={24} style={{ color: FC.muted, opacity: 0.5 }} />
                  <div style={{ fontSize: '14px', fontWeight: 700, color: FC.text }}>
                    No matching foods found
                  </div>
                  <div style={{ fontSize: '12px', color: FC.muted, maxWidth: '240px' }}>
                    Try another keyword or create a personal food definition.
                  </div>
                </div>
              )}
            </>
          ) : (
            /* TABBED VIEWS (FLOW 1, 5, 8) */
            <>
              {/* TAB 1: RECENT */}
              {activeTab === 'recent' && (
                <>
                  {recentFoods.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Clock size={24} style={{ color: FC.muted, opacity: 0.5 }} />
                      <div style={{ fontSize: '13px', color: FC.sub, fontWeight: 600 }}>
                        Foods you log will appear here.
                      </div>
                    </div>
                  ) : (
                    recentFoods.map((food) => {
                      const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                      return (
                        <FoodItemRow
                          key={food.id}
                          food={food}
                          isFavorite={isFav}
                          onSelect={() => checkAmbiguityAndOpen(food)}
                          onQuickAdd={(e) => handleQuickAdd(food, e)}
                          onToggleFavorite={onToggleFavorite}
                        />
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: FAVORITES (FLOW 5) */}
              {activeTab === 'favorites' && (
                <>
                  {favoriteFoods.length === 0 ? (
                    <div style={{ padding: '32px 16px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Heart size={24} style={{ color: FC.muted, opacity: 0.5 }} />
                      <div style={{ fontSize: '13px', color: FC.sub, fontWeight: 600 }}>
                        Your favorite foods will appear here.
                      </div>
                    </div>
                  ) : (
                    favoriteFoods.map((pf) => (
                      <FoodItemRow
                        key={pf.id}
                        food={pf}
                        isPersonal
                        isFavorite={true}
                        onSelect={() => openFoodDetails({
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
                        onQuickAdd={(e) => handleQuickAdd(pf, e)}
                        onToggleFavorite={onToggleFavorite}
                      />
                    ))
                  )}
                </>
              )}

              {/* TAB 3: ALL FOODS & CATEGORY BROWSE (FLOW 8) */}
              {activeTab === 'all' && (
                <>
                  {selectedCategory ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(null)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'transparent',
                            border: 'none',
                            color: ACCENT_GREEN,
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <ChevronLeft size={16} /> All Categories
                        </button>
                        <span style={{ fontSize: '12px', color: FC.muted }}>
                          {selectedCategory.emoji} {selectedCategory.label}
                        </span>
                      </div>
                      {categoryBrowseFoods.map((food) => {
                        const isFav = favoriteFoodNames.has((food.name || '').toLowerCase().trim());
                        return (
                          <FoodItemRow
                            key={food.id}
                            food={food}
                            isFavorite={isFav}
                            onSelect={() => checkAmbiguityAndOpen(food)}
                            onQuickAdd={(e) => handleQuickAdd(food, e)}
                            onToggleFavorite={onToggleFavorite}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {BROWSE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            background: SURFACE_CARD,
                            border: `1px solid ${BORDER_SUBTLE}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{cat.emoji}</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: FC.text }}>
                              {cat.label}
                            </span>
                          </div>
                          <ChevronRight size={16} color={FC.muted} />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Bottom CTA: (+) Create Personal Food (Flow 1, 5, 8) */}
        <button
          type="button"
          onClick={() => handleOpenCustomForm()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '14px',
            borderRadius: '16px',
            background: SURFACE_CARD,
            border: `1px dashed ${BORDER_SUBTLE}`,
            color: FC.text,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            width: '100%',
            marginTop: '4px',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT_GREEN; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = BORDER_SUBTLE; }}
        >
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            border: `1.5px solid ${ACCENT_GREEN}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: ACCENT_GREEN,
          }}>
            <Plus size={14} strokeWidth={2.5} />
          </div>
          Create Personal Food
        </button>
      </div>
    </FBottomSheet>
  );
}

// ── Standard Food Item Row Component (Flow 1, 2, 5) ───────────────────────────
function FoodItemRow({
  food,
  isPersonal = false,
  isFavorite = false,
  onSelect,
  onQuickAdd,
  onToggleFavorite,
}) {
  const actualIsPersonal = isPersonal || Boolean(food.isPersonal);
  const name = food.name || food.food_name || 'Food';
  const emoji = actualIsPersonal ? '⭐' : (food.emoji || '🍽️');
  const serving = actualIsPersonal
    ? `${food.serving_size_g || 100}g`
    : (food.servingLabel || (food.defaultServingG ? `${food.defaultServingG}g` : '100g'));

  const calories = actualIsPersonal
    ? Math.round(food.calories || 0)
    : Math.round(food.calories || (food.per100g ? (food.per100g.cal * (food.defaultServingG || 100)) / 100 : 0));

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 12px',
        borderRadius: '14px',
        background: 'transparent',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
        width: '100%',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = SURFACE_CARD; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Left: Thumbnail & Food Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          flexShrink: 0,
        }}>
          {emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              color: FC.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {name}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {actualIsPersonal && (
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                color: ACCENT_GREEN,
                background: 'rgba(31,163,111,0.12)',
                padding: '1px 6px',
                borderRadius: '4px',
              }}>
                • Personal Food
              </span>
            )}
            <span style={{ fontSize: '11px', color: FC.muted }}>
              {calories} cal · {serving}
            </span>
            {food.preparationState && food.preparationState !== 'raw' && !isPersonal && (
              <span style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '4px',
                padding: '0 4px',
                fontSize: '10px',
                color: FC.sub,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}>
                {food.preparationState}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions (Heart + Quick Add '+') */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
        {(isPersonal || isFavorite || onToggleFavorite) ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite?.(food);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: onToggleFavorite ? 'pointer' : 'default',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            title={isFavorite ? 'Remove favorite' : 'Mark favorite'}
          >
            <span style={{ color: (isPersonal || isFavorite) ? '#EF4444' : FC.muted, fontSize: '14px' }}>
              {isPersonal || isFavorite ? '❤️' : '🤍'}
            </span>
          </button>
        ) : null}

        {onQuickAdd && (
          <button
            type="button"
            onClick={onQuickAdd}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              border: `1.5px solid ${ACCENT_GREEN}`,
              background: 'rgba(31,163,111,0.1)',
              color: ACCENT_GREEN,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              transition: 'transform 0.1s ease',
            }}
            title="Quick Add to Meal"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Macro Summary Cell (Flow 3) ───────────────────────────────────────────────
function MacroSummaryCell({ label, value, unit, color }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '6px 4px',
    }}>
      <div style={{ fontSize: '16px', fontWeight: 800, color, lineHeight: '1.2' }}>
        {value}
        <span style={{ fontSize: '11px', fontWeight: 600, color: FC.muted, marginLeft: '2px' }}>{unit}</span>
      </div>
      <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}
