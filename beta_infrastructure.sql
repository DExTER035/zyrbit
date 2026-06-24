-- ============================================================
-- Zyrbit V2 — Phase 12: Beta Testing Infrastructure
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. FEEDBACK TABLE
CREATE TABLE IF NOT EXISTS beta_feedback (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  category    TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  page        TEXT,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE beta_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can submit and view their own feedback."
  ON beta_feedback FOR ALL USING (auth.uid() = user_id);

-- 2. ANALYTICS EVENTS TABLE
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users NOT NULL,
  event_name  TEXT NOT NULL,
  properties  JSONB DEFAULT '{}',
  session_id  TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert their own events."
  ON analytics_events FOR INSERT WITH CHECK (auth.uid() = user_id);
-- Admin read policy (for service_role key in admin dashboard)
CREATE POLICY "Users can view their own events."
  ON analytics_events FOR SELECT USING (auth.uid() = user_id);

-- 3. BETA ONBOARDING MILESTONES TABLE
CREATE TABLE IF NOT EXISTS beta_onboarding (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES auth.users NOT NULL UNIQUE,
  first_login_at            TIMESTAMP WITH TIME ZONE,
  first_habit_created_at    TIMESTAMP WITH TIME ZONE,
  first_habit_completed_at  TIMESTAMP WITH TIME ZONE,
  first_reflection_at       TIMESTAMP WITH TIME ZONE,
  first_dex_chat_at         TIMESTAMP WITH TIME ZONE,
  updated_at                TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE beta_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own onboarding record."
  ON beta_onboarding FOR ALL USING (auth.uid() = user_id);

-- 4. INDEX for fast admin queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_category ON beta_feedback (category, status);
