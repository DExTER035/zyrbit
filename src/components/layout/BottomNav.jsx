/**
 * BottomNav — Zyrbit unified navigation
 * Follows the canonical 5-slot architecture:
 * Zenith | Growth | [Dex Orbital Mark] | Health | Wealth
 * Domain colors: Amber for Growth/action, Rose/Green for Health, Cool Blue for Wealth.
 */
import React from 'react';
import { Layers, TrendingUp, Activity, Wallet, Orbit } from 'lucide-react';

const TAB_CONFIG = {
  zenith: { label: 'Zenith', Icon: Layers, color: '#F5F5F5' },
  growth: { label: 'Growth', Icon: TrendingUp, color: '#F59E0B' },
  health: { label: 'Health', Icon: Activity, color: '#1FA36F' },
  wealth: { label: 'Wealth', Icon: Wallet, color: '#38BDF8' },
};

export default function BottomNav({ activeTab, onTabChange }) {
  const handleOpenDex = () => {
    window.dispatchEvent(new CustomEvent('dexos:open-dex'));
  };

  const renderTab = (id) => {
    const { label, Icon, color } = TAB_CONFIG[id];
    const isActive = activeTab === id;
    const activeColor = color || '#F5F5F5';

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
          gap: '4px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          padding: '4px 0',
          transition: 'opacity 0.15s',
        }}
      >
        {/* Active top hairline */}
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: isActive ? '24px' : '0px',
          height: '2px',
          background: activeColor,
          borderRadius: '0 0 2px 2px',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />

        <Icon
          size={19}
          strokeWidth={isActive ? 2.2 : 1.5}
          color={isActive ? activeColor : '#6B7280'}
          style={{ transition: 'all 0.2s' }}
        />
        <span style={{
          fontSize: '9px',
          fontWeight: isActive ? 700 : 500,
          color: isActive ? activeColor : '#6B7280',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
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
        background: 'rgba(11, 13, 15, 0.94)',
        borderTop: '1px solid #1C1D21',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        padding: '8px 0 20px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 50,
      }}
    >
      {renderTab('zenith')}
      {renderTab('growth')}

      {/* Center Dex Orbital Mark */}
      <button
        type="button"
        id="nav-tab-dex"
        onClick={handleOpenDex}
        aria-label="Open Dex Operator"
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
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1.5px solid rgba(245, 158, 11, 0.4)',
          background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, rgba(11,13,15,0.6) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#F59E0B';
          e.currentTarget.style.boxShadow = '0 0 16px rgba(245, 158, 11, 0.35)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          e.currentTarget.style.boxShadow = '0 0 12px rgba(245, 158, 11, 0.2)';
        }}
        >
          <Orbit size={16} color="#F59E0B" strokeWidth={1.8} />
        </div>
        <span style={{
          fontSize: '9px',
          fontWeight: 600,
          color: '#F59E0B',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
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
