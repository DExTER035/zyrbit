import React, { useEffect, useState } from 'react'
import confetti from 'canvas-confetti'

export default function RankBanner({ rank, onDone }) {
  const [phase, setPhase] = useState('reveal') // reveal | show | fade
  const [canDismiss, setCanDismiss] = useState(false)

  const isOmega = rank?.id === 9

  useEffect(() => {
    if (!rank) return

    if (isOmega) {
      const t1 = setTimeout(() => setPhase('show'), 300)
      const t2 = setTimeout(() => setCanDismiss(true), 5000)
      const t3 = setTimeout(() => setPhase('fade'), 10000)
      const t4 = setTimeout(() => onDone?.(), 10500)
      
      const duration = 10 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5, angle: 60, spread: 55, origin: { x: 0 },
          colors: ['#9C27B0', '#67E8F9', '#FDE047']
        });
        confetti({
          particleCount: 5, angle: 120, spread: 55, origin: { x: 1 },
          colors: ['#9C27B0', '#67E8F9', '#FDE047']
        });
        if (Date.now() < end && phase !== 'fade') {
          requestAnimationFrame(frame);
        }
      };
      frame();

      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
    } else {
      const t1 = setTimeout(() => setPhase('show'), 300)
      const t2 = setTimeout(() => setPhase('fade'), 3500)
      const t3 = setTimeout(() => onDone?.(), 4000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
  }, [isOmega, rank, onDone, phase])

  if (!rank) return null

  const isHidden = rank.secret || rank.hidden
  const opacity = phase === 'fade' ? 0 : phase === 'show' ? 1 : 0
  const scale = phase === 'show' ? 1 : 0.8

  if (isOmega) {
    return (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999, // Take over the whole screen
        background: '#0a0210', 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', transition: 'opacity 0.5s ease', opacity,
      }}>
        {/* Cosmos Glow */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(circle at center, #9C27B066 0%, transparent 80%)`,
          animation: 'pulse-ring 2s ease-in-out infinite',
        }} />

        <div style={{ zIndex: 1, textAlign: 'center', transform: `scale(${scale})`, transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)', padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', background: '#9C27B0', borderRadius: 20, padding: '6px 20px', display: 'inline-block', marginBottom: 20, letterSpacing: 2 }}>
            ✨ LEGENDARY RANK REACHED ✨
          </div>

          <div style={{ fontSize: 48, fontWeight: 900, color: '#9C27B0', marginBottom: 8, textShadow: '0 0 20px #9C27B0' }}>
            Ω ZYRONIX
          </div>
          <div style={{ fontSize: 18, color: '#FDE047', fontWeight: 800, marginBottom: 24 }}>
            +2,000 Bonus Zyrons Awarded!
          </div>

          <div style={{ fontSize: 32, letterSpacing: 10, marginBottom: 24, animation: 'float 3s ease-in-out infinite' }}>
            🪨💧🌿🌬️🔥⚡❄️🌊🌑✨
          </div>

          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', maxWidth: 300, lineHeight: 1.6, margin: '0 auto 24px' }}>
            {rank.desc}
          </p>

          <div style={{ background: '#1a0525', border: '1px solid #9C27B0', padding: 16, borderRadius: 16, marginBottom: 32 }}>
            <div style={{ fontSize: 14, color: '#E8E8F0', fontWeight: 700 }}>Exclusive <span style={{ color: '#9C27B0', textShadow: '0 0 10px #9C27B0' }}>Zyronix Frame</span> Unlocked</div>
          </div>

          <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {canDismiss ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary" onClick={() => {
                  const t = encodeURIComponent('I just reached the impossible legendary rank Ω Zyronix on Zyrbit! ✨ Only 1% make it this far. Let\'s go! 🚀')
                  window.open(`https://twitter.com/intent/tweet?text=${t}`, '_blank')
                }} style={{ background: '#1DA1F2', color: '#fff', padding: '12px 24px' }}>
                  Share on X
                </button>
                <button className="btn-ghost" onClick={() => { setPhase('fade'); setTimeout(() => onDone?.(), 500) }} style={{ padding: '12px 24px', border: '1px solid #9C27B0', color: '#9C27B0' }}>
                  Continue Orbit
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--color-muted)', fontWeight: 600, animation: 'pulse 1.5s infinite' }}>
                Absorbing cosmic energy...
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Standard Ranks
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: rank.color + 'CC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column',
      transition: 'opacity 0.5s ease',
      opacity,
    }}>
      {/* Glow */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(circle at center, ${rank.color}88 0%, transparent 70%)`,
        animation: 'pulse-ring 1s ease-in-out 3',
      }} />

      {/* Content */}
      <div style={{
        textAlign: 'center', zIndex: 1,
        transform: `scale(${scale})`,
        transition: 'transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {isHidden && (
          <div style={{
            fontSize: 13, fontWeight: 700, color: '#fff',
            background: rank.color, borderRadius: 20,
            padding: '4px 16px', display: 'inline-block',
            marginBottom: 16, letterSpacing: 1,
          }}>
            🔓 SECRET ELEMENT REVEALED!
          </div>
        )}

        <div style={{ fontSize: 72, lineHeight: 1, marginBottom: 12 }}>
          {rank.icon || rank.emoji}
        </div>

        <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
          {rank.name}
        </div>

        <div style={{
          fontSize: 16, fontWeight: 700, color: '#fff',
          background: 'rgba(0,0,0,0.3)', borderRadius: 12,
          padding: '4px 16px', display: 'inline-block', marginBottom: 20,
        }}>
          {rank.label}
        </div>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.9)', maxWidth: 260, lineHeight: 1.5 }}>
          {rank.desc}
        </p>

        {isHidden && (
          <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: '#fff' }}>
            ⚡ +500 Zyrons Awarded!
          </div>
        )}
      </div>
    </div>
  )
}
