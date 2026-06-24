-- Zyrbit V2 — Phase 11: Schema Alignment
-- Safe execution: CREATE TABLE IF NOT EXISTS

-- 1. GROWTH MODULE
CREATE TABLE IF NOT EXISTS growth_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    project_id UUID REFERENCES growth_projects ON DELETE CASCADE,
    name TEXT NOT NULL,
    priority INTEGER DEFAULT 3,
    due_date DATE,
    status TEXT DEFAULT 'todo',
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE growth_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own growth tasks." ON growth_tasks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    project_id UUID REFERENCES growth_projects ON DELETE SET NULL,
    skill_id UUID REFERENCES growth_skills ON DELETE SET NULL,
    duration_minutes INTEGER NOT NULL,
    session_date DATE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE growth_focus_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own focus sessions." ON growth_focus_sessions FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS growth_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    daily_focus_minutes INTEGER DEFAULT 90,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    focus_logged_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE growth_sprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sprints." ON growth_sprints FOR ALL USING (auth.uid() = user_id);

-- 2. HEALTH MODULE
CREATE TABLE IF NOT EXISTS health_sleep_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    sleep_date DATE NOT NULL,
    duration_hours NUMERIC NOT NULL,
    quality INTEGER DEFAULT 3,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, sleep_date)
);
ALTER TABLE health_sleep_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own sleep logs." ON health_sleep_logs FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS health_water_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    log_date DATE NOT NULL,
    amount_ml INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE health_water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own water logs." ON health_water_logs FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS health_move_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    log_date DATE NOT NULL,
    activity_type TEXT NOT NULL,
    active_minutes INTEGER NOT NULL,
    rpe INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE health_move_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own move logs." ON health_move_logs FOR ALL USING (auth.uid() = user_id);

-- 3. WEALTH MODULE
CREATE TABLE IF NOT EXISTS wealth_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
    monthly_budget NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE wealth_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own wealth settings." ON wealth_settings FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wealth_income (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    source TEXT,
    amount NUMERIC NOT NULL,
    income_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE wealth_income ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own income." ON wealth_income FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS wealth_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users NOT NULL,
    name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    due_date DATE NOT NULL,
    status TEXT DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE wealth_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own bills." ON wealth_bills FOR ALL USING (auth.uid() = user_id);

-- 4. PROFILES EXTENSION
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
