import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { showToast } from './Toast.jsx'

export default function DailyBudget({ wallet, onUpdate }) {
  const [showEditor, setShowEditor] = useState(false)
  const [budgetVal, setBudgetVal] = useState(400)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (wallet?.daily_budget !== undefined) {
      setBudgetVal(wallet.daily_budget)
    }
  }, [wallet?.daily_budget])

  if (!wallet) return null

  const spent = wallet.daily_spent || 0
  const budget = wallet.daily_budget === null ? 0 : (wallet.daily_budget || 400)
  
  // 0 means no limit.
  const isNoLimit = budget === 0
  const pctRaw = isNoLimit ? 0 : Math.min(Math.round((spent / budget) * 100), 100)
  
  const arcColor = isNoLimit ? '#4CAF50' : pctRaw < 50 ? '#4CAF50' : pctRaw < 75 ? '#FF9800' : '#EF4444'
  const isMaxed = !isNoLimit && pctRaw >= 100

  // svg arc calculation
  const radius = 40
  const circum = 2 * Math.PI * radius
  const dashOffset = circum - (pctRaw / 100) * circum

  const saveBudget = async () => {
    setSaving(true)
    const newB = parseInt(budgetVal) || 0
    await supabase.from('zyron_wallet').update({ daily_budget: newB }).eq('user_id', wallet.user_id)
    showToast('Daily budget updated! 💸', 'success')
    setSaving(false)
    setShowEditor(false)
    if (onUpdate) onUpdate()
  }

  return (
    <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 18, padding: 14, marginBottom: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 900, color: '#E8E8F0', letterSpacing: 0.5 }}>💸 Daily Budget</h3>
          <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 700 }}>Resets midnight</div>
        </div>
        <button onClick={() => setShowEditor(true)} className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, borderRadius: 100, border: '1px solid #2A2A3A' }}>
          ✎ Edit
        </button>
      </div>

      {/* Main Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        {/* Arc Chart */}
        <div style={{ position: 'relative', width: 90, height: 90 }}>
          <svg width="90" height="90" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="45" cy="45" r={radius} fill="none" stroke="#1E1E28" strokeWidth="8" />
            <circle cx="45" cy="45" r={radius} fill="none" stroke={arcColor} strokeWidth="8"
              strokeDasharray={circum} strokeDashoffset={dashOffset}
              style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1), stroke 0.3s', strokeLinecap: 'round' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', animation: isMaxed ? 'pulse 1s infinite' : 'none'
          }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: arcColor }}>{isNoLimit ? '∞' : `${pctRaw}%`}</div>
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Spent Today</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E8F0' }}>
            {spent} <span style={{ fontSize: 12, color: '#555566' }}>/ {isNoLimit ? '∞' : budget} ⚡</span>
          </div>
          {!isNoLimit && (
            <div style={{ fontSize: 11, fontWeight: 700, color: arcColor, marginTop: 8 }}>
              {Math.max(0, budget - spent)} ⚡ remaining today
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="modal-overlay" onClick={() => setShowEditor(false)}>
          <div className="animate-slideUpModal" style={{ background: '#111116', borderTop: '1px solid #1E1E28', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 430, marginTop: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 20, fontWeight: 900, color: '#E8E8F0', marginBottom: 20 }}>Set Daily Budget</h3>
            
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, marginBottom: 12, scrollbarWidth: 'none' }}>
              {[
                { label: 'Conservative', val: 200 },
                { label: 'Balanced', val: 400 },
                { label: 'Aggressive', val: 800 },
                { label: 'No Limit', val: 0 },
              ].map(p => (
                <button
                  key={p.label} onClick={() => setBudgetVal(p.val)}
                  style={{
                    flexShrink: 0, padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 800,
                    background: budgetVal === p.val ? 'var(--color-cyan-glow)' : 'transparent',
                    color: budgetVal === p.val ? 'var(--color-cyan)' : 'var(--color-text)',
                    border: `1px solid ${budgetVal === p.val ? 'var(--color-cyan)' : '#1E1E28'}`
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <input 
                type="range" min="0" max="2000" step="50" 
                value={budgetVal} onChange={e => setBudgetVal(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-cyan)', marginBottom: 12 }}
              />
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-cyan)' }}>
                {budgetVal === 0 ? '∞' : budgetVal} <span style={{ fontSize: 14 }}>⚡/day</span>
              </div>
            </div>

            {budgetVal > 0 && (
              <div style={{ background: '#0D0D18', borderRadius: 12, padding: 12, marginBottom: 24 }}>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>At this rate you can afford:</div>
                <div style={{ fontSize: 13, color: '#E8E8F0', fontWeight: 600 }}>
                  {Math.max(1, Math.floor(budgetVal / 150))}x Themes OR {Math.max(1, Math.floor(budgetVal / 30))}x Orbit Shields
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button disabled={saving} onClick={() => setShowEditor(false)} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button disabled={saving} onClick={saveBudget} className="btn-primary" style={{ flex: 1 }}>
                {saving ? 'Saving...' : 'Save Limit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
