import React, { useState, useEffect } from 'react'
import { SharedMockupFrame } from '../components/showcase/SharedMockupFrame.jsx'
import { HomeMockupView } from '../components/showcase/HomeMockupView.jsx'
import { TrackMockupView } from '../components/showcase/TrackMockupView.jsx'
import { QuickAddMockupView } from '../components/showcase/QuickAddMockupView.jsx'
import { InsightsMockupView } from '../components/showcase/InsightsMockupView.jsx'
import { YourSpaceMockupView } from '../components/showcase/YourSpaceMockupView.jsx'
import { DesktopLayoutView } from '../components/showcase/DesktopLayoutView.jsx'

/**
 * Showcase5Tabs
 * Complete High-Fidelity Presentation of Zyrbit Personal OS:
 * 1. Home — Daily Command Center
 * 2. Track — Growth, Health, Wealth
 * 3. Quick Add — Fast Activity Logging
 * 4. Insights — Personal Analytics
 * 5. Your Space — Profile and Settings
 * 
 * Includes toggle to corresponding Desktop Layout.
 */
export default function Showcase5Tabs() {
  // Viewport Control for previewing: 'mobile' (~390px) | 'tablet' (768px) | 'desktop' (Full)
  const [previewViewport, setPreviewViewport] = useState('mobile')

  // Screen Selector: 'all' | 'home' | 'track' | 'add' | 'insights' | 'space' | 'desktop'
  const [viewMode, setViewMode] = useState('all')
  const [scale, setScale] = useState(0.85) // zoom level for desktop side-by-side presentation
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false)

  // Real browser window width detection (e.g. Chrome DevTools mobile emulation)
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  )

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Auto-adapt viewport if real browser window is mobile width
  const isActualMobile = windowWidth <= 640

  const handleTabClick = (tabKey) => {
    if (tabKey === 'add') {
      setIsQuickAddOpen(true)
    } else {
      setViewMode(tabKey)
      setIsQuickAddOpen(false)
    }
  }

  const renderSingleView = (tabKey) => {
    switch (tabKey) {
      case 'home':
        return <HomeMockupView />
      case 'track':
        return <TrackMockupView />
      case 'add':
        return <QuickAddMockupView />
      case 'insights':
        return <InsightsMockupView />
      case 'space':
        return <YourSpaceMockupView />
      default:
        return <HomeMockupView />
    }
  }

  const getTabLabel = (tabKey) => {
    switch (tabKey) {
      case 'home':
        return 'Home — Daily Command Center'
      case 'track':
        return 'Track — Four Spaces (Growth, Food, Health, Wealth)'
      case 'add':
        return 'Quick Add — 5-Destination Launcher'
      case 'insights':
        return 'Insights — Personal Analytics'
      case 'space':
        return 'Your Space — Profile & Settings'
      default:
        return 'Zyrbit Personal OS'
    }
  }

  // Quick Add Interactive Modal Sheet Overlay
  const renderQuickAddOverlay = () => {
    if (!isQuickAddOpen) return null
    return (
      <div
        id="quick-add-interactive-modal"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(17, 26, 32, 0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.18s ease-out',
        }}
        onClick={() => setIsQuickAddOpen(false)}
      >
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderTopLeftRadius: '24px',
            borderTopRightRadius: '24px',
            padding: '18px 16px 24px 16px',
            boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Drag Handle & Dismiss Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ width: '36px', height: '4px', backgroundColor: '#E5E0D8', borderRadius: '2px' }} />
            <button
              id="btn-dismiss-quick-add"
              type="button"
              onClick={() => setIsQuickAddOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                padding: '4px 8px',
                color: '#68777B',
                fontSize: '12.5px',
                fontWeight: 650,
                cursor: 'pointer',
              }}
            >
              ✕ Dismiss
            </button>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#111A20' }}>Quick Add</div>
            <div style={{ fontSize: '12px', color: '#68777B', marginTop: '2px' }}>
              Where would you like to record an update?
            </div>
          </div>

          {/* 5 Quick Destinations Launcher */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              {
                id: 'growth',
                title: 'Growth',
                subtitle: 'Tasks, focus sprints, and goals',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                ),
              },
              {
                id: 'food',
                title: 'Food',
                subtitle: 'Meals, macronutrients, and water',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 2v20M6 2v7a3 3 0 0 0 3 3v10M6 2h6" />
                  </svg>
                ),
              },
              {
                id: 'health',
                title: 'Health',
                subtitle: 'Sleep, workouts, and recovery',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                ),
              },
              {
                id: 'wealth',
                title: 'Wealth',
                subtitle: 'Expenses, income, and bills',
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="14" x="2" y="5" rx="2" />
                    <line x1="2" x2="22" y1="10" y2="10" />
                  </svg>
                ),
              },
            ].map((item) => (
              <div
                key={item.id}
                onClick={() => { setViewMode(item.id === 'growth' ? 'track' : item.id === 'food' ? 'track' : item.id === 'health' ? 'track' : 'track'); setIsQuickAddOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  backgroundColor: '#F4F0E8',
                  border: '1.5px solid #E5E0D8',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: '#DDE9EB',
                      color: '#174A55',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111A20' }}>{item.title}</div>
                    <div style={{ fontSize: '11px', color: '#68777B' }}>{item.subtitle}</div>
                  </div>
                </div>
                <span style={{ color: '#68777B', fontSize: '15px' }}>›</span>
              </div>
            ))}

            {/* Destination 5: Ask Dex */}
            <div
              onClick={() => { setIsQuickAddOpen(false) }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 14px',
                borderRadius: '14px',
                backgroundColor: '#174A55',
                color: '#FFFFFF',
                cursor: 'pointer',
                marginTop: '4px',
                boxShadow: '0 4px 14px rgba(23, 74, 85, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.16)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                  }}
                >
                  ✨
                </div>
                <div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700 }}>Ask Dex</div>
                  <div style={{ fontSize: '11px', color: '#DDE9EB' }}>Get help with your next step</div>
                </div>
              </div>
              <span style={{ color: '#DDE9EB', fontSize: '14px' }}>↗</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate container max width based on selected preview viewport
  const getStageMaxWidth = () => {
    if (isActualMobile) return '100%'
    if (previewViewport === 'mobile') return '430px'
    if (previewViewport === 'tablet') return '780px'
    return '100%'
  }

  // Determine whether to use compact phone frame styling
  const isCompactFrame = isActualMobile || previewViewport === 'mobile'

  return (
    <div
      id="showcase-root-container"
      style={{
        minHeight: '100dvh',
        width: '100%',
        backgroundColor: '#EAE6DE',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Presentation Control Header */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: '#FFFFFF',
          borderBottom: '1.5px solid #E5E0E8',
          padding: isActualMobile ? '10px 12px' : '10px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        }}
      >
        {/* Row 1: Brand & Viewport Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                backgroundColor: '#174A55',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '14px',
              }}
            >
              Z
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#111A20', letterSpacing: '-0.01em' }}>
                ZYRBIT PERSONAL OS SHOWCASE
              </div>
              <div style={{ fontSize: '10.5px', color: '#68777B' }}>
                Preview & Navigation Inspector
              </div>
            </div>
          </div>

          {/* Viewport Control: Mobile | Tablet | Desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#68777B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Viewport:
            </span>
            <div
              id="viewport-controls-container"
              style={{
                display: 'flex',
                backgroundColor: '#F4F0E8',
                padding: '2px',
                borderRadius: '10px',
                border: '1px solid #E5E0D8',
              }}
            >
              <button
                id="btn-viewport-mobile"
                type="button"
                onClick={() => setPreviewViewport('mobile')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: previewViewport === 'mobile' ? '#174A55' : 'transparent',
                  color: previewViewport === 'mobile' ? '#FFFFFF' : '#111A20',
                  fontSize: '11px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📱 Mobile (390px)
              </button>
              <button
                id="btn-viewport-tablet"
                type="button"
                onClick={() => setPreviewViewport('tablet')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: previewViewport === 'tablet' ? '#174A55' : 'transparent',
                  color: previewViewport === 'tablet' ? '#FFFFFF' : '#111A20',
                  fontSize: '11px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📱 Tablet (768px)
              </button>
              <button
                id="btn-viewport-desktop"
                type="button"
                onClick={() => setPreviewViewport('desktop')}
                style={{
                  padding: '5px 10px',
                  borderRadius: '7px',
                  border: 'none',
                  backgroundColor: previewViewport === 'desktop' ? '#174A55' : 'transparent',
                  color: previewViewport === 'desktop' ? '#FFFFFF' : '#111A20',
                  fontSize: '11px',
                  fontWeight: 650,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                💻 Desktop (Full)
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Screen Selector & Zoom Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          {/* Screen Selector Tabs */}
          <div
            id="screen-selector-tabs"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              backgroundColor: '#F4F0E8',
              padding: '2px',
              borderRadius: '10px',
              border: '1px solid #E5E0D8',
              gap: '2px',
            }}
          >
            <button
              id="btn-view-all"
              type="button"
              onClick={() => { setViewMode('all'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'all' ? '#174A55' : 'transparent',
                color: viewMode === 'all' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📱 All 5 Tabs
            </button>
            <button
              id="btn-view-home"
              type="button"
              onClick={() => { setViewMode('home'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'home' ? '#174A55' : 'transparent',
                color: viewMode === 'home' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              1. Home
            </button>
            <button
              id="btn-view-track"
              type="button"
              onClick={() => { setViewMode('track'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'track' ? '#174A55' : 'transparent',
                color: viewMode === 'track' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              2. Track (4 Domains)
            </button>
            <button
              id="btn-view-add"
              type="button"
              onClick={() => { setViewMode('add'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'add' ? '#174A55' : 'transparent',
                color: viewMode === 'add' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              3. Quick Add (5 Dests)
            </button>
            <button
              id="btn-view-insights"
              type="button"
              onClick={() => { setViewMode('insights'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'insights' ? '#174A55' : 'transparent',
                color: viewMode === 'insights' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              4. Insights
            </button>
            <button
              id="btn-view-space"
              type="button"
              onClick={() => { setViewMode('space'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'space' ? '#174A55' : 'transparent',
                color: viewMode === 'space' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              5. Your Space
            </button>
            <button
              id="btn-view-desktop"
              type="button"
              onClick={() => { setViewMode('desktop'); setIsQuickAddOpen(false) }}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: viewMode === 'desktop' ? '#174A55' : 'transparent',
                color: viewMode === 'desktop' ? '#FFFFFF' : '#111A20',
                fontSize: '11px',
                fontWeight: 650,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              💻 Desktop
            </button>
          </div>

          {/* Quick Action: Open / Test Quick Add Sheet */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              id="btn-test-quick-add-toggle"
              type="button"
              onClick={() => setIsQuickAddOpen(!isQuickAddOpen)}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: '1px solid #174A55',
                backgroundColor: isQuickAddOpen ? '#174A55' : '#FFFFFF',
                color: isQuickAddOpen ? '#FFFFFF' : '#174A55',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isQuickAddOpen ? '✕ Close Quick Add' : '+ Test Quick Add Sheet'}
            </button>

            {/* Zoom Controls for Desktop All-Tabs presentation */}
            {viewMode === 'all' && previewViewport === 'desktop' && !isActualMobile && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}>
                {[0.7, 0.85, 1].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    style={{
                      padding: '4px 7px',
                      borderRadius: '6px',
                      border: '1px solid #E5E0D8',
                      backgroundColor: scale === s ? '#111A20' : '#FFFFFF',
                      color: scale === s ? '#FFFFFF' : '#111A20',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {s === 0.7 ? 'Fit' : `${Math.round(s * 100)}%`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Presentation Stage */}
      <main
        style={{
          flex: 1,
          padding: isActualMobile ? '16px 8px 30px 8px' : '24px 16px 40px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          overflowX: 'auto',
          width: '100%',
        }}
      >
        <div
          id="showcase-viewport-stage"
          style={{
            width: '100%',
            maxWidth: getStageMaxWidth(),
            display: 'flex',
            justifyContent: 'center',
            boxSizing: 'border-box',
            transition: 'max-width 0.25s ease',
          }}
        >
          {viewMode === 'desktop' ? (
            /* Corresponding Provisional Desktop Layout */
            <div style={{ width: '100%', maxWidth: '1440px' }}>
              <DesktopLayoutView />
            </div>
          ) : viewMode === 'all' ? (
            /* Overview of All 5 Tabs */
            previewViewport === 'desktop' && !isActualMobile ? (
              /* Desktop Wide Presentation Frame */
              <div
                id="mockups-presentation-container"
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '24px',
                  transform: `scale(${scale})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease',
                  paddingBottom: '40px',
                }}
              >
                <SharedMockupFrame label="Home — Zyrbit" activeTab="home" onTabClick={handleTabClick} customMaxWidth="390px">
                  <HomeMockupView />
                </SharedMockupFrame>
                <SharedMockupFrame label="Track — Zyrbit" activeTab="track" onTabClick={handleTabClick} customMaxWidth="390px">
                  <TrackMockupView />
                </SharedMockupFrame>
                <SharedMockupFrame label="Quick Add — Zyrbit" activeTab="add" onTabClick={handleTabClick} customMaxWidth="390px">
                  <QuickAddMockupView />
                </SharedMockupFrame>
                <SharedMockupFrame label="Insights — Zyrbit" activeTab="insights" onTabClick={handleTabClick} customMaxWidth="390px">
                  <InsightsMockupView />
                </SharedMockupFrame>
                <SharedMockupFrame label="Your space — Zyrbit" activeTab="space" onTabClick={handleTabClick} customMaxWidth="390px">
                  <YourSpaceMockupView />
                </SharedMockupFrame>
              </div>
            ) : (
              /* Mobile / Narrow Viewport Responsive Overview: Stacked / Scrollable Previews with Quick Inspection */
              <div
                id="mobile-overview-container"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px',
                  width: '100%',
                  alignItems: 'center',
                  boxSizing: 'border-box',
                }}
              >
                {/* Responsive Guidance Banner */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: '390px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1.5px solid #E5E0D8',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 750, color: '#174A55', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📱</span>
                    <span>Responsive Mobile Inspection</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#68777B', lineHeight: 1.4 }}>
                    Viewing at realistic phone width (~390px). Select any tab below or in the top bar to inspect each screen full size with interactive navigation.
                  </div>
                </div>

                {/* Stacked Previews at 390px Phone Width with Inspect Button */}
                {[
                  { id: 'home', label: '1. Home — Daily Command Center', comp: <HomeMockupView /> },
                  { id: 'track', label: '2. Track — Four Spaces (Growth, Food, Health, Wealth)', comp: <TrackMockupView /> },
                  { id: 'add', label: '3. Quick Add — 5-Destination Launcher', comp: <QuickAddMockupView /> },
                  { id: 'insights', label: '4. Insights — Personal Analytics', comp: <InsightsMockupView /> },
                  { id: 'space', label: '5. Your Space — Profile & Settings', comp: <YourSpaceMockupView /> },
                ].map((item) => (
                  <div
                    key={item.id}
                    style={{
                      width: '100%',
                      maxWidth: '390px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#111A20' }}>{item.label}</span>
                      <button
                        type="button"
                        onClick={() => { setViewMode(item.id); setIsQuickAddOpen(false) }}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid #174A55',
                          backgroundColor: '#174A55',
                          color: '#FFFFFF',
                          fontSize: '10.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        🔍 Full Size
                      </button>
                    </div>

                    <SharedMockupFrame
                      label={item.label}
                      activeTab={item.id}
                      onTabClick={handleTabClick}
                      customMaxWidth="390px"
                      isCompact={isCompactFrame}
                      overlay={isQuickAddOpen ? renderQuickAddOverlay() : null}
                    >
                      {item.comp}
                    </SharedMockupFrame>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Single Full-Size Interactive Phone Screen Inspection Mode */
            <div
              id="single-screen-inspection-container"
              style={{
                width: '100%',
                maxWidth: '390px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                boxSizing: 'border-box',
              }}
            >
              <SharedMockupFrame
                label={getTabLabel(viewMode)}
                activeTab={viewMode}
                onTabClick={handleTabClick}
                customMaxWidth="390px"
                isCompact={isCompactFrame}
                overlay={renderQuickAddOverlay()}
              >
                {renderSingleView(viewMode)}
              </SharedMockupFrame>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
