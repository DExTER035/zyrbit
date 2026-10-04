-- ==============================================================================
-- ZYRBIT COMPLETE PRODUCTION SCHEMA & TABLE CONSOLIDATION
-- Idempotent deployment of all required user-data tables, RLS, and permissions
-- ==============================================================================

-- 1. CONNECT MONEY & IMPORT TABLES
CREATE TABLE IF NOT EXISTS public.statement_import_batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_code TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'paytm',
  filename TEXT,
  period_start DATE,
  period_end DATE,
  total_count INT DEFAULT 0,
  confirmed_count INT DEFAULT 0,
  needs_review_count INT DEFAULT 0,
  status TEXT DEFAULT 'pending_review',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.statement_import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_statement_import_batches" ON public.statement_import_batches;
CREATE POLICY "own_statement_import_batches" ON public.statement_import_batches
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_import_batches_user_created 
  ON public.statement_import_batches (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.imported_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_id UUID REFERENCES public.statement_import_batches(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL DEFAULT 'paytm',
  source_transaction_id TEXT,
  fingerprint TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  counterparty TEXT,
  payment_method TEXT DEFAULT 'upi',
  raw_description TEXT,
  resolution_state TEXT DEFAULT 'resolved',
  suggested_action TEXT DEFAULT 'add_expense',
  suggested_category TEXT,
  suggested_note TEXT,
  review_reason TEXT,
  status TEXT DEFAULT 'pending',
  linked_expense_id UUID,
  linked_income_id UUID,
  linked_bill_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.imported_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_imported_transactions" ON public.imported_transactions;
CREATE POLICY "own_imported_transactions" ON public.imported_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_imported_tx_user_batch ON public.imported_transactions (user_id, batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_tx_user_fingerprint ON public.imported_transactions (user_id, fingerprint);

-- 2. MONEY PROMISES & REPAYMENTS (Lending / Borrowing)
CREATE TABLE IF NOT EXISTS public.money_promises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  person TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT NOT NULL, -- 'lent' / 'borrowed' / 'LEND' / 'BORROW'
  due_date DATE,
  status TEXT DEFAULT 'outstanding', -- 'outstanding' / 'paid' / 'cancelled'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.money_promises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_money_promises" ON public.money_promises;
CREATE POLICY "own_money_promises" ON public.money_promises
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_money_promises_user_status ON public.money_promises (user_id, status);

CREATE TABLE IF NOT EXISTS public.money_promise_repayments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  promise_id UUID REFERENCES public.money_promises(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  repayment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.money_promise_repayments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_money_promise_repayments" ON public.money_promise_repayments;
CREATE POLICY "own_money_promise_repayments" ON public.money_promise_repayments
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_repayments_user_promise ON public.money_promise_repayments (user_id, promise_id);

-- 3. WEALTH ACCOUNTS & SAVINGS GOALS
CREATE TABLE IF NOT EXISTS public.wealth_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'bank', -- 'cash', 'bank', 'savings', 'investment'
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wealth_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_wealth_accounts" ON public.wealth_accounts;
CREATE POLICY "own_wealth_accounts" ON public.wealth_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wealth_accounts_user ON public.wealth_accounts (user_id);

CREATE TABLE IF NOT EXISTS public.wealth_savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(12,2) NOT NULL,
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  deadline DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.wealth_savings_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_wealth_savings_goals" ON public.wealth_savings_goals;
CREATE POLICY "own_wealth_savings_goals" ON public.wealth_savings_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wealth_savings_user ON public.wealth_savings_goals (user_id);

-- 4. HABIT LOGS (User data table)
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_habit_logs" ON public.habit_logs;
CREATE POLICY "own_habit_logs" ON public.habit_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_habit_logs_user_date ON public.habit_logs (user_id, completed_date);

-- 5. FOCUS SESSIONS & TASKS (Generic alias tables matching growth)
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_name TEXT,
  duration_minutes INT NOT NULL,
  notes TEXT,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_focus_sessions" ON public.focus_sessions;
CREATE POLICY "own_focus_sessions" ON public.focus_sessions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_date ON public.focus_sessions (user_id, session_date);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INT DEFAULT 3,
  status TEXT DEFAULT 'todo',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_tasks_table" ON public.tasks;
CREATE POLICY "own_tasks_table" ON public.tasks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status ON public.tasks (user_id, status);

-- 6. HEALTH TABLES (Meals, Workouts, Sleep)
CREATE TABLE IF NOT EXISTS public.health_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'lunch',
  food_name TEXT NOT NULL,
  calories NUMERIC(6,1) NOT NULL DEFAULT 0,
  protein NUMERIC(5,1) DEFAULT 0,
  carbs NUMERIC(5,1) DEFAULT 0,
  fat NUMERIC(5,1) DEFAULT 0,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_health_meals" ON public.health_meals;
CREATE POLICY "own_health_meals" ON public.health_meals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_meals_user_date ON public.health_meals (user_id, logged_at);

CREATE TABLE IF NOT EXISTS public.health_workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workout_type TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  calories_burned INT DEFAULT 0,
  workout_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_workouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_health_workouts" ON public.health_workouts;
CREATE POLICY "own_health_workouts" ON public.health_workouts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_workouts_user_date ON public.health_workouts (user_id, workout_date);

CREATE TABLE IF NOT EXISTS public.health_sleep (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_hours NUMERIC(4,2) NOT NULL DEFAULT 7.5,
  quality INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);

ALTER TABLE public.health_sleep ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_health_sleep" ON public.health_sleep;
CREATE POLICY "own_health_sleep" ON public.health_sleep
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_health_sleep_user_date ON public.health_sleep (user_id, sleep_date);

-- 7. ZENITH DAILY LOGS
CREATE TABLE IF NOT EXISTS public.zenith_daily_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  brain_dump TEXT,
  energy_level INT,
  stress_level INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

ALTER TABLE public.zenith_daily_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_zenith_daily_logs" ON public.zenith_daily_logs;
CREATE POLICY "own_zenith_daily_logs" ON public.zenith_daily_logs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_zenith_logs_user_date ON public.zenith_daily_logs (user_id, log_date);

-- 8. ANALYTICS & BETA ONBOARDING
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_analytics_events" ON public.analytics_events;
CREATE POLICY "own_analytics_events" ON public.analytics_events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.beta_onboarding (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  first_login_at TIMESTAMPTZ,
  first_habit_created_at TIMESTAMPTZ,
  first_habit_completed_at TIMESTAMPTZ,
  first_reflection_at TIMESTAMPTZ,
  first_dex_chat_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.beta_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_beta_onboarding" ON public.beta_onboarding;
CREATE POLICY "own_beta_onboarding" ON public.beta_onboarding
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 9. PERMISSIONS & SCHEMA CACHE RELOAD
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
