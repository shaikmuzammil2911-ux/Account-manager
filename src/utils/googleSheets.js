/**
 * Google Sheets Integration Specifications
 * Supports: One Google Spreadsheet with multiple worksheets:
 *   1. Netflix
 *   2. Amazon
 *   3. Aha
 *   4. All Data (consolidated accounts & screens)
 *   5. Sales (sales records & history)
 * Plus any dynamic OTT brands added by the administrator.
 */

export const DEFAULT_CELL_MAPPINGS = [
  { fieldKey: 'recordNumber', label: 'Record No', sheetCol: 'A', header: 'Record No', enabled: true },
  { fieldKey: 'customerName', label: 'Customer Name', sheetCol: 'B', header: 'Customer Name', enabled: true },
  { fieldKey: 'customerNumber', label: 'Customer Phone', sheetCol: 'C', header: 'Phone Number', enabled: true },
  { fieldKey: 'brandName', label: 'OTT Brand', sheetCol: 'D', header: 'OTT Platform', enabled: true },
  { fieldKey: 'accountEmail', label: 'Account ID / Email', sheetCol: 'E', header: 'Account Email', enabled: true },
  { fieldKey: 'accountPassword', label: 'Password', sheetCol: 'F', header: 'Password', enabled: true },
  { fieldKey: 'screenNumber', label: 'Screen No', sheetCol: 'G', header: 'Screen Number', enabled: true },
  { fieldKey: 'screenPin', label: 'Screen PIN', sheetCol: 'H', header: 'Screen PIN', enabled: true },
  { fieldKey: 'validity', label: 'Validity', sheetCol: 'I', header: 'Validity', enabled: true },
  { fieldKey: 'activationDate', label: 'Activation Date', sheetCol: 'J', header: 'Activation Date', enabled: true },
  { fieldKey: 'expiryDate', label: 'Expiry Date', sheetCol: 'K', header: 'Expiry Date', enabled: true },
  { fieldKey: 'amount', label: 'Amount Paid', sheetCol: 'L', header: 'Amount', enabled: true },
  { fieldKey: 'deviceName', label: 'Device Name', sheetCol: 'M', header: 'Device Name', enabled: true }
];

