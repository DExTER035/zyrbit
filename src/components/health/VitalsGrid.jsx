import React from 'react';

export default function VitalsGrid({ children }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px',
      width: '100%',
      marginBottom: '6px'
    }}>
      {children}
    </div>
  );
}
