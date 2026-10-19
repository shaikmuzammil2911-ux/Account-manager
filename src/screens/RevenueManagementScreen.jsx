import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar, ArrowLeft, TrendingUp,
  DollarSign, ShoppingCart, Users, Tv, CheckCircle, RefreshCw,
  Clock, Shield, Eye, ChevronDown, ChevronUp, Sparkles, Filter
} from 'lucide-react';
import { api } from '../api/client';
import { formatDate, parseDate } from '../utils/dateUtils';

export default function RevenueManagementScreen({
  brands = [],
  onBack,
  showToast,
  onOpenMenu
}) {
  const [sales, setSales] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Date Filter State
  // Mode: 'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'
  const [filterMode, setFilterMode] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [expandedBrandId, setExpandedBrandId] = useState(null);

  // Fetch live sales & inventory
  const loadData = async () => {
    setLoading(true);
    try {
      const [salesData, invData] = await Promise.all([
        api.getSales(),
        api.getInventory()
      ]);
      setSales(Array.isArray(salesData) ? salesData : []);
      setInventory(Array.isArray(invData) ? invData : []);
    } catch (err) {
      console.error('Failed to load revenue data:', err);
      if (showToast) showToast('Failed to load revenue data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Format date helper
  const dateToStr = (d) => {
    if (!d) return '';
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  // Navigate left/right date
  const handlePrevDate = () => {
    const prev = new Date(selectedDate);
    if (filterMode === 'month') {
      prev.setMonth(prev.getMonth() - 1);
    } else if (filterMode === 'week') {
      prev.setDate(prev.getDate() - 7);
    } else {
      prev.setDate(prev.getDate() - 1);
      setFilterMode('custom');
    }
    setSelectedDate(prev);
  };

  const handleNextDate = () => {
    const next = new Date(selectedDate);
    if (filterMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (filterMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
      setFilterMode('custom');
    }
    setSelectedDate(next);
  };

  // Compute date label for the middle big box
  const dateBoxLabel = useMemo(() => {
    const now = new Date();
    const isToday =
      selectedDate.getDate() === now.getDate() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      selectedDate.getDate() === yesterday.getDate() &&
      selectedDate.getMonth() === yesterday.getMonth() &&
      selectedDate.getFullYear() === yesterday.getFullYear();

    if (filterMode === 'today' || (filterMode === 'custom' && isToday)) {
      return `Today (${formatDate(selectedDate)})`;
    }
    if (filterMode === 'yesterday' || (filterMode === 'custom' && isYesterday)) {
      return `Yesterday (${formatDate(selectedDate)})`;
    }
    if (filterMode === 'month') {
      return selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (filterMode === 'week') {
      return `Week of ${formatDate(selectedDate)}`;
    }
    if (filterMode === 'all') {
      return 'All Time Summary';
    }
    return formatDate(selectedDate);
  }, [filterMode, selectedDate]);

  // Filter sales based on selected date / mode
  const filteredSales = useMemo(() => {
    if (filterMode === 'all') {
      return sales;
    }

    const selDateStr = dateToStr(selectedDate);
    const selYear = selectedDate.getFullYear();
    const selMonth = selectedDate.getMonth();

    return sales.filter(sale => {
      const rawDate = sale.saleDate || sale.activationDate || sale.createdAt;
      if (!rawDate) return false;

      const sDate = parseDate(rawDate);
      if (isNaN(sDate.getTime())) return false;

      if (filterMode === 'month') {
        return sDate.getFullYear() === selYear && sDate.getMonth() === selMonth;
      }

      if (filterMode === 'week') {
        const diffTime = Math.abs(selectedDate.getTime() - sDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
      }

      // Single day comparison (Today, Yesterday, Custom date)
      return (
        sDate.getFullYear() === selectedDate.getFullYear() &&
        sDate.getMonth() === selectedDate.getMonth() &&
        sDate.getDate() === selectedDate.getDate()
      );
    });
  }, [sales, filterMode, selectedDate]);

  // Normalize brand keys for mapping
  const normalizeBrandId = (brandId, brandName) => {
    const str = (brandId || brandName || '').toLowerCase();
    if (str.includes('netflix')) return 'netflix';
    if (str.includes('prime') || str.includes('amazon')) return 'prime_video';
    if (str.includes('hotstar') || str.includes('disney')) return 'disney_hotstar';
    if (str.includes('zee')) return 'zee5';
    if (str.includes('aha')) return 'aha';
    if (str.includes('sony')) return 'sonyliv';
    if (str.includes('youtube')) return 'youtube';
    if (str.includes('apple')) return 'apple_tv';
    return (brandId || 'other').toLowerCase().replace(/[^a-z0-9]/g, '_');
  };

  // Group stats by OTT Brand
  const brandStats = useMemo(() => {
    const map = {};

    // 1. Initialize with all registered brands
    brands.forEach(b => {
      const normId = normalizeBrandId(b.id, b.name || b.displayName);
      map[normId] = {
        brand: b,
        brandId: normId,
        displayName: b.displayName || b.name,
        color: b.color || '#2563eb',
        accountsCount: 0,
        screensTotal: 0,
        screensOccupied: 0,
        salesCount: 0,
        profitAmount: 0,
        salesList: []
      };
    });

    // 2. Count Master Accounts & Screens in Inventory
    (inventory || []).filter(i => !i.isDeleted).forEach(item => {
      const normId = normalizeBrandId(item.brandId, item.brandName);
      if (!map[normId]) {
        map[normId] = {
          brand: { id: normId, displayName: item.brandName || normId.toUpperCase() },
          brandId: normId,
          displayName: item.brandName || normId.toUpperCase(),
          color: '#3b82f6',
          accountsCount: 0,
          screensTotal: 0,
          screensOccupied: 0,
          salesCount: 0,
          profitAmount: 0,
          salesList: []
        };
      }
      map[normId].accountsCount += 1;
      const screens = item.screens || [];
      map[normId].screensTotal += screens.length || 5;
      map[normId].screensOccupied += screens.filter(s => s.status === 'occupied').length;
    });

    // 3. Count Sales & Profit Amount
    filteredSales.forEach(sale => {
      const normId = normalizeBrandId(sale.brandId, sale.brandName);
      if (!map[normId]) {
        map[normId] = {
          brand: { id: normId, displayName: sale.brandName || normId.toUpperCase() },
          brandId: normId,
          displayName: sale.brandName || normId.toUpperCase(),
          color: '#3b82f6',
          accountsCount: 0,
          screensTotal: 0,
          screensOccupied: 0,
          salesCount: 0,
          profitAmount: 0,
          salesList: []
        };
      }
      map[normId].salesCount += 1;
      const amt = parseFloat(sale.amount) || 0;
      map[normId].profitAmount += amt;
      map[normId].salesList.push(sale);
    });

    return Object.values(map);
  }, [brands, inventory, filteredSales]);

  // Overall Totals
  const overallTotals = useMemo(() => {
    const totalAccounts = (inventory || []).filter(i => !i.isDeleted).length;
    const totalSales = filteredSales.length;
    const totalProfit = filteredSales.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    return {
      totalAccounts,
      totalSales,
      totalProfit
    };
  }, [inventory, filteredSales]);

  // Color theme helper per brand
  const getBrandBannerBg = (brandId) => {
    switch (brandId) {
      case 'netflix':
        return '#dc2626'; // Red matching Canva
      case 'prime_video':
        return '#0284c7'; // Cyan/Blue matching Canva
      case 'disney_hotstar':
        return '#1e40af'; // Blue matching Canva
      case 'zee5':
        return '#7c3aed'; // Purple
      case 'aha':
        return '#ea580c'; // Orange
      case 'sonyliv':
        return '#0f766e'; // Teal
      default:
        return '#334155';
    }
  };

  return (
    <div className="revenue-screen" style={{ minHeight: '100%', background: '#f8fafc', paddingBottom: '90px' }}>
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER                                                    */}
      {/* ------------------------------------------------------------- */}
      <div
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          aria-label="Go Back"
        >
          <ArrowLeft size={18} color="#0f172a" />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '0.3px' }}>
            SALES SUMMARY
          </h1>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
            Revenue & Profit Management
          </span>
        </div>

        <button
          type="button"
          onClick={loadData}
          style={{
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '10px',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Refresh Data"
        >
          <RefreshCw size={17} color="#0f172a" className={loading ? 'spin' : ''} />
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* ------------------------------------------------------------- */}
        {/* DATE CONTROLS (Image copy 99: Left btn, Big Date Box, Right)  */}
        {/* ------------------------------------------------------------- */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px'
          }}
        >
          {/* Left Button (Blue Pill) */}
          <button
            type="button"
            onClick={handlePrevDate}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              width: '54px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.35)',
              flexShrink: 0,
              transition: 'transform 0.1s ease'
            }}
            aria-label="Previous Day"
          >
            <ChevronLeft size={28} strokeWidth={3} />
          </button>

          {/* Middle Big Date Box */}
          <button
            type="button"
            onClick={() => setShowDatePickerModal(!showDatePickerModal)}
            style={{
              flex: 1,
              height: '46px',
              background: '#ffffff',
              border: '2px solid #0f172a',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '15px',
              fontWeight: 900,
              color: '#0f172a',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
          >
            <Calendar size={18} color="#0f172a" />
            <span>{dateBoxLabel}</span>
            <ChevronDown size={16} color="#64748b" />
          </button>

          {/* Right Button (Blue Pill) */}
          <button
            type="button"
            onClick={handleNextDate}
            style={{
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '24px',
              width: '54px',
              height: '46px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(59, 130, 246, 0.35)',
              flexShrink: 0,
              transition: 'transform 0.1s ease'
            }}
            aria-label="Next Day"
          >
            <ChevronRight size={28} strokeWidth={3} />
          </button>
        </div>

        {/* Quick Filter Selection Dropdown Modal */}
        {showDatePickerModal && (
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '12px',
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>
              SELECT REVENUE PERIOD
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '12px' }}>
              {[
                { label: 'Today', mode: 'today', action: () => { setSelectedDate(new Date()); setFilterMode('today'); } },
                { label: 'Yesterday', mode: 'yesterday', action: () => { const y = new Date(); y.setDate(y.getDate() - 1); setSelectedDate(y); setFilterMode('yesterday'); } },
                { label: 'This Week', mode: 'week', action: () => { setFilterMode('week'); } },
                { label: 'This Month', mode: 'month', action: () => { setFilterMode('month'); } },
                { label: 'All Time', mode: 'all', action: () => { setFilterMode('all'); } }
              ].map(opt => (
                <button
                  key={opt.mode}
                  type="button"
                  onClick={() => {
                    opt.action();
                    setShowDatePickerModal(false);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    border: filterMode === opt.mode ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    background: filterMode === opt.mode ? '#eff6ff' : '#f8fafc',
                    color: filterMode === opt.mode ? '#1d4ed8' : '#334155',
                    cursor: 'pointer'
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Custom Date Input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f8fafc', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>Custom:</span>
              <input
                type="date"
                value={dateToStr(selectedDate)}
                onChange={(e) => {
                  if (e.target.value) {
                    const [y, m, d] = e.target.value.split('-').map(Number);
                    setSelectedDate(new Date(y, m - 1, d));
                    setFilterMode('custom');
                    setShowDatePickerModal(false);
                  }
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#0f172a',
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3 TOP SUMMARY CARDS (Image copy 99: Orange, White, Green)      */}
        {/* ------------------------------------------------------------- */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            marginBottom: '20px'
          }}
        >
          {/* Box 1: Orange - Total Accounts */}
          <div
            style={{
              background: '#f97316',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '10px 6px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(249, 115, 22, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', opacity: 0.95 }}>
              Accounts
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
              {overallTotals.totalAccounts}
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, opacity: 0.85, marginTop: '2px' }}>
              In Database
            </div>
          </div>

          {/* Box 2: White with dark border - Total Sales */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #0f172a',
              color: '#0f172a',
              borderRadius: '12px',
              padding: '10px 6px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', color: '#64748b' }}>
              Sales
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, marginTop: '2px', lineHeight: 1.2, color: '#0f172a' }}>
              {overallTotals.totalSales}
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, color: '#64748b', marginTop: '2px' }}>
              Sold Screens
            </div>
          </div>

          {/* Box 3: Green - Total Profit Amount */}
          <div
            style={{
              background: '#16a34a',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '10px 6px',
              textAlign: 'center',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px', opacity: 0.95 }}>
              Profit
            </div>
            <div style={{ fontSize: '19px', fontWeight: 900, marginTop: '2px', lineHeight: 1.2 }}>
              ₹{overallTotals.totalProfit.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '9.5px', fontWeight: 600, opacity: 0.85, marginTop: '2px' }}>
              Net Earnings
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* OTT BRAND WISE DETAILS CARDS (Matching Canva: Image 99)       */}
        {/* ------------------------------------------------------------- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {brandStats.map((item) => {
            const bannerBg = getBrandBannerBg(item.brandId);
            const isExpanded = expandedBrandId === item.brandId;

            return (
              <div
                key={item.brandId}
                style={{
                  background: '#ffffff',
                  borderRadius: '14px',
                  border: '1.5px solid #0f172a',
                  overflow: 'hidden',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)'
                }}
              >
                {/* Brand Banner Header (Red for Netflix, Cyan for Prime, etc.) */}
                <div
                  style={{
                    background: bannerBg,
                    color: '#ffffff',
                    padding: '9px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontWeight: 900,
                    letterSpacing: '0.5px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', textTransform: 'uppercase' }}>
                      {item.displayName}
                    </span>
                  </div>

                  <span
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontWeight: 700
                    }}
                  >
                    {item.accountsCount} Acc
                  </span>
                </div>

                {/* 3 Square Stat Boxes Side by Side (As drawn in Canva Image 99) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: '8px',
                    padding: '10px'
                  }}
                >
                  {/* Square 1: Account */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '66px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                      Account
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                      {String(item.accountsCount).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
                      {item.screensTotal} Screens
                    </div>
                  </div>

                  {/* Square 2: Sales */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '66px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>
                      Sales
                    </div>
                    <div style={{ fontSize: '17px', fontWeight: 900, color: '#2563eb', marginTop: '2px' }}>
                      {String(item.salesCount).padStart(2, '0')}
                    </div>
                    <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 600 }}>
                      {Math.max(0, item.screensTotal - item.screensOccupied)} Free
                    </div>
                  </div>

                  {/* Square 3: Profit Amount */}
                  <div
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #0f172a',
                      borderRadius: '10px',
                      padding: '10px 4px',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      minHeight: '66px'
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#16a34a', fontWeight: 800, textTransform: 'uppercase' }}>
                      Profit Amount
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#15803d', marginTop: '2px' }}>
                      ₹{item.profitAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '9px', color: '#64748b', fontWeight: 600 }}>
                      Earnings
                    </div>
                  </div>
                </div>

                {/* Expand / View Details Button */}
                {item.salesList && item.salesList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setExpandedBrandId(isExpanded ? null : item.brandId)}
                    style={{
                      width: '100%',
                      background: '#f8fafc',
                      border: 'none',
                      borderTop: '1px solid #e2e8f0',
                      padding: '7px 12px',
                      fontSize: '11px',
                      fontWeight: 800,
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <span>{isExpanded ? 'Hide Transactions' : `View ${item.salesList.length} Sale(s)`}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}

                {/* Expanded Transactions List */}
                {isExpanded && item.salesList && item.salesList.length > 0 && (
                  <div style={{ padding: '8px 12px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {item.salesList.map((sale, sIdx) => (
                        <div
                          key={sale.id || sIdx}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '7px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                              {sale.customerName || 'Customer'} • {sale.screenNumber || 'Screen-1'}
                            </div>
                            <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                              {sale.accountEmail || 'Unassigned'} • {sale.validity || '01 Month'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>
                              +₹{sale.amount || 0}
                            </div>
                            <div style={{ fontSize: '9.5px', color: '#94a3b8' }}>
                              {sale.saleDate || sale.activationDate}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
