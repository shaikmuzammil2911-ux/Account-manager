import React, { useState, useEffect } from 'react';
import {
  Calendar, Search, ArrowUpDown, Phone, User, Mail, Lock, Unlock, Save, Tv,
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
          deviceName: sale.deviceName || 'Personal TV',
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

  // Direct WhatsApp chat with credentials prefilled (image copy 42.png)
  const handleDirectWhatsApp = (sale) => {
    const cleanPhone = (sale.customerNumber || '').replace(/\D/g, '');
    const phoneParam = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    const credentialsMessage = `*${sale.brandName} Subscription Details*
👤 ID: ${sale.accountEmail}
🔒 Password: ${sale.accountPassword}
📺 Screen: ${sale.screenNumber}
🔑 PIN: ${sale.screenPin}
📅 Validity: ${sale.validity}
⏳ Expiry: ${sale.expiryDate}
📱 Device: ${sale.deviceName || 'Personal TV'}${sale.note ? `\n📝 Note: ${sale.note}` : ''}`;

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
      const targetBrandId = (activeBrand && activeBrand.id !== 'all') ? activeBrand.id : (brands[0]?.id || 'netflix');
      const targetBrand = brands.find(b => b.id === targetBrandId) || activeBrand;
      const payload = {
        brandId: targetBrandId,
        brandName: targetBrand?.displayName || targetBrand?.name || 'Netflix',
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
        className="inventory-card"
        style={{ padding: '12px 10px', position: 'relative' }}
        id={`recent-sale-${sale.recordNumber || sIdx}`}
      >
        {/* Top Row: Ribbon Badge, Brand Badge in Middle, Lock/Unlock Button on Right (image copy 64 & 65) */}
        <div className="card-top-row" style={{ marginBottom: '10px', alignItems: 'center' }}>
          <div className="ribbon-badge">
            {isAccountView
              ? `Screen ${String(sale.screenNumber).padStart(2, '0')}`
              : (sale.recordNumber || String(sIdx + 1).padStart(2, '0'))}
          </div>

          {/* Show Brand in middle in related color box per requirement (image copy 65) */}
          <div style={{
            background: bColor,
            color: '#ffffff',
            padding: '3px 14px',
            borderRadius: '8px',
            fontWeight: 900,
            fontSize: '13px',
            letterSpacing: '0.4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center'
          }}>
            <span>{bName}</span>
          </div>

          {/* Put Lock / Unlock button here per requirement (image copy 64 & 65) */}
          <button
            type="button"
            onClick={() => handleToggleSaleLock(sale)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              border: '1.5px solid',
              background: isEditing ? '#fff7ed' : '#f1f5f9',
              color: isEditing ? '#ea580c' : '#475569',
              borderColor: isEditing ? '#ea580c' : '#cbd5e1',
              boxShadow: isEditing ? '0 2px 6px rgba(234, 88, 12, 0.25)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title={isEditing ? 'Currently Unlocked. Click to lock' : 'Currently Locked. Click to edit'}
          >
            {isEditing ? <Unlock size={14} strokeWidth={2.5} /> : <Lock size={14} strokeWidth={2.5} />}
            <span>{isEditing ? 'UnLock' : 'Lock'}</span>
          </button>
        </div>

        {/* Row 1: Customer Name & Number with Headings ABOVE and thicker borders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, marginBottom: '3px' }}>Customer Name</div>
            <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', boxSizing: 'border-box' }}>
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
            <div style={{ background: '#f8fafc', padding: '6px 8px', borderRadius: '10px', border: '1.5px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', boxSizing: 'border-box' }}>
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

        {/* Row 2: Account ID / Email with CopyButton - single-line horizontal drag (image copy 61) */}
        <div className="credential-row" style={{ marginBottom: '8px' }}>
          <div className="credential-label-badge blue">
            <span>👤 ID</span>
          </div>
          <div className="credential-input-box" style={{
            border: '1.5px solid #cbd5e1',
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

        {/* Row 3: Account Password with CopyButton */}
        <div className="credential-row" style={{ marginBottom: '8px' }}>
          <div className="credential-label-badge purple">
            <span>🔒 Password</span>
          </div>
          <div className="credential-input-box" style={{
            border: '1.5px solid #cbd5e1',
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

        {/* Row 4: Validity, Screen No & Screen Pin with Headings ABOVE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Validity</div>
            <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <select
                  value={editState.validity}
                  onChange={e => handleEditingFieldChange(sale.id, 'validity', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '12px', fontWeight: 900, color: '#0f172a', outline: 'none', textAlign: 'center' }}
                >
                  <option value="01 Month">01 Month</option>
                  <option value="03 Months">03 Months</option>
                  <option value="06 Months">06 Months</option>
                  <option value="12 Months">12 Months</option>
                </select>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.validity}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Screen No</div>
            <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.screenNumber}
                  onChange={e => handleEditingFieldChange(sale.id, 'screenNumber', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#0f172a', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.screenNumber}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>PIN</div>
            <div style={{ background: '#f8fafc', padding: '6px 6px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  maxLength={6}
                  value={editState.screenPin}
                  onChange={e => handleEditingFieldChange(sale.id, 'screenPin', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#0f172a', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>{sale.screenPin}</span>
              )}
            </div>
          </div>
        </div>

        {/* Row 5: Activation Date, Expiry Date & Amount side-by-side with Headings ABOVE */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Activation Date</div>
            <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.activationDate}
                  onChange={e => handleEditingFieldChange(sale.id, 'activationDate', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>{sale.activationDate}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Expiry Date</div>
            <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <input
                  type="text"
                  value={editState.expiryDate}
                  onChange={e => handleEditingFieldChange(sale.id, 'expiryDate', e.target.value)}
                  style={{ width: '100%', border: 'none', background: 'transparent', fontSize: '11.5px', fontWeight: 800, color: '#0f172a', outline: 'none', textAlign: 'center' }}
                />
              ) : (
                <span style={{ fontSize: '11.5px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap' }}>{sale.expiryDate}</span>
              )}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800, textAlign: 'center', marginBottom: '3px' }}>Amount</div>
            <div style={{ background: '#f8fafc', padding: '6px 4px', borderRadius: '8px', border: '1.5px solid #cbd5e1', textAlign: 'center', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>₹</span>
                  <input
                    type="number"
                    value={editState.amount}
                    onChange={e => handleEditingFieldChange(sale.id, 'amount', e.target.value)}
                    style={{ width: '60px', border: 'none', background: 'transparent', fontSize: '13px', fontWeight: 900, color: '#16a34a', outline: 'none', textAlign: 'center' }}
                  />
                </div>
              ) : (
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#16a34a' }}>₹{sale.amount || 199}</span>
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
              border: '1.5px solid #cbd5e1',
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
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {sale.deviceName || 'Personal TV'}
                </span>
              )}
            </div>

            {/* Direct WhatsApp Chat Icon Button with larger icon (image copy 59) */}
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
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.588-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.043.072.043.419-.101.824z" />
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
                {/* Account Header Banner (image copy 60: number only, no password, 02/05 Sold format) */}
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
                    {/* Number ONLY - removed "ACCOUNT" text per image copy 60 */}
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
                    {/* Mail ID next to number */}
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

                  {/* Right side: 02/05 Sold format per image copy 60 */}
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
    </div>
  );
}
