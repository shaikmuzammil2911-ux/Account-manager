const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FULL_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function formatDate(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[d.getMonth()];
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function isValidDateStr(str) {
  if (!str) return false;
  const s = String(str).trim().toLowerCase();
  if (!s || s === 'no date' || s === '-' || s === 'null' || s === 'undefined' || s === 'n/a' || s === 'none' || s === 'empty') {
    return false;
  }
  return true;
}

export function parseDate(str) {
  if (!isValidDateStr(str)) return null;
  if (str instanceof Date) return str;
  const parts = String(str).trim().replace(/-/g, ' ').split(/\s+/);
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase();
    const year = parseInt(parts[2], 10);
    const idx = MONTH_NAMES.findIndex(m => m.toLowerCase() === monthStr.slice(0, 3));
    if (!isNaN(day) && !isNaN(year) && idx !== -1) {
      return new Date(year, idx, day);
    }
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function calculateExpiryDate(activationDateStr, validityStr) {
  if (!isValidDateStr(activationDateStr)) return '';
  const startDate = parseDate(activationDateStr);
  if (!startDate || isNaN(startDate.getTime())) return '';

  let monthsToAdd = 1;
  if (validityStr) {
    const match = String(validityStr).match(/(\d+)/);
    if (match) {
      monthsToAdd = parseInt(match[1], 10);
    }
  }

  const originalDay = startDate.getDate();
  const target = new Date(startDate.getFullYear(), startDate.getMonth() + monthsToAdd, 1);
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(originalDay, daysInTargetMonth));

  return formatDate(target);
}

/**
 * WhatsApp-Style Timeline Date Separator Formatter
 * Returns "Today — 20-Oct-2026", "Yesterday — 19-Oct-2026", or "18-Oct-2026"
 */
export function formatTimelineDateBadge(dateStr) {
  if (!isValidDateStr(dateStr)) return 'Recent Activity';
  const targetDate = parseDate(dateStr);
  if (!targetDate || isNaN(targetDate.getTime())) return dateStr;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

  const formatted = formatDate(targetDate);
  if (diffDays === 0) return `Today — ${formatted}`;
  if (diffDays === 1) return `Yesterday — ${formatted}`;
  return formatted;
}

export function getDaysDiff(targetDateStr, refDate = new Date()) {
  if (!isValidDateStr(targetDateStr)) return null;
  const target = parseDate(targetDateStr);
  if (!target || isNaN(target.getTime())) return null;
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const r = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffTime = t.getTime() - r.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format timestamp into exact Indian Standard Time with seconds:
 * e.g., "25-Oct-2026, 12:42:18 PM IST"
 */
export function formatISTDateTime(isoOrDate = new Date()) {
  if (!isoOrDate) return '-';
  try {
    const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
    if (isNaN(d.getTime())) return String(isoOrDate);
    const dateFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d).replace(/ /g, '-');

    const timeFormatted = new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);

    return `${dateFormatted}, ${timeFormatted.toUpperCase()} IST`;
  } catch (e) {
    return String(isoOrDate);
  }
}

/**
 * Dynamically calculate remaining days, overdue days, and expiry status
 * based on calendar day differences in Asia/Kolkata timezone.
 *
 * Rules:
 * - Future: remainingDays = positive count, overdueDays = 0, expiryStatus = "N days remaining"
 * - Today: remainingDays = 0, overdueDays = 0, expiryStatus = "Expires today"
 * - Past: remainingDays = 0, overdueDays = elapsed days, expiryStatus = "Expired N days ago"
 */
export function calculateExpiryCountdown(expiryDateStr, refDate = new Date()) {
  if (!isValidDateStr(expiryDateStr)) {
    return {
      remainingDays: 0,
      overdueDays: 0,
      expiryStatus: ''
    };
  }
  const target = parseDate(expiryDateStr);
  if (!target || isNaN(target.getTime())) {
    return {
      remainingDays: 0,
      overdueDays: 0,
      expiryStatus: ''
    };
  }

  const diffDays = getDaysDiff(expiryDateStr, refDate);
  if (diffDays === null) {
    return {
      remainingDays: 0,
      overdueDays: 0,
      expiryStatus: ''
    };
  }

  if (diffDays > 0) {
    return {
      remainingDays: diffDays,
      overdueDays: 0,
      expiryStatus: `${diffDays} days remaining`
    };
  } else if (diffDays === 0) {
    return {
      remainingDays: 0,
      overdueDays: 0,
      expiryStatus: 'Expires today'
    };
  } else {
    const elapsed = Math.abs(diffDays);
    return {
      remainingDays: 0,
      overdueDays: elapsed,
      expiryStatus: `Expired ${elapsed} ${elapsed === 1 ? 'day' : 'days'} ago`
    };
  }
}

// Color Codings Settings (localStorage persistent)
const COLOR_CODINGS_STORAGE_KEY = 'accounts_manager_color_codings';

export const DEFAULT_COLOR_CODINGS = {
  activeDaysMin: 20,       // New Sale + 20 days = Green
  orangeWarningDays: 10,   // Expiry in 10 Days = Orange
  redCriticalDays: 5       // Expiry in 05 Days = Red
};

