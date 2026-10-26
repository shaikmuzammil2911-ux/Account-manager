import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Calendar, Search, ArrowUpDown, Phone, User, Mail, Lock, Unlock, Save, Tv,
  Key, Share2, Check, ArrowLeft, ChevronRight, Layers, Clock, AlertTriangle, Plus, X, FileText,
  RefreshCw, CheckCircle2, Trash2, Edit3
} from 'lucide-react';
import { api } from '../api/client';
import { formatDate, parseDate, calculateExpiryDate, formatTimelineDateBadge } from '../utils/dateUtils';
import DatePickerModal from '../components/DatePickerModal';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';
import DeleteSaleModal from '../components/DeleteSaleModal';
import { formatSaleConfirmationMessage } from '../utils/whatsapp';

export default function RecentSalesScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onOpenNotifyModal,
  showToast,
  isAddSaleOpen,
  onOpenAddSale,
  onCloseAddSale,
  onSaleAdded,
  currentUser
}) {
  // Navigation: 'brands' (Step 1: Brand selection) or 'sales' (Step 2: Sales for selected brand)
  const [viewMode, setViewMode] = useState(selectedBrand ? 'sales' : 'brands');
  const [activeBrand, setActiveBrand] = useState(selectedBrand || null);
  const [brandSearch, setBrandSearch] = useState('');

  // Sync activeBrand with selectedBrand prop
  useEffect(() => {
    if (selectedBrand) {
      setActiveBrand(selectedBrand);
      setViewMode('sales');
    } else {
      setActiveBrand(null);
      setViewMode('brands');
    }
  }, [selectedBrand]);

  // Sales Data
  const [sales, setSales] = useState([]);
  const [allSales, setAllSales] = useState(() => {
    try {
      const cached = localStorage.getItem('accounts_manager_cached_sales');
      if (cached) return JSON.parse(cached);
      const local = JSON.parse(localStorage.getItem('accounts_manager_app_data_v7') || '{}');
      if (Array.isArray(local.sales) && local.sales.length > 0) return local.sales;
    } catch (e) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [inventoryAccounts, setInventoryAccounts] = useState([]);

  // Top 3-Button Filter Row: 'sold' (daily sales view) vs 'account' (grouped by account screens)
  const [salesGrouping, setSalesGrouping] = useState('sold');

  // Today's date dynamically calculated (no hardcoding)
  const todayStr = useMemo(() => formatDate(new Date()), []);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterDate, setFilterDate] = useState(todayStr); // Today selected by default
  const [filterDateRange, setFilterDateRange] = useState(null); // { start, end }
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const [sortDirection, setSortDirection] = useState('asc');
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);

  // Delete sale modal state
  const [saleToDelete, setSaleToDelete] = useState(null);

  const handleConfirmDeleteSale = async (sale) => {
    const saleId = sale.id;
    if (!saleId) throw new Error('Invalid sale identifier');
    await api.deleteSale(saleId);
    setSales(prev => prev.filter(s => s.id !== saleId));
    if (showToast) showToast('Sale successfully deleted');
  };

  // Auto-scroll ref to scroll to latest sale at bottom of timeline
  const timelineBottomRef = useRef(null);
  const scrollToBottom = () => {
    setTimeout(() => {
      if (timelineBottomRef.current) {
        timelineBottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 150);
  };

  // Scroll date indicator state
  const [scrollingDate, setScrollingDate] = useState('');
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolling(true);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
      }, 900);

      // Find topmost visible sale element
      const saleElements = document.querySelectorAll('[data-sale-date]');
      for (const el of saleElements) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 40 && rect.top <= window.innerHeight - 100) {
          const d = el.getAttribute('data-sale-date');
          if (d) {
            setScrollingDate(d);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  // Dynamic list of dates for the horizontal toolbar (last 14 days ending with today)
  const toolbarDates = useMemo(() => {
    const dates = [];
    const now = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const str = formatDate(d);
      const dayNum = String(d.getDate()).padStart(2, '0');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
      const monthYear = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase() + '-' + d.getFullYear();
      const isToday = i === 0;
      dates.push({
        dateStr: str,
        dayNum,
        dayName,
        monthYear,
        label: isToday ? `${dayNum} (Today)` : dayNum,
        isToday
      });
    }
    return dates;
  }, [todayStr]);

  // Add Sale Modal State
  const [localAddSaleOpen, setLocalAddSaleOpen] = useState(false);
  const showAddSaleModal = isAddSaleOpen !== undefined ? isAddSaleOpen : localAddSaleOpen;
  const setAddSaleModalState = (isOpen) => {
    setLocalAddSaleOpen(isOpen);
    if (!isOpen && onCloseAddSale) onCloseAddSale();
    if (isOpen && onOpenAddSale) onOpenAddSale();
  };

  const [savingSale, setSavingSale] = useState(false);
  const savingSaleRef = useRef(false);
  const [addSaleForm, setAddSaleForm] = useState({
    customerName: '',
    customerNumber: '',
    accountEmail: '',
    accountPassword: '',
    screenNumber: '01',
    screenPin: '1234',
    validity: '01 Month',
    activationDate: formatDate(new Date()),
    expiryDate: calculateExpiryDate(formatDate(new Date()), '01 Month'),
    amount: '',
    deviceName: '',
    note: ''
  });

  // Card editing state: sale ID -> editable fields (image copy 64 & 65)
  const [editingSales, setEditingSales] = useState({});

  const getBrandColor = (sale) => {
    const brand = brands.find(b => b.id === (sale.brandId || activeBrand?.id));
    return brand?.color || activeBrand?.color || '#e50914';
  };

  const getBrandDisplayName = (sale) => {
    const brand = brands.find(b => b.id === (sale.brandId || activeBrand?.id));
    return brand?.displayName || sale.brandName || activeBrand?.displayName || 'Netflix';
  };

  const handleToggleSaleLock = (sale) => {
    const isEditing = !!editingSales[sale.id];
    if (isEditing) {
      setEditingSales(prev => {
        const copy = { ...prev };
        delete copy[sale.id];
        return copy;
      });
      showToast('Sale card locked', 'info');
    } else {
      setEditingSales(prev => ({
        ...prev,
        [sale.id]: {
          customerName: sale.customerName || '',
          customerNumber: sale.customerNumber || '',
          accountEmail: sale.accountEmail || '',
          accountPassword: sale.accountPassword || '',
          validity: sale.validity || '01 Month',
          screenNumber: sale.screenNumber || '01',
          screenPin: sale.screenPin || '1234',
          activationDate: sale.activationDate || '',
          expiryDate: sale.expiryDate || '',
          amount: sale.amount !== undefined ? String(sale.amount) : '',
          deviceName: sale.deviceName || '',
          note: sale.note || ''
        }
      }));
      showToast('Sale card unlocked for editing', 'info');
    }
  };

  const handleEditingFieldChange = (saleId, field, value) => {
    setEditingSales(prev => {
      const cur = prev[saleId] || {};
      const updated = { ...cur, [field]: value };
      if (field === 'validity' || field === 'activationDate') {
        const act = field === 'activationDate' ? value : (cur.activationDate || '');
        const val = field === 'validity' ? value : (cur.validity || '01 Month');
        if (act && val) {
          updated.expiryDate = calculateExpiryDate(act, val);
        }
      }
      return { ...prev, [saleId]: updated };
    });
  };

  const handleSaveSaleCard = async (sale) => {
    const editData = editingSales[sale.id];
    if (!editData) return;
    try {
      const payload = {
        customerName: editData.customerName.trim(),
        customerNumber: editData.customerNumber.trim(),
        accountEmail: editData.accountEmail.trim(),
        accountPassword: editData.accountPassword.trim(),
        validity: editData.validity,
        screenNumber: editData.screenNumber,
        screenPin: editData.screenPin.trim(),
        activationDate: editData.activationDate,
        expiryDate: editData.expiryDate,
        amount: Number(editData.amount) || sale.amount,
        deviceName: editData.deviceName.trim(),
        note: editData.note.trim()
      };
      await api.updateSale(sale.id, payload);
      setSales(prev => prev.map(s => s.id === sale.id ? { ...s, ...payload } : s));
      setEditingSales(prev => {
        const copy = { ...prev };
        delete copy[sale.id];
        return copy;
      });
      showToast('Sale updated successfully!', 'success');
      fetchAllSales();
    } catch (err) {
      showToast('Failed to update sale', 'error');
    }
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load all sales to compute brand-wise sales counts
  const fetchAllSales = async () => {
    try {
      const data = await api.getSales({
        brandId: 'all',
        sellerEmail: currentUser?.email
      });
      setAllSales(data);
    } catch (err) {
      console.warn('Error fetching all sales', err);
    }
  };

  // Fetch inventory accounts for active brand to populate dropdown in Add Sale
  const fetchInventory = async () => {
    if (!activeBrand) return;
    try {
      const inv = await api.getInventory({ brandId: activeBrand.id });
      setInventoryAccounts(inv || []);
    } catch (e) {
      console.warn('Failed to load inventory for Add Sale form', e);
    }
  };

  useEffect(() => {
    fetchAllSales();
  }, [currentUser]);

  // Fetch sales for currently active brand
  const fetchBrandSales = async () => {
    if (!activeBrand && viewMode === 'sales') return;
    try {
      setLoading(true);
      const data = await api.getSales({
        brandId: activeBrand ? activeBrand.id : 'all',
        validity: filterValidity,
        date: filterDateRange ? undefined : filterDate,
        startDate: filterDateRange?.start,
        endDate: filterDateRange?.end,
        search: searchQuery,
        sellerEmail: currentUser?.email
      });
      setSales(data || []);
      setCurrentPage(1);
      scrollToBottom();
    } catch (err) {
      showToast('Failed to load recent sales', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'sales' && activeBrand) {
      fetchBrandSales();
      fetchInventory();
    }
  }, [activeBrand, filterValidity, filterDate, filterDateRange, searchQuery, viewMode]);

  // Reset Add Sale Form when activeBrand changes
  useEffect(() => {
    if (activeBrand) {
      const defaultPrice = activeBrand.prices?.['01 Month'] || 199;
      setAddSaleForm({
        customerName: '',
        customerNumber: '',
        accountEmail: '',
        accountPassword: '',
        screenNumber: '01',
        screenPin: '1234',
        validity: '01 Month',
        activationDate: formatDate(new Date()),
        expiryDate: calculateExpiryDate(formatDate(new Date()), '01 Month'),
        amount: String(defaultPrice),
        deviceName: '',
        note: ''
      });
    }
  }, [activeBrand]);

  const cycleValidity = () => {
    const list = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const idx = list.indexOf(filterValidity);
    const next = list[(idx + 1) % list.length];
    setFilterValidity(next);
    showToast(next === 'all' ? 'Showing all validities' : `Filtered: ${next}`, 'info');
  };

  const toggleSortDirection = () => {
    const nextDir = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(nextDir);
    showToast(
      nextDir === 'desc'
        ? 'Sorted: Latest to Oldest'
        : 'Sorted: Past to Present (Oldest to Newest)',
      'info'
    );
  };

  const handleRefreshLiveSheet = async () => {
    try {
      setIsSyncingSheet(true);
      const res = await api.pullFromGoogleSheet();
      await fetchBrandSales();
      await fetchAllSales();
      if (res?.success) {
        showToast(`Synced ${res.count || 0} sales from Google Sheets!`, 'success');
      } else {
        showToast(res?.message || 'Data refreshed', 'info');
      }
    } catch (err) {
      showToast('Refresh failed: ' + err.message, 'error');
    } finally {
      setIsSyncingSheet(false);
    }
  };

  const copyFullSaleDetails = (sale) => {
    let text = `Customer: ${sale.customerName} (${sale.customerNumber})
OTT Brand: ${sale.brandName}
Account Email: ${sale.accountEmail}
Password: ${sale.accountPassword}
Screen: ${sale.screenNumber} | PIN: ${sale.screenPin}
Validity: ${sale.validity}
Activation: ${sale.activationDate}
Expiry: ${sale.expiryDate}`;

    if (sale.deviceName && sale.deviceName.trim()) {
      text += `\nDevice: ${sale.deviceName.trim()}`;
    }

    if (sale.note) {
      text += `\nNote: ${sale.note}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(sale.id);
    showToast('Customer sale details copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Direct WhatsApp chat with credentials prefilled using shared custom template
  const handleDirectWhatsApp = (sale) => {
    const cleanPhone = (sale.customerNumber || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const savedTemplate = localStorage.getItem('accounts_whatsapp_sale_template');

    const credentialsMessage = formatSaleConfirmationMessage({
      customerName: sale.customerName,
      customerNumber: sale.customerNumber,
      customerPhone: sale.customerNumber,
      brandName: sale.brandName || activeBrand?.displayName || 'Netflix',
      pricingPlan: sale.pricingPlan || sale.planVariant || 'General',
      accountEmail: sale.accountEmail,
      accountPassword: sale.accountPassword,
      screenNumber: sale.screenNumber,
      screenPin: sale.screenPin,
      deviceName: sale.deviceName,
      validity: sale.validity,
      activationDate: sale.activationDate,
      expiryDate: sale.expiryDate,
      amount: sale.amount,
      referenceName: sale.referenceName || '',
      referenceNumber: sale.referenceNumber || sale.referencePhone || ''
    }, savedTemplate);

    try {
      navigator.clipboard.writeText(credentialsMessage);
    } catch (e) {}

    const waUrl = `https://wa.me/${phoneParam}?text=${encodeURIComponent(credentialsMessage)}`;
    window.open(waUrl, '_blank');
    showToast(`Opening WhatsApp for ${sale.customerName}...`, 'success');
  };

  // Handle Add Sale Form field changes
  const handleAddSaleChange = (field, value) => {
    setAddSaleForm(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'validity' || field === 'activationDate') {
        const actDate = field === 'activationDate' ? value : prev.activationDate;
        const val = field === 'validity' ? value : prev.validity;
        updated.expiryDate = calculateExpiryDate(actDate, val);
        if (field === 'validity' && activeBrand?.prices?.[value]) {
          updated.amount = String(activeBrand.prices[value]);
        }
      }
      return updated;
    });
  };

  // Submit Add Sale
  const handleSaveSale = async (e) => {
    if (e) e.preventDefault();
    if (savingSaleRef.current || savingSale) return;

    if (!addSaleForm.customerName.trim()) {
      showToast('Please enter Customer Name', 'error');
      return;
    }
    if (!addSaleForm.customerNumber.trim()) {
      showToast('Please enter Phone Number', 'error');
      return;
    }
    if (!addSaleForm.accountEmail.trim()) {
      showToast('Please enter Account Email / ID', 'error');
      return;
    }

    try {
      savingSaleRef.current = true;
      setSavingSale(true);
      const targetBrandId = (activeBrand && activeBrand.id !== 'all') ? activeBrand.id : (brands[0]?.id || 'netflix');
      const targetBrand = brands.find(b => b.id === targetBrandId) || activeBrand;
      const payload = {
        brandId: targetBrandId,
        brandName: targetBrand?.displayName || targetBrand?.name || 'Netflix',
        sellerEmail: currentUser?.email || 'Fixyourmobiles10@gmail.com',
        customerName: addSaleForm.customerName.trim(),
        customerNumber: addSaleForm.customerNumber.trim(),
        accountEmail: addSaleForm.accountEmail.trim(),
        accountPassword: addSaleForm.accountPassword.trim() || 'Secure@123',
        screenNumber: addSaleForm.screenNumber,
        screenPin: addSaleForm.screenPin.trim() || '1234',
        validity: addSaleForm.validity,
        activationDate: addSaleForm.activationDate,
        expiryDate: addSaleForm.expiryDate,
        amount: Number(addSaleForm.amount) || activeBrand.prices?.[addSaleForm.validity] || 199,
        deviceName: addSaleForm.deviceName.trim(),
        note: addSaleForm.note.trim()
      };

      await api.createSale(payload);
      showToast('Sale added successfully!', 'success');
      setAddSaleModalState(false);
      await fetchBrandSales();
      await fetchAllSales();
      if (onSaleAdded) onSaleAdded();
      scrollToBottom();
    } catch (err) {
      showToast(err.message || 'Failed to add sale', 'error');
    } finally {
      savingSaleRef.current = false;
      setSavingSale(false);
    }
  };

  // Sort Sales Array based on sortDirection (WhatsApp default: 'asc' oldest top, newest bottom)
  const sortedSales = [...sales].sort((a, b) => {
    // 1. Group by activation/sale date
    const dateA = parseDate(a.activationDate || a.saleDate).getTime();
    const dateB = parseDate(b.activationDate || b.saleDate).getTime();
    if (dateA !== dateB) {
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    }
    // 2. Within the same date: actual creation timestamp (not updated_at)
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    if (timeA && timeB && timeA !== timeB) {
      return sortDirection === 'desc' ? timeB - timeA : timeA - timeB;
    }
    // 3. Stable secondary identifier
    const recA = parseInt(a.recordNumber || '0', 10);
    const recB = parseInt(b.recordNumber || '0', 10);
    if (recA !== recB) {
      return sortDirection === 'desc' ? recB - recA : recA - recB;
    }
    const idA = String(a.id || '');
    const idB = String(b.id || '');
    return sortDirection === 'desc' ? idB.localeCompare(idA) : idA.localeCompare(idB);
  });

  // Group into date segments for WhatsApp-style timeline view
  const dateGroups = [];
  const dateMap = new Map();

  for (const sale of sortedSales) {
    const dStr = sale.activationDate || sale.saleDate || 'Undated';
    if (!dateMap.has(dStr)) {
      const g = { date: dStr, sales: [] };
      dateMap.set(dStr, g);
      dateGroups.push(g);
    }
    dateMap.get(dStr).sales.push(sale);
  }

  // Group Sales by Account for 'account' view
  // Groups sales by accountEmail; then within each account sorts screens 1, 2, 3...
  // Empty screens are naturally excluded as only sold records exist in sales.
  const accountGroups = [];
  const accountMap = new Map();

  for (const sale of sortedSales) {
    const emailKey = (sale.accountEmail || 'Unassigned').toLowerCase().trim();
    if (!accountMap.has(emailKey)) {
      const groupObj = {
        email: sale.accountEmail || 'Unassigned Account',
        password: sale.accountPassword || '',
        sales: []
      };
      accountMap.set(emailKey, groupObj);
      accountGroups.push(groupObj);
    }
    accountMap.get(emailKey).sales.push(sale);
  }

  // Sort screens numerically within each account (Screen-1, Screen-2...)
  accountGroups.forEach(group => {
    group.sales.sort((a, b) => {
      const numA = parseInt(String(a.screenNumber).replace(/\D/g, '') || '0', 10);
      const numB = parseInt(String(b.screenNumber).replace(/\D/g, '') || '0', 10);
      return numA - numB;
    });
  });

  // =========================================================================
  // STEP 1: SHOW OTT BRANDS GRID FIRST (matching image copy 37.png)
  // =========================================================================
  if (!activeBrand) {
    return (
      <OttBrandsGrid
        brands={brands}
        onSelectBrand={(brand) => {
          setActiveBrand(brand);
          if (onSelectBrand) onSelectBrand(brand);
        }}
        showHeader={false}
        showAllBrands={true}
      />
    );
  }

  // Helper renderer for a single Sold Card
  const renderSaleCard = (sale, sIdx, isAccountView = false) => {
    const isEditing = !!editingSales[sale.id];
    const editState = editingSales[sale.id] || {};
    const bColor = getBrandColor(sale);
    const bName = getBrandDisplayName(sale);

    return (
      <div
        key={sale.id || sIdx}
        data-sale-date={sale.activationDate || sale.saleDate || ''}
        className="inventory-card"
        style={{
          padding: '14px 12px',
          position: 'relative',
          border: '2.5px solid #94a3b8',
          borderRadius: '16px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.06)'
        }}
        id={`recent-sale-${sale.recordNumber || sIdx}`}
      >
        {/* Top Row: Ribbon Badge, Brand Badge in Middle, Lock/Unlock Button on Right (All vertical height 34px aligned per image copy 71) */}
        <div className="card-top-row" style={{ marginBottom: '10px', alignItems: 'center', minHeight: '34px' }}>
          <div className="ribbon-badge" style={{
            height: '34px',
            minHeight: '34px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 12px',
            fontSize: '13.5px',
            fontWeight: 900,
            boxSizing: 'border-box'
          }}>
            {isAccountView
              ? `Screen ${String(sale.screenNumber).padStart(2, '0')}`
              : String(sIdx + 1).padStart(2, '0')}
          </div>

          {/* Show Brand in middle in related color box: height 34px aligned */}
          <div style={{
            background: bColor,
            color: '#ffffff',
            height: '34px',
            minHeight: '34px',
            padding: '0 18px',
            borderRadius: '8px',
            fontWeight: 900,
            fontSize: '13.5px',
            letterSpacing: '0.4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}>
            <span>{bName}</span>
          </div>

          {/* Action Buttons: Compact Lock + Explicit Edit/Save + Compact Red Trash Delete Button (image copy 193) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {/* 1. Smaller Lock Icon Button */}
            <button
              type="button"
              onClick={() => handleToggleSaleLock(sale)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                minWidth: '34px',
                height: '34px',
                minHeight: '34px',
                padding: 0,
                borderRadius: '8px',
                cursor: 'pointer',
                border: '1.5px solid',
                background: isEditing ? '#fef2f2' : '#f0fdf4',
                color: isEditing ? '#dc2626' : '#16a34a',
                borderColor: isEditing ? '#f87171' : '#4ade80',
                boxShadow: isEditing ? '0 2px 5px rgba(220, 38, 38, 0.2)' : '0 2px 5px rgba(22, 163, 74, 0.2)',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box'
              }}
              title={isEditing ? 'Card unlocked. Click to cancel/lock' : 'Card locked. Click to toggle lock'}
              id={`recent-sale-lock-btn-${sale.id}`}
            >
              {isEditing ? <Unlock size={15} strokeWidth={2.5} /> : <Lock size={15} strokeWidth={2.5} />}
            </button>

            {/* 2. Explicit Edit / Save Button */}
            <button
              type="button"
              onClick={() => {
                if (isEditing) {
                  handleSaveSaleCard(sale);
                } else {
                  handleToggleSaleLock(sale);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                height: '34px',
                minHeight: '34px',
                padding: '0 10px',
                borderRadius: '8px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                border: '1.5px solid',
                background: isEditing ? '#16a34a' : '#2563eb',
                color: '#ffffff',
                borderColor: isEditing ? '#15803d' : '#1d4ed8',
                boxShadow: isEditing ? '0 2px 6px rgba(22, 163, 74, 0.3)' : '0 2px 6px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box'
              }}
              title={isEditing ? 'Save changes' : 'Edit sale details'}
              id={`recent-sale-edit-btn-${sale.id}`}
            >
              {isEditing ? <Save size={13} strokeWidth={2.4} /> : <Edit3 size={13} strokeWidth={2.4} />}
              <span>{isEditing ? 'Save' : 'Edit'}</span>
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSaleToDelete(sale);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                minWidth: '34px',
                height: '34px',
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
              id={`recent-sale-delete-btn-${sale.id || sIdx}`}
            >
              <Trash2 size={16} strokeWidth={2.4} />
            </button>
          </div>
        </div>

        {/* Row 1: Customer Name & Number with Headings ABOVE and thicker borders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Customer Name</div>
            <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.customerName}
                  onChange={e => handleEditingFieldChange(sale.id, 'customerName', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13.5px', fontWeight: 900, color: '#0f172a', outline: 'none' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sale.customerName}
                  </span>
                  <CopyButton text={sale.customerName} tooltip="Copy name" size={13} showLabelOnCopy={false} />
                </>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Phone Number</div>
            <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="tel"
                  value={editState.customerNumber}
                  onChange={e => handleEditingFieldChange(sale.id, 'customerNumber', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13.5px', fontWeight: 900, color: '#0f172a', outline: 'none' }}
                />
              ) : (
                <>
                  <span style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                    {sale.customerNumber}
                  </span>
                  <CopyButton text={sale.customerNumber} tooltip="Copy number" size={13} showLabelOnCopy={false} />
                </>
              )}
            </div>
          </div>
        </div>

        {/* Row 2: Account ID / Email with CopyButton */}
        <div className="credential-row" style={{ marginBottom: '8px' }}>
          <div className="credential-label-badge blue" style={{ minWidth: '115px', width: '115px', padding: '6px 8px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>👤 ID</span>
          </div>
          <div className="credential-input-box" style={{
            border: '1.5px solid #94a3b8',
            justifyContent: 'space-between',
            overflow: 'hidden',
            minWidth: 0
          }}>
            {isEditing ? (
              <input
                type="text"
                value={editState.accountEmail}
                onChange={e => handleEditingFieldChange(sale.id, 'accountEmail', e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, outline: 'none' }}
              />
            ) : (
              <>
                <span
                  style={{
                    fontSize: '13.5px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflowX: 'auto',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    flex: 1,
                    minWidth: 0,
                    paddingRight: '6px'
                  }}
                  title={sale.accountEmail}
                >
                  {sale.accountEmail}
                </span>
                <CopyButton text={sale.accountEmail} tooltip="Copy email" size={13} />
              </>
            )}
          </div>
        </div>

        {/* Row 3: Account Password with CopyButton (Fixed icon separation with 115px badge) */}
        <div className="credential-row" style={{ marginBottom: '8px' }}>
          <div className="credential-label-badge purple" style={{ minWidth: '115px', width: '115px', padding: '6px 8px', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>🔒 Password</span>
          </div>
          <div className="credential-input-box" style={{
            border: '1.5px solid #94a3b8',
            justifyContent: 'space-between',
            minWidth: 0
          }}>
            {isEditing ? (
              <input
                type="text"
                value={editState.accountPassword}
                onChange={e => handleEditingFieldChange(sale.id, 'accountPassword', e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 700, outline: 'none' }}
              />
            ) : (
              <>
                <span style={{ fontSize: '13.5px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sale.accountPassword}
                </span>
                <CopyButton text={sale.accountPassword} tooltip="Copy password" size={13} />
              </>
            )}
          </div>
        </div>

        {/* Row 4: Validity, Screen No & Screen Pin with Headings ABOVE & Colored Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Validity</div>
            <div style={{ background: '#eff6ff', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #93c5fd', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <select
                  value={editState.validity}
                  onChange={e => handleEditingFieldChange(sale.id, 'validity', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 900, color: '#1d4ed8', outline: 'none', textAlign: 'center' }}
                >
                  <option value="01 Month">01 Month</option>
                  <option value="03 Months">03 Months</option>
                  <option value="06 Months">06 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#1d4ed8' }}>{sale.validity}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Screen No</div>
            <div style={{ background: '#fefce8', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #facc15', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.screenNumber}
                  onChange={e => handleEditingFieldChange(sale.id, 'screenNumber', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#854d0e', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#854d0e' }}>{sale.screenNumber}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>PIN</div>
            <div style={{ background: '#ecfeff', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #67e8f9', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={6}
                  value={editState.screenPin}
                  onChange={e => handleEditingFieldChange(sale.id, 'screenPin', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#0e7490', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0e7490' }}>{sale.screenPin}</span>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Activation Date, Expiry Date & Amount side-by-side with Headings ABOVE & Colored Boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Activation Date</div>
            <div style={{ background: '#f0fdf4', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #86efac', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.activationDate}
                  onChange={e => handleEditingFieldChange(sale.id, 'activationDate', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 800, color: '#15803d', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#15803d', whiteSpace: 'nowrap' }}>{sale.activationDate}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Expiry Date</div>
            <div style={{ background: '#fef2f2', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #fca5a5', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.expiryDate}
                  onChange={e => handleEditingFieldChange(sale.id, 'expiryDate', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 800, color: '#dc2626', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>{sale.expiryDate}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Amount</div>
            <div style={{ background: '#faf5ff', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #d8b4fe', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#7c3aed' }}>₹</span>
                  <input
                    type="number"
                    value={editState.amount}
                    onChange={e => handleEditingFieldChange(sale.id, 'amount', e.target.value)}
                    style={{ width: '60px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#7c3aed', outline: 'none', textAlign: 'center' }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#7c3aed' }}>₹{sale.amount || 199}</span>
              )}
            </div>
          </div>
        </div>

        {/* Small Note Box */}
        {(sale.note || isEditing) && (
          <div style={{
            background: '#fefce8',
            border: '1.5px solid #fde047',
            borderRadius: '8px',
            padding: '7px 10px',
            marginBottom: '8px',
            fontSize: '12.5px',
            color: '#854d0e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px'
          }}>
            <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>📝 Note:</span>
            {isEditing ? (
              <textarea
                rows="2"
                value={editState.note}
                onChange={e => handleEditingFieldChange(sale.id, 'note', e.target.value)}
                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 600, color: '#854d0e', outline: 'none', resize: 'none' }}
              />
            ) : (
              <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{sale.note}</span>
            )}
          </div>
        )}

        {/* Row 6 (Bottom Row): Device Name Box + Direct WhatsApp Chat Button + Notify Button */}
        <div>
          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Device Name</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Device Name Box */}
            <div style={{
              flex: 1,
              height: '44px',
              background: '#f8fafc',
              border: '1.5px solid #94a3b8',
              borderRadius: '10px',
              padding: '0 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
              boxSizing: 'border-box'
            }}>
              <Tv size={17} color="#64748b" style={{ flexShrink: 0 }} />
              {isEditing ? (
                <input
                  type="text"
                  value={editState.deviceName}
                  onChange={e => handleEditingFieldChange(sale.id, 'deviceName', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 800, color: '#0f172a', outline: 'none' }}
                />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 800, color: sale.deviceName ? '#0f172a' : '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sale.deviceName || '-'}
                </span>
              )}
            </div>

            {/* Direct WhatsApp Chat Icon Button with Crisp Official WhatsApp Icon (image copy 71) */}
            <button
              type="button"
              onClick={() => handleDirectWhatsApp(sale)}
              title="Open customer WhatsApp chat & send credentials"
              style={{
                width: '46px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                border: 'none',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 211, 102, 0.35)',
                flexShrink: 0
              }}
              id={`recent-sale-wa-btn-${sale.id}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  fill="#ffffff"
                  d="M19.05 4.91A9.816 9.816 0 0 0 12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01zm-7.01 15.24c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.188 8.188 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c.02 4.54-3.68 8.23-8.22 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43s-.56-1.34-.76-1.84c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.66.31-.22.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.17 1.74 2.66 4.21 3.73.59.25 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.17-.48-.29z"
                />
              </svg>
            </button>

            {/* Notify Button */}
            <button
              type="button"
              className="glossy-btn glossy-btn-red"
              style={{
                height: '44px',
                padding: '0 14px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)',
                flexShrink: 0
              }}
              onClick={() => onOpenNotifyModal(sale)}
              id={`recent-sale-notify-btn-${sale.id}`}
            >
              <span>Notify</span>
            </button>
          </div>
        </div>

        {/* When Unlocked: Action Buttons Save Changes and Cancel */}
        {isEditing && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ padding: '8px', fontSize: '13px', borderRadius: '8px' }}
              onClick={() => handleToggleSaleLock(sale)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-green"
              style={{ padding: '8px', fontSize: '13px', borderRadius: '8px' }}
              onClick={() => handleSaveSaleCard(sale)}
              id={`recent-sale-save-edit-${sale.id}`}
            >
              <Save size={15} />
              <span>Save Changes</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // =========================================================================
  // STEP 2: SHOW SALES FOR SELECTED BRAND
  // =========================================================================
  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '0px' }}>
      {/* =================================================================== */}
      {/* FIXED / STICKY CONTROL HEADER: Row 1, Row 2 & Viewing Date Strip    */}
      {/* (image copy 191, 194, 195, 196: Paina Search Bar, 02 Buttons, Dates fixed) */}
      {/* =================================================================== */}
      <div style={{
        position: 'sticky',
        top: 'var(--app-header-height, 60px)',
        zIndex: 40,
        background: '#ffffff',
        paddingTop: '10px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0',
        marginBottom: '10px'
      }}>
        {/* ROW 1 — SEARCH BAR & VALIDITY + ACCOUNTS ON SAME ROW (image copy 191) */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          marginBottom: '8px',
          flexWrap: 'nowrap'
        }}>
          {/* Search Input (Takes all available width on left) */}
          <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="form-input-pill"
              style={{ paddingLeft: '36px', height: '42px', fontSize: '13.5px', width: '100%', boxSizing: 'border-box' }}
              placeholder="Search customer, phone, email, brand, PIN, device..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              id="recent-sales-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Quick Filter Buttons: Validity and Accounts directly on right */}
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={cycleValidity}
              style={{
                height: '42px',
                padding: '0 14px',
                background: filterValidity !== 'all' ? '#1d4ed8' : '#2563eb',
                border: filterValidity !== 'all' ? '2px solid #1e40af' : '1.5px solid #2563eb',
                color: '#ffffff',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                whiteSpace: 'nowrap'
              }}
              title="Filter sales by Validity"
              id="recent-sales-btn-validity"
            >
              <span>{filterValidity === 'all' ? 'Validity' : `Validity: ${filterValidity.replace(' Months', 'M').replace(' Month', 'M')}`}</span>
            </button>

            <button
              type="button"
              onClick={() => setSalesGrouping(prev => prev === 'account' ? 'sold' : 'account')}
              style={{
                height: '42px',
                padding: '0 14px',
                background: salesGrouping === 'account' ? '#1d4ed8' : '#2563eb',
                border: salesGrouping === 'account' ? '2px solid #1e40af' : '1.5px solid #2563eb',
                color: '#ffffff',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                whiteSpace: 'nowrap'
              }}
              title="Group by Accounts vs Timeline"
              id="recent-sales-btn-account"
            >
              <Layers size={15} />
              <span>Accounts</span>
            </button>
          </div>
        </div>

        {/* ROW 2 — DATE TOOLBAR: Dates on left, Calendar & Sort on right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflow: 'hidden'
        }}>
          {/* Horizontally Scrollable Dates Strip with month/weekday/day number */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
              flex: 1,
              minWidth: 0,
              padding: '2px 0'
            }}
          >
            {/* All Dates option */}
            <button
              type="button"
              onClick={() => {
                setFilterDate('');
                setFilterDateRange(null);
              }}
              style={{
                flexShrink: 0,
                height: '52px',
                minWidth: '44px',
                padding: '4px 8px',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                border: !filterDate && !filterDateRange ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                background: !filterDate && !filterDateRange ? '#2563eb' : '#ffffff',
                color: !filterDate && !filterDateRange ? '#ffffff' : '#475569',
                boxShadow: !filterDate && !filterDateRange ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              <span style={{ fontSize: '9px', fontWeight: 700 }}>VIEW</span>
              <span style={{ fontSize: '13px', fontWeight: 900 }}>ALL</span>
            </button>

            {toolbarDates.map(item => {
              const isSelected = filterDate === item.dateStr && !filterDateRange;
              return (
                <button
                  key={item.dateStr}
                  type="button"
                  onClick={() => {
                    setFilterDate(item.dateStr);
                    setFilterDateRange(null);
                  }}
                  style={{
                    flexShrink: 0,
                    height: '52px',
                    minWidth: '52px',
                    padding: '3px 8px',
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid #2563eb' : '1.5px solid #e2e8f0',
                    background: isSelected ? '#2563eb' : (item.isToday ? '#eff6ff' : '#ffffff'),
                    color: isSelected ? '#ffffff' : (item.isToday ? '#1e40af' : '#475569'),
                    boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  title={item.dateStr}
                >
                  <span style={{ fontSize: '8.5px', fontWeight: 800, textTransform: 'uppercase', opacity: 0.85 }}>{item.dayName}</span>
                  <span style={{ fontSize: '15px', fontWeight: 900, lineHeight: 1 }}>{item.dayNum}</span>
                  <span style={{ fontSize: '8px', fontWeight: 700, opacity: 0.85 }}>{item.isToday ? 'TODAY' : item.monthYear?.split('-')[0]}</span>
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Calendar and Sort ONLY */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <button
              type="button"
              className="header-btn"
              style={{
                width: '40px',
                height: '52px',
                background: filterDateRange || (filterDate && filterDate !== todayStr) ? '#eff6ff' : '#ffffff',
                borderColor: filterDateRange || (filterDate && filterDate !== todayStr) ? '#2563eb' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '10px'
              }}
              onClick={() => setShowDatePicker(true)}
              title="Calendar: Select Single Date or Date Range"
              id="recent-sales-calendar-btn"
            >
              <Calendar size={18} color={filterDateRange || (filterDate && filterDate !== todayStr) ? '#2563eb' : '#475569'} />
            </button>

            <button
              type="button"
              className="header-btn"
              style={{
                width: '40px',
                height: '52px',
                background: sortDirection === 'asc' ? '#eff6ff' : '#ffffff',
                borderColor: sortDirection === 'asc' ? '#2563eb' : '#cbd5e1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                borderRadius: '10px'
              }}
              onClick={toggleSortDirection}
              title={sortDirection === 'asc' ? 'Ascending: Oldest Top, Newest Bottom (WhatsApp Style)' : 'Descending: Newest Top, Oldest Bottom'}
              id="recent-sales-sort-toggle-btn"
            >
              <ArrowUpDown size={18} color={sortDirection === 'asc' ? '#2563eb' : '#475569'} strokeWidth={2.3} />
            </button>
          </div>
        </div>

        {/* Date Range / Custom Filter Active Strip */}
        {(filterDateRange || (filterDate && filterDate !== todayStr)) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#eff6ff',
            padding: '8px 14px',
            borderRadius: '10px',
            marginTop: '8px',
            fontSize: '12.5px',
            border: '1px solid #bfdbfe'
          }}>
            <span style={{ color: '#1e40af', fontWeight: 700 }}>
              {filterDateRange ? (
                <>Date Range: <strong>{filterDateRange.start} → {filterDateRange.end}</strong></>
              ) : (
                <>Viewing Date: <strong>{filterDate}</strong></>
              )}
            </span>
            <button
              type="button"
              onClick={() => {
                setFilterDate(todayStr);
                setFilterDateRange(null);
              }}
              style={{ background: 'transparent', border: 'none', color: '#2563eb', fontWeight: 800, cursor: 'pointer', fontSize: '12.5px' }}
            >
              Reset to Today
            </button>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* SALES CONTENT: WhatsApp-Style Daily Timeline VS Account Grouping     */}
      {/* =================================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '15px' }}>
          <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 10px auto', display: 'block', color: '#2563eb' }} />
          Loading sales records...
        </div>
      ) : sortedSales.length === 0 ? (
        <div className="empty-state-card" style={{ textAlign: 'center', padding: '36px 16px', background: '#f8fafc', borderRadius: '16px', border: '1.5px dashed #cbd5e1' }}>
          <Calendar size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto', display: 'block' }} />
          <p style={{ fontWeight: 800, color: '#334155', fontSize: '15px', marginBottom: '6px' }}>
            {sales.length === 0 ? 'No sales yet' : `No sales recorded for ${filterDateRange ? `${filterDateRange.start} → ${filterDateRange.end}` : (filterDate ? filterDate : activeBrand.displayName)}.`}
          </p>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
            Click "+ Add Sale" to register a new screen sale.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-orange"
            style={{ padding: '8px 20px', fontSize: '13.5px', fontWeight: 900, borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
            onClick={() => setAddSaleModalState(true)}
          >
            <Plus size={16} />
            <span>+ Add Sale</span>
          </button>
        </div>
      ) : salesGrouping === 'account' ? (
        /* ================================================================= */
        /* ACCOUNT GROUPING VIEW                                             */
        /* Account 1 -> Screen-1, Screen-2 (empty omitted)... then Account 2 */
        /* ================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {accountGroups.map((group, aIdx) => {
            return (
              <div key={group.email + aIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Account Header Banner */}
                <div style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                  padding: '10px 12px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: '12px',
                      background: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 900,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      letterSpacing: '0.4px',
                      flexShrink: 0
                    }}>
                      {String(aIdx + 1).padStart(2, '0')}
                    </span>
                    <span style={{
                      fontSize: '13.5px',
                      fontWeight: 800,
                      color: '#ffffff',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {group.email}
                    </span>
                  </div>

                  <span style={{
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    color: '#ffffff',
                    flexShrink: 0
                  }}>
                    {(() => {
                      const invAcc = inventoryAccounts.find(i => (i.email || '').toLowerCase().trim() === (group.email || '').toLowerCase().trim());
                      const totalScreens = invAcc?.screens?.length || activeBrand?.screensCount || 5;
                      const soldCount = group.sales.length;
                      return `${String(soldCount).padStart(2, '0')}/${String(totalScreens).padStart(2, '0')} Sold`;
                    })()}
                  </span>
                </div>

                {/* Account's Occupied Screens List in Numerical Order */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.sales.map((sale, sIdx) => renderSaleCard(sale, sIdx, true))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================================================================= */
        /* WHATSAPP-STYLE CHRONOLOGICAL DAILY SALES TIMELINE                 */
        /* Oldest at top, newest at bottom, with WhatsApp Day Separators     */
        /* ================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dateGroups.map((group, gIdx) => (
            <div key={group.date + gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* WhatsApp-Style Date Separator Badge */}
              <div style={{ display: 'flex', justifyContent: 'center', margin: '14px 0 6px 0' }}>
                <span style={{
                  background: '#e2e8f0',
                  color: '#334155',
                  padding: '4px 14px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 800,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  letterSpacing: '0.3px'
                }}>
                  {formatTimelineDateBadge(group.date)}
                </span>
              </div>

              {/* Day's Sales in Chronological Order */}
              {group.sales.map((sale, sIdx) => renderSaleCard(sale, sIdx, false))}
            </div>
          ))}

          {/* Anchor to scroll to bottom (newest sale) */}
          <div ref={timelineBottomRef} style={{ height: '1px' }} />
        </div>
      )}

      {/* Date Picker Modal with Single Date and Date Range Support */}
      <DatePickerModal
        isOpen={showDatePicker}
        initialDate={filterDate || todayStr}
        initialStartDate={filterDateRange?.start}
        initialEndDate={filterDateRange?.end}
        onSelectDate={(newDate) => {
          setFilterDate(newDate);
          setFilterDateRange(null);
        }}
        onSelectRange={(start, end) => {
          setFilterDateRange({ start, end });
          setFilterDate('');
        }}
        onClearDate={() => {
          setFilterDate('');
          setFilterDateRange(null);
        }}
        onClose={() => setShowDatePicker(false)}
      />

      {/* =================================================================== */}
      {/* ADD SALE MODAL - CENTERING & MATCHING SALE CARD STYLE (image 62 & 63)*/}
      {/* =================================================================== */}
      {showAddSaleModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            overflowY: 'auto'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setAddSaleModalState(false);
          }}
        >
          <div
            className="inventory-card"
            style={{
              width: '100%',
              maxWidth: '430px',
              padding: '14px',
              borderRadius: '16px',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              backgroundColor: '#ffffff',
              margin: 'auto 0'
            }}
          >
            {/* Modal Top Header (image copy 62 & 63: Ribbon on left, Brand in middle in related color box, Close [X] on right) */}
            <div className="card-top-row" style={{ marginBottom: '10px', alignItems: 'center' }}>
              <div className="ribbon-badge">
                New Sale
              </div>

              {/* Netflix / Brand in middle in related color box per image copy 62 & 63 */}
              <div style={{
                background: activeBrand?.color || '#e50914',
                color: '#ffffff',
                padding: '4px 18px',
                borderRadius: '8px',
                fontWeight: 900,
                fontSize: '14px',
                letterSpacing: '0.4px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.18)'
              }}>
                {activeBrand?.displayName || 'Netflix'}
              </div>

              <button
                type="button"
                className="header-btn"
                style={{ width: '30px', height: '30px', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '8px' }}
                onClick={() => setAddSaleModalState(false)}
              >
                <X size={15} color="#475569" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Row 1: Customer Name & Phone Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Customer Name</div>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                    <input
                      type="text"
                      required
                      placeholder=""
                      value={addSaleForm.customerName}
                      onChange={e => handleAddSaleChange('customerName', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Phone Number</div>
                  <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                    <input
                      type="tel"
                      required
                      placeholder=""
                      value={addSaleForm.customerNumber}
                      onChange={e => handleAddSaleChange('customerNumber', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Account Email (ID) with quick select from inventory */}
              <div className="credential-row" style={{ marginBottom: '0' }}>
                <div className="credential-label-badge blue">
                  <span>👤 ID</span>
                </div>
                <div className="credential-input-box" style={{ padding: '6px 10px', border: '1.5px solid #cbd5e1', minWidth: 0 }}>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={addSaleForm.accountEmail}
                    onChange={e => handleAddSaleChange('accountEmail', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Quick Pick Inventory Account if available */}
              {inventoryAccounts.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', padding: '0 2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Select Account:</span>
                  {inventoryAccounts.slice(0, 3).map(inv => (
                    <button
                      key={inv.id}
                      type="button"
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: addSaleForm.accountEmail === inv.email ? '#eff6ff' : '#ffffff',
                        color: addSaleForm.accountEmail === inv.email ? '#1d4ed8' : '#475569',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        handleAddSaleChange('accountEmail', inv.email);
                        if (inv.password) handleAddSaleChange('accountPassword', inv.password);
                      }}
                    >
                      {inv.email.split('@')[0]}
                    </button>
                  ))}
                </div>
              )}

              {/* Row 3: Account Password */}
              <div className="credential-row" style={{ marginBottom: '0' }}>
                <div className="credential-label-badge purple">
                  <span>🔒 Password</span>
                </div>
                <div className="credential-input-box" style={{ padding: '6px 10px', border: '1.5px solid #cbd5e1', minWidth: 0 }}>
                  <input
                    type="text"
                    placeholder=""
                    value={addSaleForm.accountPassword}
                    onChange={e => handleAddSaleChange('accountPassword', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Validity, Screen No, Screen PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Validity</div>
                  <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <select
                      value={addSaleForm.validity}
                      onChange={e => handleAddSaleChange('validity', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    >
                      <option value="01 Month">01 Month</option>
                      <option value="03 Months">03 Months</option>
                      <option value="06 Months">06 Months</option>
                      <option value="12 Months">12 Months</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Screen No</div>
                  <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <select
                      value={addSaleForm.screenNumber}
                      onChange={e => handleAddSaleChange('screenNumber', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    >
                      {Array.from({ length: activeBrand.screensCount || 5 }, (_, i) => {
                        const num = String(i + 1).padStart(2, '0');
                        return <option key={num} value={num}>Screen {num}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>PIN</div>
                  <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder=""
                      value={addSaleForm.screenPin}
                      onChange={e => handleAddSaleChange('screenPin', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13px',
                        fontWeight: 900,
                        color: '#0f172a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 5: Activation Date, Expiry Date & Amount (3 columns matching Image 63) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Activation Date</div>
                  <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <input
                      type="text"
                      placeholder=""
                      value={addSaleForm.activationDate}
                      onChange={e => handleAddSaleChange('activationDate', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Expiry Date</div>
                  <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <input
                      type="text"
                      placeholder=""
                      value={addSaleForm.expiryDate}
                      onChange={e => handleAddSaleChange('expiryDate', e.target.value)}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        color: '#0f172a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Amount</div>
                  <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>₹</span>
                    <input
                      type="number"
                      placeholder=""
                      value={addSaleForm.amount}
                      onChange={e => handleAddSaleChange('amount', e.target.value)}
                      style={{
                        width: '55px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13px',
                        fontWeight: 900,
                        color: '#16a34a',
                        outline: 'none',
                        textAlign: 'center'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Device Name */}
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Device Name</div>
                <div style={{
                  height: '42px',
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '0 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}>
                  <Tv size={17} color="#64748b" style={{ flexShrink: 0 }} />
                  <input
                    type="text"
                    placeholder="e.g. LG OLED / OnePlus TV"
                    value={addSaleForm.deviceName}
                    onChange={e => handleAddSaleChange('deviceName', e.target.value)}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13px',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Row 7: Small Note Box */}
              <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1' }}>
                <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                  <FileText size={12} color="#64748b" />
                  <span>Small Note Box / Remarks</span>
                </label>
                <textarea
                  rows="2"
                  placeholder=""
                  value={addSaleForm.note}
                  onChange={e => handleAddSaleChange('note', e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.3
                  }}
                />
              </div>

              {/* Action Buttons: Cancel & Add Sale */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ padding: '10px', fontSize: '13.5px', borderRadius: '10px' }}
                  onClick={() => setAddSaleModalState(false)}
                  disabled={savingSale}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="glossy-btn glossy-btn-orange"
                  style={{
                    padding: '10px',
                    fontSize: '13.5px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(249, 115, 22, 0.35)'
                  }}
                  disabled={savingSale}
                  id="recent-sales-confirm-add-sale-btn"
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>{savingSale ? 'Saving...' : 'Add Sale'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Sale Confirmation Modal */}
      <DeleteSaleModal
        isOpen={!!saleToDelete}
        sale={saleToDelete}
        origin="recent-sales"
        onClose={() => setSaleToDelete(null)}
        onConfirm={handleConfirmDeleteSale}
      />

      {/* Subtle Right-Side Floating Scroll Date Indicator (Shown ONLY when VIEW ALL is active per image copy 196) */}
      {!filterDate && !filterDateRange && scrollingDate && isScrolling && (
        <div style={{
          position: 'fixed',
          right: '12px',
          top: '38%',
          transform: 'translateY(-50%)',
          background: 'rgba(15, 23, 42, 0.88)',
          color: '#ffffff',
          padding: '5px 12px',
          borderRadius: '16px',
          fontSize: '11.5px',
          fontWeight: 800,
          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
          pointerEvents: 'none',
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,255,255,0.2)',
          transition: 'opacity 0.25s ease'
        }}>
          📅 {scrollingDate}
        </div>
      )}
    </div>
  );
}
