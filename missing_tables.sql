-- =============================================
-- MISSING TABLES — Run this in Supabase SQL Editor
-- These tables are used by the app but were not
-- in the original schema. Run ALL of this at once.
-- =============================================

-- 1. DAILY TASKS (Study > Tasks tab)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  priority TEXT DEFAULT 'medium',  -- 'high', 'medium', 'low'
  done BOOLEAN DEFAULT false,
  task_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own daily_tasks" ON daily_tasks;
CREATE POLICY "own daily_tasks" ON daily_tasks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. STUDY NOTES (Study > Notes tab)
CREATE TABLE IF NOT EXISTS study_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  subject TEXT,
  pinned BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#00BCD4',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE study_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own study_notes" ON study_notes;
CREATE POLICY "own study_notes" ON study_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. STUDY GOALS (Study > Pomodoro weekly/monthly targets)
CREATE TABLE IF NOT EXISTS study_goals (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  weekly_target_hours DECIMAL(5,1) DEFAULT 15,
  monthly_target_hours DECIMAL(5,1) DEFAULT 60,
  daily_target_hours DECIMAL(4,1) DEFAULT 2,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own study_goals" ON study_goals;
CREATE POLICY "own study_goals" ON study_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. FIX: study_sessions column mismatch
-- The app inserts 'duration_minutes' but the schema has 'duration_mins'
-- Add the missing column alias so both work:
ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS duration_minutes INT;
-- Copy existing data across columns
UPDATE study_sessions SET duration_minutes = duration_mins WHERE duration_minutes IS NULL AND duration_mins IS NOT NULL;
-- Add a trigger to keep them in sync going forward (optional safety net):
CREATE OR REPLACE FUNCTION sync_study_session_duration() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.duration_minutes IS NOT NULL AND NEW.duration_mins IS NULL THEN
    NEW.duration_mins := NEW.duration_minutes;
  ELSIF NEW.duration_mins IS NOT NULL AND NEW.duration_minutes IS NULL THEN
    NEW.duration_minutes := NEW.duration_mins;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS sync_duration ON study_sessions;
CREATE TRIGGER sync_duration BEFORE INSERT OR UPDATE ON study_sessions
  FOR EACH ROW EXECUTE FUNCTION sync_study_session_duration();

-- 5. GLOBAL ORBITS (Community > Orbits tab — group spaces)
CREATE TABLE IF NOT EXISTS global_orbits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '🌌',
  color TEXT DEFAULT '#00FFFF',
  creator_id UUID REFERENCES auth.users NOT NULL,
  member_count INT DEFAULT 1,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE global_orbits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view orbits" ON global_orbits;
CREATE POLICY "view orbits" ON global_orbits FOR SELECT USING (true);
DROP POLICY IF EXISTS "own orbits" ON global_orbits;
CREATE POLICY "own orbits" ON global_orbits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "update own orbits" ON global_orbits FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id);

-- 6. ORBIT MEMBERS (who joined which orbit)
CREATE TABLE IF NOT EXISTS orbit_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orbit_id UUID REFERENCES global_orbits ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  role TEXT DEFAULT 'member',  -- 'creator', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(orbit_id, user_id)
);
ALTER TABLE orbit_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view orbit_members" ON orbit_members;
CREATE POLICY "view orbit_members" ON orbit_members FOR SELECT USING (true);
DROP POLICY IF EXISTS "own orbit_members" ON orbit_members;
CREATE POLICY "own orbit_members" ON orbit_members FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. ORBIT MESSAGES (chat inside an orbit)
CREATE TABLE IF NOT EXISTS orbit_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orbit_id UUID REFERENCES global_orbits ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orbit_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view orbit_messages" ON orbit_messages;
CREATE POLICY "view orbit_messages" ON orbit_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS "own orbit_messages" ON orbit_messages;
CREATE POLICY "own orbit_messages" ON orbit_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 8. ORBIT REQUESTS (join requests for private orbits)
CREATE TABLE IF NOT EXISTS orbit_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  orbit_id UUID REFERENCES global_orbits ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'accepted', 'rejected'
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(orbit_id, user_id)
);
ALTER TABLE orbit_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own orbit_requests" ON orbit_requests;
CREATE POLICY "own orbit_requests" ON orbit_requests FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. LEADERBOARD CACHE — RLS policy (table exists but needs policy)
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "view leaderboard" ON leaderboard_cache;
CREATE POLICY "view leaderboard" ON leaderboard_cache FOR SELECT USING (true);
DROP POLICY IF EXISTS "own leaderboard" ON leaderboard_cache;
CREATE POLICY "own leaderboard" ON leaderboard_cache FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. PROFILES — ensure avatar_url column exists (used by Profile.jsx upload)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- =============================================
-- DONE! All missing tables + fixes applied.
-- =============================================
