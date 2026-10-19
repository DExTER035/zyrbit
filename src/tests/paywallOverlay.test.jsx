import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import PaywallOverlay from '../components/ui/PaywallOverlay.jsx';
import { SubscriptionProvider, useSubscription, TIERS } from '../context/SubscriptionContext.jsx';

// Mock useSubscription
const mockClosePaywall = vi.fn();
let mockSubscriptionState = {
  showPaywall: true,
  closePaywall: mockClosePaywall,
  paywallReason: '',
  tier: 'free',
  isPremium: false,
  isElite: false,
  loading: false,
  error: null,
  triggerPaywall: vi.fn(),
  updateSubscription: vi.fn(),
  refreshSubscription: vi.fn(),
};

vi.mock('../hooks/useSubscription', () => ({
  default: () => mockSubscriptionState,
  useSubscription: () => mockSubscriptionState,
}));

// Mock Toast
const mockShowToast = vi.fn();
vi.mock('../components/ui/Toast', () => ({
  showToast: (...args) => mockShowToast(...args),
}));

// Mock Supabase for context tests
vi.mock('../lib/supabase/index.js', () => ({
  default: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { subscription_tier: 'free' }, error: null }),
      update: vi.fn().mockReturnThis(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    })),
    removeChannel: vi.fn(),
  },
}));

describe('Zyrbit Paywall — "Go Unlimited" Minimal Design & Context Preservation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscriptionState = {
      showPaywall: true,
      closePaywall: mockClosePaywall,
      paywallReason: '',
      tier: 'free',
      isPremium: false,
      isElite: false,
      loading: false,
      error: null,
      triggerPaywall: vi.fn(),
      updateSubscription: vi.fn(),
      refreshSubscription: vi.fn(),
    };
  });

  describe('1. Display & Visibility', () => {
    it('renders null when showPaywall is false', () => {
      mockSubscriptionState.showPaywall = false;
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toBe('');
    });

    it('renders modal with deep charcoal background (#0D1115) and rounded corners', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('background:#0D1115');
      expect(html).toContain('border-radius:24px');
      expect(html).toContain('max-width:390px');
    });

    it('renders the approved Go Unlimited heading and subtitle', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('Go Unlimited');
      expect(html).toContain('Make more room for what matters.');
    });

    it('renders Petrol Teal infinity icon container and close button', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      // Petrol Teal container styling
      expect(html).toContain('rgba(23, 74, 85, 0.25)');
      // Close button with aria-label
      expect(html).toContain('aria-label="Close"');
    });
  });

  describe('2. Pricing Plans & Default Selection', () => {
    it('renders 12 months plan with ₹1,299, "Billed annually", "₹108.25/month" and "Best value" badge', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('12 months');
      expect(html).toContain('₹1,299');
      expect(html).toContain('Billed annually • ₹108.25/month');
      expect(html).toContain('Best value');
    });

    it('renders monthly plan with ₹199 /mo and "Billed monthly"', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('Monthly');
      expect(html).toContain('₹199');
      expect(html).toContain('/mo');
      expect(html).toContain('Billed monthly');
    });

    it('defaults to yearly selection with CTA "Continue — ₹1,299/year"', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('Continue — ₹1,299/year');
      expect(html).not.toContain('Continue — ₹199/month');
    });

    it('renders subtle "Restore purchases" action and billing disclaimer', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).toContain('Restore purchases');
      expect(html).toContain('Recurring billing. Cancel anytime in account settings.');
    });
  });

  describe('3. Clean Elimination of Legacy Vibe-Coded Elements', () => {
    it('does not contain old tier cards, cyan/pink gradients, or invented benefit claims', () => {
      const html = renderToStaticMarkup(<PaywallOverlay />);
      expect(html).not.toContain('ZYRBIT PREMIUM');
      expect(html).not.toContain('Unlimited Dex AI Coaching');
      expect(html).not.toContain('Advanced Focus & Habits');
      expect(html).not.toContain('Community Challenges & Battles');
      expect(html).not.toContain('Deep PERSONAL OS Analytics');
      expect(html).not.toContain('Upgrade to Premium — $4.99/mo');
      expect(html).not.toContain('Unlock Elite OS — $9.99/mo');
      expect(html).not.toContain('Simulate Free/Downgrade');
      expect(html).not.toContain('#00FFFF');
      expect(html).not.toContain('#9C27B0');
    });
  });

  describe('4. Subscription Context API Compatibility', () => {
    it('SubscriptionContext provides all 11 required properties and methods', () => {
      function TestConsumer() {
        const val = useSubscription();
        return (
          <div id="subscription-contract">
            <span id="tier">{val.tier}</span>
            <span id="isPremium">{String(val.isPremium)}</span>
            <span id="isElite">{String(val.isElite)}</span>
            <span id="loading">{String(val.loading)}</span>
            <span id="error">{String(val.error)}</span>
            <span id="showPaywall">{String(val.showPaywall)}</span>
            <span id="paywallReason">{String(val.paywallReason)}</span>
            <span id="triggerPaywall">{typeof val.triggerPaywall}</span>
            <span id="closePaywall">{typeof val.closePaywall}</span>
            <span id="refreshSubscription">{typeof val.refreshSubscription}</span>
            <span id="updateSubscription">{typeof val.updateSubscription}</span>
          </div>
        );
      }

      const html = renderToStaticMarkup(
        <SubscriptionProvider>
          <TestConsumer />
        </SubscriptionProvider>
      );

      expect(html).toContain('id="tier">free<');
      expect(html).toContain('id="isPremium">false<');
      expect(html).toContain('id="isElite">false<');
      expect(html).toContain('id="showPaywall">false<');
      expect(html).toContain('id="triggerPaywall">function<');
      expect(html).toContain('id="closePaywall">function<');
      expect(html).toContain('id="refreshSubscription">function<');
      expect(html).toContain('id="updateSubscription">function<');
    });

    it('TIERS constant contains free, premium, elite', () => {
      expect(TIERS).toEqual(['free', 'premium', 'elite']);
    });
  });
});
