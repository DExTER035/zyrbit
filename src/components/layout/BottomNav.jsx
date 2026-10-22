/**
 * BottomNav — Zyrbit Mobile Shell Navigation
 * Approved 5-Position Dark Charcoal Architecture matching Visual Reference:
 * 1. Home (/zenith)
 * 2. Track (/track, /growth, /food, /health, /wealth)
 * 3. [Elevated Petrol Teal FAB (+)] -> Quick Add 5-Destination Launcher
 * 4. Insights (/insights)
 * 5. Your Space (/profile, /space)
 *
 * Visual Style: Dark Charcoal (#111A20), Petrol Teal (#174A55), Soft Teal (#DDE9EB), Muted (#7E948A)
 */
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, TrendingUp, User, Plus, X } from 'lucide-react';
import QuickAddSheet from './QuickAddSheet.jsx';

export default function BottomNav({ activeTab: propActiveTab, onTabChange }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Automatically derive active position from current pathname
  const currentPath = location.pathname;
  let resolvedTab = propActiveTab || 'zenith';
  if (currentPath === '/' || currentPath === '/zenith') {
    resolvedTab = 'zenith';
  } else if (
    currentPath === '/track' ||
    currentPath === '/growth' ||
    currentPath === '/food' ||
    currentPath === '/health' ||
    currentPath === '/wealth' ||
    currentPath === '/challenge'
  ) {
    resolvedTab = 'track';
  } else if (currentPath === '/insights' || currentPath === '/stats') {
    resolvedTab = 'insights';
  } else if (currentPath === '/profile' || currentPath === '/space') {
    resolvedTab = 'profile';
  }

  const toggleQuickAdd = () => {
    setIsQuickAddOpen((prev) => !prev);
  };

  const handleSelectAction = (action) => {
    setIsQuickAddOpen(false);
    if (action.route) {
      navigate(action.route);
      if (onTabChange) onTabChange(action.id);
    }
  };

  const handleTabClick = (id) => {
    if (onTabChange) {
      onTabChange(id);
    }
    switch (id) {
      case 'zenith':
      case 'home':
        navigate('/zenith');
        break;
      case 'track':
        navigate('/track');
        break;
      case 'insights':
        navigate('/insights');
        break;
      case 'profile':
      case 'space':
        navigate('/profile');
        break;
      default:
        break;
    }
  };

  const renderTab = (id, label, TabIcon) => {
    const isActive = resolvedTab === id;
    const activeColor = '#FFFFFF';
    const inactiveColor = '#7E948A';

    return (
      <button
        key={id}
        id={`nav-tab-${id}`}
        type="button"
        onClick={() => handleTabClick(id)}
        aria-label={`Go to ${label}`}
        aria-current={isActive ? 'page' : undefined}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '6px 0 4px',
          transition: 'all 0.16s ease',
          userSelect: 'none',
          outline: 'none',
        }}
      >
        {React.createElement(TabIcon, {
          size: 20,
          strokeWidth: isActive ? 2.5 : 1.8,
          color: isActive ? activeColor : inactiveColor,
          style: {
            transition: 'color 0.16s ease, transform 0.16s ease',
            transform: isActive ? 'scale(1.06)' : 'scale(1)',
          },
        })}
        <span
          style={{
            fontSize: '10.5px',
            fontWeight: isActive ? 750 : 500,
            color: isActive ? activeColor : inactiveColor,
            letterSpacing: '-0.01em',
            fontFamily: "'Inter', -apple-system, sans-serif",
            transition: 'color 0.16s ease',
          }}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="bottom-nav-mobile"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          boxSizing: 'border-box',
          backgroundColor: '#111A20',
          borderTop: '1px solid #22282C',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)',
          paddingTop: '6px',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          zIndex: 100,
        }}
      >
        {renderTab('zenith', 'Home', Home)}
        {renderTab('track', 'Track', Compass)}

        {/* Central Elevated Quick-Add FAB matching reference design */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <button
            type="button"
            id="nav-tab-quick-add"
            onClick={toggleQuickAdd}
            aria-label={isQuickAddOpen ? 'Close quick add launcher' : 'Open quick add launcher'}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#174A55',
              border: '3px solid #111A20',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              top: '-14px',
              boxShadow: '0 4px 16px rgba(23, 74, 85, 0.45)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              outline: 'none',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.93)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isQuickAddOpen ? (
              <X size={22} strokeWidth={2.8} />
            ) : (
              <Plus size={22} strokeWidth={2.8} />
            )}
          </button>
        </div>

        {renderTab('insights', 'Insights', TrendingUp)}
        {renderTab('profile', 'Your Space', User)}
      </nav>

      {/* Quick Add Sheet Modal */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSelectAction={handleSelectAction}
      />
    </>
  );
}
