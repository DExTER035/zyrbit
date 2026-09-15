-- ====================================================================
-- ZYRBIT V1 — PHASE 4: PERSONAL FOOD LIBRARY MIGRATION
-- Migration Version: 20260821000001
-- Purpose: Reusable personal food definitions with automated updated_at
-- ====================================================================

-- ── 1. CREATE USER_FOOD_LIBRARY TABLE ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_food_library (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name      TEXT NOT NULL CONSTRAINT chk_food_name_len CHECK (length(trim(food_name)) BETWEEN 1 AND 120),
  serving_size_g NUMERIC(6,1) NOT NULL DEFAULT 100.0 CHECK (serving_size_g > 0),
  calories       NUMERIC(6,1) NOT NULL DEFAULT 0.0 CHECK (calories >= 0),
  protein        NUMERIC(5,1) NOT NULL DEFAULT 0.0 CHECK (protein >= 0),
  carbs          NUMERIC(5,1) NOT NULL DEFAULT 0.0 CHECK (carbs >= 0),
  fat            NUMERIC(5,1) NOT NULL DEFAULT 0.0 CHECK (fat >= 0),
  fiber          NUMERIC(5,1) NOT NULL DEFAULT 0.0 CHECK (fiber >= 0),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. ROW LEVEL SECURITY (RLS) POLICIES ───────────────────────────
ALTER TABLE public.user_food_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_user_food_library" ON public.user_food_library;
CREATE POLICY "own_user_food_library" ON public.user_food_library
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. QUERY PERFORMANCE INDEX ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_food_library_query
  ON public.user_food_library (user_id, food_name);

-- ── 4. AUTOMATED UPDATED_AT TRIGGER ────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_food_library_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_food_library_updated_at ON public.user_food_library;
CREATE TRIGGER trigger_user_food_library_updated_at
  BEFORE UPDATE ON public.user_food_library
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_food_library_updated_at();
