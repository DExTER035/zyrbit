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
        background: `linear-gradient(155deg, ${C.surface} 0%, ${C.elev} 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: '20px',
        padding: '22px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 8px 32px rgba(0,0,0,0.35)`,
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: 'absolute',
          top: '-30px',
          right: '-30px',
          width: '140px',
          height: '140px',
          background: `radial-gradient(circle, ${statusColor}14 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ─── Header: Physical OS Badge + Headline ───────────────────────────── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} color={C.recovery} />
            <span
              style={{
                fontSize: '10px',
                fontWeight: 800,
                color: C.recovery,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
              }}
            >
              PHYSICAL STATE
            </span>
          </div>
          <span style={{ fontSize: '10px', color: C.muted, fontWeight: 600 }}>
            {pacing?.caffeineCutoff ? `Caffeine cutoff: ${pacing.caffeineCutoff}` : 'Non-medical'}
          </span>
        </div>

        <div
          style={{
            fontSize: '17px',
            fontWeight: 700,
            color: C.text,
            lineHeight: 1.35,
            letterSpacing: '-0.3px',
          }}
        >
          {headline}
        </div>
      </div>

      {/* ─── Bio-Pacing Guidance Card ────────────────────────────────────────── */}
      {pacing && (
        <div
          style={{
            background: `${C.elev}88`,
            border: `1px solid ${C.border2}`,
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '9px', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Focus Capacity
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: statusColor, marginTop: '2px' }}>
                {pacing.focusCapacity}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '9px', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Caffeine Pacing
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: C.text, marginTop: '2px' }}>
                {pacing.caffeineCutoff}
              </div>
            </div>
          </div>
          {pacing.recommendedWorkType && (
            <div style={{ fontSize: '11px', color: C.sub, borderTop: `1px dashed ${C.border2}`, paddingTop: '6px' }}>
              <span style={{ color: C.muted }}>Recommended Work: </span>
              {pacing.recommendedWorkType}
            </div>
          )}
        </div>
      )}

      {/* ─── 4 Multi-Dimensional Physical Pillar Gauges ─────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '2px' }}>
        {/* Sleep */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Moon size={12} color={C.sleep} /> Sleep
            </span>
            <span style={{ color: sleep.isTracked ? C.sub : C.muted, fontSize: '11px' }}>
              {sleep.isTracked ? `${sleep.hours}h · ${sleep.summary}` : 'Untracked today'}
            </span>
          </div>
          <ProgressBar value={sleep.hours || 0} max={8} color={C.sleep} height={4} />
        </div>

        {/* Hydration */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Droplets size={12} color={C.water} /> Hydration
            </span>
            <span style={{ color: hydration.isTracked ? C.sub : C.muted, fontSize: '11px' }}>
              {(hydration.ml / 1000).toFixed(1)}L / {(hydration.targetMl / 1000).toFixed(1)}L ({Math.round(hydration.ratio * 100)}%)
            </span>
          </div>
          <ProgressBar value={hydration.ml} max={hydration.targetMl} color={C.water} height={4} />
        </div>

        {/* Fuel / Nutrition */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Utensils size={12} color={C.nutrition} /> Fuel
            </span>
            <span style={{ color: fuel.isTracked ? C.sub : C.muted, fontSize: '11px' }}>
              {fuel.calories} / {fuel.targetCalories} kcal · {fuel.protein}g protein
            </span>
          </div>
          <ProgressBar value={fuel.calories} max={fuel.targetCalories} color={C.nutrition} height={4} />
        </div>

        {/* Movement */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.text, fontWeight: 700 }}>
              <Zap size={12} color={C.activity} /> Movement
            </span>
            <span style={{ color: movement.isTracked ? C.sub : C.muted, fontSize: '11px' }}>
              {movement.activeMinutes > 0 ? `${movement.activeMinutes}m active (${movement.summary})` : movement.summary}
            </span>
          </div>
          <ProgressBar value={movement.activeMinutes} max={60} color={C.activity} height={4} />
        </div>

        {/* Scale Weight (compact single line if logged) */}
        {weight?.isTracked && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', paddingTop: '4px', borderTop: `1px solid ${C.border2}` }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: C.muted }}>
              <Scale size={12} color={C.weight} /> Scale Weight
            </span>
            <span style={{ color: C.sub, fontWeight: 700 }}>
              {weight.currentKg} kg
              {weight.trend != null && (
                <span style={{ color: weight.trend <= 0 ? C.optimal : C.muted, marginLeft: '6px', fontSize: '10px' }}>
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
