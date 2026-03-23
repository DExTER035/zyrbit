import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase.js'
import { showToast } from '../Toast.jsx'
import { earnZyrons } from '../../lib/zyrons.js'

const BATTLE_EMOJIS = ['🎯','🏆','🔥','⚡','💪','🧠','🌟','🎮']

export default function ChallengesTab({ user, profile }) {
  const [subTab, setSubTab] = useState('battles')
  const [battles, setBattles] = useState([])
  const [challenges, setChallenges] = useState([])
  const [myJoined, setMyJoined] = useState([])
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newChallenge, setNewChallenge] = useState({ name: '', description: '', icon: '🎯', color: '#00FFFF', duration_days: 30, is_public: true })

  useEffect(() => {
    loadBattles()
    loadChallenges()
  }, [])

  const loadBattles = async () => {
    const { data } = await supabase
      .from('battles')
      .select('*, challenger:profiles!battles_challenger_id_fkey(username, friend_tag, rank_id), opponent:profiles!battles_opponent_id_fkey(username, friend_tag, rank_id)')
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    setBattles(data || [])
  }

  const loadChallenges = async () => {
    const { data: all } = await supabase.from('habit_challenges').select('*').eq('is_public', true).order('member_count', { ascending: false })
    const { data: mine } = await supabase.from('challenge_members').select('challenge_id, days_completed').eq('user_id', user.id)
    setChallenges(all || [])
    setMyJoined(mine || [])
  }

  const joinChallenge = async (challengeId) => {
    const { error } = await supabase.from('challenge_members').insert({ challenge_id: challengeId, user_id: user.id })
    if (!error) {
      await supabase.from('habit_challenges').update({ member_count: challenges.find(c => c.id === challengeId)?.member_count + 1 || 1 }).eq('id', challengeId)
      showToast('🎯 Challenge joined!', 'success')
      await earnZyrons(user.id, 10, 'Joined a challenge', 'challenges')
      loadChallenges()
    }
  }

  const createChallenge = async () => {
    if (!newChallenge.name.trim()) return
    setCreating(true)
    const { error } = await supabase.from('habit_challenges').insert({
      ...newChallenge, created_by: user.id, member_count: 1
    })
    if (!error) {
      showToast('🚀 Challenge created!', 'success')
      setShowCreate(false)
      setNewChallenge({ name: '', description: '', icon: '🎯', color: '#00FFFF', duration_days: 30, is_public: true })
      loadChallenges()
    }
    setCreating(false)
  }

  const isJoined = (id) => myJoined.some(m => m.challenge_id === id)
  const getProgress = (id) => myJoined.find(m => m.challenge_id === id)?.days_completed || 0

  const activeBattles = battles.filter(b => b.status !== 'complete')
  const completedBattles = battles.filter(b => b.status === 'complete')
  const filteredChallenges = filter === 'joined' ? challenges.filter(c => isJoined(c.id)) : filter === 'popular' ? [...challenges].sort((a,b) => b.member_count - a.member_count) : challenges

  const getBattleScore = (battle, isChallenger) => {
    if (isChallenger) return battle.challenger_score || 0
    return battle.opponent_score || 0
  }

  const isWinning = (battle) => {
    const myScore = getBattleScore(battle, battle.challenger_id === user.id)
    const oppScore = getBattleScore(battle, battle.opponent_id === user.id)
    return myScore > oppScore
  }

  return (
    <div style={{ padding: '0 16px', paddingBottom: 100 }}>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['battles','⚔️ Battles'],['challenges','🎯 Challenges']].map(([k,l]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{ flex: 1, padding: '10px', borderRadius: 12, border: subTab === k ? 'none' : '1px solid #1A1A24', background: subTab === k ? '#9C27B0' : '#0A0A12', color: subTab === k ? '#FFF' : '#555', fontWeight: 800, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}>
            {l}
          </button>
        ))}
      </div>

      {/* BATTLES */}
      {subTab === 'battles' && (
        <div>
          {activeBattles.length === 0 && completedBattles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>⚔️</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#666', marginBottom: 6 }}>No active battles</div>
              <div style={{ fontSize: 12, color: '#444' }}>Go to Friends tab to challenge someone!</div>
            </div>
          ) : (
            <>
              {activeBattles.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, marginBottom: 10 }}>ACTIVE BATTLES</div>
                  {activeBattles.map(b => {
                    const amChallenger = b.challenger_id === user.id
                    const me = amChallenger ? b.challenger : b.opponent
                    const opp = amChallenger ? b.opponent : b.challenger
                    const myScore = getBattleScore(b, amChallenger)
                    const oppScore = getBattleScore(b, !amChallenger)
                    const winning = myScore > oppScore
                    return (
                      <div key={b.id} style={{ background: '#0D0818', border: '1px solid #2A1A3A', borderRadius: 18, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#00FFFF', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#000', fontSize: 18 }}>
                              {(profile?.username || 'Me').charAt(0)}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#E8E8F0' }}>You</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: winning ? '#4CAF50' : '#EF4444' }}>{myScore}</div>
                          </div>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 18, fontWeight: 900, color: '#444' }}>VS</div>
                          </div>
                          <div style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#9C27B0', margin: '0 auto 4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#FFF', fontSize: 18 }}>
                              {(opp?.username || '?').charAt(0)}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#E8E8F0' }}>{opp?.username}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: !winning ? '#4CAF50' : '#EF4444' }}>{oppScore}</div>
                          </div>
                        </div>
                        {b.bet_amount > 0 && (
                          <div style={{ textAlign: 'center', background: '#00FFFF10', border: '1px solid #00FFFF20', borderRadius: 100, padding: '5px 12px', fontSize: 11, color: '#00FFFF', fontWeight: 800, marginBottom: 10 }}>
                            🔥 Bet: {b.bet_amount} ⚡ · Winner gets {b.bet_amount * 2} ⚡
                          </div>
                        )}
                        <div style={{ height: 8, background: '#1A1A24', borderRadius: 100, overflow: 'hidden', marginBottom: 8 }}>
                          <div style={{ height: '100%', width: `${myScore}%`, background: winning ? '#4CAF50' : '#EF4444', borderRadius: 100, transition: 'width 0.8s ease' }} />
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 800, color: winning ? '#4CAF50' : '#EF4444' }}>
                          {winning ? '🏆 You are leading!' : '😤 Push harder!'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {completedBattles.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 800, marginBottom: 10 }}>COMPLETED</div>
                  {completedBattles.map(b => {
                    const won = b.winner_id === user.id
                    const drawn = !b.winner_id
                    return (
                      <div key={b.id} style={{ background: won ? '#0A180A' : drawn ? '#18160A' : '#180A0A', border: `1px solid ${won ? '#4CAF5030' : drawn ? '#FF980030' : '#EF444430'}`, borderRadius: 14, padding: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 24 }}>{won ? '🏆' : drawn ? '🤝' : '💀'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 800, color: won ? '#4CAF50' : drawn ? '#FF9800' : '#EF4444' }}>
                            {won ? 'Victory!' : drawn ? 'Draw' : 'Defeat'}
                          </div>
                          <div style={{ fontSize: 10, color: '#666' }}>vs {(b.challenger_id === user.id ? b.opponent?.username : b.challenger?.username) || 'Unknown'}</div>
                        </div>
                        {b.bet_amount > 0 && (
                          <div style={{ fontSize: 12, fontWeight: 900, color: won ? '#4CAF50' : '#EF4444' }}>
                            {won ? `+${b.bet_amount * 2}⚡` : drawn ? '⚡ back' : `-${b.bet_amount}⚡`}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* CHALLENGES */}
      {subTab === 'challenges' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              {[['all','All'],['joined','Joined'],['popular','Popular']].map(([k,l]) => (
                <button key={k} onClick={() => setFilter(k)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 100, border: filter === k ? 'none' : '1px solid #1A1A24', background: filter === k ? '#9C27B0' : '#0A0A12', color: filter === k ? '#FFF' : '#555', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  {l}
                </button>
              ))}
            </div>
            <button onClick={() => setShowCreate(true)} style={{ padding: '8px 14px', background: '#9C27B0', border: 'none', borderRadius: 100, color: '#FFF', fontWeight: 800, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>+ Create</button>
          </div>

          {filteredChallenges.map(c => {
            const joined = isJoined(c.id)
            const progress = getProgress(c.id)
            const pct = Math.round((progress / c.duration_days) * 100)
            return (
              <div key={c.id} style={{ background: joined ? `${c.color}08` : '#0A0A12', border: `1px solid ${joined ? c.color + '30' : '#1A1A24'}`, borderRadius: 16, padding: 13, marginBottom: 10 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                    {c.icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#E8E8F0' }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>{c.member_count || 0} members · {c.duration_days}d</div>
                  </div>
                  <button onClick={() => !joined && joinChallenge(c.id)} style={{ padding: '8px 14px', background: joined ? `${c.color}20` : c.color, border: joined ? `1px solid ${c.color}50` : 'none', borderRadius: 10, color: joined ? c.color : '#000', fontWeight: 800, fontSize: 11, cursor: joined ? 'default' : 'pointer', flexShrink: 0 }}>
                    {joined ? '✓ Joined' : 'Join'}
                  </button>
                </div>
                {c.description && <div style={{ fontSize: 11, color: '#555', marginBottom: joined ? 8 : 0 }}>{c.description}</div>}
                {joined && (
                  <>
                    <div style={{ height: 4, background: '#1A1A24', borderRadius: 100, overflow: 'hidden', marginTop: 4 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: c.color, borderRadius: 100 }} />
                    </div>
                    <div style={{ fontSize: 9, color: c.color, marginTop: 4, fontWeight: 700 }}>Day {progress}/{c.duration_days} · {100 - pct}% remaining</div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ background: '#111118', borderRadius: '32px 32px 0 0', padding: 24, paddingBottom: 48, width: '100%', borderTop: '1px solid #2A2A3A' }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#E8E8F0', marginBottom: 20 }}>🎯 Create Challenge</div>
            <input value={newChallenge.name} onChange={e => setNewChallenge(p => ({ ...p, name: e.target.value }))} placeholder="Challenge name" style={inputStyle} />
            <textarea value={newChallenge.description} onChange={e => setNewChallenge(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" rows={2} style={{ ...inputStyle, resize: 'none', marginBottom: 12 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {BATTLE_EMOJIS.map(e => (
                <button key={e} onClick={() => setNewChallenge(p => ({ ...p, icon: e }))} style={{ width: 40, height: 40, borderRadius: 10, background: newChallenge.icon === e ? '#9C27B0' : '#1A1A24', border: 'none', fontSize: 18, cursor: 'pointer' }}>{e}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[7,14,21,30].map(d => (
                <button key={d} onClick={() => setNewChallenge(p => ({ ...p, duration_days: d }))} style={{ flex: 1, padding: '10px', borderRadius: 10, border: newChallenge.duration_days === d ? 'none' : '1px solid #1A1A24', background: newChallenge.duration_days === d ? '#9C27B0' : '#0A0A12', color: newChallenge.duration_days === d ? '#FFF' : '#666', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  {d}d
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 16, background: '#1A1A24', border: 'none', borderRadius: 14, color: '#E8E8F0', fontWeight: 800, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createChallenge} disabled={creating} style={{ flex: 1, padding: 16, background: '#9C27B0', border: 'none', borderRadius: 14, color: '#FFF', fontWeight: 800, cursor: 'pointer' }}>
                {creating ? '…' : 'Create 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = { width: '100%', background: '#0A0A12', border: '1px solid #1E1E2A', color: '#E8E8F0', padding: '12px 14px', borderRadius: 12, fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box', fontFamily: 'Inter, sans-serif' }
