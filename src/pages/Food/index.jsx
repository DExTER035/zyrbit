import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
  HelpCircle,
  Flame,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabase/index.js';
import { resolveFoodInputV2 } from '../../dex/resolvers/foodResolverV2.js';
import { calculateScaledNutrition, calculateDailyTotals } from '../../engines/food/index.js';
import {
  todayStr,
  batchLogMeals,
  deleteMealLog,
  updateMealLog,
  createPersonalFood,
  updatePersonalFood,
  deletePersonalFood,
} from '../../services/healthService.js';
import FoodPicker from '../../components/domain/food/FoodPicker.jsx';
import EditLogModal from '../../components/domain/food/EditLogModal.jsx';
import GoalSettingsModal from '../../components/domain/food/GoalSettingsModal.jsx';
import HeatmapGrid from '../../components/common/HeatmapGrid.jsx';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';

const MEAL_SLOTS = [
  { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { id: 'lunch', label: 'Lunch', emoji: '☀️' },
  { id: 'dinner', label: 'Dinner', emoji: '🌙' },
  { id: 'snack', label: 'Snack', emoji: '🍎' },
];

const QUICK_EXAMPLES = [
  '80g oats + 200ml milk + 5 dates',
  '2 eggs and 2 rotis',
  '100g paneer',
  'I had rice and dal for lunch',
  "Repeat yesterday's breakfast",
];

export default function Food() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Today's meals & persistence state
  const [mealLogs, setMealLogs] = useState([]);
  const [personalFoods, setPersonalFoods] = useState([]);
  const [thirtyDayLogs, setThirtyDayLogs] = useState([]);
  const [settings, setSettings] = useState({
    calorie_goal: 2200,
    protein_goal: 130,
    carbs_goal: 250,
    fat_goal: 70,
    fiber_goal: 30,
  });

  // Natural Language Input State
  const [foodInput, setFoodInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Clarification / Ambiguity State
  const [clarification, setClarification] = useState(null);

  // Editable Meal Preview State
  const [previewMeal, setPreviewMeal] = useState(null);

  // Modals state
  const [pickerMealType, setPickerMealType] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // ─── Fetch All Data from Supabase ──────────────────────────────────────────
  const loadData = useCallback(async (userId) => {
    if (!userId) return;
    const today = todayStr();
    const d30 = new Date();
    d30.setDate(d30.getDate() - 30);
    d30.setMinutes(d30.getMinutes() - d30.getTimezoneOffset());
    const thirtyDaysAgoStr = d30.toISOString().split('T')[0];

    try {
      const [todayRes, personalRes, settingsRes, thirtyDayRes] = await Promise.all([
        supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .order('created_at', { ascending: true }),
        supabase
          .from('user_food_library')
          .select('*')
          .eq('user_id', userId)
          .order('food_name', { ascending: true }),
        supabase
          .from('food_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('meal_logs')
          .select('id, date')
          .eq('user_id', userId)
          .gte('date', thirtyDaysAgoStr),
      ]);

      setMealLogs(todayRes.data || []);
      setPersonalFoods(personalRes.data || []);
      if (settingsRes.data) {
        setSettings({
          calorie_goal: Number(settingsRes.data.calorie_goal) || 2200,
          protein_goal: Number(settingsRes.data.protein_goal) || 130,
          carbs_goal: Number(settingsRes.data.carbs_goal) || 250,
          fat_goal: Number(settingsRes.data.fat_goal) || 70,
          fiber_goal: Number(settingsRes.data.fiber_goal) || 30,
        });
      }
      setThirtyDayLogs(thirtyDayRes.data || []);
    } catch (err) {
      console.warn('Failed to load food telemetry:', err);
    }
  }, []);

  // ─── Auth Verification ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadData(session.user.id);
      }
    });
  }, [navigate, loadData]);

  // ─── Computed Daily Nutrition Totals ───────────────────────────────────────
  const dailyTotals = useMemo(() => {
    return calculateDailyTotals(mealLogs);
  }, [mealLogs]);

  // ─── 30-Day Activity Heatmap Data Map ──────────────────────────────────────
  const heatmapDataMap = useMemo(() => {
    const map = {};
    (thirtyDayLogs || []).forEach((item) => {
      if (item.date) {
        map[item.date] = (map[item.date] || 0) + 1;
      }
    });
    return map;
  }, [thirtyDayLogs]);

  // ─── Grouped Meals by Slot ─────────────────────────────────────────────────
  const groupedMeals = useMemo(() => {
    const groups = { breakfast: [], lunch: [], dinner: [], snack: [] };
    (mealLogs || []).forEach((meal) => {
      const type = (meal.meal_type || 'snack').toLowerCase();
      if (groups[type]) {
        groups[type].push(meal);
      } else {
        groups.snack.push(meal);
      }
    });
    return groups;
  }, [mealLogs]);

  // ─── Handle Natural-Language Meal Resolution ───────────────────────────────
  const handleAnalyzeMeal = async (overrideInput) => {
    const textToAnalyze = (overrideInput ?? foodInput).trim();
    if (!textToAnalyze || !user || isResolving) return;

    setIsResolving(true);
    setClarification(null);

    try {
      // 1. Check for "Repeat yesterday" commands
      if (/repeat\s+yesterday/i.test(textToAnalyze)) {
        let requestedSlot = null;
        if (/breakfast/i.test(textToAnalyze)) requestedSlot = 'breakfast';
        else if (/lunch/i.test(textToAnalyze)) requestedSlot = 'lunch';
        else if (/dinner/i.test(textToAnalyze)) requestedSlot = 'dinner';
        else if (/snack/i.test(textToAnalyze)) requestedSlot = 'snack';

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yStr = yesterday.toISOString().split('T')[0];

        let query = supabase
          .from('meal_logs')
          .select('*')
          .eq('user_id', user.id)
          .eq('date', yStr);

        if (requestedSlot) {
          query = query.eq('meal_type', requestedSlot);
        }

        const { data: yesterdayMeals, error: yErr } = await query;

        if (yErr || !yesterdayMeals || yesterdayMeals.length === 0) {
          setClarification({
            type: 'empty_yesterday',
            message: requestedSlot
              ? `No ${requestedSlot} logged yesterday to repeat.`
              : 'No meals found logged yesterday to repeat.',
          });
          setIsResolving(false);
          return;
        }

        // Convert yesterday's meals to preview items
        const previewItems = yesterdayMeals.map((m, idx) => ({
          tempId: `item-${Date.now()}-${idx}`,
          foodId: m.food_id,
          canonicalName: m.food_name,
          quantityG: m.quantity_g,
          unitLabel: 'g',
          calories: m.calories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          per100g: m.nutrition_snapshot?.per100g || {
            cal: Math.round(((m.calories || 0) / (m.quantity_g || 100)) * 100),
            protein: Math.round(((m.protein || 0) / (m.quantity_g || 100)) * 100 * 10) / 10,
            carbs: Math.round(((m.carbs || 0) / (m.quantity_g || 100)) * 100 * 10) / 10,
            fat: Math.round(((m.fat || 0) / (m.quantity_g || 100)) * 100 * 10) / 10,
            fiber: Math.round(((m.fiber || 0) / (m.quantity_g || 100)) * 100 * 10) / 10,
          },
          preparationState: m.preparation_state || 'cooked',
          sourceType: m.source_type || 'repeat_log',
          confidence: m.confidence ?? 1.0,
          nutritionSnapshot: m.nutrition_snapshot || null,
        }));

        setPreviewMeal({
          mealType: requestedSlot || yesterdayMeals[0]?.meal_type || 'lunch',
          items: previewItems,
        });
        setIsResolving(false);
        return;
      }

      // 2. Standard Natural-Language Resolution via deterministic FoodResolverV2
      const res = resolveFoodInputV2(textToAnalyze, {
        personalFoods,
        preferredMealType: 'lunch',
      });

      if (!res.success) {
        if (res.ambiguous) {
          // Material Ambiguity (>20% Calorie spread)
          setClarification({
            type: 'ambiguity',
            targetName: res.targetName || 'oats',
            question: res.question,
            candidates: res.candidates,
          });
        } else {
          // Unresolved / unknown food
          setClarification({
            type: 'unknown',
            message: res.question || 'Could not recognize this food item.',
            unresolved: res.unresolved || [],
          });
        }
        setIsResolving(false);
        return;
      }

      // 3. Build Editable Meal Preview
      const items = (res.items || []).map((item, idx) => ({
        tempId: `item-${Date.now()}-${idx}`,
        foodId: item.foodId,
        canonicalName: item.canonicalName,
        quantityG: item.quantityG,
        unitLabel: 'g',
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        per100g: item.nutritionSnapshot?.per100g || {
          cal: Math.round(((item.calories || 0) / (item.quantityG || 100)) * 100),
          protein: Math.round(((item.protein || 0) / (item.quantityG || 100)) * 100 * 10) / 10,
          carbs: Math.round(((item.carbs || 0) / (item.quantityG || 100)) * 100 * 10) / 10,
          fat: Math.round(((item.fat || 0) / (item.quantityG || 100)) * 100 * 10) / 10,
          fiber: Math.round(((item.fiber || 0) / (item.quantityG || 100)) * 100 * 10) / 10,
        },
        preparationState: item.preparationState || 'cooked',
        sourceType: item.sourceType || 'curated_seed',
        confidence: item.confidence ?? 1.0,
        nutritionSnapshot: item.nutritionSnapshot,
      }));

      setPreviewMeal({
        mealType: res.mealParams?.mealType || 'lunch',
        items,
      });
    } catch (err) {
      setClarification({
        type: 'error',
        message: `Analysis error: ${err.message}`,
      });
    } finally {
      setIsResolving(false);
    }
  };

  // ─── Resolve Ambiguity Option ──────────────────────────────────────────────
  const handleSelectAmbiguityCandidate = (candidate) => {
    // Inject the selected preparation state into the phrase and re-analyze
    const prep = candidate.preparationState;
    const target = clarification?.targetName || 'oats';
    let updatedText = foodInput;
    if (prep) {
      // Replace target token with "<prep> <target>" so it resolves deterministically regardless of position
      const targetRegex = new RegExp(`(?:(?:dry|cooked|raw|boiled|steamed|fried|roasted)\\s+)?\\b${target}\\b`, 'i');
      if (targetRegex.test(foodInput)) {
        updatedText = foodInput.replace(targetRegex, `${prep} ${target}`).replace(/\s+/g, ' ').trim();
      } else {
        updatedText = `${prep} ${foodInput}`.trim();
      }
      setFoodInput(updatedText);
    }
    setClarification(null);
    handleAnalyzeMeal(updatedText);
  };

  // ─── Update Item Quantity in Preview ───────────────────────────────────────
  const handleUpdateItemQuantity = (itemIndex, newQty) => {
    if (!previewMeal) return;
    const qty = Math.max(1, Number(newQty) || 0);

    const updatedItems = previewMeal.items.map((item, idx) => {
      if (idx !== itemIndex) return item;
      const baseNutrition = {
        calories: item.per100g?.cal || 0,
        protein: item.per100g?.protein || 0,
        carbs: item.per100g?.carbs || 0,
        fat: item.per100g?.fat || 0,
        fiber: item.per100g?.fiber || 0,
        serving_size_g: 100,
      };
      const scaled = calculateScaledNutrition(baseNutrition, qty);
      return {
        ...item,
        quantityG: qty,
        calories: scaled.calories,
        protein: scaled.protein,
        carbs: scaled.carbs,
        fat: scaled.fat,
        fiber: scaled.fiber,
      };
    });

    setPreviewMeal({ ...previewMeal, items: updatedItems });
  };

  // ─── Remove Item from Preview ──────────────────────────────────────────────
  const handleRemovePreviewItem = (itemIndex) => {
    if (!previewMeal) return;
    const remaining = previewMeal.items.filter((_, idx) => idx !== itemIndex);
    if (remaining.length === 0) {
      setPreviewMeal(null);
    } else {
      setPreviewMeal({ ...previewMeal, items: remaining });
    }
  };

  // ─── Confirm & Persist Meal to Supabase ────────────────────────────────────
  const handleConfirmLogMeal = async () => {
    if (!user || !previewMeal || isSaving || previewMeal.items.length === 0) return;
    setIsSaving(true);

    try {
      const today = todayStr();
      const itemsToLog = previewMeal.items.map((item) => ({
        food_id: item.foodId || null,
        food_name: item.canonicalName,
        meal_type: previewMeal.mealType,
        quantity_g: item.quantityG,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        nutrition_snapshot: item.nutritionSnapshot || null,
        source_type: item.sourceType || 'natural_language',
        preparation_state: item.preparationState || 'cooked',
        confidence: item.confidence ?? 1.0,
      }));

      const res = await batchLogMeals({
        userId: user.id,
        date: today,
        mealType: previewMeal.mealType,
        items: itemsToLog,
      });

      if (!res.success) {
        showToast(res.error || 'Failed to save meal.', 'error');
        setIsSaving(false);
        return;
      }

      // Success: clear preview and reload persisted data
      showToast(`🍱 ${previewMeal.items.length === 1 ? previewMeal.items[0].canonicalName : 'Meal'} logged!`, 'success');
      setPreviewMeal(null);
      setFoodInput('');
      setClarification(null);

      // Re-fetch persisted state
      await loadData(user.id);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'food_page' } }));
    } catch (err) {
      showToast(`Error saving meal: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Delete Logged Meal Item ───────────────────────────────────────────────
  const handleDeleteMeal = async (logId) => {
    if (!user || !logId) return;
    try {
      const res = await deleteMealLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(res.error || 'Failed to delete meal', 'error');
        return;
      }
      setMealLogs((prev) => prev.filter((m) => m.id !== logId));
      setThirtyDayLogs((prev) => prev.filter((m) => m.id !== logId));
      showToast('🗑 Meal deleted', 'success');
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'food_page' } }));
    } catch (err) {
      showToast(`Error deleting meal: ${err.message}`, 'error');
    }
  };

  // ─── Save Edited Meal from EditLogModal ───────────────────────────────────
  const handleSaveEditedLog = async ({ logId, newQty, newMealType, calories, protein, carbs, fat, fiber }) => {
    if (!user || !logId) return;
    try {
      const res = await updateMealLog({
        userId: user.id,
        logId,
        updates: {
          quantity_g: newQty,
          meal_type: newMealType,
          calories,
          protein,
          carbs,
          fat,
          fiber,
        },
      });
      if (!res.success) {
        showToast(res.error || 'Failed to update meal', 'error');
        return;
      }
      setMealLogs((prev) => prev.map((m) => (m.id === logId ? res.data : m)));
      showToast('✏️ Meal updated', 'success');
      setEditingLog(null);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'food_page' } }));
    } catch (err) {
      showToast(`Error updating meal: ${err.message}`, 'error');
    }
  };

  // ─── Date Formatter ────────────────────────────────────────────────────────
  const todayFormatted = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  // ─── Preview Aggregates ───────────────────────────────────────────────────
  const previewTotals = useMemo(() => {
    if (!previewMeal?.items) return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return {
      calories: previewMeal.items.reduce((s, i) => s + (Math.round(i.calories) || 0), 0),
      protein: Math.round(previewMeal.items.reduce((s, i) => s + (Number(i.protein) || 0), 0) * 10) / 10,
      carbs: Math.round(previewMeal.items.reduce((s, i) => s + (Number(i.carbs) || 0), 0) * 10) / 10,
      fat: Math.round(previewMeal.items.reduce((s, i) => s + (Number(i.fat) || 0), 0) * 10) / 10,
      fiber: Math.round(previewMeal.items.reduce((s, i) => s + (Number(i.fiber) || 0), 0) * 10) / 10,
    };
  }, [previewMeal]);



  return (
    <div
      style={{
        background: '#0E0F13',
        minHeight: '100vh',
        color: '#ECE8DF',
        position: 'relative',
        paddingBottom: '100px',
      }}
    >
      {/* ─── 1. HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 20px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <button
            type="button"
            onClick={() => navigate('/health')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9A978F',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 0 8px 0',
            }}
          >
            <ArrowLeft size={16} />
            <span>Health</span>
          </button>

          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#ECE8DF',
            letterSpacing: '-0.03em',
            margin: '0 0 4px',
          }}>
            Food
          </h1>
          <div style={{ fontSize: '13px', color: '#9A978F' }}>
            Calm, intentional fuel tracking for the Winter Arc.
          </div>
        </div>

        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '9999px',
          padding: '6px 14px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#ECE8DF',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Calendar size={13} color="#E9B44C" />
          <span>Today · {todayFormatted}</span>
        </div>
      </div>

      {/* ─── 2. PRIMARY NATURAL-LANGUAGE INPUT CARD ─────────────────────────── */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '20px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label
              htmlFor="natural-food-input"
              style={{
                fontSize: '14px',
                fontWeight: 700,
                color: '#ECE8DF',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={16} color="#E9B44C" />
              <span>What did you eat?</span>
            </label>

            <button
              type="button"
              onClick={() => setPickerMealType('lunch')}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 0',
              }}
            >
              <Search size={13} />
              <span>+ Add manually</span>
            </button>
          </div>

          <textarea
            id="natural-food-input"
            value={foodInput}
            onChange={(e) => {
              setFoodInput(e.target.value);
              if (clarification) setClarification(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAnalyzeMeal();
              }
            }}
            placeholder="80g oats + 200ml milk + 5 dates"
            rows={2}
            style={{
              width: '100%',
              background: '#0E0F13',
              border: '1px solid #26272D',
              borderRadius: '14px',
              padding: '12px 14px',
              color: '#ECE8DF',
              fontSize: '14px',
              resize: 'none',
              outline: 'none',
              lineHeight: 1.5,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />

          {/* Quick Example Suggestions */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            {QUICK_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  setFoodInput(ex);
                  handleAnalyzeMeal(ex);
                }}
                style={{
                  background: '#181920',
                  border: '1px solid #26272D',
                  borderRadius: '10px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  color: '#9A978F',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ECE8DF'; e.currentTarget.style.borderColor = '#3A3B40'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#9A978F'; e.currentTarget.style.borderColor = '#26272D'; }}
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
            <button
              type="button"
              id="analyze-meal-btn"
              disabled={isResolving || !foodInput.trim()}
              onClick={() => handleAnalyzeMeal()}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: '14px',
                background: foodInput.trim() ? '#E9B44C' : '#26272D',
                border: 'none',
                color: foodInput.trim() ? '#0B0D0F' : '#6B7280',
                fontSize: '13px',
                fontWeight: 800,
                cursor: foodInput.trim() ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              {isResolving ? (
                <span>Analyzing meal...</span>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Analyze meal</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ─── 3. CLARIFICATION STATE (AMBIGUITY OR UNKNOWN) ────────────────── */}
      {clarification && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: clarification.type === 'ambiguity' ? 'rgba(233, 180, 76, 0.08)' : 'rgba(239, 68, 68, 0.08)',
            border: `1px solid ${clarification.type === 'ambiguity' ? 'rgba(233, 180, 76, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {clarification.type === 'ambiguity' ? (
                <HelpCircle size={18} color="#E9B44C" />
              ) : (
                <AlertCircle size={18} color="#EF4444" />
              )}
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: clarification.type === 'ambiguity' ? '#E9B44C' : '#EF4444',
              }}>
                {clarification.type === 'ambiguity' ? 'Preparation Clarification Needed' : 'Food Clarification'}
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '13px', color: '#ECE8DF', lineHeight: 1.4 }}>
              {clarification.question || clarification.message}
            </p>

            {/* Candidate options if ambiguity */}
            {clarification.candidates && clarification.candidates.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                {clarification.candidates.map((cand) => (
                  <button
                    key={cand.id || cand.name}
                    type="button"
                    onClick={() => handleSelectAmbiguityCandidate(cand)}
                    style={{
                      background: '#15161B',
                      border: '1px solid #E9B44C',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      color: '#ECE8DF',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{cand.name}</span>
                    <span style={{ fontSize: '10px', color: '#9A978F' }}>({cand.caloriesPer100g} kcal/100g)</span>
                  </button>
                ))}
              </div>
            )}

            {clarification.type === 'unknown' && (
              <button
                type="button"
                onClick={() => setPickerMealType('lunch')}
                style={{
                  alignSelf: 'flex-start',
                  background: '#15161B',
                  border: '1px solid #26272D',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  color: '#38BDF8',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                }}
              >
                <Search size={14} />
                <span>Search food catalog manually</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── 4. EDITABLE MEAL PREVIEW (STEP 4) ──────────────────────────────── */}
      {previewMeal && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{
            background: '#15161B',
            border: '1.5px solid #E9B44C',
            borderRadius: '20px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(233, 180, 76, 0.1)',
          }}>
            {/* Preview Header & Meal Slot Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#E9B44C',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}>
                  Meal Preview
                </span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ECE8DF' }}>
                  Review & Confirm
                </div>
              </div>

              {/* Meal Slot Pills */}
              <div style={{ display: 'flex', gap: '4px' }}>
                {MEAL_SLOTS.map((slot) => {
                  const isSelected = previewMeal.mealType === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setPreviewMeal({ ...previewMeal, mealType: slot.id })}
                      style={{
                        background: isSelected ? '#E9B44C' : '#0E0F13',
                        border: `1px solid ${isSelected ? '#E9B44C' : '#26272D'}`,
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isSelected ? '#0B0D0F' : '#9A978F',
                        cursor: 'pointer',
                      }}
                    >
                      {slot.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of items in this meal */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {previewMeal.items.map((item, idx) => (
                <div
                  key={item.tempId || idx}
                  style={{
                    background: '#0E0F13',
                    border: '1px solid #26272D',
                    borderRadius: '14px',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
                        {item.canonicalName}
                      </span>
                      {item.preparationState && item.preparationState !== 'custom' && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 700,
                          color: '#E9B44C',
                          background: 'rgba(233, 180, 76, 0.12)',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          textTransform: 'uppercase',
                        }}>
                          {item.preparationState}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px' }}>
                      ~{Math.round(item.calories)} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F · {item.fiber}g Fib
                    </div>
                  </div>

                  {/* Quantity Edit Box */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={item.quantityG}
                        onChange={(e) => handleUpdateItemQuantity(idx, e.target.value)}
                        style={{
                          width: '56px',
                          background: '#15161B',
                          border: '1px solid #26272D',
                          borderRadius: '8px',
                          padding: '4px 6px',
                          color: '#ECE8DF',
                          fontSize: '12px',
                          fontWeight: 700,
                          textAlign: 'center',
                          outline: 'none',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#9A978F' }}>g</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemovePreviewItem(idx)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6B7280',
                        padding: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Nutrition for Complete Meal */}
            <div style={{
              background: '#0E0F13',
              border: '1px solid #26272D',
              borderRadius: '14px',
              padding: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#9A978F', textTransform: 'uppercase', fontWeight: 700 }}>
                  Meal Total
                </span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#ECE8DF' }}>
                  {previewTotals.calories} kcal
                </div>
              </div>
              <div style={{ fontSize: '12px', color: '#9A978F', textAlign: 'right' }}>
                <span style={{ color: '#10B981', fontWeight: 700 }}>{previewTotals.protein}g</span> P ·{' '}
                <span style={{ color: '#E9B44C', fontWeight: 700 }}>{previewTotals.carbs}g</span> C ·{' '}
                <span style={{ color: '#F43F5E', fontWeight: 700 }}>{previewTotals.fat}g</span> F ·{' '}
                <span style={{ color: '#38BDF8', fontWeight: 700 }}>{previewTotals.fiber}g</span> Fib
              </div>
            </div>

            {/* Explicit Actions: Cancel vs Log Meal */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setPreviewMeal(null)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '14px',
                  background: 'transparent',
                  border: '1px solid #26272D',
                  color: '#9A978F',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                id="confirm-log-meal-btn"
                disabled={isSaving}
                onClick={handleConfirmLogMeal}
                style={{
                  flex: 2,
                  padding: '12px',
                  borderRadius: '14px',
                  background: '#10B981',
                  border: 'none',
                  color: '#0B0D0F',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isSaving ? (
                  <span>Saving to log...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Log Meal</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 5. TODAY'S NUTRITION SUMMARY (STEP 2 ITEM 6) ───────────────────── */}
      <div style={{ padding: '0 20px 16px' }}>
        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '20px',
          padding: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Flame size={16} color="#E9B44C" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
                Today's Nutrition
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#9A978F',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px 0',
              }}
            >
              Targets: {settings.calorie_goal} kcal ›
            </button>
          </div>

          {/* Calorie Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span style={{ fontWeight: 800, color: '#ECE8DF', fontSize: '18px' }}>
                {Math.round(dailyTotals.calories)} <span style={{ fontSize: '12px', fontWeight: 600, color: '#9A978F' }}>/ {settings.calorie_goal} kcal</span>
              </span>
              <span style={{ fontSize: '12px', color: '#9A978F' }}>
                {Math.max(0, settings.calorie_goal - Math.round(dailyTotals.calories))} kcal remaining
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#0E0F13', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${Math.min(100, (dailyTotals.calories / Math.max(1, settings.calorie_goal)) * 100)}%`,
                height: '100%',
                background: '#E9B44C',
                borderRadius: '4px',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* 4 Macros Breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            {/* Protein */}
            <div style={{ background: '#0E0F13', border: '1px solid #26272D', borderRadius: '12px', padding: '10px 6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#10B981' }}>
                {Math.round(dailyTotals.protein * 10) / 10}g
              </div>
              <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
                / {settings.protein_goal}g P
              </div>
            </div>

            {/* Carbs */}
            <div style={{ background: '#0E0F13', border: '1px solid #26272D', borderRadius: '12px', padding: '10px 6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#E9B44C' }}>
                {Math.round(dailyTotals.carbs * 10) / 10}g
              </div>
              <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
                / {settings.carbs_goal}g C
              </div>
            </div>

            {/* Fat */}
            <div style={{ background: '#0E0F13', border: '1px solid #26272D', borderRadius: '12px', padding: '10px 6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#F43F5E' }}>
                {Math.round(dailyTotals.fat * 10) / 10}g
              </div>
              <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
                / {settings.fat_goal}g F
              </div>
            </div>

            {/* Fiber */}
            <div style={{ background: '#0E0F13', border: '1px solid #26272D', borderRadius: '12px', padding: '10px 6px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#38BDF8' }}>
                {Math.round(dailyTotals.fiber * 10) / 10}g
              </div>
              <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '2px' }}>
                / {settings.fiber_goal}g Fib
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. GROUPED MEAL CARDS (STEP 2 ITEM 7) ─────────────────────────── */}
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#ECE8DF' }}>
          Meals Grouped
        </div>

        {MEAL_SLOTS.map((slot) => {
          const slotMeals = groupedMeals[slot.id] || [];
          const slotCalories = slotMeals.reduce((s, m) => s + (Math.round(m.calories) || 0), 0);

          return (
            <div
              key={slot.id}
              style={{
                background: '#15161B',
                border: '1px solid #26272D',
                borderRadius: '18px',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              {/* Slot Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>{slot.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
                    {slot.label}
                  </span>
                  {slotMeals.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#9A978F', fontWeight: 600 }}>
                      ({slotMeals.length})
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#E9B44C' }}>
                    {slotCalories} kcal
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerMealType(slot.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#38BDF8',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                      padding: '2px 0',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add</span>
                  </button>
                </div>
              </div>

              {/* Slot Items List or Honest Empty State */}
              {slotMeals.length === 0 ? (
                <div style={{
                  background: '#0E0F13',
                  border: '1px dashed #26272D',
                  borderRadius: '12px',
                  padding: '12px',
                  textAlign: 'center',
                }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
                    No {slot.label.toLowerCase()} logged yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {slotMeals.map((meal) => (
                    <div
                      key={meal.id}
                      style={{
                        background: '#0E0F13',
                        border: '1px solid #26272D',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#ECE8DF' }}>
                            {meal.food_name || 'Food'}
                          </span>
                          <span style={{
                            fontSize: '9px',
                            fontWeight: 800,
                            color: meal.source_type === 'verified_db' ? '#10B981' : '#E9B44C',
                            background: meal.source_type === 'verified_db' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(233, 180, 76, 0.12)',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}>
                            {meal.confidence === 1 ? 'KNOWN' : 'ESTIMATED'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#9A978F', marginTop: '2px' }}>
                          {meal.quantity_g}g · {Math.round(meal.calories ?? 0)} kcal
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEditingLog(meal)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9A978F',
                            padding: '4px',
                            cursor: 'pointer',
                          }}
                          title="Edit meal"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMeal(meal.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#EF4444',
                            padding: '4px',
                            cursor: 'pointer',
                          }}
                          title="Delete meal"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── 7. 30-DAY FOOD ACTIVITY HEATMAP (STEP 2 ITEM 8) ────────────────── */}
      <div style={{ padding: '0 20px 24px' }}>
        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '18px',
          padding: '16px',
        }}>
          <HeatmapGrid
            color="#E9B44C"
            dataMap={heatmapDataMap}
            label="30-Day Food Log Consistency"
            days={30}
          />
        </div>
      </div>

      {/* ─── 8. MODALS INTEGRATION ──────────────────────────────────────────── */}

      {/* Advanced Food Picker (Secondary Manual Action) */}
      {pickerMealType && user && (
        <FoodPicker
          mealType={pickerMealType}
          recentFoodIds={[]}
          recentMealLogs={mealLogs}
          personalFoods={personalFoods}
          onLog={async (foodLog) => {
            const cleanName = (foodLog.food_name || 'Food').trim().slice(0, 150);
            const today = todayStr();
            try {
              const res = await batchLogMeals({
                userId: user.id,
                date: today,
                mealType: foodLog.meal_type || pickerMealType,
                items: [{
                  food_id: foodLog.food_id || null,
                  food_name: cleanName,
                  quantity_g: foodLog.quantity_g,
                  calories: foodLog.calories,
                  protein: foodLog.protein,
                  carbs: foodLog.carbs,
                  fat: foodLog.fat,
                  fiber: foodLog.fiber,
                  nutrition_snapshot: foodLog.nutrition_snapshot || null,
                  source_type: foodLog.source_type || 'manual_picker',
                  preparation_state: foodLog.preparation_state || null,
                }],
              });
              if (!res.success) {
                showToast(res.error || 'Failed to log food', 'error');
                return;
              }
              showToast(`🍱 ${cleanName} logged!`, 'success');
              setPickerMealType(null);
              await loadData(user.id);
            } catch (err) {
              showToast(`Error logging food: ${err.message}`, 'error');
            }
          }}
          onCreatePersonalFood={async (food) => {
            const res = await createPersonalFood({ userId: user.id, ...food });
            if (res.success) {
              setPersonalFoods((prev) => [res.data, ...prev]);
              showToast('⭐ Food saved to library!', 'success');
            }
          }}
          onUpdatePersonalFood={async (foodId, updates) => {
            const res = await updatePersonalFood({ userId: user.id, foodId, updates });
            if (res.success) {
              setPersonalFoods((prev) => prev.map((f) => (f.id === foodId ? res.data : f)));
            }
          }}
          onDeletePersonalFood={async (foodId) => {
            const res = await deletePersonalFood({ userId: user.id, foodId });
            if (res.success) {
              setPersonalFoods((prev) => prev.filter((f) => f.id !== foodId));
            }
          }}
          onToggleFavorite={async (food) => {
            const foodName = (food.food_name || food.name || '').trim();
            const existing = personalFoods.find((f) => (f.food_name || '').toLowerCase() === foodName.toLowerCase());
            if (existing) {
              const res = await deletePersonalFood({ userId: user.id, foodId: existing.id });
              if (res.success) {
                setPersonalFoods((prev) => prev.filter((f) => f.id !== existing.id));
                showToast(`Removed "${foodName}" from Favorites`, 'info');
              }
            } else {
              const res = await createPersonalFood({
                userId: user.id,
                foodName,
                servingSizeG: food.quantity_g || food.serving_size_g || 100,
                calories: food.calories || 0,
                protein: food.protein || food.protein_g || 0,
                carbs: food.carbs || food.carbs_g || 0,
                fat: food.fat || food.fat_g || 0,
                fiber: food.fiber || food.fiber_g || 0,
                isFavorite: true,
              });
              if (res.success) {
                setPersonalFoods((prev) => [...prev, res.data].sort((a, b) => a.food_name.localeCompare(b.food_name)));
                showToast(`Saved "${foodName}" ⭐`, 'success');
              }
            }
          }}
          onClose={() => setPickerMealType(null)}
        />
      )}

      {/* Edit Log Modal */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onSave={handleSaveEditedLog}
          onClose={() => setEditingLog(null)}
        />
      )}

      {/* Goal Settings Modal */}
      {showSettingsModal && user && (
        <GoalSettingsModal
          userId={user.id}
          currentSettings={settings}
          onSave={(newSet) => {
            setSettings(newSet);
            showToast('⚙️ Targets updated!', 'success');
          }}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* ─── 9. BOTTOM NAVIGATION ───────────────────────────────────────────── */}
      <BottomNav activeTab="health" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
