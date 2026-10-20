import React from 'react';
import { ArrowLeft, Menu, Sparkles } from 'lucide-react';

export default function TopHeader({
  title,
  showBack = false,
  onBack,
  isHome = false,
  onOpenMenu,
  selectedBrand,
  onBrandClick,
  rightAction,
  siteSettings
}) {
  const businessName = siteSettings?.businessName || 'OTT SELLERS';
  const subtitle = siteSettings?.subtitle || 'Management System';
  const logoUrl = siteSettings?.logoUrl;

  return (
    <header className="app-header">
      {/* Left Action Button (Back or Spacer) */}
      <div style={{ width: '42px', display: 'flex', alignItems: 'center' }}>
        {showBack ? (
          <button
            type="button"
            className="header-btn"
            onClick={onBack}
            aria-label="Go back"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div style={{ width: '40px' }} />
        )}
      </div>

      {/* Center Title / Brand Area */}
      <div className="header-title-container">
        {isHome ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  objectFit: 'contain',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              />
            ) : (
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(30, 64, 175, 0.35)'
                }}
              >
                <Sparkles size={18} />
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                {businessName}
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                {subtitle}
              </span>
            </div>
          </div>
        ) : selectedBrand ? (
          <button
            type="button"
            className="brand-logo-btn"
            onClick={onBrandClick}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: onBrandClick ? 'pointer' : 'default',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: selectedBrand.color || '#3b82f6',
                display: 'inline-block'
              }}
            />
            <span style={{ color: '#0f172a', fontWeight: 900, fontSize: '19px' }}>
              {selectedBrand.displayName || selectedBrand.name}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={title === 'All Brands' && onBrandClick ? onBrandClick : undefined}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: title === 'All Brands' && onBrandClick ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '2px 6px',
              borderRadius: '8px'
            }}
            title={title === 'All Brands' ? 'Click to filter by specific brand' : ''}
          >
            {title === 'All Brands' && (
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#2563eb',
                  display: 'inline-block'
                }}
              />
            )}
            <span style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
              {title || 'OTT Management'}
            </span>
          </button>
        )}
      </div>

      {/* Right Action Button (Hamburger Menu on Home, custom rightAction, or standard Menu) */}
      <div style={{ minWidth: '42px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
        {rightAction ? (
          rightAction
        ) : isHome ? (
          <button
            type="button"
            className="header-btn header-menu-btn"
            onClick={onOpenMenu}
            aria-label="Open Menu"
            title="Menu (Create Form, Cells Linkup)"
            id="home-header-menu-btn"
          >
            <Menu size={22} color="#0f172a" strokeWidth={2.3} />
          </button>
        ) : (
          <button
            type="button"
            className="header-btn"
            onClick={onOpenMenu}
            aria-label="Menu"
            title="Menu"
          >
            <Menu size={20} color="#475569" />
          </button>
        )}
      </div>
    </header>
  );
}
