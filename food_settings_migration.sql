-- ─── DexOS Food Module: Settings & Saved Meals ───────────────────────────────
-- Run this in the Supabase SQL editor.

-- 1. food_settings: per-user daily calorie + macro goals
CREATE TABLE IF NOT EXISTS food_settings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_goal  INTEGER NOT NULL DEFAULT 2200,
  protein_goal  INTEGER NOT NULL DEFAULT 130,
  carbs_goal    INTEGER NOT NULL DEFAULT 275,
  fat_goal      INTEGER NOT NULL DEFAULT 61,
  fiber_goal    INTEGER NOT NULL DEFAULT 30,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
ALTER TABLE food_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_food_settings" ON food_settings;
CREATE POLICY "user_food_settings" ON food_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. saved_meals: whole-meal templates the user can log in 1 tap
CREATE TABLE IF NOT EXISTS saved_meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  meal_type     TEXT NOT NULL DEFAULT 'lunch',
  items         JSONB NOT NULL DEFAULT '[]',
  total_cal     INTEGER NOT NULL DEFAULT 0,
  total_protein REAL NOT NULL DEFAULT 0,
  total_carbs   REAL NOT NULL DEFAULT 0,
  total_fat     REAL NOT NULL DEFAULT 0,
  total_fiber   REAL NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_saved_meals" ON saved_meals;
CREATE POLICY "user_saved_meals" ON saved_meals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
