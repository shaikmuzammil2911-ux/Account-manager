import React, { useState, useEffect } from 'react';
import {
  Calendar, Eye, EyeOff, ChevronDown, Check, X, ArrowLeft,
  Copy, CheckCheck, Tv, Plus, Search, Filter, Lock, Unlock, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDate, calculateExpiryDate } from '../utils/dateUtils';
import DatePickerModal from '../components/DatePickerModal';
import CopyButton from '../components/CopyButton';
import { api } from '../api/client';

export default function SaleScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  prefillData,
  onSaleSuccess,
  showToast
}) {
  const initialDateStr = formatDate(new Date());

  // Form Fields
  const [brandId, setBrandId] = useState(prefillData?.brandId || selectedBrand?.id || brands[0]?.id || 'netflix');
  const [validity, setValidity] = useState(prefillData?.validity || '01 Month');
  const [activationDate, setActivationDate] = useState(prefillData?.activationDate || initialDateStr);
  const [expiryDate, setExpiryDate] = useState('');

  const [accountEmail, setAccountEmail] = useState(prefillData?.email || '');
  const [accountPassword, setAccountPassword] = useState(prefillData?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const [screenNumber, setScreenNumber] = useState(prefillData?.screenName || '');
  const [screenPin, setScreenPin] = useState(prefillData?.pin || '');
  const [amount, setAmount] = useState('199');
  const [deviceName, setDeviceName] = useState(prefillData?.deviceName || '');

  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState(prefillData?.inventoryId || null);

  // Overlays state
  // pickerStep: null | 'brands_grid' | 'accounts_database'
  const [pickerStep, setPickerStep] = useState(null);
  const [pickerBrand, setPickerBrand] = useState(null);
  const [pickerAccounts, setPickerAccounts] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerEmptyOnly, setPickerEmptyOnly] = useState(true);
  const [pickerSearch, setPickerSearch] = useState('');

  // Dropdown menus
  const [showValidityMenu, setShowValidityMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validityOptions = ['01 Month', '03 Months', '06 Months', '12 Months'];
  const currentBrand = brands.find(b => b.id === brandId) || selectedBrand || brands[0];

  // Auto calculate expiry date
  useEffect(() => {
    if (activationDate && validity) {
      const calculated = calculateExpiryDate(activationDate, validity);
      setExpiryDate(calculated);
    }
  }, [activationDate, validity]);

  // Auto set amount when brand or validity changes
  useEffect(() => {
    if (currentBrand?.prices && currentBrand.prices[validity]) {
      setAmount(String(currentBrand.prices[validity]));
    }
  }, [currentBrand, validity]);

  // Handle prefill updates
  useEffect(() => {
    if (prefillData) {
      if (prefillData.brandId) setBrandId(prefillData.brandId);
      if (prefillData.email) setAccountEmail(prefillData.email);
      if (prefillData.password) setAccountPassword(prefillData.password);
      if (prefillData.screenName) setScreenNumber(prefillData.screenName);
      if (prefillData.pin) setScreenPin(prefillData.pin);
      if (prefillData.validity) setValidity(prefillData.validity);
      if (prefillData.inventoryId) setSelectedInventoryId(prefillData.inventoryId);
    }
  }, [prefillData]);

  // Open Brands 3-column Grid
  const handleOpenBrandPicker = () => {
    setPickerStep('brands_grid');
  };

  // When user selects a brand from 3-column grid, open its Accounts Database
  const handleSelectBrandInGrid = async (brand) => {
    setPickerBrand(brand);
    setPickerStep('accounts_database');
    setPickerLoading(true);
    try {
      const items = await api.getInventory({ brandId: brand.id });
      setPickerAccounts(items);
    } catch (e) {
      showToast('Failed to load accounts for ' + brand.displayName, 'error');
    } finally {
      setPickerLoading(false);
    }
  };

  // When user clicks an empty screen inside the Accounts Database
  const handleSelectEmptyScreen = (account, screen) => {
    // Populate form automatically
    setBrandId(pickerBrand.id);
    if (onSelectBrand) onSelectBrand(pickerBrand);
    setAccountEmail(account.email || '');
    setAccountPassword(account.password || '');
    setScreenNumber(screen.name || `Screen-${screen.screenNumber}`);
    setScreenPin(screen.pin || '');
    setSelectedInventoryId(account.id);

    // Set validity from account if available
    if (account.validity) {
      setValidity(account.validity);
    }

    // Set price for this validity
    if (pickerBrand.prices && pickerBrand.prices[account.validity || validity]) {
      setAmount(String(pickerBrand.prices[account.validity || validity]));
    }

    // Close both opened pages!
    setPickerStep(null);
    setPickerBrand(null);
    showToast(`Selected ${pickerBrand.displayName} ${screen.name || 'Screen'}! Credentials auto-filled.`, 'success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!customerName.trim()) {
      showToast('Please enter Customer Name', 'error');
      return;
    }
    if (!customerNumber.trim()) {
      showToast('Please enter Customer Phone Number', 'error');
      return;
    }
    if (!accountEmail.trim()) {
      showToast('Please enter Account Email or ID (or select an account)', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const salePayload = {
        brandId,
        validity,
        activationDate,
        expiryDate,
        accountEmail: accountEmail.trim(),
        accountPassword: accountPassword.trim(),
        screenNumber: screenNumber.trim() || '01',
        screenPin: screenPin.trim() || '1234',
        amount: Number(amount) || 199,
        deviceName: deviceName.trim() || 'Personal Device',
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        referenceName: referenceName.trim(),
        referenceNumber: referenceNumber.trim(),
        inventoryId: selectedInventoryId || null
      };

      await onSaleSuccess(salePayload);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      showToast('Sale recorded successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Exact Old Design Classic Sale Form (as per image copy.png) */}
      <form onSubmit={handleSubmit} className="sale-form-container">
        {/* Row 1: Brand & Validity */}
        <div className="form-row-2">
          {/* Brand Dropdown Button - Clicking opens 3-column Brands List */}
          <div style={{ position: 'relative' }}>
            <label className="form-label">Brand</label>
            <div
              className="brand-select-pill"
              onClick={handleOpenBrandPicker}
              id="sale-brand-dropdown-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '12px',
                background: currentBrand?.bgDark || '#000000',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.3)',
                border: '1px solid #334155',
                minHeight: '44px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {currentBrand?.logo ? (
                  <img
                    src={currentBrand.logo}
                    alt={currentBrand.displayName}
                    style={{ height: '20px', maxWidth: '30px', objectFit: 'contain' }}
                  />
                ) : (
                  <span
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      background: currentBrand?.color || '#e50914',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '12px',
                      color: '#ffffff'
                    }}
                  >
                    {(currentBrand?.name || 'N')[0]}
                  </span>
                )}
                <span style={{ fontSize: '14px', fontWeight: 800, letterSpacing: '0.5px' }}>
                  {currentBrand?.displayName || currentBrand?.name || 'Select Brand'}
                </span>
              </div>
              <ChevronDown size={16} color="#ffffff" />
            </div>
          </div>

          {/* Validity Dropdown Button */}
          <div style={{ position: 'relative' }}>
            <label className="form-label">Validity</label>
            <div
              className="form-input-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                minHeight: '44px',
                fontWeight: 700,
                color: '#0f172a'
              }}
              onClick={() => setShowValidityMenu(!showValidityMenu)}
              id="sale-validity-dropdown"
            >
              <span style={{ fontSize: '14px', fontWeight: 800 }}>
                {validity}
              </span>
              <ChevronDown size={16} color="#64748b" />
            </div>

            {/* Validity Dropdown Options */}
            {showValidityMenu && (
              <div className="dropdown-menu-list">
                {validityOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className="dropdown-pill-item"
                    onClick={() => {
                      setValidity(option);
                      setShowValidityMenu(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Activation Date & Expiry Date */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Activation (DD-MM-YYYY)</label>
            <button
              type="button"
              className="form-input-pill green-theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                minHeight: '44px',
                width: '100%'
              }}
              onClick={() => setShowDatePicker(true)}
              id="sale-activation-date-btn"
            >
              <span style={{ fontWeight: 800 }}>{activationDate}</span>
              <Calendar size={18} color="#15803d" />
            </button>
          </div>

          <div>
            <label className="form-label">Expiry</label>
            <div
              className="form-input-pill"
              style={{
                background: '#f8fafc',
                minHeight: '44px',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 800,
                color: '#334155',
                fontSize: '14px'
              }}
            >
              {expiryDate || 'Calculating...'}
            </div>
          </div>
        </div>

        {/* Row 3: ID (with small Copy button) */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0 }}>ID</label>
            {accountEmail && <CopyButton text={accountEmail} label="Copy ID" />}
          </div>
          <input
            type="text"
            className="form-input-pill blue-theme"
            value={accountEmail}
            onChange={e => setAccountEmail(e.target.value)}
            placeholder="Type account ID or click Brand above to pick empty screen"
            id="sale-account-email"
            style={{ fontWeight: 700 }}
          />
        </div>

        {/* Row 4: Password (with Eye reveal & Copy button) */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label className="form-label" style={{ margin: 0 }}>Password</label>
            {accountPassword && <CopyButton text={accountPassword} label="Copy Password" />}
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input-pill purple-theme"
              style={{ paddingRight: '42px', fontWeight: 700 }}
              value={accountPassword}
              onChange={e => setAccountPassword(e.target.value)}
              placeholder="Type password"
              id="sale-account-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#7e22ce'
              }}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Row 5: Screen No & Screen Pin (with Copy button) */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Screen No</label>
            <input
              type="text"
              className="form-input-pill yellow-theme"
              value={screenNumber}
              onChange={e => setScreenNumber(e.target.value)}
              placeholder="e.g. Screen-2"
              id="sale-screen-number"
              style={{ fontWeight: 800 }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label className="form-label" style={{ margin: 0 }}>Screen Pin</label>
              {screenPin && <CopyButton text={screenPin} label="Copy PIN" />}
            </div>
            <input
              type="text"
              className="form-input-pill cyan-theme"
              value={screenPin}
              onChange={e => setScreenPin(e.target.value)}
              placeholder="e.g. 2222"
              id="sale-screen-pin"
              style={{ fontWeight: 800 }}
            />
          </div>
        </div>

        {/* Row 6: Amount & Device Name */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Amount</label>
            <input
              type="number"
              className="form-input-pill"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Type Amount"
              id="sale-amount"
              style={{ fontWeight: 800 }}
            />
          </div>

          <div>
            <label className="form-label">Device Name</label>
            <input
              type="text"
              className="form-input-pill"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="Type Device Name"
              id="sale-device-name"
            />
          </div>
        </div>

        {/* Customer Details Section */}
        <div className="section-divider-title" style={{ marginTop: '16px', marginBottom: '8px' }}>
          Customer Details
        </div>

        <div className="form-row-2">
          <div>
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input-pill"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Type Name"
              required
              id="sale-customer-name"
            />
          </div>

          <div>
            <label className="form-label">Number</label>
            <input
              type="tel"
              className="form-input-pill"
              value={customerNumber}
              onChange={e => setCustomerNumber(e.target.value)}
              placeholder="Type Number"
              required
              id="sale-customer-number"
            />
          </div>
        </div>

        <div className="form-row-2">
          <div>
            <label className="form-label">Reference Name</label>
            <input
              type="text"
              className="form-input-pill"
              value={referenceName}
              onChange={e => setReferenceName(e.target.value)}
              placeholder="Type Reference Name"
              id="sale-reference-name"
            />
          </div>

          <div>
            <label className="form-label">Reference Number</label>
            <input
              type="tel"
              className="form-input-pill"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="Type Reference Number"
              id="sale-reference-number"
            />
          </div>
        </div>

        {/* Big Orange Send Button (exact like old design) */}
        <button
          type="submit"
          className="glossy-btn glossy-btn-orange"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 900,
            marginTop: '20px',
            borderRadius: '16px',
            letterSpacing: '0.5px'
          }}
          disabled={isSubmitting}
          id="sale-send-btn"
        >
          {isSubmitting ? 'Saving...' : 'Send'}
        </button>
      </form>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        initialDate={activationDate}
        onSelect={(newDate) => setActivationDate(newDate)}
        onClose={() => setShowDatePicker(false)}
      />

      {/* ======================================================== */}
      {/* STEP 1: BRANDS LIST (03 Columns × Rows as specified)     */}
      {/* ======================================================== */}
      {pickerStep === 'brands_grid' && (
        <div className="modal-backdrop" onClick={() => setPickerStep(null)}>
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Select OTT Brand</h3>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  Tap a brand to view available empty screens
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPickerStep(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{
              overflowY: 'auto',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              {brands.map(brand => (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleSelectBrandInGrid(brand)}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '14px',
                    padding: '12px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    background: brand.bgDark || '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px'
                  }}>
                    {brand.logo ? (
                      <img
                        src={brand.logo}
                        alt={brand.displayName}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '16px' }}>
                        {(brand.displayName || brand.name)[0]}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#0f172a',
                    textAlign: 'center',
                    lineHeight: '1.2'
                  }}>
                    {brand.displayName || brand.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: ACCOUNTS DATABASE FOR SELECTED BRAND              */}
      {/* (Old classic design from image.png / image copy 10.png)  */}
      {/* ======================================================== */}
      {pickerStep === 'accounts_database' && pickerBrand && (
        <div className="modal-backdrop" onClick={() => setPickerStep(null)}>
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{
              maxHeight: '90vh',
              width: '95%',
              maxWidth: '600px',
              display: 'flex',
              flexDirection: 'column',
              background: '#f8fafc'
            }}
          >
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              background: '#ffffff',
              borderBottom: '1px solid #e2e8f0',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPickerStep('brands_grid')}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#334155',
                    padding: '4px'
                  }}
                  title="Back to Brands"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                    {pickerBrand.displayName} Accounts
                  </h3>
                  <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>
                    Tap any Empty Screen (+) to Sell
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPickerStep(null)}
              >
                <X size={18} />
              </button>
            </div>

            {/* Filter Toggle */}
            <div style={{ padding: '10px 16px', background: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`filter-pill-btn ${pickerEmptyOnly ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
                onClick={() => setPickerEmptyOnly(!pickerEmptyOnly)}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                <Check size={14} /> Only Empty Screens
              </button>
            </div>

            {/* Accounts List */}
            <div style={{ overflowY: 'auto', padding: '14px 16px', flex: 1 }}>
              {pickerLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                  Loading {pickerBrand.displayName} accounts...
                </div>
              ) : pickerAccounts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', background: '#ffffff', borderRadius: '16px' }}>
                  <p style={{ fontWeight: 700, color: '#64748b', margin: '0 0 10px' }}>
                    No accounts found for {pickerBrand.displayName}.
                  </p>
                  <p style={{ fontSize: '13px', color: '#94a3b8' }}>
                    Add accounts from Data section first or type credentials manually.
                  </p>
                </div>
              ) : (
                pickerAccounts
                  .filter(acc => !pickerEmptyOnly || (acc.screens && acc.screens.some(s => s.status === 'empty')))
                  .map(acc => {
                    const freeCount = (acc.screens || []).filter(s => s.status === 'empty').length;
                    const totalScreens = acc.screens?.length || 5;

                    return (
                      <div
                        key={acc.id}
                        className="inventory-card"
                        style={{ marginBottom: '16px', border: '1.5px solid #cbd5e1' }}
                      >
                        {/* Top Card Row */}
                        <div className="card-top-row">
                          <div className="ribbon-badge">
                            {acc.recordNumber || '01'}
                          </div>

                          <div style={{ fontSize: '13px', fontWeight: 800, color: freeCount > 0 ? '#16a34a' : '#dc2626' }}>
                            {freeCount}/{totalScreens} Screens Available
                          </div>

                          <div className="badge-navy-pill">
                            {acc.validity || '12 Months'}
                          </div>
                        </div>

                        {/* ID Row */}
                        <div className="credential-row">
                          <div className="credential-label-badge blue">
                            ID
                          </div>
                          <div style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#0f172a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>{acc.email}</span>
                            <CopyButton text={acc.email} />
                          </div>
                        </div>

                        {/* Password Row */}
                        <div className="credential-row">
                          <div className="credential-label-badge purple">
                            Password
                          </div>
                          <div style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            fontWeight: 700,
                            fontSize: '14px',
                            color: '#0f172a',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>••••••••</span>
                            <CopyButton text={acc.password} />
                          </div>
                        </div>

                        {/* Screens Row with PINs and Selection */}
                        <div style={{ marginTop: '12px' }}>
                          {/* PINs row */}
                          <div className="screens-grid-row" style={{ marginBottom: '6px' }}>
                            {(acc.screens || []).map((screen, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: '#475569',
                                  background: '#f1f5f9',
                                  padding: '2px 4px',
                                  borderRadius: '4px',
                                  textAlign: 'center'
                                }}
                              >
                                {screen.pin || '1234'}
                              </div>
                            ))}
                          </div>

                          {/* Screen Buttons */}
                          <div className="screens-grid-row">
                            {(acc.screens || []).map((screen, sIdx) => {
                              const isEmpty = screen.status === 'empty';

                              return (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => {
                                    if (isEmpty) {
                                      handleSelectEmptyScreen(acc, screen);
                                    } else {
                                      showToast(`Screen ${screen.name || sIdx + 1} is already sold!`, 'error');
                                    }
                                  }}
                                  style={{
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 4px',
                                    cursor: isEmpty ? 'pointer' : 'not-allowed',
                                    background: isEmpty ? '#f97316' : '#94a3b8',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: '12px',
                                    boxShadow: isEmpty ? '0 2px 4px rgba(249,115,22,0.35)' : 'none',
                                    opacity: isEmpty ? 1 : 0.6,
                                    transition: 'transform 0.1s ease'
                                  }}
                                  title={isEmpty ? 'Click to select this screen for Sale' : 'Screen is occupied'}
                                >
                                  {screen.name || `Screen-${sIdx + 1}`}
                                </button>
                              );
                            })}
                          </div>

                          {/* Status / Tap to Pick Row */}
                          <div className="screens-grid-row" style={{ marginTop: '6px' }}>
                            {(acc.screens || []).map((screen, sIdx) => {
                              const isEmpty = screen.status === 'empty';

                              return (
                                <div
                                  key={sIdx}
                                  onClick={() => {
                                    if (isEmpty) handleSelectEmptyScreen(acc, screen);
                                  }}
                                  style={{
                                    padding: '4px 2px',
                                    borderRadius: '6px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    cursor: isEmpty ? 'pointer' : 'default',
                                    background: isEmpty ? '#dcfce7' : '#fee2e2',
                                    color: isEmpty ? '#16a34a' : '#dc2626',
                                    border: isEmpty ? '1.5px dashed #22c55e' : '1px solid #fca5a5'
                                  }}
                                >
                                  {isEmpty ? '+ EMPTY' : 'SOLD'}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
