import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet, CheckCircle2, AlertTriangle, RefreshCw,
  ExternalLink, Copy, Check, ShieldCheck, ArrowRight, Info
} from 'lucide-react';
import { api } from '../api/client';
import { REQUIRED_WORKSHEETS, GOOGLE_APPS_SCRIPT_TEMPLATE } from '../utils/googleSheets';

export default function CellsLinkupScreen({ showToast, onBack }) {
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [autoSyncOnSale, setAutoSyncOnSale] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected'); // 'Connected' | 'Disconnected' | 'Testing' | 'Error'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lastError, setLastError] = useState(null);

  const [existingSheets, setExistingSheets] = useState([]);
  const [missingSheets, setMissingSheets] = useState([]);

  const [isTesting, setIsTesting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptCopied, setScriptCopied] = useState(false);

  // Load existing config on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await api.getSheetsConfig();
        if (config) {
          setSpreadsheetId(config.spreadsheetId || '');
          setWebhookUrl(config.webhookUrl || '');
          setAutoSyncOnSale(config.autoSyncOnSale ?? true);
          setConnectionStatus(config.status || (config.webhookUrl ? 'Connected' : 'Disconnected'));
          setLastSyncTime(config.lastSyncTime || null);
          setLastError(config.lastError || null);
        }
      } catch (err) {
        console.warn('Error loading sheets config', err);
      }
    }
    loadConfig();
  }, []);

  // Helper to extract clean spreadsheet ID if user pastes full URL
  const handleSpreadsheetIdChange = (val) => {
    let cleanId = val.trim();
    if (cleanId.includes('/d/')) {
      const parts = cleanId.split('/d/');
      if (parts[1]) {
        cleanId = parts[1].split('/')[0];
      }
    }
    setSpreadsheetId(cleanId);
  };

  const handleSaveConfig = async () => {
    try {
      setIsSaving(true);
      const updated = await api.updateSheetsConfig({
        enabled: !!webhookUrl.trim(),
        spreadsheetId: spreadsheetId.trim(),
        webhookUrl: webhookUrl.trim(),
        autoSyncOnSale,
        status: connectionStatus,
        lastSyncTime,
        lastError
      });
      showToast('Cells Linkup configuration saved!', 'success');
    } catch (err) {
      showToast('Failed to save configuration', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!webhookUrl.trim()) {
      showToast('Please enter your Google Apps Script Web App URL first.', 'error');
      return;
    }

    try {
      setIsTesting(true);
      setConnectionStatus('Testing');
      setLastError(null);

      const result = await api.testSheetsConnection(webhookUrl.trim());

      if (result.connected) {
        setConnectionStatus('Connected');
        if (result.sheets) setExistingSheets(result.sheets);
        if (result.spreadsheetId && !spreadsheetId) {
          setSpreadsheetId(result.spreadsheetId);
        }
        showToast(result.message || 'Connection verified successfully!', 'success');
      } else {
        setConnectionStatus('Error');
        setLastError(result.message || 'Connection test failed');
        showToast(result.message || 'Could not connect to Google Sheet', 'error');
      }
    } catch (err) {
      setConnectionStatus('Error');
      setLastError(err.message);
      showToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleValidateSheets = async (autoCreate = false) => {
    if (!webhookUrl.trim()) {
      showToast('Please enter your Web App URL first.', 'error');
      return;
    }

    try {
      setIsValidating(true);
      setLastError(null);

      const result = await api.validateSheets(webhookUrl.trim(), autoCreate);

      if (result.existingSheets) setExistingSheets(result.existingSheets);
      if (result.missingSheets) setMissingSheets(result.missingSheets);

      if (result.valid) {
        setMissingSheets([]);
        showToast('All required worksheets (Netflix, Amazon, Aha, All Data, Sales) are verified!', 'success');
      } else {
        showToast(`Missing required sheets: ${(result.missingSheets || []).join(', ')}`, 'error');
      }
    } catch (err) {
      showToast(`Sheet validation error: ${err.message}`, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleSyncNow = async () => {
    if (!webhookUrl.trim()) {
      showToast('Configure and test your Google Sheet Webhook URL before syncing.', 'error');
      return;
    }

    try {
      setIsSyncing(true);
      setLastError(null);

      const result = await api.syncNow();
      if (result.success) {
        const timeStr = new Date().toLocaleTimeString();
        setLastSyncTime(new Date().toISOString());
        setConnectionStatus('Connected');
        showToast(`Full spreadsheet sync completed at ${timeStr}!`, 'success');
      } else {
        setLastError(result.error || result.reason || 'Sync failed');
        showToast(result.error || 'Sync failed. Please check permissions.', 'error');
      }
    } catch (err) {
      setLastError(err.message);
      showToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_TEMPLATE);
    setScriptCopied(true);
    showToast('Apps Script code copied to clipboard!', 'success');
    setTimeout(() => setScriptCopied(false), 2000);
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px' }}>
      {/* Title & Connection Status Badge */}
      <div className="linkup-header-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="linkup-icon-badge">
              <FileSpreadsheet size={24} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                Cells Linkup
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Google Spreadsheet Multi-Worksheet Integration
              </p>
            </div>
          </div>

          <div className={`status-pill ${connectionStatus.toLowerCase()}`}>
            <span className="status-dot" />
            <span>{connectionStatus}</span>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="linkup-settings-card">
        {/* Field 1: Google Spreadsheet ID */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ fontWeight: 800 }}>
              Google Spreadsheet ID
            </label>
            <span style={{ fontSize: '12px', color: '#64748b' }}>or paste entire sheet URL</span>
          </div>
          <input
            type="text"
            className="form-input-pill"
            style={{ fontSize: '14px', fontFamily: 'monospace' }}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            value={spreadsheetId}
            onChange={e => handleSpreadsheetIdChange(e.target.value)}
            id="linkup-spreadsheet-id"
          />
        </div>

        {/* Field 2: Web App Sync Webhook URL */}
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label className="form-label" style={{ fontWeight: 800 }}>
              Google Apps Script Web App URL
            </label>
            <button
              type="button"
              className="linkup-text-link"
              onClick={() => setShowScriptModal(true)}
            >
              Get Apps Script Code
            </button>
          </div>
          <input
            type="url"
            className="form-input-pill"
            style={{ fontSize: '13.5px', fontFamily: 'monospace' }}
            placeholder="https://script.google.com/macros/s/.../exec"
            value={webhookUrl}
            onChange={e => setWebhookUrl(e.target.value)}
            id="linkup-webhook-url"
          />
        </div>

        {/* Auto Sync Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px'
        }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
              Automatic Real-Time Sync on Sale
            </div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Instantly push confirmed sales to Sales & brand worksheets
            </div>
          </div>
          <input
            type="checkbox"
            checked={autoSyncOnSale}
            onChange={e => setAutoSyncOnSale(e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            id="linkup-auto-sync"
          />
        </div>

        {/* Action Buttons Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          {/* Button 1: Test Connection */}
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            style={{ padding: '12px 14px', fontSize: '14px' }}
            onClick={handleTestConnection}
            disabled={isTesting}
            id="linkup-btn-test"
          >
            <RefreshCw size={16} className={isTesting ? 'spin-anim' : ''} />
            <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
          </button>

          {/* Button 2: Validate Required Sheets */}
          <button
            type="button"
            className="glossy-btn glossy-btn-purple"
            style={{ padding: '12px 14px', fontSize: '14px' }}
            onClick={() => handleValidateSheets(false)}
            disabled={isValidating}
            id="linkup-btn-validate"
          >
            <ShieldCheck size={16} className={isValidating ? 'spin-anim' : ''} />
            <span>{isValidating ? 'Validating...' : 'Validate Sheets'}</span>
          </button>
        </div>

        {/* Full Sync Button */}
        <button
          type="button"
          className="glossy-btn glossy-btn-green"
          style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}
          onClick={handleSyncNow}
          disabled={isSyncing}
          id="linkup-btn-sync-now"
        >
          <RefreshCw size={18} className={isSyncing ? 'spin-anim' : ''} />
          <span>{isSyncing ? 'Synchronizing All Records...' : 'Sync Now (Push All Records)'}</span>
        </button>

        {/* Save Config Button */}
        <button
          type="button"
          className="glossy-btn glossy-btn-gray"
          style={{ width: '100%', padding: '10px', fontSize: '14px' }}
          onClick={handleSaveConfig}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>

        {/* Last Sync Timestamp */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12.5px', color: '#64748b' }}>
          Last Successful Sync:{' '}
          <strong style={{ color: lastSyncTime ? '#16a34a' : '#64748b' }}>
            {lastSyncTime ? new Date(lastSyncTime).toLocaleString() : 'Never synced'}
          </strong>
        </div>

        {/* Error Feedback */}
        {lastError && (
          <div style={{
            marginTop: '14px',
            padding: '12px',
            borderRadius: '10px',
            background: '#fee2e2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertTriangle size={18} />
            <span>{lastError}</span>
          </div>
        )}
      </div>

      {/* Required Worksheets Validation Card */}
      <div className="linkup-sheets-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Required Worksheets Status
          </h3>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6' }}>
            1 Spreadsheet • Multi-Sheet
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {REQUIRED_WORKSHEETS.map((sheetName, sIdx) => {
            const isMissing = missingSheets.includes(sheetName);
            const isPresent = existingSheets.includes(sheetName);

            return (
              <div
                key={sheetName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: isMissing ? '#fee2e2' : isPresent ? '#f0fdf4' : '#f8fafc',
                  border: isMissing ? '1px solid #fecaca' : isPresent ? '1px solid #bbf7d0' : '1px solid #e2e8f0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: '#1e3a8a',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    0{sIdx + 1}
                  </span>
                  <span style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                    {sheetName}
                  </span>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {sheetName === 'Sales' ? '(History & Active)' : sheetName === 'All Data' ? '(Consolidated)' : '(Brand Records)'}
                  </span>
                </div>

                <div>
                  {isMissing ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#dc2626' }}>Missing</span>
                  ) : isPresent ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={14} /> Ready
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Configured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {missingSheets.length > 0 && (
          <button
            type="button"
            className="glossy-btn glossy-btn-purple"
            style={{ width: '100%', padding: '10px', fontSize: '13px', marginTop: '12px' }}
            onClick={() => handleValidateSheets(true)}
          >
            Auto-Create Missing Sheets in Google Sheets
          </button>
        )}
      </div>

      {/* Setup Instructions Card */}
      <div className="linkup-instructions-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#1e40af' }}>
          <Info size={18} />
          <h4 style={{ fontSize: '14.5px', fontWeight: 800, margin: 0 }}>Secure Admin Setup Instructions</h4>
        </div>
        <ol style={{ fontSize: '13px', color: '#475569', paddingLeft: '20px', lineHeight: '1.6', margin: 0 }}>
          <li>Open your Google Spreadsheet and note its Spreadsheet ID from the URL.</li>
          <li>Click <strong>Extensions &gt; Apps Script</strong>.</li>
          <li>Click <strong>Get Apps Script Code</strong> below, copy the code, and paste it into the editor.</li>
          <li>Click <strong>Deploy &gt; New deployment</strong> &rarr; Select <strong>Web App</strong>.</li>
          <li>Set Execute as: <strong>Me</strong> and Who has access: <strong>Anyone</strong>.</li>
          <li>Click Deploy, copy the Web App URL, paste it above, and click <strong>Test Connection</strong>!</li>
        </ol>
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          style={{ width: '100%', padding: '10px', fontSize: '13.5px', marginTop: '14px' }}
          onClick={() => setShowScriptModal(true)}
        >
          View & Copy Google Apps Script Code
        </button>
      </div>

      {/* Apps Script Modal */}
      {showScriptModal && (
        <div className="modal-overlay" onClick={() => setShowScriptModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a' }}>Google Sheet Apps Script</h3>
              <button
                type="button"
                onClick={() => setShowScriptModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', marginBottom: '10px' }}>
              Paste this into <strong>Extensions &gt; Apps Script</strong> in your Google Sheet, deploy as Web App (Access: Anyone), and paste the URL in Cells Linkup.
            </p>

            <div style={{ position: 'relative', flex: 1, minHeight: '160px', marginBottom: '12px' }}>
              <textarea
                readOnly
                value={GOOGLE_APPS_SCRIPT_TEMPLATE}
                style={{
                  width: '100%',
                  height: '100%',
                  minHeight: '160px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '10px',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="button"
              className="glossy-btn glossy-btn-purple"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
              onClick={handleCopyScript}
            >
              {scriptCopied ? <Check size={16} /> : <Copy size={16} />}
              <span>{scriptCopied ? 'Copied to Clipboard!' : 'Copy Apps Script Code'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
