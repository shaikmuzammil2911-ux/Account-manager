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
  const target = parseDate(targetDateStr);
  const t = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  const r = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const diffTime = t.getTime() - r.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function getExpiryCategory(expiryDateStr) {
  const diff = getDaysDiff(expiryDateStr);
  if (diff < 0) return 'expired';
  if (diff === 0) return 'today';
  if (diff <= 2) return 'in_02_days';
  return 'active';
}

export { MONTH_NAMES, FULL_MONTH_NAMES };
