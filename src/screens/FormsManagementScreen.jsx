import React, { useState, useEffect } from 'react';
import { Plus, ArrowLeft, Trash2, Edit3, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { api } from '../api/client';
import FormBuilderCanvas from './FormBuilderCanvas';

export default function FormsManagementScreen({ brands = [], onBack, showToast }) {
  // activeTab: 'sale' | 'database'
  const [activeTab, setActiveTab] = useState('sale');
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form Builder state
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingForm, setEditingForm] = useState(null);

  const loadForms = async () => {
    try {
      setLoading(true);
      const data = await api.getCustomForms(activeTab);
      setForms(data || []);
    } catch (e) {
      showToast('Failed to load forms', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isBuilding) {
      loadForms();
    }
  }, [activeTab, isBuilding]);

  const handleStartCreateForm = () => {
    setEditingForm(null);
    setIsBuilding(true);
  };

  const handleEditForm = (form) => {
    setEditingForm(form);
    setIsBuilding(true);
  };

  const handleDeleteForm = async (id, name) => {
    if (!window.confirm(`Delete form "${name}"?`)) return;
    try {
      await api.deleteCustomForm(id);
      showToast(`Deleted form "${name}"`, 'success');
      loadForms();
    } catch (e) {
      showToast('Failed to delete form', 'error');
    }
  };

  if (isBuilding) {
    return (
      <FormBuilderCanvas
        formType={activeTab}
        brands={brands}
        initialData={editingForm}
        onSaveComplete={() => {
          setIsBuilding(false);
          setEditingForm(null);
          loadForms();
        }}
        onBack={() => {
          setIsBuilding(false);
          setEditingForm(null);
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '16px' }}>
      {/* Top Header */}
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
              Custom Forms
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
              Create Canva-style customized forms
            </p>
          </div>
        </div>

        {/* Create Form Button on Top */}
        <button
          type="button"
          className="glossy-btn glossy-btn-blue"
          onClick={handleStartCreateForm}
          style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '12px' }}
        >
          <Plus size={16} /> Create Form
        </button>
      </div>

      {/* 02 Buttons: 1). Sale Form, 2). Data Base Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '18px'
      }}>
        <button
          type="button"
          onClick={() => setActiveTab('sale')}
          className={`glossy-btn ${activeTab === 'sale' ? 'glossy-btn-orange' : 'glossy-btn-gray'}`}
          style={{ padding: '12px', fontSize: '14px', borderRadius: '12px' }}
        >
          1). Sale Form
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('database')}
          className={`glossy-btn ${activeTab === 'database' ? 'glossy-btn-green' : 'glossy-btn-gray'}`}
          style={{ padding: '12px', fontSize: '14px', borderRadius: '12px' }}
        >
          2). Data Base Form
        </button>
      </div>

      {/* Available Forms in Short Below the Button */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
          Loading forms...
        </div>
      ) : forms.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px 16px',
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <FileText size={24} />
          </div>
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
            No {activeTab === 'sale' ? 'Sale Forms' : 'Data Base Forms'} Available
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
            As you are newly starting, click "Create Form" above to build a custom draggable canvas layout.
          </p>
          <button
            type="button"
            className="glossy-btn glossy-btn-blue"
            onClick={handleStartCreateForm}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <Plus size={16} /> Create Form
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {forms.map(form => (
            <div
              key={form.id}
              style={{
                background: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 4px' }}>
                    {form.name}
                  </h3>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: form.type === 'sale' ? '#ea580c' : '#16a34a',
                    background: form.type === 'sale' ? '#ffedd5' : '#dcfce7',
                    padding: '2px 8px',
                    borderRadius: '6px'
                  }}>
                    {form.type === 'sale' ? 'Sale Form' : 'Data Base Form'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => handleEditForm(form)}
                    style={{
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      color: '#1d4ed8',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: 700
                    }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteForm(form.id, form.name)}
                    style={{
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: '8px',
                      padding: '6px',
                      cursor: 'pointer',
                      color: '#dc2626'
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Elements count & Brands */}
              <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', gap: '14px', marginTop: '6px' }}>
                <span><strong>{form.elements?.length || 0}</strong> Elements (Boxes/Headings/Buttons)</span>
                {form.brands && form.brands.length > 0 && (
                  <span>Applies to: <strong>{form.brands.length} Brands</strong></span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
