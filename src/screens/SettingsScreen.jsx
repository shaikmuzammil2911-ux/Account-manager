import React, { useState, useEffect } from 'react';
import {
  Edit3, RotateCcw, Save, Shield, Check, AlertCircle, FileSpreadsheet,
  Link, ArrowRight, Copy, Download, Upload, Plus, Trash2, Eye, EyeOff, CheckCircle2,
  Sun, Moon, Monitor, Type, Sliders, Palette, Sparkles
} from 'lucide-react';
import { api } from '../api/client';
import { GOOGLE_APPS_SCRIPT_TEMPLATE, DEFAULT_CELL_MAPPINGS } from '../utils/googleSheets';

export default function SettingsScreen({ onResetComplete, showToast }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('menu'); // 'menu', 'sale_form', 'credentials', 'reset'

  // General Settings: Theme & Text Size State (image copy 67.png)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('accounts_theme') || 'light';
    } catch (e) {
      return 'light';
    }
  });

  const [textSize, setTextSize] = useState(() => {
    try {
      return parseInt(localStorage.getItem('accounts_text_size') || '100', 10);
    } catch (e) {
      return 100;
    }
  });

  // Sub-tab inside Edit Sale Form
  const [saleFormTab, setSaleFormTab] = useState('fields'); // 'fields' or 'sheets'

  // Form Fields Editor State
  const [formFields, setFormFields] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomType, setNewCustomType] = useState('text');

  // Google Sheet Linker State
  const [sheetWebhookUrl, setSheetWebhookUrl] = useState('');
  const [sheetName, setSheetName] = useState('Sales_Data');
  const [autoSyncOnSale, setAutoSyncOnSale] = useState(true);
  const [cellMappings, setCellMappings] = useState([]);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isTestingSheet, setIsTestingSheet] = useState(false);
  const [isPushingAll, setIsPushingAll] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setFormFields(data.saleFormFields || {});
        setCustomFields(data.customSaleFields || []);

        if (data.theme) {
          setTheme(data.theme);
          applyTheme(data.theme);
        } else {
          const localTheme = localStorage.getItem('accounts_theme') || 'light';
          applyTheme(localTheme);
        }

        if (data.textSize) {
          const num = parseInt(data.textSize, 10);
          if (!isNaN(num)) {
            setTextSize(num);
            applyTextSize(num);
          }
        } else {
          const localSize = parseInt(localStorage.getItem('accounts_text_size') || '100', 10);
          applyTextSize(localSize);
        }

        const gConfig = data.googleSheetConfig || {};
        setSheetWebhookUrl(gConfig.webhookUrl || '');
        setSheetName(gConfig.sheetName || 'Sales_Data');
        setAutoSyncOnSale(gConfig.autoSyncOnSale ?? true);
        setCellMappings(gConfig.cellMappings || DEFAULT_CELL_MAPPINGS);
      } catch (err) {
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const applyTheme = (t) => {
    setTheme(t);
    try {
      localStorage.setItem('accounts_theme', t);
    } catch (e) {}

    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (t === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
    }
  };

  const applyTextSize = (pct) => {
    const val = parseInt(pct, 10) || 100;
    setTextSize(val);
    try {
      localStorage.setItem('accounts_text_size', String(val));
    } catch (e) {}

    const scale = val / 100;
    if (document.body) {
      document.body.style.zoom = scale;
    }
    document.documentElement.style.fontSize = `${16 * scale}px`;
    document.documentElement.style.setProperty('--app-font-scale', String(scale));
  };

  const handleThemeToggle = async (newTheme) => {
    applyTheme(newTheme);
    try {
      await api.updateSettings({ theme: newTheme });
      showToast(`Theme changed to ${newTheme === 'dark' ? 'Dark Mode' : newTheme === 'light' ? 'Light Mode' : 'System Default'}`, 'success');
    } catch (e) {
      showToast('Theme saved locally', 'info');
    }
  };

  const handleTextSizeChange = async (newSize) => {
    applyTextSize(newSize);
    try {
      await api.updateSettings({ textSize: newSize });
    } catch (e) {}
  };

  const handleSaveAll = async () => {
    try {
      const updated = await api.updateSettings({
        saleFormFields: formFields,
        customSaleFields: customFields,
        googleSheetConfig: {
          enabled: !!sheetWebhookUrl,
          webhookUrl: sheetWebhookUrl.trim(),
          sheetName: sheetName.trim() || 'Sales_Data',
          autoSyncOnSale,
          lastSyncTime: settings?.googleSheetConfig?.lastSyncTime || null,
          cellMappings
        }
      });
      setSettings(updated);
      showToast('Sale Form and Google Sheet settings saved!', 'success');
      setActiveMenu('menu');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleFieldToggle = (fieldKey, prop, value) => {
    setFormFields(prev => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        [prop]: value
      }
    }));
  };

  const handleCellMappingChange = (index, prop, value) => {
    setCellMappings(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [prop]: value };
      return next;
    });
  };

  const handleAddCustomField = () => {
    if (!newCustomLabel.trim()) {
      showToast('Enter a field label', 'error');
      return;
    }
    const newField = {
      id: `custom_${Date.now()}`,
      label: newCustomLabel.trim(),
      type: newCustomType,
      placeholder: `Enter ${newCustomLabel.trim()}`,
      required: false,
      enabled: true
    };
    setCustomFields(prev => [...prev, newField]);
    setNewCustomLabel('');
    showToast(`Added custom field "${newField.label}"`, 'success');
  };

  const handleRemoveCustomField = (id) => {
    setCustomFields(prev => prev.filter(f => f.id !== id));
  };

  const handleTestSheetConnection = async () => {
    if (!sheetWebhookUrl.trim()) {
      showToast('Please enter your Google Apps Script Webhook URL first', 'error');
      return;
    }
    try {
      setIsTestingSheet(true);
      await fetch(sheetWebhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'test_connection',
          sheetName,
          test: true,
          timestamp: new Date().toISOString()
        }),
        mode: 'no-cors'
      });
      showToast('Test signal sent to Google Sheet successfully!', 'success');
    } catch (err) {
      showToast('Failed to connect to Google Sheet', 'error');
    } finally {
      setIsTestingSheet(false);
    }
  };

  const handlePushAllSales = async () => {
    if (!sheetWebhookUrl.trim()) {
      showToast('Please enter your Google Apps Script Webhook URL first', 'error');
      return;
    }
    try {
      setIsPushingAll(true);
      await handleSaveAll();
      const res = await api.syncAllToGoogleSheet();
      showToast(`Successfully pushed ${res.count} sales records to Google Sheet!`, 'success');
    } catch (err) {
      showToast(err.message || 'Push failed', 'error');
    } finally {
      setIsPushingAll(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
    showToast('Apps Script code copied to clipboard!', 'success');
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all records back to the initial video demonstration state?')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.resetData();
      showToast('Database reset to initial demo state!', 'success');
      if (onResetComplete) onResetComplete();
      setActiveMenu('menu');
    } catch (err) {
      showToast('Failed to reset database', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  if (loading) {
    return <div className="screen-content" style={{ padding: '40px', textAlign: 'center' }}>Loading settings...</div>;
  }

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Main Settings Menu (image copy 67.png) */}
      {activeMenu === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '10px' }}>

          {/* ================================================================= */}
          {/* GENERAL PREFERENCES & APPEARANCE (image copy 67.png)              */}
          {/* ================================================================= */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1.5px solid #cbd5e1',
            padding: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
              }}>
                <Palette size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  General Settings & Preferences
                </h3>
                <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                  Theme mode, text size and appearance
                </span>
              </div>
            </div>

            {/* 1. THEME (Light Mode / Dark Mode) */}
            <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sun size={15} color="#ea580c" />
                  <span>Theme (Light Mode / Dark Mode):</span>
                </label>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: theme === 'dark' ? '#38bdf8' : '#2563eb',
                  background: theme === 'dark' ? '#0f172a' : '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {theme === 'dark' ? 'Dark Active' : theme === 'light' ? 'Light Active' : 'System Auto'}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {/* Light Mode */}
                <button
                  type="button"
                  onClick={() => handleThemeToggle('light')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: theme === 'light' ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
                    background: theme === 'light' ? '#eff6ff' : '#f8fafc',
                    color: theme === 'light' ? '#1d4ed8' : '#475569',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  id="theme-btn-light"
                >
                  <Sun size={18} color="#f59e0b" />
                  <span>Light Mode</span>
                </button>

                {/* Dark Mode */}
                <button
                  type="button"
                  onClick={() => handleThemeToggle('dark')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: theme === 'dark' ? '2px solid #38bdf8' : '1.5px solid #cbd5e1',
                    background: theme === 'dark' ? '#0f172a' : '#f8fafc',
                    color: theme === 'dark' ? '#38bdf8' : '#475569',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  id="theme-btn-dark"
                >
                  <Moon size={18} color="#38bdf8" />
                  <span>Dark Mode</span>
                </button>

                {/* System Auto */}
                <button
                  type="button"
                  onClick={() => handleThemeToggle('system')}
                  style={{
                    padding: '10px 8px',
                    borderRadius: '10px',
                    border: theme === 'system' ? '2px solid #9333ea' : '1.5px solid #cbd5e1',
                    background: theme === 'system' ? '#faf5ff' : '#f8fafc',
                    color: theme === 'system' ? '#7e22ce' : '#475569',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s'
                  }}
                  id="theme-btn-system"
                >
                  <Monitor size={18} color="#7e22ce" />
                  <span>System Auto</span>
                </button>
              </div>
            </div>

            {/* 2. ENTIRE WEBSITE TEXT SIZE */}
            <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Type size={16} color="#2563eb" />
                  <span>Entire Website Text Size:</span>
                </label>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 900,
                  color: '#2563eb',
                  background: '#eff6ff',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}>
                  {textSize}%
                </span>
              </div>

              {/* Quick Presets */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
                {[
                  { label: 'Small', val: 90 },
                  { label: 'Normal', val: 100 },
                  { label: 'Medium', val: 110 },
                  { label: 'Large', val: 120 }
                ].map(p => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleTextSizeChange(p.val)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: textSize === p.val ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: textSize === p.val ? '#eff6ff' : '#f8fafc',
                      color: textSize === p.val ? '#1d4ed8' : '#334155',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      textAlign: 'center'
                    }}
                  >
                    {p.label}
                    <div style={{ fontSize: '9.5px', opacity: 0.8 }}>({p.val}%)</div>
                  </button>
                ))}
              </div>

              {/* Interactive Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 700 }}>A</span>
                <input
                  type="range"
                  min="85"
                  max="125"
                  step="5"
                  value={textSize}
                  onChange={e => handleTextSizeChange(parseInt(e.target.value, 10))}
                  style={{ flex: 1, accentColor: '#2563eb', cursor: 'pointer' }}
                  id="text-size-range-slider"
                />
                <span style={{ fontSize: '15px', color: '#0f172a', fontWeight: 900 }}>A</span>
              </div>

              {/* Live Preview Sample */}
              <div style={{
                marginTop: '10px',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '8px 12px',
                textAlign: 'center'
              }}>
                <span style={{ fontSize: `${13 * (textSize / 100)}px`, fontWeight: 700, color: '#0f172a' }}>
                  Live Preview: Netflix, Prime Video, Hotstar • Accounts Manager 🍿
                </span>
              </div>
            </div>

            {/* 3. MORE I WILL UPDATE PLACEHOLDER (as requested in prompt) */}
            <div style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '12px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <div style={{
                background: '#e0e7ff',
                color: '#4338ca',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Sparkles size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '12.5px', color: '#1e293b' }}>More Options Ready:</strong>
                <p style={{ fontSize: '11.5px', color: '#64748b', margin: '2px 0 0 0' }}>
                  Additional preferences and system options will appear here as you update them.
                </p>
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '13px',
            fontWeight: 800,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            margin: '6px 4px 0'
          }}>
            Forms & Database Configuration:
          </div>

          {/* 1. Purple Button: Edit Sale Form & Google Sheet Linker */}
          <button
            type="button"
            className="home-menu-card glossy-btn-purple"
            onClick={() => setActiveMenu('sale_form')}
            id="settings-edit-sale-form"
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <Edit3 size={20} color="#ffffff" />
              </div>
              <div>
                <div>Edit Sale Form</div>
                <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 500 }}>
                  Customize Form Fields & Link Google Sheet Cells
                </div>
              </div>
            </div>
          </button>

          {/* 2. Cyan Button: Edit Credentials Form */}
          <button
            type="button"
            className="home-menu-card glossy-btn-cyan"
            onClick={() => setActiveMenu('credentials')}
            id="settings-edit-credentials"
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <Shield size={20} color="#ffffff" />
              </div>
              <div>
                <div>Edit Credentials Form</div>
                <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 500 }}>
                  Password Masking & UnLock Security
                </div>
              </div>
            </div>
          </button>

          {/* 3. Red Button: Edit Data Reset */}
          <button
            type="button"
            className="home-menu-card glossy-btn-red"
            onClick={() => setActiveMenu('reset')}
            id="settings-edit-reset"
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <RotateCcw size={20} color="#ffffff" />
              </div>
              <div>
                <div>Edit Data Reset</div>
                <div style={{ fontSize: '11px', opacity: 0.85, fontWeight: 500 }}>
                  Reset To Video Demo Data
                </div>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* EDIT SALE FORM & GOOGLE SHEET LINKER */}
      {activeMenu === 'sale_form' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
          {/* Sub-tab Navigation */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
            <button
              type="button"
              className={`filter-pill-btn ${saleFormTab === 'fields' ? 'glossy-btn-purple' : 'glossy-btn-gray'}`}
              style={{ padding: '8px', fontSize: '12px' }}
              onClick={() => setSaleFormTab('fields')}
            >
              <Edit3 size={14} />
              <span>Changeable Form Fields</span>
            </button>

            <button
              type="button"
              className={`filter-pill-btn ${saleFormTab === 'sheets' ? 'glossy-btn-green' : 'glossy-btn-gray'}`}
              style={{ padding: '8px', fontSize: '12px' }}
              onClick={() => setSaleFormTab('sheets')}
            >
              <FileSpreadsheet size={14} />
              <span>Google Sheet Cells</span>
            </button>
          </div>

          {/* TAB 1: FORM FIELDS CUSTOMIZER */}
          {saleFormTab === 'fields' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#1e293b' }}>
                  Website Sale Form Fields
                </h4>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Toggle & rename any field
                </span>
              </div>

              {/* Fields Table */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '2px' }}>
                {Object.entries(formFields).map(([key, field]) => {
                  return (
                    <div
                      key={key}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            checked={field.enabled}
                            onChange={e => handleFieldToggle(key, 'enabled', e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                          />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: field.enabled ? '#0f172a' : '#94a3b8' }}>
                            {field.label}
                          </span>
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={e => handleFieldToggle(key, 'required', e.target.checked)}
                          />
                          <span>Required</span>
                        </label>
                      </div>

                      {field.enabled && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          <input
                            type="text"
                            placeholder="Label"
                            className="form-input-pill"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            value={field.label}
                            onChange={e => handleFieldToggle(key, 'label', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Placeholder"
                            className="form-input-pill"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            value={field.placeholder || ''}
                            onChange={e => handleFieldToggle(key, 'placeholder', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Custom Fields Added by User */}
                {customFields.map(cField => (
                  <div
                    key={cField.id}
                    style={{
                      background: '#f3e8ff',
                      border: '1px solid #d8b4fe',
                      borderRadius: '10px',
                      padding: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#6b21a8' }}>
                        {cField.label} (Custom)
                      </div>
                      <div style={{ fontSize: '11px', color: '#7c3aed' }}>
                        Type: {cField.type} • {cField.required ? 'Mandatory' : 'Optional'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCustomField(cField.id)}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Field Section */}
              <div style={{ marginTop: '12px', background: '#faf5ff', padding: '10px', borderRadius: '10px', border: '1px dashed #d8b4fe' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#7c3aed', display: 'block', marginBottom: '6px' }}>
                  + Add Custom Field to Sale Form
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-input-pill"
                    placeholder="Field Name (e.g. Profile PIN, Notes)"
                    style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                    value={newCustomLabel}
                    onChange={e => setNewCustomLabel(e.target.value)}
                  />
                  <button
                    type="button"
                    className="glossy-btn glossy-btn-purple"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={handleAddCustomField}
                  >
                    <Plus size={14} /> Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SHEETS CELL LINKER */}
          {saleFormTab === 'sheets' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileSpreadsheet size={16} /> Google Sheet Cell Mapping
                </h4>

                <button
                  type="button"
                  onClick={() => setShowScriptModal(true)}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1d4ed8',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Apps Script Setup
                </button>
              </div>

              <div className="form-group">
                <label className="form-label">Google Apps Script Webhook URL</label>
                <input
                  type="url"
                  className="form-input-pill"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={sheetWebhookUrl}
                  onChange={e => setSheetWebhookUrl(e.target.value)}
                />
              </div>

              <div className="form-row-2">
                <div>
                  <label className="form-label">Sheet Tab Name</label>
                  <input
                    type="text"
                    className="form-input-pill"
                    placeholder="Sales_Data"
                    value={sheetName}
                    onChange={e => setSheetName(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', marginTop: '16px' }}>
                    <input
                      type="checkbox"
                      checked={autoSyncOnSale}
                      onChange={e => setAutoSyncOnSale(e.target.checked)}
                    />
                    <span>Auto-Sync on New Sale</span>
                  </label>
                </div>
              </div>

              {/* Cell Mapping Table */}
              <div style={{ marginTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569' }}>
                    Form Field &rarr; Google Sheet Column Cells:
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                  {cellMappings.map((mapping, idx) => (
                    <div
                      key={mapping.fieldKey}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '32px 1.2fr 1.2fr 30px',
                        gap: '6px',
                        alignItems: 'center',
                        background: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <input
                        type="text"
                        maxLength={2}
                        value={mapping.sheetCol}
                        onChange={e => handleCellMappingChange(idx, 'sheetCol', e.target.value.toUpperCase())}
                        style={{
                          width: '100%',
                          textAlign: 'center',
                          fontWeight: 800,
                          fontSize: '12px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '2px 0'
                        }}
                      />

                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {mapping.label}
                      </span>

                      <input
                        type="text"
                        value={mapping.header}
                        onChange={e => handleCellMappingChange(idx, 'header', e.target.value)}
                        placeholder="Header"
                        style={{
                          width: '100%',
                          fontSize: '11px',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          padding: '3px 6px'
                        }}
                      />

                      <input
                        type="checkbox"
                        checked={mapping.enabled}
                        onChange={e => handleCellMappingChange(idx, 'enabled', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sync Actions Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '14px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ padding: '8px', fontSize: '11.5px' }}
                  onClick={handleTestSheetConnection}
                  disabled={isTestingSheet}
                >
                  <Link size={13} />
                  <span>{isTestingSheet ? 'Testing...' : 'Test Sheet Ping'}</span>
                </button>

                <button
                  type="button"
                  className="glossy-btn glossy-btn-green"
                  style={{ padding: '8px', fontSize: '11.5px' }}
                  onClick={handlePushAllSales}
                  disabled={isPushingAll}
                >
                  <Upload size={13} />
                  <span>{isPushingAll ? 'Syncing...' : 'Push All Sales'}</span>
                </button>
              </div>

              {/* Download CSV Backup */}
              <button
                type="button"
                className="glossy-btn glossy-btn-blue"
                style={{ width: '100%', padding: '8px', fontSize: '12px', marginTop: '8px' }}
                onClick={() => api.exportSalesCsv()}
              >
                <Download size={14} /> Download CSV Formatted for Google Sheets
              </button>
            </div>
          )}

          {/* Action Footer */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setActiveMenu('menu')}
            >
              Back
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-purple"
              style={{ flex: 1, padding: '10px' }}
              onClick={handleSaveAll}
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {/* CREDENTIALS FORM */}
      {activeMenu === 'credentials' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#0891b2' }}>
            Credentials Security & Protection
          </h3>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <strong>Edit (UnLock) Lockout:</strong> Enabled to prevent accidental editing
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <strong>Password Masking:</strong> Enabled by default with toggle eye icon
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <strong>Auto Screen Allocation:</strong> 5-screen slots per master account
            </div>
          </div>

          <button
            type="button"
            className="glossy-btn glossy-btn-cyan"
            style={{ width: '100%', padding: '10px' }}
            onClick={() => setActiveMenu('menu')}
          >
            Back to Settings Menu
          </button>
        </div>
      )}

      {/* DATA RESET */}
      {activeMenu === 'reset' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #fecaca', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', marginBottom: '10px' }}>
            <AlertCircle size={20} />
            <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Reset Database</h3>
          </div>

          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
            This will reload all demo inventory, sales records (Bharath, Santhosh, Aarav Mehta, Riya Sharma),
            and calendar dates demonstrated in the reference video.
          </p>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setActiveMenu('menu')}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-red"
              style={{ flex: 1, padding: '10px' }}
              onClick={handleResetData}
              disabled={isResetting}
            >
              {isResetting ? 'Resetting...' : 'Confirm Reset'}
            </button>
          </div>
        </div>
      )}

      {/* Google Apps Script Modal Guide */}
      {showScriptModal && (
        <div className="modal-overlay" onClick={() => setShowScriptModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>Google Sheet Apps Script</h3>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
              Follow these simple 3 steps to link your Google Sheet:
            </p>

            <ol style={{ fontSize: '12px', color: '#334155', paddingLeft: '18px', marginBottom: '12px', lineHeight: '1.5' }}>
              <li>Open your Google Sheet &rarr; Click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Paste the code below into the editor.</li>
              <li>Click <strong>Deploy &gt; New deployment</strong> &rarr; Select <strong>Web App</strong> &rarr; Set Access to <strong>Anyone</strong> &rarr; Deploy and copy your Web App URL here!</li>
            </ol>

            <div style={{ position: 'relative', flex: 1, minHeight: '140px', marginBottom: '12px' }}>
              <textarea
                readOnly
                value={GOOGLE_APPS_SCRIPT_TEMPLATE}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '140px',
                  fontFamily: 'monospace',
                  fontSize: '10.5px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '8px',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="button"
              className="glossy-btn glossy-btn-purple"
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
              onClick={handleCopyScript}
            >
              <Copy size={14} />
              <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Script Code'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
