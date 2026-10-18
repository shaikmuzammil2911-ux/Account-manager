import React from 'react';
import {
  ShoppingCart, Database, History, ChevronRight,
  TrendingUp, Users, Tv, AlertCircle, RefreshCw
} from 'lucide-react';

export default function HomeScreen({
  onNavigate,
  stats,
  brands = [],
  onSyncSheets
}) {
  const emptyScreens = stats?.emptyScreens ?? 0;
  const totalSales = stats?.totalSales ?? 0;
  const todayCount = stats?.todayCount ?? 0;
  const expiredCount = stats?.expiredCount ?? 0;

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '16px' }}>
      {/* Live Google Sheets Integration Status & Sync Pill */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #bbf7d0',
        borderRadius: '12px',
        padding: '8px 12px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#16a34a',
            boxShadow: '0 0 8px #22c55e'
          }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#166534' }}>
            Google Sheets: Live Linked
          </span>
        </div>
        <button
          type="button"
          onClick={onSyncSheets}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: '#ffffff',
            border: '1px solid #86efac',
            color: '#15803d',
            fontSize: '11px',
            fontWeight: 800,
            padding: '5px 10px',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          <RefreshCw size={12} /> Sync Now
        </button>
      </div>

      {/* 4 Metric Cards Placed On Top (as per image copy 7.png) */}
      <div style={{ marginBottom: '20px' }}>
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
            id="home-stat-total-sales"
          >
            <div className="stat-card-icon blue">
              <TrendingUp size={20} />
            </div>
            <div>
              <div className="stat-card-label">Total Sales</div>
              <div className="stat-card-value text-blue">{totalSales}</div>
            </div>
          </div>

          {/* Card 2: Free Screens */}
          <div
            className="stat-card stat-card-green"
            onClick={() => onNavigate('data')}
            id="home-stat-free-screens"
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
            id="home-stat-expiring-today"
          >
            <div className="stat-card-icon orange">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="stat-card-label">Expiring Today</div>
              <div className="stat-card-value text-orange">{todayCount}</div>
            </div>
          </div>

          {/* Card 4: Expired */}
          <div
            className="stat-card stat-card-red"
            onClick={() => onNavigate('expiry', { filter: 'expired' })}
            id="home-stat-expired"
          >
            <div className="stat-card-icon red">
              <Users size={20} />
            </div>
            <div>
              <div className="stat-card-label">Expired</div>
              <div className="stat-card-value text-red">{expiredCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* The 3 Main Prominent Navigation Buttons (Below the 4 Metric Cards) */}
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
    </div>
  );
}
