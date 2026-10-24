-- ==============================================================================
-- SUPABASE COMPLETE PRODUCTION SCHEMA MIGRATION: ACCOUNT MANAGER
-- Project: OTT Sellers & Account Manager (Murex)
-- Supabase Project URL: https://xkpdusmqfprmhkzchwgp.supabase.co
-- Idempotent script: Safe to execute in Supabase SQL Editor
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. PROFILES TABLE (Multi-User Admin Panel & Users List)
-- ==============================================================================
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

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_mobile ON public.profiles (mobile_number);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- ==============================================================================
-- 2. USER FEATURE PERMISSIONS TABLE (Independent Controls per user)
-- ==============================================================================
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

-- ==============================================================================
-- 3. SITE SETTINGS TABLE (Global branding & website configuration)
-- ==============================================================================
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

INSERT INTO public.site_settings (id, business_name, subtitle, primary_color, accent_color, header_bg, headings_text)
VALUES ('global_config', 'OTT SELLERS', 'Management System', '#2563eb', '#0284c7', '#0f172a', 'Multi-Brand OTT Subscriptions')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, mobile_number, email, role, account_status)
VALUES ('admin_1', 'Super Admin', '9876543210', 'Fixyourmobiles10@gmail.com', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

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
-- 5. ACCOUNTS / INVENTORY TABLE (Multi-Screen Accounts)
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
  password_change_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  is_locked BOOLEAN NOT NULL DEFAULT true,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Idempotent column additions for existing installations
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS screens_count INT NOT NULL DEFAULT 5;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS show_screen_pin BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS show_device_name BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS group_screens_by_5 BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS record_number TEXT NOT NULL DEFAULT '01';
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS plan_variant TEXT NOT NULL DEFAULT 'General';

CREATE INDEX IF NOT EXISTS idx_accounts_owner ON public.accounts (owner_email);
CREATE INDEX IF NOT EXISTS idx_accounts_brand ON public.accounts (brand_id);
CREATE INDEX IF NOT EXISTS idx_accounts_email ON public.accounts (email);
CREATE INDEX IF NOT EXISTS idx_accounts_pwd_req ON public.accounts (password_change_required);

-- Optional Table Synonym / View for `inventory` if queried directly
CREATE OR REPLACE VIEW public.inventory AS
SELECT * FROM public.accounts;

-- ==============================================================================
-- 6. SCREENS TABLE (Screen-Level State & Expiry Synchronization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id TEXT NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  screen_number INT NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '1234',
  device_type TEXT NOT NULL DEFAULT 'tv',
  device_name TEXT,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied')),
  sale_id TEXT,
  customer_name TEXT,
  customer_number TEXT,
  expiry_date TEXT,
  activation_date TEXT,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT unique_account_screen UNIQUE (account_id, screen_number)
);

-- Idempotent column additions
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS customer_number TEXT;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS activation_date TEXT;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.screens ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_screens_account ON public.screens (account_id);
CREATE INDEX IF NOT EXISTS idx_screens_sale_id ON public.screens (sale_id);
CREATE INDEX IF NOT EXISTS idx_screens_expiry ON public.screens (expiry_date);

-- ==============================================================================
-- 7. SELLER DETAILS TABLE (Star Button popup modal per account)
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
-- 8. SALES TABLE (Recent Sales & History, Expiry Records)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  owner_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  seller_email TEXT NOT NULL DEFAULT 'Fixyourmobiles10@gmail.com',
  seller_name TEXT,
  brand_id TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  inventory_id TEXT REFERENCES public.accounts(id) ON DELETE SET NULL,
  record_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  customer_email TEXT,
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

-- Idempotent column additions
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMPTZ;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_sales_owner ON public.sales (owner_email);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON public.sales (seller_email);
CREATE INDEX IF NOT EXISTS idx_sales_brand ON public.sales (brand_id);
CREATE INDEX IF NOT EXISTS idx_sales_inventory ON public.sales (inventory_id);
CREATE INDEX IF NOT EXISTS idx_sales_expiry ON public.sales (expiry_date);
CREATE INDEX IF NOT EXISTS idx_sales_activation ON public.sales (activation_date);
CREATE INDEX IF NOT EXISTS idx_sales_notified ON public.sales (notification_sent);

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) FOR MULTI-USER DATA ISOLATION
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
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

-- Public / Anonymous Read Policies for Profiles and Settings
DROP POLICY IF EXISTS "Public Read Profiles" ON public.profiles;
CREATE POLICY "Public Read Profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow Insert Profiles" ON public.profiles;
CREATE POLICY "Allow Insert Profiles" ON public.profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Update Profiles" ON public.profiles;
CREATE POLICY "Allow Update Profiles" ON public.profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Read Feature Permissions" ON public.user_feature_permissions;
CREATE POLICY "Public Read Feature Permissions" ON public.user_feature_permissions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow Insert Permissions" ON public.user_feature_permissions;
CREATE POLICY "Allow Insert Permissions" ON public.user_feature_permissions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow Update Permissions" ON public.user_feature_permissions;
CREATE POLICY "Allow Update Permissions" ON public.user_feature_permissions FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public Read Site Settings" ON public.site_settings;
CREATE POLICY "Public Read Site Settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow Update Site Settings" ON public.site_settings;
CREATE POLICY "Allow Update Site Settings" ON public.site_settings FOR ALL USING (true);

-- Brands Policies
DROP POLICY IF EXISTS "Brands Isolation - ALL" ON public.brands;
CREATE POLICY "Brands Isolation - ALL" ON public.brands
  FOR ALL USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text OR
    auth.role() = 'anon'
  );

-- Accounts Policies
DROP POLICY IF EXISTS "Accounts Isolation - ALL" ON public.accounts;
CREATE POLICY "Accounts Isolation - ALL" ON public.accounts
  FOR ALL USING (
    is_admin() OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text OR
    auth.role() = 'anon'
  );

-- Screens Policies
DROP POLICY IF EXISTS "Screens Isolation - ALL" ON public.screens;
CREATE POLICY "Screens Isolation - ALL" ON public.screens
  FOR ALL USING (
    is_admin() OR
    auth.role() = 'anon' OR
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = screens.account_id
        AND (a.owner_email = (auth.jwt() ->> 'email') OR a.owner_user_id = auth.uid()::text)
    )
  );

-- Seller Details Policies
DROP POLICY IF EXISTS "Seller Details Isolation - ALL" ON public.seller_details;
CREATE POLICY "Seller Details Isolation - ALL" ON public.seller_details
  FOR ALL USING (
    is_admin() OR
    auth.role() = 'anon' OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.accounts a
      WHERE a.id = seller_details.account_id
        AND (a.owner_email = (auth.jwt() ->> 'email') OR a.owner_user_id = auth.uid()::text)
    )
  );

-- Sales Policies
DROP POLICY IF EXISTS "Sales Isolation - ALL" ON public.sales;
CREATE POLICY "Sales Isolation - ALL" ON public.sales
  FOR ALL USING (
    is_admin() OR
    auth.role() = 'anon' OR
    seller_email = (auth.jwt() ->> 'email') OR
    owner_email = (auth.jwt() ->> 'email') OR
    owner_user_id = auth.uid()::text
  );
