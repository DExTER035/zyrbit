import React, { useState } from 'react';
import DexCommandModal from '../common/DexCommandModal.jsx';
import DexLauncher from '../common/DexLauncher.jsx';

export default function AppLayout({ children, userId }) {
  const [dexOpen, setDexOpen] = useState(false);

  return (
    <div className="app-layout" style={{
      background: 'var(--bg-page)',
      minHeight: '100vh',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {children}

      {/* Ambient Dex Operator Launcher */}
      <DexLauncher onClick={() => setDexOpen(true)} />

      {/* Expandable Dex Command Panel */}
      <DexCommandModal
        userId={userId}
        isOpen={dexOpen}
        onClose={() => setDexOpen(false)}
      />
    </div>
  );
}
