import React, { useEffect } from 'react';
import { Sparkles } from 'lucide-react';

export default function DexLauncher({ onClick }) {
  // Register Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick]);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Dex Operator (Ctrl+K)"
      title="Open Dex Operator (Ctrl+K)"
      style={{
        position: 'fixed',
        bottom: '84px',
        right: '20px',
        zIndex: 49,
        background: '#15181B',
        border: '1px solid #2A3039',
        borderRadius: '30px',
        padding: '8px 14px 8px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#1FA36F';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.7), 0 0 12px rgba(31, 163, 111, 0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#2A3039';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)';
      }}
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(31, 163, 111, 0.15)',
          border: '1px solid rgba(31, 163, 111, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1FA36F',
        }}
      >
        <Sparkles size={13} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: '#F5F5F5',
            fontFamily: 'monospace',
          }}
        >
          DEX
        </span>
        <span
          style={{
            fontSize: '10px',
            color: '#6B7280',
            background: '#1A1E24',
            padding: '2px 5px',
            borderRadius: '4px',
            border: '1px solid #2B313A',
            fontWeight: 500,
          }}
        >
          Ctrl+K
        </span>
      </div>
    </button>
  );
}
