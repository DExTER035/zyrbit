import React, { useEffect } from 'react';
import { Sparkles, Mic } from 'lucide-react';

export default function DexLauncher({ onClick, onVoiceClick }) {
  // Register Cmd+K / Ctrl+K and Cmd+M / Ctrl+M keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          if (onClick) onClick();
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          if (onVoiceClick) {
            onVoiceClick();
          } else {
            window.dispatchEvent(new CustomEvent('dexos:voice-open'));
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClick, onVoiceClick]);

  const triggerVoice = (e) => {
    e.stopPropagation();
    if (onVoiceClick) {
      onVoiceClick();
    } else {
      window.dispatchEvent(new CustomEvent('dexos:voice-open'));
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '84px',
        right: '20px',
        zIndex: 49,
        background: '#15181B',
        border: '1px solid #2A3039',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        padding: '3px',
      }}
    >
      {/* Microphone Voice Trigger */}
      <button
        type="button"
        onClick={triggerVoice}
        aria-label="Voice Command (Ctrl+M)"
        title="Voice Command (Ctrl+M)"
        style={{
          background: 'none',
          border: 'none',
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#1FA36F',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(31, 163, 111, 0.18)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none';
        }}
      >
        <Mic size={15} />
      </button>

      {/* Divider */}
      <div
        style={{
          width: '1px',
          height: '16px',
          background: '#2A3039',
          margin: '0 2px',
        }}
      />

      {/* Text Command Modal Trigger */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Open Dex Operator (Ctrl+K)"
        title="Open Dex Operator (Ctrl+K)"
        style={{
          background: 'none',
          border: 'none',
          padding: '6px 12px 6px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          borderRadius: '0 26px 26px 0',
        }}
      >
        <div
          style={{
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'rgba(31, 163, 111, 0.15)',
            border: '1px solid rgba(31, 163, 111, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1FA36F',
          }}
        >
          <Sparkles size={12} />
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
    </div>
  );
}
