import React from 'react'
import { BrandButton } from '../components/ui/BrandPrimitives.jsx'

/**
 * Screen 1 — Welcome (Front Screen)
 * Approved visual design matching Phone 2 in the Figma reference:
 * - Warm Ivory background (#F4F0E8).
 * - Top Zyrbit wordmark + PERSONAL OS tracking.
 * - Bold headline: "Your life. / In focus."
 * - Supporting copy: "Habits. Health. Wealth. / Growth. All in one place."
 * - Panoramic snow mountain image (/assets/welcome_mountain_light.jpg) with rounded corners and soft bottom fade.
 * - 3-dot carousel indicator.
 * - Primary Petrol Teal "Get Started" button.
 * - Secondary "Sign In" button.
 */
export default function WelcomeScreen({ onGetStarted, onSignIn, onGuest }) {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        minHeight: '100dvh',
        width: '100vw',
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#F4F0E8',
        color: '#111A20',
        fontFamily: "'Inter', sans-serif",
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '430px',
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: 'max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 24px) 24px',
        }}
      >
        {/* Top Header: Brand Wordmark & Personal OS Subheading */}
        <header style={{ paddingTop: '4px' }}>
          <div
            style={{
              fontFamily: "'Space Grotesk', 'Inter', sans-serif",
              fontSize: '12.5px',
              fontWeight: 750,
              letterSpacing: '0.22em',
              color: '#111A20',
              textTransform: 'uppercase',
            }}
          >
            ZYRBIT
          </div>
          <div
            style={{
              marginTop: '4px',
              fontSize: '9.5px',
              fontWeight: 600,
              letterSpacing: '0.24em',
              color: '#68777B',
              textTransform: 'uppercase',
            }}
          >
            PERSONAL OS
          </div>
        </header>

        {/* Editorial Headline & Supporting Copy */}
        <section style={{ marginTop: '24px', marginBottom: '16px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(34px, 9vw, 42px)',
              lineHeight: 1.1,
              letterSpacing: '-0.025em',
              fontWeight: 800,
              color: '#111A20',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Your life.
            <br />
            In focus.
          </h1>

          <p
            style={{
              margin: '12px 0 0 0',
              fontSize: '14px',
              lineHeight: 1.5,
              color: '#68777B',
              fontWeight: 450,
            }}
          >
            Habits. Health. Wealth.
            <br />
            Growth. All in one place.
          </p>
        </section>

        {/* Center Visual: Panoramic Snow Mountain Image with soft bottom blend */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '240px',
            borderRadius: '20px',
            overflow: 'hidden',
            margin: 'auto 0',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.06)',
            backgroundColor: '#EBE6DC',
          }}
        >
          <img
            src="/assets/welcome_mountain_light.jpg"
            alt="Zyrbit Alpine Mountain Peak"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 45%',
              display: 'block',
            }}
          />
          {/* Subtle soft gradient fade into the warm ivory surface */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '60px',
              background: 'linear-gradient(to bottom, transparent, rgba(244, 240, 232, 0.6) 65%, #F4F0E8 100%)',
              pointerEvents: 'none',
            }}
          />
        </div>

        {/* 3-Dot Carousel Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            marginTop: '8px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '18px',
              height: '4px',
              borderRadius: '999px',
              backgroundColor: '#174A55',
            }}
          />
          <div
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#D8D3CA',
            }}
          />
          <div
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: '#D8D3CA',
            }}
          />
        </div>

        {/* Bottom Actions: Get Started & Sign In */}
        <footer
          style={{
            marginTop: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <BrandButton
            variant="primary"
            onClick={onGetStarted}
            style={{
              height: '52px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Get Started
          </BrandButton>

          <BrandButton
            variant="secondary"
            onClick={onSignIn}
            style={{
              height: '52px',
              borderRadius: '14px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Sign In
          </BrandButton>

          {onGuest && (
            <button
              type="button"
              onClick={onGuest}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#68777B',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: '6px 0',
                textAlign: 'center',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                fontFamily: 'inherit',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#111A20'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#68777B'; }}
            >
              Continue as Guest
            </button>
          )}
        </footer>
      </div>
    </main>
  )
}