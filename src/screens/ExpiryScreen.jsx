import React, { useState, useEffect } from 'react';
import { LayoutGrid, Clock, AlertTriangle, XCircle, User, Phone, Mail, Lock, CheckCircle2, Tv, Key, Calendar, Bell, Check } from 'lucide-react';
import { api } from '../api/client';

export default function ExpiryScreen({
  selectedBrand,
  onOpenNotifyModal,
  initialFilter = 'ALL',
  showToast
}) {
  const [filter, setFilter] = useState(initialFilter); // 'ALL', 'in_02_days', 'today', 'expired'
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchExpiryList = async () => {
    try {
      setLoading(true);
      const data = await api.getExpiry({
        filter,
        brandId: selectedBrand?.id || 'all'
      });
      setItems(data);
    } catch (err) {
      showToast('Failed to load expiry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryList();
  }, [filter, selectedBrand]);

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Top 4 Filters Bar Matching image copy 4.png */}
      <div className="filter-bar-4">
        {/* 1. ALL (Blue) */}
        <button
          type="button"
          className={`filter-pill-btn ${filter === 'ALL' ? 'glossy-btn-blue' : 'glossy-btn-gray'}`}
          onClick={() => setFilter('ALL')}
          id="expiry-filter-all"
        >
          <LayoutGrid size={13} />
          <span>ALL</span>
        </button>

        {/* 2. in 02 Days (Yellow/Amber) */}
        <button
          type="button"
          className={`filter-pill-btn ${filter === 'in_02_days' ? 'glossy-btn-yellow' : 'glossy-btn-gray'}`}
          onClick={() => setFilter('in_02_days')}
          id="expiry-filter-in-02-days"
        >
          <Clock size={13} />
          <span>in 02 Days</span>
        </button>

        {/* 3. Today (Orange) */}
        <button
          type="button"
          className={`filter-pill-btn ${filter === 'today' ? 'glossy-btn-orange' : 'glossy-btn-gray'}`}
          onClick={() => setFilter('today')}
          id="expiry-filter-today"
        >
          <AlertTriangle size={13} />
          <span>Today</span>
        </button>

        {/* 4. Expired (Red) */}
        <button
          type="button"
          className={`filter-pill-btn ${filter === 'expired' ? 'glossy-btn-red' : 'glossy-btn-gray'}`}
          onClick={() => setFilter('expired')}
          id="expiry-filter-expired"
        >
          <XCircle size={13} />
          <span>Expired</span>
        </button>
      </div>

      {/* Expiry Cards List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading expiry records...
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>No subscriptions found in this category.</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Try switching to the "ALL" filter.</p>
        </div>
      ) : (
        items.map((sub, sIdx) => {
          const isSecondCard = sIdx % 2 === 1;

          return (
            <div
              key={sub.id || sIdx}
              className="inventory-card"
              style={{
                border: isSecondCard ? '1.5px solid #bfdbfe' : '1.5px solid #fecaca',
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '16px'
              }}
              id={`expiry-card-${sub.recordNumber}`}
            >
              {/* Card Header: Ribbon, Brand Badge, Expiry Date */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div className={`ribbon-badge ${isSecondCard ? 'blue' : ''}`}>
                  {sub.recordNumber || String(sIdx + 1).padStart(2, '0')}
                </div>

                {/* Brand Badge */}
                <div
                  style={{
                    background: sub.brandId === 'netflix' ? '#000000' : '#0284c7',
                    color: '#ffffff',
                    padding: '3px 12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontWeight: 900,
                    fontSize: '12px'
                  }}
                >
                  {sub.brandId === 'netflix' ? (
                    <span style={{ color: '#e50914', letterSpacing: '0.8px' }}>N NETFLIX</span>
                  ) : (
                    <span>{sub.brandName}</span>
                  )}
                </div>

                {/* Top Expiry Date Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  <Calendar size={13} color="#dc2626" />
                  <span>{sub.expiryDate}</span>
                </div>
              </div>

              {/* NAME & NUMBER */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>NAME</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    <User size={13} color="#64748b" />
                    <span>{sub.customerName}</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>NUMBER</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    <Phone size={13} color="#64748b" />
                    <span>{sub.customerNumber}</span>
                  </div>
                </div>
              </div>

              {/* MAIL ID & PASSWORD */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>MAIL ID</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <Mail size={13} color="#64748b" />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{sub.accountEmail}</span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    <Lock size={13} color="#64748b" />
                    <span>{sub.accountPassword}</span>
                  </div>
                </div>
              </div>

              {/* VALIDITY, SCREEN, PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '8px', padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9.5px', color: '#7c3aed', fontWeight: 800 }}>VALIDITY</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#6b21a8' }}>
                    <CheckCircle2 size={12} color="#7c3aed" />
                    <span>{sub.validity}</span>
                  </div>
                </div>

                <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9.5px', color: '#6366f1', fontWeight: 800 }}>SCREEN</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#4338ca' }}>
                    <Tv size={12} color="#6366f1" />
                    <span>{sub.screenNumber}</span>
                  </div>
                </div>

                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9.5px', color: '#d97706', fontWeight: 800 }}>PIN</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>
                    <Key size={12} color="#d97706" />
                    <span>{sub.screenPin}</span>
                  </div>
                </div>
              </div>

              {/* ACTIVATION, EXPIRY, and NOTIFY BUTTON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'center' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800 }}>ACTIVATION</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>{sub.activationDate}</div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 800 }}>EXPIRY</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#b91c1c' }}>{sub.expiryDate}</div>
                </div>

                {/* Big Red Notify Button */}
                <button
                  type="button"
                  className="glossy-btn glossy-btn-red"
                  style={{ padding: '8px 4px', fontSize: '13px', height: '100%' }}
                  onClick={() => onOpenNotifyModal(sub)}
                  id={`notify-btn-${sub.recordNumber}`}
                >
                  <Bell size={15} />
                  <span>Notify</span>
                </button>
              </div>

              {/* Notification Status Badge if already sent */}
              {sub.notificationSent && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                  <Check size={12} />
                  <span>Notification sent on {sub.lastNotifiedAt?.slice(0, 10)}</span>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
