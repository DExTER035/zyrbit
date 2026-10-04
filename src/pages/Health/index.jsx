import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';

// ─── Health Domain Components ───────────────────────────────────────────────
import {
  C,
  todayStr,
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
import { computePersonalUsuals } from '../../engines/food/index.js';
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

  // ─── Modal States ──────────────────────────────────────────────────────────
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
  const handleAddFoodFromPicker = async ({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }) => {
    if (!user || isSubmitting || !activePickerMealType) return;
    setIsSubmitting(true);
    const cleanName = (food_name || 'Food').trim().slice(0, 150);
    const today = todayStr();
    const mealType = activePickerMealType;

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
        background: '#0E0F13',
        minHeight: '100vh',
        color: '#ECE8DF',
        position: 'relative',
      }}
    >
      {/* ─── 1. HEADER ─── */}
      <div style={{ padding: '36px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: '26px',
            fontWeight: 800,
            color: '#ECE8DF',
            letterSpacing: '-0.03em',
            margin: '0 0 2px',
          }}>
            Health
          </h1>
          <div style={{
            fontSize: '13px',
            color: '#9A978F',
            fontWeight: 400,
          }}>
            {bodySentence}
          </div>
        </div>

        <div
          title={todayDisplay}
          style={{
            background: '#15161B',
            border: '1px solid #26272D',
            borderRadius: '9999px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 600,
            color: '#ECE8DF',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          Today ›
        </div>
      </div>

      {/* ─── 2. BODY RHYTHM TIMELINE & METRICS ─── */}
      <div style={{ padding: '16px 20px 0' }}>
        <BodyRhythmVisualizer
          sleepHours={healthState.sleep?.hours || 5.3}
          mealLogs={mealLogs}
          waterLogs={waterLogs}
          moveLogs={moveLogs}
          healthState={healthState}
        />
      </div>

      {/* ─── 3. TODAY'S MEALS (EDITORIAL & TAP-TO-INSPECT) ─── */}
      <div style={{ padding: '0 20px' }}>
        <HealthMealsList
          mealLogs={mealLogs}
          personalUsuals={personalUsuals}
          favoriteFoodNames={favoriteFoodNames}
          onSelectUsual={handleSelectUsual}
          onRepeatYesterday={handleRepeatYesterday}
          onSeeAll={() => setActivePickerMealType('lunch')}
          onAddMeal={() => setActivePickerMealType('lunch')}
          onEditMeal={(log) => setEditingMealLog(log)}
          onDeleteMeal={handleDeleteMealLog}
          onToggleFavorite={handleToggleFavorite}
          onSaveCombo={handleSaveCombo}
        />
      </div>

      {/* ─── 4. WHAT WOULD HELP? (CONTEXTUAL INTELLIGENCE) ─── */}
      <div style={{ padding: '0 20px', marginTop: '16px' }}>
        <div style={{
          background: '#15161B',
          border: '1px solid #26272D',
          borderRadius: '16px',
          padding: '16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'rgba(56, 189, 248, 0.12)',
            color: '#38BDF8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            flexShrink: 0,
          }}>
            ✦
          </div>
          <div>
            <div style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#38BDF8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '3px',
            }}>
              What would help
            </div>
            <div style={{
              fontSize: '13px',
              color: '#ECE8DF',
              fontWeight: 500,
              lineHeight: 1.5,
            }}>
              {recommendationText}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. COMPACT CAPTURE BAR ─── */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          color: '#6B7280',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Capture
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {/* Water */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleLogWater(250)}
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                background: 'rgba(96, 165, 250, 0.1)',
                border: '1px solid rgba(96, 165, 250, 0.25)',
                color: '#60A5FA',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span>💧 Water</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>+250ml</span>
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleLogWater(500)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#60A5FA',
                fontSize: '10px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              +500ml
            </button>
          </div>

          {/* Meal */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setActivePickerMealType('lunch')}
            style={{
              padding: '10px 8px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#F59E0B',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '52px',
            }}
          >
            <span>🍲 Meal</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>Log food</span>
          </button>

          {/* Sleep */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleLogSleep(7.5, 3)}
            style={{
              padding: '10px 8px',
              borderRadius: '12px',
              background: 'rgba(31, 163, 111, 0.1)',
              border: '1px solid rgba(31, 163, 111, 0.25)',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              height: '52px',
            }}
          >
            <span>😴 Sleep</span>
            <span style={{ fontSize: '10px', opacity: 0.8 }}>+7.5h</span>
          </button>

          {/* Movement */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleLogWorkout('Workout', 30, 7)}
              style={{
                padding: '10px 8px',
                borderRadius: '12px',
                background: 'rgba(167, 139, 250, 0.1)',
                border: '1px solid rgba(167, 139, 250, 0.25)',
                color: '#A78BFA',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
              }}
            >
              <span>⚡ Move</span>
              <span style={{ fontSize: '10px', opacity: 0.8 }}>+30m</span>
            </button>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleLogWorkout('Workout', 15, 6)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A78BFA',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                +15m
              </button>
              <span style={{ color: '#6B7280', fontSize: '10px' }}>·</span>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleLogWorkout('Workout', 60, 8)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A78BFA',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '2px',
                }}
              >
                +60m
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 6. PROGRESSIVE DISCLOSURE: 90-DAY BIO CONSISTENCY ─── */}
      <div style={{ padding: '24px 20px 120px' }}>
        <button
          type="button"
          onClick={() => setShowDetailedLogs((p) => !p)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            outline: 'none',
          }}
        >
          <span>{showDetailedLogs ? '▲ Hide bio consistency history' : '▼ View 90-day bio consistency'}</span>
        </button>

        {showDetailedLogs && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Heatmap */}
            <div style={{
              background: '#15161B',
              border: '1px solid #1C1D21',
              borderRadius: '16px',
              padding: '16px',
            }}>
              <HeatmapGrid color="#1FA36F" dataMap={heatmapData} label="Bio Consistency (90 Days)" />
            </div>

            {/* Saved Meal Templates (if any) */}
            {savedMeals && savedMeals.length > 0 && (
              <SavedMealsSection
                savedMeals={savedMeals}
                onLogSavedMeal={handleLogSavedMeal}
                onDelete={handleDeleteSavedMeal}
              />
            )}
          </div>
        )}
      </div>

      {/* ─── 3. MODALS ──────────────────────────────────────────────────────── */}

      {/* Food Picker Modal */}
      {activePickerMealType && (
        <FoodPicker
          mealType={activePickerMealType}
          recentFoodIds={[]}
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

      {/* ─── 4. BOTTOM NAVIGATION (4 TABS) ──────────────────────────────────── */}
      <BottomNav activeTab="health" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
