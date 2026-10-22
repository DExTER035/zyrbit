import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, ArrowRight } from 'lucide-react';
import BottomNav from '../../components/layout/BottomNav.jsx';

/**
 * Screen 4 — Insights (Personal Analytics Hub)
 * Matches approved visual reference:
 * - Headline: "Insights"
 * - Subtitle: "A clear view of your recorded activity."
 * - Time filters: 7 days, 30 days, 90 days
 * - Metric Cards: Active days, Logged activities
 * - Activity over time card with truthful empty state
 * - Across your life domain cards (Habits, Health, Growth, Wealth)
 * - Concise data-integrity footnote
 * - Dark Charcoal Mobile Bottom Navigation
 */
export default function Insights() {
  const [timeRange, setTimeRange] = useState('7d'); // '7d' | '30d' | '90d'

  const handleOpenQuickAdd = () => {
    window.dispatchEvent(new CustomEvent('dexos:quick-add'));
  };

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
            Insights
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: '#6B7B82',
              marginTop: '4px',
              fontWeight: 500,
            }}
          >
            A clear view of your recorded activity.
          </div>
        </div>

        {/* Time Filters */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '4px',
            border: '1px solid #E5E0D8',
            gap: '4px',
          }}
        >
          {[
            { id: '7d', label: '7 days' },
            { id: '30d', label: '30 days' },
            { id: '90d', label: '90 days' },
          ].map((tab) => {
            const isActive = timeRange === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTimeRange(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 0',
                  borderRadius: '9px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? '#174A55' : 'transparent',
                  color: isActive ? '#FFFFFF' : '#6B7B82',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Top 2 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #E5E0D8',
              boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111A20' }}>Active days</div>
            <div style={{ fontSize: '11px', color: '#6B7B82', marginTop: '2px', fontWeight: 500 }}>
              Awaiting records
            </div>
            <div style={{ fontSize: '24px', fontWeight: 750, color: '#111A20', marginTop: '12px' }}>
              —
            </div>
          </div>

          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid #E5E0D8',
              boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
            }}
          >
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111A20' }}>Logged activities</div>
            <div style={{ fontSize: '11px', color: '#6B7B82', marginTop: '2px', fontWeight: 500 }}>
              Awaiting records
            </div>
            <div style={{ fontSize: '24px', fontWeight: 750, color: '#111A20', marginTop: '12px' }}>
              —
            </div>
          </div>
        </div>

        {/* Activity Over Time Card */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '18px',
            border: '1px solid #E5E0D8',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
          }}
        >
          <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20' }}>
            Activity over time
          </div>

          <div
            style={{
              backgroundColor: '#F7F5F0',
              borderRadius: '14px',
              border: '1px dashed #DDD8CE',
              padding: '24px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: '6px',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#DDE9EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <TrendingUp size={19} color="#174A55" strokeWidth={2.4} />
            </div>

            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>
              Your patterns start with a record.
            </div>
            <div style={{ fontSize: '12px', color: '#6B7B82', maxWidth: '260px' }}>
              Log an activity to begin. No fabricated trends.
            </div>

            <button
              type="button"
              onClick={handleOpenQuickAdd}
              style={{
                marginTop: '12px',
                width: '100%',
                backgroundColor: '#174A55',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(23, 74, 85, 0.25)',
              }}
            >
              <span>Log your first activity</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Across Your Life Domain Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20' }}>
            Across your life
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'habits', title: 'Habits', desc: 'Not enough data yet' },
              { id: 'health', title: 'Health', desc: 'Not enough data yet' },
              { id: 'growth', title: 'Growth', desc: 'Not enough data yet' },
              { id: 'wealth', title: 'Wealth', desc: 'Not enough data yet' },
            ].map((d) => (
              <div
                key={d.id}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E5E0D8',
                  boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#111A20' }}>{d.title}</div>
                <div style={{ fontSize: '11px', color: '#6B7B82', marginTop: '4px', fontWeight: 500 }}>
                  {d.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div
          style={{
            textAlign: 'center',
            fontSize: '11.5px',
            color: '#6B7B82',
            paddingTop: '6px',
            paddingBottom: '12px',
          }}
        >
          Only verified, available data is shown.
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab="insights" />
    </div>
  );
}
