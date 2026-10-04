/**
 * Zyrbit V1.1 — Dex Visual Capture Card
 * SCREENSHOT → UNDERSTAND → PREVIEW → CONFIRM → CANONICAL STATE
 *
 * Implements the complete Dex vision card flow:
 * 1. Attached preview thumbnail + accompanying text
 * 2. Stepwise non-blocking processing state
 * 3. Structured extraction preview (names, amounts, confidence badges)
 * 4. Review / Edit mode (edit names/amounts, remove, add entries, live total)
 * 5. Semantic classification ([ ↑ Owed to me ], [ ↓ I owe ], [ Expense / Spending ])
 * 6. Duplicate detection warning
 * 7. Canonical confirmation via wealthService
 * 8. Ripple success state with single-click composite undo
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
  X,
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Eye,
  Check,
  Edit2,
} from 'lucide-react';
import {
  extractImageFacts,
  formatINR,
  checkDuplicateEntries,
  executeVisualCaptureBatch,
  undoVisualCaptureBatch,
} from '../../../services/visualCaptureService.js';
import { getBills } from '../../../services/wealthService.js';
import { supabase } from '../../../lib/supabase/index.js';

export default function DexVisualCaptureCard({
  userId,
  attachedImage,
  initialText = '',
  onClose,
  onNavigateToWealth,
  onBatchCompleted,
}) {
  // Card stages: 'ATTACHED' | 'PROCESSING' | 'ERROR' | 'PREVIEW' | 'REVIEW' | 'CONFIRM' | 'SUCCESS'
  const [stage, setStage] = useState('ATTACHED');
  const [accompanyingText, setAccompanyingText] = useState(initialText);

  // Progressive processing steps
  const [processingStep, setProcessingStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Structured extraction data
  const [entries, setEntries] = useState([]);
  const [semanticType, setSemanticType] = useState(null); // 'OWED_TO_ME' | 'I_OWE' | 'SPEND'
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);

  // Execution & Undo state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [executedResult, setExecutedResult] = useState(null);
  const [undoCountdown, setUndoCountdown] = useState(10);
  const [isUndone, setIsUndone] = useState(false);

  // Existing bills for duplicate detection
  const [existingBills, setExistingBills] = useState([]);

  useEffect(() => {
    const fetchExisting = async () => {
      let uid = userId;
      if (!uid) {
        const { data: sessionData } = await supabase.auth.getSession();
        uid = sessionData?.session?.user?.id;
      }
      if (uid) {
        const res = await getBills({ userId: uid });
        if (res.success && res.data) {
          setExistingBills(res.data);
        }
      }
    };
    fetchExisting();
  }, [userId]);

  // Total calculation helper
  const totalAmount = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // Processing steps animation
  const startAnalysis = async () => {
    setStage('PROCESSING');
    setProcessingStep(0);
    setErrorMessage('');

    // Step 1: Reading text
    const t1 = setTimeout(() => setProcessingStep(1), 300);
    // Step 2: Finding people and amounts
    const t2 = setTimeout(() => setProcessingStep(2), 650);
    // Step 3: Understanding context
    const t3 = setTimeout(() => setProcessingStep(3), 1000);
    // Step 4: Preparing preview
    const t4 = setTimeout(() => setProcessingStep(4), 1300);

    try {
      const res = await extractImageFacts({
        file: attachedImage?.file,
        dataUrl: attachedImage?.dataUrl,
        textContext: accompanyingText,
      });

      await new Promise((r) => setTimeout(r, 1400));

      if (res.success && res.extraction?.entries?.length > 0) {
        setEntries(res.extraction.entries);
        setStage('PREVIEW');
      } else {
        setErrorMessage(res.message || "Couldn't read this image reliably.");
        setStage('ERROR');
      }
    } catch (err) {
      setErrorMessage(err.message || "Couldn't read this image reliably.");
      setStage('ERROR');
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    }
  };

  // Check for duplicates whenever semantic type is chosen
  useEffect(() => {
    if (semanticType && entries.length > 0 && existingBills.length > 0 && !allowDuplicates) {
      const dupResult = checkDuplicateEntries(entries, existingBills, semanticType);
      if (dupResult.hasDuplicates) {
        setDuplicateWarning(dupResult);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [semanticType, entries, existingBills, allowDuplicates]);

  // Undo countdown
  useEffect(() => {
    if (stage !== 'SUCCESS' || !executedResult) return;
    const interval = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, executedResult]);

  // Confirm and write canonical records
  const handleConfirmBatch = async () => {
    if (isSubmitting || entries.length === 0 || !semanticType) return;
    setIsSubmitting(true);

    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData?.session?.user?.id;
      }
      if (!activeUserId) {
        setErrorMessage('Authentication required. Please sign in to record entries.');
        setStage('ERROR');
        return;
      }

      const res = await executeVisualCaptureBatch({
        userId: activeUserId,
        entries,
        semanticType,
      });

      if (res.success) {
        setExecutedResult(res);
        setStage('SUCCESS');
        if (onBatchCompleted) {
          onBatchCompleted(res);
        }
      } else {
        setErrorMessage(res.error || 'Failed to record entries in Wealth.');
        setStage('ERROR');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Execution error occurred.');
      setStage('ERROR');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Undo batch action
  const handleUndo = async () => {
    if (!executedResult?.createdRecords || isUndone) return;
    setIsSubmitting(true);
    try {
      let activeUserId = userId;
      if (!activeUserId) {
        const { data: sessionData } = await supabase.auth.getSession();
        activeUserId = sessionData?.session?.user?.id;
      }
      if (activeUserId) {
        await undoVisualCaptureBatch({
          userId: activeUserId,
          createdRecords: executedResult.createdRecords,
        });
        setIsUndone(true);
      }
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Row edit handlers
  const handleUpdateEntry = (id, field, value) => {
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id === id) {
          const updated = { ...e, [field]: value };
          if (field === 'amount') {
            updated.amount = parseFloat(value) || 0;
          }
          return updated;
        }
        return e;
      })
    );
  };

  const handleRemoveEntry = (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleAddEntry = () => {
    const newEntry = {
      id: `vis-manual-${Date.now()}`,
      person: 'New Contact',
      amount: 100,
      currency: 'INR',
      confidence: 1.0,
      status: 'high',
    };
    setEntries((prev) => [...prev, newEntry]);
  };

  return (
    <div
      data-testid="dex-visual-capture-card"
      style={{
        width: '100%',
        background: '#15181B',
        border: '1px solid #26272D',
        borderRadius: '16px',
        padding: '16px 18px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        color: '#ECE8DF',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        margin: '8px 0',
      }}
    >
      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '6px',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={14} />
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#38BDF8',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}
          >
            DEX VISUAL CAPTURE
          </span>
        </div>

        {stage !== 'SUCCESS' && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Dismiss visual capture"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6B7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── STAGE 1: ATTACHED PREVIEW ── */}
      {stage === 'ATTACHED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>Image attached</div>

          {/* Thumbnail preview */}
          {attachedImage?.dataUrl && (
            <div
              style={{
                width: '100%',
                maxHeight: '160px',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #2A3039',
                background: '#0E0F13',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={attachedImage.dataUrl}
                alt="Screenshot preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '160px',
                  objectFit: 'contain',
                }}
              />
            </div>
          )}

          {/* Optional context message */}
          <input
            type="text"
            value={accompanyingText}
            onChange={(e) => setAccompanyingText(e.target.value)}
            placeholder="Add context or notes (e.g. Add this to my money records)"
            style={{
              width: '100%',
              background: '#1B1E24',
              border: '1px solid #2A3039',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#F5F5F5',
              fontSize: '13px',
              outline: 'none',
            }}
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={startAnalysis}
              data-testid="analyze-image-btn"
              style={{
                flex: 1,
                padding: '10px 14px',
                background: '#38BDF8',
                color: '#0E0F13',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} />
              Analyze image
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 14px',
                background: '#232830',
                color: '#D1D5DB',
                border: '1px solid #333A44',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 2: PROCESSING (NON-BLOCKING) ── */}
      {stage === 'PROCESSING' && (
        <div
          data-testid="dex-processing-state"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            padding: '8px 0',
          }}
        >
          <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ECE8DF' }}>
            Reading image...
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: processingStep >= 1 ? '#1FA36F' : '#6B7280' }}>
              <span>{processingStep >= 1 ? '✓' : '○'}</span>
              <span>Reading text</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: processingStep >= 2 ? '#1FA36F' : '#6B7280' }}>
              <span>{processingStep >= 2 ? '✓' : '○'}</span>
              <span>Finding people and amounts</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: processingStep >= 3 ? '#1FA36F' : '#6B7280' }}>
              <span>{processingStep >= 3 ? '✓' : '○'}</span>
              <span>Understanding context</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: processingStep >= 4 ? '#1FA36F' : '#6B7280' }}>
              <span>{processingStep >= 4 ? '✓' : '○'}</span>
              <span>Preparing preview</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STAGE 3: ERROR ── */}
      {stage === 'ERROR' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444' }}>
            <AlertCircle size={16} />
            <span style={{ fontSize: '13.5px', fontWeight: 600 }}>
              {errorMessage || "Couldn't read this image reliably."}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={startAnalysis}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: '#232830',
                color: '#ECE8DF',
                border: '1px solid #3A3B40',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '8px 12px',
                background: 'transparent',
                color: '#9CA3AF',
                border: '1px solid #26272D',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Enter manually
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 4: STRUCTURED EXTRACTION PREVIEW ── */}
      {stage === 'PREVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Header count & concise Dex response */}
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ECE8DF' }}>
            {entries.length} money entries found
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
            I found {entries.length} people and {formatINR(totalAmount)} in the screenshot. I haven't assumed what the amounts mean yet.
          </div>

          {/* Structured Entries Rows */}
          <div
            data-testid="extraction-entries-list"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              background: '#181C21',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1px solid #2A3039',
              maxHeight: '220px',
              overflowY: 'auto',
            }}
          >
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: '1px solid #232830',
                  fontSize: '13px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 600, color: '#F5F5F5' }}>{entry.person}</span>
                  {entry.status === 'medium' && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#F59E0B',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      <AlertTriangle size={10} /> Check
                    </span>
                  )}
                  {entry.status === 'low' && (
                    <span
                      style={{
                        fontSize: '11px',
                        color: '#EF4444',
                        background: 'rgba(239, 68, 68, 0.1)',
                        padding: '1px 5px',
                        borderRadius: '4px',
                      }}
                    >
                      ⚠ Low confidence
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: 700, color: '#ECE8DF', fontFamily: 'monospace' }}>
                    {formatINR(entry.amount)}
                  </span>
                  {entry.status === 'high' && (
                    <span style={{ color: '#1FA36F', fontSize: '11px' }}>✓</span>
                  )}
                </div>
              </div>
            ))}

            {/* Total Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '4px',
                fontWeight: 800,
                fontSize: '13.5px',
              }}
            >
              <span style={{ color: '#9CA3AF' }}>Total</span>
              <span data-testid="extraction-total-val" style={{ color: '#38BDF8', fontFamily: 'monospace' }}>
                {formatINR(totalAmount)}
              </span>
            </div>
          </div>

          {/* Action to switch to review/edit */}
          <button
            type="button"
            onClick={() => setStage('REVIEW')}
            data-testid="review-entries-btn"
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: 'none',
              color: '#38BDF8',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 0',
            }}
          >
            <Edit2 size={12} />
            Review & edit entries
          </button>

          {/* Semantic Meaning Selector (Section 8) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#D1D5DB' }}>
              What should these become?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              <button
                type="button"
                data-testid="semantic-owed-to-me"
                onClick={() => setSemanticType('OWED_TO_ME')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: `1px solid ${semanticType === 'OWED_TO_ME' ? '#1FA36F' : '#2A3039'}`,
                  background: semanticType === 'OWED_TO_ME' ? 'rgba(31, 163, 111, 0.15)' : '#181C21',
                  color: semanticType === 'OWED_TO_ME' ? '#1FA36F' : '#ECE8DF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <ArrowUpRight size={14} />
                <span>↑ Owed to me</span>
              </button>

              <button
                type="button"
                data-testid="semantic-i-owe"
                onClick={() => setSemanticType('I_OWE')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: `1px solid ${semanticType === 'I_OWE' ? '#E9B44C' : '#2A3039'}`,
                  background: semanticType === 'I_OWE' ? 'rgba(233, 180, 76, 0.15)' : '#181C21',
                  color: semanticType === 'I_OWE' ? '#E9B44C' : '#ECE8DF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <ArrowDownLeft size={14} />
                <span>↓ I owe</span>
              </button>

              <button
                type="button"
                data-testid="semantic-expense"
                onClick={() => setSemanticType('SPEND')}
                style={{
                  padding: '8px 4px',
                  borderRadius: '8px',
                  border: `1px solid ${semanticType === 'SPEND' ? '#38BDF8' : '#2A3039'}`,
                  background: semanticType === 'SPEND' ? 'rgba(56, 189, 248, 0.15)' : '#181C21',
                  color: semanticType === 'SPEND' ? '#38BDF8' : '#ECE8DF',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <Receipt size={14} />
                <span>Expense</span>
              </button>
            </div>
          </div>

          {/* Duplicate Warning Indicator (Section 12) */}
          {duplicateWarning && (
            <div
              data-testid="duplicate-warning-banner"
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid #F59E0B',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '12px',
                color: '#F59E0B',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>{duplicateWarning.message}</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={onNavigateToWealth}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#F59E0B',
                    textDecoration: 'underline',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  View existing
                </button>
                <button
                  type="button"
                  data-testid="add-anyway-btn"
                  onClick={() => setAllowDuplicates(true)}
                  style={{
                    background: '#F59E0B',
                    color: '#0E0F13',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: '2px 8px',
                  }}
                >
                  Add anyway
                </button>
              </div>
            </div>
          )}

          {/* Bulk Confirmation Action (Section 10) */}
          {semanticType && (!duplicateWarning || allowDuplicates) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ fontSize: '12px', color: '#1FA36F', fontWeight: 600 }}>
                {entries.length} entries ready · Total{' '}
                {semanticType === 'OWED_TO_ME'
                  ? 'receivable'
                  : semanticType === 'I_OWE'
                  ? 'debt'
                  : 'spend'}
                : {formatINR(totalAmount)}
              </div>
              <button
                type="button"
                data-testid="confirm-records-btn"
                onClick={handleConfirmBatch}
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '11px',
                  background: '#1FA36F',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Check size={16} />
                Confirm {entries.length} records
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STAGE 5: REVIEW / EDIT MODE (Section 9) ── */}
      {stage === 'REVIEW' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#ECE8DF' }}>
              Review entries
            </span>
            <span style={{ fontSize: '12px', color: '#38BDF8', fontWeight: 700 }}>
              Total: {formatINR(totalAmount)}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '260px',
              overflowY: 'auto',
            }}
          >
            {entries.map((entry, idx) => (
              <div
                key={entry.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#181C21',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #2A3039',
                }}
              >
                <input
                  type="text"
                  value={entry.person}
                  data-testid={`entry-person-${idx}`}
                  onChange={(e) => handleUpdateEntry(entry.id, 'person', e.target.value)}
                  style={{
                    flex: 2,
                    background: 'transparent',
                    border: 'none',
                    color: '#F5F5F5',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1.5 }}>
                  <span style={{ color: '#9CA3AF', fontSize: '12px' }}>₹</span>
                  <input
                    type="number"
                    value={entry.amount}
                    data-testid={`entry-amount-${idx}`}
                    onChange={(e) => handleUpdateEntry(entry.id, 'amount', e.target.value)}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#ECE8DF',
                      fontSize: '13px',
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
                <button
                  type="button"
                  data-testid={`remove-entry-${idx}`}
                  onClick={() => handleRemoveEntry(entry.id)}
                  aria-label="Remove entry"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#EF4444',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
            <button
              type="button"
              data-testid="add-another-entry-btn"
              onClick={handleAddEntry}
              style={{
                background: 'transparent',
                border: '1px dashed #3A3B40',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#38BDF8',
                fontSize: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
              }}
            >
              <Plus size={13} />
              Add another entry
            </button>

            <button
              type="button"
              data-testid="done-reviewing-btn"
              onClick={() => setStage('PREVIEW')}
              style={{
                background: '#232830',
                border: '1px solid #3A3B40',
                color: '#ECE8DF',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Done reviewing
            </button>
          </div>
        </div>
      )}

      {/* ── STAGE 6: SUCCESS RIPPLE STATE (Section 13) ── */}
      {stage === 'SUCCESS' && (
        <div
          data-testid="dex-visual-success-ripple"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#15181B',
            borderRadius: '12px',
            padding: '8px 0',
          }}
        >
          {isUndone ? (
            <div style={{ color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <RotateCcw size={14} />
              <span>Action undone. No records were saved.</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1FA36F' }}>
                <CheckCircle2 size={18} />
                <span style={{ fontSize: '14px', fontWeight: 800 }}>
                  ✓ {executedResult?.count} money relationships added
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  background: '#1B1E24',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  color: '#9CA3AF',
                }}
              >
                <div>
                  <strong style={{ color: '#F5F5F5' }}>WEALTH:</strong>{' '}
                  {formatINR(executedResult?.total)}{' '}
                  {executedResult?.semanticType === 'OWED_TO_ME' ? 'now owed to you' : 'recorded'}
                </div>
                <div>
                  <strong style={{ color: '#F5F5F5' }}>PROMISES:</strong> {executedResult?.count}{' '}
                  people added
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  data-testid="view-in-wealth-btn"
                  onClick={onNavigateToWealth}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    background: '#1FA36F',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <Eye size={14} />
                  View in Wealth
                </button>

                {undoCountdown > 0 && (
                  <button
                    type="button"
                    data-testid="undo-batch-btn"
                    onClick={handleUndo}
                    disabled={isSubmitting}
                    style={{
                      padding: '9px 14px',
                      background: '#232830',
                      color: '#ECE8DF',
                      border: '1px solid #3A3B40',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <RotateCcw size={13} />
                    Undo ({undoCountdown}s)
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
