import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { earnZyrons } from '../lib/zyrons'
import { showToast } from './Toast'

const getLocalYMD = (dateObj = new Date()) => {
  const d = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
  return d.toISOString().split('T')[0]
}

const parseWeekString = (dt = new Date()) => {
  const day = dt.getDay() || 7
  dt.setHours(-24 * (day - 1))
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export default function JournalTabMove({ user }) {
  const todayDate = getLocalYMD()
  const [logs, setLogs] = useState([])
  const [streaks, setStreaks] = useState({ current_streak: 0, longest_streak: 0, total_km: 0 })
  const [showLogModal, setShowLogModal] = useState(false)
  const [logForm, setLogForm] = useState({ type: 'run', distance: '', notes: '', date: todayDate, file: null, preview: null })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [{ data: lDocs }, { data: sDocs }] = await Promise.all([
      supabase.from('move_logs').select('*').eq('user_id', user.id).order('log_date', { ascending: false }),
      supabase.from('move_streaks').select('*').eq('user_id', user.id).single()
    ])
    if (lDocs) {
      setLogs(lDocs)
      // Auto-calculate streak manually if move_streaks gets out of sync
      let strk = 0
      const dates = [...new Set(lDocs.map(d => d.log_date))].sort().reverse()
      let curr = todayDate
      for (const d of dates) {
        if (d === curr) { strk++; curr = new Date(new Date(curr).getTime()-86400000).toISOString().split('T')[0] }
        else if (new Date(curr).getTime() - new Date(d).getTime() <= 86400000 && strk === 0) {
          strk++; curr = new Date(new Date(d).getTime()-86400000).toISOString().split('T')[0]
        } else break
      }
      
      const tkm = lDocs.reduce((a, b) => a + Number(b.distance_km), 0)
      setStreaks(prev => ({ ...prev, current_streak: strk, total_km: tkm, longest_streak: Math.max(strk, prev?.longest_streak || sDocs?.longest_streak || 0) }))
      
      if (!sDocs) {
         await supabase.from('move_streaks').insert({ user_id: user.id, current_streak: strk, total_km: tkm })
      } else {
         await supabase.from('move_streaks').update({ current_streak: strk, total_km: tkm, longest_streak: Math.max(strk, sDocs.longest_streak) }).eq('user_id', user.id)
      }
    }
  }

  const handleFileChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) return alert("Screenshot max 5MB")
    setLogForm({ ...logForm, file: f, preview: URL.createObjectURL(f) })
  }

  const saveLog = async () => {
    const km = parseFloat(logForm.distance)
    if (!km || km <= 0 || km > 100) return alert("Invalid distance (1-100km)")
    if (logs.some(l => l.log_date === logForm.date)) return alert("Already logged a move session for this date!")

    setUploading(true)
    let url = null
    
    try {
      if (logForm.file) {
        const ext = logForm.file.name.split('.').pop()
        const path = `${user.id}/${Date.now()}.${ext}`
        const { data, error } = await supabase.storage.from('move-screenshots').upload(path, logForm.file)
        if (error) throw error
        const { data: urlData } = await supabase.storage.from('move-screenshots').createSignedUrl(data.path, 3600*24*30)
        url = urlData.signedUrl
      }

      const baseZy = Math.min(Math.round(km * 10), 100)
      let streakBonus = 0
      const newStreak = streaks.current_streak + 1
      if (newStreak === 3) streakBonus = 15
      else if (newStreak === 7) streakBonus = 50
      else if (newStreak === 14) streakBonus = 100
      else if (newStreak === 30) streakBonus = 300

      const totalZy = baseZy + streakBonus

      await supabase.from('move_logs').insert({
        user_id: user.id,
        log_date: logForm.date,
        activity_type: logForm.type,
        distance_km: km,
        notes: logForm.notes,
        screenshot_url: url,
        zyrons_earned: totalZy,
        streak_bonus: streakBonus
      })

      await earnZyrons(user.id, totalZy, 'Move to Earn')

      showToast(`🏃 +${totalZy} ⚡ Keep moving!`, 'success')
      setLogForm({ type: 'run', distance: '', notes: '', date: todayDate, file: null, preview: null })
      setShowLogModal(false)
      loadData()
    } catch (err) {
      alert(err.message)
    } finally {
      setUploading(false)
    }
  }

  const actIcons = { walk: '🚶', run: '🏃', cycle: '🚴', swim: '🏊', yoga: '🧘', gym: '💪' }
  const hasLoggedToday = logs.some(l => l.log_date === todayDate)
  const todayLog = logs.find(l => l.log_date === todayDate)

  const weekStart = parseWeekString()
  const weekKm = logs.filter(l => new Date(l.log_date) >= weekStart).reduce((a, b) => a + Number(b.distance_km), 0)

  // Calc heatmap array (last 21 days)
  const heatmap = Array.from({length: 21}).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (20 - i))
    return getLocalYMD(d)
  })

  return (
    <div style={{ padding: '0 16px', paddingBottom: 80, marginTop: 16 }}>
      {/* HEADER CARD */}
      <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 20, display: 'flex', gap: 14, marginBottom: 20, justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 36 }}>🏃</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#FFF', marginBottom: 2 }}>Move to Earn</div>
            <div style={{ fontSize: 11, color: '#444', fontWeight: 700 }}>Every km = 10 Zyrons</div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#4CAF50', lineHeight: 1 }}>{weekKm.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: '#444', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4 }}>km this week</div>
          {streaks.current_streak > 0 && <div style={{ fontSize: 11, color: '#FF9800', fontWeight: 900 }}>🔥 {streaks.current_streak} day streak</div>}
        </div>
      </div>

      {/* TODAY STATUS */}
      {hasLoggedToday ? (
        <div style={{ background: 'color-mix(in srgb, #4CAF50 15%, transparent)', border: '1px solid #4CAF5040', borderRadius: 16, padding: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#4CAF50', marginBottom: 2 }}>✅ Logged today</div>
            <div style={{ fontSize: 12, color: '#888' }}>{todayLog.distance_km} km · +{todayLog.zyrons_earned} ⚡</div>
          </div>
          <button style={{ background: '#1A3A1A', border: 'none', color: '#4CAF50', padding: '6px 12px', borderRadius: 100, fontSize: 11, fontWeight: 800 }}>View</button>
        </div>
      ) : (
        <div style={{ background: '#0A0A12', border: '1px solid #4CAF5050', borderRadius: 16, padding: 16, marginBottom: 24, textAlign: 'center', cursor: 'pointer', boxShadow: '0 0 12px #4CAF5020' }} onClick={() => setShowLogModal(true)}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0', marginBottom: 2 }}>Log today's activity →</div>
          <div style={{ fontSize: 11, color: '#555566' }}>Don't lose your streak!</div>
        </div>
      )}

      {/* QUICK LOG BUTTON */}
      {!hasLoggedToday && (
        <button onClick={() => setShowLogModal(true)} style={{ width: '100%', padding: 16, background: '#4CAF50', color: '#000', borderRadius: 14, fontSize: 15, fontWeight: 900, border: 'none', cursor: 'pointer', marginBottom: 24 }}>
          🏃 Log Today's Activity
        </button>
      )}

      {/* STREAK CARD */}
      <div style={{ background: '#0A1A0A', border: '1px solid #4CAF5025', borderRadius: 18, padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
           <div><span style={{ fontSize: 32, fontWeight: 900, color: '#FF9800' }}>{streaks.current_streak}</span> <span style={{fontSize: 12, color: '#888', fontWeight: 700}}>day streak</span></div>
           <div style={{ fontSize: 10, color: '#4CAF50', background: '#4CAF5015', padding: '4px 8px', borderRadius: 8, fontWeight: 800 }}>
             {streaks.current_streak < 3 ? `${3 - streaks.current_streak} more days → +15 ⚡` : 
              streaks.current_streak < 7 ? `${7 - streaks.current_streak} more days → +50 ⚡` : 
              streaks.current_streak < 14 ? `${14 - streaks.current_streak} more days → +100 ⚡` : 
              `${30 - Math.min(30, streaks.current_streak)} more days → +300 ⚡`}
           </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 12 }}>
           {heatmap.map(d => {
             const logged = logs.some(l => l.log_date === d)
             return <div key={d} style={{ aspectRatio: '1', borderRadius: 3, background: logged ? '#4CAF50' : '#141420' }} />
           })}
        </div>
        <div style={{ fontSize: 10, color: '#555566', fontWeight: 700, textAlign: 'right' }}>Longest: {streaks.longest_streak} days</div>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
         <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 14, padding: 12, textAlign: 'center' }}>
           <div style={{ fontSize: 20, fontWeight: 900, color: '#E8E8F0', marginBottom: 2 }}>{streaks.total_km.toFixed(1)}</div>
           <div style={{ fontSize: 9, color: '#555566', textTransform: 'uppercase', fontWeight: 800 }}>Total km</div>
         </div>
         <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 14, padding: 12, textAlign: 'center' }}>
           <div style={{ fontSize: 20, fontWeight: 900, color: '#00FFFF', marginBottom: 2 }}>{logs.reduce((a,b)=>a+(b.zyrons_earned||0), 0)}</div>
           <div style={{ fontSize: 9, color: '#555566', textTransform: 'uppercase', fontWeight: 800 }}>Zyrons Earned</div>
         </div>
      </div>

      {/* RECENT ACTIVITY */}
      <div style={{ fontSize: 9, color: '#333', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, marginBottom: 12 }}>RECENT ACTIVITY</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {logs.slice(0, 7).map(l => (
           <div key={l.id} style={{ background: '#0A0A12', borderLeft: '3px solid #4CAF50', border: '1px solid #1A1A24', borderRadius: '0 14px 14px 0', padding: '11px 13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: 24, background: '#1A1A24', width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{actIcons[l.activity_type] || '🏃'}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#E8E8F0', marginBottom: 2 }}>{l.distance_km} km {l.activity_type}</div>
                  <div style={{ fontSize: 11, color: '#555566', fontWeight: 700 }}>{new Date(l.log_date).toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})}</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                 <div style={{ fontSize: 14, fontWeight: 900, color: '#4CAF50' }}>+{l.zyrons_earned} ⚡</div>
                 {l.screenshot_url && <div style={{ fontSize: 10, color: '#00FFFF', cursor: 'pointer', marginTop: 4, fontWeight: 800 }} onClick={() => window.open(l.screenshot_url, '_blank')}>📸 Image</div>}
              </div>
           </div>
        ))}
        {logs.length === 0 && <div style={{ textAlign: 'center', color: '#555566', fontSize: 12 }}>No movement logged yet.</div>}
      </div>

      {/* LOG MODAL */}
      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: '#000000E0', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
           <div style={{ background: '#111118', width: '100%', borderRadius: '24px 24px 0 0', padding: 24, paddingBottom: 40, maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#E8E8F0', marginBottom: 20 }}>Log Activity</div>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 20, paddingBottom: 4 }}>
                 {Object.entries(actIcons).map(([k,v]) => (
                   <button key={k} onClick={() => setLogForm({...logForm, type: k})} style={{ flex: '1 1 calc(33% - 8px)', padding: '8px 16px', borderRadius: 100, background: logForm.type === k ? '#4CAF50' : '#1A1A24', border: 'none', color: logForm.type === k ? '#000' : '#888', fontWeight: 800, textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer' }}>
                     {v} {k}
                   </button>
                 ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
                 <button onClick={() => setLogForm({...logForm, distance: Math.max(0, (parseFloat(logForm.distance||0)-0.5)).toFixed(1)})} style={{ width: 44, height: 44, borderRadius: '50%', background: '#1A1A24', border: 'none', color: '#E8E8F0', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>-</button>
                 <input type="number" step="0.1" value={logForm.distance} onChange={e => setLogForm({...logForm, distance: e.target.value})} placeholder="0.0" style={{ width: 120, fontSize: 40, fontWeight: 900, textAlign: 'center', background: 'transparent', border: 'none', borderBottom: '2px solid #4CAF50', color: '#E8E8F0', outline: 'none' }} />
                 <button onClick={() => setLogForm({...logForm, distance: (parseFloat(logForm.distance||0)+0.5).toFixed(1)})} style={{ width: 44, height: 44, borderRadius: '50%', background: '#1A1A24', border: 'none', color: '#E8E8F0', fontSize: 24, fontWeight: 800, cursor: 'pointer' }}>+</button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: '#00FFFF', marginBottom: 24 }}>
                = {Math.min(Math.round((parseFloat(logForm.distance||0)) * 10), 100)} Zyrons ⚡
              </div>

              <input type="date" value={logForm.date} onChange={e => setLogForm({...logForm, date: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: 'none', color: '#fff', padding: 16, borderRadius: 14, marginBottom: 16, fontSize: 16 }} />
              <input type="text" placeholder="Notes (e.g. Morning jog)" value={logForm.notes} onChange={e => setLogForm({...logForm, notes: e.target.value})} style={{ width: '100%', background: '#1A1A24', border: 'none', color: '#fff', padding: 16, borderRadius: 14, marginBottom: 16, fontSize: 16 }} />

              <div style={{ border: '1px dashed #4CAF5050', borderRadius: 14, padding: 16, textAlign: 'center', marginBottom: 24, position: 'relative' }}>
                <input type="file" accept="image/*" onChange={handleFileChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                {logForm.preview ? (
                   <img src={logForm.preview} alt="Preview" style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8 }} />
                ) : (
                   <div style={{ fontSize: 13, color: '#4CAF5080', fontWeight: 700 }}>📸 Add screenshot proof (optional)</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setShowLogModal(false)} style={{ flex: 1, padding: 16, background: 'transparent', border: 'none', color: '#888', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveLog} disabled={uploading} style={{ flex: 2, padding: 16, background: '#4CAF50', border: 'none', borderRadius: 14, color: '#000', fontWeight: 900, cursor: 'pointer', opacity: uploading ? 0.5 : 1 }}>
                  {uploading ? 'Saving...' : 'Save & Earn'}
                </button>
              </div>
           </div>
        </div>
      )}

    </div>
  )
}
