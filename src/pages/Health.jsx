import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.js';
import BottomNav from '../components/BottomNav.jsx';
import { showToast } from '../components/Toast.jsx';
import { earnZyrons } from '../lib/zyrons.js';
import { Plus, Heart } from 'lucide-react';

// Shared styling and visual primitives
import {
  C,
  todayStr,
  Card,
  ProgressBar,
  Modal,
  FInput,
  FLabel,
  FSelect,
  BtnPrimary
} from '../components/health/shared.jsx';

// Modular Health widgets
import RecoveryWidget from '../components/health/RecoveryWidget.jsx';
import VitalsGrid from '../components/health/VitalsGrid.jsx';
import WaterCard from '../components/health/WaterCard.jsx';
import SleepCard from '../components/health/SleepCard.jsx';
import NutritionCard from '../components/health/NutritionCard.jsx';
import ActivityCard from '../components/health/ActivityCard.jsx';
import WeightWidget from '../components/health/WeightWidget.jsx';
import DexosInsightWidget from '../components/health/DexosInsightWidget.jsx';
import HeatmapGrid from '../components/HeatmapGrid.jsx';

export default function Health() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ─── Data States ───────────────────────────────────────────────────────────
  const [sleepLogs, setSleepLogs] = useState([]);     // Rolling 7 days
  const [waterLogs, setWaterLogs] = useState([]);     // Today's logs
  const [foodLogs, setFoodLogs] = useState([]);       // Today's logs
  const [moveLogs, setMoveLogs] = useState([]);       // Rolling 7 days
  const [weightLogs, setWeightLogs] = useState([]);   // Rolling 7 days
  const [activeSprint, setActiveSprint] = useState(null); // Active Growth Sprint
  const [dailySummaries, setDailySummaries] = useState([]); // Last 90 days summaries

  // ─── Modals State ──────────────────────────────────────────────────────────
  const [activeModal, setActiveModal] = useState(null); // null | 'sleep' | 'food' | 'move' | 'weight'

  // ─── Form States ───────────────────────────────────────────────────────────
  const [formSleep, setFormSleep] = useState({ hours: '7.5', quality: '3' });
  const [formFood, setFormFood] = useState({ name: '', protein: '25g', quality: 'neutral' });
  const [formMove, setFormMove] = useState({ type: 'Strength', minutes: '45', rpe: '5', notes: '' });
  const [formWeight, setFormWeight] = useState({ value: '' });

  // ─── Data Fetcher ──────────────────────────────────────────────────────────
  const loadAllData = useCallback(async (uid) => {
    setLoading(true);
    const today = todayStr();
    
    // Calculate rolling 7 days ago start date
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const startOfWeekStr = startOfWeek.toISOString().split('T')[0];

    // Calculate rolling 90 days ago start date
    const start90Days = new Date();
    start90Days.setDate(start90Days.getDate() - 90);
    const start90DaysStr = start90Days.toISOString().split('T')[0];

    try {
      const [
        { data: sData },
        { data: watData },
        { data: fData },
        { data: mData },
        { data: wData },
        { data: sprintData },
        { data: summaryData }
      ] = await Promise.all([
        supabase.from('health_sleep_logs').select('*').eq('user_id', uid).gte('sleep_date', startOfWeekStr).order('sleep_date', { ascending: false }),
        supabase.from('health_water_logs').select('*').eq('user_id', uid).eq('log_date', today),
        supabase.from('health_food_logs').select('*').eq('user_id', uid).eq('log_date', today),
        supabase.from('health_move_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false }),
        supabase.from('health_weight_logs').select('*').eq('user_id', uid).gte('log_date', startOfWeekStr).order('log_date', { ascending: false }),
        supabase.from('growth_sprints').select('*').eq('user_id', uid).eq('status', 'active').maybeSingle(),
        supabase.from('dexos_daily_summary').select('*').eq('user_id', uid).gte('log_date', start90DaysStr)
      ]);

      if (sData) setSleepLogs(sData);
      if (watData) setWaterLogs(watData);
      if (fData) setFoodLogs(fData);
      if (mData) setMoveLogs(mData);
      if (wData) setWeightLogs(wData);
      if (sprintData) setActiveSprint(sprintData);
      if (summaryData) setDailySummaries(summaryData);

    } catch (e) {
      console.warn('Error loading health telemetry:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Auth Verification ──────────────────────────────────────────────────────
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

  // ─── Derived Calculations ──────────────────────────────────────────────────
  const todayWater = useMemo(() => waterLogs.reduce((sum, item) => sum + item.amount_ml, 0), [waterLogs]);

  const todayExerciseMins = useMemo(() => {
    const today = todayStr();
    return moveLogs.filter(m => m.log_date === today).reduce((sum, m) => sum + m.active_minutes, 0);
  }, [moveLogs]);

  const dynamicWaterTarget = useMemo(() => {
    return 3000 + (Math.floor(todayExerciseMins / 30) * 500);
  }, [todayExerciseMins]);

  const todayProtein = useMemo(() => foodLogs.reduce((sum, item) => sum + item.protein, 0), [foodLogs]);

  const sleepDebt = useMemo(() => {
    const targetSleep = 7.5;
    // Sum targets vs actuals for logged sleep entries
    return sleepLogs.reduce((acc, log) => acc + (targetSleep - Number(log.duration_hours)), 0);
  }, [sleepLogs]);

  const recoveryScore = useMemo(() => {
    // 1. Sleep debt score contribution (50% weight)
    const sleepScore = Math.max(0, 100 - (sleepDebt * 12));
    
    // Sleep quality contribution (30% weight)
    const lastSleep = sleepLogs[0];
    const lastQuality = lastSleep ? lastSleep.quality : 3;
    const qualityScore = lastQuality * 20;

    const sleepContribution = (sleepScore * 0.5) + (qualityScore * 0.3);

    // 2. Hydration contribution (20% weight)
    const waterRatio = Math.min(1.0, todayWater / dynamicWaterTarget);
    const hydrationContribution = waterRatio * 100 * 0.2;

    // 3. Exercise strain penalty adjustment
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
    if (todayProtein < 60) {
      return 'Protein intake is low today. Fuel recovery with a high-protein clean meal.';
    }
    return 'Physical indicators optimal. Ready for deep focus blocks.';
  }, [recoveryScore, todayWater, dynamicWaterTarget, sleepDebt, todayProtein]);

  const heatmapData = useMemo(() => {
    const map = {};
    dailySummaries.forEach(s => {
      if (s.log_date && s.recovery_score) {
        map[s.log_date] = (map[s.log_date] || 0) + 1;
      }
    });
    return map;
  }, [dailySummaries]);

  // ─── Cache Synchronizer ────────────────────────────────────────────────────
  const syncRecoveryScoreInDB = async (score) => {
    if (!user) return;
    const today = todayStr();
    try {
      await supabase.from('dexos_daily_summary').upsert({
        user_id: user.id,
        log_date: today,
        recovery_score: score
      }, { onConflict: 'user_id,log_date' });
    } catch (e) {
      console.warn('Could not sync recovery cache in daily summary:', e.message);
    }
  };

  // ─── Event Logging Handlers ────────────────────────────────────────────────
  const handleLogWater = async (amount) => {
    if (!user) return;
    const today = todayStr();

    // Optimistic UI insert
    const tempId = Math.random().toString();
    const mockLog = { id: tempId, log_date: today, amount_ml: amount, created_at: new Date().toISOString() };
    setWaterLogs(prev => [...prev, mockLog]);

    try {
      const { error } = await supabase.from('health_water_logs').insert([{
        user_id: user.id,
        log_date: today,
        amount_ml: amount
      }]);
      if (error) throw error;

      showToast(`💧 Hydrated: +${amount}ml water!`, 'success');
      await earnZyrons(user.id, 2, 'Water Logged');

      // Update stored daily recovery scores
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
    } catch {
      showToast('Error saving hydration log', 'error');
      setWaterLogs(prev => prev.filter(item => item.id !== tempId));
    }
  };

  const handleLogSleep = async (e) => {
    e.preventDefault();
    if (!user) return;

    const hrs = parseFloat(formSleep.hours);
    const qual = parseInt(formSleep.quality);
    const today = todayStr();

    try {
      const { error } = await supabase.from('health_sleep_logs').upsert([{
        user_id: user.id,
        sleep_date: today,
        duration_hours: hrs,
        quality: qual
      }], { onConflict: 'user_id,sleep_date' });
      if (error) throw error;

      showToast('😴 Sleep logged successfully!', 'success');
      await earnZyrons(user.id, 10, 'Sleep Logged');
      setActiveModal(null);
      loadAllData(user.id);
    } catch {
      showToast('Error saving sleep logs', 'error');
    }
  };

  const handleLogFood = async (e) => {
    e.preventDefault();
    if (!user || !formFood.name.trim()) return;

    const proteinVal = parseInt(formFood.protein.replace('g', '')) || 0;
    const today = todayStr();

    try {
      const { error } = await supabase.from('health_food_logs').insert([{
        user_id: user.id,
        log_date: today,
        food_name: formFood.name,
        protein: proteinVal,
        quality: formFood.quality
      }]);
      if (error) throw error;

      showToast('🥗 Meal logged!', 'success');
      await earnZyrons(user.id, 5, 'Food Logged');
      setFormFood({ name: '', protein: '25g', quality: 'neutral' });
      setActiveModal(null);
      loadAllData(user.id);
    } catch {
      showToast('Error saving food logs', 'error');
    }
  };

  const handleLogWorkout = async (e) => {
    e.preventDefault();
    if (!user) return;

    const activeMins = parseInt(formMove.minutes) || 45;
    const rpe = parseInt(formMove.rpe) || 5;
    const today = todayStr();

    try {
      const { error } = await supabase.from('health_move_logs').insert([{
        user_id: user.id,
        log_date: today,
        activity_type: formMove.type,
        active_minutes: activeMins,
        rpe: rpe,
        notes: formMove.notes || null
      }]);
      if (error) throw error;

      showToast('🏋️ Workout logged!', 'success');
      await earnZyrons(user.id, 15, 'Workout Logged');
      
      // Update Recovery Index in cache summary
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
      setFormMove({ type: 'Strength', minutes: '45', rpe: '5', notes: '' });
      setActiveModal(null);
      loadAllData(user.id);
    } catch {
      showToast('Error saving workout log', 'error');
    }
  };

  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!user || !formWeight.value) return;

    const val = parseFloat(formWeight.value);
    const today = todayStr();

    try {
      const { error } = await supabase.from('health_weight_logs').upsert([{
        user_id: user.id,
        log_date: today,
        weight: val
      }], { onConflict: 'user_id,log_date' });
      if (error) throw error;

      showToast('⚖️ Weight logged!', 'success');
      await earnZyrons(user.id, 5, 'Weight logged');
      setFormWeight({ value: '' });
      setActiveModal(null);
      loadAllData(user.id);
    } catch {
      showToast('Error saving weight logs', 'error');
    }
  };

  // ─── RENDER — Loading ──────────────────────────────────────────────────────
  if (loading && waterLogs.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.bg, gap: '12px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '50%', border: `2px solid ${C.recovery}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: '2px' }}>SYNCING TELEMETRY</span>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div className="app-container page-enter" style={{ background: C.bg, minHeight: '100vh', color: C.text }}>
      
      {/* ─── HEADER ───────────────────────────────────────────────────────────── */}
      <div style={{ padding: '28px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '10px', color: C.recovery, fontWeight: 800, letterSpacing: '2px', marginBottom: '4px' }}>HEALTH</div>
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, background: `linear-gradient(135deg, ${C.text}, ${C.muted})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Physical OS.</h1>
        </div>
        <button onClick={() => setActiveModal('sleep')}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '10px 14px', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: C.recovery }}>
          <Heart size={13} color={C.recovery} />
          <span>Quick Log</span>
        </button>
      </div>

      {/* ─── MAIN FEED ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', paddingBottom: '120px' }}>
        
        {/* Recovery Dial widget */}
        <RecoveryWidget recoveryScore={recoveryScore} activeSprint={activeSprint} />

        {/* Vitals Grid containing Water, Sleep, Nutrition, Gym */}
        <VitalsGrid>
          <WaterCard todayWater={todayWater} dynamicTarget={dynamicWaterTarget} onLogWater={handleLogWater} />
          <SleepCard sleepLogs={sleepLogs} sleepDebt={sleepDebt} onLogClick={() => setActiveModal('sleep')} />
          <NutritionCard proteinTotal={todayProtein} targetProtein={120} foodLogs={foodLogs} onLogClick={() => setActiveModal('food')} />
          <ActivityCard moveLogs={moveLogs} onLogClick={() => setActiveModal('move')} />
        </VitalsGrid>

        {/* Weight Index display */}
        <WeightWidget weightLogs={weightLogs} targetWeight={72} onLogClick={() => setActiveModal('weight')} />

        {/* Intelligence direct advisory advice */}
        <DexosInsightWidget insight={dexosInsight} />

        {/* Heatmap Grid */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '16px' }}>
          <HeatmapGrid color={C.recovery} dataMap={heatmapData} label="Bio logging Consistency (90 Days)" />
        </div>

      </div>

      {/* ─── MODALS ───────────────────────────────────────────────────────────── */}

      {/* Sleep Log Modal */}
      {activeModal === 'sleep' && (
        <Modal title="Log Last Night's Sleep" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleLogSleep} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <FLabel>SLEEP DURATION (HOURS)</FLabel>
              <FInput type="number" step="0.1" min="0" max="24" value={formSleep.hours} onChange={e => setFormSleep(p => ({ ...p, hours: e.target.value }))} />
            </div>
            <div>
              <FLabel>PERCEIVED QUALITY</FLabel>
              <FSelect value={formSleep.quality} onChange={e => setFormSleep(p => ({ ...p, quality: e.target.value }))}>
                <option value="1">1 😔 Restless / Depleted</option>
                <option value="2">2 😐 Interrupted / Tired</option>
                <option value="3">3 🙂 Neutral / Normal</option>
                <option value="4">4 😊 Good / Refreshed</option>
                <option value="5">5 🚀 Deep / Hyper-Optimal</option>
              </FSelect>
            </div>
            <BtnPrimary label="Log Sleep +10 ⚡" type="submit" color={C.sleep} style={{ color: '#fff' }} />
          </form>
        </Modal>
      )}

      {/* Food Log Modal */}
      {activeModal === 'food' && (
        <Modal title="Log Meal" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleLogFood} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <FLabel>MEAL DETAILS</FLabel>
              <FInput placeholder="e.g. Scrambled eggs and toast..." value={formFood.name} onChange={e => setFormFood(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <FLabel>ESTIMATED PROTEIN</FLabel>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['10g', '25g', '40g'].map(p => (
                  <button key={p} type="button" onClick={() => setFormFood(prev => ({ ...prev, protein: p }))}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', background: formFood.protein === p ? `${C.nutrition}18` : C.surface, border: `1px solid ${formFood.protein === p ? C.nutrition : C.border2}`, color: formFood.protein === p ? C.nutrition : C.sub, fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                    {p}
                  </button>
                ))}
              </div>
              <FInput type="text" placeholder="Custom protein (e.g. 30g)" value={formFood.protein} onChange={e => setFormFood(p => ({ ...p, protein: e.target.value }))} style={{ marginTop: '10px' }} />
            </div>
            <div>
              <FLabel>MEAL QUALITY</FLabel>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[
                  { id: 'clean', label: 'Clean 🟢' },
                  { id: 'neutral', label: 'Neutral 🟡' },
                  { id: 'processed', label: 'Processed 🔴' }
                ].map(q => (
                  <button key={q.id} type="button" onClick={() => setFormFood(prev => ({ ...prev, quality: q.id }))}
                    style={{ flex: 1, padding: '10px', borderRadius: '10px', background: formFood.quality === q.id ? `${C.nutrition}18` : C.surface, border: `1px solid ${formFood.quality === q.id ? C.nutrition : C.border2}`, color: formFood.quality === q.id ? C.nutrition : C.sub, fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <BtnPrimary label="Log Meal +5 ⚡" type="submit" color={C.nutrition} />
          </form>
        </Modal>
      )}

      {/* Workout/Movement Log Modal */}
      {activeModal === 'move' && (
        <Modal title="Log Exercise Session" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleLogWorkout} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <FLabel>ACTIVITY TYPE</FLabel>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {['Strength', 'Cardio', 'Mobility', 'Walk'].map(t => (
                  <button key={t} type="button" onClick={() => setFormMove(prev => ({ ...prev, type: t }))}
                    style={{ flex: '1 1 calc(50% - 6px)', padding: '10px', borderRadius: '10px', background: formMove.type === t ? `${C.activity}18` : C.surface, border: `1px solid ${formMove.type === t ? C.activity : C.border2}`, color: formMove.type === t ? C.activity : C.sub, fontSize: '11px', fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <FLabel>DURATION (MINUTES)</FLabel>
                <FInput type="number" value={formMove.minutes} onChange={e => setFormMove(p => ({ ...p, minutes: e.target.value }))} required />
              </div>
              <div style={{ flex: 1 }}>
                <FLabel>EFFORT LEVEL (RPE 1-10)</FLabel>
                <FInput type="number" min="1" max="10" value={formMove.rpe} onChange={e => setFormMove(p => ({ ...p, rpe: e.target.value }))} required />
              </div>
            </div>
            <div>
              <FLabel>SESSION NOTES</FLabel>
              <FInput placeholder="e.g. Back and biceps, active recovery stretch..." value={formMove.notes} onChange={e => setFormMove(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <BtnPrimary label="Log Session +15 ⚡" type="submit" color={C.activity} style={{ color: '#fff' }} />
          </form>
        </Modal>
      )}

      {/* Weight Log Modal */}
      {activeModal === 'weight' && (
        <Modal title="Log Body Weight" onClose={() => setActiveModal(null)}>
          <form onSubmit={handleLogWeight} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <FLabel>CURRENT WEIGHT (KG)</FLabel>
              <FInput type="number" step="0.01" placeholder="e.g. 74.5" value={formWeight.value} onChange={e => setFormWeight(p => ({ ...p, value: e.target.value }))} required />
            </div>
            <BtnPrimary label="Log Weight +5 ⚡" type="submit" color={C.weight} style={{ color: '#fff' }} />
          </form>
        </Modal>
      )}

      {/* Bottom Navigation */}
      <BottomNav activeTab="health" onTabChange={(t) => navigate(t === 'zenith' ? '/' : `/${t}`)} />
    </div>
  );
}
