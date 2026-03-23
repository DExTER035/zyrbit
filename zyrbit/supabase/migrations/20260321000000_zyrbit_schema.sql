-- ==========================================
-- 1. CREATE ALL 10 TABLES
-- ==========================================

CREATE TABLE habits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  zone text NOT NULL,
  color text NOT NULL,
  icon text,
  frequency text DEFAULT 'daily',
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  habit_id uuid REFERENCES habits NOT NULL,
  completed_date date NOT NULL,
  status text DEFAULT 'completed',
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE user_streaks (
  habit_id uuid REFERENCES habits PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  current_streak int DEFAULT 0,
  longest_streak int DEFAULT 0,
  last_completed_date date,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zyron_wallet (
  user_id uuid REFERENCES auth.users PRIMARY KEY,
  balance int DEFAULT 0,
  total_earned int DEFAULT 0,
  rank_id text,
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE zyron_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  amount int NOT NULL,
  reason text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE orbit_journal (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  entry_date date NOT NULL,
  mood text,
  content text,
  completion_rate int,
  streak_count int,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE shop_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  item_id text NOT NULL,
  cost int NOT NULL,
  purchased_at timestamp with time zone DEFAULT now()
);

CREATE TABLE study_subjects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  icon text,
  total_chapters int DEFAULT 0,
  done_chapters int DEFAULT 0,
  color text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE study_exams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  subject text NOT NULL,
  type text NOT NULL,
  exam_date date,
  prep_percent int DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE study_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  subject_id uuid REFERENCES study_subjects NOT NULL,
  duration_mins int NOT NULL,
  session_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- ==========================================
-- 2. ENABLE ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE zyron_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE zyron_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orbit_journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. CREATE UNIVERSAL RLS POLICIES
-- ==========================================

CREATE POLICY "user_habits" ON habits FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_activity_log" ON activity_log FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_streaks_auth" ON user_streaks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_zyron_wallet" ON zyron_wallet FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_zyron_transactions" ON zyron_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_orbit_journal" ON orbit_journal FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_shop_purchases" ON shop_purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_study_subjects" ON study_subjects FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_study_exams" ON study_exams FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_study_sessions" ON study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 4. POSTGRESQL STREAK TRIGGER
-- ==========================================

CREATE OR REPLACE FUNCTION update_habit_streak()
RETURNS trigger AS $$
DECLARE
  last_date date;
  current_streak_count int;
BEGIN
  -- We only build streaks when status is strictly 'completed'
  IF NEW.status != 'completed' THEN
    RETURN NEW;
  END IF;

  SELECT last_completed_date, current_streak
  INTO last_date, current_streak_count
  FROM user_streaks
  WHERE user_id = NEW.user_id AND habit_id = NEW.habit_id;

  IF last_date IS NULL THEN
    -- First time completing this habit
    INSERT INTO user_streaks(habit_id, user_id, current_streak, longest_streak, last_completed_date)
    VALUES (NEW.habit_id, NEW.user_id, 1, 1, NEW.completed_date)
    ON CONFLICT (habit_id) DO UPDATE 
    SET current_streak = 1, longest_streak = 1, last_completed_date = NEW.completed_date, updated_at = now();
    
  ELSIF last_date = NEW.completed_date THEN
    -- Same day log; ignore to prevent multi-logging on the same day artificially pumping streaks
    RETURN NEW;
    
  ELSIF last_date = NEW.completed_date - interval '1 day' THEN
    -- Consecutive day: Streak + 1
    UPDATE user_streaks
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        last_completed_date = NEW.completed_date,
        updated_at = now()
    WHERE habit_id = NEW.habit_id;
    
  ELSIF last_date < NEW.completed_date - interval '1 day' THEN
    -- Gap > 1 day: Streak broken, reset to 1
    UPDATE user_streaks
    SET current_streak = 1,
        last_completed_date = NEW.completed_date,
        updated_at = now()
    WHERE habit_id = NEW.habit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_streak
AFTER INSERT ON activity_log
FOR EACH ROW
EXECUTE FUNCTION update_habit_streak();
