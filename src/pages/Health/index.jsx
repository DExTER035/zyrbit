/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import { ArrowLeft, Bell, ChevronRight, Plus, ArrowRight, Sparkles, Utensils, Droplets, Moon, Zap, Scale } from 'lucide-react';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';

// ─── Health Domain Components ───────────────────────────────────────────────
import {
  C,
  todayStr,
  HealthStateHero,
  SleepCard,
  WaterCard,
  ActivityCard,
  WeightCard,
  ProgressBar,
} from '../../components/domain/health/index.js';
import BodyRhythmVisualizer from '../../components/domain/health/BodyRhythmVisualizer.jsx';
import HealthMealsList from '../../components/domain/health/HealthMealsList.jsx';

import HeatmapGrid from '../../components/common/HeatmapGrid.jsx';

// ─── Nutrition Modals (Subdomain under Health) ──────────────────────────────
import FoodPicker from '../../components/domain/food/FoodPicker.jsx';
import EditLogModal from '../../components/domain/food/EditLogModal.jsx';
import MealDetailModal from '../../components/domain/food/MealDetailModal.jsx';
import GoalSettingsModal from '../../components/domain/food/GoalSettingsModal.jsx';
import SavedMealsSection from '../../components/domain/food/SavedMealsSection.jsx';

// ─── Domain Engines & Services ──────────────────────────────────────────────
import { computeHealthState } from '../../engines/health/index.js';
import { computePersonalUsuals, calculateDailyTotals } from '../../engines/food/index.js';
import {
  getHealthTelemetry,
  logWater as serviceLogWater,
  deleteWaterLog as serviceDeleteWaterLog,
  logSleep as serviceLogSleep,
  deleteSleepLog as serviceDeleteSleepLog,
  logActivity as serviceLogActivity,
  deleteActivityLog as serviceDeleteActivityLog,
  logWeight as serviceLogWeight,
  deleteWeightLog as serviceDeleteWeightLog,
  logMeal as serviceLogMeal,
  updateMealLog as serviceUpdateMealLog,
  deleteMealLog as serviceDeleteMealLog,
  batchLogMeals as serviceBatchLogMeals,
  saveMeal as serviceSaveMeal,
  deleteSavedMeal as serviceDeleteSavedMeal,
  createPersonalFood as serviceCreatePersonalFood,
  updatePersonalFood as serviceUpdatePersonalFood,
  deletePersonalFood as serviceDeletePersonalFood,
} from '../../services/healthService.js';

