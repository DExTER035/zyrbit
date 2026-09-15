/**
 * Centralized Nutrition Scaling Utility for Zyrbit V1
 * Calculates exact scaled calories and macronutrients based on serving size & target quantity.
 * 
 * @param {Object} baseFood - Food object containing base calories, protein, carbs, fat, fiber, serving_size_g
 * @param {number|string} targetQuantityG - Target quantity in grams
 * @returns {Object} Scaled nutrition values
 */
export function calculateScaledNutrition(baseFood, targetQuantityG) {
  const qty = Math.max(0, Number(targetQuantityG) || 0);
  const baseServing = Math.max(0.1, Number(baseFood?.serving_size_g || baseFood?.quantity_g) || 100);
  const ratio = qty / baseServing;

  return {
    quantity_g: qty,
    calories: Math.round(Number(baseFood?.calories || 0) * ratio),
    protein: Math.round((Number(baseFood?.protein || 0) * ratio) * 10) / 10,
    carbs: Math.round((Number(baseFood?.carbs || 0) * ratio) * 10) / 10,
    fat: Math.round((Number(baseFood?.fat || 0) * ratio) * 10) / 10,
    fiber: Math.round((Number(baseFood?.fiber || 0) * ratio) * 10) / 10,
  };
}

/**
 * Calculates total daily calories and macros from an array of logged meals.
 * Handles zero meals, single meals, multiple meals, decimal quantities.
 * 
 * @param {Array} mealLogs - Array of logged meal items
 * @returns {Object} Totals for calories, protein, carbs, fat, fiber
 */
export function calculateDailyTotals(mealLogs = []) {
  return (mealLogs || []).reduce(
    (acc, meal) => {
      acc.calories += Math.round(Number(meal.calories) || 0);
      acc.protein += Number(meal.protein) || 0;
      acc.carbs += Number(meal.carbs) || 0;
      acc.fat += Number(meal.fat) || 0;
      acc.fiber += Number(meal.fiber) || 0;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  );
}
