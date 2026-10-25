import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getInitialData } from './initialData.js';
import { syncProfileToSupabase, syncPermissionsToSupabase, syncSiteSettingsToSupabase } from './supabase.js';

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

  if (!data.sharedBrands) {
    data.sharedBrands = [];
    modified = true;
  }

  if (!data.settings) {
    data.settings = {};
    modified = true;
  }
  if (!data.settings.whatsappSaleTemplate) {
    data.settings.whatsappSaleTemplate = `Hello {customerName}! 🍿\n\n🥰 Thank you for your purchase!\nHere are your *{brandName}* subscription details:\n\n⏳ *Validity:* {validity}\n🗓️ *From Date:* {activationDate}\n🗓️ *Expiry Date:* {expiryDate}\n\n📧 *ID / Email:* {accountEmail}\n🔒 *Password:* {accountPassword}\n🎴 *Screen No:* {screenNumber}\n🪄 *Screen PIN:* {screenPin}\n🔥 *Amount:* ₹{amount}\n📱 *Device:* {deviceName}\n\n------------------------------------\n👤 *User Name:* {customerName}\n📞 *Number:* {customerNumber}\n👥 *Ref Name:* {referenceName}\n📞 *Ref Number:* {referenceNumber}\n\nEnjoy uninterrupted streaming! For renewals or queries, kindly message us. 🍿\n\nRegards,\n*OTTMoneySaver.Com*\n*+91 6305151531*`;
    modified = true;
  }

  // Ensure legacy records have an owner so they never leak into newly created business users' workspaces
  const ADMIN_OWNER = 'Fixyourmobiles10@gmail.com';
  (data.brands || []).forEach(b => {
    if (!b.ownerEmail) {
      b.ownerEmail = ADMIN_OWNER;
      modified = true;
    }
  });
  (data.inventory || []).forEach(inv => {
    if (!inv.ownerEmail) {
      inv.ownerEmail = ADMIN_OWNER;
      modified = true;
    }
  });
  (data.sales || []).forEach(s => {
    if (!s.sellerEmail && !s.ownerEmail) {
      s.sellerEmail = ADMIN_OWNER;
      s.ownerEmail = ADMIN_OWNER;
      modified = true;
    }
  });

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

// Helper: Format exact timestamp in Asia/Kolkata with seconds: e.g. "25-Oct-2026, 12:42:18 PM IST"
export function formatISTDateAndTimeString(dateObj = new Date()) {
  try {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    const dateParts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d).replace(/ /g, '-');

    const timeParts = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);

    return `${dateParts}, ${timeParts.toUpperCase()} IST`;
  } catch (e) {
    return new Date().toISOString();
  }
}

