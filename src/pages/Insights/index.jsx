import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, RefreshCcw, AlertTriangle, ChevronRight } from 'lucide-react';
import BottomNav from '../../components/layout/BottomNav.jsx';
import { getInsightsData } from '../../services/insightsService.js';

/**
 * Screen 4 — Insights (Personal Analytics Hub)
 * 
 * Calm, deterministic personal analytics for Zyrbit.
 * Visual standard:
 * - Headline: "Insights"
 * - Subtitle: "A clear view of your recorded activity."
 * - Time filters: 7 days, 30 days, 90 days
 * - Metric Cards: Active days, Logged activities
 * - Activity over time card: Real daily distribution or truthful empty state
 * - Across your life domain cards (Habits, Health, Growth, Wealth) with direct navigation
 * - Concise data-integrity footnote
 * - Dark Charcoal Mobile Bottom Navigation
 */
export default function Insights() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState('7d'); // '7d' | '30d' | '90d'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [insights, setInsights] = useState(null);
  const [selectedBar, setSelectedBar] = useState(null);

  // Request counter to cancel stale in-flight requests during rapid tab switches
  const requestIdRef = useRef(0);

  const fetchInsights = useCallback(async (range) => {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setSelectedBar(null);

    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;

    try {
      const res = await getInsightsData({ days });

      // Discard response if a newer request was initiated
      if (currentId !== requestIdRef.current) return;

      if (res.success && res.data) {
        setInsights(res.data);
      } else {
        setError(res.error || 'Failed to retrieve insights telemetry.');
      }
    } catch (err) {
      if (currentId !== requestIdRef.current) return;
      setError(err.message || 'An unexpected error occurred while loading insights.');
    } finally {
      if (currentId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchInsights(timeRange);
  }, [timeRange, fetchInsights]);

  const handleOpenQuickAdd = () => {
    window.dispatchEvent(new CustomEvent('dexos:quick-add'));
  };

  const domainNavRoutes = {
    habits: '/zenith',
    health: '/health',
    growth: '/growth',
    wealth: '/wealth',
  };

  const windowDays = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
  const activeDaysCount = insights?.activeDaysCount || 0;
  const totalActivitiesCount = insights?.totalActivitiesCount || 0;
  const dailySeries = insights?.dailySeries || [];
  const maxDayCount = Math.max(1, ...(dailySeries.map((d) => d.count) || [0]));
  const hasRecords = totalActivitiesCount > 0;

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

        {/* Partial Error Notification (Graceful Degradation) */}
        {insights?.hasPartialError && !loading && (
          <div
            style={{
              backgroundColor: '#FFF9E6',
              border: '1px solid #F0E2B6',
              borderRadius: '12px',
              padding: '10px 14px',
              fontSize: '12px',
              color: '#8A6D1C',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertTriangle size={15} color="#D97706" style={{ flexShrink: 0 }} />
            <span>Some sources could not be reached. Displayed metrics reflect available verified records.</span>
          </div>
        )}

        {/* Top 2 Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {/* Active Days Card */}
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
              {loading
                ? 'Updating...'
                : error
                ? 'Unable to load'
                : activeDaysCount > 0
                ? `${activeDaysCount} of ${windowDays} days`
                : 'Awaiting records'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 750, color: '#111A20', marginTop: '12px' }}>
              {loading ? '…' : error ? '—' : activeDaysCount > 0 ? activeDaysCount : '—'}
            </div>
          </div>

          {/* Logged Activities Card */}
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
              {loading
                ? 'Updating...'
                : error
                ? 'Unable to load'
                : totalActivitiesCount > 0
                ? `${totalActivitiesCount} recorded`
                : 'Awaiting records'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 750, color: '#111A20', marginTop: '12px' }}>
              {loading ? '…' : error ? '—' : totalActivitiesCount > 0 ? totalActivitiesCount : '—'}
            </div>
          </div>
        </div>

        {/* Activity Over Time Card (Hero) */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20' }}>
              Activity over time
            </div>
            {hasRecords && !loading && (
              <div style={{ fontSize: '11.5px', color: '#6B7B82', fontWeight: 600 }}>
                {selectedBar ? `${selectedBar.label}: ${selectedBar.count} logged` : `Past ${windowDays} days`}
              </div>
            )}
          </div>

          {/* 1. Loading State */}
          {loading && (
            <div
              style={{
                backgroundColor: '#F7F5F0',
                borderRadius: '14px',
                border: '1px solid #DDD8CE',
                padding: '36px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '8px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: '3px solid #DDE9EB',
                  borderTopColor: '#174A55',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#6B7B82', marginTop: '6px' }}>
                Verifying recorded activity…
              </div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* 2. Full Error State */}
          {!loading && error && (
            <div
              style={{
                backgroundColor: '#FDF6F6',
                borderRadius: '14px',
                border: '1px solid #F8D7DA',
                padding: '24px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={24} color="#DC3545" />
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#111A20' }}>
                Unable to load activity
              </div>
              <div style={{ fontSize: '12px', color: '#6B7B82', maxWidth: '280px' }}>
                {error}
              </div>
              <button
                type="button"
                onClick={() => fetchInsights(timeRange)}
                style={{
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#174A55',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 16px',
                  fontSize: '12.5px',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                <RefreshCcw size={14} />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* 3. Populated State (Real Data Distribution) */}
          {!loading && !error && hasRecords && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <div
                style={{
                  height: '130px',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: timeRange === '90d' ? '2px' : timeRange === '30d' ? '3px' : '8px',
                  padding: '10px 4px 0',
                  boxSizing: 'border-box',
                }}
              >
                {dailySeries.map((item) => {
                  const isZero = item.count === 0;
                  const heightPercent = isZero ? 4 : Math.max(12, Math.round((item.count / maxDayCount) * 100));
                  const isSelected = selectedBar?.date === item.date;

                  return (
                    <div
                      key={item.date}
                      onClick={() => setSelectedBar(item)}
                      onMouseEnter={() => setSelectedBar(item)}
                      style={{
                        flex: 1,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                      title={`${item.label}: ${item.count} recorded`}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: `${heightPercent}%`,
                          backgroundColor: isZero
                            ? '#EAE5DB'
                            : isSelected
                            ? '#0E3139'
                            : '#174A55',
                          borderTopLeftRadius: '3px',
                          borderTopRightRadius: '3px',
                          transition: 'height 0.2s ease, background-color 0.15s ease',
                          minHeight: '3px',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              {timeRange === '7d' && (
                <div style={{ display: 'flex', width: '100%', padding: '0 4px', boxSizing: 'border-box' }}>
                  {dailySeries.map((item) => (
                    <div
                      key={item.date}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: selectedBar?.date === item.date ? '#174A55' : '#8A99A0',
                      }}
                    >
                      {item.dayName}
                    </div>
                  ))}
                </div>
              )}

              {timeRange === '30d' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '10.5px', color: '#8A99A0', fontWeight: 600 }}>
                  <span>{dailySeries[0]?.label || ''}</span>
                  <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.label || ''}</span>
                  <span>{dailySeries[dailySeries.length - 1]?.label || ''}</span>
                </div>
              )}

              {timeRange === '90d' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '10.5px', color: '#8A99A0', fontWeight: 600 }}>
                  <span>{dailySeries[0]?.date || ''}</span>
                  <span>{dailySeries[Math.floor(dailySeries.length / 2)]?.date || ''}</span>
                  <span>Today</span>
                </div>
              )}

              <div style={{ fontSize: '11.5px', color: '#6B7B82', textAlign: 'center', marginTop: '4px' }}>
                Distribution of verified daily logs across habits, health, focus, and spend.
              </div>
            </div>
          )}

          {/* 4. Honest Empty State (No records yet) */}
          {!loading && !error && !hasRecords && (
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
          )}
        </div>

        {/* Across Your Life Domain Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '15px', fontWeight: 750, color: '#111A20' }}>
            Across your life
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              {
                id: 'habits',
                title: 'Habits',
                desc: loading ? 'Checking…' : insights?.domains?.habits?.summary || 'Not enough data yet',
              },
              {
                id: 'health',
                title: 'Health',
                desc: loading ? 'Checking…' : insights?.domains?.health?.summary || 'Not enough data yet',
              },
              {
                id: 'growth',
                title: 'Growth',
                desc: loading ? 'Checking…' : insights?.domains?.growth?.summary || 'Not enough data yet',
              },
              {
                id: 'wealth',
                title: 'Wealth',
                desc: loading ? 'Checking…' : insights?.domains?.wealth?.summary || 'Not enough data yet',
              },
            ].map((d) => (
              <div
                key={d.id}
                onClick={() => navigate(domainNavRoutes[d.id])}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  padding: '14px',
                  border: '1px solid #E5E0D8',
                  boxShadow: '0 2px 8px rgba(17, 26, 32, 0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'transform 0.1s ease, border-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#174A55';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E5E0D8';
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#111A20' }}>{d.title}</span>
                  <ChevronRight size={14} color="#8A99A0" />
                </div>
                <div style={{ fontSize: '11px', color: '#6B7B82', marginTop: '6px', fontWeight: 500, lineHeight: 1.35 }}>
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
