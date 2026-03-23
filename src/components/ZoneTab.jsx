import React from 'react'

export default function ZoneTab({ active, onChange }) {
  const tabs = [
    { id: 'all', label: 'All Orbits', color: '#E8E8F0' },
    { id: 'mind', label: 'Mind', color: 'var(--color-zone-mind)' },
    { id: 'body', label: 'Body', color: 'var(--color-zone-body)' },
    { id: 'growth', label: 'Growth', color: 'var(--color-zone-growth)' },
    { id: 'soul', label: 'Soul', color: 'var(--color-zone-soul)' },
  ]

  return (
    <div 
      style={{ 
        padding: '0 0 12px', 
        overflowX: 'auto', 
        display: 'flex', 
        gap: '10px', 
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        background: '#000'
      }}
    >
      {tabs.map(t => {
        const isActive = active === t.id
        const bg = isActive ? '#FFF' : '#111'
        const color = isActive ? '#000' : '#444'
        const border = isActive ? `1px solid #FFF` : '1px solid #222'
        
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            style={{
              padding: '10px 20px',
              borderRadius: '100px',
              fontSize: '12px',
              fontWeight: 800,
              background: bg,
              color: color,
              border: border,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
              cursor: 'pointer',
              letterSpacing: '-0.3px',
              boxShadow: isActive ? '0 4px 12px rgba(255,255,255,0.1)' : 'none'
            }}
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
