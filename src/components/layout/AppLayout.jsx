import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DexCommandModal from '../common/DexCommandModal.jsx';
import DexLauncher from '../common/DexLauncher.jsx';
import VoiceCommandOverlay from '../common/VoiceCommandOverlay.jsx';

export default function AppLayout({ children, userId }) {
  const [dexOpen, setDexOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleVoiceOpen = () => setVoiceOpen(true);
    const handleNavigate = (e) => {
      if (e.detail?.route) {
        navigate(e.detail.route);
      }
    };

    window.addEventListener('dexos:voice-open', handleVoiceOpen);
    window.addEventListener('dexos:navigate', handleNavigate);

    return () => {
      window.removeEventListener('dexos:voice-open', handleVoiceOpen);
      window.removeEventListener('dexos:navigate', handleNavigate);
    };
  }, [navigate]);

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

      {/* Ambient Dex Operator & Voice Launcher */}
      <DexLauncher
        onClick={() => setDexOpen(true)}
        onVoiceClick={() => setVoiceOpen(true)}
      />

      {/* Global Voice Command Overlay */}
      {voiceOpen && (
        <VoiceCommandOverlay
          userId={userId}
          isOpen={voiceOpen}
          onClose={() => setVoiceOpen(false)}
        />
      )}

      {/* Expandable Dex Text Command Panel */}
      <DexCommandModal
        userId={userId}
        isOpen={dexOpen}
        onClose={() => setDexOpen(false)}
      />
    </div>
  );
}
