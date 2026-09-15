import React, { useState, useCallback } from 'react';
import { X, Calculator, ChevronDown, ChevronUp } from 'lucide-react';
import { FC, FInput, FBtn } from './shared.jsx';
import { supabase } from '../../../lib/supabase/index.js';
import { showToast } from '../../ui/Toast.jsx';

// TDEE activity multipliers
const ACTIVITY_LEVELS = [
  { id: 'sedentary',  label: 'Sedentary',       desc: 'Little / no exercise',         mult: 1.2  },
  { id: 'light',      label: 'Lightly Active',   desc: '1–3 days/week',                mult: 1.375 },
  { id: 'moderate',   label: 'Moderately Active', desc: '3–5 days/week',               mult: 1.55  },
  { id: 'very',       label: 'Very Active',       desc: '6–7 days/week',               mult: 1.725 },
  { id: 'athlete',    label: 'Athlete',           desc: '2× training/day',             mult: 1.9   },
];

const GOALS = [
  { id: 'lose',     label: 'Lose Weight',    adj: -0.20 },
  { id: 'maintain', label: 'Maintain',       adj: 0     },
  { id: 'build',    label: 'Build Muscle',   adj: +0.15 },
];

function calcMacros(cal) {
  return {
    protein_goal: Math.round((cal * 0.25) / 4),
    carbs_goal:   Math.round((cal * 0.50) / 4),
    fat_goal:     Math.round((cal * 0.25) / 9),
    fiber_goal:   Math.round((cal / 1000) * 14),
  };
}

export default function GoalSettingsModal({ userId, currentSettings, onSave, onClose }) {
  const init = currentSettings || { calorie_goal: 2200, protein_goal: 130, carbs_goal: 275, fat_goal: 61, fiber_goal: 30 };

  const [cal,     setCal]     = useState(String(init.calorie_goal));
  const [protein, setProtein] = useState(String(init.protein_goal));
  const [carbs,   setCarbs]   = useState(String(init.carbs_goal));
  const [fat,     setFat]     = useState(String(init.fat_goal));
  const [fiber,   setFiber]   = useState(String(init.fiber_goal));
  const [saving,  setSaving]  = useState(false);

  // Calculator state
  const [showCalc,   setShowCalc]   = useState(false);
  const [weight,     setWeight]     = useState('');
  const [height,     setHeight]     = useState('');
  const [age,        setAge]        = useState('');
  const [sex,        setSex]        = useState('male');
  const [activity,   setActivity]   = useState('moderate');
  const [goalAdj,    setGoalAdj]    = useState('maintain');

  const calcTDEE = useCallback(() => {
    const w = parseFloat(weight), h = parseFloat(height), a = parseFloat(age);
    if (!w || !h || !a) { showToast('Enter weight, height and age', 'error'); return; }
    // Mifflin-St Jeor BMR
    const bmr = sex === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;
    const mult   = ACTIVITY_LEVELS.find(l => l.id === activity)?.mult ?? 1.55;
    const adjPct = GOALS.find(g => g.id === goalAdj)?.adj ?? 0;
    const tdee   = Math.round(bmr * mult * (1 + adjPct));
    setCal(String(tdee));
    const macros = calcMacros(tdee);
    setProtein(String(macros.protein_goal));
    setCarbs(String(macros.carbs_goal));
    setFat(String(macros.fat_goal));
    setFiber(String(macros.fiber_goal));
    showToast(`TDEE: ${tdee} kcal applied ✓`, 'success');
  }, [weight, height, age, sex, activity, goalAdj]);

  const handleCalorieChange = (v) => {
    setCal(v);
    const n = parseInt(v);
    if (n > 0) {
      const m = calcMacros(n);
      setProtein(String(m.protein_goal));
      setCarbs(String(m.carbs_goal));
      setFat(String(m.fat_goal));
      setFiber(String(m.fiber_goal));
    }
  };

  const handleSave = async () => {
    const settings = {
      calorie_goal:  parseInt(cal)     || 2200,
      protein_goal:  parseInt(protein) || 130,
      carbs_goal:    parseInt(carbs)   || 275,
      fat_goal:      parseInt(fat)     || 61,
      fiber_goal:    parseInt(fiber)   || 30,
    };
    setSaving(true);
    try {
      const { error } = await supabase
        .from('food_settings')
        .upsert([{ user_id: userId, ...settings }], { onConflict: 'user_id' });
      if (error) throw error;
    } catch (err) {
      console.warn('food_settings save failed, using localStorage:', err.message);
    }
    // Always persist locally as fallback
    localStorage.setItem(`dexos_food_settings_${userId}`, JSON.stringify(settings));
    onSave(settings);
    showToast('✓ Goals saved', 'success');
    setSaving(false);
    onClose();
  };

  const labelStyle  = { fontSize: '10px', color: FC.muted, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '6px' };
  const rowStyle    = { display: 'flex', flexDirection: 'column', gap: '2px' };
  const gridStyle   = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' };
  const chipBase    = { padding: '7px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s', border: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(16px)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div style={{ background: FC.surface, border: `1px solid ${FC.border2}`, borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '430px', padding: '24px 20px 40px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0', animation: 'slideUpModal 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '16px', fontWeight: 800, color: FC.text }}>Daily Goals</span>
          <button onClick={onClose} style={{ background: FC.dim, border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: FC.sub }}>
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Calorie goal */}
          <div style={rowStyle}>
            <div style={labelStyle}>Daily Calorie Goal (kcal)</div>
            <FInput type="number" placeholder="e.g. 2200" value={cal} onChange={e => handleCalorieChange(e.target.value)} />
          </div>

          {/* Macro goals — auto-filled but editable */}
          <div>
            <div style={{ ...labelStyle, marginBottom: '10px' }}>Macro Goals (auto-calculated, tap to edit)</div>
            <div style={gridStyle}>
              {[
                { label: 'Protein (g)', val: protein, set: setProtein, color: FC.protein },
                { label: 'Carbs (g)',   val: carbs,   set: setCarbs,   color: FC.carbs   },
                { label: 'Fat (g)',     val: fat,      set: setFat,     color: FC.fat     },
                { label: 'Fiber (g)',   val: fiber,    set: setFiber,   color: FC.fiber   },
              ].map(({ label, val, set, color }) => (
                <div key={label} style={rowStyle}>
                  <div style={{ fontSize: '10px', color, fontWeight: 700, marginBottom: '4px' }}>{label}</div>
                  <FInput type="number" placeholder="g" value={val} onChange={e => set(e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          {/* Calorie calculator toggle */}
          <button
            onClick={() => setShowCalc(c => !c)}
            style={{ background: 'transparent', border: `1px solid ${FC.border2}`, borderRadius: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: FC.food, fontSize: '12px', fontWeight: 700, transition: 'all 0.15s' }}
          >
            <Calculator size={14} />
            TDEE Calculator (optional)
            {showCalc ? <ChevronUp size={12} style={{ marginLeft: 'auto' }} /> : <ChevronDown size={12} style={{ marginLeft: 'auto' }} />}
          </button>

          {showCalc && (
            <div style={{ background: FC.elev, borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeSlideUp 0.2s ease' }}>
              <div style={gridStyle}>
                <div style={rowStyle}>
                  <div style={labelStyle}>Weight (kg)</div>
                  <FInput type="number" placeholder="70" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
                <div style={rowStyle}>
                  <div style={labelStyle}>Height (cm)</div>
                  <FInput type="number" placeholder="175" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                <div style={rowStyle}>
                  <div style={labelStyle}>Age</div>
                  <FInput type="number" placeholder="22" value={age} onChange={e => setAge(e.target.value)} />
                </div>
                <div style={rowStyle}>
                  <div style={labelStyle}>Sex</div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['male', 'female'].map(s => (
                      <button key={s} onClick={() => setSex(s)} style={{ ...chipBase, flex: 1, background: sex === s ? FC.food : FC.dim, color: sex === s ? '#000' : FC.sub }}>
                        {s === 'male' ? '♂' : '♀'} {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={rowStyle}>
                <div style={labelStyle}>Activity Level</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ACTIVITY_LEVELS.map(lvl => (
                    <button key={lvl.id} onClick={() => setActivity(lvl.id)} style={{ ...chipBase, textAlign: 'left', background: activity === lvl.id ? `${FC.food}18` : FC.dim, border: `1px solid ${activity === lvl.id ? FC.food : 'transparent'}`, color: activity === lvl.id ? FC.food : FC.sub, padding: '8px 12px' }}>
                      <span style={{ fontWeight: 800 }}>{lvl.label}</span>
                      <span style={{ fontSize: '10px', marginLeft: '6px', opacity: 0.7 }}>{lvl.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={rowStyle}>
                <div style={labelStyle}>Goal</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {GOALS.map(g => (
                    <button key={g.id} onClick={() => setGoalAdj(g.id)} style={{ ...chipBase, flex: 1, background: goalAdj === g.id ? FC.food : FC.dim, color: goalAdj === g.id ? '#000' : FC.sub }}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <FBtn label="Calculate & Apply →" onClick={calcTDEE} color={FC.food} />
            </div>
          )}

          {/* Save button */}
          <FBtn label={saving ? 'Saving…' : 'Save Goals'} onClick={handleSave} disabled={saving} />
        </div>
      </div>
      <style>{`@keyframes slideUpModal { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } } @keyframes fadeSlideUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }`}</style>
    </div>
  );
}
