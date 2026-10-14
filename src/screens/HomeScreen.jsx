import React from 'react';
import { ShoppingCart, Database, History, ChevronRight, TrendingUp, Users, Tv, AlertCircle } from 'lucide-react';

export default function HomeScreen({
  onNavigate,
  stats,
  selectedBrand,
  onOpenBrandSelector
}) {
  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Brand Hero Quick Banner */}
      <div
        onClick={onOpenBrandSelector}
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: '16px',
          padding: '14px 16px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
          marginBottom: '20px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: selectedBrand?.color || '#e50914',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '16px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}
          >
            {selectedBrand?.id === 'netflix' ? 'N' : selectedBrand?.name?.slice(0, 2).toUpperCase() || 'OTT'}
          </div>
          <div>
            <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 700 }}>
              Current Platform
            </div>
            <div style={{ fontSize: '17px', fontWeight: 800 }}>
              {selectedBrand?.displayName || 'Netflix'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#38bdf8' }}>
          <span>Switch</span>
          <ChevronRight size={16} />
        </div>
      </div>

      {/* The 3 Main Prominent Navigation Buttons Matching Video Exactly */}
      <div className="home-menu-grid">
        {/* 1. SALE (Orange) */}
        <div
          className="home-menu-card glossy-btn-orange"
          onClick={() => onNavigate('sale')}
          id="home-btn-sale"
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <ShoppingCart size={22} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span>Sale</span>
          </div>
          <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} />
        </div>

        {/* 2. DATA (Green) */}
        <div
          className="home-menu-card glossy-btn-green"
          onClick={() => onNavigate('inventory')}
          id="home-btn-data"
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <Database size={22} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span>Data</span>
          </div>
          <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} />
        </div>

        {/* 3. RECENT SALES (Blue) */}
        <div
          className="home-menu-card glossy-btn-blue"
          onClick={() => onNavigate('recent-sales')}
          id="home-btn-recent-sales"
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <History size={22} color="#ffffff" strokeWidth={2.5} />
            </div>
            <span>Recent Sale's</span>
          </div>
          <ChevronRight size={22} color="#ffffff" strokeWidth={2.5} />
        </div>
      </div>

      {/* Quick Stats Grid */}
      {stats && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
            Live Inventory & Expiry Overview
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div
              onClick={() => onNavigate('recent-sales')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{ background: '#dbeafe', color: '#1d4ed8', padding: '8px', borderRadius: '8px' }}>
                <TrendingUp size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Total Sales</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>{stats.totalSales || 0}</div>
              </div>
            </div>

            <div
              onClick={() => onNavigate('inventory')}
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{ background: '#dcfce7', color: '#15803d', padding: '8px', borderRadius: '8px' }}>
                <Tv size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Free Screens</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#15803d' }}>{stats.emptyScreens || 0}</div>
              </div>
            </div>

            <div
              onClick={() => onNavigate('expiry', { filter: 'today' })}
              style={{
                background: '#ffffff',
                border: '1px solid #fed7aa',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{ background: '#ffedd5', color: '#ea580c', padding: '8px', borderRadius: '8px' }}>
                <AlertCircle size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#ea580c', fontWeight: 700 }}>Expiring Today</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#ea580c' }}>{stats.todayCount || 0}</div>
              </div>
            </div>

            <div
              onClick={() => onNavigate('expiry', { filter: 'expired' })}
              style={{
                background: '#ffffff',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px', borderRadius: '8px' }}>
                <Users size={18} />
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>Expired</div>
                <div style={{ fontSize: '17px', fontWeight: 800, color: '#dc2626' }}>{stats.expiredCount || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
