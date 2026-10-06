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
  nutritionSnapshot = null,
  sourceType = null,
  preparationState = null,
  confidence = null,
  foodRefId = null,
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

  const basePayload = {
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

  const extendedPayload = {
    ...basePayload,
    ...(nutritionSnapshot ? { nutrition_snapshot: nutritionSnapshot } : {}),
    ...(sourceType ? { source_type: sourceType } : {}),
    ...(preparationState ? { preparation_state: preparationState } : {}),
    ...(confidence !== null && confidence !== undefined ? { confidence } : {}),
    ...(foodRefId ? { food_ref_id: foodRefId } : {}),
  };

  try {
    const { data, error } = await supabase
      .from('meal_logs')
      .insert([extendedPayload])
      .select()
      .single();

    if (!error) {
      return { success: true, data };
    }

    // Graceful fallback: If extended columns do not exist in database schema, insert base payload
    if (error.message && (error.message.includes('column') || error.message.includes('schema'))) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('meal_logs')
        .insert([basePayload])
        .select()
        .single();

      if (fallbackError) {
        return { success: false, error: fallbackError.message };
      }
      return { success: true, data: fallbackData };
    }

    return { success: false, error: error.message };
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
 * @param {string} [params.servingUnit='g'] - Unit of serving
 * @param {number} [params.calories=0] - Calories per serving
 * @param {number} [params.protein=0] - Protein per serving
 * @param {number} [params.carbs=0] - Carbs per serving
 * @param {number} [params.fat=0] - Fat per serving
 * @param {number} [params.fiber=0] - Fiber per serving
 * @param {boolean} [params.isFavorite=true] - Whether pinned as favorite
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function createPersonalFood({
  userId,
  foodName,
  servingSizeG = 100,
  servingUnit = 'g',
  calories = 0,
  protein = 0,
  carbs = 0,
  fat = 0,
  fiber = 0,
  isFavorite = true,
}) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (foodName || '').trim().slice(0, 150);
  if (!cleanName) {
    return { success: false, error: 'Food name cannot be empty.' };
  }

  const basePayload = {
    user_id: userId,
    food_name: cleanName,
    serving_size_g: Math.max(1, Math.min(50000, Number(servingSizeG) || 100)),
    calories: Math.max(0, Math.min(10000, Number(calories) || 0)),
    protein: Math.max(0, Math.min(2000, Number(protein) || 0)),
    carbs: Math.max(0, Math.min(2000, Number(carbs) || 0)),
    fat: Math.max(0, Math.min(2000, Number(fat) || 0)),
    fiber: Math.max(0, Math.min(2000, Number(fiber) || 0)),
  };

  try {
    // Attempt with extended schema columns
    let { data, error } = await supabase
      .from('user_food_library')
      .insert([{
        ...basePayload,
        serving_unit: (servingUnit || 'g').trim().slice(0, 20),
        is_favorite: Boolean(isFavorite),
      }])
      .select()
      .single();

    if (error && (error.message?.includes('is_favorite') || error.message?.includes('serving_unit'))) {
      // Fallback for baseline table schema without newly migrated columns
      const fallbackRes = await supabase
        .from('user_food_library')
        .insert([basePayload])
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

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
 * Strict whitelist enforced: only mutable nutritional/metadata fields allowed.
 * NEVER updates id, user_id, or created_at.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.foodId - Food item UUID
 * @param {Object} [params.updates] - Whitelisted updates
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function updatePersonalFood({ userId, foodId, updates = {}, ...rest }) {
  if (!userId || !foodId) {
    return { success: false, error: 'User ID and Food ID are required.' };
  }

  const source = { ...rest, ...(typeof updates === 'object' && updates !== null ? updates : {}) };
  const sanitized = {};

  if (source.food_name !== undefined) {
    sanitized.food_name = String(source.food_name).trim().slice(0, 150);
  }
  if (source.serving_size_g !== undefined) {
    sanitized.serving_size_g = Math.max(1, Math.min(50000, Number(source.serving_size_g) || 100));
  }
  if (source.calories !== undefined) {
    sanitized.calories = Math.max(0, Math.min(10000, Number(source.calories) || 0));
  }
  if (source.protein !== undefined) {
    sanitized.protein = Math.max(0, Math.min(2000, Number(source.protein) || 0));
  }
  if (source.carbs !== undefined) {
    sanitized.carbs = Math.max(0, Math.min(2000, Number(source.carbs) || 0));
  }
  if (source.fat !== undefined) {
    sanitized.fat = Math.max(0, Math.min(2000, Number(source.fat) || 0));
  }
  if (source.fiber !== undefined) {
    sanitized.fiber = Math.max(0, Math.min(2000, Number(source.fiber) || 0));
  }
  if (source.serving_unit !== undefined) {
    sanitized.serving_unit = String(source.serving_unit).trim().slice(0, 20);
  }
  if (source.is_favorite !== undefined) {
    sanitized.is_favorite = Boolean(source.is_favorite);
  }

  // Explicit safety guards
  delete sanitized.id;
  delete sanitized.user_id;
  delete sanitized.created_at;

  sanitized.updated_at = new Date().toISOString();

  try {
    let { data, error } = await supabase
      .from('user_food_library')
      .update(sanitized)
      .eq('id', foodId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error && (error.message?.includes('is_favorite') || error.message?.includes('serving_unit'))) {
      const fallback = { ...sanitized };
      delete fallback.is_favorite;
      delete fallback.serving_unit;
      const fallbackRes = await supabase
        .from('user_food_library')
        .update(fallback)
        .eq('id', foodId)
        .eq('user_id', userId)
        .select()
        .single();
      data = fallbackRes.data;
      error = fallbackRes.error;
    }

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
 * Saves a meal combo template to saved_meals table.
 * Canonical representation: column `items` (JSONB) and computed totals.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.name - Saved meal name
 * @param {string} [params.mealType='lunch'] - Meal type
 * @param {Array} params.items - Food items array
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export async function saveMeal({ userId, name, mealType = 'lunch', items = [] }) {
  if (!userId) {
    return { success: false, error: 'User ID is required.' };
  }
  const cleanName = (name || '').trim().slice(0, 150);
  if (!cleanName) {
    return { success: false, error: 'Meal name cannot be empty.' };
  }

  const cleanItems = (items || []).map((item) => ({
    food_id: item.food_id || null,
    food_name: (item.food_name || 'Food').trim().slice(0, 150),
    quantity_g: Math.max(1, Math.min(50000, Number(item.quantity_g) || 100)),
    calories: Math.max(0, Math.min(10000, Number(item.calories) || 0)),
    protein: Math.max(0, Math.min(2000, Number(item.protein) || 0)),
    carbs: Math.max(0, Math.min(2000, Number(item.carbs) || 0)),
    fat: Math.max(0, Math.min(2000, Number(item.fat) || 0)),
    fiber: Math.max(0, Math.min(2000, Number(item.fiber) || 0)),
  }));

  const totalCal = Math.round(cleanItems.reduce((sum, i) => sum + (Number(i.calories) || 0), 0));
  const totalProtein = Math.round(cleanItems.reduce((sum, i) => sum + (Number(i.protein) || 0), 0) * 10) / 10;
  const totalCarbs = Math.round(cleanItems.reduce((sum, i) => sum + (Number(i.carbs) || 0), 0) * 10) / 10;
  const totalFat = Math.round(cleanItems.reduce((sum, i) => sum + (Number(i.fat) || 0), 0) * 10) / 10;
  const totalFiber = Math.round(cleanItems.reduce((sum, i) => sum + (Number(i.fiber) || 0), 0) * 10) / 10;

  const payload = {
    user_id: userId,
    name: cleanName,
    meal_type: mealType || 'lunch',
    items: cleanItems,
    total_cal: totalCal,
    total_protein: totalProtein,
    total_carbs: totalCarbs,
    total_fat: totalFat,
    total_fiber: totalFiber,
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
    return { success: false, error: err.message || 'Failed to save meal combo.' };
  }
}

/**
 * Deletes a saved meal combo template.
 * @param {Object} params
 * @param {string} params.userId - Authenticated user UUID
 * @param {string} params.mealId - Saved meal UUID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteSavedMeal({ userId, mealId }) {
  if (!userId || !mealId) {
    return { success: false, error: 'User ID and Meal ID are required.' };
  }

  try {
    const { error } = await supabase
      .from('saved_meals')
      .delete()
      .eq('id', mealId)
      .eq('user_id', userId);

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message || 'Failed to delete saved meal combo.' };
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

