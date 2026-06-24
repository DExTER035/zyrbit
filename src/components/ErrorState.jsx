import React from 'react';
import { RefreshCcw, AlertTriangle } from 'lucide-react';
import { C } from '../components/growth/shared.jsx'; // We can use shared colors or hardcode if needed, let's use standard graphite colors.

export default function ErrorState({ message, onRetry }) {
  // Use standard graphite theme colors fallback if C isn't perfectly mapped.
  const bg = 'var(--bg-card, #1C1D21)';
  const border = 'var(--border, #2A2B30)';
  const text = 'var(--text-main, #FFFFFF)';
  const muted = 'var(--text-muted, #8E8F94)';
  const errorColor = 'var(--color-error, #FF453A)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: '20px',
      textAlign: 'center',
      margin: '20px 0'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: `${errorColor}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '16px'
      }}>
        <AlertTriangle size={24} color={errorColor} />
      </div>
      
      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 800, color: text }}>
        Sync Failed
      </h3>
      
      <p style={{ margin: '0 0 24px 0', fontSize: '13px', color: muted, maxWidth: '280px', lineHeight: 1.5 }}>
        {message || 'Could not fetch data from the database. Please check your connection and schema.'}
      </p>

      {onRetry && (
        <button 
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: `${text}10`,
            border: `1px solid ${border}`,
            padding: '10px 20px',
            borderRadius: '12px',
            color: text,
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
        >
          <RefreshCcw size={14} />
          Retry Connection
        </button>
      )}
    </div>
  );
}
