import React from 'react';
import { Sparkles, Moon, Droplets, Utensils, Zap, Scale } from 'lucide-react';
import { C, ProgressBar } from './shared.jsx';

export default function HealthStateHero({ healthState }) {
  if (!healthState) return null;

  const {
    headline,
    sleep,
    hydration,
    fuel,
    movement,
    weight,
    pacing,
  } = healthState;

  const statusColor =
    pacing?.level === 'high'
      ? C.optimal
      : pacing?.level === 'moderate'
        ? C.recovery
        : pacing?.level === 'limited'
          ? C.depleted
          : C.muted;

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: `1.5px solid ${C.border}`,
        borderRadius: '20px',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
      }}
    >
      {/* ─── Header: Physical OS Badge + Headline ───────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={14} color={C.recovery} />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: C.recovery,
                letterSpacing: '1.2px',
                textTransform: 'uppercase',
              }}
            >
              PHYSICAL STATE
            </span>
          </div>
          <span style={{ fontSize: '11px', color: C.sub, fontWeight: 600 }}>
            {pacing?.caffeineCutoff ? `Caffeine cutoff: ${pacing.caffeineCutoff}` : 'Non-medical telemetry'}
          </span>
        </div>

        <div
          style={{
            fontSize: '18px',
            fontWeight: 800,
            color: C.text,
            lineHeight: 1.35,
            letterSpacing: '-0.02em',
          }}
        >
          {headline}
        </div>
      </div>

      {/* ─── Bio-Pacing Guidance Card ────────────────────────────────────────── */}
      {pacing && (
        <div
          style={{
            background: C.elev,
            border: `1px solid ${C.border}`,
            borderRadius: '14px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Focus Capacity
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: statusColor, marginTop: '2px' }}>
                {pacing.focusCapacity}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                Caffeine Pacing
              </div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: C.text, marginTop: '2px' }}>
                {pacing.caffeineCutoff}
              </div>
            </div>
          </div>
          {pacing.recommendedWorkType && (
            <div style={{ fontSize: '12px', color: C.sub, borderTop: `1px solid ${C.border}`, paddingTop: '8px' }}>
              <span style={{ color: C.text, fontWeight: 700 }}>Recommended Work: </span>
              {pacing.recommendedWorkType}
            </div>
          )}
        </div>
      )}

      {/* ─── 4 Multi-Dimensional Physical Pillar Gauges ─────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '2px' }}>
        {/* Sleep */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Moon size={13} color={C.sleep} /> Sleep
            </span>
            <span style={{ color: sleep.isTracked ? C.sub : C.muted, fontSize: '12px', fontWeight: 500 }}>
              {sleep.isTracked ? `${sleep.hours}h · ${sleep.summary}` : 'Untracked today'}
            </span>
          </div>
          <ProgressBar value={sleep.hours || 0} max={8} color={C.sleep} height={5} />
        </div>

        {/* Hydration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Droplets size={13} color={C.water} /> Hydration
            </span>
            <span style={{ color: hydration.isTracked ? C.sub : C.muted, fontSize: '12px', fontWeight: 500 }}>
              {(hydration.ml / 1000).toFixed(1)}L / {(hydration.targetMl / 1000).toFixed(1)}L ({Math.round(hydration.ratio * 100)}%)
            </span>
          </div>
          <ProgressBar value={hydration.ml} max={hydration.targetMl} color={C.water} height={5} />
        </div>

        {/* Fuel / Nutrition */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Utensils size={13} color={C.nutrition} /> Fuel
            </span>
            <span style={{ color: fuel.isTracked ? C.sub : C.muted, fontSize: '12px', fontWeight: 500 }}>
              {fuel.calories} / {fuel.targetCalories} kcal · {fuel.protein}g protein
            </span>
          </div>
          <ProgressBar value={fuel.calories} max={fuel.targetCalories} color={C.nutrition} height={5} />
        </div>

        {/* Movement */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', marginBottom: '5px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Zap size={13} color={C.activity} /> Movement
            </span>
            <span style={{ color: movement.isTracked ? C.sub : C.muted, fontSize: '12px', fontWeight: 500 }}>
              {movement.activeMinutes > 0 ? `${movement.activeMinutes}m active (${movement.summary})` : movement.summary}
            </span>
          </div>
          <ProgressBar value={movement.activeMinutes} max={60} color={C.activity} height={5} />
        </div>

        {/* Scale Weight (compact single line if logged) */}
        {weight?.isTracked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', paddingTop: '8px', borderTop: `1px solid ${C.border}` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 600 }}>
              <Scale size={13} color={C.weight} /> Scale Weight
            </span>
            <span style={{ color: C.sub, fontWeight: 700 }}>
              {weight.currentKg} kg
              {weight.trend != null && (
                <span style={{ color: weight.trend <= 0 ? C.optimal : C.sub, marginLeft: '6px', fontSize: '11px', fontWeight: 600 }}>
                  {weight.trend > 0 ? `+${weight.trend}kg` : `${weight.trend}kg`}
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
