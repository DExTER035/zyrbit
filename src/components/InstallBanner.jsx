import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(true); // default true to avoid flash
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    setIsStandalone(isAppInstalled);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsStandalone(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (isStandalone || dismissed) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // fallback for iOS or if beforeinstallprompt hasn't fired
      const userAgent = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(userAgent)) {
        setShowIOSInstructions(true);
      } else {
        alert('To install this app, look for the "Add to Home Screen" or "Install" option in your browser menu.');
      }
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#0a1a1e',
      borderBottom: '2px solid #00FFFF',
      color: '#FFF',
      padding: '12px 20px',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 4px 20px rgba(0,255,255,0.1)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: -0.5 }}>Install Zyrbit App</span>
        {showIOSInstructions ? (
          <span style={{ fontSize: 11, color: '#A0A0A0', marginTop: 4 }}>
            Tap the <b>Share</b> icon below, then select <b>"Add to Home Screen"</b>.
          </span>
        ) : (
          <span style={{ fontSize: 11, color: '#A0A0A0', marginTop: 4 }}>
            Install for the full native experience.
          </span>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!showIOSInstructions && (
          <button 
            onClick={handleInstallClick}
            style={{
              background: '#00FFFF',
              color: '#000',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: 900,
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: 0.5
            }}
          >
            INSTALL
          </button>
        )}
        <button 
          onClick={() => setDismissed(true)}
          style={{ background: 'transparent', border: 'none', color: '#666', fontSize: 18, cursor: 'pointer', padding: '0 4px' }}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
