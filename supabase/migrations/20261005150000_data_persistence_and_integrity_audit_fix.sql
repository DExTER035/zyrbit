-- ==============================================================================
-- ZYRBIT DATA PERSISTENCE & DATABASE INTEGRITY AUDIT FIX
-- Creates missing tables and ensures RLS, indexes, and schema cache reloading
-- ==============================================================================

-- 1. DEXOS GOALS (Growth pillar goals: CGPA, Weight, Side Income, Custom)
CREATE TABLE IF NOT EXISTS public.dexos_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pillar TEXT DEFAULT 'general',
  project_id UUID REFERENCES public.growth_projects(id) ON DELETE SET NULL,
  target_value NUMERIC NOT NULL DEFAULT 1,
  current_value NUMERIC NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'done',
  deadline DATE,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dexos_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_goals" ON public.dexos_goals;
CREATE POLICY "own_goals" ON public.dexos_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_dexos_goals_user ON public.dexos_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_dexos_goals_project ON public.dexos_goals(project_id);

-- 2. BETA FEEDBACK (In-app feedback, bug reports, feature requests)
CREATE TABLE IF NOT EXISTS public.beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'general')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.beta_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can submit and view their own feedback." ON public.beta_feedback;
CREATE POLICY "Users can submit and view their own feedback."
  ON public.beta_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_beta_feedback_category ON public.beta_feedback(category, status);
CREATE INDEX IF NOT EXISTS idx_beta_feedback_user ON public.beta_feedback(user_id);

-- 3. PERMISSIONS & SCHEMA CACHE RELOAD
GRANT ALL ON TABLE public.dexos_goals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.beta_feedback TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
