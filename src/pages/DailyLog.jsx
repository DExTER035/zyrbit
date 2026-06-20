import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import JournalTabDiary from '../components/JournalTabDiary'
import JournalTabStudy from '../components/JournalTabStudy'
import { showToast } from '../components/Toast'
import { earnZyrons } from '../lib/zyrons'

const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

export default function DailyLog() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [activeSubTab, setActiveSubTab] = useState('diary') // diary, study, screentime
  const [loading, setLoading] = useState(false)

  const todayDate = getLocalYMD()

  // Screen vs Study states
  const [studyMinutes, setStudyMinutes] = useState(0)
  const [screenMinutes, setScreenMinutes] = useState(0)
  const [screenInput, setScreenInput] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login')
      } else {
        setUser(session.user)
        loadMirrorData(session.user.id)
      }
    })
  }, []) // Run once on mount — child tabs (JournalTabDiary, JournalTabStudy) fetch their own data

  const loadMirrorData = async (uid) => {
    setLoading(true)
    try {
      // 1. Get study sessions for today
      const { data: studyData } = await supabase
        .from('study_sessions')
        .select('duration_minutes')
        .eq('user_id', uid)
        .eq('session_date', todayDate)

      if (studyData) {
        const total = studyData.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
        setStudyMinutes(total)
      }

      // 2. Get screen time logs for today
      const { data: scrData } = await supabase
        .from('screen_time_logs')
        .select('screen_minutes')
        .eq('user_id', uid)
        .eq('log_date', todayDate)
        .single()

      if (scrData) {
        setScreenMinutes(scrData.screen_minutes)
        setScreenInput((scrData.screen_minutes / 60).toFixed(1))
      } else {
        setScreenMinutes(0)
        setScreenInput('')
      }

    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveScreenTime = async (e) => {
    e.preventDefault()
    if (!user) return
    const hours = parseFloat(screenInput)
    if (isNaN(hours) || hours < 0) {
      showToast('⚠️ Enter valid hours (e.g. 3.5)', 'warning')
      return
    }

    const minutes = Math.round(hours * 60)

    const { error } = await supabase.from('screen_time_logs').upsert({
      user_id: user.id,
      log_date: todayDate,
      screen_minutes: minutes
    }, { onConflict: 'user_id,log_date' })

    if (!error) {
      showToast('📱 Screen time logged!', 'success')
      await earnZyrons(user.id, 5, 'Screen time logged')
      setScreenMinutes(minutes)
      loadMirrorData(user.id)
    } else {
      showToast('❌ Failed to log screen time', 'error')
    }
  }

  const studyHours = (studyMinutes / 60).toFixed(1)
  const screenHours = (screenMinutes / 60).toFixed(1)
  const isDecaying = parseFloat(screenHours) > parseFloat(studyHours)

  const tabs = [
    { id: 'diary', label: 'Diary & Mood 📓' },
    { id: 'study', label: 'Study & Pomodoro 📚' },
    { id: 'screentime', label: 'Screen Time 📱' }
  ]

  return (
    <div className="app-container page-enter" style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      
      {/* HEADER */}
      {activeSubTab !== 'diary' && (
        <div style={{ padding: '32px 20px 0' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Daily Log</h1>
          <p style={{ fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 20 }}>Reflections, focus sessions, and time audits</p>
        </div>
      )}

      {/* CONDITIONAL HEADER FOR DIARY (to keep it full screen and locked feel) */}
      {activeSubTab === 'diary' && (
        <div style={{ padding: '32px 20px 0' }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: -0.5, marginBottom: 4 }}>Omniverse Journal</h1>
          <p style={{ fontSize: 11, color: '#444', fontWeight: 600, marginBottom: 20 }}>Personal thoughts and private archives</p>
        </div>
      )}

      {/* SUB-TABS */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', gap: '8px', paddingBottom: 16 }}>
          {tabs.map(t => {
            const isActive = activeSubTab === t.id
            return (
              <button key={t.id} onClick={() => setActiveSubTab(t.id)}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
                  border: isActive ? '1px solid #FFF' : '1px solid #1A1A24',
                  background: isActive ? '#FFF' : '#0A0A12',
                  color: isActive ? '#000' : '#444',
                  fontWeight: 900, fontSize: 10, transition: 'all 0.2s', whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENTS */}
      <div>
        {user && activeSubTab === 'diary' && (
          <JournalTabDiary user={user} navigate={navigate} />
        )}

        {user && activeSubTab === 'study' && (
          <JournalTabStudy user={user} />
        )}

        {activeSubTab === 'screentime' && (
          <div className="page-content" style={{ paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* LOG SCREEN TIME */}
            <form onSubmit={handleSaveScreenTime} style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 900, color: '#FFF', marginBottom: 16 }}>Audit Screen Time</h3>
              
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: '#444', display: 'block', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Hours on Screen</label>
                  <input type="number" step="0.1" min="0" max="24" required className="input" placeholder="e.g. 4.5" value={screenInput} onChange={e => setScreenInput(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: '100%', background: '#00BCD4', color: '#000', fontSize: 13 }}>
                Log Screen Time +5 ⚡
              </button>
            </form>

            {/* SCREEN VS STUDY MIRROR BAR */}
            <div style={{ background: '#0D0D18', border: '1px solid #1E1E28', borderRadius: 24, padding: 20 }}>
              <h3 style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>Mirror Bar</h3>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: isDecaying ? '#EF4444' : '#4CAF50' }}>
                  {screenHours}h <span style={{ fontSize: 12, color: '#666', fontWeight: 700 }}>screen</span> vs {studyHours}h <span style={{ fontSize: 12, color: '#666', fontWeight: 700 }}>study</span>
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: isDecaying ? '#EF4444' : '#4CAF50' }}>
                  {isDecaying ? '⚠️ Decaying' : '✅ Focused'}
                </span>
              </div>

              <div style={{ height: 8, background: '#111', borderRadius: 100, display: 'flex', overflow: 'hidden' }}>
                <div style={{ width: `${(screenMinutes / (screenMinutes + studyMinutes || 1)) * 100}%`, background: '#EF4444' }} />
                <div style={{ width: `${(studyMinutes / (screenMinutes + studyMinutes || 1)) * 100}%`, background: '#4CAF50' }} />
              </div>

              <p style={{ fontSize: 11, color: '#444', lineHeight: 1.5, marginTop: 12 }}>
                Keep your study/coding hours higher than screen entertainment hours to maintain stable cognitive orbit.
              </p>
            </div>
          </div>
        )}
      </div>

      <BottomNav activeTab="log" onTabChange={(t) => navigate(`/${t}`)} />
    </div>
  )
}
