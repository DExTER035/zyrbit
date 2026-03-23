-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT,
  friend_tag TEXT UNIQUE NOT NULL,
  avatar_color TEXT DEFAULT '#9C27B0',
  rank_id INT DEFAULT 0,
  zyrons INT DEFAULT 0,
  gravity_score INT DEFAULT 0,
  country TEXT DEFAULT 'Unknown',
  city TEXT DEFAULT 'Unknown',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HABITS
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT,
  frequency TEXT DEFAULT 'daily',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ACTIVITY LOG
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  habit_id UUID REFERENCES habits NOT NULL,
  completed_date DATE NOT NULL,
  status TEXT DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- USER STREAKS
CREATE TABLE IF NOT EXISTS user_streaks (
  habit_id UUID REFERENCES habits PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_completed_date DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ZYRON WALLET
CREATE TABLE IF NOT EXISTS zyron_wallet (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  balance INT DEFAULT 0,
  total_earned INT DEFAULT 0,
  rank_id INT DEFAULT 0,
  gravity_score INT DEFAULT 0,
  daily_budget INT DEFAULT 400,
  daily_spent INT DEFAULT 0,
  daily_earned INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  total_spent INT DEFAULT 0,
  lifetime_earned INT DEFAULT 0,
  daily_ai_sessions INT DEFAULT 0,
  ai_session_reset_date DATE DEFAULT CURRENT_DATE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ZYRON TRANSACTIONS
CREATE TABLE IF NOT EXISTS zyron_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount INT NOT NULL,
  reason TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  source TEXT DEFAULT 'app',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORBIT JOURNAL
CREATE TABLE IF NOT EXISTS orbit_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  entry_date DATE NOT NULL,
  mood INT NOT NULL,
  content TEXT,
  completion_rate INT,
  streak_count INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SHOP PURCHASES
CREATE TABLE IF NOT EXISTS shop_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  item_id TEXT NOT NULL,
  cost INT NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDY SUBJECTS
CREATE TABLE IF NOT EXISTS study_subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  total_chapters INT DEFAULT 1,
  done_chapters INT DEFAULT 0,
  color TEXT DEFAULT '#00BCD4',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDY EXAMS
CREATE TABLE IF NOT EXISTS study_exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  subject TEXT NOT NULL,
  type TEXT,
  exam_date DATE NOT NULL,
  prep_percent INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- STUDY SESSIONS
CREATE TABLE IF NOT EXISTS study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  subject_id UUID REFERENCES study_subjects,
  duration_mins INT NOT NULL,
  session_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOVE LOGS
CREATE TABLE IF NOT EXISTS move_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  log_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  distance_km DECIMAL(5,2) DEFAULT 0,
  active_minutes INT DEFAULT 0,
  screenshot_url TEXT,
  notes TEXT,
  zyrons_earned INT DEFAULT 0,
  streak_bonus INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MOVE STREAKS
CREATE TABLE IF NOT EXISTS move_streaks (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_active_date DATE,
  total_km DECIMAL(8,2) DEFAULT 0,
  total_zyrons_earned INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- MONEY SETTINGS
CREATE TABLE IF NOT EXISTS money_settings (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  currency TEXT DEFAULT 'INR',
  currency_symbol TEXT DEFAULT '₹',
  monthly_budget DECIMAL(10,2) DEFAULT 10000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MONEY EXPENSES
CREATE TABLE IF NOT EXISTS money_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  note TEXT,
  expense_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MONEY BUDGETS
CREATE TABLE IF NOT EXISTS money_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  category TEXT NOT NULL,
  monthly_limit DECIMAL(10,2) NOT NULL,
  month_year TEXT NOT NULL,
  UNIQUE(user_id, category, month_year)
);

-- MONEY SAVINGS GOALS
CREATE TABLE IF NOT EXISTS money_savings_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  target_amount DECIMAL(10,2) NOT NULL,
  saved_amount DECIMAL(10,2) DEFAULT 0,
  deadline DATE,
  icon TEXT DEFAULT '🎯',
  color TEXT DEFAULT '#00FFFF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FRIENDSHIPS
CREATE TABLE IF NOT EXISTS friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES auth.users NOT NULL,
  addressee_id UUID REFERENCES auth.users NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- BATTLES
CREATE TABLE IF NOT EXISTS battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID REFERENCES auth.users NOT NULL,
  opponent_id UUID REFERENCES auth.users NOT NULL,
  bet_amount INT NOT NULL,
  status TEXT DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  challenger_score DECIMAL DEFAULT 0,
  opponent_score DECIMAL DEFAULT 0,
  winner_id UUID REFERENCES auth.users,
  challenger_habits_total INT DEFAULT 0,
  challenger_habits_done INT DEFAULT 0,
  challenger_days_active INT DEFAULT 0,
  opponent_habits_total INT DEFAULT 0,
  opponent_habits_done INT DEFAULT 0,
  opponent_days_active INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEADERBOARD CACHE
CREATE TABLE IF NOT EXISTS leaderboard_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  username TEXT,
  friend_tag TEXT,
  rank_id INT,
  zyrons INT,
  gravity_score INT,
  country TEXT,
  city TEXT,
  element_name TEXT,
  weekly_zyrons INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE move_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE money_savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public profiles" ON profiles;
CREATE POLICY "public profiles" ON profiles FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "own profile" ON profiles;
CREATE POLICY "own profile" ON profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DO $$ DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'habits','activity_log','user_streaks',
    'zyron_wallet','zyron_transactions',
    'orbit_journal','shop_purchases',
    'study_subjects','study_exams',
    'study_sessions','move_logs',
    'move_streaks','money_settings',
    'money_expenses','money_budgets',
    'money_savings_goals'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "own_%s" ON %I;', t, t);
    EXECUTE format(
      'CREATE POLICY "own_%s" ON %I
       FOR ALL TO authenticated
       USING (auth.uid() = user_id)
       WITH CHECK (auth.uid() = user_id)',
      t, t
    );
  END LOOP;
END $$;

DROP POLICY IF EXISTS "own friendships" ON friendships;
CREATE POLICY "own friendships" ON friendships FOR ALL TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "own battles" ON battles;
CREATE POLICY "own battles" ON battles FOR ALL TO authenticated USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE OR REPLACE FUNCTION update_habit_streak() RETURNS TRIGGER AS $$
DECLARE last_date DATE; cur INT;
BEGIN
  SELECT last_completed_date, current_streak INTO last_date, cur FROM user_streaks WHERE habit_id = NEW.habit_id;
  IF last_date IS NULL THEN
    INSERT INTO user_streaks(habit_id, user_id, current_streak, longest_streak, last_completed_date) VALUES (NEW.habit_id, NEW.user_id, 1, 1, NEW.completed_date);
  ELSIF last_date = NEW.completed_date - INTERVAL '1 day' THEN
    UPDATE user_streaks SET current_streak = current_streak + 1, longest_streak = GREATEST(longest_streak, current_streak + 1), last_completed_date = NEW.completed_date, updated_at = NOW() WHERE habit_id = NEW.habit_id;
  ELSIF last_date < NEW.completed_date - INTERVAL '1 day' THEN
    UPDATE user_streaks SET current_streak = 1, last_completed_date = NEW.completed_date, updated_at = NOW() WHERE habit_id = NEW.habit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_habit_streak ON activity_log;
CREATE TRIGGER trigger_habit_streak AFTER INSERT ON activity_log FOR EACH ROW EXECUTE FUNCTION update_habit_streak();

CREATE OR REPLACE FUNCTION update_move_streak() RETURNS TRIGGER AS $$
DECLARE last_date DATE; cur INT;
BEGIN
  SELECT last_active_date, current_streak INTO last_date, cur FROM move_streaks WHERE user_id = NEW.user_id;
  IF last_date IS NULL THEN
    INSERT INTO move_streaks(user_id, current_streak, longest_streak, last_active_date, total_km, total_zyrons_earned) VALUES (NEW.user_id, 1, 1, NEW.log_date, NEW.distance_km, NEW.zyrons_earned + NEW.streak_bonus);
  ELSIF last_date = NEW.log_date - INTERVAL '1 day' THEN
    UPDATE move_streaks SET current_streak = current_streak + 1, longest_streak = GREATEST(longest_streak, current_streak + 1), last_active_date = NEW.log_date, total_km = total_km + NEW.distance_km, total_zyrons_earned = total_zyrons_earned + NEW.zyrons_earned + NEW.streak_bonus, updated_at = NOW() WHERE user_id = NEW.user_id;
  ELSIF last_date < NEW.log_date - INTERVAL '1 day' THEN
    UPDATE move_streaks SET current_streak = 1, last_active_date = NEW.log_date, total_km = total_km + NEW.distance_km, total_zyrons_earned = total_zyrons_earned + NEW.zyrons_earned + NEW.streak_bonus, updated_at = NOW() WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_move_streak ON move_logs;
CREATE TRIGGER trigger_move_streak AFTER INSERT ON move_logs FOR EACH ROW EXECUTE FUNCTION update_move_streak();

-- DIARY ENTRIES
CREATE TABLE IF NOT EXISTS diary_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  entry_date DATE NOT NULL,
  title TEXT,
  content TEXT,
  mood INT DEFAULT 2,
  gratitude_1 TEXT,
  gratitude_2 TEXT,
  gratitude_3 TEXT,
  is_locked BOOLEAN DEFAULT false,
  content_encrypted BOOLEAN DEFAULT false,
  word_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entry_date)
);

-- DIARY SETTINGS
CREATE TABLE IF NOT EXISTS diary_settings (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  pin_hash TEXT,
  biometric_enabled BOOLEAN DEFAULT true,
  writing_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_written_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SECRET NOTES
CREATE TABLE IF NOT EXISTS secret_notes (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  encrypted_content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE secret_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own diary entries" ON diary_entries;
CREATE POLICY "own diary entries" ON diary_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own diary settings" ON diary_settings;
CREATE POLICY "own diary settings" ON diary_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own secret notes" ON secret_notes;
CREATE POLICY "own secret notes" ON secret_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
