/**
 * BodyRhythmVisualizer — The Circadian Body Rhythm Wave
 * Metaphor: RHYTHM ("How am I doing today, and what is shaping it?")
 * Renders the Sleep, Fuel, Water, Movement timeline tracks with visible NOW marker,
 * followed by the 4-indicator compact state summary.
 */
import React, { useMemo } from 'react';
import { Moon, Utensils, Droplets, Zap } from 'lucide-react';

export default function BodyRhythmVisualizer({
  sleepHours = 0,
  mealLogs = [],
  waterLogs = [],
  moveLogs = [],
}) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // Calculate now percentage along 24h axis (0h = 0%, 24h = 100%)
  const nowPct = Math.max(5, Math.min(95, (currentHour / 24) * 100));

  // Compute fuel meal dots
  const mealDots = useMemo(() => {
    if (!mealLogs || mealLogs.length === 0) {
      return [];
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
  const waterDisplay = totalWaterMl > 0 ? `${(totalWaterMl / 1000).toFixed(1)}L` : '0.0L';
  const sleepDisplay = sleepHours > 0 ? `${Math.floor(sleepHours)}h ${Math.round((sleepHours % 1) * 60)}m` : '0h';
  const mealsCount = mealLogs?.length || 0;
  const totalMoveMins = moveLogs.reduce((s, m) => s + (Number(m.active_minutes) || 0), 0);
  const moveDisplay = totalMoveMins > 0 ? `${totalMoveMins}m` : '0m';

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1.5px solid var(--brand-border, #E5E0D8)',
      borderRadius: '20px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      boxShadow: '0 2px 8px rgba(17,26,32,0.03)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{
            fontSize: '15px',
            fontWeight: 800,
            color: 'var(--brand-text, #111A20)',
            letterSpacing: '-0.01em',
          }}>
            Circadian Body Rhythm
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brand-muted, #68777B)', marginTop: '2px' }}>
            24-hour chronological physical flow
          </div>
        </div>
        <div style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#D97706',
          background: 'rgba(217, 119, 6, 0.1)',
          border: '1px solid rgba(217, 119, 6, 0.25)',
          padding: '2px 8px',
          borderRadius: '6px',
        }}>
          Now: {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* ── 24-HOUR RHYTHM TRACK CONTAINER ── */}
      <div style={{ position: 'relative', padding: '10px 0 24px' }}>
        {/* Vertical NOW Indicator Line */}
        <div style={{
          position: 'absolute',
          top: '-2px',
          bottom: '22px',
          left: `${nowPct}%`,
          width: '2px',
          background: '#D97706',
          zIndex: 5,
          boxShadow: '0 0 6px rgba(217, 119, 6, 0.4)',
        }}>
          <div style={{
            position: 'absolute',
            bottom: '-18px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '10px',
            fontWeight: 800,
            color: '#D97706',
            whiteSpace: 'nowrap',
          }}>
            Now
          </div>
        </div>

        {/* The 4 Rhythm Tracks: Sleep, Fuel, Water, Movement */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* TRACK 1: SLEEP */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '70px', fontSize: '11px', color: 'var(--brand-muted, #68777B)', fontWeight: 700 }}>
              Sleep
            </span>
            <div style={{ flex: 1, height: '12px', background: '#FAF7F2', border: '1px solid #E5E0D8', borderRadius: '6px', position: 'relative' }}>
              {/* Sleep block from 0h to 7h */}
              <div style={{
                position: 'absolute',
                left: '2%',
                width: '28%',
                height: '100%',
                background: '#4F46E5',
                borderRadius: '5px',
                opacity: 0.85,
              }} />
            </div>
          </div>

          {/* TRACK 2: FUEL */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '70px', fontSize: '11px', color: 'var(--brand-muted, #68777B)', fontWeight: 700 }}>
              Fuel
            </span>
            <div style={{ flex: 1, height: '12px', position: 'relative', background: '#FAF7F2', border: '1px solid #E5E0D8', borderRadius: '6px' }}>
              {/* Meal dots along timeline */}
              {mealDots.map((h, idx) => {
                const pct = Math.max(3, Math.min(97, (h / 24) * 100));
                return (
                  <div
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '1px',
                      transform: 'translateX(-50%)',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#174A55',
                      border: '1.5px solid #FFFFFF',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* TRACK 3: WATER */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '70px', fontSize: '11px', color: 'var(--brand-muted, #68777B)', fontWeight: 700 }}>
              Water
            </span>
            <div style={{ flex: 1, height: '12px', position: 'relative', background: '#FAF7F2', border: '1px solid #E5E0D8', borderRadius: '6px' }}>
              {/* Water droplet pips */}
              {[8, 10.5, 12, 14.5, 17, 20].map((h, i) => {
                const pct = (h / 24) * 100;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '2px',
                      transform: 'translateX(-50%)',
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#174A55',
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* TRACK 4: MOVEMENT */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ width: '70px', fontSize: '11px', color: 'var(--brand-muted, #68777B)', fontWeight: 700 }}>
              Movement
            </span>
            <div style={{ flex: 1, height: '12px', background: '#FAF7F2', border: '1px solid #E5E0D8', borderRadius: '6px', position: 'relative' }}>
              {/* Movement active window */}
              {totalMoveMins > 0 && (
                <div style={{
                  position: 'absolute',
                  left: '68%',
                  width: `${Math.min(30, Math.max(8, (totalMoveMins / 60) * 15))}%`,
                  height: '100%',
                  background: '#D97706',
                  borderRadius: '5px',
                  opacity: 0.9,
                }} />
              )}
            </div>
          </div>
        </div>

        {/* Time Axis Labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingLeft: '70px',
          marginTop: '16px',
          fontSize: '10px',
          fontWeight: 600,
          color: 'var(--brand-muted, #68777B)',
        }}>
          <span>6 AM</span>
          <span>12 PM</span>
          <span style={{ color: '#D97706', fontWeight: 700 }}>Now</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* ── 4 COMPACT STATE INDICATORS ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '8px',
        paddingTop: '16px',
        borderTop: '1px solid var(--brand-border, #E5E0D8)',
      }}>
        {/* Sleep */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(79, 70, 229, 0.1)',
            color: '#4F46E5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Moon size={15} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-text, #111A20)' }}>
            {sleepDisplay}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brand-muted, #68777B)', marginTop: '2px', fontWeight: 600 }}>
            Sleep
          </div>
        </div>

        {/* Fuel */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(23, 74, 85, 0.1)',
            color: '#174A55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Utensils size={15} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-text, #111A20)' }}>
            {mealsCount} {mealsCount === 1 ? 'meal' : 'meals'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brand-muted, #68777B)', marginTop: '2px', fontWeight: 600 }}>
            Fuel
          </div>
        </div>

        {/* Water */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(23, 74, 85, 0.1)',
            color: '#174A55',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Droplets size={15} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-text, #111A20)' }}>
            {waterDisplay}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brand-muted, #68777B)', marginTop: '2px', fontWeight: 600 }}>
            Water
          </div>
        </div>

        {/* Movement */}
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(217, 119, 6, 0.1)',
            color: '#D97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 6px',
          }}>
            <Zap size={15} />
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-text, #111A20)' }}>
            {moveDisplay}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--brand-muted, #68777B)', marginTop: '2px', fontWeight: 600 }}>
            Movement
          </div>
        </div>
      </div>
    </div>
  );
}
