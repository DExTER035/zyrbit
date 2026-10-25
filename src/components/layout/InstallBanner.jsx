import React, { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!(
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      (typeof document !== 'undefined' && document.referrer?.includes('android-app://'))
    );
  });
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('zyrbit_pwa_banner_dismissed') === 'true';
  });

  useEffect(() => {
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

  if (isStandalone || dismissed || (!deferredPrompt && !showIOSInstructions)) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('zyrbit_pwa_banner_dismissed', 'true');
    } catch {
      // Storage unavailable or quota exceeded
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        handleDismiss();
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
      position: 'relative',
      background: 'var(--brand-petrol, #174A55)',
      color: '#FFFFFF',
      padding: '10px 16px',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(255,255,255,0.12)',
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontWeight: 700, fontSize: 13, letterSpacing: -0.2 }}>Install Zyrbit App</span>
        {showIOSInstructions ? (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            Tap <b>Share</b> then <b>Add to Home Screen</b>.
          </span>
        ) : (
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
            Install for full native experience.
          </span>
        )}
      </div>
      
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        {!showIOSInstructions && (
          <button 
            onClick={handleInstallClick}
            style={{
              background: '#FFFFFF',
              color: 'var(--brand-petrol, #174A55)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: 0.2
            }}
          >
            INSTALL
          </button>
        )}
        <button 
          onClick={handleDismiss}
          style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
          aria-label="Dismiss banner"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
