-- ====================================================================
-- ZYRBIT DEXOS v1 - CONSOLIDATED DATABASE SCHEMA
-- This file contains all core tables, RLS policies, indexes, and triggers.
-- Run this in the Supabase SQL Editor.
-- ====================================================================

-- ────────────────────────────────────────────────────────────────────
--  1. SYSTEM & CORE TABLES
-- ────────────────────────────────────────────────────────────────────

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  archetype TEXT DEFAULT 'builder', -- founder | student | engineer | creative
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DEXOS DAILY SUMMARY
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

-- DEXOS STREAKS
CREATE TABLE IF NOT EXISTS dexos_streaks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  freeze_used_this_week BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- UNIFIED TIMELINE EVENTS
CREATE TABLE IF NOT EXISTS timeline_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event_date DATE NOT NULL,
  pillar TEXT NOT NULL,          -- zenith | growth | health | wealth
  event_type TEXT NOT NULL,      -- sleep | water | task | expense | income | workout | focus
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
--  2. GROWTH PILLAR TABLES
-- ────────────────────────────────────────────────────────────────────

-- PROJECTS
CREATE TABLE IF NOT EXISTS growth_projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '📁',
  deadline DATE,
  status TEXT DEFAULT 'active', -- active | completed | archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TASKS
CREATE TABLE IF NOT EXISTS growth_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES growth_projects ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  priority INT DEFAULT 3, -- 1=critical, 2=high, 3=normal
  status TEXT DEFAULT 'todo', -- todo | done
  due_date DATE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPRINTS
CREATE TABLE IF NOT EXISTS growth_sprints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  daily_focus_minutes INT DEFAULT 90,
  status TEXT DEFAULT 'active', -- active | completed
  focus_logged_minutes INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPRINT PROJECTS
CREATE TABLE IF NOT EXISTS growth_sprint_projects (
  sprint_id UUID REFERENCES growth_sprints ON DELETE CASCADE,
  project_id UUID REFERENCES growth_projects ON DELETE CASCADE,
  PRIMARY KEY (sprint_id, project_id)
);

-- SKILLS
CREATE TABLE IF NOT EXISTS growth_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '⚡',
  category TEXT DEFAULT 'technical', -- technical | academic | creative | professional
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FOCUS SESSIONS
CREATE TABLE IF NOT EXISTS growth_focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES growth_projects ON DELETE SET NULL,
  skill_id UUID REFERENCES growth_skills ON DELETE SET NULL,
  duration_minutes INT NOT NULL,
  notes TEXT,
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
--  3. HEALTH PILLAR TABLES
-- ────────────────────────────────────────────────────────────────────

-- SLEEP LOGS
CREATE TABLE IF NOT EXISTS health_sleep_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  sleep_date DATE NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  quality INT DEFAULT 3, -- 1-5 scale
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, sleep_date)
);

-- WATER LOGS
CREATE TABLE IF NOT EXISTS health_water_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  amount_ml INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MEAL LOGS (Food)
CREATE TABLE IF NOT EXISTS health_food_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  food_name TEXT NOT NULL,
  protein INT DEFAULT 0,
  quality TEXT NOT NULL DEFAULT 'neutral', -- clean | neutral | processed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOVEMENT LOGS
CREATE TABLE IF NOT EXISTS health_move_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  activity_type TEXT NOT NULL, -- strength | cardio | mobility | walk
  active_minutes INT NOT NULL DEFAULT 45,
  rpe INT NOT NULL DEFAULT 5, -- rate of perceived exertion 1-10
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WEIGHT LOGS
CREATE TABLE IF NOT EXISTS health_weight_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  log_date DATE NOT NULL,
  weight NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- ────────────────────────────────────────────────────────────────────
--  4. WEALTH PILLAR TABLES
-- ────────────────────────────────────────────────────────────────────

