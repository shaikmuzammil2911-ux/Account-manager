import React, { useState, useEffect } from 'react';
import { X, Send, Copy, Check, MessageSquare, Download, Share2, Image as ImageIcon, Star } from 'lucide-react';
import { buildWhatsAppLink, fillTemplate, DEFAULT_EXPIRY_WHATSAPP_TEMPLATE } from '../utils/whatsapp';
import { api } from '../api/client';

export default function NotifyModal({ isOpen, sale, currentUser, onClose, onConfirmSent }) {
  if (!isOpen || !sale) return null;

  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [settingDefault, setSettingDefault] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Helper to format message with customer data
  const computeMessage = (templateContent) => {
    return fillTemplate(templateContent, {
      customerName: sale.customerName,
      customerNumber: sale.customerNumber || sale.customerPhone || '',
      brandName: sale.brandName,
      pricingPlan: sale.pricingPlan || sale.planVariant || 'General',
      planVariant: sale.pricingPlan || sale.planVariant || 'General',
      accountEmail: sale.accountEmail,
      accountPassword: sale.accountPassword,
      screenNumber: sale.screenNumber,
      screenPin: sale.screenPin,
      deviceName: sale.deviceName,
      validity: sale.validity,
      activationDate: sale.date || sale.activationDate,
      expiryDate: sale.expiryDate,
      amount: sale.amount,
      renewalAmount: sale.amount,
      referenceName: sale.referenceName || '',
      referenceNumber: sale.referenceNumber || ''
    });
  };

  // Load Expiry templates from settings
  useEffect(() => {
    async function load() {
      try {
        const settings = await api.getSettings(currentUser?.email);
        const allTemplates = Array.isArray(settings?.whatsappTemplates) ? settings.whatsappTemplates : [];
        const expiryTemplates = allTemplates.filter(t => t.categoryId === 'expiry');

        if (expiryTemplates.length > 0) {
          setTemplates(expiryTemplates);
          const active = expiryTemplates.find(t => t.isActive) || expiryTemplates[0];
          setSelectedTemplateId(active.id);
          setSelectedImage(active.imageUrl || null);
          setMessage(computeMessage(active.content));
        } else {
          // Fallback to default
          const fallback = settings?.whatsappExpiryTemplate || DEFAULT_EXPIRY_WHATSAPP_TEMPLATE;
          setMessage(computeMessage(fallback));
          setSelectedImage(settings?.whatsappExpiryImage || null);
        }
      } catch (e) {
        setMessage(computeMessage(DEFAULT_EXPIRY_WHATSAPP_TEMPLATE));
      }
    }
    load();
  }, [sale, currentUser]);

  // Handle switching template from compact selector
  const handleSelectTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    const chosen = templates.find(t => t.id === templateId);
    if (chosen) {
      setMessage(computeMessage(chosen.content));
      setSelectedImage(chosen.imageUrl || null);
    }
  };

  // Handle Set As Default
  const handleSetAsDefault = async () => {
    if (!selectedTemplateId) return;
    setSettingDefault(true);
    try {
      const updatedList = templates.map(t => ({
        ...t,
        isActive: t.id === selectedTemplateId
      }));
      await api.updateSettings({
        whatsappTemplates: updatedList
      }, currentUser?.email);

      setTemplates(updatedList);
    } catch (e) {
      console.warn('Set default error:', e);
    } finally {
      setSettingDefault(false);
    }
  };

  // Handle flyer download
  const handleDownloadFlyer = () => {
    if (!selectedImage) return;
    try {
      const a = document.createElement('a');
      a.href = selectedImage;
      a.download = `${sale.brandName || 'Subscription'}_Renewal_Flyer.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {}
  };

  const whatsappUrl = buildWhatsAppLink(sale.customerNumber, message);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendViaWhatsApp = () => {
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    onConfirmSent(sale.id);
    onClose();
  };

  const handleMarkNotifiedOnly = () => {
    onConfirmSent(sale.id);
    onClose();
  };

  const activeTemplateObj = templates.find(t => t.id === selectedTemplateId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', borderRadius: '18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#25d366', color: '#ffffff', width: '30px', height: '30px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Send Expiry / Renewal Notice
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer Mini Summary */}
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '12px', marginBottom: '12px', fontSize: '12.5px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Recipient:</span>
            <strong style={{ color: '#0f172a' }}>{sale.customerName} ({sale.customerNumber || 'No phone'})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Subscription:</span>
            <strong style={{ color: '#dc2626' }}>{sale.brandName} (Expires {sale.expiryDate || 'N/A'})</strong>
          </div>
        </div>

        {/* Template Selector */}
        {templates.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                SELECT SAVED EXPIRY TEMPLATE:
              </label>
              {activeTemplateObj && !activeTemplateObj.isActive && (
                <button
                  type="button"
                  onClick={handleSetAsDefault}
                  disabled={settingDefault}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}
                >
                  <Star size={11} fill="#2563eb" />
                  <span>{settingDefault ? 'Saving...' : 'Set as default'}</span>
                </button>
              )}
            </div>

            <select
              value={selectedTemplateId || ''}
              onChange={e => handleSelectTemplate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0f172a',
                background: '#ffffff'
              }}
            >
              {templates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.isActive ? '★ (Active Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Attached Flyer Preview & Download */}
        {selectedImage && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            padding: '8px 10px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <img
                src={selectedImage}
                alt="Flyer"
                style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }}
              />
              <div>
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  Flyer Picture Attached
                </span>
                <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                  Download to share on WhatsApp
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDownloadFlyer}
              style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Download size={12} />
              <span>Save Flyer</span>
            </button>
          </div>
        )}

        {/* Message Editor */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>MESSAGE PREVIEW:</label>
            <button
              type="button"
              onClick={handleCopy}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'transparent', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
          </div>
          <textarea
            rows={6}
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              lineHeight: '1.45',
              color: '#1e293b',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-green"
            style={{ padding: '10px', fontSize: '13.5px', width: '100%', background: 'linear-gradient(180deg, #25d366 0%, #128c7e 100%)', borderRadius: '10px' }}
            onClick={handleSendViaWhatsApp}
          >
            <Send size={15} /> Open in WhatsApp
          </button>

          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ padding: '8px', fontSize: '12px', width: '100%', borderRadius: '10px' }}
            onClick={handleMarkNotifiedOnly}
          >
            Mark as Notified (No WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}
