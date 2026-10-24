import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';

export default function DeleteSaleModal({
  isOpen,
  sale,
  origin = 'recent-sales', // 'recent-sales' | 'expiry'
  onClose,
  onConfirm
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !sale) return null;

  const promptText = origin === 'expiry'
    ? 'Delete this sale? It will also be removed from Recent Sales and sales totals.'
    : 'Delete this sale? It will also be removed from customer expiry and sales totals.';

  const customerDisplay = sale.customerName || sale.customerNumber || 'Customer';
  const brandDisplay = sale.brandName || 'OTT Service';
  const screenDisplay = sale.screenNumber
    ? (String(sale.screenNumber).startsWith('0') || String(sale.screenNumber).toLowerCase().includes('screen')
        ? String(sale.screenNumber)
        : `Screen ${String(sale.screenNumber).padStart(2, '0')}`)
    : 'Screen 01';

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm(sale);
      setIsDeleting(false);
      onClose();
    } catch (err) {
      setIsDeleting(false);
      setError(err?.message || 'Failed to delete sale. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={isDeleting ? undefined : onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '400px',
          width: '92%',
          borderRadius: '16px',
          padding: '20px 18px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.22)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                background: '#fee2e2',
                color: '#dc2626',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Trash2 size={20} strokeWidth={2.4} />
            </div>
            <div>
              <h3 style={{ fontSize: '16.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Delete Sale
              </h3>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                Permanent removal of customer record
              </div>
            </div>
          </div>
          {!isDeleting && (
            <button
              type="button"
              onClick={onClose}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '4px' }}
              title="Close"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sale Details Box */}
        <div
          style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            marginBottom: '14px',
            fontSize: '13px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Customer:</span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>{customerDisplay}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Brand:</span>
            <span style={{ fontWeight: 800, color: '#0284c7' }}>{brandDisplay}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: sale.accountEmail ? '6px' : '0' }}>
            <span style={{ color: '#64748b', fontWeight: 600 }}>Screen:</span>
            <span style={{ fontWeight: 800, color: '#0f172a' }}>{screenDisplay}</span>
          </div>
          {sale.accountEmail && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Account:</span>
              <span
                style={{
                  fontWeight: 700,
                  color: '#475569',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {sale.accountEmail}
              </span>
            </div>
          )}
        </div>

        {/* Warning / Prompt */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '10px 12px',
            background: '#fff1f2',
            border: '1px solid #fecdd3',
            borderRadius: '10px',
            marginBottom: '16px',
            color: '#9f1239',
            fontSize: '12.5px',
            lineHeight: 1.45,
            fontWeight: 600
          }}
        >
          <AlertTriangle size={18} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: '2px', color: '#e11d48' }} />
          <span>{promptText}</span>
        </div>

        {/* Error message if deletion failed */}
        {error && (
          <div
            style={{
              padding: '8px 12px',
              background: '#fef2f2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '12px',
              fontWeight: 700,
              marginBottom: '12px'
            }}
          >
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{
              padding: '10px',
              fontSize: '13.5px',
              fontWeight: 800,
              borderRadius: '10px',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              opacity: isDeleting ? 0.6 : 1
            }}
            disabled={isDeleting}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            style={{
              padding: '10px',
              fontSize: '13.5px',
              fontWeight: 900,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            disabled={isDeleting}
            onClick={handleDelete}
            id="modal-confirm-delete-sale-btn"
          >
            {isDeleting ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} strokeWidth={2.4} />
                <span>Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
