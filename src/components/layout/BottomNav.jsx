/**
 * BottomNav — Zyrbit Unified Mobile Shell Navigation
 * 5-Anchor Architecture: Home (Zenith) | Explore (Growth) | [Elevated Quick Add FAB] | Dex AI | Profile
 * Visual Style: Crisp White (#FFFFFF), Emerald Accent (#08B878), Muted (#68758A), Border (#E4EAF2)
 */
import React, { useState } from 'react';
import { Compass, Sparkles, MessageSquare, User, Plus, X } from 'lucide-react';
import QuickAddSheet from './QuickAddSheet.jsx';

const TAB_CONFIG = {
  zenith: { label: 'Home', Icon: Compass },
  growth: { label: 'Grow', Icon: Sparkles },
  dex: { label: 'Dex', Icon: MessageSquare },
  profile: { label: 'You', Icon: User },
};

export default function BottomNav({ activeTab, onTabChange }) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const toggleQuickAdd = () => {
    setIsQuickAddOpen((prev) => !prev);
  };

  const handleSelectAction = (action) => {
    if (action.route) {
      if (action.route === '/food') {
        window.location.href = '/food';
      } else if (action.route.startsWith('/')) {
        const tab = action.route.slice(1).split('?')[0];
        if (onTabChange) {
          onTabChange(tab);
        }
      }
    }
  };

  const handleTabClick = (id) => {
    if (id === 'dex') {
      window.dispatchEvent(new CustomEvent('dexos:open-dex'));
      return;
    }
    if (onTabChange) {
      onTabChange(id);
    }
  };

  const renderTab = (id) => {
    const { label, Icon } = TAB_CONFIG[id];
    const isActive = activeTab === id;
    const activeColor = '#2DE09A';
    const inactiveColor = '#7E948A';

    return (
      <button
        key={id}
        id={`nav-tab-${id}`}
        onClick={() => handleTabClick(id)}
        aria-label={`Go to ${label}`}
        aria-current={isActive ? 'page' : undefined}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '8px 0 6px',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Active indicator dot */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isActive ? '18px' : '0px',
          height: '3px',
          background: activeColor,
          borderRadius: '3px',
          boxShadow: isActive ? '0 1px 8px rgba(45, 224, 154, 0.6)' : 'none',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        <Icon
          size={20}
          strokeWidth={isActive ? 2.4 : 1.7}
          color={isActive ? activeColor : inactiveColor}
          style={{
            transition: 'all 0.2s ease',
            filter: isActive ? 'drop-shadow(0 2px 6px rgba(45, 224, 154, 0.35))' : 'none',
          }}
        />
        <span style={{
          fontSize: '11px',
          fontWeight: isActive ? 700 : 500,
          color: isActive ? activeColor : inactiveColor,
          letterSpacing: '-0.01em',
          transition: 'color 0.2s',
          fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
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
          background: '#0B120E',
          borderTop: '1px solid #1A2B23',
          boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.6)',
          padding: '6px 12px calc(10px + env(safe-area-inset-bottom, 0px))',
          alignItems: 'center',
          zIndex: 100,
        }}
      >
        {renderTab('zenith')}
        {renderTab('growth')}

        {/* Center Elevated Quick-Add FAB matching reference design */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          <button
            type="button"
            id="nav-tab-quick-add"
            onClick={toggleQuickAdd}
            aria-label={isQuickAddOpen ? 'Close quick add menu' : 'Open quick add menu'}
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '50%',
              background: '#2DE09A',
              border: '3px solid #0B120E',
              color: '#080E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              top: '-16px',
              boxShadow: '0 6px 20px rgba(45, 224, 154, 0.45)',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.08)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(45, 224, 154, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(45, 224, 154, 0.45)';
            }}
          >
            {isQuickAddOpen ? (
              <X size={24} strokeWidth={2.8} />
            ) : (
              <Plus size={24} strokeWidth={2.8} />
            )}
          </button>
        </div>

        {renderTab('dex')}
        {renderTab('profile')}
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

