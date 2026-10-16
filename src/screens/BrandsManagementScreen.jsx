import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Edit2, Upload, DollarSign, Calendar, Tv, ArrowLeft, Check } from 'lucide-react';
import { api } from '../api/client';

export default function BrandsManagementScreen({ onBack, onBrandCreated, showToast }) {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Brand Form State
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoPreview, setLogoPreview] = useState('');
  const [brandColor, setBrandColor] = useState('#3b82f6');
  const [screensCount, setScreensCount] = useState(5);
  const [validities, setValidities] = useState([
    { plan: '01 Month', price: 199 },
    { plan: '03 Months', price: 499 },
    { plan: '06 Months', price: 899 },
    { plan: '12 Months', price: 1499 }
  ]);

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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setLogoUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddValidityRow = () => {
    setValidities(prev => [...prev, { plan: '01 Month', price: 199 }]);
  };

  const handleRemoveValidityRow = (idx) => {
    setValidities(prev => prev.filter((_, i) => i !== idx));
  };

  const handleValidityChange = (idx, field, val) => {
    setValidities(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter Brand Name', 'error');
      return;
    }

    try {
      const pricesObj = {};
      const plansArr = [];
      validities.forEach(v => {
        if (v.plan && v.price !== undefined) {
          pricesObj[v.plan] = Number(v.price) || 0;
          if (!plansArr.includes(v.plan)) plansArr.push(v.plan);
        }
      });

      const brandPayload = {
        name: name.trim(),
        displayName: name.trim(),
        logo: logoUrl || logoPreview || '',
        color: brandColor,
        bgDark: '#0f172a',
        badgeColor: brandColor,
        screensCount: Number(screensCount) || 5,
        plans: plansArr.length > 0 ? plansArr : ['01 Month'],
        prices: Object.keys(pricesObj).length > 0 ? pricesObj : { '01 Month': 199 }
      };

      const created = await api.createBrand(brandPayload);
      showToast(`Brand "${name}" created successfully!`, 'success');
      setShowAddModal(false);
      setName('');
      setLogoUrl('');
      setLogoPreview('');
      loadBrands();
      if (onBrandCreated) onBrandCreated(created);
    } catch (err) {
      showToast(err.message || 'Failed to create brand', 'error');
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

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: '#ffffff',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              OTT Brands
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Manage brands, validities, and pricing
            </p>
          </div>
        </div>

        {/* Add Brand Button on Top */}
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '12px' }}
        >
          <Plus size={16} /> Add Brand
        </button>
      </div>

      {/* Already Listed Brands Below Add Button */}
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
            Click the "Add Brand" button above to add your first OTT brand.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} /> Add First Brand
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {brands.map(brand => (
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
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {brand.displayName || brand.name}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      {brand.screensCount || 5} Screens per Account
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteBrand(brand.id, brand.displayName || brand.name)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '6px'
                  }}
                  title="Delete brand"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {/* Validities & Prices List */}
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
          ))}
        </div>
      )}

      {/* Add Brand Modal Popup */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-card"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Add New Brand</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  Upload logo, set name, and configure validities + prices
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Brand Name */}
              <div>
                <label className="form-label">Brand Name</label>
                <input
                  type="text"
                  className="form-input-pill"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Netflix, Amazon Prime, Aha..."
                  required
                />
              </div>

              {/* Upload Logo / Logo URL */}
              <div>
                <label className="form-label">Brand Logo</label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <label
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '10px',
                      borderRadius: '12px',
                      border: '1.5px dashed #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#334155'
                    }}
                  >
                    <Upload size={16} />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      style={{ display: 'none' }}
                    />
                  </label>

                  {/* Logo Preview */}
                  {(logoPreview || logoUrl) && (
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '10px',
                      background: '#0f172a',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <img
                        src={logoPreview || logoUrl}
                        alt="Preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '6px' }}>
                  <input
                    type="url"
                    className="form-input-pill"
                    value={logoUrl}
                    onChange={e => {
                      setLogoUrl(e.target.value);
                      setLogoPreview(e.target.value);
                    }}
                    placeholder="Or enter image URL (https://...)"
                    style={{ fontSize: '13px' }}
                  />
                </div>
              </div>

              {/* Screens Count */}
              <div className="form-row-2">
                <div>
                  <label className="form-label">Default Screens Count</label>
                  <select
                    className="form-input-pill"
                    value={screensCount}
                    onChange={e => setScreensCount(e.target.value)}
                    style={{ width: '100%', fontWeight: 700 }}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <option key={n} value={n}>{n} Screens</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Brand Color</label>
                  <input
                    type="color"
                    value={brandColor}
                    onChange={e => setBrandColor(e.target.value)}
                    style={{
                      width: '100%',
                      height: '44px',
                      borderRadius: '12px',
                      border: '1.5px solid #cbd5e1',
                      padding: '4px',
                      cursor: 'pointer'
                    }}
                  />
                </div>
              </div>

              {/* Add Validities + Prices */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Add Validities + Prices</label>
                  <button
                    type="button"
                    onClick={handleAddValidityRow}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      fontSize: '13px',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={14} /> Add Validity
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {validities.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input-pill"
                        value={item.plan}
                        onChange={e => handleValidityChange(idx, 'plan', e.target.value)}
                        placeholder="e.g. 01 Month"
                        style={{ flex: 1.2, fontSize: '13px', fontWeight: 700 }}
                      />
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#16a34a' }}>₹</span>
                        <input
                          type="number"
                          className="form-input-pill"
                          value={item.price}
                          onChange={e => handleValidityChange(idx, 'price', e.target.value)}
                          placeholder="Price"
                          style={{ paddingLeft: '24px', fontSize: '13px', fontWeight: 800 }}
                        />
                      </div>
                      {validities.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveValidityRow(idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="glossy-btn glossy-btn-gray"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-btn glossy-btn-blue"
                  style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
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
