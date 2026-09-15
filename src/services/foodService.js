/**
 * Zyrbit / DexOS — Food Domain Service
 * Pure JavaScript domain operations for meal logging, food library, and nutrition settings.
 * Reuses nutritionCalculator.js and indianFoods.js for offline reference.
 */

import { supabase } from '../lib/supabase/index.js';
import { calculateScaledNutrition, calculateDailyTotals } from '../engines/food/index.js';
import { FOOD_DB } from '../data/foods/index.js';

export const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

/**
 * Searches offline Indian Foods reference library for a food match.
 * @param {string} foodName
 * @returns {Object|null}
 */
export function findFoodReference(foodName) {
  if (!foodName) return null;
  const q = foodName.toLowerCase().trim();
  return (FOOD_DB || []).find(f =>
    f.name.toLowerCase() === q ||
    f.name.toLowerCase().includes(q) ||
    q.includes(f.name.toLowerCase())
  ) || null;
}

/**
 * Logs a meal entry to the database.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} [params.mealType='snack'] - 'breakfast' | 'lunch' | 'dinner' | 'snack'
 * @param {string|null} [params.foodId=null] - Optional user_food_library UUID
 * @param {string} params.foodName - Food item name
 * @param {number} [params.quantityG=100] - Quantity in grams
 * @param {number} [params.calories=0] - Calories
 * @param {number} [params.protein=0] - Protein in grams
 * @param {number} [params.carbs=0] - Carbs in grams
 * @param {number} [params.fat=0] - Fat in grams
 * @param {number} [params.fiber=0] - Fiber in grams
 * @param {string} [params.date=todayStr()] - YYYY-MM-DD log date
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function logMeal({
  userId,
  mealType = 'snack',
  foodId = null,
  foodName,
  quantityG = 100,
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber = 0,
  date = todayStr(),
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (foodName || '').trim().slice(0, 150);
  if (!cleanName) {
    return { success: false, error: 'Food name cannot be empty.' };
  }

  let finalCal = Math.max(0, Math.min(10000, Number(calories) || 0));
  let finalProt = Math.max(0, Math.min(2000, Number(protein) || 0));
  let finalCarbs = Math.max(0, Math.min(2000, Number(carbs) || 0));
  let finalFat = Math.max(0, Math.min(2000, Number(fat) || 0));
  let finalFib = Math.max(0, Math.min(2000, Number(fiber) || 0));
  const cleanQty = Math.max(1, Math.min(50000, Number(quantityG) || 100));

  // If macros were omitted, attempt lookup from offline reference
  if (finalCal === 0 && finalProt === 0 && finalCarbs === 0) {
    const matchedRef = findFoodReference(cleanName);
    if (matchedRef) {
      const scaled = calculateScaledNutrition({
        calories: matchedRef.calories,
        protein: matchedRef.protein,
        carbs: matchedRef.carbs,
        fat: matchedRef.fat,
        fiber: matchedRef.fiber,
        serving_size_g: matchedRef.serving_size_g || 100,
      }, cleanQty);
      finalCal = scaled.calories;
      finalProt = scaled.protein;
      finalCarbs = scaled.carbs;
      finalFat = scaled.fat;
      finalFib = scaled.fiber;
    }
  }

  const payload = {
    user_id: userId,
    date,
    meal_type: mealType || 'snack',
    food_id: foodId || null,
    food_name: cleanName,
    quantity_g: cleanQty,
    calories: finalCal,
    protein: finalProt,
    carbs: finalCarbs,
    fat: finalFat,
    fiber: finalFib,
  };

  try {
    const { data, error } = await supabase
      .from('meal_logs')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to log meal.' };
  }
}

/**
 * Updates an existing meal log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @param {Object} params.updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateMealLog({ userId, logId, updates }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { data, error } = await supabase
      .from('meal_logs')
      .update(updates)
      .eq('id', logId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update meal log.' };
  }
}

/**
 * Deletes a meal log entry.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.logId - Log UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteMealLog({ userId, logId }) {
  if (!userId || !logId) {
    return { success: false, error: 'User ID and Log ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', logId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete meal log.' };
  }
}

/**
 * Creates a personal food item in the user's custom library.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.foodName - Food name
 * @param {number} [params.servingSizeG=100] - Serving size in grams
 * @param {number} [params.calories=0] - Calories per serving
 * @param {number} [params.protein=0] - Protein per serving
 * @param {number} [params.carbs=0] - Carbs per serving
 * @param {number} [params.fat=0] - Fat per serving
 * @param {number} [params.fiber=0] - Fiber per serving
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createPersonalFood({
  userId,
  foodName,
  servingSizeG = 100,
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber = 0,
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (foodName || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Food name cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    food_name: cleanName,
    serving_size_g: Number(servingSizeG) || 100,
    calories: Number(calories) || 0,
    protein: Number(protein) || 0,
    carbs: Number(carbs) || 0,
    fat: Number(fat) || 0,
    fiber: Number(fiber) || 0,
  };

  try {
    const { data, error } = await supabase
      .from('user_food_library')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to create personal food.' };
  }
}

/**
 * Updates a personal food item in user_food_library.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.foodId - Food item UUID
 * @param {Object} params.updates - Food updates
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updatePersonalFood({ userId, foodId, ...updates }) {
  if (!userId || !foodId) {
    return { success: false, error: 'User ID and Food ID are required.' };
  }

  try {
    const { data, error } = await supabase
      .from('user_food_library')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', foodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update personal food.' };
  }
}

/**
 * Deletes a personal food item.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.foodId - Food item UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deletePersonalFood({ userId, foodId }) {
  if (!userId || !foodId) {
    return { success: false, error: 'User ID and Food ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('user_food_library')
      .delete()
      .eq('id', foodId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete personal food.' };
  }
}

/**
 * Saves a meal combo template to saved_meals.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Saved meal name
 * @param {string} params.mealType - Meal type
 * @param {Array} params.items - Food items array
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveMeal({ userId, name, mealType, items }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Meal name cannot be empty.' };
  }

  const payload = {
    user_id: userId,
    name: cleanName,
    meal_type: mealType || 'lunch',
    items_json: items || [],
  };

  try {
    const { data, error } = await supabase
      .from('saved_meals')
      .insert([payload])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to save meal.' };
  }
}

/**
 * Updates food nutrition settings / daily macro goals.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {Object} params.settings - Calorie and macro targets
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updateFoodSettings({ userId, ...settings }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { data, error } = await supabase
      .from('food_settings')
      .upsert({ user_id: userId, ...settings }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to update food settings.' };
  }
}

/**
 * Fetches a compact daily food summary for context and intelligence.
 * Reuses calculateDailyTotals deterministic engine.
 * @param {string} userId - Authenticated user UUID
 * @param {string} [date=todayStr()] - YYYY-MM-DD log date
 * @returns {Promise<{
 *   success: boolean,
 *   data?: {
 *     mealCount: number,
 *     mealTypes: string[],
 *     totals: { calories: number, protein: number, carbs: number, fat: number, fiber: number }
 *   },
 *   error?: string
 * }>}
 */
export async function getFoodSummary(userId, date = todayStr()) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }

  try {
    const { data: meals, error } = await supabase
      .from('meal_logs')
      .select('meal_type, food_name, quantity_g, calories, protein, carbs, fat, fiber')
      .eq('user_id', userId)
      .eq('date', date)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    const logs = meals || [];
    const calculated = calculateDailyTotals(logs);

    return {
      success: true,
      data: {
        mealCount: logs.length,
        mealTypes: [...new Set(logs.map((m) => m.meal_type))],
        totals: {
          calories: Math.round(calculated.calories),
          protein: Math.round(calculated.protein * 10) / 10,
          carbs: Math.round(calculated.carbs * 10) / 10,
          fat: Math.round(calculated.fat * 10) / 10,
          fiber: Math.round(calculated.fiber * 10) / 10,
        },
      },
    };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to fetch food summary.' };
  }
}

