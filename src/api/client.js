import { getClientInitialData } from '../utils/initialData';
import { parseDate, getDaysDiff } from '../utils/dateUtils';
import { syncSaleToGoogleSheet, syncAllSalesToGoogleSheet, downloadSalesCsv, DEFAULT_CELL_MAPPINGS } from '../utils/googleSheets';

const STORAGE_KEY = 'accounts_manager_app_data_v3';

// Initialize or load from LocalStorage
function getLocalData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.brands && parsed.brands.length > 0) {
        // Ensure default settings structure exists if upgraded
        if (!parsed.settings?.saleFormFields) {
          const init = getClientInitialData();
          parsed.settings = { ...init.settings, ...parsed.settings };
          saveLocalData(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('LocalStorage read error, initializing defaults', err);
  }

  const initial = getClientInitialData();
  saveLocalData(initial);
  return initial;
}

function saveLocalData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.warn('LocalStorage save error', err);
  }
}

export const api = {
  async getBrands() {
    const local = getLocalData();
    fetch('/api/brands')
      .then(res => res.ok ? res.json() : null)
      .then(serverBrands => {
        if (serverBrands && serverBrands.length > 0) {
          const current = getLocalData();
          current.brands = serverBrands;
          saveLocalData(current);
        }
      })
      .catch(() => {});

    return local.brands || [];
  },

  async getInventory(params = {}) {
    const local = getLocalData();
    let items = [...(local.inventory || [])];

    if (params.brandId && params.brandId !== 'all') {
      items = items.filter(i => i.brandId === params.brandId);
    }
    if (params.selectedOnly) {
      items = items.filter(i => i.isSelected);
    }
    if (params.emptyOnly) {
      items = items.filter(i => i.screens && i.screens.some(s => s.status === 'empty'));
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
    const local = getLocalData();
    const brandId = data.brandId || 'netflix';
    const brandItems = local.inventory.filter(i => i.brandId === brandId);
    const nextNum = String(brandItems.length + 1).padStart(2, '0');

    const brand = local.brands.find(b => b.id === brandId);
    const screensCount = brand ? brand.screensCount : 5;

    const screens = data.screens || Array.from({ length: screensCount }, (_, i) => ({
      screenNumber: i + 1,
      name: `Screen-${i + 1}`,
      pin: String(1111 * (i + 1)),
      status: 'empty',
      saleId: null,
      expiryDate: null
    }));

    const newItem = {
      id: `inv_${Date.now()}`,
      brandId,
      recordNumber: data.recordNumber || nextNum,
      email: data.email || '',
      password: data.password || '',
      validity: data.validity || '01 Month',
      isLocked: data.isLocked ?? true,
      isSelected: data.isSelected ?? false,
      createdAt: new Date().toISOString(),
      screens
    };

    local.inventory.push(newItem);
    saveLocalData(local);

    fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    }).catch(() => {});

    return newItem;
  },

  async updateInventory(id, updates) {
    const local = getLocalData();
    const idx = local.inventory.findIndex(i => i.id === id);
    if (idx === -1) return null;

    local.inventory[idx] = {
      ...local.inventory[idx],
      ...updates,
      id
    };

    saveLocalData(local);

    fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }).catch(() => {});

    return local.inventory[idx];
  },

  async deleteInventory(id) {
    const local = getLocalData();
    local.inventory = local.inventory.filter(i => i.id !== id);
    saveLocalData(local);
    fetch(`/api/inventory/${id}`, { method: 'DELETE' }).catch(() => {});
    return true;
  },

  async toggleInventoryLock(id) {
    const local = getLocalData();
    const item = local.inventory.find(i => i.id === id);
    if (!item) return null;
    item.isLocked = !item.isLocked;
    saveLocalData(local);
    fetch(`/api/inventory/${id}/lock`, { method: 'POST' }).catch(() => {});
    return item;
  },

  async toggleInventorySelect(id) {
    const local = getLocalData();
    const item = local.inventory.find(i => i.id === id);
    if (!item) return null;
    item.isSelected = !item.isSelected;
    saveLocalData(local);
    fetch(`/api/inventory/${id}/select`, { method: 'POST' }).catch(() => {});
    return item;
  },

  async getSales(params = {}) {
    const local = getLocalData();
    let sales = [...(local.sales || [])];

    if (params.brandId && params.brandId !== 'all') {
      sales = sales.filter(s => s.brandId === params.brandId);
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

    let assignedAccount = null;
    let assignedScreen = null;

    if (saleData.inventoryId) {
      assignedAccount = local.inventory.find(i => i.id === saleData.inventoryId);
    } else if (saleData.accountEmail) {
      assignedAccount = local.inventory.find(i => i.email.toLowerCase() === saleData.accountEmail.toLowerCase());
    }

    if (!assignedAccount) {
      assignedAccount = local.inventory.find(i =>
        i.brandId === saleData.brandId &&
        i.screens && i.screens.some(s => s.status === 'empty')
      );
    }

    const saleId = `sale_${Date.now()}`;

    if (assignedAccount) {
      const screenNum = parseInt(saleData.screenNumber?.toString().replace(/\D/g, '') || '1', 10);
      assignedScreen = assignedAccount.screens.find(s => s.screenNumber === screenNum && s.status === 'empty');
      if (!assignedScreen) {
        assignedScreen = assignedAccount.screens.find(s => s.status === 'empty');
      }

      if (assignedScreen) {
        assignedScreen.status = 'occupied';
        assignedScreen.saleId = saleId;
        assignedScreen.expiryDate = saleData.expiryDate;
      }
    }

    const newSale = {
      id: saleId,
      recordNumber: nextRecordNum,
      customerName: saleData.customerName || 'Customer',
      customerNumber: saleData.customerNumber || '',
      referenceName: saleData.referenceName || '',
      referenceNumber: saleData.referenceNumber || '',
      brandId: brand.id,
      brandName: brand.displayName,
      accountEmail: saleData.accountEmail || assignedAccount?.email || '',
      accountPassword: saleData.accountPassword || assignedAccount?.password || '',
      validity: saleData.validity || '01 Month',
      screenNumber: saleData.screenNumber || (assignedScreen ? `0${assignedScreen.screenNumber}` : '01'),
      screenPin: saleData.screenPin || assignedScreen?.pin || '1234',
      activationDate: saleData.activationDate,
      expiryDate: saleData.expiryDate,
      amount: Number(saleData.amount) || brand.prices[saleData.validity] || 199,
      deviceName: saleData.deviceName || 'Personal Device',
      saleDate: saleData.activationDate,
      status: 'Active',
      notificationSent: false,
      lastNotifiedAt: null,
      inventoryId: assignedAccount?.id || null,
      customValues: saleData.customValues || {},
      googleSheetSynced: false,
      syncedAt: null
    };

    local.sales.unshift(newSale);
    saveLocalData(local);

    // Auto-sync to Google Sheet if Webhook is configured
    const gSheetConfig = local.settings?.googleSheetConfig;
    if (gSheetConfig && gSheetConfig.webhookUrl && gSheetConfig.autoSyncOnSale) {
      syncSaleToGoogleSheet(newSale, gSheetConfig)
        .then(result => {
          if (result.success) {
            newSale.googleSheetSynced = true;
            newSale.syncedAt = new Date().toISOString();
            local.settings.googleSheetConfig.lastSyncTime = new Date().toISOString();
            saveLocalData(local);
          }
        })
        .catch(err => console.warn('Background Google Sheet sync notice:', err));
    }

    fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saleData)
    }).catch(() => {});

    return { sale: newSale, assignedAccount };
  },

  async getExpiry(params = {}) {
    const local = getLocalData();
    let sales = [...(local.sales || [])];

    if (params.brandId && params.brandId !== 'all') {
      sales = sales.filter(s => s.brandId === params.brandId);
    }

    const categorized = sales.map(s => {
      const diff = getDaysDiff(s.expiryDate);
      let expiryStatus = 'Active';
      if (diff < 0) {
        expiryStatus = 'Expired';
      } else if (diff === 0) {
        expiryStatus = 'Today';
      } else if (diff <= 2) {
        expiryStatus = 'in_02_days';
      }

      return {
        ...s,
        expiryStatus,
        daysRemaining: diff
      };
    });

    if (params.filter === 'in_02_days') {
      return categorized.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 2);
    }
    if (params.filter === 'today') {
      return categorized.filter(s => s.daysRemaining === 0);
    }
    if (params.filter === 'expired') {
      return categorized.filter(s => s.daysRemaining < 0);
    }

    return categorized;
  },

  async notifyCustomer(saleId) {
    const local = getLocalData();
    const sale = local.sales.find(s => s.id === saleId);
    if (!sale) return null;

    sale.notificationSent = true;
    sale.lastNotifiedAt = new Date().toISOString();
    saveLocalData(local);

    const template = local.settings?.whatsappTemplate ||
      'Hello {name}! Your {brand} subscription ({screen}, PIN: {pin}) is expiring on {expiryDate}. Renew now to enjoy uninterrupted streaming.\n\nThank you,\nAccounts Manager';

    const message = template
      .replace('{name}', sale.customerName)
      .replace('{brand}', sale.brandName)
      .replace('{screen}', `Screen ${sale.screenNumber}`)
      .replace('{pin}', sale.screenPin)
      .replace('{expiryDate}', sale.expiryDate);

    const cleanNumber = (sale.customerNumber || '').replace(/\D/g, '');
    const countryCode = local.settings?.whatsappCountryCode || '91';
    const fullNumber = cleanNumber.startsWith(countryCode) ? cleanNumber : `${countryCode}${cleanNumber}`;
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;

    fetch(`/api/notify/${saleId}`, { method: 'POST' }).catch(() => {});

    return { success: true, sale, message, whatsappUrl, recipient: fullNumber };
  },

  async getStats() {
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
    (local.inventory || []).forEach(inv => {
      (inv.screens || []).forEach(sc => {
        totalScreens++;
        if (sc.status === 'empty') emptyScreens++;
      });
    });

    const totalRevenue = (local.sales || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalSales: (local.sales || []).length,
      totalRevenue,
      totalAccounts: (local.inventory || []).length,
      totalScreens,
      emptyScreens,
      occupiedScreens: totalScreens - emptyScreens,
      expiredCount,
      todayCount,
      inTwoDaysCount
    };
  },

  async getSettings() {
    const local = getLocalData();
    return local.settings || {};
  },

  async updateSettings(settings) {
    const local = getLocalData();
    local.settings = { ...local.settings, ...settings };
    saveLocalData(local);
    fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    }).catch(() => {});
    return local.settings;
  },

  async syncAllToGoogleSheet() {
    const local = getLocalData();
    const config = local.settings?.googleSheetConfig;
    const sales = local.sales || [];
    const res = await syncAllSalesToGoogleSheet(sales, config);
    if (res.success) {
      local.settings.googleSheetConfig.lastSyncTime = new Date().toISOString();
      local.sales.forEach(s => s.googleSheetSynced = true);
      saveLocalData(local);
    }
    return res;
  },

  exportSalesCsv() {
    const local = getLocalData();
    const mappings = local.settings?.googleSheetConfig?.cellMappings || DEFAULT_CELL_MAPPINGS;
    downloadSalesCsv(local.sales || [], mappings);
  },

  async resetData() {
    const initial = getClientInitialData();
    saveLocalData(initial);
    fetch('/api/reset', { method: 'POST' }).catch(() => {});
    return initial;
  }
};
