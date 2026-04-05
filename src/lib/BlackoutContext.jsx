import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

const BlackoutContext = createContext(null)

export function useBlackout() {
  return useContext(BlackoutContext)
}

export function BlackoutProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [endsAt, setEndsAt] = useState(null)       // Date object
  const [remaining, setRemaining] = useState(0)    // seconds
  const [subject, setSubject] = useState('')
  const [userId, setUserId] = useState(null)
  const startedAtRef = useRef(null)
  const intervalRef = useRef(null)

  // Persist state across refreshes via localStorage
  useEffect(() => {
    const saved = localStorage.getItem('zyrbit_blackout')
    if (saved) {
      try {
        const { endsAt: ea, subject: sub, userId: uid, startedAt } = JSON.parse(saved)
        const end = new Date(ea)
        if (end > new Date()) {
          setIsActive(true)
          setEndsAt(end)
          setSubject(sub || '')
          setUserId(uid)
          startedAtRef.current = new Date(startedAt)
        } else {
          localStorage.removeItem('zyrbit_blackout')
        }
      } catch (_) {}
    }
  }, [])

  useEffect(() => {
    if (!isActive || !endsAt) { clearInterval(intervalRef.current); return }
    const tick = () => {
      const diff = Math.max(0, Math.floor((endsAt - new Date()) / 1000))
      setRemaining(diff)
      if (diff === 0) endBlackout(true)
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isActive, endsAt])

  const startBlackout = useCallback((durationMinutes, sub, uid) => {
    const end = new Date(Date.now() + durationMinutes * 60 * 1000)
    const startedAt = new Date()
    startedAtRef.current = startedAt
    setIsActive(true)
    setEndsAt(end)
    setSubject(sub)
    setUserId(uid)
    localStorage.setItem('zyrbit_blackout', JSON.stringify({
      endsAt: end.toISOString(), subject: sub, userId: uid, startedAt: startedAt.toISOString()
    }))
  }, [])

  const endBlackout = useCallback(async (natural = false, reflection = '') => {
    clearInterval(intervalRef.current)
    const startedAt = startedAtRef.current || new Date()
    const durationMinutes = Math.round((new Date() - startedAt) / 60000)
    
    // Log session to Supabase
    if (userId && durationMinutes > 0) {
      await supabase.from('study_sessions').insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        session_date: new Date().toLocaleDateString('en-CA'),
        notes: reflection || 'Blackout Mode session',
        source: 'blackout',
        started_at: startedAt.toISOString(),
        completed_at: new Date().toISOString()
      })
    }

    localStorage.removeItem('zyrbit_blackout')
    setIsActive(false)
    setEndsAt(null)
    setRemaining(0)
    setSubject('')
    startedAtRef.current = null
    if (natural) showToast(`⚡ Blackout complete! ${durationMinutes}min logged.`, 'success')
    else showToast(`Focus session ended. ${durationMinutes}min logged.`, 'info')
  }, [userId])

  const formatMMSS = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <BlackoutContext.Provider value={{ isActive, remaining, subject, startBlackout, endBlackout, formatMMSS }}>
      {children}
      {/* Global top banner */}
      {isActive && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
            background: 'linear-gradient(90deg, #7F77DD, #9FA0FF)',
            padding: '10px 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#000', letterSpacing: 1.5, textTransform: 'uppercase' }}>🔒 BLACKOUT</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#000', fontVariantNumeric: 'tabular-nums' }}>{formatMMSS(remaining)}</div>
            {subject && <div style={{ fontSize: 10, color: '#00000080', fontWeight: 700 }}>· {subject}</div>}
          </div>
          <button
            onClick={() => endBlackout(false)}
            style={{ background: 'rgba(0,0,0,0.15)', border: 'none', color: '#000', fontWeight: 900, fontSize: 11, padding: '4px 10px', borderRadius: 100, cursor: 'pointer' }}
          >
            Exit
          </button>
        </div>
      )}
    </BlackoutContext.Provider>
  )
}
