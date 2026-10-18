import React, { useState, useEffect } from 'react';
import {
  ShoppingCart, Database, History, ChevronRight,
  TrendingUp, Users, Tv, AlertCircle, RefreshCw,
  Link, Settings, Copy, Check, X, FileSpreadsheet, ExternalLink
} from 'lucide-react';
import { api } from '../api/client';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, DEFAULT_SPREADSHEET_ID } from '../utils/googleSheets';

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

  const [sheetsConfig, setSheetsConfig] = useState(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [webhookInput, setWebhookInput] = useState('');
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  const loadSheetsConfig = async () => {
    try {
      const cfg = await api.getSheetsConfig();
      setSheetsConfig(cfg);
      if (cfg?.webhookUrl) {
        setWebhookInput(cfg.webhookUrl);
      }
    } catch (e) {
      console.warn('Error reading sheets config on HomeScreen:', e);
    }
  };

  useEffect(() => {
    loadSheetsConfig();
  }, []);

  const isLinked = Boolean(sheetsConfig?.webhookUrl && sheetsConfig.webhookUrl.trim());

  const handleCopyScript = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
      setScriptCopied(true);
      setTimeout(() => setScriptCopied(false), 2500);
    }
  };

  const handleSaveWebhook = async () => {
    const trimmed = webhookInput.trim();
    if (!trimmed) {
      alert('Please enter your Google Apps Script Web App URL');
      return;
    }
    try {
      setIsSavingWebhook(true);
      const updated = await api.updateSheetsConfig({
        enabled: true,
        spreadsheetId: DEFAULT_SPREADSHEET_ID,
        webhookUrl: trimmed,
        status: 'Connected'
      });
      setSheetsConfig(updated);
      setShowConnectModal(false);
      if (onSyncSheets) {
        onSyncSheets();
      }
    } catch (e) {
      alert('Failed to save webhook: ' + e.message);
    } finally {
      setIsSavingWebhook(false);
    }
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '16px' }}>
      {/* Live Google Sheets Integration Status & Sync Pill */}
      {isLinked ? (
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
          <div
            onClick={() => setShowConnectModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            title="Click to view Google Sheets connection details"
          >
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              style={{
                background: '#ffffff',
                border: '1px solid #bbf7d0',
                color: '#166534',
                padding: '5px 7px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Spreadsheet connection settings"
            >
              <Settings size={13} />
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
          border: '1.5px solid #fde68a',
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
              backgroundColor: '#d97706',
              boxShadow: '0 0 6px #f59e0b'
            }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>
              Google Sheets: Setup Required
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowConnectModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: '#ffffff',
              border: '1.5px solid #f59e0b',
              color: '#b45309',
              fontSize: '11px',
              fontWeight: 800,
              padding: '5px 10px',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <Link size={12} /> Connect Sheet
          </button>
        </div>
      )}

      {/* Quick Connect Google Sheets Modal */}
      {showConnectModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#dcfce7',
                  color: '#15803d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Connect Google Sheets
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Authoritative Single Source of Truth
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Target Spreadsheet Info Box */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '14px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Authoritative Spreadsheet
              </div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>
                OTT A/C MANAGER
              </div>
              <a
                href="https://docs.google.com/spreadsheets/d/1B4nJBadfzafATMFL7bE_pD3T9k4KwcZBBL95ZzdL9Gg/edit?usp=drivesdk"
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  color: '#2563eb',
                  fontWeight: 700,
                  textDecoration: 'none'
                }}
              >
                Open Google Spreadsheet <ExternalLink size={12} />
              </a>
            </div>

            {/* Quick 3-step instructions */}
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '14px',
              fontSize: '12px',
              color: '#166534',
              lineHeight: 1.5
            }}>
              <div style={{ fontWeight: 800, marginBottom: '6px', color: '#14532d' }}>
                Quick Setup (Takes 1 Minute):
              </div>
              <ol style={{ margin: 0, paddingLeft: '18px' }}>
                <li>Open the Google Sheet above</li>
                <li>Click <b>Extensions</b> &gt; <b>Apps Script</b></li>
                <li>Paste the script code and click <b>Deploy &gt; Web app</b> (Access: Anyone)</li>
                <li>Paste your Web App URL below:</li>
              </ol>
            </div>

            {/* Copy Script Code Button */}
            <button
              type="button"
              onClick={handleCopyScript}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '10px',
                border: '1.5px solid #22c55e',
                background: scriptCopied ? '#dcfce7' : '#ffffff',
                color: '#15803d',
                fontSize: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                marginBottom: '14px',
                transition: 'all 0.2s ease'
              }}
            >
              {scriptCopied ? <Check size={14} color="#15803d" /> : <Copy size={14} />}
              {scriptCopied ? 'Apps Script Code Copied to Clipboard!' : 'Copy Google Apps Script Code'}
            </button>

            {/* Input for Web App URL */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Google Apps Script Web App URL
              </label>
              <input
                type="url"
                value={webhookInput}
                onChange={(e) => setWebhookInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  color: '#0f172a',
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'monospace'
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-green"
                onClick={handleSaveWebhook}
                disabled={isSavingWebhook}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isSavingWebhook ? 'Saving & Verifying...' : 'Save & Connect'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowConnectModal(false);
                  if (onNavigate) onNavigate('cells-linkup');
                }}
                style={{
                  width: '100%',
                  padding: '9px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: 'transparent',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Open Advanced Cells Linkup Screen
              </button>
            </div>
          </div>
        </div>
      )}

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
