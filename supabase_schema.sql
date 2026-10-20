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

-- ==============================================================================
-- 4. BRANDS TABLE (Workspace scoped by owner_email / owner_user_id)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.brands (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563eb',
  bg_dark TEXT NOT NULL DEFAULT '#0f172a',
  badge_color TEXT NOT NULL DEFAULT '#2563eb',
  screens_count INT NOT NULL DEFAULT 5,
  plans JSONB NOT NULL DEFAULT '["01 Month", "03 Months", "06 Months", "12 Months"]'::jsonb,
  prices JSONB NOT NULL DEFAULT '{"01 Month": 199, "03 Months": 499, "06 Months": 899, "12 Months": 1599}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_brands_owner ON public.brands (owner_email);

-- ==============================================================================
-- 5. ACCOUNTS (INVENTORY) TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  record_number TEXT NOT NULL DEFAULT '01',
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  validity TEXT NOT NULL DEFAULT '01 Month',
  plan_variant TEXT NOT NULL DEFAULT 'General',
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts (owner_email);
CREATE INDEX IF NOT EXISTS idx_accounts_brand ON public.accounts (brand_id);

-- ==============================================================================
-- 6. SCREENS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  screen_number INT NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '1234',
  device_type TEXT NOT NULL DEFAULT 'tv',
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied')),
  sale_id TEXT,
  expiry_date TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_account_screen UNIQUE (account_id, screen_number)
);

CREATE INDEX IF NOT EXISTS idx_screens_account ON public.screens (account_id);

-- ==============================================================================
-- 7. SELLER DETAILS TABLE (Image Copy 127 Requirement: Attached to exact account)
-- Note: Raw CVV is NOT stored to ensure security compliance
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE UNIQUE,
  owner_user_id TEXT,
  owner_email TEXT NOT NULL,
  purchase_date TEXT,
  seller_name TEXT,
  seller_number TEXT,
  reference_date TEXT,
  reference TEXT,
  link TEXT,
  card_reference TEXT,
  expiry TEXT,
  amount NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_seller_details_account ON public.seller_details (account_id);
CREATE INDEX IF NOT EXISTS idx_seller_details_owner ON public.seller_details (owner_email);

-- ==============================================================================
-- 8. SALES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  seller_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  brand_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  inventory_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
  record_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  reference_name TEXT,
  reference_number TEXT,
  account_email TEXT,
  account_password TEXT,
  validity TEXT NOT NULL DEFAULT '01 Month',
  pricing_plan TEXT NOT NULL DEFAULT 'General',
  screen_number TEXT NOT NULL DEFAULT '01',
  screen_pin TEXT NOT NULL DEFAULT '1234',
  device_name TEXT,
  activation_date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 199,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_owner ON public.sales (owner_email);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON public.sales (seller_email);
CREATE INDEX IF NOT EXISTS idx_sales_brand ON public.sales (brand_id);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) FOR MULTI-USER DATA ISOLATION
-- ==============================================================================
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Helper check function for admin privileges
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE (id = auth.uid()::text OR email = auth.jwt() ->> 'email')
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Brands RLS
CREATE POLICY "Brands User Isolation - SELECT" ON public.brands
  FOR SELECT USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Brands User Isolation - INSERT" ON public.brands
  FOR INSERT WITH CHECK (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Brands User Isolation - UPDATE" ON public.brands
  FOR UPDATE USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Brands User Isolation - DELETE" ON public.brands
  FOR DELETE USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

-- Accounts RLS
CREATE POLICY "Accounts User Isolation - SELECT" ON public.accounts
  FOR SELECT USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Accounts User Isolation - INSERT" ON public.accounts
  FOR INSERT WITH CHECK (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Accounts User Isolation - UPDATE" ON public.accounts
  FOR UPDATE USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Accounts User Isolation - DELETE" ON public.accounts
  FOR DELETE USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

-- Screens RLS (Inherited via parent account ownership)
CREATE POLICY "Screens Isolation - ALL" ON public.screens
  FOR ALL USING (
    is_admin() OR EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = screens.account_id
        AND (a.owner_email = (auth.jwt() ->> 'email') OR a.owner_user_id = auth.uid()::text)
    )
  );

-- Seller Details RLS (Inherited via parent account ownership)
CREATE POLICY "Seller Details Isolation - ALL" ON public.seller_details
  FOR ALL USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = seller_details.account_id
        AND (a.owner_email = (auth.jwt() ->> 'email') OR a.owner_user_id = auth.uid()::text)
    )
  );

-- Sales RLS
CREATE POLICY "Sales User Isolation - SELECT" ON public.sales
  FOR SELECT USING (
    is_admin() OR
    seller_email = (auth.jwt() ->> 'email') OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Sales User Isolation - INSERT" ON public.sales
  FOR INSERT WITH CHECK (
    is_admin() OR
    seller_email = (auth.jwt() ->> 'email') OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Sales User Isolation - UPDATE" ON public.sales
  FOR UPDATE USING (
    is_admin() OR
    seller_email = (auth.jwt() ->> 'email') OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

CREATE POLICY "Sales User Isolation - DELETE" ON public.sales
  FOR DELETE USING (
    is_admin() OR
    seller_email = (auth.jwt() ->> 'email') OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );

