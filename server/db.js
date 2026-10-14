import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getInitialData } from './initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'database.json');

// Ensure data folder and database exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_PATH)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, re-initializing...', err);
    const initial = getInitialData();
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
}

function readDb() {
  return initDb();
}

function writeDb(data) {
  const tempPath = DB_PATH + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

// Helper: Parse DD-MMM-YYYY or standard date string into Date object
export function parseDateString(str) {
  if (!str) return new Date();
  // Check for DD-MMM-YYYY (e.g., 29-Jun-2026 or 12 May 2025)
  const parts = str.trim().replace(/-/g, ' ').split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const monthMap = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    if (!isNaN(day) && !isNaN(year) && monthMap[monthStr.slice(0, 3)] !== undefined) {
      return new Date(year, monthMap[monthStr.slice(0, 3)], day);
    }
  }
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

// Compare date with today in local time (ignoring time-of-day)
function dateDiffInDays(targetDate, referenceDate = new Date()) {
  const t = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const r = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  const diffTime = t.getTime() - r.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export const db = {
  getBrands() {
    const data = readDb();
    return data.brands || [];
  },

  getBrand(id) {
    const brands = this.getBrands();
    return brands.find(b => b.id === id);
  },

  getInventory({ brandId, selectedOnly, emptyOnly, validity, sortOrder } = {}) {
    const data = readDb();
    let items = [...(data.inventory || [])];

    if (brandId && brandId !== 'all') {
      items = items.filter(item => item.brandId === brandId);
    }

    if (selectedOnly) {
      items = items.filter(item => item.isSelected);
    }

    if (emptyOnly) {
      // Show accounts that have at least one empty slot
      items = items.filter(item => item.screens && item.screens.some(s => s.status === 'empty'));
    }

    if (validity && validity !== 'all') {
      items = items.filter(item => item.validity === validity);
    }

    // Sort: default 'top' (recordNumber ascending), 'bottom' (recordNumber descending)
    if (sortOrder === 'bottom') {
      items.sort((a, b) => parseInt(b.recordNumber || '0') - parseInt(a.recordNumber || '0'));
    } else {
      items.sort((a, b) => parseInt(a.recordNumber || '0') - parseInt(b.recordNumber || '0'));
    }

    return items;
  },

  getInventoryItem(id) {
    const data = readDb();
    return data.inventory.find(i => i.id === id);
  },

  createInventory(itemData) {
    const data = readDb();
    const brandId = itemData.brandId || 'netflix';
    const brandItems = data.inventory.filter(i => i.brandId === brandId);
    const nextNum = String(brandItems.length + 1).padStart(2, '0');

    const brand = data.brands.find(b => b.id === brandId);
    const screensCount = brand ? brand.screensCount : 5;

    const screens = itemData.screens || Array.from({ length: screensCount }, (_, i) => ({
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
      recordNumber: itemData.recordNumber || nextNum,
      email: itemData.email || '',
      password: itemData.password || '',
      validity: itemData.validity || '01 Month',
      isLocked: itemData.isLocked ?? true,
      isSelected: itemData.isSelected ?? false,
      createdAt: new Date().toISOString(),
      screens
    };

    data.inventory.push(newItem);
    writeDb(data);
    return newItem;
  },

  updateInventory(id, updates) {
    const data = readDb();
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx === -1) return null;

    data.inventory[idx] = {
      ...data.inventory[idx],
      ...updates,
      id // preserve ID
    };

    writeDb(data);
    return data.inventory[idx];
  },

  toggleInventorySelect(id) {
    const data = readDb();
    const item = data.inventory.find(i => i.id === id);
    if (!item) return null;
    item.isSelected = !item.isSelected;
    writeDb(data);
    return item;
  },

  toggleInventoryLock(id) {
    const data = readDb();
    const item = data.inventory.find(i => i.id === id);
    if (!item) return null;
    item.isLocked = !item.isLocked;
    writeDb(data);
    return item;
  },

  deleteInventory(id) {
    const data = readDb();
    data.inventory = data.inventory.filter(i => i.id !== id);
    writeDb(data);
    return true;
  },

  getSales({ brandId, date, validity, search } = {}) {
    const data = readDb();
    let sales = [...(data.sales || [])];

    if (brandId && brandId !== 'all') {
      sales = sales.filter(s => s.brandId === brandId);
    }

    if (validity && validity !== 'all') {
      sales = sales.filter(s => s.validity === validity);
    }

    if (date) {
      sales = sales.filter(s => s.saleDate === date || s.activationDate === date || s.expiryDate === date);
    }

    if (search) {
      const q = search.toLowerCase();
      sales = sales.filter(s =>
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.customerNumber && s.customerNumber.includes(q)) ||
        (s.accountEmail && s.accountEmail.toLowerCase().includes(q)) ||
        (s.brandName && s.brandName.toLowerCase().includes(q))
      );
    }

    // Default latest first
    sales.sort((a, b) => parseInt(b.recordNumber || '0') - parseInt(a.recordNumber || '0'));
    return sales;
  },

  createSale(saleData) {
    const data = readDb();
    const brand = data.brands.find(b => b.id === saleData.brandId) || data.brands[0];

    const nextRecordNum = String(data.sales.length + 1).padStart(2, '0');

    // Find account to assign
    let assignedAccount = null;
    let assignedScreen = null;

    if (saleData.inventoryId) {
      assignedAccount = data.inventory.find(i => i.id === saleData.inventoryId);
    } else if (saleData.accountEmail) {
      assignedAccount = data.inventory.find(i => i.email.toLowerCase() === saleData.accountEmail.toLowerCase());
    }

    // If no explicit account, auto-pick first available account with empty screen
    if (!assignedAccount) {
      assignedAccount = data.inventory.find(i =>
        i.brandId === saleData.brandId &&
        i.screens && i.screens.some(s => s.status === 'empty')
      );
    }

    const saleId = `sale_${Date.now()}`;

    if (assignedAccount) {
      const screenNum = parseInt(saleData.screenNumber?.toString().replace(/\D/g, '') || '1', 10);
      assignedScreen = assignedAccount.screens.find(s => s.screenNumber === screenNum && s.status === 'empty');

      if (!assignedScreen) {
        // Fallback to first empty screen in this account
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
      inventoryId: assignedAccount?.id || null
    };

    data.sales.unshift(newSale);
    writeDb(data);
    return { sale: newSale, assignedAccount };
  },

  getExpiryList({ filter = 'ALL', brandId = 'all' } = {}) {
    const data = readDb();
    const now = new Date();
    let sales = [...(data.sales || [])];

    if (brandId && brandId !== 'all') {
      sales = sales.filter(s => s.brandId === brandId);
    }

    const categorized = sales.map(s => {
      const expDate = parseDateString(s.expiryDate);
      const diff = dateDiffInDays(expDate, now);

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

    if (filter === 'in_02_days') {
      // Within 2 days (excluding expired, diff is 1 or 2 days)
      return categorized.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 2);
    }
    if (filter === 'today') {
      return categorized.filter(s => s.daysRemaining === 0);
    }
    if (filter === 'expired') {
      return categorized.filter(s => s.daysRemaining < 0);
    }

    return categorized;
  },

  notifyCustomer(saleId) {
    const data = readDb();
    const sale = data.sales.find(s => s.id === saleId);
    if (!sale) return null;

    sale.notificationSent = true;
    sale.lastNotifiedAt = new Date().toISOString();
    writeDb(data);

    // Build prefilled WhatsApp message
    const template = data.settings?.whatsappTemplate ||
      'Hello {name}! Your {brand} subscription ({screen}, PIN: {pin}) is expiring on {expiryDate}. Renew now to enjoy uninterrupted streaming.\n\nThank you,\nAccounts Manager';

    const message = template
      .replace('{name}', sale.customerName)
      .replace('{brand}', sale.brandName)
      .replace('{screen}', `Screen ${sale.screenNumber}`)
      .replace('{pin}', sale.screenPin)
      .replace('{expiryDate}', sale.expiryDate);

    const cleanNumber = (sale.customerNumber || '').replace(/\D/g, '');
    const countryCode = data.settings?.whatsappCountryCode || '91';
    const fullNumber = cleanNumber.startsWith(countryCode) ? cleanNumber : `${countryCode}${cleanNumber}`;
    const whatsappUrl = `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;

    return {
      success: true,
      sale,
      message,
      whatsappUrl,
      recipient: fullNumber
    };
  },

  getStats() {
    const data = readDb();
    const expiryList = this.getExpiryList({ filter: 'ALL' });
    const expiredCount = expiryList.filter(s => s.daysRemaining < 0).length;
    const todayCount = expiryList.filter(s => s.daysRemaining === 0).length;
    const inTwoDaysCount = expiryList.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 2).length;

    let totalScreens = 0;
    let emptyScreens = 0;
    (data.inventory || []).forEach(inv => {
      (inv.screens || []).forEach(sc => {
        totalScreens++;
        if (sc.status === 'empty') emptyScreens++;
      });
    });

    const totalRevenue = (data.sales || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    return {
      totalSales: (data.sales || []).length,
      totalRevenue,
      totalAccounts: (data.inventory || []).length,
      totalScreens,
      emptyScreens,
      occupiedScreens: totalScreens - emptyScreens,
      expiredCount,
      todayCount,
      inTwoDaysCount
    };
  },

  getSettings() {
    const data = readDb();
    return data.settings || {};
  },

  updateSettings(newSettings) {
    const data = readDb();
    data.settings = { ...data.settings, ...newSettings };
    writeDb(data);
    return data.settings;
  },

  resetDatabase() {
    const initial = getInitialData();
    writeDb(initial);
    return initial;
  }
};
