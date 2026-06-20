-- =============================================
-- SYSTEM GOALS & TARGETS TABLE
-- Run this in your Supabase SQL Editor
-- =============================================

CREATE TABLE IF NOT EXISTS system_goals (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  cgpa_current DECIMAL(4,2) DEFAULT 0.00,
  cgpa_target DECIMAL(4,2) DEFAULT 0.00,
  weight_current DECIMAL(5,2) DEFAULT 0.00,
  weight_target DECIMAL(5,2) DEFAULT 0.00,
  gold_current DECIMAL(6,2) DEFAULT 0.00,
  gold_target DECIMAL(6,2) DEFAULT 0.00,
  side_income_current DECIMAL(12,2) DEFAULT 0.00,
  side_income_target DECIMAL(12,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE system_goals ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to perform all operations on their own goal row
DROP POLICY IF EXISTS "own_system_goals" ON system_goals;
CREATE POLICY "own_system_goals" ON system_goals 
  FOR ALL TO authenticated 
  USING (auth.uid() = user_id) 
  WITH CHECK (auth.uid() = user_id);
