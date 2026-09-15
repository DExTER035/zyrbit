/**
 * DexOS — Money Resolver
 * Deterministically parses natural financial language into structured wealth action parameters.
 *
 * Rules:
 * - Normalizes currency symbols (₹, Rs, rupees, bucks, commas, shorthand 'k').
 * - Missing amount MUST trigger clarification: "How much did you spend?"
 * - NEVER invent financial amounts or accounts.
 * - ALL financial mutations remain strictly confirmation-gated through ActionExecutor.
 * - Pure JavaScript. Zero direct database queries.
 */

// Common category mapping keywords
const CATEGORY_KEYWORDS = {
  Food: ['lunch', 'dinner', 'breakfast', 'snack', 'coffee', 'chai', 'tea', 'cafe', 'groceries', 'restaurant', 'food', 'swiggy', 'zomato'],
  Transport: ['cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 'petrol', 'fuel', 'commute', 'transport'],
  Utilities: ['electricity', 'wifi', 'internet', 'water bill', 'gas', 'recharge', 'phone', 'bill'],
  Shopping: ['amazon', 'flipkart', 'clothes', 'shoes', 'electronics', 'shopping'],
  Entertainment: ['movie', 'netflix', 'spotify', 'hotstar', 'cinema', 'games', 'concert'],
  Health: ['medicine', 'doctor', 'clinic', 'pharmacy', 'hospital', 'gym fee'],
  Housing: ['rent', 'maintenance', 'mortgage'],
  General: ['misc', 'miscellaneous', 'other'],
};

/**
 * Parses numeric currency amount from text string.
 * Supports: "₹200", "Rs 200", "200 bucks", "50,000", "50k", "two hundred".
 *
 * @param {string} text
 * @returns {number|null}
 */
export function parseCurrencyAmount(text) {
  if (!text || typeof text !== 'string') return null;
  const str = text.toLowerCase().trim();

  // Number words: e.g. "two hundred", "five hundred", "one thousand"
  if (/\btwo hundred\b/.test(str)) return 200;
  if (/\bthree hundred\b/.test(str)) return 300;
  if (/\bfour hundred\b/.test(str)) return 400;
  if (/\bfive hundred\b/.test(str)) return 500;
  if (/\bone thousand\b/.test(str)) return 1000;
  if (/\bfive thousand\b/.test(str)) return 5000;
  if (/\bten thousand\b/.test(str)) return 10000;
  if (/\bfifty thousand\b/.test(str)) return 50000;

  // "50k", "100k"
  const kMatch = str.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    return !isNaN(val) && val > 0 ? Math.round(val * 1000) : null;
  }

  // Explicit amount with symbol or trailing currency:
  // e.g. "₹200", "₹50,000", "rs 200", "200 rs", "200 rupees", "200 bucks", "200 inr"
  const symbolMatch = str.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i);
  if (symbolMatch) {
    const cleanNum = symbolMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    return !isNaN(val) && val > 0 ? val : null;
  }

  const wordMatch = str.match(/([\d,]+(?:\.\d+)?)\s*(?:rupees|bucks|rs\.?|inr)\b/i);
  if (wordMatch) {
    const cleanNum = wordMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    return !isNaN(val) && val > 0 ? val : null;
  }

  // Phrasing like "spent 200 on lunch", "cost me 200", "paid 200 for"
  const verbMatch = str.match(/(?:spent|paid|cost(?:s|ed)?(?:\s+me)?|was|amounted to)\s+([\d,]+(?:\.\d+)?)\b/i);
  if (verbMatch) {
    const cleanNum = verbMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    return !isNaN(val) && val > 0 ? val : null;
  }

  // Trailing or standalone number
  const numMatch = str.match(/\b([\d,]+(?:\.\d+)?)\b/);
  if (numMatch) {
    const cleanNum = numMatch[1].replace(/,/g, '');
    const val = parseFloat(cleanNum);
    if (!isNaN(val) && val > 0) return val;
  }

  return null;
}

/**
 * Infers expense category from context words.
 * @param {string} text
 * @returns {string}
 */
export function inferCategory(text) {
  if (!text) return 'General';
  const str = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => str.includes(k))) {
      return category;
    }
  }

  return 'General';
}

/**
 * Resolves natural language financial message into add_expense, add_income, or add_bill.
 *
 * @param {string} userMessage
 * @returns {{
 *   status: 'resolved' | 'clarify' | 'not_financial',
 *   action?: 'add_expense' | 'add_income' | 'add_bill',
 *   params?: Object,
 *   question?: string,
 * }}
 */
export function resolveFinancialInput(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    return { status: 'not_financial' };
  }

  const str = userMessage.trim().toLowerCase();

  // Check if financial intent is present
  const isIncome = /\b(got paid|received|salary|income|earned|freelance payment|stipend)\b/i.test(str);
  const isBill = /\b(bill|electricity bill|internet bill|wifi bill|due date|upcoming bill)\b/i.test(str);
  const isExpense = /\b(spent|paid|cost|bought|purchased|expense|bucks on|lunch was|dinner was)\b/i.test(str) ||
    /^(?:spent|paid|lunch|dinner|coffee|uber|cab|swiggy|zomato)\b/i.test(str);

  if (!isIncome && !isBill && !isExpense) {
    // Check if currency symbol is present anyway (e.g. "₹200 for lunch")
    if (!/[₹]|(?:\brs\.?\b)|(?:\brupees\b)|(?:\bbucks\b)/i.test(str)) {
      return { status: 'not_financial' };
    }
  }

  // Parse amount
  const amount = parseCurrencyAmount(str);

  // Missing amount rule: "I spent money"
  if (amount === null || amount <= 0) {
    return {
      status: 'clarify',
      question: isIncome ? 'How much did you receive?' : isBill ? 'How much is the bill?' : 'How much did you spend?',
    };
  }

  // Handle Income
  if (isIncome) {
    let source = 'Salary';
    if (/freelance/i.test(str)) source = 'Freelance';
    else if (/gift|bonus/i.test(str)) source = 'Bonus';
    else if (/interest|dividend/i.test(str)) source = 'Investments';

    return {
      status: 'resolved',
      action: 'add_income',
      params: {
        amount,
        source,
        note: userMessage.trim(),
      },
    };
  }

  // Handle Bill
  if (isBill) {
    let billName = 'Bill';
    if (/internet|wifi/i.test(str)) billName = 'Internet';
    else if (/electricity/i.test(str)) billName = 'Electricity';
    else if (/phone|mobile|recharge/i.test(str)) billName = 'Phone Recharge';
    else if (/rent/i.test(str)) billName = 'Rent';

    const todayStr = new Date().toISOString().split('T')[0];

    return {
      status: 'resolved',
      action: 'add_bill',
      params: {
        name: billName,
        amount,
        dueDate: todayStr,
        frequency: 'monthly',
        status: 'unpaid',
      },
    };
  }

  // Handle Expense
  const category = inferCategory(str);
  let note = '';
  const noteMatch = str.match(/(?:on|for|at)\s+([a-z0-9\s]+)/i);
  if (noteMatch) {
    note = noteMatch[1].trim();
  } else {
    // Clean description
    note = str.replace(/(?:i\s+)?(?:spent|paid|cost\s+me|was)\s*(?:₹|rs\.?|inr)?\s*[\d,k.]+/i, '').trim();
  }

  return {
    status: 'resolved',
    action: 'add_expense',
    params: {
      amount,
      category,
      note: note || category.toLowerCase(),
    },
  };
}
