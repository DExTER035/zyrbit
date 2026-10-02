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
  Food: ['lunch', 'dinner', 'breakfast', 'snack', 'coffee', 'chai', 'tea', 'cafe', 'groceries', 'restaurant', 'food', 'swiggy', 'zomato', 'poha', 'eggs'],
  Transport: ['cab', 'uber', 'ola', 'auto', 'metro', 'bus', 'train', 'flight', 'petrol', 'fuel', 'commute', 'transport'],
  Education: ['assignment', 'papers', 'book', 'exam', 'course', 'tuition', 'study', 'education'],
  Utilities: ['electricity', 'wifi', 'internet', 'water bill', 'gas', 'recharge', 'phone', 'bill'],
  Shopping: ['amazon', 'flipkart', 'clothes', 'shoes', 'electronics', 'shopping'],
  Entertainment: ['movie', 'netflix', 'spotify', 'hotstar', 'cinema', 'games', 'concert'],
  Health: ['medicine', 'doctor', 'clinic', 'pharmacy', 'hospital', 'gym fee'],
  Housing: ['rent', 'maintenance', 'mortgage'],
  Investment: ['invest', 'invested', 'stocks', 'mutual fund', 'sip', 'gold', 'crypto'],
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

  // Phrasing like "spent 200 on lunch", "cost me 200", "paid 200 for", "made 3000 from"
  const verbMatch = str.match(/(?:spent|paid|cost(?:s|ed)?(?:\s+me)?|was|amounted to|made|invested|took|borrowed|owes(?:\s+me)?)\s+([\d,]+(?:\.\d+)?)\b/i);
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
 * Helper to parse historical and relative dates from text.
 * @param {string} str
 * @param {string} fallbackDate
 * @returns {string} YYYY-MM-DD
 */
export function parseHistoricalDate(str, fallbackDate) {
  if (!str) return fallbackDate;
  const lower = str.toLowerCase();
  const now = new Date();

  const formatLocalDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // "yesterday"
  if (lower.includes('yesterday')) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return formatLocalDate(d);
  }

  // "last month"
  if (lower.includes('last month')) {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 15);
    return formatLocalDate(d);
  }

  // "last [day of week]"
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  for (let i = 0; i < dayNames.length; i++) {
    if (lower.includes(`last ${dayNames[i]}`)) {
      const d = new Date(now);
      const currentDay = d.getDay();
      const diff = (currentDay + 7 - i) % 7 || 7;
      d.setDate(d.getDate() - diff);
      return formatLocalDate(d);
    }
  }

  // "X days ago"
  const daysAgoMatch = lower.match(/(\d+)\s+days?\s+ago/);
  if (daysAgoMatch) {
    const d = new Date(now);
    d.setDate(d.getDate() - parseInt(daysAgoMatch[1], 10));
    return formatLocalDate(d);
  }

  // Calendar dates: "on September 20", "September 20", "20 September", "20th Sept"
  const monthMatch = lower.match(/(?:on\s+)?(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?|(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))/i);
  if (monthMatch) {
    const monthStr = monthMatch[1] || monthMatch[4];
    const dayStr = monthMatch[2] || monthMatch[3];
    try {
      const parsed = new Date(`${monthStr} ${dayStr} ${now.getFullYear()}`);
      if (!isNaN(parsed.getTime())) {
        return formatLocalDate(parsed);
      }
    } catch {
      // fallback
    }
  }

  return fallbackDate;
}

/**
 * Resolves natural language financial message into structured action.
 * Supports Money State V1 semantics:
 * - "Poha 30" -> add_expense Food
 * - "Ninad owes me 300" -> record_money_event LEND / RECEIVABLE
 * - "Took 500 from Vasu, return Oct 10" -> BORROW / LIABILITY
 * - "Spotify 119 every month" -> add_bill
 * - "Made 3000 from editing" -> add_income
 * - "Movie last Saturday 350" -> add_expense with historical date
 * - Ambiguous "Gave Ninad 300" -> clarify: "Was this a loan, gift, or reimbursement?"
 *
 * @param {string} userMessage
 * @returns {{
 *   status: 'resolved' | 'clarify' | 'not_financial',
 *   action?: 'add_expense' | 'add_income' | 'add_bill' | 'record_money_event',
 *   params?: Object,
 *   question?: string,
 *   options?: Array<string>,
 * }}
 */
