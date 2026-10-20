import React from 'react';
import { ArrowLeft } from 'lucide-react';
import OttLogo from './OttLogos';

export default function BrandSelectorModal({
  isOpen,
  brands = [],
  selectedBrandId,
  onSelect,
  onClose
}) {
  if (!isOpen) return null;
  const allBrands = brands || [];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#ffffff',
        zIndex: 1100,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ maxWidth: '860px', width: '100%', margin: '0 auto', padding: '16px', boxSizing: 'border-box' }}>
        {/* Header matching image copy 13.png */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a'
            }}
            aria-label="Back"
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Select OTT
          </h2>
        </div>

        {/* 3-Column Brands Grid matching image copy 13.png */}
        <div className="ott-brands-grid-3col">
          {/* All Brands Option */}
          <button
            type="button"
            className="ott-brand-tile"
            onClick={() => {
              onSelect(null);
              onClose();
            }}
            id="modal-brand-select-all"
            style={{
              borderColor: (!selectedBrandId || selectedBrandId === 'all') ? '#2563eb' : undefined,
              background: (!selectedBrandId || selectedBrandId === 'all') ? '#eff6ff' : undefined
            }}
          >
            <div style={{
              width: '68px',
              height: '68px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
              fontWeight: 900,
              fontSize: '18px',
              letterSpacing: '1px'
            }}>
              ALL
            </div>
            <span className="ott-brand-tile-name" style={{ fontWeight: 800 }}>
              All Brands
            </span>
          </button>

          {allBrands.map((brand) => (
            <button
              key={brand.id}
              type="button"
              className="ott-brand-tile"
              onClick={() => {
                onSelect(brand);
                onClose();
              }}
              id={`modal-brand-select-${brand.id}`}
            >
              <OttLogo brandId={brand.id} name={brand.displayName || brand.name} size={68} />
              <span className="ott-brand-tile-name">
                {brand.displayName || brand.name}
              </span>
            </button>
          ))}

          {allBrands.length === 0 && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 12px', color: '#64748b', fontSize: '13px', fontWeight: 600 }}>
              No custom OTT brands added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
