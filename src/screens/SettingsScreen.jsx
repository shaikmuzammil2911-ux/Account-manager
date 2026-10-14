import React, { useState, useEffect } from 'react';
import { Edit3, RotateCcw, Save, Shield, MessageSquare, Check, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

export default function SettingsScreen({
  onResetComplete,
  showToast
}) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('menu'); // 'menu', 'sale_form', 'credentials', 'reset'

  const [whatsappTemplate, setWhatsappTemplate] = useState('');
  const [countryCode, setCountryCode] = useState('91');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await api.getSettings();
        setSettings(data);
        setWhatsappTemplate(data.whatsappTemplate || '');
        setCountryCode(data.whatsappCountryCode || '91');
      } catch (err) {
        showToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      const updated = await api.updateSettings({
        whatsappTemplate,
        whatsappCountryCode: countryCode
      });
      setSettings(updated);
      showToast('Settings saved successfully!', 'success');
      setActiveTab('menu');
    } catch (err) {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to reset all records back to the initial video demonstration state?')) {
      return;
    }
    try {
      setIsResetting(true);
      await api.resetData();
      showToast('Database reset to initial demo state!', 'success');
      if (onResetComplete) onResetComplete();
      setActiveTab('menu');
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
      {activeTab === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
          {/* 1. Purple Button: Edit Sale Form (Frame 68s) */}
          <button
            type="button"
            className="home-menu-card glossy-btn-purple"
            onClick={() => setActiveTab('sale_form')}
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <Edit3 size={20} color="#ffffff" />
              </div>
              <span>Edit Sale Form</span>
            </div>
          </button>

          {/* 2. Cyan Button: Edit Credentials Form (Frame 68s) */}
          <button
            type="button"
            className="home-menu-card glossy-btn-cyan"
            onClick={() => setActiveTab('credentials')}
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <Shield size={20} color="#ffffff" />
              </div>
              <span>Edit Credentials Form</span>
            </div>
          </button>

          {/* 3. Red/Orange Button: Edit Data Reset (Frame 68s) */}
          <button
            type="button"
            className="home-menu-card glossy-btn-red"
            onClick={() => setActiveTab('reset')}
            style={{ width: '100%', border: 'none', textAlign: 'left', padding: '16px 20px' }}
          >
            <div className="home-menu-left">
              <div className="home-menu-icon">
                <RotateCcw size={20} color="#ffffff" />
              </div>
              <span>Edit Data Reset</span>
            </div>
          </button>
        </div>
      )}

      {/* Sale Form / WhatsApp Settings */}
      {activeTab === 'sale_form' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#7c3aed' }}>
            Edit Sale & WhatsApp Form
          </h3>

          <div className="form-group">
            <label className="form-label">WhatsApp Country Code (Default: 91 for India)</label>
            <input
              type="text"
              className="form-input-pill"
              value={countryCode}
              onChange={e => setCountryCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Notification Template</label>
            <textarea
              rows={6}
              className="form-input-pill"
              style={{ height: 'auto', resize: 'vertical' }}
              value={whatsappTemplate}
              onChange={e => setWhatsappTemplate(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>
              Variables available: {'{name}'}, {'{brand}'}, {'{screen}'}, {'{pin}'}, {'{expiryDate}'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px' }}
              onClick={() => setActiveTab('menu')}
            >
              Back
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-purple"
              style={{ flex: 1, padding: '10px' }}
              onClick={handleSaveSettings}
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Credentials Form */}
      {activeTab === 'credentials' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px', color: '#0891b2' }}>
            Credentials Security & Defaults
          </h3>

          <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
            Accounts and customer passwords are saved encrypted on the persistent backend store.
            Default state is locked to protect sensitive credentials from accidental modification.
          </p>

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '16px', fontSize: '12.5px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Check size={14} color="#16a34a" />
              <strong>UnLock/Edit Protection:</strong> Enabled
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Check size={14} color="#16a34a" />
              <strong>Password Masking:</strong> Enabled by default
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={14} color="#16a34a" />
              <strong>5-Screen Slot Allocation:</strong> Automated
            </div>
          </div>

          <button
            type="button"
            className="glossy-btn glossy-btn-cyan"
            style={{ width: '100%', padding: '10px' }}
            onClick={() => setActiveTab('menu')}
          >
            Back to Settings Menu
          </button>
        </div>
      )}

      {/* Data Reset */}
      {activeTab === 'reset' && (
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
              onClick={() => setActiveTab('menu')}
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
    </div>
  );
}
