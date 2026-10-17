import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Share2, Plus, Mail, Check, Trash2, Users, Sparkles, X,
  ShieldCheck, CheckCircle2, ChevronRight, Eye, RefreshCw
} from 'lucide-react';
import { api } from '../api/client';

export default function ShareBrandsScreen({ brands = [], currentUser, onBack, showToast, onShareUpdated }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State as requested:
  // - inside show top "Create Share" Button
  // - below show: Mail id empty box
  // - below: Put Select Brand option
  // - below: Show Selected brands
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [senderName, setSenderName] = useState(() => {
    return currentUser?.name || 'Bharath';
  });
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Load active shares
  const loadShares = async () => {
    try {
      setLoading(true);
      const list = await api.getShares(currentUser?.email);
      setShares(list || []);
    } catch (e) {
      showToast('Failed to load shared brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShares();
  }, []);

  // Filter out already virtual shared brands from the source list
  const sourceBrands = (brands || []).filter(b => !b.isShared && !b.id.includes('__shared__'));

  // Toggle brand selection
  const handleToggleBrand = (brandId) => {
    setSelectedBrandIds(prev => {
      if (prev.includes(brandId)) {
        return prev.filter(id => id !== brandId);
      } else {
        return [...prev, brandId];
      }
    });
  };

  const handleSelectAllBrands = () => {
    if (selectedBrandIds.length === sourceBrands.length) {
      setSelectedBrandIds([]);
    } else {
      setSelectedBrandIds(sourceBrands.map(b => b.id));
    }
  };

  const handleRemoveSelectedBrand = (brandId) => {
    setSelectedBrandIds(prev => prev.filter(id => id !== brandId));
  };

  // Submit Create Share
  const handleCreateShare = async (e) => {
    if (e) e.preventDefault();

    if (!receiverEmail.trim()) {
      showToast('Please enter the partner/seller Mail ID', 'error');
      return;
    }

    // Basic email format check
    if (!receiverEmail.includes('@') || !receiverEmail.includes('.')) {
      showToast('Please enter a valid Mail ID (e.g. brother@gmail.com)', 'error');
      return;
    }

    if (selectedBrandIds.length === 0) {
      showToast('Please select at least 01 Brand to share', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        senderEmail: currentUser?.email || 'Fixyourmobiles10@gmail.com',
        senderName: senderName.trim() || 'Bharath',
        receiverEmail: receiverEmail.trim().toLowerCase(),
        brandIds: selectedBrandIds
      };

      await api.createShare(payload);
      showToast(`Shared ${selectedBrandIds.length} Brand(s) with ${receiverEmail.trim()}!`, 'success');

      // Reset form
      setReceiverEmail('');
      setSelectedBrandIds([]);
      loadShares();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      showToast(err.message || 'Failed to create brand share', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Revoke / Delete Share
  const handleDeleteShare = async (shareId, email) => {
    if (!window.confirm(`Revoke brand sharing with ${email}? Their access will be removed.`)) {
      return;
    }
    try {
      await api.deleteShare(shareId);
      showToast('Brand share revoked successfully', 'info');
      loadShares();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      showToast('Failed to revoke share', 'error');
    }
  };

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '10px' }}>
      {/* ===================================================================== */}
      {/* TOP HEADER SUB-BAR                                                   */}
      {/* ===================================================================== */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '8px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <button
          type="button"
          onClick={onBack}
          className="header-btn"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            Share Brands
          </h2>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            Multi-Seller Inventory & Screen Collaboration
          </span>
        </div>

        <button
          type="button"
          onClick={loadShares}
          className="header-btn"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          title="Refresh Shares"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TOP "CREATE SHARE" BUTTON (as requested in prompt)                 */}
      {/* ===================================================================== */}
      <div style={{ marginBottom: '14px' }}>
        <button
          type="button"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="glossy-btn glossy-btn-blue"
          style={{
            width: '100%',
            padding: '13px 18px',
            borderRadius: '12px',
            fontSize: '14.5px',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
          }}
          id="btn-top-create-share"
        >
          <Plus size={18} strokeWidth={2.6} />
          <span>{isFormOpen ? 'Create Share (Active)' : 'Create Share'}</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 2. CREATION FORM (as requested in prompt)                             */}
      {/* ===================================================================== */}
      {isFormOpen && (
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1.5px solid #93c5fd',
          padding: '16px',
          marginBottom: '18px',
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)'
        }}>
          {/* Header Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <div style={{
              background: '#eff6ff',
              color: '#2563eb',
              width: '30px',
              height: '30px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Share2 size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Share Brands with Another Seller
              </h3>
              <p style={{ fontSize: '11px', color: '#64748b', margin: '2px 0 0 0' }}>
                They can sell your empty screens. Sales stay private to each seller.
              </p>
            </div>
          </div>

          {/* FIELD 1: MAIL ID EMPTY BOX (as requested in prompt) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '6px'
            }}>
              Partner / Seller Mail ID:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="credential-input"
                placeholder="Enter brother / partner mail ID (e.g. brother@gmail.com)"
                value={receiverEmail}
                onChange={e => setReceiverEmail(e.target.value)}
                style={{
                  paddingLeft: '36px',
                  fontSize: '13px',
                  borderColor: '#cbd5e1'
                }}
                id="share-partner-mail-id-input"
              />
              <Mail
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '11px', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* SENDER NAME (The other seller will see: Brand + My name, e.g. Netflix (Bharath)) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12.5px',
              fontWeight: 800,
              color: '#0f172a',
              marginBottom: '4px'
            }}>
              Your Name (displayed on their website):
            </label>
            <input
              type="text"
              className="credential-input"
              placeholder="e.g. Bharath"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
              style={{ fontSize: '13px', borderColor: '#cbd5e1' }}
              id="share-sender-name-input"
            />
            <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
              💡 In their website, the shared brand will show as: <strong>Brand ({senderName || 'Your Name'})</strong>, e.g. <em>Netflix ({senderName || 'Bharath'})</em>
            </div>
          </div>

          {/* FIELD 2: PUT SELECT BRAND OPTION (as requested in prompt) */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                Select Brands to Share:
              </label>
              <button
                type="button"
                onClick={handleSelectAllBrands}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '11.5px',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
              >
                {selectedBrandIds.length === sourceBrands.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Brand Selection Chips Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              {sourceBrands.map(b => {
                const isSelected = selectedBrandIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleToggleBrand(b.id)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${b.color || '#2563eb'}` : '1.5px solid #cbd5e1',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: b.color || '#2563eb'
                      }} />
                      <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                        {b.displayName}
                      </span>
                    </div>

                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: isSelected ? (b.color || '#2563eb') : '#f1f5f9',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIELD 3: SHOW SELECTED BRANDS (as requested in prompt) */}
          <div style={{
            marginBottom: '16px',
            padding: '10px 12px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1.5px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569', marginBottom: '6px' }}>
              Selected Brands to Share ({selectedBrandIds.length}):
            </div>

            {selectedBrandIds.length === 0 ? (
              <div style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                No brands selected yet. Tap above to select brands.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedBrandIds.map(bId => {
                  const b = sourceBrands.find(item => item.id === bId);
                  if (!b) return null;
                  return (
                    <div
                      key={bId}
                      style={{
                        background: b.color || '#2563eb',
                        color: '#ffffff',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.12)'
                      }}
                    >
                      <span>{b.displayName} ({senderName || 'Bharath'})</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSelectedBrand(bId);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ffffff',
                          cursor: 'pointer',
                          padding: 0,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        aria-label={`Remove ${b.displayName}`}
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTION BUTTON */}
          <button
            type="button"
            className="glossy-btn glossy-btn-green"
            onClick={handleCreateShare}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              fontSize: '13.5px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            id="btn-confirm-save-share"
          >
            <CheckCircle2 size={16} />
            <span>{submitting ? 'Sharing...' : 'Confirm & Share Brands'}</span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 3. ACTIVE SHARED COLLABORATIONS LIST                                 */}
      {/* ===================================================================== */}
      <div>
        <div style={{
          fontSize: '13px',
          fontWeight: 800,
          color: '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>Active Shared Collaborations:</span>
          <span style={{
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '6px'
          }}>
            {shares.length} Active
          </span>
        </div>

        {shares.length === 0 ? (
          <div style={{
            background: '#ffffff',
            borderRadius: '14px',
            border: '1.5px dashed #cbd5e1',
            padding: '24px 16px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <Users size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#1e293b' }}>
              No Active Brand Shares Yet
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
              Click <strong>"+ Create Share"</strong> above to share your inventory and screens with another seller (e.g. brother).
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {shares.map((share, idx) => {
              return (
                <div
                  key={share.id || idx}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    padding: '12px 14px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: 900, color: '#0f172a' }}>
                          Shared with: {share.receiverEmail}
                        </span>
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px'
                        }}>
                          Active
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        Shared by: <strong>{share.senderName}</strong> ({share.senderEmail})
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteShare(share.id, share.receiverEmail)}
                      style={{
                        background: '#fee2e2',
                        border: '1px solid #fca5a5',
                        color: '#dc2626',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Revoke Share"
                    >
                      <Trash2 size={12} />
                      <span>Revoke</span>
                    </button>
                  </div>

                  {/* Brands badges */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {(share.brandIds || []).map(bId => {
                      const b = sourceBrands.find(item => item.id === bId);
                      return (
                        <span
                          key={bId}
                          style={{
                            background: b?.color || '#2563eb',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.2px'
                          }}
                        >
                          {b?.displayName || bId} ({share.senderName})
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* 4. HOW IT WORKS SUMMARY CARD (as explained by user in prompt)         */}
      {/* ===================================================================== */}
      <div style={{
        marginTop: '20px',
        background: '#f8fafc',
        borderRadius: '14px',
        border: '1.5px solid #e2e8f0',
        padding: '14px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <ShieldCheck size={18} color="#16a34a" />
          <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            How Share Brands Collaboration Works:
          </h4>
        </div>

        <ul style={{
          fontSize: '12px',
          color: '#475569',
          paddingLeft: '18px',
          margin: 0,
          lineHeight: '1.55'
        }}>
          <li>
            <strong>Additional Brand in Data Base:</strong> The partner seller will see an extra brand: <em>Brand (Your Name)</em>, e.g. <strong>Netflix ({senderName || 'Bharath'})</strong>.
          </li>
          <li>
            <strong>Shared Empty Screens:</strong> When your partner sells on that brand, they select your account's empty screen (e.g. Screen 03 or 04).
          </li>
          <li>
            <strong>Live Expiry Date Update:</strong> The empty screen becomes occupied with the expiry date on the master account, preventing double selling.
          </li>
          <li>
            <strong>Private Recent Sales:</strong> Your Recent Sales shows only screens you sold (e.g. 01, 02, 05). Their Recent Sales shows only screens they sold (e.g. 03, 04).
          </li>
        </ul>
      </div>
    </div>
  );
}
