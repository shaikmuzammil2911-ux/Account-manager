import React, { useState, useEffect } from 'react';
import {
  Check, Calendar, ArrowUpDown, Eye, EyeOff, Lock, Unlock,
  Save, Plus, Trash2, X, Search, ArrowLeft, Tv
} from 'lucide-react';
import { api } from '../api/client';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';

export default function InventoryScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSaleWithSlot,
  showToast
}) {
  // If no brand selected yet, default to selectedBrand or first brand
  const [currentBrand, setCurrentBrand] = useState(selectedBrand || brands[0] || null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedBrand) {
      setCurrentBrand(selectedBrand);
    } else if (!currentBrand && brands && brands.length > 0) {
      setCurrentBrand(brands[0]);
    }
  }, [selectedBrand, brands]);

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
  const [newScreenCount, setNewScreenCount] = useState(5);
  const [newScreenPins, setNewScreenPins] = useState(['1111', '2222', '3333', '4444', '5555']);

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
          pins: (item.screens || []).map(s => s.pin || '1234')
        }
      }));
      showToast('Card unlocked for editing', 'info');
    }
  };

  const handleSaveCard = async (item) => {
    const editState = editingCards[item.id];
    if (!editState) {
      showToast('Click Unlock first to edit', 'info');
      return;
    }

    try {
      const updatedScreens = (item.screens || []).map((screen, idx) => ({
        ...screen,
        pin: editState.pins[idx] !== undefined ? editState.pins[idx] : screen.pin
      }));

      const payload = {
        email: editState.email,
        password: editState.password,
        validity: editState.validity,
        screens: updatedScreens
      };

      const result = await api.updateInventory(item.id, payload);
      setItems(prev => prev.map(i => i.id === item.id ? result : i));
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Credentials saved successfully!', 'success');
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
  // STEP 2: ACCOUNTS DATABASE (Exact classic image copy 10.png)
  // ========================================================
  const filteredItems = items.filter(i => {
    if (!searchQuery) return true;
    return i.email?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Brand Header with Back Button to Brands list */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setCurrentBrand(null)}
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#0f172a'
            }}
            title="Back to Brands"
          >
            <ArrowLeft size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: currentBrand.color || '#3b82f6'
            }} />
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {currentBrand.displayName}
            </h2>
          </div>
        </div>
      </div>

      {/* Top 4 Filter Controls Bar (Exact from image copy 10.png) */}
      <div className="filter-bar-4">
        {/* 1. Selected Filter */}
        <button
          type="button"
          className={`filter-pill-btn ${filterSelectedOnly ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
          onClick={() => setFilterSelectedOnly(!filterSelectedOnly)}
          id="inventory-filter-selected"
        >
          <Check size={14} />
          <span>Selected</span>
        </button>

        {/* 2. Empty Filter */}
        <button
          type="button"
          className={`filter-pill-btn ${filterEmptyOnly ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
          onClick={() => setFilterEmptyOnly(!filterEmptyOnly)}
          id="inventory-filter-empty"
        >
          <Check size={14} />
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

                <div style={{ fontSize: '13px', fontWeight: 800, color: freeCount > 0 ? '#16a34a' : '#dc2626' }}>
                  {freeCount}/{totalScreens} Screens Available
                </div>

                <div className="card-top-right">
                  <div className="badge-navy-pill">
                    {item.validity}
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

              {/* Screen PINs row with Copy buttons */}
              <div className="screens-grid-row" style={{ marginTop: '10px', marginBottom: '6px' }}>
                {(item.screens || []).map((screen, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      background: '#f1f5f9',
                      padding: '4px 2px',
                      borderRadius: '6px'
                    }}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editState.pins?.[sIdx] ?? screen.pin}
                        onChange={(e) => {
                          const newPins = [...(editState.pins || [])];
                          newPins[sIdx] = e.target.value;
                          setEditingCards(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], pins: newPins }
                          }));
                        }}
                        style={{ width: '100%', fontSize: '11px', textAlign: 'center', border: 'none', background: 'transparent', fontWeight: 800 }}
                      />
                    ) : (
                      <>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                          {screen.pin || '1234'}
                        </span>
                        <CopyButton text={screen.pin || '1234'} />
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Screen Buttons row (Orange pills matching image copy 20.png) */}
              <div className="screens-grid-row">
                {(item.screens || []).map((screen, sIdx) => (
                  <div
                    key={sIdx}
                    style={{
                      background: '#ea580c',
                      color: '#ffffff',
                      borderRadius: '8px',
                      padding: '6px 2px',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '11px',
                      boxShadow: '0 2px 4px rgba(234,88,12,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '3px'
                    }}
                  >
                    <Tv size={11} strokeWidth={2.5} />
                    <span>{screen.name || `Screen-${sIdx + 1}`}</span>
                  </div>
                ))}
              </div>

              {/* Status / Expiry Pills Row (image copy 20.png) */}
              <div className="screens-grid-row" style={{ marginTop: '6px' }}>
                {(item.screens || []).map((screen, sIdx) => {
                  const isEmpty = screen.status === 'empty';
                  const isExpiringSoon = screen.expiryDate && (screen.expiryDate.includes('Jun') || screen.expiryDate.includes('May'));

                  return (
                    <div
                      key={sIdx}
                      onClick={() => {
                        if (isEmpty && onNavigateToSaleWithSlot) {
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
                        padding: '5px 2px',
                        borderRadius: '6px',
                        textAlign: 'center',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        cursor: isEmpty ? 'pointer' : 'default',
                        background: isEmpty ? '#ffffff' : (isExpiringSoon ? '#b91c1c' : '#15803d'),
                        color: isEmpty ? '#64748b' : '#ffffff',
                        border: isEmpty ? '1.5px dashed #cbd5e1' : 'none',
                        boxShadow: isEmpty ? 'none' : '0 2px 4px rgba(0,0,0,0.15)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={isEmpty ? 'Click to sell this screen' : `Expires: ${screen.expiryDate || 'Active'}`}
                    >
                      {isEmpty ? '+' : (screen.expiryDate || 'Active')}
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
      {/* ADD ACCOUNT MODAL (1–10 Screens with Individual PINs)    */}
      {/* ======================================================== */}
      {showAddAccountModal && (
        <div className="modal-backdrop" onClick={() => setShowAddAccountModal(false)}>
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add {currentBrand.displayName} Account</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Configure credentials and 1 to 10 screens</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddAccountModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label">Email / Mail ID</label>
                <input
                  type="email"
                  className="form-input-pill"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. netflix.user@gmail.com"
                  required
                />
              </div>

              <div>
                <label className="form-label">Account Password</label>
                <input
                  type="text"
                  className="form-input-pill"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Pass@123456"
                  required
                />
              </div>

              <div>
                <label className="form-label">Validity</label>
                <select
                  value={newValidity}
                  onChange={e => setNewValidity(e.target.value)}
                  className="form-input-pill"
                  style={{ width: '100%', fontWeight: 700 }}
                >
                  <option value="01 Month">01 Month</option>
                  <option value="03 Months">03 Months</option>
                  <option value="06 Months">06 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              </div>

              {/* Screen Count (1 to 10) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Number of Screens (1–10)</label>
                  <span style={{ fontWeight: 800, color: '#2563eb' }}>{newScreenCount} Screens</span>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => handleScreenCountChange(n)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: '1.5px solid',
                        borderColor: newScreenCount === n ? '#2563eb' : '#cbd5e1',
                        background: newScreenCount === n ? '#eff6ff' : '#ffffff',
                        color: newScreenCount === n ? '#1d4ed8' : '#334155',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen PINs configuration */}
              <div>
                <label className="form-label">Screen PINs</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {Array.from({ length: newScreenCount }, (_, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', minWidth: '60px' }}>
                        Screen {i + 1}:
                      </span>
                      <input
                        type="text"
                        maxLength={6}
                        value={newScreenPins[i] || ''}
                        onChange={(e) => {
                          const updated = [...newScreenPins];
                          updated[i] = e.target.value;
                          setNewScreenPins(updated);
                        }}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          fontWeight: 700,
                          textAlign: 'center'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                  onClick={() => setShowAddAccountModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-btn glossy-btn-green"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                >
                  Save Account
                </button>
              </div>
            </form>
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
    </div>
  );
}
