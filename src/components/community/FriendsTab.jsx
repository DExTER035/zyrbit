import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase.js'
import { showToast } from '../Toast.jsx'
import { QRCodeSVG } from 'qrcode.react'

const RANKS = [
  { id: 0, name: 'Dust', emoji: '🌫️', color: '#888888' },
  { id: 1, name: 'Iron', emoji: '⚙️', color: '#A1A1AA' },
  { id: 2, name: 'Copper', emoji: '🪙', color: '#C87533' },
  { id: 3, name: 'Bronze', emoji: '🥉', color: '#CD7F32' },
  { id: 4, name: 'Silver', emoji: '🥈', color: '#C0C0C0' },
  { id: 5, name: 'Gold', emoji: '🥇', color: '#FFD700' },
  { id: 6, name: 'Sapphire', emoji: '💎', color: '#0F52BA' },
  { id: 7, name: 'Emerald', emoji: '🟢', color: '#50C878' },
  { id: 8, name: 'Ruby', emoji: '♦️', color: '#E0115F' },
  { id: 9, name: 'Diamond', emoji: '💠', color: '#B9F2FF' },
  { id: 10, name: 'Nebula', emoji: '🪐', color: '#9C27B0' },
]

const rankInfo = (id) => RANKS[Math.min(id || 0, RANKS.length - 1)]

