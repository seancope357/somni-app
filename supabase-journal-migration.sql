-- Create journal_entries table
CREATE TABLE journal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dream_id uuid REFERENCES dreams(id) ON DELETE SET NULL, -- Optional link to a dream
  title text,
  content text NOT NULL,
  tags text[], -- Array of custom tags
  mood_rating integer CHECK (mood_rating >= 1 AND mood_rating <= 5), -- Optional mood rating 1-5
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes
CREATE INDEX journal_entries_user_id_idx ON journal_entries(user_id);
CREATE INDEX journal_entries_dream_id_idx ON journal_entries(dream_id);
CREATE INDEX journal_entries_created_at_idx ON journal_entries(created_at DESC);

-- Enable RLS
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own journal entries."
  ON journal_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own journal entries."
  ON journal_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own journal entries."
  ON journal_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own journal entries."
  ON journal_entries FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger to update updated_at
CREATE TRIGGER handle_journal_entries_updated_at
BEFORE UPDATE ON journal_entries
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Add a column to dreams table to track if it has a journal entry (optional, for quick lookups)
ALTER TABLE dreams 
ADD COLUMN has_journal boolean DEFAULT false;

-- Create index on the new column
CREATE INDEX dreams_has_journal_idx ON dreams(has_journal) WHERE has_journal = true;
