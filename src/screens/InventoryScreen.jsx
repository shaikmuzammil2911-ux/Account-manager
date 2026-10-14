import React, { useState, useEffect } from 'react';
import { Check, Calendar, ArrowUpDown, Eye, EyeOff, Lock, Unlock, Save, Plus, Tv, Smartphone, Trash2, X } from 'lucide-react';
import { api } from '../api/client';
import { getExpiryCategory } from '../utils/dateUtils';

export default function InventoryScreen({
  selectedBrand,
  onNavigateToSaleWithSlot,
  showToast
}) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Top 4 Filter Controls
  const [filterSelectedOnly, setFilterSelectedOnly] = useState(false);
  const [filterEmptyOnly, setFilterEmptyOnly] = useState(false);
  const [selectedValidity, setSelectedValidity] = useState('all');
  const [sortOrder, setSortOrder] = useState('top'); // 'top' or 'bottom'

  // Card editing state: item ID -> editable fields
  const [editingCards, setEditingCards] = useState({});
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);

  // New account form state
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newValidity, setNewValidity] = useState('01 Month');

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const data = await api.getInventory({
        brandId: selectedBrand?.id || 'netflix',
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
    fetchInventory();
  }, [selectedBrand, filterSelectedOnly, filterEmptyOnly, selectedValidity, sortOrder]);

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
      // Cancel edit mode
      setEditingCards(prev => {
        const copy = { ...prev };
        delete copy[item.id];
        return copy;
      });
      showToast('Card locked', 'info');
    } else {
      // Enable edit mode
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
        pin: editState.pins[idx] || screen.pin
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

  const togglePasswordVisibility = (id) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Cycle validity filter: all -> 01 Month -> 03 Months -> 06 Months -> 12 Months -> all
  const cycleValidityFilter = () => {
    const options = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const curIdx = options.indexOf(selectedValidity);
    const nextIdx = (curIdx + 1) % options.length;
    setSelectedValidity(options[nextIdx]);
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'top' ? 'bottom' : 'top');
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      showToast('Email and Password are required', 'error');
      return;
    }

    try {
      await api.createInventory({
        brandId: selectedBrand?.id || 'netflix',
        email: newEmail.trim(),
        password: newPassword.trim(),
        validity: newValidity
      });
      setNewEmail('');
      setNewPassword('');
      setShowAddAccountModal(false);
      fetchInventory();
      showToast('New account added to inventory!', 'success');
    } catch (err) {
      showToast('Failed to create account', 'error');
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
      showToast('Screen slot released and now empty!', 'success');
    } catch (err) {
      showToast('Failed to release slot', 'error');
    }
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Top 4 Filters Bar Matching Reference Video */}
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
          className={`filter-pill-btn ${selectedValidity !== 'all' ? 'glossy-btn-green' : 'glossy-btn-green'}`}
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

      {/* Quick Add Account Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 800, color: '#475569' }}>
          {items.length} {selectedBrand?.displayName || 'Netflix'} Accounts
        </span>
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          style={{ padding: '6px 12px', fontSize: '12px' }}
          onClick={() => setShowAddAccountModal(true)}
          id="inventory-add-account-btn"
        >
          <Plus size={14} /> Add Account
        </button>
      </div>

      {/* Inventory Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading inventory...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: '8px' }}>No accounts match the current filters.</p>
          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => {
              setFilterSelectedOnly(false);
              setFilterEmptyOnly(false);
              setSelectedValidity('all');
            }}
          >
            Clear Filters
          </button>
        </div>
      ) : (
        items.map(item => {
          const isEditing = !!editingCards[item.id];
          const editState = editingCards[item.id] || {};
          const isPassVisible = !!visiblePasswords[item.id];

          return (
            <div key={item.id} className="inventory-card" id={`inventory-card-${item.recordNumber}`}>
              {/* Top Row: Ribbon Record Tag, Validity Badge, Checkbox */}
              <div className="card-top-row">
                <div className="ribbon-badge">
                  {item.recordNumber}
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

              {/* ID Row */}
              <div className="credential-row">
                <div className="credential-label-badge blue">
                  <span>👤 ID</span>
                </div>
                <div className="credential-input-box">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editState.email}
                      onChange={e => setEditingCards(prev => ({
                        ...prev,
                        [item.id]: { ...prev[item.id], email: e.target.value }
                      }))}
                    />
                  ) : (
                    <span>{item.email}</span>
                  )}
                </div>
              </div>

              {/* Password Row */}
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
                    />
                  ) : (
                    <span>
                      {isPassVisible ? item.password : '••••••••••••'}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility(item.id)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {isPassVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Screen PINs Grid (5 PIN boxes matching Image 1) */}
              <div className="screen-pins-grid">
                {(item.screens || []).map((screen, sIdx) => (
                  <div key={`pin-${sIdx}`} className="pin-box">
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
                      <span>{screen.pin || '1234'}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Screen Buttons Grid (5 Orange buttons) */}
              <div className="screen-buttons-grid">
                {(item.screens || []).map((screen, sIdx) => (
                  <div key={`btn-${sIdx}`} className="screen-btn">
                    {sIdx === 4 ? <Smartphone size={12} /> : <Tv size={12} />}
                    <span>{screen.name || `Screen-${sIdx + 1}`}</span>
                  </div>
                ))}
              </div>

              {/* Screen Slots Status Grid (Empty '+' vs Filled Date Pill) */}
              <div className="screen-slots-grid">
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
                        title="Click to sell this screen"
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
                      title={`Occupied until ${screen.expiryDate}. Click for details.`}
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

              {/* Action Buttons: Edit (UnLock) and Save */}
              <div className="card-actions-grid">
                <button
                  type="button"
                  className="glossy-btn glossy-btn-blue"
                  style={{ padding: '8px', fontSize: '13px' }}
                  onClick={() => handleToggleLock(item)}
                >
                  {isEditing ? <Lock size={15} /> : <Unlock size={15} />}
                  <span>{isEditing ? 'Cancel Edit' : 'Edit (UnLock)'}</span>
                </button>

                <button
                  type="button"
                  className="glossy-btn glossy-btn-green"
                  style={{ padding: '8px', fontSize: '13px' }}
                  onClick={() => handleSaveCard(item)}
                >
                  <Save size={15} />
                  <span>Save</span>
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Slot Details Modal (shows details of an occupied slot and allows releasing) */}
      {selectedSlotDetails && (
        <div className="modal-overlay" onClick={() => setSelectedSlotDetails(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Screen Slot Info</h3>
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

      {/* Add New Account Modal */}
      {showAddAccountModal && (
        <div className="modal-overlay" onClick={() => setShowAddAccountModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Add New Account</h3>
              <button
                type="button"
                onClick={() => setShowAddAccountModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAccount}>
              <div className="form-group">
                <label className="form-label">Account Email / ID</label>
                <input
                  type="email"
                  className="form-input-pill"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="e.g. netflix.family@gmail.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="text"
                  className="form-input-pill"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="e.g. Stream@Pass2026"
                  required
                />
              </div>

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

              <button
                type="submit"
                className="glossy-btn glossy-btn-blue"
                style={{ width: '100%', padding: '10px', fontSize: '14px', marginTop: '10px' }}
              >
                Create Account Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
