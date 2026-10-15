import React, { useState, useEffect } from 'react';
import {
  Check, Calendar, ArrowUpDown, Eye, EyeOff, Lock, Unlock,
  Save, Plus, Tv, Trash2, X, Search, ArrowLeft, AlertTriangle,
  Layers, CheckCircle2, ChevronRight, Edit3, ShieldAlert
} from 'lucide-react';
import { api } from '../api/client';
import { getExpiryCategory } from '../utils/dateUtils';
import CopyButton from '../components/CopyButton';

export default function InventoryScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSaleWithSlot,
  showToast
}) {
  // Navigation inside Data Section: 'brands' (Brand selection) or 'accounts' (Accounts list)
  const [viewMode, setViewMode] = useState(selectedBrand ? 'accounts' : 'brands');
  const [activeBrand, setActiveBrand] = useState(selectedBrand || brands[0] || null);
  const [brandSearch, setBrandSearch] = useState('');

  // Inventory data
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [filterEmptyOnly, setFilterEmptyOnly] = useState(false);
  const [selectedValidity, setSelectedValidity] = useState('all');
  const [sortOrder, setSortOrder] = useState('top'); // 'top' or 'bottom'
  const [accountSearch, setAccountSearch] = useState('');

  // Card editing & reveal state
  const [editingCards, setEditingCards] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Modals
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add Account Form State (Supports 1 to 10 screens dynamically)
  const [newBrandId, setNewBrandId] = useState(activeBrand?.id || 'netflix');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newScreenCount, setNewScreenCount] = useState(5);
  const [newValidity, setNewValidity] = useState('01 Month');
  const [newNotes, setNewNotes] = useState('');
  const [newScreenPins, setNewScreenPins] = useState({});
  const [isCreating, setIsCreating] = useState(false);

  // Fetch accounts whenever activeBrand or filters change
  const fetchInventory = async () => {
    if (!activeBrand?.id) return;
    try {
      setLoading(true);
      const data = await api.getInventory({
        brandId: activeBrand.id,
        selectedOnly: filterSelectedOnly,
        emptyOnly: filterEmptyOnly,
        validity: selectedValidity,
        sortOrder
      });
      setItems(data);
    } catch (err) {
      showToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeBrand?.id) {
      fetchInventory();
    }
  }, [activeBrand, filterSelectedOnly, filterEmptyOnly, selectedValidity, sortOrder]);

  // When selectedBrand prop updates
  useEffect(() => {
    if (selectedBrand) {
      setActiveBrand(selectedBrand);
      setNewBrandId(selectedBrand.id);
      setViewMode('accounts');
    }
  }, [selectedBrand]);

  // Screen count changes in Add Account modal: initialize default PINs
  useEffect(() => {
    const pins = {};
    for (let i = 1; i <= newScreenCount; i++) {
      pins[i] = newScreenPins[i] || String(1111 * i).slice(0, 4) || '1234';
    }
    setNewScreenPins(pins);
  }, [newScreenCount]);

  const handleSelectBrand = (brand) => {
    setActiveBrand(brand);
    setNewBrandId(brand.id);
    if (onSelectBrand) onSelectBrand(brand);
    setViewMode('accounts');
  };

  const handleToggleSelect = async (id, e) => {
    e?.stopPropagation();
    try {
      const updated = await api.toggleInventorySelect(id);
      setItems(prev => prev.map(item => item.id === id ? { ...item, isSelected: updated.isSelected } : item));
      showToast(updated.isSelected ? 'Account marked as selected' : 'Account unselected', 'info');
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
          notes: item.notes || '',
          pins: (item.screens || []).map(s => s.pin || '1234')
        }
      }));
      showToast('Card unlocked for editing', 'info');
    }
  };

  const handleSaveCard = async (item) => {
    const editState = editingCards[item.id];
    if (!editState) {
      showToast('Click Edit (UnLock) first to modify credentials', 'info');
      return;
    }

    try {
      const updatedScreens = (item.screens || []).map((screen, idx) => ({
        ...screen,
        pin: editState.pins[idx] !== undefined ? editState.pins[idx] : screen.pin
      }));

      const payload = {
        email: editState.email.trim(),
        password: editState.password.trim(),
        validity: editState.validity,
        notes: editState.notes,
        screens: updatedScreens
      };

      const result = await api.updateInventory(item.id, payload);
      setItems(prev => prev.map(i => i.id === item.id ? result : i));
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Account details saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save account changes', 'error');
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

  // Add Account Submission (1 to 10 screens)
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPassword.trim()) {
      showToast('Account Email and Password are required', 'error');
      return;
    }

    try {
      setIsCreating(true);
      const screens = [];
      for (let i = 1; i <= newScreenCount; i++) {
        screens.push({
          screenNumber: i,
          name: `Screen-${String(i).padStart(2, '0')}`,
          pin: newScreenPins[i] || '1234',
          status: 'empty',
          saleId: null,
          expiryDate: null
        });
      }

      await api.createInventory({
        brandId: newBrandId,
        email: newEmail.trim(),
        password: newPassword.trim(),
        screensCount: newScreenCount,
        validity: newValidity,
        notes: newNotes.trim(),
        screens
      });

      // Reset form
      setNewEmail('');
      setNewPassword('');
      setNewNotes('');
      setShowAddAccountModal(false);
      await fetchInventory();
      showToast(`New account with ${newScreenCount} screens created and saved!`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to create account', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  // Confirm delete handler (soft deletion preserving sales history)
  const handleConfirmDelete = async () => {
    if (!accountToDelete) return;
    try {
      setIsDeleting(true);
      await api.deleteInventory(accountToDelete.id);
      setItems(prev => prev.filter(i => i.id !== accountToDelete.id));
      setAccountToDelete(null);
      showToast('Account deleted. Historical sales records preserved for auditing.', 'success');
    } catch (err) {
      showToast('Failed to delete account', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReleaseSlot = async (item, screenIndex) => {
    try {
      const updatedScreens = [...item.screens];
      updatedScreens[screenIndex] = {
        ...updatedScreens[screenIndex],
        status: 'empty',
        saleId: null,
        expiryDate: null
      };

      const result = await api.updateInventory(item.id, { screens: updatedScreens });
      setItems(prev => prev.map(i => i.id === item.id ? result : i));
      setSelectedSlotDetails(null);
      showToast('Screen slot released and marked empty!', 'success');
    } catch (err) {
      showToast('Failed to release slot', 'error');
    }
  };

  // Filter accounts by search query
  const displayedItems = items.filter(item => {
    if (!accountSearch.trim()) return true;
    const q = accountSearch.toLowerCase();
    return (
      (item.email || '').toLowerCase().includes(q) ||
      (item.recordNumber || '').includes(q) ||
      (item.notes || '').toLowerCase().includes(q)
    );
  });

  const filteredBrands = brands.filter(b =>
    (b.displayName || b.name || '').toLowerCase().includes(brandSearch.toLowerCase())
  );

  // =========================================================================
  // VIEW 1: BRAND SELECTION FIRST
  // =========================================================================
  if (viewMode === 'brands') {
    return (
      <div className="screen-content" style={{ paddingBottom: '90px' }}>
        <div className="data-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="hero-icon-pill green">
              <Layers size={20} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Data — OTT Accounts
              </h2>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
                Select a platform to manage its credentials & screen slots
              </p>
            </div>
          </div>
        </div>

        {/* Brand Search Bar */}
        <div style={{ position: 'relative', marginBottom: '14px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input-pill"
            style={{ paddingLeft: '38px', height: '46px', fontSize: '15px' }}
            placeholder="Search OTT platform (Netflix, Amazon, Aha...)"
            value={brandSearch}
            onChange={e => setBrandSearch(e.target.value)}
            id="data-brand-search"
          />
        </div>

        {/* Brands List Cards */}
        <div className="data-brands-list">
          {filteredBrands.map(brand => {
            return (
              <div
                key={brand.id}
                className="data-brand-item-card"
                onClick={() => handleSelectBrand(brand)}
                id={`data-brand-select-${brand.id}`}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    className="data-brand-avatar"
                    style={{ backgroundColor: brand.color || '#0f172a' }}
                  >
                    {brand.name ? brand.name.slice(0, 2).toUpperCase() : 'OT'}
                  </div>
                  <div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                      {brand.displayName || brand.name}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                      Standard: {brand.screensCount || 5} Screens • {brand.plans?.length || 4} Plans
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>Open Data</span>
                  <ChevronRight size={18} color="#16a34a" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACCOUNTS FOR SELECTED BRAND
  // =========================================================================
  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Header with Back Button */}
      <div className="data-accounts-top-bar">
        <button
          type="button"
          className="step-back-btn"
          onClick={() => setViewMode('brands')}
          id="data-back-to-brands-btn"
        >
          <ArrowLeft size={16} />
          <span>Back to Brands</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: activeBrand?.color || '#16a34a'
            }}
          />
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {activeBrand?.displayName || activeBrand?.name} Accounts
          </h2>
        </div>
      </div>

      {/* Top 4 Filter Controls */}
      <div className="filter-bar-4">
        {/* 1. Selected Filter */}
        <button
          type="button"
          className={`filter-pill-btn ${filterSelectedOnly ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
          onClick={() => setFilterSelectedOnly(!filterSelectedOnly)}
          id="data-filter-selected"
        >
          <Check size={15} />
          <span>Selected</span>
        </button>

        {/* 2. Empty Filter */}
        <button
          type="button"
          className={`filter-pill-btn ${filterEmptyOnly ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
          onClick={() => setFilterEmptyOnly(!filterEmptyOnly)}
          id="data-filter-empty"
        >
          <Check size={15} />
          <span>Empty</span>
        </button>

        {/* 3. Validity Filter */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          onClick={cycleValidityFilter}
          id="data-filter-validity"
          title={`Filter: ${selectedValidity}`}
        >
          <Calendar size={15} />
          <span>{selectedValidity === 'all' ? 'Validity' : selectedValidity.replace(' Months', 'M').replace(' Month', 'M')}</span>
        </button>

        {/* 4. Top/Bottom Sort Toggle */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-purple"
          onClick={toggleSortOrder}
          id="data-filter-sort"
          title={`Sorting: ${sortOrder === 'top' ? 'Top to Bottom' : 'Bottom to Top'}`}
        >
          <ArrowUpDown size={15} />
          <span>{sortOrder === 'top' ? 'Top' : 'Bottom'}</span>
        </button>
      </div>

      {/* Search and Add Account Header Row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input-pill"
            style={{ paddingLeft: '32px', height: '40px', fontSize: '13.5px' }}
            placeholder={`Search ${items.length} accounts by email, record...`}
            value={accountSearch}
            onChange={e => setAccountSearch(e.target.value)}
          />
        </div>

        {/* Add Account Button */}
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          style={{ padding: '8px 14px', fontSize: '13.5px', whiteSpace: 'nowrap' }}
          onClick={() => setShowAddAccountModal(true)}
          id="data-add-account-btn"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '15px' }}>
          Loading {activeBrand?.displayName} accounts...
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="empty-state-card">
          <p style={{ fontWeight: 800, color: '#475569', fontSize: '16px', marginBottom: '10px' }}>
            No accounts match the current filters.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            onClick={() => setShowAddAccountModal(true)}
          >
            <Plus size={16} /> Add First Account
          </button>
        </div>
      ) : (
        displayedItems.map(item => {
          const isEditing = !!editingCards[item.id];
          const editState = editingCards[item.id] || {};
          const isPassVisible = !!visiblePasswords[item.id];

          const emptyCount = (item.screens || []).filter(s => s.status === 'empty').length;
          const totalScreens = (item.screens || []).length;

          return (
            <div key={item.id} className="inventory-card" id={`inventory-card-${item.recordNumber}`}>
              {/* Top Row: Ribbon Record Tag, Validity Badge, Checkbox */}
              <div className="card-top-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="ribbon-badge">
                    {item.recordNumber}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b' }}>
                    {emptyCount}/{totalScreens} Screens Available
                  </span>
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

              {/* ID Row with Small Copy Icon */}
              <div className="credential-row">
                <div className="credential-label-badge blue">
                  <span>👤 ID</span>
                </div>
                <div className="credential-input-box" style={{ justifyContent: 'space-between' }}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editState.email}
                      onChange={e => setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], email: e.target.value }
                      }))}
                      style={{ width: '100%', fontSize: '14px' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '14.5px', fontWeight: 700 }}>{item.email}</span>
                      <CopyButton text={item.email} tooltip="Copy email" size={13} />
                    </>
                  )}
                </div>
              </div>

              {/* Password Row with Eye Reveal Toggle and Small Copy Icon */}
              <div className="credential-row">
                <div className="credential-label-badge purple">
                  <span>🔒 Password</span>
                </div>
                <div className="credential-input-box" style={{ justifyContent: 'space-between' }}>
                  {isEditing ? (
                    <input
                      type={isPassVisible ? 'text' : 'password'}
                      value={editState.password}
                      onChange={e => setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], password: e.target.value }
                      }))}
                      style={{ width: '100%', fontSize: '14px' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '14px', fontFamily: isPassVisible ? 'inherit' : 'monospace', fontWeight: 700 }}>
                        {isPassVisible ? item.password : '••••••••••••'}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(item.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '2px' }}
                          title={isPassVisible ? 'Hide password' : 'Show password'}
                          aria-label="Toggle password"
                        >
                          {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <CopyButton text={item.password} tooltip="Copy password" size={13} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Screen PINs Grid with individual PIN inputs/displays & copy support */}
              <div className="screen-pins-grid" style={{ gridTemplateColumns: `repeat(${Math.min(item.screens?.length || 5, 5)}, 1fr)` }}>
                {(item.screens || []).map((screen, sIdx) => (
                  <div key={`pin-${sIdx}`} className="pin-box" style={{ position: 'relative' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        maxLength={6}
                        value={editState.pins ? editState.pins[sIdx] : screen.pin}
                        onChange={e => {
                          const val = e.target.value;
                          setEditingCards(prev => {
                            const newPins = [...(prev[item.id]?.pins || [])];
                            newPins[sIdx] = val;
                            return {
                              ...prev,
                              [item.id]: { ...prev[item.id], pins: newPins }
                            };
                          });
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                        <span>{screen.pin || '1234'}</span>
                        <CopyButton text={screen.pin} tooltip="Copy PIN" size={10} showLabelOnCopy={false} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Screen Buttons Grid */}
              <div className="screen-buttons-grid" style={{ gridTemplateColumns: `repeat(${Math.min(item.screens?.length || 5, 5)}, 1fr)` }}>
                {(item.screens || []).map((screen, sIdx) => (
                  <div key={`btn-${sIdx}`} className="screen-btn">
                    <Tv size={12} />
                    <span>{screen.name || `Screen-${sIdx + 1}`}</span>
                  </div>
                ))}
              </div>

              {/* Screen Slots Status Grid (Empty '+' vs Sold Date Pill) */}
              <div className="screen-slots-grid" style={{ gridTemplateColumns: `repeat(${Math.min(item.screens?.length || 5, 5)}, 1fr)` }}>
                {(item.screens || []).map((screen, sIdx) => {
                  const isEmpty = screen.status === 'empty' || !screen.expiryDate;
                  const expCategory = screen.expiryDate ? getExpiryCategory(screen.expiryDate) : 'empty';
                  const isRed = expCategory === 'expired' || expCategory === 'today';

                  if (isEmpty) {
                    return (
                      <button
                        key={`slot-${sIdx}`}
                        type="button"
                        className="slot-indicator empty"
                        title="Click to sell this screen in Sale section"
                        onClick={() => {
                          onNavigateToSaleWithSlot({
                            inventoryId: item.id,
                            brandId: item.brandId,
                            email: item.email,
                            password: item.password,
                            validity: item.validity,
                            screenNumber: screen.screenNumber,
                            screenName: screen.name,
                            pin: screen.pin
                          });
                        }}
                      >
                        +
                      </button>
                    );
                  }

                  return (
                    <button
                      key={`slot-${sIdx}`}
                      type="button"
                      className={`slot-indicator ${isRed ? 'occupied-red' : 'occupied-green'}`}
                      title={`Sold until ${screen.expiryDate}. Click for info & release options.`}
                      onClick={() => {
                        setSelectedSlotDetails({
                          account: item,
                          screen,
                          screenIndex: sIdx
                        });
                      }}
                    >
                      {screen.expiryDate}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons: Unlock Edit, Save, and Delete */}
              <div className="card-actions-grid-3">
                <button
                  type="button"
                  className="glossy-btn glossy-btn-blue"
                  style={{ padding: '9px', fontSize: '13.5px' }}
                  onClick={() => handleToggleLock(item)}
                >
                  {isEditing ? <Lock size={15} /> : <Unlock size={15} />}
                  <span>{isEditing ? 'Cancel Edit' : 'Edit (UnLock)'}</span>
                </button>

                <button
                  type="button"
                  className="glossy-btn glossy-btn-green"
                  style={{ padding: '9px', fontSize: '13.5px' }}
                  onClick={() => handleSaveCard(item)}
                >
                  <Save size={15} />
                  <span>Save</span>
                </button>

                <button
                  type="button"
                  className="glossy-btn glossy-btn-red"
                  style={{ padding: '9px', fontSize: '13.5px' }}
                  onClick={() => setAccountToDelete(item)}
                  title="Delete account (preserves sales history)"
                >
                  <Trash2 size={15} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* =========================================================================
          MODAL 1: ADD ACCOUNT POPUP (Supports 1 to 10 Screens Dynamically)
         ========================================================================= */}
      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>Add New Account</h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount}>
              {/* OTT Brand */}
              <div className="form-group">
                <label className="form-label">OTT Platform</label>
                <select
                  className="form-input-pill"
                  value={newBrandId}
                  onChange={e => setNewBrandId(e.target.value)}
                >
                  {brands.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.displayName || b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Account Email / ID */}
              <div className="form-group">
                <label className="form-label">Account Email / ID</label>
                <input
                  type="email"
                  className="form-input-pill"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. user.account@gmail.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label className="form-label">Account Password</label>
                <input
                  type="text"
                  className="form-input-pill"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. MasterPass@2026"
                  required
                />
              </div>

              {/* Screen Count Selector (1 to 10 Screens) */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>
                    Number of Screens (1 to 10)
                  </label>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#2563eb' }}>
                    {newScreenCount} Screens
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={newScreenCount}
                  onChange={e => setNewScreenCount(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#2563eb' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  <span>1 Screen</span>
                  <span>5 Screens</span>
                  <span>10 Screens</span>
                </div>
              </div>

              {/* Dynamic Screen PINs Grid according to selected screen count */}
              <div style={{ marginBottom: '14px', background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#334155', marginBottom: '8px' }}>
                  Configure PIN for Each Screen:
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                  {Array.from({ length: newScreenCount }, (_, i) => {
                    const screenIdx = i + 1;
                    return (
                      <div key={screenIdx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', minWidth: '65px' }}>
                          Screen {String(screenIdx).padStart(2, '0')}:
                        </span>
                        <input
                          type="text"
                          maxLength={6}
                          className="form-input-pill"
                          style={{ padding: '6px 10px', height: '34px', fontSize: '13px' }}
                          placeholder="PIN"
                          value={newScreenPins[screenIdx] || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setNewScreenPins(prev => ({ ...prev, [screenIdx]: val }));
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Validity */}
              <div className="form-group">
                <label className="form-label">Validity</label>
                <select
                  className="form-input-pill"
                  value={newValidity}
                  onChange={e => setNewValidity(e.target.value)}
                >
                  <option value="01 Month">01 Month</option>
                  <option value="03 Months">03 Months</option>
                  <option value="06 Months">06 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">Notes / Remarks (Optional)</label>
                <textarea
                  className="form-input-pill"
                  style={{ height: '60px', padding: '8px 12px', resize: 'none' }}
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Master owner contact or card renewal date"
                />
              </div>

              {/* Popup Actions: Save Account, Cancel, Reset */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '10px' }}
                  onClick={() => setShowAddAccountModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 0.8, padding: '10px' }}
                  onClick={() => {
                    setNewEmail('');
                    setNewPassword('');
                    setNewNotes('');
                  }}
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="glossy-btn glossy-btn-green"
                  style={{ flex: 1.5, padding: '10px', fontWeight: 800 }}
                  disabled={isCreating}
                >
                  {isCreating ? 'Saving...' : 'Save Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: DELETE CONFIRMATION POPUP (Preserves Sales History)
         ========================================================================= */}
      {accountToDelete && (
        <div className="modal-overlay" onClick={() => setAccountToDelete(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626', marginBottom: '10px' }}>
              <ShieldAlert size={24} />
              <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0 }}>Confirm Delete Account</h3>
            </div>

            <p style={{ fontSize: '13.5px', color: '#334155', marginBottom: '8px' }}>
              Are you sure you want to delete account: <strong>{accountToDelete.email}</strong>?
            </p>

            <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
              <CheckCircle2 size={14} color="#16a34a" style={{ display: 'inline', marginRight: '4px' }} />
              <strong>Audit Safety:</strong> All past and active sales records associated with this account are safely preserved.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ flex: 1, padding: '10px' }}
                onClick={() => setAccountToDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-red"
                style={{ flex: 1, padding: '10px', fontWeight: 800 }}
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: SLOT DETAILS POPUP
         ========================================================================= */}
      {selectedSlotDetails && (
        <div className="modal-overlay" onClick={() => setSelectedSlotDetails(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Screen Slot Information</h3>
              <button
                type="button"
                onClick={() => setSelectedSlotDetails(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', fontSize: '13px', marginBottom: '14px' }}>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Account:</span> <strong>{selectedSlotDetails.account.email}</strong>
              </div>
              <div style={{ marginBottom: '6px' }}>
                <span style={{ color: '#64748b' }}>Screen:</span> <strong>{selectedSlotDetails.screen.name} (PIN: {selectedSlotDetails.screen.pin})</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Expiry:</span> <strong style={{ color: '#16a34a' }}>{selectedSlotDetails.screen.expiryDate}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-red"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={() => handleReleaseSlot(selectedSlotDetails.account, selectedSlotDetails.screenIndex)}
              >
                <Trash2 size={16} /> Release Slot (Make Empty)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
