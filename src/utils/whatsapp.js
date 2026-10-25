import { formatDate, calculateExpiryCountdown, isValidDateStr } from './dateUtils.js';

export const DEFAULT_SALE_WHATSAPP_TEMPLATE = `Hello {customerName}! 🍿

🥰 Thank you for your purchase!
Here are your *{brandName}* subscription details:

⏳ *Validity:* {validity}
🗓️ *From Date:* {activationDate}
🗓️ *Expiry Date:* {expiryDate}

📧 *ID / Email:* {accountEmail}
🔒 *Password:* {accountPassword}
🎴 *Screen No:* {screenNumber}
🪄 *Screen PIN:* {screenPin}
🔥 *Amount:* ₹{amount}
📱 *Device:* {deviceName}

------------------------------------
👤 *User Name:* {customerName}
📞 *Number:* {customerNumber}
👥 *Ref Name:* {referenceName}
📞 *Ref Number:* {referenceNumber}

Enjoy uninterrupted streaming! For renewals or queries, kindly message us. 🍿

Regards,
*OTTMoneySaver.Com*
*+91 6305151531*`;

export const DEFAULT_EXPIRY_WHATSAPP_TEMPLATE = `Hello {customerName}! 🎬

Your *{brandName}* subscription details:
📱 *Screen No:* {screenNumber}
🔑 *Screen PIN:* {screenPin}
⏳ *Expiry Date:* {expiryDate}

Your plan is approaching renewal ({daysRemaining} days remaining). Kindly renew today to extend your subscription and continue non-stop streaming! 🍿

Regards,
*OTTMoneySaver.Com*
*+91 6305151531*`;

export const DEFAULT_WHATSAPP_CATEGORIES = [
  {
    id: 'sale',
    name: 'Sale Message',
    description: 'Login credentials & purchase confirmation sent to customers upon sale'
  },
  {
    id: 'expiry',
    name: 'Expiry / Renewal Message',
    description: 'Approaching subscription renewal & reminder notices sent before expiry'
  }
];

export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    id: 'tpl_sale_default',
    categoryId: 'sale',
    name: 'Standard Sale Confirmation',
    content: DEFAULT_SALE_WHATSAPP_TEMPLATE,
    isActive: true,
    imageUrl: null,
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  },
  {
    id: 'tpl_expiry_1',
    categoryId: 'expiry',
    name: 'Template 01 — Friendly Reminder',
    content: DEFAULT_EXPIRY_WHATSAPP_TEMPLATE,
    isActive: true,
    imageUrl: null,
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
    content: `🎬 *SUBSCRIPTION RENEWAL NOTICE*\n\nHello {customerName}!\nYour {brandName} plan expires on *{expiryDate}* ({remainingDays} days remaining).\n\n📱 Screen: {screenNumber}\n🪄 PIN: {screenPin}\n\nRenew today to keep watching uninterrupted! 🍿\n\nRegards,\n*OTTMoneySaver.Com*`,
    isActive: false,
    imageUrl: null,
    createdAt: '2026-10-25T00:00:00.000Z',
    updatedAt: '2026-10-25T00:00:00.000Z'
  }
];

/**
 * Replace all {tags} in the template with corresponding data values.
 */
