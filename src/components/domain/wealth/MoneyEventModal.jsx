import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, ArrowUpRight, Check, Sparkles } from 'lucide-react';
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
 * Natural-language financial capture in Warm Ivory + Petrol Teal design language.
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
        } else if (p.category === 'Lend') {
          eventParams = {
            type: 'LEND',
            amount: p.amount,
            title: p.note || 'Lent money',
            person: p.person || p.note?.replace(/\s+owes me/i, '') || 'Friend',
            category: 'Lend',
            dueDate: p.dueDate,
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
        background: 'rgba(17, 26, 32, 0.45)',
        backdropFilter: 'blur(4px)',
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
          background: '#F4F0E8',
          borderTop: '1px solid #E5E0D8',
          borderLeft: '1px solid #E5E0D8',
          borderRight: '1px solid #E5E0D8',
          borderRadius: '24px 24px 0 0',
          padding: '16px 20px 28px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          boxShadow: '0 -20px 48px -12px rgba(17, 26, 32, 0.25)',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '36px',
            height: '4px',
            background: '#D5CEC5',
            borderRadius: '2px',
            margin: '0 auto 4px auto',
          }}
        />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '12px',
                background: '#DDE9EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#174A55',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: 700,
                  color: '#111A20',
                  letterSpacing: '-0.01em',
                }}
              >
                {isManualMode ? 'Log manually' : 'Tell Zyrbit what happened'}
              </div>
              <div style={{ fontSize: '11px', color: '#68777B' }}>
                Natural financial capture
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#FAF7F2',
              border: '1px solid #E5E0D8',
              borderRadius: '50%',
              width: '28px',
              height: '28px',
              color: '#68777B',
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
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E0D8',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
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
                  background: 'transparent',
                  border: 'none',
                  color: '#111A20',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
              <div style={{ color: '#68777B', display: 'flex', alignItems: 'center' }}>
                <Mic size={18} />
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
                    background: '#FAF7F2',
                    border: '1px solid #E5E0D8',
                    borderRadius: '10px',
                    color: '#111A20',
                    fontSize: '12px',
                    padding: '6px 12px',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#174A55';
                    e.currentTarget.style.background = '#DDE9EB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#E5E0D8';
                    e.currentTarget.style.background = '#FAF7F2';
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
                  background: '#FEF3C7',
                  border: '1px solid #FCD34D',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
                  {clarification.question}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {clarification.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleClarifyOption(opt)}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #FCD34D',
                        borderRadius: '8px',
                        color: '#92400E',
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
                  background: '#FFFFFF',
                  border: '1px solid #E5E0D8',
                  borderRadius: '16px',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#174A55',
                  }}
                >
                  UNDERSTOOD AS
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#111A20' }}>
                    {resolvedState.params?.note || resolvedState.params?.name || resolvedState.params?.category || 'Financial Event'}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#111A20' }}>
                    {resolvedState.action === 'add_income' ? '+' : ''}{currencySymbol}{resolvedState.params?.amount?.toLocaleString()}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#68777B' }}>
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
                background: '#174A55',
                border: 'none',
                borderRadius: '16px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                padding: '14px',
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
                  color: '#68777B',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                or <span style={{ textDecoration: 'underline', color: '#111A20', fontWeight: 600 }}>Log manually</span>
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
                    borderRadius: '10px',
                    background: manualType === t ? '#174A55' : '#FAF7F2',
                    color: manualType === t ? '#FFFFFF' : '#68777B',
                    fontWeight: 600,
                    fontSize: '12px',
                    border: '1px solid',
                    borderColor: manualType === t ? '#174A55' : '#E5E0D8',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E0D8',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#68777B', fontWeight: 600 }}>Amount ({currencySymbol})</span>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#111A20',
                  fontSize: '18px',
                  fontWeight: 700,
                  outline: 'none',
                }}
              />
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E5E0D8',
                borderRadius: '16px',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <span style={{ fontSize: '11px', color: '#68777B', fontWeight: 600 }}>Description / Title</span>
              <input
                type="text"
                value={manualNote}
                onChange={(e) => setManualNote(e.target.value)}
                placeholder="Poha, Metro, Groceries..."
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#111A20',
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
                background: '#174A55',
                border: 'none',
                borderRadius: '16px',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 700,
                padding: '14px',
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
                  color: '#68777B',
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

