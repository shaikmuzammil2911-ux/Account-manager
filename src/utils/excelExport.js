import * as XLSX from 'xlsx';
import { getExpiryStatus, getDaysDiff } from './dateUtils';

/**
 * Export Expiry & Subscriptions Report to genuine .xlsx file
 * Filename format: Subscription_Expiry_Report_YYYY-MM-DD.xlsx
 */
export function exportExpiryToExcel(items = [], options = {}) {
  const { filenamePrefix = 'Subscription_Expiry_Report', selectedBrandName = 'All Brands' } = options;
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const filename = `${filenamePrefix}_${todayStr}.xlsx`;

  const rows = (items || []).map((sub, idx) => {
    const diff = sub.daysRemaining !== undefined ? sub.daysRemaining : getDaysDiff(sub.expiryDate);
    const statusObj = getExpiryStatus(sub.expiryDate);

    return {
      'S.No': idx + 1,
      'Brand': sub.brandName || sub.brandId || 'OTT',
      'Account Name / Email': sub.accountEmail || '-',
      'Account Password': sub.accountPassword || '-',
      'Screen Number': sub.screenNumber ? (String(sub.screenNumber).startsWith('Screen') ? sub.screenNumber : `Screen-${sub.screenNumber}`) : `Screen-${idx + 1}`,
      'Screen PIN': sub.screenPin || '-',
      'Customer Name': sub.customerName || 'N/A',
      'Customer Phone': sub.customerNumber || '-',
      'Customer Email': sub.customerEmail || '-',
      'Subscription Validity': sub.validity || '-',
      'Activation Date': sub.activationDate || '-',
      'Expiry Date': sub.expiryDate || '-',
      'Expiry Status': statusObj.label,
      'Days Remaining': diff < 0 ? `${Math.abs(diff)} days ago` : diff === 0 ? 'Today' : `${diff} days`,
      'Device Name': sub.deviceName || sub.device || 'TV / Mobile',
      'Notification Status': sub.notificationSent ? 'Notified' : 'Pending',
      'Last Notified Date': sub.lastNotifiedAt ? sub.lastNotifiedAt.slice(0, 10) : '-',
      'Sale Amount (₹)': sub.amount || sub.price || 0,
      'Sold By': sub.sellerName || sub.sellerEmail || 'Admin',
      'Reference Name': sub.referenceName || '-',
      'Reference Number': sub.referenceNumber || '-',
      'Notes': sub.notes || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    'Notice': 'No subscription records found'
  }]);

  // Set column widths for clean readability in Excel
  const colWidths = [
    { wch: 6 },  // S.No
    { wch: 20 }, // Brand
    { wch: 32 }, // Account Name / Email
    { wch: 18 }, // Password
    { wch: 14 }, // Screen Number
    { wch: 12 }, // Screen PIN
    { wch: 22 }, // Customer Name
    { wch: 16 }, // Customer Phone
    { wch: 26 }, // Customer Email
    { wch: 16 }, // Validity
    { wch: 16 }, // Activation Date
    { wch: 16 }, // Expiry Date
    { wch: 16 }, // Expiry Status
    { wch: 16 }, // Days Remaining
    { wch: 18 }, // Device Name
    { wch: 18 }, // Notification Status
    { wch: 18 }, // Last Notified
    { wch: 14 }, // Amount
    { wch: 16 }, // Sold By
    { wch: 16 }, // Ref Name
    { wch: 16 }, // Ref Number
    { wch: 25 }  // Notes
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Subscriptions Expiry');

  XLSX.writeFile(workbook, filename);
  return filename;
}

/**
 * Export Accounts Inventory to genuine .xlsx file
 * Filename format: OTT_Inventory_Report_Brand_YYYY-MM-DD.xlsx
 */
export function exportInventoryToExcel(accounts = [], brandName = 'All Brands') {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const cleanBrand = brandName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `OTT_Inventory_${cleanBrand}_${todayStr}.xlsx`;

  const rows = [];

  (accounts || []).forEach((acc, aIdx) => {
    const screens = acc.screens || [];
    const occupiedCount = screens.filter(s => s.status === 'occupied').length;
    const freeCount = screens.length - occupiedCount;

    if (screens.length === 0) {
      rows.push({
        'Account #': aIdx + 1,
        'Brand': brandName,
        'Account ID / Email': acc.email,
        'Password': acc.password,
        'Plan Variant': acc.planVariant || 'General',
        'Account Validity': acc.validity || '-',
        'Screen #': '-',
        'Screen PIN': '-',
        'Device': '-',
        'Screen Status': 'empty',
        'Expiry Date': '-',
        'Total Screens': 0,
        'Occupied Screens': 0,
        'Free Screens': 0
      });
    } else {
      screens.forEach((sc, sIdx) => {
        rows.push({
          'Account #': aIdx + 1,
          'Brand': brandName,
          'Account ID / Email': acc.email,
          'Password': acc.password,
          'Plan Variant': acc.planVariant || 'General',
          'Account Validity': acc.validity || '-',
          'Screen #': `Screen-${sIdx + 1}`,
          'Screen PIN': sc.pin || '-',
          'Device': (sc.deviceType || 'TV').toUpperCase(),
          'Screen Status': sc.status === 'occupied' ? 'Occupied' : 'Empty (+)',
          'Expiry Date': sc.expiryDate || '-',
          'Total Screens': screens.length,
          'Occupied Screens': occupiedCount,
          'Free Screens': freeCount
        });
      });
    }
  });

  const worksheet = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{
    'Notice': 'No accounts found'
  }]);

  worksheet['!cols'] = [
    { wch: 10 }, // Account #
    { wch: 18 }, // Brand
    { wch: 32 }, // Account ID / Email
    { wch: 20 }, // Password
    { wch: 16 }, // Plan Variant
    { wch: 16 }, // Validity
    { wch: 12 }, // Screen #
    { wch: 12 }, // PIN
    { wch: 12 }, // Device
    { wch: 14 }, // Screen Status
    { wch: 16 }, // Expiry Date
    { wch: 14 }, // Total Screens
    { wch: 16 }, // Occupied
    { wch: 14 }  // Free
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Accounts Inventory');

  XLSX.writeFile(workbook, filename);
  return filename;
}
