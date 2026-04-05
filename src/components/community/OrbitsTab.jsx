import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { showToast } from '../Toast.jsx'
import { earnZyrons } from '../../lib/zyrons.js'

const ORBIT_ICONS = ['🌌','🔥','🌿','⚡','🌊','🏔️','🌙','🦋','🪐','💫','🌈','🎯']
const ORBIT_COLORS = ['#00FFFF','#4CAF50','#FF9800','#9C27B0','#E91E63','#FDE047']

export default function OrbitsTab({ user, profile }) {
  const [orbits, setOrbits] = useState([])
  const [myOrbits, setMyOrbits] = useState([])
  const [requests, setRequests] = useState([]) // My pending requests
  const [filter, setFilter] = useState('all') // '#Fitness', '#Coding', etc.
  const [view, setView] = useState('discover') // 'discover', 'mine', 'create'
  const [search, setSearch] = useState('')
  
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedOrbit, setSelectedOrbit] = useState(null)
  const [newOrbit, setNewOrbit] = useState({ name: '', description: '', icon: '🌌', color: '#00BCD4', member_limit: 20, tags: [] })

  useEffect(() => {
    loadOrbits()
    if (user) {
      loadMyMembership()
      loadMyRequests()
    }
  }, [user])

  const loadOrbits = async () => {
    const { data } = await supabase.from('global_orbits').select('*').order('created_at', { ascending: false })
    setOrbits(data || [])
  }

  const loadMyMembership = async () => {
    const { data } = await supabase.from('orbit_members').select('orbit_id').eq('user_id', user.id)
    setMyOrbits(data?.map(m => m.orbit_id) || [])
  }

  const loadMyRequests = async () => {
    const { data } = await supabase.from('orbit_requests').select('orbit_id, status').eq('user_id', user.id)
    setRequests(data || [])
  }

  const handleRequestJoin = async (orbitId) => {
    const { error } = await supabase.from('orbit_requests').insert({ orbit_id: orbitId, user_id: user.id, status: 'pending' })
    if (!error) {
      showToast('🚀 Request sent!', 'success')
      loadMyRequests()
    }
  }

  const createOrbit = async () => {
    if (!newOrbit.name.trim()) return
    setCreating(true)
    const { data, error } = await supabase.from('global_orbits').insert({ ...newOrbit, creator_id: user.id }).select().single()
    if (!error && data) {
      await supabase.from('orbit_members').insert({ orbit_id: data.id, user_id: user.id, role: 'creator' })
      showToast('🌌 Orbit launched!', 'success')
      setView('discover')
      setNewOrbit({ name: '', description: '', icon: '🌌', color: '#00BCD4', member_limit: 20, tags: [] })
      loadOrbits(); loadMyMembership()
    }
    setCreating(false)
  }

  const isJoined = (id) => myOrbits.includes(id)
  const getRequestStatus = (id) => requests.find(r => r.orbit_id === id)?.status

  const filteredOrbits = orbits.filter(o => {
    const matchesSearch = o.name.toLowerCase().includes(search.toLowerCase()) || (o.tags && o.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
    if (!matchesSearch) return false
    
    if (view === 'mine') return isJoined(o.id)
    if (filter === 'all') return true
    return o.tags && o.tags.includes(filter)
  })

  return (
    <div style={{ padding: '0 20px 100px', background: '#000' }}>
      
      {/* HEADER & SEARCH */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FFF', marginBottom: 4 }}>Orbits</h1>
          <p style={{ fontSize: 13, color: '#444', fontWeight: 500 }}>Find your people. Rise together.</p>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 20 }}>🔔</span>
          </div>
          <div style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, borderRadius: '50%', background: '#EF4444', border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#FFF' }}>3</div>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: 24 }}>
        <input 
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search orbits or tags..."
          style={{ width: '100%', padding: '14px 20px', background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, color: '#FFF', fontSize: 14, outline: 'none' }}
        />
      </div>

      {/* TAG FILTERS */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 24 }}>
        {['all', 'Fitness', 'Coding', 'Mindfulness', 'Study'].map(t => (
          <button 
            key={t} onClick={() => setFilter(t)}
            style={{ flex: '1 1 auto', padding: '8px 16px', borderRadius: 100, border: '1px solid #1A1A24', background: filter === t ? '#001A1A' : '#000', color: filter === t ? '#00BCD4' : '#444', fontSize: 13, fontWeight: 800, cursor: 'pointer', textAlign: 'center' }}
          >
            #{t}
          </button>
        ))}
      </div>

      {/* TAB SUB-BAR */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: 32 }}>
        {[['discover', 'Discover'], ['mine', 'My Orbits'], ['create', '+ Create']].map(([k, l]) => (
          <button 
            key={k} onClick={() => k === 'create' ? setView('create') : setView(k)}
            style={{ flex: '1 1 calc(33% - 8px)', padding: '8px 12px', borderRadius: 100, border: view === k ? 'none' : '1px solid #1A1A24', background: view === k ? '#FFF' : '#000', color: view === k ? '#000' : '#444', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}
          >
            {l}
          </button>
        ))}
      </div>

      <h3 style={{ fontSize: 11, color: '#222', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 20 }}>POPULAR ORBITS</h3>

      {/* ORBIT CARDS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filteredOrbits.map(orbit => {
          const joined = isJoined(orbit.id)
          const status = getRequestStatus(orbit.id)
          const memberCount = 14 // Mock for now, would be a real query
          const limit = orbit.member_limit || 20
          
          return (
            <div key={orbit.id} style={{ background: `color-mix(in srgb, ${orbit.color} 5%, #0A0A12)`, border: '1px solid #1A1A24', borderRadius: 28, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 32 }}>{orbit.icon}</span>
                <h4 style={{ fontSize: 20, fontWeight: 900, color: '#FFF' }}>{orbit.name}</h4>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {(orbit.tags || []).map(tag => (
                   <span key={tag} style={{ padding: '4px 10px', background: `${orbit.color}15`, borderRadius: 100, color: orbit.color, fontSize: 10, fontWeight: 800 }}>#{tag}</span>
                ))}
              </div>

              <p style={{ fontSize: 13, color: '#444', lineHeight: 1.5, marginBottom: 20 }}>{orbit.description}</p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#1A1A24', marginBottom: 8 }}>{memberCount} / {limit} members</div>
                  <div style={{ width: 100, height: 4, background: '#111', borderRadius: 100 }}>
                    <div style={{ width: `${(memberCount/limit)*100}%`, height: '100%', background: orbit.color, borderRadius: 100 }} />
                  </div>
                </div>

                {joined ? (
                  <button onClick={() => setSelectedOrbit(orbit)} style={{ padding: '12px 24px', background: 'transparent', border: `1px solid ${orbit.color}40`, color: orbit.color, borderRadius: 16, fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>Open Chat</button>
                ) : status === 'pending' ? (
                  <button disabled style={{ padding: '12px 24px', background: '#111', color: '#444', borderRadius: 16, fontWeight: 800, fontSize: 13 }}>Requested</button>
                ) : (
                  <button onClick={() => handleRequestJoin(orbit.id)} style={{ padding: '12px 24px', background: orbit.color, color: '#000', borderRadius: 16, fontWeight: 900, fontSize: 13, cursor: 'pointer', boxShadow: `0 4px 20px ${orbit.color}40` }}>Request to Join</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* CREATE MODAL */}
      {view === 'create' && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setView('discover') }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0A0A12', borderTop: '1px solid #222', borderRadius: '32px 32px 0 0', padding: 28, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22, fontWeight: 900, color: '#FFF', margin: 0 }}>🌌 New Orbit</h2>
              <button onClick={() => setView('discover')} style={{ background: 'none', border: '1px solid #222', color: '#666', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>

            <label style={{ fontSize: 10, fontWeight: 800, color: '#444', letterSpacing: 1.5, marginBottom: 8, display: 'block' }}>ORBIT NAME *</label>
            <input
              value={newOrbit.name}
              onChange={e => setNewOrbit({...newOrbit, name: e.target.value})}
              placeholder="e.g. 5AM Club"
              style={{ width: '100%', padding: '14px 16px', background: '#111', border: '1px solid #222', borderRadius: 14, color: '#FFF', marginBottom: 20, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
            />

            <label style={{ fontSize: 10, fontWeight: 800, color: '#444', letterSpacing: 1.5, marginBottom: 8, display: 'block' }}>DESCRIPTION</label>
            <textarea
              value={newOrbit.description}
              onChange={e => setNewOrbit({...newOrbit, description: e.target.value})}
              placeholder="What's the goal of this orbit?"
              style={{ width: '100%', padding: '14px 16px', background: '#111', border: '1px solid #222', borderRadius: 14, color: '#FFF', marginBottom: 20, height: 90, resize: 'none', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />

            <label style={{ fontSize: 10, fontWeight: 800, color: '#444', letterSpacing: 1.5, marginBottom: 10, display: 'block' }}>PICK AN ICON</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {ORBIT_ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => setNewOrbit({...newOrbit, icon})}
                  style={{ width: 40, height: 40, borderRadius: 10, fontSize: 18, border: newOrbit.icon === icon ? '2px solid #00BCD4' : '1px solid #222', background: newOrbit.icon === icon ? '#00BCD420' : '#111', cursor: 'pointer' }}
                >{icon}</button>
              ))}
            </div>

            <label style={{ fontSize: 10, fontWeight: 800, color: '#444', letterSpacing: 1.5, marginBottom: 10, display: 'block' }}>ORBIT COLOR</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              {ORBIT_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setNewOrbit({...newOrbit, color})}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: color, border: newOrbit.color === color ? `3px solid #fff` : '3px solid transparent', cursor: 'pointer' }}
                />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setView('discover')}
                style={{ flex: 1, padding: '14px', background: 'transparent', border: '1px solid #222', color: '#888', borderRadius: 14, fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
              >Cancel</button>
              <button
                onClick={createOrbit}
                disabled={!newOrbit.name.trim() || creating}
                style={{ flex: 2, padding: '14px', background: newOrbit.name.trim() ? newOrbit.color : '#111', color: newOrbit.name.trim() ? '#000' : '#444', borderRadius: 14, fontWeight: 900, fontSize: 14, border: 'none', cursor: newOrbit.name.trim() ? 'pointer' : 'not-allowed', boxShadow: newOrbit.name.trim() ? `0 4px 20px ${newOrbit.color}50` : 'none', transition: 'all 0.2s' }}
              >{creating ? '🚀 Launching...' : '🌌 Launch Orbit'}</button>
            </div>
          </div>
        </div>
      )}

      {selectedOrbit && (
        <OrbitDetail orbit={selectedOrbit} user={user} profile={profile} onClose={() => setSelectedOrbit(null)} />
      )}
    </div>
  )
}

