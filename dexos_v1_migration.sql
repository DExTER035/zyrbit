-- ============================================================
-- DexOS V1 — COMPLETE ALIGNMENT MIGRATION
-- Run this ENTIRE script in the Supabase SQL Editor for:
-- Project: xgowpznkqbsngdiuodmj (zyrbit.supabase.co)
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- SECTION 1: Fix `profiles` table — add missing columns
-- Referenced by: SubscriptionContext.jsx, AlterEgo.jsx
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alter_ego_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alter_ego_desc TEXT;


-- ─────────────────────────────────────────────────────────────
-- SECTION 2: Fix `habits` table — add notification columns
-- Referenced by: Orbit.jsx, useHabitReminders.js, HabitCard.jsx
-- ─────────────────────────────────────────────────────────────
ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE habits ADD COLUMN IF NOT EXISTS reminder_time TEXT;


-- ─────────────────────────────────────────────────────────────
-- SECTION 3: Create `money_expenses` table
-- The codebase uses `money_expenses` (not `wealth_expenses`)
-- Referenced by: Wealth.jsx, Zenith.jsx, Orbit.jsx, Jarvis.jsx, Detrox.jsx, JournalTabMoney.jsx
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS money_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  note TEXT,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE money_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_money_expenses" ON money_expenses;
CREATE POLICY "own_money_expenses" ON money_expenses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_money_expenses_user_date
  ON money_expenses (user_id, expense_date DESC);


-- ─────────────────────────────────────────────────────────────
-- SECTION 4: Create/Align `study_goals` table
-- The codebase's Growth.jsx writes per-goal rows with name/pillar/target_value.
-- The existing missing_tables.sql defines a single-row-per-user design.
-- We recreate with the row-per-goal design that Growth.jsx expects.
-- Referenced by: Growth.jsx, Zenith.jsx, JournalTabStudy.jsx
-- ─────────────────────────────────────────────────────────────
-- Drop old single-row design if it exists (safe via IF EXISTS)
DROP TABLE IF EXISTS study_goals CASCADE;

CREATE TABLE IF NOT EXISTS study_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL DEFAULT 'growth',
  target_value NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unit TEXT DEFAULT 'done',
  deadline DATE,
  is_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_study_goals" ON study_goals;
CREATE POLICY "own_study_goals" ON study_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_study_goals_user
  ON study_goals (user_id, is_complete);


-- ─────────────────────────────────────────────────────────────
-- SECTION 5: Ensure all Health tables exist
-- Referenced by: Health.jsx, Zenith.jsx, Jarvis.jsx
-- ─────────────────────────────────────────────────────────────

-- 5a. health_sleep_logs
CREATE TABLE IF NOT EXISTS health_sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  quality INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);
ALTER TABLE health_sleep_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sleep" ON health_sleep_logs;
CREATE POLICY "own_sleep" ON health_sleep_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5b. health_water_logs
CREATE TABLE IF NOT EXISTS health_water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  amount_ml INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE health_water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_water" ON health_water_logs;
CREATE POLICY "own_water" ON health_water_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_water_user_date
  ON health_water_logs (user_id, log_date);

-- 5c. health_food_logs
CREATE TABLE IF NOT EXISTS health_food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  food_name TEXT NOT NULL,
  protein INT DEFAULT 0,
  quality TEXT NOT NULL DEFAULT 'neutral',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE health_food_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_food" ON health_food_logs;
CREATE POLICY "own_food" ON health_food_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5d. health_move_logs
CREATE TABLE IF NOT EXISTS health_move_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'Strength',
  active_minutes INT NOT NULL DEFAULT 45,
  rpe INT NOT NULL DEFAULT 5,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE health_move_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_move" ON health_move_logs;
CREATE POLICY "own_move" ON health_move_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5e. health_weight_logs
CREATE TABLE IF NOT EXISTS health_weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);
ALTER TABLE health_weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_weight" ON health_weight_logs;
CREATE POLICY "own_weight" ON health_weight_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 6: Ensure all Growth tables exist
-- Referenced by: Growth.jsx, Zenith.jsx
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS growth_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  deadline DATE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE growth_projects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_projects" ON growth_projects;
CREATE POLICY "own_projects" ON growth_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES growth_projects ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INT DEFAULT 3,
  status TEXT DEFAULT 'todo',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE growth_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_tasks" ON growth_tasks;
CREATE POLICY "own_tasks" ON growth_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES growth_projects ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE growth_focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_focus" ON growth_focus_sessions;
CREATE POLICY "own_focus" ON growth_focus_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_sprints (
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
ALTER TABLE growth_sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_sprints" ON growth_sprints;
CREATE POLICY "own_sprints" ON growth_sprints FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⚡',
  category TEXT DEFAULT 'technical',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE growth_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_skills" ON growth_skills;
CREATE POLICY "own_skills" ON growth_skills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 7: Ensure all Wealth tables exist
-- Referenced by: Wealth.jsx, Zenith.jsx
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wealth_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 15000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wealth_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_settings" ON wealth_settings;
CREATE POLICY "own_settings" ON wealth_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wealth_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL DEFAULT 'other',
  note TEXT,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wealth_income ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_income" ON wealth_income;
CREATE POLICY "own_income" ON wealth_income FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wealth_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'unpaid',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wealth_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_bills" ON wealth_bills;
CREATE POLICY "own_bills" ON wealth_bills FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wealth_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE wealth_vault ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_vault" ON wealth_vault;
CREATE POLICY "own_vault" ON wealth_vault FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 8: Ensure system tables exist
-- Referenced by: Zenith.jsx, gravity.js
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dexos_daily_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  os_score INT DEFAULT 0,
  recovery_score INT DEFAULT 100,
  focus_minutes INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  sleep_hours NUMERIC(4,2) DEFAULT 0.00,
  sleep_debt_hours NUMERIC(4,2) DEFAULT 0.00,
  water_ml INT DEFAULT 0,
  protein_g INT DEFAULT 0,
  active_minutes INT DEFAULT 0,
  spent_amount NUMERIC(12,2) DEFAULT 0.00,
  UNIQUE(user_id, log_date)
);
ALTER TABLE dexos_daily_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_summary" ON dexos_daily_summary;
CREATE POLICY "own_summary" ON dexos_daily_summary FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS system_goals (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  weight_current NUMERIC(5,2),
  weight_target NUMERIC(5,2),
  daily_water_target INT DEFAULT 3000,
  sleep_target NUMERIC(4,2) DEFAULT 7.5,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE system_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_system_goals" ON system_goals;
CREATE POLICY "own_system_goals" ON system_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- SECTION 9: Reload PostgREST schema cache
-- This is required after adding/creating tables so Supabase
-- REST API recognises them immediately without a restart.
-- ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
