import React, { useState, useEffect } from 'react';
import {
  Plus, X, Trash2, Edit2, Upload, Calendar, Tv, ArrowLeft, Check, Sparkles, Sliders
} from 'lucide-react';
import { api } from '../api/client';

export default function BrandsManagementScreen({ onBack, onBrandCreated, showToast }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBrandId, setEditingBrandId] = useState(null);

  // New / Edit Brand Form State
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [screensCount, setScreensCount] = useState(5);

  // Active pricing plan tab in modal: 'general' | 'withAds' | 'adFree'
  const [activePlanTab, setActivePlanTab] = useState('general');

  // Multi-plan configurations state
  const defaultPricingPlans = {
    general: {
      enabled: true,
      label: 'General',
      validities: [
        { plan: '01 Month', price: 199 },
        { plan: '03 Months', price: 499 },
        { plan: '06 Months', price: 899 },
        { plan: '12 Months', price: 1499 }
      ]
    },
    withAds: {
      enabled: false,
      label: 'With Ads',
      validities: [
        { plan: '01 Month', price: 99 },
        { plan: '03 Months', price: 249 },
        { plan: '06 Months', price: 449 },
        { plan: '12 Months', price: 799 }
      ]
    },
    adFree: {
      enabled: false,
      label: 'Ad-Free',
      validities: [
        { plan: '01 Month', price: 199 },
        { plan: '03 Months', price: 499 },
        { plan: '06 Months', price: 899 },
        { plan: '12 Months', price: 1499 }
      ]
    }
  };

  const [pricingPlans, setPricingPlans] = useState(defaultPricingPlans);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const list = await api.getBrands();
      setBrands(list || []);
    } catch (e) {
      showToast('Failed to load brands', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleOpenAdd = () => {
    setEditingBrandId(null);
    setName('');
    setLogoPreview('');
    setBrandColor('#3b82f6');
    setScreensCount(5);
    setActivePlanTab('general');
    setPricingPlans(defaultPricingPlans);
    setShowAddModal(true);
  };

  const handleOpenEdit = (brand) => {
    setEditingBrandId(brand.id);
    setName(brand.displayName || brand.name || '');
    setLogoPreview(brand.logo || '');
    setBrandColor(brand.color || '#3b82f6');
    setScreensCount(brand.screensCount || 5);
    setActivePlanTab('general');

    // Parse existing plans or fallback to General
    const existingP = brand.pricingPlans;
    if (existingP && (existingP.general || existingP.withAds || existingP.adFree)) {
      setPricingPlans({
        general: {
          enabled: true,
          label: 'General',
          validities: Object.entries(existingP.general?.prices || brand.prices || {}).map(([p, pr]) => ({ plan: p, price: pr }))
        },
        withAds: {
          enabled: Boolean(existingP.withAds?.enabled),
          label: 'With Ads',
          validities: Object.entries(existingP.withAds?.prices || {}).map(([p, pr]) => ({ plan: p, price: pr }))
        },
        adFree: {
          enabled: Boolean(existingP.adFree?.enabled),
          label: 'Ad-Free',
          validities: Object.entries(existingP.adFree?.prices || {}).map(([p, pr]) => ({ plan: p, price: pr }))
        }
      });
    } else {
      // Convert legacy prices to General
      const legacyVals = Object.entries(brand.prices || { '01 Month': 199 }).map(([p, pr]) => ({ plan: p, price: pr }));
      setPricingPlans({
        ...defaultPricingPlans,
        general: {
          enabled: true,
          label: 'General',
          validities: legacyVals.length > 0 ? legacyVals : defaultPricingPlans.general.validities
        }
      });
    }

    setShowAddModal(true);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddValidityRow = () => {
    setPricingPlans(prev => {
      const currentPlan = prev[activePlanTab];
      return {
        ...prev,
        [activePlanTab]: {
          ...currentPlan,
          validities: [...(currentPlan.validities || []), { plan: '01 Month', price: 199 }]
        }
      };
    });
  };

  const handleRemoveValidityRow = (idx) => {
    setPricingPlans(prev => {
      const currentPlan = prev[activePlanTab];
      return {
        ...prev,
        [activePlanTab]: {
          ...currentPlan,
          validities: currentPlan.validities.filter((_, i) => i !== idx)
        }
      };
    });
  };

  const handleValidityChange = (idx, field, val) => {
    setPricingPlans(prev => {
      const currentPlan = prev[activePlanTab];
      const copy = [...currentPlan.validities];
      copy[idx] = { ...copy[idx], [field]: val };
      return {
        ...prev,
        [activePlanTab]: {
          ...currentPlan,
          validities: copy
        }
      };
    });
  };

  const handleTogglePlanEnabled = (planKey) => {
    if (planKey === 'general') return; // General always enabled
    setPricingPlans(prev => ({
      ...prev,
      [planKey]: {
        ...prev[planKey],
        enabled: !prev[planKey].enabled
      }
    }));
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter Brand Name', 'error');
      return;
    }

    try {
      // Build persistent pricingPlans structure
      const formattedPricingPlans = {
        general: {
          enabled: true,
          label: 'General',
          prices: {}
        },
        withAds: {
          enabled: Boolean(pricingPlans.withAds?.enabled),
          label: 'With Ads',
          prices: {}
        },
        adFree: {
          enabled: Boolean(pricingPlans.adFree?.enabled),
          label: 'Ad-Free',
          prices: {}
        }
      };

      pricingPlans.general.validities.forEach(v => {
        if (v.plan) formattedPricingPlans.general.prices[v.plan] = Number(v.price) || 0;
      });
      pricingPlans.withAds.validities.forEach(v => {
        if (v.plan) formattedPricingPlans.withAds.prices[v.plan] = Number(v.price) || 0;
      });
      pricingPlans.adFree.validities.forEach(v => {
        if (v.plan) formattedPricingPlans.adFree.prices[v.plan] = Number(v.price) || 0;
      });

      // Backward compatible mirror: prices & plans reflect General
      const legacyPrices = formattedPricingPlans.general.prices;
      const legacyPlans = Object.keys(legacyPrices);

      const brandPayload = {
        name: name.trim(),
        displayName: name.trim(),
        logo: logoPreview || '',
        color: brandColor,
        bgDark: '#0f172a',
        badgeColor: brandColor,
        screensCount: Number(screensCount) || 5,
        plans: legacyPlans.length > 0 ? legacyPlans : ['01 Month'],
        prices: Object.keys(legacyPrices).length > 0 ? legacyPrices : { '01 Month': 199 },
        pricingPlans: formattedPricingPlans
      };

      if (editingBrandId) {
        await api.updateBrand(editingBrandId, brandPayload);
        showToast(`Brand "${name}" updated successfully!`, 'success');
      } else {
        const created = await api.createBrand(brandPayload);
        showToast(`Brand "${name}" created successfully!`, 'success');
        if (onBrandCreated) onBrandCreated(created);
      }

      setShowAddModal(false);
      setEditingBrandId(null);
      loadBrands();
    } catch (err) {
      showToast(err.message || 'Failed to save brand', 'error');
    }
  };

  const handleDeleteBrand = async (id, brandName) => {
    if (!window.confirm(`Are you sure you want to delete "${brandName}"?`)) return;
    try {
      await api.deleteBrand(id);
      showToast(`Deleted ${brandName}`, 'success');
      loadBrands();
    } catch (err) {
      showToast('Failed to delete brand', 'error');
    }
  };

  const currentPlanConfig = pricingPlans[activePlanTab] || pricingPlans.general;

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Clean Top Header (as requested in image copy 38.png: Put "Add Brand" on Top Right Side) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        background: '#ffffff',
        padding: '10px 14px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: '#f8fafc',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0f172a'
              }}
              title="Go Back"
              id="brands-header-back-btn"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Brands
            </h2>
            <p style={{ fontSize: '11.5px', color: '#64748b', margin: 0, fontWeight: 600 }}>
              OTT Platforms & Plans
            </p>
          </div>
        </div>

        {/* Top-Right "Add Brand" Button */}
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          onClick={handleOpenAdd}
          style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
          id="btn-add-brand-top-right"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Brand</span>
        </button>
      </div>

      {/* Brands List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading brands...
        </div>
      ) : brands.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            No Brands Listed Yet
          </p>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            Click the "Add Brand" button on the top right to create your first OTT platform.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            onClick={handleOpenAdd}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} /> Add First Brand
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {brands.map(brand => {
            const hasWithAds = brand.pricingPlans?.withAds?.enabled;
            const hasAdFree = brand.pricingPlans?.adFree?.enabled;

            return (
              <div
                key={brand.id}
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '14px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: brand.bgDark || '#0f172a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}>
                      {brand.logo ? (
                        <img
                          src={brand.logo}
                          alt={brand.displayName}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '18px' }}>
                          {(brand.displayName || brand.name)[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                          {brand.displayName || brand.name}
                        </h3>
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: brand.color || '#3b82f6',
                          display: 'inline-block'
                        }} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                          {brand.screensCount || 5} Screens
                        </span>
                        {/* Plan variant badges */}
                        <span style={{ fontSize: '10px', background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                          General
                        </span>
                        {hasWithAds && (
                          <span style={{ fontSize: '10px', background: '#fef3c7', color: '#b45309', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            With Ads
                          </span>
                        )}
                        {hasAdFree && (
                          <span style={{ fontSize: '10px', background: '#f3e8ff', color: '#7e22ce', padding: '1px 6px', borderRadius: '6px', fontWeight: 700 }}>
                            Ad-Free
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(brand)}
                      style={{
                        background: '#f1f5f9',
                        border: 'none',
                        color: '#2563eb',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px'
                      }}
                      title="Edit brand"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteBrand(brand.id, brand.displayName || brand.name)}
                      style={{
                        background: '#fef2f2',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '8px'
                      }}
                      title="Delete brand"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Validities & Prices Preview */}
                <div style={{
                  background: '#f8fafc',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {Object.entries(brand.prices || {}).map(([plan, price]) => (
                    <span
                      key={plan}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        padding: '4px 8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#0f172a'
                      }}
                    >
                      {plan}: <strong style={{ color: '#16a34a' }}>₹{price}</strong>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ======================================================== */}
      {/* ADD / EDIT BRAND MODAL POPUP                            */}
      {/* Opens at TOP of screen (Not at bottom per image copy 38) */}
      {/* Reduced spacing, Centered heading, 03-in-1 row (39.png)  */}
      {/* ======================================================== */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start', // OPENS AT TOP OF PAGE AS REQUESTED
            padding: '16px 12px',
            overflowY: 'auto'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              border: '1.5px solid #e2e8f0',
              overflow: 'hidden',
              animation: 'slideDown 0.25s ease-out'
            }}
          >
            {/* Modal Header: Centered Heading per image copy 39 */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div style={{ width: '28px' }} />
              <h3 style={{
                margin: 0,
                fontSize: '17px',
                fontWeight: 900,
                color: '#0f172a',
                textAlign: 'center',
                flex: 1
              }}>
                {editingBrandId ? 'Edit Brand' : 'Add New Brand'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Brand Name */}
              <div>
                <label className="form-label" style={{ fontSize: '12px', marginBottom: '4px' }}>Brand Name</label>
                <input
                  type="text"
                  className="form-input-pill"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Netflix, Amazon Prime, Aha..."
                  style={{ height: '40px', fontSize: '13.5px' }}
                  required
                />
              </div>

              {/* 03-in-01 Row: Upload Logo, Screen Count, Logo Color (image copy 39) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', alignItems: 'flex-end' }}>
                {/* 1. Upload Logo (URL box removed per request) */}
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Logo</label>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1.5px dashed #cbd5e1',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    padding: '2px',
                    overflow: 'hidden'
                  }}>
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        style={{ maxHeight: '28px', maxWidth: '100%', objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800, color: '#2563eb' }}>
                        <Upload size={13} />
                        <span>Upload</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>
                </div>

                {/* 2. Screen Count */}
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Screens</label>
                  <select
                    className="form-input-pill"
                    style={{ height: '40px', fontSize: '12px', padding: '0 8px', fontWeight: 800 }}
                    value={screensCount}
                    onChange={e => setScreensCount(e.target.value)}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Screens</option>
                    ))}
                  </select>
                </div>

                {/* 3. Logo Color */}
                <div>
                  <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Color</label>
                  <div style={{
                    position: 'relative',
                    height: '40px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    overflow: 'hidden',
                    background: brandColor
                  }}>
                    <input
                      type="color"
                      value={brandColor}
                      onChange={e => setBrandColor(e.target.value)}
                      style={{
                        position: 'absolute',
                        top: '-10px',
                        left: '-10px',
                        width: '200%',
                        height: '200%',
                        cursor: 'pointer',
                        opacity: 0
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 900,
                      textShadow: '0 1px 2px rgba(0,0,0,0.6)'
                    }}>
                      {brandColor.toUpperCase()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PLAN SELECTOR TABS (General / With Ads / Ad-Free)       */}
              {/* Requirement: Add Variants option per image copy 39 & 41  */}
              {/* ======================================================== */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ fontSize: '12px', margin: 0 }}>
                    Plan Variants & Pricing
                  </label>
                  <span style={{ fontSize: '10.5px', color: '#64748b', fontWeight: 600 }}>
                    Configure per-plan prices
                  </span>
                </div>

                {/* Plan Selector Segmented Tabs */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  background: '#f1f5f9',
                  padding: '3px',
                  borderRadius: '10px',
                  gap: '4px'
                }}>
                  {[
                    { key: 'general', label: 'General' },
                    { key: 'withAds', label: 'With Ads' },
                    { key: 'adFree', label: 'Ad-Free' }
                  ].map(tab => {
                    const isActive = activePlanTab === tab.key;
                    const isEnabled = pricingPlans[tab.key]?.enabled;

                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActivePlanTab(tab.key)}
                        style={{
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#0f172a' : '#64748b',
                          border: 'none',
                          padding: '6px 4px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: isActive ? 900 : 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isEnabled && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />}
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Plan Specific Settings & Toggle for With Ads / Ad-Free */}
              <div style={{
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 900, color: '#0f172a' }}>
                      {currentPlanConfig.label}
                    </span>
                    {activePlanTab !== 'general' && (
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: currentPlanConfig.enabled ? '#16a34a' : '#64748b',
                        cursor: 'pointer',
                        background: '#ffffff',
                        padding: '2px 6px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1'
                      }}>
                        <input
                          type="checkbox"
                          checked={currentPlanConfig.enabled}
                          onChange={() => handleTogglePlanEnabled(activePlanTab)}
                        />
                        <span>{currentPlanConfig.enabled ? 'Enabled' : 'Disabled'}</span>
                      </label>
                    )}
                  </div>

                  {/* Add Validity Button for Current Plan */}
                  {(activePlanTab === 'general' || currentPlanConfig.enabled) && (
                    <button
                      type="button"
                      onClick={handleAddValidityRow}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <Plus size={13} /> Add Validity
                    </button>
                  )}
                </div>

                {/* Validity Rows Table */}
                {(activePlanTab === 'general' || currentPlanConfig.enabled) ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {currentPlanConfig.validities.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input-pill"
                          value={item.plan}
                          onChange={e => handleValidityChange(idx, 'plan', e.target.value)}
                          placeholder="e.g. 01 Month"
                          style={{ flex: 1.3, fontSize: '12px', fontWeight: 700, height: '34px', padding: '0 8px' }}
                        />
                        <div style={{ position: 'relative', flex: 1 }}>
                          <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#16a34a', fontSize: '11px' }}>₹</span>
                          <input
                            type="number"
                            className="form-input-pill"
                            value={item.price}
                            onChange={e => handleValidityChange(idx, 'price', e.target.value)}
                            placeholder="Price"
                            style={{ paddingLeft: '20px', fontSize: '12px', fontWeight: 800, height: '34px' }}
                          />
                        </div>
                        {currentPlanConfig.validities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveValidityRow(idx)}
                            style={{
                              background: '#fee2e2',
                              border: 'none',
                              color: '#dc2626',
                              cursor: 'pointer',
                              padding: '4px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '12px 0', color: '#64748b', fontSize: '12px' }}>
                    {currentPlanConfig.label} variant is currently disabled. Check the box above to enable and set custom pricing.
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-btn glossy-btn-blue"
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px' }}
                >
                  Save Brand
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
