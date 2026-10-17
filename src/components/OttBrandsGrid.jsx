import React from 'react';
import { ArrowLeft } from 'lucide-react';
import OttLogo from './OttLogos';
import BottomNav from './BottomNav';

export default function OttBrandsGrid({
  brands = [],
  onSelectBrand,
  onBack,
  showHeader = false,
  activeTab = 'home',
  onSelectTab
}) {
  return (
    <div className="select-ott-screen">
      {/* Header matching image copy 13.png - only rendered when showHeader is explicitly true */}
      {showHeader && (
        <div className="select-ott-header">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
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
              aria-label="Go back"
            >
              <ArrowLeft size={24} strokeWidth={2.5} />
            </button>
          )}
          <h2 className="select-ott-title" style={{ margin: 0 }}>
            Select OTT
          </h2>
        </div>
      )}

      {/* 3 Columns × Rows Grid matching image copy 13.png */}
      <div className="ott-brands-grid-3col">
        {brands.map((brand) => (
          <button
            key={brand.id}
            type="button"
            className="ott-brand-tile"
            onClick={() => onSelectBrand(brand)}
            id={`ott-brand-${brand.id}`}
          >
            <OttLogo brandId={brand.id} name={brand.displayName || brand.name} size={68} />
            <span className="ott-brand-tile-name">
              {brand.displayName || brand.name}
            </span>
          </button>
        ))}
      </div>

      {/* Bottom Nav Bar matching image copy 13.png */}
      {onSelectTab && (
        <BottomNav activeTab={activeTab} onSelectTab={onSelectTab} />
      )}
    </div>
  );
}
