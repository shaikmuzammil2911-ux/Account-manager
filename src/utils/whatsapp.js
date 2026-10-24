import { formatDate } from './dateUtils.js';

export const DEFAULT_SALE_WHATSAPP_TEMPLATE = `Hello {customerName}! 🎬

Thank you for your purchase! Here are your *{brandName}* subscription details:

🎬 *Brand:* {brandName}
📞 *Phone Number:* {customerNumber}
📧 *ID / Email:* {accountEmail}
🔒 *Password:* {accountPassword}
📱 *Screen No:* {screenNumber}
🔑 *Screen PIN:* {screenPin}
📺 *Device:* {deviceName}
⏳ *Validity:* {validity}
📅 *Activation Date:* {activationDate}
📅 *Expiry Date:* {expiryDate}
💰 *Amount:* ₹{amount}

Enjoy uninterrupted streaming! For renewals or queries, kindly message us. 🍿

Regards,
*Accounts Manager*`;

export const DEFAULT_EXPIRY_WHATSAPP_TEMPLATE = `Hello {customerName}! 🎬

Your *{brandName}* subscription details:
📱 *Screen No:* {screenNumber}
🔑 *Screen PIN:* {screenPin}
⏳ *Expiry Date:* {expiryDate}

Your plan is approaching renewal ({daysRemaining} days remaining). Kindly renew today to extend your subscription and continue non-stop streaming! 🍿

Regards,
*Accounts Manager*`;

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
    if (key === 'customerNumber') return '';
    if (key === 'brandName') return 'OTT';
    if (key === 'accountEmail') return 'N/A';
    if (key === 'accountPassword') return 'N/A';
    if (key === 'screenNumber') return '01';
    if (key === 'screenPin') return '----';
    if (key === 'validity') return '01 Month';
    if (key === 'activationDate') return '';
    if (key === 'expiryDate') return 'N/A';
    if (key === 'amount') return '---';
    if (key === 'deviceName') return '';
    if (key === 'daysRemaining') return '0';
    return '';
  });
}

export function buildWhatsAppLink(customerNumber, message, countryCode = '91') {
  if (!customerNumber) return '';
  const clean = customerNumber.replace(/\D/g, '');
  // If the number already includes country code (e.g. 10+ digits with 91 or international)
  let fullNumber = clean;
  if (clean.length === 10) {
    fullNumber = `${countryCode}${clean}`;
  }
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

export function formatSaleConfirmationMessage({
  customerName,
  customerNumber,
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
  // Check if custom template provided or saved in localStorage
  const templateToUse = customTemplate ||
    (typeof window !== 'undefined' ? localStorage.getItem('accounts_whatsapp_sale_template') : null) ||
    DEFAULT_SALE_WHATSAPP_TEMPLATE;

  const planInfo = pricingPlan && pricingPlan !== 'General' ? ` (${pricingPlan})` : '';

  return fillTemplate(templateToUse, {
    customerName,
    customerNumber,
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
    referenceName,
    referenceNumber
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

