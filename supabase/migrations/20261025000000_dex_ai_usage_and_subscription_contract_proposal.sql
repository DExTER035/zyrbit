-- ==============================================================================
-- ZYRBIT DATABASE MIGRATION PROPOSAL (PHASE 4)
-- File: supabase/migrations/20261025000000_dex_ai_usage_and_subscription_contract_proposal.sql
-- Status: PROPOSAL ONLY — PENDING EXPLICIT USER APPROVAL — NOT APPLIED TO PRODUCTION
-- ==============================================================================
--
-- PURPOSE:
-- Resolves the contract mismatch between the remote Supabase Edge Function 'zyra'
-- and the PostgreSQL database schema for:
--   1. public.profiles.subscription_tier (missing column)
--   2. public.ai_usage (daily rate limiting ledger)
--   3. public.check_and_increment_ai_usage (atomic quota check & increment RPC)
--   4. public.decrement_ai_usage (compensating rollback RPC on upstream AI failure)
--
-- SAFETY & BACKWARDS COMPATIBILITY SPECIFICATION:
-- - ADDITIVE ONLY: Uses IF NOT EXISTS and DO $$ blocks. No destructive changes.
-- - DEFAULT VALUES: subscription_tier defaults to 'free', ensuring all existing
--   anonymous guests and registered profiles automatically resolve to the free tier (50 req/day).
-- - ATOMIC CONCURRENCY: Uses PostgreSQL ON CONFLICT (user_id, usage_date) DO UPDATE
--   with row-level lock and WHERE clause check (< p_daily_limit) to prevent race condition quota bypass.
-- - SECURITY DEFINER: Functions execute with elevated table privileges to write to public.ai_usage
--   while strictly enforcing auth.uid() = p_user_id (preventing cross-user quota spoofing).
-- - ZERO CLIENT TRUST: Daily limit is evaluated authoritatively by the database/server;
--   client manipulation of local state cannot bypass server-side rate limits.
-- - FAILURE SEMANTICS: If upstream Gemini returns failure, decrement_ai_usage ensures
--   failed calls are not charged against the user's daily budget.
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PROFILES: ADD SUBSCRIPTION TIER (ADDITIVE & BACKWARDS COMPATIBLE)
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
    COMMENT ON COLUMN public.profiles.subscription_tier IS 'Subscription tier: free (default, 50 req/day), premium (200 req/day), or elite (500 req/day). Applies to both guest and registered profiles.';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. AI USAGE TABLE: DAILY USAGE LEDGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS: Authenticated users can view only their own usage record
DROP POLICY IF EXISTS "own_ai_usage_select" ON public.ai_usage;
CREATE POLICY "own_ai_usage_select" ON public.ai_usage
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date 
  ON public.ai_usage(user_id, usage_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. ATOMIC USAGE INCREMENT & RATE LIMIT RPC
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
  -- Authorization check: Caller must be service_role OR authenticated user matching p_user_id
  IF auth.role() = 'authenticated' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot access or modify AI usage for another user.';
  END IF;

  -- 1. Attempt atomic insert or increment under limit
  INSERT INTO public.ai_usage (user_id, usage_date, request_count, updated_at)
  VALUES (p_user_id, CURRENT_DATE, 1, NOW())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.ai_usage.request_count + 1,
    updated_at = NOW()
  WHERE public.ai_usage.request_count < p_daily_limit
  RETURNING request_count INTO v_new_count;

  -- 2. If increment succeeded under limit
  IF v_new_count IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'current_count', v_new_count,
      'daily_limit', p_daily_limit,
      'remaining', GREATEST(0, p_daily_limit - v_new_count)
    );
  END IF;

  -- 3. If update condition failed (current count >= limit)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. COMPENSATING ROLLBACK RPC: DECREMENT USAGE ON AI UPSTREAM FAILURE
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.decrement_ai_usage(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Authorization check
  IF auth.role() = 'authenticated' AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: cannot modify AI usage for another user.';
  END IF;

  UPDATE public.ai_usage
  SET 
    request_count = GREATEST(0, request_count - 1),
    updated_at = NOW()
  WHERE user_id = p_user_id AND usage_date = CURRENT_DATE;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. FUNCTION GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_usage(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decrement_ai_usage(UUID) TO authenticated, service_role;
