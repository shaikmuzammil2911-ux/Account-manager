import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Database, History, ChevronRight, ChevronLeft,
  TrendingUp, Users, Tv, AlertCircle, RefreshCw, Calendar,
  Link, Settings, Copy, Check, X, FileSpreadsheet, ExternalLink,
  Edit, Pencil, Save
} from 'lucide-react';
import { api } from '../api/client';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, DEFAULT_SPREADSHEET_ID } from '../utils/googleSheets';
import DatePickerModal from '../components/DatePickerModal';
import { formatDate, parseDate, MONTH_NAMES, getDaysDiff, isSaleOnBusinessDate } from '../utils/dateUtils';

export default function HomeScreen({
  onNavigate,
  stats,
  brands = [],
  onSyncSheets,
  currentUser,
  userPermissions = {},
  showToast = (msg) => { try { alert(msg); } catch(e){} }
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeDate, setActiveDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allSales, setAllSales] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_sales');
      if (cached) return JSON.parse(cached);
      const local = JSON.parse(localStorage.getItem('accounts_manager_app_data_v7') || '{}');
      if (Array.isArray(local.sales) && local.sales.length > 0) return local.sales;
    } catch (e) {}
    return [];
  });
  const [inventoryList, setInventoryList] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_inventory');
      if (cached) return JSON.parse(cached);
      const local = JSON.parse(localStorage.getItem('accounts_manager_app_data_v7') || '{}');
      if (Array.isArray(local.inventory) && local.inventory.length > 0) return local.inventory;
    } catch (e) {}
    return [];
  });
  const [loadingData, setLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDateEditModal, setShowDateEditModal] = useState(false);
  const [editSaleAmounts, setEditSaleAmounts] = useState({});
  const [isSavingAmounts, setIsSavingAmounts] = useState(false);

  const formatDisplayDate = (d) => {
    if (!d || isNaN(d.getTime())) return 'Today';
    const day = String(d.getDate()).padStart(2, '0');
    const mon = MONTH_NAMES[d.getMonth()] || 'Oct';
    const yr = d.getFullYear();
    return `${day} ${mon} ${yr}`;
  };

  const formatTimeStr = (iso) => {
    if (!iso) return '';
    try {
      const dt = new Date(iso);
      if (isNaN(dt.getTime())) return '';
      return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return '';
    }
  };

  const [sheetsConfig, setSheetsConfig] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  const loadSheetsConfig = async () => {
    try {
      const cfg = await api.getSheetsConfig();
      setSheetsConfig(cfg);
      if (cfg?.webhookUrl) {
        setWebhookInput(cfg.webhookUrl);
      }
    } catch (e) {
      console.warn('Error reading sheets config on HomeScreen:', e);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoadingData(true);
      const [sales, inv] = await Promise.all([
        api.getSales({ brandId: 'all' }).catch(() => []),
        api.getInventory({ brandId: 'all' }).catch(() => [])
      ]);
      setAllSales(sales || []);
      setInventoryList(inv || []);
      try {
        localStorage.setItem('accounts_manager_cached_sales', JSON.stringify(sales || []));
        localStorage.setItem('accounts_manager_cached_inventory', JSON.stringify(inv || []));
      } catch (e) {}
    } catch (e) {
      console.warn('Failed to load dashboard detailed data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSheetsConfig();
    loadDashboardData();
  }, [stats]);

  useEffect(() => {
    const handleRefresh = () => {
      loadDashboardData();
    };
    window.addEventListener('sales-updated', handleRefresh);
    window.addEventListener('focus', handleRefresh);
    return () => {
      window.removeEventListener('sales-updated', handleRefresh);
      window.removeEventListener('focus', handleRefresh);
    };
  }, []);

  const isLinked = Boolean(sheetsConfig?.webhookUrl && sheetsConfig.webhookUrl.trim());
  const lastSyncTimeFormatted = useMemo(() => {
    if (sheetsConfig?.lastSyncTime) {
      return formatTimeStr(sheetsConfig.lastSyncTime);
    }
    return '';
  }, [sheetsConfig?.lastSyncTime]);

  const handleCopyScript = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2500);
    }
  };

  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      if (onSyncSheets) {
        await onSyncSheets();
      }
      await loadSheetsConfig();
      await loadDashboardData();
    } catch (e) {
      console.warn('Sync failed on HomeScreen:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveWebhook = async () => {
    const trimmed = webhookInput.trim();
    if (!trimmed) {
      alert('Please enter your Google Apps Script Web App URL');
      return;
    }
    try {
      setIsSavingWebhook(true);
      const updated = await api.updateSheetsConfig({
        enabled: true,
        spreadsheetId: DEFAULT_SPREADSHEET_ID,
        webhookUrl: trimmed,
        status: 'Connected'
      });
      setSheetsConfig(updated);
      setShowConnectModal(false);
      handleManualSync();
    } catch (e) {
      alert('Failed to save webhook: ' + e.message);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Date-dependent statistics calculation using configured business timezone (Asia/Kolkata)
  const { dateSoldAC, dateAmount, expiredCount, todayCount, totalSalesCount, freeScreensCount } = useMemo(() => {
    // Only consider non-deleted, active sales
    const validSales = (allSales || []).filter(s => s && !s.isDeleted && s.status !== 'deleted' && s.status !== 'Deleted');

    // Calculate sales on active selected date using business timezone Asia/Kolkata
    const dateMatchingSales = validSales.filter(s => isSaleOnBusinessDate(s, activeDate, 'Asia/Kolkata'));

    // Strictly actual counts on selected date - no falling back to all-time stats when 0
    const soldCount = dateMatchingSales.length;
    const amountSum = dateMatchingSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    // Customer expiry metrics: strictly computed from user's actual valid customer sales
    let expired = 0;
    let todayExp = 0;
    if (validSales.length > 0) {
      expired = validSales.filter(s => {
        const diff = getDaysDiff(s.expiryDate, activeDate);
        return diff !== null && typeof diff === 'number' && !isNaN(diff) && diff < 0;
      }).length;
      todayExp = validSales.filter(s => {
        const diff = getDaysDiff(s.expiryDate, activeDate);
        return diff !== null && typeof diff === 'number' && !isNaN(diff) && diff === 0;
      }).length;
    }

    // Free Screens: reflects actual inventory screens
    let freeScreens = stats?.emptyScreens ?? 0;
    if (inventoryList.length > 0) {
      let calcEmpty = 0;
      inventoryList.filter(i => !i.isDeleted).forEach(inv => {
        (inv.screens || []).forEach(sc => {
          if (sc.status === 'empty') calcEmpty++;
        });
      });
      freeScreens = calcEmpty;
    }

    // All-time valid customer sales count
    const totalSales = validSales.length;

    return {
      dateSoldAC: soldCount,
      dateAmount: amountSum,
      expiredCount: expired,
      todayCount: todayExp,
      totalSalesCount: totalSales,
      freeScreensCount: freeScreens
    };
  }, [activeDate, allSales, inventoryList, stats]);

  // Active sales on selected date for the Edit modal (Image copy 210 requirement)
  const activeDateSales = useMemo(() => {
    const validSales = (allSales || []).filter(s => s && !s.isDeleted && s.status !== 'deleted' && s.status !== 'Deleted');
    return validSales.filter(s => isSaleOnBusinessDate(s, activeDate, 'Asia/Kolkata'));
  }, [allSales, activeDate]);

  useEffect(() => {
    if (showDateEditModal) {
      const initial = {};
      activeDateSales.forEach(s => {
        initial[s.id] = s.amount !== undefined ? s.amount : 0;
      });
      setEditSaleAmounts(initial);
    }
  }, [showDateEditModal, activeDateSales]);

  const handleSaveDateSalesAmounts = async () => {
    try {
      setIsSavingAmounts(true);
      const updates = [];
      for (const sale of activeDateSales) {
        const newAmt = editSaleAmounts[sale.id];
        if (newAmt !== undefined && Number(newAmt) !== Number(sale.amount)) {
          updates.push(api.updateSale(sale.id, { amount: Math.max(0, Number(newAmt)) }));
        }
      }
      if (updates.length > 0) {
        await Promise.all(updates);
        setAllSales(prev => prev.map(s => {
          if (editSaleAmounts[s.id] !== undefined) {
            return { ...s, amount: Math.max(0, Number(editSaleAmounts[s.id])) };
          }
          return s;
        }));
        showToast(`Saved updated amounts for ${formatDisplayDate(activeDate)}!`, 'success');
      } else {
        showToast('No amount changes detected', 'info');
      }
      setShowDateEditModal(false);
    } catch (err) {
      showToast('Failed to update amounts: ' + err.message, 'error');
    } finally {
      setIsSavingAmounts(false);
    }
  };

  const isInitialLoading = loadingData && allSales.length === 0 && inventoryList.length === 0 && !stats;

  return (
    <div className="screen-content" style={{ paddingBottom: '110px', paddingTop: '14px' }}>
      {/* Container with max-width for Desktop SaaS perfection */}
      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>

        {/* 2. Date Navigator Bar (Matching Section 4 & image copy 113.png) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          marginBottom: '14px'
        }}>
          {/* Previous Day Button */}
          <button
            type="button"
            onClick={() => {
              const cur = new Date(activeDate);
              cur.setDate(cur.getDate() - 1);
              setActiveDate(cur);
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
            }}
            title="Previous Day"
            id="home-date-prev-btn"
          >
            <ChevronLeft size={22} strokeWidth={2.8} />
          </button>

          {/* Calendar Date Picker Button */}
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            style={{
              flex: 1,
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: 800,
              letterSpacing: '0.2px',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
            }}
            title="Click to pick custom date"
            id="home-date-picker-btn"
          >
            <Calendar size={18} strokeWidth={2.4} />
            <span>{formatDisplayDate(activeDate)}</span>
          </button>

          {/* Next Day Button */}
          <button
            type="button"
            onClick={() => {
              const cur = new Date(activeDate);
              cur.setDate(cur.getDate() + 1);
              setActiveDate(cur);
            }}
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
              border: 'none',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
            }}
            title="Next Day"
            id="home-date-next-btn"
          >
            <ChevronRight size={22} strokeWidth={2.8} />
          </button>
        </div>

        {/* 3. Primary Summary Cards: 3 Across (Matching Section 5 & image copy 113.png) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1.15fr',
          gap: '8px',
          marginBottom: '14px'
        }}>
          {/* Card 1: Expired A/C (Red Gradient) */}
          <div
            onClick={() => onNavigate('expiry', { filter: 'expired' })}
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              borderRadius: '16px',
              padding: '12px 8px',
              color: '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
              border: '1.5px solid #ef4444',
              transition: 'transform 0.15s ease'
            }}
            id="home-top-card-expired"
            title="View Expired Accounts"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 800,
              opacity: 0.95,
              marginBottom: '4px'
            }}>
              <AlertCircle size={14} strokeWidth={2.5} />
              <span>Expired A/C</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.1 }}>
              {isInitialLoading ? '—' : expiredCount}
            </div>
          </div>

          {/* Card 2: Sold A/C (Green Gradient) */}
          <div
            onClick={() => onNavigate('recent-sales')}
            style={{
              background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              borderRadius: '16px',
              padding: '12px 8px',
              color: '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)',
              border: '1.5px solid #22c55e',
              transition: 'transform 0.15s ease'
            }}
            id="home-top-card-sold"
            title="View Sold Accounts on this date"
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 800,
              opacity: 0.95,
              marginBottom: '4px'
            }}>
              <Tv size={14} strokeWidth={2.5} />
              <span>Sold A/C</span>
            </div>
            <div style={{ fontSize: '24px', fontWeight: 900, lineHeight: 1.1 }}>
              {isInitialLoading ? '—' : dateSoldAC}
            </div>
          </div>

          {/* Card 3: Amount (Blue Gradient) */}
          <div
            onClick={() => onNavigate('revenue-mgmt')}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              borderRadius: '16px',
              padding: '12px 8px',
              color: '#ffffff',
              textAlign: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              border: '1.5px solid #38bdf8',
              transition: 'transform 0.15s ease'
            }}
            id="home-top-card-amount"
            title="View Revenue Management & Profit (Click Edit to modify sales for this date)"
          >
            {/* Quick Edit Button in this section (image copy 210 requirement) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowDateEditModal(true);
              }}
              style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                padding: '2px 6px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.28)',
                border: 'none',
                color: '#ffffff',
                fontSize: '9.5px',
                fontWeight: 900,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                lineHeight: 1
              }}
              title="Edit sales and amounts for this date"
            >
              <Pencil size={9} strokeWidth={2.8} />
              <span>Edit</span>
            </button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              fontSize: '11px',
              fontWeight: 800,
              opacity: 0.95,
              marginBottom: '4px'
            }}>
              <span style={{ fontSize: '13px', fontWeight: 900 }}>₹</span>
              <span>Amount</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isInitialLoading ? '—' : `₹${Number(dateAmount).toLocaleString('en-IN')}`}
            </div>
          </div>
        </div>

        {/* 4. Secondary Analytics Grid (4 cards: 2x2 on mobile, 4-col on desktop, Matching Section 6) */}
        <div style={{ marginBottom: '16px' }}>
          <div className="stats-overview-grid">
            {/* 1. Total Sales */}
            <div
              className="stat-card stat-card-blue"
              onClick={() => onNavigate('recent-sales')}
              id="home-stat-total-sales"
            >
              <div className="stat-card-icon blue">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="stat-card-label">Total Sales</div>
                <div className="stat-card-value text-blue">{isInitialLoading ? '—' : totalSalesCount}</div>
              </div>
            </div>

            {/* 2. Free Screens */}
            <div
              className="stat-card stat-card-green"
              onClick={() => onNavigate('data')}
              id="home-stat-free-screens"
            >
              <div className="stat-card-icon green">
                <Tv size={20} />
              </div>
              <div>
                <div className="stat-card-label">Free Screens</div>
                <div className="stat-card-value text-green">{isInitialLoading ? '—' : freeScreensCount}</div>
              </div>
            </div>

            {/* 3. Expiring Today */}
            <div
              className="stat-card stat-card-orange"
              onClick={() => onNavigate('expiry', { filter: 'today' })}
              id="home-stat-expiring-today"
            >
              <div className="stat-card-icon orange">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="stat-card-label">Expiring Today</div>
                <div className="stat-card-value text-orange">{isInitialLoading ? '—' : todayCount}</div>
              </div>
            </div>

            {/* 4. Expired */}
            <div
              className="stat-card stat-card-red"
              onClick={() => onNavigate('expiry', { filter: 'expired' })}
              id="home-stat-expired"
            >
              <div className="stat-card-icon red">
                <Users size={20} />
              </div>
              <div>
                <div className="stat-card-label">Expired</div>
                <div className="stat-card-value text-red">{isInitialLoading ? '—' : expiredCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Main 3 Action Navigation Cards (Matching Section 7 & image copy 113.png) */}
        <div className="home-menu-grid">
          {/* A. SALE (Orange) */}
          {(isAdmin || userPermissions.sales !== false) && (
            <div
              className="home-menu-card glossy-btn-orange"
              onClick={() => onNavigate('sale', { prefill: { activationDate: formatDate(activeDate), saleDate: formatDate(activeDate) } })}
              id="home-btn-sale"
              role="button"
              tabIndex={0}
            >
              <div className="home-menu-left">
                <div className="home-menu-icon">
                  <ShoppingCart size={24} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div className="home-menu-titles">
                  <span className="home-menu-main-title">Sale</span>
                  <span className="home-menu-subtitle">Pick brand, screen & sell account</span>
                </div>
              </div>
              <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
          )}

          {/* B. DATA (Green) */}
          {(isAdmin || userPermissions.account_management !== false) && (
            <div
              className="home-menu-card glossy-btn-green"
              onClick={() => onNavigate('data')}
              id="home-btn-data"
              role="button"
              tabIndex={0}
            >
              <div className="home-menu-left">
                <div className="home-menu-icon">
                  <Database size={24} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div className="home-menu-titles">
                  <span className="home-menu-main-title">Data</span>
                  <span className="home-menu-subtitle">Manage accounts & 1–10 screens</span>
                </div>
              </div>
              <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
          )}

          {/* C. RECENT SALES (Blue) */}
          {(isAdmin || userPermissions.recent_sales !== false) && (
            <div
              className="home-menu-card glossy-btn-blue"
              onClick={() => onNavigate('recent-sales')}
              id="home-btn-recent-sales"
              role="button"
              tabIndex={0}
            >
              <div className="home-menu-left">
                <div className="home-menu-icon">
                  <History size={24} color="#ffffff" strokeWidth={2.5} />
                </div>
                <div className="home-menu-titles">
                  <span className="home-menu-main-title">Recent Sale's</span>
                  <span className="home-menu-subtitle">Brand-wise customer history & PINs</span>
                </div>
              </div>
              <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
          )}
        </div>

      </div>

      {/* DatePicker Modal for Home */}
      {showDatePicker && (
        <DatePickerModal
          isOpen={true}
          initialDate={formatDate(activeDate)}
          onSelect={(selectedStr) => {
            setActiveDate(parseDate(selectedStr));
            setShowDatePicker(false);
          }}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      {/* Date Sales & Amount Quick-Edit Modal (Matching Image 210 requirement) */}
      {showDateEditModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0284c7',
              color: '#ffffff'
            }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pencil size={18} />
                  <span>Edit Sales & Amount</span>
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
                  Viewing Date: <strong>{formatDisplayDate(activeDate)}</strong>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDateEditModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                background: '#f0f9ff',
                border: '1.5px solid #bae6fd',
                borderRadius: '12px',
                padding: '10px 14px',
                marginBottom: '14px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 800 }}>Total Accounts Sold</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0c4a6e' }}>{activeDateSales.length}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#0369a1', fontWeight: 800 }}>Calculated Total Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: '#0284c7' }}>
                    ₹{Object.values(editSaleAmounts).reduce((a, b) => a + (Number(b) || 0), 0).toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {activeDateSales.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#64748b' }}>
                  <AlertCircle size={36} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>No sales recorded on {formatDisplayDate(activeDate)}</p>
                  <p style={{ margin: '4px 0 16px', fontSize: '12px', color: '#94a3b8' }}>
                    Click below to create a sale or navigate to Recent Sales
                  </p>
                  <button
                    type="button"
                    className="glossy-btn glossy-btn-orange"
                    onClick={() => {
                      setShowDateEditModal(false);
                      onNavigate('sale', { defaultSaleDate: formatDate(activeDate) });
                    }}
                    style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}
                  >
                    + Add Sale for this Date
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                    Edit sale amount per account:
                  </div>
                  {activeDateSales.map((sale) => (
                    <div
                      key={sale.id}
                      style={{
                        background: '#f8fafc',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span style={{
                            background: '#ea580c',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 900
                          }}>
                            {sale.brandName || 'OTT'}
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {sale.customerName || 'Customer'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>
                          Screen {sale.screenNumber || '01'} • {sale.customerNumber || sale.accountEmail || 'No number'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 900, color: '#0284c7' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          value={editSaleAmounts[sale.id] !== undefined ? editSaleAmounts[sale.id] : (sale.amount || 0)}
                          onChange={(e) => setEditSaleAmounts(prev => ({ ...prev, [sale.id]: e.target.value }))}
                          style={{
                            width: '80px',
                            padding: '6px 8px',
                            borderRadius: '8px',
                            border: '1.5px solid #0284c7',
                            background: '#ffffff',
                            fontSize: '14px',
                            fontWeight: 900,
                            color: '#0f172a',
                            textAlign: 'right',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '10px',
              background: '#ffffff'
            }}>
              <button
                type="button"
                onClick={() => {
                  setShowDateEditModal(false);
                  onNavigate('recent-sales', { initialDate: formatDate(activeDate) });
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  background: '#f8fafc',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                Go to Recent Sales
              </button>
              <button
                type="button"
                onClick={handleSaveDateSalesAmounts}
                disabled={isSavingAmounts || activeDateSales.length === 0}
                style={{
                  flex: 1.2,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 900,
                  cursor: (isSavingAmounts || activeDateSales.length === 0) ? 'not-allowed' : 'pointer',
                  opacity: (isSavingAmounts || activeDateSales.length === 0) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 10px rgba(2, 132, 199, 0.35)'
                }}
              >
                <Save size={16} />
                <span>{isSavingAmounts ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Connect Google Sheets Modal */}
      {showConnectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Connect Google Sheets
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Authoritative Single Source of Truth
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Spreadsheet Info Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Authoritative Spreadsheet
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                OTT A/C MANAGER
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg/edit?usp=drivesdk"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#2563eb',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Open Google Spreadsheet <ExternalLink size={12} />
              </a>
            </div>

            {/* Quick 3-step instructions */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '14px',
              fontSize: '12px',
              color: '#166534',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 800, marginBottom: '6px', color: '#14532d' }}>
                Quick Setup (Takes 1 Minute):
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Open the Google Sheet above</li>
                <li>Click <b>Extensions</b> &gt; <b>Apps Script</b></li>
                <li>Paste the script code and click <b>Deploy &gt; Web app</b> (Access: Anyone)</li>
                <li>Paste your Web App URL below:</li>
              </ol>
            </div>

            {/* Copy Script Code Button */}
            <button
              type="button"
              onClick={handleCopyScript}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1.5px solid #22c55e',
                background: scriptCopied ? '#dcfce7' : '#ffffff',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                marginBottom: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {scriptCopied ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
              {scriptCopied ? 'Apps Script Code Copied to Clipboard!' : 'Copy Google Apps Script Code'}
            </button>

            {/* Input for Web App URL */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-green"
                onClick={handleSaveWebhook}
                disabled={isSavingWebhook}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isSavingWebhook ? 'Saving & Verifying...' : 'Save & Connect'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConnectModal(false);
                  if (onNavigate) onNavigate('cells-linkup');
                }}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'transparent',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Open Advanced Cells Linkup Screen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
