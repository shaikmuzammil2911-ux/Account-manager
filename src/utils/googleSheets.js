/**
 * Google Sheets Integration Specifications & Apps Script Engine
 * Matches video specifications (WhatsApp Video 2026-10-17 at 11.04.18 PM.mp4):
 * Owner: Fixyourmobiles10@gmail.com
 * Spreadsheet Title: OTT A/C MANAGER
 * Spreadsheet ID: 1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg
 * 
 * Worksheets:
 *   1. NETFLIX           (Database: Accounts & 5 Screens)
 *   2. NETFLIX-SOLD      (Sold Customer data)
 *   3. PRIME VIDEO       (Database)
 *   4. PRIME VIDEO-SOLD  (Sold Customer data)
 *   5. ZEE5              (Database)
 *   6. ZEE5-SOLD         (Sold Customer data)
 *   7. AHA               (Database)
 *   8. AHA-SOLD          (Sold Customer data)
 *   9. ALL BRANDS DATA   (All Brands Sold Data consolidated)
 */

export const DEFAULT_SPREADSHEET_ID = '1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg';
export const DEFAULT_SPREADSHEET_OWNER = 'Fixyourmobiles10@gmail.com';

export const REQUIRED_WORKSHEETS = [
  'NETFLIX',
  'NETFLIX-SOLD',
  'PRIME VIDEO',
  'PRIME VIDEO-SOLD',
  'ZEE5',
  'ZEE5-SOLD',
  'AHA',
  'AHA-SOLD',
  'ALL BRANDS DATA'
];

export const SOLD_SHEET_HEADERS = [
  'S.NO',
  'SOLD DATE',
  'BRAND',
  'VALIDITY',
  'PLAN',
  'ACTIVATION',
  'EXPIRY',
  'ID',
  'PASSWORD',
  'SCREEN',
  'PIN',
  'DEVICE',
  'AMOUNT'
];

export const DEFAULT_CELL_MAPPINGS = [
  { fieldKey: 'sNo', label: 'S.NO', sheetCol: 'A', header: 'S.NO', enabled: true },
  { fieldKey: 'soldDate', label: 'Sold Date', sheetCol: 'B', header: 'SOLD DATE', enabled: true },
  { fieldKey: 'brandName', label: 'Brand', sheetCol: 'C', header: 'BRAND', enabled: true },
  { fieldKey: 'validity', label: 'Validity', sheetCol: 'D', header: 'VALIDITY', enabled: true },
  { fieldKey: 'plan', label: 'Plan', sheetCol: 'E', header: 'PLAN', enabled: true },
  { fieldKey: 'activationDate', label: 'Activation', sheetCol: 'F', header: 'ACTIVATION', enabled: true },
  { fieldKey: 'expiryDate', label: 'Expiry', sheetCol: 'G', header: 'EXPIRY', enabled: true },
  { fieldKey: 'accountEmail', label: 'ID', sheetCol: 'H', header: 'ID', enabled: true },
  { fieldKey: 'accountPassword', label: 'Password', sheetCol: 'I', header: 'PASSWORD', enabled: true },
  { fieldKey: 'screenNumber', label: 'Screen', sheetCol: 'J', header: 'SCREEN', enabled: true },
  { fieldKey: 'screenPin', label: 'PIN', sheetCol: 'K', header: 'PIN', enabled: true },
  { fieldKey: 'deviceName', label: 'Device', sheetCol: 'L', header: 'DEVICE', enabled: true },
  { fieldKey: 'amount', label: 'Amount', sheetCol: 'M', header: 'AMOUNT', enabled: true }
];

/**
 * Format brand identifier to Database sheet name
 */
export function getDbSheetName(brandId, brandName) {
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
}

/**
 * Format brand identifier to Sold sheet name
 */
export function getSoldSheetName(brandId, brandName) {
  const base = getDbSheetName(brandId, brandName);
  return `${base}-SOLD`;
}

/**
 * Format a sale object into the exact 13-column array
 */
export function formatSaleRow13(sale, index = 1) {
  const sNo = String(index).padStart(2, '0');
  const soldDate = sale.saleDate || sale.activationDate || new Date().toISOString().slice(0, 10);
  const brand = getDbSheetName(sale.brandId, sale.brandName);
  const validity = String(sale.validity || '01-MONTH').toUpperCase();
  const plan = String(sale.plan || sale.planName || validity || 'STANDARD').toUpperCase();
  const activation = String(sale.activationDate || sale.saleDate || '');
  const expiry = String(sale.expiryDate || '');
  const id = String(sale.accountEmail || sale.email || '');
  const password = String(sale.accountPassword || sale.password || '');
  const screen = String(sale.screenNumber || (sale.screen ? `Screen-${sale.screen}` : 'Screen-1'));
  const pin = String(sale.screenPin || sale.pin || '');
  const device = String(sale.deviceName || 'TV / Mobile / Laptop');
  const amount = String(sale.amount !== undefined ? sale.amount : '0.00');

  return [
    sNo,
    soldDate,
    brand,
    validity,
    plan,
    activation,
    expiry,
    id,
    password,
    screen,
    pin,
    device,
    amount
  ];
}

