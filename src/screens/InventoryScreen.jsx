import React, { useState, useEffect } from 'react';
import {
  Check, Calendar, ArrowUpDown, Eye, EyeOff, Lock, Unlock,
  Save, Plus, Trash2, X, Search, ArrowLeft, Tv, Smartphone, Laptop, Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';
import DatePickerModal from '../components/DatePickerModal';

export default function InventoryScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSaleWithSlot,
  showToast
}) {
  // If no brand selected yet, start with selectedBrand or null (opens Brands list)
  const [currentBrand, setCurrentBrand] = useState(selectedBrand || null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [screenDateModal, setScreenDateModal] = useState(null); // { itemId, screenIndex, currentDate }

  useEffect(() => {
    setCurrentBrand(selectedBrand || null);
  }, [selectedBrand]);

  // Top 4 Filter Controls (from image copy 10.png)
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [filterEmptyOnly, setFilterEmptyOnly] = useState(false);
  const [selectedValidity, setSelectedValidity] = useState('all');
  const [sortOrder, setSortOrder] = useState('top'); // 'top' or 'bottom'
  const [searchQuery, setSearchQuery] = useState('');

  // Card editing state: item ID -> editable fields
  const [editingCards, setEditingCards] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);

  // New account modal state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newValidity, setNewValidity] = useState('12 Months');
  const [newPlanVariant, setNewPlanVariant] = useState('General');
  const [newScreenCount, setNewScreenCount] = useState(5);
  const [newScreenPins, setNewScreenPins] = useState(['1111', '2222', '3333', '4444', '5555']);
  const [newPassVisible, setNewPassVisible] = useState(false);

  const fetchInventory = async () => {
    if (!currentBrand) return;
    try {
      setLoading(true);
      const data = await api.getInventory({
        brandId: currentBrand.id,
        selectedOnly: filterSelectedOnly,
        emptyOnly: filterEmptyOnly,
        validity: selectedValidity,
        sortOrder
      });
      setItems(data);
    } catch (err) {
      showToast('Failed to load inventory', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentBrand) {
      fetchInventory();
    }
  }, [currentBrand, filterSelectedOnly, filterEmptyOnly, selectedValidity, sortOrder]);

  const handleSelectBrand = (brand) => {
    setCurrentBrand(brand);
    if (onSelectBrand) onSelectBrand(brand);
  };

  const handleToggleSelect = async (id, e) => {
    e?.stopPropagation();
    try {
      const updated = await api.toggleInventorySelect(id);
      setItems(prev => prev.map(item => item.id === id ? { ...item, isSelected: updated.isSelected } : item));
      showToast(updated.isSelected ? 'Account selected' : 'Account unselected', 'info');
    } catch (err) {
      showToast('Error updating selection', 'error');
    }
  };

  const handleToggleLock = (item) => {
    const isCurrentlyEditing = !!editingCards[item.id];
    if (isCurrentlyEditing) {
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Card locked', 'info');
    } else {
      setEditingCards(prev => ({
        ...prev,
        [item.id]: {
          email: item.email,
          password: item.password,
          validity: item.validity,
          planVariant: item.planVariant || 'General',
          pins: (item.screens || []).map(s => s.pin || '1234'),
          dates: (item.screens || []).map(s => s.expiryDate || ''),
          deviceTypes: (item.screens || []).map(s => s.deviceType || 'tv')
        }
      }));
      showToast('Card unlocked for editing (ID, Password, PINs, Dates, Devices, Validity, Plan)', 'info');
    }
  };

  // Cycle plan variant on card (image copy 48.png)
  const handleCyclePlanVariant = async (item) => {
    let plans = ['General'];
    if (currentBrand?.pricingPlans && typeof currentBrand.pricingPlans === 'object') {
      const pList = Object.values(currentBrand.pricingPlans).filter(p => p.enabled).map(p => p.label || p.name);
      if (pList.length > 0) plans = pList;
    }
    if (plans.length === 1 && plans[0] === 'General') {
      plans = ['General', 'With Ads', 'Ads Free'];
    }

    const current = (editingCards[item.id]?.planVariant || item.planVariant || 'General');
    const currIdx = plans.indexOf(current);
    const nextPlan = plans[(currIdx + 1) % plans.length] || 'General';

    if (editingCards[item.id]) {
      setEditingCards(prev => ({
        ...prev,
        [item.id]: { ...prev[item.id], planVariant: nextPlan }
      }));
      showToast(`Plan changed to ${nextPlan} (Click Save to persist)`, 'info');
      return;
    }

    try {
      const result = await api.updateInventory(item.id, { planVariant: nextPlan });
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, planVariant: nextPlan } : i));
      showToast(`Account plan set to ${nextPlan}`, 'info');
    } catch (err) {
      showToast('Error updating plan variant', 'error');
    }
  };

  const handleCycleValidity = async (item) => {
    if (!editingCards[item.id]) {
      showToast('Please click Edit (UnLock) first to change validity', 'info');
      return;
    }
    const plans = (currentBrand?.plans && currentBrand.plans.length > 0)
      ? currentBrand.plans
      : ['01 Month', '03 Months', '06 Months', '12 Months'];
    const currentVal = editingCards[item.id]?.validity || item.validity || plans[0];
    const curIdx = plans.indexOf(currentVal);
    const nextPlan = plans[(curIdx + 1) % plans.length];

    setEditingCards(prev => ({
      ...prev,
      [item.id]: { ...prev[item.id], validity: nextPlan }
    }));
    showToast(`Account validity changed to ${nextPlan} (Click Save to apply)`, 'info');
  };

  const handleCycleDeviceType = (itemId, sIdx, e) => {
    if (e) e.stopPropagation();
    if (!editingCards[itemId]) {
      showToast('Please click Edit (UnLock) first to change device type', 'info');
      return;
    }
    const types = ['tv', 'mobile', 'laptop'];
    const currentTypes = editingCards[itemId]?.deviceTypes || [];
    const curType = currentTypes[sIdx] || 'tv';
    const nextType = types[(types.indexOf(curType) + 1) % types.length];

    const newTypes = [...currentTypes];
    newTypes[sIdx] = nextType;

    setEditingCards(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        deviceTypes: newTypes
      }
    }));
    showToast(`Screen-${sIdx + 1} device changed to ${nextType.toUpperCase()} (Click Save to persist)`, 'info');
  };

  const handleSaveCard = async (item) => {
    const editState = editingCards[item.id];
    if (!editState) {
      showToast('Click Unlock first to edit', 'info');
      return;
    }

    try {
      const updatedScreens = (item.screens || []).map((screen, idx) => {
        const pin = editState.pins?.[idx] !== undefined ? editState.pins[idx] : screen.pin;
        const expiryDate = editState.dates?.[idx] !== undefined ? editState.dates[idx] : screen.expiryDate;
        const deviceType = editState.deviceTypes?.[idx] || screen.deviceType || 'tv';
        const status = expiryDate && String(expiryDate).trim() ? 'occupied' : (expiryDate === '' ? 'empty' : screen.status);
        return {
          ...screen,
          pin,
          deviceType,
          expiryDate: status === 'occupied' ? expiryDate : null,
          status
        };
      });

      const payload = {
        email: editState.email,
        password: editState.password,
        validity: editState.validity,
        planVariant: editState.planVariant || item.planVariant || 'General',
        screens: updatedScreens
      };

      const result = await api.updateInventory(item.id, payload);
      setItems(prev => prev.map(i => i.id === item.id ? result : i));
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Credentials & settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save changes', 'error');
    }
  };

  const handleDeleteCard = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.deleteInventory(deleteConfirmItem.id);
      setItems(prev => prev.filter(i => i.id !== deleteConfirmItem.id));
      setDeleteConfirmItem(null);
      showToast('Account removed from database', 'success');
    } catch (err) {
      showToast('Failed to delete account', 'error');
    }
  };

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const cycleValidityFilter = () => {
    const options = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const curIdx = options.indexOf(selectedValidity);
    const nextIdx = (curIdx + 1) % options.length;
    setSelectedValidity(options[nextIdx]);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'top' ? 'bottom' : 'top');
  };

  const handleScreenCountChange = (count) => {
    const n = Math.min(10, Math.max(1, count));
    setNewScreenCount(n);
    setNewScreenPins(Array.from({ length: n }, (_, i) => `${(i + 1) * 1111}`.slice(0, 4)));
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      showToast('Email and Password are required', 'error');
      return;
    }

    try {
      const screens = Array.from({ length: newScreenCount }, (_, i) => ({
        screenNumber: i + 1,
        name: `Screen-${i + 1}`,
        pin: newScreenPins[i] || '1234',
        status: 'empty',
        expiryDate: null
      }));

      await api.createInventory({
        brandId: currentBrand.id,
        email: newEmail.trim(),
        password: newPassword.trim(),
        validity: newValidity,
        planVariant: newPlanVariant || 'General',
        screens
      });

      setNewEmail('');
      setNewPassword('');
      setShowAddAccountModal(false);
      fetchInventory();
      showToast('New account added to database!', 'success');
    } catch (err) {
      showToast('Failed to create account', 'error');
    }
  };

  // ========================================================
  // STEP 1: BRANDS SELECTION (3 Columns × Rows as specified)
  // ========================================================
  if (!currentBrand) {
    return (
      <OttBrandsGrid
        brands={brands}
        onSelectBrand={(brand) => {
          handleSelectBrand(brand);
        }}
        onBack={() => {
          if (brands && brands.length > 0) {
            handleSelectBrand(brands[0]);
          }
        }}
      />
    );
  }

  // ========================================================
  // STEP 2: ACCOUNTS DATABASE (Exact classic image copy 10.png & 44.png)
  // ========================================================
  const sortedItems = [...items].sort((a, b) => {
    if (filterEmptyOnly) {
      const screensA = a.screens || [];
      const screensB = b.screens || [];
      const totalA = screensA.length || 5;
      const totalB = screensB.length || 5;
      const emptyA = screensA.filter(s => s.status === 'empty').length;
      const emptyB = screensB.filter(s => s.status === 'empty').length;

      const isAllEmptyA = emptyA === totalA && totalA > 0;
      const isAllEmptyB = emptyB === totalB && totalB > 0;

      // 1. Complete all empty screens account on top!
      if (isAllEmptyA && !isAllEmptyB) return -1;
      if (!isAllEmptyA && isAllEmptyB) return 1;

      // 2. Then sort descending by empty screens count (4 empty, then 3 empty, etc.)
      if (emptyB !== emptyA) {
        return emptyB - emptyA;
      }
    }

    const recA = parseInt(a.recordNumber || '0', 10);
    const recB = parseInt(b.recordNumber || '0', 10);
    return sortOrder === 'bottom' ? recB - recA : recA - recB;
  });

  const filteredItems = sortedItems.filter(i => {
    if (!searchQuery) return true;
    return i.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Top 4 Filter Controls Bar (Exact from image copy 10.png & 44.png) */}
      <div className="filter-bar-4">
        {/* 1. Selected Filter - Stylish Colorful Button (image copy 44.png) */}
        <button
          type="button"
          className={`filter-pill-btn ${filterSelectedOnly ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          onClick={() => setFilterSelectedOnly(!filterSelectedOnly)}
          id="inventory-filter-selected"
        >
          <Check size={14} strokeWidth={filterSelectedOnly ? 3 : 2.5} />
          <span>Selected</span>
        </button>

        {/* 2. Empty Filter - Stylish Colorful Button (image copy 44.png) */}
        <button
          type="button"
          className={`filter-pill-btn ${filterEmptyOnly ? 'pill-empty-active' : 'pill-empty-inactive'}`}
          onClick={() => setFilterEmptyOnly(!filterEmptyOnly)}
          id="inventory-filter-empty"
        >
          <Check size={14} strokeWidth={filterEmptyOnly ? 3 : 2.5} />
          <span>Empty</span>
        </button>

        {/* 3. Validity Filter */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          onClick={cycleValidityFilter}
          id="inventory-filter-validity"
          title={`Filter: ${selectedValidity}`}
        >
          <Calendar size={14} />
          <span>{selectedValidity === 'all' ? 'Validity' : selectedValidity.replace(' Months', 'M').replace(' Month', 'M')}</span>
        </button>

        {/* 4. Top/Bottom Sort Toggle */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-purple"
          onClick={toggleSortOrder}
          id="inventory-filter-sort"
          title={`Sorting: ${sortOrder === 'top' ? 'Top to Bottom (01 first)' : 'Bottom to Top'}`}
        >
          <ArrowUpDown size={14} />
          <span>{sortOrder === 'top' ? 'Top' : 'Bottom'}</span>
        </button>
      </div>

      {/* Search & Add Account Button Row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${filteredItems.length} accounts by email...`}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: '12px',
              border: '1.5px solid #cbd5e1',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          style={{ padding: '10px 14px', fontSize: '13px', whiteSpace: 'nowrap', borderRadius: '12px' }}
          onClick={() => setShowAddAccountModal(true)}
          id="inventory-add-account-btn"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Inventory Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading {currentBrand.displayName} accounts...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>
            No accounts found for {currentBrand.displayName}.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ padding: '8px 16px', fontSize: '13px' }}
            onClick={() => setShowAddAccountModal(true)}
          >
            <Plus size={14} /> Add First Account
          </button>
        </div>
      ) : (
        filteredItems.map(item => {
          const isEditing = !!editingCards[item.id];
          const editState = editingCards[item.id] || {};
          const isPassVisible = !!visiblePasswords[item.id];
          const freeCount = (item.screens || []).filter(s => s.status === 'empty').length;
          const totalScreens = item.screens?.length || 5;

          return (
            <div key={item.id} className="inventory-card" id={`inventory-card-${item.recordNumber}`}>
              {/* Top Row: Ribbon Tag, Screen Count Summary, Validity Badge, Checkbox */}
              <div className="card-top-row">
                <div className="ribbon-badge">
                  {item.recordNumber || '01'}
                </div>

                {/* Plan Variant Badge: Only show if special (not General) or if editing per user requirement */}
                {(isEditing || (item.planVariant && item.planVariant !== 'General')) && (
                  <div
                    className="badge-plan-variant"
                    onClick={() => handleCyclePlanVariant(item)}
                    style={{
                      cursor: 'pointer',
                      userSelect: 'none',
                      padding: '3px 10px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 800,
                      background: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#f1f5f9' : '#eff6ff',
                      color: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#475569' : '#1d4ed8',
                      border: '1.5px solid',
                      borderColor: ((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#cbd5e1' : '#93c5fd',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      transition: 'all 0.15s ease'
                    }}
                    title="Click to cycle plan variant (General, With Ads, Ads Free...)"
                  >
                    <Sparkles size={12} color={((isEditing ? editState.planVariant : item.planVariant) || 'General') === 'General' ? '#64748b' : '#2563eb'} />
                    <span>{(isEditing ? editState.planVariant : item.planVariant) || 'General'}</span>
                  </div>
                )}

                <div className="card-top-right">
                  <div
                    className="badge-navy-pill"
                    onClick={() => handleCycleValidity(item)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    title="Click to cycle validity"
                  >
                    {isEditing ? (editState.validity || item.validity) : item.validity}
                  </div>

                  <div
                    className={`custom-checkbox ${item.isSelected ? 'checked' : ''}`}
                    onClick={(e) => handleToggleSelect(item.id, e)}
                    title="Select account"
                  >
                    {item.isSelected && <Check size={14} strokeWidth={3} />}
                  </div>
                </div>
              </div>

              {/* ID Row with Copy button */}
              <div className="credential-row">
                <div className="credential-label-badge blue">
                  ID
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    className="credential-input"
                    value={isEditing ? editState.email : item.email}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], email: e.target.value }
                      }));
                    }}
                    style={{ paddingRight: '40px', fontWeight: 700 }}
                  />
                  <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)' }}>
                    <CopyButton text={item.email} />
                  </div>
                </div>
              </div>

              {/* Password Row with reveal toggle & Copy button */}
              <div className="credential-row">
                <div className="credential-label-badge purple">
                  Password
                </div>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type={isPassVisible || isEditing ? 'text' : 'password'}
                    className="credential-input"
                    value={isEditing ? editState.password : item.password}
                    readOnly={!isEditing}
                    onChange={(e) => {
                      setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], password: e.target.value }
                      }));
                    }}
                    style={{ paddingRight: '70px', fontWeight: 700 }}
                  />
                  <div style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(item.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 0 }}
                      title="Reveal password"
                    >
                      {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton text={item.password} />
                  </div>
                </div>
              </div>

              {/* Screen PINs row (Clean display without copy buttons per requirement) */}
              <div className="screens-grid-row" style={{ marginTop: '10px', marginBottom: '6px' }}>
                {(item.screens || []).map((screen, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f1f5f9',
                      padding: '5px 2px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      minHeight: '26px'
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        maxLength={6}
                        value={editState.pins?.[sIdx] ?? screen.pin}
                        onChange={(e) => {
                          const newPins = [...(editState.pins || [])];
                          newPins[sIdx] = e.target.value;
                          setEditingCards(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], pins: newPins }
                          }));
                        }}
                        style={{ width: '100%', fontSize: '12px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800 }}
                      />
                    ) : (
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155', letterSpacing: '0.4px' }}>
                        {screen.pin || '1234'}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Screen Buttons row (Screen name on top, Device icon BELOW per requirement) */}
              <div className="screens-grid-row">
                {(item.screens || []).map((screen, sIdx) => {
                  const devType = isEditing
                    ? (editState.deviceTypes?.[sIdx] || screen.deviceType || 'tv')
                    : (screen.deviceType || 'tv');

                  return (
                    <div
                      key={sIdx}
                      onClick={(e) => {
                        if (isEditing) {
                          handleCycleDeviceType(item.id, sIdx, e);
                        }
                      }}
                      style={{
                        background: '#ea580c',
                        color: '#ffffff',
                        borderRadius: '8px',
                        padding: '5px 2px',
                        textAlign: 'center',
                        boxShadow: '0 2px 4px rgba(234,88,12,0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        cursor: isEditing ? 'pointer' : 'default',
                        userSelect: 'none',
                        lineHeight: 1
                      }}
                      title={isEditing ? `Click to cycle device type (Current: ${devType.toUpperCase()})` : `Device: ${devType.toUpperCase()}`}
                    >
                      <span style={{ fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                        Screen-{sIdx + 1}
                      </span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: isEditing ? '2px 4px' : '0',
                        borderRadius: '4px',
                        background: isEditing ? 'rgba(0,0,0,0.2)' : 'transparent'
                      }}>
                        {devType === 'mobile' ? (
                          <Smartphone size={16} strokeWidth={2.5} />
                        ) : devType === 'laptop' ? (
                          <Laptop size={16} strokeWidth={2.5} />
                        ) : (
                          <Tv size={16} strokeWidth={2.5} />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Status / Expiry Boxes Row below Screens (Bigger boxes & clickable per requirement) */}
              <div className="screens-grid-row" style={{ marginTop: '6px' }}>
                {(item.screens || []).map((screen, sIdx) => {
                  const currentExpDate = isEditing
                    ? (editState.dates?.[sIdx] !== undefined ? editState.dates[sIdx] : screen.expiryDate)
                    : screen.expiryDate;
                  const isEmpty = isEditing
                    ? (!currentExpDate || !String(currentExpDate).trim())
                    : (screen.status === 'empty');
                  const isExpiringSoon = currentExpDate && (currentExpDate.includes('Jun') || currentExpDate.includes('May'));

                  return (
                    <div
                      key={sIdx}
                      onClick={() => {
                        if (isEditing) {
                          // Allow editing expiry date for this screen
                          setScreenDateModal({
                            itemId: item.id,
                            screenIndex: sIdx,
                            currentDate: currentExpDate || ''
                          });
                        } else if (isEmpty && onNavigateToSaleWithSlot) {
                          onNavigateToSaleWithSlot({
                            brandId: currentBrand.id,
                            email: item.email,
                            password: item.password,
                            screenName: screen.name || `Screen-${sIdx + 1}`,
                            pin: screen.pin,
                            validity: item.validity,
                            inventoryId: item.id
                          });
                        }
                      }}
                      style={{
                        height: '34px',
                        minHeight: '34px',
                        maxHeight: '34px',
                        width: '100%',
                        boxSizing: 'border-box',
                        padding: '0 2px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: isEmpty ? '18px' : '9px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        background: isEmpty ? '#ffffff' : (isExpiringSoon ? '#b91c1c' : '#15803d'),
                        color: isEmpty ? '#64748b' : '#ffffff',
                        border: isEmpty ? '2px dashed #94a3b8' : (isExpiringSoon ? '2px solid #b91c1c' : '2px solid #15803d'),
                        boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: 1
                      }}
                      title={isEditing ? 'Click to change or clear expiry date' : (isEmpty ? 'Click to sell this screen' : `Expires: ${currentExpDate || 'Active'}`)}
                    >
                      {isEmpty ? '+' : (currentExpDate || 'Active')}
                    </div>
                  );
                })}
              </div>

              {/* Bottom 02 Action Buttons (Exact matching image copy 20.png) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isEditing ? '1fr 1fr auto' : '1fr 1fr',
                gap: '10px',
                marginTop: '12px'
              }}>
                {/* 1. Edit (Unlock) */}
                <button
                  type="button"
                  className={`glossy-btn ${isEditing ? 'glossy-btn-orange' : 'glossy-btn-blue'}`}
                  style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                  onClick={() => handleToggleLock(item)}
                >
                  {isEditing ? <Unlock size={16} /> : <Lock size={16} />}
                  <span>{isEditing ? 'Lock' : 'Edit (UnLock)'}</span>
                </button>

                {/* 2. Save */}
                <button
                  type="button"
                  className="glossy-btn glossy-btn-green"
                  style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                  onClick={() => handleSaveCard(item)}
                >
                  <Save size={16} />
                  <span>Save</span>
                </button>

                {/* Subtle Delete when in edit mode */}
                {isEditing && (
                  <button
                    type="button"
                    className="glossy-btn glossy-btn-red"
                    style={{ padding: '10px 12px', fontSize: '13px', borderRadius: '10px' }}
                    onClick={() => setDeleteConfirmItem(item)}
                    title="Delete account"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* ======================================================== */}
      {/* ADD ACCOUNT POPUP - EXACT SAME STYLE AS AVAILABLE CARD   */}
      {/* Centered in the middle of mobile screen (image copy 57/58)*/}
      {/* ======================================================== */}
      {showAddAccountModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddAccountModal(false);
          }}
        >
          <div
            className="inventory-card"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '430px',
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              margin: 'auto 0'
            }}
          >
            {/* Top Row: Ribbon Badge, Plan Variant, Validity, Close X */}
            <div className="card-top-row">
              <div className="ribbon-badge">
                {String(items.length + 1).padStart(2, '0')}
              </div>

              {/* Plan Variant Badge (Clickable to cycle) */}
              <div
                className="badge-plan-variant"
                onClick={() => {
                  const plans = ['General', 'With Ads', 'Ads Free'];
                  const curIdx = plans.indexOf(newPlanVariant);
                  setNewPlanVariant(plans[(curIdx + 1) % plans.length]);
                }}
                style={{
                  cursor: 'pointer',
                  userSelect: 'none',
                  padding: '3px 10px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 800,
                  background: newPlanVariant === 'General' ? '#f1f5f9' : '#eff6ff',
                  color: newPlanVariant === 'General' ? '#475569' : '#1d4ed8',
                  border: '1.5px solid',
                  borderColor: newPlanVariant === 'General' ? '#cbd5e1' : '#93c5fd',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                title="Click to cycle plan variant"
              >
                <Sparkles size={12} color={newPlanVariant === 'General' ? '#64748b' : '#2563eb'} />
                <span>{newPlanVariant}</span>
              </div>

              <div className="card-top-right">
                <div
                  className="badge-navy-pill"
                  onClick={() => {
                    const valids = ['01 Month', '03 Months', '06 Months', '12 Months'];
                    const curIdx = valids.indexOf(newValidity);
                    setNewValidity(valids[(curIdx + 1) % valids.length]);
                  }}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                  title="Click to cycle validity"
                >
                  {newValidity}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                  title="Close"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ID Row: blue badge + empty input */}
            <div className="credential-row">
              <div className="credential-label-badge blue">
                ID
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="email"
                  className="credential-input"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. netflix.user03@gmail.com"
                  style={{ fontWeight: 700 }}
                  required
                />
              </div>
            </div>

            {/* Password Row: purple badge + empty input + show/hide eye */}
            <div className="credential-row">
              <div className="credential-label-badge purple">
                Password
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type={newPassVisible ? 'text' : 'password'}
                  className="credential-input"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Pass@123456"
                  style={{ paddingRight: '40px', fontWeight: 700 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setNewPassVisible(!newPassVisible)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b'
                  }}
                  title="Toggle password visibility"
                >
                  {newPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Screen PINs row */}
            <div className="screens-grid-row" style={{ marginTop: '10px', marginBottom: '6px' }}>
              {newScreenPins.map((pin, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f1f5f9',
                    padding: '5px 2px',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    minHeight: '26px'
                  }}
                >
                  <input
                    type="text"
                    maxLength={6}
                    value={pin}
                    onChange={e => {
                      const updated = [...newScreenPins];
                      updated[sIdx] = e.target.value;
                      setNewScreenPins(updated);
                    }}
                    style={{
                      width: '100%',
                      fontSize: '12px',
                      textAlign: 'center',
                      border: 'none',
                      background: 'transparent',
                      fontWeight: 800
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Screen Buttons row (Screen-1 to 5 with TV icon) */}
            <div className="screens-grid-row">
              {newScreenPins.map((_, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    background: '#ea580c',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '5px 2px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(234,88,12,0.25)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    lineHeight: 1
                  }}
                >
                  <span style={{ fontSize: '10.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    Screen-{sIdx + 1}
                  </span>
                  <Tv size={16} strokeWidth={2.5} />
                </div>
              ))}
            </div>

            {/* Status Empty Boxes Row below Screens (5 dashed empty '+' boxes) */}
            <div className="screens-grid-row" style={{ marginTop: '6px' }}>
              {newScreenPins.map((_, sIdx) => (
                <div
                  key={sIdx}
                  style={{
                    height: '34px',
                    minHeight: '34px',
                    maxHeight: '34px',
                    width: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    fontWeight: 900,
                    background: '#ffffff',
                    color: '#64748b',
                    border: '2px dashed #94a3b8'
                  }}
                >
                  +
                </div>
              ))}
            </div>

            {/* Bottom 2 Action Buttons: Cancel and Save */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1.5fr',
              gap: '10px',
              marginTop: '14px'
            }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                onClick={() => setShowAddAccountModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-green"
                style={{ padding: '10px 12px', fontSize: '14px', borderRadius: '10px' }}
                onClick={handleCreateAccount}
                id="modal-save-new-account-btn"
              >
                <Save size={16} />
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmItem(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}>
              <Trash2 size={24} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Delete Account?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              Are you sure you want to remove <strong>{deleteConfirmItem.email}</strong>? Historical sales will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-red"
                style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
                onClick={handleDeleteCard}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Expiry Date Picker Modal for unlocked editing */}
      {screenDateModal && (
        <DatePickerModal
          isOpen={true}
          initialDate={screenDateModal.currentDate || ''}
          onSelect={(selectedDate) => {
            const { itemId, screenIndex } = screenDateModal;
            setEditingCards(prev => {
              const currentEdit = prev[itemId] || {};
              const currentDates = [...(currentEdit.dates || [])];
              currentDates[screenIndex] = selectedDate;
              return {
                ...prev,
                [itemId]: { ...currentEdit, dates: currentDates }
              };
            });
            setScreenDateModal(null);
            showToast(`Screen ${screenIndex + 1} expiry set to ${selectedDate} (Click Save)`, 'info');
          }}
          onClose={() => setScreenDateModal(null)}
        />
      )}
    </div>
  );
}
