import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/index.js';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { showToast } from '../../components/ui/Toast.jsx';

// ─── Shared UI primitives ───────────────────────────────────────────────────
import {
  C,
  todayStr,
  ProgressBar,
  Modal,
  FLabel,
} from '../../components/domain/health/shared.jsx';

// ─── Health widgets ────────────────────────────────────────────────────────
import RecoveryWidget from '../../components/domain/health/RecoveryWidget.jsx';
import WaterCard from '../../components/domain/health/WaterCard.jsx';
import SleepCard from '../../components/domain/health/SleepCard.jsx';
import ActivityCard from '../../components/domain/health/ActivityCard.jsx';
import DexosInsightWidget from '../../components/domain/health/DexosInsightWidget.jsx';
import HeatmapGrid from '../../components/common/HeatmapGrid.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import {
  logWater as serviceLogWater,
  deleteWaterLog as serviceDeleteWaterLog,
  logSleep as serviceLogSleep,
  deleteSleepLog as serviceDeleteSleepLog,
  logActivity as serviceLogActivity,
  deleteActivityLog as serviceDeleteActivityLog,
  syncRecoveryScore as serviceSyncRecoveryScore,
} from '../../services/healthService.js';
import {
  calculateSleepDebt,
  calculateDynamicWaterTarget,
  calculateRecoveryReadiness,
  calculateBioPacingForecast,
  getRecoveryExplanations,
} from '../../engines/health/index.js';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // ─── Dex OS Live Invalidation ───────────────────────────────────────────────
  useEffect(() => {
    const handleDexRefresh = (e) => {
      if (e.detail?.domain === 'health' || !e.detail?.domain) {
        if (user?.id) loadAllData(user.id);
      }
    };
    window.addEventListener('dexos:refresh', handleDexRefresh);
    return () => window.removeEventListener('dexos:refresh', handleDexRefresh);
  }, [user, loadAllData]);

  // ─── Derived Calculations via pure healthCalculator engine ─────────────────
  const todayWater = useMemo(() =>
    waterLogs.reduce((sum, item) => sum + (Number(item.amount_ml) || 0), 0),
  [waterLogs]);

  const todayExerciseMins = useMemo(() => {
    const today = todayStr();
    return moveLogs.filter(m => m.log_date === today).reduce((sum, m) => sum + (Number(m.active_minutes) || 0), 0);
  }, [moveLogs]);

  const dynamicWaterTarget = useMemo(() =>
    calculateDynamicWaterTarget(todayExerciseMins),
  [todayExerciseMins]);

  const sleepDebt = useMemo(() =>
    calculateSleepDebt(sleepLogs),
  [sleepLogs]);

  const recoveryScore = useMemo(() =>
    calculateRecoveryReadiness(sleepLogs, waterLogs, moveLogs, todayStr()),
  [sleepLogs, waterLogs, moveLogs]);

  const hasHealthLogs = useMemo(() =>
    sleepLogs.length > 0 || waterLogs.length > 0 || moveLogs.length > 0,
  [sleepLogs, waterLogs, moveLogs]);

  const bioPacing = useMemo(() =>
    calculateBioPacingForecast(recoveryScore, sleepDebt, hasHealthLogs),
  [recoveryScore, sleepDebt, hasHealthLogs]);

  const dexosInsight = useMemo(() => {
    const { explanations } = getRecoveryExplanations(sleepLogs, waterLogs, moveLogs, todayStr(), recoveryScore);
    return explanations[0] || 'Physical indicators optimal. Ready for deep focus blocks.';
  }, [sleepLogs, waterLogs, moveLogs, recoveryScore]);

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
    await serviceSyncRecoveryScore({ userId: user.id, score, date: today });
  };

  // ─── DB-First Event Handlers ───────────────────────────────────────────────
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

      setWaterLogs(prev => [...prev, res.data]);
      showToast(`💧 +${res.data?.amount_ml || amount}ml logged!`, 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to log water: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      setSleepLogs(prev => {
        const filtered = prev.filter(l => l.sleep_date !== today);
        return [res.data, ...filtered];
      });
      showToast('😴 Sleep logged!', 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to log sleep: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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

      setMoveLogs(prev => [res.data, ...prev]);
      showToast('🏋️ Workout logged!', 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to log workout: ${err.message}`, 'error');
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

      setWaterLogs(prev => prev.filter(w => w.id !== logId));
      showToast('💧 Water log deleted', 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to delete water log: ${err.message}`, 'error');
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

      setSleepLogs(prev => prev.filter(s => s.id !== logId));
      showToast('😴 Sleep log deleted', 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to delete sleep log: ${err.message}`, 'error');
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
        showToast(`Failed to delete workout log: ${res.error}`, 'error');
        return;
      }

      setMoveLogs(prev => prev.filter(m => m.id !== logId));
      showToast('🏋️ Workout log deleted', 'success');
      await syncRecoveryScoreInDB(recoveryScore);
    } catch (err) {
      showToast(`Failed to delete workout log: ${err.message}`, 'error');
    } finally {
      setIsSubmitting(false);
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
            fontWeight: 700,
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
        <RecoveryWidget recoveryScore={recoveryScore} bioPacing={bioPacing} />

        {/* 2 ── QUICK LOGS: Water (full-width, immediate one-tap) */}
        <WaterCard
          todayWater={todayWater}
          dynamicTarget={dynamicWaterTarget}
          onLogWater={handleLogWater}
          onDeleteWater={handleDeleteWater}
          waterLogs={waterLogs}
          isSubmitting={isSubmitting}
        />

        {/* 3 ── TODAY'S METRICS: Sleep + Activity stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SleepCard
            sleepLogs={sleepLogs}
            sleepDebt={sleepDebt}
            onLogSleep={handleLogSleep}
            onDeleteSleep={handleDeleteSleep}
            isSubmitting={isSubmitting}
          />
          <ActivityCard
            moveLogs={moveLogs}
            onLogWorkout={handleLogWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            isSubmitting={isSubmitting}
          />
        </div>

        {/* 4 ── DEXOS INSIGHT */}
        <DexosInsightWidget insight={dexosInsight} />

        {/* 5 ── RECENT HISTORY: Heatmap */}
        <div style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '16px',
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
      <BottomNav activeTab="health" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  );
}


