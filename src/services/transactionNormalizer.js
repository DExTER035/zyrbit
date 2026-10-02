/**
 * Zyrbit — Connect Money: Transaction Normalizer
 *
 * Converts raw parsed rows into canonical internal representations.
 * Preserves raw descriptions and references for auditability and future cross-domain matching.
 */

/**
 * Extracts a clean counterparty / merchant / person name from raw Paytm narration.
 *
 * @param {string} rawDescription
 * @param {string} [explicitName='']
 * @returns {string}
 */
export function extractCounterparty(rawDescription = '', explicitName = '') {
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }

  if (!rawDescription) return 'Unknown';

  let str = rawDescription.trim();

  // Remove common Paytm/UPI prefixes
  str = str
    .replace(/^(?:paid\s+to|sent\s+to|payment\s+to|transferred\s+to|transfer\s+to|received\s+from|from|to)\s+/i, '')
    .replace(/^upi\/(?:p2p|p2m|qr|bil|bill)\/[^/]+\/([^/]+).*/i, '$1') // UPI/P2P/orderId/Name/...
    .replace(/^upi\/([^/]+).*/i, '$1');

  // Remove UPI IDs/VPA endings like "...@okhdfcbank", "...@paytm", "...@ybl"
  str = str.replace(/\b[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\b/g, '').trim();

  // Remove account numbers / masked account references like "from A/C XXXXXXXX1234", "A/c *1234"
  str = str.replace(/\b(?:from|to)?\s*(?:a\/c|ac|account)\s*(?:no\.?)?\s*[*xX0-9-]+\b/gi, '').trim();

  // Remove trailing transaction numbers/order codes
  str = str.replace(/\b(?:order\s*#?|txn\s*#?|ref\s*#?|id:?)\s*[a-z0-9_-]+/gi, '').trim();

  // Remove trailing slashes and dashes
  str = str.replace(/[/-]+$/, '').trim();

  // If text is in UPPERCASE or title case, clean up extra spaces
  str = str.replace(/\s+/g, ' ');

  return str || 'Transaction';
}

/**
 * Generates a stable deterministic fingerprint for deduplication.
 *
 * @param {Object} tx
 * @param {string} [source='paytm']
 * @returns {string}
 */
export function generateFingerprint(tx, source = 'paytm') {
  if (tx.sourceTransactionId && String(tx.sourceTransactionId).trim().length > 3) {
    return `${source}:${String(tx.sourceTransactionId).trim().toLowerCase()}`;
  }

  // Fallback fingerprint: source:date:amount:direction:counterparty
  const cleanCounterparty = (tx.counterparty || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);

  const cleanDate = tx.date || (tx.occurredAt ? tx.occurredAt.slice(0, 10) : 'nodate');
  const amount = Number(tx.amount).toFixed(2);
  const direction = tx.direction || 'out';

  return `${source}:${cleanDate}:${amount}:${direction}:${cleanCounterparty}`;
}

/**
 * Normalizes a parsed raw transaction into the canonical Zyrbit model.
 *
 * @param {Object} rawTx
 * @param {string} [source='paytm']
 * @returns {Object} Canonical normalized transaction
 */
export function normalizeTransaction(rawTx, source = 'paytm') {
  const counterparty = extractCounterparty(rawTx.rawDescription, rawTx.explicitCounterparty);
  const amount = Math.abs(Number(rawTx.amount) || 0);
  const direction = rawTx.direction === 'in' ? 'in' : 'out';
  const occurredAt = rawTx.occurredAt || new Date().toISOString();
  const date = rawTx.date || occurredAt.slice(0, 10);
  const time = rawTx.time || (occurredAt.includes('T') ? occurredAt.split('T')[1].slice(0, 8) : '12:00:00');

  const normalized = {
    id: crypto.randomUUID(),
    source: source || 'paytm',
    sourceTransactionId: rawTx.sourceTransactionId ? String(rawTx.sourceTransactionId).trim() : null,
    occurredAt,
    date,
    time,
    amount,
    direction,
    counterparty,
    paymentMethod: rawTx.paymentMethod || 'upi',
    rawDescription: (rawTx.rawDescription || '').trim(),
    status: rawTx.status || 'success',
  };

  normalized.fingerprint = generateFingerprint(normalized, source);
  return normalized;
}
