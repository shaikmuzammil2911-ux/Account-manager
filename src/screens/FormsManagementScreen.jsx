import React, { useState } from 'react';
import SaleScreen from './SaleScreen';
import InventoryScreen from './InventoryScreen';

export default function FormsManagementScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSale,
  showToast
}) {
  // activeTab: 'sale' | 'database' (Default: 'sale')
  const [activeTab, setActiveTab] = useState('sale');

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* image copy 21.png: Show ONLY 02 buttons */}
      <div className="forms-two-buttons-bar">
        <button
          type="button"
          onClick={() => setActiveTab('sale')}
          className={`forms-toggle-btn ${activeTab === 'sale' ? 'sale-active' : ''}`}
          id="forms-btn-sale"
        >
          1). Sale Form
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`forms-toggle-btn ${activeTab === 'database' ? 'database-active' : ''}`}
          id="forms-btn-database"
        >
          2). Data Base Form
        </button>
      </div>

      {/* image copy 19.png: Default Sale Form */}
      {activeTab === 'sale' && (
        <SaleScreen
          brands={brands}
          selectedBrand={selectedBrand}
          onSelectBrand={onSelectBrand}
          onSaleSuccess={async (payload) => {
            if (onNavigateToSale) {
              await onNavigateToSale(payload);
            }
          }}
          showToast={showToast}
        />
      )}

      {/* image copy 20.png: Default Data Base Form */}
      {activeTab === 'database' && (
        <InventoryScreen
          brands={brands}
          selectedBrand={selectedBrand}
          onSelectBrand={onSelectBrand}
          onNavigateToSaleWithSlot={(slotData) => {
            setActiveTab('sale');
            showToast(`Loaded ${slotData.screenName || 'Screen'} credentials into Sale Form`, 'info');
          }}
          showToast={showToast}
        />
      )}
    </div>
  );
}
