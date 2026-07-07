import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import { showToast } from '../components/Toast.jsx';
import { earnZyrons } from '../lib/zyrons.js';
import BottomNav from '../components/BottomNav.jsx';
import { FC, todayStr } from '../components/food/shared.jsx';
import DailyCalorieRing from '../components/food/DailyCalorieRing.jsx';
import MealSection from '../components/food/MealSection.jsx';
import FoodPicker from '../components/food/FoodPicker.jsx';
import NutritionSummary from '../components/food/NutritionSummary.jsx';

import { DEFAULT_CALORIE_GOAL, DEFAULT_MACRO_GOALS, FOOD_DB } from '../data/indianFoods.js';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

// ──────────────────────────────────────────────────────────────────────────────
export default function Food() {
  const navigate = useNavigate();
  const [user,        setUser]        = useState(null);
  const [logs,        setLogs]        = useState([]);     // today's meal_logs
  const [loading,     setLoading]     = useState(true);
  const [activePicker, setActivePicker] = useState(null); // null | meal_type string

  // Track which meal types have already earned Zyrons today
  const [earnedMeals, setEarnedMeals] = useState(new Set());

  // ── Load today's logs ──────────────────────────────────────────────────────
  const loadLogs = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();
    const lsKey = `dexos_food_logs_${uid}_${today}`;
    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', uid)
        .eq('date', today)
        .order('created_at', { ascending: true });
      if (dbErr) {
        console.warn('Food: error loading meal logs from DB, falling back:', dbErr.message);
        const local = localStorage.getItem(lsKey);
        setLogs(local ? JSON.parse(local) : []);
      } else {
        setLogs(data ?? []);
        localStorage.setItem(lsKey, JSON.stringify(data ?? []));
      }
    } catch (e) {
      console.warn('Food: error loading meal logs', e.message);
      const local = localStorage.getItem(lsKey);
      setLogs(local ? JSON.parse(local) : []);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate('/login'); return; }
      setUser(session.user);
      loadLogs(session.user.id);
    });
  }, [navigate, loadLogs]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totals = useMemo(() => logs.reduce((acc, l) => ({
    cal:     acc.cal     + (l.calories || 0),
    protein: acc.protein + (l.protein  || 0),
    carbs:   acc.carbs   + (l.carbs    || 0),
    fat:     acc.fat     + (l.fat      || 0),
    fiber:   acc.fiber   + (l.fiber    || 0),
  }), { cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }), [logs]);

  // Logs grouped by meal type
  const logsByMeal = useMemo(() => {
    const map = {};
    MEAL_TYPES.forEach(t => { map[t] = []; });
    logs.forEach(l => {
      if (map[l.meal_type]) map[l.meal_type].push(l);
    });
    return map;
  }, [logs]);

  // Recent food ids (last 12 unique food_ids from today's logs)
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

  // ── Handlers ──────────────────────────────────────────────────────────────
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

      if (!earnedMeals.has(mealType)) {
        try { await earnZyrons(user.id, 5, `Meal logged: ${mealType}`); } catch { /* XP fail ok */ }
        setEarnedMeals(prev => new Set([...prev, mealType]));
      }
    } catch (err) {
      console.warn('Food DB log failed, falling back:', err.message);
      showToast(`🍱 ${food_name} logged locally!`, 'success');
      if (!earnedMeals.has(mealType)) {
        setEarnedMeals(prev => new Set([...prev, mealType]));
      }
    }
  }, [user, activePicker, earnedMeals]);

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
    } catch (err) {
      console.warn('Food DB delete failed, deleted locally:', err.message);
      showToast('🗑 Meal deleted locally', 'success');
    }
  }, [user]);

  // ── Repeat Yesterday ──────────────────────────────────────────────────────
  const handleRepeatYesterday = useCallback(async () => {
    if (!user) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split('T')[0];
    const today = todayStr();
    
    let yLogs = [];
    const lsKeyToday = `dexos_food_logs_${user.id}_${today}`;
    const lsKeyYesterday = `dexos_food_logs_${user.id}_${yStr}`;

    try {
      const { data, error: dbErr } = await supabase
        .from('meal_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', yStr);
      if (dbErr) {
        const local = localStorage.getItem(lsKeyYesterday);
        yLogs = local ? JSON.parse(local) : [];
      } else {
        yLogs = data ?? [];
      }
    } catch {
      const local = localStorage.getItem(lsKeyYesterday);
      yLogs = local ? JSON.parse(local) : [];
    }

    if (!yLogs || yLogs.length === 0) {
      showToast('No logs found for yesterday', 'info');
      return;
    }

    const newRows = yLogs.map((log) => {
      // eslint-disable-next-line no-unused-vars
      const { id, created_at, date, ...rest } = log;
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
      const { error: insErr } = await supabase.from('meal_logs').insert(
        // eslint-disable-next-line no-unused-vars
        newRows.map(({ id, created_at, ...rest }) => rest)
      );
      if (insErr) throw insErr;
      showToast('♻️ Yesterday\'s meals repeated!', 'success');
      loadLogs(user.id);
    } catch (err) {
      console.warn('Food DB repeat failed, repeated locally:', err.message);
      showToast('♻️ Yesterday\'s meals repeated locally!', 'success');
    }
  }, [user, loadLogs]);

  // ── Date display ──────────────────────────────────────────────────────────
  const todayDisplay = useMemo(() => new Date().toLocaleDateString('en-IN', {
    weekday: 'long', month: 'long', day: 'numeric',
  }), []);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && logs.length === 0) {
    return (
      <div style={{ background: FC.bg, minHeight: '100vh', padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="skeleton-box" style={{ height: '10px', width: '30%' }} />
          <div className="skeleton-box" style={{ height: '26px', width: '55%' }} />
        </div>
        <div className="skeleton-box" style={{ height: '248px', borderRadius: '24px' }} />
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton-box" style={{ height: '64px', borderRadius: '20px' }} />
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
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
      <div style={{ padding: '28px 20px 0' }}>
        <div style={{
          fontSize: '10px',
          color: FC.food,
          fontWeight: 800,
          letterSpacing: '2.5px',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          FOOD
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 900,
          margin: 0,
          color: FC.text,
          lineHeight: 1.1,
          letterSpacing: '-0.5px',
        }}>
          What did you eat?
        </h1>
        <div style={{ fontSize: '11px', color: FC.muted, marginTop: '3px' }}>
          {todayDisplay}
        </div>
      </div>

      {/* ── MAIN FEED ── */}
      <div style={{ padding: '20px 20px 120px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Hero — Calorie Ring */}
        <DailyCalorieRing
          totals={totals}
          goal={DEFAULT_CALORIE_GOAL}
          macroGoals={DEFAULT_MACRO_GOALS}
        />

        {/* Meal Sections */}
        {MEAL_TYPES.map(mealType => (
          <MealSection
            key={mealType}
            mealType={mealType}
            logs={logsByMeal[mealType]}
            onAddFood={(type) => setActivePicker(type)}
            onDeleteLog={handleDeleteLog}
          />
        ))}

        {/* Nutrition Summary */}
        {logs.length > 0 && (
          <NutritionSummary
            totals={totals}
            macroGoals={DEFAULT_MACRO_GOALS}
            onRepeatYesterday={handleRepeatYesterday}
          />
        )}

        {/* Empty state prompt */}
        {logs.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '24px',
            background: FC.surface,
            borderRadius: '20px',
            border: `1px solid ${FC.border}`,
          }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍱</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: FC.text, marginBottom: '4px' }}>
              Nothing logged yet
            </div>
            <div style={{ fontSize: '12px', color: FC.muted }}>
              Tap + Add Food in any meal section to start
            </div>
          </div>
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

      {/* ── BOTTOM NAV ── */}
      <BottomNav activeTab="food" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  );
}
