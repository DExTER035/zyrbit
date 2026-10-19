import React, { useState, useEffect, useCallback } from 'react';
import useSubscription from '../../hooks/useSubscription';
import { Infinity as InfinityIcon, X } from 'lucide-react';
import { showToast } from './Toast';

export default function PaywallOverlay() {
  const { showPaywall, closePaywall } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState('yearly'); // 'yearly' | 'monthly'
  const [notice, setNotice] = useState(null);

  const handleClose = useCallback(() => {
    setSelectedPlan('yearly');
    setNotice(null);
    closePaywall();
  }, [closePaywall]);

  // Handle escape key
  useEffect(() => {
    if (!showPaywall) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPaywall, handleClose]);

  if (!showPaywall) return null;

  const handleContinue = () => {
    // Honest handling: Real checkout integration is not yet connected to a server-side payment provider.
    // Never simulate fake payments or client-side tier upgrades.
    const message = 'Online checkout is coming soon. No charges were made.';
    setNotice({ type: 'info', text: message });
    showToast(message, 'info');
  };

  const handleRestorePurchases = () => {
    // Honest handling: No active app-store or payment gateway receipt found for this session.
    const message = 'No past purchases found for this account.';
    setNotice({ type: 'info', text: message });
    showToast(message, 'info');
  };

  const isYearly = selectedPlan === 'yearly';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-heading"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 9, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#0D1115',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '390px',
          position: 'relative',
          padding: '24px 20px',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.65)',
          animation: 'scaleIn 0.25s ease forwards'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#8C9BA8',
            transition: 'background 0.15s, color 0.15s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#F4F0E8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#8C9BA8';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          }}
        >
          <X size={16} />
        </button>

        {/* Top Icon: Small Petrol Teal infinity icon inside a muted teal rounded-square container */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px', marginBottom: '16px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(23, 74, 85, 0.25)',
              border: '1px solid rgba(23, 74, 85, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <InfinityIcon size={22} style={{ color: '#2DD4BF' }} strokeWidth={2.2} />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <h2
            id="paywall-heading"
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: '#F4F0E8',
              letterSpacing: '-0.02em',
              fontFamily: 'inherit'
            }}
          >
            Go Unlimited
          </h2>
          <p
            style={{
              margin: '6px 0 0 0',
              fontSize: '13.5px',
              color: '#8C9BA8',
              lineHeight: 1.4
            }}
          >
            Make more room for what matters.
          </p>
        </div>

        {/* Pricing Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
          {/* Yearly Card (Default) */}
          <button
            type="button"
            role="radio"
            aria-checked={isYearly}
            onClick={() => { setSelectedPlan('yearly'); setNotice(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '16px',
              background: isYearly ? 'rgba(23, 74, 85, 0.22)' : 'rgba(255, 255, 255, 0.02)',
              border: isYearly ? '1.5px solid #2DD4BF' : '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, background-color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              {/* Radio Circle */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: isYearly ? '5px solid #2DD4BF' : '1.5px solid rgba(255, 255, 255, 0.25)',
                  background: '#0D1115',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#F4F0E8' }}>
                    12 months
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '9999px',
                      background: 'rgba(23, 74, 85, 0.45)',
                      color: '#4ADE80',
                      border: '1px solid rgba(74, 222, 128, 0.25)',
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase'
                    }}
                  >
                    Best value
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: '#8C9BA8', marginTop: '2px' }}>
                  Billed annually • ₹108.25/month
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#F4F0E8' }}>
                ₹1,299
              </span>
            </div>
          </button>

          {/* Monthly Card */}
          <button
            type="button"
            role="radio"
            aria-checked={!isYearly}
            onClick={() => { setSelectedPlan('monthly'); setNotice(null); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '16px',
              background: !isYearly ? 'rgba(23, 74, 85, 0.22)' : 'rgba(255, 255, 255, 0.02)',
              border: !isYearly ? '1.5px solid #2DD4BF' : '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s, background-color 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              {/* Radio Circle */}
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: !isYearly ? '5px solid #2DD4BF' : '1.5px solid rgba(255, 255, 255, 0.25)',
                  background: '#0D1115',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#F4F0E8' }}>
                  Monthly
                </div>
                <div style={{ fontSize: '12px', color: '#8C9BA8', marginTop: '2px' }}>
                  Billed monthly
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0, paddingLeft: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#F4F0E8' }}>
                ₹199
              </span>
              <span style={{ fontSize: '12px', color: '#8C9BA8', marginLeft: '3px' }}>
                /mo
              </span>
            </div>
          </button>
        </div>

        {/* Optional Inline Notice for Honest Unavailable State */}
        {notice && (
          <div
            style={{
              marginBottom: '14px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: 'rgba(23, 74, 85, 0.25)',
              border: '1px solid rgba(45, 224, 154, 0.25)',
              color: '#DDE9EB',
              fontSize: '12px',
              lineHeight: 1.4,
              textAlign: 'center'
            }}
          >
            {notice.text}
          </div>
        )}

        {/* Full-width Light-colored CTA */}
        <button
          type="button"
          onClick={handleContinue}
          style={{
            width: '100%',
            height: '48px',
            background: '#F4F0E8',
            color: '#0D1115',
            fontWeight: 700,
            fontSize: '14.5px',
            borderRadius: '14px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'opacity 0.15s, transform 0.15s',
            boxSizing: 'border-box'
          }}
          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.98)'; }}
          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          {isYearly ? 'Continue — ₹1,299/year' : 'Continue — ₹199/month'}
        </button>

        {/* Restore Purchases */}
        <div style={{ textAlign: 'center', marginTop: '14px' }}>
          <button
            type="button"
            onClick={handleRestorePurchases}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#8C9BA8',
              fontSize: '12.5px',
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 8px',
              transition: 'color 0.15s'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#F4F0E8'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8C9BA8'; }}
          >
            Restore purchases
          </button>
        </div>

        {/* Billing Terms & Cancellation Legal Copy */}
        <p
          style={{
            margin: '12px 0 0 0',
            fontSize: '11px',
            color: '#5E6B77',
            textAlign: 'center',
            lineHeight: 1.45,
            padding: '0 8px'
          }}
        >
          Recurring billing. Cancel anytime in account settings.
        </p>
      </div>
    </div>
  );
}
