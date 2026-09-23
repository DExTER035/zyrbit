import React from 'react';
import { Droplets, Moon, Utensils, Zap, Scale } from 'lucide-react';
import { C } from './shared.jsx';

export default function QuickCaptureBar({
  onQuickWater,
  onQuickSleepWell,
  onOpenMealPicker,
  onOpenWorkoutModal,
  onOpenWeightModal,
  topUsual = null,
  isSubmitting = false,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '10px', color: C.muted, fontWeight: 800, letterSpacing: 'var(--ls-caps)', textTransform: 'uppercase' }}>
        QUICK CAPTURE
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))',
          gap: '8px',
        }}
      >
        {/* +500ml Water */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => onQuickWater(500)}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            color: C.water,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.water; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <Droplets size={16} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>+500ml</span>
          <span style={{ fontSize: '9px', color: C.muted }}>Water</span>
        </button>

        {/* Slept Well (7.5h) */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onQuickSleepWell}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            color: C.sleep,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.sleep; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <Moon size={16} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>Slept Well</span>
          <span style={{ fontSize: '9px', color: C.muted }}>7.5h (Good)</span>
        </button>

        {/* Top Usual or Add Meal */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onOpenMealPicker}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            color: C.nutrition,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.nutrition; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <Utensils size={16} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
            {topUsual ? topUsual.food_name : '+ Food'}
          </span>
          <span style={{ fontSize: '9px', color: C.muted }}>
            {topUsual ? `${topUsual.calories} kcal` : 'Log Meal'}
          </span>
        </button>

        {/* + Workout */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onOpenWorkoutModal}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            color: C.activity,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.activity; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <Zap size={16} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>+ Workout</span>
          <span style={{ fontSize: '9px', color: C.muted }}>Movement</span>
        </button>

        {/* + Scale Weight */}
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onOpenWeightModal}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '12px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            color: C.weight,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.weight; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          <Scale size={16} />
          <span style={{ fontSize: '11px', fontWeight: 800, color: C.text }}>+ Weight</span>
          <span style={{ fontSize: '9px', color: C.muted }}>Scale kg</span>
        </button>
      </div>
    </div>
  );
}
