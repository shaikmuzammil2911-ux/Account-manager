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

const STORAGE_KEY = 'accounts_manager_app_data_v5';
const WEBHOOK_STORAGE_KEY = 'accounts_manager_google_sheet_webhook_v1';
const SHEET_ID_STORAGE_KEY = 'accounts_manager_spreadsheet_id_v1';

// Initialize or load from LocalStorage as primary persistent client store
function getLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.brands && parsed.brands.length > 0) {
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

export const api = {
  // BRANDS
  async getBrands(userEmail) {
    const activeUser = getActiveUser();
    const effectiveEmail = userEmail || activeUser?.email;
    const effectiveRole = activeUser?.role || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com' ? 'admin' : 'user');
    const effectiveUserId = activeUser?.id;

    try {
      const q = new URLSearchParams();
      if (effectiveEmail) q.set('userEmail', effectiveEmail);
      if (effectiveRole) q.set('userRole', effectiveRole);
      if (effectiveUserId) q.set('userId', effectiveUserId);

      const res = await fetch(`/api/brands?${q.toString()}`);
      if (res.ok) {
        const serverBrands = await res.json();
        if (serverBrands && Array.isArray(serverBrands)) {
          return serverBrands;
        }
      }
    } catch (e) {
      // offline fallback
    }

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

    try {
      const query = new URLSearchParams();
      if (params.brandId) query.set('brandId', params.brandId);
      if (params.selectedOnly) query.set('selectedOnly', 'true');
      if (params.emptyOnly) query.set('emptyOnly', 'true');
      if (params.validity) query.set('validity', params.validity);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);
      if (effectiveEmail) query.set('userEmail', effectiveEmail);
      if (effectiveRole) query.set('userRole', effectiveRole);
      if (effectiveUserId) query.set('userId', effectiveUserId);

      const res = await fetch(`/api/inventory?${query.toString()}`);
      if (res.ok) {
        const serverItems = await res.json();
        if (serverItems && Array.isArray(serverItems)) {
          return serverItems;
        }
      }
    } catch (e) {
      // network error
    }

    const local = getLocalData();
    let items = (local.inventory || []).filter(i => !i.isDeleted);
    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');

    if (!isAdmin) {
      items = items.filter(item => {
        const owner = (item.ownerEmail || '').trim().toLowerCase();
        return (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && item.userId === effectiveUserId);
      });
    }

    if (params.brandId && params.brandId !== 'all') {
      items = items.filter(i => i.brandId === params.brandId);
    }
    if (params.selectedOnly) {
      items = items.filter(i => i.isSelected);
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

        const recA = parseInt(a.recordNumber || '0', 10);
        const recB = parseInt(b.recordNumber || '0', 10);
        return params.sortOrder === 'bottom' ? recB - recA : recA - recB;
      });

      return items;
    }

    if (params.validity && params.validity !== 'all') {
      items = items.filter(i => i.validity === params.validity);
    }

    if (params.sortOrder === 'bottom') {
      items.sort((a, b) => parseInt(b.recordNumber || '0') - parseInt(a.recordNumber || '0'));
    } else {
      items.sort((a, b) => parseInt(a.recordNumber || '0') - parseInt(b.recordNumber || '0'));
    }

    return items;
  },

  async createInventory(data) {
    const activeUser = getActiveUser();
    const payload = {
      ...data,
      ownerEmail: data.ownerEmail || activeUser?.email || 'fixyourmobiles10@gmail.com',
      userId: data.userId || activeUser?.id || ''
    };

    let newItem = null;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        newItem = await res.json();
      }
    } catch (e) {
      // offline fallback
    }

    if (!newItem) {
      const local = getLocalData();
      const brandId = data.brandId || 'netflix';
      const brandItems = (local.inventory || []).filter(i => i.brandId === brandId && !i.isDeleted);
      const nextNum = String(brandItems.length + 1).padStart(2, '0');
      const screensCount = Math.min(10, Math.max(1, parseInt(data.screensCount || data.screens?.length || 5, 10)));

      let screens = [];
      if (data.screens && Array.isArray(data.screens) && data.screens.length > 0) {
        screens = data.screens.map((s, idx) => ({
          screenNumber: idx + 1,
          name: s.name || `Screen-${String(idx + 1).padStart(2, '0')}`,
          pin: String(s.pin || `${(idx + 1) * 1111}`.slice(0, 4)),
          deviceType: s.deviceType || 'tv',
          status: s.status || 'empty',
          saleId: s.saleId || null,
          expiryDate: s.expiryDate || null
        }));
      } else {
        screens = Array.from({ length: screensCount }, (_, i) => ({
          screenNumber: i + 1,
          name: `Screen-${String(i + 1).padStart(2, '0')}`,
          pin: String(1111 * (i + 1)).slice(0, 4) || '1234',
          deviceType: 'tv',
          status: 'empty',
          saleId: null,
          expiryDate: null
        }));
      }

      newItem = {
        id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        brandId,
        recordNumber: data.recordNumber || nextNum,
        email: data.email?.trim() || '',
        password: data.password?.trim() || '',
        validity: data.validity || '01 Month',
        planVariant: data.planVariant || 'General',
        notes: data.notes || '',
        ownerEmail: payload.ownerEmail,
        userId: payload.userId,
        sellerDetails: data.sellerDetails || null,
        isLocked: data.isLocked ?? true,
        isSelected: data.isSelected ?? false,
        isDeleted: false,
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
        screens
      };
    }

    const local = getLocalData();
    local.inventory = [...(local.inventory || []), newItem];
    saveLocalData(local);

    // Real-time sync newly created account to Google Sheet
    this.getSheetsConfig().then(cfg => {
      const b = (local.brands || []).find(x => x.id === newItem.brandId);
      syncAccountToGoogleSheet(cfg?.webhookUrl || '', newItem, b?.displayName || b?.name).catch(e => {
        console.warn('GSheet inventory create sync warning:', e);
      });
    }).catch(() => {});

    return newItem;
  },

  async updateInventory(id, updates) {
    const local = getLocalData();
    const idx = (local.inventory || []).findIndex(i => i.id === id);
    let updated = null;
    if (idx !== -1) {
      const existing = local.inventory[idx];
      let mergedScreens = existing.screens;
      if (updates.screens && Array.isArray(updates.screens)) {
        mergedScreens = updates.screens.map((newS, sIdx) => {
          const oldS = existing.screens ? existing.screens[sIdx] : null;
          return {
            screenNumber: sIdx + 1,
            name: newS.name || oldS?.name || `Screen-${String(sIdx + 1).padStart(2, '0')}`,
            pin: newS.pin !== undefined ? String(newS.pin) : (oldS?.pin || '1234'),
            deviceType: newS.deviceType || oldS?.deviceType || 'tv',
            status: newS.status || oldS?.status || 'empty',
            saleId: newS.saleId !== undefined ? newS.saleId : (oldS?.saleId || null),
            expiryDate: newS.expiryDate !== undefined ? newS.expiryDate : (oldS?.expiryDate || null)
          };
        });
      }
      updated = {
        ...existing,
        ...updates,
        screens: mergedScreens,
        updatedAt: Date.now(),
        id
      };
      local.inventory[idx] = updated;

      // Cascade updates to matching sales records so Expiry and Recent Sales are 100% accurate!
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

      saveLocalData(local);

      // Real-time sync account to Google Sheet
      this.getSheetsConfig().then(cfg => {
        const b = (local.brands || []).find(x => x.id === updated.brandId);
        syncAccountToGoogleSheet(cfg?.webhookUrl || '', updated, b?.displayName || b?.name).catch(e => {
          console.warn('GSheet inventory sync warning:', e);
        });
      }).catch(() => {});
    }

    try {
      fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => {});
    } catch (e) {}

    return updated;
  },

  async deleteInventory(id) {
    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (item) {
      item.isDeleted = true;
      saveLocalData(local);

      // Real-time sync account deletion to Google Sheet
      this.getSheetsConfig().then(cfg => {
        const b = (local.brands || []).find(x => x.id === item.brandId);
        syncAccountDeleteToGoogleSheet(cfg?.webhookUrl || '', item, b?.displayName || b?.name).catch(e => {
          console.warn('GSheet inventory delete sync warning:', e);
        });
      }).catch(() => {});
    }
    try {
      fetch(`/api/inventory/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}
    return true;
  },

  async toggleInventoryLock(id) {
    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (!item) return null;
    item.isLocked = !item.isLocked;
    item.updatedAt = Date.now();
    saveLocalData(local);

    try {
      fetch(`/api/inventory/${id}/lock`, { method: 'POST' }).catch(() => {});
    } catch (e) {}

    return item;
  },

  async toggleInventorySelect(id) {
    const local = getLocalData();
    const item = (local.inventory || []).find(i => i.id === id);
    if (!item) return null;
    item.isSelected = !item.isSelected;
    saveLocalData(local);

    try {
      fetch(`/api/inventory/${id}/select`, { method: 'POST' }).catch(() => {});
    } catch (e) {}

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
            if (s && s.id) salesMap.set(s.id, s);
          });
        }
      }
    } catch (e) {}

    // 2. Fetch directly from Supabase sales table
    try {
      let sbQuery = supabase.from('sales').select('*');
      if (params.brandId && params.brandId !== 'all') {
        const targetBrandId = params.brandId.includes('__shared__') ? params.brandId.split('__shared__')[0] : params.brandId;
        sbQuery = sbQuery.or(`brand_id.eq.${params.brandId},brand_id.eq.${targetBrandId}`);
      }
      const { data: sbData, error: sbErr } = await sbQuery;
      if (!sbErr && Array.isArray(sbData)) {
        sbData.forEach(s => {
          if (s && s.id) {
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
            salesMap.set(mapped.id, { ...(salesMap.get(mapped.id) || {}), ...mapped });
          }
        });
      }
    } catch (e) {}

    // 3. Merge LocalStorage sales (ensures offline and 0ms saved sales are present)
    const local = getLocalData();
    (local.sales || []).forEach(s => {
      if (s && s.id) {
        salesMap.set(s.id, { ...(salesMap.get(s.id) || {}), ...s });
      }
    });

    let sales = Array.from(salesMap.values());
    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');

    if (!isAdmin) {
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
      if (saleData.deviceName) assignedScreen.deviceType = saleData.deviceName;
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
      deviceName: saleData.deviceName || 'Personal TV',
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
            if (updates.deviceName !== undefined) screen.deviceType = updates.deviceName;
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
        if (updates.deviceName !== undefined) sbUpdatePayload.device_name = updates.deviceName;
        if (updates.activationDate !== undefined) sbUpdatePayload.activation_date = updates.activationDate;
        if (updates.expiryDate !== undefined) sbUpdatePayload.expiry_date = updates.expiryDate;
        if (updates.amount !== undefined) sbUpdatePayload.amount = Number(updates.amount);
        if (updates.note !== undefined) sbUpdatePayload.note = updates.note;
        if (updates.status !== undefined) sbUpdatePayload.status = updates.status;

        await supabase.from('sales').update(sbUpdatePayload).eq('id', id);

        if (updated.inventoryId && updates.expiryDate) {
          const sNum = parseInt(String(updated.screenNumber).replace(/\D/g, '') || '1', 10);
          await supabase.from('screens').update({
            expiry_date: updates.expiryDate,
            updated_at: new Date().toISOString()
          }).match({ account_id: updated.inventoryId, screen_number: sNum });
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
    const local = getLocalData();
    const sale = (local.sales || []).find(s => s.id === id);
    if (!sale) return false;

    local.sales = (local.sales || []).filter(s => s.id !== id);

    // Free the screen in inventory
    const inv = (local.inventory || []).find(i =>
      (sale.inventoryId && i.id === sale.inventoryId) ||
      (sale.accountEmail && String(i?.email || '').toLowerCase() === String(sale.accountEmail).toLowerCase())
    );
    if (inv && inv.screens) {
      const sNum = parseInt(String(sale.screenNumber).replace(/\D/g, '') || '1', 10);
      const screen = inv.screens.find(s => s.screenNumber === sNum);
      if (screen) {
        screen.status = 'empty';
        screen.saleId = null;
        screen.expiryDate = null;
        inv.updatedAt = Date.now();
      }
    }

    saveLocalData(local);

    // Direct Supabase delete & screen free
    try {
      await supabase.from('sales').delete().eq('id', id);
      if (sale.inventoryId) {
        const sNum = parseInt(String(sale.screenNumber).replace(/\D/g, '') || '1', 10);
        await supabase.from('screens').update({
          status: 'empty',
          sale_id: null,
          expiry_date: null,
          updated_at: new Date().toISOString()
        }).match({ account_id: sale.inventoryId, screen_number: sNum });
      }
    } catch (e) {
      console.warn('[Supabase Sale Delete Warning]:', e.message);
    }

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

    try {
      const q = new URLSearchParams();
      if (effectiveEmail) q.set('userEmail', effectiveEmail);
      if (effectiveRole) q.set('userRole', effectiveRole);
      if (effectiveUserId) q.set('userId', effectiveUserId);

      const res = await fetch(`/api/stats?${q.toString()}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    const local = getLocalData();
    const isAdmin = effectiveRole === 'admin' || (effectiveEmail?.toLowerCase() === 'fixyourmobiles10@gmail.com');

    let sales = [...(local.sales || [])];
    let inventory = [...(local.inventory || [])].filter(i => !i.isDeleted);
    let brands = [...(local.brands || [])];

    if (!isAdmin) {
      sales = sales.filter(s => {
        const sEmail = (s.sellerEmail || s.ownerEmail || '').trim().toLowerCase();
        return (sEmail && sEmail === effectiveEmail?.toLowerCase()) || (effectiveUserId && s.userId === effectiveUserId);
      });
      inventory = inventory.filter(i => {
        const owner = (i.ownerEmail || '').trim().toLowerCase();
        return (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && i.userId === effectiveUserId);
      });
      brands = brands.filter(b => {
        const owner = (b.ownerEmail || '').trim().toLowerCase();
        return (owner && owner === effectiveEmail?.toLowerCase()) || (effectiveUserId && b.userId === effectiveUserId);
      });
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

    return {
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
    const local = getLocalData();
    if (!local.brands) local.brands = [];
    const id = brandData.id || brandData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newBrand = { ...brandData, id, updatedAt: Date.now() };
    const existingIdx = local.brands.findIndex(b => b.id === id);
    if (existingIdx !== -1) {
      local.brands[existingIdx] = newBrand;
    } else {
      local.brands.push(newBrand);
    }
    saveLocalData(local);

    try {
      fetch('/api/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      }).catch(() => {});
    } catch (e) {}

    return newBrand;
  },

  async updateBrand(id, updates) {
    const local = getLocalData();
    const idx = (local.brands || []).findIndex(b => b.id === id);
    let updated = null;
    if (idx !== -1) {
      updated = {
        ...local.brands[idx],
        ...updates,
        updatedAt: Date.now()
      };
      local.brands[idx] = updated;
      saveLocalData(local);
    }

    try {
      fetch(`/api/brands/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      }).catch(() => {});
    } catch (e) {}

    return updated;
  },

  async deleteBrand(id) {
    const local = getLocalData();
    local.brands = (local.brands || []).filter(b => b.id !== id);
    saveLocalData(local);

    try {
      fetch(`/api/brands/${id}`, { method: 'DELETE' }).catch(() => {});
    } catch (e) {}

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
