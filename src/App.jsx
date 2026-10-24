import React, { useState, useEffect } from 'react';
import { Plus, Calendar, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { api } from './api/client';
import { exportExpiryToExcel, exportInventoryToExcel } from './utils/excelExport';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import BrandSelectorModal from './components/BrandSelectorModal';
import NotifyModal from './components/NotifyModal';
import DatePickerModal from './components/DatePickerModal';
import HomeMenuDrawer from './components/HomeMenuDrawer';
import ColorCodingsModal from './components/ColorCodingsModal';

import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import SaleScreen from './screens/SaleScreen';
import InventoryScreen from './screens/InventoryScreen';
import RecentSalesScreen from './screens/RecentSalesScreen';
import CellsLinkupScreen from './screens/CellsLinkupScreen';
import ExpiryScreen from './screens/ExpiryScreen';
import BrandsScreen from './screens/BrandsScreen';
import BrandsManagementScreen from './screens/BrandsManagementScreen';
import FormsManagementScreen from './screens/FormsManagementScreen';
import SettingsScreen from './screens/SettingsScreen';
import WhatsAppMessagesScreen from './screens/WhatsAppMessagesScreen';
import ShareBrandsScreen from './screens/ShareBrandsScreen';
import RevenueManagementScreen from './screens/RevenueManagementScreen';
import AdminPanelScreen from './screens/AdminPanelScreen';
import AccessRestricted from './components/AccessRestricted';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('accounts_manager_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // User Feature Permissions State
  const [userPermissions, setUserPermissions] = useState(() => {
    try {
      const saved = localStorage.getItem('accounts_manager_permissions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Website Branding & Theme Settings State
  const [siteSettings, setSiteSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('accounts_manager_site_settings');
      return saved ? JSON.parse(saved) : {
        businessName: 'OTT SELLERS',
        subtitle: 'Management System',
        logoUrl: '',
        primaryColor: '#2563eb',
        accentColor: '#0284c7'
      };
    } catch (e) {
      return {
        businessName: 'OTT SELLERS',
        subtitle: 'Management System',
        logoUrl: '',
        primaryColor: '#2563eb',
        accentColor: '#0284c7'
      };
    }
  });

  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [history, setHistory] = useState(['home']);

  const [brands, setBrands] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_brands');
      if (cached) return JSON.parse(cached);
      const local = JSON.parse(localStorage.getItem('accounts_manager_app_data_v7') || '{}');
      if (Array.isArray(local.brands) && local.brands.length > 0) return local.brands;
    } catch (e) {}
    return [];
  });
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [stats, setStats] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_stats');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [notifySaleItem, setNotifySaleItem] = useState(null);
  const [recentSalesAddModalOpen, setRecentSalesAddModalOpen] = useState(false);
  const [brandsAddModalOpen, setBrandsAddModalOpen] = useState(false);
  const [expiryDateFilter, setExpiryDateFilter] = useState('');
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [showColorCodings, setShowColorCodings] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Direct Password Reset link handler (from email ?reset=true&email=...&otp=...)
  const [directResetParams] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const p = new URLSearchParams(window.location.search);
        if (p.get('reset') === 'true' && p.get('email')) {
          return {
            email: p.get('email'),
            otp: p.get('otp') || ''
          };
        }
      }
    } catch (e) {}
    return null;
  });

  // Toast state
  const [toast, setToast] = useState({ message: '', type: 'info' });

  const showToast = (message, type = 'info') => {
    let cleanMessage = message;
    if (typeof cleanMessage === 'string') {
      if (cleanMessage === 'Failed to fetch' || cleanMessage.includes('Failed to fetch') || cleanMessage.includes('NetworkError') || cleanMessage.includes('Load failed')) {
        cleanMessage = 'Unable to reach Google Sheets. In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone".';
      }
    }
    setToast({ message: cleanMessage, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 3200);
  };

  // Initial load
  const loadInitial = async (forcedUser) => {
    try {
      const activeUser = forcedUser || currentUser;

      // 1. Load website branding & dynamic site settings
      const settings = await api.getSiteSettings();
      if (settings) {
        setSiteSettings(settings);
        try {
          localStorage.setItem('accounts_manager_site_settings', JSON.stringify(settings));
          if (settings.primaryColor && typeof document !== 'undefined') {
            document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
          }
        } catch (e) {}
      }

      // 2. Load user permissions
      if (activeUser?.id) {
        const perms = await api.getUserPermissions(activeUser.id);
        if (perms) {
          setUserPermissions(perms);
          try {
            localStorage.setItem('accounts_manager_permissions', JSON.stringify(perms));
          } catch (e) {}
        }
      }

      // 3. Load brands (Do not auto-default to Netflix; start with null / All Brands per user requirement)
      const brandsList = await api.getBrands(activeUser?.email);
      setBrands(brandsList);
      try {
        localStorage.setItem('accounts_manager_cached_brands', JSON.stringify(brandsList));
      } catch (e) {}

      // 4. Load stats
      const liveStats = await api.getStats();
      setStats(liveStats);
      try {
        localStorage.setItem('accounts_manager_cached_stats', JSON.stringify(liveStats));
      } catch (e) {}

      // Extract latest live data from Google Sheets if configured
      api.pullFromGoogleSheet().then(res => {
        if (res?.success) {
          api.getStats().then(s => setStats(s)).catch(() => {});
        }
      }).catch(() => {});
    } catch (err) {
      console.error('Initial load error:', err);
    }
  };

  const isAllowed = (featureKey) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    return userPermissions[featureKey] !== false;
  };

  const syncWithGoogleSheets = async (silent = false) => {
    try {
      const cfg = await api.getSheetsConfig();
      if (!cfg?.webhookUrl) {
        if (!silent) {
          navigateTo('cells-linkup');
          showToast('Please configure your Google Apps Script Web App URL first', 'info');
        }
        return;
      }

      // 1. First push local accounts & sales to Google Sheets
      const pushRes = await api.syncNow().catch(err => {
        console.warn('Sync push notice:', err.message);
        return null;
      });

      // 2. Pull and reconcile from Google Sheets
      const res = await api.pullFromGoogleSheet();
      if (res?.success || pushRes?.success) {
        const liveStats = await api.getStats();
        setStats(liveStats);
        if (!silent) {
          showToast('Google Sheets: All inventory & sales synced successfully!', 'success');
        }
      } else if (!silent && res?.message) {
        let msg = res.message;
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
          msg = 'Unable to reach Google Sheets. In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone".';
        }
        showToast(msg, 'info');
      }
    } catch (e) {
      if (!silent) {
        let msg = e.message || 'Sync failed';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Load failed')) {
          msg = 'Unable to reach Google Sheets. In Apps Script, click Deploy > Manage deployments > Edit > set "Who has access" to "Anyone".';
        }
        showToast(msg, 'error');
      }
    }
  };

  // Two-way synchronization: When switching back from Google Sheets tab/app, auto-refresh live data!
  useEffect(() => {
    if (!currentUser) return;

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncWithGoogleSheets(true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Periodic gentle background poll (every 45 seconds)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncWithGoogleSheets(true);
      }
    }, 45000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      clearInterval(interval);
    };
  }, [currentUser]);

  // Initialize theme and text size on startup
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('accounts_theme') || 'light';
      if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (savedTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }

      const savedTextSize = parseInt(localStorage.getItem('accounts_text_size') || '100', 10);
      const scale = savedTextSize / 100;
      if (document.body) {
        document.body.style.zoom = scale;
      }
      document.documentElement.style.fontSize = `${16 * scale}px`;
      document.documentElement.style.setProperty('--app-font-scale', String(scale));
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadInitial();
    }
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('accounts_manager_user');
    localStorage.removeItem('accounts_manager_token');
    setCurrentUser(null);
    setCurrentScreen('home');
    setHistory(['home']);
    showToast('Logged out successfully', 'info');
  };

  const navigateTo = (screenName, params = {}) => {
    if (screenName === 'data' || screenName === 'inventory' || screenName === 'recent-sales') {
      if (!params.brand) {
        setSelectedBrand(null);
      } else {
        setSelectedBrand(params.brand);
      }
    } else if (screenName === 'expiry') {
      // Expiry screen must open in normal, general view without carrying over brands or filters from other screens
      if (!params.brand) {
        setSelectedBrand(null);
      } else {
        setSelectedBrand(params.brand);
      }
      if (!params.date) {
        setExpiryDateFilter('');
      }
    }
    setScreenParams(params);
    setCurrentScreen(screenName);
    setHistory(prev => [...prev, screenName]);
    setShowMenuDrawer(false);
  };

  const handleBack = () => {
    if ((currentScreen === 'data' || currentScreen === 'inventory' || currentScreen === 'recent-sales') && selectedBrand) {
      setSelectedBrand(null);
      return;
    }
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevScreen = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentScreen(prevScreen);
    } else {
      setCurrentScreen('home');
    }
  };

  const handleBottomTab = (tab) => {
    if (tab === 'home') {
      navigateTo('home');
    } else if (tab === 'expiry') {
      navigateTo('expiry', { filter: 'ALL', brand: null });
    }
  };

  const handleSaleSuccess = async (salePayload) => {
    const payload = {
      ...salePayload,
      sellerEmail: salePayload.sellerEmail || currentUser?.email || 'Fixyourmobiles10@gmail.com'
    };
    await api.createSale(payload);
    const updatedStats = await api.getStats();
    setStats(updatedStats);
    navigateTo('recent-sales');
  };

  const handleConfirmNotification = async (saleId) => {
    try {
      await api.notifyCustomer(saleId);
      showToast('Notification status recorded successfully!', 'success');
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err) {
      showToast('Failed to record notification', 'error');
    }
  };

  const handleExportAllToExcel = async () => {
    try {
      setIsExportingExcel(true);
      showToast('Preparing Excel workbook...', 'info');

      // Fetch all subscription & sales records across all brands & accounts
      const allSales = await api.getExpiry({ filter: 'ALL', brandId: 'all' });
      if (!allSales || allSales.length === 0) {
        showToast('No subscription records found to export', 'info');
        return;
      }

      const exportedFilename = exportExpiryToExcel(allSales, {
        filenamePrefix: 'Subscription_Expiry_Report',
        selectedBrandName: selectedBrand ? (selectedBrand.displayName || selectedBrand.name) : 'All Brands'
      });

      showToast(`Downloaded ${exportedFilename} successfully!`, 'success');
    } catch (err) {
      showToast('Failed to export Excel report: ' + err.message, 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportInventoryToExcel = async () => {
    try {
      setIsExportingExcel(true);
      showToast('Preparing Accounts Inventory Excel...', 'info');
      const brandId = selectedBrand ? selectedBrand.id : 'all';
      const brandName = selectedBrand ? (selectedBrand.displayName || selectedBrand.name) : 'All Brands';
      const invList = await api.getInventory({ brandId });
      if (!invList || invList.length === 0) {
        showToast('No accounts found to export', 'info');
        return;
      }
      const exportedFilename = exportInventoryToExcel(invList, brandName);
      showToast(`Downloaded ${exportedFilename} successfully!`, 'success');
    } catch (err) {
      showToast('Failed to export Inventory Excel: ' + err.message, 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleSelectBrandAndOpen = (brand) => {
    setSelectedBrand(brand);
    navigateTo('data');
    showToast(`Opened ${brand.displayName} Accounts`, 'success');
  };

  // If not logged in, show Login Screen (with Forgot Password & OTP)
  if (!currentUser) {
    return (
      <div className="mobile-app-root">
        <Toast message={toast.message} type={toast.type} />
        <LoginScreen
          directResetParams={directResetParams}
          onLoginSuccess={(user) => {
            setCurrentUser(user);
            loadInitial();
          }}
          showToast={showToast}
        />
      </div>
    );
  }

  const activeTab = currentScreen === 'expiry' ? 'expiry' : 'home';

  // Compute Header Title
  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'home':
        return '';
      case 'admin-panel':
        return 'Admin Panel';
      case 'sale':
      case 'create-form':
        return 'Sale';
      case 'data':
      case 'inventory':
        return selectedBrand ? (selectedBrand.displayName || 'Data') : 'Select OTT';
      case 'recent-sales':
        return selectedBrand ? (selectedBrand.displayName || "Recent Sale's") : 'Select OTT';
      case 'cells-linkup':
        return 'Cells Linking';
      case 'brands-mgmt':
        return 'Brands';
      case 'forms-mgmt':
        return 'Forms';
      case 'expiry':
        return selectedBrand ? (selectedBrand.displayName || selectedBrand.name || 'All Brands') : 'All Brands';
      case 'settings':
        return 'Settings';
      default:
        return siteSettings.businessName || 'OTT Sellers';
    }
  };

  return (
    <div className="mobile-app-root">
      {/* Toast Notification Container */}
      <Toast message={toast.message} type={toast.type} />

      {/* Main Responsive Mobile Viewport */}
      <div className="mobile-app-viewport">
        {/* Top Header (Dedicated screens like Admin Panel, Forms Management, WhatsApp Messages, Share Brands & Revenue Management render their own header) */}
        {currentScreen !== 'admin-panel' && currentScreen !== 'forms-mgmt' && currentScreen !== 'whatsapp-messages' && currentScreen !== 'share-brands' && currentScreen !== 'revenue-mgmt' && (
          <TopHeader
            isHome={currentScreen === 'home'}
            showBack={currentScreen !== 'home'}
            onBack={handleBack}
            title={getHeaderTitle()}
            selectedBrand={currentScreen !== 'home' && currentScreen !== 'settings' && currentScreen !== 'cells-linkup' && currentScreen !== 'brands-mgmt' && currentScreen !== 'expiry' ? selectedBrand : null}
            onBrandClick={() => setShowBrandSelector(true)}
            onOpenMenu={() => setShowMenuDrawer(true)}
            siteSettings={siteSettings}
            rightAction={
              (currentScreen === 'data' || currentScreen === 'inventory') ? (
                <button
                  type="button"
                  className="header-btn"
                  onClick={handleExportInventoryToExcel}
                  disabled={isExportingExcel}
                  style={{
                    height: '38px',
                    padding: '0 10px',
                    background: isExportingExcel ? '#f0fdf4' : '#ffffff',
                    borderColor: '#16a34a',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: isExportingExcel ? 'wait' : 'pointer',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Download Accounts & Screens Inventory as Excel (.xlsx)"
                  id="inventory-header-excel-btn"
                >
                  {isExportingExcel ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} strokeWidth={2.4} color="#16a34a" />
                  )}
                  <span style={{ fontSize: '11.5px', fontWeight: 800 }}>
                    {isExportingExcel ? 'Exporting...' : 'Excel'}
                  </span>
                </button>
              ) : currentScreen === 'expiry' ? (
                <button
                  type="button"
                  className="header-btn"
                  onClick={handleExportAllToExcel}
                  disabled={isExportingExcel}
                  style={{
                    height: '38px',
                    padding: '0 10px',
                    background: isExportingExcel ? '#f0fdf4' : '#ffffff',
                    borderColor: '#16a34a',
                    color: '#15803d',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: isExportingExcel ? 'wait' : 'pointer',
                    borderRadius: '10px',
                    boxShadow: '0 1px 3px rgba(22, 163, 74, 0.15)',
                    whiteSpace: 'nowrap'
                  }}
                  title="Download All Subscriptions Expiry Report (.xlsx)"
                  id="expiry-header-excel-btn"
                >
                  {isExportingExcel ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={16} strokeWidth={2.4} color="#16a34a" />
                  )}
                  <span style={{ fontSize: '11.5px', fontWeight: 800 }}>
                    {isExportingExcel ? 'Exporting...' : 'Excel'}
                  </span>
                </button>
              ) : currentScreen === 'recent-sales' && selectedBrand ? (
                <button
                  type="button"
                  className="glossy-btn glossy-btn-orange"
                  style={{
                    padding: '5px 10px',
                    fontSize: '12px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(249, 115, 22, 0.35)'
                  }}
                  onClick={() => setRecentSalesAddModalOpen(true)}
                  id="recent-sales-add-sale-header-btn"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Add Sale</span>
                </button>
              ) : currentScreen === 'brands-mgmt' ? (
                <button
                  type="button"
                  className="glossy-btn glossy-btn-blue"
                  style={{
                    padding: '5px 12px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 6px rgba(37, 99, 235, 0.35)'
                  }}
                  onClick={() => setBrandsAddModalOpen(true)}
                  id="brands-add-brand-header-btn"
                >
                  <Plus size={15} strokeWidth={2.5} />
                  <span>Add Brand</span>
                </button>
              ) : null
            }
          />
        )}

        {/* Screen Routing */}
        {currentScreen === 'admin-panel' && (
          currentUser?.role === 'admin' ? (
            <AdminPanelScreen
              currentUser={currentUser}
              onBack={handleBack}
              showToast={showToast}
              brands={brands}
              onOpenBrandManager={() => navigateTo('brands-mgmt')}
              onBrandingUpdated={(newSettings) => {
                setSiteSettings(newSettings);
                if (newSettings.primaryColor && typeof document !== 'undefined') {
                  document.documentElement.style.setProperty('--primary-color', newSettings.primaryColor);
                }
              }}
            />
          ) : (
            <AccessRestricted featureName="Admin Panel" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'home' && (
          isAllowed('home_dashboard') ? (
            <HomeScreen
              stats={stats}
              brands={brands}
              onNavigate={navigateTo}
              onSyncSheets={() => syncWithGoogleSheets(false)}
              currentUser={currentUser}
              userPermissions={userPermissions}
            />
          ) : (
            <AccessRestricted featureName="Home Dashboard" onGoHome={() => navigateTo('data')} />
          )
        )}

        {(currentScreen === 'sale' || currentScreen === 'create-form') && (
          isAllowed('sales') ? (
            <SaleScreen
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              prefillData={screenParams.prefill}
              onSaleSuccess={handleSaleSuccess}
              showToast={showToast}
            />
          ) : (
            <AccessRestricted featureName="Sales & Checkout" onGoHome={() => navigateTo('home')} />
          )
        )}

        {(currentScreen === 'data' || currentScreen === 'inventory') && (
          isAllowed('account_management') ? (
            <InventoryScreen
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              onNavigateToSaleWithSlot={(slotData) => navigateTo('sale', { prefill: slotData })}
              showToast={showToast}
            />
          ) : (
            <AccessRestricted featureName="Accounts & Inventory (Data)" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'recent-sales' && (
          isAllowed('recent_sales') ? (
            <RecentSalesScreen
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              onOpenNotifyModal={(sale) => setNotifySaleItem(sale)}
              showToast={showToast}
              isAddSaleOpen={recentSalesAddModalOpen}
              onOpenAddSale={() => setRecentSalesAddModalOpen(true)}
              onCloseAddSale={() => setRecentSalesAddModalOpen(false)}
              currentUser={currentUser}
              onSaleAdded={async () => {
                const updatedStats = await api.getStats();
                setStats(updatedStats);
              }}
            />
          ) : (
            <AccessRestricted featureName="Recent Sales" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'cells-linkup' && (
          isAllowed('cells_linkup') ? (
            <CellsLinkupScreen
              showToast={showToast}
              onBack={handleBack}
            />
          ) : (
            <AccessRestricted featureName="Cells Linking" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'brands-mgmt' && (
          isAllowed('brands') ? (
            <BrandsManagementScreen
              onBack={handleBack}
              onBrandCreated={(newBrand) => {
                loadInitial();
                setSelectedBrand(newBrand);
              }}
              onBrandUpdated={(updatedBrand) => {
                loadInitial();
                if (selectedBrand?.id === updatedBrand?.id) {
                  setSelectedBrand(updatedBrand);
                }
              }}
              showToast={showToast}
              isAddModalOpen={brandsAddModalOpen}
              onOpenAdd={() => setBrandsAddModalOpen(true)}
              onCloseAdd={() => setBrandsAddModalOpen(false)}
            />
          ) : (
            <AccessRestricted featureName="Brands Management" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'forms-mgmt' && (
          isAllowed('cells_linkup') ? (
            <FormsManagementScreen
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              onNavigateToSale={handleSaleSuccess}
              onBack={handleBack}
              showToast={showToast}
            />
          ) : (
            <AccessRestricted featureName="Forms Management" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'expiry' && (
          isAllowed('expiry_management') ? (
            <ExpiryScreen
              brands={brands}
              selectedBrand={selectedBrand}
              initialFilter={screenParams.filter || 'ALL'}
              onOpenNotifyModal={(sale) => setNotifySaleItem(sale)}
              showToast={showToast}
              dateFilter={expiryDateFilter}
              onOpenDatePicker={() => setShowExpiryDatePicker(true)}
              onClearDateFilter={() => setExpiryDateFilter('')}
            />
          ) : (
            <AccessRestricted featureName="Expiry Management" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'brands' && (
          isAllowed('brands') ? (
            <BrandsScreen
              brands={brands}
              selectedBrand={selectedBrand}
              onSelectBrand={handleSelectBrandAndOpen}
              onNavigate={navigateTo}
            />
          ) : (
            <AccessRestricted featureName="Brands View" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            onResetComplete={loadInitial}
            showToast={showToast}
          />
        )}

        {currentScreen === 'whatsapp-messages' && (
          isAllowed('notifications') ? (
            <WhatsAppMessagesScreen
              onBack={handleBack}
              showToast={showToast}
            />
          ) : (
            <AccessRestricted featureName="WhatsApp Notifications" onGoHome={() => navigateTo('home')} />
          )
        )}

        {currentScreen === 'share-brands' && (
          <ShareBrandsScreen
            brands={brands}
            currentUser={currentUser}
            onBack={handleBack}
            showToast={showToast}
            onShareUpdated={loadInitial}
          />
        )}

        {currentScreen === 'revenue-mgmt' && (
          isAllowed('revenue_management') ? (
            <RevenueManagementScreen
              brands={brands}
              onBack={handleBack}
              showToast={showToast}
              onOpenMenu={() => setShowMenuDrawer(true)}
            />
          ) : (
            <AccessRestricted featureName="Revenue Management" onGoHome={() => navigateTo('home')} />
          )
        )}

        {/* Fixed Bottom Navigation Bar (Hidden when inside Admin Panel) */}
        {currentScreen !== 'admin-panel' && (
          <BottomNav activeTab={activeTab} onSelectTab={handleBottomTab} />
        )}
      </div>

      {/* Hamburger Home Menu Drawer: Brands, Forms, Cells Linking, Custom WhatsApp, Share Brands, Create Form, Settings, Logout */}
      <HomeMenuDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        currentUser={currentUser}
        userPermissions={userPermissions}
        onSelectAdminPanel={() => navigateTo('admin-panel')}
        onSelectBrands={() => navigateTo('brands-mgmt')}
        onSelectForms={() => navigateTo('forms-mgmt')}
        onSelectCellsLinkup={() => navigateTo('cells-linkup')}
        onSelectWhatsAppMessages={() => navigateTo('whatsapp-messages')}
        onSelectShareBrands={() => navigateTo('share-brands')}
        onSelectRevenueManagement={() => navigateTo('revenue-mgmt')}
        onSelectCreateForm={() => navigateTo('sale')}
        onSelectColorCodings={() => setShowColorCodings(true)}
        onSelectSettings={() => navigateTo('settings')}
        onLogout={handleLogout}
      />

      {/* Brand Selector Modal */}
      <BrandSelectorModal
        isOpen={showBrandSelector}
        brands={brands}
        selectedBrandId={selectedBrand?.id}
        onSelect={handleSelectBrandAndOpen}
        onClose={() => setShowBrandSelector(false)}
      />

      {/* Notify Modal */}
      <NotifyModal
        isOpen={!!notifySaleItem}
        sale={notifySaleItem}
        onClose={() => setNotifySaleItem(null)}
        onConfirmSent={handleConfirmNotification}
      />

      {/* Expiry Calendar Date Picker Modal */}
      {showExpiryDatePicker && (
        <DatePickerModal
          isOpen={showExpiryDatePicker}
          initialDate={expiryDateFilter || ''}
          onSelectDate={(date) => {
            setExpiryDateFilter(date);
            setShowExpiryDatePicker(false);
            showToast(`Filtering subscriptions expiring on ${date}`, 'success');
          }}
          onSelectRange={(start, end) => {
            setExpiryDateFilter(`${start} to ${end}`);
            setShowExpiryDatePicker(false);
            showToast(`Filtering subscriptions expiring from ${start} to ${end}`, 'success');
          }}
          onClearDate={() => {
            setExpiryDateFilter('');
            setShowExpiryDatePicker(false);
            showToast('Cleared date filter: Showing all records', 'info');
          }}
          onClose={() => setShowExpiryDatePicker(false)}
        />
      )}

      {/* Color Codings Modal */}
      {showColorCodings && (
        <ColorCodingsModal
          isOpen={showColorCodings}
          onClose={() => setShowColorCodings(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}
