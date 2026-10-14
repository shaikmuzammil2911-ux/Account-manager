import React from 'react';
import { ShoppingBag, Layers, ChevronRight, Check } from 'lucide-react';

export default function BrandsScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigate
}) {
  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* 2 Primary Action Cards matching 40s & 44s in storyboard */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {/* All Sales */}
        <div
          className="home-menu-card glossy-btn-orange"
          onClick={() => onNavigate('recent-sales')}
          style={{ padding: '16px 20px' }}
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <ShoppingBag size={22} color="#ffffff" />
            </div>
            <span>All Sales</span>
          </div>
          <ChevronRight size={22} color="#ffffff" />
        </div>

        {/* OTT Platform */}
        <div
          className="home-menu-card glossy-btn-green"
          onClick={() => onNavigate('inventory')}
          style={{ padding: '16px 20px' }}
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <Layers size={22} color="#ffffff" />
            </div>
            <span>OTT Platform</span>
          </div>
          <ChevronRight size={22} color="#ffffff" />
        </div>
      </div>

      {/* Select Specific Brand */}
      <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
        Select Streaming Platform
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {brands.map(brand => {
          const isSelected = brand.id === selectedBrand?.id;

          return (
            <div
              key={brand.id}
              onClick={() => {
                onSelectBrand(brand);
                onNavigate('inventory');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: '14px',
                background: '#ffffff',
                border: isSelected ? '2px solid #2563eb' : '1px solid #e2e8f0',
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: brand.color || '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: '14px'
                  }}
                >
                  {brand.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>{brand.displayName}</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>{brand.screensCount} Screens • {brand.plans.length} Plans</div>
                </div>
              </div>

              {isSelected ? (
                <div style={{ background: '#2563eb', color: '#ffffff', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={14} strokeWidth={3} />
                </div>
              ) : (
                <ChevronRight size={18} color="#94a3b8" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
