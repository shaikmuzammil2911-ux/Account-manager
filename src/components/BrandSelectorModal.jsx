import React from 'react';
import { ArrowLeft } from 'lucide-react';
import OttLogo from './OttLogos';
import { getClientInitialData } from '../utils/initialData';

export default function BrandSelectorModal({
  isOpen,
  brands = [],
  selectedBrandId,
  onSelect,
  onClose
}) {
  if (!isOpen) return null;

  const allBrands = (brands && brands.length > 0) ? brands : getClientInitialData().brands;

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
        </div>
      </div>
    </div>
  );
}
