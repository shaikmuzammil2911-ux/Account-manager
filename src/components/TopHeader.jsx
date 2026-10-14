import React from 'react';
import { ArrowLeft, Settings, Menu } from 'lucide-react';

export default function TopHeader({
  title,
  showBack = false,
  onBack,
  showSettings = true,
  onSettings,
  showMenu = false,
  onMenu,
  selectedBrand,
  onBrandClick
}) {
  return (
    <header className="app-header">
      <div style={{ width: '40px' }}>
        {showBack ? (
          <button
            type="button"
            className="header-btn"
            onClick={onBack}
            aria-label="Go back"
            title="Back"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <div style={{ width: '38px' }} />
        )}
      </div>

      <div className="header-title-container">
        {selectedBrand ? (
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
              gap: '6px'
            }}
          >
            {selectedBrand.id === 'netflix' ? (
              <span className="brand-logo-text netflix">NETFLIX</span>
            ) : selectedBrand.id === 'prime_video' ? (
              <span style={{ color: '#00a8e1', fontWeight: 900, fontSize: '20px' }}>prime video</span>
            ) : (
              <span style={{ color: selectedBrand.color || '#0f172a', fontWeight: 900, fontSize: '18px' }}>
                {selectedBrand.displayName || selectedBrand.name}
              </span>
            )}
          </button>
        ) : (
          <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>{title || 'Accounts Manager'}</h1>
        )}
      </div>

      <div style={{ width: '40px', display: 'flex', justifyContent: 'flex-end' }}>
        {showMenu ? (
          <button
            type="button"
            className="header-btn"
            onClick={onMenu}
            aria-label="Menu"
            title="Menu / OTT Platforms"
          >
            <Menu size={18} />
          </button>
        ) : showSettings ? (
          <button
            type="button"
            className="header-btn"
            onClick={onSettings}
            aria-label="Settings"
            title="Settings"
          >
            <Settings size={18} />
          </button>
        ) : (
          <div style={{ width: '38px' }} />
        )}
      </div>
    </header>
  );
}
