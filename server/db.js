import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getInitialData } from './initialData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const BUNDLED_DATA_DIR = path.join(__dirname, 'data');
const BUNDLED_DB_PATH = path.join(BUNDLED_DATA_DIR, 'database.json');

const DATA_DIR = isVercel ? '/tmp/data' : BUNDLED_DATA_DIR;
const DB_PATH = isVercel ? '/tmp/data/database.json' : BUNDLED_DB_PATH;

// Ensure data folder and database exist
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {}
  }

  if (!fs.existsSync(DB_PATH)) {
    let initial = null;
    if (isVercel && fs.existsSync(BUNDLED_DB_PATH)) {
      try {
        const raw = fs.readFileSync(BUNDLED_DB_PATH, 'utf-8');
        initial = JSON.parse(raw);
      } catch (e) {}
    }
    if (!initial) {
      initial = getInitialData();
    }
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {}
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading DB, re-initializing...', err);
    const initial = getInitialData();
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    } catch (e) {}
    return initial;
  }
}

function readDb() {
  const data = initDb();
  let modified = false;

  if (!data.groups || data.groups.length === 0) {
    data.groups = [
      {
        id: 'group_general',
        name: 'Standard OTT',
        heading: 'Multi-Brand Subscriptions',
        subheading: 'Premium shared & private streaming profiles',
        color: '#2563eb',
        createdAt: '2026-01-01'
      }
    ];
    modified = true;
  }

  if (!data.customForms || data.customForms.length === 0) {
    data.customForms = [
      {
        id: 'sale_form_01',
        title: 'SALE FORM 01',
        name: 'SALE FORM 01',
        heading: 'OTT Sale Form',
        subheading: 'Standard Customer Checkout',
        type: 'sale',
        groupId: 'group_general',
        brands: ['netflix', 'prime_video', 'aha'],
        isDefault: true,
        createdAt: '2026-01-01'
      },
      {
        id: 'db_form_01',
        title: 'DATABASE FORM 01',
        name: 'DATABASE FORM 01',
        heading: 'OTT Inventory Database',
        subheading: 'Accounts & 1–10 Screens Management',
        type: 'database',
        groupId: 'group_general',
        brands: ['netflix', 'prime_video', 'aha'],
        isDefault: true,
        createdAt: '2026-01-01'
      }
    ];
    modified = true;
  }

  if (modified) {
    try {
      writeDb(data);
    } catch (e) {}
  }

  return data;
}

