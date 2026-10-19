import React, { useState } from 'react'
import { supabase } from '../lib/supabase/index.js'
import {
  BrandButton,
  BrandStepProgress,
  BrandOptionCard,
} from '../components/ui/BrandPrimitives.jsx'

/**
 * Screen 4 — Goal Setup (Approved Visual Reference)
 * 
 * Features:
 * - Warm Ivory background (#F4F0E8) with subtle bottom mountain contours.
 * - Back button and 4-step progress indicator ("STEP 1 OF 4 · GOALS").
 * - Editorial serif heading: "What do you want to bring into focus?"
 * - Supporting text: "Pick any. You can change this later."
 * - 4 Selectable cards: Habits, Health, Growth, Wealth with matching icons.
 * - Selected cards: Soft Teal background (#DDE9EB), Petrol Teal border (#174A55), checkmark.
 * - Unselected cards: White background (#FFFEFB), border #E5E0D8.
 * - Primary "Continue →" button and "Skip for now" link.
 * - Preserves all 4 onboarding steps and real Supabase persistence.
 */

const GOAL_OPTIONS = [
  {
    id: 'habits',
    title: 'Habits',
    subtitle: 'Build consistency and routines',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22v-9" />
        <path d="M12 13C8 13 4 9 4 4c5 0 8 4 8 9Z" />
        <path d="M12 10c2-3 5-5 8-5 0 5-3 8-8 8" />
      </svg>
    ),
    defaultHabits: [
      { name: 'Morning Routine', icon: '🌅', zone: 'mind' },
      { name: 'Read 20 pages', icon: '📖', zone: 'growth' },
    ],
  },
  {
    id: 'health',
    title: 'Health',
    subtitle: 'Nutrition, fitness and wellbeing',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    ),
    defaultHabits: [
      { name: 'Workout 30m', icon: '🏋️', zone: 'body' },
      { name: 'Drink 2.5L Water', icon: '💧', zone: 'body' },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Study, focus and personal development',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 20V10" />
        <path d="M12 20V4" />
        <path d="M6 20v-6" />
      </svg>
    ),
    defaultHabits: [
      { name: '2hr Deep Work', icon: '💻', zone: 'mind' },
      { name: 'Review goals', icon: '🎯', zone: 'growth' },
    ],
  },
  {
    id: 'wealth',
    title: 'Wealth',
    subtitle: 'Track spending, budgets and savings',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="13" rx="3" />
        <path d="M22 11h-4a2 2 0 0 0 0 4h4" />
        <circle cx="18" cy="13" r="1" />
      </svg>
    ),
    defaultHabits: [
      { name: 'Track daily spend', icon: '📊', zone: 'soul' },
    ],
  },
]

