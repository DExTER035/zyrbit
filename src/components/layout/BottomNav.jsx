/**
 * BottomNav — Zyrbit Mobile Shell Navigation
 * Approved 5-Anchor Architecture matching Visual Reference:
 * Home | Growth/Health/Wealth | [Elevated Petrol Teal FAB (+)] | Dex | Profile
 * Visual Style: Petrol Teal (#174A55), Warm Ivory (#F4F0E8), Surface White (#FFFFFF), Border (#E5E0D8)
 */
import React, { useState } from 'react';
import { Home, TrendingUp, Activity, Wallet, Sparkles, User, Plus, X } from 'lucide-react';
import QuickAddSheet from './QuickAddSheet.jsx';

export default function BottomNav({ activeTab = 'zenith', onTabChange }) {
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const toggleQuickAdd = () => {
    setIsQuickAddOpen((prev) => !prev);
  };

  const handleSelectAction = (action) => {
    if (action.route) {
      if (action.route === '/food' || action.route === '/health') {
        if (onTabChange) onTabChange('health');
        else window.location.href = action.route;
      } else if (action.route.startsWith('/')) {
        const tab = action.route.slice(1).split('?')[0];
        if (onTabChange) onTabChange(tab);
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

  // Second tab dynamically reflects active domain if on Health or Wealth
  let secondTab = { id: 'growth', label: 'Growth', Icon: TrendingUp };
  if (activeTab === 'health' || activeTab === 'food') {
    secondTab = { id: 'health', label: 'Health', Icon: Activity };
  } else if (activeTab === 'wealth') {
    secondTab = { id: 'wealth', label: 'Wealth', Icon: Wallet };
  }

  const renderTab = (id, label, Icon) => {
    const isActive = activeTab === id || (id === 'zenith' && activeTab === 'home');
    const activeColor = 'var(--brand-petrol, #174A55)';
    const inactiveColor = 'var(--brand-text-sub, #6B7B82)';

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
        <Icon
          size={21}
          strokeWidth={isActive ? 2.4 : 1.8}
          color={isActive ? activeColor : inactiveColor}
          style={{
            transition: 'color 0.16s ease, transform 0.16s ease',
            transform: isActive ? 'scale(1.05)' : 'scale(1)',
          }}
        />
        <span
          style={{
            fontSize: '11px',
            fontWeight: isActive ? 700 : 500,
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
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid var(--brand-border, #E5E0D8)',
          boxShadow: '0 -2px 14px rgba(0, 0, 0, 0.04)',
          paddingTop: '6px',
          paddingLeft: '12px',
          paddingRight: '12px',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          zIndex: 100,
        }}
      >
        {renderTab('zenith', 'Home', Home)}
        {renderTab(secondTab.id, secondTab.label, secondTab.Icon)}

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
            aria-label={isQuickAddOpen ? 'Close quick add menu' : 'Open quick add menu'}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-petrol, #174A55)',
              border: '3px solid #FFFFFF',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
              top: '-14px',
              boxShadow: '0 4px 16px rgba(23, 74, 85, 0.35)',
              transition: 'transform 0.18s ease, box-shadow 0.18s ease',
              outline: 'none',
            }}
            onMouseDown={(e) => {
              e.currentTarget.style.transform = 'scale(0.94)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {isQuickAddOpen ? (
              <X size={23} strokeWidth={2.8} />
            ) : (
              <Plus size={23} strokeWidth={2.8} />
            )}
          </button>
        </div>

        {renderTab('dex', 'Dex', Sparkles)}
        {renderTab('profile', 'Profile', User)}
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
