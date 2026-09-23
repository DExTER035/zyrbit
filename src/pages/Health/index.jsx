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
  HealthStateHero,
  QuickCaptureBar,
  WaterCard,
  SleepCard,
  ActivityCard,
  NutritionCard,
  WeightCard,
} from '../../components/domain/health/index.js';

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
      showToast(`💧 +${res.data?.amount_ml || amount}ml water logged!`, 'success');
    } catch (err) {
      showToast(`Failed to log water: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWater = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteWaterLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete water log: ${res.error}`, 'error');
        return;
      }
      setWaterLogs((prev) => prev.filter((w) => w.id !== logId));
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
      showToast('😴 Sleep logged!', 'success');
    } catch (err) {
      showToast(`Failed to log sleep: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSleep = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteSleepLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete sleep log: ${res.error}`, 'error');
        return;
      }
      setSleepLogs((prev) => prev.filter((s) => s.id !== logId));
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
      showToast('🏋️ Workout logged!', 'success');
    } catch (err) {
      showToast(`Failed to log workout: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteWorkout = async (logId) => {
    if (!user || isSubmitting || !logId) return;
    setIsSubmitting(true);
    try {
      const res = await serviceDeleteActivityLog({ userId: user.id, logId });
      if (!res.success) {
        showToast(`Failed to delete workout: ${res.error}`, 'error');
        return;
      }
      setMoveLogs((prev) => prev.filter((m) => m.id !== logId));
      showToast('🏋️ Workout deleted', 'success');
    } catch (err) {
      showToast(`Failed to delete workout: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Weight
  const handleLogWeight = async (weightVal) => {
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

  const handleDeleteWeight = async (logId) => {
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
        background: C.bg,
        minHeight: '100vh',
        color: C.text,
        position: 'relative',
        '--color-accent': C.recovery,
        '--color-accent-dim': `${C.recovery}20`,
      }}
    >
      {/* ─── 1. HEADER ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div
            style={{
              fontSize: '10px',
              color: C.recovery,
              fontWeight: 800,
              letterSpacing: 'var(--ls-caps)',
              textTransform: 'uppercase',
              marginBottom: '4px',
            }}
          >
            HEALTH
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 700,
              margin: 0,
              color: C.text,
              lineHeight: 1.1,
              letterSpacing: '-0.5px',
            }}
          >
            Physical OS.
          </h1>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>
            {todayDisplay}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowSettingsModal(true)}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.sub,
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = C.recovery;
            e.currentTarget.style.color = C.recovery;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = C.border;
            e.currentTarget.style.color = C.sub;
          }}
          aria-label="Health and Nutrition Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ─── 2. MAIN HEALTH FEED ────────────────────────────────────────────── */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>
        {/* HOW AM I? ── HEALTH STATE HERO */}
        <HealthStateHero healthState={healthState} />

        {/* QUICK CAPTURE ── 1-TAP FAST INPUTS */}
        <QuickCaptureBar
          onQuickWater={handleLogWater}
          onQuickSleepWell={() => handleLogSleep(7.5, 3)}
          onOpenMealPicker={() => setActivePickerMealType('lunch')}
          onOpenWorkoutModal={() => {
            // Smoothly scrolls to movement card
            const el = document.getElementById('movement-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenWeightModal={() => {
            const el = document.getElementById('weight-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          topUsual={personalUsuals[0] || null}
          isSubmitting={isSubmitting}
        />

        {/* HEALTH PILLARS ── SLEEP & HYDRATION */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SleepCard
            sleepLogs={sleepLogs}
            sleepDebt={healthState.sleep.debt}
            onLogSleep={handleLogSleep}
            onDeleteSleep={handleDeleteSleep}
            isSubmitting={isSubmitting}
          />

          <WaterCard
            todayWater={healthState.hydration.ml}
            dynamicTarget={healthState.hydration.targetMl}
            onLogWater={handleLogWater}
            onDeleteWater={handleDeleteWater}
            waterLogs={waterLogs}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* HEALTH PILLAR ── NUTRITION & FUEL (SUBDOMAIN UNDER HEALTH) */}
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

        {/* HEALTH PILLARS ── MOVEMENT & WEIGHT */}
        <div id="movement-section" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ActivityCard
            moveLogs={moveLogs}
            onLogWorkout={handleLogWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            isSubmitting={isSubmitting}
          />
        </div>

        <div id="weight-section">
          <WeightCard
            weightLogs={weightLogs}
            onLogWeight={handleLogWeight}
            onDeleteWeight={handleDeleteWeight}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* 90-DAY BIO CONSISTENCY */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '16px',
            padding: '16px 18px',
          }}
        >
          <HeatmapGrid
            color={C.recovery}
            dataMap={heatmapData}
            label="Bio Consistency (90 Days)"
          />
        </div>
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
