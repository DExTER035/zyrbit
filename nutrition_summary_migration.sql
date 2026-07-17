-- ─── DexOS Food Module: Database Caching Optimization ─────────────────────────
-- Creates nutrition_daily_summary for performant daily, weekly, monthly queries.
-- Syncs automatically from meal_logs, health_water_logs, and health_weight_logs.

-- 1. Create cache table
CREATE TABLE IF NOT EXISTS public.nutrition_daily_summary (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  calories    NUMERIC(6,1) NOT NULL DEFAULT 0.0,
  protein     NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  carbs       NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  fat         NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  fiber       NUMERIC(5,1) NOT NULL DEFAULT 0.0,
  water       INTEGER NOT NULL DEFAULT 0,
  weight      NUMERIC(5,2),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 2. Configure indices for fast search and sorting
CREATE INDEX IF NOT EXISTS idx_nutrition_daily_summary_user_date
  ON public.nutrition_daily_summary (user_id, date DESC);

-- 3. Row Level Security Setup
ALTER TABLE public.nutrition_daily_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_nutrition_summary" ON public.nutrition_daily_summary;
CREATE POLICY "own_nutrition_summary" ON public.nutrition_daily_summary
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Sync Trigger function
CREATE OR REPLACE FUNCTION public.sync_nutrition_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
  v_calories NUMERIC(6,1);
  v_protein NUMERIC(5,1);
  v_carbs NUMERIC(5,1);
  v_fat NUMERIC(5,1);
  v_fiber NUMERIC(5,1);
  v_water INTEGER;
  v_weight NUMERIC(5,2);
BEGIN
  -- Identify user_id and date for trigger context
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    IF TG_TABLE_NAME = 'meal_logs' THEN
      v_date := OLD.date;
    ELSE
      v_date := OLD.log_date;
    END IF;
  ELSE
    v_user_id := NEW.user_id;
    IF TG_TABLE_NAME = 'meal_logs' THEN
      v_date := NEW.date;
    ELSE
      v_date := NEW.log_date;
    END IF;
  END IF;

  -- 1. Compute meal_logs totals
  SELECT 
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(carbs), 0),
    COALESCE(SUM(fat), 0),
    COALESCE(SUM(fiber), 0)
  INTO
    v_calories, v_protein, v_carbs, v_fat, v_fiber
  FROM public.meal_logs
  WHERE user_id = v_user_id AND date = v_date;

  -- 2. Compute health_water_logs totals
  SELECT COALESCE(SUM(amount_ml), 0)
  INTO v_water
  FROM public.health_water_logs
  WHERE user_id = v_user_id AND log_date = v_date;

  -- 3. Get latest logged weight for that day
  SELECT weight
  INTO v_weight
  FROM public.health_weight_logs
  WHERE user_id = v_user_id AND log_date = v_date
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Upsert aggregated totals
  INSERT INTO public.nutrition_daily_summary (
    user_id, date, calories, protein, carbs, fat, fiber, water, weight, updated_at
  ) VALUES (
    v_user_id, v_date, v_calories, v_protein, v_carbs, v_fat, v_fiber, v_water, v_weight, NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    calories = EXCLUDED.calories,
    protein = EXCLUDED.protein,
    carbs = EXCLUDED.carbs,
    fat = EXCLUDED.fat,
    fiber = EXCLUDED.fiber,
    water = EXCLUDED.water,
    weight = EXCLUDED.weight,
    updated_at = NOW();

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Triggers
DROP TRIGGER IF EXISTS trg_sync_nutrition_meal_logs ON public.meal_logs;
CREATE TRIGGER trg_sync_nutrition_meal_logs
AFTER INSERT OR UPDATE OR DELETE ON public.meal_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_nutrition_daily_summary();

DROP TRIGGER IF EXISTS trg_sync_nutrition_water_logs ON public.health_water_logs;
CREATE TRIGGER trg_sync_nutrition_water_logs
AFTER INSERT OR UPDATE OR DELETE ON public.health_water_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_nutrition_daily_summary();

DROP TRIGGER IF EXISTS trg_sync_nutrition_weight_logs ON public.health_weight_logs;
CREATE TRIGGER trg_sync_nutrition_weight_logs
AFTER INSERT OR UPDATE OR DELETE ON public.health_weight_logs
FOR EACH ROW EXECUTE FUNCTION public.sync_nutrition_daily_summary();

-- 6. Initial backfill for historical data
INSERT INTO public.nutrition_daily_summary (user_id, date, calories, protein, carbs, fat, fiber, water, weight)
SELECT 
  u.user_id,
  u.date,
  COALESCE(m.calories, 0),
  COALESCE(m.protein, 0),
  COALESCE(m.carbs, 0),
  COALESCE(m.fat, 0),
  COALESCE(m.fiber, 0),
  COALESCE(w.water, 0),
  wt.weight
FROM (
  SELECT user_id, date FROM public.meal_logs
  UNION
  SELECT user_id, log_date AS date FROM public.health_water_logs
  UNION
  SELECT user_id, log_date AS date FROM public.health_weight_logs
) u
LEFT JOIN (
  SELECT user_id, date, SUM(calories) AS calories, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fat) AS fat, SUM(fiber) AS fiber
  FROM public.meal_logs GROUP BY user_id, date
) m ON m.user_id = u.user_id AND m.date = u.date
LEFT JOIN (
  SELECT user_id, log_date AS date, SUM(amount_ml) AS water
  FROM public.health_water_logs GROUP BY user_id, log_date
) w ON w.user_id = u.user_id AND w.date = u.date
LEFT JOIN (
  SELECT DISTINCT ON (user_id, log_date) user_id, log_date AS date, weight
  FROM public.health_weight_logs ORDER BY user_id, log_date, created_at DESC
) wt ON wt.user_id = u.user_id AND wt.date = u.date
ON CONFLICT (user_id, date) DO UPDATE SET
  calories = EXCLUDED.calories,
  protein = EXCLUDED.protein,
  carbs = EXCLUDED.carbs,
  fat = EXCLUDED.fat,
  fiber = EXCLUDED.fiber,
  water = EXCLUDED.water,
  weight = EXCLUDED.weight;
