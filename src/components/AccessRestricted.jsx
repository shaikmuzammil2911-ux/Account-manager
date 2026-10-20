import React from 'react';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function AccessRestricted({ featureName = 'This feature', onGoHome }) {
  return (
    <div style={{
      maxWidth: '520px',
      margin: '60px auto',
      padding: '36px 24px',
      backgroundColor: '#ffffff',
      borderRadius: '16px',
      border: '1px solid #fee2e2',
      boxShadow: '0 4px 20px rgba(220, 38, 38, 0.06)',
      textAlign: 'center'
    }}>
      <div style={{
        width: '56px',
        height: '56px',
        borderRadius: '16px',
        backgroundColor: '#fef2f2',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 16px auto',
        border: '1px solid #fecaca'
      }}>
        <ShieldAlert size={30} />
      </div>

      <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: '0 0 8px 0' }}>
        Access Restricted
      </h2>

      <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px 0' }}>
        <strong>{featureName}</strong> has been disabled for your account by your system administrator.
        Please contact your super admin if you need access.
      </p>

      <button
        type="button"
        onClick={onGoHome}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '11px 22px',
          borderRadius: '10px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          border: 'none',
          fontSize: '13.5px',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        <Home size={16} />
        <span>Return to Home Dashboard</span>
      </button>
    </div>
  );
}
