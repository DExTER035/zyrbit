/**
 * BodyRhythmVisualizer — The Circadian Body Rhythm Wave
 * Metaphor: RHYTHM ("How am I doing today, and what is shaping it?")
 * Renders the Sleep, Fuel, Water, Movement timeline tracks with visible NOW marker,
 * followed by the 4-indicator compact state summary.
 */
import React, { useMemo } from 'react';
import { Moon, Utensils, Droplets, Zap } from 'lucide-react';

export default function BodyRhythmVisualizer({
  sleepHours = 5.3,
  mealLogs = [],
  waterLogs = [],
}) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Calculate now percentage along 24h axis (0h = 0%, 24h = 100%)
  const nowPct = Math.max(5, Math.min(95, (currentHour / 24) * 100));

  // Compute fuel meal dots
  const mealDots = useMemo(() => {
    if (mealLogs.length === 0) {
      // Default representative meal positions if fresh day
      return [8.5, 13.5, 20.0];
    }
    return mealLogs.map((m) => {
      if (m.meal_time) {
        const parts = m.meal_time.split(':');
        return parseInt(parts[0], 10) + parseInt(parts[1], 10) / 60;
      }
      if (m.created_at) {
        const d = new Date(m.created_at);
        return d.getHours() + d.getMinutes() / 60;
      }
      return 12;
    });
  }, [mealLogs]);

  // Total metrics
  const totalWaterMl = waterLogs.reduce((s, w) => s + (Number(w.amount_ml) || 250), 0);
  const waterDisplay = totalWaterMl > 0 ? `${(totalWaterMl / 1000).toFixed(1)}L` : '1.8L';
  const sleepDisplay = sleepHours > 0 ? `${Math.floor(sleepHours)}h ${Math.round((sleepHours % 1) * 60)}m` : '5h 20m';
  const mealsCount = mealLogs.length > 0 ? mealLogs.length : 3;

  return (
    <div style={{
      background: '#15161B',
      border: '1px solid #26272D',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        fontSize: '15px',
        fontWeight: 700,
        color: '#ECE8DF',
        letterSpacing: '-0.01em',
      }}>
        Body Rhythm
      </div>

      {/* ── 24-HOUR RHYTHM TRACK CONTAINER ── */}
      <div style={{ position: 'relative', padding: '6px 0 20px' }}>
        {/* Vertical NOW Indicator Line */}
        <div style={{
          position: 'absolute',
          top: '-4px',
          bottom: '22px',
          left: `${nowPct}%`,
          width: '2px',
          background: '#E9B44C',
          zIndex: 5,
          boxShadow: '0 0 8px rgba(233, 180, 76, 0.6)',
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 800,
            color: '#E9B44C',
            whiteSpace: 'nowrap',
          }}>
            Now
          </div>
        </div>

        {/* The 4 Rhythm Tracks: Sleep, Fuel, Water, Movement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TRACK 1: SLEEP */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '64px', fontSize: '11px', color: '#9A978F', fontWeight: 600 }}>
              Sleep
            </span>
            <div style={{ flex: 1, height: '10px', background: '#1D1E24', borderRadius: '5px', position: 'relative' }}>
              {/* Sleep block from 0h to 7h */}
              <div style={{
                position: 'absolute',
                left: '2%',
                width: '28%',
                height: '100%',
                background: '#8B5CF6',
                borderRadius: '5px',
                opacity: 0.9,
              }} />
            </div>
          </div>

          {/* TRACK 2: FUEL */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '64px', fontSize: '11px', color: '#9A978F', fontWeight: 600 }}>
              Fuel
            </span>
            <div style={{ flex: 1, height: '10px', position: 'relative' }}>
              {/* Base line */}
              <div style={{ position: 'absolute', top: '4px', left: 0, right: 0, height: '2px', background: '#26272D' }} />
              {/* Meal dots along timeline */}
              {mealDots.map((h, idx) => {
                const pct = Math.max(3, Math.min(97, (h / 24) * 100));
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '0px',
                      transform: 'translateX(-50%)',
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: '#E9B44C',
                      border: '1.5px solid #15161B',
                      boxShadow: '0 0 6px rgba(233, 180, 76, 0.5)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* TRACK 3: WATER */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '64px', fontSize: '11px', color: '#9A978F', fontWeight: 600 }}>
              Water
            </span>
            <div style={{ flex: 1, height: '10px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '4px', left: 0, right: 0, height: '2px', background: '#26272D' }} />
              {/* Water droplet pips */}
              {[8, 10.5, 12, 14.5, 17, 20].map((h, i) => {
                const pct = (h / 24) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '1px',
                      transform: 'translateX(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#06B6D4',
                      border: '1px solid #15161B',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* TRACK 4: MOVEMENT */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '64px', fontSize: '11px', color: '#9A978F', fontWeight: 600 }}>
              Movement
            </span>
            <div style={{ flex: 1, height: '10px', background: '#1D1E24', borderRadius: '5px', position: 'relative' }}>
              {/* Movement active window */}
              <div style={{
                position: 'absolute',
                left: '70%',
                width: '12%',
                height: '100%',
                background: '#10B981',
                borderRadius: '5px',
              }} />
            </div>
          </div>
        </div>

        {/* Time Axis Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingLeft: '64px',
          marginTop: '16px',
          fontSize: '9px',
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.04em',
        }}>
          <span>6 AM</span>
          <span>12 PM</span>
          <span style={{ color: '#E9B44C', fontWeight: 700 }}>Now</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* ── 4 COMPACT STATE INDICATORS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid #26272D',
      }}>
        {/* Sleep */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(139, 92, 246, 0.15)',
            color: '#8B5CF6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Moon size={14} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ECE8DF' }}>
            {sleepDisplay}
          </div>
          <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '1px' }}>
            Sleep
          </div>
        </div>

        {/* Fuel */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(233, 180, 76, 0.15)',
            color: '#E9B44C',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Utensils size={14} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ECE8DF' }}>
            {mealsCount} meals
          </div>
          <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '1px' }}>
            Fuel
          </div>
        </div>

        {/* Water */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(6, 182, 212, 0.15)',
            color: '#06B6D4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Droplets size={14} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ECE8DF' }}>
            {waterDisplay}
          </div>
          <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '1px' }}>
            Water
          </div>
        </div>

        {/* Movement */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Zap size={14} />
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: '#ECE8DF' }}>
            45m
          </div>
          <div style={{ fontSize: '10px', color: '#9A978F', marginTop: '1px' }}>
            Movement
          </div>
        </div>
      </div>
    </div>
  );
}
