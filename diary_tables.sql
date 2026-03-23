-- DIARY SETTINGS (PIN hash + streak tracking)
CREATE TABLE IF NOT EXISTS diary_settings (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  pin_hash TEXT NOT NULL,
  writing_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_written_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE diary_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own diary settings"
  ON diary_settings FOR ALL USING (auth.uid() = user_id);

-- DIARY ENTRIES (encrypted content per day)
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

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own diary entries"
  ON diary_entries FOR ALL USING (auth.uid() = user_id);

-- SECRET NOTES (encrypted single note per user)
CREATE TABLE IF NOT EXISTS secret_notes (
  user_id UUID REFERENCES auth.users PRIMARY KEY,
  encrypted_content TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE secret_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own secret notes"
  ON secret_notes FOR ALL USING (auth.uid() = user_id);
