import React, { useState, useEffect, useRef } from 'react';
import {
  X, Star, Eye, EyeOff, ShieldCheck, Clock, Calendar, Tv, Smartphone,
  Laptop, Edit2, AlertCircle, ChevronDown, CheckCheck, Lock
} from 'lucide-react';
import CopyButton from './CopyButton';
import { formatISTDateTime, formatTimelineDateBadge } from '../utils/dateUtils';

export default function AccountStarDetailsModal({
  isOpen,
  item,
  brand,
  currentUser,
  onClose,
  onOpenSellerDetails,
  onToggleDefaultExpanded
}) {
  if (!isOpen || !item) return null;

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'screens' | 'entries' | 'seller'
  const [showOverviewPassword, setShowOverviewPassword] = useState(false);
  const [revealedPasswords, setRevealedPasswords] = useState({}); // { [entryId]: boolean }
  const [revealAllSecrets, setRevealAllSecrets] = useState(false);
  const [hasScrolledUp, setHasScrolledUp] = useState(false);
  const [newEntriesArrived, setNewEntriesArrived] = useState(false);

  const scrollContainerRef = useRef(null);
  const prevEntriesCountRef = useRef(0);

  const screens = item.screens || [];
  const seller = item.sellerDetails;

  // Authorization Check: Admins or Account Owners can access Entries and credentials
  const normalizedUser = (currentUser?.email || '').trim().toLowerCase();
  const isAdmin = currentUser?.role === 'admin' || normalizedUser === 'fixyourmobiles10@gmail.com' || (!currentUser?.email && !currentUser?.role);
  const itemOwner = (item.ownerEmail || '').trim().toLowerCase();
  const isOwner = isAdmin || !item.isShared || (itemOwner && itemOwner === normalizedUser);

  // Normalize entries: oldest at top, newest at bottom (WhatsApp-style)
  const rawEntries = Array.isArray(item.entries)
    ? item.entries
    : (Array.isArray(item.credentialHistory) ? item.credentialHistory : []);

  // Ensure deterministic chronological ordering (oldest first)
  const entries = React.useMemo(() => {
    if (!rawEntries || rawEntries.length === 0) return [];

    // Check if rawEntries is in reverse-chronological order (legacy unshifted: newest at index 0)
    let sorted = [...rawEntries];
    if (sorted.length > 1) {
      const firstTime = new Date(sorted[0].timestamp || 0).getTime();
      const lastTime = new Date(sorted[sorted.length - 1].timestamp || 0).getTime();
      if (firstTime > lastTime) {
        sorted.reverse();
      }
    }

    return sorted.map((entry, idx) => {
      const entryNum = entry.entryNumber || `Entry ${String(idx + 1).padStart(2, '0')}`;
      const isPw = entry.isPassword || entry.fieldName === 'password' || String(entry.field || '').toLowerCase().includes('password');

      let rawOld = entry.oldValue !== undefined ? entry.oldValue : (entry.previous !== undefined ? entry.previous : '');
      let rawNew = entry.newValue !== undefined ? entry.newValue : (entry.current !== undefined ? entry.current : '');

      // Check if historical value was saved only as dots or masked placeholders
      const isOldMasked = typeof rawOld === 'string' && (rawOld.includes('•••') || rawOld.includes('***') || rawOld === '••••••');
      const isNewMasked = typeof rawNew === 'string' && (rawNew.includes('•••') || rawNew.includes('***') || rawNew === '••••••');

      const formattedOld = isOldMasked ? 'Historical value unavailable' : (rawOld !== '' && rawOld !== null && rawOld !== undefined ? String(rawOld) : 'Empty');
      const formattedNew = isNewMasked ? 'Historical value unavailable' : (rawNew !== '' && rawNew !== null && rawNew !== undefined ? String(rawNew) : 'Empty');

      return {
        ...entry,
        id: entry.id || `ent_${idx}`,
        entryNumber: entryNum,
        field: entry.field || 'Account field changed',
        oldValue: formattedOld,
        newValue: formattedNew,
        isPassword: isPw,
        timestamp: entry.timestamp || new Date().toISOString(),
        formattedTime: entry.formattedTime || formatISTDateTime(entry.timestamp),
        changedBy: entry.changedBy || 'Authorized Admin',
        status: entry.status || 'Confirmed'
      };
    });
  }, [rawEntries]);

  // WhatsApp-style Auto-scroll to latest entry (bottom) when Entries tab is opened
  useEffect(() => {
    if (activeTab === 'entries') {
      const el = scrollContainerRef.current;
      if (el) {
        setTimeout(() => {
          el.scrollTop = el.scrollHeight;
          setHasScrolledUp(false);
          setNewEntriesArrived(false);
        }, 30);
      }
    }
  }, [activeTab]);

  // Handle new entries arriving dynamically
  useEffect(() => {
    if (entries.length > prevEntriesCountRef.current) {
      if (prevEntriesCountRef.current > 0 && hasScrolledUp) {
        setNewEntriesArrived(true);
      } else if (scrollContainerRef.current && !hasScrolledUp) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }
    prevEntriesCountRef.current = entries.length;
  }, [entries.length, hasScrolledUp]);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom > 70) {
      setHasScrolledUp(true);
    } else {
      setHasScrolledUp(false);
      setNewEntriesArrived(false);
    }
  };

  const scrollToBottom = () => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      setHasScrolledUp(false);
      setNewEntriesArrived(false);
    }
  };

  const togglePasswordVisibility = (entryId) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [entryId]: !prev[entryId]
    }));
  };

  // Group entries by date
  const groupedEntries = React.useMemo(() => {
    const groups = [];
    let currentGroup = null;

    entries.forEach(ent => {
      const dateLabel = formatTimelineDateBadge(ent.timestamp);
      if (!currentGroup || currentGroup.dateLabel !== dateLabel) {
        currentGroup = { dateLabel, items: [ent] };
        groups.push(currentGroup);
      } else {
        currentGroup.items.push(ent);
      }
    });

    return groups;
  }, [entries]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(5px)',
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
          maxWidth: '490px',
          background: '#ffffff',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          animation: 'scaleIn 0.18s ease-out',
          position: 'relative'
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
              width: '38px',
              height: '38px',
              borderRadius: '11px',
              background: '#fef08a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(234, 179, 8, 0.45)'
            }}>
              <Star size={20} color="#ca8a04" fill="#ca8a04" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '2px 7px',
                  borderRadius: '5px'
                }}>
                  #{item.recordNumber || '01'}
                </span>
                <h3 style={{ margin: 0, fontSize: '15.5px', fontWeight: 900, color: '#ffffff' }}>
                  {brand?.displayName || brand?.name || 'Account'} Details
                </h3>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
                {item.email || 'No Email Set'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '9px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label="Close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          padding: '5px 8px',
          gap: '4px'
        }}>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'screens', label: `Screens (${screens.length})` },
            { id: 'entries', label: `Entries (${entries.length})` },
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
                  padding: '8px 5px',
                  fontSize: '11px',
                  fontWeight: 800,
                  borderRadius: '9px',
                  border: 'none',
                  background: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#64748b',
                  boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div
          ref={activeTab === 'entries' ? scrollContainerRef : null}
          onScroll={activeTab === 'entries' ? handleScroll : null}
          style={{
            padding: '16px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-all', fontFamily: showOverviewPassword ? 'inherit' : 'monospace' }}>
                    {showOverviewPassword ? (item.password || '-') : (item.password ? '••••••••••••' : '-')}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setShowOverviewPassword(v => !v)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      title={showOverviewPassword ? 'Hide Password' : 'Show Password'}
                    >
                      {showOverviewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <CopyButton text={item.password} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>VALIDITY</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.validity || '12 Months'}</strong>
                </div>
                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#64748b', display: 'block' }}>PLAN VARIANT</span>
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>{item.planVariant || 'General'}</strong>
                </div>
              </div>

              {onToggleDefaultExpanded && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#f8fafc',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0'
                }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                      Card Default Open
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                      Keep screens visible when page loads
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleDefaultExpanded(item)}
                    style={{
                      background: item.defaultExpanded ? '#10b981' : '#cbd5e1',
                      border: 'none',
                      borderRadius: '20px',
                      width: '42px',
                      height: '24px',
                      padding: '2px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: item.defaultExpanded ? 'flex-end' : 'flex-start',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCREENS */}
          {activeTab === 'screens' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {screens.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: '#64748b' }}>
                  No screens configured for this account.
                </div>
              ) : (
                screens.map((sc, sIdx) => (
                  <div
                    key={sc.screenNumber || sIdx}
                    style={{
                      background: '#f8fafc',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '9px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                          Screen {sc.screenNumber}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          background: sc.status === 'occupied' ? '#fee2e2' : '#dcfce7',
                          color: sc.status === 'occupied' ? '#b91c1c' : '#15803d'
                        }}>
                          {sc.status === 'occupied' ? 'Occupied' : 'Empty'}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        PIN: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{sc.pin || '----'}</strong>
                        {sc.deviceName && ` • ${sc.deviceName}`}
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: '#64748b', textAlign: 'right' }}>
                      {sc.expiryDate ? `Exp: ${sc.expiryDate}` : 'No Expiry'}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: COMPLETE ENTRY-WISE CHANGE LOG */}
          {activeTab === 'entries' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '10px' }}>
              {/* Header Banner */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '10px',
                padding: '9px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShieldCheck size={16} strokeWidth={2.5} color="#2563eb" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: '#1e40af', lineHeight: 1.35 }}>
                    Audit trail of confirmed account and credential changes with revealable secrets for authorized owners.
                  </span>
                </div>
                {isOwner && entries.some(e => e.isPassword) && (
                  <button
                    type="button"
                    onClick={() => setRevealAllSecrets(v => !v)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '3px 7px',
                      fontSize: '10px',
                      fontWeight: 800,
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {revealAllSecrets ? <EyeOff size={12} /> : <Eye size={12} />}
                    {revealAllSecrets ? 'Mask Secrets' : 'Reveal All'}
                  </button>
                )}
              </div>

              {!isOwner ? (
                <div style={{
                  textAlign: 'center',
                  padding: '36px 16px',
                  background: '#fef2f2',
                  border: '1.5px dashed #fca5a5',
                  borderRadius: '12px'
                }}>
                  <Lock size={32} color="#dc2626" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 800, color: '#991b1b', margin: '0 0 4px', fontSize: '13.5px' }}>
                    Access Restricted
                  </p>
                  <p style={{ fontSize: '11.5px', color: '#7f1d1d', margin: 0, lineHeight: 1.4 }}>
                    Credential history and account entries are strictly private to authorized owners and administrators.
                  </p>
                </div>
              ) : entries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
                  <Clock size={36} strokeWidth={1.5} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 4px', fontSize: '14px' }}>
                    No Changes Recorded Yet
                  </p>
                  <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                    Any edits made to Mail ID, Password, Screen PINs, or Star Details are tracked here with exact Indian Standard Time and actor identity.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {groupedEntries.map((group, gIdx) => (
                    <div key={group.dateLabel || gIdx} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* WhatsApp-Style Date Header Badge */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '2px 0 4px'
                      }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: 800,
                          background: '#e2e8f0',
                          color: '#475569',
                          padding: '2px 10px',
                          borderRadius: '12px',
                          letterSpacing: '0.3px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                        }}>
                          {group.dateLabel}
                        </span>
                      </div>

                      {/* Entries List (WhatsApp chronological order: oldest at top, newest at bottom) */}
                      {group.items.map((h, hIdx) => {
                        const isRevealed = revealAllSecrets || Boolean(revealedPasswords[h.id]);

                        return (
                          <div
                            key={h.id || hIdx}
                            style={{
                              background: '#ffffff',
                              border: '1.5px solid #e2e8f0',
                              borderRadius: '12px',
                              padding: '10px 13px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {/* Top row: Entry XX — Field Name + Confirmed badge */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 900,
                                  background: '#0f172a',
                                  color: '#ffffff',
                                  padding: '1px 6px',
                                  borderRadius: '4px'
                                }}>
                                  {h.entryNumber}
                                </span>
                                <strong style={{ fontSize: '12.5px', color: '#0f172a', fontWeight: 800 }}>
                                  {h.field}
                                </strong>
                              </div>

                              <span style={{
                                fontSize: '9.5px',
                                fontWeight: 900,
                                background: '#dcfce7',
                                color: '#15803d',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <CheckCheck size={11} strokeWidth={2.5} />
                                {h.status}
                              </span>
                            </div>

                            {/* Middle row: Old value -> New value */}
                            <div style={{
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              padding: '6px 10px',
                              fontSize: '11.5px',
                              fontFamily: h.isPassword ? (isRevealed ? 'inherit' : 'monospace') : 'inherit',
                              wordBreak: 'break-all',
                              overflowWrap: 'anywhere',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px'
                            }}>
                              <div style={{ flex: 1 }}>
                                {h.isPassword ? (
                                  <span>
                                    {isRevealed ? (
                                      h.oldValue === 'Historical value unavailable' ? (
                                        <em style={{ color: '#94a3b8' }}>Historical value unavailable</em>
                                      ) : (
                                        <span style={{ color: '#64748b' }}>{h.oldValue}</span>
                                      )
                                    ) : (
                                      <span style={{ letterSpacing: '1px' }}>••••••••</span>
                                    )}
                                    {' → '}
                                    {isRevealed ? (
                                      <strong style={{ color: '#0f172a' }}>{h.newValue}</strong>
                                    ) : (
                                      <strong style={{ color: '#0f172a', letterSpacing: '1px' }}>••••••••</strong>
                                    )}
                                  </span>
                                ) : (
                                  <span>
                                    {h.oldValue === 'Empty' ? (
                                      <em style={{ color: '#94a3b8' }}>Empty</em>
                                    ) : (
                                      <span style={{ color: '#64748b' }}>{h.oldValue}</span>
                                    )}
                                    {' → '}
                                    {h.newValue === 'Empty' ? (
                                      <em style={{ color: '#94a3b8' }}>Empty</em>
                                    ) : (
                                      <strong style={{ color: '#0f172a' }}>{h.newValue}</strong>
                                    )}
                                  </span>
                                )}
                              </div>

                              {h.isPassword && (
                                <button
                                  type="button"
                                  onClick={() => togglePasswordVisibility(h.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: '#475569',
                                    padding: '2px 4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                  }}
                                  title={isRevealed ? 'Mask Password' : 'Reveal Password'}
                                  aria-label="Toggle Password Visibility"
                                >
                                  {isRevealed ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                              )}
                            </div>

                            {/* Bottom row: Changed By & Saved Date/Time in IST */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '10px',
                              color: '#64748b',
                              marginTop: '2px'
                            }}>
                              <span>
                                Changed by: <strong style={{ color: '#334155' }}>{h.changedBy}</strong>
                              </span>
                              <span style={{ textAlign: 'right', fontWeight: 600 }}>
                                {h.formattedTime}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating 'New entries ↓' chip for WhatsApp-style position tracking */}
          {activeTab === 'entries' && newEntriesArrived && (
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10
            }}>
              <button
                type="button"
                onClick={scrollToBottom}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>New entries</span>
                <ChevronDown size={14} />
              </button>
            </div>
          )}

          {/* TAB 4: SELLER & NOTES */}
          {activeTab === 'seller' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {seller && (seller.sellerName || seller.sellerNumber || seller.notes || seller.purchaseDate || seller.reference || seller.amount || seller.link) ? (
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

                  {seller.amount && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        PURCHASE AMOUNT
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                        ₹{seller.amount}
                      </span>
                    </div>
                  )}

                  {seller.link && (
                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', display: 'block' }}>
                        LINK / PORTAL
                      </span>
                      <span style={{ fontSize: '12px', color: '#2563eb', wordBreak: 'break-all' }}>
                        {seller.link}
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

              {onOpenSellerDetails && isOwner && (
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
