import React from 'react';

export default function AppLayout({ children }) {
  return (
    <div style={{
      background: '#000',
      minHeight: '100vh',
      maxWidth: '430px',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid #1A1A24',
      borderRight: '1px solid #1A1A24',
      boxShadow: '0 0 50px rgba(0,255,255,0.03)'
    }}>
      {children}
    </div>
  );
}