export default function Health() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [healthTab, setHealthTab] = useState('nutrition'); // nutrition | workout | sleep | water
  const [activePickerMealType, setActivePickerMealType] = useState(null);
  const [editingMealLog, setEditingMealLog] = useState(null);
  const [inspectingMealLog, setInspectingMealLog] = useState(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDetailedLogs, setShowDetailedLogs] = useState(false);

  // ─── Telemetry Data States ─────────────────────────────────────────────────
  const [sleepLogs, setSleepLogs] = useState([]);           // Rolling 7 days
  const [waterLogs, setWaterLogs] = useState([]);           // Today's logs
  const [moveLogs, setMoveLogs] = useState([]);             // Rolling 7 days
  const [mealLogs, setMealLogs] = useState([]);             // Today's meal items
  const [weightLogs, setWeightLogs] = useState([]);         // Rolling 30 days
  const [dailySummaries, setDailySummaries] = useState([]); // Last 90 days
  const [settings, setSettings] = useState(null);           // Calorie & macro targets
  const [savedMeals, setSavedMeals] = useState([]);         // User saved combo templates
  const [personalFoods, setPersonalFoods] = useState([]);   // User personal food library

  const dailyNutrition = useMemo(() => calculateDailyTotals(mealLogs), [mealLogs]);
  const totalCalories = dailyNutrition.calories;
  const totalProtein = dailyNutrition.protein;
  const totalCarbs = dailyNutrition.carbs;
  const totalFat = dailyNutrition.fat;
  const calorieGoal = settings?.calorie_goal || 2200;
  const caloriePercent = Math.min(100, Math.round((totalCalories / calorieGoal) * 100));

  // ─── Unified Data Fetcher ──────────────────────────────────────────────────
  const loadAllTelemetry = useCallback(async (uid, isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await getHealthTelemetry(uid);
      if (res.success && res.data) {
        setSleepLogs(res.data.sleepLogs || []);
        setWaterLogs(res.data.waterLogs || []);
        setMoveLogs(res.data.moveLogs || []);
        setMealLogs(res.data.mealLogs || []);
        setWeightLogs(res.data.weightLogs || []);
        setDailySummaries(res.data.dailySummaries || []);
        setSettings(res.data.settings || { calorie_goal: 2200, protein_goal: 130, carbs_goal: 250, fat_goal: 70, fiber_goal: 30 });
        setSavedMeals(res.data.savedMeals || []);
        setPersonalFoods(res.data.personalFoods || []);
      }
    } catch (err) {
      console.warn('Error loading health telemetry:', err.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, []);

  // ─── Auth Verification ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setUser(session.user);
        loadAllTelemetry(session.user.id);
      }
    });
  }, [navigate, loadAllTelemetry]);

  // ─── Live Invalidation from Dex or Cross-Domain Actions ────────────────────
  useEffect(() => {
    const handleDexRefresh = (e) => {
      if (e.detail?.source === 'health_page') return;
      if (e.detail?.domain === 'health' || e.detail?.domain === 'food' || !e.detail?.domain) {
        if (user?.id) loadAllTelemetry(user.id, true);
      }
    };
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => window.removeEventListener('dexos:refresh', handleDexRefresh);
  }, [user, loadAllTelemetry]);

  // ─── Pure Deterministic Health State Computation ───────────────────────────
  const healthState = useMemo(() => {
    return computeHealthState(
      {
        sleepLogs,
        waterLogs,
        moveLogs,
        mealLogs,
        weightLogs,
        todayStr: todayStr(),
      },
      settings || {}
    );
  }, [sleepLogs, waterLogs, moveLogs, mealLogs, weightLogs, settings]);

  // ─── Pure Deterministic Body State Sentence (The Product) ───────────────────
  const bodySentence = useMemo(() => {
    const sleepHrs = healthState.sleep?.hours || 0;
    const waterMl = healthState.hydration?.ml || 0;
    const workoutMins = healthState.movement?.minutes || 0;
    const mealsLogged = healthState.fuel?.mealsLogged || 0;

    if (sleepHrs > 0 && sleepHrs < 6) {
      return "Running on short sleep.";
    }
    if (sleepHrs >= 7 && waterMl >= 2000 && workoutMins >= 20) {
      return "Well rested. Hydrated. Ready to train.";
    }
    if (sleepHrs >= 7 && waterMl >= 1500) {
      return "Well rested. Hydration on track.";
    }
    if (sleepHrs >= 7) {
      return "Well rested. Hydration pending.";
    }
    if (mealsLogged > 0 && waterMl >= 1000) {
      return "Fueled and steady.";
    }
    if (sleepHrs === 0 && waterMl === 0 && mealsLogged === 0) {
      return "Tell Zyrbit how you slept.";
    }
    return "Body baseline steady.";
  }, [healthState]);

  // ─── Pure Contextual Health Recommendation (What Would Help?) ───────────
  const recommendationText = useMemo(() => {
    const sleepHrs = healthState.sleep?.hours || 0;
    const waterMl = healthState.hydration?.ml || 0;
    const workoutMins = healthState.movement?.minutes || 0;
    const mealsCount = mealLogs.length;

    if (sleepHrs > 0 && sleepHrs < 6) {
      return "Running on short sleep. Keep cognitive demands bounded, stay hydrated with 2L water, and aim for an earlier bedtime tonight.";
    }
    if (waterMl < 1000) {
      return "Hydration pending. Drink 500ml water to sustain metabolic pacing and afternoon focus.";
    }
    if (workoutMins === 0) {
      return "Movement gap today. A 20-minute brisk walk or light mobility session will reset posture and energy.";
    }
    if (mealsCount === 0) {
      return "Fueling steadily supports cognitive stamina—tell Dex what you ate.";
    }
    return "Body rhythm is steady. Maintain your hydration pace and keep your evening wind-down routine calm.";
  }, [healthState, mealLogs]);

  // ─── Ranked Personal Usuals (Fast 1-Tap Logging) ───────────────────────────
  const personalUsuals = useMemo(() => {
    return computePersonalUsuals(personalFoods, mealLogs, 6);
  }, [personalFoods, mealLogs]);

  // ─── Set of Favorite Food Names for Quick Matching ─────────────────────────
  const favoriteFoodNames = useMemo(() => {
    return new Set((personalFoods || []).map((f) => (f.food_name || '').toLowerCase().trim()));
  }, [personalFoods]);

  // ─── 90-Day Bio Consistency Heatmap Map ────────────────────────────────────
  const heatmapData = useMemo(() => {
    const map = {};
    dailySummaries.forEach((s) => {
      if (s.log_date) {
        map[s.log_date] = (map[s.log_date] || 0) + 1;
      }
    });
    return map;
  }, [dailySummaries]);

  // ─── MUTATION HANDLERS (ALL ROUTED VIA HEALTHSERVICE) ──────────────────────

  // 1. Water
  const handleLogWater = async (amount) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const today = todayStr();

    try {
      const res = await serviceLogWater({ userId: user.id, amountMl: amount, date: today });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setWaterLogs((prev) => [...prev, res.data]);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast(`💧 +${res.data?.amount_ml || amount}ml water logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log water: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleDeleteWater = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteWaterLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete water log: ${res.error}`, 'error');
        return;
      }
      setWaterLogs((prev) => prev.filter((w) => w.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('💧 Water log deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete water log: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Sleep
  const handleLogSleep = async (hrs, qual) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const today = todayStr();

    try {
      const res = await serviceLogSleep({ userId: user.id, durationHours: hrs, quality: qual, date: today });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setSleepLogs((prev) => {
        const filtered = prev.filter((l) => l.sleep_date !== today);
        return [res.data, ...filtered];
      });
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('😴 Sleep logged!', 'success');
    } catch (err) {
      showToast(`Failed to log sleep: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleDeleteSleep = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteSleepLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete sleep log: ${res.error}`, 'error');
        return;
      }
      setSleepLogs((prev) => prev.filter((s) => s.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('😴 Sleep log deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete sleep log: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Movement / Workout
  const handleLogWorkout = async (type, activeMins, rpe) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const today = todayStr();

    try {
      const res = await serviceLogActivity({
        userId: user.id,
        activityType: type,
        activeMinutes: activeMins,
        rpe,
        date: today,
      });

      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setMoveLogs((prev) => [res.data, ...prev]);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('🏋️ Workout logged!', 'success');
    } catch (err) {
      showToast(`Failed to log workout: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleDeleteWorkout = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteActivityLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete workout: ${res.error}`, 'error');
        return;
      }
      setMoveLogs((prev) => prev.filter((m) => m.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('🏋️ Workout deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete workout: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Weight
  const _handleLogWeight = async (weightVal) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const today = todayStr();

    try {
      const res = await serviceLogWeight({ userId: user.id, weight: weightVal, date: today });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setWeightLogs((prev) => {
        const filtered = prev.filter((w) => w.log_date !== today);
        return [res.data, ...filtered];
      });
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast(`⚖️ Scale weight (${weightVal} kg) recorded!`, 'success');
    } catch (err) {
      showToast(`Failed to record weight: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const _handleDeleteWeight = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteWeightLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete weight log: ${res.error}`, 'error');
        return;
      }
      setWeightLogs((prev) => prev.filter((w) => w.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('⚖️ Weight log deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete weight log: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Nutrition / Meals
  const handleAddFoodFromPicker = async (foodLog) => {
    const {
      food_id,
      food_name,
      meal_type,
      quantity_g,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      preparation_state,
      source_type,
      nutrition_snapshot,
    } = foodLog || {};

    if (!user || isSubmitting || !activePickerMealType) return;
    setIsSubmitting(true);
    const cleanName = (food_name || 'Food').trim().slice(0, 150);
    const today = todayStr();
    const mealType = meal_type || activePickerMealType;

    try {
      const res = await serviceLogMeal({
        userId: user.id,
        date: today,
        mealType,
        foodId: food_id || null,
        foodName: cleanName,
        quantityG: quantity_g,
        calories,
        protein,
        carbs,
        fat,
        fiber,
        nutritionSnapshot: nutrition_snapshot || null,
        sourceType: source_type || null,
        preparationState: preparation_state || null,
      });

      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }

      setMealLogs((prev) => [...prev, res.data]);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast(`🍱 ${cleanName} logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log food: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMealLogSave = async ({ logId, newQty, newMealType, calories, protein, carbs, fat, fiber }) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceUpdateMealLog({
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
        showToast(res.error, 'error');
        return;
      }

      setMealLogs((prev) => prev.map((l) => (l.id === logId ? res.data : l)));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('✏️ Meal updated!', 'success');
    } catch (err) {
      showToast(`Failed to update meal: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMealLog = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteMealLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setMealLogs((prev) => prev.filter((l) => l.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast('🗑 Meal deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete meal: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Tap Log Saved Meal Template
  const handleLogSavedMeal = async (savedMeal) => {
    if (!user || isSubmitting || !savedMeal) return;
    setIsSubmitting(true);
    const items = savedMeal.items_json || savedMeal.items || [];
    try {
      const res = await serviceBatchLogMeals({
        userId: user.id,
        date: todayStr(),
        mealType: savedMeal.meal_type || 'lunch',
        items,
      });

      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }

      setMealLogs((prev) => [...prev, ...(res.data || [])]);
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health', source: 'health_page' } }));
      showToast(`🍱 Saved meal "${savedMeal.name}" logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log saved meal: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Tap Delete Saved Meal Template
  const handleDeleteSavedMeal = async (mealId) => {
    if (!user || isSubmitting || !mealId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteSavedMeal({ userId: user.id, mealId });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setSavedMeals((prev) => prev.filter((m) => m.id !== mealId));
      showToast('🗑 Saved meal removed', 'success');
    } catch (err) {
      showToast(`Failed to remove saved meal: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1-Tap Select Usual Food
  const handleSelectUsual = (food) => {
    if (!food) return;
    setActivePickerMealType('lunch');
    handleAddFoodFromPicker({
      food_id: food.id || null,
      food_name: food.food_name,
      quantity_g: food.serving_size_g,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      fiber: food.fiber,
    });
  };

  // Repeat Yesterday's Meals (Routed safely via service)
  const handleRepeatYesterday = async () => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];

    try {
      const { data, error } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yStr);

      if (error || !data || data.length === 0) {
        showToast('No meals found for yesterday to repeat.', 'info');
        return;
      }

      const res = await serviceBatchLogMeals({
        userId: user.id,
        date: todayStr(),
        items: data,
      });

      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }

      setMealLogs((prev) => [...prev, ...(res.data || [])]);
      showToast('🔁 Yesterday\'s meals logged for today!', 'success');
    } catch (err) {
      showToast(`Failed to repeat meals: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Save Meal Combo Template (saved_meals canonical write) ────────────────
  const handleSaveCombo = async ({ name, mealType = 'lunch', items = [] }) => {
    if (!user || isSubmitting || !name || !name.trim() || !items || items.length === 0) return;
    setIsSubmitting(true);
    const cleanName = name.trim();
    try {
      const res = await serviceSaveMeal({
        userId: user.id,
        name: cleanName,
        mealType,
        items,
      });

      if (!res.success) {
        showToast("Couldn't save this meal combo. Try again.", 'error');
        return;
      }

      setSavedMeals((prev) => [res.data, ...prev.filter((m) => m.id !== res.data.id)]);
      showToast(`Saved "${cleanName}" ⭐`, 'success');
    } catch {
      showToast("Couldn't save this meal combo. Try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Subtle Favorite / Star Toggle (Persists to user_food_library) ──────────
  const handleToggleFavorite = async (logOrFood) => {
    if (!user || isSubmitting || !logOrFood) return;
    const foodName = (logOrFood.food_name || logOrFood.meal_name || logOrFood.name || '').trim();
    if (!foodName) return;

    const cleanLower = foodName.toLowerCase();
    const existing = personalFoods.find((f) => (f.food_name || '').toLowerCase().trim() === cleanLower);

    setIsSubmitting(true);
    if (existing) {
      // Unfavorite → Remove from user_food_library
      try {
        const res = await serviceDeletePersonalFood({ userId: user.id, foodId: existing.id });
        if (!res.success) {
          showToast("Couldn't save this food. Try again.", 'error');
          return;
        }
        setPersonalFoods((prev) => prev.filter((f) => f.id !== existing.id));
        showToast(`Removed "${foodName}" from Favorites`, 'info');
      } catch {
        showToast("Couldn't save this food. Try again.", 'error');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Favorite → Create in user_food_library
      try {
        const res = await serviceCreatePersonalFood({
          userId: user.id,
          foodName,
          servingSizeG: logOrFood.quantity_g || logOrFood.serving_size_g || 100,
          calories: logOrFood.calories || 0,
          protein: logOrFood.protein || logOrFood.protein_g || 0,
          carbs: logOrFood.carbs || logOrFood.carbs_g || 0,
          fat: logOrFood.fat || logOrFood.fat_g || 0,
          fiber: logOrFood.fiber || logOrFood.fiber_g || 0,
          isFavorite: true,
        });
        if (!res.success) {
          showToast("Couldn't save this food. Try again.", 'error');
          return;
        }
        setPersonalFoods((prev) => [...prev, res.data].sort((a, b) => a.food_name.localeCompare(b.food_name)));
        showToast(`Saved "${foodName}" to Favorites ⭐`, 'success');
      } catch {
        showToast("Couldn't save this food. Try again.", 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // ─── Personal Food Library Handlers ─────────────────────────────────────────
  const handleCreatePersonalFood = async (foodData) => {
    if (!user || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await serviceCreatePersonalFood({ userId: user.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => [...prev, res.data].sort((a, b) => a.food_name.localeCompare(b.food_name)));
      showToast(`Saved "${foodData.food_name}" ⭐`, 'success');
    } catch {
      showToast("Couldn't save this food. Try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePersonalFood = async (foodData) => {
    if (!user || isSubmitting || !foodData.id) return;
    setIsSubmitting(true);
    try {
      const res = await serviceUpdatePersonalFood({ userId: user.id, foodId: foodData.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => prev.map((f) => (f.id === foodData.id ? res.data : f)));
      showToast(`Saved "${foodData.food_name}"`, 'success');
    } catch {
      showToast("Couldn't save this food. Try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePersonalFood = async (foodId) => {
    if (!user || isSubmitting || !foodId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeletePersonalFood({ userId: user.id, foodId });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => prev.filter((f) => f.id !== foodId));
      showToast('🗑 Personal food deleted', 'success');
    } catch {
      showToast("Couldn't save this food. Try again.", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date Header Display
  const todayDisplay = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  // ─── Loading Skeleton ──────────────────────────────────────────────────────
  if (loading && sleepLogs.length === 0 && waterLogs.length === 0 && mealLogs.length === 0) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60%' }}>
            <div className="skeleton-box" style={{ height: '10px', width: '35%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '75%' }} />
          </div>
          <div className="skeleton-box" style={{ width: '40px', height: '40px', borderRadius: '14px' }} />
        </div>
        <div className="skeleton-box" style={{ height: '200px', borderRadius: '20px' }} />
        <div className="skeleton-box" style={{ height: '70px', borderRadius: '16px' }} />
        <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
        <div className="skeleton-box" style={{ height: '140px', borderRadius: '16px' }} />
      </div>
    );
  }

  // ─── Main Unified Health Render ────────────────────────────────────────────
  return (
    <div
      className="app-container page-enter"
      style={{
        background: 'var(--brand-ivory, #F4F0E8)',
        minHeight: '100vh',
        color: 'var(--brand-text, #111A20)',
        position: 'relative',
        paddingBottom: 'calc(110px + env(safe-area-inset-bottom, 24px))',
      }}
    >
      <div
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '24px 20px 40px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {/* ─── 1. TOP BAR: BACK NAVIGATION + DATE ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => navigate('/track')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--brand-text, #111A20)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 0',
              minHeight: '44px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Track</span>
          </button>

          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--brand-muted, #68777B)',
              background: '#FFFFFF',
              border: '1.5px solid var(--brand-border, #E5E0D8)',
              padding: '4px 12px',
              borderRadius: '9999px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            {todayDisplay}
          </div>
        </div>

        {/* ─── 2. TITLE SECTION ─── */}
        <div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color: 'var(--brand-text, #111A20)',
              letterSpacing: '-0.02em',
              margin: '0 0 4px',
              fontFamily: "'Space Grotesk', -apple-system, sans-serif",
            }}
          >
            Health Telemetry
          </h1>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--brand-muted, #68777B)',
              margin: 0,
              fontWeight: 500,
            }}
          >
            Fuel your next level. Calm, holistic daily physical signals.
          </p>
        </div>

        {/* ─── 3. PHYSICAL STATE HERO ─── */}
        <HealthStateHero healthState={healthState} />

        {/* ─── 4. CONTEXTUAL INTELLIGENCE ("WHAT WOULD HELP") ─── */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1.5px solid var(--brand-border, #E5E0D8)',
            borderRadius: '18px',
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px',
            boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
          }}
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '12px',
              background: 'rgba(23, 74, 85, 0.1)',
              color: 'var(--brand-petrol, #174A55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Sparkles size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: 'var(--brand-petrol, #174A55)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                marginBottom: '4px',
              }}
            >
              What Would Help
            </div>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--brand-text, #111A20)',
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              {recommendationText}
            </div>
          </div>
        </div>

        {/* ─── 5. CIRCADIAN BODY RHYTHM WAVE ─── */}
        <BodyRhythmVisualizer
          sleepHours={healthState.sleep?.hours ?? 0}
          mealLogs={mealLogs}
          waterLogs={waterLogs}
          moveLogs={moveLogs}
        />

        {/* ─── 6. RESPONSIVE TWO-COLUMN / SINGLE-COLUMN GRID ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          {/* Column 1: Sleep, Movement, Weight */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <SleepCard
              sleepLogs={sleepLogs}
              sleepDebt={healthState.sleep?.debtHours || 0}
              onLogSleep={handleLogSleep}
              onDeleteSleep={_handleDeleteSleep}
              isSubmitting={isSubmitting}
            />

            <ActivityCard
              moveLogs={moveLogs}
              onLogWorkout={handleLogWorkout}
              onDeleteWorkout={_handleDeleteWorkout}
              isSubmitting={isSubmitting}
            />

            <WeightCard
              weightLogs={weightLogs}
              onLogWeight={_handleLogWeight}
              onDeleteWeight={_handleDeleteWeight}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Column 2: Water, Nutrition Snapshot, 90-Day Bio Consistency */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <WaterCard
              todayWater={waterLogs.reduce((sum, w) => sum + (Number(w.amount_ml) || 0), 0)}
              dynamicTarget={healthState.hydration?.targetMl || 3000}
              onLogWater={handleLogWater}
              onDeleteWater={_handleDeleteWater}
              waterLogs={waterLogs}
              isSubmitting={isSubmitting}
            />

            {/* Nutrition Snapshot Card */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--brand-border, #E5E0D8)',
                borderLeft: '4px solid var(--brand-petrol, #174A55)',
                borderRadius: '18px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Utensils size={16} color="var(--brand-petrol, #174A55)" />
                  <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-text, #111A20)', letterSpacing: '0.8px' }}>
                    NUTRITION SNAPSHOT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-muted, #68777B)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '2px 4px',
                  }}
                >
                  Target: {calorieGoal} kcal
                </button>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-text, #111A20)', lineHeight: 1 }}>
                    {totalCalories.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--brand-muted, #68777B)', fontWeight: 500 }}>
                    / {calorieGoal.toLocaleString()} kcal
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--brand-petrol, #174A55)', fontWeight: 700, marginLeft: 'auto' }}>
                    {caloriePercent}%
                  </span>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <ProgressBar value={totalCalories} max={calorieGoal} color="var(--brand-petrol, #174A55)" height={6} />
                </div>

                {/* Macro Pills */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid #F0ECE4', paddingTop: '10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ color: 'var(--brand-petrol, #174A55)', fontWeight: 800 }}>•</span> Protein: <strong>{Math.round(totalProtein)}g</strong>
                  </div>
                  <div>
                    <span style={{ color: '#D97706', fontWeight: 800 }}>•</span> Carbs: <strong>{Math.round(totalCarbs)}g</strong>
                  </div>
                  <div>
                    <span style={{ color: '#E11D48', fontWeight: 800 }}>•</span> Fats: <strong>{Math.round(totalFat)}g</strong>
                  </div>
                </div>
              </div>

              {/* Today's Meals Snippet */}
              {mealLogs.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--brand-border, #E5E0D8)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: 'var(--brand-muted, #68777B)', fontWeight: 700 }}>
                    <span>Today's Meals ({mealLogs.length})</span>
                  </div>
                  {mealLogs.slice(-3).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => setInspectingMealLog(m)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        color: 'var(--brand-text, #111A20)',
                        cursor: 'pointer',
                        padding: '4px 0',
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>🍱 {m.food_name}</span>
                      <span style={{ color: 'var(--brand-muted, #68777B)', fontSize: '11px' }}>
                        {m.calories} kcal · {m.protein}g P
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Action: Link to Food Module */}
              <button
                type="button"
                onClick={() => navigate('/food')}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  padding: '11px',
                  borderRadius: '12px',
                  background: 'rgba(23, 74, 85, 0.08)',
                  border: '1.5px solid var(--brand-petrol, #174A55)',
                  color: 'var(--brand-petrol, #174A55)',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Manage Nutrition & Meals in Food</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* 90-Day Bio Consistency */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1.5px solid var(--brand-border, #E5E0D8)',
                borderRadius: '18px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
                boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-text, #111A20)', letterSpacing: '0.8px' }}>
                  90-DAY BIO CONSISTENCY
                </span>
                <button
                  type="button"
                  onClick={() => setShowDetailedLogs((p) => !p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-muted, #68777B)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {showDetailedLogs ? 'Hide History ▲' : 'View History ▼'}
                </button>
              </div>

              <div>
                <HeatmapGrid color="#174A55" dataMap={heatmapData} label="Consistency Heatmap" />
              </div>

              {showDetailedLogs && savedMeals && savedMeals.length > 0 && (
                <div style={{ borderTop: '1px solid var(--brand-border, #E5E0D8)', paddingTop: '12px' }}>
                  <SavedMealsSection
                    savedMeals={savedMeals}
                    onLogSavedMeal={handleLogSavedMeal}
                    onDelete={handleDeleteSavedMeal}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 7. MODALS ─── */}

      {/* Food Picker Modal */}
      {activePickerMealType && (
        <FoodPicker
          mealType={activePickerMealType}
          recentFoodIds={[]}
          recentMealLogs={mealLogs}
          personalFoods={personalFoods}
          onLog={handleAddFoodFromPicker}
          onCreatePersonalFood={handleCreatePersonalFood}
          onUpdatePersonalFood={handleUpdatePersonalFood}
          onDeletePersonalFood={handleDeletePersonalFood}
          onToggleFavorite={handleToggleFavorite}
          onClose={() => setActivePickerMealType(null)}
        />
      )}

      {/* Edit Food Log Modal */}
      {editingMealLog && (
        <EditLogModal
          log={editingMealLog}
          onSave={handleEditMealLogSave}
          onClose={() => setEditingMealLog(null)}
        />
      )}

      {/* Meal Detail Inspection Modal */}
      {inspectingMealLog && (
        <MealDetailModal
          log={inspectingMealLog}
          isFavorite={favoriteFoodNames.has(((inspectingMealLog.food_name || inspectingMealLog.meal_name || inspectingMealLog.name) || '').toLowerCase().trim())}
          onToggleFavorite={handleToggleFavorite}
          onEdit={(log) => {
            setInspectingMealLog(null);
            setEditingMealLog(log);
          }}
          onDelete={(id) => {
            setInspectingMealLog(null);
            handleDeleteMealLog(id);
          }}
          onClose={() => setInspectingMealLog(null)}
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

      {/* ─── 8. BOTTOM NAVIGATION (TRACK TAB HIGHLIGHTED) ─── */}
      <BottomNav activeTab="track" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
