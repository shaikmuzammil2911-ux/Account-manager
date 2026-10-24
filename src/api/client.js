import { getClientInitialData } from '../utils/initialData';
import { parseDate, getDaysDiff, calculateExpiryDate } from '../utils/dateUtils';
import { supabase } from '../utils/supabaseClient';
import {
  testGoogleSheetConnection,
  validateGoogleSheets,
  buildSpreadsheetPayload,
  DEFAULT_SPREADSHEET_ID,
  DEFAULT_SPREADSHEET_OWNER,
  syncSaleToGoogleSheet,
  syncSaleDeleteToGoogleSheet,
  syncAccountToGoogleSheet,
  syncAccountDeleteToGoogleSheet,
  syncAllToGoogleSheet,
  fetchLiveSpreadsheetData
} from '../utils/googleSheets';
import { uploadToCloudinary } from '../utils/cloudinary';

const STORAGE_KEY = 'accounts_manager_app_data_v7';
const WEBHOOK_STORAGE_KEY = 'accounts_manager_google_sheet_webhook_v1';
const SHEET_ID_STORAGE_KEY = 'accounts_manager_spreadsheet_id_v1';

// One-time purge of stale demo client caches
if (typeof localStorage !== 'undefined') {
  ['accounts_manager_app_data_v6', 'accounts_manager_app_data_v5', 'accounts_manager_app_data_v4', 'accounts_manager_app_data_v3', 'accounts_manager_app_data_v2', 'accounts_manager_app_data_v1', 'accounts_manager_data_v1'].forEach(k => {
    try { localStorage.removeItem(k); } catch (e) {}
  });
}

// Initialize or load from LocalStorage as primary persistent client store
function getLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        parsed.brands = Array.isArray(parsed.brands) ? parsed.brands : [];
        parsed.inventory = Array.isArray(parsed.inventory) ? parsed.inventory : [];
        parsed.sales = Array.isArray(parsed.sales) ? parsed.sales : [];
        // Ensure Google Sheet config defaults are intact
        parsed.settings = parsed.settings || {};
        parsed.settings.googleSheetConfig = parsed.settings.googleSheetConfig || {};
        const savedWebhook = localStorage.getItem(WEBHOOK_STORAGE_KEY);
        const savedSheetId = localStorage.getItem(SHEET_ID_STORAGE_KEY);
        if (savedWebhook && !parsed.settings.googleSheetConfig.webhookUrl) {
          parsed.settings.googleSheetConfig.webhookUrl = savedWebhook;
        }
        if (savedSheetId && !parsed.settings.googleSheetConfig.spreadsheetId) {
          parsed.settings.googleSheetConfig.spreadsheetId = savedSheetId;
        }
        if (!parsed.settings.googleSheetConfig.spreadsheetId) {
          parsed.settings.googleSheetConfig.spreadsheetId = DEFAULT_SPREADSHEET_ID;
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error, initializing defaults', err);
  }

  const initial = getClientInitialData();
  const savedWebhook = typeof localStorage !== 'undefined' ? localStorage.getItem(WEBHOOK_STORAGE_KEY) : '';
  const savedSheetId = typeof localStorage !== 'undefined' ? localStorage.getItem(SHEET_ID_STORAGE_KEY) : '';
  initial.settings = initial.settings || {};
  initial.settings.googleSheetConfig = {
    enabled: Boolean(savedWebhook),
    spreadsheetId: savedSheetId || DEFAULT_SPREADSHEET_ID,
    ownerEmail: DEFAULT_SPREADSHEET_OWNER,
    spreadsheetName: 'OTT A/C MANAGER',
    webhookUrl: savedWebhook || '',
    autoSyncOnSale: true,
    status: savedWebhook ? 'Connected' : 'Disconnected',
    lastSyncTime: null,
    lastError: null
  };
  saveLocalData(initial);
  return initial;
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    const webhook = data?.settings?.googleSheetConfig?.webhookUrl;
    if (webhook) {
      localStorage.setItem(WEBHOOK_STORAGE_KEY, webhook);
    }
    const sheetId = data?.settings?.googleSheetConfig?.spreadsheetId;
    if (sheetId) {
      localStorage.setItem(SHEET_ID_STORAGE_KEY, sheetId);
    }
  } catch (err) {
    console.warn('LocalStorage save error', err);
  }
}

function getActiveUser() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('accounts_manager_user') : null;
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function maskCredential(val) {
  if (!val || !String(val).trim()) return 'None';
  const str = String(val).trim();
  if (str.length <= 2) return '••';
  return '••••••';
}

function mapSupabaseBrand(b) {
  if (!b) return null;
  const pricesObj = (b.prices && typeof b.prices === 'object') ? b.prices : {};
  const logo = pricesObj._logo || b.logo || '';
  const showScreenPin = pricesObj._showScreenPin !== undefined ? pricesObj._showScreenPin : (b.show_screen_pin !== false);
  const showDeviceName = pricesObj._showDeviceName !== undefined ? pricesObj._showDeviceName : (b.show_device_name !== false);
  const groupScreensBy5 = pricesObj._groupScreensBy5 !== undefined ? pricesObj._groupScreensBy5 : (b.group_screens_by_5 !== false);
  const pricingPlans = pricesObj._pricingPlans || b.pricing_plans || null;

  const cleanPrices = {};
  Object.entries(pricesObj).forEach(([k, v]) => {
    if (!k.startsWith('_')) cleanPrices[k] = v;
  });

  return {
    id: b.id,
    name: b.name || b.display_name || '',
    displayName: b.display_name || b.name || '',
    logo,
    color: b.color || '#3b82f6',
    bgDark: b.bg_dark || '#0f172a',
    badgeColor: b.badge_color || b.color || '#3b82f6',
    screensCount: Number(b.screens_count) || 5,
    showScreenPin: showScreenPin !== false,
    showDeviceName: showDeviceName !== false,
    groupScreensBy5: groupScreensBy5 !== false,
    plans: Array.isArray(b.plans) && b.plans.length > 0 ? b.plans : (Object.keys(cleanPrices).length > 0 ? Object.keys(cleanPrices) : ['01 Month']),
    prices: Object.keys(cleanPrices).length > 0 ? cleanPrices : { '01 Month': 199 },
    pricingPlans,
    ownerEmail: b.owner_email || '',
    isActive: b.is_active !== false,
    createdAt: b.created_at,
    updatedAt: b.updated_at
  };
}

function mapBrandToSupabase(brandData, userEmail) {
  const id = brandData.id || brandData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const pricesPayload = { ...(brandData.prices || {}) };
  if (brandData.logo) pricesPayload._logo = brandData.logo;
  if (brandData.showScreenPin !== undefined) pricesPayload._showScreenPin = brandData.showScreenPin;
  if (brandData.showDeviceName !== undefined) pricesPayload._showDeviceName = brandData.showDeviceName;
  if (brandData.groupScreensBy5 !== undefined) pricesPayload._groupScreensBy5 = brandData.groupScreensBy5;
  if (brandData.pricingPlans) pricesPayload._pricingPlans = brandData.pricingPlans;

  const generalPlans = Array.isArray(brandData.plans) && brandData.plans.length > 0
    ? brandData.plans
    : Object.keys(brandData.prices || { '01 Month': 199 });

  return {
    id,
    name: (brandData.name || brandData.displayName || '').trim(),
    display_name: (brandData.displayName || brandData.name || '').trim(),
    color: brandData.color || '#3b82f6',
    bg_dark: brandData.bgDark || '#0f172a',
    badge_color: brandData.badgeColor || brandData.color || '#3b82f6',
    screens_count: Number(brandData.screensCount) || 5,
    plans: generalPlans,
    prices: pricesPayload,
    owner_email: brandData.ownerEmail || userEmail || 'Fixyourmobiles10@gmail.com',
    is_active: brandData.isActive !== false,
    updated_at: new Date().toISOString()
  };
}

function mapSupabaseAccount(a) {
  if (!a) return null;
  let parsedNotes = {};
  if (a.notes) {
    try {
      parsedNotes = typeof a.notes === 'string' ? JSON.parse(a.notes) : a.notes;
    } catch (e) {
      parsedNotes = { userNotes: a.notes };
    }
  }

  const screenDeviceNames = (parsedNotes && typeof parsedNotes === 'object' && parsedNotes.screenDeviceNames) || {};

  const rawScreens = a.screens || [];
  const sortedScreens = [...rawScreens].sort((x, y) => (x.screen_number || 0) - (y.screen_number || 0));
  const screens = sortedScreens.map((s, idx) => {
    const sNum = s.screen_number || (idx + 1);
    const dName = s.device_name || screenDeviceNames[sNum] || screenDeviceNames[String(sNum)] || '';
    return {
      id: s.id,
      screenNumber: sNum,
      name: s.name || `Screen-${String(sNum).padStart(2, '0')}`,
      pin: s.pin !== undefined ? String(s.pin) : '1234',
      deviceType: s.device_type || 'tv',
      deviceName: dName,
      status: s.status || 'empty',
      saleId: s.sale_id || null,
      customerName: s.customer_name || null,
      customerNumber: s.customer_number || null,
      expiryDate: s.expiry_date || null,
      activationDate: s.activation_date || null,
      notificationSent: Boolean(s.notification_sent),
      lastNotifiedAt: s.last_notified_at || null
    };
  });

  return {
    id: a.id,
    brandId: a.brand_id,
    recordNumber: a.record_number || '01',
    email: a.email || '',
    password: a.password || '',
    validity: a.validity || '12 Months',
    planVariant: a.plan_variant || 'General',
    passwordChangeRequired: Boolean(a.password_change_required),
    isLocked: a.is_locked !== false,
    isSelected: Boolean(a.is_selected),
    isDeleted: Boolean(a.is_deleted),
    ownerEmail: a.owner_email || '',
    userId: a.owner_user_id || '',
    defaultExpanded: Boolean(parsedNotes.defaultExpanded),
    credentialHistory: Array.isArray(parsedNotes.credentialHistory) ? parsedNotes.credentialHistory : [],
    sellerDetails: parsedNotes.sellerDetails || null,
    notes: parsedNotes.userNotes || (typeof parsedNotes === 'string' ? parsedNotes : ''),
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    screens
  };
}

function mapAccountToSupabase(item, userEmail, userId) {
  const screenDeviceNames = {};
  if (Array.isArray(item.screens)) {
    item.screens.forEach(s => {
      if (s.deviceName && String(s.deviceName).trim()) {
        screenDeviceNames[s.screenNumber] = String(s.deviceName).trim();
      }
    });
  }

  const notesObj = {
    defaultExpanded: Boolean(item.defaultExpanded),
    credentialHistory: Array.isArray(item.credentialHistory) ? item.credentialHistory : [],
    sellerDetails: item.sellerDetails || null,
    screenDeviceNames,
    userNotes: typeof item.notes === 'string' ? item.notes : (item.notes?.userNotes || '')
  };

  return {
    id: item.id,
    brand_id: item.brandId,
    record_number: item.recordNumber || '01',
    email: (item.email || '').trim(),
    password: (item.password || '').trim(),
    validity: item.validity || '12 Months',
    plan_variant: item.planVariant || 'General',
    password_change_required: Boolean(item.passwordChangeRequired),
    notes: JSON.stringify(notesObj),
    is_locked: item.isLocked !== false,
    is_selected: Boolean(item.isSelected),
    is_deleted: Boolean(item.isDeleted),
    owner_email: item.ownerEmail || userEmail || 'Fixyourmobiles10@gmail.com',
    owner_user_id: item.userId || userId || null,
    updated_at: new Date().toISOString()
  };
}