export function downloadSalesCsv(salesList = [], cellMappings = DEFAULT_CELL_MAPPINGS) {
  const activeMappings = [...cellMappings].filter(m => m.enabled).sort((a, b) => a.sheetCol.localeCompare(b.sheetCol));
  const headers = activeMappings.map(m => `"${(m.header || m.label).replace(/"/g, '""')}"`);

  const rows = salesList.map(sale => {
    return activeMappings.map(m => {
      const val = sale[m.fieldKey];
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

export const REQUIRED_WORKSHEETS = ['Netflix', 'Amazon', 'Aha', 'All Data', 'Sales'];

export const ACCOUNT_SHEET_HEADERS = [
  'Account ID',
  'OTT Brand',
  'Email / Mail ID',
  'Password',
  'Screen Count',
  'Screen Number',
  'Screen PIN',
  'Validity / Expiry Date',
  'Account Status',
  'Screen Status',
  'Created At',
  'Updated At'
];

export const SALES_SHEET_HEADERS = [
  'Sale ID',
  'Account ID',
  'OTT Brand',
  'Screen Number',
  'Screen PIN',
  'Customer Name',
  'Customer Phone',
  'Amount',
  'Sale Date',
  'Expiry Date',
  'Sale Status'
];

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// ============================================================================
// OTT SELLERS MANAGEMENT SYSTEM — MULTI-WORKSHEET SPREADSHEET SYNC SCRIPT
// ============================================================================
// Supports: Netflix, Amazon, Aha, All Data, Sales & dynamic OTT platforms.
//
// INSTRUCTIONS:
// 1. In your Google Sheet, click Extensions > Apps Script.
// 2. Replace all existing code with this script.
// 3. Click "Deploy" > "New deployment" > Select type: "Web app".
// 4. Set Description: "OTT Sync API".
// 5. Set "Execute as": "Me".
// 6. Set "Who has access": "Anyone".
// 7. Click Deploy, authorize permissions, and copy the Web App URL into "Cells Linkup"!
// ============================================================================

var REQUIRED_SHEETS = ['Netflix', 'Amazon', 'Aha', 'All Data', 'Sales'];

var ACCOUNT_HEADERS = [
  'Account ID', 'OTT Brand', 'Email / Mail ID', 'Password',
  'Screen Count', 'Screen Number', 'Screen PIN', 'Validity / Expiry Date',
  'Account Status', 'Screen Status', 'Created At', 'Updated At'
];

var SALES_HEADERS = [
  'Sale ID', 'Account ID', 'OTT Brand', 'Screen Number', 'Screen PIN',
  'Customer Name', 'Customer Phone', 'Amount', 'Sale Date', 'Expiry Date', 'Sale Status'
];

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets().map(function(s) { return s.getName(); });
  
  return ContentService.createTextOutput(JSON.stringify({
    status: 'connected',
    spreadsheetId: ss.getId(),
    spreadsheetName: ss.getName(),
    sheets: sheets,
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // 15-second timeout to handle high concurrency
  var success = lock.tryLock(15000);
  if (!success) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Server busy, could not acquire spreadsheet lock'
    })).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'ping';

    // 1. TEST CONNECTION
    if (action === 'test_connection' || action === 'ping') {
      var currentSheets = ss.getSheets().map(function(s) { return s.getName(); });
      return ContentService.createTextOutput(JSON.stringify({
        status: 'connected',
        spreadsheetId: ss.getId(),
        spreadsheetName: ss.getName(),
        sheets: currentSheets,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. VALIDATE REQUIRED SHEETS
    if (action === 'validate_sheets') {
      var existing = ss.getSheets().map(function(s) { return s.getName(); });
      var missing = [];
      REQUIRED_SHEETS.forEach(function(req) {
        if (existing.indexOf(req) === -1) {
          missing.push(req);
        }
      });

      // Auto-create missing sheets if autoCreate is enabled
      if (data.autoCreate && missing.length > 0) {
        missing.forEach(function(name) {
          var newSheet = ss.insertSheet(name);
          var headers = name === 'Sales' ? SALES_HEADERS : ACCOUNT_HEADERS;
          newSheet.appendRow(headers);
          formatHeaderRow(newSheet, headers.length);
        });
        existing = ss.getSheets().map(function(s) { return s.getName(); });
        missing = [];
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: missing.length === 0 ? 'valid' : 'missing_sheets',
        existingSheets: existing,
        missingSheets: missing,
        allRequiredPresent: missing.length === 0
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. FULL SYNC (BRAND SHEETS + ALL DATA + SALES)
    if (action === 'sync_all' || action === 'batch_sync') {
      // Sync Brand Sheets
      if (data.brandSheets) {
        for (var sheetName in data.brandSheets) {
          var rows = data.brandSheets[sheetName];
          writeSheetData(ss, sheetName, ACCOUNT_HEADERS, rows);
        }
      }

      // Sync All Data
      if (data.allDataRows) {
        writeSheetData(ss, 'All Data', ACCOUNT_HEADERS, data.allDataRows);
      }

      // Sync Sales
      if (data.salesRows) {
        writeSheetData(ss, 'Sales', SALES_HEADERS, data.salesRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'All worksheets synchronized successfully',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. ADD / COMMIT SALE
    if (action === 'add_sale') {
      var salesSheet = getOrCreateSheet(ss, 'Sales', SALES_HEADERS);
      if (data.saleRow) {
        salesSheet.appendRow(data.saleRow);
      }

      // Also update screen status in All Data and brand sheet if provided
      if (data.allDataRows) {
        writeSheetData(ss, 'All Data', ACCOUNT_HEADERS, data.allDataRows);
      }
      if (data.brandSheetName && data.brandRows) {
        writeSheetData(ss, data.brandSheetName, ACCOUNT_HEADERS, data.brandRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        saleId: data.saleId,
        message: 'Sale recorded and synchronized'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. ADD / UPDATE ACCOUNT
    if (action === 'sync_account') {
      if (data.allDataRows) {
        writeSheetData(ss, 'All Data', ACCOUNT_HEADERS, data.allDataRows);
      }
      if (data.brandSheetName && data.brandRows) {
        writeSheetData(ss, data.brandSheetName, ACCOUNT_HEADERS, data.brandRows);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Account synchronized'
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

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    formatHeaderRow(sheet, headers.length);
  }
  return sheet;
}

function formatHeaderRow(sheet, colCount) {
  var range = sheet.getRange(1, 1, 1, colCount);
  range.setBackground('#1e3a8a');
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function writeSheetData(ss, sheetName, headers, rows) {
  var sheet = getOrCreateSheet(ss, sheetName, headers);
  // Clear existing data except header
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  if (rows && rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}
`;

/**
 * Format brand ID to clean worksheet name
 */
export function getWorksheetNameForBrand(brandId, brandName) {
  if (!brandId) return 'All Data';
  const id = brandId.toLowerCase();
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
  return brandName || brandId.charAt(0).toUpperCase() + brandId.slice(1);
}

/**
 * Convert an inventory account + screen record into standard row array
 */
export function formatAccountRow(item, screen, brandDisplayName) {
  return [
    String(item.id || ''),
    String(brandDisplayName || item.brandId || ''),
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
}

/**
 * Convert a sale object into standard row array
 */
export function formatSaleRow(sale) {
  return [
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
  ];
}

/**
 * Build consolidated dataset for all worksheets
 */
export function buildSpreadsheetPayload(inventory = [], sales = [], brands = []) {
  const brandMap = {};
  brands.forEach(b => {
    brandMap[b.id] = b.displayName || b.name;
  });

  const brandSheets = {};
  const allDataRows = [];

  // Group accounts by brand worksheets and accumulate All Data
  inventory.forEach(item => {
    const brandName = brandMap[item.brandId] || item.brandId;
    const sheetName = getWorksheetNameForBrand(item.brandId, brandName);

    if (!brandSheets[sheetName]) {
      brandSheets[sheetName] = [];
    }

    (item.screens || []).forEach(screen => {
      const row = formatAccountRow(item, screen, brandName);
      brandSheets[sheetName].push(row);
      allDataRows.push(row);
    });
  });

  // Format sales
  const salesRows = sales.map(s => formatSaleRow(s));

  return {
    brandSheets,
    allDataRows,
    salesRows
  };
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
      spreadsheetName: data.spreadsheetName || 'Connected Sheet',
      sheets: data.sheets || [],
      message: data.status === 'connected' ? 'Connection successful!' : (data.message || 'Failed to connect')
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
export async function validateGoogleSheets(webhookUrl, autoCreate = false) {
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
      existingSheets: data.existingSheets || [],
      missingSheets: data.missingSheets || [],
      message: data.allRequiredPresent
        ? 'All required sheets (Netflix, Amazon, Aha, All Data, Sales) are present!'
        : `Missing required sheets: ${(data.missingSheets || []).join(', ')}`
    };
  } catch (err) {
    return { valid: false, message: err.message };
  }
}
