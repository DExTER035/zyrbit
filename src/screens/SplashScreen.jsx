import React, { useState, useEffect, useRef } from 'react';
import { ZyrbitMark, ZyrbitWordmark } from '../components/Logo.jsx';

/* ─── Pillar Icons ─────────────────────────────────────────── */
const PillarIcon = ({ type }) => {
  const base = {
    width: 20, height: 20, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (type) {
    case 'mind':
      return (
        <svg {...base}>
          <path d="M9.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5L9.5 3z"/>
          <polyline points="9 3 9 9 15 9"/>
        </svg>
      );
    case 'health':
      return (
        <svg {...base}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      );
    case 'wealth':
      return (
        <svg {...base}>
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      );
    case 'growth':
      return (
        <svg {...base}>
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
          <polyline points="17 6 23 6 23 12"/>
        </svg>
      );
    default:
      return null;
  }
};

/* ─── Feature Icons ─────────────────────────────────────────── */
const FeatureIcon = ({ type }) => {
  const base = {
    width: 18, height: 18, viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
    strokeLinecap: 'round', strokeLinejoin: 'round',
  };
  switch (type) {
    case 'habit':
      return <svg {...base}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M9 16l2 2 4-4"/></svg>;
    case 'ai':
      return <svg {...base}><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>;
    case 'journal':
      return <svg {...base}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
    case 'challenge':
      return <svg {...base}><path d="M12 2a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4 4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"/><path d="M4 22h16"/><path d="M10 14.66V17H4v2h16v-2h-5v-2.34"/></svg>;
    case 'analytics':
      return <svg {...base}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
    default:
      return null;
  }
};

/* ─── Scroll-aware section reveal ──────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ─── Main Component ────────────────────────────────────────── */
export default function SplashScreen({ onGetStarted, onLogin }) {
  /* Splash animation state */
  const [logoReveal,    setLogoReveal]    = useState(false);
  const [pillarsReveal, setPillarsReveal] = useState(false);
  const [headlineReveal,setHeadlineReveal]= useState(false);
  const [splashFadeOut, setSplashFadeOut] = useState(false);
  const [showSplash,    setShowSplash]    = useState(true);

  /* Section reveal refs */
  const [pillarsRef,  pillarsVisible]  = useReveal();
  const [featuresRef, featuresVisible] = useReveal();
  const [whyRef,      whyVisible]      = useReveal();
  const [socialRef,   socialVisible]   = useReveal();
  const [pricingRef,  pricingVisible]  = useReveal();

  useEffect(() => {
    const t1 = setTimeout(() => setLogoReveal(true),     100);
    const t2 = setTimeout(() => setPillarsReveal(true),  550);
    const t3 = setTimeout(() => setHeadlineReveal(true), 1000);
    const t4 = setTimeout(() => setSplashFadeOut(true),  1600);
    const t5 = setTimeout(() => setShowSplash(false),    2150);
    return () => [t1,t2,t3,t4,t5].forEach(clearTimeout);
  }, []);

  const scrollToFeatures = () => {
    document.getElementById('features-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  /* Shared button styles */
  const btnPrimary = {
    background: '#FFFFFF',
    color: '#121214',
    border: 'none',
    borderRadius: 10,
    padding: '0.8rem 1.75rem',
    fontSize: '0.9rem',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s, transform 0.15s',
    fontFamily: "'Inter', sans-serif",
    letterSpacing: '-0.01em',
  };
  const btnSecondary = {
    background: 'transparent',
    color: '#A1A1AA',
    border: '1px solid #26272C',
    borderRadius: 10,
    padding: '0.8rem 1.75rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{
      background: '#121214',
      color: '#FFFFFF',
      fontFamily: "'Inter', system-ui, sans-serif",
      minHeight: '100vh',
      overflowX: 'hidden',
    }}>

      {/* ── SPLASH OVERLAY ─────────────────────────────────── */}
      {showSplash && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: '#121214',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          opacity: splashFadeOut ? 0 : 1,
          transform: splashFadeOut ? 'scale(1.02)' : 'scale(1)',
          transition: 'opacity 0.5s cubic-bezier(0.4,0,0.2,1), transform 0.5s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: splashFadeOut ? 'none' : 'auto',
        }}>
          {/* Monolith Z with CSS bar-reveal animation */}
          <div style={{
            opacity: logoReveal ? 1 : 0,
            transform: logoReveal ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
          }}>
            <ZyrbitMark size={52} variant="default" />
          </div>

          {/* Four pillars */}
          <div style={{
            display: 'flex',
            gap: '1.75rem',
            marginTop: '2rem',
          }}>
            {['Mind', 'Health', 'Wealth', 'Growth'].map((pillar, idx) => (
              <span key={pillar} style={{
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                fontWeight: 700,
                color: '#3F3F46',
                opacity: pillarsReveal ? 1 : 0,
                transform: pillarsReveal ? 'translateY(0)' : 'translateY(6px)',
                transition: `opacity 0.45s cubic-bezier(0.16,1,0.3,1) ${idx * 100 + 50}ms, transform 0.45s cubic-bezier(0.16,1,0.3,1) ${idx * 100 + 50}ms`,
              }}>
                {pillar}
              </span>
            ))}
          </div>

          {/* Headline */}
          <p style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '1rem',
            fontWeight: 500,
            color: '#5EE6F5',
            marginTop: '2rem',
            opacity: headlineReveal ? 0.9 : 0,
            transform: headlineReveal ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
            textAlign: 'center',
            padding: '0 1rem',
            letterSpacing: '-0.01em',
          }}>
            Become the person you know you can be.
          </p>
        </div>
      )}

      {/* ── NAVBAR ─────────────────────────────────────────── */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(18,18,20,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #1F1F23',
        opacity: 0,
        animation: 'navFadeIn 0.6s cubic-bezier(0.16,1,0.3,1) 1.4s forwards',
      }}>
        <div style={{
          maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          height: 60,
        }}>
          <ZyrbitWordmark iconSize={26} />

          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={onLogin}
              style={btnSecondary}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3F3F46';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#26272C';
                e.currentTarget.style.color = '#A1A1AA';
              }}
            >
              Log In
            </button>
            <button
              onClick={onGetStarted}
              style={{
                ...btnPrimary,
                background: '#5EE6F5',
                color: '#0D1117',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#7AEEF9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5EE6F5'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Get started
            </button>
          </nav>
        </div>
      </header>

      {/* ── 1. HERO ─────────────────────────────────────────── */}
      <section style={{
        padding: 'clamp(5rem, 12vw, 9rem) 1.5rem clamp(4rem, 8vw, 7rem)',
        textAlign: 'center',
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(94,230,245,0.05) 0%, transparent 70%)',
        borderBottom: '1px solid #1F1F23',
        opacity: 0,
        animation: 'heroFadeIn 0.8s cubic-bezier(0.16,1,0.3,1) 1.5s forwards',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Eyebrow tag */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(94,230,245,0.06)',
            border: '1px solid rgba(94,230,245,0.15)',
            borderRadius: 100,
            padding: '0.35rem 1rem',
            marginBottom: '2rem',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5EE6F5', display: 'inline-block' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#5EE6F5', letterSpacing: '0.04em' }}>
              Now in early access
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(2.6rem, 7vw, 4.5rem)',
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-0.04em',
            marginBottom: '1.5rem',
            color: '#FFFFFF',
          }}>
            The operating system<br />for your{' '}
            <span style={{ color: '#5EE6F5' }}>entire</span> life
          </h1>

          <p style={{
            fontSize: 'clamp(1rem, 2.5vw, 1.15rem)',
            color: '#71717A',
            maxWidth: 520,
            margin: '0 auto 2.75rem',
            lineHeight: 1.7,
            letterSpacing: '-0.01em',
          }}>
            Zyrbit brings your mind, health, wealth, and growth into one calm, connected system — so you stop managing five apps and start running one life.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={onGetStarted}
              style={{
                ...btnPrimary,
                background: '#5EE6F5',
                color: '#0D1117',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#7AEEF9'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#5EE6F5'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Start free
            </button>
            <button
              onClick={scrollToFeatures}
              style={btnSecondary}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = '#3F3F46';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = '#26272C';
                e.currentTarget.style.color = '#A1A1AA';
              }}
            >
              See how it works
            </button>
          </div>
        </div>
      </section>

      {/* ── 2. FOUR PILLARS ─────────────────────────────────── */}
      <section
        ref={pillarsRef}
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          borderBottom: '1px solid #1F1F23',
          opacity: pillarsVisible ? 1 : 0,
          transform: pillarsVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5EE6F5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Four Pillars
            </p>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}>
              Every area of your life,<br />in one place.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1px',
            background: '#1F1F23',
            border: '1px solid #1F1F23',
            borderRadius: 16,
            overflow: 'hidden',
          }}>
            {[
              {
                type: 'mind', name: 'Mind',
                desc: 'Clarity, focus, and daily habit formation to rebuild mental resilience and achieve flow states.',
                color: '#5EE6F5',
              },
              {
                type: 'health', name: 'Health',
                desc: 'Track sleep, recovery, and biofeedback metrics to optimize your physical performance.',
                color: '#10B981',
              },
              {
                type: 'wealth', name: 'Wealth',
                desc: 'Budget, track expenses, and build long-term financial clarity with precision.',
                color: '#F59E0B',
              },
              {
                type: 'growth', name: 'Growth',
                desc: 'Set ambitious goals, map execution plans, and trigger AI-powered growth routines.',
                color: '#EC4899',
              },
            ].map((pillar, idx) => (
              <div key={pillar.name} style={{
                background: '#17181B',
                padding: '2rem',
                cursor: 'default',
                transition: 'background 0.2s',
                animationDelay: `${idx * 80}ms`,
              }}
                onMouseEnter={e => { e.currentTarget.style.background = '#1C1D21'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#17181B'; }}
              >
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${pillar.color}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: pillar.color,
                  marginBottom: '1.25rem',
                }}>
                  <PillarIcon type={pillar.type} />
                </div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  marginBottom: '0.6rem',
                  letterSpacing: '-0.02em',
                }}>
                  {pillar.name}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#71717A', lineHeight: 1.6 }}>
                  {pillar.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. FEATURES ─────────────────────────────────────── */}
      <section
        id="features-section"
        ref={featuresRef}
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          borderBottom: '1px solid #1F1F23',
          opacity: featuresVisible ? 1 : 0,
          transform: featuresVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5EE6F5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Features
            </p>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}>
              Everything you need to build<br />a better life.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { type: 'habit',     title: 'Habit Tracking',          desc: 'Build unbreakable streaks with intelligent feedback loops, daily logs, and streak shields.',              span: 1 },
              { type: 'ai',        title: 'AI Planner',              desc: 'Zenith engine analyzes your energy patterns and priorities to generate an optimal daily schedule.',       span: 1 },
              { type: 'journal',   title: 'Intelligent Journal',      desc: 'Structured prompts targeting clarity, stress release, and daily reflection across all four pillars.',      span: 1 },
              { type: 'challenge', title: 'Growth Challenges',        desc: 'Compete and build consistency alongside an ambitious global community pushing the same goals.',           span: 1 },
              { type: 'analytics', title: 'Life Analytics Dashboard', desc: 'Synthesize Mind, Health, Wealth, and Growth data into one comprehensive view of your life progress.',    span: 2 },
            ].map((feat) => (
              <div key={feat.title}
                style={{
                  gridColumn: `span ${feat.span}`,
                  background: '#17181B',
                  border: '1px solid #1F1F23',
                  borderRadius: 14,
                  padding: '1.75rem',
                  transition: 'border-color 0.2s, background 0.2s, transform 0.25s cubic-bezier(0.16,1,0.3,1)',
                  cursor: 'default',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#26272C';
                  e.currentTarget.style.background = '#1C1D21';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#1F1F23';
                  e.currentTarget.style.background = '#17181B';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  color: '#5EE6F5',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(94,230,245,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FeatureIcon type={feat.type} />
                  </div>
                </div>
                <h3 style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '1rem',
                  fontWeight: 700,
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em',
                }}>
                  {feat.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#71717A', lineHeight: 1.6 }}>
                  {feat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. WHY ZYRBIT ───────────────────────────────────── */}
      <section
        ref={whyRef}
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          borderBottom: '1px solid #1F1F23',
          opacity: whyVisible ? 1 : 0,
          transform: whyVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ maxWidth: 780, margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5EE6F5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Why Zyrbit?
          </p>
          <h2 style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
          }}>
            Stop managing apps.<br />Start building a life.
          </h2>
          <p style={{
            fontSize: '1.05rem',
            color: '#71717A',
            lineHeight: 1.75,
            maxWidth: 600,
            margin: '0 auto 3rem',
          }}>
            Zyrbit replaces a stack of isolated apps — habit trackers, budget tools, journals, planners — with a single unified Life Operating System. One workspace. Complete clarity. Zero distraction.
          </p>

          {/* Three-column stat grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1px',
            background: '#1F1F23',
            border: '1px solid #1F1F23',
            borderRadius: 14,
            overflow: 'hidden',
          }}>
            {[
              { stat: '4', label: 'Life Pillars' },
              { stat: '∞', label: 'Habit Streaks' },
              { stat: '1', label: 'Unified System' },
            ].map(item => (
              <div key={item.label} style={{ background: '#17181B', padding: '2rem 1.5rem' }}>
                <div style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: '2.5rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '-0.04em',
                  marginBottom: '0.35rem',
                }}>
                  {item.stat}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#71717A', fontWeight: 500 }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. SOCIAL PROOF ─────────────────────────────────── */}
      <section
        ref={socialRef}
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          background: '#17181B',
          borderBottom: '1px solid #1F1F23',
          opacity: socialVisible ? 1 : 0,
          transform: socialVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: '#3F3F46', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '3rem' }}>
            From people building their best life
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {[
              { quote: '"Zyrbit completely replaced my habit app, my budget tracker, and my journal. It\'s the only tool I open every morning."', name: 'Alex M.', role: 'Software Engineer' },
              { quote: '"The AI Planner alone is worth it. It actually understands how I work and builds a schedule that fits my energy."', name: 'Priya K.', role: 'Founder & Builder' },
              { quote: '"I\'ve tried everything. Nothing stuck until Zyrbit — the four-pillar system makes growth feel like a game I\'m winning."', name: 'Jordan T.', role: 'Student & Athlete' },
            ].map((t, i) => (
              <div key={i} style={{
                background: '#121214',
                border: '1px solid #1F1F23',
                borderRadius: 14,
                padding: '1.75rem',
              }}>
                {/* Stars */}
                <div style={{ color: '#F59E0B', fontSize: '0.75rem', marginBottom: '1rem', letterSpacing: 2 }}>
                  ★★★★★
                </div>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#A1A1AA',
                  lineHeight: 1.65,
                  marginBottom: '1.25rem',
                  fontStyle: 'italic',
                }}>
                  {t.quote}
                </p>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF' }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#52525B' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. PRICING ──────────────────────────────────────── */}
      <section
        ref={pricingRef}
        style={{
          padding: 'clamp(4rem, 8vw, 7rem) 1.5rem',
          borderBottom: '1px solid #1F1F23',
          opacity: pricingVisible ? 1 : 0,
          transform: pricingVisible ? 'translateY(0)' : 'translateY(24px)',
          transition: 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5EE6F5', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Pricing</p>
            <h2 style={{
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}>
              Simple, honest pricing.
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
            gap: '1rem',
          }}>
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                desc: 'Get started. No credit card required.',
                features: ['Core habit tracking', 'Daily journal', 'Community access', 'Basic analytics'],
                cta: 'Start for Free',
                highlight: false,
              },
              {
                name: 'System Pro',
                price: '$9',
                period: '/month',
                desc: 'The complete Life Operating System.',
                features: ['Everything in Free', 'AI Planner (Zenith engine)', 'Advanced analytics dashboard', 'Growth challenges & leaderboards', 'Priority support'],
                cta: 'Get System Pro',
                highlight: true,
              },
              {
                name: 'Teams',
                price: 'TBD',
                period: '',
                desc: 'For high-performance teams.',
                features: ['Team dashboards', 'Accountability groups', 'Custom APIs', 'Admin controls'],
                cta: 'Coming Soon',
                disabled: true,
                highlight: false,
              },
            ].map(plan => (
              <div key={plan.name} style={{
                background: plan.highlight ? 'rgba(94,230,245,0.03)' : '#17181B',
                border: plan.highlight ? '1px solid rgba(94,230,245,0.25)' : '1px solid #1F1F23',
                borderRadius: 14,
                padding: '2rem',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{
                    fontFamily: "'Space Grotesk', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 700,
                    marginBottom: '0.35rem',
                    letterSpacing: '-0.02em',
                  }}>
                    {plan.name}
                    {plan.highlight && (
                      <span style={{
                        marginLeft: 8,
                        background: 'rgba(94,230,245,0.12)',
                        color: '#5EE6F5',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: 100,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        verticalAlign: 'middle',
                      }}>
                        Popular
                      </span>
                    )}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#52525B', marginBottom: '1.25rem' }}>{plan.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{
                      fontFamily: "'Space Grotesk', sans-serif",
                      fontSize: plan.price === 'TBD' ? '1.75rem' : '2.75rem',
                      fontWeight: 800,
                      letterSpacing: '-0.04em',
                      color: plan.highlight ? '#5EE6F5' : '#FFFFFF',
                    }}>
                      {plan.price}
                    </span>
                    <span style={{ fontSize: '0.85rem', color: '#52525B', fontWeight: 500 }}>{plan.period}</span>
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flexGrow: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', color: '#A1A1AA' }}>
                      <span style={{ color: '#5EE6F5', marginTop: 2, flexShrink: 0 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#5EE6F5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={plan.disabled ? undefined : onGetStarted}
                  disabled={plan.disabled}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: 10,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    cursor: plan.disabled ? 'not-allowed' : 'pointer',
                    border: plan.highlight ? 'none' : '1px solid #26272C',
                    background: plan.highlight ? '#FFFFFF' : plan.disabled ? 'transparent' : 'transparent',
                    color: plan.highlight ? '#121214' : plan.disabled ? '#3F3F46' : '#A1A1AA',
                    transition: 'all 0.2s',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onMouseEnter={e => {
                    if (!plan.disabled && !plan.highlight) {
                      e.currentTarget.style.borderColor = '#3F3F46';
                      e.currentTarget.style.color = '#FFFFFF';
                    }
                    if (plan.highlight) e.currentTarget.style.background = '#E4E4E7';
                  }}
                  onMouseLeave={e => {
                    if (!plan.disabled && !plan.highlight) {
                      e.currentTarget.style.borderColor = '#26272C';
                      e.currentTarget.style.color = '#A1A1AA';
                    }
                    if (plan.highlight) e.currentTarget.style.background = '#FFFFFF';
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 7. FOOTER ───────────────────────────────────────── */}
      <footer style={{
        padding: '3.5rem 1.5rem',
        background: '#0E0E11',
        borderTop: '1px solid #1F1F23',
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
        }}>
          <ZyrbitWordmark iconSize={20} />
          <nav style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['About', 'Privacy', 'Terms', 'Contact'].map(link => (
              <a key={link} href="#" style={{
                color: '#52525B',
                fontSize: '0.8rem',
                textDecoration: 'none',
                fontWeight: 500,
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = '#A1A1AA'}
                onMouseLeave={e => e.currentTarget.style.color = '#52525B'}
              >
                {link}
              </a>
            ))}
          </nav>
          <p style={{ fontSize: '0.75rem', color: '#3F3F46' }}>
            © 2026 Zyrbit — All rights reserved.
          </p>
        </div>
      </footer>

      {/* ── Global keyframes ────────────────────────────────── */}
      <style>{`
        @keyframes navFadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 640px) {
          /* Stack features to single column on small screens */
          [data-feat-grid] > div[style*="span 2"] {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </div>
  );
}
