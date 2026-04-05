-- Run this in your Supabase SQL Editor to enable 21-Day Challenge Mode

CREATE TABLE IF NOT EXISTS challenges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 21,
  habit_ids UUID[] NOT NULL DEFAULT '{}',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'completed' | 'failed'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see/edit their own challenges
CREATE POLICY "Users manage own challenges" ON challenges
  FOR ALL USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS challenges_user_id_idx ON challenges(user_id);