// ── Orbit Detail Overlay ─────────────────────────────
function OrbitDetail({ orbit, user, profile, onClose }) {
  const [subTab, setSubTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [members, setMembers] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    loadMembers()
    const channel = supabase
      .channel(`orbit-${orbit.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orbit_messages', filter: `orbit_id=eq.${orbit.id}` }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [orbit])

  const loadMessages = async () => {
    const { data } = await supabase.from('orbit_messages').select('*').eq('orbit_id', orbit.id).order('created_at', { ascending: true }).limit(80)
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView(), 100)
  }

  const loadMembers = async () => {
    const { data } = await supabase.from('orbit_members').select('*, user:profiles(username, friend_tag, rank_id, zyrons)').eq('orbit_id', orbit.id)
    setMembers(data || [])
  }

  const sendMsg = async () => {
    if (!text.trim()) return
    const msg = { orbit_id: orbit.id, user_id: user.id, username: profile?.username || 'Orbiter', friend_tag: profile?.friend_tag || '—', rank_id: profile?.rank_id || 0, rank_icon: '🪐', element_color: profile?.element_color || '#00FFFF', content: text.trim() }
    setText('')
    await supabase.from('orbit_messages').insert(msg)
  }

  const RANK_EMOJIS = ['🌫️','⚙️','🪙','🥉','🥈','🥇','💎','🟢','♦️','💠','🪐']

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 300, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${orbit.banner_color || '#001A1A'}, #080812)`, borderBottom: '1px solid #1A1A24', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: orbit.color, fontSize: 20, cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: 24 }}>{orbit.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#E8E8F0' }}>{orbit.name}</div>
          <div style={{ fontSize: 10, color: '#666' }}>{members.length} members</div>
        </div>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50' }} />
          <span style={{ fontSize: 10, color: '#4CAF50', fontWeight: 700 }}>Live</span>
        </div>
      </div>

      {/* Sub tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #1A1A24', background: '#0A0A12' }}>
        {[['chat','💬 Chat'],['members','👥 Members']].map(([k,l]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{ flex: 1, padding: '12px', border: 'none', background: subTab === k ? `${orbit.color}15` : 'transparent', color: subTab === k ? orbit.color : '#555', fontWeight: 800, fontSize: 12, cursor: 'pointer', borderBottom: subTab === k ? `2px solid ${orbit.color}` : '2px solid transparent' }}>
            {l}
          </button>
        ))}
      </div>

      {subTab === 'chat' && (
        <>
          <div style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#444' }}>
                <span style={{ background: `${orbit.color}20`, border: `1px solid ${orbit.color}30`, borderRadius: 100, padding: '6px 14px', fontSize: 11, color: orbit.color, fontWeight: 700 }}>Welcome to {orbit.name}!</span>
              </div>
            )}
            {messages.map((msg, i) => {
              const isAnnounce = msg.is_announcement
              if (isAnnounce) return (
                <div key={i} style={{ textAlign: 'center' }}>
                  <span style={{ background: '#FF980020', border: '1px solid #FF980040', borderRadius: 100, padding: '4px 12px', fontSize: 10, color: '#FF9800', fontWeight: 800 }}>{msg.content}</span>
                </div>
              )
              const isMe = msg.user_id === user.id
              return (
                <div key={i} style={{ display: 'flex', gap: 8, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.element_color || '#00FFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#000', flexShrink: 0 }}>
                      {(msg.username || '?').charAt(0)}
                    </div>
                  )}
                  <div style={{ maxWidth: '72%' }}>
                    {!isMe && <div style={{ fontSize: 9, color: '#555', marginBottom: 2, fontFamily: 'monospace' }}>{msg.friend_tag} {RANK_EMOJIS[Math.min(msg.rank_id || 0, 10)]}</div>}
                    <div style={{ background: isMe ? '#1A1A28' : '#0D0D18', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '8px 12px', borderLeft: isMe ? 'none' : `2px solid ${msg.element_color || orbit.color}` }}>
                      <div style={{ fontSize: 13, color: '#E8E8F0', lineHeight: 1.5 }}>{msg.content}</div>
                    </div>
                    <div style={{ fontSize: 8, color: '#333', marginTop: 3, textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
          <div style={{ background: '#0A0A12', borderTop: '1px solid #1A1A24', padding: '10px 12px', display: 'flex', gap: 8, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder={`Message ${orbit.name}…`} style={{ flex: 1, background: '#1A1A24', border: `1px solid ${orbit.color}30`, color: '#E8E8F0', padding: '11px 14px', borderRadius: 100, fontSize: 13, outline: 'none' }} />
            <button onClick={sendMsg} style={{ width: 42, height: 42, borderRadius: '50%', background: orbit.color, border: 'none', color: '#000', fontSize: 18, cursor: 'pointer', fontWeight: 900 }}>↑</button>
          </div>
        </>
      )}

      {subTab === 'members' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
          {members.map((m, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #0A0A12' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: orbit.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>
                {(m.user?.username || '?').charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{m.user?.username} {m.role === 'admin' && <span style={{ fontSize: 9, background: orbit.color + '30', color: orbit.color, padding: '1px 5px', borderRadius: 4 }}>Admin</span>}</div>
                <div style={{ fontSize: 10, color: '#555', fontFamily: 'monospace' }}>{m.user?.friend_tag}</div>
              </div>
              <div style={{ fontSize: 12, color: '#FDE047', fontWeight: 800 }}>{(m.user?.zyrons || 0).toLocaleString()} ⚡</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', background: '#0A0A12', border: '1px solid #1E1E2A', color: '#E8E8F0', padding: '12px 14px', borderRadius: 12, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
