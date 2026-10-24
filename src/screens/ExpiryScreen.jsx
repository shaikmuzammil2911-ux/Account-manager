import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, Bell, Check, X, Search,
  FileSpreadsheet, RefreshCw, User, Phone, Mail, Lock,
  CheckCircle2, Tv, Key, Clock, AlertTriangle, Layers, ChevronLeft, ChevronRight, Trash2
} from 'lucide-react';
import { api } from '../api/client';
import { formatDate, parseDate, getDaysDiff, getExpiryStatus, isValidDateStr } from '../utils/dateUtils';
import { exportExpiryToExcel } from '../utils/excelExport';
import CopyButton from '../components/CopyButton';
import BrandSelectorModal from '../components/BrandSelectorModal';
import DatePickerModal from '../components/DatePickerModal';
import DeleteSaleModal from '../components/DeleteSaleModal';

export default function ExpiryScreen({
  brands = [],
  selectedBrand,
  onOpenNotifyModal,
  showToast,
  dateFilter = '',
  onOpenDatePicker,
  onClearDateFilter
}) {
  const todayStr = formatDate(new Date());

  // Dynamic date selection: defaults to current date dynamically (not hardcoded)
  const [selectedDate, setSelectedDate] = useState(dateFilter || todayStr);
  const [dateRange, setDateRange] = useState(null); // { start: 'DD-MMM-YYYY', end: 'DD-MMM-YYYY' }
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState(selectedBrand?.id || 'all');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

  const [items, setItems] = useState([]);
  const [inventoryList, setInventoryList] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_inventory');
      if (cached) return JSON.parse(cached);
      const local = JSON.parse(localStorage.getItem('accounts_manager_app_data_v7') || '{}');
      if (Array.isArray(local.inventory) && local.inventory.length > 0) return local.inventory;
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const dateStripRef = useRef(null);
  const selectedPillRef = useRef(null);

  // Sync external brand or dateFilter if updated from outside
  useEffect(() => {
    if (selectedBrand?.id) {
      setFilterBrand(selectedBrand.id);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (dateFilter) {
      setSelectedDate(dateFilter);
      setDateRange(null);
    }
  }, [dateFilter]);

  // Delete sale modal state
  const [saleToDelete, setSaleToDelete] = useState(null);

  // Fetch sales and inventory accounts
  const fetchExpiryList = async () => {
    try {
      setLoading(true);
      const [salesData, invData] = await Promise.all([
        api.getSales({ brandId: 'all' }),
        api.getInventory({ brandId: 'all' })
      ]);
      setItems(Array.isArray(salesData) ? salesData : []);
      setInventoryList(Array.isArray(invData) ? invData : []);
    } catch (err) {
      if (showToast) showToast('Failed to load expiry data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryList();
  }, []);

  const getBrandObj = (brandId) => {
    return (brands || []).find(b => b.id === brandId || b.name?.toLowerCase() === String(brandId).toLowerCase()) || null;
  };

  const handleInitiateDelete = (screenSub) => {
    const saleObj = screenSub.rawSale || {
      id: screenSub.saleId || screenSub.id,
      customerName: screenSub.customerName,
      customerNumber: screenSub.customerNumber,
      brandName: screenSub.brandName,
      screenNumber: screenSub.screenNumber,
      accountEmail: screenSub.accountEmail
    };
    setSaleToDelete(saleObj);
  };

  const handleConfirmDelete = async (sale) => {
    const saleId = sale.id || sale.saleId;
    if (!saleId) throw new Error('Invalid sale identifier');
    await api.deleteSale(saleId);
    setItems(prev => prev.filter(s => s.id !== saleId));
    if (showToast) showToast('Sale successfully deleted');
  };

  // =========================================================================
  // 1. DERIVE CUSTOMER EXPIRY CARDS STRICTLY FROM VALID CUSTOMER SALES
  // =========================================================================
  const allScreens = [];
  (items || []).forEach((sale, sIdx) => {
    if (!sale || sale.isDeleted || sale.status === 'Deleted' || sale.status === 'deleted') return;
    const diff = sale.daysRemaining !== undefined ? sale.daysRemaining : getDaysDiff(sale.expiryDate);
    const statusObj = getExpiryStatus(sale.expiryDate);
    const screenNum = parseInt(String(sale.screenNumber).replace(/\D/g, '') || String(sIdx + 1), 10);
    const brand = getBrandObj(sale.brandId);

    const linkedAccount = (inventoryList || []).find(inv =>
      (sale.inventoryId && inv.id === sale.inventoryId) ||
      (sale.accountEmail && String(inv?.email || '').toLowerCase().trim() === String(sale.accountEmail || '').toLowerCase().trim())
    );

    allScreens.push({
      id: sale.id,
      saleId: sale.id,
      accountId: sale.inventoryId || linkedAccount?.id || null,
      accountRecordNumber: linkedAccount?.recordNumber || null,
      accountEmail: sale.accountEmail || linkedAccount?.email || '',
      accountPassword: sale.accountPassword || linkedAccount?.password || '',
      brandId: sale.brandId || linkedAccount?.brandId || 'other',
      brandName: sale.brandName || linkedAccount?.brandName || brand?.displayName || brand?.name || 'OTT Service',
      screenNumber: screenNum,
      screenPin: sale.screenPin || '',
      status: 'occupied',
      customerName: sale.customerName || 'Customer',
      customerNumber: sale.customerNumber || '',
      customerEmail: sale.customerEmail || '',
      validity: sale.validity || '01 Month',
      activationDate: sale.activationDate || sale.saleDate || '',
      expiryDate: sale.expiryDate || '',
      daysRemaining: diff,
      expiryStatus: statusObj.status,
      deviceName: sale.deviceName || '',
      notificationSent: !!sale.notificationSent,
      lastNotifiedAt: sale.lastNotifiedAt || null,
      amount: sale.amount || '',
      sellerName: sale.sellerName || '',
      rawSale: sale
    });
  });

  // Base brand filtering
  const baseScreenRecords = allScreens.filter(s => {
    if (filterBrand !== 'all') {
      const bId = String(s.brandId || '').toLowerCase();
      const bName = String(s.brandName || '').toLowerCase();
      const target = filterBrand.toLowerCase();
      return bId === target || bName.includes(target);
    }
    return true;
  });

  // =========================================================================
  // 2. HORIZONTAL DATE LIST GENERATION (-14 Days to +28 Days)
  // =========================================================================
  const daysList = [];
  const baseDateObj = new Date();
  for (let offset = -14; offset <= 28; offset++) {
    const d = new Date(baseDateObj.getFullYear(), baseDateObj.getMonth(), baseDateObj.getDate() + offset);
    const dStr = formatDate(d); // e.g. "20-Oct-2026"
    const dayNum = String(d.getDate()).padStart(2, '0');
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // "Mon", "Tue"
    const monthName = d.toLocaleDateString('en-US', { month: 'short' }); // "Oct"
    const isToday = offset === 0;

    // Evaluate matching screens for this date to determine persistent status
    const matchingScreens = baseScreenRecords.filter(s => {
      if (!isValidDateStr(s.expiryDate)) return false;
      const parsed = parseDate(s.expiryDate);
      return parsed && formatDate(parsed) === dStr;
    });

    const hasRecords = matchingScreens.length > 0;
    const allNotified = hasRecords && matchingScreens.every(s => s.notificationSent);

    daysList.push({
      dateStr: dStr,
      dayNum,
      dayName,
      monthName,
      isToday,
      offset,
      recordCount: matchingScreens.length,
      hasRecords,
      allNotified
    });
  }

  // Auto-scroll the date strip to the selected date pill
  useEffect(() => {
    if (selectedPillRef.current) {
      selectedPillRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [selectedDate, dateRange]);

  // =========================================================================
  // 3. FILTER SCREEN RECORDS BASED ON DATE / RANGE & SEARCH
  // =========================================================================
  const filteredScreens = baseScreenRecords.filter(sub => {
    const hasValidDate = isValidDateStr(sub.expiryDate);

    // 1. Date selection / Range filter
    if (dateRange && dateRange.start && dateRange.end) {
      if (!hasValidDate) return false;
      const subTime = parseDate(sub.expiryDate)?.getTime();
      const startTime = parseDate(dateRange.start)?.getTime();
      const endTime = parseDate(dateRange.end)?.getTime();
      if (!subTime || !startTime || !endTime) return false;
      if (subTime < startTime || subTime > endTime) return false;
    } else if (selectedDate && selectedDate !== 'ALL') {
      if (!hasValidDate) return false;
      const parsed = parseDate(sub.expiryDate);
      if (!parsed || formatDate(parsed) !== selectedDate) return false;
    }

    // 2. Search query filter
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

  // Sort screens chronologically and by screenNumber
  filteredScreens.sort((a, b) => {
    const dateA = parseDate(a.expiryDate)?.getTime() || 0;
    const dateB = parseDate(b.expiryDate)?.getTime() || 0;
    if (dateA !== dateB) return dateA - dateB;
    return (a.screenNumber || 0) - (b.screenNumber || 0);
  });

  // Handle WhatsApp Notify action directly
  const handleNotifyAction = async (sub) => {
    if (onOpenNotifyModal) {
      onOpenNotifyModal(sub);
      return;
    }

    try {
      if (sub.saleId) {
        await api.notifyCustomer(sub.saleId);
      }
      setItems(prev => prev.map(s => s.id === sub.id ? { ...s, notificationSent: true, lastNotifiedAt: new Date().toISOString() } : s));
      if (showToast) showToast(`Notification sent for Screen-${sub.screenNumber}`, 'success');
    } catch (e) {
      if (showToast) showToast('Failed to record notification', 'error');
    }
  };

  // Handle Excel Export (.xlsx)
  const handleExportExcel = () => {
    try {
      setExporting(true);
      const bObj = getBrandObj(filterBrand);
      const brandName = bObj ? (bObj.displayName || bObj.name) : 'All Brands';
      const recordsToExport = filteredScreens.length > 0 ? filteredScreens : baseScreenRecords;
      const filename = exportExpiryToExcel(recordsToExport, {
        selectedBrandName: brandName
      });
      if (showToast) showToast(`Downloaded: ${filename}`, 'success');
    } catch (e) {
      if (showToast) showToast('Failed to export Excel: ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  // Render Highlighted Expiry Date Badge
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

  return (
    <div className="screen-content" style={{ paddingBottom: '95px', paddingTop: '8px' }}>
      {/* Brand Selector Modal */}
      <BrandSelectorModal
        isOpen={showBrandModal}
        brands={brands}
        selectedBrandId={filterBrand}
        onSelect={(b) => {
          setFilterBrand(b ? b.id : 'all');
          if (showToast) {
            showToast(b ? `Filtered by ${b.displayName || b.name}` : 'Showing All OTT Brands', 'info');
          }
        }}
        onClose={() => setShowBrandModal(false)}
      />

      {/* Date Picker Modal for Single Date or Date Range */}
      <DatePickerModal
        isOpen={showCalendarModal}
        initialDate={selectedDate !== 'ALL' ? selectedDate : todayStr}
        initialStartDate={dateRange?.start || ''}
        initialEndDate={dateRange?.end || ''}
        onSelectDate={(date) => {
          setSelectedDate(date);
          setDateRange(null);
          setShowCalendarModal(false);
          if (showToast) showToast(`Selected Expiry Date: ${date}`, 'info');
        }}
        onSelectRange={(start, end) => {
          setDateRange({ start, end });
          setSelectedDate(null);
          setShowCalendarModal(false);
          if (showToast) showToast(`Selected Expiry Range: ${start} → ${end}`, 'info');
        }}
        onClearDate={() => {
          setSelectedDate('ALL');
          setDateRange(null);
          setShowCalendarModal(false);
          if (onClearDateFilter) onClearDateFilter();
          if (showToast) showToast('Date filter cleared: Showing all dates', 'info');
        }}
        onClose={() => setShowCalendarModal(false)}
      />

      {/* =================================================================== */}
      {/* ROW 1: SEARCH BAR & QUICK FILTERS                                 */}
      {/* =================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '10px'
      }}>
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
            placeholder="Search customer, phone, email, brand, screen..."
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '32px',
              paddingRight: searchQuery ? '30px' : '10px',
              border: '1.5px solid #cbd5e1',
              borderRadius: '10px',
              fontSize: '12.5px',
              fontWeight: 600,
              background: '#ffffff',
              color: '#0f172a',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
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

        {/* Brand Filter Pill (Click opens brand modal) */}
        <button
          type="button"
          onClick={() => setShowBrandModal(true)}
          style={{
            height: '38px',
            padding: '0 12px',
            borderRadius: '10px',
            background: filterBrand !== 'all' ? (getBrandObj(filterBrand)?.color || '#2563eb') : '#ffffff',
            color: filterBrand !== 'all' ? '#ffffff' : '#334155',
            border: filterBrand !== 'all' ? 'none' : '1.5px solid #cbd5e1',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
          title="Filter by OTT Brand"
        >
          <Tv size={14} />
          <span>{filterBrand === 'all' ? 'All Brands' : (getBrandObj(filterBrand)?.displayName?.split(' ')[0] || filterBrand)}</span>
        </button>

        {/* Calendar / Date Range Picker Trigger */}
        <button
          type="button"
          onClick={() => setShowCalendarModal(true)}
          style={{
            height: '38px',
            width: '38px',
            minWidth: '38px',
            borderRadius: '10px',
            background: (dateRange || (selectedDate && selectedDate !== todayStr && selectedDate !== 'ALL')) ? '#eff6ff' : '#ffffff',
            border: (dateRange || (selectedDate && selectedDate !== todayStr && selectedDate !== 'ALL')) ? '1.5px solid #2563eb' : '1.5px solid #cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}
          title="Open Calendar / Date-Range Picker"
        >
          <Calendar size={17} color={(dateRange || (selectedDate && selectedDate !== todayStr && selectedDate !== 'ALL')) ? '#2563eb' : '#475569'} strokeWidth={2.4} />
        </button>
      </div>

      {/* =================================================================== */}
      {/* ROW 2: HORIZONTALLY SCROLLABLE DATE SELECTOR STRIP (Section 3)     */}
      {/* Past dates left, Today in center, Future dates right                */}
      {/* Visual Status: Green = All Notified, Red = Pending, Neutral = None  */}
      {/* Distinct selected highlight outline                                 */}
      {/* =================================================================== */}
      <div
        ref={dateStripRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '10px',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {/* "ALL DATES" Pill */}
        <button
          type="button"
          onClick={() => {
            setSelectedDate('ALL');
            setDateRange(null);
          }}
          style={{
            flexShrink: 0,
            minWidth: '58px',
            height: '62px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: selectedDate === 'ALL' && !dateRange ? '#1e40af' : '#ffffff',
            color: selectedDate === 'ALL' && !dateRange ? '#ffffff' : '#475569',
            border: selectedDate === 'ALL' && !dateRange ? '2px solid #1e3a8a' : '1.5px solid #e2e8f0',
            boxShadow: selectedDate === 'ALL' && !dateRange ? '0 3px 8px rgba(30, 64, 175, 0.35)' : '0 1px 2px rgba(0,0,0,0.04)',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            padding: '4px'
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
            VIEW
          </div>
          <div style={{ fontSize: '14px', fontWeight: 900 }}>ALL</div>
          <div style={{ fontSize: '9px', fontWeight: 700, opacity: 0.85 }}>DATES</div>
        </button>

        {/* Dynamic Day Pills (-14 Days to +28 Days) */}
        {daysList.map((item) => {
          const isSelected = !dateRange && selectedDate === item.dateStr;

          // Status colors based on actual persisted data:
          // Green: All applicable expiry records for that date have been successfully processed and notified.
          // Red: One or more applicable expiry records remain pending notification.
          // Neutral: No applicable expiry records exist for that date.
          let pillBg = '#ffffff';
          let pillBorder = '#e2e8f0';
          let textColor = '#334155';
          let statusBadgeBg = '#f1f5f9';
          let statusBadgeColor = '#64748b';
          let statusLabel = item.recordCount > 0 ? `${item.recordCount}` : '0';

          if (item.hasRecords) {
            if (item.allNotified) {
              pillBg = '#f0fdf4';
              pillBorder = '#86efac';
              textColor = '#15803d';
              statusBadgeBg = '#dcfce7';
              statusBadgeColor = '#166534';
              statusLabel = `✓ ${item.recordCount}`;
            } else {
              pillBg = '#fef2f2';
              pillBorder = '#fca5a5';
              textColor = '#b91c1c';
              statusBadgeBg = '#fee2e2';
              statusBadgeColor = '#991b1b';
              statusLabel = `${item.recordCount} Due`;
            }
          }

          return (
            <button
              key={item.dateStr}
              ref={isSelected ? selectedPillRef : null}
              type="button"
              onClick={() => {
                setSelectedDate(item.dateStr);
                setDateRange(null);
              }}
              style={{
                flexShrink: 0,
                width: '54px',
                minWidth: '54px',
                height: '62px',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '5px 2px',
                background: pillBg,
                color: textColor,
                border: isSelected ? '2.5px solid #2563eb' : `1.5px solid ${pillBorder}`,
                boxShadow: isSelected
                  ? '0 0 0 2px #bfdbfe, 0 4px 10px rgba(37,99,235,0.25)'
                  : '0 1px 2px rgba(0,0,0,0.04)',
                cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s ease'
              }}
              title={`${item.dateStr}${item.isToday ? ' (Today)' : ''}: ${item.recordCount} expiring (${item.hasRecords ? (item.allNotified ? 'All Notified' : 'Pending Notifications') : 'No records'})`}
            >
              {/* Day of Week */}
              <div style={{
                fontSize: '9.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.2px',
                color: item.isToday ? '#2563eb' : undefined
              }}>
                {item.isToday ? 'Today' : item.dayName}
              </div>

              {/* Big Day Number */}
              <div style={{
                fontSize: '17px',
                fontWeight: 900,
                lineHeight: 1,
                color: isSelected ? '#1d4ed8' : undefined
              }}>
                {item.dayNum}
              </div>

              {/* Status Indicator / Count Pill */}
              <div style={{
                fontSize: '9px',
                fontWeight: 800,
                padding: '1px 5px',
                borderRadius: '6px',
                background: statusBadgeBg,
                color: statusBadgeColor,
                lineHeight: 1.1,
                whiteSpace: 'nowrap'
              }}>
                {statusLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* ROW 3: ACTIVE DATE FILTER BANNER                                   */}
      {/* =================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: '10px',
        padding: '7px 12px',
        marginBottom: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
          <Calendar size={15} color="#2563eb" strokeWidth={2.4} />
          {dateRange ? (
            <span style={{ fontWeight: 800, color: '#1e40af' }}>
              Range: <strong>{dateRange.start}</strong> &rarr; <strong>{dateRange.end}</strong> ({filteredScreens.length} screens)
            </span>
          ) : selectedDate === 'ALL' ? (
            <span style={{ fontWeight: 800, color: '#334155' }}>
              Viewing: <strong>All Expiry Dates</strong> ({filteredScreens.length} screens)
            </span>
          ) : (
            <span style={{ fontWeight: 800, color: '#1e40af' }}>
              Date: <strong>{selectedDate}</strong> {selectedDate === todayStr ? '(Today)' : ''} &bull; {filteredScreens.length} screens
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {selectedDate !== todayStr && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate(todayStr);
                setDateRange(null);
              }}
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Jump to Today"
            >
              Today
            </button>
          )}

          {selectedDate !== 'ALL' && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate('ALL');
                setDateRange(null);
              }}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                color: '#475569',
                borderRadius: '6px',
                padding: '3px 8px',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
              title="Show All Dates"
            >
              All
            </button>
          )}
        </div>
      </div>

      {/* =================================================================== */}
      {/* ROW 4: INDEPENDENT SCREEN-LEVEL EXPIRY CARDS (Section 4)           */}
      {/* Displays all screen records expiring on selected date               */}
      {/* =================================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading subscriptions...
        </div>
      ) : filteredScreens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 800, color: '#64748b', marginBottom: '4px', fontSize: '15px' }}>
            {baseScreenRecords.length === 0 ? 'No expiry records' : `No screen expiries on ${selectedDate === 'ALL' ? 'selected filters' : selectedDate}.`}
          </p>
          <p style={{ fontSize: '12px', color: '#94a3b8' }}>
            {baseScreenRecords.length === 0 ? 'No customer sales or expiry records found.' : 'Use the date strip above to select another date or click "All" to view all records.'}
          </p>
        </div>
      ) : (
        filteredScreens.map((sub, sIdx) => {
          const isSecondCard = sIdx % 2 === 1;
          const statusObj = getExpiryStatus(sub.expiryDate);
          const brandObj = getBrandObj(sub.brandId);
          const showPin = brandObj ? (brandObj.showScreenPin !== false) : true;
          const showDevice = brandObj ? (brandObj.showDeviceName !== false) : true;
          const isNetflix = String(sub.brandId || '').toLowerCase() === 'netflix' || String(sub.brandName || '').toLowerCase().includes('netflix');

          return (
            <div
              key={sub.id || sIdx}
              className="inventory-card"
              style={{
                border: statusObj.border,
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '14px',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.05)',
                background: '#ffffff'
              }}
              id={`expiry-screen-card-${sIdx + 1}`}
            >
              {/* Card Header: Ribbon, Brand Badge, Highlighted Expiry Date Badge + Delete Button */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div className={`ribbon-badge ${isSecondCard ? 'blue' : ''}`}>
                  {String(sIdx + 1).padStart(2, '0')}
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

                {/* Top Right: Highlighted Expiry Date + Compact Red Trash Delete Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {renderHighlightedExpiryBadge(sub)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInitiateDelete(sub);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      minWidth: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: '#fee2e2',
                      border: '1.5px solid #ef4444',
                      color: '#dc2626',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(239, 68, 68, 0.2)',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    title="Delete sale"
                    aria-label="Delete sale"
                    id={`delete-expiry-sale-${sub.id || sIdx}`}
                  >
                    <Trash2 size={15} strokeWidth={2.4} />
                  </button>
                </div>
              </div>

              {/* Row 1: NAME & NUMBER */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>NAME</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    <User size={13} color="#64748b" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sub.customerName || 'Vacant Screen'}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>NUMBER</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={13} color="#64748b" />
                      <span>{sub.customerNumber || '-'}</span>
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
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {sub.accountEmail || '-'}
                    </span>
                  </div>
                </div>

                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px' }}>
                  <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 800 }}>PASSWORD</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: '#0f172a' }}>
                    <Lock size={13} color="#64748b" />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {sub.accountPassword || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 3: VALIDITY, SCREEN, PIN */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: (showPin && sub.screenPin) ? '1.2fr 1fr 1fr' : '1.2fr 1fr',
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
                    <span>Screen-{String(sub.screenNumber).padStart(2, '0')}</span>
                  </div>
                </div>

                {showPin && sub.screenPin && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '4px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9.5px', color: '#d97706', fontWeight: 800 }}>PIN</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 700, color: '#b45309' }}>
                      <Key size={12} color="#d97706" />
                      <span>{sub.screenPin}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Row 4: ACTIVATION, DEVICE, and NOTIFY BUTTON */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: (showDevice && sub.deviceName) ? '1fr 1fr 1.2fr' : '1.2fr 1fr',
                gap: '6px',
                alignItems: 'center'
              }}>
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#16a34a', fontWeight: 800 }}>ACTIVATION</div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#15803d' }}>
                    {sub.activationDate || '-'}
                  </div>
                </div>

                {showDevice && sub.deviceName && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ fontSize: '9px', color: '#2563eb', fontWeight: 800 }}>DEVICE</div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1d4ed8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={sub.deviceName}>
                      {sub.deviceName}
                    </div>
                  </div>
                )}

                {/* Big Red/Green Notify Button */}
                <button
                  type="button"
                  className={`glossy-btn ${sub.notificationSent ? 'glossy-btn-green' : 'glossy-btn-red'}`}
                  style={{
                    padding: '8px 4px',
                    fontSize: '13px',
                    height: '100%',
                    justifyContent: 'center',
                    boxShadow: sub.notificationSent ? '0 2px 6px rgba(22, 163, 74, 0.25)' : '0 2px 6px rgba(220, 38, 38, 0.25)'
                  }}
                  onClick={() => handleNotifyAction(sub)}
                  id={`notify-btn-${sIdx + 1}`}
                  title={sub.notificationSent ? `Notified on ${sub.lastNotifiedAt?.slice(0, 10)}. Click to resend.` : 'Send WhatsApp Reminder'}
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

      {/* Delete Sale Confirmation Modal */}
      <DeleteSaleModal
        isOpen={!!saleToDelete}
        sale={saleToDelete}
        origin="expiry"
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
