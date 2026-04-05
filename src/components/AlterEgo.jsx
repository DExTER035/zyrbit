import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'

export default function AlterEgo({ user, gravityScore }) {
  const [egoName, setEgoName] = useState('')
  const [egoDescription, setEgoDescription] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadEgo()
  }, [user])

  const loadEgo = async () => {
    // We'll store it in profiles table or a dedicated alter_ego table.
    // For simplicity without schema changes, we can put it in user metadata
    // or just local storage. Actually, we have a profiles table. Let's try profiles.
    const { data } = await supabase.from('profiles').select('alter_ego_name, alter_ego_desc').eq('id', user.id).single()
    if (data) {
      setEgoName(data.alter_ego_name || '')
      setEgoDescription(data.alter_ego_desc || '')
    }
    // Alternatively if those columns don't exist, we fallback to localStorage for stability in this sprint
    if (data === null || data.alter_ego_name === undefined) {
      const savedName = localStorage.getItem(`zyrbit_ego_name_${user.id}`)
      const savedDesc = localStorage.getItem(`zyrbit_ego_desc_${user.id}`)
      if (savedName) setEgoName(savedName)
      if (savedDesc) setEgoDescription(savedDesc)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    setIsEditing(false)
    localStorage.setItem(`zyrbit_ego_name_${user.id}`, egoName)
    localStorage.setItem(`zyrbit_ego_desc_${user.id}`, egoDescription)
    
    // Attempt to save to profiles if columns exist
    try {
      await supabase.from('profiles').update({
        alter_ego_name: egoName,
        alter_ego_desc: egoDescription
      }).eq('id', user.id)
    } catch (_) {
      // Ignore if columns don't exist yet
    }
    showToast('🎭 Alter ego synchronized.', 'success')
  }

  if (loading) return null

  // Gravity score functions as "Sync Level"
  const syncLevel = Math.min(100, Math.max(0, gravityScore || 0))
  let syncColor = '#EF4444'
  if (syncLevel > 50) syncColor = '#F59E0B'
  if (syncLevel > 80) syncColor = '#7F77DD'

  return (
    <div className="card-elite animate-eliteGlow" style={{ padding: 20, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
       {/* Background effect */}
       <div style={{ position: 'absolute', top: -50, right: -20, fontSize: 100, opacity: 0.03, pointerEvents: 'none' }}>🎭</div>

       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
         <div style={{ fontSize: 11, fontWeight: 900, color: '#7F77DD', letterSpacing: 2, textTransform: 'uppercase' }}>
            ALTER EGO <span style={{ background: '#7F77DD20', border: '1px solid #7F77DD40', color: '#7F77DD', fontSize: 8, padding: '2px 7px', borderRadius: 6, marginLeft: 6 }}>ELITE</span>
         </div>
         {!isEditing && (
           <button onClick={() => setIsEditing(true)} style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
             EDIT
           </button>
         )}
       </div>

       {isEditing ? (
         <div className="animate-fadeSlideUp">
           <input 
             type="text" 
             value={egoName} 
             onChange={e => setEgoName(e.target.value)} 
             placeholder="Name your highest self (e.g. Architect, The Machine)"
             style={{ width: '100%', background: '#0a0a0a', border: '1px solid #7F77DD40', color: '#FFF', padding: 12, borderRadius: 12, fontSize: 14, fontWeight: 800, marginBottom: 10, outline: 'none' }}
           />
           <textarea 
             value={egoDescription} 
             onChange={e => setEgoDescription(e.target.value)} 
             placeholder="Describe them. How do they act? What are their standards?"
             style={{ width: '100%', background: '#0a0a0a', border: '1px solid #7F77DD40', color: '#CCC', padding: 12, borderRadius: 12, fontSize: 13, height: 80, resize: 'none', marginBottom: 16, outline: 'none', fontFamily: '"Inter", sans-serif' }}
           />
           <button onClick={handleSave} style={{ width: '100%', background: 'linear-gradient(135deg, #7F77DD, #9FA0FF)', color: '#000', border: 'none', borderRadius: 12, padding: 12, fontWeight: 900, cursor: 'pointer' }}>
             LOCK IN
           </button>
         </div>
       ) : (
         <div>
           {egoName ? (
             <div style={{ marginBottom: 16 }}>
               <div style={{ fontSize: 20, fontWeight: 900, color: '#FFF', letterSpacing: -0.5, marginBottom: 4 }}>{egoName}</div>
               {egoDescription && <div style={{ fontSize: 12, color: '#888', fontStyle: 'italic', lineHeight: 1.5 }}>"{egoDescription}"</div>}
             </div>
           ) : (
             <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
               You haven't defined your Alter Ego yet. Who are you building yourself to be?
             </div>
           )}

           <div style={{ background: '#0a0a0a', borderRadius: 12, padding: 12, border: '1px solid #1a1a24' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
               <div style={{ fontSize: 10, color: '#666', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>Sync Level</div>
               <div style={{ fontSize: 14, color: syncColor, fontWeight: 900 }}>{syncLevel}%</div>
             </div>
             <div style={{ height: 6, background: '#1a1a24', borderRadius: 100, overflow: 'hidden' }}>
               <div style={{ height: '100%', width: `${syncLevel}%`, background: syncColor, borderRadius: 100, transition: 'width 1s ease-out, background 1s ease' }} />
             </div>
             <div style={{ fontSize: 10, color: '#555566', marginTop: 8, fontWeight: 700 }}>
               {syncLevel < 50 ? "Your actions don't match your identity." : syncLevel < 80 ? "Starting to align. Push harder." : "Complete synchronization."}
             </div>
           </div>
         </div>
       )}
    </div>
  )
}
