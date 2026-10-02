/**
 * Zyrbit — Connect Money: Transaction Classifier
 *
 * Resolves imported transactions using Zyrbit Money State semantics & moneyResolver patterns.
 * Distinguishes everyday spending, own-account transfers, investments, refunds,
 * and flags ambiguous peer-to-peer transfers for user review.
 */

import { inferCategory } from '../dex/resolvers/moneyResolver.js';

// Keywords specifically for automated financial classification
const TRANSFER_PATTERNS = [
  /\bself\s+transfer\b/i,
  /\bto\s+self\b/i,
  /\bfrom\s+self\b/i,
  /\bown\s+account\b/i,
  /\btransfer\s+to\s+(?:bank|savings|account)\b/i,
  /\btransfer\s+from\s+(?:bank|savings|account)\b/i,
  /\bauto-?sweep\b/i,
  /\bsavings\s+a\/?c\b/i,
];

const INVESTMENT_PATTERNS = [
  /\bzerodha\b/i,
  /\bgroww\b/i,
  /\bindmoney\b/i,
  /\bkuvera\b/i,
  /\bangel\s*one\b/i,
  /\bupstox\b/i,
  /\bmutual\s+fund\b/i,
  /\bsip\b/i,
  /\buti\s+mf\b/i,
  /\bhdfc\s+mf\b/i,
  /\bicici\s+pru\b/i,
  /\bsovereign\s+gold\b/i,
  /\bgold\s+lease\b/i,
  /\bdigital\s+gold\b/i,
  /\bcoin\s+by\s+zerodha\b/i,
  /\bppf\b/i,
  /\bnps\s+trust\b/i,
  /\bwazirx\b/i,
  /\bcoindcx\b/i,
];

const SUBSCRIPTION_PATTERNS = [
  /\bspotify\b/i,
  /\bnetflix\b/i,
  /\byoutube\s*premium\b/i,
  /\bhotstar\b/i,
  /\bdisney\b/i,
  /\bprime\s*video\b/i,
  /\bchatgpt\b/i,
  /\bopenai\b/i,
  /\bclaude\b/i,
  /\bgithub\b/i,
  /\bapple\.com\b/i,
  /\bgoogle\s*storage\b/i,
  /\bgoogle\s*one\b/i,
  /\badobe\b/i,
  /\bmedium\b/i,
];

const REFUND_PATTERNS = [
  /\brefund\b/i,
  /\breversal\b/i,
  /\bcashback\b/i,
  /\breturned\b/i,
  /\bcredited\s+back\b/i,
];

const TRANSPORT_KEYWORDS = [
  'metro', 'dmrc', 'mmrcl', 'bmrcl', 'cmrl', 'irctc', 'railways', 'rail',
  'uber', 'ola', 'rapido', 'bus', 'fuel', 'petrol', 'diesel', 'iocl',
  'bpcl', 'hpcl', 'shell', 'cng', 'fastag', 'toll', 'parking'
];

const FOOD_KEYWORDS = [
  'poha', 'swiggy', 'zomato', 'blinkit', 'zepto', 'instamart', 'cafe',
  'chai', 'tea', 'restaurant', 'baker', 'bakery', 'canteen', 'mess',
  'burger', 'pizza', 'juice', 'kitchen', 'snacks', 'dosa', 'biryani',
  'sweets', 'hotel'
];

const EDUCATION_KEYWORDS = [
  'xerox', 'printing', 'print', 'stationery', 'books', 'book', 'college',
  'school', 'university', 'exam', 'tuition', 'coaching', 'udemy',
  'coursera', 'library', 'assignment', 'notes', 'photocopy'
];

/**
 * Classifies a normalized transaction into action, category, and resolution state.
 *
 * @param {Object} tx - Normalized transaction
 * @returns {{
 *   resolutionState: 'resolved' | 'needs_review',
 *   suggestedAction: 'add_expense' | 'add_income' | 'transfer' | 'investment' | 'refund' | 'add_bill',
 *   suggestedCategory: string,
 *   suggestedNote: string,
 *   reviewReason?: string,
 *   isSubscription?: boolean,
 * }}
 */
