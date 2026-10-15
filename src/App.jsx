import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import BrandSelectorModal from './components/BrandSelectorModal';
import NotifyModal from './components/NotifyModal';
import HomeMenuDrawer from './components/HomeMenuDrawer';

import HomeScreen from './screens/HomeScreen';
import SaleScreen from './screens/SaleScreen';
import InventoryScreen from './screens/InventoryScreen';
import RecentSalesScreen from './screens/RecentSalesScreen';
import CellsLinkupScreen from './screens/CellsLinkupScreen';
import ExpiryScreen from './screens/ExpiryScreen';
import BrandsScreen from './screens/BrandsScreen';
import SettingsScreen from './screens/SettingsScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [screenParams, setScreenParams] = useState({});
  const [history, setHistory] = useState(['home']);

  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [stats, setStats] = useState(null);

  // Modals state
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [showMenuDrawer, setShowMenuDrawer] = useState(false);
  const [notifySaleItem, setNotifySaleItem] = useState(null);

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
    loadInitial();
  }, []);

  const navigateTo = (screenName, params = {}) => {
    setScreenParams(params);
    setCurrentScreen(screenName);
    setHistory(prev => [...prev, screenName]);
    setShowMenuDrawer(false);
  };

  const handleBack = () => {
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

  const activeTab = currentScreen === 'expiry' ? 'expiry' : 'home';

  // Compute Header Title
  const getHeaderTitle = () => {
    switch (currentScreen) {
      case 'home':
        return '';
      case 'sale':
      case 'create-form':
        return 'Sale & Create Form';
      case 'data':
      case 'inventory':
        return 'Data — Accounts';
      case 'recent-sales':
        return "Recent Sale's";
      case 'cells-linkup':
        return 'Cells Linkup';
      case 'expiry':
        return 'Expiry Alerts';
      case 'settings':
        return 'Settings';
      case 'brands':
        return 'OTT Brands';
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
        {/* Top Header */}
        <TopHeader
          isHome={currentScreen === 'home'}
          showBack={currentScreen !== 'home'}
          onBack={handleBack}
          title={getHeaderTitle()}
          selectedBrand={currentScreen !== 'home' && currentScreen !== 'settings' && currentScreen !== 'cells-linkup' ? selectedBrand : null}
          onBrandClick={() => setShowBrandSelector(true)}
          onOpenMenu={() => setShowMenuDrawer(true)}
        />

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
            onOpenNotifyModal={(sale) => setNotifySaleItem(sale)}
            showToast={showToast}
          />
        )}

        {currentScreen === 'cells-linkup' && (
          <CellsLinkupScreen
            showToast={showToast}
            onBack={handleBack}
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

      {/* Hamburger Home Menu Drawer: Create Form & Cells Linkup */}
      <HomeMenuDrawer
        isOpen={showMenuDrawer}
        onClose={() => setShowMenuDrawer(false)}
        onSelectCreateForm={() => navigateTo('sale')}
        onSelectCellsLinkup={() => navigateTo('cells-linkup')}
        onSelectSettings={() => navigateTo('settings')}
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
