-- ==============================================================================
-- ZYRBIT HEALTH FOOD LIBRARY & SAVED MEALS SCHEMA CONSOLIDATION
-- Idempotent deployment of food favorites, serving units, RLS, and indexes
-- ==============================================================================

-- 1. USER FOOD LIBRARY (Personal Foods & Favorites)
CREATE TABLE IF NOT EXISTS public.user_food_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  serving_size_g NUMERIC NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC NOT NULL DEFAULT 0,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  fiber NUMERIC NOT NULL DEFAULT 0,
  is_favorite BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add missing columns if table already existed without them
ALTER TABLE public.user_food_library 
  ADD COLUMN IF NOT EXISTS serving_unit TEXT NOT NULL DEFAULT 'g',
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.user_food_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_food_library_policy" ON public.user_food_library;
CREATE POLICY "user_food_library_policy" ON public.user_food_library 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_food_library_user_id ON public.user_food_library(user_id);
CREATE INDEX IF NOT EXISTS idx_user_food_library_fav ON public.user_food_library(user_id, is_favorite);

-- 2. SAVED MEAL COMBOS
CREATE TABLE IF NOT EXISTS public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_cal INTEGER NOT NULL DEFAULT 0,
  total_protein REAL NOT NULL DEFAULT 0,
  total_carbs REAL NOT NULL DEFAULT 0,
  total_fat REAL NOT NULL DEFAULT 0,
  total_fiber REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_saved_meals" ON public.saved_meals;
CREATE POLICY "user_saved_meals" ON public.saved_meals 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_saved_meals_user ON public.saved_meals(user_id);
