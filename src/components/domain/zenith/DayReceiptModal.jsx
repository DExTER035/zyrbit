import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Share2, Download, EyeOff, Eye, Check } from 'lucide-react';
import { getDayReceipt, assembleDayReceipt, sanitizeReceiptForShare, todayStr } from '../../../services/dayReceiptService.js';
import { showToast } from '../../ui/Toast.jsx';

/**
 * DayReceiptModal — Physical editorial receipt artifact summarizing the user's day.
 *
 * Visual characteristics:
 * - Warm, off-white archival receipt paper (#F3EFE6)
 * - Dark ink typography (#141517, #5C5E64)
 * - Authentic receipt header, tabular monospace/tabular numbers alignment
 * - Serif display interpretation
 * - Minimalist action row [ Share to story ] [ Save ]
 * - History switching (Today, Yesterday, previous days)
 * - Privacy-aware masking toggle for financial amounts
 */
export default function DayReceiptModal({
  isOpen,
  onClose,
  userId,
  initialDate = todayStr(),
  preloadedData = null,
}) {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hideFinancials, setHideFinancials] = useState(true);
  const [copied, setCopied] = useState(false);
  const receiptCardRef = useRef(null);

  // Sync date if initialDate changes when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentDate(initialDate || todayStr());
    }
  }, [isOpen, initialDate]);

  // Load receipt data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      try {
        if (preloadedData && currentDate === initialDate) {
          // If in-memory preloaded data is passed directly (e.g. from Zenith state)
          const assembled = assembleDayReceipt({
            date: currentDate,
            ...preloadedData,
          });
          if (isMounted) setReceipt(assembled);
        } else if (userId) {
          const res = await getDayReceipt(userId, currentDate);
          if (isMounted) {
            if (res.success && res.receipt) {
              setReceipt(res.receipt);
            } else {
              setReceipt(assembleDayReceipt({ date: currentDate }));
            }
          }
        } else {
          if (isMounted) setReceipt(assembleDayReceipt({ date: currentDate }));
        }
      } catch (err) {
        console.error('Error assembling receipt:', err);
        if (isMounted) setReceipt(assembleDayReceipt({ date: currentDate }));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentDate, userId, initialDate, preloadedData]);

  if (!isOpen) return null;

  // Active display receipt (applying privacy toggle if selected)
  const displayReceipt = receipt
    ? (hideFinancials ? sanitizeReceiptForShare(receipt, { hideMoney: true }) : receipt)
    : null;

  // Date navigation helpers
  const handlePrevDay = () => {
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    const prevStr = d.toISOString().split('T')[0];
    setCurrentDate(prevStr);
  };

  const handleNextDay = () => {
    const today = todayStr();
    if (currentDate >= today) return; // Do not browse into the future
    const d = new Date(currentDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const nextStr = d.toISOString().split('T')[0];
    setCurrentDate(nextStr);
  };

  const isToday = currentDate === todayStr();

  // ── Render receipt to Canvas for sharing or saving ─────────────────────────
  const generateReceiptCanvas = () => {
    if (!displayReceipt) return null;
    const canvas = document.createElement('canvas');
    const width = 720;
    const padding = 56;
    const metricsCount = displayReceipt.metrics.length;
    const height = 480 + (metricsCount * 46);

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background paper
    ctx.fillStyle = '#F3EFE6';
    ctx.fillRect(0, 0, width, height);

    // Subtle edge hairline
    ctx.strokeStyle = '#E2DDD3';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 12, width - 24, height - 24);

    let y = padding + 20;

    // Header: Zyrbit
    ctx.fillStyle = '#141517';
    ctx.font = '700 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Zyrbit', padding, y);

    y += 28;

    // Subtitle: DAY RECEIPT · FRI 2 OCT
    ctx.fillStyle = '#6E7079';
    ctx.font = '600 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.letterSpacing = '0.08em';
    ctx.fillText(displayReceipt.dateFormatted || 'DAY RECEIPT', padding, y);

    y += 36;

    // Hairline divider
    ctx.beginPath();
    ctx.strokeStyle = '#D9D3C7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    y += 40;

    // Metrics list
    if (displayReceipt.metrics.length === 0) {
      ctx.fillStyle = '#8C8E96';
      ctx.font = '400 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('Nothing captured yet today.', padding, y);
      y += 40;
    } else {
      displayReceipt.metrics.forEach((m) => {
        // Label
        ctx.fillStyle = '#222428';
        ctx.font = '500 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(m.label, padding, y);

        // Value
        ctx.fillStyle = '#141517';
        ctx.font = '600 16px "SF Mono", "Roboto Mono", Menlo, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(m.value, width - padding, y);

        y += 42;
      });
    }

    y += 12;

    // Dotted separator
    ctx.beginPath();
    ctx.strokeStyle = '#D9D3C7';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    ctx.setLineDash([]);

    y += 50;

    // Natural language state / Interpretation in serif
    ctx.textAlign = 'center';
    ctx.fillStyle = '#18191C';
    ctx.font = 'italic 400 32px "Newsreader", "Georgia", serif';

    const lines = (displayReceipt.interpretation || 'Rhythm held steady.').split('\n');
    lines.forEach((line) => {
      ctx.fillText(line, width / 2, y);
      y += 42;
    });

    // Tomorrow guidance
    if (displayReceipt.tomorrow) {
      y += 14;
      ctx.fillStyle = '#6E7079';
      ctx.font = '400 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(displayReceipt.tomorrow, width / 2, y);
    }

    return canvas;
  };

  // ── Action: Save receipt as image ──────────────────────────────────────────
  const handleSave = () => {
    try {
      const canvas = generateReceiptCanvas();
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `zyrbit-day-receipt-${currentDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      showToast('Receipt saved to downloads', 'success');
    } catch (err) {
      console.error('Failed to save receipt:', err);
      showToast('Could not save image', 'error');
    }
  };

  // ── Action: Share to story ────────────────────────────────────────────────
  const handleShare = async () => {
    try {
      const canvas = generateReceiptCanvas();
      if (!canvas) return;

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], `zyrbit-receipt-${currentDate}.png`, { type: 'image/png' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Zyrbit Day Receipt · ${currentDate}`,
              text: `${displayReceipt.interpretation?.replace('\n', ' ')} — Zyrbit`,
            });
            showToast('Receipt shared!', 'success');
            return;
          } catch (shareErr) {
            if (shareErr.name === 'AbortError') return;
          }
        }

        // Fallback: Copy summary to clipboard
        try {
          const summaryText = [
            `Zyrbit — ${displayReceipt.dateFormatted}`,
            '',
            ...displayReceipt.metrics.map((m) => `${m.label.padEnd(20)} ${m.value}`),
            '-----------------------------------',
            displayReceipt.interpretation,
            displayReceipt.tomorrow ? `\n${displayReceipt.tomorrow}` : '',
          ].filter(Boolean).join('\n');

          await navigator.clipboard.writeText(summaryText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
          showToast('Receipt copied to clipboard for sharing', 'success');
        } catch {
          // Download as second fallback
          handleSave();
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to share receipt:', err);
      showToast('Could not share receipt', 'error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 9, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Container wrapper */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Top bar controls */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 4px',
            color: '#9CA3AF',
          }}
        >
          {/* History day navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handlePrevDay}
              title="Previous day"
              style={{
                background: '#15181B',
                border: '1px solid #23272E',
                borderRadius: '6px',
                color: '#9CA3AF',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>

            <span style={{ fontSize: '11px', fontWeight: 600, color: '#E5E7EB', letterSpacing: '0.04em' }}>
              {isToday ? 'Today' : currentDate}
            </span>

            <button
              onClick={handleNextDay}
              disabled={isToday}
              title="Next day"
              style={{
                background: '#15181B',
                border: '1px solid #23272E',
                borderRadius: '6px',
                color: isToday ? '#374151' : '#9CA3AF',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isToday ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Privacy & Close buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setHideFinancials((v) => !v)}
              title={hideFinancials ? 'Show financial amounts' : 'Mask financial amounts for privacy'}
              style={{
                background: hideFinancials ? '#1A231E' : '#15181B',
                border: `1px solid ${hideFinancials ? '#1FA36F40' : '#23272E'}`,
                borderRadius: '6px',
                color: hideFinancials ? '#1FA36F' : '#9CA3AF',
                padding: '4px 8px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              {hideFinancials ? <EyeOff size={12} /> : <Eye size={12} />}
              <span>{hideFinancials ? 'Private' : 'Full'}</span>
            </button>

            <button
              onClick={onClose}
              style={{
                background: '#15181B',
                border: '1px solid #23272E',
                borderRadius: '6px',
                color: '#9CA3AF',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── THE PHYSICAL RECEIPT ARTIFACT ─────────────────────────────────── */}
        <div
          ref={receiptCardRef}
          style={{
            width: '100%',
            background: '#F3EFE6',
            color: '#141517',
            borderRadius: '4px',
            padding: '28px 24px 32px 24px',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            position: 'relative',
            userSelect: 'none',
          }}
        >
          {loading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#6B7280', fontSize: '13px' }}>
              Synthesizing day...
            </div>
          ) : !displayReceipt ? null : (
            <>
              {/* Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '-0.02em', color: '#111215' }}>
                  Zyrbit
                </div>
                <div
                  style={{
                    fontSize: '10.5px',
                    fontWeight: 700,
                    letterSpacing: '0.09em',
                    textTransform: 'uppercase',
                    color: '#65676F',
                  }}
                >
                  {displayReceipt.dateFormatted}
                </div>
              </div>

              {/* Dotted hairline separator */}
              <div
                style={{
                  borderBottom: '1px dashed #D2CBC0',
                  margin: '2px 0',
                }}
              />

              {/* Metrics table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {displayReceipt.metrics.length === 0 ? (
                  <div style={{ padding: '16px 0', color: '#888B94', fontSize: '13px', textAlign: 'center' }}>
                    Nothing recorded yet today.
                  </div>
                ) : (
                  displayReceipt.metrics.map((m) => (
                    <div
                      key={m.id || m.label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '13.5px',
                      }}
                    >
                      <span style={{ color: '#2B2D33', fontWeight: 500 }}>
                        {m.label}
                      </span>
                      <span
                        style={{
                          color: '#111215',
                          fontWeight: 600,
                          fontFamily: '"SF Mono", "Roboto Mono", Menlo, monospace',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {m.value}
                      </span>
                    </div>
                  ))
                )}
              </div>

              {/* Dotted hairline separator */}
              <div
                style={{
                  borderBottom: '1px dashed #D2CBC0',
                  margin: '4px 0',
                }}
              />

              {/* Natural language day interpretation in serif display */}
              <div
                style={{
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  padding: '8px 4px 4px 4px',
                }}
              >
                <div
                  style={{
                    fontFamily: '"Newsreader", "Georgia", serif',
                    fontSize: '24px',
                    lineHeight: 1.25,
                    fontWeight: 400,
                    fontStyle: 'italic',
                    color: '#15161A',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {displayReceipt.interpretation}
                </div>

                {displayReceipt.tomorrow && (
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: '#65676F',
                      fontWeight: 400,
                      letterSpacing: '-0.01em',
                      marginTop: '4px',
                    }}
                  >
                    {displayReceipt.tomorrow}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* ── ACTION BUTTONS: [ Share to story ]  [ Save ] ──────────────────── */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginTop: '4px',
          }}
        >
          <button
            onClick={handleShare}
            style={{
              background: '#F3EFE6',
              border: 'none',
              borderRadius: '6px',
              color: '#141517',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            {copied ? <Check size={14} color="#1FA36F" /> : <Share2 size={14} />}
            <span>{copied ? 'Copied' : 'Share to story'}</span>
          </button>

          <button
            onClick={handleSave}
            style={{
              background: 'transparent',
              border: '1px solid #32353D',
              borderRadius: '6px',
              color: '#E5E7EB',
              fontSize: '12.5px',
              fontWeight: 600,
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#1FA36F';
              e.currentTarget.style.color = '#1FA36F';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#32353D';
              e.currentTarget.style.color = '#E5E7EB';
            }}
          >
            <Download size={14} />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}
