-- DexOS Migration: Create meal_logs table (Food module)
-- Purpose: Support daily meal logging, macros calculations, and integration.

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name   TEXT NOT NULL,
  food_id     TEXT,
  quantity_g  NUMERIC(6,1) NOT NULL,
  calories    NUMERIC(6,1) NOT NULL,
  protein     NUMERIC(5,1) DEFAULT 0.0,
  carbs       NUMERIC(5,1) DEFAULT 0.0,
  fat         NUMERIC(5,1) DEFAULT 0.0,
  fiber       NUMERIC(5,1) DEFAULT 0.0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- Create Policy for owner access
DROP POLICY IF EXISTS "own_meal_logs" ON public.meal_logs;
CREATE POLICY "own_meal_logs" ON public.meal_logs 
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);

-- Optimize queries searching by user and descending date
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date
  ON public.meal_logs (user_id, date DESC);
