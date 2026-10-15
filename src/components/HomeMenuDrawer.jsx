import React from 'react';
import { X, FileText, Link2, Sparkles, ChevronRight, Settings } from 'lucide-react';

export default function HomeMenuDrawer({
  isOpen,
  onClose,
  onSelectCreateForm,
  onSelectCellsLinkup,
  onSelectSettings
}) {
  if (!isOpen) return null;

  return (
    <div className="menu-drawer-overlay" onClick={onClose}>
      <div
        className="menu-drawer-panel"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Application Menu"
      >
        {/* Drawer Header */}
        <div className="menu-drawer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="menu-header-badge">
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Menu</h3>
              <p style={{ fontSize: '13px', color: '#64748b' }}>OTT Sellers Management</p>
            </div>
          </div>
          <button
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* The Two Primary Menu Buttons as Required */}
        <div className="menu-drawer-items">
          {/* Button 1: Create Form */}
          <button
            type="button"
            className="menu-action-card menu-card-orange"
            onClick={() => {
              onClose();
              onSelectCreateForm();
            }}
            id="menu-btn-create-form"
          >
            <div className="menu-card-icon orange">
              <FileText size={22} color="#ea580c" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">1. Create Form</span>
              <span className="menu-card-desc">Sell account, select screens & auto-fill customer credentials</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 2: Cells Linkup */}
          <button
            type="button"
            className="menu-action-card menu-card-green"
            onClick={() => {
              onClose();
              onSelectCellsLinkup();
            }}
            id="menu-btn-cells-linkup"
          >
            <div className="menu-card-icon green">
              <Link2 size={22} color="#16a34a" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">2. Cells Linkup</span>
              <span className="menu-card-desc">Google Spreadsheet ID, worksheets & live sync connection</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Additional Settings Quick Link */}
          {onSelectSettings && (
            <button
              type="button"
              className="menu-action-card menu-card-neutral"
              onClick={() => {
                onClose();
                onSelectSettings();
              }}
              id="menu-btn-settings"
              style={{ marginTop: '8px' }}
            >
              <div className="menu-card-icon gray">
                <Settings size={20} color="#475569" />
              </div>
              <div className="menu-card-text">
                <span className="menu-card-title" style={{ fontSize: '15px' }}>General Settings</span>
                <span className="menu-card-desc">System preferences & database utilities</span>
              </div>
              <ChevronRight size={18} className="menu-card-arrow" />
            </button>
          )}
        </div>

        <div className="menu-drawer-footer">
          <span>OTT Sellers System v2.0 • Real-time Synchronized</span>
        </div>
      </div>
    </div>
  );
}
