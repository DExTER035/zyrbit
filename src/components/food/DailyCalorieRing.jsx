import React, { useMemo, useState, useEffect } from 'react';
import { FC, FProgressBar } from './shared.jsx';
import { DEFAULT_CALORIE_GOAL, DEFAULT_MACRO_GOALS } from '../../data/indianFoods.js';

// ─── Calorie ring arc helper ──────────────────────────────────────────────────
function describeArc(cx, cy, r, startDeg, endDeg) {
  const toRad = (d) => ((d - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export default function DailyCalorieRing({ totals, goal = DEFAULT_CALORIE_GOAL, macroGoals = DEFAULT_MACRO_GOALS }) {
  const { cal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0 } = totals;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(t);
  }, []);

  const pct = Math.min(cal / goal, 1.05); // slight overflow allowed visually
  const ringColor = useMemo(() => {
    if (cal > goal) return FC.over;
    if (cal / goal > 0.8) return FC.moderate;
    return FC.food;
  }, [cal, goal]);

  const remaining = Math.max(0, goal - cal);
  const cx = 90, cy = 90, r = 72;
  const sweep = mounted ? Math.min(pct * 360, 359.99) : 0;
  const arcPath = sweep > 0.5 ? describeArc(cx, cy, r, 0, sweep) : null;

  return (
    <div style={{
      background: FC.surface,
      border: `1px solid ${FC.border}`,
      borderRadius: '24px',
      padding: '24px 20px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    }}>
      {/* ── Ring + Center text ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        {/* SVG Ring */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={FC.dim} strokeWidth="10" />
            {/* Progress arc */}
            {arcPath && (
              <path
                d={arcPath}
                fill="none"
                stroke={ringColor}
                strokeWidth="10"
                strokeLinecap="round"
                style={{ transition: 'stroke 0.3s, d 0.5s' }}
              />
            )}
            {/* Glow dot at arc end */}
            {arcPath && sweep > 5 && (
              <circle
                cx={cx + r * Math.cos(((sweep - 90) * Math.PI) / 180)}
                cy={cy + r * Math.sin(((sweep - 90) * Math.PI) / 180)}
                r="5"
                fill={ringColor}
                style={{ filter: `drop-shadow(0 0 6px ${ringColor})` }}
              />
            )}
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: FC.text, lineHeight: 1 }}>
              {Math.round(cal)}
            </span>
            <span style={{ fontSize: '9px', color: FC.muted, fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>
              KCAL
            </span>
            <span style={{ fontSize: '11px', color: ringColor, fontWeight: 700, marginTop: '6px' }}>
              {cal > goal ? `+${Math.round(cal - goal)} over` : `${Math.round(remaining)} left`}
            </span>
          </div>
        </div>

        {/* Right side stats */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ fontSize: '11px', color: FC.muted, marginBottom: '1px' }}>Consumed</div>
            <div style={{ fontSize: '22px', fontWeight: 900, color: FC.text, lineHeight: 1 }}>{Math.round(cal)}</div>
          </div>
          <div style={{ width: '100%', height: '1px', background: FC.border }} />
          <div>
            <div style={{ fontSize: '11px', color: FC.muted, marginBottom: '1px' }}>Goal</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: FC.sub }}>{goal}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: FC.muted, marginBottom: '1px' }}>Remaining</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: cal > goal ? FC.over : FC.optimal }}>
              {cal > goal ? 0 : Math.round(remaining)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Macro bars ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <MacroBar label="Protein" value={protein} goal={macroGoals.protein} color={FC.protein} unit="g" />
        <MacroBar label="Carbs"   value={carbs}   goal={macroGoals.carbs}   color={FC.carbs}   unit="g" />
        <MacroBar label="Fat"     value={fat}      goal={macroGoals.fat}     color={FC.fat}     unit="g" />
        <MacroBar label="Fiber"   value={fiber}    goal={macroGoals.fiber}   color={FC.fiber}   unit="g" />
      </div>
    </div>
  );
}

function MacroBar({ label, value, goal, color, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '10px', color: FC.muted, fontWeight: 700, width: '44px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <FProgressBar value={value} max={goal} color={color} height={5} />
      </div>
      <span style={{ fontSize: '10px', color, fontWeight: 700, width: '48px', textAlign: 'right', flexShrink: 0 }}>
        {Math.round(value)}/{goal}{unit}
      </span>
    </div>
  );
}
