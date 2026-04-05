import React, { useState, useRef, useMemo, useEffect } from 'react'
import HeatmapGrid from './HeatmapGrid.jsx'


const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const [h, m] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(h), parseInt(m))
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

const useLongPress = (callback, ms=500) => {
  const timerRef = useRef(null)
  const start = () => { timerRef.current = setTimeout(callback, ms) }
  const stop = () => { clearTimeout(timerRef.current) }
  return {
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
    onTouchStart: start,
    onTouchEnd: stop,
  }
}

export default function HabitCard({ habit, logs = [], streak = 0, isCompleted = false, onToggle, onEdit, onDelete, onStats }) {
  const [checking, setChecking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const zoneColor = ZONE_COLORS[habit.zone] || 'var(--color-cyan)'
  const menuRef = useRef(null)

  const handleCheck = async (e) => {
    e.stopPropagation()
    if (checking) return
    setChecking(true)
    await onToggle(habit)
    setTimeout(() => setChecking(false), 350)
  }

  const longPressHandlers = useLongPress(() => {
    setShowMenu(true)
  }, 500)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMenu])

  const completedDates = useMemo(() => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    return logs.filter(l => l.status === 'completed').map(l => {
      const logD = new Date(l.completed_date)
      logD.setHours(12,0,0,0)
      return Math.floor((today - logD) / (1000 * 60 * 60 * 24))
    }).filter(days => days >= 0 && days < 35)
  }, [logs])

  return (
    <div
      style={{
        margin: '0 14px 10px',
        background: isCompleted ? `color-mix(in srgb, ${zoneColor} 8%, #0E0E14)` : '#0E0E14',
        borderRadius: '20px',
        borderLeft: `3px solid ${zoneColor}`,
        borderTop: '1px solid var(--color-border)',
        borderRight: '1px solid var(--color-border)',
        borderBottom: '1px solid var(--color-border)',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        padding: '14px',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isCompleted ? `0 0 20px color-mix(in srgb, ${zoneColor} 10%, transparent)` : 'none',
        cursor: 'pointer',
        animation: 'scaleIn 0.25s ease forwards',
        position: 'relative'
      }}
      onDoubleClick={() => onEdit?.(habit)}
      {...longPressHandlers}
    >
      {showMenu && (
        <div ref={menuRef} style={{
          position: 'absolute', top: '10px', right: '10px',
          background: '#111118', border: '1px solid #1E1E28', borderRadius: '14px',
          padding: '6px', boxShadow: '0 8px 32px #00000080', animation: 'fadeSlideUp 0.2s ease', zIndex: 10,
          display: 'flex', flexDirection: 'column', minWidth: '150px'
        }}>
          {[
            { icon: '✅', label: isCompleted ? 'Undo' : 'Complete', c: '#00FFFF', act: () => { handleCheck({stopPropagation:()=>{}}); setShowMenu(false) } },
            { icon: '⏰', label: 'Set Reminder', c: '#FF9800', act: () => { onEdit?.(habit); setShowMenu(false) } },
            { icon: '✏️', label: 'Edit Habit', c: '#9C27B0', act: () => { onEdit?.(habit); setShowMenu(false) } },
            { icon: '📊', label: 'View Stats', c: '#4CAF50', act: () => { onStats?.(habit); setShowMenu(false) } },
            { icon: '🗑️', label: 'Delete Habit', c: '#EF4444', act: () => { onDelete?.(habit); setShowMenu(false) } },
          ].map((m, i) => (
            <div key={i} onClick={(e) => { e.stopPropagation(); m.act(); }} style={{
              padding: '9px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: m.c,
              transition: 'background 0.2s'
            }} onMouseEnter={e => e.currentTarget.style.background = '#1A1A24'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              {m.icon} {m.label}
            </div>
          ))}
        </div>
      )}

      {/* Top Row Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', width: '100%', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
          {/* Icon Box */}
          <div style={{
            width: '38px', height: '38px', borderRadius: '12px',
            background: `color-mix(in srgb, ${zoneColor} 15%, transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0, minWidth: '38px'
          }}>
            {habit.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ 
              fontSize: '13px', fontWeight: 600, color: 'var(--color-text)', 
              lineHeight: 1.3, marginBottom: '2px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {habit.name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: `color-mix(in srgb, ${zoneColor} 60%, transparent)`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {habit.zone}
              </div>
              {streak > 0 && (
                <div style={{ fontSize: '12px', fontWeight: 800, color: zoneColor }}>
                  🔥 {streak}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <button
          className={isCompleted ? 'animate-checkBounce' : ''}
          style={{
            width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', borderRadius: '50%', flexShrink: 0,
            border: isCompleted ? 'none' : `2px solid color-mix(in srgb, ${zoneColor} 40%, transparent)`,
            background: isCompleted ? zoneColor : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.2s',
            outline: 'none', padding: 0
          }}
          onClick={handleCheck}
        >
          {isCompleted && (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7.5L5 10L11.5 3.5" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

      </div>

      {/* Orbit Trail Header */}
      <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', color: '#222233', marginBottom: '8px', textTransform: 'uppercase' }}>
        ORBIT TRAIL
      </div>

      {/* 10-Dot Consistency Trail */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        {Array.from({ length: 10 }).map((_, i) => {
          const day = new Date();
          day.setDate(day.getDate() - (9 - i));
          const dateStr = day.toLocaleDateString('en-CA');
          const isDone = logs.some(l => l.completed_date === dateStr && l.status === 'completed');
          return (
            <div 
              key={i} 
              style={{
                width: '8px', height: '8px', borderRadius: '50%',
                background: isDone ? zoneColor : '#1A1A24',
                boxShadow: isDone ? `0 0 8px ${zoneColor}` : 'none',
                transition: 'all 0.3s'
              }} 
            />
          );
        })}
      </div>
        
        {habit.reminder_enabled && habit.reminder_time && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            background: '#FF980010', border: '1px solid #FF980025', borderRadius: '6px',
            padding: '3px 8px', marginTop: '6px', fontSize: '9px', fontWeight: 700, color: '#FF9800',
          }}>
            ⏰ Best before {formatTime(habit.reminder_time)}
          </div>
        )}
    </div>
  )
}