export function fillTemplate(template, data = {}) {
  if (!template) return '';
  let processed = template;

  // If deviceName is empty, omit lines containing {deviceName} entirely without leaving blank lines
  const hasDevice = data.deviceName && String(data.deviceName).trim();
  if (!hasDevice) {
    processed = processed
      .split('\n')
      .filter(line => !line.includes('{deviceName}'))
      .join('\n');
  }

  // Dynamic calculation for countdown tags if expiryDate is available
  const countdown = (data.expiryDate && isValidDateStr(data.expiryDate))
    ? calculateExpiryCountdown(data.expiryDate)
    : null;

  const resolvedRemainingDays = data.remainingDays !== undefined
    ? String(data.remainingDays)
    : (data.daysRemaining !== undefined ? String(data.daysRemaining) : (countdown ? String(countdown.remainingDays) : '0'));

  const resolvedOverdueDays = data.overdueDays !== undefined
    ? String(data.overdueDays)
    : (countdown ? String(countdown.overdueDays) : '0');

  const resolvedExpiryStatus = data.expiryStatus !== undefined
    ? String(data.expiryStatus)
    : (countdown ? countdown.expiryStatus : '');

  // If reference details are empty, we handle them cleanly
  const hasRefName = data.referenceName !== undefined && data.referenceName !== null && String(data.referenceName).trim() !== '';
  const hasRefNum = data.referenceNumber !== undefined && data.referenceNumber !== null && String(data.referenceNumber).trim() !== '';

  return processed.replace(/\{(\w+)\}/g, (match, key) => {
    // Explicit tag overrides
    if (key === 'remainingDays' || key === 'daysRemaining') {
      return resolvedRemainingDays;
    }
    if (key === 'overdueDays') {
      return resolvedOverdueDays;
    }
    if (key === 'expiryStatus') {
      return resolvedExpiryStatus;
    }
    if (key === 'referenceName') {
      return hasRefName ? String(data.referenceName).trim() : '';
    }
    if (key === 'referenceNumber') {
      return hasRefNum ? String(data.referenceNumber).trim() : '';
    }

    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      if (key === 'activationDate') {
        const formatted = formatDate(data[key]);
        return formatted || String(data[key]);
      }
      return String(data[key]);
    }

    // Specific clean fallbacks for nice display without undefined/null
    if (key === 'customerName') return 'Customer';
    if (key === 'customerNumber' || key === 'customerPhone') return data.customerPhone || data.customerNumber || '';
    if (key === 'brandName') return 'OTT';
    if (key === 'planVariant') return data.planVariant || 'General';
    if (key === 'accountEmail') return 'N/A';
    if (key === 'accountPassword') return 'N/A';
    if (key === 'screenNumber') return '01';
    if (key === 'screenPin') return '----';
    if (key === 'validity') return '01 Month';
    if (key === 'activationDate') return '';
    if (key === 'expiryDate') return 'N/A';
    if (key === 'amount') return '---';
    if (key === 'deviceName') return '';
    return '';
  });
}

export function buildWhatsAppLink(customerNumber, message, countryCode = '91') {
  if (!customerNumber) return '';
  const clean = customerNumber.replace(/\D/g, '');
  let fullNumber = clean;
  if (clean.length === 10) {
    fullNumber = `${countryCode}${clean}`;
  }
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export function formatSaleConfirmationMessage({
  customerName,
  customerNumber,
  customerPhone,
  brandName,
  pricingPlan,
  accountEmail,
  accountPassword,
  screenNumber,
  screenPin,
  deviceName,
  validity,
  activationDate,
  expiryDate,
  amount,
  referenceName,
  referenceNumber
}, customTemplate) {
  let templateToUse = customTemplate;
  if (!templateToUse && typeof window !== 'undefined') {
    const cached = localStorage.getItem('accounts_whatsapp_sale_template');
    if (cached && !cached.includes('Custom template from test')) {
      templateToUse = cached;
    }
  }
  if (!templateToUse) {
    templateToUse = DEFAULT_SALE_WHATSAPP_TEMPLATE;
  }

  const planInfo = pricingPlan && pricingPlan !== 'General' ? ` (${pricingPlan})` : '';

  return fillTemplate(templateToUse, {
    customerName,
    customerNumber: customerNumber || customerPhone || '',
    customerPhone: customerPhone || customerNumber || '',
    brandName: `${brandName || 'OTT'}${planInfo}`,
    planVariant: pricingPlan || 'General',
    accountEmail,
    accountPassword,
    screenNumber,
    screenPin,
    deviceName: deviceName ? String(deviceName).trim() : '',
    validity,
    activationDate,
    expiryDate,
    amount,
    referenceName: referenceName || '',
    referenceNumber: referenceNumber || ''
  });
}

export function formatCustomerMessage({
  customerName,
  customerNumber,
  brandName,
  screenNumber,
  screenPin,
  validity,
  expiryDate,
  daysRemaining,
  remainingDays,
  overdueDays,
  expiryStatus,
  renewalAmount,
  referenceName,
  referenceNumber
}, customTemplate) {
  let templateToUse = customTemplate;
  if (!templateToUse && typeof window !== 'undefined') {
    templateToUse = localStorage.getItem('accounts_whatsapp_expiry_template');
  }
  if (!templateToUse) {
    templateToUse = DEFAULT_EXPIRY_WHATSAPP_TEMPLATE;
  }

  return fillTemplate(templateToUse, {
    customerName,
    customerNumber,
    brandName,
    screenNumber,
    screenPin,
    validity,
    expiryDate,
    daysRemaining,
    remainingDays,
    overdueDays,
    expiryStatus,
    renewalAmount: renewalAmount || '',
    referenceName: referenceName || '',
    referenceNumber: referenceNumber || ''
  });
}
