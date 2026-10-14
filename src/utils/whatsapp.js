export function buildWhatsAppLink(customerNumber, message, countryCode = '91') {
  if (!customerNumber) return '';
  const clean = customerNumber.replace(/\D/g, '');
  const fullNumber = clean.startsWith(countryCode) ? clean : `${countryCode}${clean}`;
  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
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