-- WEALTH SETTINGS
CREATE TABLE IF NOT EXISTS wealth_settings (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'INR',
  monthly_budget NUMERIC(12,2) NOT NULL DEFAULT 15000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES
CREATE TABLE IF NOT EXISTS wealth_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  category TEXT NOT NULL, -- food | bills | tools | leisure | other
  note TEXT NOT NULL,
  expense_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INCOME
CREATE TABLE IF NOT EXISTS wealth_income (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  source TEXT NOT NULL, -- salary | freelance | side_income | one_time
  note TEXT,
  income_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BILLS
CREATE TABLE IF NOT EXISTS wealth_bills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  due_date DATE NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- monthly | annual
  status TEXT NOT NULL DEFAULT 'unpaid', -- unpaid | paid
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VAULT (Credentials)
CREATE TABLE IF NOT EXISTS wealth_vault (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  encrypted_payload TEXT NOT NULL, -- AES encrypted string
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
--  5. UNIFIED SHARED GOALS
-- ────────────────────────────────────────────────────────────────────

-- DEXOS GOALS
CREATE TABLE IF NOT EXISTS dexos_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  pillar TEXT NOT NULL, -- growth | health | wealth | routine
  target_value NUMERIC(12,2) NOT NULL DEFAULT 1.00,
  current_value NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  unit TEXT DEFAULT 'done',
  deadline DATE,
  is_complete BOOLEAN DEFAULT FALSE,
  project_id UUID REFERENCES growth_projects ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
--  6. INDEXES FOR PERFORMANCE
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ds_query ON dexos_daily_summary (user_id, log_date DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_events_query ON timeline_events (user_id, event_date DESC, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_proj ON growth_tasks (project_id, status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_date ON growth_focus_sessions (user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_goals_pil ON dexos_goals (user_id, pillar, is_complete);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON wealth_expenses (user_id, expense_date DESC);

-- ────────────────────────────────────────────────────────────────────
--  7. ROW LEVEL SECURITY (RLS) POLICIES
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dexos_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE dexos_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_sprint_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_sleep_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_move_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_weight_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE wealth_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE dexos_goals ENABLE ROW LEVEL SECURITY;

-- Owner Access Policies
CREATE POLICY "own_profiles" ON profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own_summary" ON dexos_daily_summary FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_streaks" ON dexos_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_timeline" ON timeline_events FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_projects" ON growth_projects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_tasks" ON growth_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_sprints" ON growth_sprints FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_skills" ON growth_skills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_focus" ON growth_focus_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_sleep" ON health_sleep_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_water" ON health_water_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_food" ON health_food_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_move" ON health_move_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_weight" ON health_weight_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_settings" ON wealth_settings FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own_expenses" ON wealth_expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_income" ON wealth_income FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_bills" ON wealth_bills FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_vault" ON wealth_vault FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_goals" ON dexos_goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own_sprint_projects" ON growth_sprint_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM growth_sprints s WHERE s.id = sprint_id AND s.user_id = auth.uid()));

-- ────────────────────────────────────────────────────────────────────
--  8. AUTOMATION DB TRIGGERS (PL/pgSQL)
-- ────────────────────────────────────────────────────────────────────

-- TRIGGER: Auto-Update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql as $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

CREATE TRIGGER trg_projects_update BEFORE UPDATE ON growth_projects FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER trg_tasks_update BEFORE UPDATE ON growth_tasks FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER trg_goals_update BEFORE UPDATE ON dexos_goals FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- TRIGGER: Goal Auto-Complete status
CREATE OR REPLACE FUNCTION check_goal_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_value >= NEW.target_value THEN
    NEW.is_complete := TRUE;
  ELSE
    NEW.is_complete := FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_goal_status_check
  BEFORE INSERT OR UPDATE ON dexos_goals
  FOR EACH ROW EXECUTE PROCEDURE check_goal_status();

-- TRIGGER: Daily Water Sync
CREATE OR REPLACE FUNCTION sync_daily_water()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dexos_daily_summary (user_id, log_date, water_ml)
  VALUES (NEW.user_id, NEW.log_date, NEW.amount_ml)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET water_ml = dexos_daily_summary.water_ml + NEW.amount_ml;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_water AFTER INSERT ON health_water_logs
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_water();

-- TRIGGER: Daily Protein Sync
CREATE OR REPLACE FUNCTION sync_daily_protein()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dexos_daily_summary (user_id, log_date, protein_g)
  VALUES (NEW.user_id, NEW.log_date, NEW.protein)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET protein_g = dexos_daily_summary.protein_g + NEW.protein;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_protein AFTER INSERT ON health_food_logs
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_protein();

-- TRIGGER: Daily Movement Sync
CREATE OR REPLACE FUNCTION sync_daily_movement()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dexos_daily_summary (user_id, log_date, active_minutes)
  VALUES (NEW.user_id, NEW.log_date, NEW.active_minutes)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET active_minutes = dexos_daily_summary.active_minutes + NEW.active_minutes;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_movement AFTER INSERT ON health_move_logs
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_movement();

-- TRIGGER: Daily Focus & Sprint Sync
CREATE OR REPLACE FUNCTION sync_daily_focus()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  s growth_sprints%ROWTYPE;
BEGIN
  INSERT INTO dexos_daily_summary (user_id, log_date, focus_minutes)
  VALUES (NEW.user_id, NEW.session_date, NEW.duration_minutes)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET focus_minutes = dexos_daily_summary.focus_minutes + NEW.duration_minutes;

  SELECT * INTO s FROM growth_sprints
  WHERE user_id = NEW.user_id AND status = 'active'
    AND start_date <= NEW.session_date AND end_date >= NEW.session_date
  LIMIT 1;
  IF FOUND THEN
    UPDATE growth_sprints SET focus_logged_minutes = focus_logged_minutes + NEW.duration_minutes
    WHERE id = s.id;
  END IF;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_focus AFTER INSERT ON growth_focus_sessions
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_focus();

-- TRIGGER: Daily Tasks Complete Sync
CREATE OR REPLACE FUNCTION sync_daily_tasks()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    INSERT INTO dexos_daily_summary (user_id, log_date, tasks_completed)
    VALUES (NEW.user_id, CURRENT_DATE, 1)
    ON CONFLICT (user_id, log_date)
    DO UPDATE SET tasks_completed = dexos_daily_summary.tasks_completed + 1;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_tasks AFTER UPDATE ON growth_tasks
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_tasks();

-- TRIGGER: Daily Expenses Sync
CREATE OR REPLACE FUNCTION sync_daily_expenses()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO dexos_daily_summary (user_id, log_date, spent_amount)
  VALUES (NEW.user_id, NEW.expense_date, NEW.amount)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET spent_amount = dexos_daily_summary.spent_amount + NEW.amount;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_sync_expenses AFTER INSERT ON wealth_expenses
  FOR EACH ROW EXECUTE PROCEDURE sync_daily_expenses();

-- TRIGGER: Sleep Log Debt & Recovery Score Calculator
CREATE OR REPLACE FUNCTION update_daily_sleep_and_recovery()
RETURNS TRIGGER AS $$
DECLARE
  v_target_sleep NUMERIC(4,2) := 8.00;
  v_sleep_debt NUMERIC(4,2) := 0.00;
  v_rec_score INT := 100;
  v_water_total INT := 0;
  v_water_target INT := 3000;
  v_hydration_ratio NUMERIC(4,2) := 1.00;
BEGIN
  SELECT COALESCE(SUM(v_target_sleep - duration_hours), 0.00)
  INTO v_sleep_debt
  FROM health_sleep_logs
  WHERE user_id = NEW.user_id
    AND sleep_date >= (NEW.sleep_date - INTERVAL '6 days')
    AND sleep_date <= NEW.sleep_date;

  SELECT COALESCE(water_ml, 0)
  INTO v_water_total
  FROM dexos_daily_summary
  WHERE user_id = NEW.user_id AND log_date = NEW.sleep_date;

  v_hydration_ratio := LEAST(1.00, v_water_total::numeric / v_water_target);
  v_rec_score := LEAST(100, GREATEST(0, ROUND(
    (100 - (v_sleep_debt * 12)) * 0.50 +
    (NEW.quality * 20) * 0.30 +
    (v_hydration_ratio * 100) * 0.20
  )));

  INSERT INTO dexos_daily_summary (user_id, log_date, sleep_hours, sleep_debt_hours, recovery_score)
  VALUES (NEW.user_id, NEW.sleep_date, NEW.duration_hours, v_sleep_debt, v_rec_score)
  ON CONFLICT (user_id, log_date)
  DO UPDATE SET 
    sleep_hours = EXCLUDED.sleep_hours,
    sleep_debt_hours = EXCLUDED.sleep_debt_hours,
    recovery_score = EXCLUDED.recovery_score;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sleep_update
  AFTER INSERT OR UPDATE ON health_sleep_logs
  FOR EACH ROW EXECUTE PROCEDURE update_daily_sleep_and_recovery();

-- ────────────────────────────────────────────────────────────────────
--  9. UNIFIED TIMELINE AUTO-LOGGING TRIGGERS
-- ────────────────────────────────────────────────────────────────────

-- HELPER: Log event to timeline table
CREATE OR REPLACE FUNCTION log_timeline_event(
  p_user_id UUID,
  p_pillar TEXT,
  p_type TEXT,
  p_message TEXT,
  p_metadata JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO timeline_events (user_id, event_date, pillar, event_type, message, metadata)
  VALUES (p_user_id, CURRENT_DATE, p_pillar, p_type, p_message, p_metadata);
END;
$$ LANGUAGE plpgsql;

-- Sleep Timeline
CREATE OR REPLACE FUNCTION trg_log_sleep_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'health',
    'sleep',
    'Logged ' || NEW.duration_hours || 'h sleep (Quality: ' || NEW.quality || '/5)',
    jsonb_build_object('sleep_log_id', NEW.id, 'duration_hours', NEW.duration_hours)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sleep_timeline AFTER INSERT ON health_sleep_logs FOR EACH ROW EXECUTE PROCEDURE trg_log_sleep_event();

-- Water Timeline
CREATE OR REPLACE FUNCTION trg_log_water_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'health',
    'water',
    'Hydrated: +' || NEW.amount_ml || 'ml water',
    jsonb_build_object('water_log_id', NEW.id, 'amount_ml', NEW.amount_ml)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_water_timeline AFTER INSERT ON health_water_logs FOR EACH ROW EXECUTE PROCEDURE trg_log_water_event();

-- Food Timeline
CREATE OR REPLACE FUNCTION trg_log_food_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'health',
    'food',
    'Logged meal: ' || NEW.food_name || ' (' || NEW.protein || 'g protein, ' || NEW.quality || ')',
    jsonb_build_object('food_log_id', NEW.id, 'protein', NEW.protein, 'quality', NEW.quality)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_food_timeline AFTER INSERT ON health_food_logs FOR EACH ROW EXECUTE PROCEDURE trg_log_food_event();

-- Movement Timeline
CREATE OR REPLACE FUNCTION trg_log_move_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'health',
    'workout',
    'Completed ' || NEW.active_minutes || 'm ' || NEW.activity_type || ' session (RPE: ' || NEW.rpe || '/10)',
    jsonb_build_object('move_log_id', NEW.id, 'active_minutes', NEW.active_minutes)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_move_timeline AFTER INSERT ON health_move_logs FOR EACH ROW EXECUTE PROCEDURE trg_log_move_event();

-- Focus Session Timeline
CREATE OR REPLACE FUNCTION trg_log_focus_event()
RETURNS TRIGGER AS $$
DECLARE
  v_proj_name TEXT := 'General';
BEGIN
  IF NEW.project_id IS NOT NULL THEN
    SELECT name INTO v_proj_name FROM growth_projects WHERE id = NEW.project_id;
  END IF;
  
  PERFORM log_timeline_event(
    NEW.user_id,
    'growth',
    'focus',
    'Focused ' || NEW.duration_minutes || 'm on ' || v_proj_name,
    jsonb_build_object('focus_session_id', NEW.id, 'project_id', NEW.project_id, 'duration_minutes', NEW.duration_minutes)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_focus_timeline AFTER INSERT ON growth_focus_sessions FOR EACH ROW EXECUTE PROCEDURE trg_log_focus_event();

-- Tasks Completed Timeline
CREATE OR REPLACE FUNCTION trg_log_task_event()
RETURNS TRIGGER AS $$
DECLARE
  v_proj_name TEXT := 'Project';
BEGIN
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    SELECT name INTO v_proj_name FROM growth_projects WHERE id = NEW.project_id;
    PERFORM log_timeline_event(
      NEW.user_id,
      'growth',
      'task',
      '✔ ' || NEW.name || ' (📁 ' || v_proj_name || ')',
      jsonb_build_object('task_id', NEW.id, 'project_id', NEW.project_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_timeline AFTER UPDATE ON growth_tasks FOR EACH ROW EXECUTE PROCEDURE trg_log_task_event();

-- Wealth Expenses Timeline
CREATE OR REPLACE FUNCTION trg_log_expense_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'wealth',
    'expense',
    'Logged expense: ₹' || NEW.amount || ' (' || NEW.category || ' · ' || NEW.note || ')',
    jsonb_build_object('expense_id', NEW.id, 'amount', NEW.amount, 'category', NEW.category)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expense_timeline AFTER INSERT ON wealth_expenses FOR EACH ROW EXECUTE PROCEDURE trg_log_expense_event();

-- Wealth Income Timeline
CREATE OR REPLACE FUNCTION trg_log_income_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_timeline_event(
    NEW.user_id,
    'wealth',
    'income',
    'Logged income: +₹' || NEW.amount || ' (' || NEW.source || ' · ' || NEW.note || ')',
    jsonb_build_object('income_id', NEW.id, 'amount', NEW.amount, 'source', NEW.source)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_income_timeline AFTER INSERT ON wealth_income FOR EACH ROW EXECUTE PROCEDURE trg_log_income_event();
