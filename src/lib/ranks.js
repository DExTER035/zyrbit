export const RANKS = [
  {
    id: 0, label: 'RANK D', name: 'Stoneheart',
    element: 'Earth 🪨', color: '#A16207',
    border: '#78350F', bg: '#1a0808',
    req: 0, next: 300,
    desc: 'Unmoving. Unshaken. Your foundation is being laid.',
    perk: 'Basic habit tracking',
    tier: 'base', secret: false,
    icon: '🪨', anim: 'float',
  },
  {
    id: 1, label: 'RANK C', name: 'Tidesoul',
    element: 'Water 💧', color: '#38BDF8',
    border: '#0C4A6E', bg: '#04101a',
    req: 300, next: 900,
    desc: 'Fluid and adaptive. You flow around obstacles.',
    perk: 'Orbit Journal unlocked',
    tier: 'base', secret: false,
    icon: '💧', anim: 'wave',
  },
  {
    id: 2, label: 'RANK B', name: 'Verdant',
    element: 'Nature 🌿', color: '#4ADE80',
    border: '#14532D', bg: '#041208',
    req: 900, next: 2200,
    desc: 'Growing daily like roots through stone.',
    perk: 'Zyrbit Zones + custom colors',
    tier: 'base', secret: false,
    icon: '🌿', anim: 'pulse',
  },
  {
    id: 3, label: 'RANK A', name: 'Galeborn',
    element: 'Wind 🌬️', color: '#67E8F9',
    border: '#164E63', bg: '#020e12',
    req: 2200, next: 5000,
    desc: 'Invisible yet unstoppable.',
    perk: 'Cosmos Shop + Friend Challenges',
    tier: 'base', secret: false,
    icon: '🌬️', anim: 'shake',
  },
  {
    id: 4, label: 'RANK A+', name: 'Emberon',
    element: 'Fire 🔥', color: '#FB923C',
    border: '#9A3412', bg: '#120600',
    req: 5000, next: 9500,
    desc: 'You burn with intention.',
    perk: 'Orbit Shield + Deep Analytics',
    tier: 'base', secret: false,
    icon: '🔥', anim: 'flicker',
  },
  {
    id: 5, label: 'RANK S', name: 'Stormcaller',
    element: 'Thunder ⚡', color: '#FDE047',
    border: '#713F12', bg: '#100e00',
    req: 9500, next: 16000,
    desc: 'Raw power unleashed.',
    perk: 'All themes + bonus AI sessions',
    tier: 'base', secret: false,
    icon: '⚡', anim: 'thunder',
  },
  {
    id: 6, label: 'RANK S+', name: 'Frostweave',
    element: 'Ice ❄️', color: '#BAE6FD',
    border: '#0369A1', bg: '#020a12',
    req: 16000, next: 25000,
    desc: 'Cold, precise, unbreakable.',
    perk: 'Exclusive Ice theme + badge glow',
    tier: 'hidden1', secret: true,
    icon: '❄️', anim: 'snow',
    revealAt: 5,
  },
  {
    id: 7, label: 'RANK SS', name: 'Abyssal',
    element: 'Ocean 🌊', color: '#1D4ED8',
    border: '#1E3A8A', bg: '#01050f',
    req: 25000, next: 38000,
    desc: 'Deeper than anyone has gone.',
    perk: 'Abyssal badge + rank boost token',
    tier: 'hidden1', secret: true,
    icon: '🌊', anim: 'wave',
    revealAt: 5,
  },
  {
    id: 8, label: 'RANK SSS', name: 'Voidwalker',
    element: 'Shadow 🌑', color: '#A78BFA',
    border: '#4C1D95', bg: '#050008',
    req: 38000, next: 100000,
    desc: 'You exist between worlds.',
    perk: 'Everything unlocked. No limits.',
    tier: 'hidden2', secret: true,
    icon: '🌑', anim: 'shadowPulse',
    revealAt: 7,
  },
  {
    id: 9, label: 'RANK Ω', name: 'Zyronix',
    element: 'Cosmos ✨', color: '#9C27B0',
    border: '#581C87', bg: '#0a0210',
    req: 100000, next: null,
    desc: 'All elements unite in you. Earth, Water, Fire, Wind, Thunder, Ice, Ocean, Shadow — you ARE the cosmos. Less than 1% of users ever reach this.',
    perk: '∞ The Zyrbit legend. Nothing beyond this.',
    tier: 'hidden2', secret: true,
    icon: '✨', anim: 'cosmos',
    revealAt: 7,
  },
]


export const getRankById = (id) => RANKS.find(r => r.id === id)

export const getRankByZyrons = (zyrons) => {
  let current = RANKS[0]
  for (const rank of RANKS) {
    if (zyrons >= rank.req) current = rank
  }
  return current
}

export const getVisibleRanks = (currentRankId) => {
  return RANKS.filter(r => {
    if (r.tier === 'base') return true
    if (r.tier === 'hidden1') return currentRankId >= r.revealAt
    if (r.tier === 'hidden2') return currentRankId >= r.revealAt
    return false
  })
}

export const getNextRank = (currentRankId) => {
  return RANKS.find(r => r.id === currentRankId + 1) || null
}

export const getProgressToNext = (zyrons, currentRank) => {
  if (!currentRank.next) return 100
  const earned = zyrons - currentRank.req
  const needed = currentRank.next - currentRank.req
  return Math.min(100, Math.round((earned / needed) * 100))
}

export const RANK_MILESTONES = {
  16000:  { rank: 'S+', msg: 'Secret element revealed: Frostweave!', bonus: 500 },
  25000:  { rank: 'SS', msg: 'Secret element revealed: Abyssal!', bonus: 500 },
  38000:  { rank: 'SSS', msg: 'Secret element revealed: Voidwalker!', bonus: 500 },
  100000: { rank: 'Ω', msg: 'ZYRONIX — The final element. You are the cosmos.', bonus: 2000 },
}
