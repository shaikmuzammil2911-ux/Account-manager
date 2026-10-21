import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart, Database, History, ChevronRight, ChevronLeft,
  TrendingUp, Users, Tv, AlertCircle, RefreshCw, Calendar,
  Link, Settings, Copy, Check, X, FileSpreadsheet, ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, DEFAULT_SPREADSHEET_ID } from '../utils/googleSheets';
import DatePickerModal from '../components/DatePickerModal';
import { formatDate, parseDate, MONTH_NAMES, getDaysDiff } from '../utils/dateUtils';

export default function HomeScreen({
  onNavigate,
  stats,
  brands = [],
  onSyncSheets,
  currentUser,
  userPermissions = {}
}) {
  const isAdmin = currentUser?.role === 'admin';
  const [activeDate, setActiveDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [allSales, setAllSales] = useState([]);
  const [inventoryList, setInventoryList] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
    } catch (e) {
      console.warn('Failed to load dashboard detailed data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadSheetsConfig();
    loadDashboardData();
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

  // Date-dependent statistics calculation
  const { dateSoldAC, dateAmount, expiredCount, todayCount, totalSalesCount, freeScreensCount } = useMemo(() => {
    const targetDateStr = formatDate(activeDate).toLowerCase().trim();
    const d = activeDate;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const isoPrefix = `${yyyy}-${mm}-${dd}`;

    // Calculate sales on active selected date
    const dateMatchingSales = (allSales || []).filter(s => {
      const act = (s.activationDate || s.saleDate || '').toLowerCase().trim();
      const created = (s.createdAt || '').slice(0, 10);
      return act === targetDateStr || created === isoPrefix;
    });

    // If matching records found for date, use them; otherwise if activeDate is today, fallback to stats
    const isToday = new Date().toDateString() === activeDate.toDateString();
    let soldCount = dateMatchingSales.length;
    let amountSum = dateMatchingSales.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    if (isToday) {
      if (soldCount === 0 && (stats?.totalSales || 0) > 0) {
        soldCount = allSales.length > 0 ? allSales.length : (stats?.totalSales || 0);
      }
      if (amountSum === 0 && (stats?.totalRevenue || 0) > 0) {
        amountSum = stats?.totalRevenue || 0;
      }
    }

    // Secondary metrics: strictly computed from actual active records
    let expired = 0;
    let todayExp = 0;
    if (allSales && allSales.length > 0) {
      expired = allSales.filter(s => {
        const diff = getDaysDiff(s.expiryDate, activeDate);
        return diff !== null && typeof diff === 'number' && !isNaN(diff) && diff < 0;
      }).length;
      todayExp = allSales.filter(s => {
        const diff = getDaysDiff(s.expiryDate, activeDate);
        return diff !== null && typeof diff === 'number' && !isNaN(diff) && diff === 0;
      }).length;
    }

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

    const totalSales = (allSales && allSales.length > 0) ? allSales.length : (stats?.totalSales ?? 0);

    return {
      dateSoldAC: soldCount,
      dateAmount: amountSum,
      expiredCount: expired,
      todayCount: todayExp,
      totalSalesCount: totalSales,
      freeScreensCount: freeScreens
    };
  }, [activeDate, allSales, inventoryList, stats]);

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
              {expiredCount}
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
              {dateSoldAC}
            </div>
          </div>

          {/* Card 3: Amount (Blue Gradient) */}
          <div
            onClick={() => onNavigate('revenue-mgmt')}
            style={{
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
            title="View Revenue Management & Profit"
          >
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
              ₹{Number(dateAmount).toLocaleString('en-IN')}
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
                <div className="stat-card-value text-blue">{totalSalesCount}</div>
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
                <div className="stat-card-value text-green">{freeScreensCount}</div>
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
                <div className="stat-card-value text-orange">{todayCount}</div>
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
                <div className="stat-card-value text-red">{expiredCount}</div>
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
              onClick={() => onNavigate('sale')}
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
