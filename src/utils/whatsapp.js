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
  brandName,
  accountEmail,
  accountPassword,
  screenNumber,
  screenPin,
  deviceName,
  validity,
  expiryDate
}) {
  return `Hello ${customerName || 'Customer'}! 🎬

Thank you for your purchase! Here are your *${brandName || 'OTT'}* subscription details:

📧 *ID / Email:* ${accountEmail || 'N/A'}
🔒 *Password:* ${accountPassword || 'N/A'}
📱 *Screen No:* ${screenNumber || '01'}
🔑 *Screen PIN:* ${screenPin || '----'}
${deviceName ? `📺 *Device:* ${deviceName}\n` : ''}⏳ *Validity:* ${validity || '01 Month'}
📅 *Expiry Date:* ${expiryDate || 'N/A'}

Enjoy uninterrupted streaming! For renewals or queries, kindly message us. 🍿

Regards,
*Accounts Manager*`;
}

export function formatCustomerMessage({ customerName, brandName, screenNumber, screenPin, expiryDate }) {
  return `Hello ${customerName || 'Customer'}! 🎬

Your *${brandName || 'OTT'}* subscription details:
📱 *Screen:* ${screenNumber || '01'}
🔑 *PIN:* ${screenPin || '----'}
⏳ *Expiry Date:* ${expiryDate || 'N/A'}

Your plan is approaching renewal. Kindly contact us to extend your subscription and continue non-stop streaming! 🍿

Regards,
*Accounts Manager*`;
}
