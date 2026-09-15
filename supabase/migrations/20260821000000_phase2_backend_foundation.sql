-- ====================================================================
-- ZYRBIT V1 — PHASE 2: BACKEND & DATABASE FOUNDATION MIGRATION
-- Migration Version: 20260821000000
-- Dry-Run Verified: YES
-- ====================================================================

-- ── 1. SAFE DROP OF CONFIRMED LEGACY TABLES ─────────────────────────
-- Dry-run audit confirmed zero foreign key dependencies, triggers, functions,
-- views, or active application references for these 4 legacy tables.
DROP TABLE IF EXISTS public.zyron_wallet CASCADE;
DROP TABLE IF EXISTS public.zyron_transactions CASCADE;
DROP TABLE IF EXISTS public.zyron_cooldowns CASCADE;
DROP TABLE IF EXISTS public.friend_challenges CASCADE;

-- ── 2. DATA INTEGRITY INVARIANTS (CHECK CONSTRAINTS) ─────────

-- FINANCIAL TRANSACTIONS (Must be strictly positive > 0)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_money_expenses_amount') THEN
    ALTER TABLE public.money_expenses ADD CONSTRAINT chk_money_expenses_amount CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_income_amount') THEN
    ALTER TABLE public.wealth_income ADD CONSTRAINT chk_wealth_income_amount CHECK (amount > 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_wealth_bills_amount') THEN
    ALTER TABLE public.wealth_bills ADD CONSTRAINT chk_wealth_bills_amount CHECK (amount > 0);
  END IF;
END $$;

-- FOOD / NUTRITION (Non-negative >= 0)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_meal_logs_calories') THEN
    ALTER TABLE public.meal_logs ADD CONSTRAINT chk_meal_logs_calories CHECK (calories >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_meal_logs_protein') THEN
    ALTER TABLE public.meal_logs ADD CONSTRAINT chk_meal_logs_protein CHECK (protein >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_meal_logs_carbs') THEN
    ALTER TABLE public.meal_logs ADD CONSTRAINT chk_meal_logs_carbs CHECK (carbs >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_meal_logs_fat') THEN
    ALTER TABLE public.meal_logs ADD CONSTRAINT chk_meal_logs_fat CHECK (fat >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_meal_logs_quantity') THEN
    ALTER TABLE public.meal_logs ADD CONSTRAINT chk_meal_logs_quantity CHECK (quantity_g >= 0);
  END IF;
END $$;

-- HEALTH (Bounded & non-negative)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_water_logs_amount') THEN
    ALTER TABLE public.health_water_logs ADD CONSTRAINT chk_water_logs_amount CHECK (amount_ml >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sleep_duration') THEN
    ALTER TABLE public.health_sleep_logs ADD CONSTRAINT chk_sleep_duration CHECK (duration_hours >= 0 AND duration_hours <= 24);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_sleep_quality') THEN
    ALTER TABLE public.health_sleep_logs ADD CONSTRAINT chk_sleep_quality CHECK (quality BETWEEN 1 AND 5);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_move_minutes') THEN
    ALTER TABLE public.health_move_logs ADD CONSTRAINT chk_move_minutes CHECK (active_minutes >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_move_rpe') THEN
    ALTER TABLE public.health_move_logs ADD CONSTRAINT chk_move_rpe CHECK (rpe BETWEEN 1 AND 10);
  END IF;
END $$;

-- FOCUS
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_focus_duration') THEN
    ALTER TABLE public.growth_focus_sessions ADD CONSTRAINT chk_focus_duration CHECK (duration_minutes >= 0);
  END IF;
END $$;

-- ── 3. OWNERSHIP-AWARE ROW LEVEL SECURITY (RLS) POLICIES ───────────

-- 1. Profiles & Direct Ownership
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_profiles" ON public.profiles;
CREATE POLICY "own_profiles" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

ALTER TABLE public.wealth_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_settings" ON public.wealth_settings;
CREATE POLICY "own_settings" ON public.wealth_settings FOR ALL TO authenticated USING (auth.uid() = id OR auth.uid() = user_id) WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- 2. Direct user_id Tables
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_habits" ON public.habits;
CREATE POLICY "own_habits" ON public.habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_activity_log" ON public.activity_log;
CREATE POLICY "own_activity_log" ON public.activity_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_user_streaks" ON public.user_streaks;
CREATE POLICY "own_user_streaks" ON public.user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.orbit_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_orbit_journal" ON public.orbit_journal;
CREATE POLICY "own_orbit_journal" ON public.orbit_journal FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.dexos_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_summary" ON public.dexos_daily_summary;
CREATE POLICY "own_summary" ON public.dexos_daily_summary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_timeline" ON public.timeline_events;
CREATE POLICY "own_timeline" ON public.timeline_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.food_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_food_settings" ON public.food_settings;
CREATE POLICY "user_food_settings" ON public.food_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_meal_logs" ON public.meal_logs;
CREATE POLICY "own_meal_logs" ON public.meal_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_saved_meals" ON public.saved_meals;
CREATE POLICY "user_saved_meals" ON public.saved_meals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.nutrition_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_nutrition_summary" ON public.nutrition_daily_summary;
CREATE POLICY "own_nutrition_summary" ON public.nutrition_daily_summary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.money_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_expenses" ON public.money_expenses;
CREATE POLICY "own_expenses" ON public.money_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.wealth_income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_income" ON public.wealth_income;
CREATE POLICY "own_income" ON public.wealth_income FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.wealth_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_bills" ON public.wealth_bills;
CREATE POLICY "own_bills" ON public.wealth_bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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

ALTER TABLE public.growth_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_skills" ON public.growth_skills;
CREATE POLICY "own_skills" ON public.growth_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

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

ALTER TABLE public.dexos_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_goals" ON public.dexos_goals;
CREATE POLICY "own_goals" ON public.dexos_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Relational Child Table Policy (No artificial user_id added)
ALTER TABLE public.growth_sprint_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sprint_projects" ON public.growth_sprint_projects;
CREATE POLICY "own_sprint_projects" ON public.growth_sprint_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM growth_sprints s WHERE s.id = sprint_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM growth_sprints s WHERE s.id = sprint_id AND s.user_id = auth.uid()));

-- ── 4. QUERY-DRIVEN PERFORMANCE INDEXES ────────────────────────────

CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date ON public.meal_logs (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_money_expenses_user_date ON public.money_expenses (user_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_wealth_income_user_date ON public.wealth_income (user_id, income_date DESC);
CREATE INDEX IF NOT EXISTS idx_growth_tasks_user_proj ON public.growth_tasks (user_id, project_id, status);
CREATE INDEX IF NOT EXISTS idx_growth_focus_user_date ON public.growth_focus_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON public.activity_log (user_id, completed_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_water_user_date ON public.health_water_logs (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_sleep_user_date ON public.health_sleep_logs (user_id, sleep_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_move_user_date ON public.health_move_logs (user_id, log_date DESC);
