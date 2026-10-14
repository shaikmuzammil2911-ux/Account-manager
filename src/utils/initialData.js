import { formatDate } from './dateUtils';

export function getClientInitialData() {
  const now = new Date();
  
  // Dynamic dates for real-time testing
  const todayStr = formatDate(now);
  
  const inTwoDays = new Date(now);
  inTwoDays.setDate(now.getDate() + 2);
  const inTwoDaysStr = formatDate(inTwoDays);
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = formatDate(yesterday);

  const oneMonthAgo = new Date(now);
  oneMonthAgo.setMonth(now.getMonth() - 1);
  const oneMonthAgoStr = formatDate(oneMonthAgo);

  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setFullYear(now.getFullYear() - 1);
  const twelveMonthsAgoStr = formatDate(twelveMonthsAgo);

  const brands = [
    {
      id: 'netflix',
      name: 'NETFLIX',
      displayName: 'Netflix',
      color: '#e50914',
      bgDark: '#000000',
      badgeColor: '#e50914',
      screensCount: 5,
      plans: ['01 Month', '03 Months', '06 Months', '12 Months'],
      prices: { '01 Month': 199, '03 Months': 499, '06 Months': 899, '12 Months': 1599 }
    },
    {
      id: 'prime_video',
      name: 'Prime Video',
      displayName: 'Amazon Prime Video',
      color: '#00a8e1',
      bgDark: '#0f172a',
      badgeColor: '#0284c7',
      screensCount: 5,
      plans: ['01 Month', '03 Months', '06 Months', '12 Months'],
      prices: { '01 Month': 149, '03 Months': 399, '06 Months': 699, '12 Months': 1299 }
    },
    {
      id: 'disney_hotstar',
      name: 'Disney+ Hotstar',
      displayName: 'Disney+ Hotstar',
      color: '#113ccf',
      bgDark: '#030b2e',
      badgeColor: '#1d4ed8',
      screensCount: 4,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 149, '03 Months': 349, '12 Months': 899 }
    },
    {
      id: 'sonyliv',
      name: 'SonyLIV',
      displayName: 'Sony LIV Premium',
      color: '#a855f7',
      bgDark: '#2e1065',
      badgeColor: '#9333ea',
      screensCount: 4,
      plans: ['01 Month', '06 Months', '12 Months'],
      prices: { '01 Month': 129, '06 Months': 499, '12 Months': 799 }
    },
    {
      id: 'zee5',
      name: 'ZEE5',
      displayName: 'ZEE5 Club',
      color: '#f97316',
      bgDark: '#431407',
      badgeColor: '#ea580c',
      screensCount: 3,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 99, '03 Months': 249, '12 Months': 599 }
    },
    {
      id: 'youtube_premium',
      name: 'YouTube Premium',
      displayName: 'YouTube Premium',
      color: '#ff0000',
      bgDark: '#171717',
      badgeColor: '#dc2626',
      screensCount: 5,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 129, '03 Months': 349, '12 Months': 1199 }
    },
    {
      id: 'spotify',
      name: 'Spotify',
      displayName: 'Spotify Premium Family',
      color: '#22c55e',
      bgDark: '#052e16',
      badgeColor: '#16a34a',
      screensCount: 6,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 119, '03 Months': 299, '12 Months': 999 }
    },
    {
      id: 'apple_tv',
      name: 'Apple TV+',
      displayName: 'Apple TV+ 4K',
      color: '#334155',
      bgDark: '#09090b',
      badgeColor: '#475569',
      screensCount: 6,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 99, '03 Months': 269, '12 Months': 999 }
    },
    {
      id: 'jiocinema',
      name: 'JioCinema',
      displayName: 'JioCinema Premium',
      color: '#e11d48',
      bgDark: '#4c0519',
      badgeColor: '#be123c',
      screensCount: 4,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 89, '03 Months': 199, '12 Months': 499 }
    },
    {
      id: 'aha',
      name: 'aha',
      displayName: 'Aha Telugu & Tamil',
      color: '#ff5400',
      bgDark: '#431407',
      badgeColor: '#ea580c',
      screensCount: 4,
      plans: ['01 Month', '03 Months', '12 Months'],
      prices: { '01 Month': 99, '03 Months': 249, '12 Months': 699 }
    }
  ];

  const inventory = [
    {
      id: 'inv_1',
      brandId: 'netflix',
      recordNumber: '01',
      email: 'netflix.user01@gmail.com',
      password: 'Nfl!x2026@Secure',
      validity: '06 Months',
      isLocked: true,
      isSelected: true,
      createdAt: '2026-01-15',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1111', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2222', status: 'occupied', saleId: 'sale_1', expiryDate: '27-Jul-2026' },
        { screenNumber: 3, name: 'Screen-3', pin: '3333', status: 'occupied', saleId: 'sale_2', expiryDate: '12-Jun-2026' },
        { screenNumber: 4, name: 'Screen-4', pin: '4444', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '5555', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_2',
      brandId: 'netflix',
      recordNumber: '02',
      email: 'moviebuff02@gmail.com',
      password: 'Movie@2026Pass!',
      validity: '01 Month',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-02-10',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1111', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2222', status: 'occupied', saleId: 'sale_3', expiryDate: '27-Jul-2026' },
        { screenNumber: 3, name: 'Screen-3', pin: '3333', status: 'occupied', saleId: 'sale_4', expiryDate: '10-Jul-2026' },
        { screenNumber: 4, name: 'Screen-4', pin: '4444', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '5555', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_3',
      brandId: 'netflix',
      recordNumber: '03',
      email: 'Fixyourmobiles@gmail.com',
      password: 'Netflix@@123',
      validity: '01 Month',
      isLocked: true,
      isSelected: true,
      createdAt: '2026-03-01',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1001', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2222', status: 'occupied', saleId: 'sale_bharath', expiryDate: todayStr },
        { screenNumber: 3, name: 'Screen-3', pin: '3003', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '4444', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '5005', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_4',
      brandId: 'netflix',
      recordNumber: '04',
      email: 'netflix123@gmail.com',
      password: 'Amazon@123',
      validity: '06 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-03-05',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1111', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2222', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 3, name: 'Screen-3', pin: '3333', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '4444', status: 'occupied', saleId: 'sale_santhosh', expiryDate: inTwoDaysStr },
        { screenNumber: 5, name: 'Screen-5', pin: '5555', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_5',
      brandId: 'prime_video',
      recordNumber: '01',
      email: 'riya.sharma47@gmail.com',
      password: 'Pr!me@2025#',
      validity: '12 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2025-04-15',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '5678', status: 'occupied', saleId: 'sale_riya', expiryDate: inTwoDaysStr },
        { screenNumber: 2, name: 'Screen-2', pin: '5678', status: 'occupied', saleId: 'sale_riya_2', expiryDate: '28-Apr-2025' },
        { screenNumber: 3, name: 'Screen-3', pin: '5678', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '5678', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '5678', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_6',
      brandId: 'disney_hotstar',
      recordNumber: '01',
      email: 'hotstar.vip2026@gmail.com',
      password: 'Disney@Hot2026',
      validity: '12 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2025-06-01',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1010', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2020', status: 'occupied', saleId: 'sale_hotstar', expiryDate: '15-Aug-2026' },
        { screenNumber: 3, name: 'Screen-3', pin: '3030', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '4040', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_7',
      brandId: 'sonyliv',
      recordNumber: '01',
      email: 'sonyliv.pro@gmail.com',
      password: 'SonyLiv@Pass99',
      validity: '06 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-01-10',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1122', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '3344', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 3, name: 'Screen-3', pin: '5566', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '7788', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_8',
      brandId: 'zee5',
      recordNumber: '01',
      email: 'zee5.premium@gmail.com',
      password: 'Zee5#Stream2026',
      validity: '03 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-02-15',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1234', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '5678', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 3, name: 'Screen-3', pin: '9012', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_9',
      brandId: 'youtube_premium',
      recordNumber: '01',
      email: 'ytprem.family@gmail.com',
      password: 'YouTube@Red2026',
      validity: '12 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-01-01',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1111', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '2222', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 3, name: 'Screen-3', pin: '3333', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '4444', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '5555', status: 'empty', saleId: null, expiryDate: null }
      ]
    },
    {
      id: 'inv_10',
      brandId: 'spotify',
      recordNumber: '01',
      email: 'spotifamily.sub@gmail.com',
      password: 'Spotify@Music2026',
      validity: '12 Months',
      isLocked: true,
      isSelected: false,
      createdAt: '2026-01-05',
      screens: [
        { screenNumber: 1, name: 'Screen-1', pin: '1001', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 2, name: 'Screen-2', pin: '1002', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 3, name: 'Screen-3', pin: '1003', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 4, name: 'Screen-4', pin: '1004', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 5, name: 'Screen-5', pin: '1005', status: 'empty', saleId: null, expiryDate: null },
        { screenNumber: 6, name: 'Screen-6', pin: '1006', status: 'empty', saleId: null, expiryDate: null }
      ]
    }
  ];

  const sales = [
    {
      id: 'sale_bharath',
      recordNumber: '01',
      customerName: 'Bharath',
      customerNumber: '9059542610',
      referenceName: 'Kiran',
      referenceNumber: '9848022338',
      brandId: 'netflix',
      brandName: 'Netflix',
      accountEmail: 'Fixyourmobiles@gmail.com',
      accountPassword: 'Netflix@@123',
      validity: '01 Month',
      screenNumber: '02',
      screenPin: '2222',
      activationDate: oneMonthAgoStr,
      expiryDate: todayStr, // Expiring Today
      amount: 199,
      deviceName: 'OnePlus TV',
      saleDate: oneMonthAgoStr,
      notificationSent: false,
      lastNotifiedAt: null
    },
    {
      id: 'sale_santhosh',
      recordNumber: '02',
      customerName: 'Santhosh',
      customerNumber: '7780199188',
      referenceName: 'Manoj',
      referenceNumber: '9885544332',
      brandId: 'netflix',
      brandName: 'Netflix',
      accountEmail: 'Netflix123@gmail.com',
      accountPassword: 'Amazon@123',
      validity: '06 Months',
      screenNumber: '04',
      screenPin: '4444',
      activationDate: '17-Jun-2026',
      expiryDate: inTwoDaysStr, // Expiring in 2 days
      amount: 799,
      deviceName: 'Samsung TV',
      saleDate: '17-Jun-2026',
      notificationSent: false,
      lastNotifiedAt: null
    },
    {
      id: 'sale_aarav',
      recordNumber: '03',
      customerName: 'Aarav Mehta',
      customerNumber: '9876543210',
      referenceName: 'Self',
      referenceNumber: '',
      brandId: 'netflix',
      brandName: 'Netflix',
      accountEmail: 'aarav.mehta23@gmail.com',
      accountPassword: 'Nf!x@2025#',
      validity: '12 Months',
      screenNumber: '1 Screen',
      screenPin: '1234',
      activationDate: twelveMonthsAgoStr,
      expiryDate: yesterdayStr, // Expired
      amount: 1499,
      deviceName: 'LG OLED',
      saleDate: twelveMonthsAgoStr,
      notificationSent: true,
      lastNotifiedAt: yesterdayStr
    },
    {
      id: 'sale_riya',
      recordNumber: '04',
      customerName: 'Riya Sharma',
      customerNumber: '8765432101',
      referenceName: 'Rohan',
      referenceNumber: '9988776655',
      brandId: 'prime_video',
      brandName: 'Prime Video',
      accountEmail: 'riya.sharma47@gmail.com',
      accountPassword: 'Pr!me@2025#',
      validity: '12 Months',
      screenNumber: '2 Screens',
      screenPin: '5678',
      activationDate: '28-Apr-2024',
      expiryDate: inTwoDaysStr,
      amount: 999,
      deviceName: 'Firestick 4K',
      saleDate: '28-Apr-2024',
      notificationSent: false,
      lastNotifiedAt: null
    },
    {
      id: 'sale_vikram',
      recordNumber: '05',
      customerName: 'Vikram Reddy',
      customerNumber: '9123456789',
      referenceName: 'Sunil',
      referenceNumber: '9876501234',
      brandId: 'netflix',
      brandName: 'Netflix',
      accountEmail: 'netflix.user01@gmail.com',
      accountPassword: 'Nfl!x2026@Secure',
      validity: '06 Months',
      screenNumber: '02',
      screenPin: '2222',
      activationDate: '27-Jan-2026',
      expiryDate: '27-Jul-2026',
      amount: 899,
      deviceName: 'Sony Bravia',
      saleDate: '27-Jan-2026',
      notificationSent: false,
      lastNotifiedAt: null
    }
  ];

  const settings = {
    appName: 'Accounts Manager',
    defaultBrand: 'netflix',
    whatsappCountryCode: '91',
    whatsappTemplate: 'Hello {name}! Your {brand} subscription ({screen}, PIN: {pin}) is expiring on {expiryDate}. Renew now to enjoy uninterrupted streaming.\n\nThank you,\nAccounts Manager',
    saleFormConfig: {
      requireReference: false,
      allowDeviceName: true,
      autoSelectEmptyScreen: true
    }
  };

  return { brands, inventory, sales, settings };
}
