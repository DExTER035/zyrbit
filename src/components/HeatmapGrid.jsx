import { useMemo } from 'react'

/**
 * GitHub-style 90-day contribution heatmap.
 * @param {string} color - Base hue color (hex)
 * @param {Object} dataMap - { 'YYYY-MM-DD': count } object
 * @param {string} label - Optional label like "Focus Sessions"
 */
const HeatmapGrid = ({
  color = '#5EE6F5',
  dataMap = {},
  label = '',
  days = 91,
}) => {
  const { grid, months, maxVal } = useMemo(() => {
    const today = new Date()
    const cells = []
    let max = 1

    // Build array of last days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-CA') // YYYY-MM-DD
      const count = dataMap[key] || 0
      if (count > max) max = count
      cells.push({ date: key, count, dayOfWeek: d.getDay(), month: d.getMonth() })
    }

    // Pad the first week so columns align (start on Sunday)
    const firstDow = cells[0]?.dayOfWeek || 0
    const padded = Array.from({ length: firstDow }, () => null).concat(cells)

    // Extract month labels
    const monthLabels = []
    let lastMonth = -1
    padded.forEach((cell, idx) => {
      if (!cell) return
      const col = Math.floor(idx / 7)
      if (cell.month !== lastMonth) {
        const monthName = new Date(cell.date).toLocaleString('default', { month: 'short' })
        monthLabels.push({ col, name: monthName })
        lastMonth = cell.month
      }
    })

    return { grid: padded, months: monthLabels, maxVal: max }
  }, [dataMap, days])

  const getIntensity = (count) => {
    if (count === 0) return 0
    const ratio = count / maxVal
    if (ratio <= 0.25) return 1
    if (ratio <= 0.5) return 2
    if (ratio <= 0.75) return 3
    return 4
  }

  const getColor = (intensity) => {
    if (intensity === 0) return '#1A1A28'

    let resolvedColor = color;
    // 1. If it's a CSS variable, resolve it dynamically or use hardcoded fallbacks.
    if (resolvedColor.startsWith('var(')) {
      const varName = resolvedColor.slice(4, -1).trim();
      if (typeof window !== 'undefined') {
        const styleVal = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        if (styleVal) resolvedColor = styleVal;
      }
      // Static fallbacks in case DOM isn't fully ready or styles aren't compiled
      if (resolvedColor.startsWith('var(')) {
        if (varName === '--color-accent-cyan' || varName === '--color-cyan' || varName === '--zone-mind' || varName === '--color-zone-mind') resolvedColor = '#5EE6F5';
        else if (varName === '--color-accent') resolvedColor = '#8B7FFF';
        else if (varName === '--color-success' || varName === '--zone-body' || varName === '--color-zone-body') resolvedColor = '#10B981';
        else if (varName === '--color-warning' || varName === '--zone-growth' || varName === '--color-zone-growth') resolvedColor = '#F59E0B';
        else if (varName === '--color-error') resolvedColor = '#EF4444';
        else if (varName === '--zone-soul' || varName === '--color-zone-soul') resolvedColor = '#EC4899';
        else resolvedColor = '#5EE6F5'; // default fallback
      }
    }

    // 2. Parse Hex / RGB colors
    let r = 94, g = 230, b = 245; // defaults (cyan)
    if (resolvedColor.startsWith('#')) {
      const hex = resolvedColor.slice(1);
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.slice(0, 2), 16);
        g = parseInt(hex.slice(2, 4), 16);
        b = parseInt(hex.slice(4, 6), 16);
      }
    } else if (resolvedColor.startsWith('rgb')) {
      const match = resolvedColor.match(/\d+/g);
      if (match && match.length >= 3) {
        r = parseInt(match[0], 10);
        g = parseInt(match[1], 10);
        b = parseInt(match[2], 10);
      }
    }

    const opacities = [0, 0.25, 0.45, 0.7, 1.0]
    return `rgba(${r},${g},${b},${opacities[intensity]})`
  }

  const totalCols = Math.ceil(grid.length / 7)
  const dayLabels = ['', 'M', '', 'W', '', 'F', '']

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '1.5px', color: '#525270', textTransform: 'uppercase' }}>{label}</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: color }}>
            {Object.values(dataMap).reduce((s, v) => s + v, 0)} total
          </span>
        </div>
      )}
      <div style={{ display: 'flex', gap: '2px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: '6px' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginRight: '2px', paddingTop: '14px' }}>
          {dayLabels.map((d, i) => (
            <div key={i} style={{ height: '10px', width: '12px', fontSize: '8px', color: '#525270', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              {d}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Month labels */}
          <div style={{ height: '12px', marginBottom: '2px', position: 'relative' }}>
            {months.map((m, i) => (
              <span key={i} style={{
                position: 'absolute',
                left: `${(m.col / totalCols) * 100}%`,
                fontSize: '8px', color: '#525270', fontWeight: 700,
              }}>{m.name}</span>
            ))}
          </div>
          {/* Cells */}
          <div style={{
            display: 'grid',
            gridTemplateRows: 'repeat(7, 10px)',
            gridAutoFlow: 'column',
            gridAutoColumns: '10px',
            gap: '2px',
            overflow: 'hidden',
          }}>
            {grid.map((cell, i) => (
              <div
                key={i}
                title={cell ? `${cell.date}: ${cell.count}` : ''}
                style={{
                  width: '10px', height: '10px',
                  borderRadius: '2px',
                  background: cell ? getColor(getIntensity(cell.count)) : 'transparent',
                  transition: 'background 0.15s ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeatmapGrid
