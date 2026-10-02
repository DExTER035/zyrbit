import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { supabase } from '../../lib/supabase/index.js';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';

// ─── Health Domain Components ───────────────────────────────────────────────
import {
  C,
  todayStr,
  NutritionCard,
} from '../../components/domain/health/index.js';
import { BodyRhythmRow } from '../../components/primitives/index.jsx';

import HeatmapGrid from '../../components/common/HeatmapGrid.jsx';

// ─── Nutrition Modals (Subdomain under Health) ──────────────────────────────
import FoodPicker from '../../components/domain/food/FoodPicker.jsx';
import EditLogModal from '../../components/domain/food/EditLogModal.jsx';
import GoalSettingsModal from '../../components/domain/food/GoalSettingsModal.jsx';

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
  const loadAllTelemetry = useCallback(async (uid) => {
    setLoading(true);
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
      setLoading(false);
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
      if (e.detail?.domain === 'health' || e.detail?.domain === 'food' || !e.detail?.domain) {
        if (user?.id) loadAllTelemetry(user.id);
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

  // ─── Ranked Personal Usuals (Fast 1-Tap Logging) ───────────────────────────
  const personalUsuals = useMemo(() => {
    return computePersonalUsuals(personalFoods, mealLogs, 6);
  }, [personalFoods, mealLogs]);

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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
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
      showToast('⚖️ Weight log deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete weight log: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Nutrition / Meals
  const handleAddFoodFromPicker = async ({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }) => {
    if (!user || !activePickerMealType) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
      showToast(`🍱 ${cleanName} logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log food: ${err.message}`, 'error');
    }
  };

  const handleEditMealLogSave = async ({ logId, newQty, newMealType, calories, protein, carbs, fat, fiber }) => {
    if (!user || !logId) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
      showToast('✏️ Meal updated!', 'success');
    } catch (err) {
      showToast(`Failed to update meal: ${err.message}`, 'error');
    }
  };

  const handleDeleteMealLog = async (logId) => {
    if (!user || !logId) return;
    try {
      const res = await serviceDeleteMealLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(res.error, 'error');
        return;
      }
      setMealLogs((prev) => prev.filter((l) => l.id !== logId));
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
      showToast('🗑 Meal deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete meal: ${err.message}`, 'error');
    }
  };

  // 1-Tap Log Saved Meal Template
  const handleLogSavedMeal = async (savedMeal) => {
    if (!user || !savedMeal) return;
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
      window.dispatchEvent(new CustomEvent('dexos:refresh', { detail: { domain: 'health' } }));
      showToast(`🍱 Saved meal "${savedMeal.name}" logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log saved meal: ${err.message}`, 'error');
    }
  };

  // 1-Tap Delete Saved Meal Template
  const handleDeleteSavedMeal = async (mealId) => {
    if (!user || !mealId) return;
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
    if (!user) return;
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
    }
  };

  // Personal Food Library Handlers
  const handleCreatePersonalFood = async (foodData) => {
    if (!user) return;
    try {
      const res = await serviceCreatePersonalFood({ userId: user.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => [...prev, res.data].sort((a, b) => a.food_name.localeCompare(b.food_name)));
      showToast(`⭐ ${foodData.food_name} saved to My Foods!`, 'success');
    } catch (err) {
      showToast(`Failed to save personal food: ${err.message}`, 'error');
    }
  };

  const handleUpdatePersonalFood = async (foodData) => {
    if (!user || !foodData.id) return;
    try {
      const res = await serviceUpdatePersonalFood({ userId: user.id, foodId: foodData.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => prev.map((f) => (f.id === foodData.id ? res.data : f)));
      showToast(`⭐ ${foodData.food_name} updated!`, 'success');
    } catch (err) {
      showToast(`Failed to update personal food: ${err.message}`, 'error');
    }
  };

  const handleDeletePersonalFood = async (foodId) => {
    if (!user || !foodId) return;
    try {
      const res = await serviceDeletePersonalFood({ userId: user.id, foodId });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods((prev) => prev.filter((f) => f.id !== foodId));
      showToast('🗑 Personal food deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete personal food: ${err.message}`, 'error');
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
        background: '#0B0D0F',
        minHeight: '100vh',
        color: '#F5F5F5',
        position: 'relative',
      }}
    >
      {/* ─── 1. HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '36px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#6B7280',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              marginBottom: '6px',
            }}
          >
            HEALTH
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 800,
              color: '#F5F5F5',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}
          >
            Body State.
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6B7280',
            cursor: 'pointer',
            padding: '4px',
          }}
          aria-label="Health and Nutrition Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ─── 2. PRIMARY HERO: BODY STATE SENTENCE ──────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 800,
          color: '#F5F5F5',
          margin: '0 0 6px',
          letterSpacing: '-0.03em',
          lineHeight: 1.25,
        }}>
          "{bodySentence}"
        </h2>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>
          {todayDisplay}
        </div>
      </div>

      {/* ─── 3. BODY RHYTHM ROWS ────────────────────────────────────────────── */}
      <div style={{ padding: '24px 20px 0', display: 'flex', flexDirection: 'column' }}>
        {/* SLEEP */}
        <BodyRhythmRow
          label="Sleep"
          state={healthState.sleep.hours > 0 ? (healthState.sleep.hours >= 7 ? 'Good' : 'Short') : 'Not logged'}
          value={healthState.sleep.hours > 0 ? `${Math.floor(healthState.sleep.hours)}h ${Math.round((healthState.sleep.hours % 1) * 60)}m` : '—'}
          stateColor={healthState.sleep.hours >= 7 ? '#1FA36F' : healthState.sleep.hours > 0 ? '#F59E0B' : '#6B7280'}
          onClick={() => handleLogSleep(7.5, 3)}
        />

        {/* WATER */}
        <BodyRhythmRow
          label="Water"
          state={healthState.hydration.ml >= (healthState.hydration.targetMl || 2500) ? 'Optimal' : `${(healthState.hydration.ml / 1000).toFixed(1)}L logged`}
          value={`${(healthState.hydration.ml / 1000).toFixed(1)}L`}
          stateColor={healthState.hydration.ml >= 2000 ? '#1FA36F' : '#60A5FA'}
          onClick={() => handleLogWater(250)}
        />

        {/* FUEL */}
        <BodyRhythmRow
          label="Fuel"
          state={healthState.fuel.calorieScore >= 70 ? 'Good' : healthState.fuel.mealsLogged > 0 ? `${healthState.fuel.mealsLogged} logged` : 'Pending'}
          value={healthState.fuel.calories > 0 ? `${Math.round(healthState.fuel.calories)} kcal` : '—'}
          stateColor={healthState.fuel.calorieScore >= 70 ? '#1FA36F' : '#9CA3AF'}
          onClick={() => setActivePickerMealType('lunch')}
        />

        {/* MOVEMENT */}
        <BodyRhythmRow
          label="Movement"
          state={healthState.movement.minutes >= 30 ? 'Active' : healthState.movement.minutes > 0 ? 'Light' : 'Rest'}
          value={healthState.movement.minutes > 0 ? `${healthState.movement.minutes}m` : '—'}
          stateColor={healthState.movement.minutes >= 30 ? '#1FA36F' : '#9CA3AF'}
          onClick={() => handleLogWorkout('Workout', 30, 7)}
        />
      </div>

      {/* ─── 4. QUICK CAPTURE STRIP (SECONDARY) ────────────────────────────── */}
      <div style={{ padding: '24px 20px 0' }}>
        <div style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#6B7280',
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: '10px',
        }}>
          Quick Log
        </div>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleLogWater(250)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(96, 165, 250, 0.1)',
              border: '1px solid rgba(96, 165, 250, 0.25)',
              color: '#60A5FA',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + 250ml Water
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleLogSleep(7.5, 3)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(31, 163, 111, 0.1)',
              border: '1px solid rgba(31, 163, 111, 0.25)',
              color: '#1FA36F',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + 7.5h Sleep
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setActivePickerMealType('lunch')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#F59E0B',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + Food
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleLogWorkout('Workout', 30, 7)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'rgba(167, 139, 250, 0.1)',
              border: '1px solid rgba(167, 139, 250, 0.25)',
              color: '#A78BFA',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            + 30m Workout
          </button>
        </div>
      </div>

      {/* ─── 5. PROGRESSIVE DISCLOSURE: DETAILED LOGS & CONSISTENCY ─────────── */}
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
          <span>{showDetailedLogs ? '▲ Hide detailed logs & consistency' : '▼ View detailed telemetry & consistency'}</span>
        </button>

        {showDetailedLogs && (
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Heatmap */}
            <div style={{
              background: '#15181B',
              border: '1px solid #1C1D21',
              borderRadius: '12px',
              padding: '16px',
            }}>
              <HeatmapGrid color="#1FA36F" dataMap={heatmapData} label="Bio Consistency (90 Days)" />
            </div>

            {/* Nutrition Breakdown */}
            <NutritionCard
              fuel={healthState.fuel}
              mealLogs={mealLogs}
              personalUsuals={personalUsuals}
              savedMeals={savedMeals}
              userId={user?.id}
              onAddFood={(type) => setActivePickerMealType(type)}
              onDeleteLog={handleDeleteMealLog}
              onEditLog={(log) => setEditingMealLog(log)}
              onLogSavedMeal={handleLogSavedMeal}
              onDeleteSavedMeal={handleDeleteSavedMeal}
              onSelectUsual={handleSelectUsual}
              onRepeatYesterday={handleRepeatYesterday}
              onMealSaved={(newMeal) => setSavedMeals((prev) => [newMeal, ...prev])}
            />
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
