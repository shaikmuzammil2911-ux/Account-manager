import React, { useState, useEffect } from 'react';
import {
  Calendar, Search, ArrowUpDown, Phone, User, Mail, Lock, Tv,
  Key, Share2, Check, ArrowLeft, ChevronRight, Layers, Clock, AlertCircle, Plus, X, FileText
} from 'lucide-react';
import { api } from '../api/client';
import { formatDate, parseDate, calculateExpiryDate } from '../utils/dateUtils';
import DatePickerModal from '../components/DatePickerModal';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';

export default function RecentSalesScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onOpenNotifyModal,
  showToast,
  isAddSaleOpen,
  onOpenAddSale,
  onCloseAddSale,
  onSaleAdded
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
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inventoryAccounts, setInventoryAccounts] = useState([]);

  // Top 3-Button Filter Row: 'sold' (daily sales view) vs 'account' (grouped by account screens)
  const [salesGrouping, setSalesGrouping] = useState('sold');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Sorting Direction: 'desc' (Newest to Oldest) vs 'asc' (Oldest to Newest / Past to Present)
  const [sortDirection, setSortDirection] = useState('desc');

  // Add Sale Modal State
  const [localAddSaleOpen, setLocalAddSaleOpen] = useState(false);
  const showAddSaleModal = isAddSaleOpen !== undefined ? isAddSaleOpen : localAddSaleOpen;
  const setAddSaleModalState = (isOpen) => {
    setLocalAddSaleOpen(isOpen);
    if (!isOpen && onCloseAddSale) onCloseAddSale();
    if (isOpen && onOpenAddSale) onOpenAddSale();
  };

  const [savingSale, setSavingSale] = useState(false);
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
    deviceName: 'Personal TV',
    note: ''
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load all sales to compute brand-wise sales counts
  const fetchAllSales = async () => {
    try {
      const data = await api.getSales({ brandId: 'all' });
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
  }, []);

  // Fetch sales for currently active brand
  const fetchBrandSales = async () => {
    if (!activeBrand && viewMode === 'sales') return;
    try {
      setLoading(true);
      const data = await api.getSales({
        brandId: activeBrand ? activeBrand.id : 'all',
        validity: filterValidity,
        date: filterDate,
        search: searchQuery
      });
      setSales(data);
      setCurrentPage(1);
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
  }, [activeBrand, filterValidity, filterDate, searchQuery, viewMode]);

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
        deviceName: 'Personal TV',
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

  const copyFullSaleDetails = (sale) => {
    let text = `Customer: ${sale.customerName} (${sale.customerNumber})
OTT Brand: ${sale.brandName}
Account Email: ${sale.accountEmail}
Password: ${sale.accountPassword}
Screen: ${sale.screenNumber} | PIN: ${sale.screenPin}
Validity: ${sale.validity}
Activation: ${sale.activationDate}
Expiry: ${sale.expiryDate}
Device: ${sale.deviceName || 'Personal TV'}`;

    if (sale.note) {
      text += `\nNote: ${sale.note}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(sale.id);
    showToast('Customer sale details copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
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
      setSavingSale(true);
      const payload = {
        brandId: activeBrand.id,
        brandName: activeBrand.displayName,
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
        deviceName: addSaleForm.deviceName.trim() || 'Personal TV',
        note: addSaleForm.note.trim()
      };

      await api.createSale(payload);
      showToast('Sale added successfully!', 'success');
      setAddSaleModalState(false);
      await fetchBrandSales();
      await fetchAllSales();
      if (onSaleAdded) onSaleAdded();
    } catch (err) {
      showToast(err.message || 'Failed to add sale', 'error');
    } finally {
      setSavingSale(false);
    }
  };

  // Sort Sales Array based on sortDirection
  const sortedSales = [...sales].sort((a, b) => {
    const dateA = parseDate(a.activationDate || a.saleDate).getTime();
    const dateB = parseDate(b.activationDate || b.saleDate).getTime();
    if (dateA !== dateB) {
      return sortDirection === 'desc' ? dateB - dateA : dateA - dateB;
    }
    const recA = parseInt(a.recordNumber || '0', 10);
    const recB = parseInt(b.recordNumber || '0', 10);
    return sortDirection === 'desc' ? recB - recA : recA - recB;
  });

  // Paginated Sales for 'sold' view
  const totalPages = Math.ceil(sortedSales.length / pageSize) || 1;
  const paginatedSales = sortedSales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      />
    );
  }

  // Helper renderer for a single Sold Card
  const renderSaleCard = (sale, sIdx, isAccountView = false) => {
    return (
      <div
        key={sale.id || sIdx}
        className="inventory-card"
        style={{ padding: '14px 16px', position: 'relative' }}
        id={`recent-sale-${sale.recordNumber || sIdx}`}
      >
        {/* Top Row: Ribbon Badge, (Redundant brandName removed per user's red X mark), Expiry Badge */}
        <div className="card-top-row" style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="ribbon-badge">
              {isAccountView
                ? `Screen ${String(sale.screenNumber).padStart(2, '0')}`
                : (sale.recordNumber || String(sIdx + 1).padStart(2, '0'))}
            </div>
            {/* Removed redundant brandName text next to ribbon badge */}
          </div>

          <div className="badge-navy-pill">
            Expires: {sale.expiryDate}
          </div>
        </div>

        {/* Row 1: Customer Name & Number */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Customer Name</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{sale.customerName}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Phone Number</div>
            <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>{sale.customerNumber}</div>
          </div>
        </div>

        {/* Row 2: Account ID / Email with CopyButton */}
        <div className="credential-row" style={{ marginBottom: '8px' }}>
          <div className="credential-label-badge blue">
            <span>👤 ID</span>
          </div>
          <div className="credential-input-box" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, wordBreak: 'break-all' }}>{sale.accountEmail}</span>
            <CopyButton text={sale.accountEmail} tooltip="Copy email" size={13} />
          </div>
        </div>

        {/* Row 3: Account Password with CopyButton */}
        <div className="credential-row" style={{ marginBottom: '10px' }}>
          <div className="credential-label-badge purple">
            <span>🔒 Password</span>
          </div>
          <div className="credential-input-box" style={{ justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>{sale.accountPassword}</span>
            <CopyButton text={sale.accountPassword} tooltip="Copy password" size={13} />
          </div>
        </div>

        {/* Row 4: Validity, Screen No & Screen Pin with CopyButton */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Validity</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.validity}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Screen No</div>
            <div style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.screenNumber}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>PIN</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.screenPin}</span>
              <CopyButton text={sale.screenPin} tooltip="Copy PIN" size={11} showLabelOnCopy={false} />
            </div>
          </div>
        </div>

        {/* Row 5: Activation Date & Device / Price */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Activation Date</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{sale.activationDate}</div>
          </div>

          <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Device / Price</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>
              ₹{sale.amount || 199} • {sale.deviceName || 'TV'}
            </div>
          </div>
        </div>

        {/* Small Note Box if present */}
        {sale.note && (
          <div style={{
            background: '#fefce8',
            border: '1px solid #fef08a',
            borderRadius: '8px',
            padding: '7px 10px',
            marginBottom: '10px',
            fontSize: '12.5px',
            color: '#854d0e',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px'
          }}>
            <span style={{ fontWeight: 800, whiteSpace: 'nowrap' }}>📝 Note:</span>
            <span style={{ fontWeight: 600, wordBreak: 'break-word' }}>{sale.note}</span>
          </div>
        )}

        {/* Actions: Copy Customer Details & WhatsApp Notify */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="glossy-btn glossy-btn-gray"
            style={{ flex: 1, padding: '9px', fontSize: '13px' }}
            onClick={() => copyFullSaleDetails(sale)}
          >
            {copiedId === sale.id ? <Check size={15} color="#16a34a" /> : <Share2 size={15} />}
            <span>{copiedId === sale.id ? 'Copied Details' : 'Copy All Details'}</span>
          </button>

          <button
            type="button"
            className="glossy-btn glossy-btn-red"
            style={{ flex: 1, padding: '9px', fontSize: '13px' }}
            onClick={() => onOpenNotifyModal(sale)}
          >
            <span>Notify via WhatsApp</span>
          </button>
        </div>
      </div>
    );
  };

  // =========================================================================
  // STEP 2: SHOW SALES FOR SELECTED BRAND
  // =========================================================================
  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '10px' }}>
      {/* =================================================================== */}
      {/* TOP 3-BUTTONS ROW: [ Sold ]  [ Account ]  [ Validity ]              */}
      {/* Replaces the duplicate subheader crossed out by user with red X    */}
      {/* =================================================================== */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1.15fr',
        gap: '8px',
        marginBottom: '10px'
      }}>
        {/* 1. Sold Button */}
        <button
          type="button"
          className="glossy-btn"
          style={{
            height: '40px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: salesGrouping === 'sold'
              ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
              : '#ffffff',
            color: salesGrouping === 'sold' ? '#ffffff' : '#475569',
            border: salesGrouping === 'sold' ? '1px solid #1e40af' : '1px solid #cbd5e1',
            boxShadow: salesGrouping === 'sold' ? '0 3px 8px rgba(30, 64, 175, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}
          onClick={() => setSalesGrouping('sold')}
          id="recent-sales-btn-sold"
        >
          <span>Sold</span>
        </button>

        {/* 2. Account Button */}
        <button
          type="button"
          className="glossy-btn"
          style={{
            height: '40px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background: salesGrouping === 'account'
              ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)'
              : '#ffffff',
            color: salesGrouping === 'account' ? '#ffffff' : '#475569',
            border: salesGrouping === 'account' ? '1px solid #1e40af' : '1px solid #cbd5e1',
            boxShadow: salesGrouping === 'account' ? '0 3px 8px rgba(30, 64, 175, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
          }}
          onClick={() => setSalesGrouping('account')}
          id="recent-sales-btn-account"
        >
          <span>Account</span>
        </button>

        {/* 3. Validity Button (Moved UP from search row beside Calendar) */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          style={{
            height: '40px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            padding: '0 8px',
            boxShadow: '0 3px 8px rgba(22, 163, 74, 0.3)'
          }}
          onClick={cycleValidity}
          title="Cycle / filter by validity"
          id="recent-sales-btn-validity"
        >
          <Calendar size={14} />
          <span>
            {filterValidity === 'all'
              ? 'Validity'
              : filterValidity.replace(' Months', 'M').replace(' Month', 'M')}
          </span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* SEARCH AND FILTERS BAR                                             */}
      {/* In place of Validity beside Calendar, put Down/Top sorting icon     */}
      {/* =================================================================== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input-pill"
            style={{ paddingLeft: '32px', height: '40px', fontSize: '13.5px' }}
            placeholder="Search name, phone, email, PIN..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Filter Button */}
        <button
          type="button"
          className="header-btn"
          style={{
            width: '40px',
            height: '40px',
            background: filterDate ? '#eff6ff' : '#ffffff',
            borderColor: filterDate ? '#3b82f6' : '#cbd5e1'
          }}
          onClick={() => setShowDatePicker(true)}
          title={filterDate ? `Filter date: ${filterDate}` : 'Filter by date'}
          id="recent-sales-calendar-btn"
        >
          <Calendar size={18} color={filterDate ? '#2563eb' : '#475569'} />
        </button>

        {/* Down/Top Sorting Icon Toggle Button (In place of Validity) */}
        <button
          type="button"
          className="header-btn"
          style={{
            width: '40px',
            height: '40px',
            background: sortDirection === 'asc' ? '#eff6ff' : '#ffffff',
            borderColor: sortDirection === 'asc' ? '#2563eb' : '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: sortDirection === 'asc' ? '0 2px 6px rgba(37, 99, 235, 0.2)' : 'none'
          }}
          onClick={toggleSortDirection}
          title={
            sortDirection === 'desc'
              ? 'Current: Newest to Oldest. Click for Past to Present'
              : 'Current: Past to Present. Click for Newest first'
          }
          id="recent-sales-sort-toggle-btn"
        >
          <ArrowUpDown size={18} color={sortDirection === 'asc' ? '#2563eb' : '#475569'} strokeWidth={2.3} />
        </button>
      </div>

      {/* Date Active Filter Strip */}
      {filterDate && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#eff6ff',
          padding: '8px 14px',
          borderRadius: '10px',
          marginBottom: '12px',
          fontSize: '13px'
        }}>
          <span style={{ color: '#1e40af', fontWeight: 700 }}>Filtering date: <strong>{filterDate}</strong></span>
          <button
            type="button"
            onClick={() => setFilterDate('')}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 800, cursor: 'pointer' }}
          >
            Clear Date
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* SALES CONTENT: 'sold' (Daily chronological) VS 'account' (Grouped)  */}
      {/* =================================================================== */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '15px' }}>
          Loading sales records...
        </div>
      ) : sortedSales.length === 0 ? (
        <div className="empty-state-card">
          <p style={{ fontWeight: 800, color: '#475569', fontSize: '16px', marginBottom: '8px' }}>
            No sales records found for {activeBrand.displayName}.
          </p>
          <p style={{ fontSize: '13.5px', color: '#64748b' }}>
            Click the "+ Add Sale" button at top-right to register a sale for this brand.
          </p>
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
                  padding: '12px 14px',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)'
                }}>
                  <div style={{ minWidth: 0, flex: 1, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '11.5px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px'
                      }}>
                        Account {String(aIdx + 1).padStart(2, '0')}
                      </span>
                      <span style={{
                        fontSize: '14.5px',
                        fontWeight: 800,
                        color: '#ffffff',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {group.email}
                      </span>
                    </div>

                    {group.password && (
                      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                        🔒 Password: <strong style={{ color: '#e2e8f0' }}>{group.password}</strong>
                      </div>
                    )}
                  </div>

                  <span style={{
                    fontSize: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontWeight: 800,
                    whiteSpace: 'nowrap'
                  }}>
                    {group.sales.length} {group.sales.length === 1 ? 'Screen Sold' : 'Screens Sold'}
                  </span>
                </div>

                {/* Account's Occupied Screens List in Numerical Order (Empty screens are omitted) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.sales.map((sale, sIdx) => renderSaleCard(sale, sIdx, true))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ================================================================= */
        /* SOLD VIEW (Daily timeline past to present / present to past)      */
        /* ================================================================= */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paginatedSales.map((sale, sIdx) => renderSaleCard(sale, sIdx, false))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Previous
              </button>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#64748b' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '6px 12px', fontSize: '12.5px' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        initialDate={filterDate || ''}
        onSelect={(newDate) => setFilterDate(newDate)}
        onClose={() => setShowDatePicker(false)}
      />

      {/* =================================================================== */}
      {/* ADD SALE SMALL FORM MODAL (with Small Note Box)                     */}
      {/* Opens when Top Right "Add Sale" button is clicked                   */}
      {/* Same details and style of sold data card                           */}
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '20px 14px',
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
              padding: '16px 18px',
              borderRadius: '16px',
              boxShadow: '0 20px 45px rgba(0,0,0,0.3)',
              backgroundColor: '#ffffff',
              margin: 'auto 0'
            }}
          >
            {/* Modal Top Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
              paddingBottom: '10px',
              borderBottom: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: activeBrand.color || '#3b82f6'
                  }}
                />
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                  Add Sale • {activeBrand.displayName}
                </span>
              </div>

              <button
                type="button"
                className="header-btn"
                style={{ width: '32px', height: '32px', border: 'none', background: '#f1f5f9' }}
                onClick={() => setAddSaleModalState(false)}
              >
                <X size={16} color="#475569" />
              </button>
            </div>

            <form onSubmit={handleSaveSale} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Row 1: Customer Name & Phone Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vikram Reddy"
                    value={addSaleForm.customerName}
                    onChange={e => handleAddSaleChange('customerName', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9123456789"
                    value={addSaleForm.customerNumber}
                    onChange={e => handleAddSaleChange('customerNumber', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '14px',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Row 2: Account Email (ID) with quick select from inventory */}
              <div className="credential-row">
                <div className="credential-label-badge blue">
                  <span>👤 ID</span>
                </div>
                <div className="credential-input-box" style={{ padding: '4px 8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="account.email@gmail.com"
                    value={addSaleForm.accountEmail}
                    onChange={e => handleAddSaleChange('accountEmail', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
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
              <div className="credential-row">
                <div className="credential-label-badge purple">
                  <span>🔒 Password</span>
                </div>
                <div className="credential-input-box" style={{ padding: '4px 8px' }}>
                  <input
                    type="text"
                    placeholder="Account password"
                    value={addSaleForm.accountPassword}
                    onChange={e => handleAddSaleChange('accountPassword', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Row 4: Validity, Screen No, Screen PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Validity
                  </label>
                  <select
                    value={addSaleForm.validity}
                    onChange={e => handleAddSaleChange('validity', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12.5px',
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

                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Screen No
                  </label>
                  <select
                    value={addSaleForm.screenNumber}
                    onChange={e => handleAddSaleChange('screenNumber', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12.5px',
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

                <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    PIN
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="1234"
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

              {/* Row 5: Activation Date & Device / Price */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Activation Date
                  </label>
                  <input
                    type="text"
                    placeholder="DD-MMM-YYYY"
                    value={addSaleForm.activationDate}
                    onChange={e => handleAddSaleChange('activationDate', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      fontSize: '12.5px',
                      fontWeight: 800,
                      color: '#0f172a',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    Device / Price (₹)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>₹</span>
                    <input
                      type="number"
                      placeholder="Price"
                      value={addSaleForm.amount}
                      onChange={e => handleAddSaleChange('amount', e.target.value)}
                      style={{
                        width: '55px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '13px',
                        fontWeight: 900,
                        color: '#16a34a',
                        outline: 'none'
                      }}
                    />
                    <span style={{ color: '#94a3b8' }}>•</span>
                    <input
                      type="text"
                      placeholder="Device"
                      value={addSaleForm.deviceName}
                      onChange={e => handleAddSaleChange('deviceName', e.target.value)}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: '#0f172a',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Small Note Box (Requested by user) */}
              <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                  <FileText size={12} color="#64748b" />
                  <span>Small Note Box / Remarks</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="Add quick note (e.g. Paid via UPI, discount applied, renewal requested)..."
                  value={addSaleForm.note}
                  onChange={e => handleAddSaleChange('note', e.target.value)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: '#0f172a',
                    outline: 'none',
                    resize: 'none',
                    lineHeight: 1.4
                  }}
                />
              </div>

              {/* Expiry Date Auto-calculated Preview */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                background: '#eff6ff',
                borderRadius: '8px',
                fontSize: '12px'
              }}>
                <span style={{ color: '#1e40af', fontWeight: 700 }}>Auto-calculated Expiry:</span>
                <span style={{ color: '#1e40af', fontWeight: 900 }}>{addSaleForm.expiryDate}</span>
              </div>

              {/* Action Buttons: Cancel & Add Sale */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '10px', fontSize: '13.5px' }}
                  onClick={() => setAddSaleModalState(false)}
                  disabled={savingSale}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="glossy-btn glossy-btn-orange"
                  style={{
                    flex: 1.2,
                    padding: '10px',
                    fontSize: '13.5px',
                    fontWeight: 800,
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
    </div>
  );
}
