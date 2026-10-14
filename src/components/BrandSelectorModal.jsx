import React, { useState } from 'react';
import { X, Check, Search, Tv } from 'lucide-react';
import { getClientInitialData } from '../utils/initialData';

export default function BrandSelectorModal({ isOpen, brands = [], selectedBrandId, onSelect, onClose }) {
  if (!isOpen) return null;

  const [search, setSearch] = useState('');
  const allBrands = (brands && brands.length > 0) ? brands : getClientInitialData().brands;

  const filteredBrands = allBrands.filter(b =>
    b.displayName.toLowerCase().includes(search.toLowerCase()) ||
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Select OTT Platform</h3>
            <p style={{ fontSize: '11px', color: '#64748b' }}>Choose platform to open accounts & inventory</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ border: 'none', background: '#f1f5f9', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Quick Search */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            className="form-input-pill"
            style={{ paddingLeft: '32px', height: '38px', fontSize: '13px' }}
            placeholder="Search Netflix, Prime, Disney+..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Platforms List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '2px', flex: 1 }}>
          {filteredBrands.map(brand => {
            const isSelected = brand.id === selectedBrandId;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => {
                  onSelect(brand);
                  onClose();
                }}
                id={`brand-select-${brand.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: isSelected ? '#eff6ff' : '#ffffff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: brand.color || '#1e293b',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '13px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                    }}
                  >
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#0f172a' }}>{brand.displayName}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {brand.screensCount} Screens • Plans: {brand.plans.join(', ')}
                    </div>
                  </div>
                </div>

                {isSelected ? (
                  <div style={{ background: '#2563eb', color: '#ffffff', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Check size={14} strokeWidth={3} />
                  </div>
                ) : (
                  <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 700 }}>
                    Open &rarr;
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
