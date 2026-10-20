import React, { useState } from 'react';
import { X, Check, Palette, Sparkles, Sliders } from 'lucide-react';
import { getColorCodingSettings, saveColorCodingSettings, DEFAULT_COLOR_CODINGS } from '../utils/dateUtils';

export default function ColorCodingsModal({ isOpen, onClose, showToast }) {
  const [settings, setSettings] = useState(() => getColorCodingSettings());

  if (!isOpen) return null;

  const handleSave = () => {
    saveColorCodingSettings(settings);
    if (showToast) showToast('Color Codings updated successfully!', 'success');
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_COLOR_CODINGS);
    saveColorCodingSettings(DEFAULT_COLOR_CODINGS);
    if (showToast) showToast('Reset to default color codings', 'info');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'slideUp 0.2s ease-out'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
          color: '#ffffff',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Palette size={22} />
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>
                Color Codings Settings
              </h3>
              <span style={{ fontSize: '11.5px', opacity: 0.9 }}>
                Expiry & Activation Highlight Rules
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ fontSize: '12.5px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
            Configure days thresholds for independent subscription cards and screen status badges.
          </p>

          {/* Rule 1: Green (Active / New Sale) */}
          <div style={{
            background: '#f0fdf4',
            border: '1.5px solid #86efac',
            borderRadius: '14px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#16a34a',
                  display: 'inline-block',
                  boxShadow: '0 0 8px rgba(22, 163, 74, 0.6)'
                }} />
                <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#166534' }}>
                  Green — New Sale & Active
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#15803d' }}>
                &gt; {settings.orangeWarningDays || 10} Days
              </span>
            </div>
            <div style={{ fontSize: '11.5px', color: '#15803d', fontWeight: 600 }}>
              Shows green highlighted date badge and active borders for accounts with plenty of validity.
            </div>
          </div>

          {/* Rule 2: Orange (Warning in 10 Days) */}
          <div style={{
            background: '#fff7ed',
            border: '1.5px solid #fdba74',
            borderRadius: '14px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#ea580c',
                  display: 'inline-block',
                  boxShadow: '0 0 8px rgba(234, 88, 12, 0.6)'
                }} />
                <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#9a3412' }}>
                  Orange — Expiry Warning
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#c2410c' }}>
                Within {settings.orangeWarningDays} Days
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="3"
                max="15"
                value={settings.orangeWarningDays || 10}
                onChange={e => setSettings({ ...settings, orangeWarningDays: Number(e.target.value) })}
                style={{ flex: 1, accentColor: '#ea580c' }}
              />
              <span style={{
                background: '#ffedd5',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '12px',
                color: '#9a3412'
              }}>
                {settings.orangeWarningDays || 10}d
              </span>
            </div>
          </div>

          {/* Rule 3: Red (Critical in 5 Days & Expired) */}
          <div style={{
            background: '#fef2f2',
            border: '1.5px solid #fca5a5',
            borderRadius: '14px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  display: 'inline-block',
                  boxShadow: '0 0 8px rgba(220, 38, 38, 0.6)'
                }} />
                <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#991b1b' }}>
                  Red — Expired / Expiring in 5 Days
                </span>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#b91c1c' }}>
                &le; {settings.redCriticalDays} Days
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="range"
                min="1"
                max="7"
                value={settings.redCriticalDays || 5}
                onChange={e => setSettings({ ...settings, redCriticalDays: Number(e.target.value) })}
                style={{ flex: 1, accentColor: '#dc2626' }}
              />
              <span style={{
                background: '#fee2e2',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 900,
                fontSize: '12px',
                color: '#991b1b'
              }}>
                {settings.redCriticalDays || 5}d
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              onClick={handleReset}
              style={{ flex: 1, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
            >
              Reset Defaults
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-green"
              onClick={handleSave}
              style={{ flex: 1.5, padding: '10px', fontSize: '13px', borderRadius: '10px' }}
            >
              <Check size={16} strokeWidth={2.5} />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
