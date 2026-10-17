import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, FileText, ChevronRight, CheckCircle2, Layers } from 'lucide-react';
import SaleScreen from './SaleScreen';
import FormBuilderCanvas from './FormBuilderCanvas';
import { api } from '../api/client';

export default function FormsManagementScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSale,
  onBack,
  showToast
}) {
  // openedForm: null (Forms List View) | 'sale' (Default Sale Form) | 'builder' (Create New Form) | customForm object
  const [openedForm, setOpenedForm] = useState(null);
  const [customForms, setCustomForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(false);

  const loadCustomForms = async () => {
    try {
      setLoadingForms(true);
      const list = await api.getCustomForms('sale');
      setCustomForms(list || []);
    } catch (e) {
      console.warn('Failed to load custom forms', e);
    } finally {
      setLoadingForms(false);
    }
  };

  useEffect(() => {
    loadCustomForms();
  }, []);

  // =========================================================================
  // VIEW 1: Canva-Style Form Builder (When "+ Create New" is clicked)
  // =========================================================================
  if (openedForm === 'builder') {
    return (
      <FormBuilderCanvas
        formType="sale"
        brands={brands}
        onBack={() => setOpenedForm(null)}
        onSaveComplete={() => {
          loadCustomForms();
          setOpenedForm(null);
          showToast('Form created successfully!', 'success');
        }}
        showToast={showToast}
      />
    );
  }

  // =========================================================================
  // VIEW 2: Completely Show That Particular Opened Form (Requirement 2)
  // =========================================================================
  if (openedForm === 'sale') {
    return (
      <div className="opened-form-wrapper" style={{ paddingBottom: '90px' }}>
        {/* Top Header of Opened Form */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          {/* Top Left Back Button -> Returns back to Forms List */}
          <button
            type="button"
            onClick={() => setOpenedForm(null)}
            className="header-btn"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            aria-label="Back to Forms"
            title="Back to Forms"
            id="opened-form-back-btn"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Top Middle Title */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              Sale Form
            </h2>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
              Default Form
            </span>
          </div>

          {/* Right Spacer */}
          <div style={{ width: '38px' }} />
        </div>

        {/* Complete Particular Form Rendered Below */}
        <div style={{ paddingTop: '8px' }}>
          <SaleScreen
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={onSelectBrand}
            onSaleSuccess={async (payload) => {
              if (onNavigateToSale) {
                await onNavigateToSale(payload);
              }
            }}
            showToast={showToast}
          />
        </div>
      </div>
    );
  }

  // If a custom form was opened
  if (openedForm && typeof openedForm === 'object') {
    return (
      <div className="opened-form-wrapper" style={{ paddingBottom: '90px' }}>
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50
        }}>
          <button
            type="button"
            onClick={() => setOpenedForm(null)}
            className="header-btn"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          >
            <ArrowLeft size={18} />
          </button>

          <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {openedForm.name}
          </h2>

          <div style={{ width: '38px' }} />
        </div>

        <div style={{ padding: '16px' }}>
          {/* Elements preview/editing */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            border: '1.5px solid #e2e8f0'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>{openedForm.name}</h3>
            <p style={{ color: '#64748b', fontSize: '13px' }}>Custom form layout loaded.</p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: Main Forms List Page
  // - Top Left Back Button
  // - Top Middle Sale Forms
  // - Top Right Create New button (Remove Menu Button)
  // - Below show List of Forms available in short size with Heading Name
  //   (currently available Sale form with Heading Sale form and top right Default)
  // =========================================================================
  return (
    <div className="forms-list-page" style={{ paddingBottom: '90px' }}>
      {/* Top Header */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        {/* Top Left Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="header-btn"
          style={{ width: '40px', height: '40px', borderRadius: '10px' }}
          aria-label="Back"
          title="Back"
          id="forms-back-btn"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Top Middle Sale Forms */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Sale Forms
          </h1>
        </div>

        {/* Top Right Create New button (Remove Menu Button) */}
        <button
          type="button"
          onClick={() => setOpenedForm('builder')}
          className="glossy-btn glossy-btn-blue"
          style={{
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 800,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          id="forms-create-new-btn"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Create New</span>
        </button>
      </div>

      {/* Body: List of Forms available in short size with Heading Name */}
      <div style={{ padding: '16px' }}>
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Available Forms ({1 + customForms.length})
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
            Tap to open
          </span>
        </div>

        {/* Forms List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Card: Heading Sale form, top right Default badge, short size */}
          <div
            onClick={() => setOpenedForm('sale')}
            id="form-card-sale-default"
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '2px solid #2563eb',
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.08)',
              padding: '16px',
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Top row: Heading Name (Sale Form) & Top Right (Default) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                }}>
                  <FileText size={18} />
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Sale Form
                </h3>
              </div>

              {/* Top Right "Default" badge */}
              <span style={{
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1.5px solid #bfdbfe',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.3px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <CheckCircle2 size={13} color="#2563eb" />
                Default
              </span>
            </div>

            {/* Short description */}
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 12px', fontWeight: 600 }}>
              Full OTT Subscription Sale Form &bull; 11 Fields with WhatsApp & Database Auto-Save
            </p>

            {/* Tags & Open button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {['Brand', 'Validity', 'Date (From & To)', 'Credentials', 'Customer'].map((tag, i) => (
                  <span
                    key={i}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#475569'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#2563eb', fontWeight: 800, fontSize: '13px' }}>
                <span>Open Form</span>
                <ChevronRight size={16} />
              </div>
            </div>
          </div>

          {/* Any Custom Forms */}
          {customForms.map(form => (
            <div
              key={form.id}
              onClick={() => setOpenedForm(form)}
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1.5px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                padding: '16px',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#475569'
                  }}>
                    <Layers size={18} />
                  </div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    {form.name}
                  </h3>
                </div>

                <span style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  padding: '3px 8px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: 800
                }}>
                  Custom
                </span>
              </div>

              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 10px' }}>
                {form.elements?.length || 0} fields configured
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', color: '#2563eb', fontWeight: 800, fontSize: '13px' }}>
                <span>Open Form</span>
                <ChevronRight size={16} />
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  );
}
