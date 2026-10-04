/**
 * BottomNav — Zyrbit Unified Mobile Shell Navigation
 * 5-Anchor Architecture: Zenith | Growth | [DEX Orb] | Health | Wealth
 * Visual Style: Master Obsidian (#0E0F13), Zyrbit Amber (#E9B44C), Muted (#9A978F)
 */
import React from 'react';
import { Compass, TrendingUp, Activity, Wallet } from 'lucide-react';

const TAB_CONFIG = {
  zenith: { label: 'Zenith', Icon: Compass },
  growth: { label: 'Growth', Icon: TrendingUp },
  health: { label: 'Health', Icon: Activity },
  wealth: { label: 'Wealth', Icon: Wallet },
};

export default function BottomNav({ activeTab, onTabChange }) {
  const handleOpenDex = () => {
    window.dispatchEvent(new CustomEvent('dexos:open-dex'));
  };

  const renderTab = (id) => {
    const { label, Icon } = TAB_CONFIG[id];
    const isActive = activeTab === id;
    const activeColor = '#E9B44C';
    const inactiveColor = '#9A978F';

    return (
      <button
        key={id}
        id={`nav-tab-${id}`}
        onClick={() => onTabChange(id)}
        aria-label={`Go to ${label}`}
        aria-current={isActive ? 'page' : undefined}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '3px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '6px 0',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Subtle active indicator dot */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isActive ? '16px' : '0px',
          height: '2px',
          background: activeColor,
          borderRadius: '2px',
          boxShadow: isActive ? '0 0 8px rgba(233, 180, 76, 0.6)' : 'none',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        <Icon
          size={19}
          strokeWidth={isActive ? 2.2 : 1.6}
          color={isActive ? activeColor : inactiveColor}
          style={{
            transition: 'all 0.2s',
            filter: isActive ? 'drop-shadow(0 0 6px rgba(233,180,76,0.3))' : 'none',
          }}
        />
        <span style={{
          fontSize: '10px',
          fontWeight: isActive ? 700 : 500,
          color: isActive ? activeColor : inactiveColor,
          letterSpacing: '0.04em',
          transition: 'color 0.2s',
        }}>
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Main navigation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        maxWidth: '100vw',
        background: 'rgba(14, 15, 19, 0.96)',
        borderTop: '1px solid #26272D',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '8px 12px 18px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {renderTab('zenith')}
      {renderTab('growth')}

      {/* Center Dex Luminous Command Orb */}
      <button
        type="button"
        id="nav-tab-dex"
        onClick={handleOpenDex}
        aria-label="Open Dex Command Operator"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #38BDF8 0%, #0284C7 45%, #0B1E33 100%)',
            border: '1.5px solid rgba(56, 189, 248, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.4), inset 0 0 8px rgba(255,255,255,0.4)',
            transition: 'all 0.25s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 0 22px rgba(56, 189, 248, 0.6), inset 0 0 10px rgba(255,255,255,0.6)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.4), inset 0 0 8px rgba(255,255,255,0.4)';
          }}
        >
          {/* Subtle inner core ripple ring */}
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.6)',
            background: 'rgba(255,255,255,0.2)',
          }} />
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          color: '#38BDF8',
          letterSpacing: '0.04em',
          marginTop: '3px',
        }}>
          Dex
        </span>
      </button>

      {renderTab('health')}
      {renderTab('wealth')}
    </nav>
  );
}
