import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'

const RANK_ROOMS = [
  { id: 0, name: 'Global Orbit', icon: '🌌', color: '#00FFFF', minRank: 0 },
  { id: 0, name: 'Stoneheart Circle', icon: '🪨', color: '#A1A1AA', minRank: 0 },
  { id: 1, name: 'Tidesoul Realm', icon: '💧', color: '#38BDF8', minRank: 1 },
  { id: 2, name: 'Verdant Grove', icon: '🌿', color: '#4ADE80', minRank: 2 },
  { id: 3, name: 'Galeborn Sky', icon: '🌬️', color: '#7DD3FC', minRank: 3 },
  { id: 4, name: 'Emberon Forge', icon: '🔥', color: '#FB923C', minRank: 4 },
  { id: 5, name: 'Stormcaller Peak', icon: '⚡', color: '#FDE047', minRank: 5 },
  { id: 6, name: 'Frostweave Haven', icon: '❄️', color: '#BAE6FD', minRank: 6 },
  { id: 7, name: 'Abyssal Deep', icon: '🌊', color: '#1D4ED8', minRank: 7 },
  { id: 8, name: 'Voidwalker Void', icon: '🌑', color: '#6B21A8', minRank: 8 },
  { id: 9, name: 'Zyronix Cosmos', icon: '✨', color: '#E879F9', minRank: 9 },
]

export default function ChatTab({ user, profile }) {
  const [currentRoom, setCurrentRoom] = useState(RANK_ROOMS[0])
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [online, setOnline] = useState(Math.floor(Math.random() * 40) + 8)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const userRank = profile?.rank_id || 0

  useEffect(() => {
    loadMessages(currentRoom)
    subscribeToRoom(currentRoom)
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [currentRoom])

  const loadMessages = async (room) => {
    const { data } = await supabase
      .from('rank_chat_messages')
      .select('*')
      .eq('room_rank_id', room.id)
      .order('created_at', { ascending: true })
      .limit(50)
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView(), 100)
  }

  const subscribeToRoom = (room) => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`rank-room-${room.id}-${room.name}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'rank_chat_messages',
        filter: `room_rank_id=eq.${room.id}`
      }, payload => {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      })
      .subscribe()
    channelRef.current = channel
  }

  const sendMsg = async () => {
    if (!text.trim()) return
    const msg = {
      user_id: user.id,
      username: profile?.username || 'Orbiter',
      friend_tag: profile?.friend_tag || '—',
      rank_id: userRank,
      rank_icon: '🪐',
      element_color: profile?.element_color || '#00FFFF',
      room_rank_id: currentRoom.id,
      content: text.trim(),
      is_announcement: false
    }
    setText('')
    await supabase.from('rank_chat_messages').insert(msg)
  }

  const accessibleRooms = RANK_ROOMS.filter(r => r.minRank <= userRank)
  const lockedRooms = RANK_ROOMS.filter(r => r.minRank > userRank)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 160px)' }}>
      {/* Room Selector */}
      <div style={{ padding: '0 16px 10px', overflowX: 'auto', display: 'flex', gap: 8, scrollbarWidth: 'none', flexShrink: 0 }}>
        {accessibleRooms.map((room, i) => {
          const active = currentRoom.name === room.name
          return (
            <button key={i} onClick={() => setCurrentRoom(room)} style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 100, border: active ? 'none' : `1px solid ${room.color}40`, background: active ? room.color : 'transparent', color: active ? '#000' : room.color, fontWeight: 800, fontSize: 12, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', gap: 5, alignItems: 'center' }}>
              <span>{room.icon}</span>
              <span>{room.name}</span>
            </button>
          )
        })}
        {lockedRooms.map((room, i) => (
          <button key={`locked-${i}`} disabled style={{ flexShrink: 0, padding: '7px 13px', borderRadius: 100, border: '1px solid #1A1A24', background: '#0A0A12', color: '#333', fontWeight: 700, fontSize: 12, cursor: 'not-allowed', display: 'flex', gap: 5, alignItems: 'center', opacity: 0.6 }}>
            <span>{room.icon}</span>
            <span>🔒</span>
          </button>
        ))}
      </div>

      {/* Current Room Card */}
      <div style={{ margin: '0 16px 12px', background: '#0A0818', border: '1px solid #2A1A3A', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <span style={{ fontSize: 22 }}>{currentRoom.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#E8E8F0' }}>{currentRoom.name}</div>
          <div style={{ fontSize: 10, color: '#555' }}>Rank {currentRoom.minRank}+ access</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4CAF50', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, color: '#4CAF50', fontWeight: 700 }}>{online} online</span>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ background: `${currentRoom.color}15`, border: `1px solid ${currentRoom.color}30`, borderRadius: 100, padding: '6px 16px', fontSize: 11, color: currentRoom.color, fontWeight: 700, display: 'inline-block' }}>
              Welcome to {currentRoom.name}! 🌌
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.is_announcement) return (
            <div key={i} style={{ textAlign: 'center' }}>
              <span style={{ background: '#FF980020', border: '1px solid #FF980040', borderRadius: 100, padding: '4px 12px', fontSize: 10, color: '#FF9800', fontWeight: 800 }}>{msg.content}</span>
            </div>
          )
          const isMe = msg.user_id === user.id
          return (
            <div key={i} style={{ display: 'flex', gap: 8, justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
              {!isMe && (
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: msg.element_color || '#00FFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: '#000', flexShrink: 0, marginTop: 14 }}>
                  {(msg.username || '?').charAt(0)}
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && (
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontSize: 9, color: msg.element_color || '#555', fontWeight: 800, fontFamily: 'monospace' }}>{msg.friend_tag}</span>
                    <span style={{ fontSize: 10 }}>{msg.rank_icon}</span>
                  </div>
                )}
                <div style={{ background: isMe ? '#1A1A28' : '#0D0D18', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px', padding: '8px 12px', borderLeft: isMe ? 'none' : `2px solid ${msg.element_color || currentRoom.color}` }}>
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

      {/* Input */}
      <div style={{ background: '#0A0A12', borderTop: '1px solid #1A1A24', padding: '10px 12px', display: 'flex', gap: 8, flexShrink: 0, paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
        <input
          value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
          placeholder={`Message ${currentRoom.name}…`}
          style={{ flex: 1, background: '#1A1A24', border: `1px solid ${currentRoom.color}25`, color: '#E8E8F0', padding: '11px 14px', borderRadius: 100, fontSize: 13, outline: 'none' }}
        />
        <button onClick={sendMsg} style={{ width: 42, height: 42, borderRadius: '50%', background: currentRoom.color, border: 'none', color: '#000', fontSize: 18, fontWeight: 900, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
      </div>
    </div>
  )
}
