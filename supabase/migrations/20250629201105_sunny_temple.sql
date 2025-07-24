/*
  # Create souls table for SoulCast feature

  1. New Tables
    - `souls`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, required)
      - `relationship` (text, required)
      - `traits` (text, required)
      - `photo_url` (text, optional)
      - `voice_id` (text, optional)
      - `replica_id` (text, optional)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `souls` table
    - Add policies for authenticated users to manage their own souls
*/

CREATE TABLE IF NOT EXISTS public.souls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  relationship text NOT NULL,
  traits text NOT NULL,
  photo_url text,
  voice_id text,
  replica_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.souls ENABLE ROW LEVEL SECURITY;

-- Create policies for souls table
CREATE POLICY "Users can view their own souls"
  ON public.souls
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own souls"
  ON public.souls
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own souls"
  ON public.souls
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own souls"
  ON public.souls
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS souls_user_id_idx ON public.souls(user_id);
CREATE INDEX IF NOT EXISTS souls_created_at_idx ON public.souls(created_at DESC);