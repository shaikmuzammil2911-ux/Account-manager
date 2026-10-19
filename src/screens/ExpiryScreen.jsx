import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Clock, AlertTriangle, XCircle, User, Phone, Mail, Lock,
  CheckCircle2, Tv, Key, Calendar, Bell, Check, Layers, X
} from 'lucide-react';
import { api } from '../api/client';
import { getDaysDiff } from '../utils/dateUtils';

export default function ExpiryScreen({
  brands = [],
  selectedBrand,
  onOpenNotifyModal,
  initialFilter = 'ALL',
  showToast,
  dateFilter = '',
  onOpenDatePicker,
  onClearDateFilter
}) {
  // Bottom 4 urgency filters: 'ALL', 'in_02_days', 'today', 'expired'
  const [filter, setFilter] = useState(initialFilter);

  // Top 4 categorizations: Account, Validity, Brand, Notified
  const [groupByAccount, setGroupByAccount] = useState(false);
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterBrand, setFilterBrand] = useState(selectedBrand ? selectedBrand.id : 'all');
  const [filterNotified, setFilterNotified] = useState('all'); // 'all', 'pending', 'notified'

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sync with selectedBrand prop if it changes
  useEffect(() => {
    if (selectedBrand) {
      setFilterBrand(selectedBrand.id);
    }
  }, [selectedBrand]);

  const fetchExpiryList = async () => {
    try {
      setLoading(true);
      const data = await api.getExpiry({
        filter,
        brandId: 'all' // We fetch all and apply flexible client-side filters
      });
      setItems(data || []);
    } catch (err) {
      showToast('Failed to load expiry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryList();
  }, [filter]);

  // Handlers for Top 4 Buttons
  const toggleAccountGrouping = () => {
    setGroupByAccount(prev => {
      const next = !prev;
      showToast(next ? 'Grouped subscriptions by Account' : 'Showing all subscriptions', 'info');
      return next;
    });
  };

  const cycleValidity = () => {
    const list = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const idx = list.indexOf(filterValidity);
    const next = list[(idx + 1) % list.length];
    setFilterValidity(next);
    showToast(next === 'all' ? 'Showing all validities' : `Filtered: ${next}`, 'info');
  };

  const cycleBrand = () => {
    const availableBrandIds = ['all', ...(brands || []).map(b => b.id)];
    const uniqueBrandIds = Array.from(new Set(availableBrandIds));
    const idx = uniqueBrandIds.indexOf(filterBrand);
    const next = uniqueBrandIds[(idx + 1) % uniqueBrandIds.length];
    setFilterBrand(next);
    if (next === 'all') {
      showToast('Showing all brands', 'info');
    } else {
      const bObj = (brands || []).find(b => b.id === next);
      showToast(`Brand: ${bObj?.displayName || next}`, 'info');
    }
  };

  const cycleNotified = () => {
    const list = ['all', 'pending', 'notified'];
    const idx = list.indexOf(filterNotified);
    const next = list[(idx + 1) % list.length];
    setFilterNotified(next);
    if (next === 'all') showToast('Showing all notification statuses', 'info');
    else if (next === 'pending') showToast('Showing Pending Notifications only', 'info');
    else showToast('Showing Sent Notifications only', 'info');
  };

  const getBrandShortName = (brandId) => {
    const b = (brands || []).find(b => b.id === brandId);
    if (b?.displayName) return b.displayName.split(' ')[0];
    return brandId.toUpperCase().slice(0, 7);
  };

  // Helper to render Highlighted Expiry Date Badge on Top Right
  const renderHighlightedExpiryBadge = (sub) => {
    const diff = sub.daysRemaining !== undefined ? sub.daysRemaining : getDaysDiff(sub.expiryDate);
    let bg = 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)';
    let border = '1.5px solid #2563eb';
    let color = '#1e40af';
    let shadow = '0 2px 8px rgba(37, 99, 235, 0.22)';
    let iconColor = '#2563eb';

    if (diff < 0) {
      // Expired: High-visibility Red badge
      bg = 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)';
      border = '1.5px solid #dc2626';
      color = '#991b1b';
      shadow = '0 2px 8px rgba(220, 38, 38, 0.32)';
      iconColor = '#dc2626';
    } else if (diff === 0) {
      // Today: Vibrant Orange badge
      bg = 'linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%)';
      border = '1.5px solid #ea580c';
      color = '#9a3412';
      shadow = '0 2px 8px rgba(234, 88, 12, 0.32)';
      iconColor = '#ea580c';
    } else if (diff <= 2) {
      // in 02 Days: Amber alert badge
      bg = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      border = '1.5px solid #d97706';
      color = '#92400e';
      shadow = '0 2px 8px rgba(217, 119, 6, 0.28)';
      iconColor = '#d97706';
    }

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          background: bg,
          border: border,
          color: color,
          boxShadow: shadow,
          fontSize: '12px',
          fontWeight: 900,
          letterSpacing: '-0.2px',
          whiteSpace: 'nowrap'
        }}
        title={`Expiry Date: ${sub.expiryDate}`}
      >
        <Calendar size={13} strokeWidth={2.5} color={iconColor} />
        <span>{sub.expiryDate}</span>
      </div>
    );
  };

  // Filter items through top 4 button conditions and date filter
  const filteredItems = items.filter(sub => {
    // 1. Validity filter
    if (filterValidity !== 'all' && sub.validity !== filterValidity) {
      return false;
    }
    // 2. Brand filter
    if (filterBrand !== 'all') {
      const bId = (sub.brandId || '').toLowerCase();
      const bName = (sub.brandName || '').toLowerCase();
      const target = filterBrand.toLowerCase();
      if (bId !== target && !bName.includes(target)) {
        return false;
      }
    }
    // 3. Notified filter
    if (filterNotified === 'pending' && sub.notificationSent) {
      return false;
    }
    if (filterNotified === 'notified' && !sub.notificationSent) {
      return false;
    }
    // 4. Calendar Date filter
    if (dateFilter) {
      const subExp = (sub.expiryDate || '').trim();
      if (subExp !== dateFilter.trim()) {
        return false;
      }
    }
    return true;
  });

  // Group by Account if groupByAccount is true
  const accountGroups = [];
  if (groupByAccount) {
    const accMap = new Map();
    filteredItems.forEach(sub => {
      const emailKey = (sub.accountEmail || 'Unassigned').toLowerCase().trim();
      if (!accMap.has(emailKey)) {
        accMap.set(emailKey, {
          email: sub.accountEmail || 'Unassigned',
          password: sub.accountPassword || '',
          brandId: sub.brandId,
          brandName: sub.brandName,
          items: []
        });
      }
      accMap.get(emailKey).items.push(sub);
    });
    accMap.forEach(group => accountGroups.push(group));
  }

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* =================================================================== */}
      {/* ROW 1: TOP 4 BUTTONS: Account, Validity, Brand, Notified           */}
      {/* =================================================================== */}
      <div className="filter-bar-4" style={{ marginBottom: '8px' }}>
        {/* 1. Account Button */}
        <button
          type="button"
          className={`filter-pill-btn ${groupByAccount ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          style={{
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px'
          }}
          onClick={toggleAccountGrouping}
          id="expiry-filter-account"
          title={groupByAccount ? 'Current: Grouped by Account. Click for Flat list' : 'Click to Group by Account'}
        >
          <Layers size={13} strokeWidth={2.3} />
          <span>{groupByAccount ? 'Grouped' : 'Account'}</span>
        </button>

        {/* 2. Validity Button */}
        <button
          type="button"
          className={`filter-pill-btn ${filterValidity !== 'all' ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          style={{
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px',
            background: filterValidity !== 'all' ? 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' : undefined,
            color: filterValidity !== 'all' ? '#ffffff' : undefined,
            borderColor: filterValidity !== 'all' ? '#6d28d9' : undefined
          }}
          onClick={cycleValidity}
          id="expiry-filter-validity"
          title={filterValidity === 'all' ? 'Filter by Validity' : `Validity: ${filterValidity}`}
        >
          <Clock size={13} strokeWidth={2.3} />
          <span>
            {filterValidity === 'all'
              ? 'Validity'
              : filterValidity.replace(' Months', 'M').replace(' Month', 'M')}
          </span>
        </button>

        {/* 3. Brand Button */}
        <button
          type="button"
          className={`filter-pill-btn ${filterBrand !== 'all' ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          style={{
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px',
            background: filterBrand !== 'all' ? 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)' : undefined,
            color: filterBrand !== 'all' ? '#ffffff' : undefined,
            borderColor: filterBrand !== 'all' ? '#c2410c' : undefined
          }}
          onClick={cycleBrand}
          id="expiry-filter-brand"
          title={filterBrand === 'all' ? 'Filter by Brand' : `Brand: ${filterBrand}`}
        >
          <Tv size={13} strokeWidth={2.3} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {filterBrand === 'all' ? 'Brand' : getBrandShortName(filterBrand)}
          </span>
        </button>

        {/* 4. Notified Button */}
        <button
          type="button"
          className={`filter-pill-btn ${filterNotified !== 'all' ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          style={{
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px',
            background: filterNotified === 'pending'
              ? 'linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)'
              : filterNotified === 'notified'
                ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                : undefined,
            color: filterNotified !== 'all' ? '#ffffff' : undefined,
            borderColor: filterNotified === 'pending' ? '#be123c' : filterNotified === 'notified' ? '#15803d' : undefined
          }}
          onClick={cycleNotified}
          id="expiry-filter-notified"
          title={filterNotified === 'all' ? 'Filter by Notification status' : `Notification: ${filterNotified}`}
        >
          <Bell size={13} strokeWidth={2.3} />
          <span>
            {filterNotified === 'all' ? 'Notified' : filterNotified === 'pending' ? 'Pending' : 'Sent'}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ROW 2: 4 URGENCY FILTERS BAR (ALL, in 02 Days, Today, Expired)      */}
      {/* =================================================================== */}
      <div className="filter-bar-4" style={{ marginBottom: dateFilter ? '10px' : '14px' }}>
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

      {/* =================================================================== */}
      {/* DATE ACTIVE FILTER STRIP (from Top Header Calendar)                */}
      {/* =================================================================== */}
      {dateFilter && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#eff6ff',
          border: '1.5px solid #93c5fd',
          padding: '8px 12px',
          borderRadius: '10px',
          marginBottom: '14px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#2563eb" strokeWidth={2.3} />
            <span style={{ color: '#1e40af', fontWeight: 800 }}>
              Expiry Date Filter: <strong>{dateFilter}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={onClearDateFilter}
            style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              color: '#dc2626',
              borderRadius: '6px',
              padding: '3px 8px',
              fontSize: '11.5px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
            title="Clear Date Filter"
          >
            <X size={13} />
            <span>Clear</span>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* EXPIRY CONTENT: Grouped by Account VS Flat Cards List              */}
      {/* =================================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading expiry records...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>No subscriptions match active filters.</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Try resetting Brand, Validity, Notified, or Date filters.</p>
        </div>
      ) : groupByAccount ? (
        /* ----------------------------------------------------------------- */
        /* GROUPED BY ACCOUNT VIEW                                           */
        /* ----------------------------------------------------------------- */
        accountGroups.map((group, gIdx) => (
          <div
            key={group.email + gIdx}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1.5px solid #cbd5e1',
              padding: '12px 14px',
              marginBottom: '16px',
              boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
            }}
          >
            {/* Account Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#2563eb'
                }}>
                  <Mail size={16} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {group.email}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                    Password: {group.password || '••••••••'}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                borderRadius: '8px',
                padding: '4px 8px',
                fontSize: '11.5px',
                fontWeight: 900,
                whiteSpace: 'nowrap'
              }}>
                {group.items.length} Expiring
              </div>
            </div>

            {/* Screens under this Account */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.items.map((sub, sIdx) => (
                <div
                  key={sub.id || sIdx}
                  style={{
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '10px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        background: '#e0f2fe',
                        color: '#0369a1',
                        border: '1px solid #bae6fd',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '11px',
                        fontWeight: 900
                      }}>
                        {sub.screenNumber ? `Screen-${sub.screenNumber}` : `Screen-${sIdx + 1}`}
                      </span>
                      {sub.screenPin && (
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                          PIN: {sub.screenPin}
                        </span>
                      )}
                    </div>

                    {/* Highlighted Expiry Date Badge on Top Right */}
                    {renderHighlightedExpiryBadge(sub)}
                  </div>

                  {/* Customer details & notify button */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {sub.customerName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                        {sub.customerNumber}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="glossy-btn glossy-btn-red"
                      style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '8px' }}
                      onClick={() => onOpenNotifyModal(sub)}
                    >
                      <Bell size={13} />
                      <span>Notify</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        /* ----------------------------------------------------------------- */
        /* STANDARD CARDS VIEW (Matching image copy 97 / image copy 4)       */
        /* ----------------------------------------------------------------- */
        filteredItems.map((sub, sIdx) => {
          const isSecondCard = sIdx % 2 === 1;

          return (
            <div
              key={sub.id || sIdx}
              className="inventory-card"
              style={{
                border: isSecondCard ? '1.5px solid #bfdbfe' : '1.5px solid #fecaca',
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)'
              }}
              id={`expiry-card-${sub.recordNumber || sIdx + 1}`}
            >
              {/* Card Header: Ribbon, Brand Badge, HIGHLIGHTED Expiry Date */}
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
                    fontSize: '12px',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }}
                >
                  {sub.brandId === 'netflix' ? (
                    <span style={{ color: '#e50914', letterSpacing: '0.8px' }}>N NETFLIX</span>
                  ) : (
                    <span>{sub.brandName}</span>
                  )}
                </div>

                {/* Top Right Expiry Date - HIGHLIGHTED FOR ALL USERS */}
                {renderHighlightedExpiryBadge(sub)}
              </div>

              {/* Row 1: NAME & NUMBER */}
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

              {/* Row 2: MAIL ID & PASSWORD */}
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

              {/* Row 3: VALIDITY, SCREEN, PIN */}
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

              {/* Row 4: ACTIVATION, DEVICE, and NOTIFY BUTTON */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'center' }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800 }}>ACTIVATION</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>{sub.activationDate}</div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px', textAlign: 'center', overflow: 'hidden' }}>
                  <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: 800 }}>DEVICE</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.deviceName || sub.device || 'TV / Mobile'}>
                    {sub.deviceName || sub.device || 'TV / Mobile'}
                  </div>
                </div>

                {/* Big Red Notify Button */}
                <button
                  type="button"
                  className="glossy-btn glossy-btn-red"
                  style={{ padding: '8px 4px', fontSize: '13px', height: '100%' }}
                  onClick={() => onOpenNotifyModal(sub)}
                  id={`notify-btn-${sub.recordNumber || sIdx + 1}`}
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
