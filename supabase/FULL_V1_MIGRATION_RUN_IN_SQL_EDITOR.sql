-- ==============================================================================
-- DEXOS V1 — COMPLETE PRODUCTION DATABASE MIGRATION
-- Run this script in the Supabase SQL Editor (NOT the Logs tab!).
-- ==============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. GROWTH TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Projects
CREATE TABLE IF NOT EXISTS public.growth_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  deadline DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.growth_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.growth_projects ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority INT DEFAULT 3, -- 1=critical, 2=high, 3=normal
  status TEXT DEFAULT 'todo', -- todo | done
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sprints
CREATE TABLE IF NOT EXISTS public.growth_sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_focus_minutes INT DEFAULT 90,
  status TEXT DEFAULT 'active',
  focus_logged_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.growth_sprint_projects (
  sprint_id UUID REFERENCES public.growth_sprints ON DELETE CASCADE,
  project_id UUID REFERENCES public.growth_projects ON DELETE CASCADE,
  PRIMARY KEY (sprint_id, project_id)
);

-- Skills
CREATE TABLE IF NOT EXISTS public.growth_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⚡',
  category TEXT DEFAULT 'technical',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Focus Sessions
CREATE TABLE IF NOT EXISTS public.growth_focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES public.growth_projects ON DELETE SET NULL,
  skill_id UUID REFERENCES public.growth_skills ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Task Dependencies (Phase 10.1)
CREATE TABLE IF NOT EXISTS public.growth_task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.growth_tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.growth_tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_different_tasks CHECK (task_id <> depends_on_task_id),
  CONSTRAINT unique_user_task_dep UNIQUE(user_id, task_id, depends_on_task_id)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. HEALTH TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.health_sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  quality INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);

CREATE TABLE IF NOT EXISTS public.health_water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  amount_ml INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.health_move_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  active_minutes INT NOT NULL DEFAULT 45,
  rpe INT NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.health_weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FOOD TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name TEXT NOT NULL,
  food_id TEXT,
  quantity_g NUMERIC(6,1) NOT NULL,
  calories NUMERIC(6,1) NOT NULL,
  protein NUMERIC(5,1) DEFAULT 0.0,
  carbs NUMERIC(5,1) DEFAULT 0.0,
  fat NUMERIC(5,1) DEFAULT 0.0,
  fiber NUMERIC(5,1) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.food_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calorie_goal INTEGER NOT NULL DEFAULT 2200,
  protein_goal INTEGER NOT NULL DEFAULT 130,
  carbs_goal INTEGER NOT NULL DEFAULT 275,
  fat_goal INTEGER NOT NULL DEFAULT 61,
  fiber_goal INTEGER NOT NULL DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.saved_meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  items JSONB NOT NULL DEFAULT '[]',
  total_cal INTEGER NOT NULL DEFAULT 0,
  total_protein REAL NOT NULL DEFAULT 0,
  total_carbs REAL NOT NULL DEFAULT 0,
  total_fat REAL NOT NULL DEFAULT 0,
  total_fiber REAL NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_food_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_name TEXT NOT NULL,
  serving_size_g NUMERIC NOT NULL DEFAULT 100,
  serving_unit TEXT NOT NULL DEFAULT 'g',
  calories NUMERIC NOT NULL,
  protein NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fat NUMERIC NOT NULL DEFAULT 0,
  fiber NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. WEALTH TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wealth_settings (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 15000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wealth_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL,
  note TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wealth_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. SUMMARY & STREAK TABLES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dexos_daily_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  summary_date DATE NOT NULL,
  overall_score INT DEFAULT 0,
  growth_score INT DEFAULT 0,
  health_score INT DEFAULT 0,
  wealth_score INT DEFAULT 0,
  habits_score INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, summary_date)
);

CREATE TABLE IF NOT EXISTS public.dexos_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  domain TEXT NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, domain)
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. ENABLE ROW LEVEL SECURITY & APPLY POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.growth_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_projects" ON public.growth_projects;
CREATE POLICY "own_projects" ON public.growth_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.growth_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_tasks" ON public.growth_tasks;
CREATE POLICY "own_tasks" ON public.growth_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.growth_sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sprints" ON public.growth_sprints;
CREATE POLICY "own_sprints" ON public.growth_sprints FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.growth_focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_focus" ON public.growth_focus_sessions;
CREATE POLICY "own_focus" ON public.growth_focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.growth_task_dependencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_task_dependencies" ON public.growth_task_dependencies;
CREATE POLICY "own_task_dependencies" ON public.growth_task_dependencies
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = task_id AND user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = depends_on_task_id AND user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = task_id AND user_id = auth.uid()) AND
    EXISTS (SELECT 1 FROM public.growth_tasks WHERE id = depends_on_task_id AND user_id = auth.uid())
  );

ALTER TABLE public.health_sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sleep" ON public.health_sleep_logs;
CREATE POLICY "own_sleep" ON public.health_sleep_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.health_water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_water" ON public.health_water_logs;
CREATE POLICY "own_water" ON public.health_water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.health_move_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_move" ON public.health_move_logs;
CREATE POLICY "own_move" ON public.health_move_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.health_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_weight" ON public.health_weight_logs;
CREATE POLICY "own_weight" ON public.health_weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_meal_logs" ON public.meal_logs;
CREATE POLICY "own_meal_logs" ON public.meal_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.food_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_food_settings" ON public.food_settings;
CREATE POLICY "user_food_settings" ON public.food_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_saved_meals" ON public.saved_meals;
CREATE POLICY "user_saved_meals" ON public.saved_meals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_food_library ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_food_library_policy" ON public.user_food_library;
CREATE POLICY "user_food_library_policy" ON public.user_food_library FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.wealth_income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_income" ON public.wealth_income;
CREATE POLICY "own_income" ON public.wealth_income FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.wealth_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_bills" ON public.wealth_bills;
CREATE POLICY "own_bills" ON public.wealth_bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.wealth_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_wealth_settings" ON public.wealth_settings;
CREATE POLICY "own_wealth_settings" ON public.wealth_settings FOR ALL TO authenticated USING (auth.uid() = user_id OR auth.uid() = id) WITH CHECK (auth.uid() = user_id OR auth.uid() = id);

ALTER TABLE public.dexos_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_summary" ON public.dexos_daily_summary;
CREATE POLICY "own_summary" ON public.dexos_daily_summary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.dexos_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_streaks" ON public.dexos_streaks;
CREATE POLICY "own_streaks" ON public.dexos_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_growth_tasks_user_status ON public.growth_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_growth_focus_user_date ON public.growth_focus_sessions(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_growth_deps_user_task ON public.growth_task_dependencies(user_id, task_id);
CREATE INDEX IF NOT EXISTS idx_growth_deps_user_dep ON public.growth_task_dependencies(user_id, depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_food_library_user_id ON public.user_food_library(user_id);
CREATE INDEX IF NOT EXISTS idx_health_water_user_date ON public.health_water_logs(user_id, log_date);
CREATE INDEX IF NOT EXISTS idx_wealth_income_user_date ON public.wealth_income(user_id, income_date);
CREATE INDEX IF NOT EXISTS idx_wealth_bills_user_due ON public.wealth_bills(user_id, due_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. GRANT ROLES & PERMISSIONS
-- ─────────────────────────────────────────────────────────────────────────────

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

