import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { api } from './api/client';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import BrandSelectorModal from './components/BrandSelectorModal';
import NotifyModal from './components/NotifyModal';
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
    setToast({ message, type });
    setTimeout(() => {
      setToast({ message: '', type: 'info' });
    }, 3200);
  };

  // Initial load
  const loadInitial = async () => {
    try {
      const brandsList = await api.getBrands();
      setBrands(brandsList);
      if (brandsList && brandsList.length > 0) {
        if (!selectedBrand) {
          setSelectedBrand(brandsList[0]);
        }
      }
      const liveStats = await api.getStats();
      setStats(liveStats);
    } catch (err) {
      console.error('Initial load error:', err);
    }
  };

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
    await api.createSale(salePayload);
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
        {/* Top Header (Forms Management Screen renders its own dedicated header per requirement) */}
        {currentScreen !== 'forms-mgmt' && (
          <TopHeader
            isHome={currentScreen === 'home'}
            showBack={currentScreen !== 'home'}
            onBack={handleBack}
            title={getHeaderTitle()}
            selectedBrand={currentScreen !== 'home' && currentScreen !== 'settings' && currentScreen !== 'cells-linkup' && currentScreen !== 'brands-mgmt' ? selectedBrand : null}
            onBrandClick={() => setShowBrandSelector(true)}
            onOpenMenu={() => setShowMenuDrawer(true)}
            rightAction={
              currentScreen === 'recent-sales' && selectedBrand ? (
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
            selectedBrand={selectedBrand}
            initialFilter={screenParams.filter || 'ALL'}
            onOpenNotifyModal={(sale) => setNotifySaleItem(sale)}
            showToast={showToast}
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

        {/* Fixed Bottom Navigation Bar */}
        <BottomNav activeTab={activeTab} onSelectTab={handleBottomTab} />
      </div>

      {/* Hamburger Home Menu Drawer: Brands, Forms, Cells Linking, Create Form, Settings, Logout */}
      <HomeMenuDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        onSelectBrands={() => navigateTo('brands-mgmt')}
        onSelectForms={() => navigateTo('forms-mgmt')}
        onSelectCellsLinkup={() => navigateTo('cells-linkup')}
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
    </div>
  );
}
