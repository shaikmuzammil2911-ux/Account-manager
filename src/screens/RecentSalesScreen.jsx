import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Phone, User, Mail, Lock, Tv, Key, Share2, Check } from 'lucide-react';
import { api } from '../api/client';
import DatePickerModal from '../components/DatePickerModal';

export default function RecentSalesScreen({
  selectedBrand,
  onOpenNotifyModal,
  showToast
}) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValidity, setFilterValidity] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const data = await api.getSales({
        brandId: selectedBrand?.id || 'all',
        validity: filterValidity,
        date: filterDate,
        search: searchQuery
      });
      setSales(data);
    } catch (err) {
      showToast('Failed to load recent sales', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, [selectedBrand, filterValidity, filterDate, searchQuery]);

  const cycleValidity = () => {
    const list = ['all', '01 Month', '03 Months', '06 Months', '12 Months'];
    const idx = list.indexOf(filterValidity);
    const next = list[(idx + 1) % list.length];
    setFilterValidity(next);
  };

  const copySaleDetails = (sale) => {
    const text = `Customer: ${sale.customerName} (${sale.customerNumber})
Brand: ${sale.brandName}
Account: ${sale.accountEmail}
Password: ${sale.accountPassword}
Screen: ${sale.screenNumber} | PIN: ${sale.screenPin}
Validity: ${sale.validity}
Activation: ${sale.activationDate}
Expiry: ${sale.expiryDate}`;

    navigator.clipboard.writeText(text);
    setCopiedId(sale.id);
    showToast('Customer sale details copied!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input-pill"
            style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
            placeholder="Search name, phone, ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Date Filter Icon Button */}
        <button
          type="button"
          className="header-btn"
          style={{ width: '38px', height: '38px', background: filterDate ? '#eff6ff' : '#ffffff', borderColor: filterDate ? '#3b82f6' : '#cbd5e1' }}
          onClick={() => setShowDatePicker(true)}
          title={filterDate ? `Filter date: ${filterDate}` : 'Filter by date'}
        >
          <Calendar size={18} color={filterDate ? '#2563eb' : '#475569'} />
        </button>

        {/* Validity Filter Button */}
        <button
          type="button"
          className="filter-pill-btn glossy-btn-green"
          style={{ padding: '0 12px', height: '38px', fontSize: '12px' }}
          onClick={cycleValidity}
          title="Filter by validity"
        >
          <Calendar size={14} />
          <span>{filterValidity === 'all' ? 'Validity' : filterValidity.replace(' Months', 'M').replace(' Month', 'M')}</span>
        </button>
      </div>

      {filterDate && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#eff6ff', padding: '6px 12px', borderRadius: '8px', marginBottom: '12px', fontSize: '12px' }}>
          <span style={{ color: '#1e40af', fontWeight: 600 }}>Filtering by date: <strong>{filterDate}</strong></span>
          <button
            type="button"
            onClick={() => setFilterDate('')}
            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Sales List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading sales...
        </div>
      ) : sales.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontWeight: 700, color: '#64748b' }}>No sales found.</p>
        </div>
      ) : (
        sales.map((sale, sIdx) => {
          return (
            <div
              key={sale.id || sIdx}
              className="inventory-card"
              style={{ padding: '12px 14px' }}
              id={`recent-sale-${sale.recordNumber}`}
            >
              {/* Card Top: Ribbon Badge & Expiry Badge */}
              <div className="card-top-row" style={{ marginBottom: '8px' }}>
                <div className="ribbon-badge">
                  {sale.recordNumber || String(sIdx + 1).padStart(2, '0')}
                </div>

                <div className="badge-navy-pill">
                  {sale.expiryDate}
                </div>
              </div>

              {/* Row 1: Name & Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Name</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{sale.customerName}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Number</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>{sale.customerNumber}</div>
                </div>
              </div>

              {/* Row 2: ID */}
              <div className="credential-row" style={{ marginBottom: '6px' }}>
                <div className="credential-label-badge blue">
                  <span>👤 ID</span>
                </div>
                <div className="credential-input-box">
                  <span>{sale.accountEmail}</span>
                </div>
              </div>

              {/* Row 3: Password */}
              <div className="credential-row" style={{ marginBottom: '8px' }}>
                <div className="credential-label-badge purple">
                  <span>🔒 Password</span>
                </div>
                <div className="credential-input-box">
                  <span>{sale.accountPassword}</span>
                </div>
              </div>

              {/* Row 4: Validity, Screen No, Screen Pin */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Validity</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{sale.validity}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Screen No</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{sale.screenNumber}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>Screen Pin</div>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>{sale.screenPin}</div>
                </div>
              </div>

              {/* Row 5: Activation & Expiry */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Activation</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{sale.activationDate}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <div style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 700 }}>Expiry</div>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{sale.expiryDate}</div>
                </div>
              </div>

              {/* Action Buttons: Copy & Notify */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '7px', fontSize: '12px' }}
                  onClick={() => copySaleDetails(sale)}
                >
                  {copiedId === sale.id ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
                  <span>{copiedId === sale.id ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  className="glossy-btn glossy-btn-red"
                  style={{ flex: 1, padding: '7px', fontSize: '12px' }}
                  onClick={() => onOpenNotifyModal(sale)}
                >
                  <span>Notify via WhatsApp</span>
                </button>
              </div>
            </div>
          );
        })
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
