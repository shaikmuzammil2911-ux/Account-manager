import React, { useState, useEffect } from 'react';
import {
  Calendar, Eye, EyeOff, Search, ChevronRight, ArrowLeft,
  Check, AlertCircle, Tv, Smartphone, Sparkles, User, Phone, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDate, calculateExpiryDate } from '../utils/dateUtils';
import { api } from '../api/client';
import DatePickerModal from '../components/DatePickerModal';
import CopyButton from '../components/CopyButton';

export default function SaleScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  prefillData,
  onSaleSuccess,
  showToast
}) {
  const initialDateStr = formatDate(new Date());

  // Workflow Step: 'brand' (Step 1) -> 'screens' (Step 2 & 3) -> 'form' (Step 4 & 5)
  const [currentStep, setCurrentStep] = useState(prefillData ? 'form' : 'brand');

  // Brand Selection state
  const [activeBrandId, setActiveBrandId] = useState(prefillData?.brandId || selectedBrand?.id || (brands[0]?.id || 'netflix'));
  const [brandSearch, setBrandSearch] = useState('');

  // Accounts & Screens state
  const [brandAccounts, setBrandAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedScreen, setSelectedScreen] = useState(null);

  // Form Fields (Auto-filled from selected account & screen)
  const [accountEmail, setAccountEmail] = useState(prefillData?.email || '');
  const [accountPassword, setAccountPassword] = useState(prefillData?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [screenNumber, setScreenNumber] = useState(prefillData?.screenName || prefillData?.screenNumber || '');
  const [screenPin, setScreenPin] = useState(prefillData?.pin || '');
  const [validity, setValidity] = useState(prefillData?.validity || '01 Month');
  const [activationDate, setActivationDate] = useState(prefillData?.activationDate || initialDateStr);
  const [expiryDate, setExpiryDate] = useState('');
  const [amount, setAmount] = useState('199');
  const [deviceName, setDeviceName] = useState(prefillData?.deviceName || 'Living Room TV');

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  // UI Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showValidityDropdown, setShowValidityDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const currentBrandObj = brands.find(b => b.id === activeBrandId) || brands[0] || {};

  // Fetch accounts when brand changes
  useEffect(() => {
    async function loadBrandAccounts() {
      if (!activeBrandId) return;
      try {
        setLoadingAccounts(true);
        const items = await api.getInventory({ brandId: activeBrandId });
        setBrandAccounts(items);
      } catch (err) {
        showToast('Failed to load accounts for brand', 'error');
      } finally {
        setLoadingAccounts(false);
      }
    }
    loadBrandAccounts();
  }, [activeBrandId]);

  // Handle prefillData changes
  useEffect(() => {
    if (prefillData) {
      if (prefillData.brandId) setActiveBrandId(prefillData.brandId);
      if (prefillData.email) setAccountEmail(prefillData.email);
      if (prefillData.password) setAccountPassword(prefillData.password);
      if (prefillData.screenName || prefillData.screenNumber) {
        setScreenNumber(prefillData.screenName || `Screen-${prefillData.screenNumber}`);
      }
      if (prefillData.pin) setScreenPin(prefillData.pin);
      if (prefillData.validity) setValidity(prefillData.validity);
      setCurrentStep('form');
    }
  }, [prefillData]);

  // Auto calculate expiry date
  useEffect(() => {
    if (activationDate && validity) {
      const calculated = calculateExpiryDate(activationDate, validity);
      setExpiryDate(calculated);
    }
  }, [activationDate, validity]);

  // Auto set amount when brand or validity changes
  useEffect(() => {
    if (currentBrandObj?.prices && currentBrandObj.prices[validity]) {
      setAmount(String(currentBrandObj.prices[validity]));
    }
  }, [currentBrandObj, validity]);

  // When a screen is chosen in Step 3, auto-fill credentials into Step 4 form
  const handleSelectScreenSlot = (account, screen) => {
    if (screen.status !== 'empty') {
      showToast('This screen is already sold or occupied. Please select an empty screen (+).', 'error');
      return;
    }

    setSelectedAccount(account);
    setSelectedScreen(screen);

    // Step 4: Automatically fill form fields using account's stored data
    setAccountEmail(account.email || '');
    setAccountPassword(account.password || '');
    setScreenNumber(screen.name || `Screen-${String(screen.screenNumber).padStart(2, '0')}`);
    setScreenPin(screen.pin || '1234');
    setValidity(account.validity || '01 Month');

    setSubmitError(null);
    setCurrentStep('form');
    showToast(`Selected ${screen.name || `Screen ${screen.screenNumber}`} of ${account.email}`, 'info');
  };

  const handleBrandPick = (brand) => {
    setActiveBrandId(brand.id);
    if (onSelectBrand) onSelectBrand(brand);
    setCurrentStep('screens');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (!customerName.trim()) {
      showToast('Customer Name is required', 'error');
      return;
    }
    if (!customerNumber.trim()) {
      showToast('Customer Phone Number is required', 'error');
      return;
    }
    if (!accountEmail.trim()) {
      showToast('Account ID / Email is required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const salePayload = {
        brandId: activeBrandId,
        brandName: currentBrandObj?.displayName || currentBrandObj?.name,
        validity,
        activationDate,
        expiryDate,
        accountEmail,
        accountPassword,
        screenNumber,
        screenPin,
        amount: Number(amount) || 199,
        deviceName: deviceName || 'Living Room TV',
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        referenceName: referenceName.trim(),
        referenceNumber: referenceNumber.trim(),
        inventoryId: selectedAccount?.id || prefillData?.inventoryId || null
      };

      await onSaleSuccess(salePayload);

      confetti({
        particleCount: 90,
        spread: 65,
        origin: { y: 0.7 }
      });

      showToast('Sale confirmed & screen marked as sold!', 'success');
    } catch (err) {
      setSubmitError(err.message || 'Failed to complete sale');
      showToast(err.message || 'Sale failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBrands = brands.filter(b =>
    (b.displayName || b.name || '').toLowerCase().includes(brandSearch.toLowerCase())
  );

  const validityOptions = currentBrandObj?.plans || ['01 Month', '03 Months', '06 Months', '12 Months'];

  // =========================================================================
  // STEP 1: DISPLAY ALL OTT BRANDS
  // =========================================================================
  if (currentStep === 'brand') {
    return (
      <div className="screen-content" style={{ paddingBottom: '90px' }}>
        <div className="step-header-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span className="step-badge">Step 1 of 3</span>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Select OTT Brand
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
            Choose any streaming platform to view available accounts & screens
          </p>
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
            id="sale-brand-search"
          />
        </div>

        {/* Dynamic Brand Grid / Cards */}
        <div className="sale-brands-grid">
          {filteredBrands.map(brand => {
            const isCurrent = brand.id === activeBrandId;
            return (
              <div
                key={brand.id}
                className={`sale-brand-card ${isCurrent ? 'selected' : ''}`}
                onClick={() => handleBrandPick(brand)}
                id={`sale-brand-${brand.id}`}
                role="button"
                tabIndex={0}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    className="brand-logo-circle"
                    style={{ backgroundColor: brand.color || '#0f172a' }}
                  >
                    {brand.name ? brand.name.slice(0, 2).toUpperCase() : 'OT'}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                      {brand.displayName || brand.name}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                      {brand.screensCount || 5} Screens • Plans: {brand.plans?.length || 4}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ea580c' }}>Select</span>
                  <ChevronRight size={18} color="#ea580c" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // =========================================================================
  // STEP 2 & 3: DISPLAY BRAND ACCOUNTS & SELECT EMPTY SCREEN
  // =========================================================================
  if (currentStep === 'screens') {
    return (
      <div className="screen-content" style={{ paddingBottom: '90px' }}>
        {/* Step Navigation Header */}
        <div className="step-header-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <button
              type="button"
              className="step-back-btn"
              onClick={() => setCurrentStep('brand')}
            >
              <ArrowLeft size={16} />
              <span>Back to Brands</span>
            </button>
            <span className="step-badge">Step 2 & 3 of 3</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: currentBrandObj.color || '#ea580c'
              }}
            />
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {currentBrandObj.displayName || currentBrandObj.name} Accounts
            </h2>
          </div>
          <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
            Click an available empty screen (<strong>+</strong>) to auto-fill credentials
          </p>
        </div>

        {/* Accounts List for this Brand */}
        {loadingAccounts ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '15px' }}>
            Loading {currentBrandObj.displayName} accounts...
          </div>
        ) : brandAccounts.length === 0 ? (
          <div className="empty-state-card">
            <AlertCircle size={36} color="#ea580c" style={{ marginBottom: '8px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>No accounts found for {currentBrandObj.displayName}</h3>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '14px' }}>
              Add a new account in Data section to start selling screens.
            </p>
            <button
              type="button"
              className="glossy-btn glossy-btn-orange"
              onClick={() => setCurrentStep('brand')}
            >
              Choose Another Brand
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {brandAccounts.map(account => {
              const emptyCount = (account.screens || []).filter(s => s.status === 'empty').length;
              const isFullySold = emptyCount === 0;

              return (
                <div
                  key={account.id}
                  className={`sale-account-card ${isFullySold ? 'fully-sold' : ''}`}
                  id={`sale-acc-${account.id}`}
                >
                  {/* Account Header */}
                  <div className="sale-account-top">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {account.email}
                        </span>
                        <CopyButton text={account.email} tooltip="Copy email" size={13} />
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                        Validity: <strong>{account.validity}</strong> • Pass: <span style={{ fontFamily: 'monospace' }}>••••••••</span>
                        <CopyButton text={account.password} tooltip="Copy password" size={12} />
                      </div>
                    </div>

                    <div className="sale-account-status-pill">
                      {isFullySold ? (
                        <span className="badge-sold">Fully Sold</span>
                      ) : (
                        <span className="badge-available">{emptyCount} Free</span>
                      )}
                    </div>
                  </div>

                  {/* Screens Selection Grid (Screen 01 to Screen 10) */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
                      SELECT A SCREEN:
                    </div>

                    <div className="sale-screens-grid">
                      {(account.screens || []).map((screen, sIdx) => {
                        const isEmpty = screen.status === 'empty';

                        return (
                          <div
                            key={sIdx}
                            className={`sale-screen-slot ${isEmpty ? 'empty-available' : 'occupied'}`}
                            onClick={() => isEmpty && handleSelectScreenSlot(account, screen)}
                            title={isEmpty ? `Click to sell Screen ${screen.screenNumber}` : `Sold until ${screen.expiryDate || 'Active'}`}
                          >
                            <div className="screen-slot-header">
                              <Tv size={13} />
                              <span>{screen.name || `Screen-${screen.screenNumber}`}</span>
                            </div>

                            <div className="screen-slot-action">
                              {isEmpty ? (
                                <span className="screen-plus-badge">+ SELECT</span>
                              ) : (
                                <span className="screen-sold-badge">SOLD</span>
                              )}
                            </div>

                            <div className="screen-slot-pin">
                              PIN: {screen.pin || '1234'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // STEP 4 & 5: AUTOMATICALLY FILLED SALE FORM & CONFIRM SALE
  // =========================================================================
  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Step Header */}
      <div className="step-header-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <button
            type="button"
            className="step-back-btn"
            onClick={() => setCurrentStep('screens')}
          >
            <ArrowLeft size={16} />
            <span>Change Screen / Brand</span>
          </button>
          <span className="step-badge">Step 4 & 5: Review & Sell</span>
        </div>

        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Confirm Account Sale
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>
          Credentials auto-filled from selected screen. Enter customer details to commit sale.
        </p>
      </div>

      {/* Error Message Alert */}
      {submitError && (
        <div className="sale-error-box">
          <AlertCircle size={18} />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} id="sale-form-fill">
        {/* Row 1: Brand & Validity */}
        <div className="form-row-2">
          <div>
            <label className="form-label">OTT Brand</label>
            <div
              className="form-input-pill"
              style={{
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
              onClick={() => setCurrentStep('brand')}
              title="Click to change brand"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: currentBrandObj.color || '#ea580c'
                  }}
                />
                <span style={{ fontWeight: 800, fontSize: '15px' }}>
                  {currentBrandObj.displayName || currentBrandObj.name}
                </span>
              </div>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>Change</span>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            <label className="form-label">Validity</label>
            <div
              className="form-input-pill"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                fontWeight: 700
              }}
              onClick={() => setShowValidityDropdown(!showValidityDropdown)}
            >
              <span>{validity}</span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>▼</span>
            </div>

            {showValidityDropdown && (
              <div className="dropdown-menu-list">
                {validityOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className="dropdown-pill-item"
                    onClick={() => {
                      setValidity(option);
                      setShowValidityDropdown(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Activation Date & Calculated Expiry */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Activation Date</label>
            <button
              type="button"
              className="form-input-pill green-theme"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 700
              }}
              onClick={() => setShowDatePicker(true)}
              id="sale-activation-btn"
            >
              <span>{activationDate}</span>
              <Calendar size={18} color="#15803d" />
            </button>
          </div>

          <div>
            <label className="form-label">Expiry Date</label>
            <div
              className="form-input-pill"
              style={{
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                fontWeight: 800,
                color: '#15803d'
              }}
            >
              {expiryDate || 'Calculating...'}
            </div>
          </div>
        </div>

        {/* Section Divider: Account Auto-filled Credentials */}
        <div className="section-divider-title">
          <span>Auto-Filled Account Credentials</span>
        </div>

        {/* Account Email / ID with Copy Button */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Account Email / ID</label>
            <CopyButton text={accountEmail} tooltip="Copy email" label="Copy" />
          </div>
          <input
            type="text"
            className="form-input-pill blue-theme"
            value={accountEmail}
            onChange={e => setAccountEmail(e.target.value)}
            placeholder="Account Email or ID"
            required
            id="sale-email-field"
          />
        </div>

        {/* Password with Eye Reveal Toggle and Copy Button */}
        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ margin: 0 }}>Password</label>
            <CopyButton text={accountPassword} tooltip="Copy password" label="Copy" />
          </div>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input-pill purple-theme"
              style={{ paddingRight: '46px' }}
              value={accountPassword}
              onChange={e => setAccountPassword(e.target.value)}
              placeholder="Account Password"
              required
              id="sale-password-field"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle-eye"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Screen No & Screen Pin with Copy Button */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Selected Screen</label>
            <input
              type="text"
              className="form-input-pill yellow-theme"
              value={screenNumber}
              onChange={e => setScreenNumber(e.target.value)}
              placeholder="e.g. Screen-02"
              required
              id="sale-screen-num-field"
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>Screen PIN</label>
              <CopyButton text={screenPin} tooltip="Copy PIN" label="Copy" size={12} />
            </div>
            <input
              type="text"
              className="form-input-pill cyan-theme"
              value={screenPin}
              onChange={e => setScreenPin(e.target.value)}
              placeholder="e.g. 2222"
              required
              id="sale-screen-pin-field"
            />
          </div>
        </div>

        {/* Amount & Device Name */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Amount (₹)</label>
            <input
              type="number"
              className="form-input-pill"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="199"
              required
            />
          </div>

          <div>
            <label className="form-label">Device Name</label>
            <input
              type="text"
              className="form-input-pill"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="e.g. Living Room TV"
            />
          </div>
        </div>

        {/* Section Divider: Customer Details */}
        <div className="section-divider-title">
          <span>Customer Information</span>
        </div>

        <div className="form-row-2">
          <div>
            <label className="form-label">Customer Name</label>
            <input
              type="text"
              className="form-input-pill"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              required
              id="sale-cust-name"
            />
          </div>

          <div>
            <label className="form-label">Customer Phone Number</label>
            <input
              type="tel"
              className="form-input-pill"
              value={customerNumber}
              onChange={e => setCustomerNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              required
              id="sale-cust-phone"
            />
          </div>
        </div>

        {/* Reference Details */}
        <div className="form-row-2">
          <div>
            <label className="form-label">Reference Name (Optional)</label>
            <input
              type="text"
              className="form-input-pill"
              value={referenceName}
              onChange={e => setReferenceName(e.target.value)}
              placeholder="Referred by"
            />
          </div>

          <div>
            <label className="form-label">Reference Number (Optional)</label>
            <input
              type="tel"
              className="form-input-pill"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="Phone number"
            />
          </div>
        </div>

        {/* Step 5: Big Orange Confirm & Commit Sale Button */}
        <button
          type="submit"
          className="glossy-btn glossy-btn-orange"
          style={{
            width: '100%',
            padding: '16px',
            fontSize: '18px',
            fontWeight: 800,
            marginTop: '20px',
            borderRadius: '16px',
            letterSpacing: '0.4px'
          }}
          disabled={isSubmitting}
          id="sale-confirm-submit-btn"
        >
          {isSubmitting ? 'Verifying & Synchronizing Sale...' : 'Confirm Sale & Commit'}
        </button>
      </form>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        initialDate={activationDate}
        onSelect={(newDate) => setActivationDate(newDate)}
        onClose={() => setShowDatePicker(false)}
      />
    </div>
  );
}
