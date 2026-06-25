/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

const BlackoutContext = createContext(null)

const getSavedBlackout = () => {
  if (typeof window === 'undefined') return null
  const saved = localStorage.getItem('zyrbit_blackout')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      const end = new Date(parsed.endsAt)
      if (end > new Date()) {
        return parsed
      } else {
        localStorage.removeItem('zyrbit_blackout')
      }
    } catch {
      // ignore
    }
  }
  return null
}

export function useBlackout() {
  return useContext(BlackoutContext)
}

export function BlackoutProvider({ children }) {
  const [savedData] = useState(() => getSavedBlackout())

  const [isActive, setIsActive] = useState(!!savedData)
  const [endsAt, setEndsAt] = useState(savedData ? new Date(savedData.endsAt) : null)
  const [remaining, setRemaining] = useState(0)
  const [subject, setSubject] = useState(savedData ? savedData.subject || '' : '')
  const [userId, setUserId] = useState(savedData ? savedData.userId : null)

  const startedAtRef = useRef(savedData ? new Date(savedData.startedAt) : null)
  const intervalRef = useRef(null)

  const endBlackout = useCallback(async (natural = false, reflection = '') => {
    clearInterval(intervalRef.current)
    const startedAt = startedAtRef.current || new Date()
    const durationMinutes = Math.round((new Date() - startedAt) / 60000)
    
    // Log session to Supabase
    if (userId && durationMinutes > 0) {
      await supabase.from('growth_focus_sessions').insert({
        user_id: userId,
        duration_minutes: durationMinutes,
        session_date: new Date().toLocaleDateString('en-CA'),
        notes: reflection || 'Blackout Mode session',
        started_at: startedAt.toISOString(),
        ended_at: new Date().toISOString()
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
  }, [isActive, endsAt, endBlackout])

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
