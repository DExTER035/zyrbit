import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Shield,
  RotateCcw,
  Sparkles,
  ChevronRight,
  Edit2,
  Building2,
  Link2,
} from 'lucide-react';
import { importStatement, confirmImportTransactions, getImportBatches, rollbackImportBatch } from '../../../services/statementImportService.js';
import { showToast } from '../../ui/Toast.jsx';

const C = {
  bg: '#0E0F13',
  surface: '#15181B',
  elev: '#1B1F24',
  border: '#23272E',
  borderSubtle: 'rgba(255, 255, 255, 0.08)',
  text: '#ECE8DF',
  sub: '#9A978F',
  muted: '#6B7280',
  accent: '#1FA36F',
  gold: '#E9B44C',
  blue: '#38BDF8',
  purple: '#8B7FFF',
  danger: '#EF4444',
  warn: '#F59E0B',
};

export default function ConnectMoneyModal({
  isOpen,
  onClose,
  userId,
  currencySymbol = '₹',
  onImportComplete,
}) {
  const fileInputRef = useRef(null);

  // Modal views: 'upload' | 'review' | 'batches' | 'success'
  const [view, setView] = useState('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Staged import data
  const [activeBatch, setActiveBatch] = useState(null);
  const [stagedTransactions, setStagedTransactions] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [overrides, setOverrides] = useState({});
  const [editingTxId, setEditingTxId] = useState(null);

  // Review filters: 'all' | 'ready' | 'needs_review' | 'duplicate'
  const [filterTab, setFilterTab] = useState('all');

  // Past batches
  const [pastBatches, setPastBatches] = useState([]);

  const loadPastBatches = useCallback(async () => {
    if (!userId) return;
    const res = await getImportBatches(userId);
    if (res.success) {
      setPastBatches(res.batches || []);
    }
  }, [userId]);

  // Load past batches on open
  useEffect(() => {
    if (isOpen && userId) {
      loadPastBatches();
    }
  }, [isOpen, userId, loadPastBatches]);

  // ── File Upload Handler ──────────────────────────────────────────────────────
  const handleFileSelect = async (file) => {
    if (!file) return;
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const filename = file.name;
      const arrayBuffer = await file.arrayBuffer();

      const res = await importStatement({
        userId,
        fileData: arrayBuffer,
        filename,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to parse statement.');
        setIsProcessing(false);
        return;
      }

      if (!res.transactions || res.transactions.length === 0) {
        setErrorMessage('No transactions detected in this statement.');
        setIsProcessing(false);
        return;
      }

      setActiveBatch(res.batch);
      setStagedTransactions(res.transactions);

      // Auto-select all non-duplicate transactions by default
      const readyIds = new Set(
        res.transactions
          .filter(t => !t.isDuplicate)
          .map(t => t.id)
      );
      setSelectedIds(readyIds);
      setView('review');
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred while reading the file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  // ── Confirmation Handler ─────────────────────────────────────────────────────
  const handleConfirmSelected = async () => {
    if (!activeBatch || selectedIds.size === 0) return;
    setIsProcessing(true);
    try {
      const res = await confirmImportTransactions({
        userId,
        batchId: activeBatch.id,
        transactionIds: Array.from(selectedIds),
        overrides,
      });

      if (!res.success) {
        showToast(res.error || 'Failed to confirm transactions.', 'error');
        setIsProcessing(false);
        return;
      }

      showToast(`Imported ${res.confirmedCount} transactions into Wealth`, 'success');
      if (onImportComplete) onImportComplete();
      setView('success');
      loadPastBatches();
    } catch (err) {
      showToast(err.message || 'Error confirming transactions', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // ── Batch Rollback Handler ───────────────────────────────────────────────────
  const handleRollback = async (batchId) => {
    if (!window.confirm('Undo this statement import? This will remove all transactions created by this batch.')) {
      return;
    }
    setIsProcessing(true);
    const res = await rollbackImportBatch({ userId, batchId });
    if (res.success) {
      showToast('Import batch rolled back successfully.', 'success');
      loadPastBatches();
      if (onImportComplete) onImportComplete();
    } else {
      showToast(res.error || 'Rollback failed', 'error');
    }
    setIsProcessing(false);
  };

  // ── Filtered Transactions ────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return stagedTransactions.filter(tx => {
      if (filterTab === 'ready') return !tx.isDuplicate && tx.resolutionState === 'resolved';
      if (filterTab === 'needs_review') return !tx.isDuplicate && tx.resolutionState === 'needs_review';
      if (filterTab === 'duplicate') return tx.isDuplicate;
      return true;
    });
  }, [stagedTransactions, filterTab]);

  const toggleSelectTx = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleUpdateOverride = (txId, field, val) => {
    setOverrides(prev => ({
      ...prev,
      [txId]: {
        ...(prev[txId] || {}),
        [field]: val,
      },
    }));
  };

  // Calculate totals of selected transactions
  const selectedTotals = useMemo(() => {
    let outSum = 0;
    let inSum = 0;
    stagedTransactions.forEach(t => {
      if (selectedIds.has(t.id)) {
        if (t.direction === 'in') inSum += t.amount;
        else outSum += t.amount;
      }
    });
    return { outSum, inSum };
  }, [stagedTransactions, selectedIds]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 7, 9, 0.85)',
        backdropFilter: 'blur(16px)',
        zIndex: 250,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: C.bg,
          border: `1px solid ${C.border}`,
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: `1px solid ${C.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: C.surface,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'rgba(31, 163, 111, 0.12)',
                border: '1px solid rgba(31, 163, 111, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: C.accent,
              }}
            >
              <Link2 size={16} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Connect Money</span>
                <span style={{ fontSize: '10px', color: C.accent, background: 'rgba(31, 163, 111, 0.12)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                  V1
                </span>
              </div>
              <div style={{ fontSize: '11px', color: C.sub }}>
                Keep your financial picture current
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {view === 'upload' && pastBatches.length > 0 && (
              <button
                type="button"
                onClick={() => setView('batches')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${C.border}`,
                  borderRadius: '8px',
                  padding: '5px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: C.sub,
                  cursor: 'pointer',
                }}
              >
                History ({pastBatches.length})
              </button>
            )}

            {view !== 'upload' && view !== 'success' && (
              <button
                type="button"
                onClick={() => setView('upload')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: C.sub,
                  fontSize: '12px',
                  cursor: 'pointer',
                  marginRight: '4px',
                }}
              >
                Back
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: C.elev,
                border: `1px solid ${C.border}`,
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: C.sub,
              }}
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* VIEW 1: UPLOAD VIEW */}
          {view === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Error banner */}
              {errorMessage && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: C.danger,
                    fontSize: '12px',
                    lineHeight: 1.5,
                  }}
                >
                  <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>{errorMessage}</div>
                </div>
              )}

              {/* Upload Dropzone */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: C.sub, marginBottom: '8px' }}>
                  Import Statement
                </div>

                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: isDragging ? 'rgba(31, 163, 111, 0.08)' : C.surface,
                    border: `1.5px dashed ${isDragging ? C.accent : C.border}`,
                    borderRadius: '16px',
                    padding: '32px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                  />

                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(31, 163, 111, 0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: C.accent,
                    }}
                  >
                    <FileSpreadsheet size={22} />
                  </div>

                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: C.text }}>
                      Upload Paytm Statement
                    </div>
                    <div style={{ fontSize: '12px', color: C.sub, marginTop: '2px' }}>
                      Drag and drop your Excel (.xlsx / .xls) or CSV statement
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing}
                    style={{
                      marginTop: '6px',
                      background: C.accent,
                      color: '#0B0D0F',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '8px 18px',
                      fontSize: '12px',
                      fontWeight: 800,
                      cursor: isProcessing ? 'wait' : 'pointer',
                    }}
                  >
                    {isProcessing ? 'Analyzing Statement...' : 'Choose File'}
                  </button>

                  <div style={{ fontSize: '10px', color: C.muted, marginTop: '4px' }}>
                    Tip: Export your UPI Passbook statement directly from the Paytm app.
                  </div>
                </div>
              </div>

              {/* Privacy & Security note */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${C.borderSubtle}`,
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <Shield size={16} color={C.accent} style={{ flexShrink: 0 }} />
                <div style={{ fontSize: '11px', color: C.sub, lineHeight: 1.4 }}>
                  Statements are parsed locally on your device. Zyrbit never stores or asks for bank or Paytm credentials.
                </div>
              </div>

              {/* Future Integrations (Clear Coming Soon) */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: C.muted, marginBottom: '8px' }}>
                  Future Financial Sources
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.borderSubtle}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={16} color={C.muted} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Bank Statement</div>
                        <div style={{ fontSize: '10.5px', color: C.muted }}>HDFC, ICICI, SBI passbook PDF parsing</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, background: 'rgba(233, 180, 76, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      Coming Soon
                    </span>
                  </div>

                  <div
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.borderSubtle}`,
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      opacity: 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Sparkles size={16} color={C.muted} />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: C.text }}>Account Aggregator</div>
                        <div style={{ fontSize: '10.5px', color: C.muted }}>Consent-based direct bank sync</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: C.gold, background: 'rgba(233, 180, 76, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                      Coming Soon
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 2: IMPORT REVIEW */}
          {view === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Review Header Banner */}
              <div
                style={{
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: '14px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: C.accent }}>
                    Import Batch #{activeBatch?.batch_code || 'NEW'}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, marginTop: '2px' }}>
                    {stagedTransactions.length} transactions extracted
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: C.sub }}>
                    {selectedIds.size} ready to confirm
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                {[
                  { id: 'all', label: `All (${stagedTransactions.length})` },
                  { id: 'ready', label: `Ready (${stagedTransactions.filter(t => !t.isDuplicate && t.resolutionState === 'resolved').length})` },
                  { id: 'needs_review', label: `Needs Review (${stagedTransactions.filter(t => !t.isDuplicate && t.resolutionState === 'needs_review').length})` },
                  { id: 'duplicate', label: `Duplicates (${stagedTransactions.filter(t => t.isDuplicate).length})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterTab(tab.id)}
                    style={{
                      background: filterTab === tab.id ? 'rgba(31, 163, 111, 0.15)' : C.surface,
                      border: `1px solid ${filterTab === tab.id ? C.accent : C.border}`,
                      borderRadius: '8px',
                      padding: '5px 10px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: filterTab === tab.id ? C.accent : C.sub,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Transactions List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTransactions.map(tx => {
                  const isSelected = selectedIds.has(tx.id);
                  const isEditing = editingTxId === tx.id;
                  const override = overrides[tx.id] || {};
                  const currentCategory = override.category || tx.suggestedCategory;
                  const currentAction = override.action || tx.suggestedAction;

                  return (
                    <div
                      key={tx.id}
                      style={{
                        background: C.surface,
                        border: `1px solid ${tx.isDuplicate ? C.borderSubtle : isSelected ? 'rgba(31, 163, 111, 0.35)' : C.border}`,
                        borderRadius: '14px',
                        padding: '12px 14px',
                        opacity: tx.isDuplicate ? 0.6 : 1,
                        transition: 'all 0.15s',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Checkbox & Counterparty */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <input
                            type="checkbox"
                            disabled={tx.isDuplicate}
                            checked={isSelected}
                            onChange={() => toggleSelectTx(tx.id)}
                            style={{ width: '16px', height: '16px', accentColor: C.accent, cursor: tx.isDuplicate ? 'not-allowed' : 'pointer' }}
                          />

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.counterparty}
                            </div>
                            <div style={{ fontSize: '11px', color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {tx.rawDescription || tx.date}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Pill */}
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '10px' }}>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: 800,
                              color: tx.direction === 'in' ? C.accent : C.text,
                            }}
                          >
                            {tx.direction === 'in' ? '+' : '-'}{currencySymbol}{tx.amount.toLocaleString('en-IN')}
                          </div>
                          <div style={{ fontSize: '10px', color: C.sub }}>
                            {tx.date}
                          </div>
                        </div>
                      </div>

                      {/* Classification Badge & Inline Review Prompt */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '4px', borderTop: `1px solid ${C.borderSubtle}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '6px',
                              background:
                                currentAction === 'transfer' ? 'rgba(139, 127, 255, 0.15)' :
                                currentAction === 'investment' ? 'rgba(16, 185, 129, 0.15)' :
                                currentAction === 'refund' ? 'rgba(52, 211, 153, 0.15)' :
                                currentCategory === 'Food' ? 'rgba(31, 163, 111, 0.15)' :
                                currentCategory === 'Transport' ? 'rgba(56, 189, 248, 0.15)' :
                                currentCategory === 'Education' ? 'rgba(233, 180, 76, 0.15)' :
                                'rgba(255, 255, 255, 0.08)',
                              color:
                                currentAction === 'transfer' ? C.purple :
                                currentAction === 'investment' ? '#10B981' :
                                currentAction === 'refund' ? '#34D399' :
                                currentCategory === 'Food' ? C.accent :
                                currentCategory === 'Transport' ? C.blue :
                                currentCategory === 'Education' ? C.gold :
                                C.sub,
                            }}
                          >
                            {currentAction === 'transfer' ? 'Transfer' : currentAction === 'investment' ? 'Investment' : currentCategory}
                          </span>

                          {tx.isDuplicate && (
                            <span style={{ fontSize: '10px', color: C.muted, fontStyle: 'italic' }}>
                              {tx.duplicateReason || 'Duplicate'}
                            </span>
                          )}

                          {!tx.isDuplicate && tx.resolutionState === 'needs_review' && (
                            <span style={{ fontSize: '10px', color: C.warn, fontWeight: 600 }}>
                              {tx.reviewReason || 'Needs clarification'}
                            </span>
                          )}
                        </div>

                        {!tx.isDuplicate && (
                          <button
                            type="button"
                            onClick={() => setEditingTxId(isEditing ? null : tx.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: C.sub,
                              fontSize: '11px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}
                          >
                            <Edit2 size={11} />
                            <span>{isEditing ? 'Done' : 'Edit'}</span>
                          </button>
                        )}
                      </div>

                      {/* Inline quick editor when user taps Edit */}
                      {isEditing && (
                        <div
                          style={{
                            background: C.elev,
                            borderRadius: '10px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            marginTop: '4px',
                          }}
                        >
                          <div style={{ fontSize: '10px', color: C.sub, fontWeight: 700 }}>Classification</div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                            {['Food', 'Transport', 'Education', 'Transfer', 'Investment', 'Tools & Subscriptions', 'Income', 'Other'].map(cat => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  if (cat === 'Transfer') {
                                    handleUpdateOverride(tx.id, 'action', 'transfer');
                                    handleUpdateOverride(tx.id, 'category', 'Transfer');
                                  } else if (cat === 'Investment') {
                                    handleUpdateOverride(tx.id, 'action', 'investment');
                                    handleUpdateOverride(tx.id, 'category', 'Investment');
                                  } else if (cat === 'Income') {
                                    handleUpdateOverride(tx.id, 'action', 'add_income');
                                    handleUpdateOverride(tx.id, 'category', 'Income');
                                  } else {
                                    handleUpdateOverride(tx.id, 'action', 'add_expense');
                                    handleUpdateOverride(tx.id, 'category', cat);
                                  }
                                }}
                                style={{
                                  background: currentCategory === cat ? 'rgba(31, 163, 111, 0.2)' : C.surface,
                                  border: `1px solid ${currentCategory === cat ? C.accent : C.border}`,
                                  borderRadius: '6px',
                                  padding: '4px 6px',
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  color: currentCategory === cat ? C.accent : C.sub,
                                  cursor: 'pointer',
                                  textAlign: 'center',
                                }}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* VIEW 3: PAST BATCHES HISTORY */}
          {view === 'batches' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', color: C.sub }}>
                Past Statement Imports
              </div>

              {pastBatches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: C.muted, fontSize: '12px' }}>
                  No previous imports found.
                </div>
              ) : (
                pastBatches.map(b => (
                  <div
                    key={b.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: '14px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: C.accent, background: 'rgba(31, 163, 111, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                          #{b.batch_code || b.batchCode || 'IMPORT'}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: C.text }}>
                          {b.filename || 'Paytm Statement'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: C.muted }}>
                        {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: C.sub, display: 'flex', gap: '12px' }}>
                      <span>{b.total_count || b.totalCount || 0} transactions</span>
                      <span>·</span>
                      <span style={{ color: C.accent }}>{b.confirmed_count || b.confirmedCount || 0} confirmed</span>
                      {b.status === 'rolled_back' && (
                        <span style={{ color: C.warn }}>(Rolled back)</span>
                      )}
                    </div>

                    {b.status !== 'rolled_back' && (
                      <div style={{ paddingTop: '6px', borderTop: `1px solid ${C.borderSubtle}`, display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => handleRollback(b.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: C.danger,
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <RotateCcw size={11} />
                          <span>Undo this import</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW 4: SUCCESS VIEW */}
          {view === 'success' && (
            <div style={{ textAlign: 'center', padding: '36px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(31, 163, 111, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: C.accent,
                }}
              >
                <CheckCircle2 size={32} />
              </div>

              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: C.text }}>
                  Statement Imported Successfully
                </div>
                <div style={{ fontSize: '12.5px', color: C.sub, marginTop: '4px', maxWidth: '320px' }}>
                  {selectedIds.size} transactions added to Wealth. Safe-to-Spend, Flow, and Dex context have been refreshed.
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                style={{
                  marginTop: '12px',
                  background: C.accent,
                  color: '#0B0D0F',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 28px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* ── Sticky Bottom Bar for Review View ── */}
        {view === 'review' && (
          <div
            style={{
              padding: '14px 20px',
              borderTop: `1px solid ${C.border}`,
              background: C.surface,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: C.sub }}>
                {selectedIds.size} of {stagedTransactions.length} selected
              </span>
              <span style={{ fontWeight: 700, color: C.text }}>
                {selectedTotals.outSum > 0 && <span>-{currencySymbol}{selectedTotals.outSum.toLocaleString('en-IN')} out</span>}
                {selectedTotals.outSum > 0 && selectedTotals.inSum > 0 && <span> · </span>}
                {selectedTotals.inSum > 0 && <span style={{ color: C.accent }}>+{currencySymbol}{selectedTotals.inSum.toLocaleString('en-IN')} in</span>}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setView('upload')}
                style={{
                  flex: 1,
                  background: C.elev,
                  border: `1px solid ${C.border}`,
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: C.sub,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessing || selectedIds.size === 0}
                onClick={handleConfirmSelected}
                style={{
                  flex: 2,
                  background: selectedIds.size > 0 ? C.accent : C.border,
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: selectedIds.size > 0 ? '#0B0D0F' : C.muted,
                  cursor: isProcessing || selectedIds.size === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                {isProcessing ? 'Confirming...' : `Confirm Selected (${selectedIds.size})`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
