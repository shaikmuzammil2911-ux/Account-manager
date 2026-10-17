import React, { useState, useEffect } from 'react';
import {
  User, Lock, Eye, EyeOff, ChevronDown, Check,
  Tv, Sparkles, Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDate, calculateExpiryDate } from '../utils/dateUtils';
import { buildWhatsAppLink, formatSaleConfirmationMessage } from '../utils/whatsapp';
import OttBrandsGrid from '../components/OttBrandsGrid';
import OttLogo from '../components/OttLogos';
import DatePickerModal from '../components/DatePickerModal';
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
  const [showFromDatePicker, setShowFromDatePicker] = useState(false);
  const [showToDatePicker, setShowToDatePicker] = useState(false);

  const [accountEmail, setAccountEmail] = useState(prefillData?.email || '');
  const [accountPassword, setAccountPassword] = useState(prefillData?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  const [screenNumber, setScreenNumber] = useState(prefillData?.screenName || 'Screen-1');
  const [screenPin, setScreenPin] = useState(prefillData?.pin || '1111');
  const [amount, setAmount] = useState('199');
  const [deviceName, setDeviceName] = useState(prefillData?.deviceName || '');

  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [selectedInventoryId, setSelectedInventoryId] = useState(prefillData?.inventoryId || null);

  // UI state
  const [isPickingBrand, setIsPickingBrand] = useState(false);
  const [showValidityMenu, setShowValidityMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [brandAccounts, setBrandAccounts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validityOptions = ['01 Month', '03 Months', '06 Months', '12 Months'];
  const currentBrand = brands.find(b => b.id === brandId) || selectedBrand || brands[0];

  // Auto calculate expiry date whenever validity changes
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

  // Load accounts for current brand to provide easy dropdown selection
  useEffect(() => {
    let active = true;
    if (currentBrand?.id) {
      api.getInventory({ brandId: currentBrand.id }).then(items => {
        if (active) {
          setBrandAccounts(items || []);
        }
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [currentBrand?.id]);

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

  // When user selects a brand from 3-column Select OTT Grid
  const handleSelectBrandInGrid = (brand) => {
    setBrandId(brand.id);
    if (onSelectBrand) onSelectBrand(brand);
    setIsPickingBrand(false);
    showToast(`Selected ${brand.displayName}`, 'info');
  };

  // When user picks an account from dropdown
  const handleSelectAccount = (account) => {
    setAccountEmail(account.email || '');
    setAccountPassword(account.password || '');
    setSelectedInventoryId(account.id);

    const emptyScreen = (account.screens || []).find(s => s.status === 'empty') || (account.screens || [])[0];
    if (emptyScreen) {
      setScreenNumber(emptyScreen.name || `Screen-${emptyScreen.screenNumber}`);
      setScreenPin(emptyScreen.pin || '');
    }

    if (account.validity) {
      setValidity(account.validity);
    }

    setShowAccountMenu(false);
    showToast(`Auto-filled account credentials`, 'success');
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
      showToast('Please enter Account ID / Email', 'error');
      return;
    }

    const cleanNumber = customerNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10) {
      showToast('Please enter a valid 10-digit WhatsApp number', 'error');
      return;
    }

    try {
      setIsSubmitting(true);

      const salePayload = {
        brandId,
        brandName: currentBrand?.displayName || currentBrand?.name || 'OTT',
        validity,
        activationDate,
        expiryDate,
        accountEmail: accountEmail.trim(),
        accountPassword: accountPassword.trim(),
        screenNumber: screenNumber.trim() || '01',
        screenPin: screenPin.trim() || '1111',
        amount: Number(amount) || 199,
        deviceName: deviceName.trim() || 'Personal Device',
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        referenceName: referenceName.trim(),
        referenceNumber: referenceNumber.trim(),
        inventoryId: selectedInventoryId || null
      };

      // 1). Format WhatsApp confirmation message and DIRECTLY open WhatsApp
      const waMsg = formatSaleConfirmationMessage({
        customerName: customerName.trim(),
        brandName: currentBrand?.displayName || currentBrand?.name || 'OTT',
        accountEmail: accountEmail.trim(),
        accountPassword: accountPassword.trim(),
        screenNumber: screenNumber.trim() || '01',
        screenPin: screenPin.trim() || '1111',
        deviceName: deviceName.trim(),
        validity,
        expiryDate
      });

      const waLink = buildWhatsAppLink(customerNumber.trim(), waMsg);
      // Immediately open WhatsApp in new window/app
      window.open(waLink, '_blank');

      // 2). Saves on DataBase
      await onSaleSuccess(salePayload);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      showToast('Saved to Database & WhatsApp opened!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ========================================================
  // VIEW: 3-COLUMN BRANDS GRID MATCHING image copy 13.png
  // ========================================================
  if (isPickingBrand) {
    return (
      <OttBrandsGrid
        brands={brands}
        onSelectBrand={handleSelectBrandInGrid}
        onBack={() => setIsPickingBrand(false)}
      />
    );
  }

  // ========================================================
  // VIEW: COMPACT SALE FORM ADJUSTED IN SCREEN (image copy 16 & 19)
  // ========================================================
  return (
    <div className="sale-form-compact" style={{ paddingBottom: '90px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '580px', margin: '0 auto' }}>
        
        {/* Row 1: Brand & Validity (with compact Expiry preview) */}
        <div className="sale-row-2-compact">
          {/* Brand Box -> Clicking opens Brands List (image copy 13.png) */}
          <div style={{ position: 'relative' }}>
            <div className="sale-label-compact">
              <span>Brand</span>
            </div>
            <div
              onClick={() => setIsPickingBrand(true)}
              id="sale-brand-dropdown-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '10px',
                background: currentBrand?.bgDark || '#000000',
                color: '#ffffff',
                cursor: 'pointer',
                border: '1.5px solid #334155',
                height: '40px',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <OttLogo brandId={currentBrand?.id} name={currentBrand?.displayName} size={26} />
                <span style={{ fontSize: '13.5px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentBrand?.displayName || currentBrand?.name || 'Select OTT'}
                </span>
              </div>
              <ChevronDown size={16} color="#ffffff" style={{ flexShrink: 0 }} />
            </div>
          </div>

          {/* Validity Box -> Professional Floating Popover (image copy 17.png) */}
          <div style={{ position: 'relative' }}>
            <div className="sale-label-compact">
              <span>Validity</span>
            </div>
            <div
              onClick={() => setShowValidityMenu(!showValidityMenu)}
              id="sale-validity-dropdown-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                border: '1.5px solid #cbd5e1',
                height: '40px',
                fontWeight: 800,
                fontSize: '13.5px',
                boxSizing: 'border-box'
              }}
            >
              <span>{validity}</span>
              <ChevronDown size={16} color="#64748b" />
            </div>

            {/* Professional Validity Popover matching image copy 17.png */}
            {showValidityMenu && (
              <div className="validity-popover-card">
                {validityOptions.map(opt => {
                  const isSelected = opt === validity;
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={`validity-option-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        setValidity(opt);
                        setShowValidityMenu(false);
                      }}
                    >
                      {isSelected && <Check size={14} strokeWidth={3} />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Date (From & To) below Brand & Validity (Requirement 1) */}
        <div className="sale-row-2-compact">
          {/* Date From */}
          <div>
            <div className="sale-label-compact">
              <span>Date (From)</span>
            </div>
            <div
              onClick={() => setShowFromDatePicker(true)}
              id="sale-from-date-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                border: '1.5px solid #cbd5e1',
                height: '40px',
                fontWeight: 800,
                fontSize: '13.5px',
                boxSizing: 'border-box'
              }}
            >
              <span>{activationDate}</span>
              <Calendar size={16} color="#64748b" />
            </div>
          </div>

          {/* Date To */}
          <div>
            <div className="sale-label-compact">
              <span>Date (To)</span>
            </div>
            <div
              onClick={() => setShowToDatePicker(true)}
              id="sale-to-date-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: '10px',
                background: '#ffffff',
                color: '#0f172a',
                cursor: 'pointer',
                border: '1.5px solid #cbd5e1',
                height: '40px',
                fontWeight: 800,
                fontSize: '13.5px',
                boxSizing: 'border-box'
              }}
            >
              <span>{expiryDate}</span>
              <Calendar size={16} color="#64748b" />
            </div>
          </div>
        </div>

        {/* Row 2: ID Row -> Name Left, Box Right (image copy 14.png) */}
        <div className="sale-horizontal-row">
          <div className="sale-field-badge blue">
            <User size={15} />
            <span>ID</span>
          </div>
          <div className="sale-horizontal-input-wrapper">
            <input
              type="text"
              className="sale-horizontal-input blue-theme"
              value={accountEmail}
              onChange={e => {
                setAccountEmail(e.target.value);
                setSelectedInventoryId(null);
              }}
              placeholder="Type ID or pick from dropdown"
              id="sale-account-email"
              style={{ paddingRight: brandAccounts.length > 0 ? '36px' : '10px' }}
              required
            />
            {brandAccounts.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                style={{
                  position: 'absolute',
                  right: '6px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2563eb',
                  padding: '4px'
                }}
                title="Select from existing accounts"
                id="sale-account-dropdown-toggle"
              >
                <ChevronDown size={18} />
              </button>
            )}

            {/* Account Selector Menu */}
            {showAccountMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  left: 0,
                  right: 0,
                  background: '#ffffff',
                  border: '1.5px solid #93c5fd',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                  zIndex: 220,
                  maxHeight: '190px',
                  overflowY: 'auto',
                  padding: '4px'
                }}
              >
                {brandAccounts.map((acc, idx) => {
                  const freeSlots = (acc.screens || []).filter(s => s.status === 'empty').length;
                  return (
                    <div
                      key={acc.id || idx}
                      onClick={() => handleSelectAccount(acc)}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: idx < brandAccounts.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: '#ffffff'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                    >
                      <span style={{ color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {acc.email}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        color: freeSlots > 0 ? '#16a34a' : '#dc2626',
                        background: freeSlots > 0 ? '#dcfce7' : '#fee2e2',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        whiteSpace: 'nowrap'
                      }}>
                        {freeSlots} free
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Password Row -> Name Left, Box Right (image copy 14.png) */}
        <div className="sale-horizontal-row">
          <div className="sale-field-badge purple">
            <Lock size={15} />
            <span>Password</span>
          </div>
          <div className="sale-horizontal-input-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              className="sale-horizontal-input purple-theme"
              value={accountPassword}
              onChange={e => setAccountPassword(e.target.value)}
              placeholder="Type password"
              id="sale-account-password"
              style={{ paddingRight: '40px' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#7e22ce',
                padding: '4px'
              }}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* Row 4: Screen No & Screen Pin */}
        <div className="sale-row-2-compact">
          <div>
            <div className="sale-label-compact">Screen No</div>
            <input
              type="text"
              className="sale-input-compact"
              value={screenNumber}
              onChange={e => setScreenNumber(e.target.value)}
              placeholder="e.g. Screen-2"
              id="sale-screen-number"
              style={{ background: '#fefce8', borderColor: '#fde047', color: '#854d0e', fontWeight: 800 }}
            />
          </div>

          <div>
            <div className="sale-label-compact">Screen Pin</div>
            <input
              type="text"
              className="sale-input-compact"
              value={screenPin}
              onChange={e => setScreenPin(e.target.value)}
              placeholder="e.g. 2222"
              id="sale-screen-pin"
              style={{ background: '#ecfeff', borderColor: '#a5f3fc', color: '#0e7490', fontWeight: 800 }}
            />
          </div>
        </div>

        {/* Row 5: Amount & Device Name */}
        <div className="sale-row-2-compact">
          <div>
            <div className="sale-label-compact">Amount</div>
            <input
              type="number"
              className="sale-input-compact"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Type Amount"
              id="sale-amount"
              style={{ fontWeight: 800 }}
            />
          </div>

          <div>
            <div className="sale-label-compact">Device Name</div>
            <input
              type="text"
              className="sale-input-compact"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="Type Device Name"
              id="sale-device-name"
            />
          </div>
        </div>

        {/* Customer Details Divider */}
        <div className="customer-divider-compact">
          Customer Details
        </div>

        {/* Row 6: Customer Name & Number */}
        <div className="sale-row-2-compact">
          <div>
            <div className="sale-label-compact">Name</div>
            <input
              type="text"
              className="sale-input-compact"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Type Name"
              id="sale-customer-name"
              required
            />
          </div>

          <div>
            <div className="sale-label-compact">Number</div>
            <input
              type="tel"
              className="sale-input-compact"
              value={customerNumber}
              onChange={e => setCustomerNumber(e.target.value)}
              placeholder="Type Number"
              id="sale-customer-number"
              required
            />
          </div>
        </div>

        {/* Row 7: Reference Name & Number */}
        <div className="sale-row-2-compact">
          <div>
            <div className="sale-label-compact">Reference Name</div>
            <input
              type="text"
              className="sale-input-compact"
              value={referenceName}
              onChange={e => setReferenceName(e.target.value)}
              placeholder="Type Reference Name"
              id="sale-reference-name"
            />
          </div>

          <div>
            <div className="sale-label-compact">Reference Number</div>
            <input
              type="tel"
              className="sale-input-compact"
              value={referenceNumber}
              onChange={e => setReferenceNumber(e.target.value)}
              placeholder="Type Reference Number"
              id="sale-reference-number"
            />
          </div>
        </div>

        {/* Big Orange Send Button (image copy 18.png) */}
        <button
          type="submit"
          className="glossy-btn glossy-btn-orange"
          style={{
            width: '100%',
            height: '46px',
            fontSize: '17px',
            fontWeight: 900,
            marginTop: '8px',
            borderRadius: '12px',
            letterSpacing: '0.5px'
          }}
          disabled={isSubmitting}
          id="sale-send-btn"
        >
          {isSubmitting ? 'Saving...' : 'Send'}
        </button>
      </form>

      {/* DatePicker Modals */}
      <DatePickerModal
        isOpen={showFromDatePicker}
        initialDate={activationDate}
        onSelect={(date) => {
          setActivationDate(date);
          if (validity) {
            setExpiryDate(calculateExpiryDate(date, validity));
          }
        }}
        onClose={() => setShowFromDatePicker(false)}
      />

      <DatePickerModal
        isOpen={showToDatePicker}
        initialDate={expiryDate}
        onSelect={(date) => {
          setExpiryDate(date);
        }}
        onClose={() => setShowToDatePicker(false)}
      />
    </div>
  );
}
