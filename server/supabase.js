import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xkpdusmqfprmhkzchwgp.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrcGR1c21xZnBybWhremNod2dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NzAxMTAsImV4cCI6MjEwODA0NjExMH0.5qLWOH5iO0UYh4l7u8G4ckVbK9RZg7LUiZzaygCA14g';

export const supabaseServer = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

/**
 * Safely sync user profile to Supabase
 */
export async function syncProfileToSupabase(profile) {
  try {
    const { error } = await supabaseServer.from('profiles').upsert({
      id: profile.id,
      full_name: profile.name || profile.fullName,
      mobile_number: profile.mobileNumber || profile.mobile,
      email: profile.email,
      role: profile.role || 'user',
      account_status: profile.accountStatus || 'active',
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('[Supabase Sync] Profile upsert warning:', error.message);
    }
  } catch (err) {
    // Non-blocking fallback
    console.warn('[Supabase Sync] Warning connecting to Supabase:', err.message);
  }
}

/**
 * Safely sync user permissions to Supabase
 */
export async function syncPermissionsToSupabase(userId, permissions) {
  try {
    const rows = Object.entries(permissions).map(([featureKey, isEnabled]) => ({
      user_id: userId,
      feature_key: featureKey,
      is_enabled: Boolean(isEnabled),
      updated_at: new Date().toISOString()
    }));

    if (rows.length > 0) {
      const { error } = await supabaseServer.from('user_feature_permissions').upsert(rows, {
        onConflict: 'user_id,feature_key'
      });
      if (error) {
        console.warn('[Supabase Sync] Permissions upsert warning:', error.message);
      }
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning syncing permissions:', err.message);
  }
}

/**
 * Safely sync site settings to Supabase
 */
export async function syncSiteSettingsToSupabase(settings) {
  try {
    const { error } = await supabaseServer.from('site_settings').upsert({
      id: 'global_config',
      business_name: settings.businessName || 'OTT SELLERS',
      subtitle: settings.subtitle || 'Management System',
      logo_url: settings.logoUrl || null,
      primary_color: settings.primaryColor || '#2563eb',
      accent_color: settings.accentColor || '#0284c7',
      header_bg: settings.headerBg || '#0f172a',
      headings_text: settings.headingsText || 'Multi-Brand OTT Subscriptions',
      updated_at: new Date().toISOString()
    });
    if (error) {
      console.warn('[Supabase Sync] Site settings upsert warning:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning syncing site settings:', err.message);
  }
}

/**
 * Safely sync sale record to Supabase
 */
export async function syncSaleToSupabase(sale) {
  try {
    const payload = {
      id: sale.id,
      owner_email: sale.sellerEmail || sale.ownerEmail || 'Fixyourmobiles10@gmail.com',
      seller_email: sale.sellerEmail || 'Fixyourmobiles10@gmail.com',
      brand_id: sale.brandId,
      brand_name: sale.brandName,
      inventory_id: sale.inventoryId || null,
      record_number: sale.recordNumber || '01',
      customer_name: sale.customerName || 'Customer',
      customer_number: sale.customerNumber || '',
      reference_name: sale.referenceName || '',
      reference_number: sale.referenceNumber || '',
      account_email: sale.accountEmail || '',
      account_password: sale.accountPassword || '',
      validity: sale.validity || '01 Month',
      pricing_plan: sale.pricingPlan || 'General',
      screen_number: sale.screenNumber || '01',
      screen_pin: sale.screenPin || '1234',
      device_name: sale.deviceName || '',
      activation_date: sale.activationDate,
      expiry_date: sale.expiryDate,
      amount: Number(sale.amount) || 199,
      note: sale.note || '',
      status: sale.status || 'Active',
      notification_sent: Boolean(sale.notificationSent),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabaseServer.from('sales').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('[Supabase Sync] Sale upsert warning:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning syncing sale to Supabase:', err.message);
  }
}

/**
 * Safely sync screen expiry & occupancy to Supabase
 */
export async function syncScreenToSupabase(accountId, screenNumber, screenData) {
  try {
    if (!accountId) return;
    const sNum = parseInt(String(screenNumber).replace(/\D/g, '') || '1', 10);
    const { error } = await supabaseServer
      .from('screens')
      .update({
        status: screenData.status || 'occupied',
        sale_id: screenData.saleId || null,
        expiry_date: screenData.expiryDate || null,
        updated_at: new Date().toISOString()
      })
      .match({ account_id: accountId, screen_number: sNum });

    if (error) {
      console.warn('[Supabase Sync] Screen update warning:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning updating screen:', err.message);
  }
}

/**
 * Safely delete sale from Supabase
 */
export async function deleteSaleFromSupabase(saleId) {
  try {
    const { error } = await supabaseServer.from('sales').delete().eq('id', saleId);
    if (error) {
      console.warn('[Supabase Sync] Sale delete warning:', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Sync] Warning deleting sale from Supabase:', err.message);
  }
}