export function classifyTransaction(tx) {
  const text = `${tx.counterparty || ''} ${tx.rawDescription || ''}`.trim();
  const lower = text.toLowerCase();
  const isIncoming = tx.direction === 'in';

  // ── 1. INCOMING TRANSACTIONS (CREDIT) ───────────────────────────────────────
  if (isIncoming) {
    // 1a. Refunds / Reversals / Cashback
    if (REFUND_PATTERNS.some(p => p.test(lower))) {
      return {
        resolutionState: 'resolved',
        suggestedAction: 'refund',
        suggestedCategory: 'Refund',
        suggestedNote: `${tx.counterparty} (Refund)`,
      };
    }

    // 1b. Transfer into account
    if (TRANSFER_PATTERNS.some(p => p.test(lower))) {
      return {
        resolutionState: 'resolved',
        suggestedAction: 'transfer',
        suggestedCategory: 'Transfer',
        suggestedNote: 'Transfer from own account',
      };
    }

    // 1c. Salary / Stipend
    if (/\b(salary|payroll|stipend|wages)\b/i.test(lower)) {
      return {
        resolutionState: 'resolved',
        suggestedAction: 'add_income',
        suggestedCategory: 'Salary',
        suggestedNote: `Salary - ${tx.counterparty}`,
      };
    }

    // 1d. Received from someone (P2P): "Received from Vasu", etc.
    const isP2P = /\b(received\s+from|from|upi\/p2p)\b/i.test(lower) || tx.paymentMethod === 'upi';
    if (isP2P) {
      return {
        resolutionState: 'needs_review',
        suggestedAction: 'add_income',
        suggestedCategory: 'Income',
        suggestedNote: `Received from ${tx.counterparty}`,
        reviewReason: 'Received money — clarify if Income, Loan Repayment, Gift, or Reimbursement',
      };
    }

    // Generic Income
    return {
      resolutionState: 'needs_review',
      suggestedAction: 'add_income',
      suggestedCategory: 'Other',
      suggestedNote: tx.counterparty || 'Incoming payment',
      reviewReason: 'Incoming payment requires classification',
    };
  }

  // ── 2. OUTGOING TRANSACTIONS (DEBIT) ────────────────────────────────────────

  // 2a. Own Account Transfers (NOT normal spending)
  if (TRANSFER_PATTERNS.some(p => p.test(lower))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'transfer',
      suggestedCategory: 'Transfer',
      suggestedNote: `Transfer: ${tx.counterparty}`,
    };
  }

  // 2b. Investments / Asset Movement (NOT normal spending)
  if (INVESTMENT_PATTERNS.some(p => p.test(lower))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'investment',
      suggestedCategory: 'Investment',
      suggestedNote: `Investment: ${tx.counterparty}`,
    };
  }

  // 2c. Subscriptions / Digital Services
  if (SUBSCRIPTION_PATTERNS.some(p => p.test(lower))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'add_expense',
      suggestedCategory: 'Tools & Subscriptions',
      suggestedNote: tx.counterparty,
      isSubscription: true,
    };
  }

  // 2d. Transport
  if (TRANSPORT_KEYWORDS.some(k => lower.includes(k))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'add_expense',
      suggestedCategory: 'Transport',
      suggestedNote: tx.counterparty,
    };
  }

  // 2e. Food & Groceries
  if (FOOD_KEYWORDS.some(k => lower.includes(k))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'add_expense',
      suggestedCategory: 'Food',
      suggestedNote: tx.counterparty,
    };
  }

  // 2f. Education & Printing
  if (EDUCATION_KEYWORDS.some(k => lower.includes(k))) {
    return {
      resolutionState: 'resolved',
      suggestedAction: 'add_expense',
      suggestedCategory: 'Education',
      suggestedNote: tx.counterparty,
    };
  }

  // 2g. Detect P2P Sent to Person (e.g., "Paid to Vasu", "Sent to Ninad", UPI/P2P)
  const isPersonalSend = /\b(paid\s+to|sent\s+to|transfer\s+to)\s+[a-z]{3,}\b/i.test(lower) ||
    /upi\/p2p/i.test(lower);

  // If looks like an individual name rather than commercial merchant
  if (isPersonalSend && !/\b(ltd|pvt|store|mart|shop|enterprise|services|retail|agency)\b/i.test(lower)) {
    return {
      resolutionState: 'needs_review',
      suggestedAction: 'add_expense',
      suggestedCategory: 'Lend',
      suggestedNote: `Sent to ${tx.counterparty}`,
      reviewReason: 'Sent to a person — clarify if Loan, Gift, Reimbursement, or Expense',
    };
  }

  // 2h. Fallback to existing moneyResolver inferCategory
  const resolverCategory = inferCategory(lower);
  const isRecognized = resolverCategory !== 'General';

  return {
    resolutionState: isRecognized ? 'resolved' : 'needs_review',
    suggestedAction: 'add_expense',
    suggestedCategory: resolverCategory,
    suggestedNote: tx.counterparty,
    reviewReason: isRecognized ? null : 'Unrecognized merchant — please verify category',
  };
}
