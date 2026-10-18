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
// HOW TO DEPLOY:
// 1. In your Google Sheet, click Extensions > Apps Script.
// 2. Select all existing text and delete it.
// 3. Paste this entire code into the editor.
// 4. Click "Deploy" > "New deployment" > Select type: "Web app".
// 5. Description: "OTT Manager Live Sync"
// 6. Execute as: "Me (Fixyourmobiles10@gmail.com)"
// 7. Who has access: "Anyone"
// 8. Click "Deploy", authorize access, and copy the Web App URL into the Website!
// ============================================================================

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

// Handle GET requests (Returns data so website displays live Google Sheet data)
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
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
          saleDate: String(r[1] || ''),
          brandName: String(r[2] || 'NETFLIX'),
          brandId: String(r[2] || 'netflix').toLowerCase().replace(/[^a-z0-9]/g, '_'),
          validity: String(r[3] || '01 Month'),
          plan: String(r[4] || 'General'),
          activationDate: String(r[5] || r[1] || ''),
          expiryDate: String(r[6] || ''),
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
    var bVals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
    for (var r = 0; r < bVals.length; r += 5) {
      var num = bVals[r] ? bVals[r][0] : '';
      var email = bVals[r] ? bVals[r][2] : '';
      var validity = bVals[r] ? bVals[r][4] : '01 Month';
      var password = (bVals[r + 1]) ? bVals[r + 1][2] : '';
      if (!email && !num) continue;

      var screens = [];
      for (var s = 0; s < 5; s++) {
        var col = s + 1;
        var scrName = (bVals[r + 2] && bVals[r + 2][col]) ? String(bVals[r + 2][col]) : ('Screen-' + (s + 1));
        var scrVal = (bVals[r + 3] && bVals[r + 3][col]) ? String(bVals[r + 3][col]) : '';
        var isSold = scrVal && scrVal !== 'EMPTY' && scrVal !== '+' && scrVal.indexOf('+') === -1;
        screens.push({
          screenNumber: s + 1,
          name: scrName,
          status: isSold ? 'occupied' : 'empty',
          pin: isSold ? '1234' : (scrVal.replace(/[^\\d]/g, '') || String((s + 1) * 1111)),
          expiryDate: isSold ? scrVal : null,
          deviceType: 'tv'
        });
      }

      inventory.push({
        id: 'acc_' + brandId + '_' + (Math.floor(r / 5) + 1),
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
  var success = lock.tryLock(20000); // 20s lock for high safety
  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Spreadsheet busy, please retry in a moment'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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

    // 4. UPDATE ACCOUNT IN DATABASE SHEET
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

    // 5. SYNC ALL INVENTORY & SALES
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
  if (lastRow < 3) return;
  var values = sheet.getRange(1, 1, lastRow, 8).getValues();
  for (var r = 0; r < values.length; r++) {
    if (values[r][2] && String(values[r][2]).trim().toLowerCase() === String(email).trim().toLowerCase()) {
      var sIdx = 1;
      if (typeof screenNum === 'number') {
        sIdx = screenNum;
      } else if (typeof screenNum === 'string') {
        var match = screenNum.match(/\\d+/);
        if (match) sIdx = parseInt(match[0], 10);
      }
      if (sIdx < 1 || sIdx > 10) sIdx = 1;
      var targetCol = sIdx + 1;
      var cellVal = expiryDate || 'SOLD';
      var targetRow = r + 4;
      sheet.getRange(targetRow, targetCol).setValue(cellVal);
      sheet.getRange(targetRow, targetCol).setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');
      break;
    }
  }
}

function updateOrInsertAccountInDbSheet(sheet, account) {
  var lastRow = sheet.getLastRow();
  var foundRow = -1;
  if (lastRow >= 3) {
    var values = sheet.getRange(1, 1, lastRow, 5).getValues();
    for (var r = 0; r < values.length; r++) {
      if (values[r][2] && String(values[r][2]).trim().toLowerCase() === String(account.email).trim().toLowerCase()) {
        foundRow = r + 1;
        break;
      }
    }
  }

  if (foundRow !== -1) {
    // Update existing account
    sheet.getRange(foundRow, 5).setValue(account.validity || '01-MONTH');
    sheet.getRange(foundRow + 1, 3).setValue(account.password || '');
    var screens = account.screens || [];
    for (var s = 0; s < Math.max(screens.length, 5); s++) {
      var col = s + 2;
      sheet.getRange(foundRow + 2, col).setValue('SCREEN-' + (s + 1));
      var scr = screens[s];
      var cellText = scr ? (scr.status === 'occupied' ? (scr.expiryDate || 'SOLD') : (scr.pin || 'EMPTY')) : '';
      sheet.getRange(foundRow + 3, col).setValue(cellText);
    }
  } else {
    // Append new account block
    var nextRow = Math.max(lastRow + 1, 2);
    var accNum = String(Math.floor(nextRow / 5) + 1).padStart(2, '0');
    sheet.getRange(nextRow, 1).setValue(accNum).setFontWeight('bold');
    sheet.getRange(nextRow, 2).setValue('ID').setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold');
    sheet.getRange(nextRow, 3).setValue(account.email || '');
    sheet.getRange(nextRow, 5, 1, 2).merge().setValue(account.validity || '01-MONTH').setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');

    sheet.getRange(nextRow + 1, 2).setValue('PASSWORD').setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
    sheet.getRange(nextRow + 1, 3).setValue(account.password || '');

    var newScreens = account.screens || [];
    for (var ns = 0; ns < Math.max(newScreens.length, 5); ns++) {
      var nCol = ns + 2;
      sheet.getRange(nextRow + 2, nCol).setValue('SCREEN-' + (ns + 1)).setBackground('#ea580c').setFontColor('#ffffff').setFontWeight('bold');
      var nScr = newScreens[ns];
      var nCellText = nScr ? (nScr.status === 'occupied' ? (nScr.expiryDate || 'SOLD') : (nScr.pin || 'EMPTY')) : '';
      sheet.getRange(nextRow + 3, nCol).setValue(nCellText);
    }
  }
}

function syncInventoryAccountsToSheets(ss, inventory) {
  var byBrand = {};
  inventory.forEach(function(item) {
    var b = getDbSheetName(item.brandId);
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(item);
  });

  for (var brandName in byBrand) {
    var sheet = getOrCreateDatabaseSheet(ss, brandName);
    var items = byBrand[brandName];
    var curRow = 2;
    sheet.clearContents();
    sheet.getRange('A1:F1').merge().setValue(brandName);
    sheet.getRange('A1').setBackground('#dc2626').setFontColor('#ffffff').setFontWeight('bold').setFontSize(14).setHorizontalAlignment('center');

    items.forEach(function(item, idx) {
      var numStr = String(idx + 1).padStart(2, '0');
      sheet.getRange(curRow, 1).setValue(numStr).setFontWeight('bold');
      sheet.getRange(curRow, 2).setValue('ID').setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold');
      sheet.getRange(curRow, 3).setValue(item.email || '');
      sheet.getRange(curRow, 5, 1, 2).merge().setValue(item.validity || '01-MONTH').setBackground('#22c55e').setFontColor('#ffffff').setFontWeight('bold');

      sheet.getRange(curRow + 1, 2).setValue('PASSWORD').setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
      sheet.getRange(curRow + 1, 3).setValue(item.password || '');

      var screens = item.screens || [];
      for (var s = 0; s < Math.max(screens.length, 5); s++) {
        var col = s + 2;
        sheet.getRange(curRow + 2, col).setValue('SCREEN-' + (s + 1)).setBackground('#ea580c').setFontColor('#ffffff').setFontWeight('bold');
        var scr = screens[s];
        var cellText = scr ? (scr.status === 'occupied' ? (scr.expiryDate || 'SOLD') : (scr.pin || 'EMPTY')) : '';
        sheet.getRange(curRow + 3, col).setValue(cellText);
      }

      curRow += 5;
    });
  }
`;

/**
 * Real-time sync sale to Google Sheets Web App endpoint
 */
export async function syncSaleToGoogleSheet(webhookUrl, sale) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const brandName = getDbSheetName(sale.brandId, sale.brandName);
    const saleRow = formatSaleRow13(sale);

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'add_sale',
        brand: brandName,
        saleRow,
        sale,
        accountEmail: sale.accountEmail,
        screenNumber: sale.screenNumber,
        expiryDate: sale.expiryDate
      })
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
 * Real-time sync single account to Google Sheets database sheet
 */
export async function syncAccountToGoogleSheet(webhookUrl, account, brandName) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const brand = getDbSheetName(account.brandId, brandName);
    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'update_account',
        brand,
        account
      })
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
 * Full sync all inventory, sales, brands to Google Sheets
 */
export async function syncAllToGoogleSheet(webhookUrl, inventory, sales, brands) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const payload = {
      action: 'sync_all',
      inventory,
      sales,
      brands
    };

    const response = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
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
 * Fetch live data from Google Sheets to display in Website
 */
export async function fetchLiveSpreadsheetData(webhookUrl) {
  if (!webhookUrl || !webhookUrl.trim()) {
    return { success: false, message: 'Google Sheet Webhook URL not configured' };
  }

  try {
    const url = new URL(webhookUrl.trim());
    url.searchParams.set('action', 'fetch_all');
    url.searchParams.set('_t', String(Date.now()));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
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

  try {
    const url = new URL(webhookUrl.trim());
    url.searchParams.set('action', 'test_connection');
    url.searchParams.set('_t', String(Date.now()));

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
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
    brandSheets,
    soldSheets,
    allDataRows: soldSheets['ALL BRANDS DATA'],
    salesRows: soldSheets['ALL BRANDS DATA']
  };
}
