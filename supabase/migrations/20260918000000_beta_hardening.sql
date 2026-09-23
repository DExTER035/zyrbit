-- ==============================================================================
-- DEXOS — PRE-BETA DATABASE HARDENING MIGRATION
-- Migration: 20260918000000_beta_hardening.sql
-- Scope: analytics_events, beta_onboarding, ai_usage, profiles.subscription_tier
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES: ADD SUBSCRIPTION TIER
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'subscription_tier'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ANALYTICS EVENTS
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_analytics_insert" ON public.analytics_events;
CREATE POLICY "own_analytics_insert" ON public.analytics_events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_analytics_select" ON public.analytics_events;
CREATE POLICY "own_analytics_select" ON public.analytics_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created 
  ON public.analytics_events(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. BETA ONBOARDING MILESTONES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.beta_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  first_login_at TIMESTAMPTZ,
  first_habit_created_at TIMESTAMPTZ,
  first_habit_completed_at TIMESTAMPTZ,
  first_reflection_at TIMESTAMPTZ,
  first_dex_chat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.beta_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_onboarding_select" ON public.beta_onboarding;
CREATE POLICY "own_onboarding_select" ON public.beta_onboarding
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_onboarding_upsert" ON public.beta_onboarding;
CREATE POLICY "own_onboarding_upsert" ON public.beta_onboarding
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. SERVER-AUTHORITATIVE AI USAGE TRACKING
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_ai_usage_select" ON public.ai_usage;
CREATE POLICY "own_ai_usage_select" ON public.ai_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date 
  ON public.ai_usage(user_id, usage_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. ATOMIC USAGE INCREMENT & RATE LIMIT RPC
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.check_and_increment_ai_usage(
  p_user_id UUID,
  p_daily_limit INT DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INT;
  v_current_count INT;
BEGIN
  -- Validate caller: caller must be service_role OR authenticated user matching p_user_id
  IF auth.role() = 'authenticated' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify AI usage for another user';
  END IF;

  -- Attempt atomic insert or increment under limit
  INSERT INTO public.ai_usage (user_id, usage_date, request_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.ai_usage.request_count + 1,
    updated_at = NOW()
  WHERE public.ai_usage.request_count < p_daily_limit
  RETURNING request_count INTO v_new_count;

  -- If successfully incremented under limit
  IF v_new_count IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_count', v_new_count,
      'daily_limit', p_daily_limit,
      'remaining', GREATEST(0, p_daily_limit - v_new_count)
    );
  END IF;

  -- Limit reached: fetch current count without incrementing
  SELECT request_count INTO v_current_count
  FROM public.ai_usage
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'allowed', false,
    'current_count', COALESCE(v_current_count, p_daily_limit),
    'daily_limit', p_daily_limit,
    'remaining', 0
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_ai_usage(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate caller
  IF auth.role() = 'authenticated' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify AI usage for another user';
  END IF;

  UPDATE public.ai_usage
  SET request_count = GREATEST(0, request_count - 1),
      updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. GRANT PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.beta_onboarding TO authenticated;
GRANT SELECT ON public.ai_usage TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_ai_usage(UUID) TO authenticated, service_role;
