/**
 * Zyrbit — Global Feature Configuration & Experiment Flags
 */

export const FEATURES = {
  /**
   * Food Knowledge V2: Multi-tier canonical resolver, personal foods,
   * preparation states, provenance, nutrition snapshots, and ambiguity handling.
   * Default: false (preserves legacy Phase C food path).
   */
  FOOD_KNOWLEDGE_V2: false,
};

/**
 * Materiality threshold for food ambiguity (caloric spread > 20% triggers clarification).
 */
export const FOOD_AMBIGUITY_CALORIE_THRESHOLD = 0.20;
