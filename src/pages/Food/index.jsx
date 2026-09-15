import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, Droplet, Sparkles, Flame, Trophy, 
  Calendar, TrendingUp, Info, RefreshCw, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell 
} from 'recharts';
import { supabase } from '../../lib/supabase/index.js';
import { showToast } from '../../components/ui/Toast.jsx';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { FC, todayStr } from '../../components/domain/food/shared.jsx';
import DailyCalorieRing from '../../components/domain/food/DailyCalorieRing.jsx';
import MealSection from '../../components/domain/food/MealSection.jsx';
import FoodPicker from '../../components/domain/food/FoodPicker.jsx';
import NutritionSummary from '../../components/domain/food/NutritionSummary.jsx';
import SavedMealsSection from '../../components/domain/food/SavedMealsSection.jsx';
import EditLogModal from '../../components/domain/food/EditLogModal.jsx';
import PersonalUsualsBar from '../../components/domain/food/PersonalUsualsBar.jsx';
import { computePersonalUsuals } from '../../engines/food/index.js';
import { getNutritionInsights } from '../../lib/ai/index.js';
import { DEFAULT_CALORIE_GOAL, DEFAULT_MACRO_GOALS } from '../../data/foods/index.js';
import {
  logMeal as serviceLogMeal,
  updateMealLog as serviceUpdateMealLog,
  deleteMealLog as serviceDeleteMealLog,
  createPersonalFood as serviceCreatePersonalFood,
  updatePersonalFood as serviceUpdatePersonalFood,
  deletePersonalFood as serviceDeletePersonalFood,
} from '../../services/foodService.js';
import { logWater as serviceLogWater } from '../../services/healthService.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const TABS = ['today', 'weekly', 'monthly', 'trends', 'coach'];

// Tooltip style for Recharts
const TooltipStyle = { 
  background: '#15181B', 
  border: '1px solid #1C1D21', 
  borderRadius: 8, 
  fontSize: 11, 
  color: '#F5F5F5' 
};

