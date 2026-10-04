import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DexCommandModal from '../common/DexCommandModal.jsx';
import VoiceCommandOverlay from '../common/VoiceCommandOverlay.jsx';

export default function AppLayout({ children, userId }) {
  const location = useLocation();
  const [dexOpen, setDexOpen] = useState(() => (typeof window !== 'undefined' && window.location.search.includes('openDex=true')));
  const [voiceOpen, setVoiceOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (location.search.includes('openDex=true')) {
      const timer = setTimeout(() => setDexOpen(true), 0);
      return () => clearTimeout(timer);
    }
  }, [location.search]);

  // Global keyboard shortcuts (Ctrl+K for Dex, Ctrl+M for Voice)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key.toLowerCase() === 'k') {
          e.preventDefault();
          setDexOpen(prev => !prev);
        } else if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          setVoiceOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleVoiceOpen = () => setVoiceOpen(true);
    const handleDexOpen = () => setDexOpen(true);
    const handleNavigate = (e) => {
      if (e.detail?.route) {
        navigate(e.detail.route);
      }
    };

    window.addEventListener('dexos:voice-open', handleVoiceOpen);
    window.addEventListener('dexos:open-dex', handleDexOpen);
    window.addEventListener('dexos:navigate', handleNavigate);

    return () => {
      window.removeEventListener('dexos:voice-open', handleVoiceOpen);
      window.removeEventListener('dexos:open-dex', handleDexOpen);
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