export function resolveFinancialInput(userMessage) {
  if (!userMessage || typeof userMessage !== 'string') {
    return { status: 'not_financial' };
  }

  const str = userMessage.trim().toLowerCase();

  // 1. Ambiguous transfer check: "Gave [person] [amount]", "I gave [person] [amount]", or "Sent [person] [amount]"
  const gaveMatch = str.match(/(?:^|\bi\s+)(?:gave|sent|transferred(?:\s+to)?)\s+([a-z]+)\s+(?:₹|rs\.?|inr)?\s*(\d+)/i) ||
                    str.match(/(?:^|\bi\s+)(?:gave|sent|transferred)\s+(?:₹|rs\.?|inr)?\s*(\d+)\s+to\s+([a-z]+)/i);
  if (gaveMatch) {
    const isExplicit = /\b(loan|gift|reimbursement|advance)\b/i.test(str);
    if (!isExplicit) {
      return {
        status: 'clarify',
        question: 'Was this a loan, gift, or reimbursement?',
        options: ['Loan', 'Gift', 'Reimbursement'],
        clarifyOptions: ['Loan', 'Gift', 'Reimbursement'],
      };
    }
  }

  // 2. Check if financial intent or currency is present
  const isReceivable = /\bowes(?:\s+me)?\b/i.test(str);
  const isBorrow = /\b(took\s+\d+|borrowed|loan from)\b/i.test(str);
  const isInvestment = /\b(invested|investing|sip|mutual fund|bought stocks)\b/i.test(str);
  const isIncome = /\b(got paid|received|salary|income|earned|freelance payment|stipend|made\s+\d+)\b/i.test(str);
  const isBill = /\b(bill|electricity bill|internet bill|wifi bill|due date|upcoming bill|every month|per month|monthly)\b/i.test(str);
  const isExpense = /\b(spent|paid|cost|bought|purchased|expense|bucks on|lunch was|dinner was|poha|metro|assignment)\b/i.test(str) ||
    /^(?:spent|paid|lunch|dinner|coffee|uber|cab|swiggy|zomato|metro|poha)\b/i.test(str);

  if (!isReceivable && !isBorrow && !isInvestment && !isIncome && !isBill && !isExpense) {
    // Check if currency symbol or trailing number is present
    if (!/[₹]|(?:\brs\.?\b)|(?:\brupees\b)|(?:\bbucks\b)/i.test(str) && !/^[a-z\s]+\s+\d+$/i.test(str)) {
      return { status: 'not_financial' };
    }
  }

  // Parse amount
  const amount = parseCurrencyAmount(str);

  // Missing amount rule
  if (amount === null || amount <= 0) {
    return {
      status: 'clarify',
      question: isIncome ? 'How much did you receive?' : isBill ? 'How much is the bill?' : 'How much did you spend?',
    };
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const toTitleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);

  // Check if item was already owned / no new cost
  if (/\b(already owned|already had|from home|at home|leftover|no cost|free)\b/i.test(str)) {
    return { status: 'not_financial' };
  }

  // 2b. Transfer: "Moved ₹2,000 to savings", "Transferred 2000 to bank"
  const isTransfer = /\b(moved|transfer|transferred)\b/i.test(str) && /\b(to\s+savings|to\s+account|to\s+bank|between\s+accounts|savings)\b/i.test(str);
  if (isTransfer) {
    let dest = 'Savings';
    if (/savings/i.test(str)) dest = 'Savings';
    else if (/bank|account/i.test(str)) dest = 'Bank Account';
    return {
      status: 'resolved',
      action: 'add_expense',
      params: {
        amount,
        category: 'Transfer',
        note: `Transfer to ${dest}`,
        date: parseHistoricalDate(str, todayStr),
      },
    };
  }

  // 3. Receivable / Money Promise: "Ninad owes me 300 due October 10"
  if (isReceivable) {
    const personMatch = str.match(/^([a-z]+)\s+owes/i) || str.match(/owes\s+me\s+([a-z]+)/i);
    const person = personMatch ? toTitleCase(personMatch[1]) : 'Someone';

    // Parse optional due date: e.g. "due October 10", "by Oct 10"
    const dateMatch = str.match(/(?:due|by|on|return(?:ed)?\s+by)\s+([a-z]+\s+\d{1,2}|\d{1,2}\s+[a-z]+|\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) {
      let dueDate = todayStr;
      try {
        const parsedD = new Date(`${dateMatch[1]} ${new Date().getFullYear()}`);
        if (!isNaN(parsedD.getTime())) {
          dueDate = parsedD.toISOString().split('T')[0];
        }
      } catch {
        dueDate = todayStr;
      }

      return {
        status: 'resolved',
        action: 'add_bill',
        params: {
          name: `${person} owes you`,
          amount,
          dueDate,
          frequency: 'one_off',
          status: 'receivable',
        },
      };
    }

    return {
      status: 'resolved',
      action: 'add_expense',
      params: {
        amount,
        category: 'Lend',
        note: `Lent to ${person}`,
        date: parseHistoricalDate(str, todayStr),
      },
    };
  }

  // 4. Borrowing (Liability): "Took 500 from Vasu, return Oct 10", "Borrowed ₹500 from Vasu"
  if (isBorrow) {
    const personMatch = str.match(/(?:from|borrowed\s+from|took\s+(?:₹|rs\.?|inr)?\s*[\d,k.]+\s+from)\s+([a-z]+)/i);
    const person = personMatch ? toTitleCase(personMatch[1]) : 'Friend';

    const dateMatch = str.match(/(?:return(?:ed|ing)?\s+(?:by|on)?|due|by|on)\s+([a-z]+\s+\d{1,2}|\d{1,2}\s+[a-z]+|\d{4}-\d{2}-\d{2})/i);
    let dueDate = todayStr;
    if (dateMatch) {
      try {
        const parsedD = new Date(`${dateMatch[1]} ${new Date().getFullYear()}`);
        if (!isNaN(parsedD.getTime())) {
          dueDate = parsedD.toISOString().split('T')[0];
        }
      } catch {
        dueDate = todayStr;
      }
    }

    return {
      status: 'resolved',
      action: 'add_bill',
      params: {
        name: `Return to ${person}`,
        amount,
        dueDate,
        frequency: 'one_off',
        status: 'unpaid',
      },
    };
  }

  // 5. Investment: "Invested 2000 today"
  if (isInvestment) {
    return {
      status: 'resolved',
      action: 'add_expense',
      params: {
        amount,
        category: 'Investment',
        note: userMessage.trim(),
        date: parseHistoricalDate(str, todayStr),
      },
    };
  }

  // 6. Handle Income: "Made 3000 from editing", "I earned ₹3,000 last month from editing"
  if (isIncome) {
    let source = 'Salary';
    if (/editing/i.test(str)) source = 'Editing';
    else if (/freelance/i.test(str)) source = 'Freelance';
    else if (/gift|bonus/i.test(str)) source = 'Bonus';
    else if (/interest|dividend/i.test(str)) source = 'Investments';

    return {
      status: 'resolved',
      action: 'add_income',
      params: {
        amount,
        source,
        note: userMessage.trim(),
        date: parseHistoricalDate(str, todayStr),
      },
    };
  }

  // 7. Handle Bill / Recurring Commitment: "Spotify 119 every month"
  if (isBill) {
    let billName = 'Bill';
    if (/spotify/i.test(str)) billName = 'Spotify';
    else if (/netflix/i.test(str)) billName = 'Netflix';
    else if (/internet|wifi/i.test(str)) billName = 'Internet';
    else if (/electricity/i.test(str)) billName = 'Electricity';
    else if (/phone|mobile|recharge/i.test(str)) billName = 'Phone Recharge';
    else if (/rent/i.test(str)) billName = 'Rent';

    return {
      status: 'resolved',
      action: 'add_bill',
      params: {
        name: billName,
        amount,
        dueDate: parseHistoricalDate(str, todayStr),
        frequency: /every month|monthly|per month/i.test(str) ? 'monthly' : 'one_off',
        status: 'unpaid',
      },
    };
  }

  // 8. Handle Expense: "Poha 30", "Metro 30", "I spent ₹500 on September 20"
  const category = inferCategory(str);
  let note = '';
  const noteMatch = str.match(/(?:on|for|at)\s+([a-z0-9\s]+)/i);
  if (noteMatch) {
    note = noteMatch[1].trim();
  } else {
    // Clean description e.g. "Poha 30" -> "Poha", "Metro 30" -> "Metro"
    note = str.replace(/(?:i\s+)?(?:spent|paid|cost\s+me|was)\s*(?:₹|rs\.?|inr)?\s*[\d,k.]+/i, '')
              .replace(/\b[\d,k.]+\b/g, '')
              .trim();
  }

  return {
    status: 'resolved',
    action: 'add_expense',
    params: {
      amount,
      category,
      note: note || category.toLowerCase(),
      date: parseHistoricalDate(str, todayStr),
    },
  };
}
