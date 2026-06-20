import React, { useState } from 'react';
import useSubscription from '../hooks/useSubscription';
import { Sparkles, ShieldCheck, Trophy, BarChart3, X, Zap } from 'lucide-react';

export default function PaywallOverlay() {
  const { showPaywall, paywallReason, closePaywall, updateSubscription, tier } = useSubscription();
  const [loading, setLoading] = useState(false);

  if (!showPaywall) return null;

  const handleSimulatePurchase = async (selectedTier) => {
    setLoading(true);
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const success = await updateSubscription(selectedTier);
    setLoading(false);
    if (success) {
      import('./Toast').then(m => m.showToast(`🎉 Upgraded to ${selectedTier.toUpperCase()}!`, 'success'));
      closePaywall();
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(5, 5, 8, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#0D0D18',
        border: '1px solid #2A2A3A',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '390px',
        position: 'relative',
        boxShadow: '0 20px 50px rgba(0, 255, 255, 0.1)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        animation: 'scaleIn 0.3s ease forwards'
      }}>
        {/* Close Button */}
        <button
          onClick={closePaywall}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: '#1A1A24',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#888899'
          }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginTop: '10px' }}>
          <div style={{
            display: 'inline-flex',
            padding: '10px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(156, 39, 176, 0.15) 100%)',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            marginBottom: '12px',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.2)'
          }}>
            <Sparkles size={28} className="text-[#00FFFF] animate-pulse" />
          </div>
          <h2 style={{
            fontSize: '22px',
            fontWeight: 900,
            background: 'linear-gradient(to right, #00FFFF, #9C27B0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.02em',
            marginBottom: '4px'
          }}>
            ZYRBIT PREMIUM
          </h2>
          <p style={{ fontSize: '12px', color: '#888899' }}>
            {paywallReason || 'Unlock the complete personal operating system'}
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', margin: '8px 0' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#00FFFF', background: 'rgba(0, 255, 255, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Zap size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Unlimited Jarvis AI Coaching</h4>
              <p style={{ fontSize: '11px', color: '#888899' }}>No prompt limit, faster advice, voice execution.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#9C27B0', background: 'rgba(156, 39, 176, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <ShieldCheck size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Biometric PIN-Encrypted Vault</h4>
              <p style={{ fontSize: '11px', color: '#888899' }}>Secure encryption key layers for diary and private logs.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#FF9800', background: 'rgba(255, 152, 0, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <Trophy size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Public Orbits & habit Battles</h4>
              <p style={{ fontSize: '11px', color: '#888899' }}>Form groups, chat real-time, and challenge peers for stakes.</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '6px', borderRadius: '8px' }}>
              <BarChart3 size={16} />
            </div>
            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFF' }}>Deep PERSONAL OS Analytics</h4>
              <p style={{ fontSize: '11px', color: '#888899' }}>Full Recharts weekly visualizations & offline history ledger.</p>
            </div>
          </div>
        </div>

        {/* Simulate Purchase Tier Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={() => handleSimulatePurchase('premium')}
            disabled={loading || tier === 'premium'}
            style={{
              background: 'linear-gradient(to right, #00FFFF, #00BCD4)',
              color: '#000',
              fontWeight: 800,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'transform 0.2s',
              opacity: tier === 'premium' ? 0.6 : 1
            }}
          >
            {loading ? 'Processing...' : tier === 'premium' ? 'Current Tier: Premium' : 'Upgrade to Premium — $4.99/mo'}
          </button>

          <button
            onClick={() => handleSimulatePurchase('elite')}
            disabled={loading || tier === 'elite'}
            style={{
              background: 'linear-gradient(to right, #9C27B0, #E91E63)',
              color: '#FFF',
              fontWeight: 800,
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'transform 0.2s',
              opacity: tier === 'elite' ? 0.6 : 1,
              boxShadow: '0 4px 15px rgba(156, 39, 176, 0.3)'
            }}
          >
            {loading ? 'Processing...' : tier === 'elite' ? 'Current Tier: Elite' : 'Unlock Elite OS — $9.99/mo'}
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontSize: '10px', color: '#555' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => handleSimulatePurchase('free')}>Simulate Free/Downgrade</span>
          <span>Restore Purchases</span>
        </div>
      </div>
    </div>
  );
}
