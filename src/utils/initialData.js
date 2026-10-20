import { DEFAULT_CELL_MAPPINGS } from './googleSheets';

export function getClientInitialData() {
  const brands = [];
  const inventory = [];
  const sales = [];

  // Default Custom Changeable Sale Form Fields Configuration
  const defaultSaleFormFields = {
    brand: { enabled: true, label: 'Brand', required: true, order: 1 },
    validity: { enabled: true, label: 'Validity', required: true, order: 2 },
    activationDate: { enabled: true, label: 'Activation (DD-MM-YYYY)', required: true, order: 3 },
    expiryDate: { enabled: true, label: 'Expiry', required: false, order: 4 },
    accountEmail: { enabled: true, label: 'ID', required: true, placeholder: 'Type account ID or email', order: 5 },
    accountPassword: { enabled: true, label: 'Password', required: true, placeholder: 'Type password', order: 6 },
    screenNumber: { enabled: true, label: 'Screen No', required: true, placeholder: 'e.g. Screen-2', order: 7 },
    screenPin: { enabled: true, label: 'Screen Pin', required: true, placeholder: 'e.g. 2222', order: 8 },
    amount: { enabled: true, label: 'Amount', required: false, placeholder: 'Type Amount', order: 9 },
    deviceName: { enabled: true, label: 'Device Name', required: false, placeholder: 'Type Device Name', order: 10 },
    customerName: { enabled: true, label: 'Name', required: true, placeholder: 'Type Name', order: 11 },
    customerNumber: { enabled: true, label: 'Number', required: true, placeholder: 'Type Number', order: 12 },
    referenceName: { enabled: true, label: 'Reference Name', required: false, placeholder: 'Type Reference Name', order: 13 },
    referenceNumber: { enabled: true, label: 'Reference Number', required: false, placeholder: 'Type Reference Number', order: 14 }
  };

  const settings = {
    appName: 'Accounts Manager',
    defaultBrand: '',
    whatsappCountryCode: '91',
    whatsappTemplate: 'Hello {name}! Your {brand} subscription ({screen}, PIN: {pin}) is expiring on {expiryDate}. Renew now to enjoy uninterrupted streaming.\n\nThank you,\nAccounts Manager',
    saleFormFields: defaultSaleFormFields,
    customSaleFields: [],
    googleSheetConfig: {
      enabled: false,
      webhookUrl: '',
      sheetName: 'Sales_Data',
      autoSyncOnSale: true,
      lastSyncTime: null,
      cellMappings: DEFAULT_CELL_MAPPINGS
    }
  };

  const groups = [
    {
      id: 'group_general',
      name: 'Standard OTT',
      heading: 'Multi-Brand Subscriptions',
      subheading: 'Premium shared & private streaming profiles',
      color: '#2563eb',
      createdAt: '2026-01-01'
    }
  ];

  const customForms = [
    {
      id: 'sale_form_01',
      title: 'SALE FORM 01',
      name: 'SALE FORM 01',
      heading: 'OTT Sale Form',
      subheading: 'Standard Customer Checkout',
      type: 'sale',
      groupId: 'group_general',
      brands: [],
      isDefault: true,
      fields: [],
      createdAt: '2026-01-01'
    },
    {
      id: 'db_form_01',
      title: 'DATABASE FORM 01',
      name: 'DATABASE FORM 01',
      heading: 'OTT Inventory Database',
      subheading: 'Accounts & 1–10 Screens Management',
      type: 'database',
      groupId: 'group_general',
      brands: [],
      isDefault: true,
      fields: [],
      createdAt: '2026-01-01'
    }
  ];

  return { brands, inventory, sales, settings, groups, customForms };
}
