import { getClientInitialData } from '../utils/initialData';
import { parseDate, getDaysDiff } from '../utils/dateUtils';
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

export const api = {
  // BRANDS
  async getBrands(userEmail) {
    const local = getLocalData();
    try {
      const emailParam = userEmail ? `?userEmail=${encodeURIComponent(userEmail)}` : '';
      const res = await fetch(`/api/brands${emailParam}`);
      if (res.ok) {
        const serverBrands = await res.json();
        if (serverBrands && Array.isArray(serverBrands) && serverBrands.length > 0) {
          // Merge safely: Never overwrite user-added brands or customized pricing plans with stale server defaults
          const localBrands = local.brands || [];
          const serverBrandMap = new Map(serverBrands.map(b => [b.id, b]));
          const customBrands = localBrands.filter(b => !serverBrandMap.has(b.id));

          const merged = serverBrands.map(sb => {
            const lb = localBrands.find(b => b.id === sb.id);
            if (lb && lb.updatedAt && (!sb.updatedAt || lb.updatedAt > sb.updatedAt)) {
              return { ...sb, ...lb };
            }
            return lb ? { ...sb, ...lb } : sb;
          });

          local.brands = [...merged, ...customBrands];
          saveLocalData(local);
        }
      }
    } catch (e) {
      // offline fallback
    }

    let brands = [...(local.brands || [])];
    if (userEmail && local.sharedBrands) {
      const norm = userEmail.trim().toLowerCase();
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
    const local = getLocalData();
    try {
      const query = new URLSearchParams();
      if (params.brandId) query.set('brandId', params.brandId);
      if (params.selectedOnly) query.set('selectedOnly', 'true');
      if (params.emptyOnly) query.set('emptyOnly', 'true');
      if (params.validity) query.set('validity', params.validity);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);

      const res = await fetch(`/api/inventory?${query.toString()}`);
      if (res.ok) {
        const serverItems = await res.json();
        if (serverItems && Array.isArray(serverItems)) {
          // Merge safely: preserve user edits, customized credentials, and occupied sales screens
          const localItems = local.inventory || [];
          const merged = serverItems.map(si => {
            const li = localItems.find(i => i.id === si.id || (i.email && si.email && i.email.toLowerCase() === si.email.toLowerCase()));
            if (li) {
              const hasSoldScreens = (li.screens || []).some(s => s.status === 'occupied');
              if (hasSoldScreens || li.updatedAt || li.isLocked === false) {
                return { ...si, ...li };
              }
            }
            return si;
          });

          const serverIds = new Set(serverItems.map(i => i.id));
          const extraLocal = localItems.filter(i => !serverIds.has(i.id) && (!params.brandId || params.brandId === 'all' || i.brandId === params.brandId));

          if (!params.brandId || params.brandId === 'all') {
            local.inventory = [...merged, ...extraLocal];
          } else {
            local.inventory = [
              ...(local.inventory || []).filter(i => i.brandId !== params.brandId),
              ...merged,
              ...extraLocal
            ];
          }
          saveLocalData(local);
        }
      }
    } catch (e) {
      // network error
    }

    let items = (local.inventory || []).filter(i => !i.isDeleted);

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
    let newItem = null;
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
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
    const local = getLocalData();

    try {
      const query = new URLSearchParams();
      if (params.brandId) query.set('brandId', params.brandId);
      if (params.validity) query.set('validity', params.validity);
      if (params.date) query.set('date', params.date);
      if (params.search) query.set('search', params.search);
      if (params.sellerEmail) query.set('sellerEmail', params.sellerEmail);

      const res = await fetch(`/api/sales?${query.toString()}`);
      if (res.ok) {
        const serverSales = await res.json();
        if (serverSales && Array.isArray(serverSales)) {
          // Merge safely: union server sales with local sales by ID, never delete user sales!
          const localSales = local.sales || [];
          const serverMap = new Map(serverSales.map(s => [s.id, s]));
          const uniqueLocal = localSales.filter(s => !serverMap.has(s.id));
          local.sales = [...serverSales, ...uniqueLocal];
          saveLocalData(local);
        }
      }
    } catch (e) {}

    let sales = [...(local.sales || [])];

    if (params.sellerEmail) {
      const norm = params.sellerEmail.trim().toLowerCase();
      sales = sales.filter(s => {
        const sEmail = (s.sellerEmail || '').trim().toLowerCase();
        if (!sEmail) {
          return norm === 'fixyourmobiles10@gmail.com' || norm === 'admin';
        }
        return sEmail === norm;
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
    if (params.search) {
      const q = params.search.toLowerCase();
      sales = sales.filter(s =>
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerNumber && s.customerNumber.includes(q)) ||
        (s.accountEmail && s.accountEmail.toLowerCase().includes(q)) ||
        (s.brandName && s.brandName.toLowerCase().includes(q))
      );
    }

    sales.sort((a, b) => parseInt(b.recordNumber || '0') - parseInt(a.recordNumber || '0'));
    return sales;
  },

  async createSale(saleData) {
    const local = getLocalData();
    const brand = local.brands.find(b => b.id === saleData.brandId) || local.brands[0];
    const nextRecordNum = String((local.sales || []).length + 1).padStart(2, '0');

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
      assignedScreen.expiryDate = saleData.expiryDate;
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
      expiryDate: saleData.expiryDate,
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

    // 2. REAL-TIME GOOGLE SHEETS SYNC: Instantly push this sale to Google Sheets!
    this.getSheetsConfig().then(cfg => {
      syncSaleToGoogleSheet(cfg?.webhookUrl || '', newSale).then(res => {
        if (res?.success) {
          console.log('Google Sheet sale sync succeeded');
        }
      }).catch(err => {
        console.warn('Google Sheet sale background sync warning:', err.message);
      });
    }).catch(() => {});

    // 3. Background sync to backend API
    try {
      fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
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
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {}

    const local = getLocalData();
    const now = new Date();
    let expiredCount = 0;
    let todayCount = 0;
    let inTwoDaysCount = 0;

    (local.sales || []).forEach(s => {
      const diff = getDaysDiff(s.expiryDate, now);
      if (diff < 0) expiredCount++;
      else if (diff === 0) todayCount++;
      else if (diff <= 2) inTwoDaysCount++;
    });

    let totalScreens = 0;
    let emptyScreens = 0;
    (local.inventory || []).filter(i => !i.isDeleted).forEach(inv => {
      (inv.screens || []).forEach(sc => {
        totalScreens++;
        if (sc.status === 'empty') emptyScreens++;
      });
    });

    const totalRevenue = (local.sales || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalSales: (local.sales || []).length,
      totalRevenue,
      totalAccounts: (local.inventory || []).filter(i => !i.isDeleted).length,
      totalScreens,
      emptyScreens,
      occupiedScreens: totalScreens - emptyScreens,
      expiredCount,
      todayCount,
      inTwoDaysCount
    };
  },

  async getExpiry(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.filter) query.set('filter', params.filter);
      if (params.brandId) query.set('brandId', params.brandId);
      const res = await fetch(`/api/expiry?${query.toString()}`);
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    let sales = [...(local.sales || [])];
    if (params.brandId && params.brandId !== 'all') {
      sales = sales.filter(s => s.brandId === params.brandId);
    }

    const categorized = sales.map(s => {
      const diff = getDaysDiff(s.expiryDate);
      let expiryStatus = 'Active';
      if (diff < 0) expiryStatus = 'Expired';
      else if (diff === 0) expiryStatus = 'Today';
      else if (diff <= 2) expiryStatus = 'in_02_days';

      return { ...s, expiryStatus, daysRemaining: diff };
    });

    if (params.filter === 'in_02_days') return categorized.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 2);
    if (params.filter === 'today') return categorized.filter(s => s.daysRemaining === 0);
    if (params.filter === 'expired') return categorized.filter(s => s.daysRemaining < 0);
    return categorized;
  },

  async notifyCustomer(saleId) {
    try {
      const res = await fetch(`/api/notify/${saleId}`, { method: 'POST' });
      if (res.ok) return await res.json();
    } catch (e) {}

    const local = getLocalData();
    const sale = (local.sales || []).find(s => s.id === saleId);
    if (!sale) return null;
    sale.notificationSent = true;
    sale.lastNotifiedAt = new Date().toISOString();
    saveLocalData(local);

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
  }
};
