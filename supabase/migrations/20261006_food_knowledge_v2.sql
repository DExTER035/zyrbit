-- ==============================================================================
-- Zyrbit / DexOS — Migration: Food Knowledge V2 Architecture
-- Date: 2026-10-06
-- Description:
--   1. canonical_foods: Global canonical knowledge catalog with Atwater macros,
--      explicit preparation states, and provenance tracking.
--   2. food_aliases: Synonyms, plurals, and regional names for canonical foods.
--   3. user_food_preferences: User food memory and learned brand/preparation defaults.
--   4. meal_logs extension: Nutrition snapshot, provenance, and preparation state.
-- ==============================================================================

-- Enable pg_trgm extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Canonical Foods Catalog
CREATE TABLE IF NOT EXISTS public.canonical_foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(120) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    common_name VARCHAR(200),
    category VARCHAR(60) NOT NULL,
    region VARCHAR(60) DEFAULT 'global',
    preparation_state VARCHAR(40) NOT NULL DEFAULT 'cooked',
    
    -- Nutrition per 100g
    calories NUMERIC(7, 2) NOT NULL,
    protein_g NUMERIC(6, 2) NOT NULL,
    carbs_g NUMERIC(6, 2) NOT NULL,
    fat_g NUMERIC(6, 2) NOT NULL,
    fiber_g NUMERIC(6, 2) DEFAULT 0,
    sugar_g NUMERIC(6, 2) DEFAULT 0,
    sodium_mg NUMERIC(7, 2) DEFAULT 0,
    
    -- Portion Defaults
    default_serving_g NUMERIC(6, 1) NOT NULL DEFAULT 100,
    serving_unit_name VARCHAR(50) NOT NULL DEFAULT 'serving',
    density_g_per_ml NUMERIC(4, 2) DEFAULT 1.0,
    
    -- Provenance & Verification
    source_type VARCHAR(40) NOT NULL DEFAULT 'curated_seed',
    source_name VARCHAR(60) NOT NULL DEFAULT 'ZYRBIT_SEED',
    source_id VARCHAR(100),
    source_version VARCHAR(30) NOT NULL DEFAULT '1.0',
    confidence_score NUMERIC(3, 2) DEFAULT 1.00,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Full-Text Search and Trigram Indices for Canonical Foods
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_canonical_foods_trgm'
    ) THEN
        CREATE INDEX idx_canonical_foods_trgm ON public.canonical_foods USING GIN (name gin_trgm_ops);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_canonical_foods_slug'
    ) THEN
        CREATE INDEX idx_canonical_foods_slug ON public.canonical_foods (slug);
    END IF;
END $$;

ALTER TABLE public.canonical_foods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'canonical_foods' AND policyname = 'Canonical foods are viewable by all authenticated users'
    ) THEN
        CREATE POLICY "Canonical foods are viewable by all authenticated users"
            ON public.canonical_foods FOR SELECT TO authenticated
            USING (true);
    END IF;
END $$;

-- 2. Food Aliases
CREATE TABLE IF NOT EXISTS public.food_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_food_id UUID NOT NULL REFERENCES public.canonical_foods(id) ON DELETE CASCADE,
    alias VARCHAR(150) NOT NULL,
    language_code VARCHAR(10) DEFAULT 'en',
    region VARCHAR(40) DEFAULT 'global',
    priority INT DEFAULT 100,
    unit_weight_g NUMERIC(6, 1),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_food_aliases_alias_trgm'
    ) THEN
        CREATE INDEX idx_food_aliases_alias_trgm ON public.food_aliases USING GIN (alias gin_trgm_ops);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'idx_food_aliases_lookup'
    ) THEN
        CREATE INDEX idx_food_aliases_lookup ON public.food_aliases (lower(alias));
    END IF;
END $$;

ALTER TABLE public.food_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'food_aliases' AND policyname = 'Food aliases are viewable by all authenticated users'
    ) THEN
        CREATE POLICY "Food aliases are viewable by all authenticated users"
            ON public.food_aliases FOR SELECT TO authenticated
            USING (true);
    END IF;
END $$;

-- 3. User Food Preferences (Food Memory)
CREATE TABLE IF NOT EXISTS public.user_food_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_keyword VARCHAR(100) NOT NULL,
    preferred_food_type VARCHAR(40) NOT NULL, -- 'canonical', 'user_library', 'packaged'
    target_id UUID NOT NULL,
    preferred_preparation VARCHAR(40),
    default_quantity_g NUMERIC(6, 1),
    usage_count INT DEFAULT 1,
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, trigger_keyword)
);

ALTER TABLE public.user_food_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_food_preferences' AND policyname = 'Users can manage their own food preferences'
    ) THEN
        CREATE POLICY "Users can manage their own food preferences"
            ON public.user_food_preferences FOR ALL
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Extend meal_logs with Nutrition Snapshot and Provenance
ALTER TABLE public.meal_logs
    ADD COLUMN IF NOT EXISTS food_ref_id UUID,
    ADD COLUMN IF NOT EXISTS source_type VARCHAR(40) DEFAULT 'curated_seed',
    ADD COLUMN IF NOT EXISTS preparation_state VARCHAR(40) DEFAULT 'cooked',
    ADD COLUMN IF NOT EXISTS nutrition_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS confidence NUMERIC(3, 2) DEFAULT 1.00;
