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

export function parseDate(str) {
  if (!str) return new Date();
  if (str instanceof Date) return str;
  const parts = str.trim().replace(/-/g, ' ').split(/\s+/);
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
  return isNaN(fallback.getTime()) ? new Date() : fallback;
}

export function calculateExpiryDate(activationDateStr, validityStr) {
  const startDate = parseDate(activationDateStr);
  const result = new Date(startDate);

  let monthsToAdd = 1;
  if (validityStr) {
    const match = validityStr.match(/(\d+)/);
    if (match) {
      monthsToAdd = parseInt(match[1], 10);
    }
  }

  // Consistent calendar addition: add N months
  const targetMonth = result.getMonth() + monthsToAdd;
  result.setMonth(targetMonth);

  return formatDate(result);
}

export function getDaysDiff(targetDateStr, refDate = new Date()) {
  if (!targetDateStr) return 999;
  const target = parseDate(targetDateStr);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const r = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffTime = t.getTime() - r.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
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
  if (!expiryDateStr || !String(expiryDateStr).trim()) {
    return {
      status: 'empty',
      label: 'Empty',
      color: '#64748b',
      bg: '#f8fafc',
      border: '2px dashed #94a3b8',
      badgeBg: '#f1f5f9',
      badgeBorder: '1px solid #cbd5e1',
      badgeColor: '#475569',
      daysRemaining: null
    };
  }

  const diff = getDaysDiff(expiryDateStr);
  const settings = getColorCodingSettings();

  if (diff < 0) {
    // Expired
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
    // Expires Today (Red alert per specification)
    return {
      status: 'today',
      label: 'Expires Today',
      color: '#dc2626',
      bg: '#fef2f2',
      border: '1.5px solid #dc2626',
      badgeBg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      badgeBorder: '1.5px solid #dc2626',
      badgeColor: '#991b1b',
      shadow: '0 2px 8px rgba(220, 38, 38, 0.35)',
      daysRemaining: 0
    };
  }

  if (diff <= (settings.redCriticalDays || 5)) {
    // Expiry in 05 Days = Red
    return {
      status: 'critical',
      label: `Expires in ${diff}d`,
      color: '#dc2626',
      bg: '#fef2f2',
      border: '1.5px solid #ef4444',
      badgeBg: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      badgeBorder: '1.5px solid #dc2626',
      badgeColor: '#991b1b',
      shadow: '0 2px 8px rgba(220, 38, 38, 0.28)',
      daysRemaining: diff
    };
  }

  if (diff <= (settings.orangeWarningDays || 10)) {
    // Expiry in 10 Days = Orange / Amber
    return {
      status: 'upcoming',
      label: `Expires in ${diff}d`,
      color: '#ea580c',
      bg: '#fff7ed',
      border: '1.5px solid #f97316',
      badgeBg: 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)',
      badgeBorder: '1.5px solid #ea580c',
      badgeColor: '#9a3412',
      shadow: '0 2px 8px rgba(234, 88, 12, 0.3)',
      daysRemaining: diff
    };
  }

  // Active / New Sale = Green
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
  const diff = getDaysDiff(expiryDateStr);
  if (diff < 0) return 'expired';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'in_02_days';
  return 'active';
}

export { MONTH_NAMES, FULL_MONTH_NAMES };
