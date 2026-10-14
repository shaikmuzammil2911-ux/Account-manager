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
  { fieldKey: 'referenceName', label: 'Reference Name', sheetCol: 'M', header: 'Reference Name', enabled: true },
  { fieldKey: 'referenceNumber', label: 'Reference Phone', sheetCol: 'N', header: 'Reference Phone', enabled: true },
  { fieldKey: 'deviceName', label: 'Device Name', sheetCol: 'O', header: 'Device Name', enabled: true },
  { fieldKey: 'saleDate', label: 'Sale Timestamp', sheetCol: 'P', header: 'Sale Date', enabled: true }
];

export const GOOGLE_APPS_SCRIPT_TEMPLATE = `// -------------------------------------------------------------
// OTT Accounts Manager - Google Sheet Webhook Script
// Paste this code into: Extensions > Apps Script in Google Sheets
// Then Deploy as: Web App > Execute as: Me > Who has access: Anyone
// -------------------------------------------------------------

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Auto-create header row if sheet is empty
    if (sheet.getLastRow() === 0 && data.headers && data.headers.length > 0) {
      sheet.appendRow(data.headers);
      var headerRange = sheet.getRange(1, 1, 1, data.headers.length);
      headerRange.setBackground('#1e3a8a');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
    }
    
    // Append sale row
    if (data.row && data.row.length > 0) {
      sheet.appendRow(data.row);
    } else if (data.rows && data.rows.length > 0) {
      data.rows.forEach(function(r) {
        sheet.appendRow(r);
      });
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Row added successfully',
      lastRow: sheet.getLastRow()
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

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'connected',
    sheetName: SpreadsheetApp.getActiveSpreadsheet().getName(),
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}
`;

/**
 * Format a sale object into ordered columns according to cell mappings
 */
export function formatSaleRowForSheet(sale, cellMappings = DEFAULT_CELL_MAPPINGS) {
  const activeMappings = [...cellMappings]
    .filter(m => m.enabled)
    .sort((a, b) => a.sheetCol.localeCompare(b.sheetCol));

  const headers = activeMappings.map(m => m.header || m.label);
  const row = activeMappings.map(m => {
    const val = sale[m.fieldKey];
    return val !== undefined && val !== null ? String(val) : '';
  });

  return { headers, row };
}

/**
 * Push a sale row directly to the connected Google Apps Script Web App
 */
export async function syncSaleToGoogleSheet(sale, googleSheetConfig) {
  if (!googleSheetConfig || !googleSheetConfig.webhookUrl) {
    return { success: false, reason: 'No Google Sheet Webhook URL configured' };
  }

  const mappings = googleSheetConfig.cellMappings || DEFAULT_CELL_MAPPINGS;
  const { headers, row } = formatSaleRowForSheet(sale, mappings);

  try {
    const payload = {
      action: 'add_sale',
      sheetName: googleSheetConfig.sheetName || 'Sales',
      headers,
      row,
      saleId: sale.id,
      timestamp: new Date().toISOString()
    };

    // Use mode 'no-cors' so Google Apps Script redirects succeed without CORS block
    await fetch(googleSheetConfig.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      mode: 'no-cors'
    });

    return { success: true, timestamp: new Date().toLocaleTimeString() };
  } catch (err) {
    console.error('Google Sheet sync error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Sync multiple sales to Google Sheet in batch
 */
export async function syncAllSalesToGoogleSheet(salesList, googleSheetConfig) {
  if (!googleSheetConfig || !googleSheetConfig.webhookUrl) {
    throw new Error('Please configure your Google Sheet Webhook URL first in Settings > Edit Sale Form.');
  }

  const mappings = googleSheetConfig.cellMappings || DEFAULT_CELL_MAPPINGS;
  const activeMappings = [...mappings].filter(m => m.enabled).sort((a, b) => a.sheetCol.localeCompare(b.sheetCol));
  const headers = activeMappings.map(m => m.header || m.label);

  const rows = salesList.map(sale => {
    return activeMappings.map(m => {
      const val = sale[m.fieldKey];
      return val !== undefined && val !== null ? String(val) : '';
    });
  });

  await fetch(googleSheetConfig.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      action: 'batch_sync',
      sheetName: googleSheetConfig.sheetName || 'Sales',
      headers,
      rows,
      timestamp: new Date().toISOString()
    }),
    mode: 'no-cors'
  });

  return { success: true, count: rows.length };
}

/**
 * Generate CSV file matching cell mappings and trigger browser download
 */
export function downloadSalesCsv(salesList, cellMappings = DEFAULT_CELL_MAPPINGS) {
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
