import React from 'react';
import Logo from './Logo';

export default function DesktopTopBar({ activeTab, setActiveTab }) {
  // Try to parse Zyrons and score from localStorage
  const zyrons = parseInt(localStorage.getItem('zyrbit_zyrons') || '0', 10);
  const user = JSON.parse(localStorage.getItem('zyrbit_profile') || '{"username": "Pilot"}');

  return (
    <div style={{
      height: 60,
      background: '#000',
      borderBottom: '1px solid #1A1A24',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      justifyContent: 'space-between',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Logo size={32} />
        <span style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
          Zyr<span style={{ color: '#00FFFF' }}>bit</span>
        </span>
      </div>
      
      <div style={{ flex: 1, maxWidth: 400, margin: '0 24px' }}>
        <input 
          type="text" 
          placeholder="Search habits or entries..." 
          style={{
            width: '100%',
            background: '#111118',
            border: '1px solid #222230',
            borderRadius: 8,
            padding: '8px 16px',
            color: '#fff',
            fontSize: 14,
            outline: 'none'
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          background: '#0a1a1e',
          border: '1px solid #00FFFF30',
          padding: '4px 12px',
          borderRadius: 20,
          color: '#00FFFF',
          fontSize: 13,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>⚡</span> {zyrons}
        </div>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: '#1E1E28',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer'
        }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
      </div>
    </div>
  );
}
