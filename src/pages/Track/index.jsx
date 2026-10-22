import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Utensils, Activity, Wallet, ArrowRight, Sparkles } from 'lucide-react';
import BottomNav from '../../components/layout/BottomNav.jsx';

/**
 * Screen 2 — Track (Four Real Domain Spaces Hub)
 * Matches approved visual reference:
 * - Headline: "Track your life"
 * - Subtitle: "Four focused spaces. One connected system."
 * - Top banner: "Consistency connects it all — Manage habits across every area"
 * - 4 Domain Cards: Growth, Food, Health, Wealth with direct pathways
 * - Dark Charcoal Mobile Bottom Navigation
 */
export default function Track() {
  const navigate = useNavigate();

  const domainCards = [
    {
      id: 'growth',
      title: 'Growth',
      subtitle: 'Build capability. Protect your attention.',
      categories: 'Goals & tasks · Study · Focus · Reflections',
      icon: TrendingUp,
      route: '/growth',
      actionLabel: 'Open Growth →',
    },
    {
      id: 'food',
      title: 'Food',
      subtitle: 'Fuel yourself well.',
      categories: 'Meals · Calories · Macros · Hydration',
      icon: Utensils,
      route: '/food',
      actionLabel: 'Open Food →',
    },
    {
      id: 'health',
      title: 'Health',
      subtitle: 'Understand what keeps you well.',
      categories: 'Workouts · Nutrition · Water · Sleep',
      icon: Activity,
      route: '/health',
      actionLabel: 'Open Health →',
    },
    {
      id: 'wealth',
      title: 'Wealth',
      subtitle: 'Give your money a clear direction.',
      categories: 'Income & expenses · Budgets · Bills · Savings',
      icon: Wallet,
      route: '/wealth',
      actionLabel: 'Open Wealth →',
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#F4F0E8',
        minHeight: '100vh',
        width: '100%',
        boxSizing: 'border-box',
        padding: '16px 16px calc(80px + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'Inter', -apple-system, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header */}
        <div style={{ paddingTop: '8px' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '26px',
              fontWeight: 800,
              color: '#111A20',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            Track your life
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: '#6B7B82',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            Four focused spaces. One connected system.
          </div>
        </div>

        {/* Top Banner: Consistency connects it all */}
        <div
          onClick={() => navigate('/zenith')}
          style={{
            backgroundColor: '#174A55',
            borderRadius: '16px',
            padding: '16px 18px',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(23, 74, 85, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            transition: 'transform 0.15s ease',
          }}
        >
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, letterSpacing: '-0.01em' }}>
              Consistency connects it all
            </div>
            <div style={{ fontSize: '12px', color: '#DDE9EB', marginTop: '2px', fontWeight: 500 }}>
              Manage habits across every area
            </div>
          </div>
          <ArrowRight size={18} color="#DDE9EB" strokeWidth={2.4} />
        </div>

        {/* Four Domain Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {domainCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => navigate(card.route)}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '16px',
                  border: '1px solid #E5E0D8',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '12px',
                      backgroundColor: '#DDE9EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color="#174A55" strokeWidth={2.2} />
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 750, color: '#111A20' }}>
                      {card.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6B7B82', marginTop: '1px', fontWeight: 500 }}>
                      {card.subtitle}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11.5px', color: '#6B7B82', marginTop: '4px', fontWeight: 500 }}>
                  {card.categories}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: '4px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    color: '#174A55',
                    marginTop: '2px',
                  }}
                >
                  <span>{card.actionLabel}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '11.5px',
            color: '#6B7B82',
            paddingTop: '6px',
            paddingBottom: '12px',
          }}
        >
          Your saved records stay connected across these spaces.
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab="track" />
    </div>
  );
}
