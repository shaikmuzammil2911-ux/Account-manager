import React, { useState, useEffect } from 'react';
import { Calendar, Eye, EyeOff, ChevronDown, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatDate, calculateExpiryDate } from '../utils/dateUtils';
import { api } from '../api/client';
import DatePickerModal from '../components/DatePickerModal';

export default function SaleScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  prefillData,
  onSaleSuccess,
  showToast
}) {
  const initialDateStr = formatDate(new Date());

  const [brandId, setBrandId] = useState(prefillData?.brandId || selectedBrand?.id || 'netflix');
  const [validity, setValidity] = useState(prefillData?.validity || '01 Month');
  const [activationDate, setActivationDate] = useState(prefillData?.activationDate || initialDateStr);
  const [expiryDate, setExpiryDate] = useState('');

  const [accountEmail, setAccountEmail] = useState(prefillData?.email || 'Fixyourmobiles@gmail.com');
  const [accountPassword, setAccountPassword] = useState(prefillData?.password || 'Netflix @@123');
  const [showPassword, setShowPassword] = useState(false);

  const [screenNumber, setScreenNumber] = useState(prefillData?.screenName || 'Screen-2');
  const [screenPin, setScreenPin] = useState(prefillData?.pin || '2222');
  const [amount, setAmount] = useState('199');
  const [deviceName, setDeviceName] = useState(prefillData?.deviceName || '');

  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [referenceName, setReferenceName] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  // Custom changeable fields config & values
  const [formConfig, setFormConfig] = useState(null);
  const [customFields, setCustomFields] = useState([]);
  const [customValues, setCustomValues] = useState({});

  // Dropdown & modal states
  const [showValidityMenu, setShowValidityMenu] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentBrand = brands.find(b => b.id === brandId) || selectedBrand || brands[0];

  // Load custom changeable fields configuration
  useEffect(() => {
    async function loadFormConfig() {
      try {
        const settings = await api.getSettings();
        if (settings.saleFormFields) {
          setFormConfig(settings.saleFormFields);
        }
        if (settings.customSaleFields) {
          setCustomFields(settings.customSaleFields);
        }
      } catch (err) {
        console.warn('Could not load sale form config', err);
      }
    }
    loadFormConfig();
  }, []);

  // Auto calculate expiry date when activation date or validity changes
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
    }
  }, [prefillData]);

  // Helper to check field config
  const isFieldEnabled = (key) => formConfig ? formConfig[key]?.enabled ?? true : true;
  const isFieldRequired = (key) => formConfig ? formConfig[key]?.required ?? false : false;
  const getFieldLabel = (key, defaultLabel) => formConfig ? formConfig[key]?.label || defaultLabel : defaultLabel;
  const getFieldPlaceholder = (key, defaultPh) => formConfig ? formConfig[key]?.placeholder || defaultPh : defaultPh;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check mandatory fields based on configuration
    if (isFieldRequired('customerName') && !customerName.trim()) {
      showToast(`Please enter ${getFieldLabel('customerName', 'Customer Name')}`, 'error');
      return;
    }
    if (isFieldRequired('customerNumber') && !customerNumber.trim()) {
      showToast(`Please enter ${getFieldLabel('customerNumber', 'Customer Phone Number')}`, 'error');
      return;
    }
    if (isFieldRequired('accountEmail') && !accountEmail.trim()) {
      showToast(`Please enter ${getFieldLabel('accountEmail', 'Account Email / ID')}`, 'error');
      return;
    }

    // Check custom fields requirements
    for (const cf of customFields) {
      if (cf.enabled && cf.required && !customValues[cf.id]?.trim()) {
        showToast(`Please fill ${cf.label}`, 'error');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const salePayload = {
        brandId,
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
        inventoryId: prefillData?.inventoryId || null,
        customValues
      };

      await onSaleSuccess(salePayload);

      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 }
      });

      showToast('Sale recorded and synced successfully!', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to submit sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validityOptions = currentBrand?.plans || ['01 Month', '03 Months', '06 Months', '12 Months'];

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      <form onSubmit={handleSubmit} id="new-sale-form">
        {/* Row 1: Brand & Validity */}
        <div className="form-row-2">
          {isFieldEnabled('brand') && (
            <div>
              <label className="form-label">{getFieldLabel('brand', 'Brand')}</label>
              <div
                style={{
                  background: '#000000',
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  minHeight: '40px'
                }}
                onClick={() => {
                  const nextIdx = (brands.findIndex(b => b.id === brandId) + 1) % brands.length;
                  if (brands[nextIdx]) {
                    setBrandId(brands[nextIdx].id);
                    if (onSelectBrand) onSelectBrand(brands[nextIdx]);
                  }
                }}
                title="Click to cycle brand"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {brandId === 'netflix' ? (
                    <span style={{ color: '#e50914', fontWeight: 900, letterSpacing: '1px', fontSize: '15px' }}>
                      N NETFLIX
                    </span>
                  ) : (
                    <span style={{ fontWeight: 800, fontSize: '13px' }}>
                      {currentBrand?.displayName || currentBrand?.name}
                    </span>
                  )}
                </div>
                <ChevronDown size={16} color="#ffffff" />
              </div>
            </div>
          )}

          {isFieldEnabled('validity') && (
            <div style={{ position: 'relative' }}>
              <label className="form-label">{getFieldLabel('validity', 'Validity')}</label>
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  minHeight: '40px'
                }}
                onClick={() => setShowValidityMenu(!showValidityMenu)}
                id="sale-validity-dropdown"
              >
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
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
          )}
        </div>

        {/* Row 2: Activation Date & Expiry Date */}
        <div className="form-row-2">
          {isFieldEnabled('activationDate') && (
            <div>
              <label className="form-label">{getFieldLabel('activationDate', 'Activation (DD-MM-YYYY)')}</label>
              <button
                type="button"
                className="form-input-pill green-theme"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  minHeight: '40px'
                }}
                onClick={() => setShowDatePicker(true)}
                id="sale-activation-date-btn"
              >
                <span>{activationDate}</span>
                <Calendar size={16} color="#15803d" />
              </button>
            </div>
          )}

          {isFieldEnabled('expiryDate') && (
            <div>
              <label className="form-label">{getFieldLabel('expiryDate', 'Expiry')}</label>
              <div
                className="form-input-pill"
                style={{
                  background: '#f8fafc',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 700,
                  color: '#334155'
                }}
              >
                {expiryDate || 'Calculating...'}
              </div>
            </div>
          )}
        </div>

        {/* Row 3: ID */}
        {isFieldEnabled('accountEmail') && (
          <div className="form-group">
            <label className="form-label">{getFieldLabel('accountEmail', 'ID')}</label>
            <input
              type="text"
              className="form-input-pill blue-theme"
              value={accountEmail}
              onChange={e => setAccountEmail(e.target.value)}
              placeholder={getFieldPlaceholder('accountEmail', 'Type account ID or email')}
              id="sale-account-email"
              required={isFieldRequired('accountEmail')}
            />
          </div>
        )}

        {/* Row 4: Password with toggle */}
        {isFieldEnabled('accountPassword') && (
          <div className="form-group">
            <label className="form-label">{getFieldLabel('accountPassword', 'Password')}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input-pill purple-theme"
                style={{ paddingRight: '40px' }}
                value={accountPassword}
                onChange={e => setAccountPassword(e.target.value)}
                placeholder={getFieldPlaceholder('accountPassword', 'Type password')}
                id="sale-account-password"
                required={isFieldRequired('accountPassword')}
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
        )}

        {/* Row 5: Screen No & Screen Pin */}
        <div className="form-row-2">
          {isFieldEnabled('screenNumber') && (
            <div>
              <label className="form-label">{getFieldLabel('screenNumber', 'Screen No')}</label>
              <input
                type="text"
                className="form-input-pill yellow-theme"
                value={screenNumber}
                onChange={e => setScreenNumber(e.target.value)}
                placeholder={getFieldPlaceholder('screenNumber', 'e.g. Screen-2')}
                id="sale-screen-number"
                required={isFieldRequired('screenNumber')}
              />
            </div>
          )}

          {isFieldEnabled('screenPin') && (
            <div>
              <label className="form-label">{getFieldLabel('screenPin', 'Screen Pin')}</label>
              <input
                type="text"
                className="form-input-pill cyan-theme"
                value={screenPin}
                onChange={e => setScreenPin(e.target.value)}
                placeholder={getFieldPlaceholder('screenPin', 'e.g. 2222')}
                id="sale-screen-pin"
                required={isFieldRequired('screenPin')}
              />
            </div>
          )}
        </div>

        {/* Row 6: Amount & Device Name */}
        <div className="form-row-2">
          {isFieldEnabled('amount') && (
            <div>
              <label className="form-label">{getFieldLabel('amount', 'Amount')}</label>
              <input
                type="number"
                className="form-input-pill"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder={getFieldPlaceholder('amount', 'Type Amount')}
                id="sale-amount"
                required={isFieldRequired('amount')}
              />
            </div>
          )}

          {isFieldEnabled('deviceName') && (
            <div>
              <label className="form-label">{getFieldLabel('deviceName', 'Device Name')}</label>
              <input
                type="text"
                className="form-input-pill"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                placeholder={getFieldPlaceholder('deviceName', 'Type Device Name')}
                id="sale-device-name"
                required={isFieldRequired('deviceName')}
              />
            </div>
          )}
        </div>

        {/* Custom Fields Configured by User */}
        {customFields.filter(f => f.enabled).length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            {customFields.filter(f => f.enabled).map(cf => (
              <div key={cf.id} className="form-group">
                <label className="form-label">{cf.label}</label>
                <input
                  type={cf.type || 'text'}
                  className="form-input-pill"
                  value={customValues[cf.id] || ''}
                  onChange={e => setCustomValues(prev => ({ ...prev, [cf.id]: e.target.value }))}
                  placeholder={cf.placeholder || `Enter ${cf.label}`}
                  required={cf.required}
                />
              </div>
            ))}
          </div>
        )}

        {/* Customer Details Section */}
        {(isFieldEnabled('customerName') || isFieldEnabled('customerNumber') || isFieldEnabled('referenceName') || isFieldEnabled('referenceNumber')) && (
          <>
            <div className="section-divider-title">
              Customer Details
            </div>

            <div className="form-row-2">
              {isFieldEnabled('customerName') && (
                <div>
                  <label className="form-label">{getFieldLabel('customerName', 'Name')}</label>
                  <input
                    type="text"
                    className="form-input-pill"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder={getFieldPlaceholder('customerName', 'Type Name')}
                    required={isFieldRequired('customerName')}
                    id="sale-customer-name"
                  />
                </div>
              )}

              {isFieldEnabled('customerNumber') && (
                <div>
                  <label className="form-label">{getFieldLabel('customerNumber', 'Number')}</label>
                  <input
                    type="tel"
                    className="form-input-pill"
                    value={customerNumber}
                    onChange={e => setCustomerNumber(e.target.value)}
                    placeholder={getFieldPlaceholder('customerNumber', 'Type Number')}
                    required={isFieldRequired('customerNumber')}
                    id="sale-customer-number"
                  />
                </div>
              )}
            </div>

            <div className="form-row-2">
              {isFieldEnabled('referenceName') && (
                <div>
                  <label className="form-label">{getFieldLabel('referenceName', 'Reference Name')}</label>
                  <input
                    type="text"
                    className="form-input-pill"
                    value={referenceName}
                    onChange={e => setReferenceName(e.target.value)}
                    placeholder={getFieldPlaceholder('referenceName', 'Type Reference Name')}
                    id="sale-reference-name"
                    required={isFieldRequired('referenceName')}
                  />
                </div>
              )}

              {isFieldEnabled('referenceNumber') && (
                <div>
                  <label className="form-label">{getFieldLabel('referenceNumber', 'Reference Number')}</label>
                  <input
                    type="tel"
                    className="form-input-pill"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                    placeholder={getFieldPlaceholder('referenceNumber', 'Type Reference Number')}
                    id="sale-reference-number"
                    required={isFieldRequired('referenceNumber')}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Big Orange Send Button */}
        <button
          type="submit"
          className="glossy-btn glossy-btn-orange"
          style={{
            width: '100%',
            padding: '14px',
            fontSize: '18px',
            marginTop: '16px',
            borderRadius: '14px',
            letterSpacing: '0.5px'
          }}
          disabled={isSubmitting}
          id="sale-send-btn"
        >
          {isSubmitting ? 'Saving & Syncing...' : 'Send'}
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
