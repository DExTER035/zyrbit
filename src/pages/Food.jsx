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
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/Toast.jsx';
import { earnZyrons } from '../lib/zyrons.js';
import BottomNav from '../components/BottomNav.jsx';
import { FC, todayStr } from '../components/food/shared.jsx';
import DailyCalorieRing from '../components/food/DailyCalorieRing.jsx';
import MealSection from '../components/food/MealSection.jsx';
import FoodPicker from '../components/food/FoodPicker.jsx';
import NutritionSummary from '../components/food/NutritionSummary.jsx';
import GoalSettingsModal from '../components/food/GoalSettingsModal.jsx';
import SavedMealsSection from '../components/food/SavedMealsSection.jsx';
import { getNutritionInsights } from '../lib/gemini.js';
import { DEFAULT_CALORIE_GOAL, DEFAULT_MACRO_GOALS } from '../data/indianFoods.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const TABS = ['today', 'weekly', 'monthly', 'trends', 'coach'];

// Tooltip style for Recharts
const TooltipStyle = { 
  background: '#15181B', 
  border: '1px solid #262B31', 
  borderRadius: 12, 
  fontSize: 12, 
  color: '#F8FAFC' 
};

export default function Food() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [activePicker, setActivePicker] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Core logs & settings
  const [logs, setLogs] = useState([]); // Today's raw meal logs
  const [settings, setSettings] = useState({
    calorie_goal: DEFAULT_CALORIE_GOAL,
    protein_goal: DEFAULT_MACRO_GOALS.protein,
    carbs_goal: DEFAULT_MACRO_GOALS.carbs,
    fat_goal: DEFAULT_MACRO_GOALS.fat,
    fiber_goal: DEFAULT_MACRO_GOALS.fiber,
  });
  const [savedMeals, setSavedMeals] = useState([]);
  const [earnedMeals, setEarnedMeals] = useState(new Set());

  // Historical summaries & extra logs
  const [summaries, setSummaries] = useState([]); // 60 days of pre-aggregated records
  const [todayWater, setTodayWater] = useState(0);
  const [currentWeight, setCurrentWeight] = useState(70);

  // AI & chart options state
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [weeklyMetric, setWeeklyMetric] = useState('calories'); // calories | protein | water
  const [weeklyChartType, setWeeklyChartType] = useState('bar'); // bar | line | heatmap
  const [trendsMetric, setTrendsMetric] = useState('calories_weight'); // calories_weight | protein_weight | water | carbs | fat

  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // ── LOAD EVERYTHING ──────────────────────────────────────────────────────────
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
  }, []);

  const loadLogsAndHistory = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();
    const lsKeyToday = `dexos_food_logs_${uid}_${today}`;
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const sixtyDaysAgoStr = sixtyDaysAgo.toISOString().split('T')[0];

    try {
      // 1. Today's raw meal logs (for current logging)
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

      // 3. Attempt to fetch pre-aggregated nutrition daily summaries
      const { data: summaryData, error: summaryErr } = await supabase
        .from('nutrition_daily_summary')
        .select('*')
        .eq('user_id', uid)
        .gte('date', sixtyDaysAgoStr)
        .order('date', { ascending: true });

      if (!summaryErr && summaryData && summaryData.length > 0) {
        setSummaries(summaryData);
      } else {
        // FALLBACK: Manual client-side aggregation if cache table is not setup yet
        console.warn('Food: nutrition summaries cache table missing or empty. Running manual fallback aggregates.');
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

        // Update latest logged weight if exists
        const sortedWeights = [...rawWeights].sort((a,b) => b.log_date.localeCompare(a.log_date));
        if (sortedWeights.length > 0) {
          setCurrentWeight(parseFloat(sortedWeights[0].weight));
        }
      }
    } catch (e) {
      console.warn('Food: error loading historical aggregates', e.message);
      // Local fallback today
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
      
      // Load cached AI insights
      const cachedAi = localStorage.getItem(`dexos_nutrition_insights_${session.user.id}`);
      if (cachedAi) setAiInsights(JSON.parse(cachedAi));
    });
  }, [navigate, loadLogsAndHistory, loadUserData]);

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

  // Sync today's logged state inside summaries array (ensures charts are real-time)
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

    // If today is not in summaries, add it
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

  // ── CORE UTILS ─────────────────────────────────────────────────────────────
  const handleAddFood = useCallback(async ({ food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }) => {
    if (!user || !activePicker) return;
    const today = todayStr();
    const mealType = activePicker;
    const lsKey = `dexos_food_logs_${user.id}_${today}`;
    const tempId = crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`;

    const optimisticLog = {
      id: tempId,
      user_id: user.id,
      date: today,
      meal_type: mealType,
      food_id,
      food_name,
      quantity_g,
      calories,
      protein,
      carbs,
      fat,
      fiber,
      created_at: new Date().toISOString(),
    };

    setLogs(prev => {
      const updated = [...prev, optimisticLog];
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .insert([{ user_id: user.id, date: today, meal_type: mealType, food_id, food_name, quantity_g, calories, protein, carbs, fat, fiber }])
        .select()
        .single();
      if (dbErr) throw dbErr;

      if (data) {
        setLogs(prev => {
          const updated = prev.map(l => l.id === tempId ? data : l);
          localStorage.setItem(lsKey, JSON.stringify(updated));
          return updated;
        });
      }
      showToast(`🍱 ${food_name} logged!`, 'success');
      loadLogsAndHistory(user.id);

      if (!earnedMeals.has(mealType)) {
        try { await earnZyrons(user.id, 5, `Meal logged: ${mealType}`); } catch { /* XP fail ok */ }
        setEarnedMeals(prev => new Set([...prev, mealType]));
      }
    } catch (err) {
      console.warn('Food DB log failed, falling back:', err.message);
      showToast(`🍱 ${food_name} logged locally!`, 'success');
    }
  }, [user, activePicker, earnedMeals, loadLogsAndHistory]);

  const handleWaterQuickAdd = useCallback(async (amountMl) => {
    if (!user) return;
    const today = todayStr();
    
    setTodayWater(prev => prev + amountMl);
    
    try {
      const { error } = await supabase
        .from('health_water_logs')
        .insert([{ user_id: user.id, log_date: today, amount_ml: amountMl }]);
      if (error) throw error;
      showToast(`💧 logged +${amountMl}ml!`, 'success');
      loadLogsAndHistory(user.id);
    } catch (e) {
      console.warn('Water log failed:', e.message);
      showToast(`💧 logged locally!`, 'success');
    }
  }, [user, loadLogsAndHistory]);

  const handleLogSavedMeal = useCallback(async (savedMeal) => {
    if (!user) return;
    const today = todayStr();
    const lsKey = `dexos_food_logs_${user.id}_${today}`;
    const items = savedMeal.items || [];
    
    const newOptimisticLogs = items.map(item => {
      const tempId = crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`;
      return {
        id: tempId,
        user_id: user.id,
        date: today,
        meal_type: savedMeal.meal_type,
        food_id: item.food_id,
        food_name: item.food_name,
        quantity_g: item.quantity_g,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        created_at: new Date().toISOString(),
      };
    });

    setLogs(prev => {
      const updated = [...prev, ...newOptimisticLogs];
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const rows = items.map(item => ({
        user_id: user.id,
        date: today,
        meal_type: savedMeal.meal_type,
        food_id: item.food_id,
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
        setLogs(prev => {
          let updated = [...prev];
          newOptimisticLogs.forEach((ol, idx) => {
            const actual = data[idx];
            if (actual) {
              updated = updated.map(l => l.id === ol.id ? actual : l);
            }
          });
          localStorage.setItem(lsKey, JSON.stringify(updated));
          return updated;
        });
      }
      showToast('🍱 Saved meal logged!', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.warn('Food DB saved meal log failed:', err.message);
    }
  }, [user, loadLogsAndHistory]);

  const handleDeleteLog = useCallback(async (logId) => {
    if (!user) return;
    const today = todayStr();
    const lsKey = `dexos_food_logs_${user.id}_${today}`;

    setLogs(prev => {
      const updated = prev.filter(l => l.id !== logId);
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const { error: dbErr } = await supabase.from('meal_logs').delete().eq('id', logId);
      if (dbErr) throw dbErr;
      showToast('🗑 Meal deleted', 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.warn('Food DB delete failed, deleted locally:', err.message);
    }
  }, [user, loadLogsAndHistory]);

  const handleRepeatYesterday = useCallback(async () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const today = todayStr();
    
    let yLogs = [];
    const lsKeyToday = `dexos_food_logs_${user.id}_${today}`;

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
        id: crypto.randomUUID ? crypto.randomUUID() : `temp_${Math.random()}`,
        date: today, 
        user_id: user.id,
        created_at: new Date().toISOString()
      };
    });

    setLogs(prev => {
      const updated = [...prev, ...newRows];
      localStorage.setItem(lsKeyToday, JSON.stringify(updated));
      return updated;
    });

    try {
      const rowsToInsert = newRows.map((row) => {
        const r = { ...row };
        delete r.id;
        delete r.created_at;
        return r;
      });
      const { error: insErr } = await supabase.from('meal_logs').insert(rowsToInsert);
      if (insErr) throw insErr;
      showToast("♻️ Yesterday's meals repeated!", 'success');
      loadLogsAndHistory(user.id);
    } catch (err) {
      console.warn('Food DB repeat failed:', err.message);
    }
  }, [user, loadLogsAndHistory]);

  // ── AI INSIGHTS COACH ──────────────────────────────────────────────────────
  const generateAiInsights = async () => {
    if (!user) return;
    setAiLoading(true);
    try {
      // 1. Gather historical summaries
      const historyStr = realTimeSummaries.slice(-30).map(s => (
        `Date: ${s.date}, Cal: ${Math.round(s.calories)}, Protein: ${Math.round(s.protein)}g, Carbs: ${Math.round(s.carbs)}g, Fat: ${Math.round(s.fat)}g, Water: ${s.water}ml, Weight: ${s.weight || 'N/A'}kg`
      )).join('\n');

      const goalsStr = `Calories: ${settings.calorie_goal} kcal, Protein: ${settings.protein_goal}g, Carbs: ${settings.carbs_goal}g, Fat: ${settings.fat_goal}g, Water: 3000ml`;

      const responseText = await getNutritionInsights(historyStr, goalsStr);
      
      // Clean and format items
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

  // Subtab: Today
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

  // Subtab: Weekly Analytics
  const renderWeeklyTab = () => {
    // 1. Gather last 7 days of real-time summaries
    const past7Days = realTimeSummaries.slice(-7);

    // Compute metrics
    const totalCal = past7Days.reduce((s, d) => s + (d.calories || 0), 0);
    const avgCal = Math.round(totalCal / 7);
    const maxDay = [...past7Days].sort((a,b) => b.calories - a.calories)[0];
    const minDay = [...past7Days].sort((a,b) => a.calories - b.calories)[0];
    const avgProtein = Math.round(past7Days.reduce((s, d) => s + (d.protein || 0), 0) / 7);
    const avgWater = Math.round(past7Days.reduce((s, d) => s + (d.water || 0), 0) / 7);

    // Perfect Nutrition days: Cal goal met (>=90%) AND Protein Goal met (>=90%)
    const perfectDaysList = past7Days.filter(d => 
      d.calories >= settings.calorie_goal * 0.9 &&
      d.calories <= settings.calorie_goal * 1.1 &&
      d.protein >= settings.protein_goal * 0.9
    );
    const perfectDays = perfectDaysList.length;

    // Consistency score: average of completion percentages
    const consistencyScore = Math.round(
      past7Days.reduce((sum, d) => {
        const calPct = Math.min(100, (d.calories / settings.calorie_goal) * 100);
        const protPct = Math.min(100, (d.protein / settings.protein_goal) * 100);
        return sum + (calPct + protPct) / 2;
      }, 0) / 7
    );

    // Format data for chart
    const chartData = past7Days.map(d => {
      const dateObj = new Date(d.date);
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      return {
        ...d,
        name: weekday,
        calories: Math.round(d.calories),
        protein: Math.round(d.protein),
        water: d.water
      };
    });

    const isChartEmpty = !chartData.some(d => d[weeklyMetric] > 0);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Metric Selector & Chart Type Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['calories', 'protein', 'water'].map(m => (
              <button
                key={m}
                onClick={() => setWeeklyMetric(m)}
                style={{
                  background: weeklyMetric === m ? FC.foodDim : FC.surface,
                  border: `1px solid ${weeklyMetric === m ? FC.food : FC.border}`,
                  borderRadius: '100px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: weeklyMetric === m ? FC.food : FC.sub,
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

        {/* Chart View */}
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
            /* Custom Heatmap Grid */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, justifyContent: 'center' }}>
              <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Weekly Completion Heatmap (Metrics vs Day)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px', textAlign: 'center' }}>
                {/* Headers */}
                <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 700 }}>Metric</div>
                {chartData.map(d => (
                  <div key={d.name} style={{ fontSize: '9px', color: FC.text, fontWeight: 700 }}>{d.name}</div>
                ))}

                {/* Rows */}
                {['calories', 'protein', 'water', 'carbs', 'fat'].map(metric => {
                  const target = metric === 'calories' ? settings.calorie_goal
                    : metric === 'protein' ? settings.protein_goal
                    : metric === 'water' ? 3000
                    : metric === 'carbs' ? settings.carbs_goal
                    : settings.fat_goal;



                  return (
                    <React.Fragment key={metric}>
                      <div style={{ fontSize: '9px', color: FC.muted, fontWeight: 700, textAlign: 'left', textTransform: 'capitalize' }}>
                        {metric.slice(0, 5)}
                      </div>
                      {chartData.map(d => {
                        const val = d[metric] || 0;
                        const pct = Math.min(1, val / target);
                        return (
                          <div
                            key={d.date}
                            title={`${metric}: ${Math.round(val)}/${target} (${Math.round(pct*100)}%)`}
                            style={{
                              height: '24px',
                              borderRadius: '6px',
                              background: `rgba(${metric === 'calories' ? '245,158,11' : metric === 'protein' ? '20,184,166' : metric === 'water' ? '6,182,212' : '129,140,248'}, ${0.1 + pct * 0.9})`,
                              border: `1px solid ${pct >= 0.9 ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.03)'}`,
                            }}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          ) : weeklyChartType === 'line' ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : '#06B6D4'} stopOpacity={0.2}/>
                    <stop offset="95%" stopColor={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : '#06B6D4'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Area 
                  type="monotone" 
                  dataKey={weeklyMetric} 
                  stroke={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : '#06B6D4'} 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorMetric)"
                  dot={{ r: 4, strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Bar dataKey={weeklyMetric} radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={weeklyMetric === 'calories' ? FC.food : weeklyMetric === 'protein' ? FC.protein : '#06B6D4'} 
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Weekly Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <StatMiniCard label="Average Calories" value={`${avgCal} kcal`} sub={`Target: ${settings.calorie_goal}`} color={FC.food} />
          <StatMiniCard label="Average Protein" value={`${avgProtein}g`} sub={`Goal: ${settings.protein_goal}g`} color={FC.protein} />
          <StatMiniCard label="Max Calorie Day" value={maxDay ? `${Math.round(maxDay.calories)} kcal` : '0 kcal'} sub={maxDay ? new Date(maxDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }) : ''} />
          <StatMiniCard label="Min Calorie Day" value={minDay ? `${Math.round(minDay.calories)} kcal` : '0 kcal'} sub={minDay ? new Date(minDay.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }) : ''} />
          <StatMiniCard label="Average Water" value={`${avgWater}ml`} sub="Target: 3000ml" color="#06B6D4" />
          <StatMiniCard label="Consistency Score" value={`${consistencyScore}%`} sub={`${perfectDays} Perfect Day${perfectDays !== 1 ? 's' : ''}`} color={FC.optimal} />
        </div>
      </div>
    );
  };

  // Subtab: Monthly Analytics
  const renderMonthlyTab = () => {
    // 1. Calculate dates inside the active monthly calendar
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const firstDow = firstDay.getDay(); // 0 is Sunday, 1 is Monday
    // Align with Monday as start of week: (firstDow + 6) % 7
    const alignedPadding = (firstDow + 6) % 7; 
    const totalDays = lastDay.getDate();

    const calendarCells = [];
    // Padding
    for (let i = 0; i < alignedPadding; i++) {
      calendarCells.push(null);
    }
    // Real days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      calendarCells.push({ dayNum: d, dateStr });
    }

    // Map monthly stats
    const monthLogs = realTimeSummaries.filter(s => {
      const dObj = new Date(s.date);
      return dObj.getFullYear() === year && dObj.getMonth() === month;
    });

    const totalMonthCal = monthLogs.reduce((s, d) => s + (d.calories || 0), 0);
    const totalMonthProtein = monthLogs.reduce((s, d) => s + (d.protein || 0), 0);
    const avgMonthCal = monthLogs.length > 0 ? Math.round(totalMonthCal / monthLogs.length) : 0;
    const avgMonthProtein = monthLogs.length > 0 ? Math.round(totalMonthProtein / monthLogs.length) : 0;

    // Consistency score for month
    const monthlyScore = monthLogs.length > 0 ? Math.round(
      monthLogs.reduce((sum, d) => {
        const calMet = d.calories >= settings.calorie_goal * 0.9 && d.calories <= settings.calorie_goal * 1.1;
        const protMet = d.protein >= settings.protein_goal * 0.9;
        let sc = 0;
        if (calMet) sc += 50;
        if (protMet) sc += 50;
        return sum + sc;
      }, 0) / monthLogs.length
    ) : 0;

    // Monthly score grade:
    const scoreGrade = monthlyScore >= 85 ? 'Premium' : monthlyScore >= 70 ? 'Optimal' : monthlyScore > 0 ? 'Needs Focus' : 'N/A';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Month Selector Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: FC.surface, padding: '12px 16px', borderRadius: '16px', border: `1px solid ${FC.border}` }}>
          <button 
            onClick={() => setSelectedMonth(new Date(year, month - 1, 1))}
            style={{ background: 'transparent', border: 'none', color: FC.sub, cursor: 'pointer' }}
          >
            <ChevronLeft size={18} />
          </button>
          <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>
            {selectedMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button 
            onClick={() => setSelectedMonth(new Date(year, month + 1, 1))}
            style={{ background: 'transparent', border: 'none', color: FC.sub, cursor: 'pointer' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Monthly Summary Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <StatMiniCard label="Total Calories" value={`${Math.round(totalMonthCal)} kcal`} sub={`Avg: ${avgMonthCal} kcal/d`} color={FC.food} />
          <StatMiniCard label="Total Protein" value={`${Math.round(totalMonthProtein)}g`} sub={`Avg: ${avgMonthProtein}g/d`} color={FC.protein} />
          <StatMiniCard label="Best Week" value="Week 2" sub="Consistency: 92%" />
          <StatMiniCard label="Monthly Score" value={`${monthlyScore}%`} sub={`Grade: ${scoreGrade}`} color={FC.optimal} />
        </div>

        {/* Calendar Grid */}
        <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '24px', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '8px' }}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((h, i) => (
              <span key={i} style={{ fontSize: '9px', fontWeight: 800, color: FC.muted }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} style={{ height: '54px' }} />;
              }

              // Look up summary
              const dayData = realTimeSummaries.find(s => s.date === cell.dateStr);
              let bgColor = 'rgba(255,255,255,0.02)';
              let borderCol = FC.border;
              let calText = '';
              let protText = '';

              if (dayData && (dayData.calories > 0 || dayData.protein > 0)) {
                calText = `${Math.round(dayData.calories)}`;
                protText = `${Math.round(dayData.protein)}g`;

                const calGoal = settings.calorie_goal;
                const protGoal = settings.protein_goal;
                const isCalHit = dayData.calories >= calGoal * 0.9 && dayData.calories <= calGoal * 1.1;
                const isProtHit = dayData.protein >= protGoal * 0.9;

                if (isCalHit && isProtHit) {
                  bgColor = 'rgba(16, 185, 129, 0.15)'; // Green
                  borderCol = 'rgba(16, 185, 129, 0.4)';
                } else if (isCalHit || isProtHit || (dayData.calories >= calGoal * 0.7 && dayData.protein >= protGoal * 0.7)) {
                  bgColor = 'rgba(245, 158, 11, 0.15)'; // Yellow
                  borderCol = 'rgba(245, 158, 11, 0.4)';
                } else {
                  bgColor = 'rgba(239, 68, 68, 0.12)'; // Red
                  borderCol = 'rgba(239, 68, 68, 0.3)';
                }
              }

              return (
                <div
                  key={cell.dateStr}
                  style={{
                    height: '54px',
                    borderRadius: '12px',
                    background: bgColor,
                    border: `1px solid ${borderCol}`,
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 800, color: dayData ? FC.text : FC.muted }}>{cell.dayNum}</span>
                  {dayData && (dayData.calories > 0 || dayData.protein > 0) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', pointerEvents: 'none' }}>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: FC.food, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {calText}
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: 700, color: FC.protein, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {protText}
                      </span>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  };

  // Subtab: Trends & Projections
  const renderTrendsTab = () => {
    // 1. Gather trend data (past 30 days)
    const trendsData = realTimeSummaries.slice(-30).map(d => ({
      ...d,
      dateFormatted: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      calories: Math.round(d.calories),
      protein: Math.round(d.protein),
      water: d.water,
      carbs: Math.round(d.carbs),
      fat: Math.round(d.fat),
      weight: d.weight ? parseFloat(d.weight) : currentWeight
    }));

    // Math linear regression helper for Trend Direction
    const calculateTrendDirection = (key) => {
      if (trendsData.length < 2) return 'Stable';
      const values = trendsData.map(d => d[key]).filter(v => v !== null && v !== undefined);
      if (values.length < 2) return 'Stable';
      
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      if (avg === 0) return 'Stable';

      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const n = values.length;
      for (let i = 0; i < n; i++) {
        sumX += i;
        sumY += values[i];
        sumXY += i * values[i];
        sumXX += i * i;
      }
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const normalizedSlope = slope / avg; // percentage delta per day

      if (normalizedSlope > 0.003) return 'Increasing 📈';
      if (normalizedSlope < -0.003) return 'Decreasing 📉';
      return 'Stable ➡️';
    };

    const caloriesTrend = calculateTrendDirection('calories');
    const proteinTrend = calculateTrendDirection('protein');
    const waterTrend = calculateTrendDirection('water');
    const weightTrend = calculateTrendDirection('weight');

    // 2. Future Projections (Feature 6)
    const recent30 = realTimeSummaries.slice(-30);
    const avgCal30 = Math.round(recent30.reduce((s, d) => s + (d.calories || 0), 0) / recent30.length) || settings.calorie_goal;
    const avgProtein30 = Math.round(recent30.reduce((s, d) => s + (d.protein || 0), 0) / recent30.length) || settings.protein_goal;

    const calorieSurplus = avgCal30 - settings.calorie_goal; 
    const dailyWeightChange = calorieSurplus / 7700; // 7700 kcal surplus = 1kg body weight

    // Muscle growth factor
    const pGoalRatio = settings.protein_goal > 0 ? Math.min(1.5, avgProtein30 / settings.protein_goal) : 0;
    const muscleGainPerMonth = Math.max(0, Math.min(1.0, pGoalRatio * 0.45)); // max 0.45kg muscle/mo for realistic solo dev view

    const wt30 = currentWeight + dailyWeightChange * 30;
    const wt90 = currentWeight + dailyWeightChange * 90;
    const wt180 = currentWeight + dailyWeightChange * 180;

    const muscle30 = muscleGainPerMonth * 1;
    const muscle90 = muscleGainPerMonth * 3;
    const muscle180 = muscleGainPerMonth * 6;

    // 3. Comparisons (Feature 7)
    // Compare This Week (0 to -7) vs Last Week (-8 to -14)
    const thisWeek = realTimeSummaries.slice(-7);
    const lastWeek = realTimeSummaries.slice(-14, -7);

    const compareAverages = (metric) => {
      const avgThis = thisWeek.reduce((s, d) => s + (d[metric] || 0), 0) / (thisWeek.length || 1);
      const avgLast = lastWeek.reduce((s, d) => s + (d[metric] || 0), 0) / (lastWeek.length || 1);

      if (avgLast === 0) return { change: 0, text: 'Stable' };
      const diff = ((avgThis - avgLast) / avgLast) * 100;
      return {
        valThis: Math.round(avgThis),
        valLast: Math.round(avgLast),
        change: diff.toFixed(1),
        text: diff > 0.5 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`
      };
    };

    const calComp = compareAverages('calories');
    const protComp = compareAverages('protein');
    const waterComp = compareAverages('water');

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Trends Selector dropdown */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <select 
            value={trendsMetric} 
            onChange={(e) => setTrendsMetric(e.target.value)}
            style={{
              background: FC.elev,
              border: `1px solid ${FC.border2}`,
              color: FC.text,
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '13px',
              outline: 'none',
            }}
          >
            <option value="calories_weight">Weight vs Calories</option>
            <option value="protein_weight">Weight vs Protein</option>
            <option value="water">Water over time</option>
            <option value="carbs">Carbs over time</option>
            <option value="fat">Fat over time</option>
          </select>

          {/* Sparkles trend direction visual */}
          <div style={{ fontSize: '11px', color: FC.muted, display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Weight: <strong style={{ color: FC.text }}>{weightTrend}</strong></span>
            <span>·</span>
            <span>Cal: <strong style={{ color: FC.text }}>{caloriesTrend.replace(' Increasing 📈', 'Up').replace(' Decreasing 📉', 'Down').replace(' Stable ➡️', 'Stable')}</strong></span>
            <span>·</span>
            <span>Protein: <strong style={{ color: FC.text }}>{proteinTrend.replace(' Increasing 📈', 'Up').replace(' Decreasing 📉', 'Down').replace(' Stable ➡️', 'Stable')}</strong></span>
            <span>·</span>
            <span>Water: <strong style={{ color: FC.text }}>{waterTrend.replace(' Increasing 📈', 'Up').replace(' Decreasing 📉', 'Down').replace(' Stable ➡️', 'Stable')}</strong></span>
          </div>
        </div>

        {/* Chart View */}
        <div style={{ 
          background: FC.surface, 
          border: `1px solid ${FC.border}`, 
          borderRadius: '24px', 
          padding: '20px 16px 12px',
          height: '250px' 
        }}>
          <ResponsiveContainer width="100%" height="100%">
            {trendsMetric === 'calories_weight' ? (
              <AreaChart data={trendsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={FC.food} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={FC.food} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Area yAxisId="left" type="monotone" dataKey="calories" stroke={FC.food} strokeWidth={2} fillOpacity={1} fill="url(#colorCal)" name="Calories" />
                <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3 }} name="Weight (kg)" />
              </AreaChart>
            ) : trendsMetric === 'protein_weight' ? (
              <AreaChart data={trendsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={FC.protein} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={FC.protein} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Area yAxisId="left" type="monotone" dataKey="protein" stroke={FC.protein} strokeWidth={2} fillOpacity={1} fill="url(#colorProt)" name="Protein" />
                <Line yAxisId="right" type="monotone" dataKey="weight" stroke="#818CF8" strokeWidth={2.5} dot={{ r: 3 }} name="Weight (kg)" />
              </AreaChart>
            ) : trendsMetric === 'water' ? (
              <AreaChart data={trendsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorWat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Area type="monotone" dataKey="water" stroke="#06B6D4" strokeWidth={2} fillOpacity={1} fill="url(#colorWat)" name="Water (ml)" />
              </AreaChart>
            ) : (
              // Macro specific trends (carbs/fat)
              <AreaChart data={trendsData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMac" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendsMetric === 'carbs' ? FC.carbs : FC.fat} stopOpacity={0.15}/>
                    <stop offset="95%" stopColor={trendsMetric === 'carbs' ? FC.carbs : FC.fat} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={FC.border} />
                <XAxis dataKey="dateFormatted" tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: FC.sub }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TooltipStyle} />
                <Area type="monotone" dataKey={trendsMetric} stroke={trendsMetric === 'carbs' ? FC.carbs : FC.fat} strokeWidth={2} fillOpacity={1} fill="url(#colorMac)" name={trendsMetric} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* COMPARISON MATRIX (Feature 7) */}
        <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '20px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>
            Comparison (This Week vs Last Week)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: FC.muted, fontWeight: 600 }}>Calories</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>{calComp.valThis} vs {calComp.valLast}</span>
              <span style={{ fontSize: '10px', color: parseFloat(calComp.change) > 0 ? FC.over : FC.optimal, fontWeight: 700 }}>
                {calComp.text} {parseFloat(calComp.change) > 0 ? 'Increase' : 'Decrease'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: FC.muted, fontWeight: 600 }}>Protein</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>{protComp.valThis}g vs {protComp.valLast}g</span>
              <span style={{ fontSize: '10px', color: parseFloat(protComp.change) >= 0 ? FC.optimal : FC.over, fontWeight: 700 }}>
                {protComp.text} {parseFloat(protComp.change) >= 0 ? 'Increase' : 'Decline'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '10px', color: FC.muted, fontWeight: 600 }}>Water</span>
              <span style={{ fontSize: '13px', fontWeight: 800, color: FC.text }}>{waterComp.valThis}ml vs {waterComp.valLast}ml</span>
              <span style={{ fontSize: '10px', color: parseFloat(waterComp.change) >= 0 ? FC.optimal : FC.over, fontWeight: 700 }}>
                {waterComp.text} {parseFloat(waterComp.change) >= 0 ? 'Increase' : 'Decline'}
              </span>
            </div>
          </div>
        </div>

        {/* FUTURE PROJECTION (Feature 6) */}
        <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '24px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: FC.muted, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Future Projections (30d / 90d / 6mo)
            </span>
            <span style={{ fontSize: '9px', background: `${FC.food}15`, color: FC.food, padding: '2px 8px', borderRadius: '100px', fontWeight: 800 }}>
              Habit Engine
            </span>
          </div>
          <div style={{ fontSize: '12px', color: FC.muted, marginBottom: '16px', lineHeight: 1.4 }}>
            Based on your past 30 days averages: <strong>{avgCal30} kcal</strong> and <strong>{avgProtein30}g Protein</strong>.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <ProjectionRow 
              title="30 Days Projection" 
              weight={wt30} 
              muscle={muscle30} 
              optWeight={currentWeight} 
              optMuscle={0.8}
            />
            <div style={{ width: '100%', height: '1px', background: FC.border }} />
            <ProjectionRow 
              title="90 Days Projection" 
              weight={wt90} 
              muscle={muscle90} 
              optWeight={currentWeight} 
              optMuscle={2.4}
            />
            <div style={{ width: '100%', height: '1px', background: FC.border }} />
            <ProjectionRow 
              title="6 Months Projection" 
              weight={wt180} 
              muscle={muscle180} 
              optWeight={currentWeight} 
              optMuscle={4.8}
            />
          </div>
        </div>

      </div>
    );
  };

  // Subtab: AI Coach & Streaks
  const renderCoachTab = () => {
    // Calorie Streak Check
    const calStreak = computeStreak(realTimeSummaries, (day) => 
      day.calories >= settings.calorie_goal * 0.9 && day.calories <= settings.calorie_goal * 1.1
    );

    // Protein Streak Check
    const protStreak = computeStreak(realTimeSummaries, (day) => 
      day.protein >= settings.protein_goal * 0.9
    );

    // Water Streak Check
    const watStreak = computeStreak(realTimeSummaries, (day) => 
      day.water >= 3000 * 0.9
    );

    // Healthy Eating Streak Check (Both calorie target and protein reached)
    const healthyStreak = computeStreak(realTimeSummaries, (day) => 
      day.calories >= settings.calorie_goal * 0.9 &&
      day.calories <= settings.calorie_goal * 1.1 &&
      day.protein >= settings.protein_goal * 0.9
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* FOOD STREAKS CARDS (Feature 8) */}
        <div style={{ background: FC.surface, border: `1px solid ${FC.border}`, borderRadius: '24px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '14px' }}>
            Streaks & Consistency Records
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <StreakItem label="Protein Streak" current={protStreak.current} longest={protStreak.longest} color={FC.protein} icon="🔥" />
            <StreakItem label="Calorie Streak" current={calStreak.current} longest={calStreak.longest} color={FC.food} icon="⚡" />
            <StreakItem label="Water Streak" current={watStreak.current} longest={watStreak.longest} color="#06B6D4" icon="💧" />
            <StreakItem label="Healthy Eating" current={healthyStreak.current} longest={healthyStreak.longest} color={FC.optimal} icon="🏆" />
          </div>
        </div>

        {/* DEX AI NUTRITION ADVISOR (Feature 5) */}
        <div style={{
          background: `linear-gradient(135deg, ${FC.surface} 0%, rgba(27,31,35,0.7) 100%)`,
          border: `1px solid ${FC.border}`,
          borderRadius: '24px',
          padding: '24px 20px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}>
          {/* Sparkles background effect */}
          <div style={{ position: 'absolute', right: '-10px', top: '-10px', opacity: 0.08, pointerEvents: 'none' }}>
            <Sparkles size={120} color={FC.food} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🧠</span>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 900, color: FC.text }}>Dex AI Wellness Coach</span>
                <div style={{ fontSize: '9px', color: FC.muted, marginTop: '2px', fontWeight: 700, textTransform: 'uppercase' }}>Nutrition Intelligence</div>
              </div>
            </div>
            <button 
              onClick={generateAiInsights} 
              disabled={aiLoading}
              style={{
                background: FC.elev,
                border: `1px solid ${FC.border2}`,
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: FC.food,
              }}
            >
              <RefreshCw size={14} className={aiLoading ? 'spin-anim' : ''} />
            </button>
          </div>

          {/* AI Output Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {aiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                <div className="skeleton-box" style={{ height: '12px', width: '90%' }} />
                <div className="skeleton-box" style={{ height: '12px', width: '80%' }} />
                <div className="skeleton-box" style={{ height: '12px', width: '85%' }} />
              </div>
            ) : aiInsights && aiInsights.length > 0 ? (
              <ul style={{ padding: 0, margin: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {aiInsights.map((insight, idx) => (
                  <li key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '12px', color: FC.text, lineHeight: 1.4 }}>
                    <span style={{ color: FC.food, marginTop: '2px' }}>✦</span>
                    <span>{insight}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '16px 0', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: FC.muted }}>No diagnostic report compiled yet.</span>
                <button
                  onClick={generateAiInsights}
                  style={{
                    background: FC.food,
                    color: '#000',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '8px 16px',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  Analyze Eating Patterns
                </button>
              </div>
            )}
          </div>
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
            fontWeight: 900,
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
            background: FC.elev,
            border: `1px solid ${FC.border2}`,
            borderRadius: '12px',
            padding: '10px',
            cursor: 'pointer',
            color: FC.sub,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          aria-label="Goals and settings"
        >
          <Settings size={16} />
        </button>
      </div>

      {/* ── SUB NAVIGATION SUBTABS ── */}
      <div style={{
        display: 'flex',
        padding: '0 20px',
        marginTop: '16px',
        gap: '4px',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
      }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flexShrink: 0,
              background: activeTab === tab ? FC.elev : 'transparent',
              border: 'none',
              borderRadius: '100px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: activeTab === tab ? 800 : 600,
              color: activeTab === tab ? FC.food : FC.muted,
              cursor: 'pointer',
              textTransform: 'capitalize',
              transition: 'all 0.2s ease',
            }}
          >
            {tab === 'coach' ? 'AI Coach' : tab}
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
          onLog={handleAddFood}
          onClose={() => setActivePicker(null)}
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
      <BottomNav activeTab="food" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />

      {/* Embedded Animations CSS */}
      <style>{`
        .spin-anim {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ── SUB COMPONENT: MINI STAT CARD ──
function StatMiniCard({ label, value, sub, color = FC.text }) {
  return (
    <div style={{
      background: FC.surface,
      border: `1px solid ${FC.border}`,
      borderRadius: '16px',
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
        {label}
      </div>
      <div style={{ fontSize: '18px', fontWeight: 900, color, marginTop: '4px' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '10px', color: FC.muted, marginTop: '2px' }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ── SUB COMPONENT: PROJECTION ROW ──
function ProjectionRow({ title, weight, muscle, optWeight, optMuscle }) {
  return (
    <div>
      <div style={{ fontSize: '13px', fontWeight: 800, color: FC.text, marginBottom: '6px' }}>{title}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <span style={{ fontSize: '9px', color: FC.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Habits</span>
          <div style={{ fontSize: '12px', fontWeight: 700, color: FC.sub, marginTop: '2px' }}>
            Weight: {weight.toFixed(1)} kg
          </div>
          <div style={{ fontSize: '11px', color: FC.protein, marginTop: '1px' }}>
            Muscle Gain: +{muscle.toFixed(1)} kg
          </div>
        </div>
        <div>
          <span style={{ fontSize: '9px', color: FC.food, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Optimized (Target Hit)</span>
          <div style={{ fontSize: '12px', fontWeight: 700, color: FC.text, marginTop: '2px' }}>
            Weight: {optWeight.toFixed(1)} kg
          </div>
          <div style={{ fontSize: '11px', color: FC.protein, fontWeight: 700, marginTop: '1px' }}>
            Muscle Gain: +{optMuscle.toFixed(1)} kg
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SUB COMPONENT: STREAK ITEM ──
function StreakItem({ label, current, longest, color, icon }) {
  return (
    <div style={{
      background: FC.elev,
      border: `1px solid ${FC.border2}`,
      borderRadius: '16px',
      padding: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline', marginTop: '2px' }}>
          <span style={{ fontSize: '16px', fontWeight: 900, color }}>{current}d</span>
          <span style={{ fontSize: '10px', color: FC.muted }}>Best: {longest}d</span>
        </div>
      </div>
    </div>
  );
}

// ── SUB COMPONENT: STREAKS COMPUTATION HELPER ──
const computeStreak = (summaries, checkFn) => {
  let longest = 0;
  let current = 0;
  let temp = 0;

  const sorted = [...summaries].sort((a,b) => a.date.localeCompare(b.date));
  
  sorted.forEach(day => {
    if (checkFn(day)) {
      temp++;
      if (temp > longest) longest = temp;
    } else {
      temp = 0;
    }
  });

  const sortedDesc = [...summaries].sort((a,b) => b.date.localeCompare(a.date));
  const today = todayStr();
  
  if (sortedDesc.length > 0) {
    const firstDate = sortedDesc[0].date;
    const diffTime = Math.abs(new Date(today) - new Date(firstDate));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Allow grace period of 1 day (today or yesterday)
    if (diffDays <= 1) {
      for (let i = 0; i < sortedDesc.length; i++) {
        if (checkFn(sortedDesc[i])) {
          current++;
        } else {
          break;
        }
      }
    }
  }

  return { current, longest };
};
