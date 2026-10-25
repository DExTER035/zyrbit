import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Home, Compass, TrendingUp, User, Plus, MessageSquare } from 'lucide-react';
import DexCommandModal from '../common/DexCommandModal.jsx';
import VoiceCommandOverlay from '../common/VoiceCommandOverlay.jsx';
import QuickAddSheet from './QuickAddSheet.jsx';

export default function AppLayout({ children, userId }) {
  const location = useLocation();
  const [dexOpen, setDexOpen] = useState(() => (typeof window !== 'undefined' && window.location.search.includes('openDex=true')));
  const [dexInitialPrompt, setDexInitialPrompt] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
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
    const handleDexOpen = (e) => {
      setDexInitialPrompt(e?.detail?.prompt || '');
      setDexOpen(true);
    };
    const handleQuickAdd = () => setQuickAddOpen(true);
    const handleNavigate = (e) => {
      if (e.detail?.route) {
        navigate(e.detail.route);
      }
    };

    window.addEventListener('dexos:voice-open', handleVoiceOpen);
    window.addEventListener('dexos:open-dex', handleDexOpen);
    window.addEventListener('dexos:quick-add', handleQuickAdd);
    window.addEventListener('dexos:navigate', handleNavigate);

    return () => {
      window.removeEventListener('dexos:voice-open', handleVoiceOpen);
      window.removeEventListener('dexos:open-dex', handleDexOpen);
      window.removeEventListener('dexos:quick-add', handleQuickAdd);
      window.removeEventListener('dexos:navigate', handleNavigate);
    };
  }, [navigate]);

  const navLinks = [
    { to: '/zenith', label: 'Home', icon: Home },
    { to: '/track', label: 'Track', icon: Compass },
    { to: '/insights', label: 'Insights', icon: TrendingUp },
    { to: '/profile', label: 'Your Space', icon: User },
  ];

  return (
    <div className="app-layout" style={{
      background: 'var(--brand-ivory, #F4F0E8)',
      color: 'var(--brand-charcoal, #111A20)',
      minHeight: '100vh',
      margin: '0 auto',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Desktop Top Navigation Header (visible >= 768px) */}
      <header className="desktop-header hidden md:flex" style={{
        position: 'sticky',
        top: 0,
        zIndex: 80,
        background: '#111A20',
        borderBottom: '1px solid #22282C',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
        padding: '10px 24px',
        width: '100%',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          {/* Brand Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <Link to="/zenith" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'var(--brand-petrol, #174A55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '17px',
                boxShadow: '0 2px 8px rgba(23, 74, 85, 0.25)',
              }}>
                Z
              </div>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: 900,
                  color: '#F1F5F3',
                  letterSpacing: '0.04em',
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.1,
                }}>
                  ZYRBIT
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#9CA3AF',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  Personal OS
                </div>
              </div>
            </Link>
          </div>

          {/* Center Nav Links */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            flexWrap: 'nowrap',
            overflowX: 'auto',
          }}>
            {navLinks.map((link) => {
              const isActive = location.pathname === link.to;
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '8px 14px',
                    borderRadius: '12px',
                    textDecoration: 'none',
                    fontSize: '13px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? '#FFFFFF' : '#9CA3AF',
                    background: isActive ? 'var(--brand-petrol, #174A55)' : 'transparent',
                    border: isActive ? '1px solid rgba(23, 74, 85, 0.4)' : '1px solid transparent',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Quick Add + Ask Dex */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--brand-petrol, #174A55)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(23, 74, 85, 0.3)',
                whiteSpace: 'nowrap',
              }}
            >
              <Plus size={15} strokeWidth={2.6} />
              <span>Quick Add</span>
            </button>

            <button
              type="button"
              onClick={() => setDexOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                background: '#15181B',
                color: '#F1F5F3',
                border: '1px solid #26272C',
                borderRadius: '12px',
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              <MessageSquare size={14} color="#367887" />
              <span>Dex AI</span>
              <kbd style={{
                fontSize: '9px',
                background: '#26272C',
                padding: '2px 5px',
                borderRadius: '4px',
                color: '#9CA3AF',
                fontWeight: 700,
              }}>⌘K</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>

      {/* Global Quick Add Sheet Modal */}
      <QuickAddSheet
        isOpen={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onSelectAction={(act) => {
          if (act.route) {
            navigate(act.route);
          }
        }}
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
        onClose={() => {
          setDexOpen(false);
          setDexInitialPrompt('');
        }}
        initialPrompt={dexInitialPrompt}
      />
    </div>
  );
}
