import React from 'react';
import {
  ShoppingCart, Database, History, ChevronRight,
  TrendingUp, Users, Tv, AlertCircle, Sparkles, Layers
} from 'lucide-react';

export default function HomeScreen({
  onNavigate,
  stats,
  brands = []
}) {
  const brandCount = brands.length || 10;
  const totalScreens = stats?.totalScreens || 0;
  const emptyScreens = stats?.emptyScreens || 0;

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Brand-Neutral Platform Overview Card (Supports All Brands Equally) */}
      <div className="home-hero-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="hero-icon-pill">
              <Layers size={18} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#94a3b8', fontWeight: 800 }}>
                System Status
              </div>
              <div style={{ fontSize: '20px', fontWeight: 900, color: '#ffffff' }}>
                {brandCount} OTT Brands Active
              </div>
            </div>
          </div>
          <div className="hero-live-badge">
            <span className="live-dot" />
            <span>LIVE</span>
          </div>
        </div>

        {/* Quick Brand Badges Strip */}
        <div className="home-brands-strip">
          {brands.slice(0, 6).map(b => (
            <span key={b.id} className="home-brand-chip" style={{ borderColor: b.color || '#3b82f6' }}>
              <span className="chip-dot" style={{ backgroundColor: b.color || '#3b82f6' }} />
              {b.displayName || b.name}
            </span>
          ))}
          {brands.length > 6 && (
            <span className="home-brand-chip more">+{brands.length - 6} more</span>
          )}
        </div>
      </div>

      {/* The 3 Main Prominent Navigation Buttons */}
      <div className="home-menu-grid">
        {/* 1. SALE (Orange) */}
        <div
          className="home-menu-card glossy-btn-orange"
          onClick={() => onNavigate('sale')}
          id="home-btn-sale"
          role="button"
          tabIndex={0}
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <ShoppingCart size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div className="home-menu-titles">
              <span className="home-menu-main-title">Sale</span>
              <span className="home-menu-subtitle">Pick brand, screen & sell account</span>
            </div>
          </div>
          <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
        </div>

        {/* 2. DATA (Green) */}
        <div
          className="home-menu-card glossy-btn-green"
          onClick={() => onNavigate('data')}
          id="home-btn-data"
          role="button"
          tabIndex={0}
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <Database size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div className="home-menu-titles">
              <span className="home-menu-main-title">Data</span>
              <span className="home-menu-subtitle">Manage accounts & 1–10 screens</span>
            </div>
          </div>
          <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
        </div>

        {/* 3. RECENT SALES (Blue) */}
        <div
          className="home-menu-card glossy-btn-blue"
          onClick={() => onNavigate('recent-sales')}
          id="home-btn-recent-sales"
          role="button"
          tabIndex={0}
        >
          <div className="home-menu-left">
            <div className="home-menu-icon">
              <History size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div className="home-menu-titles">
              <span className="home-menu-main-title">Recent Sale's</span>
              <span className="home-menu-subtitle">Brand-wise customer history & PINs</span>
            </div>
          </div>
          <ChevronRight size={24} color="#ffffff" strokeWidth={2.5} />
        </div>
      </div>

      {/* Live Inventory & Expiry Overview */}
      <div style={{ marginTop: '28px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px'
        }}>
          <h2 style={{
            fontSize: '15px',
            fontWeight: 800,
            color: '#475569',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            margin: 0
          }}>
            Live Inventory & Expiry Overview
          </h2>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>
            All Platforms
          </span>
        </div>

        <div className="stats-overview-grid">
          {/* Card 1: Total Sales */}
          <div
            className="stat-card stat-card-blue"
            onClick={() => onNavigate('recent-sales')}
          >
            <div className="stat-card-icon blue">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="stat-card-label">Total Sales</div>
              <div className="stat-card-value text-blue">{stats?.totalSales ?? 0}</div>
            </div>
          </div>

          {/* Card 2: Free Screens */}
          <div
            className="stat-card stat-card-green"
            onClick={() => onNavigate('data')}
          >
            <div className="stat-card-icon green">
              <Tv size={20} />
            </div>
            <div>
              <div className="stat-card-label">Free Screens</div>
              <div className="stat-card-value text-green">{emptyScreens}</div>
            </div>
          </div>

          {/* Card 3: Expiring Today */}
          <div
            className="stat-card stat-card-orange"
            onClick={() => onNavigate('expiry', { filter: 'today' })}
          >
            <div className="stat-card-icon orange">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="stat-card-label">Expiring Today</div>
              <div className="stat-card-value text-orange">{stats?.todayCount ?? 0}</div>
            </div>
          </div>

          {/* Card 4: Expired */}
          <div
            className="stat-card stat-card-red"
            onClick={() => onNavigate('expiry', { filter: 'expired' })}
          >
            <div className="stat-card-icon red">
              <Users size={20} />
            </div>
            <div>
              <div className="stat-card-label">Expired</div>
              <div className="stat-card-value text-red">{stats?.expiredCount ?? 0}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
