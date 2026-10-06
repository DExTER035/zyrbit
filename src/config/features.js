/**
 * Zyrbit — Global Feature Configuration & Experiment Flags
 */

export const FEATURES = {
  /**
   * Food Knowledge V2: Multi-tier canonical resolver, personal foods,
   * preparation states, provenance, nutrition snapshots, and ambiguity handling.
   * Enabled in browser for localhost testing; defaults to false in Node/test runner.
   */
  FOOD_KNOWLEDGE_V2: typeof window !== 'undefined'
    ? (window.localStorage?.getItem('ZYRBIT_FOOD_KNOWLEDGE_V2') !== 'false')
    : false,
};

/**
 * Materiality threshold for food ambiguity (caloric spread > 20% triggers clarification).
 */
export const FOOD_AMBIGUITY_CALORIE_THRESHOLD = 0.20;
