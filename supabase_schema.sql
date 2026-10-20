-- ==============================================================================
-- SUPABASE DATABASE SCHEMA MIGRATION: MULTI-USER ADMIN PANEL & BRANDING
-- Run this in the Supabase SQL Editor: https://xkpdusmqfprmhkzchwgp.supabase.co
-- ==============================================================================

-- 1. PROFILES TABLE (Linked with Supabase Auth or internal user ID)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  mobile_number TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast user searching
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles (mobile_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 2. USER FEATURE PERMISSIONS TABLE (Independent ON/OFF toggles per user)
CREATE TABLE IF NOT EXISTS public.user_feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_user_feature UNIQUE (user_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_user_perms_user_id ON public.user_feature_permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_perms_feature ON public.user_feature_permissions (feature_key);

-- 3. SITE SETTINGS TABLE (Global branding & website configuration)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global_config',
  business_name TEXT NOT NULL DEFAULT 'OTT SELLERS',
  subtitle TEXT NOT NULL DEFAULT 'Management System',
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  accent_color TEXT NOT NULL DEFAULT '#0284c7',
  header_bg TEXT NOT NULL DEFAULT '#0f172a',
  headings_text TEXT NOT NULL DEFAULT 'Multi-Brand OTT Subscriptions',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Insert initial default site settings if not present
INSERT INTO public.site_settings (id, business_name, subtitle, primary_color, accent_color, header_bg, headings_text)
VALUES ('global_config', 'OTT SELLERS', 'Management System', '#2563eb', '#0284c7', '#0f172a', 'Multi-Brand OTT Subscriptions')
ON CONFLICT (id) DO NOTHING;

-- Insert initial super admin profile if not present
INSERT INTO public.profiles (id, full_name, mobile_number, email, role, account_status)
VALUES ('admin_1', 'Super Admin', '9876543210', 'Fixyourmobiles10@gmail.com', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & anon clients
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Update Profiles" ON public.profiles FOR UPDATE USING (true);

CREATE POLICY "Public Read Feature Permissions" ON public.user_feature_permissions FOR SELECT USING (true);
CREATE POLICY "Allow Insert Permissions" ON public.user_feature_permissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow Update Permissions" ON public.user_feature_permissions FOR UPDATE USING (true);

CREATE POLICY "Public Read Site Settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow Update Site Settings" ON public.site_settings FOR ALL USING (true);