function writeDb(data) {
  try {
    const tempPath = DB_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, DB_PATH);
  } catch (err) {
    console.error('Error writing to DB:', err);
  }
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
    let items = (data.inventory || []).filter(item => !item.isDeleted);

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
    return data.inventory.find(i => i.id === id && !i.isDeleted);
  },

  createInventory(itemData) {
    const data = readDb();
    const brandId = itemData.brandId || 'netflix';
    const brandItems = data.inventory.filter(i => i.brandId === brandId);
    const nextNum = String(brandItems.length + 1).padStart(2, '0');

    const brand = data.brands.find(b => b.id === brandId);
    const screensCount = Math.min(10, Math.max(1, parseInt(itemData.screensCount || itemData.screens?.length || brand?.screensCount || 5, 10)));

    let screens = [];
    if (itemData.screens && Array.isArray(itemData.screens) && itemData.screens.length > 0) {
      screens = itemData.screens.map((s, idx) => ({
        screenNumber: idx + 1,
        name: s.name || `Screen-${String(idx + 1).padStart(2, '0')}`,
        pin: String(s.pin || itemData.pin || `${(idx + 1) * 1111}`.slice(0, 4)),
        status: s.status || 'empty',
        saleId: s.saleId || null,
        expiryDate: s.expiryDate || null
      }));
    } else {
      screens = Array.from({ length: screensCount }, (_, i) => ({
        screenNumber: i + 1,
        name: `Screen-${String(i + 1).padStart(2, '0')}`,
        pin: String(1111 * (i + 1)).slice(0, 4) || '1234',
        status: 'empty',
        saleId: null,
        expiryDate: null
      }));
    }

    const newItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brandId,
      recordNumber: itemData.recordNumber || nextNum,
      email: itemData.email ? itemData.email.trim() : '',
      password: itemData.password ? itemData.password.trim() : '',
      validity: itemData.validity || '01 Month',
      notes: itemData.notes || '',
      isLocked: itemData.isLocked ?? true,
      isSelected: itemData.isSelected ?? false,
      isDeleted: false,
      createdAt: itemData.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
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

    const existing = data.inventory[idx];

    // Carefully merge screens to preserve existing sales and occupancies
    let mergedScreens = existing.screens;
    if (updates.screens && Array.isArray(updates.screens)) {
      mergedScreens = updates.screens.map((newScreen, sIdx) => {
        const oldScreen = existing.screens ? existing.screens[sIdx] : null;
        return {
          screenNumber: sIdx + 1,
          name: newScreen.name || oldScreen?.name || `Screen-${String(sIdx + 1).padStart(2, '0')}`,
          pin: newScreen.pin !== undefined ? String(newScreen.pin) : (oldScreen?.pin || '1234'),
          // Preserve existing saleId and occupancy status unless explicitly changed
          status: newScreen.status || oldScreen?.status || 'empty',
          saleId: newScreen.saleId !== undefined ? newScreen.saleId : (oldScreen?.saleId || null),
          expiryDate: newScreen.expiryDate !== undefined ? newScreen.expiryDate : (oldScreen?.expiryDate || null)
        };
      });
    }

    data.inventory[idx] = {
      ...existing,
      ...updates,
      screens: mergedScreens,
      updatedAt: new Date().toISOString().slice(0, 10),
      id // preserve immutable ID
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
    const item = data.inventory.find(i => i.id === id);
    if (!item) return false;
    // Soft delete to preserve historical sales records and auditing
    item.isDeleted = true;
    item.deletedAt = new Date().toISOString();
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
      assignedAccount = data.inventory.find(i => i.id === saleData.inventoryId && !i.isDeleted);
    } else if (saleData.accountEmail) {
      assignedAccount = data.inventory.find(i => i.email.toLowerCase() === saleData.accountEmail.toLowerCase() && !i.isDeleted);
    }

    // If no explicit account, auto-pick first available account with empty screen
    if (!assignedAccount) {
      assignedAccount = data.inventory.find(i =>
        !i.isDeleted &&
        i.brandId === saleData.brandId &&
        i.screens && i.screens.some(s => s.status === 'empty')
      );
    }

    if (!assignedAccount) {
      throw new Error(`No available ${brand.displayName || 'OTT'} account found in inventory.`);
    }

    const saleId = `sale_${Date.now()}`;

    // Target screen identification
    const screenNum = parseInt(saleData.screenNumber?.toString().replace(/\D/g, '') || '0', 10);
    if (screenNum > 0) {
      assignedScreen = assignedAccount.screens.find(s => s.screenNumber === screenNum);
    } else if (saleData.screenNumber) {
      assignedScreen = assignedAccount.screens.find(s => s.name?.toLowerCase() === saleData.screenNumber?.toString().toLowerCase());
    }

    // If still not identified, pick first empty screen
    if (!assignedScreen) {
      assignedScreen = assignedAccount.screens.find(s => s.status === 'empty');
    }

    if (!assignedScreen) {
      throw new Error('No empty screen is available on this account.');
    }

    // Atomic double-booking prevention check
    if (assignedScreen.status !== 'empty') {
      throw new Error(`Double-booking prevented: Screen ${assignedScreen.name || assignedScreen.screenNumber} has already been sold (Expires: ${assignedScreen.expiryDate || 'Active'}). Please choose an available screen.`);
    }

    // Commit screen occupancy
    assignedScreen.status = 'occupied';
    assignedScreen.saleId = saleId;
    assignedScreen.expiryDate = saleData.expiryDate;

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

  getSheetsConfig() {
    const data = readDb();
    return data.settings?.googleSheetConfig || {
      enabled: false,
      spreadsheetId: '',
      webhookUrl: '',
      sheetNames: {
        netflix: 'Netflix',
        amazon: 'Amazon',
        aha: 'Aha',
        allData: 'All Data',
        sales: 'Sales'
      },
      autoSyncOnSale: true,
      lastSyncTime: null,
      status: 'Disconnected',
      lastError: null
    };
  },

  updateSheetsConfig(config) {
    const data = readDb();
    data.settings = data.settings || {};
    data.settings.googleSheetConfig = {
      ...(data.settings.googleSheetConfig || {}),
      ...config
    };
    writeDb(data);
    return data.settings.googleSheetConfig;
  },

  buildSheetsPayload() {
    const data = readDb();
    const brandMap = {};
    (data.brands || []).forEach(b => {
      brandMap[b.id] = b.displayName || b.name;
    });

    const getSheetName = (brandId) => {
      const id = (brandId || '').toLowerCase();
      if (id === 'netflix') return 'Netflix';
      if (id === 'prime_video' || id.includes('prime') || id.includes('amazon')) return 'Amazon';
      if (id === 'aha') return 'Aha';
      if (id === 'disney_hotstar') return 'Disney+ Hotstar';
      if (id === 'sonyliv') return 'SonyLIV';
      if (id === 'zee5') return 'ZEE5';
      if (id === 'youtube_premium') return 'YouTube Premium';
      if (id === 'spotify') return 'Spotify';
      if (id === 'apple_tv') return 'Apple TV+';
      if (id === 'jiocinema') return 'JioCinema';
      return brandMap[brandId] || 'Other Brand';
    };

    const brandSheets = {};
    const allDataRows = [];

    (data.inventory || []).filter(item => !item.isDeleted).forEach(item => {
      const brandName = brandMap[item.brandId] || item.brandId;
      const sheetName = getSheetName(item.brandId);

      if (!brandSheets[sheetName]) {
        brandSheets[sheetName] = [];
      }

      (item.screens || []).forEach(screen => {
        const row = [
          String(item.id || ''),
          String(brandName),
          String(item.email || ''),
          String(item.password || ''),
          String(item.screens?.length || 5),
          String(screen.name || `Screen-${screen.screenNumber}`),
          String(screen.pin || '1234'),
          String(item.validity || '01 Month'),
          item.isLocked ? 'Active' : 'Editing',
          screen.status === 'occupied' ? `Sold (${screen.expiryDate || 'Active'})` : 'Empty',
          String(item.createdAt || ''),
          new Date().toISOString().slice(0, 10)
        ];

        brandSheets[sheetName].push(row);
        allDataRows.push(row);
      });
    });

    const salesRows = (data.sales || []).map(sale => [
      String(sale.id || ''),
      String(sale.inventoryId || ''),
      String(sale.brandName || sale.brandId || ''),
      String(sale.screenNumber || ''),
      String(sale.screenPin || ''),
      String(sale.customerName || ''),
      String(sale.customerNumber || ''),
      String(sale.amount || ''),
      String(sale.activationDate || sale.saleDate || ''),
      String(sale.expiryDate || ''),
      String(sale.status || 'Active')
    ]);

    return {
      brandSheets,
      allDataRows,
      salesRows
    };
  },

  async syncAllToGoogleSheets() {
    const config = this.getSheetsConfig();
    const webhookUrl = config.webhookUrl;
    if (!webhookUrl || !webhookUrl.trim()) {
      return { success: false, reason: 'No Google Sheet Webhook URL configured in Cells Linkup.' };
    }

    try {
      const payload = {
        action: 'sync_all',
        ...this.buildSheetsPayload()
      };

      const res = await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({ status: 'success' }));
      const now = new Date().toISOString();

      this.updateSheetsConfig({
        lastSyncTime: now,
        status: 'Connected',
        lastError: null
      });

      return {
        success: true,
        message: 'All accounts and sales synchronized to Google Sheets successfully!',
        timestamp: now,
        details: json
      };
    } catch (err) {
      console.error('Google Sheets sync error:', err);
      this.updateSheetsConfig({
        status: 'Error',
        lastError: err.message
      });
      return { success: false, error: err.message };
    }
  },

  // --- USERS & AUTHENTICATION ---
  getUserByEmail(email) {
    const data = readDb();
    if (!data.users) data.users = [];
    const normalized = (email || '').trim().toLowerCase();
    let user = data.users.find(u => (u.email || '').trim().toLowerCase() === normalized);
    if (!user && normalized === 'fixyourmobiles10@gmail.com') {
      user = {
        id: 'admin_1',
        email: 'Fixyourmobiles10@gmail.com',
        password: 'Password@123',
        name: 'Admin',
        role: 'admin',
        createdAt: '2026-10-16'
      };
      data.users.push(user);
      writeDb(data);
    }
    return user;
  },

  validateUser(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    if (user.password === password) {
      const { password: _, ...safeUser } = user;
      return safeUser;
    }
    return null;
  },

  saveOtp(email, otp) {
    const data = readDb();
    if (!data.otps) data.otps = [];
    const normalized = (email || '').trim().toLowerCase();
    const expiresAt = Date.now() + 10 * 60 * 1000;
    data.otps = data.otps.filter(o => o.email !== normalized);
    data.otps.push({ email: normalized, otp, expiresAt });
    writeDb(data);
    return true;
  },

  verifyOtp(email, otp) {
    const data = readDb();
    if (!data.otps) return false;
    const normalized = (email || '').trim().toLowerCase();
    const entry = data.otps.find(o => o.email === normalized && o.otp === String(otp).trim());
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) return false;
    return true;
  },

  resetPassword(email, newPassword, otp) {
    const isValidOtp = this.verifyOtp(email, otp);
    if (!isValidOtp) return { success: false, message: 'Invalid or expired OTP code.' };

    const data = readDb();
    if (!data.users) data.users = [];
    const normalized = (email || '').trim().toLowerCase();
    let user = data.users.find(u => (u.email || '').trim().toLowerCase() === normalized);
    if (!user) {
      user = {
        id: `user_${Date.now()}`,
        email: email.trim(),
        password: newPassword,
        name: 'User',
        role: 'admin',
        createdAt: new Date().toISOString().slice(0, 10)
      };
      data.users.push(user);
    } else {
      user.password = newPassword;
      user.updatedAt = new Date().toISOString().slice(0, 10);
    }

    data.otps = (data.otps || []).filter(o => o.email !== normalized);
    writeDb(data);
    return { success: true, message: 'Password reset successfully!' };
  },

  // --- BRAND MANAGEMENT ---
  createBrand(brandData) {
    const data = readDb();
    if (!data.brands) data.brands = [];

    const id = brandData.id || brandData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = data.brands.find(b => b.id === id);
    if (existing) {
      throw new Error(`Brand with ID "${id}" already exists`);
    }

    const newBrand = {
      id,
      name: brandData.name.trim(),
      displayName: brandData.displayName || brandData.name.trim(),
      logo: brandData.logo || '',
      color: brandData.color || '#3b82f6',
      bgDark: brandData.bgDark || '#0f172a',
      badgeColor: brandData.badgeColor || brandData.color || '#3b82f6',
      screensCount: Number(brandData.screensCount) || 5,
      plans: Array.isArray(brandData.plans) && brandData.plans.length > 0
        ? brandData.plans
        : Object.keys(brandData.prices || { '01 Month': 199 }),
      prices: brandData.prices || { '01 Month': 199 }
    };

    data.brands.push(newBrand);
    writeDb(data);
    return newBrand;
  },

  updateBrand(id, updates) {
    const data = readDb();
    const idx = (data.brands || []).findIndex(b => b.id === id);
    if (idx === -1) return null;
    data.brands[idx] = { ...data.brands[idx], ...updates };
    writeDb(data);
    return data.brands[idx];
  },

  deleteBrand(id) {
    const data = readDb();
    data.brands = (data.brands || []).filter(b => b.id !== id);
    writeDb(data);
    return true;
  },

  // --- FORM GROUPS ---
  getGroups() {
    const data = readDb();
    return data.groups || [];
  },

  getGroup(id) {
    const groups = this.getGroups();
    return groups.find(g => g.id === id);
  },

  createGroup(groupData) {
    const data = readDb();
    if (!data.groups) data.groups = [];

    const newGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: (groupData.name || 'New Group').trim(),
      heading: (groupData.heading || groupData.name || 'Group Heading').trim(),
      subheading: (groupData.subheading || '').trim(),
      color: groupData.color || '#2563eb',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.groups.push(newGroup);
    writeDb(data);
    return newGroup;
  },

  updateGroup(id, groupData) {
    const data = readDb();
    const idx = (data.groups || []).findIndex(g => g.id === id);
    if (idx === -1) return null;

    data.groups[idx] = {
      ...data.groups[idx],
      name: groupData.name !== undefined ? groupData.name.trim() : data.groups[idx].name,
      heading: groupData.heading !== undefined ? groupData.heading.trim() : data.groups[idx].heading,
      subheading: groupData.subheading !== undefined ? groupData.subheading.trim() : data.groups[idx].subheading,
      color: groupData.color || data.groups[idx].color,
      updatedAt: new Date().toISOString()
    };

    writeDb(data);
    return data.groups[idx];
  },

  deleteGroup(id) {
    const data = readDb();
    // Do not delete forms; unassign their groupId safely
    (data.customForms || []).forEach(f => {
      if (f.groupId === id) {
        f.groupId = null;
      }
    });

    data.groups = (data.groups || []).filter(g => g.id !== id);
    writeDb(data);
    return true;
  },

  // --- CUSTOM FORMS ---
  getCustomForms(type) {
    const data = readDb();
    let forms = data.customForms || [];
    if (type) {
      forms = forms.filter(f => f.type === type);
    }
    return forms;
  },

  getCustomForm(id) {
    const data = readDb();
    return (data.customForms || []).find(f => f.id === id);
  },

  createCustomForm(formData) {
    const data = readDb();
    if (!data.customForms) data.customForms = [];

    const title = formData.title || formData.name || (formData.type === 'database' ? 'DATABASE FORM' : 'SALE FORM');
    const newForm = {
      id: formData.id || `form_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title,
      name: title,
      heading: formData.heading || title,
      subheading: formData.subheading || '',
      type: formData.type || 'sale',
      groupId: formData.groupId || null,
      brands: Array.isArray(formData.brands) ? formData.brands : [],
      isDefault: Boolean(formData.isDefault),
      fields: Array.isArray(formData.fields) ? formData.fields : [],
      elements: Array.isArray(formData.elements) ? formData.elements : [],
      backgroundColor: formData.backgroundColor || '#ffffff',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If marked default, unset default on other forms of same type
    if (newForm.isDefault) {
      data.customForms.forEach(f => {
        if (f.type === newForm.type) f.isDefault = false;
      });
    }

    data.customForms.push(newForm);
    writeDb(data);
    return newForm;
  },

  updateCustomForm(id, formData) {
    const data = readDb();
    const idx = (data.customForms || []).findIndex(f => f.id === id);
    if (idx === -1) return null;

    if (formData.isDefault) {
      const type = formData.type || data.customForms[idx].type;
      data.customForms.forEach(f => {
        if (f.type === type && f.id !== id) f.isDefault = false;
      });
    }

    const title = formData.title || formData.name || data.customForms[idx].title || data.customForms[idx].name;
    data.customForms[idx] = {
      ...data.customForms[idx],
      ...formData,
      title,
      name: title,
      updatedAt: new Date().toISOString()
    };

    writeDb(data);
    return data.customForms[idx];
  },

  deleteCustomForm(id) {
    const data = readDb();
    data.customForms = (data.customForms || []).filter(f => f.id !== id);
    writeDb(data);
    return true;
  },

  // --- CELL MAPPINGS ---
  getCellMappings(formId = 'default') {
    const data = readDb();
    const all = data.cellMappings || {};
    return all[formId] || {
      formId,
      spreadsheetId: data.settings?.googleSheetConfig?.spreadsheetId || '',
      mappings: {
        email: 'A1/B2',
        password: 'A2/C2',
        screenNumber: 'A3/D2',
        screenPin: 'A4/E2',
        expiryDate: 'A5/F2',
        amount: 'A6/G2',
        customerName: 'A7/H2',
        customerNumber: 'A8/I2'
      },
      updatedAt: new Date().toISOString()
    };
  },

  saveCellMappings(formId = 'default', mappingsData) {
    const data = readDb();
    if (!data.cellMappings) data.cellMappings = {};
    data.cellMappings[formId] = {
      formId,
      ...mappingsData,
      updatedAt: new Date().toISOString()
    };
    writeDb(data);
    return data.cellMappings[formId];
  },

  resetDatabase() {
    const initial = getInitialData();
    writeDb(initial);
    return initial;
  }
};