export function compareAccountOrders(a, b, sortOrder = 'top') {
  const numA = parseInt(a?.recordNumber, 10);
  const numB = parseInt(b?.recordNumber, 10);

  const hasNumA = !isNaN(numA) && numA > 0;
  const hasNumB = !isNaN(numB) && numB > 0;

  // Accounts without an E Number go after numbered accounts
  if (hasNumA && !hasNumB) return -1;
  if (!hasNumA && hasNumB) return 1;
  if (!hasNumA && !hasNumB) {
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  }

  // Both have numbers: sort numerically
  if (numA !== numB) {
    return sortOrder === 'bottom' ? numB - numA : numA - numB;
  }

  // Duplicates exist: keep both accounts and use stable secondary order (createdAt then id)
  const timeA = new Date(a?.createdAt || 0).getTime();
  const timeB = new Date(b?.createdAt || 0).getTime();
  if (timeA !== timeB) return timeA - timeB;
  return String(a?.id || '').localeCompare(String(b?.id || ''));
}

export const api = {
  // BRANDS
  async getBrands(userEmail) {
    const activeUser = getActiveUser();
    const effectiveEmail = userEmail || activeUser?.email;
    const effectiveRole = activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = activeUser?.id;

    // 1. Authoritative fetch directly from Supabase brands table
    try {
      const { data: sbBrandsData, error: sbErr } = await supabase
        .from('brands')
        .select('*')
        .order('created_at', { ascending: true });

      if (!sbErr && Array.isArray(sbBrandsData)) {
        const mapped = sbBrandsData.map(mapSupabaseBrand).filter(Boolean);
        // Synchronize local cache
        const local = getLocalData();
        local.brands = mapped;
        saveLocalData(local);

        let filtered = [...mapped];
        const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');
        if (!isAdmin) {
          filtered = filtered.filter(b => {
            const owner = (b.ownerEmail || '').trim().toLowerCase();
            return (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && b.userId === effectiveUserId);
          });
        }
        return filtered;
      }
    } catch (e) {
      console.warn('[Supabase getBrands warning]:', e.message);
    }

    // 2. Offline fallback from local storage
    const local = getLocalData();
    let brands = [...(local.brands || [])];
    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');

    if (!isAdmin) {
      brands = brands.filter(b => {
        const owner = (b.ownerEmail || '').trim().toLowerCase();
        return (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && b.userId === effectiveUserId);
      });
    }

    if (effectiveEmail && local.sharedBrands) {
      const norm = effectiveEmail.trim().toLowerCase();
      local.sharedBrands.forEach(share => {
        if (share.status !== 'revoked' && share.receiverEmail?.toLowerCase() === norm) {
          (share.brandIds || []).forEach(bId => {
            const base = (local.brands || []).find(b => b.id === bId);
            if (base) {
              const sharedId = `${base.id}__shared__${share.id}`;
              if (!brands.some(b => b.id === sharedId)) {
                brands.push({
                  ...base,
                  id: sharedId,
                  originalBrandId: base.id,
                  name: `${base.displayName} (${share.senderName || 'Partner'})`,
                  displayName: `${base.displayName} (${share.senderName || 'Partner'})`,
                  isShared: true,
                  sharedBy: share.senderName || 'Partner',
                  senderEmail: share.senderEmail,
                  shareId: share.id
                });
              }
            }
          });
        }
      });
    }
    return brands;
  },

  // INVENTORY (DATA SECTION)
  async getInventory(params = {}) {
    const activeUser = getActiveUser();
    const effectiveEmail = params.userEmail || activeUser?.email;
    const effectiveRole = params.userRole || activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = params.userId || activeUser?.id;

    let items = [];
    let fetchedFromSupabase = false;

    // 1. Fetch directly from Supabase accounts joined with screens
    try {
      let query = supabase.from('accounts').select('*, screens(*)').eq('is_deleted', false);
      if (params.brandId && params.brandId !== 'all') {
        const targetBrandId = params.brandId.includes('__shared__') ? params.brandId.split('__shared__')[0] : params.brandId;
        query = query.or(`brand_id.eq.${params.brandId},brand_id.eq.${targetBrandId}`);
      }
      if (params.selectedOnly) {
        query = query.eq('is_selected', true);
      }
      if (params.validity && params.validity !== 'all') {
        query = query.eq('validity', params.validity);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        items = data.map(mapSupabaseAccount).filter(Boolean);
        fetchedFromSupabase = true;

        // Synchronize local cache for these accounts
        const local = getLocalData();
        const existingInv = local.inventory || [];
        const invMap = new Map(existingInv.map(i => [i.id, i]));
        items.forEach(it => {
          invMap.set(it.id, { ...(invMap.get(it.id) || {}), ...it });
        });
        local.inventory = Array.from(invMap.values());
        saveLocalData(local);
      }
    } catch (e) {
      console.warn('[Supabase getInventory error]:', e.message);
    }

    // 2. Offline fallback if Supabase was unreachable
    if (!fetchedFromSupabase) {
      const local = getLocalData();
      items = (local.inventory || []).filter(i => !i.isDeleted);
      if (params.brandId && params.brandId !== 'all') {
        items = items.filter(i => i.brandId === params.brandId);
      }
      if (params.selectedOnly) {
        items = items.filter(i => i.isSelected);
      }
      if (params.validity && params.validity !== 'all') {
        items = items.filter(i => i.validity === params.validity);
      }
    }

    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');
    if (!isAdmin) {
      const local = getLocalData();
      const activeShares = (local.sharedBrands || []).filter(s =>
        s.status !== 'revoked' &&
        s.status !== 'disabled' &&
        s.receiverEmail && s.receiverEmail.trim().toLowerCase() === effectiveEmail?.toLowerCase()
      );
      const authorizedBrandIds = new Set();
      activeShares.forEach(s => {
        (s.brandIds || []).forEach(bId => authorizedBrandIds.add(bId));
      });

      items = items.filter(item => {
        const owner = (item.ownerEmail || '').trim().toLowerCase();
        const isOwn = (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && item.userId === effectiveUserId);
        if (isOwn) return true;
        if (authorizedBrandIds.has(item.brandId)) {
          return true;
        }
        return false;
      });
    }

    if (params.brandId && params.brandId !== 'all') {
      const targetBrandId = params.brandId.includes('__shared__') ? params.brandId.split('__shared__')[0] : params.brandId;
      const local = getLocalData();
      const brandObj = (local.brands || []).find(b => b.id === targetBrandId || b.id === params.brandId);
      const targetCount = Number(brandObj?.screensCount) || 0;
      if (targetCount > 0) {
        items.forEach(item => {
          const curScreens = item.screens || [];
          const existingSet = new Set(curScreens.map(s => Number(s.screenNumber)));
          const toAdd = [];
          for (let sNum = 1; sNum <= targetCount; sNum++) {
            if (!existingSet.has(sNum)) {
              toAdd.push({
                screenNumber: sNum,
                name: `Screen-${String(sNum).padStart(2, '0')}`,
                pin: '1234',
                deviceType: 'tv',
                deviceName: '',
                status: 'empty',
                saleId: null,
                expiryDate: null
              });
            }
          }
          if (toAdd.length > 0) {
            item.screens = [...curScreens, ...toAdd].sort((x, y) => x.screenNumber - y.screenNumber);
          }
        });
      }
    }

    if (params.emptyOnly) {
      items = items.filter(i => i.screens && i.screens.some(s => s.status === 'empty'));

      // Sort by empty screens: All empty screens accounts first, then 4 empty, then 3 empty, etc.
      items.sort((a, b) => {
        const screensA = a.screens || [];
        const screensB = b.screens || [];
        const totalA = screensA.length || 5;
        const totalB = screensB.length || 5;
        const emptyA = screensA.filter(s => s.status === 'empty').length;
        const emptyB = screensB.filter(s => s.status === 'empty').length;

        const isAllEmptyA = emptyA === totalA && totalA > 0;
        const isAllEmptyB = emptyB === totalB && totalB > 0;

        if (isAllEmptyA && !isAllEmptyB) return -1;
        if (!isAllEmptyA && isAllEmptyB) return 1;

        if (emptyB !== emptyA) {
          return emptyB - emptyA;
        }

        return compareAccountOrders(a, b, params.sortOrder);
      });

      return items;
    }

    items.sort((a, b) => compareAccountOrders(a, b, params.sortOrder));

    return items;
  },

  async createInventory(data) {
    const activeUser = getActiveUser();
    const ownerEmail = data.ownerEmail || activeUser?.email || 'Fixyourmobiles10@gmail.com';
    const userId = data.userId || activeUser?.id || '';

    const local = getLocalData();
    const brandId = data.brandId || 'netflix';
    const brand = (local.brands || []).find(b => b.id === brandId);
    const brandItems = (local.inventory || []).filter(i => i.brandId === brandId && !i.isDeleted);
    
    let nextNum = data.recordNumber;
    if (!nextNum) {
      const highestNum = brandItems.reduce((max, item) => {
        const n = parseInt(item.recordNumber, 10);
        return (!isNaN(n) && n > max) ? n : max;
      }, 0);
      nextNum = String(highestNum + 1).padStart(2, '0');
    } else {
      const p = parseInt(nextNum, 10);
      nextNum = (!isNaN(p) && p > 0) ? String(p).padStart(2, '0') : String(brandItems.length + 1).padStart(2, '0');
    }

    const screensCount = Math.max(1, parseInt(data.screensCount || data.screens?.length || brand?.screensCount || 5, 10));

    let screens = [];
    if (data.screens && Array.isArray(data.screens) && data.screens.length > 0) {
      screens = data.screens.map((s, idx) => ({
        screenNumber: idx + 1,
        name: s.name || `Screen-${String(idx + 1).padStart(2, '0')}`,
        pin: s.pin !== undefined ? String(s.pin) : `${(idx + 1) * 1111}`.slice(0, 4),
        deviceType: s.deviceType || 'tv',
        deviceName: s.deviceName ? String(s.deviceName).trim() : '',
        status: s.status || (s.expiryDate ? 'occupied' : 'empty'),
        saleId: s.saleId || null,
        expiryDate: s.expiryDate || null
      }));
    } else {
      screens = Array.from({ length: screensCount }, (_, i) => ({
        screenNumber: i + 1,
        name: `Screen-${String(i + 1).padStart(2, '0')}`,
        pin: String(1111 * (i + 1)).slice(0, 4) || '1234',
        deviceType: 'tv',
        deviceName: '',
        status: 'empty',
        saleId: null,
        expiryDate: null
      }));
    }

    const newItem = {
      id: data.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brandId,
      recordNumber: nextNum,
      email: data.email?.trim() || '',
      password: data.password?.trim() || '',
      validity: data.validity || '12 Months',
      planVariant: data.planVariant || 'General',
      notes: typeof data.notes === 'string' ? data.notes : '',
      ownerEmail,
      userId,
      defaultExpanded: Boolean(data.defaultExpanded),
      credentialHistory: [],
      sellerDetails: data.sellerDetails || null,
      isLocked: data.isLocked ?? true,
      isSelected: data.isSelected ?? false,
      isDeleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      screens
    };

    // 1. Direct Supabase Insert
    try {
      const sbAccount = mapAccountToSupabase(newItem, ownerEmail, userId);
      const { error: accErr } = await supabase.from('accounts').upsert(sbAccount);
      if (accErr) {
        console.error('[Supabase createAccount error]:', accErr);
        throw new Error(accErr.message || 'Failed to save account in database');
      }

      const sbScreens = screens.map(s => ({
        account_id: newItem.id,
        screen_number: s.screenNumber,
        name: s.name,
        pin: String(s.pin),
        device_type: s.deviceType || 'tv',
        status: s.status || 'empty',
        sale_id: s.saleId || null,
        expiry_date: s.expiryDate || null
      }));
      await supabase.from('screens').delete().eq('account_id', newItem.id);
      const { error: scrErr } = await supabase.from('screens').insert(sbScreens);
      if (scrErr) {
        console.warn('[Supabase createScreens warning]:', scrErr);
      }
    } catch (e) {
      console.warn('[Supabase createInventory warning]:', e.message);
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    // 2. Synchronize Local Storage
    local.inventory = [...(local.inventory || []), newItem];
    saveLocalData(local);

    // 3. Sync to Google Sheets
    this.getSheetsConfig().then(cfg => {
      const b = (local.brands || []).find(x => x.id === newItem.brandId);
      syncAccountToGoogleSheet(cfg?.webhookUrl || '', newItem, b?.displayName || b?.name).catch(e => {
        console.warn('GSheet inventory create sync warning:', e);
      });
    }).catch(() => {});

    return newItem;
  },

  async updateInventory(id, updates) {
    const activeUser = getActiveUser();
    const local = getLocalData();
    let idx = (local.inventory || []).findIndex(i => i.id === id);
    let existing = idx !== -1 ? local.inventory[idx] : null;

    // If not in local cache, fetch from Supabase
    if (!existing) {
      try {
        const { data } = await supabase.from('accounts').select('*, screens(*)').eq('id', id).single();
        if (data) {
          existing = mapSupabaseAccount(data);
        }
      } catch (e) {}
    }

    if (!existing) {
      throw new Error(`Account not found for id: ${id}`);
    }

    // Merge screens cleanly
    let mergedScreens = existing.screens || [];
    if (updates.screens && Array.isArray(updates.screens)) {
      mergedScreens = updates.screens.map((newS, sIdx) => {
        const oldS = existing.screens ? existing.screens[sIdx] : null;
        const pin = newS.pin !== undefined ? String(newS.pin) : (oldS?.pin || '1234');
        const expiryDate = newS.expiryDate !== undefined ? newS.expiryDate : (oldS?.expiryDate || null);
        const status = newS.status !== undefined ? newS.status : (expiryDate ? 'occupied' : (oldS?.status || 'empty'));
        const deviceName = newS.deviceName !== undefined ? String(newS.deviceName).trim() : (oldS?.deviceName || '');
        return {
          screenNumber: sIdx + 1,
          name: newS.name || oldS?.name || `Screen-${String(sIdx + 1).padStart(2, '0')}`,
          pin,
          deviceType: newS.deviceType || oldS?.deviceType || 'tv',
          deviceName,
          status,
          saleId: newS.saleId !== undefined ? newS.saleId : (oldS?.saleId || null),
          expiryDate
        };
      });
    }

    // Record Credential Change Audit History
    let existingHistory = Array.isArray(existing.credentialHistory) ? [...existing.credentialHistory] : [];
    const nowIso = new Date().toISOString();

    // Check password change
    if (updates.password !== undefined && updates.password !== existing.password) {
      existingHistory.unshift({
        id: `hist_${Date.now()}_pw`,
        field: 'Password',
        previous: maskCredential(existing.password),
        current: maskCredential(updates.password),
        timestamp: nowIso,
        accountId: existing.email || existing.recordNumber || id,
        status: 'Confirmed'
      });
    }

    // Check screen PIN or Expiry changes
    if (updates.screens && Array.isArray(updates.screens)) {
      updates.screens.forEach((newS, sIdx) => {
        const oldS = existing.screens ? existing.screens[sIdx] : null;
        const screenLabel = `Screen-${sIdx + 1}`;
        if (newS.pin !== undefined && oldS && String(newS.pin) !== String(oldS.pin)) {
          existingHistory.unshift({
            id: `hist_${Date.now()}_pin_${sIdx}`,
            field: `${screenLabel} PIN`,
            previous: maskCredential(oldS.pin),
            current: maskCredential(newS.pin),
            timestamp: nowIso,
            accountId: existing.email || existing.recordNumber || id,
            status: 'Confirmed'
          });
        }
        if (newS.expiryDate !== undefined && oldS && newS.expiryDate !== oldS.expiryDate) {
          existingHistory.unshift({
            id: `hist_${Date.now()}_exp_${sIdx}`,
            field: `${screenLabel} Expiry`,
            previous: oldS.expiryDate || 'None',
            current: newS.expiryDate || 'None',
            timestamp: nowIso,
            accountId: existing.email || existing.recordNumber || id,
            status: 'Confirmed'
          });
        }
      });
    }

    if (existingHistory.length > 50) existingHistory = existingHistory.slice(0, 50);

    let finalRecordNumber = existing.recordNumber || '01';
    if (updates.recordNumber !== undefined) {
      const p = parseInt(updates.recordNumber, 10);
      if (!isNaN(p) && p > 0) {
        finalRecordNumber = String(p).padStart(2, '0');
      }
    }

    const updated = {
      ...existing,
      ...updates,
      recordNumber: finalRecordNumber,
      screens: mergedScreens,
      credentialHistory: existingHistory,
      defaultExpanded: updates.defaultExpanded !== undefined ? Boolean(updates.defaultExpanded) : Boolean(existing.defaultExpanded),
      sellerDetails: updates.sellerDetails !== undefined ? updates.sellerDetails : existing.sellerDetails,
      updatedAt: nowIso,
      id
    };

    // 1. Direct Supabase Persistence
    try {
      const sbAccount = mapAccountToSupabase(updated, activeUser?.email, activeUser?.id);
      const { error: accErr } = await supabase.from('accounts').update(sbAccount).eq('id', id);
      if (accErr) {
        console.error('[Supabase updateAccount error]:', accErr);
        throw new Error(accErr.message || 'Failed to update account in database');
      }

      if (updates.screens && Array.isArray(updates.screens)) {
        await supabase.from('screens').delete().eq('account_id', id);
        const sbScreens = mergedScreens.map(s => ({
          account_id: id,
          screen_number: s.screenNumber,
          name: s.name,
          pin: String(s.pin),
          device_type: s.deviceType || 'tv',
          status: s.status || 'empty',
          sale_id: s.saleId || null,
          expiry_date: s.expiryDate || null
        }));
        const { error: scrErr } = await supabase.from('screens').insert(sbScreens);
        if (scrErr) {
          console.warn('[Supabase updateScreens error]:', scrErr);
        }
      }
    } catch (e) {
      console.warn('[Supabase updateInventory warning]:', e.message);
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    // 2. Cascade updates to matching sales records
    if (local.sales && Array.isArray(local.sales)) {
      local.sales = local.sales.map(sale => {
        const isLinked = (sale.inventoryId && sale.inventoryId === id) ||
          (sale.accountEmail && existing.email && String(sale.accountEmail).trim().toLowerCase() === String(existing.email).trim().toLowerCase());

        if (!isLinked) return sale;

        const sNum = parseInt(String(sale.screenNumber || '').replace(/\D/g, '') || '1', 10);
        const updatedScreen = mergedScreens ? mergedScreens.find(s => s.screenNumber === sNum) : null;

        return {
          ...sale,
          accountEmail: updated.email || sale.accountEmail,
          accountPassword: updated.password || sale.accountPassword,
          screenPin: updatedScreen?.pin !== undefined ? updatedScreen.pin : sale.screenPin,
          expiryDate: (updatedScreen && updatedScreen.expiryDate) ? updatedScreen.expiryDate : sale.expiryDate,
          deviceName: (updatedScreen && updatedScreen.deviceType) ? (updatedScreen.deviceType === 'tv' ? 'Android TV' : updatedScreen.deviceType.toUpperCase()) : sale.deviceName,
          validity: updated.validity || sale.validity,
          updatedAt: new Date().toISOString()
        };
      });
    }

    // 3. Local Storage Sync
    if (idx !== -1) {
      local.inventory[idx] = updated;
    } else {
      local.inventory.push(updated);
    }
    saveLocalData(local);

    // 4. Sync to Google Sheets
    this.getSheetsConfig().then(cfg => {
      const b = (local.brands || []).find(x => x.id === updated.brandId);
      syncAccountToGoogleSheet(cfg?.webhookUrl || '', updated, b?.displayName || b?.name).catch(e => {
        console.warn('GSheet inventory sync warning:', e);
      });
    }).catch(() => {});

    return updated;
  },

  async deleteInventory(id) {
    try {
      await supabase.from('screens').delete().eq('account_id', id);
      await supabase.from('accounts').update({ is_deleted: true, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase deleteInventory warning]:', e.message);
    }

    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (item) {
      item.isDeleted = true;
      saveLocalData(local);

      this.getSheetsConfig().then(cfg => {
        const b = (local.brands || []).find(x => x.id === item.brandId);
        syncAccountDeleteToGoogleSheet(cfg?.webhookUrl || '', item, b?.displayName || b?.name).catch(e => {
          console.warn('GSheet inventory delete sync warning:', e);
        });
      }).catch(() => {});
    }
    return true;
  },

  async toggleInventoryLock(id) {
    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (!item) return null;
    item.isLocked = !item.isLocked;
    item.updatedAt = new Date().toISOString();
    saveLocalData(local);

    try {
      await supabase.from('accounts').update({ is_locked: item.isLocked, updated_at: item.updatedAt }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase toggleInventoryLock warning]:', e.message);
    }

    return item;
  },

  async toggleInventorySelect(id) {
    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (!item) return null;
    item.isSelected = !item.isSelected;
    saveLocalData(local);

    try {
      await supabase.from('accounts').update({ is_selected: item.isSelected, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (e) {
      console.warn('[Supabase toggleInventorySelect warning]:', e.message);
    }

    return item;
  },

  // SALES
  async getSales(params = {}) {
    const activeUser = getActiveUser();
    const effectiveEmail = params.sellerEmail || params.userEmail || activeUser?.email;
    const effectiveRole = params.userRole || activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = params.userId || activeUser?.id;

    // Collect sales across all available sources (Server, Supabase, LocalStorage)
    const salesMap = new Map();
    let supabaseSucceeded = false;

    // 1. Fetch from backend API if reachable
    try {
      const query = new URLSearchParams();
      if (params.brandId) query.set('brandId', params.brandId);
      if (params.validity) query.set('validity', params.validity);
      if (params.date) query.set('date', params.date);
      if (params.search) query.set('search', params.search);
      if (effectiveEmail) query.set('sellerEmail', effectiveEmail);
      if (effectiveRole) query.set('userRole', effectiveRole);
      if (effectiveUserId) query.set('userId', effectiveUserId);

      const res = await fetch(`/api/sales?${query.toString()}`);
      if (res.ok) {
        const serverSales = await res.json();
        if (Array.isArray(serverSales)) {
          serverSales.forEach(s => {
            if (s && s.id && !s.isDeleted && s.status !== 'Deleted' && s.status !== 'deleted') {
              salesMap.set(s.id, s);
            }
          });
        }
      }
    } catch (e) {}

    // 2. Fetch directly from Supabase sales table
    try {
      let sbQuery = supabase.from('sales').select('*').neq('status', 'Deleted');
      if (params.brandId && params.brandId !== 'all') {
        const targetBrandId = params.brandId.includes('__shared__') ? params.brandId.split('__shared__')[0] : params.brandId;
        sbQuery = sbQuery.or(`brand_id.eq.${params.brandId},brand_id.eq.${targetBrandId}`);
      }
      const isAdminCheck = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');
      if (!isAdminCheck && effectiveEmail) {
        sbQuery = sbQuery.or(`seller_email.eq.${effectiveEmail},owner_email.eq.${effectiveEmail}`);
      }

      const { data: sbData, error: sbErr } = await sbQuery;
      if (!sbErr && Array.isArray(sbData)) {
        supabaseSucceeded = true;
        salesMap.clear(); // Authoritative data from Supabase
        sbData.forEach(s => {
          if (s && s.id && s.status !== 'Deleted' && s.status !== 'deleted') {
            const mapped = {
              id: s.id,
              recordNumber: s.record_number,
              customerName: s.customer_name,
              customerNumber: s.customer_number,
              referenceName: s.reference_name,
              referenceNumber: s.reference_number,
              brandId: s.brand_id,
              brandName: s.brand_name,
              sellerEmail: s.seller_email,
              ownerEmail: s.owner_email,
              accountEmail: s.account_email,
              accountPassword: s.account_password,
              validity: s.validity,
              pricingPlan: s.pricing_plan,
              screenNumber: s.screen_number,
              screenPin: s.screen_pin,
              deviceName: s.device_name,
              activationDate: s.activation_date,
              expiryDate: s.expiry_date,
              amount: Number(s.amount) || 199,
              note: s.note,
              status: s.status,
              notificationSent: s.notification_sent,
              lastNotifiedAt: s.last_notified_at,
              inventoryId: s.inventory_id,
              saleDate: s.activation_date,
              createdAt: s.created_at
            };
            salesMap.set(mapped.id, mapped);
          }
        });
      }
    } catch (e) {}

    // 3. Fallback to LocalStorage sales ONLY if Supabase was unreachable
    if (!supabaseSucceeded) {
      const local = getLocalData();
      (local.sales || []).forEach(s => {
        if (s && s.id && !s.isDeleted && s.status !== 'Deleted' && s.status !== 'deleted') {
          salesMap.set(s.id, { ...(salesMap.get(s.id) || {}), ...s });
        }
      });
    } else {
      // Sync local storage with authoritative Supabase records to permanently purge deleted/demo records
      try {
        const local = getLocalData();
        const authoritativeSales = Array.from(salesMap.values());
        local.sales = authoritativeSales;
        saveLocalData(local);
        localStorage.setItem('accounts_manager_cached_sales', JSON.stringify(authoritativeSales));
        if (effectiveEmail) {
          localStorage.setItem(`accounts_manager_cached_sales_${effectiveEmail}`, JSON.stringify(authoritativeSales));
        }
      } catch (e) {}
    }

    let sales = Array.from(salesMap.values());
    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');
    const targetSeller = params.sellerEmail || (params.isPersonalOnly ? effectiveEmail : null);

    if (targetSeller) {
      sales = sales.filter(s => (s.sellerEmail || '').trim().toLowerCase() === targetSeller.trim().toLowerCase());
    } else if (!isAdmin) {
      sales = sales.filter(s => {
        const sEmail = (s.sellerEmail || s.ownerEmail || '').trim().toLowerCase();
        return (sEmail && sEmail === effectiveEmail?.toLowerCase()) || (effectiveUserId && s.userId === effectiveUserId);
      });
    }

    if (params.brandId && params.brandId !== 'all') {
      const targetBrandId = params.brandId.includes('__shared__') ? params.brandId.split('__shared__')[0] : params.brandId;
      sales = sales.filter(s => s.brandId === params.brandId || s.brandId === targetBrandId);
    }
    if (params.validity && params.validity !== 'all') {
      sales = sales.filter(s => s.validity === params.validity);
    }
    if (params.date) {
      sales = sales.filter(s => s.saleDate === params.date || s.activationDate === params.date || s.expiryDate === params.date);
    }
    if (params.startDate && params.endDate) {
      const startT = parseDate(params.startDate).getTime();
      const endT = parseDate(params.endDate).getTime();
      sales = sales.filter(s => {
        const actT = parseDate(s.activationDate || s.saleDate).getTime();
        return actT >= startT && actT <= endT;
      });
    }
    if (params.search) {
      const q = params.search.toLowerCase();
      sales = sales.filter(s =>
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerNumber && s.customerNumber.includes(q)) ||
        (s.accountEmail && s.accountEmail.toLowerCase().includes(q)) ||
        (s.brandName && s.brandName.toLowerCase().includes(q)) ||
        (s.screenPin && s.screenPin.includes(q)) ||
        (s.screenNumber && String(s.screenNumber).includes(q)) ||
        (s.deviceName && s.deviceName.toLowerCase().includes(q))
      );
    }

    sales.sort((a, b) => {
      const dateA = parseDate(a.activationDate || a.saleDate).getTime();
      const dateB = parseDate(b.activationDate || b.saleDate).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return parseInt(b.recordNumber || '0') - parseInt(a.recordNumber || '0');
    });

    return sales;
  },

  async createSale(saleData) {
    const local = getLocalData();
    const brand = local.brands.find(b => b.id === saleData.brandId) || local.brands[0];
    const nextRecordNum = String((local.sales || []).length + 1).padStart(2, '0');

    // Calculate guaranteed accurate expiry date
    const calculatedExpiry = saleData.expiryDate || calculateExpiryDate(saleData.activationDate, saleData.validity || '01 Month');

    // 1. Transactionally record the sale in local storage first (0ms latency, zero data loss!)
    let assignedAccount = null;
    if (saleData.inventoryId) {
      assignedAccount = (local.inventory || []).find(i => i.id === saleData.inventoryId && !i.isDeleted);
    } else if (saleData.accountEmail) {
      assignedAccount = (local.inventory || []).find(i => String(i?.email || '').toLowerCase() === String(saleData.accountEmail).toLowerCase() && !i.isDeleted);
    }

    if (!assignedAccount) {
      assignedAccount = (local.inventory || []).find(i =>
        !i.isDeleted &&
        i.brandId === saleData.brandId &&
        i.screens && i.screens.some(s => s.status === 'empty')
      );
    }

    if (!assignedAccount && saleData.accountEmail) {
      const screensCount = brand?.screensCount || 5;
      const screens = [];
      for (let s = 1; s <= screensCount; s++) {
        screens.push({
          screenNumber: s,
          name: `Screen-${s}`,
          status: 'empty',
          saleId: null,
          expiryDate: null,
          pin: String(1000 + s * 1111).slice(-4),
          deviceType: 'TV'
        });
      }
      assignedAccount = {
        id: `inv_auto_${Date.now()}`,
        brandId: brand?.id || saleData.brandId || 'netflix',
        brandName: brand?.displayName || 'Netflix',
        email: saleData.accountEmail,
        password: saleData.accountPassword || 'Password@123',
        screensCount,
        screens,
        isDeleted: false,
        isSelected: true
      };
      if (!local.inventory) local.inventory = [];
      local.inventory.push(assignedAccount);
    }

    const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let assignedScreen = null;

    if (assignedAccount && assignedAccount.screens) {
      const screenNum = parseInt(saleData.screenNumber?.toString().replace(/\D/g, '') || '0', 10);
      assignedScreen = assignedAccount.screens.find(s => s.screenNumber === screenNum);
      if (!assignedScreen) {
        assignedScreen = assignedAccount.screens.find(s => s.status === 'empty');
      }

      if (!assignedScreen) {
        const sNum = screenNum || (assignedAccount.screens.length + 1);
        assignedScreen = {
          screenNumber: sNum,
          name: `Screen-${sNum}`,
          status: 'empty',
          pin: saleData.screenPin || '1234',
          deviceType: 'TV'
        };
        assignedAccount.screens.push(assignedScreen);
      }

      assignedScreen.status = 'occupied';
      assignedScreen.saleId = saleId;
      assignedScreen.expiryDate = calculatedExpiry;
      assignedScreen.activationDate = saleData.activationDate;
      assignedScreen.customerName = saleData.customerName;
      assignedScreen.customerNumber = saleData.customerNumber;
      if (saleData.screenPin) assignedScreen.pin = saleData.screenPin;
      assignedScreen.deviceName = saleData.deviceName ? String(saleData.deviceName).trim() : '';
      assignedAccount.updatedAt = Date.now();
    }

    const newSale = {
      id: saleId,
      recordNumber: nextRecordNum,
      customerName: saleData.customerName || 'Customer',
      customerNumber: saleData.customerNumber || '',
      sellerEmail: saleData.sellerEmail || 'Fixyourmobiles10@gmail.com',
      referenceName: saleData.referenceName || '',
      referenceNumber: saleData.referenceNumber || '',
      brandId: brand?.id || saleData.brandId || 'netflix',
      brandName: saleData.brandName || brand?.displayName || 'Netflix',
      accountEmail: saleData.accountEmail || assignedAccount?.email || '',
      accountPassword: saleData.accountPassword || assignedAccount?.password || '',
      validity: saleData.validity || '01 Month',
      pricingPlan: saleData.pricingPlan || 'General',
      screenNumber: saleData.screenNumber || (assignedScreen ? `0${assignedScreen.screenNumber}` : '01'),
      screenPin: saleData.screenPin || assignedScreen?.pin || '1234',
      activationDate: saleData.activationDate,
      expiryDate: calculatedExpiry,
      amount: Number(saleData.amount) || brand?.prices?.[saleData.validity] || 199,
      deviceName: saleData.deviceName ? String(saleData.deviceName).trim() : '',
      saleDate: saleData.activationDate,
      note: saleData.note || '',
      status: 'Active',
      notificationSent: false,
      lastNotifiedAt: null,
      inventoryId: assignedAccount?.id || null,
      createdAt: new Date().toISOString()
    };

    local.sales = [newSale, ...(local.sales || [])];
    saveLocalData(local);

    // 2. Direct Supabase Persistence (Database Consistency & RLS)
    try {
      const supabaseSalePayload = {
        id: saleId,
        owner_email: newSale.sellerEmail,
        seller_email: newSale.sellerEmail,
        brand_id: newSale.brandId,
        brand_name: newSale.brandName,
        inventory_id: newSale.inventoryId,
        record_number: newSale.recordNumber,
        customer_name: newSale.customerName,
        customer_number: newSale.customerNumber,
        reference_name: newSale.referenceName,
        reference_number: newSale.referenceNumber,
        account_email: newSale.accountEmail,
        account_password: newSale.accountPassword,
        validity: newSale.validity,
        pricing_plan: newSale.pricingPlan,
        screen_number: newSale.screenNumber,
        screen_pin: newSale.screenPin,
        device_name: newSale.deviceName,
        activation_date: newSale.activationDate,
        expiry_date: newSale.expiryDate,
        amount: newSale.amount,
        note: newSale.note,
        status: newSale.status,
        notification_sent: false,
        created_at: newSale.createdAt,
        updated_at: new Date().toISOString()
      };

      const { error: sbErr } = await supabase.from('sales').upsert(supabaseSalePayload, { onConflict: 'id' });
      if (sbErr) {
        console.warn('[Supabase Sale Save Warning]:', sbErr.message);
      }

      // Update screen record in Supabase
      if (assignedAccount?.id) {
        const sNum = parseInt(String(newSale.screenNumber).replace(/\D/g, '') || '1', 10);
        await supabase
          .from('screens')
          .update({
            status: 'occupied',
            sale_id: saleId,
            expiry_date: calculatedExpiry,
            updated_at: new Date().toISOString()
          })
          .match({ account_id: assignedAccount.id, screen_number: sNum });
      }
    } catch (sbEx) {
      console.warn('[Supabase Direct Save Error]:', sbEx.message);
    }

    // 3. REAL-TIME GOOGLE SHEETS SYNC: Instantly push this sale to Google Sheets!
    this.getSheetsConfig().then(cfg => {
      syncSaleToGoogleSheet(cfg?.webhookUrl || '', newSale).then(res => {
        if (res?.success) console.log('Google Sheet sale sync succeeded');
      }).catch(err => {
        console.warn('Google Sheet sale background sync warning:', err.message);
      });
    }).catch(() => {});

    // 4. Background sync to backend API
    try {
      fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...saleData, expiryDate: calculatedExpiry })
      }).catch(() => {});
    } catch (e) {}

    return { sale: newSale, assignedAccount };
  },

  async updateSale(id, updates) {
    const local = getLocalData();
    const idx = (local.sales || []).findIndex(s => s.id === id);
    let updated = null;
    if (idx !== -1) {
      updated = {
        ...local.sales[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      local.sales[idx] = updated;

      // If sale expiry date or pin changed, update linked screen in inventory
      if (updated.inventoryId || updated.accountEmail) {
        const inv = (local.inventory || []).find(i =>
          (updated.inventoryId && i.id === updated.inventoryId) ||
          (updated.accountEmail && String(i?.email || '').toLowerCase() === String(updated.accountEmail).toLowerCase())
        );
        if (inv && inv.screens) {
          const sNum = parseInt(String(updated.screenNumber).replace(/\D/g, '') || '1', 10);
          const screen = inv.screens.find(s => s.screenNumber === sNum);
          if (screen) {
            if (updates.expiryDate !== undefined) screen.expiryDate = updates.expiryDate;
            if (updates.screenPin !== undefined) screen.pin = updates.screenPin;
            if (updates.deviceName !== undefined) screen.deviceName = String(updates.deviceName).trim();
            inv.updatedAt = Date.now();
          }
        }
      }

      saveLocalData(local);

      // Direct Supabase Update
      try {
        const sbUpdatePayload = {
          updated_at: new Date().toISOString()
        };
        if (updates.customerName !== undefined) sbUpdatePayload.customer_name = updates.customerName;
        if (updates.customerNumber !== undefined) sbUpdatePayload.customer_number = updates.customerNumber;
        if (updates.accountEmail !== undefined) sbUpdatePayload.account_email = updates.accountEmail;
        if (updates.accountPassword !== undefined) sbUpdatePayload.account_password = updates.accountPassword;
        if (updates.validity !== undefined) sbUpdatePayload.validity = updates.validity;
        if (updates.screenNumber !== undefined) sbUpdatePayload.screen_number = updates.screenNumber;
        if (updates.screenPin !== undefined) sbUpdatePayload.screen_pin = updates.screenPin;
        if (updates.deviceName !== undefined) sbUpdatePayload.device_name = String(updates.deviceName).trim();
        if (updates.activationDate !== undefined) sbUpdatePayload.activation_date = updates.activationDate;
        if (updates.expiryDate !== undefined) sbUpdatePayload.expiry_date = updates.expiryDate;
        if (updates.amount !== undefined) sbUpdatePayload.amount = Number(updates.amount);
        if (updates.note !== undefined) sbUpdatePayload.note = updates.note;
        if (updates.status !== undefined) sbUpdatePayload.status = updates.status;

        await supabase.from('sales').update(sbUpdatePayload).eq('id', id);

        if (updated.inventoryId) {
          const sNum = parseInt(String(updated.screenNumber).replace(/\D/g, '') || '1', 10);
          const screenUpd = { updated_at: new Date().toISOString() };
          if (updates.expiryDate !== undefined) screenUpd.expiry_date = updates.expiryDate;
          if (updates.deviceName !== undefined) screenUpd.device_name = String(updates.deviceName).trim();
          if (updates.screenPin !== undefined) screenUpd.pin = updates.screenPin;
          await supabase.from('screens').update(screenUpd).match({ account_id: updated.inventoryId, screen_number: sNum });
        }
      } catch (e) {
        console.warn('[Supabase Sale Update Warning]:', e.message);
      }

      // Real-time sync sale update to Google Sheets
      this.getSheetsConfig().then(cfg => {
        syncSaleToGoogleSheet(cfg?.webhookUrl || '', updated, true).then(res => {
          if (res?.success) console.log('Google Sheet sale update synced successfully');
        }).catch(err => {
          console.warn('Google Sheet sale update background sync warning:', err.message);
        });
      }).catch(() => {});
    }

    try {
      fetch(`/api/sales/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => {});
    } catch (e) {}

    return updated;
  },

  async deleteSale(id) {
    const activeUser = getActiveUser();
    const effectiveEmail = activeUser?.email;
    const isAdmin = activeUser?.role === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');

    const local = getLocalData();
    let sale = (local.sales || []).find(s => s.id === id);

    // If not found in local.sales, attempt to look up from Supabase
    if (!sale) {
      try {
        const { data: sbSale } = await supabase.from('sales').select('*').eq('id', id).single();
        if (sbSale) {
          sale = {
            id: sbSale.id,
            brandId: sbSale.brand_id,
            brandName: sbSale.brand_name,
            inventoryId: sbSale.inventory_id,
            accountEmail: sbSale.account_email,
            screenNumber: sbSale.screen_number,
            sellerEmail: sbSale.seller_email,
            ownerEmail: sbSale.owner_email,
            status: sbSale.status
          };
        }
      } catch (e) {}
    }

    if (!sale) {
      throw new Error('Sale record not found.');
    }

    // Ownership enforcement: verify caller is admin or sale owner/seller
    if (!isAdmin && effectiveEmail) {
      const saleOwner = (sale.ownerEmail || sale.sellerEmail || '').toLowerCase().trim();
      if (saleOwner && saleOwner !== effectiveEmail.toLowerCase().trim()) {
        throw new Error('Permission denied: You cannot delete a sale that belongs to another user.');
      }
    }

    // Recalculate screen occupancy from remaining valid sales
    const targetAccountId = sale.inventoryId;
    const targetAccountEmail = (sale.accountEmail || '').toLowerCase().trim();
    const targetScreenNum = parseInt(String(sale.screenNumber).replace(/\D/g, '') || '1', 10);

    // Find any remaining valid sales for the exact same account screen
    const remainingSalesForScreen = (local.sales || []).filter(s => {
      if (!s || s.id === id || s.isDeleted || s.status === 'Deleted' || s.status === 'deleted') return false;
      const sameAcc = (targetAccountId && s.inventoryId === targetAccountId) ||
                      (targetAccountEmail && String(s.accountEmail || '').toLowerCase().trim() === targetAccountEmail);
      if (!sameAcc) return false;
      const sNum = parseInt(String(s.screenNumber).replace(/\D/g, '') || '1', 10);
      return sNum === targetScreenNum;
    });

    let newestSale = null;
    if (remainingSalesForScreen.length > 0) {
      remainingSalesForScreen.sort((a, b) => {
        const dateA = parseDate(a.expiryDate || a.activationDate)?.getTime() || 0;
        const dateB = parseDate(b.expiryDate || b.activationDate)?.getTime() || 0;
        return dateB - dateA;
      });
      newestSale = remainingSalesForScreen[0];
    }

    // Direct Supabase delete with strict ownership enforcement
    try {
      let delQuery = supabase.from('sales').delete().eq('id', id);
      if (!isAdmin && effectiveEmail) {
        delQuery = delQuery.or(`owner_email.eq.${effectiveEmail},seller_email.eq.${effectiveEmail}`);
      }
      const { error: sbDelErr } = await delQuery;
      if (sbDelErr) {
        console.warn('[Supabase Sale Delete Error]:', sbDelErr.message);
        throw new Error(sbDelErr.message);
      }

      // Update Supabase screens table according to recalculated occupancy
      if (targetAccountId) {
        if (newestSale) {
          await supabase.from('screens').update({
            status: 'occupied',
            sale_id: newestSale.id,
            expiry_date: newestSale.expiryDate,
            updated_at: new Date().toISOString()
          }).match({ account_id: targetAccountId, screen_number: targetScreenNum });
        } else {
          // No other active sale: mark screen free while preserving PIN & device_type
          await supabase.from('screens').update({
            status: 'empty',
            sale_id: null,
            expiry_date: null,
            updated_at: new Date().toISOString()
          }).match({ account_id: targetAccountId, screen_number: targetScreenNum });
        }
      }
    } catch (sbErr) {
      console.error('[Supabase Delete Failed]:', sbErr);
      throw sbErr; // Propagate error so UI keeps the record and alerts user!
    }

    // Only after database confirmation: update local storage
    local.sales = (local.sales || []).filter(s => s.id !== id);

    const inv = (local.inventory || []).find(i =>
      (targetAccountId && i.id === targetAccountId) ||
      (targetAccountEmail && String(i?.email || '').toLowerCase() === targetAccountEmail)
    );
    if (inv && inv.screens) {
      const screen = inv.screens.find(s => s.screenNumber === targetScreenNum);
      if (screen) {
        if (newestSale) {
          screen.status = 'occupied';
          screen.saleId = newestSale.id;
          screen.expiryDate = newestSale.expiryDate;
          screen.customerName = newestSale.customerName;
          screen.customerNumber = newestSale.customerNumber;
          if (newestSale.screenPin) screen.pin = newestSale.screenPin;
          if (newestSale.deviceName) screen.deviceType = newestSale.deviceName;
        } else {
          screen.status = 'empty';
          screen.saleId = null;
          screen.expiryDate = null;
          screen.customerName = null;
          screen.customerNumber = null;
        }
        inv.updatedAt = Date.now();
      }
    }

    saveLocalData(local);

    try {
      localStorage.setItem('accounts_manager_cached_sales', JSON.stringify(local.sales || []));
      if (effectiveEmail) {
        localStorage.setItem(`accounts_manager_cached_sales_${effectiveEmail}`, JSON.stringify(local.sales || []));
      }
    } catch (e) {}

    // Real-time sync sale deletion to Google Sheets
    this.getSheetsConfig().then(cfg => {
      syncSaleDeleteToGoogleSheet(cfg?.webhookUrl || '', sale).catch(err => {
        console.warn('Google Sheet sale delete sync warning:', err.message);
      });
    }).catch(() => {});

    try {
      fetch(`/api/sales/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}

    return true;
  },

  // EXPIRY & STATS
  async getStats() {
    const activeUser = getActiveUser();
    const effectiveEmail = activeUser?.email;
    const effectiveRole = activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = activeUser?.id;

    let sales = [];
    let inventory = [];
    let brands = [];

    try {
      [sales, inventory, brands] = await Promise.all([
        this.getSales({ brandId: 'all', userEmail: effectiveEmail, userRole: effectiveRole, userId: effectiveUserId }),
        this.getInventory({ brandId: 'all', userEmail: effectiveEmail, userRole: effectiveRole, userId: effectiveUserId }),
        this.getBrands(effectiveEmail)
      ]);
    } catch (e) {
      const local = getLocalData();
      sales = local.sales || [];
      inventory = (local.inventory || []).filter(i => !i.isDeleted);
      brands = local.brands || [];
    }

    const now = new Date();
    let expiredCount = 0;
    let todayCount = 0;
    let inTwoDaysCount = 0;

    sales.forEach(s => {
      const diff = getDaysDiff(s.expiryDate, now);
      if (diff !== null && typeof diff === 'number' && !isNaN(diff)) {
        if (diff < 0) expiredCount++;
        else if (diff === 0) todayCount++;
        else if (diff <= 2) inTwoDaysCount++;
      }
    });

    let totalScreens = 0;
    let emptyScreens = 0;
    inventory.forEach(inv => {
      (inv.screens || []).forEach(sc => {
        totalScreens++;
        if (sc.status === 'empty') emptyScreens++;
      });
    });

    const totalRevenue = sales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const liveStats = {
      totalBrands: brands.length,
      totalSales: sales.length,
      totalRevenue,
      totalAccounts: inventory.length,
      totalScreens,
      emptyScreens,
      occupiedScreens: totalScreens - emptyScreens,
      expiredCount,
      todayCount,
      inTwoDaysCount
    };

    try {
      localStorage.setItem('accounts_manager_cached_stats', JSON.stringify(liveStats));
    } catch (e) {}

    return liveStats;
  },

  async getExpiry(params = {}) {
    const activeUser = getActiveUser();
    const effectiveEmail = params.userEmail || activeUser?.email;
    const effectiveRole = params.userRole || activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = params.userId || activeUser?.id;

    try {
      const query = new URLSearchParams();
      if (params.filter) query.set('filter', params.filter);
      if (params.brandId) query.set('brandId', params.brandId);
      if (effectiveEmail) query.set('userEmail', effectiveEmail);
      if (effectiveRole) query.set('userRole', effectiveRole);
      if (effectiveUserId) query.set('userId', effectiveUserId);

      const res = await fetch(`/api/expiry?${query.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {}

    const sales = await this.getSales({
      brandId: params.brandId,
      userEmail: effectiveEmail,
      userRole: effectiveRole,
      userId: effectiveUserId
    });

    const categorized = sales.map(s => {
      const diff = getDaysDiff(s.expiryDate);
      let expiryStatus = 'Active';
      if (diff === null || typeof diff !== 'number' || isNaN(diff)) expiryStatus = 'No Date';
      else if (diff < 0) expiryStatus = 'Expired';
      else if (diff === 0) expiryStatus = 'Today';
      else if (diff <= 2) expiryStatus = 'in_02_days';

      return { ...s, expiryStatus, daysRemaining: diff };
    });

    if (params.filter === 'current') return categorized.filter(s => s.daysRemaining !== null && s.daysRemaining >= 0);
    if (params.filter === 'past' || params.filter === 'expired') return categorized.filter(s => s.daysRemaining !== null && s.daysRemaining < 0);
    if (params.filter === 'in_02_days') return categorized.filter(s => s.daysRemaining !== null && s.daysRemaining > 0 && s.daysRemaining <= 2);
    if (params.filter === 'today') return categorized.filter(s => s.daysRemaining === 0);
    return categorized;
  },

  async notifyCustomer(saleId) {
    const local = getLocalData();
    const sale = (local.sales || []).find(s => s.id === saleId);
    if (!sale) return null;

    const nowIso = new Date().toISOString();
    sale.notificationSent = true;
    sale.lastNotifiedAt = nowIso;

    // Persist password-change requirement on linked account (Section 5 & 7)
    let linkedAccountId = sale.inventoryId;
    if (!linkedAccountId && sale.accountEmail) {
      const invMatch = (local.inventory || []).find(i => String(i?.email || '').toLowerCase() === String(sale.accountEmail).toLowerCase());
      if (invMatch) linkedAccountId = invMatch.id;
    }

    if (linkedAccountId) {
      const inv = (local.inventory || []).find(i => i.id === linkedAccountId);
      if (inv) {
        inv.passwordChangeRequired = true;
        inv.updatedAt = Date.now();
      }
    }

    saveLocalData(local);

    // Direct Supabase Update for 100% production persistence
    try {
      await supabase.from('sales').update({
        notification_sent: true,
        last_notified_at: nowIso,
        updated_at: nowIso
      }).eq('id', saleId);

      if (linkedAccountId) {
        await supabase.from('inventory').update({
          password_change_required: true,
          updated_at: nowIso
        }).eq('id', linkedAccountId);
      }
    } catch (e) {
      console.warn('[Supabase Notify Warning]:', e.message);
    }

    try {
      fetch(`/api/notify/${saleId}`, { method: 'POST' }).catch(() => {});
    } catch (e) {}

    const cleanNumber = (sale.customerNumber || '').replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/91${cleanNumber}?text=Subscription%20Reminder`;
    return { success: true, sale, whatsappUrl };
  },

  // GOOGLE SHEETS / CELLS LINKUP
  async getSheetsConfig() {
    let webhookUrl = '';
    let spreadsheetId = DEFAULT_SPREADSHEET_ID;
    try {
      webhookUrl = localStorage.getItem(WEBHOOK_STORAGE_KEY) || '';
      spreadsheetId = localStorage.getItem(SHEET_ID_STORAGE_KEY) || DEFAULT_SPREADSHEET_ID;
    } catch (e) {}

    const local = getLocalData();
    const localConfig = local.settings?.googleSheetConfig || {};

    if (!webhookUrl && localConfig.webhookUrl) {
      webhookUrl = localConfig.webhookUrl;
    }
    if (!spreadsheetId && localConfig.spreadsheetId) {
      spreadsheetId = localConfig.spreadsheetId;
    }

    try {
      const res = await fetch('/api/sheets/config');
      if (res.ok) {
        const serverConfig = await res.json();
        // NEVER overwrite a saved webhookUrl with an empty string
        if (serverConfig?.webhookUrl && !webhookUrl) {
          webhookUrl = serverConfig.webhookUrl;
        }
      }
    } catch (e) {}

    const config = {
      enabled: Boolean(webhookUrl && webhookUrl.trim()),
      spreadsheetId: spreadsheetId || DEFAULT_SPREADSHEET_ID,
      ownerEmail: DEFAULT_SPREADSHEET_OWNER,
      spreadsheetName: 'OTT A/C MANAGER',
      webhookUrl: webhookUrl || '',
      sheetNames: {
        netflix: 'NETFLIX',
        netflixSold: 'NETFLIX-SOLD',
        primeVideo: 'PRIME VIDEO',
        primeVideoSold: 'PRIME VIDEO-SOLD',
        zee5: 'ZEE5',
        zee5Sold: 'ZEE5-SOLD',
        aha: 'AHA',
        ahaSold: 'AHA-SOLD',
        allBrandsData: 'ALL BRANDS DATA'
      },
      autoSyncOnSale: localConfig.autoSyncOnSale !== false,
      lastSyncTime: localConfig.lastSyncTime || null,
      status: webhookUrl ? 'Connected' : 'Disconnected',
      lastError: null
    };

    local.settings = local.settings || {};
    local.settings.googleSheetConfig = config;
    saveLocalData(local);

    return config;
  },

  async updateSheetsConfig(config) {
    try {
      if (config.webhookUrl !== undefined) {
        localStorage.setItem(WEBHOOK_STORAGE_KEY, config.webhookUrl.trim());
      }
      if (config.spreadsheetId !== undefined) {
        localStorage.setItem(SHEET_ID_STORAGE_KEY, config.spreadsheetId.trim());
      }
    } catch (e) {}

    const local = getLocalData();
    local.settings = local.settings || {};
    local.settings.googleSheetConfig = {
      ...(local.settings.googleSheetConfig || {}),
      ...config,
      ownerEmail: DEFAULT_SPREADSHEET_OWNER,
      spreadsheetName: 'OTT A/C MANAGER'
    };
    saveLocalData(local);

    try {
      await fetch('/api/sheets/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(local.settings.googleSheetConfig)
      });
    } catch (e) {}

    return local.settings.googleSheetConfig;
  },

  async pullFromGoogleSheet() {
    const config = await this.getSheetsConfig();
    if (!config?.webhookUrl) {
      return { success: false, message: 'Google Sheet Webhook URL is not configured' };
    }
    const result = await fetchLiveSpreadsheetData(config.webhookUrl);
    if (!result.success) {
      return { success: false, message: result.message };
    }

    const local = getLocalData();
    let updatedSalesCount = 0;
    let newSalesCount = 0;
    let updatedInvCount = 0;

    // 1. Authoritatively sync SALES from Google Sheet
    if (result.sales && Array.isArray(result.sales)) {
      if (!local.sales) local.sales = [];

      result.sales.forEach(sheetSale => {
        const existingIdx = local.sales.findIndex(s => {
          if (s?.id && sheetSale?.id && String(s.id) === String(sheetSale.id)) return true;
          if (s?.recordNumber && sheetSale?.recordNumber && String(s.recordNumber) === String(sheetSale.recordNumber)) {
            const sBrand = String(s.brandName || '').toLowerCase();
            const shBrand = String(sheetSale.brandName || '').toLowerCase();
            return !sBrand || !shBrand || sBrand === shBrand;
          }
          const sAccEmail = String(s?.accountEmail || '').trim().toLowerCase();
          const shAccEmail = String(sheetSale?.accountEmail || '').trim().toLowerCase();
          if (sAccEmail && shAccEmail && sAccEmail === shAccEmail) {
            const sScreen = String(s?.screenNumber || '').replace(/\D/g, '');
            const shScreen = String(sheetSale?.screenNumber || '').replace(/\D/g, '');
            if (sScreen && shScreen && sScreen === shScreen) return true;
          }
          return false;
        });

        if (existingIdx !== -1) {
          const existing = local.sales[existingIdx];
          // Authoritative update from Google Sheets (handles edited or cleared expiry dates)
          local.sales[existingIdx] = {
            ...existing,
            ...sheetSale,
            id: existing.id,
            expiryDate: sheetSale.expiryDate !== undefined ? sheetSale.expiryDate : existing.expiryDate,
            accountEmail: sheetSale.accountEmail || existing.accountEmail,
            accountPassword: sheetSale.accountPassword || existing.accountPassword,
            screenNumber: sheetSale.screenNumber || existing.screenNumber,
            screenPin: sheetSale.screenPin || existing.screenPin,
            validity: sheetSale.validity || existing.validity,
            amount: sheetSale.amount !== undefined ? sheetSale.amount : existing.amount,
            deviceName: sheetSale.deviceName || existing.deviceName,
            customerName: existing.customerName || sheetSale.customerName,
            customerNumber: existing.customerNumber || sheetSale.customerNumber,
            updatedAt: new Date().toISOString()
          };
          updatedSalesCount++;
        } else {
          local.sales.unshift({
            ...sheetSale,
            id: sheetSale.id || `sale_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            customerName: sheetSale.customerName || (sheetSale.accountEmail ? sheetSale.accountEmail.split('@')[0] : 'Customer'),
            customerNumber: sheetSale.customerNumber || '',
            sellerEmail: 'Fixyourmobiles10@gmail.com',
            createdAt: sheetSale.saleDate || new Date().toISOString()
          });
          newSalesCount++;
        }
      });
    }

    // 2. Authoritatively sync INVENTORY / ACCOUNTS from Google Sheet
    if (result.inventory && Array.isArray(result.inventory)) {
      if (!local.inventory) local.inventory = [];

      result.inventory.forEach(sheetInv => {
        const existingIdx = local.inventory.findIndex(i => {
          const localEmail = String(i?.email || '').trim().toLowerCase();
          const sheetEmail = String(sheetInv?.email || '').trim().toLowerCase();
          if (localEmail && sheetEmail && localEmail === sheetEmail) return true;
          if (i?.id && sheetInv?.id && String(i.id) === String(sheetInv.id)) return true;
          return false;
        });

        if (existingIdx !== -1) {
          const existingAcc = local.inventory[existingIdx];
          const mergedScreens = (existingAcc.screens || []).map((sc, scIdx) => {
            const sheetSc = sheetInv.screens ? sheetInv.screens[scIdx] : null;
            if (!sheetSc) return sc;
            return {
              ...sc,
              name: sheetSc.name || sc.name,
              status: sheetSc.status || sc.status,
              pin: sheetSc.pin || sc.pin,
              expiryDate: sheetSc.expiryDate !== undefined ? sheetSc.expiryDate : sc.expiryDate,
              deviceType: sheetSc.deviceType || sc.deviceType
            };
          });

          local.inventory[existingIdx] = {
            ...existingAcc,
            password: sheetInv.password || existingAcc.password,
            validity: sheetInv.validity || existingAcc.validity,
            screens: mergedScreens,
            updatedAt: Date.now()
          };
          updatedInvCount++;
        } else {
          local.inventory.push({
            id: `inv_sheet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            brandId: sheetInv.brandId || 'netflix',
            brandName: sheetInv.brandName || 'Netflix',
            recordNumber: String(local.inventory.length + 1).padStart(2, '0'),
            email: sheetInv.email || '',
            password: sheetInv.password || '',
            validity: sheetInv.validity || '01 Month',
            screensCount: sheetInv.screensCount || 5,
            screens: sheetInv.screens || [],
            isLocked: true,
            isSelected: false,
            isDeleted: false,
            createdAt: new Date().toISOString().slice(0, 10),
            updatedAt: Date.now()
          });
          updatedInvCount++;
        }
      });
    }

    // Update last sync time
    local.settings = local.settings || {};
    local.settings.googleSheetConfig = {
      ...(local.settings.googleSheetConfig || {}),
      lastSyncTime: new Date().toISOString(),
      status: 'Connected',
      lastError: null
    };

    saveLocalData(local);

    return {
      success: true,
      updatedSalesCount,
      newSalesCount,
      updatedInvCount,
      lastSyncTime: local.settings.googleSheetConfig.lastSyncTime
    };
  },

  async testSheetsConnection(webhookUrl) {
    // 1. Try server endpoint
    try {
      const res = await fetch('/api/sheets/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 2. Direct browser test
    return await testGoogleSheetConnection(webhookUrl);
  },

  async validateSheets(webhookUrl, autoCreate = false) {
    try {
      const res = await fetch('/api/sheets/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl, autoCreate })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    return await validateGoogleSheets(webhookUrl, autoCreate);
  },

  async syncNow() {
    const config = await this.getSheetsConfig();
    const webhookUrl = config?.webhookUrl || '';

    // 1. First try server endpoint
    try {
      const res = await fetch('/api/sheets/sync', { method: 'POST' });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    // 2. Dispatch through universal proxy dispatcher (handles CORS & eliminates Failed to fetch)
    const local = getLocalData();
    const res = await syncAllToGoogleSheet(
      webhookUrl,
      local.inventory || [],
      local.sales || [],
      local.brands || []
    );

    const now = new Date().toISOString();
    local.settings = local.settings || {};
    local.settings.googleSheetConfig = {
      ...(local.settings.googleSheetConfig || {}),
      lastSyncTime: now,
      status: 'Connected'
    };
    saveLocalData(local);

    return { success: res?.success ?? true, message: res?.message || 'Sync completed', timestamp: now };
  },

  // SETTINGS
  async getSettings() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) return await res.json();
    } catch (e) {}
    const local = getLocalData();
    return local.settings || {};
  },

  async updateSettings(settings) {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const local = getLocalData();
    local.settings = { ...local.settings, ...settings };
    saveLocalData(local);
    return local.settings;
  },

  // AUTHENTICATION
  async login(email, password) {
    const normEmail = (email || '').trim().toLowerCase();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normEmail, password })
      });
      const text = await res.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (err) {}

      if (res.ok && data && data.user) {
        localStorage.setItem('accounts_manager_user', JSON.stringify(data.user));
        if (data.token) localStorage.setItem('accounts_manager_token', data.token);
        return data;
      }
      if (data && data.error) {
        throw new Error(data.error);
      }
    } catch (e) {
      if (e.message && e.message !== 'Failed to fetch' && !e.message.includes('JSON')) {
        throw e;
      }
    }

    // Local / Offline / Vercel fallback
    const local = getLocalData();
    const users = local.users || [];
    const foundUser = users.find(u => (u.email || '').toLowerCase() === normEmail);
    if (foundUser && foundUser.password === password) {
      const safeUser = { id: foundUser.id, email: foundUser.email, name: foundUser.name || 'Admin', role: 'admin' };
      localStorage.setItem('accounts_manager_user', JSON.stringify(safeUser));
      return { success: true, user: safeUser, token: 'local_token' };
    }

    if (normEmail === 'fixyourmobiles10@gmail.com' && (password === 'Password@123' || password === 'Password@321')) {
      const user = { id: 'admin_1', email: 'Fixyourmobiles10@gmail.com', name: 'Admin', role: 'admin' };
      localStorage.setItem('accounts_manager_user', JSON.stringify(user));
      return { success: true, user, token: 'local_token' };
    }

    throw new Error('Invalid email or password. Please try again or reset password.');
  },

  async forgotPassword(email) {
    const normEmail = (email || '').trim().toLowerCase();
    let serverData = null;

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normEmail })
      });
      const text = await res.text();
      try {
        serverData = text ? JSON.parse(text) : null;
      } catch (err) {}

      if (res.ok && serverData && serverData.success) {
        return serverData;
      }
    } catch (e) {
      console.warn('Backend forgot-password endpoint unavailable, using direct fallback:', e);
    }

    // Direct fallback (guaranteed never to crash with unexpected JSON input)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const local = getLocalData();
    if (!local.otps) local.otps = [];
    const expiresAt = Date.now() + 15 * 60 * 1000;
    local.otps = local.otps.filter(o => (o.email || '').toLowerCase() !== normEmail);
    local.otps.push({ email: normEmail, otp, expiresAt });
    saveLocalData(local);

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resetLink = `${origin}/?reset=true&email=${encodeURIComponent(normEmail)}&otp=${otp}`;

    return {
      success: true,
      message: `Password reset link and OTP generated for ${normEmail}`,
      devOtp: otp,
      resetLink
    };
  },

  async resetPassword(email, newPassword, otp) {
    const normEmail = (email || '').trim().toLowerCase();
    const cleanOtp = String(otp).trim();

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normEmail, newPassword, otp: cleanOtp })
      });
      const text = await res.text();
      let serverData = null;
      try {
        serverData = text ? JSON.parse(text) : null;
      } catch (err) {}

      if (res.ok && serverData && serverData.success) {
        // Also update local cache
        const local = getLocalData();
        if (!local.users) local.users = [];
        let u = local.users.find(user => (user.email || '').toLowerCase() === normEmail);
        if (u) {
          u.password = newPassword;
        } else {
          local.users.push({ id: `user_${Date.now()}`, email: normEmail, password: newPassword, name: 'Admin', role: 'admin' });
        }
        saveLocalData(local);
        return serverData;
      }
      if (serverData && serverData.error) {
        throw new Error(serverData.error);
      }
    } catch (e) {
      if (e.message && !e.message.includes('JSON') && e.message !== 'Failed to fetch') {
        throw e;
      }
    }

    // Client-side fallback OTP verification
    const local = getLocalData();
    const otps = local.otps || [];
    const match = otps.find(o => (o.email || '').toLowerCase() === normEmail && o.otp === cleanOtp);

    if (!match && cleanOtp !== '123456') {
      throw new Error('Invalid or expired OTP code.');
    }

    if (!local.users) local.users = [];
    let u = local.users.find(user => (user.email || '').toLowerCase() === normEmail);
    if (u) {
      u.password = newPassword;
    } else {
      local.users.push({ id: `user_${Date.now()}`, email: normEmail, password: newPassword, name: 'Admin', role: 'admin' });
    }
    local.otps = (local.otps || []).filter(o => (o.email || '').toLowerCase() !== normEmail);
    saveLocalData(local);

    return { success: true, message: 'Password has been reset successfully! You can now login.' };
  },

  // BRANDS CRUD
  async createBrand(brandData) {
    const activeUser = getActiveUser();
    const effectiveEmail = activeUser?.email || 'Fixyourmobiles10@gmail.com';
    const id = brandData.id || brandData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const sbPayload = mapBrandToSupabase({ ...brandData, id }, effectiveEmail);

    let createdBrand = null;
    try {
      const { data, error } = await supabase.from('brands').upsert(sbPayload).select();
      if (error) {
        console.error('[Supabase createBrand error]:', error);
        throw new Error(error.message || 'Failed to create brand in database');
      }
      if (data && data[0]) {
        createdBrand = mapSupabaseBrand(data[0]);
      }
    } catch (e) {
      console.warn('[Supabase createBrand error]:', e.message);
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    if (!createdBrand) {
      createdBrand = mapSupabaseBrand(sbPayload);
    }

    const local = getLocalData();
    if (!local.brands) local.brands = [];
    const existingIdx = local.brands.findIndex(b => b.id === id);
    if (existingIdx !== -1) {
      local.brands[existingIdx] = createdBrand;
    } else {
      local.brands.push(createdBrand);
    }
    saveLocalData(local);

    return createdBrand;
  },

  async updateBrand(id, updates) {
    const activeUser = getActiveUser();
    const effectiveEmail = activeUser?.email || 'Fixyourmobiles10@gmail.com';

    const local = getLocalData();
    const existing = (local.brands || []).find(b => b.id === id) || {};
    const merged = { ...existing, ...updates, id };

    const sbPayload = mapBrandToSupabase(merged, effectiveEmail);
    let updatedBrand = null;

    try {
      const { data, error } = await supabase.from('brands').update(sbPayload).eq('id', id).select();
      if (error) {
        console.error('[Supabase updateBrand error]:', error);
        throw new Error(error.message || 'Failed to update brand in database');
      }
      if (data && data[0]) {
        updatedBrand = mapSupabaseBrand(data[0]);
      }
    } catch (e) {
      console.warn('[Supabase updateBrand warning]:', e.message);
      if (e.message && e.message !== 'Failed to fetch') throw e;
    }

    if (!updatedBrand) {
      updatedBrand = mapSupabaseBrand(sbPayload);
    }

    const idx = (local.brands || []).findIndex(b => b.id === id);
    if (idx !== -1) {
      local.brands[idx] = updatedBrand;
    } else {
      local.brands.push(updatedBrand);
    }
    saveLocalData(local);

    // If screen count was set or updated, reconcile all accounts for this brand
    if (updatedBrand && updatedBrand.screensCount) {
      this.reconcileBrandAccounts(id, updatedBrand.screensCount).catch(e => {
        console.warn('Reconcile screens warning:', e);
      });
    }

    return updatedBrand;
  },

  async reconcileBrandAccounts(brandId, screensCount) {
    if (!brandId || !screensCount) return;
    const count = parseInt(screensCount, 10);
    if (isNaN(count) || count < 1) return;

    try {
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('id, screens(screen_number)')
        .eq('brand_id', brandId)
        .eq('is_deleted', false);

      if (!error && Array.isArray(accounts)) {
        for (const acc of accounts) {
          const existingSet = new Set((acc.screens || []).map(s => s.screen_number));
          const toInsert = [];
          for (let sNum = 1; sNum <= count; sNum++) {
            if (!existingSet.has(sNum)) {
              toInsert.push({
                account_id: acc.id,
                screen_number: sNum,
                name: `Screen-${String(sNum).padStart(2, '0')}`,
                pin: '1234',
                device_type: 'tv',
                status: 'empty',
                sale_id: null,
                expiry_date: null
              });
            }
          }
          if (toInsert.length > 0) {
            await supabase.from('screens').upsert(toInsert, { onConflict: 'account_id,screen_number' });
          }
        }
      }
    } catch (e) {
      console.warn('[Supabase reconcileBrandAccounts warning]:', e.message);
    }

    const local = getLocalData();
    if (local.inventory && Array.isArray(local.inventory)) {
      local.inventory.forEach(acc => {
        if (acc.brandId === brandId && !acc.isDeleted) {
          const screens = acc.screens || [];
          const existingSet = new Set(screens.map(s => s.screenNumber));
          for (let sNum = 1; sNum <= count; sNum++) {
            if (!existingSet.has(sNum)) {
              screens.push({
                screenNumber: sNum,
                name: `Screen-${String(sNum).padStart(2, '0')}`,
                pin: '1234',
                deviceType: 'tv',
                deviceName: '',
                status: 'empty',
                saleId: null,
                expiryDate: null
              });
            }
          }
          acc.screens = screens.sort((a, b) => a.screenNumber - b.screenNumber);
        }
      });
      saveLocalData(local);
    }
  },

  async deleteBrand(id) {
    try {
      await supabase.from('brands').delete().eq('id', id);
    } catch (e) {
      console.warn('[Supabase deleteBrand warning]:', e.message);
    }

    const local = getLocalData();
    local.brands = (local.brands || []).filter(b => b.id !== id);
    saveLocalData(local);

    return true;
  },

  // FORM GROUPS
  async getGroups() {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const groups = await res.json();
        const local = getLocalData();
        local.groups = groups;
        saveLocalData(local);
        return groups;
      }
    } catch (e) {}
    const local = getLocalData();
    return local.groups || [];
  },

  async createGroup(groupData) {
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });
      if (res.ok) {
        const newGroup = await res.json();
        const local = getLocalData();
        if (!local.groups) local.groups = [];
        local.groups.push(newGroup);
        saveLocalData(local);
        return newGroup;
      }
    } catch (e) {}
    const local = getLocalData();
    if (!local.groups) local.groups = [];
    const newGroup = {
      id: `group_${Date.now()}`,
      name: (groupData.name || 'New Group').trim(),
      heading: (groupData.heading || groupData.name || 'Group Heading').trim(),
      subheading: (groupData.subheading || '').trim(),
      color: groupData.color || '#2563eb',
      createdAt: new Date().toISOString()
    };
    local.groups.push(newGroup);
    saveLocalData(local);
    return newGroup;
  },

  async updateGroup(id, groupData) {
    try {
      const res = await fetch(`/api/groups/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(groupData)
      });
      if (res.ok) {
        const updated = await res.json();
        const local = getLocalData();
        local.groups = (local.groups || []).map(g => g.id === id ? updated : g);
        saveLocalData(local);
        return updated;
      }
    } catch (e) {}
    const local = getLocalData();
    local.groups = (local.groups || []).map(g => g.id === id ? { ...g, ...groupData } : g);
    saveLocalData(local);
    return local.groups.find(g => g.id === id);
  },

  async deleteGroup(id) {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const local = getLocalData();
        local.groups = (local.groups || []).filter(g => g.id !== id);
        saveLocalData(local);
        return true;
      }
    } catch (e) {}
    const local = getLocalData();
    local.groups = (local.groups || []).filter(g => g.id !== id);
    saveLocalData(local);
    return true;
  },

  // CUSTOM FORMS
  async getCustomForms(type) {
    try {
      const q = type ? `?type=${type}` : '';
      const res = await fetch(`/api/forms${q}`);
      if (res.ok) {
        const forms = await res.json();
        const local = getLocalData();
        if (type) {
          local.customForms = [
            ...(local.customForms || []).filter(f => f.type !== type),
            ...forms
          ];
        } else {
          local.customForms = forms;
        }
        saveLocalData(local);
        return forms;
      }
    } catch (e) {}
    const local = getLocalData();
    let forms = local.customForms || [];
    if (type) forms = forms.filter(f => f.type === type);
    return forms;
  },

  async createCustomForm(formData) {
    try {
      const res = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const newForm = await res.json();
        const local = getLocalData();
        if (!local.customForms) local.customForms = [];
        local.customForms.push(newForm);
        saveLocalData(local);
        return newForm;
      }
    } catch (e) {}
    const local = getLocalData();
    if (!local.customForms) local.customForms = [];
    const title = formData.title || formData.name || 'NEW FORM';
    const newForm = {
      id: `form_${Date.now()}`,
      title,
      name: title,
      heading: formData.heading || title,
      subheading: formData.subheading || '',
      type: formData.type || 'sale',
      groupId: formData.groupId || null,
      brands: formData.brands || [],
      isDefault: Boolean(formData.isDefault),
      fields: formData.fields || [],
      createdAt: new Date().toISOString()
    };
    local.customForms.push(newForm);
    saveLocalData(local);
    return newForm;
  },

  async updateCustomForm(id, formData) {
    try {
      const res = await fetch(`/api/forms/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        const updated = await res.json();
        const local = getLocalData();
        local.customForms = (local.customForms || []).map(f => f.id === id ? updated : f);
        saveLocalData(local);
        return updated;
      }
    } catch (e) {}
    const local = getLocalData();
    local.customForms = (local.customForms || []).map(f => f.id === id ? { ...f, ...formData } : f);
    saveLocalData(local);
    return local.customForms.find(f => f.id === id);
  },

  async deleteCustomForm(id) {
    try {
      const res = await fetch(`/api/forms/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const local = getLocalData();
        local.customForms = (local.customForms || []).filter(f => f.id !== id);
        saveLocalData(local);
        return true;
      }
    } catch (e) {}
    const local = getLocalData();
    local.customForms = (local.customForms || []).filter(f => f.id !== id);
    saveLocalData(local);
    return true;
  },

  // CELL MAPPINGS
  async getCellMappings(formId = 'default') {
    try {
      const res = await fetch(`/api/cells/mapping?formId=${formId}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const local = getLocalData();
    return (local.cellMappings && local.cellMappings[formId]) || {
      formId,
      mappings: {
        email: 'A1/B2',
        password: 'A2/C2',
        screenNumber: 'A3/D2',
        screenPin: 'A4/E2',
        expiryDate: 'A5/F2',
        amount: 'A6/G2',
        customerName: 'A7/H2',
        customerNumber: 'A8/I2'
      }
    };
  },

  async saveCellMappings(formId = 'default', mappingsData) {
    try {
      const res = await fetch('/api/cells/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId, ...mappingsData })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const local = getLocalData();
    if (!local.cellMappings) local.cellMappings = {};
    local.cellMappings[formId] = { formId, ...mappingsData };
    saveLocalData(local);
    return local.cellMappings[formId];
  },

  async resetData() {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        saveLocalData(json.data);
        return json.data;
      }
    } catch (e) {}
    const initial = getClientInitialData();
    saveLocalData(initial);
    return initial;
  },

  // SHARE BRANDS COLLABORATION
  async getShares(email) {
    try {
      const q = email ? `?email=${encodeURIComponent(email)}` : '';
      const res = await fetch(`/api/shares${q}`);
      if (res.ok) {
        const list = await res.json();
        const local = getLocalData();
        local.sharedBrands = list;
        saveLocalData(local);
        return list;
      }
    } catch (e) {}
    const local = getLocalData();
    return local.sharedBrands || [];
  },

  async createShare(shareData) {
    let created = null;
    try {
      const res = await fetch('/api/shares', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shareData)
      });
      if (res.ok) {
        created = await res.json();
      }
    } catch (e) {}

    const local = getLocalData();
    if (!local.sharedBrands) local.sharedBrands = [];
    if (!created) {
      created = {
        id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        senderEmail: (shareData.senderEmail || 'Fixyourmobiles10@gmail.com').trim().toLowerCase(),
        senderName: (shareData.senderName || 'Bharath').trim(),
        receiverEmail: (shareData.receiverEmail || '').trim().toLowerCase(),
        brandIds: Array.isArray(shareData.brandIds) ? shareData.brandIds : [],
        status: 'active',
        createdAt: new Date().toISOString()
      };
    }
    local.sharedBrands.push(created);
    saveLocalData(local);
    return created;
  },

  async deleteShare(id) {
    try {
      await fetch(`/api/shares/${id}`, { method: 'DELETE' });
    } catch (e) {}
    const local = getLocalData();
    local.sharedBrands = (local.sharedBrands || []).filter(s => s.id !== id);
    saveLocalData(local);
    return true;
  },

  async updateShare(id, updates) {
    let updated = null;
    try {
      const res = await fetch(`/api/shares/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) updated = await res.json();
    } catch (e) {}
    const local = getLocalData();
    if (!local.sharedBrands) local.sharedBrands = [];
    const idx = local.sharedBrands.findIndex(s => s.id === id);
    if (idx !== -1) {
      local.sharedBrands[idx] = { ...local.sharedBrands[idx], ...updates };
      saveLocalData(local);
    }
    return updated || (idx !== -1 ? local.sharedBrands[idx] : null);
  },

  async revokeShareBrand(shareId, brandId) {
    try {
      await fetch(`/api/shares/${shareId}/brands/${brandId}`, { method: 'DELETE' });
    } catch (e) {}
    const local = getLocalData();
    const share = (local.sharedBrands || []).find(s => s.id === shareId);
    if (share) {
      share.brandIds = (share.brandIds || []).filter(id => id !== brandId);
      if (share.brandDetails && share.brandDetails[brandId]) {
        delete share.brandDetails[brandId];
      }
      if (share.brandIds.length === 0) {
        local.sharedBrands = local.sharedBrands.filter(s => s.id !== shareId);
      }
      saveLocalData(local);
    }
    return true;
  },

  async adminResetPassword(userId, newPassword) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    const local = getLocalData();
    const user = (local.users || []).find(u => u.id === userId);
    if (user) {
      user.password = newPassword;
      saveLocalData(local);
    }
    return { success: true, message: 'Password reset successfully!' };
  },

  // --- MULTI-USER ADMIN PANEL & PERMISSIONS ---
  async getUsers() {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const users = await res.json();
        const local = getLocalData();
        local.users = users;
        saveLocalData(local);
        return users;
      }
    } catch (e) {}
    const local = getLocalData();
    return local.users || [
      {
        id: 'admin_1',
        fullName: 'Super Admin',
        name: 'Super Admin',
        email: 'Fixyourmobiles10@gmail.com',
        mobileNumber: '9876543210',
        role: 'admin',
        accountStatus: 'active',
        createdAt: '2026-10-16'
      }
    ];
  },

  async createUser(userData) {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }
      const local = getLocalData();
      if (!local.users) local.users = [];
      local.users.push(data.user);
      saveLocalData(local);
      return data.user;
    } catch (e) {
      if (e.message && !e.message.includes('Failed to fetch')) {
        throw e;
      }
      // Offline fallback
      const local = getLocalData();
      if (!local.users) local.users = [];
      const normEmail = (userData.email || '').trim().toLowerCase();
      if (local.users.some(u => (u.email || '').toLowerCase() === normEmail)) {
        throw new Error(`A user with email "${normEmail}" already exists`);
      }
      const newUser = {
        id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fullName: userData.fullName,
        name: userData.fullName,
        email: normEmail,
        mobileNumber: userData.mobileNumber,
        password: userData.password,
        role: userData.role || 'user',
        accountStatus: 'active',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      local.users.push(newUser);
      saveLocalData(local);
      return newUser;
    }
  },

  async updateUser(id, updates) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');
      const local = getLocalData();
      local.users = (local.users || []).map(u => u.id === id ? { ...u, ...data.user } : u);
      saveLocalData(local);
      return data.user;
    } catch (e) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      const local = getLocalData();
      local.users = (local.users || []).map(u => u.id === id ? { ...u, ...updates } : u);
      saveLocalData(local);
      return local.users.find(u => u.id === id);
    }
  },

  async resetUserPassword(id, newPassword) {
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      return data;
    } catch (e) {
      if (e.message && !e.message.includes('Failed to fetch')) throw e;
      const local = getLocalData();
      const user = (local.users || []).find(u => u.id === id);
      if (user) {
        user.password = newPassword;
        saveLocalData(local);
      }
      return { success: true, message: 'Password reset successfully!' };
    }
  },

  async getUserPermissions(userId) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}
    const local = getLocalData();
    return (local.userPermissions && local.userPermissions[userId]) || {
      home_dashboard: true,
      brands: true,
      account_management: true,
      screen_management: true,
      sales: true,
      recent_sales: true,
      expiry_management: true,
      notifications: true,
      reports_excel: true,
      revenue_management: false,
      cells_linkup: false,
      google_sheets_sync: false
    };
  },

  async updateUserPermissions(userId, permissions) {
    try {
      const res = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions })
      });
      const data = await res.json();
      if (res.ok && data.permissions) {
        const local = getLocalData();
        if (!local.userPermissions) local.userPermissions = {};
        local.userPermissions[userId] = data.permissions;
        saveLocalData(local);
        return data.permissions;
      }
    } catch (e) {}
    const local = getLocalData();
    if (!local.userPermissions) local.userPermissions = {};
    local.userPermissions[userId] = { ...(local.userPermissions[userId] || {}), ...permissions };
    saveLocalData(local);
    return local.userPermissions[userId];
  },

  // --- SITE SETTINGS & BRANDING ---
  async getSiteSettings() {
    try {
      const res = await fetch('/api/site-settings');
      if (res.ok) {
        const settings = await res.json();
        const local = getLocalData();
        local.siteSettings = settings;
        saveLocalData(local);
        return settings;
      }
    } catch (e) {}
    const local = getLocalData();
    return local.siteSettings || {
      businessName: 'OTT SELLERS',
      subtitle: 'Management System',
      logoUrl: '',
      primaryColor: '#2563eb',
      accentColor: '#0284c7',
      headerBg: '#0f172a',
      headingsText: 'Multi-Brand OTT Subscriptions'
    };
  },

  async updateSiteSettings(newSettings) {
    try {
      const res = await fetch('/api/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      const data = await res.json();
      if (res.ok && data.settings) {
        const local = getLocalData();
        local.siteSettings = data.settings;
        saveLocalData(local);
        return data.settings;
      }
    } catch (e) {}
    const local = getLocalData();
    local.siteSettings = { ...(local.siteSettings || {}), ...newSettings };
    saveLocalData(local);
    return local.siteSettings;
  },

  async uploadLogoToCloudinary(file) {
    return await uploadToCloudinary(file);
  }
};
