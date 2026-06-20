import { useMemo } from 'react'

/**
 * GitHub-style 90-day contribution heatmap.
 * @param {string} color - Base hue color (hex)
 * @param {Object} dataMap - { 'YYYY-MM-DD': count } object
 * @param {string} label - Optional label like "Focus Sessions"
 */
const HeatmapGrid = ({
  color = '#00E5FF',
  dataMap = {},
  label = '',
}) => {
  const { grid, months, maxVal } = useMemo(() => {
    const today = new Date()
    const days = 91 // ~13 weeks
    const cells = []
    let max = 1

    // Build array of last 91 days
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
  }, [dataMap])

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
    // Parse hex color to RGB, then apply opacity levels
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
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
      <div style={{ display: 'flex', gap: '2px' }}>
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
