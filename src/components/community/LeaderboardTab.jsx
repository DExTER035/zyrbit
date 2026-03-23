import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'

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

export default function LeaderboardTab({ user, profile }) {
  const [filter, setFilter] = useState('global')
  const [leaders, setLeaders] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friends, setFriends] = useState([])

  useEffect(() => { loadFriends() }, [])
  useEffect(() => { loadLeaders(filter) }, [filter])

  const loadFriends = async () => {
    // Get all accepted friendship IDs (both directions)
    const [{ data: asReq }, { data: asAddr }] = await Promise.all([
      supabase.from('friendships').select('addressee_id').eq('requester_id', user.id).eq('status', 'accepted'),
      supabase.from('friendships').select('requester_id').eq('addressee_id', user.id).eq('status', 'accepted')
    ])
    const ids = [
      ...(asReq || []).map(r => r.addressee_id),
      ...(asAddr || []).map(r => r.requester_id)
    ]
    setFriends(ids)
  }

  const loadLeaders = async (f) => {
    setLoading(true)

    // Query zyron_wallet for balance (the real source of Zyrons)
    let walletQuery = supabase
      .from('zyron_wallet')
      .select('user_id, balance')
      .order('balance', { ascending: false })
      .limit(100)

    const { data: wallets } = await walletQuery
    if (!wallets || wallets.length === 0) { setLoading(false); setLeaders([]); return }

    // Filter by friends if needed
    let userIds = wallets.map(w => w.user_id)
    if (f === 'friends' && friends.length > 0) {
      userIds = userIds.filter(id => [...friends, user.id].includes(id))
    }

    if (userIds.length === 0) { setLoading(false); setLeaders([]); return }

    // Fetch matching profiles
    let profileQuery = supabase.from('profiles').select('id, username, friend_tag, rank_id').in('id', userIds)
    if (f === 'element') profileQuery = profileQuery.eq('rank_id', profile?.rank_id || 0)

    const { data: profiles } = await profileQuery
    if (!profiles) { setLoading(false); return }

    // Merge wallet balances into profiles and sort
    const walletMap = Object.fromEntries(wallets.map(w => [w.user_id, w.balance]))
    const enriched = profiles
      .map(p => ({ ...p, zyrons: walletMap[p.id] || 0 }))
      .sort((a, b) => b.zyrons - a.zyrons)

    setLeaders(enriched)
    const myPosition = enriched.findIndex(l => l.id === user.id)
    setMyRank(myPosition >= 0 ? myPosition + 1 : null)
    setLoading(false)
  }

  const FILTERS = [
    { id: 'global', label: '🌍 Global' },
    { id: 'friends', label: '👥 Friends' },
    { id: 'weekly', label: '📅 Weekly' },
    { id: 'element', label: '⚡ Element' },
    { id: 'country', label: '🏳️ Country' },
  ]

  const top3 = leaders.slice(0, 3)
  const rest = leaders.slice(3)

  const PodiumCard = ({ item, position, height }) => {
    const medals = ['🥇', '🥈', '🥉']
    const bgColors = ['rgba(255, 215, 0, 0.05)', 'rgba(192, 192, 192, 0.05)', 'rgba(205, 127, 50, 0.05)']
    const borderCol = ['#FFD70060', '#C0C0C060', '#CD7F3260']
    const r = rankInfo(item?.rank_id)
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${borderCol[position - 1]}`, padding: 3 }}>
           <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 24 }}>
             {(item?.username || '?').charAt(0)}
           </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#FFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80, letterSpacing: -0.5 }}>{item?.username || '—'}</div>
          <div style={{ fontSize: 11, color: r.color, fontWeight: 800 }}>{(item?.zyrons || 0).toLocaleString()} ⚡</div>
        </div>
        <div style={{ background: bgColors[position - 1], border: `1px solid ${borderCol[position - 1]}`, borderRadius: '24px 24px 0 0', width: '100%', height: height, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 12, fontSize: 24, boxShadow: 'inset 0 10px 30px rgba(0,0,0,0.5)' }}>
          {medals[position - 1]}
        </div>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Filter Pills */}
      <div style={{ padding: '0 20px', overflowX: 'auto', display: 'flex', gap: 10, marginBottom: 32, scrollbarWidth: 'none', background: '#000' }}>
        {FILTERS.map(f => {
          const isActive = filter === f.id
          return (
            <button 
              key={f.id} 
              onClick={() => setFilter(f.id)} 
              style={{ 
                flexShrink: 0, 
                padding: '10px 20px', 
                borderRadius: 100, 
                border: isActive ? '1px solid #FFF' : '1px solid #1A1A24', 
                background: isActive ? '#FFF' : '#0A0A12', 
                color: isActive ? '#000' : '#444', 
                fontWeight: 800, 
                fontSize: 12, 
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.3px',
                boxShadow: isActive ? '0 4px 12px rgba(255,255,255,0.1)' : 'none'
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Loading…</div>
      ) : leaders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏆</div>
          <div style={{ fontSize: 13, color: '#555', fontWeight: 700 }}>No data yet for this filter</div>
        </div>
      ) : (
        <>
          {/* PODIUM */}
          <div style={{ padding: '0 16px 20px', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            {top3[1] && <PodiumCard item={top3[1]} position={2} height={42} />}
            {top3[0] && <PodiumCard item={top3[0]} position={1} height={56} />}
            {top3[2] && <PodiumCard item={top3[2]} position={3} height={34} />}
          </div>

          {/* LIST */}
          <div style={{ padding: '0 20px' }}>
            {rest.map((item, i) => {
              const pos = i + 4
              const isMe = item.id === user.id
              const r = rankInfo(item.rank_id)
              return (
                <div key={item.id} style={{ background: isMe ? '#FFFFFF08' : '#0A0A12', border: `1px solid ${isMe ? '#FFFFFF20' : '#1A1A24'}`, borderRadius: 20, padding: '14px 18px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, fontSize: 14, fontWeight: 900, color: '#333', textAlign: 'center' }}>{pos}</div>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: item.element_color || r.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 16 }}>
                    {(item.username || '?').charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 850, color: isMe ? '#FFF' : '#FFF' }}>{item.username}{isMe ? ' (You)' : ''}</div>
                    <div style={{ fontSize: 10, color: r.color, fontWeight: 800, textTransform: 'uppercase' }}>{r.name}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: isMe ? '#FFF' : '#333' }}>{(item.zyrons || 0).toLocaleString()} ⚡</div>
                </div>
              )
            })}

            {/* My rank if not in top */}
            {myRank && myRank > leaders.length && (
              <div style={{ background: '#00FFFF08', border: '1px solid #00FFFF20', borderRadius: 12, padding: '10px 12px', marginTop: 8, textAlign: 'center', fontSize: 12, color: '#00FFFF', fontWeight: 800 }}>
                Your rank: #{myRank.toLocaleString()} worldwide
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