export default function Food() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [activePicker, setActivePicker] = useState(null);
  const [editingLog, setEditingLog] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Core logs, settings, and personal food library
  const [logs, setLogs] = useState([]); // Today's raw meal logs
  const [personalFoods, setPersonalFoods] = useState([]); // User's personal food library
  const [settings, setSettings] = useState({
    calorie_goal: DEFAULT_CALORIE_GOAL,
    protein_goal: DEFAULT_MACRO_GOALS.protein,
    carbs_goal: DEFAULT_MACRO_GOALS.carbs,
    fat_goal: DEFAULT_MACRO_GOALS.fat,
    fiber_goal: DEFAULT_MACRO_GOALS.fiber,
  });
  const [savedMeals, setSavedMeals] = useState([]);

  // Historical summaries & extra logs
  const [summaries, setSummaries] = useState([]); // 60 days of pre-aggregated records
  const [todayWater, setTodayWater] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(70);

  // AI & chart options state
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weeklyMetric, setWeeklyMetric] = useState('calories'); // calories | protein | water
  const [weeklyChartType, setWeeklyChartType] = useState('bar'); // bar | line | heatmap

  // ── DATA FETCHING ──────────────────────────────────────────────────────────
  const loadUserData = useCallback(async (uid) => {
    // 1. Settings
    try {
      const { data } = await supabase.from('food_settings').select('*').eq('user_id', uid).maybeSingle();
      if (data) {
        setSettings(data);
        localStorage.setItem(`dexos_food_settings_${uid}`, JSON.stringify(data));
      } else {
        const local = localStorage.getItem(`dexos_food_settings_${uid}`);
        if (local) setSettings(JSON.parse(local));
      }
    } catch {
      const local = localStorage.getItem(`dexos_food_settings_${uid}`);
      if (local) setSettings(JSON.parse(local));
    }

    // 2. Saved Meals
    try {
      const { data } = await supabase.from('saved_meals').select('*').eq('user_id', uid).order('created_at', { ascending: false });
      if (data) setSavedMeals(data);
    } catch (e) {
      console.warn('Food: saved meals load error', e.message);
    }

    // 3. User Current Weight Goal
    try {
      const { data: sysGoals } = await supabase.from('system_goals').select('weight_current').eq('user_id', uid).maybeSingle();
      if (sysGoals?.weight_current) {
        setCurrentWeight(parseFloat(sysGoals.weight_current));
      }
    } catch (e) {
      console.warn('Food: system goals weight error', e.message);
    }

    // 4. Personal Food Library
    try {
      const { data: libData } = await supabase
        .from('user_food_library')
        .select('*')
        .eq('user_id', uid)
        .order('food_name', { ascending: true });
      if (libData) setPersonalFoods(libData);
    } catch (e) {
      console.warn('Food: user_food_library load error', e.message);
    }
  }, []);

  const loadLogsAndHistory = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();
    const lsKeyToday = `dexos_food_logs_${uid}_${today}`;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    try {
      // 1. Today's raw meal logs
      const { data: todayLogsData } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('date', today)
        .order('created_at', { ascending: true });

      setLogs(todayLogsData ?? []);
      localStorage.setItem(lsKeyToday, JSON.stringify(todayLogsData ?? []));

      // 2. Today's current water logs
      const { data: todayWaterData } = await supabase
        .from('health_water_logs')
        .select('amount_ml')
        .eq('user_id', uid)
        .eq('log_date', today);

      const waterSum = (todayWaterData || []).reduce((s, w) => s + (w.amount_ml || 0), 0);
      setTodayWater(waterSum);

      // 3. Nutrition daily summaries
      const { data: summaryData, error: summaryErr } = await supabase
        .from('nutrition_daily_summary')
        .select('*')
        .eq('user_id', uid)
        .gte('date', sixtyDaysAgoStr)
        .order('date', { ascending: true });

      if (!summaryErr && summaryData && summaryData.length > 0) {
        setSummaries(summaryData);
      } else {
        // Fallback aggregation
        const [mealsRes, waterRes, weightRes] = await Promise.all([
          supabase.from('meal_logs').select('*').eq('user_id', uid).gte('date', sixtyDaysAgoStr),
          supabase.from('health_water_logs').select('*').eq('user_id', uid).gte('log_date', sixtyDaysAgoStr),
          supabase.from('health_weight_logs').select('*').eq('user_id', uid).gte('log_date', sixtyDaysAgoStr)
        ]);

        const rawMeals = mealsRes.data || [];
        const rawWater = waterRes.data || [];
        const rawWeights = weightRes.data || [];

        const localMap = {};
        for (let i = 0; i <= 60; i++) {
          const tempDate = new Date();
          tempDate.setDate(tempDate.getDate() - i);
          const dateKey = tempDate.toISOString().split('T')[0];
          localMap[dateKey] = {
            date: dateKey,
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            water: 0,
            weight: null
          };
        }

        rawMeals.forEach(m => {
          if (localMap[m.date]) {
            localMap[m.date].calories += parseFloat(m.calories || 0);
            localMap[m.date].protein += parseFloat(m.protein || 0);
            localMap[m.date].carbs += parseFloat(m.carbs || 0);
            localMap[m.date].fat += parseFloat(m.fat || 0);
            localMap[m.date].fiber += parseFloat(m.fiber || 0);
          }
        });

        rawWater.forEach(w => {
          if (localMap[w.log_date]) {
            localMap[w.log_date].water += parseInt(w.amount_ml || 0, 10);
          }
        });

        rawWeights.forEach(wt => {
          if (localMap[wt.log_date]) {
            localMap[wt.log_date].weight = parseFloat(wt.weight);
          }
        });

        const merged = Object.values(localMap).sort((a, b) => a.date.localeCompare(b.date));
        setSummaries(merged);

        const sortedWeights = [...rawWeights].sort((a,b) => b.log_date.localeCompare(a.log_date));
        if (sortedWeights.length > 0) {
          setCurrentWeight(parseFloat(sortedWeights[0].weight));
        }
      }
    } catch (e) {
      console.warn('Food: error loading historical aggregates', e.message);
      const local = localStorage.getItem(lsKeyToday);
      setLogs(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadLogsAndHistory(session.user.id);
      loadUserData(session.user.id);
      
      const cachedAi = localStorage.getItem(`dexos_nutrition_insights_${session.user.id}`);
      if (cachedAi) setAiInsights(JSON.parse(cachedAi));
    });
  }, [navigate, loadLogsAndHistory, loadUserData]);

  // ─── Dex OS Live Invalidation ───────────────────────────────────────────────
  useEffect(() => {
    const handleDexRefresh = (e) => {
      if (e.detail?.domain === 'food' || e.detail?.domain === 'health' || !e.detail?.domain) {
        if (user?.id) {
          loadLogsAndHistory(user.id);
          loadUserData(user.id);
        }
      }
    };
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => window.removeEventListener('dexos:refresh', handleDexRefresh);
  }, [user, loadLogsAndHistory, loadUserData]);

  // ── DERIVED METRICS ────────────────────────────────────────────────────────
  const totals = useMemo(() => logs.reduce((acc, l) => ({
    cal:     acc.cal     + (l.calories || 0),
    protein: acc.protein + (l.protein  || 0),
    carbs:   acc.carbs   + (l.carbs    || 0),
    fat:     acc.fat     + (l.fat      || 0),
    fiber:   acc.fiber   + (l.fiber    || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [logs]);

  const macroGoals = useMemo(() => ({
    protein: settings.protein_goal,
    carbs:   settings.carbs_goal,
    fat:     settings.fat_goal,
    fiber:   settings.fiber_goal,
  }), [settings]);

  const logsByMeal = useMemo(() => {
    const map = {};
    MEAL_TYPES.forEach(t => { map[t] = []; });
    logs.forEach(l => {
      if (map[l.meal_type]) map[l.meal_type].push(l);
    });
    return map;
  }, [logs]);

  const recentFoodIds = useMemo(() => {
    const seen = new Set();
    return logs
      .slice()
      .reverse()
      .map(l => l.food_id)
      .filter(id => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .slice(0, 12);
  }, [logs]);

  // Compute deterministic personal usuals for 1-tap quick logging
  const personalUsuals = useMemo(() => {
    return computePersonalUsuals(personalFoods, logs, 6);
  }, [personalFoods, logs]);

  // Sync today's logged state inside summaries array
  const realTimeSummaries = useMemo(() => {
    const today = todayStr();
    const updated = summaries.map(s => {
      if (s.date === today) {
        return {
          ...s,
          calories: totals.cal,
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
          fiber: totals.fiber,
          water: todayWater,
          weight: s.weight || currentWeight
        };
      }
      return s;
    });

    if (!updated.some(s => s.date === today)) {
      updated.push({
        date: today,
        calories: totals.cal,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        fiber: totals.fiber,
        water: todayWater,
        weight: currentWeight
      });
    }
    return updated.sort((a,b) => a.date.localeCompare(b.date));
  }, [summaries, totals, todayWater, currentWeight]);

  // ── PERSONAL FOOD LIBRARY MUTATIONS ──────────────────────────────────────
  const handleCreatePersonalFood = useCallback(async (foodData) => {
    if (!user) return;
    try {
      const res = await serviceCreatePersonalFood({ userId: user.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods(prev => [...prev, res.data].sort((a,b) => a.food_name.localeCompare(b.food_name)));
      showToast(`⭐ ${foodData.food_name} saved to My Foods!`, 'success');
    } catch (err) {
      console.error('Error creating personal food:', err.message);
      showToast(`Failed to save personal food: ${err.message}`, 'error');
    }
  }, [user]);

  const handleUpdatePersonalFood = useCallback(async (foodData) => {
    if (!user || !foodData.id) return;
    try {
      const res = await serviceUpdatePersonalFood({ userId: user.id, foodId: foodData.id, ...foodData });
      if (!res.success) throw new Error(res.error);
      setPersonalFoods(prev => prev.map(f => f.id === foodData.id ? res.data : f));
      showToast(`⭐ ${foodData.food_name} updated!`, 'success');
    } catch (err) {
      console.error('Error updating personal food:', err.message);
      showToast(`Failed to update personal food: ${err.message}`, 'error');
    }
  }, [user]);

  const handleDeletePersonalFood = useCallback(async (foodId) => {
    if (!user || !foodId) return;
    const prevList = [...personalFoods];
    setPersonalFoods(prev => prev.filter(f => f.id !== foodId));
    try {
      const res = await serviceDeletePersonalFood({ userId: user.id, foodId });
      if (!res.success) throw new Error(res.error);
      showToast('🗑 Personal food deleted', 'success');
    } catch (err) {
      console.error('Error deleting personal food:', err.message);
      setPersonalFoods(prevList);
      showToast(`Failed to delete personal food: ${err.message}`, 'error');
    }
  }, [user, personalFoods]);

  // ── MEAL LOG MUTATIONS (DB-FIRST WITH ROLLBACK) ───────────────────────────
  const handleAddFood = useCallback(async ({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }) => {
    if (!user || !activePicker) return;
    const cleanName = (food_name || 'Food').trim().slice(0, 150);
    const today = todayStr();
    const mealType = activePicker;
    const prevLogs = [...logs];

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
      if (!res.success) throw new Error(res.error);

      setLogs(prev => [...prev, res.data]);
      showToast(`🍱 ${cleanName} logged!`, 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.error('Food DB log error:', err.message);
      setLogs(prevLogs);
      showToast(`Failed to log food: ${err.message}`, 'error');
    }
  }, [user, activePicker, logs, loadLogsAndHistory]);

  const handleEditLogSave = useCallback(async ({ logId, newQty, newMealType, calories, protein, carbs, fat, fiber }) => {
    if (!user || !logId) return;
    const prevLogs = [...logs];

    setLogs(prev => prev.map(l => l.id === logId ? {
      ...l,
      quantity_g: newQty,
      meal_type: newMealType,
      calories,
      protein,
      carbs,
      fat,
      fiber
    } : l));

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

      if (!res.success) throw new Error(res.error);
      showToast('✏️ Meal updated!', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.error('Error updating meal log:', err.message);
      setLogs(prevLogs);
      showToast(`Failed to update meal log: ${err.message}`, 'error');
    }
  }, [user, logs, loadLogsAndHistory]);

  const handleDeleteLog = useCallback(async (logId) => {
    if (!user || !logId) return;
    const prevLogs = [...logs];
    setLogs(prev => prev.filter(l => l.id !== logId));

    try {
      const res = await serviceDeleteMealLog({ userId: user.id, logId });
      if (!res.success) throw new Error(res.error);

      showToast('🗑 Meal deleted', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.error('Food DB delete error:', err.message);
      setLogs(prevLogs);
      showToast(`Failed to delete meal: ${err.message}`, 'error');
    }
  }, [user, logs, loadLogsAndHistory]);

  const handleWaterQuickAdd = useCallback(async (amountMl) => {
    if (!user) return;
    const today = todayStr();
    setTodayWater(prev => prev + amountMl);
    
    try {
      const res = await serviceLogWater({ userId: user.id, amountMl, date: today });
      if (!res.success) throw new Error(res.error);
      showToast(`💧 logged +${amountMl}ml!`, 'success');
      loadLogsAndHistory(user.id);
    } catch (e) {
      console.warn('Water log failed:', e.message);
      setTodayWater(prev => Math.max(0, prev - amountMl));
      showToast(`Failed to log water: ${e.message}`, 'error');
    }
  }, [user, loadLogsAndHistory]);

  const handleLogSavedMeal = useCallback(async (savedMeal) => {
    if (!user) return;
    const today = todayStr();
    const items = savedMeal.items || [];

    try {
      const rows = items.map(item => ({
        user_id: user.id,
        date: today,
        meal_type: savedMeal.meal_type,
        food_id: item.food_id || null,
        food_name: item.food_name,
        quantity_g: item.quantity_g,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
      }));

      const { data, error } = await supabase.from('meal_logs').insert(rows).select();
      if (error) throw error;

      if (data) {
        setLogs(prev => [...prev, ...data]);
      }
      showToast('🍱 Saved meal logged!', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.error('Food DB saved meal log failed:', err.message);
      showToast(`Failed to log saved meal: ${err.message}`, 'error');
    }
  }, [user, loadLogsAndHistory]);

  const handleRepeatYesterday = useCallback(async () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const today = todayStr();
    
    let yLogs = [];
    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yStr);
      if (!dbErr) yLogs = data ?? [];
    } catch (e) {
      console.warn('Silent catch:', e.message);
    }

    if (!yLogs || yLogs.length === 0) {
      showToast('No logs found for yesterday', 'info');
      return;
    }

    const newRows = yLogs.map((log) => {
      const rest = { ...log };
      delete rest.id;
      delete rest.created_at;
      delete rest.date;
      return { 
        ...rest, 
        date: today, 
        user_id: user.id,
      };
    });

    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .insert(newRows)
        .select();

      if (dbErr) throw dbErr;

      setLogs(prev => [...prev, ...(data || [])]);
      showToast('🔁 Yesterday\'s meals logged for today!', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.error('Food DB repeat yesterday failed:', err.message);
      showToast(`Failed to repeat meals: ${err.message}`, 'error');
    }
  }, [user, loadLogsAndHistory]);

  // AI Coaching Handler
  const handleGenerateAiInsights = async () => {
    if (!user || aiLoading) return;
    setAiLoading(true);

    try {
      const past30Days = realTimeSummaries.slice(-30);
      if (past30Days.length === 0) {
        showToast('Log a few meals first to unlock AI insights!', 'info');
        setAiLoading(false);
        return;
      }

      const historyText = past30Days.map(d => 
        `Date: ${d.date} | Cals: ${Math.round(d.calories)} | P: ${Math.round(d.protein)}g | C: ${Math.round(d.carbs)}g | F: ${Math.round(d.fat)}g | Water: ${d.water}ml | Weight: ${d.weight ? d.weight + 'kg' : 'N/A'}`
      ).join('\n');

      const goalText = `Calorie Goal: ${settings.calorie_goal} kcal | Protein Goal: ${settings.protein_goal}g | Carbs Goal: ${settings.carbs_goal}g | Fat Goal: ${settings.fat_goal}g`;

      const responseText = await getNutritionInsights(historyText, goalText);
      const bulletList = responseText
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim())
        .filter(line => line.length > 0);

      setAiInsights(bulletList);
      localStorage.setItem(`dexos_nutrition_insights_${user.id}`, JSON.stringify(bulletList));
      showToast('🧠 Insights generated by Dex AI!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Could not fetch AI insights. Check API key.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // ── SUBTAB VIEW RENDERING ──────────────────────────────────────────────────
  const renderTodayTab = () => {
    const todayDisplay = new Date().toLocaleDateString('en-IN', {
      weekday: 'long', month: 'long', day: 'numeric',
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ fontSize: '12px', color: FC.muted }}>{todayDisplay}</div>
        
        <DailyCalorieRing
          totals={totals}
          goal={settings.calorie_goal}
          macroGoals={macroGoals}
          water={todayWater}
          waterGoal={3000}
          onAddWater={handleWaterQuickAdd}
        />

        <PersonalUsualsBar
          usuals={personalUsuals}
          onSelectUsual={(food) => {
            setActivePicker('lunch');
            handleAddFood({
              food_id: food.id || null,
              food_name: food.food_name,
              quantity_g: food.serving_size_g,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
              fiber: food.fiber,
            });
          }}
        />

        <SavedMealsSection
          savedMeals={savedMeals}
          userId={user?.id}
          onLogSavedMeal={handleLogSavedMeal}
          onDelete={(id) => setSavedMeals(prev => prev.filter(m => m.id !== id))}
          today={todayStr()}
        />

        {MEAL_TYPES.map(mealType => (
          <MealSection
            key={mealType}
            mealType={mealType}
            logs={logsByMeal[mealType]}
            userId={user?.id}
            onAddFood={(type) => setActivePicker(type)}
            onDeleteLog={handleDeleteLog}
            onEditLog={(log) => setEditingLog(log)}
            onMealSaved={(newMeal) => setSavedMeals(prev => [newMeal, ...prev])}
          />
        ))}

        {logs.length > 0 && (
          <NutritionSummary
            totals={totals}
            macroGoals={macroGoals}
            onRepeatYesterday={handleRepeatYesterday}
          />
        )}

        {logs.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '32px 24px',
            background: FC.surface,
            borderRadius: '20px',
            border: `1px solid ${FC.border}`,
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍱</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: FC.text, marginBottom: '4px' }}>
              Nothing logged yet today
            </div>
            <div style={{ fontSize: '12px', color: FC.muted }}>
              Tap "+ Add Food" in any meal section to start
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderWeeklyTab = () => {
    const past7Days = realTimeSummaries.slice(-7);
    const totalCal = past7Days.reduce((s, d) => s + (d.calories || 0), 0);
    const avgCal = Math.round(totalCal / 7);
    const maxDay = [...past7Days].sort((a,b) => b.calories - a.calories)[0];
    const avgProtein = Math.round(past7Days.reduce((s, d) => s + (d.protein || 0), 0) / 7);
    const avgWater = Math.round(past7Days.reduce((s, d) => s + (d.water || 0), 0) / 7);

    const isChartEmpty = past7Days.every(d => d.calories === 0 && d.water === 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <StatMiniCard label="7-Day Avg Cals" value={`${avgCal} kcal`} sub={`Goal: ${settings.calorie_goal}`} color={FC.food} />
          <StatMiniCard label="7-Day Avg Protein" value={`${avgProtein} g`} sub={`Goal: ${settings.protein_goal}g`} color={FC.protein} />
          <StatMiniCard label="Peak Day" value={maxDay ? `${Math.round(maxDay.calories)} kcal` : 'N/A'} sub={maxDay?.date} />
          <StatMiniCard label="7-Day Avg Water" value={`${avgWater} ml`} sub="Target: 3000 ml" color={FC.water} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['calories', 'protein', 'water'].map(m => (
              <button
                key={m}
                onClick={() => setWeeklyMetric(m)}
                style={{
                  background: weeklyMetric === m ? FC.food : FC.elev,
                  border: `1px solid ${weeklyMetric === m ? FC.food : FC.border2}`,
                  borderRadius: '100px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: weeklyMetric === m ? '#000' : FC.sub,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['bar', 'line', 'heatmap'].map(t => (
              <button
                key={t}
                onClick={() => setWeeklyChartType(t)}
                style={{
                  background: weeklyChartType === t ? FC.foodDim : FC.surface,
                  border: `1px solid ${weeklyChartType === t ? FC.food : FC.border}`,
                  borderRadius: '100px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: weeklyChartType === t ? FC.food : FC.sub,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ 
          background: FC.surface, 
          border: `1px solid ${FC.border}`, 
          borderRadius: '20px', 
          padding: '20px 16px 16px',
          height: '240px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          {isChartEmpty ? (
            <div style={{ textAlign: 'center', color: FC.muted, fontSize: '13px' }}>
              No water, protein, or calories logged in the past week.
            </div>
          ) : weeklyChartType === 'heatmap' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
              <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Weekly Completion Heatmap (Metrics vs Day)
              </div>
              {['calories', 'protein', 'water'].map(metric => (
                <div key={metric} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10px', color: FC.sub, width: '50px', textTransform: 'capitalize', fontWeight: 700 }}>{metric}</span>
                  <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                    {past7Days.map(d => {
                      let val = d[metric] || 0;
                      let goal = metric === 'calories' ? settings.calorie_goal : metric === 'protein' ? settings.protein_goal : 3000;
                      let ratio = Math.min(1, val / goal);
                      let opacity = ratio < 0.2 ? 0.15 : ratio < 0.5 ? 0.4 : ratio < 0.85 ? 0.7 : 1.0;
                      let color = metric === 'calories' ? FC.food : metric === 'protein' ? FC.protein : FC.water;
                      
                      return (
                        <div 
                          key={d.date} 
                          title={`${d.date}: ${Math.round(val)} / ${goal}`}
                          style={{
                            flex: 1,
                            height: '24px',
                            borderRadius: '6px',
                            background: color,
                            opacity: opacity,
                            transition: 'opacity 0.2s'
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {weeklyChartType === 'bar' ? (
                <BarChart data={past7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={FC.border2} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: FC.muted, fontSize: 10 }} tickFormatter={str => str.split('-').slice(1).join('/')} stroke={FC.border2} />
                  <YAxis tick={{ fill: FC.muted, fontSize: 10 }} stroke={FC.border2} />
                  <Tooltip contentStyle={TooltipStyle} formatter={(val) => [`${Math.round(val)}`, weeklyMetric.toUpperCase()]} />
                  <Bar dataKey={weeklyMetric} fill={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : FC.water} radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={past7Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={FC.border2} vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: FC.muted, fontSize: 10 }} tickFormatter={str => str.split('-').slice(1).join('/')} stroke={FC.border2} />
                  <YAxis tick={{ fill: FC.muted, fontSize: 10 }} stroke={FC.border2} />
                  <Tooltip contentStyle={TooltipStyle} formatter={(val) => [`${Math.round(val)}`, weeklyMetric.toUpperCase()]} />
                  <Line type="monotone" dataKey={weeklyMetric} stroke={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : FC.water} strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
  };

  const renderMonthlyTab = () => {
    const past30Days = realTimeSummaries.slice(-30);
    const totalCal = past30Days.reduce((s, d) => s + (d.calories || 0), 0);
    const avgCal = Math.round(totalCal / 30);
    const avgProtein = Math.round(past30Days.reduce((s, d) => s + (d.protein || 0), 0) / 30);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <StatMiniCard label="30-Day Avg Cals" value={`${avgCal} kcal`} sub={`Target: ${settings.calorie_goal}`} color={FC.food} />
          <StatMiniCard label="30-Day Avg Protein" value={`${avgProtein} g`} sub={`Target: ${settings.protein_goal}g`} color={FC.protein} />
        </div>

        <div style={{ 
          background: FC.surface, 
          border: `1px solid ${FC.border}`, 
          borderRadius: '20px', 
          padding: '20px 16px 16px',
          height: '240px',
        }}>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            30-Day Calorie Intake Trend
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={past30Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={FC.food} stopOpacity={0.4}/>
                  <stop offset="95%" stopColor={FC.food} stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={FC.border2} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: FC.muted, fontSize: 9 }} tickFormatter={str => str.split('-').slice(1).join('/')} stroke={FC.border2} />
              <YAxis tick={{ fill: FC.muted, fontSize: 9 }} stroke={FC.border2} />
              <Tooltip contentStyle={TooltipStyle} formatter={(val) => [`${Math.round(val)} kcal`, 'Intake']} />
              <Area type="monotone" dataKey="calories" stroke={FC.food} fillOpacity={1} fill="url(#calGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTrendsTab = () => {
    const past60Days = realTimeSummaries.slice(-60);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ 
          background: FC.surface, 
          border: `1px solid ${FC.border}`, 
          borderRadius: '20px', 
          padding: '20px 16px 16px',
          height: '260px',
        }}>
          <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            60-Day Macro & Weight Correlation
          </div>
          <ResponsiveContainer width="100%" height="82%">
            <LineChart data={past60Days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={FC.border2} vertical={false} />
              <XAxis dataKey="date" tick={{ fill: FC.muted, fontSize: 9 }} tickFormatter={str => str.split('-').slice(1).join('/')} stroke={FC.border2} />
              <YAxis yAxisId="left" tick={{ fill: FC.muted, fontSize: 9 }} stroke={FC.border2} />
              <YAxis yAxisId="right" orientation="right" domain={['dataMin - 2', 'dataMax + 2']} tick={{ fill: FC.protein, fontSize: 9 }} stroke={FC.border2} />
              <Tooltip contentStyle={TooltipStyle} />
              <Line yAxisId="left" type="monotone" dataKey="calories" stroke={FC.food} strokeWidth={2} dot={false} name="Calories" />
              <Line yAxisId="right" type="monotone" dataKey="weight" stroke={FC.protein} strokeWidth={2} dot={{ r: 2 }} name="Weight (kg)" connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderCoachTab = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: FC.surface,
          border: `1px solid ${FC.border}`,
          borderRadius: '20px',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '24px' }}>🧠</span>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: FC.text }}>Dex AI Nutrition Intelligence</div>
              <div style={{ fontSize: '11px', color: FC.muted }}>Personalized eating pattern insights</div>
            </div>
          </div>

          {aiInsights ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
              {aiInsights.map((insight, idx) => (
                <div key={idx} style={{
                  background: FC.elev,
                  padding: '12px 14px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: FC.sub,
                  lineHeight: '1.4',
                  borderLeft: `3px solid ${FC.food}`,
                }}>
                  {insight}
                </div>
              ))}
              <button
                onClick={handleGenerateAiInsights}
                disabled={aiLoading}
                style={{
                  marginTop: '10px',
                  padding: '10px',
                  borderRadius: '12px',
                  background: FC.elev,
                  border: `1px solid ${FC.border2}`,
                  color: FC.food,
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {aiLoading ? 'Analyzing...' : 'Refresh Insights ⚡'}
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <button
                onClick={handleGenerateAiInsights}
                disabled={aiLoading}
                style={{
                  padding: '12px 20px',
                  borderRadius: '14px',
                  background: FC.food,
                  border: 'none',
                  color: '#000',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {aiLoading ? 'Analyzing Nutrition Data...' : 'Generate AI Pattern Insights ⚡'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── RENDER ROOT ────────────────────────────────────────────────────────────
  return (
    <div
      className="app-container page-enter"
      style={{
        background: FC.bg,
        minHeight: '100vh',
        color: FC.text,
        position: 'relative',
        '--color-accent': FC.food,
        '--color-accent-dim': `${FC.food}20`,
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ padding: '24px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: FC.food,
            fontWeight: 800,
            letterSpacing: '2.5px',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            NUTRITION INTELLIGENCE
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 700,
            margin: 0,
            color: FC.text,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}>
            Dashboard
          </h1>
        </div>

        <button
          onClick={() => setShowSettings(true)}
          style={{
            background: FC.surface,
            border: `1px solid ${FC.border}`,
            borderRadius: '14px',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: FC.sub,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = FC.food; e.currentTarget.style.color = FC.food; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = FC.border; e.currentTarget.style.color = FC.sub; }}
          aria-label="Target settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* ── SUBTABS NAVIGATION BAR ── */}
      <div style={{ display: 'flex', gap: '6px', padding: '16px 20px 0', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '8px 16px',
              borderRadius: '100px',
              background: activeTab === tab ? FC.food : FC.surface,
              border: `1px solid ${activeTab === tab ? FC.food : FC.border}`,
              color: activeTab === tab ? '#000' : FC.sub,
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'today' ? '☀️ Today' : tab === 'weekly' ? '📊 Weekly' : tab === 'monthly' ? '📅 Monthly' : tab === 'trends' ? '📈 Trends' : '🧠 AI Coach'}
          </button>
        ))}
      </div>

      {/* ── MAIN DASHBOARD CONTENT FEED ── */}
      <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="skeleton-box" style={{ height: '148px', borderRadius: '24px' }} />
            <div className="skeleton-box" style={{ height: '64px', borderRadius: '20px' }} />
            <div className="skeleton-box" style={{ height: '64px', borderRadius: '20px' }} />
          </div>
        ) : (
          <>
            {activeTab === 'today' && renderTodayTab()}
            {activeTab === 'weekly' && renderWeeklyTab()}
            {activeTab === 'monthly' && renderMonthlyTab()}
            {activeTab === 'trends' && renderTrendsTab()}
            {activeTab === 'coach' && renderCoachTab()}
          </>
        )}
      </div>

      {/* ── FOOD PICKER MODAL ── */}
      {activePicker && (
        <FoodPicker
          mealType={activePicker}
          recentFoodIds={recentFoodIds}
          personalFoods={personalFoods}
          onLog={handleAddFood}
          onCreatePersonalFood={handleCreatePersonalFood}
          onUpdatePersonalFood={handleUpdatePersonalFood}
          onDeletePersonalFood={handleDeletePersonalFood}
          onClose={() => setActivePicker(null)}
        />
      )}

      {/* ── EDIT LOG MODAL ── */}
      {editingLog && (
        <EditLogModal
          log={editingLog}
          onSave={handleEditLogSave}
          onClose={() => setEditingLog(null)}
        />
      )}

      {/* ── GOAL SETTINGS MODAL ── */}
      {showSettings && user && (
        <GoalSettingsModal
          userId={user.id}
          currentSettings={settings}
          onSave={(newSet) => { setSettings(newSet); loadUserData(user.id); }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* ── BOTTOM NAV ── */}
      <BottomNav activeTab="food" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}
