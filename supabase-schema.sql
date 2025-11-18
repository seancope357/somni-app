-- Create user profiles table
CREATE TABLE profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Create dreams table
CREATE TABLE dreams (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  interpretation text,
  sleep_hours float,
  symbols text[], -- Array of symbols
  emotions text[], -- Array of emotions
  themes text[], -- Array of themes
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX dreams_user_id_idx ON dreams(user_id);
CREATE INDEX dreams_created_at_idx ON dreams(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile."
  ON profiles FOR SELECT
  USING (auth.uid() = id );

CREATE POLICY "Users can update own profile."
  ON profiles FOR UPDATE
  USING (auth.uid() = id );

-- Create policies for dreams
CREATE POLICY "Users can view own dreams."
  ON dreams FOR SELECT
  USING (auth.uid() = user_id );

CREATE POLICY "Users can insert own dreams."
  ON dreams FOR INSERT
  WITH CHECK (auth.uid() = user_id );

CREATE POLICY "Users can update own dreams."
  ON dreams FOR UPDATE
  USING (auth.uid() = user_id );

CREATE POLICY "Users can delete own dreams."
  ON dreams FOR DELETE
  USING (auth.uid() = user_id );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update updated_at timestamp
CREATE TRIGGER handle_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();