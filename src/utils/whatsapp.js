import { formatDate } from './dateUtils.js';

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

  // If reference details are empty, we handle them cleanly
  const hasRefName = data.referenceName && String(data.referenceName).trim();
  const hasRefNum = data.referenceNumber && String(data.referenceNumber).trim();

  return processed.replace(/\{(\w+)\}/g, (match, key) => {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      if (key === 'activationDate') {
        const formatted = formatDate(data[key]);
        return formatted || String(data[key]);
      }
      return String(data[key]);
    }
    // Specific clean fallbacks for nice display
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
    if (key === 'referenceName') return hasRefName ? String(data.referenceName).trim() : '-';
    if (key === 'referenceNumber') return hasRefNum ? String(data.referenceNumber).trim() : '-';
    if (key === 'daysRemaining') return '0';
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
  const templateToUse = customTemplate ||
    (typeof window !== 'undefined' ? localStorage.getItem('accounts_whatsapp_sale_template') : null) ||
    DEFAULT_SALE_WHATSAPP_TEMPLATE;

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
  renewalAmount
}, customTemplate) {
  const templateToUse = customTemplate ||
    (typeof window !== 'undefined' ? localStorage.getItem('accounts_whatsapp_expiry_template') : null) ||
    DEFAULT_EXPIRY_WHATSAPP_TEMPLATE;

  return fillTemplate(templateToUse, {
    customerName,
    customerNumber,
    brandName,
    screenNumber,
    screenPin,
    validity,
    expiryDate,
    daysRemaining: daysRemaining !== undefined ? String(daysRemaining) : '2',
    renewalAmount: renewalAmount || ''
  });
}
