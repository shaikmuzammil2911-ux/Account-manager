import React, { useState } from 'react';
import { X, Star, Eye, EyeOff, ShieldCheck, Clock, Calendar, Tv, Smartphone, Laptop, Edit2, AlertCircle } from 'lucide-react';
import CopyButton from './CopyButton';

export default function AccountStarDetailsModal({
  isOpen,
  item,
  brand,
  onClose,
  onOpenSellerDetails,
  onToggleDefaultExpanded
}) {
  if (!isOpen || !item) return null;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'screens' | 'history' | 'seller'
  const [showPassword, setShowPassword] = useState(false);

  const screens = item.screens || [];
  const history = Array.isArray(item.credentialHistory) ? item.credentialHistory : [];
  const seller = item.sellerDetails;

  const formatTimestamp = (isoStr) => {
    if (!isoStr) return '-';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(4px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        overflowY: 'auto'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          animation: 'scaleIn 0.18s ease-out'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: '#ffffff',
          padding: '16px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: '#fef08a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(234, 179, 8, 0.4)'
            }}>
              <Star size={20} color="#ca8a04" fill="#ca8a04" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '10.5px',
                  fontWeight: 900,
                  background: '#3b82f6',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '4px'
                }}>
                  #{item.recordNumber || '01'}
                </span>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#ffffff' }}>
                  {brand?.displayName || brand?.name || 'Account'} Details
                </h3>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                {item.email || 'No Email Set'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '4px 6px',
          gap: '4px'
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'screens', label: `Screens (${screens.length})` },
            { id: 'history', label: `History (${history.length})` },
            { id: 'seller', label: 'Seller & Notes' }
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#64748b',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Account ID / Email */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  ACCOUNT ID / EMAIL
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  justifyContent: 'space-between'
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all' }}>
                    {item.email || '-'}
                  </span>
                  <CopyButton text={item.email} />
                </div>
              </div>

              {/* Password with Mask/Reveal */}
              <div>
                <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '4px' }}>
                  PASSWORD
                </label>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: '#f1f5f9',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0f172a',
                    fontFamily: showPassword ? 'inherit' : 'monospace',
                    letterSpacing: showPassword ? 'normal' : '2px'
                  }}>
                    {showPassword ? (item.password || '-') : (item.password ? '••••••••' : '-')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton text={item.password} />
                  </div>
                </div>
              </div>

              {/* Grid: Validity, Plan Variant, Default View */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    VALIDITY
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#1e293b' }}>
                    {item.validity || '12 Months'}
                  </span>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    PLAN VARIANT
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 900, color: '#2563eb' }}>
                    {item.planVariant || 'General'}
                  </span>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    DEFAULT VIEW
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 900,
                      color: item.defaultExpanded ? '#15803d' : '#64748b'
                    }}>
                      {item.defaultExpanded ? 'Expanded (ON)' : 'Compact (OFF)'}
                    </span>
                    {onToggleDefaultExpanded && (
                      <button
                        type="button"
                        onClick={() => onToggleDefaultExpanded(item)}
                        style={{
                          background: item.defaultExpanded ? '#dcfce7' : '#e2e8f0',
                          border: 'none',
                          color: item.defaultExpanded ? '#15803d' : '#475569',
                          borderRadius: '6px',
                          padding: '2px 8px',
                          fontSize: '10px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Toggle
                      </button>
                    )}
                  </div>
                </div>

                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: '2px' }}>
                    CARD STATUS
                  </span>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 900,
                    color: item.isLocked ? '#2563eb' : '#ea580c'
                  }}>
                    {item.isLocked ? 'Locked (Protected)' : 'Unlocked (Editing)'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCREENS */}
          {activeTab === 'screens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {screens.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', margin: '20px 0' }}>
                  No screens configured for this account.
                </p>
              ) : (
                screens.map((s, idx) => {
                  const isEmpty = s.status === 'empty' && !s.expiryDate;
                  return (
                    <div
                      key={idx}
                      style={{
                        background: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: '#ea580c',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 900
                        }}>
                          {s.screenNumber || (idx + 1)}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                              Screen-{s.screenNumber || (idx + 1)}
                            </span>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              fontSize: '10px',
                              fontWeight: 700,
                              background: '#f1f5f9',
                              color: '#475569',
                              padding: '1px 5px',
                              borderRadius: '4px'
                            }}>
                              {s.deviceType === 'mobile' ? <Smartphone size={10} /> : s.deviceType === 'laptop' ? <Laptop size={10} /> : <Tv size={10} />}
                              {(s.deviceType || 'tv').toUpperCase()}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                            PIN: <strong style={{ color: '#0f172a' }}>{s.pin || '1234'}</strong>
                          </span>
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          display: 'inline-block',
                          background: isEmpty ? '#f1f5f9' : '#dcfce7',
                          color: isEmpty ? '#64748b' : '#15803d',
                          border: `1px solid ${isEmpty ? '#cbd5e1' : '#86efac'}`
                        }}>
                          {isEmpty ? 'Empty / Available' : (s.expiryDate || 'Active')}
                        </div>
                        {s.expiryDate && (
                          <div style={{ fontSize: '9.5px', color: '#64748b', marginTop: '2px' }}>
                            Expires: {s.expiryDate}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CREDENTIAL CHANGE HISTORY */}
          {activeTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '11px',
                color: '#1e40af'
              }}>
                <ShieldCheck size={16} strokeWidth={2.5} color="#2563eb" />
                <span>Audit trail of confirmed security changes. Plaintext secrets are masked.</span>
              </div>

              {history.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                  <Clock size={32} strokeWidth={1.5} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    No Changes Recorded Yet
                  </p>
                  <p style={{ fontSize: '12px', margin: 0 }}>
                    Any edits made to Password, PINs, or Screen Expiry will be automatically tracked here with exact timestamps.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {history.map((h, hIdx) => (
                    <div
                      key={h.id || hIdx}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '11.5px',
                            fontWeight: 800,
                            color: '#0f172a'
                          }}>
                            {h.field || 'Credential'}
                          </span>
                          <span style={{
                            fontSize: '9.5px',
                            fontWeight: 900,
                            background: '#dcfce7',
                            color: '#15803d',
                            padding: '1px 5px',
                            borderRadius: '4px'
                          }}>
                            {h.status || 'Confirmed'}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px', fontFamily: 'monospace' }}>
                          {h.previous || 'None'} → <strong style={{ color: '#0f172a' }}>{h.current || 'None'}</strong>
                        </div>
                      </div>

                      <div style={{ fontSize: '10.5px', color: '#64748b', textAlign: 'right' }}>
                        {formatTimestamp(h.timestamp)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SELLER & NOTES */}
          {activeTab === 'seller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {seller && (seller.sellerName || seller.sellerNumber || seller.notes) ? (
                <div style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  {seller.sellerName && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        SELLER NAME
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {seller.sellerName}
                      </span>
                    </div>
                  )}

                  {seller.sellerNumber && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        CONTACT NUMBER
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {seller.sellerNumber}
                      </span>
                    </div>
                  )}

                  {seller.purchaseDate && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        PURCHASE DATE
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                        {seller.purchaseDate}
                      </span>
                    </div>
                  )}

                  {seller.reference && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        REFERENCE
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        {seller.reference}
                      </span>
                    </div>
                  )}

                  {seller.notes && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        ADDITIONAL NOTES
                      </span>
                      <span style={{ fontSize: '12px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {seller.notes}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '30px 16px',
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '12px'
                }}>
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    No Seller Details Recorded
                  </p>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px' }}>
                    Add purchase date, seller name, or order reference details for this account.
                  </p>
                </div>
              )}

              {onOpenSellerDetails && (
                <button
                  type="button"
                  className="glossy-btn glossy-btn-blue"
                  onClick={() => {
                    onClose();
                    onOpenSellerDetails(item);
                  }}
                  style={{
                    padding: '10px 14px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Edit2 size={15} />
                  <span>{seller?.sellerName ? 'Edit Seller Details' : 'Add Seller Details'}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
