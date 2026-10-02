import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, ArrowUpRight, Check, ChevronRight } from 'lucide-react';
import { resolveFinancialInput } from '../../../dex/resolvers/moneyResolver.js';

const PRESETS = [
  'Poha ₹30',
  'Ninad owes me ₹300',
  'Spotify 119 every month',
  'Borrowed 500 from Vasu, return Oct 10',
  'Made 3000 from editing',
  'Moved ₹2,000 to savings',
  'Invested ₹2,000',
];

/**
 * MoneyEventModal — Dexterous Bottom Sheet
 * Replaces the old 8-button accounting form with the natural-language capture
 * bottom sheet from the Zyrbit Wealth reference.
 *
 * Flow:
 * 1. User tells Zyrbit what happened ("I ate poha for ₹30", "Ninad owes me ₹300")
 * 2. Zyrbit understands the semantics deterministically
 * 3. Shows "UNDERSTOOD AS" confirmation card
 * 4. User confirms with one tap
 * 5. Optional manual fallback via "or Log manually"
 */
export default function MoneyEventModal({
  currencySymbol = '₹',
  isOpen,
  onClose,
  onSave,
}) {
  const [naturalText, setNaturalText] = useState('');
  const [clarification, setClarification] = useState(null);
  const [resolvedState, setResolvedState] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [manualType, setManualType] = useState('SPEND');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setNaturalText('');
      setClarification(null);
      setResolvedState(null);
      setIsManualMode(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Live natural language parser
  const analyzeInput = (text) => {
    if (!text || !text.trim()) {
      setClarification(null);
      setResolvedState(null);
      return;
    }

    const resolved = resolveFinancialInput(text.trim());

    if (resolved.status === 'clarify') {
      setClarification({
        question: resolved.question || 'Was this a loan, gift, or reimbursement?',
        options: resolved.options || ['Loan', 'Gift', 'Reimbursement'],
      });
      setResolvedState(null);
      return;
    }

    setClarification(null);

    if (resolved.status === 'resolved' && resolved.params) {
      setResolvedState(resolved);
    } else {
      setResolvedState(null);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setNaturalText(val);
    analyzeInput(val);
  };

  const handleChipClick = (preset) => {
    setNaturalText(preset);
    analyzeInput(preset);
    inputRef.current?.focus();
  };

  const handleClarifyOption = (option) => {
    let augmented = naturalText;
    if (option === 'Loan') augmented += ' as a loan to return';
    else if (option === 'Gift') augmented += ' as a gift';
    else if (option === 'Reimbursement') augmented += ' for reimbursement';
    setNaturalText(augmented);
    analyzeInput(augmented);
  };

  // Convert resolved intent into service params and save
  const handleConfirm = async () => {
    if (!resolvedState || saving) return;
    setSaving(true);
    try {
      const p = resolvedState.params;
      let eventParams = {};

      if (resolvedState.action === 'add_income') {
        eventParams = {
          type: 'INCOME',
          amount: p.amount,
          title: p.note || p.source || 'Income',
          source: p.source || 'Freelance',
          date: p.date,
        };
      } else if (resolvedState.action === 'add_bill') {
        const isBorrow = (p.name || '').toLowerCase().includes('return to') || (p.name || '').toLowerCase().includes('borrow');
        const isRec = p.status === 'receivable';

        if (isRec) {
          eventParams = {
            type: 'LEND',
            amount: p.amount,
            person: p.person || p.name?.replace(/\s+owes you/i, '') || 'Friend',
            title: p.name || 'Money promise',
            dueDate: p.dueDate,
            date: p.date,
          };
        } else if (isBorrow) {
          eventParams = {
            type: 'BORROW',
            amount: p.amount,
            person: p.person || p.name?.replace(/^return to\s+/i, '') || 'Lender',
            title: p.name || 'Borrowed',
            dueDate: p.dueDate,
            date: p.date,
          };
        } else {
          eventParams = {
            type: 'COMMITMENT',
            amount: p.amount,
            title: p.name || 'Commitment',
            frequency: p.frequency || 'monthly',
            dueDate: p.dueDate,
            date: p.date,
          };
        }
      } else if (resolvedState.action === 'add_expense') {
        if (p.category === 'Transfer') {
          eventParams = {
            type: 'TRANSFER',
            amount: p.amount,
            title: p.note || 'Transfer to savings',
            category: 'Transfer',
            date: p.date,
          };
        } else if (p.category === 'Investment') {
          eventParams = {
            type: 'INVESTMENT',
            amount: p.amount,
            title: p.note || 'Investment',
            category: 'Investment',
            date: p.date,
          };
        } else {
          eventParams = {
            type: 'SPEND',
            amount: p.amount,
            title: p.note || p.category || 'Expense',
            category: p.category || 'General',
            date: p.date,
          };
        }
      }

      await onSave(eventParams);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleManualSave = async () => {
    const amt = parseFloat(manualAmount);
    if (!amt || isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      await onSave({
        type: manualType,
        amount: amt,
        title: manualNote.trim() || 'Manual entry',
        category: manualType === 'SPEND' ? 'General' : undefined,
        source: manualType === 'INCOME' ? 'General' : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 7, 9, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        padding: '0',
        animation: 'fadeIn 0.18s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#15181B',
          borderTop: '1px solid #23272E',
          borderLeft: '1px solid #23272E',
          borderRight: '1px solid #23272E',
          borderRadius: '20px 20px 0 0',
          padding: '16px 20px 28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 -20px 40px -10px rgba(0, 0, 0, 0.8)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '36px',
            height: '4px',
            background: '#374151',
            borderRadius: '2px',
            margin: '0 auto 4px auto',
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div
            className="font-serif-state"
            style={{
              fontSize: '20px',
              fontWeight: 400,
              color: '#F5F5F5',
              letterSpacing: '-0.01em',
            }}
          >
            {isManualMode ? 'Log manually' : 'Tell Zyrbit what happened'}
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#1F2329',
              border: 'none',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: '#9CA3AF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {!isManualMode ? (
          <>
            {/* Natural language input field */}
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                ref={inputRef}
                type="text"
                value={naturalText}
                onChange={handleTextChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && resolvedState) handleConfirm();
                }}
                placeholder="I ate poha for ₹30..."
                style={{
                  width: '100%',
                  background: '#1A1D22',
                  border: '1px solid #282C35',
                  borderRadius: '10px',
                  padding: '13px 42px 13px 14px',
                  color: '#F5F5F5',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#E9B44C'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#282C35'; }}
              />
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#9CA3AF',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mic size={17} />
              </div>
            </div>

            {/* Quick preset chips */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none',
              }}
            >
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleChipClick(preset)}
                  style={{
                    background: '#1E2229',
                    border: '1px solid #282D36',
                    borderRadius: '8px',
                    color: '#D1D5DB',
                    fontSize: '12px',
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#E9B44C40';
                    e.currentTarget.style.color = '#F5F5F5';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#282D36';
                    e.currentTarget.style.color = '#D1D5DB';
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Clarification Prompt (for ambiguous cases e.g. "Gave Ninad ₹300") */}
            {clarification && (
              <div
                style={{
                  background: '#1C2129',
                  border: '1px solid #F59E0B40',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#F59E0B', fontWeight: 600 }}>
                  {clarification.question}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {clarification.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleClarifyOption(opt)}
                      style={{
                        background: '#242A34',
                        border: '1px solid #374151',
                        borderRadius: '6px',
                        color: '#F5F5F5',
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '6px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* UNDERSTOOD AS Preview Card */}
            {resolvedState && !clarification && (
              <div
                style={{
                  background: '#181C22',
                  border: '1px solid #282E38',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: '#E9B44C',
                  }}
                >
                  UNDERSTOOD AS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: '#F5F5F5' }}>
                    {resolvedState.params?.note || resolvedState.params?.name || resolvedState.params?.category || 'Financial Event'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#F5F5F5' }}>
                    {resolvedState.action === 'add_income' ? '+' : ''}{currencySymbol}{resolvedState.params?.amount?.toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  {resolvedState.action === 'add_bill'
                    ? `Commitment / Promise · Due ${resolvedState.params?.dueDate || 'soon'}`
                    : resolvedState.params?.category === 'Transfer'
                    ? 'Asset Transfer (No net loss)'
                    : resolvedState.params?.category === 'Investment'
                    ? 'Investment Asset Movement'
                    : 'Expense deducted from everyday spend'}
                </div>
              </div>
            )}

            {/* Primary Action Button: Understand / Confirm */}
            <button
              type="button"
              onClick={resolvedState ? handleConfirm : () => analyzeInput(naturalText)}
              disabled={!naturalText.trim() || saving}
              style={{
                width: '100%',
                background: '#E9B44C',
                border: 'none',
                borderRadius: '10px',
                color: '#0B0D0F',
                fontSize: '14px',
                fontWeight: 700,
                padding: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: naturalText.trim() ? 'pointer' : 'not-allowed',
                opacity: naturalText.trim() ? 1 : 0.45,
                transition: 'opacity 0.15s',
              }}
            >
              {resolvedState ? (
                <>
                  <Check size={16} />
                  <span>{saving ? 'Recording...' : 'Confirm & Record'}</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={16} />
                  <span>Understand</span>
                </>
              )}
            </button>

            {/* Bottom link: or Log manually */}
            <div style={{ textAlign: 'center', marginTop: '-4px' }}>
              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                or <span style={{ textDecoration: 'underline', color: '#D1D5DB' }}>Log manually</span>
              </button>
            </div>
          </>
        ) : (
          /* Manual Entry Fallback */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {['SPEND', 'INCOME', 'COMMITMENT'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManualType(t)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    borderRadius: '6px',
                    background: manualType === t ? '#E9B44C' : '#1E2229',
                    color: manualType === t ? '#0B0D0F' : '#9CA3AF',
                    fontWeight: 600,
                    fontSize: '12px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Amount ({currencySymbol})</span>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: '#1A1D22',
                  border: '1px solid #282C35',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#F5F5F5',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Description / Title</span>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Poha, Metro, Groceries..."
                style={{
                  width: '100%',
                  background: '#1A1D22',
                  border: '1px solid #282C35',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#F5F5F5',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleManualSave}
              disabled={!manualAmount || saving}
              style={{
                width: '100%',
                background: '#E9B44C',
                border: 'none',
                borderRadius: '8px',
                color: '#0B0D0F',
                fontSize: '14px',
                fontWeight: 700,
                padding: '12px',
                marginTop: '4px',
                cursor: manualAmount ? 'pointer' : 'not-allowed',
                opacity: manualAmount ? 1 : 0.5,
              }}
            >
              {saving ? 'Recording...' : 'Record Transaction'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                onClick={() => setIsManualMode(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9CA3AF',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ← Back to natural capture
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