export function downloadSalesCsv(salesList = [], cellMappings = DEFAULT_CELL_MAPPINGS) {
  const activeMappings = [...cellMappings].filter(m => m.enabled).sort((a, b) => a.sheetCol.localeCompare(b.sheetCol));
  const headers = activeMappings.map(m => `"${(m.header || m.label).replace(/"/g, '""')}"`);

  const rows = salesList.map((sale, idx) => {
    return activeMappings.map(m => {
      let val = sale[m.fieldKey];
      if (m.fieldKey === 'sNo') val = String(idx + 1).padStart(2, '0');
      if (m.fieldKey === 'brandName') val = getDbSheetName(sale.brandId, sale.brandName);
      const str = val !== undefined && val !== null ? String(val) : '';
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `OTT_Sales_Sheet_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Robust Google Apps Script Template
 * Handles:
 * 1. Automatic table setup for NETFLIX, PRIME VIDEO, ZEE5, AHA, NETFLIX-SOLD, ALL BRANDS DATA, etc.
 * 2. Real-time updates when sales are created (appends to <BRAND>-SOLD & ALL BRANDS DATA).
 * 3. Database sheets accounts sync with Screen 1-5 layout.
 * 4. doGet() returns all sheets data in JSON so the website can display it directly!
 */
export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ============================================================================
// OTT A/C MANAGER — GOOGLE APPS SCRIPT WEB APP
// File: OTT A/C MANAGER (Fixyourmobiles10@gmail.com)
// Spreadsheet ID: 1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg
// ============================================================================
// HOW TO DEPLOY / UPDATE:
// 1. In your Google Sheet, click Extensions > Apps Script (or open your existing script).
// 2. Select ALL existing code (Ctrl+A) and DELETE it.
// 3. Paste this entire updated code into the editor.
// 4. Click "Deploy" > "Manage deployments" > Click the Pencil (Edit) icon.
// 5. Version: Select "New version".
// 6. Execute as: "Me (Fixyourmobiles10@gmail.com)".
// 7. Who has access: "Anyone".
// 8. Click "Deploy".
// ============================================================================

var SPREADSHEET_ID = '1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg';

function getSpreadsheet() {
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active && active.getId()) return active;
  } catch (e) {}
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

var REQUIRED_SHEETS = [
  'NETFLIX', 'NETFLIX-SOLD',
  'PRIME VIDEO', 'PRIME VIDEO-SOLD',
  'ZEE5', 'ZEE5-SOLD',
  'AHA', 'AHA-SOLD',
  'ALL BRANDS DATA'
];

var SOLD_HEADERS = [
  'S.NO', 'SOLD DATE', 'BRAND', 'VALIDITY', 'PLAN', 'ACTIVATION',
  'EXPIRY', 'ID', 'PASSWORD', 'SCREEN', 'PIN', 'DEVICE', 'AMOUNT'
];

function formatCellDate(val) {
  if (!val) return '';
  if (Object.prototype.toString.call(val) === '[object Date]' || val instanceof Date) {
    var yr = val.getFullYear();
    var mo = String(val.getMonth() + 1).padStart(2, '0');
    var da = String(val.getDate()).padStart(2, '0');
    return yr + '-' + mo + '-' + da;
  }
  var s = String(val).trim();
  if (s.indexOf('GMT') !== -1) {
    var d = new Date(s);
    if (!isNaN(d.getTime())) {
      var y = d.getFullYear();
      var m = String(d.getMonth() + 1).padStart(2, '0');
      var dt = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + dt;
    }
  }
  return s;
}

// Handle GET requests (Returns data so website displays live Google Sheet data)
function doGet(e) {
  var ss = getSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) || 'fetch_all';

  if (action === 'test_connection' || action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'connected',
      spreadsheetId: ss.getId(),
      spreadsheetName: ss.getName(),
      sheets: ss.getSheets().map(function(s) { return s.getName(); }),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  // Fetch all sold customer data from ALL BRANDS DATA sheet
  var sales = [];
  var allDataSheet = ss.getSheetByName('ALL BRANDS DATA');
  if (allDataSheet && allDataSheet.getLastRow() >= 4) {
    var rows = allDataSheet.getRange(4, 1, allDataSheet.getLastRow() - 3, 13).getValues();
    rows.forEach(function(r, idx) {
      if (r[0] || r[7]) { // Has S.NO or ID
        sales.push({
          id: 'sale_' + (idx + 1),
          recordNumber: String(r[0] || (idx + 1)).padStart(2, '0'),
          saleDate: formatCellDate(r[1]),
          brandName: String(r[2] || 'NETFLIX'),
          brandId: String(r[2] || 'netflix').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          validity: String(r[3] || '01 Month'),
          plan: String(r[4] || 'General'),
          activationDate: formatCellDate(r[5] || r[1]),
          expiryDate: formatCellDate(r[6]),
          accountEmail: String(r[7] || ''),
          accountPassword: String(r[8] || ''),
          screenNumber: String(r[9] || 'Screen-1'),
          screenPin: String(r[10] || ''),
          deviceName: String(r[11] || 'Personal Device'),
          amount: Number(r[12]) || 0,
          customerName: String(r[7] || '').split('@')[0],
          status: 'Active'
        });
      }
    });
  }

  // Also fetch Database Accounts from NETFLIX, PRIME VIDEO, ZEE5, AHA, etc.
  var inventory = [];
  var allSheets = ss.getSheets();
  allSheets.forEach(function(sheet) {
    var sName = sheet.getName();
    if (sName.indexOf('-SOLD') !== -1 || sName.indexOf('ALL BRANDS') !== -1) return;
    if (sheet.getLastRow() < 4) return;

    var brandId = sName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    var maxR = sheet.getLastRow();
    var bVals = sheet.getRange(1, 1, maxR, Math.min(8, sheet.getLastColumn())).getValues();

    for (var r = 0; r < bVals.length; r++) {
      var colB = String(bVals[r][1] || '').trim().toUpperCase();
      var colC = String(bVals[r][2] || '').trim();
      if (colB === 'ID' && colC) {
        var email = colC;
        var validity = '01 Month';
        if (bVals[r][4]) validity = String(bVals[r][4]);
        else if (r > 0 && bVals[r - 1][4]) validity = String(bVals[r - 1][4]);

        var password = (r + 1 < bVals.length && String(bVals[r + 1][1] || '').trim().toUpperCase() === 'PASSWORD') ? String(bVals[r + 1][2] || '') : '';

        var screenRowIdx = -1;
        for (var sr = r; sr < Math.min(bVals.length, r + 6); sr++) {
          var rowStr = bVals[sr].join(' ').toUpperCase();
          if (rowStr.indexOf('SCREEN-1') !== -1 || rowStr.indexOf('SCREEN 1') !== -1) {
            screenRowIdx = sr;
            break;
          }
        }

        var screens = [];
        if (screenRowIdx !== -1 && screenRowIdx + 1 < bVals.length) {
          var headerRow = bVals[screenRowIdx];
          var valRow = bVals[screenRowIdx + 1];
          for (var s = 0; s < 5; s++) {
            var col = s + 1;
            var scrName = headerRow[col] ? String(headerRow[col]) : ('Screen-' + (s + 1));
            var rawVal = valRow[col] ? String(valRow[col]).trim() : '';
            var isSold = rawVal && rawVal !== 'EMPTY' && rawVal !== '+' && rawVal.indexOf('+') === -1;
            screens.push({
              screenNumber: s + 1,
              name: scrName,
              status: isSold ? 'occupied' : 'empty',
              pin: isSold ? '1234' : (rawVal.replace(/[^0-9]/g, '') || String((s + 1) * 1111)),
              expiryDate: isSold ? rawVal : null,
              deviceType: 'tv'
            });
          }
        } else {
          for (var defS = 1; defS <= 5; defS++) {
            screens.push({
              screenNumber: defS,
              name: 'Screen-' + defS,
              status: 'empty',
              pin: String(defS * 1111),
              expiryDate: null,
              deviceType: 'tv'
            });
          }
        }

        inventory.push({
          id: 'acc_' + brandId + '_' + (inventory.length + 1),
          brandId: brandId,
          brandName: sName,
          email: email,
          password: password,
          validity: validity,
          screensCount: screens.length,
          screens: screens,
          isLocked: true,
          isSelected: false
        });
      }
    }
  });

  return ContentService.createTextOutput(JSON.stringify({
    status: 'connected',
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: ss.getSheets().map(function(s) { return s.getName(); }),
    salesCount: sales.length,
    sales: sales,
    inventory: inventory,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle POST requests (Updates Google Sheet from Website)
function doPost(e) {
  var lock = LockService.getScriptLock();
  var success = lock.tryLock(20000); // 20s lock for safety
  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Spreadsheet busy, please retry in a moment'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = getSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'ping';

    // 1. TEST CONNECTION
    if (action === 'test_connection' || action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'connected',
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. VALIDATE & SETUP REQUIRED SHEETS
    if (action === 'validate_sheets' || action === 'setup_sheets') {
      ensureAllRequiredSheets(ss);
      return ContentService.createTextOutput(JSON.stringify({
        status: 'valid',
        allRequiredPresent: true,
        sheets: ss.getSheets().map(function(s) { return s.getName(); }),
        message: 'All 9 worksheets verified & structured!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. ADD SALE (Updates <BRAND>-SOLD AND ALL BRANDS DATA, and updates Database screen)
    if (action === 'add_sale') {
      var brand = (data.brand || data.brandName || 'NETFLIX').toUpperCase();
      var soldSheetName = getSoldSheetName(brand);
      var allDataSheetName = 'ALL BRANDS DATA';

      var brandSoldSheet = getOrCreateSoldSheet(ss, soldSheetName, brand);
      var allBrandsSheet = getOrCreateSoldSheet(ss, allDataSheetName, 'ALL BRANDS DATA');

      var saleRow = data.saleRow;
      if (!saleRow && data.sale) {
        saleRow = formatSaleRowArray(data.sale, brand);
      }

      if (saleRow) {
        // Append to Brand-Sold sheet
        var brandLastRow = Math.max(brandSoldSheet.getLastRow(), 3);
        var brandNextSNo = String(brandLastRow - 2).padStart(2, '0');
        var rowForBrand = saleRow.slice();
        rowForBrand[0] = brandNextSNo;
        brandSoldSheet.appendRow(rowForBrand);

        // Append to ALL BRANDS DATA sheet
        var allLastRow = Math.max(allBrandsSheet.getLastRow(), 3);
        var allNextSNo = String(allLastRow - 2).padStart(2, '0');
        var rowForAll = saleRow.slice();
        rowForAll[0] = allNextSNo;
        allBrandsSheet.appendRow(rowForAll);
      }

      // Update Screen in Database sheet if account ID / email provided
      var email = data.accountEmail || (data.sale && data.sale.accountEmail);
      var screenNum = data.screenNumber || (data.sale && data.sale.screenNumber);
      var expiryDate = data.expiryDate || (data.sale && data.sale.expiryDate);
      if (email) {
        updateDatabaseScreenSold(ss, brand, email, screenNum, expiryDate);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Sale added to ' + soldSheetName + ' and ALL BRANDS DATA!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. UPDATE EXISTING SALE IN GOOGLE SHEETS
    if (action === 'update_sale') {
      var brand = (data.brand || data.brandName || 'NETFLIX').toUpperCase();
      var soldSheetName = getSoldSheetName(brand);
      var brandSoldSheet = ss.getSheetByName(soldSheetName);
      var allBrandsSheet = ss.getSheetByName('ALL BRANDS DATA');
      var updatedRow = data.saleRow;
      if (!updatedRow && data.sale) {
        updatedRow = formatSaleRowArray(data.sale, brand);
      }

      var email = data.accountEmail || (data.sale && (data.sale.accountEmail || data.sale.email));
      var screenNum = data.screenNumber || (data.sale && data.sale.screenNumber);
      var expiryDate = data.expiryDate !== undefined ? data.expiryDate : (data.sale ? data.sale.expiryDate : '');

      if (updatedRow) {
        // Update in ALL BRANDS DATA
        if (allBrandsSheet && allBrandsSheet.getLastRow() >= 4) {
          var vals = allBrandsSheet.getRange(4, 1, allBrandsSheet.getLastRow() - 3, 13).getValues();
          for (var i = 0; i < vals.length; i++) {
            var matchEmail = email && String(vals[i][7]).toLowerCase() === String(email).toLowerCase();
            var matchScreen = screenNum && String(vals[i][9]) === String(screenNum);
            var matchRec = data.sale && data.sale.recordNumber && String(vals[i][0]) === String(data.sale.recordNumber);
            if ((matchEmail && matchScreen) || matchRec) {
              updatedRow[0] = vals[i][0]; // preserve S.NO
              allBrandsSheet.getRange(i + 4, 1, 1, 13).setValues([updatedRow]);
              break;
            }
          }
        }

        // Update in Brand-Sold Sheet
        if (brandSoldSheet && brandSoldSheet.getLastRow() >= 4) {
          var bVals = brandSoldSheet.getRange(4, 1, brandSoldSheet.getLastRow() - 3, 13).getValues();
          for (var j = 0; j < bVals.length; j++) {
            var bMatchEmail = email && String(bVals[j][7]).toLowerCase() === String(email).toLowerCase();
            var bMatchScreen = screenNum && String(bVals[j][9]) === String(screenNum);
            var bMatchRec = data.sale && data.sale.recordNumber && String(bVals[j][0]) === String(data.sale.recordNumber);
            if ((bMatchEmail && bMatchScreen) || bMatchRec) {
              updatedRow[0] = bVals[j][0]; // preserve S.NO
              brandSoldSheet.getRange(j + 4, 1, 1, 13).setValues([updatedRow]);
              break;
            }
          }
        }

        // Also update Database screen cell
        if (email) {
          updateDatabaseScreenSold(ss, brand, email, screenNum, expiryDate);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Sale updated in Google Sheets!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. DELETE SALE FROM GOOGLE SHEETS
    if (action === 'delete_sale') {
      var brand = (data.brand || data.brandName || 'NETFLIX').toUpperCase();
      var soldSheetName = getSoldSheetName(brand);
      var brandSoldSheet = ss.getSheetByName(soldSheetName);
      var allBrandsSheet = ss.getSheetByName('ALL BRANDS DATA');
      var email = data.accountEmail || (data.sale && (data.sale.accountEmail || data.sale.email));
      var screenNum = data.screenNumber || (data.sale && data.sale.screenNumber);

      if (allBrandsSheet && allBrandsSheet.getLastRow() >= 4) {
        var aVals = allBrandsSheet.getRange(4, 1, allBrandsSheet.getLastRow() - 3, 13).getValues();
        for (var a = 0; a < aVals.length; a++) {
          if (email && String(aVals[a][7]).toLowerCase() === String(email).toLowerCase() && String(aVals[a][9]) === String(screenNum)) {
            allBrandsSheet.deleteRow(a + 4);
            break;
          }
        }
      }

      if (brandSoldSheet && brandSoldSheet.getLastRow() >= 4) {
        var sVals = brandSoldSheet.getRange(4, 1, brandSoldSheet.getLastRow() - 3, 13).getValues();
        for (var b = 0; b < sVals.length; b++) {
          if (email && String(sVals[b][7]).toLowerCase() === String(email).toLowerCase() && String(sVals[b][9]) === String(screenNum)) {
            brandSoldSheet.deleteRow(b + 4);
            break;
          }
        }
      }

      if (email) {
        updateDatabaseScreenSold(ss, brand, email, screenNum, 'EMPTY');
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Sale deleted and screen reset to empty!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 6. UPDATE ACCOUNT IN DATABASE SHEET
    if (action === 'update_account') {
      var bName = (data.brand || data.brandName || 'NETFLIX').toUpperCase();
      var dbSheet = getOrCreateDatabaseSheet(ss, getDbSheetName(bName));
      if (data.account) {
        updateOrInsertAccountInDbSheet(dbSheet, data.account);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Account updated in ' + bName + ' database sheet!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 7. DELETE ACCOUNT FROM DATABASE SHEET
    if (action === 'delete_account') {
      var bName = (data.brand || data.brandName || 'NETFLIX').toUpperCase();
      var dbSheet = ss.getSheetByName(getDbSheetName(bName));
      var targetEmail = data.email || (data.account && data.account.email);
      if (dbSheet && targetEmail && dbSheet.getLastRow() >= 3) {
        var dbVals = dbSheet.getRange(1, 1, dbSheet.getLastRow(), 5).getValues();
        for (var dr = 0; dr < dbVals.length; dr++) {
          if (dbVals[dr][2] && String(dbVals[dr][2]).trim().toLowerCase() === String(targetEmail).trim().toLowerCase()) {
            dbSheet.getRange(dr + 1, 1, 6, 8).clearContent().clearFormat();
            break;
          }
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Account removed from ' + bName + ' database sheet!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 8. SYNC ALL INVENTORY & SALES
    if (action === 'sync_all' || action === 'batch_sync') {
      ensureAllRequiredSheets(ss);

      // Write Sales if provided
      if (data.sales && data.sales.length > 0) {
        var allBrandsSheet = getOrCreateSoldSheet(ss, 'ALL BRANDS DATA', 'ALL BRANDS DATA');
        if (allBrandsSheet.getLastRow() >= 4) {
          allBrandsSheet.getRange(4, 1, allBrandsSheet.getLastRow() - 3, 13).clearContent();
        }

        var brandRowsMap = {};
        var allRows = [];

        data.sales.forEach(function(sale, i) {
          var b = (sale.brandName || sale.brandId || 'NETFLIX').toUpperCase();
          var row = formatSaleRowArray(sale, b);
          row[0] = String(i + 1).padStart(2, '0');
          allRows.push(row);

          var bSoldName = getSoldSheetName(b);
          if (!brandRowsMap[bSoldName]) brandRowsMap[bSoldName] = [];
          var bRow = row.slice();
          bRow[0] = String(brandRowsMap[bSoldName].length + 1).padStart(2, '0');
          brandRowsMap[bSoldName].push(bRow);
        });

        if (allRows.length > 0) {
          allBrandsSheet.getRange(4, 1, allRows.length, 13).setValues(allRows);
        }

        for (var bNameKey in brandRowsMap) {
          var bSheet = getOrCreateSoldSheet(ss, bNameKey, bNameKey.replace('-SOLD', ''));
          if (bSheet.getLastRow() >= 4) {
            bSheet.getRange(4, 1, bSheet.getLastRow() - 3, 13).clearContent();
          }
          if (brandRowsMap[bNameKey].length > 0) {
            bSheet.getRange(4, 1, brandRowsMap[bNameKey].length, 13).setValues(brandRowsMap[bNameKey]);
          }
        }
      }

      // Sync Database Accounts if provided
      if (data.inventory && data.inventory.length > 0) {
        syncInventoryAccountsToSheets(ss, data.inventory);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'All worksheets synchronized successfully!',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unknown action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Helpers
function getSoldSheetName(brand) {
  var b = (brand || '').toUpperCase().trim();
  if (b.indexOf('NETFLIX') !== -1) return 'NETFLIX-SOLD';
  if (b.indexOf('PRIME') !== -1 || b.indexOf('AMAZON') !== -1) return 'PRIME VIDEO-SOLD';
  if (b.indexOf('ZEE') !== -1) return 'ZEE5-SOLD';
  if (b.indexOf('AHA') !== -1) return 'AHA-SOLD';
  return b + '-SOLD';
}

function getDbSheetName(brand) {
  var b = (brand || '').toUpperCase().trim();
  if (b.indexOf('NETFLIX') !== -1) return 'NETFLIX';
  if (b.indexOf('PRIME') !== -1 || b.indexOf('AMAZON') !== -1) return 'PRIME VIDEO';
  if (b.indexOf('ZEE') !== -1) return 'ZEE5';
  if (b.indexOf('AHA') !== -1) return 'AHA';
  return b;
}

function getOrCreateSoldSheet(ss, sheetName, bannerTitle) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  // Setup 3-row header if new or empty
  if (sheet.getLastRow() < 3) {
    sheet.clear();
    // Row 1: Brand Banner
    sheet.getRange('A1:M1').merge().setValue(bannerTitle.toUpperCase());
    sheet.getRange('A1').setBackground(bannerTitle.indexOf('ALL') !== -1 ? '#ea580c' : '#dc2626')
      .setFontColor('#ffffff').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');

    // Row 2: DAILY SALE'S
    sheet.getRange('A2:M2').merge().setValue("DAILY SALE'S");
    sheet.getRange('A2').setBackground('#ea580c')
      .setFontColor('#ffffff').setFontWeight('bold').setFontSize(12).setHorizontalAlignment('center');

    // Row 3: 13 Columns Table Headers
    sheet.getRange(3, 1, 1, 13).setValues([SOLD_HEADERS]);
    sheet.getRange(3, 1, 1, 13).setBackground('#93c5fd')
      .setFontColor('#0f172a').setFontWeight('bold').setFontSize(10).setHorizontalAlignment('center');

    sheet.setFrozenRows(3);
  }
  return sheet;
}

function ensureAllRequiredSheets(ss) {
  REQUIRED_SHEETS.forEach(function(name) {
    if (name.indexOf('-SOLD') !== -1 || name === 'ALL BRANDS DATA') {
      getOrCreateSoldSheet(ss, name, name.replace('-SOLD', ''));
    } else {
      getOrCreateDatabaseSheet(ss, name);
    }
  });
}

function getOrCreateDatabaseSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    var sheets = ss.getSheets();
    if (sheets.length > 0) {
      var first = sheets[0];
      var fName = first.getName();
      if (fName === 'Sheet1' || fName === 'Sheet 1') {
        first.setName(sheetName);
        return first;
      }
      try {
        var topVal = String(first.getRange(1, 1, 2, 3).getValues()).toUpperCase();
        if (topVal.indexOf(sheetName) !== -1 && fName !== sheetName) {
          first.setName(sheetName);
          return first;
        }
      } catch (e) {}
    }
    sheet = ss.insertSheet(sheetName);
  }
  if (sheet.getLastRow() < 1) {
    sheet.getRange('A1:F1').merge().setValue(sheetName);
    sheet.getRange('A1').setBackground('#dc2626').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');
  }
  return sheet;
}

function formatSaleRowArray(sale, brand) {
  return [
    '01',
    sale.saleDate || sale.activationDate || new Date().toISOString().slice(0, 10),
    brand || 'NETFLIX',
    (sale.validity || '01-MONTH').toUpperCase(),
    (sale.plan || sale.planName || 'STANDARD').toUpperCase(),
    sale.activationDate || '',
    sale.expiryDate || '',
    sale.accountEmail || sale.email || '',
    sale.accountPassword || sale.password || '',
    sale.screenNumber || 'Screen-1',
    sale.screenPin || sale.pin || '',
    sale.deviceName || 'TV / Mobile / Laptop',
    sale.amount !== undefined ? sale.amount : '0.00'
  ];
}

function updateDatabaseScreenSold(ss, brand, email, screenNum, expiryDate) {
  var dbSheetName = getDbSheetName(brand);
  var sheet = ss.getSheetByName(dbSheetName);
  if (!sheet) return;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var values = sheet.getRange(1, 1, lastRow, 8).getValues();
  for (var r = 0; r < values.length; r++) {
    var rowText = (String(values[r][1] || '') + ' ' + String(values[r][2] || '')).toLowerCase();
    if (email && rowText.indexOf(String(email).trim().toLowerCase()) !== -1) {
      var sIdx = 1;
      if (typeof screenNum === 'number') {
        sIdx = screenNum;
      } else if (typeof screenNum === 'string') {
        var match = screenNum.match(/\\d+/);
        if (match) sIdx = parseInt(match[0], 10);
      }
      if (sIdx < 1 || sIdx > 5) sIdx = 1;

      var screenHeaderRow = -1;
      for (var searchR = r; searchR < Math.min(values.length, r + 7); searchR++) {
        var rowStr = values[searchR].join(' ').toUpperCase();
        if (rowStr.indexOf('SCREEN-1') !== -1 || rowStr.indexOf('SCREEN 1') !== -1) {
          screenHeaderRow = searchR + 1;
          break;
        }
      }

      if (screenHeaderRow !== -1) {
        var targetRow = screenHeaderRow + 1;
        var targetCol = sIdx + 1; // Col 2 = B (SCREEN-1)
        var cellVal = expiryDate || 'SOLD';
        if (cellVal === 'EMPTY') {
          sheet.getRange(targetRow, targetCol).setValue('').setBackground('#ffffff').setFontColor('#000000');
        } else {
          sheet.getRange(targetRow, targetCol).setValue(cellVal).setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');
        }
      }
      break;
    }
  }
}

function updateOrInsertAccountInDbSheet(sheet, account) {
  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 2) {
    var values = sheet.getRange(1, 1, lastRow, 5).getValues();
    for (var r = 0; r < values.length; r++) {
      var rowText = (String(values[r][1] || '') + ' ' + String(values[r][2] || '')).toLowerCase();
      if (account.email && rowText.indexOf(String(account.email).trim().toLowerCase()) !== -1) {
        foundRow = r + 1;
        break;
      }
    }
  }

  if (foundRow !== -1) {
    // Update password in row directly beneath ID
    if (account.password) {
      sheet.getRange(foundRow + 1, 3).setValue(account.password);
    }
    // Update validity
    if (account.validity) {
      try {
        sheet.getRange(foundRow, 5).setValue(account.validity);
      } catch (e) {}
    }

    // Find screen header row
    var valuesFull = sheet.getRange(foundRow, 1, Math.min(7, lastRow - foundRow + 1), 7).getValues();
    var sRowRel = -1;
    for (var vr = 0; vr < valuesFull.length; vr++) {
      var sStr = valuesFull[vr].join(' ').toUpperCase();
      if (sStr.indexOf('SCREEN-1') !== -1) {
        sRowRel = vr;
        break;
      }
    }

    if (sRowRel !== -1) {
      var valueRow = foundRow + sRowRel + 1;
      var screens = account.screens || [];
      for (var s = 0; s < Math.min(screens.length, 5); s++) {
        var col = s + 2;
        var scr = screens[s];
        if (scr && scr.status === 'occupied') {
          sheet.getRange(valueRow, col).setValue(scr.expiryDate || 'SOLD').setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');
        } else if (scr && scr.pin) {
          sheet.getRange(valueRow, col).setValue(scr.pin).setBackground('#ffffff').setFontColor('#000000');
        } else {
          sheet.getRange(valueRow, col).setValue('').setBackground('#ffffff');
        }
      }
    }
  } else {
    var nextRow = Math.max(lastRow + 2, 2);
    var accCount = 1;
    if (lastRow >= 2) {
      var allColA = sheet.getRange(1, 1, lastRow, 2).getValues();
      allColA.forEach(function(row) {
        if (String(row[1]).toUpperCase() === 'ID') accCount++;
      });
    }
    var accNumStr = String(accCount).padStart(2, '0');

    sheet.getRange(nextRow, 5, 1, 2).merge().setValue(account.validity || '01-MONTH')
      .setBackground('#16a34a').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    nextRow++;

    sheet.getRange(nextRow, 1).setValue(accNumStr).setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(nextRow, 2).setValue('ID').setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(nextRow, 3, 1, 4).merge().setValue(account.email || '').setFontWeight('bold');
    nextRow++;

    sheet.getRange(nextRow, 2).setValue('PASSWORD').setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(nextRow, 3, 1, 4).merge().setValue(account.password || '');
    nextRow++;

    nextRow++; // separator

    for (var ns = 0; ns < 5; ns++) {
      var nCol = ns + 2;
      sheet.getRange(nextRow, nCol).setValue('SCREEN-' + (ns + 1))
        .setBackground('#ea580c').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
    }
    nextRow++;

    var newScreens = account.screens || [];
    for (var nvs = 0; nvs < 5; nvs++) {
      var nvCol = nvs + 2;
      var nscr = newScreens[nvs];
      if (nscr && nscr.status === 'occupied') {
        sheet.getRange(nextRow, nvCol).setValue(nscr.expiryDate || 'SOLD')
          .setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
      } else if (nscr && nscr.pin) {
        sheet.getRange(nextRow, nvCol).setValue(nscr.pin).setHorizontalAlignment('center');
      } else {
        sheet.getRange(nextRow, nvCol).setValue('').setHorizontalAlignment('center');
      }
    }
  }
}

function syncInventoryAccountsToSheets(ss, inventory) {
  var byBrand = {};
  inventory.forEach(function(item) {
    var b = getDbSheetName(item.brandName || item.brandId);
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(item);
  });

  for (var brandName in byBrand) {
    var sheet = getOrCreateDatabaseSheet(ss, brandName);
    var items = byBrand[brandName];
    items.forEach(function(item) {
      updateOrInsertAccountInDbSheet(sheet, item);
    });
  }
}
`;

/**
 * Safely post to Google Sheets:
 * 1. Tries the same-origin backend relay /api/sheets/proxy (bypasses browser CORS & eliminates "Failed to fetch")
 * 2. Falls back to direct browser fetch if proxy is unreachable.
 */
async function sendToSheetsEndpoint(webhookUrl, payload) {
  // 1. Same-origin backend proxy
  try {
    const res = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: webhookUrl || '', ...payload })
    });
    if (res.ok) {
      const data = await res.json();
      return { success: data.status === 'success' || data.success === true, data, message: data.message };
    } else {
      const errData = await res.json().catch(() => ({}));
      if (!webhookUrl || !webhookUrl.trim()) {
        return { success: false, message: errData?.message || 'Google Sheet Webhook URL not configured' };
      }
    }
  } catch (proxyErr) {
    console.warn('Backend proxy fetch failed, attempting direct browser fallback:', proxyErr.message);
  }

  // 2. Direct browser fallback (only if webhookUrl is non-empty)
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error('HTTP error ' + response.status);
    }

    const data = await response.json();
    return { success: data.status === 'success', data, message: data.message };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Real-time sync sale to Google Sheets Web App endpoint (create or update)
 */
export async function syncSaleToGoogleSheet(webhookUrl, sale, isUpdate = false) {
  const brandName = getDbSheetName(sale.brandId, sale.brandName);
  const saleRow = formatSaleRow13(sale);

  return await sendToSheetsEndpoint(webhookUrl || '', {
    action: isUpdate ? 'update_sale' : 'add_sale',
    brand: brandName,
    saleRow,
    sale,
    accountEmail: sale.accountEmail,
    screenNumber: sale.screenNumber,
    expiryDate: sale.expiryDate
  });
}

/**
 * Real-time delete sale from Google Sheets Web App endpoint
 */
export async function syncSaleDeleteToGoogleSheet(webhookUrl, sale) {
  const brandName = getDbSheetName(sale.brandId, sale.brandName);
  return await sendToSheetsEndpoint(webhookUrl || '', {
    action: 'delete_sale',
    brand: brandName,
    accountEmail: sale.accountEmail,
    screenNumber: sale.screenNumber,
    sale
  });
}

/**
 * Real-time delete account from Google Sheets database sheet
 */
export async function syncAccountDeleteToGoogleSheet(webhookUrl, account, brandName) {
  const brand = getDbSheetName(account.brandId, brandName);
  return await sendToSheetsEndpoint(webhookUrl || '', {
    action: 'delete_account',
    brand,
    email: account.email,
    account
  });
}

/**
 * Real-time sync single account to Google Sheets database sheet
 */
export async function syncAccountToGoogleSheet(webhookUrl, account, brandName) {
  const brand = getDbSheetName(account.brandId, brandName);
  return await sendToSheetsEndpoint(webhookUrl || '', {
    action: 'update_account',
    brand,
    account
  });
}

/**
 * Full sync all inventory, sales, brands to Google Sheets
 */
export async function syncAllToGoogleSheet(webhookUrl, inventory, sales, brands) {
  return await sendToSheetsEndpoint(webhookUrl || '', {
    action: 'sync_all',
    inventory,
    sales,
    brands
  });
}

/**
 * Fetch live data from Google Sheets to display in Website
 */
export async function fetchLiveSpreadsheetData(webhookUrl) {
  // 1. Same-origin backend proxy (/api/sheets/live-data)
  // This completely eliminates "Failed to fetch" CORS errors on mobile and desktop!
  try {
    const query = webhookUrl ? `?webhookUrl=${encodeURIComponent(webhookUrl.trim())}&_t=${Date.now()}` : `?_t=${Date.now()}`;
    const res = await fetch(`/api/sheets/live-data${query}`);
    if (res.ok) {
      const data = await res.json();
      return {
        success: data.status === 'connected' || data.status === 'success' || Array.isArray(data.sales),
        status: data.status || 'success',
        sales: data.sales || [],
        inventory: data.inventory || [],
        sheets: data.sheets || [],
        spreadsheetName: data.spreadsheetName || 'OTT A/C MANAGER'
      };
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData?.message && !webhookUrl) {
        return { success: false, message: errData.message };
      }
    }
  } catch (proxyErr) {
    console.warn('Backend live-data proxy failed, attempting direct browser fallback:', proxyErr.message);
  }

  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  // 2. Direct browser fallback
  try {
    const url = new URL(webhookUrl.trim());
    url.searchParams.set('action', 'fetch_all');
    url.searchParams.set('_t', String(Date.now()));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    return {
      success: true,
      status: data.status || 'success',
      sales: data.sales || [],
      inventory: data.inventory || [],
      sheets: data.sheets || [],
      spreadsheetName: data.spreadsheetName || 'OTT A/C MANAGER'
    };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * Test Google Sheet connection
 */
export async function testGoogleSheetConnection(webhookUrl) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return {
      connected: false,
      message: 'No Google Sheet Webhook URL or Apps Script endpoint configured.'
    };
  }

  // 1. Try server endpoint /api/sheets/test
  try {
    const res = await fetch('/api/sheets/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: webhookUrl.trim() })
    });
    if (res.ok) {
      return await res.json();
    } else {
      const errData = await res.json().catch(() => ({}));
      if (errData?.message) {
        return { connected: false, message: errData.message };
      }
    }
  } catch (e) {
    console.warn('Backend sheets test failed, attempting direct browser ping:', e.message);
  }

  // 2. Direct browser test
  try {
    const url = new URL(webhookUrl.trim());
    url.searchParams.set('action', 'test_connection');
    url.searchParams.set('_t', String(Date.now()));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      mode: 'cors',
      redirect: 'follow'
    });

    if (!response.ok) {
      return {
        connected: false,
        message: `HTTP error ${response.status}: ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      connected: data.status === 'connected',
      spreadsheetName: data.spreadsheetName || 'OTT A/C MANAGER',
      sheets: data.sheets || [],
      message: data.status === 'connected' ? 'Spreadsheet Connected Successfully!' : (data.message || 'Connection ping failed')
    };
  } catch (err) {
    return {
      connected: false,
      message: `Failed to connect: ${err.message}. Ensure Apps Script is deployed as Web App with Access: Anyone.`
    };
  }
}

/**
 * Validate required worksheets in the spreadsheet
 */
export async function validateGoogleSheets(webhookUrl, autoCreate = true) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { valid: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'validate_sheets',
        autoCreate
      })
    });

    const data = await response.json();
    return {
      valid: data.allRequiredPresent || data.status === 'valid',
      existingSheets: data.existingSheets || data.sheets || [],
      missingSheets: data.missingSheets || [],
      message: data.message || 'All worksheets validated successfully!'
    };
  } catch (err) {
    return { valid: false, message: err.message };
  }
}

/**
 * Builds standard payload for full spreadsheet sync
 */
export function buildSpreadsheetPayload(inventory = [], sales = [], brands = []) {
  const brandMap = {};
  (brands || []).forEach(b => {
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

  (inventory || []).filter(item => !item.isDeleted).forEach(item => {
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

  (sales || []).forEach((sale, idx) => {
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
      String(sale.deviceName || 'Personal Device'),
      String(sale.amount || '0')
    ];

    soldSheets['ALL BRANDS DATA'].push(soldRow);
    if (soldSheets[brandKeys.sold]) {
      soldSheets[brandKeys.sold].push(soldRow);
    }
  });

  return {
    inventory: (inventory || []).filter(item => !item.isDeleted),
    sales: sales || [],
    brands: brands || [],
    brandSheets,
    soldSheets,
    allDataRows: soldSheets['ALL BRANDS DATA'],
    salesRows: soldSheets['ALL BRANDS DATA']
  };
}
