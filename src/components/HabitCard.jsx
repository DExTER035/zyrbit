import React, { useState, useRef, useMemo, useEffect } from 'react'
import HeatmapGrid from './HeatmapGrid.jsx'

const ZONE_COLORS = {
  mind: 'var(--color-zone-mind)',
  body: 'var(--color-zone-body)',
  growth: 'var(--color-zone-growth)',
  soul: 'var(--color-zone-soul)',
}

const DAY_LABELS = ['S','M','T','W','T','F','S']

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

export default function HabitCard({
  habit,
  logs = [],
  streak = 0,
  longestStreak = 0,
  monthlyScore = null,
  isCompleted = false,
  onToggle,
  onEdit,
  onDelete,
  onStats
}) {
  const [checking, setChecking] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
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

  // Build 7-day labeled trail (today = rightmost)
  const weekTrail = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date()
      day.setDate(day.getDate() - (6 - i))
      const dateStr = day.toLocaleDateString('en-CA')
      const dayOfWeek = day.getDay() // 0=Sun
      const isDone = logs.some(l => l.completed_date === dateStr && l.status === 'completed')
      return { dateStr, isDone, dayLabel: DAY_LABELS[dayOfWeek] }
    })
  }, [logs])

  // Compute monthly score if not passed in
  const computedMonthlyScore = useMemo(() => {
    if (monthlyScore !== null) return monthlyScore
    const dates = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - i)
      return d.toLocaleDateString('en-CA')
    })
    const done = logs.filter(l => dates.includes(l.completed_date) && l.status === 'completed').length
    return Math.round((done / 30) * 100)
  }, [logs, monthlyScore])

  // For heatmap: completed days map
  const heatmapData = useMemo(() => {
    const map = {}
    logs.forEach(l => {
      if (l.status === 'completed' && l.completed_date) {
        map[l.completed_date] = (map[l.completed_date] || 0) + 1
      }
    })
    return map
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
            { icon: '✅', label: isCompleted ? 'Undo' : 'Complete', c: '#5EE6F5', act: () => { handleCheck({stopPropagation:()=>{}}); setShowMenu(false) } },
            { icon: '⏰', label: 'Set Reminder', c: '#FF9800', act: () => { onEdit?.(habit); setShowMenu(false) } },
            { icon: '✏️', label: 'Edit Habit', c: '#9C27B0', act: () => { onEdit?.(habit); setShowMenu(false) } },
            { icon: '📊', label: showHeatmap ? 'Hide Stats' : 'View Stats', c: '#4CAF50', act: () => { setShowHeatmap(p => !p); setShowMenu(false) } },
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', width: '100%', gap: '12px' }}>
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
            <div style={{ fontSize: '10px', fontWeight: 800, color: `color-mix(in srgb, ${zoneColor} 60%, transparent)`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {habit.zone}
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <button
          className={isCompleted ? 'animate-checkBounce' : ''}
          disabled={checking}
          style={{
            width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', borderRadius: '50%', flexShrink: 0,
            border: isCompleted ? 'none' : `2px solid color-mix(in srgb, ${zoneColor} 40%, transparent)`,
            background: isCompleted ? zoneColor : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: checking ? 'default' : 'pointer', transition: 'all 0.2s',
            outline: 'none', padding: 0, opacity: checking ? 0.5 : 1
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

      {/* Streak Stats Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px' }}>🔥</span>
            <span style={{ fontSize: '10px', fontWeight: 800, color: zoneColor }}>{streak} streak</span>
          </div>
        )}
        {longestStreak > 0 && longestStreak !== streak && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '10px' }}>🏆</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>{longestStreak} best</span>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '10px' }}>📊</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: computedMonthlyScore >= 70 ? 'var(--color-success)' : computedMonthlyScore >= 40 ? 'var(--color-warning)' : 'var(--text-muted)' }}>
            {computedMonthlyScore}% this month
          </span>
        </div>
      </div>

      {/* 7-Day Labeled Trail */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ display: 'flex', gap: '5px', alignItems: 'flex-end' }}>
          {weekTrail.map((day, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
              <div style={{
                width: '100%', height: '8px', borderRadius: '4px',
                background: day.isDone ? zoneColor : '#1A1A24',
                boxShadow: day.isDone ? `0 0 6px ${zoneColor}60` : 'none',
                transition: 'all 0.3s'
              }} />
              <span style={{ fontSize: '8px', fontWeight: 700, color: day.isDone ? `color-mix(in srgb, ${zoneColor} 60%, transparent)` : '#333344', letterSpacing: '0.03em' }}>
                {day.dayLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Heatmap */}
      {showHeatmap && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1A1A24' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#333', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' }}>35-DAY HISTORY</div>
          <HeatmapGrid color={zoneColor} dataMap={heatmapData} days={35} />
        </div>
      )}

      {/* Heatmap toggle hint */}
      <div
        onClick={(e) => { e.stopPropagation(); setShowHeatmap(p => !p) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          marginTop: '4px', fontSize: '9px', fontWeight: 700,
          color: showHeatmap ? zoneColor : '#2A2A38',
          cursor: 'pointer', transition: 'color 0.2s'
        }}
      >
        {showHeatmap ? '▲ Hide' : '▼ History'}
      </div>

      {habit.reminder_enabled && habit.reminder_time && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: '#FF980010', border: '1px solid #FF980025', borderRadius: '6px',
          padding: '3px 8px', marginTop: '6px', marginLeft: '8px', fontSize: '9px', fontWeight: 700, color: '#FF9800',
        }}>
          ⏰ Best before {formatTime(habit.reminder_time)}
        </div>
      )}
    </div>
  )
}
