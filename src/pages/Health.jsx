import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import BottomNav from '../components/BottomNav.jsx';
import { showToast } from '../components/Toast.jsx';
import { earnZyrons } from '../lib/zyrons.js';

// ─── Shared UI primitives ───────────────────────────────────────────────────
import {
  C,
  todayStr,
  ProgressBar,
  Modal,
  FLabel,
} from '../components/health/shared.jsx';

// ─── Health widgets ────────────────────────────────────────────────────────
import RecoveryWidget from '../components/health/RecoveryWidget.jsx';
import WaterCard from '../components/health/WaterCard.jsx';
import SleepCard from '../components/health/SleepCard.jsx';
import ActivityCard from '../components/health/ActivityCard.jsx';
import DexosInsightWidget from '../components/health/DexosInsightWidget.jsx';
import HeatmapGrid from '../components/HeatmapGrid.jsx';
import ErrorState from '../components/ErrorState.jsx';

// ─── Sleep presets (spec: 6h / 7h / 8h / 9h) ───────────────────────────────
const SLEEP_DURATION_PRESETS = ['6', '7', '8', '9'];

// Sleep quality (spec: 4 levels, stored as 1–4, mapped backwards-compatible)
const SLEEP_QUALITY_PRESETS = [
  { emoji: '😞', label: 'Poor',  val: '1' },
  { emoji: '😐', label: 'Okay',  val: '2' },
  { emoji: '🙂', label: 'Good',  val: '3' },
  { emoji: '😁', label: 'Great', val: '4' },
];

// ─── Workout presets (spec: 15m / 30m / 45m / 60m · Easy / Moderate / Hard / Maximum) ──
const WORKOUT_DURATION_PRESETS = ['15', '30', '45', '60'];
const WORKOUT_TYPE_PRESETS = ['Strength', 'Cardio', 'Mobility', 'Walk'];
const WORKOUT_INTENSITY_PRESETS = [
  { label: 'Easy',     rpe: '3' },
  { label: 'Moderate', rpe: '5' },
  { label: 'Hard',     rpe: '7' },
  { label: 'Maximum',  rpe: '10' },
];

// ─── Preset button component ────────────────────────────────────────────────
function PresetBtn({ label, selected, onClick, accent = C.recovery, wide = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: wide ? 'none' : 1,
        width: wide ? '100%' : undefined,
        padding: '12px 8px',
        borderRadius: '12px',
        background: selected ? accent : C.elev,
        border: `1px solid ${selected ? accent : C.border2}`,
        color: selected ? '#000' : C.text,
        fontWeight: 800,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        outline: 'none',
      }}
    >
      {label}
    </button>
  );
}

