import React from 'react';
import {
  X, Tv, FileText, Link2, Settings, LogOut, ChevronRight, Sparkles, Layers, MessageSquare, Share2, TrendingUp
} from 'lucide-react';

export default function HomeMenuDrawer({
  isOpen,
  onClose,
  onSelectBrands,
  onSelectForms,
  onSelectCreateForm,
  onSelectCellsLinkup,
  onSelectWhatsAppMessages,
  onSelectShareBrands,
  onSelectRevenueManagement,
  onSelectSettings,
  onLogout
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

        {/* Menu Buttons as Requested */}
        <div className="menu-drawer-items">
          {/* Button 1: Brands (as per prompt: 1st He will click on Top Right side Menu / Then he will Click on Brands) */}
          <button
            type="button"
            className="menu-action-card menu-card-orange"
            onClick={() => {
              onClose();
              if (onSelectBrands) onSelectBrands();
            }}
            id="menu-btn-brands"
          >
            <div className="menu-card-icon orange">
              <Tv size={22} color="#ea580c" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Brands</span>
              <span className="menu-card-desc">Add brand, upload logo & set validities + prices</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 2: Forms (as per prompt: opens 02 buttons: 1. Sale Form, 2. Data Base Form) */}
          <button
            type="button"
            className="menu-action-card menu-card-green"
            onClick={() => {
              onClose();
              if (onSelectForms) onSelectForms();
            }}
            id="menu-btn-forms"
          >
            <div className="menu-card-icon green">
              <Layers size={22} color="#16a34a" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Forms</span>
              <span className="menu-card-desc">Custom Canva-style Sale Forms & Data Base Forms</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 3: Cells Linking (as per prompt: Opens Cells Linking) */}
          <button
            type="button"
            className="menu-action-card menu-card-neutral"
            onClick={() => {
              onClose();
              if (onSelectCellsLinkup) onSelectCellsLinkup();
            }}
            id="menu-btn-cells-linkup"
          >
            <div className="menu-card-icon blue">
              <Link2 size={22} color="#2563eb" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Cells Linking</span>
              <span className="menu-card-desc">Link Website Form cells to GSheet cells (e.g. A1/B16)</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 4: Custom WhatsApp Message (image copy 66.png) */}
          <button
            type="button"
            className="menu-action-card menu-card-green"
            onClick={() => {
              onClose();
              if (onSelectWhatsAppMessages) onSelectWhatsAppMessages();
            }}
            id="menu-btn-whatsapp-messages"
          >
            <div className="menu-card-icon green">
              <MessageSquare size={22} color="#16a34a" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Custom WhatsApp Message</span>
              <span className="menu-card-desc">Sale Message & Expiry Message templates</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 5: Share Brands (image copy 68.png) */}
          <button
            type="button"
            className="menu-action-card menu-card-neutral"
            onClick={() => {
              onClose();
              if (onSelectShareBrands) onSelectShareBrands();
            }}
            id="menu-btn-share-brands"
          >
            <div className="menu-card-icon blue">
              <Share2 size={22} color="#2563eb" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Share Brands</span>
              <span className="menu-card-desc">Share inventory & screens with other sellers</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 6: Revenue Management (image copy 98.png & 99.png) */}
          <button
            type="button"
            className="menu-action-card menu-card-orange"
            onClick={() => {
              onClose();
              if (onSelectRevenueManagement) onSelectRevenueManagement();
            }}
            id="menu-btn-revenue-management"
          >
            <div className="menu-card-icon orange">
              <TrendingUp size={22} color="#ea580c" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Revenue Management</span>
              <span className="menu-card-desc">Sales profit, accounts count & OTT brand analytics</span>
            </div>
            <ChevronRight size={20} className="menu-card-arrow" />
          </button>

          {/* Button 7: General Settings */}
          {onSelectSettings && (
            <button
              type="button"
              className="menu-action-card menu-card-neutral"
              onClick={() => {
                onClose();
                onSelectSettings();
              }}
              id="menu-btn-settings"
            >
              <div className="menu-card-icon gray">
                <Settings size={20} color="#475569" />
              </div>
              <div className="menu-card-text">
                <span className="menu-card-title">General Settings</span>
                <span className="menu-card-desc">System configuration & database reset</span>
              </div>
              <ChevronRight size={18} className="menu-card-arrow" />
            </button>
          )}

          {/* Logout */}
          {onLogout && (
            <button
              type="button"
              className="menu-action-card menu-card-neutral"
              onClick={() => {
                onClose();
                onLogout();
              }}
              id="menu-btn-logout"
              style={{ marginTop: '8px', border: '1px solid #fee2e2', background: '#fff5f5' }}
            >
              <div className="menu-card-icon red">
                <LogOut size={18} color="#dc2626" />
              </div>
              <div className="menu-card-text">
                <span className="menu-card-title" style={{ color: '#dc2626' }}>Logout</span>
                <span className="menu-card-desc">Sign out of admin session</span>
              </div>
              <ChevronRight size={18} className="menu-card-arrow" />
            </button>
          )}
        </div>

        <div className="menu-drawer-footer">
          <span>OTT Sellers System • Fixyourmobiles10@gmail.com</span>
        </div>
      </div>
    </div>
  );
}
