import React from 'react';

export default function DesktopSidebar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 0, name: 'Orbit', icon: '🪐' },
    { id: 1, name: 'Journal', icon: '📓' },
    { id: 2, name: 'Stats', icon: '📊' },
    { id: 3, name: 'Zyra', icon: '🤖' },
    { id: 4, name: 'Community', icon: '🌍' }
  ];

  return (
    <div style={{
      width: 220,
      background: '#000',
      borderRight: '1px solid #1A1A24',
      padding: '24px 12px',
      position: 'fixed',
      left: 0,
      top: 60,
      height: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      overflowY: 'auto'
    }}>
      <div style={{ padding: '0 12px 16px', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#555566', textTransform: 'uppercase' }}>
        Navigation
      </div>
      
      {tabs.map(tab => (
        <div 
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 16px',
            borderRadius: 12,
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
            background: activeTab === tab.id ? '#00FFFF10' : 'transparent',
            color: activeTab === tab.id ? '#00FFFF' : '#888899',
            border: `1px solid ${activeTab === tab.id ? '#00FFFF25' : 'transparent'}`
          }}
        >
          <span style={{ fontSize: 18 }}>{tab.icon}</span>
          {tab.name}
        </div>
      ))}
      
      <div style={{ marginTop: 'auto', padding: '16px', background: '#111118', borderRadius: 16 }}>
        <div style={{ fontSize: 12, color: '#888899', marginBottom: 4 }}>System Status</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#4caf50', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4caf50' }}></div>
          Sensors Nominal
        </div>
      </div>
    </div>
  );
}