export default function FriendsTab({ user, profile }) {
  const [friendTag, setFriendTag] = useState(profile?.friend_tag || '—')
  const [showQR, setShowQR] = useState(false)
  const [searchTag, setSearchTag] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [friends, setFriends] = useState([])
  const [requests, setRequests] = useState([])
  const [dmFriend, setDmFriend] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState({})
  const [activityFeed, setActivityFeed] = useState([])

  useEffect(() => {
    if (profile?.friend_tag) setFriendTag(profile.friend_tag)
    loadFriends()
    loadRequests()
  }, [profile])

  useEffect(() => {
    if (friends.length > 0) {
      loadUnreadCounts()
      loadActivityFeed()
    }
  }, [friends])

  const loadUnreadCounts = async () => {
    const { data } = await supabase.from('direct_messages').select('sender_id').eq('receiver_id', user.id).eq('read', false)
    if (!data) return
    const counts = {}
    data.forEach(msg => { counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1 })
    setUnreadCounts(counts)
  }

  const loadActivityFeed = async () => {
    const friendIds = friends.map(f => f.friend.id)
    if (friendIds.length === 0) return
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const { data: logs } = await supabase.from('habit_logs').select('user_id, completed_date, habit_id').in('user_id', friendIds).eq('status', 'completed').gte('completed_date', threeDaysAgo).order('completed_date', { ascending: false }).limit(30)
    if (!logs || logs.length === 0) return
    const habitIds = [...new Set(logs.map(l => l.habit_id))]
    const { data: habits } = await supabase.from('habits').select('id, name, icon').in('id', habitIds)
    const habitMap = Object.fromEntries((habits || []).map(h => [h.id, h]))
    const profileMap = Object.fromEntries(friends.map(f => [f.friend.id, f.friend]))
    const feed = logs.map(l => ({
      username: profileMap[l.user_id]?.username || 'Orbiter',
      habitName: habitMap[l.habit_id]?.name || 'a habit',
      habitIcon: habitMap[l.habit_id]?.icon || '✅',
      date: l.completed_date,
    }))
    setActivityFeed(feed)
  }

  const loadFriends = async () => {
    const [{ data: asReq }, { data: asAddr }] = await Promise.all([
      supabase.from('friendships').select('id, addressee_id').eq('requester_id', user.id).eq('status', 'accepted'),
      supabase.from('friendships').select('id, requester_id').eq('addressee_id', user.id).eq('status', 'accepted')
    ])
    const friendIds = [...(asReq || []).map(r => r.addressee_id), ...(asAddr || []).map(r => r.requester_id)]
    if (friendIds.length === 0) { setFriends([]); return }
    const { data: profiles } = await supabase.from('profiles').select('id, username, friend_tag, rank_id').in('id', friendIds)
    setFriends((profiles || []).map(p => ({ friend: p })))
  }

  const loadRequests = async () => {
    const { data: reqs } = await supabase.from('friendships').select('id, requester_id, created_at').eq('addressee_id', user.id).eq('status', 'pending')
    if (!reqs || reqs.length === 0) { setRequests([]); return }
    const { data: profiles } = await supabase.from('profiles').select('id, username, friend_tag, rank_id').in('id', reqs.map(r => r.requester_id))
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]))
    setRequests(reqs.map(r => ({ ...r, sender: profileMap[r.requester_id] || null })))
  }

  const searchFriend = async () => {
    if (!searchTag.trim()) return
    setSearching(true)
    const { data } = await supabase.from('profiles').select('id, username, friend_tag, rank_id').eq('friend_tag', searchTag.trim().toUpperCase()).single()
    setSearchResult(data || 'notfound')
    setSearching(false)
  }

  const sendRequest = async (friendId) => {
    const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: friendId, status: 'pending' })
    if (!error) {
      showToast('🤝 Request sent!', 'success')
      setSearchResult(r => ({ ...r, pending: true }))
    } else {
      showToast('Already friends or pending!', 'warning')
    }
  }

  const respondRequest = async (requestId, status) => {
    const { error } = await supabase.from('friendships').update({ status }).eq('id', requestId)
    if (!error) {
      showToast(status === 'accepted' ? '🤝 Accepted!' : 'Declined', 'info')
      loadRequests()
      if (status === 'accepted') loadFriends()
    }
  }

  const removeFriend = async (friendId, e) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to remove this friend?')) return
    const { error } = await supabase.from('friendships').delete().or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
    if (!error) {
       showToast('👋 Friend removed', 'info')
       loadFriends()
    } else {
       showToast('❌ Failed to remove friend', 'error')
    }
  }

  return (
    <div style={{ padding: '0 20px 100px', background: '#000' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#FFF', marginBottom: 4, letterSpacing: -1 }}>Friends</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#333', letterSpacing: 1 }}>YOUR TAG</span>
            <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--color-cyan)', fontFamily: 'monospace' }}>{friendTag}</span>
          </div>
        </div>
        <button onClick={() => setShowQR(true)} style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <span style={{ fontSize: 20 }}>📱</span>
        </button>
      </div>

      {/* SEARCH */}
      <div style={{ position: 'relative', marginBottom: 32 }}>
        <input 
          value={searchTag} onChange={e => setSearchTag(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && searchFriend()}
          placeholder="Enter friend tag (e.g. USER#1234)"
          style={{ width: '100%', padding: '16px 20px', background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 16, color: '#FFF', fontSize: 14, outline: 'none' }}
        />
        <button onClick={searchFriend} disabled={searching} style={{ position: 'absolute', right: 10, top: 10, padding: '10px 16px', borderRadius: 12, background: 'var(--color-cyan)', border: 'none', color: '#000', fontWeight: 900, fontSize: 11, cursor: 'pointer' }}>
          {searching ? '...' : 'SEARCH'}
        </button>
      </div>

      {searchResult && (
        <div style={{ background: '#0F0F1A', border: '1px solid var(--color-cyan)30', borderRadius: 24, padding: 20, marginBottom: 32 }}>
          {searchResult === 'notfound' ? (
            <div style={{ textAlign: 'center', color: '#666', fontSize: 13 }}>No orbiter found.</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 20 }}>
                {searchResult.username.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#FFF' }}>{searchResult.username}</div>
                <div style={{ fontSize: 11, color: '#444', fontFamily: 'monospace' }}>{searchResult.friend_tag}</div>
              </div>
              <button onClick={() => sendRequest(searchResult.id)} disabled={searchResult.pending} style={{ padding: '10px 20px', borderRadius: 14, background: searchResult.pending ? '#111' : '#FFF', color: '#000', border: 'none', fontWeight: 900, fontSize: 12, cursor: 'pointer' }}>
                {searchResult.pending ? 'Sent' : 'Add Friend'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* PENDING */}
      {requests.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 11, color: '#222', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>PENDING REQUESTS</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {requests.map(req => (
              <div key={req.id} style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 20, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: 'var(--color-cyan)' }}>
                  {req.sender?.username?.charAt(0) || '?'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#FFF' }}>{req.sender?.username}</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => respondRequest(req.id, 'accepted')} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--color-cyan)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✅</button>
                  <button onClick={() => respondRequest(req.id, 'declined')} style={{ width: 34, height: 34, borderRadius: '50%', background: '#111', border: '1px solid #222', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>❌</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ACTIVITY */}
      {activityFeed.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <h3 style={{ fontSize: 11, color: '#222', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>ACTIVITY FEED</h3>
          <div style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: '8px 4px' }}>
            {activityFeed.slice(0, 5).map((act, i) => (
              <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 12, borderBottom: i === 4 ? 'none' : '1px solid #111' }}>
                <span style={{ fontSize: 18 }}>{act.habitIcon}</span>
                <div style={{ fontSize: 13, lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 900, color: '#FFF' }}>{act.username}</span>
                  <span style={{ color: '#444' }}> completed </span>
                  <span style={{ fontWeight: 800, color: 'var(--color-cyan)' }}>{act.habitName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FRIENDS */}
      <h3 style={{ fontSize: 11, color: '#222', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 }}>MY ORBITERS</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {friends.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#444', background: '#0A0A12', borderRadius: 28, border: '1px solid #1A1A24' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
            <p style={{ fontSize: 14 }}>No orbiters yet.</p>
          </div>
        ) : (
          friends.map((f, i) => {
            const rank = rankInfo(f.friend.rank_id)
            const unread = unreadCounts[f.friend.id]
            return (
              <div key={i} onClick={() => setDmFriend(f.friend)} style={{ background: '#0A0A12', border: '1px solid #1A1A24', borderRadius: 24, padding: 16, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: `2px solid ${rank.color}40`, padding: 2, position: 'relative' }}>
                   <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: rank.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 18 }}>{f.friend.username.charAt(0)}</div>
                   {unread > 0 && <div style={{ position: 'absolute', top: -2, right: -2, width: 14, height: 14, borderRadius: '50%', background: '#EF4444', border: '2px solid #000' }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#FFF' }}>{f.friend.username}</div>
                  <div style={{ fontSize: 11, color: rank.color, fontWeight: 800 }}>{rank.emoji} {rank.name}</div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button onClick={(e) => removeFriend(f.friend.id, e)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 20, cursor: 'pointer', opacity: 0.7 }}>🗑️</button>
                  <div style={{ fontSize: 20 }}>💬</div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* QR MODAL */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div style={{ background: '#0A0A12', borderRadius: '32px 32px 0 0', padding: 24, paddingBottom: 60, width: '100%', borderTop: '1px solid #222', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
             <div style={{ width: 40, height: 4, background: '#1A1B24', borderRadius: 100, marginBottom: 32 }} />
             <div style={{ background: '#FFF', padding: 24, borderRadius: 28, marginBottom: 32 }}>
               <QRCodeSVG value={friendTag} size={200} />
             </div>
             <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--color-cyan)', fontFamily: 'monospace', letterSpacing: 1 }}>{friendTag}</div>
             <p style={{ fontSize: 13, color: '#444', marginTop: 8 }}>UNIQUE ORBIT ID</p>
          </div>
        </div>
      )}

      {dmFriend && <DMChat friend={dmFriend} user={user} onClose={() => { setDmFriend(null); loadUnreadCounts() }} />}
    </div>
  )
}

function DMChat({ friend, user, onClose }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    loadMessages()
    markAsRead()
    const channel = supabase.channel(`dm-${[user.id, friend.id].sort().join('-')}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
      if ((payload.new.sender_id === friend.id && payload.new.receiver_id === user.id) || (payload.new.sender_id === user.id && payload.new.receiver_id === friend.id)) {
        setMessages(prev => [...prev, payload.new])
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
      }
    }).subscribe()
    return () => supabase.removeChannel(channel)
  }, [friend])

  const loadMessages = async () => {
    const { data } = await supabase.from('direct_messages').select('*').or(`and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`).order('created_at', { ascending: true })
    setMessages(data || [])
    setTimeout(() => bottomRef.current?.scrollIntoView(), 100)
  }

  const markAsRead = async () => { await supabase.from('direct_messages').update({ read: true }).eq('sender_id', friend.id).eq('receiver_id', user.id) }

  const sendMsg = async () => {
    if (!text.trim()) return
    const msg = { sender_id: user.id, receiver_id: friend.id, content: text.trim() }
    setText('')
    await supabase.from('direct_messages').insert(msg)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1A1A24', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: 24, cursor: 'pointer' }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000' }}>{friend.username.charAt(0)}</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#FFF' }}>{friend.username}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => {
          const isMe = m.sender_id === user.id
          return (
            <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
              <div style={{ padding: '10px 16px', borderRadius: 20, background: isMe ? 'var(--color-cyan)' : '#111', color: isMe ? '#000' : '#FFF', fontSize: 14, fontWeight: 700 }}>{m.content}</div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: 20, borderTop: '1px solid #1A1A24', display: 'flex', gap: 12 }}>
        <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()} placeholder="Message..." style={{ flex: 1, background: '#111', border: '1px solid #222', borderRadius: 100, padding: '12px 20px', color: '#FFF', outline: 'none' }} />
        <button onClick={sendMsg} style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--color-cyan)', border: 'none', color: '#000', fontWeight: 900, fontSize: 18, cursor: 'pointer' }}>↑</button>
      </div>
    </div>
  )
}