export function getColorCodingSettings() {
  try {
    const raw = localStorage.getItem(COLOR_CODINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_COLOR_CODINGS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_COLOR_CODINGS;
}

export function saveColorCodingSettings(settings) {
  try {
    localStorage.setItem(COLOR_CODINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}
}

/**
 * Master Reusable Expiry Status Utility
 * Calculates status, colors, border, background, label, and days remaining independently for each screen.
 * Follows exact specifications:
 * - Expired (diff < 0) -> Red
 * - Expires Today (diff === 0) -> Red
 * - Critical / In 5 Days (0 < diff <= 5) -> Red (or Amber if <= 2)
 * - Warning / In 10 Days (diff <= 10) -> Orange
 * - Active (> 10 days) -> Green
 */
export function getExpiryStatus(expiryDateStr) {
  if (!isValidDateStr(expiryDateStr)) {
    return {
      status: 'empty',
      label: 'No Date',
      color: '#64748b',
      bg: '#f8fafc',
      border: '2px dashed #94a3b8',
      badgeBg: '#f1f5f9',
      badgeBorder: '1px solid #cbd5e1',
      badgeColor: '#475569',
      shadow: 'none',
      daysRemaining: null
    };
  }

  const diff = getDaysDiff(expiryDateStr);
  if (diff === null || isNaN(diff)) {
    return {
      status: 'empty',
      label: 'No Date',
      color: '#64748b',
      bg: '#f8fafc',
      border: '2px dashed #94a3b8',
      badgeBg: '#f1f5f9',
      badgeBorder: '1px solid #cbd5e1',
      badgeColor: '#475569',
      shadow: 'none',
      daysRemaining: null
    };
  }

  if (diff < 0) {
    // Expired: Red
    return {
      status: 'expired',
      label: 'Expired',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '1.5px solid #dc2626',
      badgeBg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      badgeBorder: '1.5px solid #dc2626',
      badgeColor: '#991b1b',
      shadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
      daysRemaining: diff
    };
  }

  if (diff === 0) {
    // Expires Today: Orange alert with clear distinction
    return {
      status: 'today',
      label: 'Today',
      color: '#ea580c',
      bg: '#fff7ed',
      border: '1.5px solid #ea580c',
      badgeBg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
      badgeBorder: '1.5px solid #ea580c',
      badgeColor: '#9a3412',
      shadow: '0 2px 8px rgba(234, 88, 12, 0.35)',
      daysRemaining: 0
    };
  }

  if (diff <= 2) {
    // In 02 Days: Orange warning
    return {
      status: 'in_02_days',
      label: `In ${diff} ${diff === 1 ? 'Day' : 'Days'}`,
      color: '#d97706',
      bg: '#fffbeb',
      border: '1.5px solid #f59e0b',
      badgeBg: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      badgeBorder: '1.5px solid #d97706',
      badgeColor: '#92400e',
      shadow: '0 2px 8px rgba(217, 119, 6, 0.3)',
      daysRemaining: diff
    };
  }

  // Active (> 2 days remaining): Green
  return {
    status: 'active',
    label: 'Active',
    color: '#16a34a',
    bg: '#f0fdf4',
    border: '1.5px solid #22c55e',
    badgeBg: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
    badgeBorder: '1.5px solid #16a34a',
    badgeColor: '#14532d',
    shadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
    daysRemaining: diff
  };
}

export function getExpiryCategory(expiryDateStr) {
  if (!isValidDateStr(expiryDateStr)) return 'empty';
  const diff = getDaysDiff(expiryDateStr);
  if (diff === null || isNaN(diff)) return 'empty';
  if (diff < 0) return 'expired';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'in_02_days';
  return 'active';
}

export function getBusinessDateParts(dateInput, timeZone = 'Asia/Kolkata') {
  if (!dateInput) return null;
  const d = dateInput instanceof Date ? dateInput : (parseDate(dateInput) || new Date(dateInput));
  if (!d || isNaN(d.getTime())) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const isoDate = formatter.format(d); // "YYYY-MM-DD"
    const [yearStr, monthStr, dayStr] = isoDate.split('-');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const year = parseInt(yearStr, 10);
    const dayFormatted = String(day).padStart(2, '0');
    const monthName = MONTH_NAMES[month];
    return {
      isoDate,
      formatted: `${dayFormatted}-${monthName}-${year}`,
      year,
      month,
      day
    };
  } catch (e) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const year = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return {
      isoDate: `${year}-${mm}-${day}`,
      formatted: `${day}-${month}-${year}`,
      year,
      month: d.getMonth(),
      day: d.getDate()
    };
  }
}

export function isSaleOnBusinessDate(sale, selectedDate, timeZone = 'Asia/Kolkata') {
  if (!sale || !selectedDate) return false;
  const target = getBusinessDateParts(selectedDate, timeZone);
  if (!target) return false;

  const targetFormatted = target.formatted.toLowerCase();
  const targetIso = target.isoDate;

  // 1. Transaction date is strictly saleDate or activationDate
  const txDate = sale.saleDate || sale.activationDate;
  if (txDate) {
    const txParts = getBusinessDateParts(txDate, timeZone);
    if (txParts && (txParts.formatted.toLowerCase() === targetFormatted || txParts.isoDate === targetIso)) {
      return true;
    }
    // Strict adherence to historical transaction date:
    // If a transaction date is explicitly specified, the sale belongs ONLY to that date!
    // Never fall back to system createdAt on another date.
    return false;
  }

  // 2. Check createdAt timestamp ONLY as last-resort fallback for records lacking a transaction date
  if (sale.createdAt) {
    const createdParts = getBusinessDateParts(sale.createdAt, timeZone);
    if (createdParts && (createdParts.isoDate === targetIso || createdParts.formatted.toLowerCase() === targetFormatted)) {
      return true;
    }
  }

  return false;
}

export { MONTH_NAMES, FULL_MONTH_NAMES };

