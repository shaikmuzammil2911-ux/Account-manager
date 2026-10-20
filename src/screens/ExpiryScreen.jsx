import React, { useState, useEffect } from 'react';
import {
  LayoutGrid, Clock, AlertTriangle, XCircle, User, Phone, Mail, Lock,
  CheckCircle2, Tv, Key, Calendar, Bell, Check, Layers, X, Search,
  FileSpreadsheet, Download, RefreshCw, Smartphone, Laptop
} from 'lucide-react';
import { api } from '../api/client';
import { getDaysDiff, getExpiryStatus } from '../utils/dateUtils';
import { exportExpiryToExcel } from '../utils/excelExport';
import CopyButton from '../components/CopyButton';

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
  const [groupByAccount, setGroupByAccount] = useState(true); // Account-wise view active by default per Master Prompt
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterBrand, setFilterBrand] = useState(selectedBrand ? selectedBrand.id : 'all');
  const [filterNotified, setFilterNotified] = useState('all'); // 'all', 'pending', 'notified'
  const [searchQuery, setSearchQuery] = useState('');

  const [items, setItems] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Sync with selectedBrand prop if it changes
  useEffect(() => {
    if (selectedBrand) {
      setFilterBrand(selectedBrand.id);
    }
  }, [selectedBrand]);

  const fetchExpiryList = async () => {
    try {
      setLoading(true);
      const [salesData, invData] = await Promise.all([
        api.getExpiry({
          filter: 'ALL', // Fetch all sales and apply client-side urgency + top filters together
          brandId: 'all'
        }),
        api.getInventory({ brandId: 'all' })
      ]);
      setItems(salesData || []);
      setInventoryList(invData || []);
    } catch (err) {
      if (showToast) showToast('Failed to load expiry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryList();
  }, []);

  // Handlers for Top 4 Buttons
  const toggleAccountGrouping = () => {
    setGroupByAccount(prev => {
      const next = !prev;
      if (showToast) {
        showToast(next ? 'Account-wise view: Grouped by parent accounts' : 'Flat view: Individual subscription cards', 'info');
      }
      return next;
    });
  };

  const cycleValidity = () => {
    const list = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const idx = list.indexOf(filterValidity);
    const next = list[(idx + 1) % list.length];
    setFilterValidity(next);
    if (showToast) showToast(next === 'all' ? 'Validity: All Validities' : `Validity Filter: ${next}`, 'info');
  };

  const cycleBrand = () => {
    const availableBrandIds = ['all', ...(brands || []).map(b => b.id)];
    const uniqueBrandIds = Array.from(new Set(availableBrandIds));
    const idx = uniqueBrandIds.indexOf(filterBrand);
    const next = uniqueBrandIds[(idx + 1) % uniqueBrandIds.length];
    setFilterBrand(next);
    if (showToast) {
      if (next === 'all') {
        showToast('Brand: All OTT Brands', 'info');
      } else {
        const bObj = (brands || []).find(b => b.id === next);
        showToast(`Brand Filter: ${bObj?.displayName || next}`, 'info');
      }
    }
  };

  const cycleNotified = () => {
    const list = ['all', 'pending', 'notified'];
    const idx = list.indexOf(filterNotified);
    const next = list[(idx + 1) % list.length];
    setFilterNotified(next);
    if (showToast) {
      if (next === 'all') showToast('Notifications: All Records', 'info');
      else if (next === 'pending') showToast('Showing Pending Notifications only', 'info');
      else showToast('Showing Successfully Notified only', 'info');
    }
  };

  const getBrandObj = (brandId) => {
    return (brands || []).find(b => b.id === brandId || b.name?.toLowerCase() === brandId?.toLowerCase()) || null;
  };

  const getBrandShortName = (brandId) => {
    const b = getBrandObj(brandId);
    if (b?.displayName) return b.displayName.split(' ')[0];
    return (brandId || 'ALL').toUpperCase().slice(0, 7);
  };

  // Render Highlighted Expiry Date Badge on Top Right
  const renderHighlightedExpiryBadge = (sub) => {
    const statusObj = getExpiryStatus(sub.expiryDate);

    return (
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          background: statusObj.badgeBg,
          border: statusObj.badgeBorder,
          color: statusObj.badgeColor,
          boxShadow: statusObj.shadow,
          fontSize: '12px',
          fontWeight: 900,
          letterSpacing: '-0.2px',
          whiteSpace: 'nowrap'
        }}
        title={`Expiry Date: ${sub.expiryDate} (${statusObj.label})`}
      >
        <Calendar size={13} strokeWidth={2.5} color={statusObj.color} />
        <span>{sub.expiryDate || 'No Date'}</span>
      </div>
    );
  };

  // Filter items through: Urgency filter (bottom 4) + Top 4 filters + Search + Date filter
  const filteredItems = items.filter(sub => {
    const diff = sub.daysRemaining !== undefined ? sub.daysRemaining : getDaysDiff(sub.expiryDate);

    // 1. Bottom 4 Urgency Filter
    if (filter === 'expired' && diff >= 0) return false;
    if (filter === 'today' && diff !== 0) return false;
    if (filter === 'in_02_days' && (diff <= 0 || diff > 2)) return false;

    // 2. Validity filter
    if (filterValidity !== 'all' && sub.validity !== filterValidity) {
      return false;
    }

    // 3. Brand filter
    if (filterBrand !== 'all') {
      const bId = (sub.brandId || '').toLowerCase();
      const bName = (sub.brandName || '').toLowerCase();
      const target = filterBrand.toLowerCase();
      if (bId !== target && !bName.includes(target)) {
        return false;
      }
    }

    // 4. Notified filter
    if (filterNotified === 'pending' && sub.notificationSent) {
      return false;
    }
    if (filterNotified === 'notified' && !sub.notificationSent) {
      return false;
    }

    // 5. Calendar Date filter
    if (dateFilter) {
      const subExp = (sub.expiryDate || '').trim();
      if (subExp !== dateFilter.trim()) {
        return false;
      }
    }

    // 6. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        (sub.customerName || '').toLowerCase().includes(q) ||
        (sub.customerNumber || '').toLowerCase().includes(q) ||
        (sub.accountEmail || '').toLowerCase().includes(q) ||
        (sub.brandName || '').toLowerCase().includes(q) ||
        (sub.screenNumber || '').toString().toLowerCase().includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Calculate Account Summary metrics
  const totalScreensCount = items.length;
  const expiredCount = items.filter(s => getDaysDiff(s.expiryDate) < 0).length;
  const todayCount = items.filter(s => getDaysDiff(s.expiryDate) === 0).length;
  const inTwoDaysCount = items.filter(s => {
    const d = getDaysDiff(s.expiryDate);
    return d > 0 && d <= 2;
  }).length;
  const activeCount = items.filter(s => getDaysDiff(s.expiryDate) > 2).length;
  const notifiedCount = items.filter(s => s.notificationSent).length;

  // Account-Wise Screen Organization (Master Requirement Section 2)
  const accountGroups = [];
  if (groupByAccount) {
    const accMap = new Map();

    filteredItems.forEach(sub => {
      // Group key: Brand + Account Email (prevents accidental merging across different brands)
      const brandKey = (sub.brandId || sub.brandName || 'other').toLowerCase().trim();
      const emailKey = (sub.accountEmail || 'unassigned').toLowerCase().trim();
      const groupKey = `${brandKey}__${emailKey}`;

      if (!accMap.has(groupKey)) {
        accMap.set(groupKey, {
          groupKey,
          email: sub.accountEmail || 'Unassigned Account',
          password: sub.accountPassword || '',
          brandId: sub.brandId,
          brandName: sub.brandName || sub.brandId,
          items: []
        });
      }
      accMap.get(groupKey).items.push(sub);
    });

    // Sort items within each account by screen number
    accMap.forEach(group => {
      group.items.sort((a, b) => {
        const numA = parseInt(String(a.screenNumber || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt(String(b.screenNumber || '').replace(/\D/g, '') || '0', 10);
        return numA - numB;
      });
      accountGroups.push(group);
    });
  }

  // Handle Excel Export (.xlsx)
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const bObj = getBrandObj(filterBrand);
      const brandName = bObj ? (bObj.displayName || bObj.name) : 'All Brands';
      const filename = exportExpiryToExcel(filteredItems.length > 0 ? filteredItems : items, {
        selectedBrandName: brandName
      });
      if (showToast) showToast(`Downloaded: ${filename}`, 'success');
    } catch (e) {
      if (showToast) showToast('Failed to export Excel: ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '95px', paddingTop: '10px' }}>
      {/* =================================================================== */}
      {/* ROW 1: TOP 4 BUTTONS: Account, Validity, Brand, Notified           */}
      {/* =================================================================== */}
      <div className="filter-bar-4" style={{ marginBottom: '8px' }}>
        {/* 1. Account Button (Toggles Account-wise grouping) */}
        <button
          type="button"
          className={`filter-pill-btn ${groupByAccount ? 'pill-selected-active' : 'pill-selected-inactive'}`}
          style={{
            padding: '7px 4px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px',
            background: groupByAccount ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)' : undefined,
            color: groupByAccount ? '#ffffff' : undefined,
            borderColor: groupByAccount ? '#1e40af' : undefined,
            boxShadow: groupByAccount ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none'
          }}
          onClick={toggleAccountGrouping}
          id="expiry-filter-account"
          title={groupByAccount ? 'Active: Account-Wise View (Click for individual cards)' : 'Click to enable Account-Wise View'}
        >
          <Layers size={13} strokeWidth={2.4} />
          <span>{groupByAccount ? 'Account' : 'All A/C'}</span>
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
            borderColor: filterValidity !== 'all' ? '#6d28d9' : undefined,
            boxShadow: filterValidity !== 'all' ? '0 2px 6px rgba(124, 58, 237, 0.35)' : 'none'
          }}
          onClick={cycleValidity}
          id="expiry-filter-validity"
          title={filterValidity === 'all' ? 'Filter by Validity Duration' : `Validity: ${filterValidity}`}
        >
          <Clock size={13} strokeWidth={2.4} />
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
            borderColor: filterBrand !== 'all' ? '#c2410c' : undefined,
            boxShadow: filterBrand !== 'all' ? '0 2px 6px rgba(234, 88, 12, 0.35)' : 'none'
          }}
          onClick={cycleBrand}
          id="expiry-filter-brand"
          title={filterBrand === 'all' ? 'Filter by Brand' : `Brand: ${filterBrand}`}
        >
          <Tv size={13} strokeWidth={2.4} />
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
            borderColor: filterNotified === 'pending' ? '#be123c' : filterNotified === 'notified' ? '#15803d' : undefined,
            boxShadow: filterNotified !== 'all' ? '0 2px 6px rgba(22, 163, 74, 0.35)' : 'none'
          }}
          onClick={cycleNotified}
          id="expiry-filter-notified"
          title={filterNotified === 'all' ? 'Filter by Customer Notification Status' : `Notification: ${filterNotified}`}
        >
          <Bell size={13} strokeWidth={2.4} />
          <span>
            {filterNotified === 'all' ? 'Notified' : filterNotified === 'pending' ? 'Pending' : 'Sent'}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ROW 2: 4 URGENCY FILTERS BAR (ALL, in 02 Days, Today, Expired)      */}
      {/* =================================================================== */}
      <div className="filter-bar-4" style={{ marginBottom: '10px' }}>
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
      {/* SEARCH BAR & EXCEL DOWNLOAD STRIP                                  */}
      {/* =================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px'
      }}>
        {/* Search input */}
        <div style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={15} color="#64748b" style={{ position: 'absolute', left: '10px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by customer, phone, email, brand..."
            style={{
              width: '100%',
              padding: '8px 10px 8px 32px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '12px',
              fontWeight: 600,
              color: '#0f172a',
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '8px',
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Excel Download Button (image copy 111.png) */}
        <button
          type="button"
          className="glossy-btn glossy-btn-green"
          onClick={handleExportExcel}
          disabled={exporting}
          style={{
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 800,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(22, 163, 74, 0.35)'
          }}
          title="Download Complete Subscription Report as .xlsx Excel"
          id="expiry-excel-download-btn"
        >
          <FileSpreadsheet size={15} strokeWidth={2.4} />
          <span>{exporting ? 'Exporting...' : 'Excel'}</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* ACCOUNT SUMMARY STRIP (Section 9 of Master Prompt)                 */}
      {/* =================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '4px',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '12px',
        padding: '6px 8px',
        marginBottom: '12px',
        textAlign: 'center',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>TOTAL</div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{totalScreensCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#16a34a' }}>ACTIVE</div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>{activeCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#d97706' }}>IN 02D</div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#d97706' }}>{inTwoDaysCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#ea580c' }}>TODAY</div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#ea580c' }}>{todayCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#dc2626' }}>EXPIRED</div>
          <div style={{ fontSize: '13px', fontWeight: 900, color: '#dc2626' }}>{expiredCount}</div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* DATE ACTIVE FILTER STRIP (from Header Calendar)                    */}
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
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={16} color="#2563eb" strokeWidth={2.3} />
            <span style={{ color: '#1e40af', fontWeight: 800 }}>
              Expiry Date: <strong>{dateFilter}</strong>
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
      {/* SUBSCRIPTION CONTENT: ACCOUNT-WISE VIEW VS INDIVIDUAL CARDS        */}
      {/* =================================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading subscriptions...
        </div>
      ) : filteredItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 800, color: '#64748b', marginBottom: '4px' }}>No subscriptions match active filters.</p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>Try resetting Brand, Validity, Notified, or Date filters.</p>
        </div>
      ) : groupByAccount ? (
        /* ----------------------------------------------------------------- */
        /* ACCOUNT-WISE SCREEN ORGANIZATION (MASTER PROMPT REQUIREMENT 2)    */
        /* ----------------------------------------------------------------- */
        accountGroups.map((group, gIdx) => {
          const brandObj = getBrandObj(group.brandId);
          const brandDisplayName = brandObj?.displayName || group.brandName || 'OTT Service';
          const isNetflix = (group.brandId || '').toLowerCase() === 'netflix' || brandDisplayName.toLowerCase().includes('netflix');

          // Count expired vs active in this specific account
          const groupExpiredCount = group.items.filter(s => getDaysDiff(s.expiryDate) <= 0).length;
          const groupActiveCount = group.items.length - groupExpiredCount;

          return (
            <div
              key={group.groupKey + gIdx}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #cbd5e1',
                padding: '12px',
                marginBottom: '16px',
                boxShadow: '0 3px 10px rgba(15, 23, 42, 0.06)'
              }}
              id={`account-group-${gIdx + 1}`}
            >
              {/* Account Group Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                paddingBottom: '8px',
                borderBottom: '1.5px solid #f1f5f9'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  {/* Brand Tag Pill */}
                  <div style={{
                    background: isNetflix ? '#000000' : (brandObj?.color || '#0284c7'),
                    color: '#ffffff',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 900,
                    letterSpacing: '0.3px',
                    whiteSpace: 'nowrap'
                  }}>
                    {isNetflix ? 'NETFLIX' : brandDisplayName.toUpperCase()}
                  </div>

                  {/* Account Name / Email & Password */}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0f172a',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap'
                    }}>
                      Account {gIdx + 1} — {group.email}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                      Pass: {group.password || '••••••••'}
                    </div>
                  </div>
                </div>

                {/* Account Screens Summary Pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    borderRadius: '6px',
                    padding: '3px 6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}>
                    {group.items.length} Screens
                  </span>
                  {groupExpiredCount > 0 && (
                    <span style={{
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      borderRadius: '6px',
                      padding: '3px 6px',
                      fontSize: '11px',
                      fontWeight: 900,
                      whiteSpace: 'nowrap'
                    }}>
                      {groupExpiredCount} Exp
                    </span>
                  )}
                </div>
              </div>

              {/* Screens List under this Account - EACH WITH INDEPENDENT STATUS & EXPIRY COLOR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {group.items.map((sub, sIdx) => {
                  const statusObj = getExpiryStatus(sub.expiryDate);
                  const showPin = brandObj ? (brandObj.showScreenPin !== false) : true;
                  const showDevice = brandObj ? (brandObj.showDeviceName !== false) : true;

                  return (
                    <div
                      key={sub.id || sIdx}
                      style={{
                        background: '#f8fafc',
                        borderRadius: '12px',
                        border: statusObj.border,
                        padding: '10px 12px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.03)'
                      }}
                      id={`screen-card-${gIdx + 1}-${sIdx + 1}`}
                    >
                      {/* Top Screen Header: Screen number badge, PIN, and HIGHLIGHTED INDEPENDENT Expiry Date */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            background: '#e0f2fe',
                            color: '#0369a1',
                            border: '1px solid #bae6fd',
                            borderRadius: '6px',
                            padding: '3px 8px',
                            fontSize: '11.5px',
                            fontWeight: 900
                          }}>
                            {sub.screenNumber ? `Screen-${sub.screenNumber}` : `Screen-${sIdx + 1}`}
                          </span>

                          {showPin && sub.screenPin && (
                            <span style={{
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#b45309',
                              borderRadius: '6px',
                              padding: '2px 6px',
                              fontSize: '11px',
                              fontWeight: 800
                            }}>
                              PIN: {sub.screenPin}
                            </span>
                          )}

                          <span style={{
                            background: '#f3e8ff',
                            border: '1px solid #e9d5ff',
                            color: '#7e22ce',
                            borderRadius: '6px',
                            padding: '2px 6px',
                            fontSize: '10.5px',
                            fontWeight: 700
                          }}>
                            {sub.validity || '1M'}
                          </span>
                        </div>

                        {/* Top-Right Highlighted Expiry Date Badge (Calculated independently!) */}
                        {renderHighlightedExpiryBadge(sub)}
                      </div>

                      {/* Row 1: Customer Name & Phone */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 8px' }}>
                          <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 800 }}>NAME</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            <User size={12} color="#64748b" />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sub.customerName || 'Customer'}
                            </span>
                          </div>
                        </div>

                        <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 8px' }}>
                          <div style={{ fontSize: '9px', color: '#dc2626', fontWeight: 800 }}>NUMBER</div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} color="#64748b" />
                              <span>{sub.customerNumber || '-'}</span>
                            </div>
                            {sub.customerNumber && (
                              <CopyButton text={sub.customerNumber} size={12} showLabelOnCopy={false} />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Activation Date, Device Name (image copy 100.png), and Notify Button */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: showDevice ? '1fr 1fr 1fr' : '1.2fr 1fr',
                        gap: '6px',
                        alignItems: 'center'
                      }}>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                          <div style={{ fontSize: '8.5px', color: '#16a34a', fontWeight: 800 }}>ACTIVATION</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                            {sub.activationDate || '-'}
                          </div>
                        </div>

                        {showDevice && (
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px', textAlign: 'center', overflow: 'hidden' }}>
                            <div style={{ fontSize: '8.5px', color: '#2563eb', fontWeight: 800 }}>DEVICE</div>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.deviceName || sub.device || 'TV / Mobile'}>
                              {sub.deviceName || sub.device || 'TV / Mobile'}
                            </div>
                          </div>
                        )}

                        {/* Screen Notify Button */}
                        <button
                          type="button"
                          className={`glossy-btn ${sub.notificationSent ? 'glossy-btn-green' : 'glossy-btn-red'}`}
                          style={{ padding: '7px 4px', fontSize: '12px', borderRadius: '8px', height: '100%' }}
                          onClick={() => onOpenNotifyModal(sub)}
                          id={`notify-btn-${gIdx + 1}-${sIdx + 1}`}
                          title={sub.notificationSent ? `Notified on ${sub.lastNotifiedAt?.slice(0, 10)}. Click to resend.` : 'Send WhatsApp Reminder'}
                        >
                          {sub.notificationSent ? <Check size={13} strokeWidth={2.5} /> : <Bell size={13} />}
                          <span>{sub.notificationSent ? 'Notified' : 'Notify'}</span>
                        </button>
                      </div>

                      {/* Notification Completed Banner if present */}
                      {sub.notificationSent && (
                        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', color: '#15803d', fontWeight: 700 }}>
                          <Check size={11} strokeWidth={2.5} />
                          <span>Notified on {sub.lastNotifiedAt?.slice(0, 10)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        /* ----------------------------------------------------------------- */
        /* STANDARD FLAT CARDS VIEW (Matching image copy 110.png)            */
        /* ----------------------------------------------------------------- */
        filteredItems.map((sub, sIdx) => {
          const isSecondCard = sIdx % 2 === 1;
          const statusObj = getExpiryStatus(sub.expiryDate);
          const brandObj = getBrandObj(sub.brandId);
          const showPin = brandObj ? (brandObj.showScreenPin !== false) : true;
          const showDevice = brandObj ? (brandObj.showDeviceName !== false) : true;
          const isNetflix = (sub.brandId || '').toLowerCase() === 'netflix' || (sub.brandName || '').toLowerCase().includes('netflix');

          return (
            <div
              key={sub.id || sIdx}
              className="inventory-card"
              style={{
                border: statusObj.border,
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
                    background: isNetflix ? '#000000' : (brandObj?.color || '#0284c7'),
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
                  {isNetflix ? (
                    <span style={{ color: '#e50914', letterSpacing: '0.8px' }}>N NETFLIX</span>
                  ) : (
                    <span>{sub.brandName || brandObj?.displayName || 'OTT'}</span>
                  )}
                </div>

                {/* Top Right Expiry Date - HIGHLIGHTED INDEPENDENT COLOR */}
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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#64748b" />
                      <span>{sub.customerNumber}</span>
                    </div>
                    {sub.customerNumber && (
                      <CopyButton text={sub.customerNumber} size={13} showLabelOnCopy={false} />
                    )}
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

              {/* Row 3: VALIDITY, SCREEN, PIN (PIN respects brand.showScreenPin !== false) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: showPin ? '1.2fr 1fr 1fr' : '1.2fr 1fr',
                gap: '6px',
                marginBottom: '8px'
              }}>
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

                {showPin && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9.5px', color: '#d97706', fontWeight: 800 }}>PIN</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>
                      <Key size={12} color="#d97706" />
                      <span>{sub.screenPin || '-'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: ACTIVATION, DEVICE (image copy 100.png replaces Expiry box), and NOTIFY BUTTON */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: showDevice ? '1fr 1fr 1fr' : '1.2fr 1fr',
                gap: '6px',
                alignItems: 'center'
              }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800 }}>ACTIVATION</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>{sub.activationDate}</div>
                </div>

                {showDevice && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: 800 }}>DEVICE</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.deviceName || sub.device || 'TV / Mobile'}>
                      {sub.deviceName || sub.device || 'TV / Mobile'}
                    </div>
                  </div>
                )}

                {/* Big Red/Green Notify Button */}
                <button
                  type="button"
                  className={`glossy-btn ${sub.notificationSent ? 'glossy-btn-green' : 'glossy-btn-red'}`}
                  style={{ padding: '8px 4px', fontSize: '13px', height: '100%' }}
                  onClick={() => onOpenNotifyModal(sub)}
                  id={`notify-btn-${sub.recordNumber || sIdx + 1}`}
                >
                  {sub.notificationSent ? <Check size={14} strokeWidth={2.5} /> : <Bell size={15} />}
                  <span>{sub.notificationSent ? 'Notified' : 'Notify'}</span>
                </button>
              </div>

              {/* Notification Status Badge if already sent */}
              {sub.notificationSent && (
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#16a34a', fontWeight: 700 }}>
                  <Check size={12} strokeWidth={2.5} />
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
