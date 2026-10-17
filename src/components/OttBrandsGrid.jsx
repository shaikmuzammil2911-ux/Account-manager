import React from 'react';
import { ArrowLeft, Layers, ChevronRight } from 'lucide-react';
import OttLogo from './OttLogos';
import BottomNav from './BottomNav';

export default function OttBrandsGrid({
  brands = [],
  onSelectBrand,
  onBack,
  showHeader = false,
  activeTab = 'home',
  onSelectTab,
  showAllBrands = false
}) {
  return (
    <div className="select-ott-screen" style={{ padding: '16px 14px', paddingBottom: '90px' }}>
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

      {/* Prominent "All Brands" Button Above all Brands (image copy 46.png) */}
      {showAllBrands && (
        <button
          type="button"
          className="all-brands-banner-btn"
          onClick={() => onSelectBrand({ id: 'all', displayName: 'All Brands', name: 'All Brands', color: '#2563eb' })}
          id="btn-all-brands"
          aria-label="View all brands recent sales"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.22)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              flexShrink: 0
            }}>
              <Layers size={22} color="#ffffff" strokeWidth={2.4} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.2px', color: '#ffffff', lineHeight: 1.2 }}>
                All Brands
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.88)', marginTop: '2px' }}>
                View all sales across all platforms
              </div>
            </div>
          </div>
          <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} style={{ flexShrink: 0 }} />
        </button>
      )}

      {/* 3 Columns × Rows Grid matching image copy 13.png & 46.png */}
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
