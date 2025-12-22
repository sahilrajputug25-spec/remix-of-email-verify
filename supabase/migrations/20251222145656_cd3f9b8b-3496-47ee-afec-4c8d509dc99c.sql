-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create email_validations table
CREATE TABLE public.email_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  syntax_valid BOOLEAN DEFAULT false,
  domain_exists BOOLEAN DEFAULT false,
  mx_records BOOLEAN DEFAULT false,
  is_disposable BOOLEAN DEFAULT false,
  is_role_based BOOLEAN DEFAULT false,
  is_catch_all BOOLEAN DEFAULT false,
  domain TEXT,
  status TEXT NOT NULL CHECK (status IN ('valid', 'invalid', 'risky')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on email_validations
ALTER TABLE public.email_validations ENABLE ROW LEVEL SECURITY;

-- Email validations policies
CREATE POLICY "Users can view their own validations"
ON public.email_validations FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own validations"
ON public.email_validations FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own validations"
ON public.email_validations FOR DELETE
USING (auth.uid() = user_id);

-- Create bulk_uploads table
CREATE TABLE public.bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  total_emails INTEGER DEFAULT 0,
  valid_count INTEGER DEFAULT 0,
  invalid_count INTEGER DEFAULT 0,
  risky_count INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on bulk_uploads
ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

-- Bulk uploads policies
CREATE POLICY "Users can view their own bulk uploads"
ON public.bulk_uploads FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bulk uploads"
ON public.bulk_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bulk uploads"
ON public.bulk_uploads FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bulk uploads"
ON public.bulk_uploads FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_email_validations_user_id ON public.email_validations(user_id);
CREATE INDEX idx_email_validations_created_at ON public.email_validations(created_at DESC);
CREATE INDEX idx_bulk_uploads_user_id ON public.bulk_uploads(user_id);
CREATE INDEX idx_bulk_uploads_created_at ON public.bulk_uploads(created_at DESC);