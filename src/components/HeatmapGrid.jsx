import { useMemo } from 'react'

const HeatmapGrid = ({
  color = '#00FFFF',
  completedDates = [],
}) => {
  const dots = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => {
      const filled = completedDates.includes(i)
      const opacity = filled
        ? (0.3 + Math.random() * 0.7).toFixed(2)
        : 1
      return { filled, opacity }
    })
  }, [completedDates, color])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(35, 1fr)',
      gap: '3px',
      width: '100%',
      overflow: 'hidden',
    }}>
      {dots.map((dot, i) => (
        <div key={i} style={{
          aspectRatio: '1 / 1',
          borderRadius: '3px',
          background: dot.filled
            ? color : '#1A1A24',
          opacity: dot.filled
            ? parseFloat(dot.opacity)
            : 0.5,
          minWidth: 0,
          minHeight: 0,
          display: 'block',
        }} />
      ))}
    </div>
  )
}

export default HeatmapGrid
