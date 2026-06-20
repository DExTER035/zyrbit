-- =============================================
-- SCREEN TIME LOGS TABLE
-- Run this in your Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS screen_time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  log_date DATE NOT NULL,
  screen_minutes INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, log_date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE screen_time_logs ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to perform all operations on their own log rows
DROP POLICY IF EXISTS "own_screen_time_logs" ON screen_time_logs;
CREATE POLICY "own_screen_time_logs" ON screen_time_logs 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
