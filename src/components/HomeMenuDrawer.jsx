import React from 'react';
import {
  X, Tv, FileText, Link2, Settings, LogOut, ChevronRight, Sparkles, Layers, MessageSquare, Share2, TrendingUp, Palette, ShieldCheck
} from 'lucide-react';

export default function HomeMenuDrawer({
  isOpen,
  onClose,
  currentUser,
  userPermissions = {},
  onSelectAdminPanel,
  onSelectBrands,
  onSelectForms,
  onSelectCreateForm,
  onSelectCellsLinkup,
  onSelectWhatsAppMessages,
  onSelectShareBrands,
  onSelectRevenueManagement,
  onSelectColorCodings,
  onSelectSettings,
  onLogout
}) {
  if (!isOpen) return null;

  const isAdmin = currentUser?.role === 'admin';

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
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                {currentUser?.fullName || currentUser?.name || 'OTT Sellers Management'}
                {isAdmin ? ' (Admin)' : ''}
              </p>
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
          {/* Admin Panel Button (Exclusive to Super Admin) */}
          {isAdmin && onSelectAdminPanel && (
            <button
              type="button"
              className="menu-action-card"
              onClick={() => {
                onClose();
                onSelectAdminPanel();
              }}
              id="menu-btn-admin-panel"
              style={{
                border: '1.5px solid #3b82f6',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
                marginBottom: '10px'
              }}
            >
              <div className="menu-card-icon" style={{ backgroundColor: '#1e40af' }}>
                <ShieldCheck size={22} color="#ffffff" strokeWidth={2.4} />
              </div>
              <div className="menu-card-text">
                <span className="menu-card-title" style={{ color: '#1e40af', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Admin Panel</span>
                  <span style={{ fontSize: '10px', background: '#2563eb', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>
                    SUPER ADMIN
                  </span>
                </span>
                <span className="menu-card-desc" style={{ color: '#3b82f6' }}>
                  Multi-User management, feature controls & branding
                </span>
              </div>
              <ChevronRight size={20} className="menu-card-arrow" style={{ color: '#1e40af' }} />
            </button>
          )}

          {/* Button 1: Brands */}
          {(isAdmin || userPermissions.brands !== false) && (
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
          )}

          {/* Button 2: Forms */}
          {(isAdmin || userPermissions.cells_linkup !== false) && (
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
          )}

          {/* Button 3: Cells Linking */}
          {(isAdmin || userPermissions.cells_linkup !== false) && (
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
          )}

          {/* Button 4: Custom WhatsApp Message */}
          {(isAdmin || userPermissions.notifications !== false) && (
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
          )}

          {/* Button 5: Share Brands */}
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

          {/* Button 6: Revenue Management */}
          {(isAdmin || userPermissions.revenue_management !== false) && (
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
          )}

          {/* Button 7: Color Codings (image copy 105.png & 106.png) */}
          <button
            type="button"
            className="menu-action-card menu-card-neutral"
            onClick={() => {
              onClose();
              if (onSelectColorCodings) onSelectColorCodings();
            }}
            id="menu-btn-color-codings"
          >
            <div className="menu-card-icon blue">
              <Palette size={22} color="#2563eb" strokeWidth={2.3} />
            </div>
            <div className="menu-card-text">
              <span className="menu-card-title">Color Codings</span>
              <span className="menu-card-desc">Customize Green (20d), Orange (10d), Red (5d) thresholds</span>
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
