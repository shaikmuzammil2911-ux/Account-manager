export const AVAILABLE_FEATURES = [
  {
    key: 'home_dashboard',
    label: 'Home Dashboard',
    desc: 'Summary metrics, Google Sheets live connection card, and date selector',
    category: 'Dashboard'
  },
  {
    key: 'brands',
    label: 'Brands Management',
    desc: 'All Brands view, add/edit brand, logos, and subscription pricing',
    category: 'Catalogue'
  },
  {
    key: 'account_management',
    label: 'Accounts & Inventory (Data)',
    desc: 'Manage accounts, subscriptions, credentials, and search records',
    category: 'Inventory'
  },
  {
    key: 'screen_management',
    label: '1–10 Screen Management',
    desc: 'Individual screen assignments, unlock & device name editing',
    category: 'Inventory'
  },
  {
    key: 'sales',
    label: 'Sales Checkout',
    desc: 'Select brand, choose screens, and record new sales',
    category: 'Sales'
  },
  {
    key: 'recent_sales',
    label: 'Recent Sales History',
    desc: 'View sales history, customer records, brands, and PIN records',
    category: 'Sales'
  },
  {
    key: 'expiry_management',
    label: 'Expiry Management',
    desc: 'Expiry tracking, In 02 Days, Today, and Expired filters',
    category: 'Operations'
  },
  {
    key: 'notifications',
    label: 'WhatsApp & Notifications',
    desc: 'Send customized expiry alerts & WhatsApp messages',
    category: 'Operations'
  },
  {
    key: 'reports_excel',
    label: 'Reports & Excel Export',
    desc: 'Generate and download Subscription Expiry Report (.xlsx)',
    category: 'Reports'
  },
  {
    key: 'revenue_management',
    label: 'Revenue & Profit Analytics',
    desc: 'Brand-wise income, sales counts, screen cost, and profit breakdown',
    category: 'Reports'
  },
  {
    key: 'cells_linkup',
    label: 'Cells Linkup & Form Builder',
    desc: 'Google Sheet cell mappings and custom forms management',
    category: 'Configuration'
  },
  {
    key: 'google_sheets_sync',
    label: 'Google Sheets Live Sync',
    desc: 'Manual and automated push/pull synchronization with Google Sheets',
    category: 'Configuration'
  }
];

export const DEFAULT_USER_PERMISSIONS = {
  home_dashboard: true,
  brands: true,
  account_management: true,
  screen_management: true,
  sales: true,
  recent_sales: true,
  expiry_management: true,
  notifications: true,
  reports_excel: true,
  revenue_management: false,
  cells_linkup: false,
  google_sheets_sync: false
};