export default function GoalSetupScreen({ onComplete, userId, onBack }) {
  const [step, setStep] = useState(1) // 1..4
  const [selectedGoals, setSelectedGoals] = useState(['habits', 'growth'])
  const [saving, setSaving] = useState(false)

  // Step 2 targets
  const [targets, setTargets] = useState({
    weight: '62',
    cgpa: '8.0',
    savings: '5000',
    study: '3',
  })

  // Step 3 rhythm
  const [wakeTime, setWakeTime] = useState('07:00')
  const [sleepTime, setSleepTime] = useState('23:00')
  const [focusLength, setFocusLength] = useState('25')

  const toggleGoal = (id) => {
    setSelectedGoals((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((g) => g !== id)
          : prev
        : [...prev, id]
    )
  }

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1)
    } else {
      handleFinalize()
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else if (onBack) {
      onBack()
    }
  }

  const handleFinalize = async () => {
    setSaving(true)
    try {
      if (userId) {
        // Collect habits to create based on chosen goals
        const habitsToAdd = []
        selectedGoals.forEach((goalId) => {
          const goal = GOAL_OPTIONS.find((g) => g.id === goalId)
          if (goal?.defaultHabits) {
            goal.defaultHabits.forEach((h) => {
              habitsToAdd.push({
                user_id: userId,
                name: h.name,
                icon: h.icon,
                zone: h.zone,
                frequency: 'daily',
                created_at: new Date().toISOString(),
              })
            })
          }
        })

        if (habitsToAdd.length > 0) {
          await supabase.from('habits').insert(habitsToAdd).catch(() => {})
        }

        // Save profile targets if profile exists
        await supabase
          .from('profiles')
          .update({
            target_weight: parseFloat(targets.weight) || 62,
            target_savings: parseFloat(targets.savings) || 5000,
            daily_study_hours: parseFloat(targets.study) || 3,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .catch(() => {})
      }
    } catch {
      // Non-fatal, continue to app
    } finally {
      setSaving(false)
      onComplete?.()
    }
  }

  const getStepLabel = () => {
    switch (step) {
      case 1:
        return 'GOALS'
      case 2:
        return 'TARGETS'
      case 3:
        return 'RHYTHM'
      case 4:
        return 'COMPANION'
      default:
        return 'SETUP'
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: '#F4F0E8',
        display: 'flex',
        justifyContent: 'center',
        boxSizing: 'border-box',
        fontFamily: "'Inter', sans-serif",
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Mountain Landscape Background Art in lower screen */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '240px',
          pointerEvents: 'none',
          overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <svg
          viewBox="0 0 430 240"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ width: '100%', height: '100%', opacity: 0.45 }}
        >
          <path
            d="M-40 180C60 140 150 160 230 110C310 60 380 90 470 50V240H-40V180Z"
            fill="url(#goal-mountain-1)"
          />
          <path
            d="M-40 200C80 170 180 210 270 170C360 130 400 160 470 140V240H-40V200Z"
            fill="url(#goal-mountain-2)"
          />
          <defs>
            <linearGradient id="goal-mountain-1" x1="215" y1="50" x2="215" y2="240" gradientUnits="userSpaceOnUse">
              <stop stopColor="#367887" stopOpacity="0.4" />
              <stop offset="1" stopColor="#174A55" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="goal-mountain-2" x1="215" y1="130" x2="215" y2="240" gradientUnits="userSpaceOnUse">
              <stop stopColor="#1E3E47" stopOpacity="0.6" />
              <stop offset="1" stopColor="#111A20" stopOpacity="0.95" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '430px',
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          padding: 'max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 24px) 24px',
        }}
      >
        {/* Top Header: Back Arrow */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '44px',
            marginBottom: '4px',
          }}
        >
          <button
            type="button"
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              cursor: 'pointer',
              padding: '8px',
              marginLeft: '-8px',
              color: '#111A20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Back"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </header>

        {/* Step Capsule Progress Indicator matching Screen 4 reference */}
        <BrandStepProgress
          currentStep={step}
          totalSteps={4}
          label={getStepLabel()}
        />

        {/* Step 1: Goals Selection (Matches Visual Reference Screen 4) */}
        {step === 1 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '32px',
                  lineHeight: 1.15,
                  fontWeight: 600,
                  fontFamily: "'Newsreader', Georgia, serif",
                  letterSpacing: '-0.025em',
                  color: '#111A20',
                }}
              >
                What do you want to
                <br />
                bring into focus?
              </h1>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13.5px',
                  color: '#68777B',
                  fontFamily: "'Inter', sans-serif",
                }}
              >
                Pick any. You can change this later.
              </p>
            </div>

            {/* 4 Selectable Goal Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {GOAL_OPTIONS.map((g) => {
                const isSelected = selectedGoals.includes(g.id)
                return (
                  <BrandOptionCard
                    key={g.id}
                    icon={g.icon}
                    title={g.title}
                    subtitle={g.subtitle}
                    selected={isSelected}
                    onClick={() => toggleGoal(g.id)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Set Initial Targets */}
        {step === 2 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '30px',
                  lineHeight: 1.15,
                  fontWeight: 600,
                  fontFamily: "'Newsreader', Georgia, serif",
                  letterSpacing: '-0.02em',
                  color: '#111A20',
                }}
              >
                Set your initial targets
              </h1>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13.5px',
                  color: '#68777B',
                }}
              >
                Add a few starting metrics to guide your dashboard.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* Target 1: Weight */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: '#DDE9EB',
                      color: '#174A55',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="3" x2="12" y2="7" />
                      <line x1="12" y1="12" x2="16" y2="10" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#111A20' }}>
                    Target weight (kg)
                  </span>
                </div>
                <input
                  type="number"
                  value={targets.weight}
                  onChange={(e) => setTargets({ ...targets, weight: e.target.value })}
                  style={{
                    width: '64px',
                    textAlign: 'right',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#111A20',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>

              {/* Target 2: CGPA / Performance */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: '#DDE9EB',
                      color: '#174A55',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#111A20' }}>
                    Target CGPA
                  </span>
                </div>
                <input
                  type="text"
                  value={targets.cgpa}
                  onChange={(e) => setTargets({ ...targets, cgpa: e.target.value })}
                  style={{
                    width: '64px',
                    textAlign: 'right',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#111A20',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>

              {/* Target 3: Monthly Savings */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: '#DDE9EB',
                      color: '#174A55',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                      <path d="M12 8a2.5 2.5 0 0 1 0 5H8" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#111A20' }}>
                    Monthly savings (₹)
                  </span>
                </div>
                <input
                  type="number"
                  value={targets.savings}
                  onChange={(e) => setTargets({ ...targets, savings: e.target.value })}
                  style={{
                    width: '80px',
                    textAlign: 'right',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#111A20',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>

              {/* Target 4: Daily Study Hours */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '12px',
                      backgroundColor: '#DDE9EB',
                      color: '#174A55',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 650, color: '#111A20' }}>
                    Daily study (hours)
                  </span>
                </div>
                <input
                  type="number"
                  value={targets.study}
                  onChange={(e) => setTargets({ ...targets, study: e.target.value })}
                  style={{
                    width: '64px',
                    textAlign: 'right',
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#111A20',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Choose Daily Rhythm */}
        {step === 3 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '30px',
                  lineHeight: 1.15,
                  fontWeight: 600,
                  fontFamily: "'Newsreader', Georgia, serif",
                  letterSpacing: '-0.02em',
                  color: '#111A20',
                }}
              >
                Choose your rhythm
              </h1>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13.5px',
                  color: '#68777B',
                }}
              >
                Anchor your day around calm, predictable routines.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {/* Morning Anchor */}
              <div
                style={{
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 650, color: '#111A20' }}>
                  🌅 Morning Anchor Time
                </div>
                <div style={{ fontSize: '12.5px', color: '#68777B', marginTop: '2px' }}>
                  When your daily momentum begins
                </div>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E5E0D8',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#111A20',
                  }}
                />
              </div>

              {/* Evening Wind-Down */}
              <div
                style={{
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 650, color: '#111A20' }}>
                  🌙 Evening Wind-down
                </div>
                <div style={{ fontSize: '12.5px', color: '#68777B', marginTop: '2px' }}>
                  Reflection and screen-free buffer
                </div>
                <input
                  type="time"
                  value={sleepTime}
                  onChange={(e) => setSleepTime(e.target.value)}
                  style={{
                    marginTop: '10px',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #E5E0D8',
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#111A20',
                  }}
                />
              </div>

              {/* Focus Session Length */}
              <div
                style={{
                  padding: '16px 18px',
                  backgroundColor: '#FFFEFB',
                  borderRadius: '16px',
                  border: '1.5px solid #E5E0D8',
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 650, color: '#111A20' }}>
                  ⏱️ Deep Focus Block
                </div>
                <div style={{ fontSize: '12.5px', color: '#68777B', marginTop: '2px' }}>
                  Default focus sprint length
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {['25', '45', '60'].map((len) => (
                    <button
                      key={len}
                      type="button"
                      onClick={() => setFocusLength(len)}
                      style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: `1.5px solid ${focusLength === len ? '#174A55' : '#E5E0D8'}`,
                        backgroundColor: focusLength === len ? '#DDE9EB' : '#FFFFFF',
                        color: focusLength === len ? '#174A55' : '#111A20',
                        fontWeight: 650,
                        cursor: 'pointer',
                      }}
                    >
                      {len} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Companion Ready */}
        {step === 4 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '24px' }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: '30px',
                  lineHeight: 1.15,
                  fontWeight: 600,
                  fontFamily: "'Newsreader', Georgia, serif",
                  letterSpacing: '-0.02em',
                  color: '#111A20',
                }}
              >
                Meet Dex, your companion
              </h1>
              <p
                style={{
                  margin: '8px 0 0 0',
                  fontSize: '13.5px',
                  color: '#68777B',
                }}
              >
                Your personal operating system is tuned and ready.
              </p>
            </div>

            <div
              style={{
                padding: '24px 20px',
                backgroundColor: '#FFFEFB',
                borderRadius: '20px',
                border: '1.5px solid #E5E0D8',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '12px',
                    backgroundColor: '#174A55',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '18px',
                  }}
                >
                  Z
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#111A20' }}>
                    Hey, I'm Dex.
                  </div>
                  <div style={{ fontSize: '13px', color: '#68777B' }}>
                    I help keep your daily system calm and clear.
                  </div>
                </div>
              </div>

              <div
                style={{
                  backgroundColor: '#F4F0E8',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '13px',
                  color: '#111A20',
                  lineHeight: 1.6,
                }}
              >
                ✓ <strong>{selectedGoals.length} focus areas</strong> configured
                <br />
                ✓ Targets calibrated (Weight: {targets.weight}kg, CGPA: {targets.cgpa}, Savings: ₹{targets.savings})
                <br />
                ✓ Daily rhythm scheduled ({wakeTime} wake, {focusLength}m focus)
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions: Continue CTA & Skip for now link */}
        <footer
          style={{
            marginTop: 'auto',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <BrandButton
            variant="primary"
            onClick={handleNext}
            loading={saving}
          >
            {step === 4 ? 'Enter Zyrbit →' : 'Continue →'}
          </BrandButton>

          <button
            type="button"
            onClick={handleFinalize}
            disabled={saving}
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: '#174A55',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '6px 12px',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Skip for now
          </button>
        </footer>
      </div>
    </div>
  )
}
