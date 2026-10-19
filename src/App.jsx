import React, { useState, useEffect } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { api } from './api/client';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import BrandSelectorModal from './components/BrandSelectorModal';
import NotifyModal from './components/NotifyModal';
import DatePickerModal from './components/DatePickerModal';
import HomeMenuDrawer from './components/HomeMenuDrawer';

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

  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [history, setHistory] = useState(['home']);

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [stats, setStats] = useState(null);

  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [notifySaleItem, setNotifySaleItem] = useState(null);
  const [recentSalesAddModalOpen, setRecentSalesAddModalOpen] = useState(false);
  const [brandsAddModalOpen, setBrandsAddModalOpen] = useState(false);
  const [expiryDateFilter, setExpiryDateFilter] = useState('');
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);

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
  const loadInitial = async () => {
    try {
      const brandsList = await api.getBrands(currentUser?.email);
      setBrands(brandsList);
      if (brandsList && brandsList.length > 0) {
        if (!selectedBrand) {
          setSelectedBrand(brandsList[0]);
        }
      }
      const liveStats = await api.getStats();
      setStats(liveStats);

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
      navigateTo('expiry');
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
        return 'Expiry Alerts';
      case 'settings':
        return 'Settings';
      default:
        return 'OTT Sellers';
    }
  };

  return (
    <div className="mobile-app-root">
      {/* Toast Notification Container */}
      <Toast message={toast.message} type={toast.type} />

      {/* Main Responsive Mobile Viewport */}
      <div className="mobile-app-viewport">
        {/* Top Header (Dedicated screens like Forms Management, WhatsApp Messages, Share Brands & Revenue Management render their own header) */}
        {currentScreen !== 'forms-mgmt' && currentScreen !== 'whatsapp-messages' && currentScreen !== 'share-brands' && currentScreen !== 'revenue-mgmt' && (
          <TopHeader
            isHome={currentScreen === 'home'}
            showBack={currentScreen !== 'home'}
            onBack={handleBack}
            title={getHeaderTitle()}
            selectedBrand={currentScreen !== 'home' && currentScreen !== 'settings' && currentScreen !== 'cells-linkup' && currentScreen !== 'brands-mgmt' ? selectedBrand : null}
            onBrandClick={() => setShowBrandSelector(true)}
            onOpenMenu={() => setShowMenuDrawer(true)}
            rightAction={
              currentScreen === 'expiry' ? (
                <button
                  type="button"
                  className="header-btn"
                  style={{
                    width: '38px',
                    height: '38px',
                    background: expiryDateFilter ? '#eff6ff' : '#ffffff',
                    borderColor: expiryDateFilter ? '#2563eb' : '#cbd5e1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    boxShadow: expiryDateFilter ? '0 2px 6px rgba(37, 99, 235, 0.25)' : 'none'
                  }}
                  onClick={() => setShowExpiryDatePicker(true)}
                  title={expiryDateFilter ? `Expiry Filter: ${expiryDateFilter}. Click to change` : 'Filter Expiry by Calendar'}
                  id="expiry-header-calendar-btn"
                >
                  <Calendar size={19} color={expiryDateFilter ? '#2563eb' : '#475569'} strokeWidth={2.3} />
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
        {currentScreen === 'home' && (
          <HomeScreen
            stats={stats}
            brands={brands}
            onNavigate={navigateTo}
            onSyncSheets={() => syncWithGoogleSheets(false)}
          />
        )}

        {(currentScreen === 'sale' || currentScreen === 'create-form') && (
          <SaleScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            prefillData={screenParams.prefill}
            onSaleSuccess={handleSaleSuccess}
            showToast={showToast}
          />
        )}

        {(currentScreen === 'data' || currentScreen === 'inventory') && (
          <InventoryScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            onNavigateToSaleWithSlot={(slotData) => navigateTo('sale', { prefill: slotData })}
            showToast={showToast}
          />
        )}

        {currentScreen === 'recent-sales' && (
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
        )}

        {currentScreen === 'cells-linkup' && (
          <CellsLinkupScreen
            showToast={showToast}
            onBack={handleBack}
          />
        )}

        {currentScreen === 'brands-mgmt' && (
          <BrandsManagementScreen
            onBack={handleBack}
            onBrandCreated={(newBrand) => {
              loadInitial();
              setSelectedBrand(newBrand);
            }}
            showToast={showToast}
            isAddModalOpen={brandsAddModalOpen}
            onOpenAdd={() => setBrandsAddModalOpen(true)}
            onCloseAdd={() => setBrandsAddModalOpen(false)}
          />
        )}

        {currentScreen === 'forms-mgmt' && (
          <FormsManagementScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            onNavigateToSale={handleSaleSuccess}
            onBack={handleBack}
            showToast={showToast}
          />
        )}

        {currentScreen === 'expiry' && (
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
        )}

        {currentScreen === 'brands' && (
          <BrandsScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={handleSelectBrandAndOpen}
            onNavigate={navigateTo}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            onResetComplete={loadInitial}
            showToast={showToast}
          />
        )}

        {currentScreen === 'whatsapp-messages' && (
          <WhatsAppMessagesScreen
            onBack={handleBack}
            showToast={showToast}
          />
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
          <RevenueManagementScreen
            brands={brands}
            onBack={handleBack}
            showToast={showToast}
            onOpenMenu={() => setShowMenuDrawer(true)}
          />
        )}

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav activeTab={activeTab} onSelectTab={handleBottomTab} />
      </div>

      {/* Hamburger Home Menu Drawer: Brands, Forms, Cells Linking, Custom WhatsApp, Share Brands, Create Form, Settings, Logout */}
      <HomeMenuDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        onSelectBrands={() => navigateTo('brands-mgmt')}
        onSelectForms={() => navigateTo('forms-mgmt')}
        onSelectCellsLinkup={() => navigateTo('cells-linkup')}
        onSelectWhatsAppMessages={() => navigateTo('whatsapp-messages')}
        onSelectShareBrands={() => navigateTo('share-brands')}
        onSelectRevenueManagement={() => navigateTo('revenue-mgmt')}
        onSelectCreateForm={() => navigateTo('sale')}
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
          onSelect={(date) => {
            setExpiryDateFilter(date);
            setShowExpiryDatePicker(false);
            showToast(`Filtering subscriptions expiring on ${date}`, 'success');
          }}
          onClose={() => setShowExpiryDatePicker(false)}
        />
      )}
    </div>
  );
}
