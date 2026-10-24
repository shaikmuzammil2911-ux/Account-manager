import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Share2, Plus, Mail, Check, Trash2, Users, Sparkles, X,
  ShieldCheck, CheckCircle2, ChevronRight, Eye, RefreshCw, KeyRound,
  Copy, Lock, Phone, UserCheck, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';

export default function ShareBrandsScreen({ brands = [], currentUser, onBack, showToast, onShareUpdated }) {
  const [shares, setShares] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form State:
  // - Top "Create Share" Button
  // - Mail id empty box
  // - Select Brand option
  // - Show Selected brands summary
  const [isFormOpen, setIsFormOpen] = useState(true);
  const [receiverEmail, setReceiverEmail] = useState('');
  const [senderName, setSenderName] = useState(() => {
    return currentUser?.name || 'Bharath';
  });
  const [selectedBrandIds, setSelectedBrandIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Password reset modal state
  const [resettingUser, setResettingUser] = useState(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetSuccessPassword, setResetSuccessPassword] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Format date-time in Asia/Kolkata
  const formatKolkataDateTime = (isoString) => {
    if (!isoString) return 'Active';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return 'Active';
      return d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Active';
    }
  };

  // Load active shares and users
  const loadData = async () => {
    try {
      setLoading(true);
      const [shareList, usersList] = await Promise.all([
        api.getShares(currentUser?.email),
        api.getUsers()
      ]);
      setShares(shareList || []);
      setRegisteredUsers(usersList || []);
    } catch (e) {
      if (showToast) showToast('Failed to load shared brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

    const normEmail = receiverEmail.trim().toLowerCase();
    if (!normEmail) {
      if (showToast) showToast('Please enter the partner/seller Mail ID', 'error');
      return;
    }

    if (!normEmail.includes('@') || !normEmail.includes('.')) {
      if (showToast) showToast('Please enter a valid Mail ID (e.g. partner@gmail.com)', 'error');
      return;
    }

    if (currentUser?.email && normEmail === currentUser.email.toLowerCase()) {
      if (showToast) showToast('Self-sharing is not allowed. Enter a partner email.', 'error');
      return;
    }

    if (selectedBrandIds.length === 0) {
      if (showToast) showToast('Please select at least 01 Brand to share', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        senderEmail: currentUser?.email || 'Fixyourmobiles10@gmail.com',
        senderName: senderName.trim() || 'Bharath',
        receiverEmail: normEmail,
        brandIds: selectedBrandIds
      };

      await api.createShare(payload);
      if (showToast) showToast(`Shared ${selectedBrandIds.length} Brand(s) with ${normEmail}!`, 'success');

      // Reset form
      setReceiverEmail('');
      setSelectedBrandIds([]);
      loadData();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to create brand share', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle brand enable/disable status within a share
  const handleToggleBrandStatus = async (share, brandId) => {
    const currentDetails = share.brandDetails || {};
    const currentBrandStatus = currentDetails[brandId]?.status || 'active';
    const newStatus = currentBrandStatus === 'active' ? 'disabled' : 'active';

    const updatedDetails = {
      ...currentDetails,
      [brandId]: {
        ...(currentDetails[brandId] || { sharedAt: share.createdAt || new Date().toISOString() }),
        status: newStatus
      }
    };

    try {
      await api.updateShare(share.id, { brandDetails: updatedDetails });
      if (showToast) showToast(`Brand access set to ${newStatus}`, 'info');
      loadData();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      if (showToast) showToast('Failed to update brand status', 'error');
    }
  };

  // Revoke single brand from share
  const handleRevokeBrand = async (share, brandId, brandName) => {
    if (!window.confirm(`Revoke access to ${brandName} for ${share.receiverEmail}?`)) return;
    try {
      await api.revokeShareBrand(share.id, brandId);
      if (showToast) showToast(`Revoked ${brandName} access`, 'info');
      loadData();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      if (showToast) showToast('Failed to revoke brand', 'error');
    }
  };

  // Revoke entire share for partner
  const handleDeleteShare = async (shareId, email) => {
    if (!window.confirm(`Revoke all brand sharing with ${email}? All their access will be removed.`)) {
      return;
    }
    try {
      await api.deleteShare(shareId);
      if (showToast) showToast('Brand share revoked successfully', 'info');
      loadData();
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      if (showToast) showToast('Failed to revoke share', 'error');
    }
  };

  // Open password reset for partner
  const handleOpenPasswordReset = (partnerUser, email) => {
    const u = partnerUser || { email, fullName: email.split('@')[0] };
    setResettingUser(u);
    setTempPassword(`Temp@${Math.floor(100000 + Math.random() * 900000)}`);
    setResetSuccessPassword('');
  };

  // Execute password reset
  const handleExecutePasswordReset = async () => {
    if (!tempPassword || tempPassword.length < 6) {
      if (showToast) showToast('Password must be at least 6 characters', 'error');
      return;
    }
    setResetSubmitting(true);
    try {
      const userId = resettingUser?.id;
      if (userId) {
        await api.adminResetPassword(userId, tempPassword);
      } else {
        // Find user by email or update local
        const matched = registeredUsers.find(u => u.email?.toLowerCase() === resettingUser?.email?.toLowerCase());
        if (matched) {
          await api.adminResetPassword(matched.id, tempPassword);
        } else {
          throw new Error('User profile not registered yet in system.');
        }
      }
      setResetSuccessPassword(tempPassword);
      if (showToast) showToast('Password reset successfully!', 'success');
    } catch (err) {
      if (showToast) showToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setResetSubmitting(false);
    }
  };

  // Group shares by receiverEmail (distinct partner)
  const partnerMap = new Map();
  shares.forEach(share => {
    const rEmail = (share.receiverEmail || '').trim().toLowerCase();
    if (!rEmail) return;
    if (!partnerMap.has(rEmail)) {
      partnerMap.set(rEmail, []);
    }
    partnerMap.get(rEmail).push(share);
  });

  const distinctPartners = Array.from(partnerMap.entries());

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
          onClick={loadData}
          className="header-btn"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          title="Refresh Shares"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. TOP "CREATE SHARE" BUTTON                                         */}
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
      {/* 2. CREATION FORM                                                     */}
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

          {/* FIELD 1: MAIL ID EMPTY BOX */}
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

          {/* SENDER NAME (The other seller will see: Brand + My name) */}
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
              💡 In their website, the shared brand will show as: <strong>Brand ({senderName || 'Your Name'})</strong>, e.g. <em>SonyLiv ({senderName || 'Bharath'})</em>
            </div>
          </div>

          {/* FIELD 2: SELECT BRAND OPTION */}
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

          {/* FIELD 3: SHOW SELECTED BRANDS SUMMARY */}
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
      {/* 3. ACTIVE SHARED COLLABORATIONS (Grouped by Partner)                 */}
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
            borderRadius: '6px',
            fontWeight: 800
          }}>
            {distinctPartners.length} Active Partner{distinctPartners.length === 1 ? '' : 's'}
          </span>
        </div>

        {distinctPartners.length === 0 ? (
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
              No Active Brand Collaborations Yet
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px', lineHeight: '1.4' }}>
              Click <strong>"+ Create Share"</strong> above to share your inventory and screens with another seller.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {distinctPartners.map(([partnerEmail, partnerShares]) => {
              const partnerUser = registeredUsers.find(u => (u.email || '').toLowerCase() === partnerEmail);
              const partnerName = partnerUser?.fullName || partnerUser?.name || partnerEmail.split('@')[0];
              const mobileNum = partnerUser?.mobileNumber || 'Not provided';

              // Combine all unique shared brands for this partner
              const brandMap = new Map();
              partnerShares.forEach(sh => {
                const bDetails = sh.brandDetails || {};
                (sh.brandIds || []).forEach(bId => {
                  const item = bDetails[bId] || {};
                  const sharedAt = item.sharedAt || sh.createdAt;
                  const status = item.status || 'active';
                  // Keep earlier shared timestamp if already recorded
                  if (!brandMap.has(bId)) {
                    brandMap.set(bId, { bId, sharedAt, status, shareId: sh.id, share: sh });
                  }
                });
              });

              const partnerBrandEntries = Array.from(brandMap.values());
              const hasActiveBrand = partnerBrandEntries.some(b => b.status === 'active');

              return (
                <div
                  key={partnerEmail}
                  style={{
                    background: '#ffffff',
                    borderRadius: '14px',
                    border: '1.5px solid #cbd5e1',
                    padding: '14px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.04)'
                  }}
                >
                  {/* Partner Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a' }}>
                          {partnerName}
                        </span>
                        <span style={{
                          background: hasActiveBrand ? '#dcfce7' : '#f1f5f9',
                          color: hasActiveBrand ? '#15803d' : '#64748b',
                          fontSize: '10.5px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px'
                        }}>
                          {hasActiveBrand ? 'Active Partner' : 'Access Paused'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>✉️ {partnerEmail}</span>
                        <span>📱 {mobileNum}</span>
                      </div>
                    </div>

                    {/* Quick Add More Brands to this partner */}
                    <button
                      type="button"
                      onClick={() => {
                        setReceiverEmail(partnerEmail);
                        setIsFormOpen(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        color: '#2563eb',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Add more brands to this partner"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>Add Brand</span>
                    </button>
                  </div>

                  {/* Password Management Row (Requirement 10) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    marginBottom: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569' }}>
                      <Lock size={13} color="#64748b" />
                      <span>Password: <strong>••••••••</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPasswordReset(partnerUser, partnerEmail)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <KeyRound size={12} color="#2563eb" />
                      <span>Reset Password</span>
                    </button>
                  </div>

                  {/* Shared Brands List */}
                  <div>
                    <div style={{ fontSize: '11.5px', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                      Shared Brands ({partnerBrandEntries.length}):
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {partnerBrandEntries.map(entry => {
                        const brandObj = sourceBrands.find(b => b.id === entry.bId);
                        const bName = brandObj?.displayName || entry.bId;
                        const bColor = brandObj?.color || '#2563eb';
                        const isBrandActive = entry.status === 'active';

                        return (
                          <div
                            key={entry.bId}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              background: '#fdfdfd',
                              border: isBrandActive ? '1px solid #e2e8f0' : '1px dashed #cbd5e1',
                              borderRadius: '8px',
                              padding: '6px 10px'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: bColor }} />
                              <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
                                  {bName}
                                </div>
                                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                                  Shared: {formatKolkataDateTime(entry.sharedAt)}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {/* Active / Disabled badge */}
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: isBrandActive ? '#dcfce7' : '#fee2e2',
                                color: isBrandActive ? '#15803d' : '#dc2626'
                              }}>
                                {isBrandActive ? 'Active' : 'Disabled'}
                              </span>

                              {/* Enable / Disable toggle */}
                              <button
                                type="button"
                                onClick={() => handleToggleBrandStatus(entry.share, entry.bId)}
                                style={{
                                  background: isBrandActive ? '#fef3c7' : '#dcfce7',
                                  border: `1px solid ${isBrandActive ? '#fde68a' : '#bbf7d0'}`,
                                  color: isBrandActive ? '#b45309' : '#15803d',
                                  borderRadius: '6px',
                                  padding: '3px 7px',
                                  fontSize: '10.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                {isBrandActive ? 'Disable' : 'Enable'}
                              </button>

                              {/* Revoke single brand */}
                              <button
                                type="button"
                                onClick={() => handleRevokeBrand(entry.share, entry.bId, bName)}
                                style={{
                                  background: '#fee2e2',
                                  border: '1px solid #fca5a5',
                                  color: '#dc2626',
                                  borderRadius: '6px',
                                  padding: '3px 6px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title={`Revoke ${bName}`}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Partner-level Revoke All button */}
                  <div style={{ marginTop: '10px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        partnerShares.forEach(sh => handleDeleteShare(sh.id, partnerEmail));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#dc2626',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Revoke all access for {partnerEmail}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resettingUser && (
        <div className="modal-overlay" onClick={() => setResettingUser(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '360px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={18} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Reset Partner Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
              Set a temporary password for <strong>{resettingUser.email}</strong>. Existing passwords are encrypted and cannot be retrieved.
            </p>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                New Temporary Password:
              </label>
              <input
                type="text"
                className="credential-input"
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
                style={{ fontSize: '13px', fontWeight: 700 }}
              />
            </div>

            {resetSuccessPassword && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '10px',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 800 }}>
                    Password Updated:
                  </div>
                  <div style={{ fontSize: '13px', color: '#15803d', fontWeight: 900 }}>
                    {resetSuccessPassword}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(resetSuccessPassword);
                    setCopiedPass(true);
                    setTimeout(() => setCopiedPass(false), 2000);
                  }}
                  style={{
                    background: '#16a34a',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {copiedPass ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedPass ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-outline"
                style={{ flex: 1, padding: '9px', fontSize: '12.5px' }}
                onClick={() => setResettingUser(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="glossy-btn glossy-btn-blue"
                style={{ flex: 1, padding: '9px', fontSize: '12.5px', justifyContent: 'center' }}
                onClick={handleExecutePasswordReset}
                disabled={resetSubmitting}
              >
                {resetSubmitting ? 'Saving...' : 'Set Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. HOW IT WORKS SUMMARY CARD                                         */}
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
            <strong>Scoped Brand Sharing:</strong> Partner only sees brands explicitly authorized. Other brands remain completely hidden.
          </li>
          <li>
            <strong>Shared Empty Screens:</strong> When partner sells on that brand, they select your account's empty screen.
          </li>
          <li>
            <strong>Double-Selling Prevention:</strong> Screens are checked atomically at submission so two sellers cannot sell the same screen.
          </li>
          <li>
            <strong>Private Recent Sales:</strong> Your Recent Sales shows only screens you sold. Partner's Recent Sales shows only screens they sold.
          </li>
        </ul>
      </div>
    </div>
  );
}
