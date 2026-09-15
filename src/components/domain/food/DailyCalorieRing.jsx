import React, { useMemo } from 'react';
import { Droplet, Plus, Sparkles } from 'lucide-react';
import { FC, FProgressBar } from './shared.jsx';
import { DEFAULT_CALORIE_GOAL, DEFAULT_MACRO_GOALS } from '../../../data/foods/index.js';
import { computeMacroBalanceGuidance } from '../../../engines/food/index.js';

export default function DailyCalorieRing({ 
  totals, 
  goal = DEFAULT_CALORIE_GOAL, 
  macroGoals = DEFAULT_MACRO_GOALS,
  water = 0,
  waterGoal = 3000,
  onAddWater
}) {
  const { cal = 0, protein = 0, carbs = 0, fat = 0, fiber = 0 } = totals;

  const remainingCal = Math.max(0, goal - cal);
  const remainingProtein = Math.max(0, macroGoals.protein - protein);

  const calColor = cal > goal ? FC.over : FC.food;
  const proteinColor = FC.protein;
  const waterColor = '#06B6D4'; // custom bright hydration cyan

  // Compute deterministic macro guidance
  const guidance = useMemo(() => {
    return computeMacroBalanceGuidance(totals, {
      calorie_goal: goal,
      protein_goal: macroGoals.protein,
      carbs_goal: macroGoals.carbs,
      fat_goal: macroGoals.fat
    });
  }, [totals, goal, macroGoals]);

  return (
    <div style={{
      background: FC.surface,
      border: `1px solid ${FC.border}`,
      borderRadius: '24px',
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
      boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(20px)',
    }}>
      {/* ── Ring Section ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* SVG Concentric Rings */}
        <div style={{ position: 'relative', width: '160px', height: '160px', flexShrink: 0, margin: '0 auto' }}>
          <svg width="160" height="160" viewBox="0 0 200 200">
            {/* Outer Ring: Calories (Radius 80) */}
            <Ring radius={80} value={cal} goal={goal} color={calColor} strokeWidth={11} />
            {/* Middle Ring: Protein (Radius 62) */}
            <Ring radius={62} value={protein} goal={macroGoals.protein} color={proteinColor} strokeWidth={11} />
            {/* Inner Ring: Water (Radius 44) */}
            <Ring radius={44} value={water} goal={waterGoal} color={waterColor} strokeWidth={11} />
          </svg>

          {/* Central Calorie Text */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <span style={{ fontSize: '22px', fontWeight: 900, color: FC.text, lineHeight: 1 }}>
              {Math.round(cal)}
            </span>
            <span style={{ fontSize: '9px', color: FC.muted, fontWeight: 700, letterSpacing: '1px', marginTop: '2px' }}>
              OF {goal} KCAL
            </span>
          </div>
        </div>

        {/* Legend / Metrics List */}
        <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Calorie Stats */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: FC.muted, fontWeight: 600 }}>Calories</span>
              <span style={{ fontSize: '11px', color: cal > goal ? FC.over : FC.optimal, fontWeight: 700 }}>
                {cal > goal ? `${Math.round(cal - goal)} over` : `${Math.round(remainingCal)} left`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: calColor }} />
              <span style={{ fontSize: '18px', fontWeight: 900, color: FC.text }}>
                {Math.round(cal)} <span style={{ fontSize: '12px', fontWeight: 500, color: FC.muted }}>kcal</span>
              </span>
            </div>
          </div>

          {/* Protein Stats */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: FC.muted, fontWeight: 600 }}>Protein</span>
              <span style={{ fontSize: '11px', color: remainingProtein === 0 ? FC.optimal : FC.sub, fontWeight: 700 }}>
                {remainingProtein === 0 ? 'Goal hit!' : `${Math.round(remainingProtein)}g left`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: proteinColor }} />
              <span style={{ fontSize: '18px', fontWeight: 900, color: FC.text }}>
                {Math.round(protein)}<span style={{ fontSize: '12px', fontWeight: 500, color: FC.muted }}>g</span>
                <span style={{ fontSize: '12px', fontWeight: 600, color: FC.muted, marginLeft: '6px' }}>/ {macroGoals.protein}g</span>
              </span>
            </div>
          </div>

          {/* Hydration Stats + Quick Add */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '11px', color: FC.muted, fontWeight: 600 }}>Water Intake</span>
              <span style={{ fontSize: '10px', color: waterColor, fontWeight: 700 }}>Goal: {waterGoal}ml</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Droplet size={14} color={waterColor} fill={waterColor} />
                <span style={{ fontSize: '18px', fontWeight: 900, color: FC.text }}>
                  {water}<span style={{ fontSize: '12px', fontWeight: 500, color: FC.muted }}>ml</span>
                </span>
              </div>
              
              {/* Quick Add Buttons */}
              {onAddWater && (
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => onAddWater(250)}
                    style={{
                      background: `${waterColor}1A`,
                      border: `1px solid ${waterColor}40`,
                      borderRadius: '8px',
                      color: waterColor,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Plus size={10} />250
                  </button>
                  <button 
                    onClick={() => onAddWater(500)}
                    style={{
                      background: `${waterColor}1A`,
                      border: `1px solid ${waterColor}40`,
                      borderRadius: '8px',
                      color: waterColor,
                      fontSize: '10px',
                      fontWeight: 800,
                      padding: '4px 6px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <Plus size={10} />500
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Deterministic Macro Balance Guidance Banner ── */}
      {guidance && (
        <div style={{
          background: guidance.status === 'complete' ? `${FC.over}10` : `${FC.food}10`,
          border: `1px solid ${guidance.status === 'complete' ? `${FC.over}30` : `${FC.food}30`}`,
          borderRadius: '14px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Sparkles size={14} color={guidance.status === 'complete' ? FC.over : FC.food} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: FC.text, lineHeight: '1.3' }}>
            {guidance.text}
          </span>
        </div>
      )}

      {/* ── Macro progress bars (Carbs, Fat, Fiber) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: `1px solid ${FC.border}`, paddingTop: '16px' }}>
        <MacroBar label="Carbs" value={carbs} goal={macroGoals.carbs} color={FC.carbs} unit="g" />
        <MacroBar label="Fat" value={fat} goal={macroGoals.fat} color={FC.fat} unit="g" />
        <MacroBar label="Fiber" value={fiber} goal={macroGoals.fiber} color={FC.fiber} unit="g" />
      </div>
    </div>
  );
}

// ── Ring Drawing Helper ──
const Ring = ({ radius, value, goal, color, strokeWidth = 10 }) => {
  const circumference = 2 * Math.PI * radius;
  const pct = goal > 0 ? Math.min(value / goal, 1.0) : 0;
  const offset = circumference - pct * circumference;
  return (
    <g>
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={FC.dim}
        strokeWidth={strokeWidth}
        opacity="0.3"
      />
      <circle
        cx="100"
        cy="100"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 100 100)"
        style={{
          transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      />
    </g>
  );
};

// ── Macro Progress Bar Helper ──
function MacroBar({ label, value, goal, color, unit }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{ fontSize: '11px', color: FC.muted, fontWeight: 700, width: '48px', flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1 }}>
        <FProgressBar value={value} max={goal} color={color} height={6} />
      </div>
      <span style={{ fontSize: '11px', color, fontWeight: 700, width: '60px', textAlign: 'right', flexShrink: 0 }}>
        {Math.round(value)}/{goal}{unit}
      </span>
    </div>
  );
}
