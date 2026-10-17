import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, ShoppingBag, Bell, Upload, Trash2, Image as ImageIcon,
  Save, RotateCcw, ArrowLeft, Check, Copy, ExternalLink, Sparkles, Send, CheckCheck
} from 'lucide-react';
import { api } from '../api/client';
import {
  DEFAULT_SALE_WHATSAPP_TEMPLATE,
  DEFAULT_EXPIRY_WHATSAPP_TEMPLATE,
  fillTemplate
} from '../utils/whatsapp';

export default function WhatsAppMessagesScreen({ onBack, showToast }) {
  // activeView: 'hub' | 'sale' | 'expiry'
  const [activeView, setActiveView] = useState('hub');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Sale Message Template State
  const [saleTemplate, setSaleTemplate] = useState(DEFAULT_SALE_WHATSAPP_TEMPLATE);

  // Expiry Message Template & Picture State
  const [expiryTemplate, setExpiryTemplate] = useState(DEFAULT_EXPIRY_WHATSAPP_TEMPLATE);
  const [expiryImage, setExpiryImage] = useState(null); // base64 data url or image url

  const fileInputRef = useRef(null);
  const saleTextareaRef = useRef(null);
  const expiryTextareaRef = useRef(null);

  // Sample mock data for live WhatsApp chat preview
  const mockSaleData = {
    customerName: 'Kishore Kumar',
    customerNumber: '9876543210',
    brandName: 'Netflix',
    planVariant: '4K Ultra HD',
    accountEmail: 'netflix.user01@gmail.com',
    accountPassword: 'Nfl!x2026@Secure',
    screenNumber: '02',
    screenPin: '2468',
    amount: '899',
    deviceName: 'Smart TV',
    validity: '03 Months',
    expiryDate: '17-Jan-2027',
    referenceName: 'Sunil',
    referenceNumber: '9123456780'
  };

  const mockExpiryData = {
    customerName: 'Kishore Kumar',
    customerNumber: '9876543210',
    brandName: 'Netflix',
    planVariant: '4K Ultra HD',
    screenNumber: '02',
    screenPin: '2468',
    validity: '03 Months',
    expiryDate: '19-Oct-2026',
    daysRemaining: '2',
    renewalAmount: '899'
  };

  // Load saved templates from API & localStorage
  useEffect(() => {
    async function load() {
      try {
        const settings = await api.getSettings();
        if (settings) {
          if (settings.whatsappSaleTemplate) {
            setSaleTemplate(settings.whatsappSaleTemplate);
          } else {
            const localSale = localStorage.getItem('accounts_whatsapp_sale_template');
            if (localSale) setSaleTemplate(localSale);
          }

          if (settings.whatsappExpiryTemplate) {
            setExpiryTemplate(settings.whatsappExpiryTemplate);
          } else {
            const localExpiry = localStorage.getItem('accounts_whatsapp_expiry_template');
            if (localExpiry) setExpiryTemplate(localExpiry);
          }

          if (settings.whatsappExpiryImage) {
            setExpiryImage(settings.whatsappExpiryImage);
          } else {
            const localImg = localStorage.getItem('accounts_whatsapp_expiry_image');
            if (localImg) setExpiryImage(localImg);
          }
        }
      } catch (e) {
        // Fallback to local storage
        const localSale = localStorage.getItem('accounts_whatsapp_sale_template');
        if (localSale) setSaleTemplate(localSale);
        const localExpiry = localStorage.getItem('accounts_whatsapp_expiry_template');
        if (localExpiry) setExpiryTemplate(localExpiry);
        const localImg = localStorage.getItem('accounts_whatsapp_expiry_image');
        if (localImg) setExpiryImage(localImg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Save Sale Message
  const handleSaveSaleTemplate = async () => {
    setSaving(true);
    try {
      localStorage.setItem('accounts_whatsapp_sale_template', saleTemplate);
      await api.updateSettings({
        whatsappSaleTemplate: saleTemplate
      });
      showToast('Sale WhatsApp Message template saved successfully!', 'success');
    } catch (err) {
      showToast('Saved locally in browser', 'info');
    } finally {
      setSaving(false);
    }
  };

  // Reset Sale Message
  const handleResetSaleTemplate = () => {
    setSaleTemplate(DEFAULT_SALE_WHATSAPP_TEMPLATE);
    localStorage.removeItem('accounts_whatsapp_sale_template');
    showToast('Reset to default sale message template', 'info');
  };

  // Save Expiry Message & Picture
  const handleSaveExpiryTemplate = async () => {
    setSaving(true);
    try {
      localStorage.setItem('accounts_whatsapp_expiry_template', expiryTemplate);
      if (expiryImage) {
        localStorage.setItem('accounts_whatsapp_expiry_image', expiryImage);
      } else {
        localStorage.removeItem('accounts_whatsapp_expiry_image');
      }

      await api.updateSettings({
        whatsappExpiryTemplate: expiryTemplate,
        whatsappExpiryImage: expiryImage || ''
      });
      showToast('Expiry WhatsApp Message & Picture saved successfully!', 'success');
    } catch (err) {
      showToast('Saved locally in browser', 'info');
    } finally {
      setSaving(false);
    }
  };

  // Reset Expiry Message
  const handleResetExpiryTemplate = () => {
    setExpiryTemplate(DEFAULT_EXPIRY_WHATSAPP_TEMPLATE);
    localStorage.removeItem('accounts_whatsapp_expiry_template');
    showToast('Reset to default expiry message template', 'info');
  };

  // Handle Image Upload
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size should be less than 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setExpiryImage(event.target.result);
      showToast('Picture uploaded successfully! Click "Save Template" to persist.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setExpiryImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Picture removed', 'info');
  };

  // Helper to insert tag at textarea cursor
  const insertTag = (tag, type) => {
    if (type === 'sale') {
      const textarea = saleTextareaRef.current;
      if (!textarea) {
        setSaleTemplate(prev => prev + ` {${tag}}`);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = saleTemplate;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = `${before}{${tag}}${after}`;
      setSaleTemplate(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length + 2;
      }, 50);
    } else {
      const textarea = expiryTextareaRef.current;
      if (!textarea) {
        setExpiryTemplate(prev => prev + ` {${tag}}`);
        return;
      }
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = expiryTemplate;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);
      const newText = `${before}{${tag}}${after}`;
      setExpiryTemplate(newText);
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + tag.length + 2;
      }, 50);
    }
  };

  // Sale tags available from Sale Form
  const saleTags = [
    { label: 'Customer Name', tag: 'customerName' },
    { label: 'Phone Number', tag: 'customerNumber' },
    { label: 'Brand Name', tag: 'brandName' },
    { label: 'Plan Variant', tag: 'planVariant' },
    { label: 'ID / Email', tag: 'accountEmail' },
    { label: 'Password', tag: 'accountPassword' },
    { label: 'Screen No', tag: 'screenNumber' },
    { label: 'Screen PIN', tag: 'screenPin' },
    { label: 'Amount', tag: 'amount' },
    { label: 'Validity', tag: 'validity' },
    { label: 'Expiry Date', tag: 'expiryDate' },
    { label: 'Device Name', tag: 'deviceName' },
    { label: 'Ref Name', tag: 'referenceName' }
  ];

  // Expiry tags available
  const expiryTags = [
    { label: 'Customer Name', tag: 'customerName' },
    { label: 'Brand Name', tag: 'brandName' },
    { label: 'Screen No', tag: 'screenNumber' },
    { label: 'Screen PIN', tag: 'screenPin' },
    { label: 'Expiry Date', tag: 'expiryDate' },
    { label: 'Days Left', tag: 'daysRemaining' },
    { label: 'Validity', tag: 'validity' },
    { label: 'Renewal Amount', tag: 'renewalAmount' }
  ];

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '10px' }}>
      {/* ===================================================================== */}
      {/* TOP HEADER SUB-BAR                                                   */}
      {/* ===================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          type="button"
          onClick={() => {
            if (activeView === 'hub') {
              if (onBack) onBack();
            } else {
              setActiveView('hub');
            }
          }}
          className="header-btn"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {activeView === 'hub' && 'Custom WhatsApp Message'}
            {activeView === 'sale' && 'Sale WhatsApp Message'}
            {activeView === 'expiry' && 'Expiry WhatsApp Message'}
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {activeView === 'hub' && 'Inside 02 Buttons: Sale & Expiry'}
            {activeView === 'sale' && 'Sale Form details & message template'}
            {activeView === 'expiry' && 'Upload picture & compose message'}
          </span>
        </div>

        <div style={{ width: '38px' }} />
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: HUB LANDING - 02 BUTTONS (as requested in image copy 66.png)  */}
      {/* ===================================================================== */}
      {activeView === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '8px' }}>
          {/* Info Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid #a7f3d0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              background: '#10b981',
              color: '#ffffff',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MessageSquare size={18} />
            </div>
            <div style={{ fontSize: '12.5px', color: '#065f46' }}>
              <strong>Customize WhatsApp Messages:</strong> Select an option below to configure automatic templates for customer sales and renewal alerts.
            </div>
          </div>

          {/* BUTTON 1: Sale Message */}
          <button
            type="button"
            className="menu-action-card"
            onClick={() => setActiveView('sale')}
            id="btn-custom-sale-message"
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1.5px solid #86efac',
              background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.08)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)',
              flexShrink: 0
            }}>
              <ShoppingBag size={24} strokeWidth={2.4} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  1). Sale Message
                </span>
                <span style={{
                  background: '#dcfce7',
                  color: '#15803d',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  Sale Form Details
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                Sale Form details will be there. Customize the WhatsApp message sent upon customer sale confirmation.
              </p>
            </div>
          </button>

          {/* BUTTON 2: Expiry / Notification Message */}
          <button
            type="button"
            className="menu-action-card"
            onClick={() => setActiveView('expiry')}
            id="btn-custom-expiry-message"
            style={{
              padding: '16px',
              borderRadius: '16px',
              border: '1.5px solid #fdba74',
              background: 'linear-gradient(135deg, #ffffff 0%, #fff7ed 100%)',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.08)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)',
              flexShrink: 0
            }}>
              <Bell size={24} strokeWidth={2.4} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>
                  2). Expiry Message
                </span>
                <span style={{
                  background: '#ffedd5',
                  color: '#c2410c',
                  fontSize: '10.5px',
                  fontWeight: 800,
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  Picture + Text
                </span>
              </div>
              <p style={{ fontSize: '12.5px', color: '#475569', marginTop: '4px', lineHeight: '1.4' }}>
                Upload picture / flyer option & Down WhatsApp message creating box for expiry and renewal reminders.
              </p>
            </div>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: SALE MESSAGE EDITOR                                           */}
      {/* ===================================================================== */}
      {activeView === 'sale' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> Click tags to insert Sale Form details:
              </span>
              <button
                type="button"
                onClick={handleResetSaleTemplate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={12} /> Reset Default
              </button>
            </div>

            {/* Clickable Variable Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '110px', overflowY: 'auto' }}>
              {saleTags.map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTag(item.tag, 'sale')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`Insert {${item.tag}}`}
                >
                  <span>{item.label}</span>
                  <span style={{ color: '#2563eb', fontSize: '10px' }}>+{`{${item.tag}}`}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Textarea Editor */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                WhatsApp Message Template:
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Use *bold* and _italic_
              </span>
            </div>

            <textarea
              ref={saleTextareaRef}
              rows={8}
              value={saleTemplate}
              onChange={e => setSaleTemplate(e.target.value)}
              placeholder="Type your custom sale WhatsApp message..."
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                lineHeight: '1.5',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Live Realistic WhatsApp Chat Preview */}
          <div style={{
            background: '#e5ddd5',
            borderRadius: '14px',
            border: '1.5px solid #d1d5db',
            padding: '14px 12px',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#374151'
            }}>
              <MessageSquare size={14} color="#15803d" />
              <span>Live WhatsApp Message Preview (Sample Customer):</span>
            </div>

            {/* Chat Bubble */}
            <div style={{
              background: '#d9fdd3',
              borderRadius: '10px',
              padding: '10px 12px',
              maxWidth: '92%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              position: 'relative',
              fontSize: '12.5px',
              lineHeight: '1.45',
              color: '#111827',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {fillTemplate(saleTemplate, mockSaleData)}

              {/* Message Meta */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '3px',
                marginTop: '6px',
                fontSize: '10px',
                color: '#667781'
              }}>
                <span>12:45 PM</span>
                <CheckCheck size={14} color="#53bdeb" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={() => setActiveView('hub')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-green"
              style={{ flex: 2, padding: '10px', borderRadius: '10px', fontWeight: 800 }}
              onClick={handleSaveSaleTemplate}
              disabled={saving}
              id="save-sale-whatsapp-btn"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Sale Message'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: EXPIRY MESSAGE EDITOR (with upload picture option)           */}
      {/* ===================================================================== */}
      {activeView === 'expiry' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* SECTION 1: UPLOAD PICTURE OPTION (as requested in prompt) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} /> 1. Upload Picture / Poster / Flyer:
              </span>
              {expiryImage && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    background: '#fee2e2',
                    border: '1px solid #fca5a5',
                    color: '#dc2626',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '6px',
                    padding: '3px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={12} /> Remove Picture
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageFileChange}
              id="expiry-image-file-input"
            />

            {!expiryImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #cbd5e1',
                  borderRadius: '10px',
                  padding: '20px 12px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#ffedd5',
                  color: '#ea580c',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '8px'
                }}>
                  <Upload size={20} />
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>
                  Click to Upload Expiry Reminder Flyer / Picture
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Supports PNG, JPG, WEBP (Max 3MB)
                </div>
              </div>
            ) : (
              <div style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1.5px solid #fdba74',
                background: '#000000',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                maxHeight: '180px'
              }}>
                <img
                  src={expiryImage}
                  alt="Expiry Reminder Poster"
                  style={{ maxHeight: '180px', width: 'auto', objectFit: 'contain' }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    color: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.4)',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  Change Picture
                </button>
              </div>
            )}
          </div>

          {/* SECTION 2: DOWN WHATSAPP MSG CREATING BOX (as requested in prompt) */}
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px solid #cbd5e1',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 800, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} /> 2. Down WhatsApp Message Creating Box:
              </span>
              <button
                type="button"
                onClick={handleResetExpiryTemplate}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <RotateCcw size={12} /> Reset Default
              </button>
            </div>

            {/* Clickable Variable Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
              {expiryTags.map(item => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => insertTag(item.tag, 'expiry')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={`Insert {${item.tag}}`}
                >
                  <span>{item.label}</span>
                  <span style={{ color: '#ea580c', fontSize: '10px' }}>+{`{${item.tag}}`}</span>
                </button>
              ))}
            </div>

            <textarea
              ref={expiryTextareaRef}
              rows={6}
              value={expiryTemplate}
              onChange={e => setExpiryTemplate(e.target.value)}
              placeholder="Compose your expiry notification WhatsApp message here..."
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                lineHeight: '1.5',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none'
              }}
            />
          </div>

          {/* Live Realistic WhatsApp Chat Preview (with Picture + Text) */}
          <div style={{
            background: '#e5ddd5',
            borderRadius: '14px',
            border: '1.5px solid #d1d5db',
            padding: '14px 12px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '8px',
              fontSize: '11.5px',
              fontWeight: 800,
              color: '#374151'
            }}>
              <MessageSquare size={14} color="#ea580c" />
              <span>Live WhatsApp Message Preview (Picture + Caption):</span>
            </div>

            {/* Chat Bubble with picture + text */}
            <div style={{
              background: '#d9fdd3',
              borderRadius: '10px',
              overflow: 'hidden',
              padding: '4px',
              maxWidth: '92%',
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              fontSize: '12.5px',
              lineHeight: '1.45',
              color: '#111827'
            }}>
              {/* Picture in preview if uploaded */}
              {expiryImage ? (
                <div style={{
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '6px',
                  maxHeight: '160px',
                  background: '#0f172a',
                  display: 'flex',
                  justifyContent: 'center'
                }}>
                  <img
                    src={expiryImage}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: '160px', objectFit: 'cover' }}
                  />
                </div>
              ) : (
                <div style={{
                  background: '#f1f5f9',
                  borderRadius: '8px',
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#64748b',
                  marginBottom: '6px',
                  border: '1px dashed #cbd5e1'
                }}>
                  [No Picture Uploaded - Message will be sent as text-only]
                </div>
              )}

              {/* Caption Text */}
              <div style={{
                padding: '4px 8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {fillTemplate(expiryTemplate, mockExpiryData)}
              </div>

              {/* Message Meta */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '3px',
                padding: '2px 8px 4px',
                fontSize: '10px',
                color: '#667781'
              }}>
                <span>09:15 AM</span>
                <CheckCheck size={14} color="#53bdeb" />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={() => setActiveView('hub')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-orange"
              style={{ flex: 2, padding: '10px', borderRadius: '10px', fontWeight: 800 }}
              onClick={handleSaveExpiryTemplate}
              disabled={saving}
              id="save-expiry-whatsapp-btn"
            >
              <Save size={16} />
              <span>{saving ? 'Saving...' : 'Save Expiry Message'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
