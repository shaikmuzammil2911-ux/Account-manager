import React, { useState } from 'react';
import { X, Send, Copy, Check, MessageSquare } from 'lucide-react';
import { buildWhatsAppLink, formatCustomerMessage } from '../utils/whatsapp';

export default function NotifyModal({ isOpen, sale, onClose, onConfirmSent }) {
  if (!isOpen || !sale) return null;

  const defaultMsg = formatCustomerMessage({
    customerName: sale.customerName,
    brandName: sale.brandName,
    screenNumber: sale.screenNumber,
    screenPin: sale.screenPin,
    expiryDate: sale.expiryDate
  });

  const [message, setMessage] = useState(defaultMsg);
  const [copied, setCopied] = useState(false);

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '380px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ background: '#25d366', color: '#ffffff', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={16} />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Send WhatsApp Notice</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer Mini Summary */}
        <div style={{ background: '#f8fafc', padding: '10px 12px', borderRadius: '10px', marginBottom: '12px', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Recipient:</span>
            <strong style={{ color: '#0f172a' }}>{sale.customerName} ({sale.customerNumber})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Subscription:</span>
            <strong style={{ color: '#dc2626' }}>{sale.brandName} (Expires {sale.expiryDate})</strong>
          </div>
        </div>

        {/* Message Editor */}
        <div style={{ marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Message Preview:</label>
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
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontFamily: 'inherit',
              fontSize: '12.5px',
              lineHeight: '1.4',
              color: '#1e293b',
              resize: 'none'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-green"
            style={{ padding: '10px', fontSize: '14px', width: '100%', background: 'linear-gradient(180deg, #25d366 0%, #128c7e 100%)' }}
            onClick={handleSendViaWhatsApp}
          >
            <Send size={16} /> Open in WhatsApp
          </button>

          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ padding: '8px', fontSize: '12.5px', width: '100%' }}
            onClick={handleMarkNotifiedOnly}
          >
            Mark as Notified (No WhatsApp)
          </button>
        </div>
      </div>
    </div>
  );
}