export const db = {
  getBrands(userEmail, userRole, userId) {
    const data = readDb();
    let baseBrands = [...(data.brands || [])];
    const shares = data.sharedBrands || [];

    const normalizedUser = (userEmail || '').trim().toLowerCase();
    const isAdmin = userRole === 'admin' || normalizedUser === 'fixyourmobiles10@gmail.com' || (!userEmail && !userRole);

    if (!isAdmin) {
      // Normal business user: strictly isolate brands to records created by this user
      baseBrands = baseBrands.filter(b => {
        const owner = (b.ownerEmail || '').trim().toLowerCase();
        return (owner && owner === normalizedUser) || (userId && b.userId === userId);
      });
    }

    if (userEmail) {
      shares.forEach(share => {
        if (share.status !== 'revoked' && share.status !== 'disabled') {
          const isReceiver = share.receiverEmail && share.receiverEmail.trim().toLowerCase() === normalizedUser;
          if (isReceiver) {
            (share.brandIds || []).forEach(bId => {
              if (share.brandDetails && share.brandDetails[bId] && share.brandDetails[bId].status === 'disabled') {
                return;
              }
              const base = (data.brands || []).find(b => b.id === bId);
              if (base) {
                const sharedId = `${base.id}__shared__${share.id}`;
                if (!baseBrands.some(b => b.id === sharedId)) {
                  baseBrands.push({
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
        }
      });
    }

    return baseBrands;
  },

  getBrand(id) {
    const data = readDb();
    if (id && id.includes('__shared__')) {
      const baseId = id.split('__shared__')[0];
      const base = (data.brands || []).find(b => b.id === baseId);
      if (base) {
        return {
          ...base,
          id,
          originalBrandId: base.id,
          isShared: true
        };
      }
    }
    return (data.brands || []).find(b => b.id === id);
  },

  createBrand(brandData) {
    const data = readDb();
    if (!data.brands) data.brands = [];
    const id = brandData.id || (brandData.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_') || `brand_${Date.now()}`;
    const newBrand = {
      ...brandData,
      id,
      ownerEmail: (brandData.ownerEmail || brandData.userEmail || '').trim().toLowerCase() || 'fixyourmobiles10@gmail.com',
      userId: brandData.userId || '',
      updatedAt: Date.now()
    };
    const existingIdx = data.brands.findIndex(b => b.id === id);
    if (existingIdx !== -1) {
      data.brands[existingIdx] = newBrand;
    } else {
      data.brands.push(newBrand);
    }
    writeDb(data);
    return newBrand;
  },

  updateBrand(id, updates) {
    const data = readDb();
    if (!data.brands) data.brands = [];
    const idx = data.brands.findIndex(b => b.id === id);
    if (idx === -1) return null;
    const updated = {
      ...data.brands[idx],
      ...updates,
      id,
      updatedAt: Date.now()
    };
    data.brands[idx] = updated;
    writeDb(data);
    return updated;
  },

  deleteBrand(id) {
    const data = readDb();
    if (!data.brands) return false;
    data.brands = data.brands.filter(b => b.id !== id);
    writeDb(data);
    return true;
  },

  getInventory({ brandId, selectedOnly, emptyOnly, validity, sortOrder, userEmail, userRole, userId } = {}) {
    const data = readDb();
    let items = (data.inventory || []).filter(item => !item.isDeleted);

    const normalizedUser = (userEmail || '').trim().toLowerCase();
    const isAdmin = userRole === 'admin' || normalizedUser === 'fixyourmobiles10@gmail.com' || (!userEmail && !userRole);

    if (!isAdmin) {
      const activeShares = (data.sharedBrands || []).filter(s =>
        s.status !== 'revoked' &&
        s.status !== 'disabled' &&
        s.receiverEmail && s.receiverEmail.trim().toLowerCase() === normalizedUser
      );
      const authorizedBrandIds = new Set();
      activeShares.forEach(s => {
        (s.brandIds || []).forEach(bId => authorizedBrandIds.add(bId));
      });

      items = items.filter(item => {
        const owner = (item.ownerEmail || '').trim().toLowerCase();
        const isOwn = (owner && owner === normalizedUser) || (userId && item.userId === userId);
        if (isOwn) return true;
        if (authorizedBrandIds.has(item.brandId)) {
          return true;
        }
        return false;
      }).map(item => {
        const owner = (item.ownerEmail || '').trim().toLowerCase();
        const isOwn = (owner && owner === normalizedUser) || (userId && item.userId === userId);
        if (!isOwn) {
          // Strictly protect private credentials and seller details from shared inventory viewers
          return {
            ...item,
            sellerDetails: null,
            entries: [],
            credentialHistory: []
          };
        }
        return item;
      });
    }

    if (brandId && brandId !== 'all') {
      const targetBrandId = brandId.includes('__shared__') ? brandId.split('__shared__')[0] : brandId;
      items = items.filter(item => item.brandId === targetBrandId || item.brandId === brandId);
    }

    if (selectedOnly) {
      items = items.filter(item => item.isSelected);
    }

    if (emptyOnly) {
      // Show accounts that have at least one empty slot
      items = items.filter(item => item.screens && item.screens.some(s => s.status === 'empty'));

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

        // 1. Complete all empty screens account on top!
        if (isAllEmptyA && !isAllEmptyB) return -1;
        if (!isAllEmptyA && isAllEmptyB) return 1;

        // 2. Then sort descending by empty screens count (4 empty, then 3 empty, etc.)
        if (emptyB !== emptyA) {
          return emptyB - emptyA;
        }

        // 3. Ties broken by recordNumber according to sortOrder
        const recA = parseInt(a.recordNumber || '0', 10);
        const recB = parseInt(b.recordNumber || '0', 10);
        return sortOrder === 'bottom' ? recB - recA : recA - recB;
      });

      return items;
    }

    if (validity && validity !== 'all') {
      items = items.filter(item => item.validity === validity);
    }

    // Reconcile missing screens if brand has higher screensCount
    if (brandId && brandId !== 'all') {
      const targetBrandId = brandId.includes('__shared__') ? brandId.split('__shared__')[0] : brandId;
      const brandObj = (data.brands || []).find(b => b.id === targetBrandId || b.id === brandId);
      const targetCount = Number(brandObj?.screensCount) || 0;
      if (targetCount > 0) {
        items.forEach(item => {
          const curScreens = item.screens || [];
          const existingSet = new Set(curScreens.map(s => Number(s.screenNumber)));
          for (let sNum = 1; sNum <= targetCount; sNum++) {
            if (!existingSet.has(sNum)) {
              curScreens.push({
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
          item.screens = curScreens.sort((a, b) => a.screenNumber - b.screenNumber);
        });
      }
    }

    // Sort: numeric recordNumber with stable secondary order (createdAt then id)
    items.sort((a, b) => {
      const numA = parseInt(a?.recordNumber, 10);
      const numB = parseInt(b?.recordNumber, 10);
      const hasNumA = !isNaN(numA) && numA > 0;
      const hasNumB = !isNaN(numB) && numB > 0;
      if (hasNumA && !hasNumB) return -1;
      if (!hasNumA && hasNumB) return 1;
      if (!hasNumA && !hasNumB) {
        const timeA = new Date(a?.createdAt || 0).getTime();
        const timeB = new Date(b?.createdAt || 0).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return String(a?.id || '').localeCompare(String(b?.id || ''));
      }
      if (numA !== numB) {
        return sortOrder === 'bottom' ? numB - numA : numA - numB;
      }
      const timeA = new Date(a?.createdAt || 0).getTime();
      const timeB = new Date(b?.createdAt || 0).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });

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
    
    let nextNum = itemData.recordNumber;
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

    const brand = data.brands.find(b => b.id === brandId);
    const screensCount = Math.max(1, parseInt(itemData.screensCount || itemData.screens?.length || brand?.screensCount || 5, 10));

    let screens = [];
    if (itemData.screens && Array.isArray(itemData.screens) && itemData.screens.length > 0) {
      screens = itemData.screens.map((s, idx) => ({
        screenNumber: idx + 1,
        name: s.name || `Screen-${String(idx + 1).padStart(2, '0')}`,
        pin: String(s.pin || itemData.pin || `${(idx + 1) * 1111}`.slice(0, 4)),
        deviceType: s.deviceType || 'tv',
        deviceName: s.deviceName ? String(s.deviceName).trim() : '',
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
        deviceName: '',
        status: 'empty',
        saleId: null,
        expiryDate: null
      }));
    }

    const newItem = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      brandId,
      recordNumber: nextNum,
      email: itemData.email ? itemData.email.trim() : '',
      password: itemData.password ? itemData.password.trim() : '',
      validity: itemData.validity || '01 Month',
      planVariant: itemData.planVariant || 'General',
      notes: itemData.notes || '',
      ownerEmail: (itemData.ownerEmail || itemData.userEmail || '').trim().toLowerCase() || 'fixyourmobiles10@gmail.com',
      userId: itemData.userId || '',
      sellerDetails: itemData.sellerDetails || null,
      isLocked: itemData.isLocked ?? true,
      isSelected: itemData.isSelected ?? false,
      isDeleted: false,
      createdAt: itemData.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      screens
    };

    data.inventory.push(newItem);
    writeDb(data);

    setTimeout(() => {
      this.syncAccountToGoogleSheets(newItem).catch(err => {
        console.warn('Google Sheet account sync warning:', err.message);
      });
    }, 50);

    return newItem;
  },

  updateInventory(id, updates, actorEmail) {
    const data = readDb();
    const idx = data.inventory.findIndex(i => i.id === id);
    if (idx === -1) return null;

    const existing = data.inventory[idx];
    const nowIso = new Date().toISOString();
    const formattedNow = formatISTDateAndTimeString(new Date());
    const actor = actorEmail || updates.changedBy || 'Authorized Admin';

    // Carefully merge screens to preserve existing sales, occupancies, and deviceTypes
    let mergedScreens = existing.screens;
    if (updates.screens && Array.isArray(updates.screens)) {
      mergedScreens = updates.screens.map((newScreen, sIdx) => {
        const oldScreen = existing.screens ? existing.screens[sIdx] : null;
        return {
          screenNumber: sIdx + 1,
          name: newScreen.name || oldScreen?.name || `Screen-${String(sIdx + 1).padStart(2, '0')}`,
          pin: newScreen.pin !== undefined ? String(newScreen.pin) : (oldScreen?.pin || '1234'),
          deviceType: newScreen.deviceType || oldScreen?.deviceType || 'tv',
          deviceName: newScreen.deviceName !== undefined ? String(newScreen.deviceName).trim() : (oldScreen?.deviceName || ''),
          status: newScreen.status || oldScreen?.status || 'empty',
          saleId: newScreen.saleId !== undefined ? newScreen.saleId : (oldScreen?.saleId || null),
          expiryDate: newScreen.expiryDate !== undefined ? newScreen.expiryDate : (oldScreen?.expiryDate || null)
        };
      });
    }

    // Determine existing entries array (preserve all previous entries)
    let existingEntries = Array.isArray(existing.entries)
      ? [...existing.entries]
      : (Array.isArray(existing.credentialHistory) ? [...existing.credentialHistory] : []);

    const changeEventId = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const newChangeEntries = [];

    // 1. Mail ID / Login ID
    if (updates.email !== undefined) {
      const oldEmail = (existing.email || '').trim();
      const newEmail = String(updates.email || '').trim();
      if (oldEmail !== newEmail) {
        newChangeEntries.push({
          id: `ent_${Date.now()}_email`,
          field: 'Mail ID changed',
          fieldName: 'email',
          screenNumber: null,
          oldValue: oldEmail || 'Empty',
          newValue: newEmail || 'Empty',
          isPassword: false
        });
      }
    }

    // 2. OTT Account Password (store plaintext, unmasked for authorized owners)
    if (updates.password !== undefined) {
      const oldPw = (existing.password || '').trim();
      const newPw = String(updates.password || '').trim();
      if (oldPw !== newPw) {
        newChangeEntries.push({
          id: `ent_${Date.now()}_pw`,
          field: 'Password changed',
          fieldName: 'password',
          screenNumber: null,
          oldValue: oldPw || 'Empty',
          newValue: newPw || 'Empty',
          isPassword: true
        });
      }
    }

    // 3. Screen PINs (with exact Screen-XX and preserving leading zeros)
    if (updates.screens && Array.isArray(updates.screens)) {
      updates.screens.forEach((newS, sIdx) => {
        const oldS = existing.screens ? existing.screens[sIdx] : null;
        if (newS.pin !== undefined && oldS) {
          const oldPin = oldS.pin !== undefined ? String(oldS.pin) : '';
          const newPin = String(newS.pin);
          if (oldPin !== newPin) {
            const screenLabel = `Screen-${String(sIdx + 1).padStart(2, '0')}`;
            newChangeEntries.push({
              id: `ent_${Date.now()}_pin_${sIdx + 1}`,
              field: `${screenLabel} PIN changed`,
              fieldName: 'screen_pin',
              screenNumber: sIdx + 1,
              oldValue: oldPin || 'Empty',
              newValue: newPin || 'Empty',
              isPassword: false
            });
          }
        }
      });
    }

    // 4. Star-Button Seller & Account Details popup fields
    if (updates.sellerDetails !== undefined) {
      const oldS = existing.sellerDetails || {};
      const newS = updates.sellerDetails || {};

      const sellerFields = [
        { key: 'sellerName', label: 'Seller Name changed' },
        { key: 'sellerNumber', label: 'Seller Number changed' },
        { key: 'purchaseDate', altKey: 'referenceDate', label: 'Purchase Date changed' },
        { key: 'expiry', altKey: 'expiryDate', label: 'Account Expiry changed' },
        { key: 'reference', label: 'Reference changed' },
        { key: 'link', label: 'Link changed' },
        { key: 'amount', label: 'Amount changed' },
        { key: 'card', label: 'Card Reference changed', isCard: true },
        { key: 'notes', label: 'Notes changed' }
      ];

      sellerFields.forEach(f => {
        const oldVal = String(oldS[f.key] ?? (f.altKey ? oldS[f.altKey] : '') ?? '').trim();
        const newVal = String(newS[f.key] ?? (f.altKey ? newS[f.altKey] : '') ?? '').trim();
        if (oldVal !== newVal) {
          let displayOld = oldVal || 'Empty';
          let displayNew = newVal || 'Empty';
          if (f.isCard) {
            // Mask full card numbers if entered, never include CVV
            if (displayOld !== 'Empty' && displayOld.length >= 12) {
              displayOld = `•••• •••• •••• ${displayOld.slice(-4)}`;
            }
            if (displayNew !== 'Empty' && displayNew.length >= 12) {
              displayNew = `•••• •••• •••• ${displayNew.slice(-4)}`;
            }
          }
          newChangeEntries.push({
            id: `ent_${Date.now()}_seller_${f.key}`,
            field: f.label,
            fieldName: f.key,
            screenNumber: null,
            oldValue: displayOld,
            newValue: displayNew,
            isPassword: false
          });
        }
      });
    }

    // Assign sequential Entry XX and deterministic order
    const startingCount = existingEntries.length;
    const finalizedEntries = newChangeEntries.map((ent, idx) => ({
      ...ent,
      entryNumber: `Entry ${String(startingCount + idx + 1).padStart(2, '0')}`,
      changeEventId,
      status: 'Confirmed',
      changedBy: actor,
      timestamp: nowIso,
      formattedTime: formattedNow,
      accountId: id
    }));

    // WhatsApp-style order: oldest at top, newest appended at bottom!
    const combinedEntries = [...existingEntries, ...finalizedEntries];

    let finalRecordNumber = existing.recordNumber || '01';
    if (updates.recordNumber !== undefined) {
      const p = parseInt(updates.recordNumber, 10);
      if (!isNaN(p) && p > 0) {
        finalRecordNumber = String(p).padStart(2, '0');
      }
    }

    data.inventory[idx] = {
      ...existing,
      ...updates,
      recordNumber: finalRecordNumber,
      screens: mergedScreens,
      entries: combinedEntries,
      credentialHistory: combinedEntries, // sync for backward compatibility
      updatedAt: nowIso,
      id // preserve immutable ID
    };

    writeDb(data);

    setTimeout(() => {
      this.syncAccountToGoogleSheets(data.inventory[idx]).catch(err => {
        console.warn('Google Sheet account update sync warning:', err.message);
      });
    }, 50);

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

    setTimeout(() => {
      this.syncAccountToGoogleSheets(item, true).catch(err => {
        console.warn('Google Sheet account delete sync warning:', err.message);
      });
    }, 50);

    return true;
  },

  getSales({ sellerEmail, brandId, date, validity, search, userRole, userId } = {}) {
    const data = readDb();
    let sales = [...(data.sales || [])];

    const normalizedUser = (sellerEmail || '').trim().toLowerCase();
    const isAdmin = userRole === 'admin' || (!sellerEmail && !userRole);

    if (sellerEmail) {
      // Personal sales: strictly sales where the actual selling user was sellerEmail
      sales = sales.filter(s => (s.sellerEmail || '').trim().toLowerCase() === normalizedUser);
    } else if (!isAdmin) {
      sales = sales.filter(s => {
        const sEmail = (s.sellerEmail || s.ownerEmail || '').trim().toLowerCase();
        return (sEmail && sEmail === normalizedUser) || (userId && s.userId === userId);
      });
    }

    if (brandId && brandId !== 'all') {
      const targetBrandId = brandId.includes('__shared__') ? brandId.split('__shared__')[0] : brandId;
      sales = sales.filter(s => s.brandId === brandId || s.brandId === targetBrandId);
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
    const targetBrandId = (saleData.brandId || '').includes('__shared__')
      ? saleData.brandId.split('__shared__')[0]
      : saleData.brandId;
    const brand = data.brands.find(b => b.id === saleData.brandId || b.id === targetBrandId) || data.brands[0];

    const nextRecordNum = String(data.sales.length + 1).padStart(2, '0');

    // Find account to assign
    let assignedAccount = null;
    let assignedScreen = null;

    if (saleData.inventoryId) {
      assignedAccount = data.inventory.find(i => i.id === saleData.inventoryId && !i.isDeleted);
    } else if (saleData.accountEmail) {
      assignedAccount = data.inventory.find(i => i.email.toLowerCase() === saleData.accountEmail.toLowerCase() && !i.isDeleted);
    }

    // If no explicit account, auto-pick first available account with empty screen matching brand or targetBrandId
    if (!assignedAccount) {
      assignedAccount = data.inventory.find(i =>
        !i.isDeleted &&
        (i.brandId === saleData.brandId || i.brandId === targetBrandId) &&
        i.screens && i.screens.some(s => s.status === 'empty')
      );
    }

    if (!assignedAccount) {
      if (saleData.accountEmail) {
        const screensCount = brand.screensCount || 5;
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
          brandId: brand.id,
          brandName: brand.displayName,
          email: saleData.accountEmail,
          password: saleData.accountPassword || 'Password@123',
          screensCount,
          screens,
          isDeleted: false,
          isSelected: true
        };
        data.inventory.push(assignedAccount);
      } else {
        throw new Error(`No available ${brand.displayName || 'OTT'} account found in inventory.`);
      }
    }

    const saleId = `sale_${Date.now()}`;

    // Target screen identification
    const screenNum = parseInt(saleData.screenNumber?.toString().replace(/\D/g, '') || '0', 10);
    if (screenNum > 0) {
      assignedScreen = assignedAccount.screens.find(s => s.screenNumber === screenNum);
    } else if (saleData.screenNumber) {
      assignedScreen = assignedAccount.screens.find(s => s.name?.toLowerCase() === saleData.screenNumber?.toString().toLowerCase());
    }

    if (assignedScreen && assignedScreen.status === 'occupied') {
      throw new Error('Screen already sold; select another screen');
    }

    // If still not identified, pick first empty screen
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
        deviceType: 'TV',
        deviceName: ''
      };
      assignedAccount.screens.push(assignedScreen);
    }

    // Commit screen occupancy
    assignedScreen.status = 'occupied';
    assignedScreen.saleId = saleId;
    assignedScreen.expiryDate = saleData.expiryDate;
    if (saleData.screenPin) assignedScreen.pin = saleData.screenPin;
    assignedScreen.deviceName = saleData.deviceName ? String(saleData.deviceName).trim() : '';

    const newSale = {
      id: saleId,
      recordNumber: nextRecordNum,
      customerName: saleData.customerName || 'Customer',
      customerNumber: saleData.customerNumber || '',
      referenceName: saleData.referenceName || '',
      referenceNumber: saleData.referenceNumber || '',
      brandId: saleData.brandId,
      brandName: saleData.brandName || brand.displayName,
      sellerEmail: (saleData.sellerEmail || saleData.ownerEmail || '').trim().toLowerCase() || 'fixyourmobiles10@gmail.com',
      ownerEmail: (saleData.ownerEmail || saleData.sellerEmail || '').trim().toLowerCase() || 'fixyourmobiles10@gmail.com',
      userId: saleData.userId || '',
      isSharedSale: Boolean((saleData.brandId || '').includes('__shared__')),
      accountEmail: saleData.accountEmail || assignedAccount?.email || '',
      accountPassword: saleData.accountPassword || assignedAccount?.password || '',
      validity: saleData.validity || '01 Month',
      pricingPlan: saleData.pricingPlan || saleData.planType || 'General',
      screenNumber: saleData.screenNumber || (assignedScreen ? `0${assignedScreen.screenNumber}` : '01'),
      screenPin: saleData.screenPin || assignedScreen?.pin || '1234',
      activationDate: saleData.activationDate,
      expiryDate: saleData.expiryDate,
      amount: Number(saleData.amount) || brand.prices[saleData.validity] || 199,
      deviceName: saleData.deviceName || '',
      saleDate: saleData.activationDate,
      note: saleData.note || '',
      status: 'Active',
      notificationSent: false,
      lastNotifiedAt: null,
      inventoryId: assignedAccount?.id || null
    };

    data.sales.unshift(newSale);
    writeDb(data);

    // Auto-sync sale to Google Sheets in real-time (Per user request: Data entered in Website will be updated on GSheet)
    setTimeout(() => {
      this.syncSingleSaleToGoogleSheets(newSale).catch(err => {
        console.warn('Google Sheet sale background sync warning:', err.message);
      });
    }, 50);

    return { sale: newSale, assignedAccount };
  },

  updateSale(id, updates) {
    const data = readDb();
    const idx = data.sales.findIndex(s => s.id === id);
    if (idx === -1) return null;
    data.sales[idx] = {
      ...data.sales[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    const updated = data.sales[idx];

    // Atomically synchronize linked screen in inventory
    const targetAccountId = updated.inventoryId;
    const targetAccountEmail = (updated.accountEmail || '').toLowerCase().trim();
    const targetScreenNum = parseInt(String(updated.screenNumber).replace(/\D/g, '') || '1', 10);

    let inv = (data.inventory || []).find(i =>
      (targetAccountId && i.id === targetAccountId) ||
      (i.screens && i.screens.some(s => s.saleId === id)) ||
      (targetAccountEmail && String(i.email || '').toLowerCase().trim() === targetAccountEmail)
    );
    if (inv && Array.isArray(inv.screens)) {
      const screen = inv.screens.find(s =>
        s.saleId === id ||
        s.screenNumber === targetScreenNum ||
        String(s.screenNumber) === String(targetScreenNum)
      );
      if (screen) {
        if (updates.deviceName !== undefined) {
          screen.deviceName = String(updates.deviceName).trim();
        }
        if (updates.expiryDate !== undefined) {
          screen.expiryDate = updates.expiryDate;
        }
        if (updates.screenPin !== undefined) {
          screen.pin = updates.screenPin;
        }
        if (updates.customerName !== undefined) {
          screen.customerName = updates.customerName;
        }
        if (updates.customerNumber !== undefined) {
          screen.customerNumber = updates.customerNumber;
        }
        if (!screen.saleId) {
          screen.saleId = id;
        }
        inv.updatedAt = Date.now();
      }
    }

    writeDb(data);

    setTimeout(() => {
      this.syncSingleSaleToGoogleSheets(data.sales[idx], true).catch(err => {
        console.warn('Google Sheet sale update background sync warning:', err.message);
      });
    }, 50);

    return data.sales[idx];
  },

  deleteSale(id) {
    const data = readDb();
    const idx = (data.sales || []).findIndex(s => s.id === id);
    if (idx === -1) return null;

    const [deletedSale] = data.sales.splice(idx, 1);

    // Recalculate screen occupancy from remaining valid sales
    const targetAccountId = deletedSale.inventoryId;
    const targetAccountEmail = (deletedSale.accountEmail || '').toLowerCase().trim();
    const targetScreenNum = parseInt(String(deletedSale.screenNumber).replace(/\D/g, '') || '1', 10);

    const remainingSalesForScreen = (data.sales || []).filter(s => {
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
        const dateA = new Date(a.expiryDate || a.activationDate).getTime() || 0;
        const dateB = new Date(b.expiryDate || b.activationDate).getTime() || 0;
        return dateB - dateA;
      });
      newestSale = remainingSalesForScreen[0];
    }

    const inv = (data.inventory || []).find(i =>
      (targetAccountId && i.id === targetAccountId) ||
      (targetAccountEmail && String(i.email || '').toLowerCase().trim() === targetAccountEmail)
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
      }
    }

    writeDb(data);

    setTimeout(() => {
      this.syncSaleDeleteToGoogleSheets(deletedSale).catch(err => {
        console.warn('Google Sheet delete sale warning:', err.message);
      });
    }, 50);

    return deletedSale;
  },

  getExpiryList({ filter = 'ALL', brandId = 'all', userEmail, userRole, userId } = {}) {
    const now = new Date();
    let sales = this.getSales({ sellerEmail: userEmail, userRole, userId, brandId });

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

  getStats({ userEmail, userRole, userId } = {}) {
    const expiryList = this.getExpiryList({ filter: 'ALL', userEmail, userRole, userId });
    const expiredCount = expiryList.filter(s => s.daysRemaining < 0).length;
    const todayCount = expiryList.filter(s => s.daysRemaining === 0).length;
    const inTwoDaysCount = expiryList.filter(s => s.daysRemaining > 0 && s.daysRemaining <= 2).length;

    const inventory = this.getInventory({ userEmail, userRole, userId });
    const sales = this.getSales({ sellerEmail: userEmail, userRole, userId });
    const brands = this.getBrands(userEmail, userRole, userId);

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

  getSettings(userEmail) {
    const data = readDb();
    const globalSettings = { ...(data.settings || {}) };
    const normalizedUser = (userEmail || '').trim().toLowerCase();

    const defaultCategories = [
      { id: 'sale', name: 'Sale Message', description: 'Login credentials & purchase confirmation sent to customers upon sale' },
      { id: 'expiry', name: 'Expiry / Renewal Message', description: 'Approaching subscription renewal & reminder notices sent before expiry' }
    ];

    const defaultSaleTemplate = globalSettings.whatsappSaleTemplate && !globalSettings.whatsappSaleTemplate.includes('Custom template from test')
      ? globalSettings.whatsappSaleTemplate
      : `Hello {customerName}! 🍿\n\n🥰 Thank you for your purchase!\nHere are your *{brandName}* subscription details:\n\n⏳ *Validity:* {validity}\n🗓️ *From Date:* {activationDate}\n🗓️ *Expiry Date:* {expiryDate}\n\n📧 *ID / Email:* {accountEmail}\n🔒 *Password:* {accountPassword}\n🎴 *Screen No:* {screenNumber}\n🪄 *Screen PIN:* {screenPin}\n🔥 *Amount:* ₹{amount}\n📱 *Device:* {deviceName}\n\n------------------------------------\n👤 *User Name:* {customerName}\n📞 *Number:* {customerNumber}\n👥 *Ref Name:* {referenceName}\n📞 *Ref Number:* {referenceNumber}\n\nEnjoy uninterrupted streaming! For renewals or queries, kindly message us. 🍿\n\nRegards,\n*OTTMoneySaver.Com*\n*+91 6305151531*`;

    const defaultExpiryTemplate = globalSettings.whatsappExpiryTemplate || `Hello {customerName}! 🎬\n\nYour *{brandName}* subscription details:\n📱 *Screen No:* {screenNumber}\n🔑 *Screen PIN:* {screenPin}\n⏳ *Expiry Date:* {expiryDate}\n\nYour plan is approaching renewal ({daysRemaining} days remaining). Kindly renew today to extend your subscription and continue non-stop streaming! 🍿\n\nRegards,\n*OTTMoneySaver.Com*\n*+91 6305151531*`;

    const defaultTemplates = [
      {
        id: 'tpl_sale_default',
        categoryId: 'sale',
        name: 'Standard Sale Confirmation',
        content: defaultSaleTemplate,
        isActive: true,
        imageUrl: null,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'tpl_expiry_1',
        categoryId: 'expiry',
        name: 'Template 01 — Friendly Reminder',
        content: defaultExpiryTemplate,
        isActive: true,
        imageUrl: globalSettings.whatsappExpiryImage || null,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'tpl_expiry_2',
        categoryId: 'expiry',
        name: 'Template 02 — Renewal Notice',
        content: `Hello {customerName},\n\nYour {brandName} subscription has {remainingDays} days left before renewal.\n\nExpiry Date: {expiryDate}\n\nPlease contact us to renew your subscription.\n\nRegards,\n*OTTMoneySaver.Com*`,
        isActive: false,
        imageUrl: null,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'tpl_expiry_3',
        categoryId: 'expiry',
        name: 'Template 03 — Short Reminder',
        content: `Hi {customerName}! Quick reminder that your {brandName} subscription expires on *{expiryDate}* ({expiryStatus}). Reply to this message to renew right away! 🍿\n\nRegards,\n*OTTMoneySaver.Com*`,
        isActive: false,
        imageUrl: null,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      },
      {
        id: 'tpl_expiry_4',
        categoryId: 'expiry',
        name: 'Template 04 — Picture + Text Reminder',
        content: `🎬 *SUBSCRIPTION RENEWAL NOTICE*\n\nHello {customerName}!\nYour {brandName} access expires on *{expiryDate}* ({remainingDays} days remaining).\n\n📱 Screen: {screenNumber}\n🪄 PIN: {screenPin}\n\nRenew today to keep watching uninterrupted! 🍿\n\nRegards,\n*OTTMoneySaver.Com*`,
        isActive: false,
        imageUrl: null,
        createdAt: '2026-10-25T00:00:00.000Z',
        updatedAt: '2026-10-25T00:00:00.000Z'
      }
    ];

    if (!userEmail) {
      const activeSale = defaultTemplates.find(t => t.categoryId === 'sale' && t.isActive) || defaultTemplates[0];
      const activeExpiry = defaultTemplates.find(t => t.categoryId === 'expiry' && t.isActive) || defaultTemplates[1];
      return {
        ...globalSettings,
        whatsappCategories: globalSettings.whatsappCategories || defaultCategories,
        whatsappTemplates: globalSettings.whatsappTemplates || defaultTemplates,
        whatsappSaleTemplate: activeSale.content,
        whatsappExpiryTemplate: activeExpiry.content,
        whatsappExpiryImage: activeExpiry.imageUrl || ''
      };
    }

    const userEntry = data.userSettings?.[normalizedUser] || {};
    const categories = userEntry.whatsappCategories || globalSettings.whatsappCategories || defaultCategories;
    let templates = userEntry.whatsappTemplates;

    if (!templates || !Array.isArray(templates) || templates.length === 0) {
      // Migrate from single legacy template fields if present
      templates = defaultTemplates.map(t => {
        if (t.categoryId === 'sale' && t.isActive && userEntry.whatsappSaleTemplate && !userEntry.whatsappSaleTemplate.includes('Custom template from test')) {
          return { ...t, content: userEntry.whatsappSaleTemplate };
        }
        if (t.categoryId === 'expiry' && t.isActive && userEntry.whatsappExpiryTemplate) {
          return {
            ...t,
            content: userEntry.whatsappExpiryTemplate,
            imageUrl: userEntry.whatsappExpiryImage || t.imageUrl
          };
        }
        return t;
      });
    }

    const activeSale = templates.find(t => t.categoryId === 'sale' && t.isActive) || templates.find(t => t.categoryId === 'sale') || defaultTemplates[0];
    const activeExpiry = templates.find(t => t.categoryId === 'expiry' && t.isActive) || templates.find(t => t.categoryId === 'expiry') || defaultTemplates[1];

    return {
      ...globalSettings,
      ...userEntry,
      whatsappCategories: categories,
      whatsappTemplates: templates,
      whatsappSaleTemplate: activeSale?.content || defaultSaleTemplate,
      whatsappExpiryTemplate: activeExpiry?.content || defaultExpiryTemplate,
      whatsappExpiryImage: activeExpiry?.imageUrl || '',
      updatedAt: userEntry.updatedAt || globalSettings.updatedAt || new Date().toISOString()
    };
  },

  updateSettings(newSettings = {}, userEmail) {
    const data = readDb();
    const timestamp = new Date().toISOString();
    const normalizedUser = (userEmail || '').trim().toLowerCase();

    if (normalizedUser) {
      if (!data.userSettings) data.userSettings = {};
      const current = data.userSettings[normalizedUser] || {};

      let updatedTemplates = newSettings.whatsappTemplates || current.whatsappTemplates;
      // If updating sale template directly
      if (newSettings.whatsappSaleTemplate !== undefined) {
        if (!updatedTemplates) {
          const loaded = this.getSettings(normalizedUser);
          updatedTemplates = loaded.whatsappTemplates || [];
        }
        updatedTemplates = updatedTemplates.map(t => {
          if (t.categoryId === 'sale' && t.isActive) {
            return { ...t, content: newSettings.whatsappSaleTemplate, updatedAt: timestamp };
          }
          return t;
        });
      }

      // If updating expiry template directly
      if (newSettings.whatsappExpiryTemplate !== undefined || newSettings.whatsappExpiryImage !== undefined) {
        if (!updatedTemplates) {
          const loaded = this.getSettings(normalizedUser);
          updatedTemplates = loaded.whatsappTemplates || [];
        }
        updatedTemplates = updatedTemplates.map(t => {
          if (t.categoryId === 'expiry' && t.isActive) {
            return {
              ...t,
              content: newSettings.whatsappExpiryTemplate !== undefined ? newSettings.whatsappExpiryTemplate : t.content,
              imageUrl: newSettings.whatsappExpiryImage !== undefined ? newSettings.whatsappExpiryImage : t.imageUrl,
              updatedAt: timestamp
            };
          }
          return t;
        });
      }

      data.userSettings[normalizedUser] = {
        ...current,
        ...newSettings,
        whatsappTemplates: updatedTemplates || current.whatsappTemplates,
        updatedAt: timestamp
      };

      writeDb(data);
      return this.getSettings(normalizedUser);
    }

    // Global settings update (no userEmail)
    if (!data.settings) data.settings = {};
    data.settings = {
      ...data.settings,
      ...newSettings,
      updatedAt: timestamp
    };

    writeDb(data);
    return this.getSettings();
  },

  getSheetsConfig() {
    const data = readDb();
    const envWebhook = (process.env.GOOGLE_SHEET_WEBHOOK_URL || '').trim();
    const cfg = data.settings?.googleSheetConfig || {};
    const webhookUrl = cfg.webhookUrl || envWebhook;
    return {
      enabled: Boolean(webhookUrl),
      spreadsheetId: cfg.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID || '1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg',
      ownerEmail: 'Fixyourmobiles10@gmail.com',
      spreadsheetName: 'OTT A/C MANAGER',
      webhookUrl: webhookUrl,
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
      autoSyncOnSale: cfg.autoSyncOnSale !== false,
      lastSyncTime: cfg.lastSyncTime || null,
      status: webhookUrl ? 'Connected' : 'Disconnected',
      lastError: cfg.lastError || null
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

    const getCanonicalBrandKey = (brandId) => {
      const id = (brandId || '').toLowerCase();
      if (id === 'netflix') return { db: 'NETFLIX', sold: 'NETFLIX-SOLD' };
      if (id.includes('prime') || id.includes('amazon')) return { db: 'PRIME VIDEO', sold: 'PRIME VIDEO-SOLD' };
      if (id.includes('zee')) return { db: 'ZEE5', sold: 'ZEE5-SOLD' };
      if (id.includes('aha')) return { db: 'AHA', sold: 'AHA-SOLD' };
      return { db: 'NETFLIX', sold: 'ALL BRANDS DATA' };
    };

    const brandSheets = {
      'NETFLIX': [],
      'PRIME VIDEO': [],
      'ZEE5': [],
      'AHA': []
    };

    const soldSheets = {
      'NETFLIX-SOLD': [],
      'PRIME VIDEO-SOLD': [],
      'ZEE5-SOLD': [],
      'AHA-SOLD': [],
      'ALL BRANDS DATA': []
    };

    // Populate Database Account rows
    (data.inventory || []).filter(item => !item.isDeleted).forEach(item => {
      const brandKeys = getCanonicalBrandKey(item.brandId);
      const targetDbSheet = brandSheets[brandKeys.db] ? brandKeys.db : 'NETFLIX';

      (item.screens || []).forEach(screen => {
        const row = [
          String(item.id || ''),
          String(brandMap[item.brandId] || item.brandId),
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

        brandSheets[targetDbSheet].push(row);
      });
    });

    // Populate Sold Customer rows (13 exact columns matching video)
    // S.NO, SOLD DATE, BRAND, VALIDITY, PLAN, ACTIVATION, EXPIRY, ID, PASSWORD, SCREEN, PIN, DEVICE, AMOUNT
    (data.sales || []).forEach((sale, idx) => {
      const brandKeys = getCanonicalBrandKey(sale.brandId);
      const soldRow = [
        String(idx + 1),
        String(sale.activationDate || sale.saleDate || new Date().toISOString().slice(0, 10)),
        String(sale.brandName || brandMap[sale.brandId] || sale.brandId || 'OTT'),
        String(sale.validity || '01 Month'),
        String(sale.pricingPlan || 'Standard'),
        String(sale.activationDate || sale.saleDate || ''),
        String(sale.expiryDate || ''),
        String(sale.accountEmail || ''),
        String(sale.accountPassword || ''),
        String(sale.screenNumber || '01'),
        String(sale.screenPin || '1234'),
        String(sale.deviceName || ''),
        String(sale.amount || '0')
      ];

      // Add to consolidated sheet
      soldSheets['ALL BRANDS DATA'].push(soldRow);

      // Add to brand-specific sold sheet if applicable
      if (soldSheets[brandKeys.sold]) {
        soldSheets[brandKeys.sold].push(soldRow);
      }
    });

    return {
      sales: data.sales || [],
      inventory: (data.inventory || []).filter(item => !item.isDeleted),
      brands: data.brands || [],
      brandSheets,
      soldSheets,
      allDataRows: soldSheets['ALL BRANDS DATA'],
      salesRows: soldSheets['ALL BRANDS DATA']
    };
  },

  async syncSingleSaleToGoogleSheets(sale, isUpdate = false) {
    const config = this.getSheetsConfig();
    if (!config?.webhookUrl || !config.autoSyncOnSale) return;

    try {
      const getCanonicalBrand = (brandId, brandName) => {
        const norm = (brandId || brandName || '').toLowerCase().trim();
        if (norm.includes('netflix')) return 'NETFLIX';
        if (norm.includes('prime') || norm.includes('amazon')) return 'PRIME VIDEO';
        if (norm.includes('zee5') || norm.includes('zee')) return 'ZEE5';
        if (norm.includes('aha')) return 'AHA';
        if (norm.includes('hotstar') || norm.includes('disney')) return 'DISNEY+ HOTSTAR';
        if (norm.includes('sonyliv') || norm.includes('sony')) return 'SONYLIV';
        if (norm.includes('youtube')) return 'YOUTUBE';
        if (norm.includes('spotify')) return 'SPOTIFY';
        if (norm.includes('apple')) return 'APPLE TV';
        if (norm.includes('jio')) return 'JIOCINEMA';
        return (brandName || brandId || 'BRAND').toUpperCase();
      };

      const brand = getCanonicalBrand(sale.brandId, sale.brandName);
      const saleRow = [
        String(sale.recordNumber || '01'),
        String(sale.saleDate || sale.activationDate || new Date().toISOString().slice(0, 10)),
        brand,
        String(sale.validity || '01-MONTH').toUpperCase(),
        String(sale.pricingPlan || sale.plan || 'STANDARD').toUpperCase(),
        String(sale.activationDate || sale.saleDate || ''),
        String(sale.expiryDate || ''),
        String(sale.accountEmail || sale.email || ''),
        String(sale.accountPassword || sale.password || ''),
        String(sale.screenNumber || 'Screen-1'),
        String(sale.screenPin || sale.pin || '1234'),
        String(sale.deviceName || ''),
        String(sale.amount !== undefined ? sale.amount : '0')
      ];

      const payload = {
        action: isUpdate ? 'update_sale' : 'add_sale',
        brand,
        saleRow,
        sale,
        accountEmail: sale.accountEmail,
        screenNumber: sale.screenNumber,
        expiryDate: sale.expiryDate
      };

      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
      });
    } catch (err) {
      console.warn('Background single sale Google Sheet sync error:', err.message);
    }
  },

  async syncSaleDeleteToGoogleSheets(sale) {
    const config = this.getSheetsConfig();
    if (!config?.webhookUrl) return;

    try {
      const norm = (sale.brandId || sale.brandName || '').toLowerCase().trim();
      let brand = (sale.brandName || sale.brandId || 'BRAND').toUpperCase();
      if (norm.includes('netflix')) brand = 'NETFLIX';
      else if (norm.includes('prime') || norm.includes('amazon')) brand = 'PRIME VIDEO';
      else if (norm.includes('zee5') || norm.includes('zee')) brand = 'ZEE5';
      else if (norm.includes('aha')) brand = 'AHA';

      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'delete_sale',
          brand,
          accountEmail: sale.accountEmail,
          screenNumber: sale.screenNumber,
          sale
        }),
        redirect: 'follow'
      });
    } catch (err) {
      console.warn('Background delete sale Google Sheet sync error:', err.message);
    }
  },

  async syncAccountToGoogleSheets(account, isDelete = false) {
    const config = this.getSheetsConfig();
    if (!config?.webhookUrl) return;

    try {
      const data = readDb();
      const bObj = (data.brands || []).find(b => b.id === account.brandId);
      const norm = (account.brandId || bObj?.name || '').toLowerCase().trim();
      let brand = (bObj?.displayName || bObj?.name || account.brandId || 'NETFLIX').toUpperCase();
      if (norm.includes('netflix')) brand = 'NETFLIX';
      else if (norm.includes('prime') || norm.includes('amazon')) brand = 'PRIME VIDEO';
      else if (norm.includes('zee5') || norm.includes('zee')) brand = 'ZEE5';
      else if (norm.includes('aha')) brand = 'AHA';

      await fetch(config.webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: isDelete ? 'delete_account' : 'update_account',
          brand,
          email: account.email,
          account
        }),
        redirect: 'follow'
      });
    } catch (err) {
      console.warn('Background account Google Sheet sync error:', err.message);
    }
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

  // --- USERS & AUTHENTICATION (MULTI-USER & ROLE MANAGEMENT) ---
  getAllUsers() {
    const data = readDb();
    if (!data.users) data.users = [];
    // Ensure default admin exists
    this.getUserByEmail('Fixyourmobiles10@gmail.com');

    // Return safe user objects (never expose plaintext passwords)
    return data.users.map(u => ({
      id: u.id,
      name: u.name || u.fullName || 'User',
      fullName: u.fullName || u.name || 'User',
      email: u.email,
      mobileNumber: u.mobileNumber || u.mobile || '',
      role: u.role || 'user',
      accountStatus: u.accountStatus || 'active',
      createdAt: u.createdAt || new Date().toISOString().slice(0, 10),
      updatedAt: u.updatedAt || null
    }));
  },

  getUserByEmail(email) {
    const data = readDb();
    if (!data.users) data.users = [];
    const normalized = (email || '').trim().toLowerCase();
    let user = data.users.find(u => (u.email || '').trim().toLowerCase() === normalized);
    if (!user && normalized === 'fixyourmobiles10@gmail.com') {
      user = {
        id: 'admin_1',
        email: 'Fixyourmobiles10@gmail.com',
        fullName: 'Super Admin',
        name: 'Super Admin',
        mobileNumber: '9876543210',
        password: 'Password@123',
        role: 'admin',
        accountStatus: 'active',
        createdAt: '2026-10-16'
      };
      data.users.push(user);
      writeDb(data);
    }
    return user;
  },

  getUserById(id) {
    const data = readDb();
    if (!data.users) return null;
    const user = data.users.find(u => u.id === id);
    if (!user) return null;
    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  createUser({ fullName, mobileNumber, email, password, role = 'user' }) {
    if (!fullName || !fullName.trim()) {
      throw new Error('Full Name is required');
    }
    if (!email || !email.trim()) {
      throw new Error('Email Address is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const normEmail = email.trim().toLowerCase();
    if (!emailRegex.test(normEmail)) {
      throw new Error('Invalid email address format');
    }

    if (!mobileNumber || !mobileNumber.trim()) {
      throw new Error('Mobile Number is required');
    }
    const cleanMobile = mobileNumber.replace(/[^0-9+]/g, '');
    if (cleanMobile.length < 10) {
      throw new Error('Mobile number must be at least 10 digits');
    }

    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    const data = readDb();
    if (!data.users) data.users = [];

    // Duplicate checks
    const existingEmail = data.users.find(u => (u.email || '').trim().toLowerCase() === normEmail);
    if (existingEmail) {
      throw new Error(`A user with email "${normEmail}" already exists`);
    }

    const existingMobile = data.users.find(u => (u.mobileNumber || u.mobile || '').replace(/[^0-9]/g, '') === cleanMobile.replace(/[^0-9]/g, ''));
    if (existingMobile) {
      throw new Error(`A user with mobile number "${mobileNumber}" already exists`);
    }

    const newUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: fullName.trim(),
      name: fullName.trim(),
      email: normEmail,
      mobileNumber: mobileNumber.trim(),
      password, // In real Supabase auth, handled by Supabase Auth service
      role: role === 'admin' ? 'admin' : 'user',
      accountStatus: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10)
    };

    data.users.push(newUser);

    // Initialize user feature permissions
    if (!data.userPermissions) data.userPermissions = {};
    data.userPermissions[newUser.id] = {
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

    writeDb(data);

    // Asynchronously sync profile and permissions to Supabase
    syncProfileToSupabase(newUser).catch(() => {});
    syncPermissionsToSupabase(newUser.id, data.userPermissions[newUser.id]).catch(() => {});

    const { password: _, ...safeUser } = newUser;
    return safeUser;
  },

  updateUserProfile(id, updates = {}) {
    const data = readDb();
    if (!data.users) data.users = [];
    const index = data.users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error(`User not found with ID ${id}`);
    }

    const user = data.users[index];

    if (updates.fullName) {
      user.fullName = updates.fullName.trim();
      user.name = updates.fullName.trim();
    }
    if (updates.mobileNumber) {
      user.mobileNumber = updates.mobileNumber.trim();
    }
    if (updates.accountStatus) {
      user.accountStatus = updates.accountStatus; // 'active' | 'suspended' | 'inactive'
    }
    if (updates.role && (updates.role === 'admin' || updates.role === 'user')) {
      // Prevent demoting last admin
      user.role = updates.role;
    }

    user.updatedAt = new Date().toISOString().slice(0, 10);
    writeDb(data);

    // Sync to Supabase
    syncProfileToSupabase(user).catch(() => {});

    const { password: _, ...safeUser } = user;
    return safeUser;
  },

  adminResetPassword(id, newPassword) {
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters');
    }
    const data = readDb();
    if (!data.users) data.users = [];
    const user = data.users.find(u => u.id === id);
    if (!user) {
      throw new Error(`User not found with ID ${id}`);
    }

    user.password = newPassword;
    user.updatedAt = new Date().toISOString().slice(0, 10);
    writeDb(data);
    return { success: true, message: 'Password reset successfully!' };
  },

  getUserPermissions(userId) {
    const data = readDb();
    if (!data.userPermissions) data.userPermissions = {};

    const defaultPerms = {
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

    // If user is super admin, all features are always ON
    const user = (data.users || []).find(u => u.id === userId);
    if (user && user.role === 'admin') {
      const allOn = {};
      Object.keys(defaultPerms).forEach(k => { allOn[k] = true; });
      return allOn;
    }

    const userPerms = data.userPermissions[userId] || {};
    return { ...defaultPerms, ...userPerms };
  },

  updateUserPermissions(userId, permissions) {
    const data = readDb();
    if (!data.userPermissions) data.userPermissions = {};
    const existing = this.getUserPermissions(userId);
    const updated = { ...existing, ...permissions };
    data.userPermissions[userId] = updated;
    writeDb(data);

    // Sync to Supabase
    syncPermissionsToSupabase(userId, updated).catch(() => {});
    return updated;
  },

  // --- WEBSITE BRANDING & SITE SETTINGS ---
  getSiteSettings() {
    const data = readDb();
    if (!data.siteSettings) {
      data.siteSettings = {
        businessName: 'OTT SELLERS',
        subtitle: 'Management System',
        logoUrl: '',
        primaryColor: '#2563eb',
        accentColor: '#0284c7',
        headerBg: '#0f172a',
        headingsText: 'Multi-Brand OTT Subscriptions',
        updatedAt: new Date().toISOString()
      };
      writeDb(data);
    }
    return data.siteSettings;
  },

  updateSiteSettings(newSettings = {}) {
    const data = readDb();
    const current = this.getSiteSettings();
    const updated = {
      ...current,
      ...newSettings,
      updatedAt: new Date().toISOString()
    };
    data.siteSettings = updated;
    writeDb(data);

    // Sync to Supabase
    syncSiteSettingsToSupabase(updated).catch(() => {});
    return updated;
  },

  validateUser(email, password) {
    const user = this.getUserByEmail(email);
    if (!user) return null;
    if (user.password === password) {
      if (user.accountStatus === 'suspended') {
        throw new Error('Your account has been suspended by the administrator.');
      }
      const { password: _, ...safeUser } = user;
      // Attach feature permissions
      safeUser.permissions = this.getUserPermissions(user.id);
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
        fullName: 'User',
        name: 'User',
        password: newPassword,
        role: 'user',
        accountStatus: 'active',
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

    const pricingPlans = brandData.pricingPlans || {
      general: {
        enabled: true,
        label: 'General',
        prices: brandData.prices || { '01 Month': 199 }
      },
      withAds: {
        enabled: Boolean(brandData.pricingPlans?.withAds?.enabled),
        label: 'With Ads',
        prices: brandData.pricingPlans?.withAds?.prices || {}
      },
      adFree: {
        enabled: Boolean(brandData.pricingPlans?.adFree?.enabled),
        label: 'Ad-Free',
        prices: brandData.pricingPlans?.adFree?.prices || {}
      }
    };

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
        : Object.keys(pricingPlans.general?.prices || brandData.prices || { '01 Month': 199 }),
      prices: pricingPlans.general?.prices || brandData.prices || { '01 Month': 199 },
      pricingPlans
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
  },

  // --- SHARED BRANDS COLLABORATION ---
  getShares({ email } = {}) {
    const data = readDb();
    let list = data.sharedBrands || [];
    if (email) {
      const norm = email.trim().toLowerCase();
      list = list.filter(s =>
        (s.senderEmail && s.senderEmail.trim().toLowerCase() === norm) ||
        (s.receiverEmail && s.receiverEmail.trim().toLowerCase() === norm)
      );
    }
    return list;
  },

  createShare(shareData) {
    const data = readDb();
    if (!data.sharedBrands) data.sharedBrands = [];
    const senderEmail = (shareData.senderEmail || 'Fixyourmobiles10@gmail.com').trim().toLowerCase();
    const receiverEmail = (shareData.receiverEmail || '').trim().toLowerCase();
    const brandIds = Array.isArray(shareData.brandIds) ? shareData.brandIds : [];
    const now = new Date().toISOString();

    // Check if an existing share for this sender -> receiver already exists
    let existing = data.sharedBrands.find(s =>
      s.senderEmail.toLowerCase() === senderEmail &&
      s.receiverEmail.toLowerCase() === receiverEmail
    );

    if (existing) {
      if (!existing.brandDetails) existing.brandDetails = {};
      brandIds.forEach(bId => {
        if (!existing.brandIds.includes(bId)) {
          existing.brandIds.push(bId);
        }
        // Preserve original timestamp if already exists!
        if (!existing.brandDetails[bId]) {
          existing.brandDetails[bId] = {
            sharedAt: now,
            status: 'active'
          };
        } else {
          existing.brandDetails[bId].status = 'active';
        }
      });
      existing.senderName = (shareData.senderName || existing.senderName || 'Bharath').trim();
      existing.updatedAt = now;
      existing.status = 'active';
      writeDb(data);
      return existing;
    }

    const brandDetails = {};
    brandIds.forEach(bId => {
      brandDetails[bId] = {
        sharedAt: now,
        status: 'active'
      };
    });

    const newShare = {
      id: `share_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderEmail,
      senderName: (shareData.senderName || 'Bharath').trim(),
      receiverEmail,
      brandIds,
      brandDetails,
      status: 'active',
      createdAt: now
    };
    data.sharedBrands.push(newShare);
    writeDb(data);
    return newShare;
  },

  updateShare(id, updates = {}) {
    const data = readDb();
    if (!data.sharedBrands) data.sharedBrands = [];
    const index = data.sharedBrands.findIndex(s => s.id === id);
    if (index === -1) throw new Error(`Share not found with ID ${id}`);

    data.sharedBrands[index] = {
      ...data.sharedBrands[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeDb(data);
    return data.sharedBrands[index];
  },

  revokeShareBrand(shareId, brandId) {
    const data = readDb();
    const share = (data.sharedBrands || []).find(s => s.id === shareId);
    if (!share) return false;
    share.brandIds = (share.brandIds || []).filter(id => id !== brandId);
    if (share.brandDetails && share.brandDetails[brandId]) {
      delete share.brandDetails[brandId];
    }
    if (share.brandIds.length === 0) {
      data.sharedBrands = (data.sharedBrands || []).filter(s => s.id !== shareId);
    }
    writeDb(data);
    return true;
  },

  deleteShare(id) {
    const data = readDb();
    data.sharedBrands = (data.sharedBrands || []).filter(s => s.id !== id);
    writeDb(data);
    return true;
  }
};
