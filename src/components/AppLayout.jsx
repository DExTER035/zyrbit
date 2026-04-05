import React from 'react';

export default function AppLayout({ children }) {
  return (
    <div className="app-layout" style={{
      background: '#000',
      minHeight: '100vh',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {children}
    </div>
  );
}