function EmojiPresetBtn({ emoji, label, selected, onClick, accent = C.recovery }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        padding: '12px 6px',
        borderRadius: '12px',
        background: selected ? accent : C.elev,
        border: `1px solid ${selected ? accent : C.border2}`,
        color: selected ? '#000' : C.text,
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        outline: 'none',
      }}
    >
      <span style={{ fontSize: '20px', lineHeight: 1 }}>{emoji}</span>
      <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.3px' }}>{label}</span>
    </button>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function Health() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Data States ───────────────────────────────────────────────────────────
  const [sleepLogs, setSleepLogs] = useState([]);           // Rolling 7 days
  const [waterLogs, setWaterLogs] = useState([]);           // Today's logs
  const [moveLogs, setMoveLogs] = useState([]);             // Rolling 7 days
  const [dailySummaries, setDailySummaries] = useState([]); // Last 90 days

  // ─── Data Fetcher ──────────────────────────────────────────────────────────
  const loadAllData = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    const start90Days = new Date();
    start90Days.setDate(start90Days.getDate() - 90);
    const start90DaysStr = start90Days.toISOString().split('T')[0];

    const lsKey = (kind) => `dexos_health_${kind}_${uid}`;
    const lsGet = (kind) => { try { return JSON.parse(localStorage.getItem(lsKey(kind))); } catch { return null; } };

    try {
      const [
        sRes,
        wRes,
        mRes,
        dRes
      ] = await Promise.all([
        supabase.from('health_sleep_logs').select('*').eq('user_id', uid).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
        supabase.from('health_water_logs').select('*').eq('user_id', uid).eq('log_date', today),
        supabase.from('health_move_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false }),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).gte('log_date', start90DaysStr),
      ]);

      let sData = sRes.data;
      if (sRes.error) {
        console.warn('health_sleep_logs fetch error, using local fallback:', sRes.error.message);
        sData = lsGet('sleep');
      } else {
        try { localStorage.setItem(lsKey('sleep'), JSON.stringify(sData || [])); } catch { /* ignore */ }
      }

      let watData = wRes.data;
      if (wRes.error) {
        const todayLsKey = `dexos_health_water_${uid}_${today}`;
        console.warn('health_water_logs fetch error, using local fallback:', wRes.error.message);
        try { watData = JSON.parse(localStorage.getItem(todayLsKey)) || []; } catch { watData = []; }
      } else {
        const todayLsKey = `dexos_health_water_${uid}_${today}`;
        try { localStorage.setItem(todayLsKey, JSON.stringify(watData || [])); } catch { /* ignore */ }
      }

      let mData = mRes.data;
      if (mRes.error) {
        console.warn('health_move_logs fetch error, using local fallback:', mRes.error.message);
        mData = lsGet('move');
      } else {
        try { localStorage.setItem(lsKey('move'), JSON.stringify(mData || [])); } catch { /* ignore */ }
      }

      let summaryData = dRes.data;
      if (dRes.error) {
        console.warn('dexos_daily_summary fetch error, using local fallback:', dRes.error.message);
        summaryData = lsGet('summary');
      } else {
        try { localStorage.setItem(lsKey('summary'), JSON.stringify(summaryData || [])); } catch { /* ignore */ }
      }

      setSleepLogs(sData || []);
      setWaterLogs(watData || []);
      setMoveLogs(mData || []);
      setDailySummaries(summaryData || []);
    } catch (e) {
      console.warn('Error loading health telemetry, using local fallback:', e.message);
      setSleepLogs(lsGet('sleep') || []);
      const todayLsKey = `dexos_health_water_${uid}_${today}`;
      try { setWaterLogs(JSON.parse(localStorage.getItem(todayLsKey)) || []); } catch { setWaterLogs([]); }
      setMoveLogs(lsGet('move') || []);
      setDailySummaries(lsGet('summary') || []);
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
        loadAllData(session.user.id);
      }
    });
  }, [navigate, loadAllData]);

  // ─── Derived Calculations (preserved exactly) ──────────────────────────────
  const todayWater = useMemo(() =>
    waterLogs.reduce((sum, item) => sum + item.amount_ml, 0),
  [waterLogs]);

  const todayExerciseMins = useMemo(() => {
    const today = todayStr();
    return moveLogs.filter(m => m.log_date === today).reduce((sum, m) => sum + m.active_minutes, 0);
  }, [moveLogs]);

  const dynamicWaterTarget = useMemo(() =>
    3000 + (Math.floor(todayExerciseMins / 30) * 500),
  [todayExerciseMins]);

  const sleepDebt = useMemo(() => {
    const targetSleep = 7.5;
    return sleepLogs.reduce((acc, log) => acc + (targetSleep - Number(log.duration_hours)), 0);
  }, [sleepLogs]);

  const recoveryScore = useMemo(() => {
    const sleepScore = Math.max(0, 100 - (sleepDebt * 12));
    const lastSleep = sleepLogs[0];
    const lastQuality = lastSleep ? lastSleep.quality : 3;
    const qualityScore = lastQuality * 20;
    const sleepContribution = (sleepScore * 0.5) + (qualityScore * 0.3);

    const waterRatio = Math.min(1.0, todayWater / dynamicWaterTarget);
    const hydrationContribution = waterRatio * 100 * 0.2;

    const todayMaxRpe = moveLogs.length > 0 ? Math.max(...moveLogs.map(m => m.rpe), 0) : 5;
    const isOverexerted = todayExerciseMins > 90 && sleepDebt > 3.0;
    const strainPenalty = isOverexerted ? Math.min(15, (todayExerciseMins / 60) * todayMaxRpe) : 0;

    return Math.max(0, Math.min(100, Math.round(sleepContribution + hydrationContribution - strainPenalty)));
  }, [sleepLogs, sleepDebt, todayWater, dynamicWaterTarget, todayExerciseMins, moveLogs]);

  const dexosInsight = useMemo(() => {
    if (recoveryScore < 50) {
      return 'Physical stamina is depleted. Rest protocol enforced. Caffeine capped and focus targets split.';
    }
    if (todayWater < dynamicWaterTarget * 0.5) {
      return 'Hydration levels are lagging behind target. Drink 500ml water now to clear brain fog.';
    }
    if (sleepDebt > 3.0) {
      return `Sleep debt is high (+${sleepDebt.toFixed(1)}h). Performance decay detected. Focus on rest tonight.`;
    }
    return 'Physical indicators optimal. Ready for deep focus blocks.';
  }, [recoveryScore, todayWater, dynamicWaterTarget, sleepDebt]);

  const heatmapData = useMemo(() => {
    const map = {};
    dailySummaries.forEach(s => {
      if (s.log_date && s.recovery_score) {
        map[s.log_date] = (map[s.log_date] || 0) + 1;
      }
    });
    return map;
  }, [dailySummaries]);

  // ─── Cache Synchronizer ────────────────────────────────
  const syncRecoveryScoreInDB = async (score) => {
    if (!user) return;
    const today = todayStr();
    try {
      await supabase.from('dexos_daily_summary').upsert({
        user_id: user.id,
        log_date: today,
        recovery_score: score,
      }, { onConflict: 'user_id,log_date' });
    } catch (e) {
      console.warn('Could not sync recovery cache in daily summary:', e.message);
    }
  };

  // ─── Event Handlers ────────────────────────────────────────────────────────
  const handleLogWater = async (amount) => {
    if (!user) return;
    const today = todayStr();
    const lsKey = `dexos_health_water_${user.id}_${today}`;

    // Optimistic update
    const tempId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString();
    const mockLog = { id: tempId, log_date: today, amount_ml: amount, created_at: new Date().toISOString() };
    
    setWaterLogs(prev => {
      const updated = [...prev, mockLog];
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const { error: dbError } = await supabase.from('health_water_logs').insert([{
        user_id: user.id,
        log_date: today,
        amount_ml: amount,
      }]);
      if (dbError) throw dbError;

      showToast(`💧 +${amount}ml logged!`, 'success');
      await earnZyrons(user.id, 2, 'Water Logged');

      const nextWater = todayWater + amount;
      const waterRatio = Math.min(1.0, nextWater / dynamicWaterTarget);
      const hydrationContribution = waterRatio * 100 * 0.2;
      const sleepScore = Math.max(0, 100 - (sleepDebt * 12));
      const lastSleep = sleepLogs[0];
      const lastQuality = lastSleep ? lastSleep.quality : 3;
      const sleepContribution = (sleepScore * 0.5) + (lastQuality * 20 * 0.3);
      const nextScore = Math.max(0, Math.min(100, Math.round(sleepContribution + hydrationContribution)));

      await syncRecoveryScoreInDB(nextScore);
      loadAllData(user.id);
    } catch (err) {
      console.warn('Water log DB failed, saved locally:', err.message);
      showToast(`💧 +${amount}ml logged locally!`, 'success');
    }
  };

  const handleLogSleep = async (hrs, qual) => {
    if (!user) return;
    const today = todayStr();
    const lsKey = `dexos_health_sleep_${user.id}`;

    const newLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      user_id: user.id,
      sleep_date: today,
      duration_hours: hrs,
      quality: qual,
      created_at: new Date().toISOString()
    };

    setSleepLogs(prev => {
      const filtered = prev.filter(l => l.sleep_date !== today);
      const updated = [newLog, ...filtered];
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const { error: dbError } = await supabase.from('health_sleep_logs').upsert([{
        user_id: user.id,
        sleep_date: today,
        duration_hours: hrs,
        quality: qual,
      }], { onConflict: 'user_id,sleep_date' });
      if (dbError) throw dbError;

      showToast('😴 Sleep logged! +10 ⚡', 'success');
      await earnZyrons(user.id, 10, 'Sleep Logged');
      loadAllData(user.id);
    } catch (err) {
      console.warn('Sleep log DB failed, saved locally:', err.message);
      showToast('😴 Sleep logged locally!', 'success');
    }
  };

  const handleLogWorkout = async (type, activeMins, rpe) => {
    if (!user) return;
    const today = todayStr();
    const lsKey = `dexos_health_move_${user.id}`;

    const newLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(),
      user_id: user.id,
      log_date: today,
      activity_type: type,
      active_minutes: activeMins,
      rpe: rpe,
      notes: null,
      created_at: new Date().toISOString()
    };

    setMoveLogs(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem(lsKey, JSON.stringify(updated));
      return updated;
    });

    try {
      const { error: dbError } = await supabase.from('health_move_logs').insert([{
        user_id: user.id,
        log_date: today,
        activity_type: type,
        active_minutes: activeMins,
        rpe: rpe,
        notes: null,
      }]);
      if (dbError) throw dbError;

      showToast('🏋️ Workout logged! +15 ⚡', 'success');
      await earnZyrons(user.id, 15, 'Workout Logged');

      const sleepScore = Math.max(0, 100 - (sleepDebt * 12));
      const lastSleep = sleepLogs[0];
      const lastQuality = lastSleep ? lastSleep.quality : 3;
      const sleepContribution = (sleepScore * 0.5) + (lastQuality * 20 * 0.3);
      const waterRatio = Math.min(1.0, todayWater / dynamicWaterTarget);
      const hydrationContribution = waterRatio * 100 * 0.2;
      const isOver = (todayExerciseMins + activeMins) > 90 && sleepDebt > 3.0;
      const penalty = isOver ? Math.min(15, ((todayExerciseMins + activeMins) / 60) * rpe) : 0;
      const nextScore = Math.max(0, Math.min(100, Math.round(sleepContribution + hydrationContribution - penalty)));

      await syncRecoveryScoreInDB(nextScore);
      loadAllData(user.id);
    } catch (err) {
      console.warn('Workout log DB failed, saved locally:', err.message);
      showToast('🏋️ Workout logged locally!', 'success');
    }
  };

  // ─── Today's date display ──────────────────────────────────────────────────
  const todayDisplay = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  // ─── Loading skeleton ──────────────────────────────────────────────────────
  if (loading && waterLogs.length === 0) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 20px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Header skeleton */}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '60%' }}>
            <div className="skeleton-box" style={{ height: '10px', width: '40%' }} />
            <div className="skeleton-box" style={{ height: '24px', width: '80%' }} />
          </div>
          <div className="skeleton-box" style={{ width: '80px', height: '36px', borderRadius: '12px' }} />
        </div>
        {/* Hero skeleton */}
        <div className="skeleton-box" style={{ height: '148px', borderRadius: '24px' }} />
        {/* Water skeleton */}
        <div className="skeleton-box" style={{ height: '148px', borderRadius: '20px' }} />
        {/* Vitals grid skeleton */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '20px' }} />
          <div className="skeleton-box" style={{ height: '140px', borderRadius: '20px' }} />
        </div>
      </div>
    );
  }

  // Error state removed (degrades gracefully)

  // ─── Main render ───────────────────────────────────────────────────────────
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
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontSize: '10px',
            color: C.recovery,
            fontWeight: 800,
            letterSpacing: 'var(--ls-caps)',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}>
            HEALTH
          </div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 900,
            margin: 0,
            color: C.text,
            lineHeight: 1.1,
            letterSpacing: '-0.5px',
          }}>
            Physical OS.
          </h1>
          <div style={{ fontSize: '11px', color: C.muted, marginTop: '3px' }}>
            {todayDisplay}
          </div>
        </div>
      </div>

      {/* ─── MAIN FEED ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '120px' }}>

        {/* 1 ── RECOVERY SCORE (HERO) */}
        <RecoveryWidget recoveryScore={recoveryScore} />

        {/* 2 ── QUICK LOGS: Water (full-width, immediate one-tap) */}
        <WaterCard
          todayWater={todayWater}
          dynamicTarget={dynamicWaterTarget}
          onLogWater={handleLogWater}
        />

        {/* 3 ── TODAY'S METRICS: Sleep + Activity stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SleepCard
            sleepLogs={sleepLogs}
            sleepDebt={sleepDebt}
            onLogSleep={handleLogSleep}
          />
          <ActivityCard
            moveLogs={moveLogs}
            onLogWorkout={handleLogWorkout}
          />
        </div>

        {/* 4 ── DEXOS INSIGHT */}
        <DexosInsightWidget insight={dexosInsight} />

        {/* 5 ── RECENT HISTORY: Heatmap */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '20px',
          padding: '16px 18px',
        }}>
          <HeatmapGrid
            color={C.recovery}
            dataMap={heatmapData}
            label="Bio Consistency (90 Days)"
          />
        </div>
      </div>

      {/* ─── BOTTOM NAV ─────────────────────────────────────────────────────── */}
      <BottomNav activeTab="health" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  );
}


