import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import TopHeader from './components/TopHeader';
import BottomNav from './components/BottomNav';
import Toast from './components/Toast';
import BrandSelectorModal from './components/BrandSelectorModal';
import NotifyModal from './components/NotifyModal';

import HomeScreen from './screens/HomeScreen';
import SaleScreen from './screens/SaleScreen';
import InventoryScreen from './screens/InventoryScreen';
import RecentSalesScreen from './screens/RecentSalesScreen';
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

  // Handle selecting an OTT platform from the modal
  const handleSelectBrandAndOpen = (brand) => {
    setSelectedBrand(brand);
    // Directly open that OTT platform's inventory as requested!
    navigateTo('inventory');
    showToast(`Opened ${brand.displayName} Inventory`, 'success');
  };

  const activeTab = currentScreen === 'expiry' ? 'expiry' : 'home';

  return (
    <div className="mobile-app-root">
      {/* Toast Notification Container */}
      <Toast message={toast.message} type={toast.type} />

      {/* Main Responsive Mobile Viewport */}
      <div className="mobile-app-viewport">
        {/* Top Header */}
        <TopHeader
          showBack={currentScreen !== 'home'}
          onBack={handleBack}
          title={currentScreen === 'home' ? '' : undefined}
          selectedBrand={currentScreen !== 'settings' ? selectedBrand : null}
          onBrandClick={() => setShowBrandSelector(true)}
          showSettings={currentScreen !== 'settings'}
          onSettings={() => navigateTo('settings')}
          showMenu={currentScreen === 'inventory' || currentScreen === 'expiry' || currentScreen === 'recent-sales'}
          onMenu={() => setShowBrandSelector(true)}
        />

        {/* Screen Routing */}
        {currentScreen === 'home' && (
          <HomeScreen
            stats={stats}
            selectedBrand={selectedBrand}
            onNavigate={navigateTo}
            onOpenBrandSelector={() => setShowBrandSelector(true)}
          />
        )}

        {currentScreen === 'sale' && (
          <SaleScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            prefillData={screenParams.prefill}
            onSaleSuccess={handleSaleSuccess}
            showToast={showToast}
          />
        )}

        {currentScreen === 'inventory' && (
          <InventoryScreen
            selectedBrand={selectedBrand}
            onNavigateToSaleWithSlot={(slotData) => navigateTo('sale', { prefill: slotData })}
            showToast={showToast}
          />
        )}

        {currentScreen === 'recent-sales' && (
          <RecentSalesScreen
            selectedBrand={selectedBrand}
            onOpenNotifyModal={(sale) => setNotifySaleItem(sale)}
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
