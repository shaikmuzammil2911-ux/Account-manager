import React, { useState, useEffect } from 'react';
import {
  Plus, X, Trash2, Edit2, Upload, Calendar, Tv, ArrowLeft, Check, Sparkles, Sliders
} from 'lucide-react';
import { api } from '../api/client';

export default function BrandsManagementScreen({
  onBack,
  onBrandCreated,
  showToast,
  isAddModalOpen,
  onOpenAdd,
  onCloseAdd,
  onBrandUpdated
}) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [localShowAddModal, setLocalShowAddModal] = useState(false);
  const showAddModal = isAddModalOpen !== undefined ? isAddModalOpen : localShowAddModal;
  const setAddModalState = (isOpen) => {
    setLocalShowAddModal(isOpen);
    if (isOpen && onOpenAdd) onOpenAdd();
    if (!isOpen && onCloseAdd) onCloseAdd();
  };

  const [editingBrandId, setEditingBrandId] = useState(null);

  // New / Edit Brand Form State
  const [name, setName] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [screensCount, setScreensCount] = useState(5);
  const [maxScreenOptions, setMaxScreenOptions] = useState(10);
  const [showScreenPin, setShowScreenPin] = useState(true);
  const [showDeviceName, setShowDeviceName] = useState(true);

  // Active pricing plan tab in modal (e.g. 'general', 'with_ads', etc.)
  const [activePlanTab, setActivePlanTab] = useState('general');
  const [showNewPlanInput, setShowNewPlanInput] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');

  // Default plans: ONLY General by default! (image copy 47.png: Do not pre install Ads free or With Ads)
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
    setShowScreenPin(true);
    setShowDeviceName(true);
    setActivePlanTab('general');
    setPricingPlans(defaultPricingPlans);
    setShowNewPlanInput(false);
    setNewPlanName('');
    setAddModalState(true);
  };

  // Open modal if parent requests it via props
  useEffect(() => {
    if (isAddModalOpen && !editingBrandId) {
      handleOpenAdd();
    }
  }, [isAddModalOpen]);

  const handleOpenEdit = (brand) => {
    setEditingBrandId(brand.id);
    setName(brand.displayName || brand.name || '');
    setLogoPreview(brand.logo || '');
    setBrandColor(brand.color || '#3b82f6');
    setScreensCount(brand.screensCount || 5);
    setShowScreenPin(brand.showScreenPin !== false);
    setShowDeviceName(brand.showDeviceName !== false);
    setActivePlanTab('general');
    setShowNewPlanInput(false);
    setNewPlanName('');

    // Parse existing plans or fallback to General only
    const existingP = brand.pricingPlans;
    if (existingP && typeof existingP === 'object' && Object.keys(existingP).length > 0) {
      const parsed = {};
      Object.entries(existingP).forEach(([k, config]) => {
        if (config && config.enabled !== false) {
          parsed[k] = {
            enabled: true,
            label: config.label || k,
            validities: Object.entries(config.prices || {}).map(([p, pr]) => ({ plan: p, price: pr }))
          };
        }
      });
      if (!parsed.general) {
        parsed.general = {
          enabled: true,
          label: 'General',
          validities: Object.entries(brand.prices || { '01 Month': 199 }).map(([p, pr]) => ({ plan: p, price: pr }))
        };
      }
      setPricingPlans(parsed);
    } else {
      const legacyVals = Object.entries(brand.prices || { '01 Month': 199 }).map(([p, pr]) => ({ plan: p, price: pr }));
      setPricingPlans({
        general: {
          enabled: true,
          label: 'General',
          validities: legacyVals.length > 0 ? legacyVals : defaultPricingPlans.general.validities
        }
      });
    }

    setAddModalState(true);
  };

  // Add a new custom plan variant (image copy 47.png)
  const handleAddNewPlan = () => {
    const trimmed = newPlanName.trim();
    if (!trimmed) {
      showToast('Please enter a plan name', 'error');
      return;
    }
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_') || `plan_${Date.now()}`;
    if (pricingPlans[key]) {
      showToast('A plan with this name already exists', 'error');
      return;
    }

    const baseValidities = pricingPlans.general?.validities || [
      { plan: '01 Month', price: 199 },
      { plan: '03 Months', price: 499 },
      { plan: '06 Months', price: 899 },
      { plan: '12 Months', price: 1499 }
    ];

    setPricingPlans(prev => ({
      ...prev,
      [key]: {
        enabled: true,
        label: trimmed,
        validities: baseValidities.map(v => ({ ...v }))
      }
    }));
    setActivePlanTab(key);
    setNewPlanName('');
    setShowNewPlanInput(false);
    showToast(`Plan "${trimmed}" added!`, 'success');
  };

  // Remove a custom plan variant
  const handleDeleteCustomPlan = (planKey, e) => {
    e?.stopPropagation();
    if (planKey === 'general') return;
    setPricingPlans(prev => {
      const copy = { ...prev };
      delete copy[planKey];
      return copy;
    });
    if (activePlanTab === planKey) {
      setActivePlanTab('general');
    }
    showToast('Plan removed', 'info');
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
      // Build persistent pricingPlans structure dynamically
      const formattedPricingPlans = {};
      Object.entries(pricingPlans).forEach(([k, config]) => {
        if (config && config.enabled !== false) {
          const pricesObj = {};
          (config.validities || []).forEach(v => {
            if (v.plan && v.plan.trim()) {
              pricesObj[v.plan.trim()] = Number(v.price) || 0;
            }
          });
          formattedPricingPlans[k] = {
            enabled: true,
            label: config.label || k,
            prices: pricesObj
          };
        }
      });

      // Backward compatible mirror: prices & plans reflect General
      const generalPrices = formattedPricingPlans.general?.prices || {};
      const generalPlans = Object.keys(generalPrices);

      const brandPayload = {
        name: name.trim(),
        displayName: name.trim(),
        logo: logoPreview || '',
        color: brandColor,
        bgDark: '#0f172a',
        badgeColor: brandColor,
        screensCount: Number(screensCount) || 5,
        showScreenPin: showScreenPin !== false,
        showDeviceName: showDeviceName !== false,
        plans: generalPlans.length > 0 ? generalPlans : ['01 Month'],
        prices: Object.keys(generalPrices).length > 0 ? generalPrices : { '01 Month': 199 },
        pricingPlans: formattedPricingPlans
      };

      if (editingBrandId) {
        const updated = await api.updateBrand(editingBrandId, brandPayload);
        showToast(`Brand "${name}" updated successfully!`, 'success');
        if (onBrandUpdated) onBrandUpdated(updated || { id: editingBrandId, ...brandPayload });
      } else {
        const created = await api.createBrand(brandPayload);
        showToast(`Brand "${name}" created successfully!`, 'success');
        if (onBrandCreated) onBrandCreated(created);
      }

      setAddModalState(false);
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

  const handleToggleBrandSetting = async (brandId, settingKey) => {
    try {
      const b = brands.find(item => item.id === brandId);
      if (!b) return;
      const currentVal = b[settingKey] !== false;
      const nextVal = !currentVal;

      // Optimistic state update
      setBrands(prev => prev.map(item => item.id === brandId ? { ...item, [settingKey]: nextVal } : item));

      const updated = await api.updateBrand(brandId, { [settingKey]: nextVal });
      const settingLabel = settingKey === 'showScreenPin' ? 'Screen PIN' : 'Device Name';
      showToast(`${b.displayName || b.name}: ${settingLabel} turned ${nextVal ? 'ON' : 'OFF'}`, 'success');
      if (onBrandUpdated) onBrandUpdated(updated || { ...b, [settingKey]: nextVal });
    } catch (err) {
      showToast('Failed to update brand setting', 'error');
      loadBrands();
    }
  };

  const currentPlanConfig = pricingPlans[activePlanTab] || pricingPlans.general;

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '12px' }}>
      {/* Brands List (Duplicate subheader removed per image copy 49.png; Add Brand is on TopHeader) */}

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
                            Ad Free
                          </span>
                        )}
                        {/* Screen Pin & Device Name Status Badges */}
                        <span style={{
                          fontSize: '10px',
                          background: brand.showScreenPin !== false ? '#dcfce7' : '#f1f5f9',
                          color: brand.showScreenPin !== false ? '#15803d' : '#64748b',
                          border: `1px solid ${brand.showScreenPin !== false ? '#86efac' : '#cbd5e1'}`,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          fontWeight: 800
                        }}>
                          PIN: {brand.showScreenPin !== false ? 'ON' : 'OFF'}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          background: brand.showDeviceName !== false ? '#e0f2fe' : '#f1f5f9',
                          color: brand.showDeviceName !== false ? '#0369a1' : '#64748b',
                          border: `1px solid ${brand.showDeviceName !== false ? '#7dd3fc' : '#cbd5e1'}`,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          fontWeight: 800
                        }}>
                          Device: {brand.showDeviceName !== false ? 'ON' : 'OFF'}
                        </span>
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

                {/* Display Settings: Screen PIN & Device Name Independent Toggles (image copy 114.png) */}
                <div style={{
                  marginTop: '10px',
                  padding: '9px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  {/* Screen PIN Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                      Screen PIN:
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBrandSetting(brand.id, 'showScreenPin');
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        background: brand.showScreenPin !== false ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#94a3b8',
                        color: '#ffffff',
                        boxShadow: brand.showScreenPin !== false ? '0 2px 6px rgba(22, 163, 74, 0.35)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Click to turn Screen PIN ${brand.showScreenPin !== false ? 'OFF' : 'ON'}`}
                      id={`brand-${brand.id}-pin-toggle`}
                    >
                      {brand.showScreenPin !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Device Name Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                      Device Name:
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleBrandSetting(brand.id, 'showDeviceName');
                      }}
                      style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 900,
                        cursor: 'pointer',
                        background: brand.showDeviceName !== false ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : '#94a3b8',
                        color: '#ffffff',
                        boxShadow: brand.showDeviceName !== false ? '0 2px 6px rgba(37, 99, 235, 0.35)' : 'none',
                        transition: 'all 0.15s ease'
                      }}
                      title={`Click to turn Device Name ${brand.showDeviceName !== false ? 'OFF' : 'ON'}`}
                      id={`brand-${brand.id}-device-toggle`}
                    >
                      {brand.showDeviceName !== false ? 'ON' : 'OFF'}
                    </button>
                  </div>
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
          onClick={() => setAddModalState(false)}
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
                onClick={() => setAddModalState(false)}
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

                {/* 2. Screen Count with Add 5+ Button (image copy 72.png) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <label className="form-label" style={{ fontSize: '11px', margin: 0 }}>Screens</label>
                    <button
                      type="button"
                      onClick={() => {
                        const nextMax = (maxScreenOptions || 10) + 5;
                        setMaxScreenOptions(nextMax);
                        setScreensCount(nextMax);
                        showToast(`Added 5 screens! Total ${nextMax} screens available`, 'success');
                      }}
                      style={{
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '6px',
                        padding: '1px 5px',
                        fontSize: '9.5px',
                        fontWeight: 900,
                        color: '#2563eb',
                        cursor: 'pointer'
                      }}
                      title="Click to add +5 more screen options (up to 15, 20...)"
                    >
                      +5 Screens
                    </button>
                  </div>
                  <select
                    className="form-input-pill"
                    style={{ height: '40px', fontSize: '12px', padding: '0 8px', fontWeight: 800 }}
                    value={screensCount}
                    onChange={e => setScreensCount(Number(e.target.value))}
                  >
                    {Array.from({ length: maxScreenOptions || 10 }, (_, i) => i + 1).map(n => (
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

              {/* Screen Pin & Device Name Toggles (image copy 108.png & 109.png) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: '#f8fafc',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1.5px solid #e2e8f0',
                marginTop: '2px'
              }}>
                {/* Screen Pin Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Screen Pin</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Require PIN on card</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowScreenPin(!showScreenPin)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      background: showScreenPin ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#e2e8f0',
                      color: showScreenPin ? '#ffffff' : '#64748b',
                      boxShadow: showScreenPin ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                    }}
                  >
                    {showScreenPin ? 'ON' : 'OFF'}
                  </button>
                </div>

                {/* Device Name Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>Device Name</div>
                    <div style={{ fontSize: '10.5px', color: '#64748b' }}>Show Device field</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDeviceName(!showDeviceName)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '20px',
                      border: 'none',
                      fontWeight: 900,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      background: showDeviceName ? 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' : '#e2e8f0',
                      color: showDeviceName ? '#ffffff' : '#64748b',
                      boxShadow: showDeviceName ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                    }}
                  >
                    {showDeviceName ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              {/* ======================================================== */}
              {/* PLAN SELECTOR TABS & ADD PLAN (image copy 47.png)        */}
              {/* ======================================================== */}
              <div style={{ marginTop: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12.5px', fontWeight: 800, margin: 0 }}>
                    Plan Variants & Pricing
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewPlanInput(true)}
                    className="glossy-btn glossy-btn-blue"
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 800,
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    id="btn-add-plan-variant"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>Add Plan</span>
                  </button>
                </div>

                {/* Inline New Plan Input Form (image copy 47.png) */}
                {showNewPlanInput && (
                  <div style={{
                    display: 'flex',
                    gap: '6px',
                    marginBottom: '8px',
                    background: '#eff6ff',
                    padding: '8px',
                    borderRadius: '10px',
                    border: '1px solid #bfdbfe',
                    alignItems: 'center'
                  }}>
                    <input
                      type="text"
                      className="form-input-pill"
                      placeholder="Enter Plan Name (e.g. With Ads, Ads Free...)"
                      value={newPlanName}
                      onChange={e => setNewPlanName(e.target.value)}
                      style={{ height: '34px', fontSize: '12px', flex: 1 }}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddNewPlan();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNewPlan}
                      className="glossy-btn glossy-btn-blue"
                      style={{ padding: '6px 12px', fontSize: '11.5px', height: '34px', borderRadius: '8px' }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewPlanInput(false);
                        setNewPlanName('');
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Horizontal Scrollable Tabs: General, With Ads, Ads Free (image copy 47.png) */}
                <div style={{
                  display: 'flex',
                  overflowX: 'auto',
                  background: '#f1f5f9',
                  padding: '4px',
                  borderRadius: '10px',
                  gap: '6px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}>
                  {Object.entries(pricingPlans).map(([key, config]) => {
                    const isActive = activePlanTab === key;

                    return (
                      <div
                        key={key}
                        onClick={() => setActivePlanTab(key)}
                        style={{
                          background: isActive ? '#ffffff' : 'transparent',
                          color: isActive ? '#0f172a' : '#64748b',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: isActive ? 900 : 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          whiteSpace: 'nowrap',
                          boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }} />
                        <span>{config.label}</span>
                        {key !== 'general' && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPlan(key, e)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '0 2px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title="Remove plan"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
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
                  onClick={() => setAddModalState(false)}
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
