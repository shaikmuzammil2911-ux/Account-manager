import React, { useState, useEffect } from 'react';
import {
  Calendar, Search, Filter, Phone, User, Mail, Lock, Tv,
  Key, Share2, Check, ArrowLeft, ChevronRight, Layers, Clock, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import DatePickerModal from '../components/DatePickerModal';
import CopyButton from '../components/CopyButton';
import OttBrandsGrid from '../components/OttBrandsGrid';

export default function RecentSalesScreen({
  brands = [],
  selectedBrand,
  onOpenNotifyModal,
  showToast
}) {
  // Navigation: 'brands' (Step 1: Brand selection) or 'sales' (Step 2: Sales for selected brand)
  const [viewMode, setViewMode] = useState('brands');
  const [activeBrand, setActiveBrand] = useState(selectedBrand || null);
  const [brandSearch, setBrandSearch] = useState('');

  // Sales Data
  const [sales, setSales] = useState([]);
  const [allSales, setAllSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

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
    if (viewMode === 'sales') {
      fetchBrandSales();
    }
  }, [activeBrand, filterValidity, filterDate, searchQuery, viewMode]);

  const handleSelectBrand = (brand) => {
    setActiveBrand(brand);
    setViewMode('sales');
  };

  const cycleValidity = () => {
    const list = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const idx = list.indexOf(filterValidity);
    const next = list[(idx + 1) % list.length];
    setFilterValidity(next);
  };

  const copyFullSaleDetails = (sale) => {
    const text = `Customer: ${sale.customerName} (${sale.customerNumber})
OTT Brand: ${sale.brandName}
Account Email: ${sale.accountEmail}
Password: ${sale.accountPassword}
Screen: ${sale.screenNumber} | PIN: ${sale.screenPin}
Validity: ${sale.validity}
Activation: ${sale.activationDate}
Expiry: ${sale.expiryDate}
Device: ${sale.deviceName || 'Personal TV'}`;

    navigator.clipboard.writeText(text);
    setCopiedId(sale.id);
    showToast('Customer sale details copied to clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compute sales count per brand
  const getSalesCountForBrand = (brandId) => {
    if (brandId === 'all') return allSales.length;
    return allSales.filter(s => s.brandId === brandId).length;
  };

  const filteredBrands = brands.filter(b =>
    (b.displayName || b.name || '').toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Paginated Sales
  const totalPages = Math.ceil(sales.length / pageSize) || 1;
  const paginatedSales = sales.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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

  // =========================================================================
  // STEP 2: SHOW SALES FOR SELECTED BRAND
  // =========================================================================
  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Search and Filters Bar */}
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
        >
          <Calendar size={18} color={filterDate ? '#2563eb' : '#475569'} />
        </button>

        {/* Validity Filter Button */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          style={{ padding: '0 12px', height: '40px', fontSize: '13px' }}
          onClick={cycleValidity}
          title="Filter by validity"
        >
          <Calendar size={14} />
          <span>{filterValidity === 'all' ? 'Validity' : filterValidity.replace(' Months', 'M').replace(' Month', 'M')}</span>
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

      {/* Sales List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '15px' }}>
          Loading sales records...
        </div>
      ) : paginatedSales.length === 0 ? (
        <div className="empty-state-card">
          <p style={{ fontWeight: 800, color: '#475569', fontSize: '16px', marginBottom: '8px' }}>
            No sales records found for the selected criteria.
          </p>
          <p style={{ fontSize: '13.5px', color: '#64748b' }}>
            Confirmed sales will appear here automatically and synchronize to Google Sheets.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {paginatedSales.map((sale, sIdx) => {
            return (
              <div
                key={sale.id || sIdx}
                className="inventory-card"
                style={{ padding: '14px 16px' }}
                id={`recent-sale-${sale.recordNumber}`}
              >
                {/* Top Row: Ribbon Badge, OTT Brand Badge, Expiry Badge */}
                <div className="card-top-row" style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="ribbon-badge">
                      {sale.recordNumber || String(sIdx + 1).padStart(2, '0')}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: '#1e40af' }}>
                      {sale.brandName}
                    </span>
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
                    <span style={{ fontSize: '14.5px', fontWeight: 700 }}>{sale.accountEmail}</span>
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

                {/* Row 4: Screen No & Screen Pin with CopyButton */}
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

                {/* Row 5: Activation & Expiry */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Activation Date</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{sale.activationDate}</div>
                  </div>

                  <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 800 }}>Device / Price</div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#16a34a' }}>₹{sale.amount || 199} • {sale.deviceName || 'TV'}</div>
                  </div>
                </div>

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
          })}

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
    </div>
  );
}
