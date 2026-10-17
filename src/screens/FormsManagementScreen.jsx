import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, ChevronRight, CheckCircle2,
  Lock, Unlock, Check, Tv, X, AlertTriangle, Sparkles
} from 'lucide-react';
import SaleScreen from './SaleScreen';
import InventoryScreen from './InventoryScreen';
import { api } from '../api/client';

export default function FormsManagementScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSale,
  onBack,
  showToast
}) {
  // activeSection: null (Hub with 02 big buttons & Create Group) | 'sale' | 'database'
  const [activeSection, setActiveSection] = useState(null);

  // Opened Form state: null | { type: 'sale' | 'database', template: object }
  const [openedForm, setOpenedForm] = useState(null);

  // Data states
  const [groups, setGroups] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null);

  const [brandAssignForm, setBrandAssignForm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Group form state
  const [groupName, setGroupName] = useState('');
  const [groupHeading, setGroupHeading] = useState('');
  const [groupSubheading, setGroupSubheading] = useState('');
  const [groupColor, setGroupColor] = useState('#2563eb');

  // Form template state
  const [formTitle, setFormTitle] = useState('');
  const [formHeading, setFormHeading] = useState('');
  const [formSubheading, setFormSubheading] = useState('');
  const [formType, setFormType] = useState('sale');
  const [formGroupId, setFormGroupId] = useState('');
  const [formBrands, setFormBrands] = useState([]);
  const [formIsAllBrands, setFormIsAllBrands] = useState(false);
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Load all groups & forms
  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsList, formsList] = await Promise.all([
        api.getGroups(),
        api.getCustomForms()
      ]);
      setGroups(groupsList || []);
      setCustomForms(formsList || []);
    } catch (e) {
      console.warn('Error loading forms & groups', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const presetColors = [
    '#2563eb', '#16a34a', '#ea580c', '#7c3aed',
    '#e11d48', '#0891b2', '#0f172a', '#d97706'
  ];

  // =========================================================================
  // GROUP CRUD HANDLERS
  // =========================================================================
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupName('');
    setGroupHeading('');
    setGroupSubheading('');
    setGroupColor('#2563eb');
    setShowGroupModal(true);
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      showToast('Group Name is required', 'error');
      return;
    }
    if (!groupHeading.trim()) {
      showToast('Heading is required', 'error');
      return;
    }

    try {
      const payload = {
        name: groupName.trim(),
        heading: groupHeading.trim(),
        subheading: groupSubheading.trim(),
        color: groupColor
      };

      if (editingGroup) {
        await api.updateGroup(editingGroup.id, payload);
        showToast('Group updated successfully!', 'success');
      } else {
        await api.createGroup(payload);
        showToast('Group created successfully!', 'success');
      }

      setShowGroupModal(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save group', 'error');
    }
  };

  // =========================================================================
  // FORM TEMPLATE CRUD & LOCK HANDLERS
  // =========================================================================
  const handleOpenCreateForm = () => {
    const currentSectionType = activeSection || 'sale';
    const currentList = customForms.filter(f => f.type === currentSectionType);
    const nextNum = String(currentList.length + 1).padStart(2, '0');
    const defaultTitle = currentSectionType === 'sale' ? `SALE FORM ${nextNum}` : `DATABASE FORM ${nextNum}`;

    setEditingForm(null);
    setFormType(currentSectionType);
    setFormTitle(defaultTitle);
    setFormHeading(currentSectionType === 'sale' ? 'Multi-Brand OTT Subscription' : 'Multi-Brand Subscriptions');
    setFormSubheading('');
    setFormGroupId(groups[0]?.id || '');
    setFormBrands(brands.slice(0, 3).map(b => b.id));
    setFormIsAllBrands(false);
    setFormIsDefault(currentList.length === 0);
    setShowFormModal(true);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('Form Title is required', 'error');
      return;
    }

    try {
      const payload = {
        title: formTitle.trim(),
        name: formTitle.trim(),
        heading: formHeading.trim() || formTitle.trim(),
        subheading: formSubheading.trim(),
        type: formType,
        groupId: formGroupId || null,
        brands: formIsAllBrands ? brands.map(b => b.id) : formBrands,
        isAllBrands: formIsAllBrands,
        isDefault: formIsDefault
      };

      if (editingForm) {
        await api.updateCustomForm(editingForm.id, payload);
        showToast('Form template updated successfully!', 'success');
      } else {
        await api.createCustomForm(payload);
        showToast('Form template created successfully!', 'success');
      }

      setShowFormModal(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save form template', 'error');
    }
  };

  // Toggle Lock/Unlock state on a form
  const handleToggleLock = async (form) => {
    const newLockState = !form.isLocked;
    try {
      await api.updateCustomForm(form.id, { isLocked: newLockState });
      setCustomForms(prev => prev.map(f => f.id === form.id ? { ...f, isLocked: newLockState } : f));
      showToast(newLockState ? 'Form Locked 🔒' : 'Form Unlocked 🔓', 'info');
    } catch (err) {
      showToast('Failed to toggle lock', 'error');
    }
  };

  // Save Brand Assignment (either All Brands or individual selection)
  const handleSaveBrandAssignment = async (formId, { brands: newBrands, isAllBrands }) => {
    try {
      await api.updateCustomForm(formId, { brands: newBrands, isAllBrands });
      setCustomForms(prev => prev.map(f => f.id === formId ? { ...f, brands: newBrands, isAllBrands } : f));
      setBrandAssignForm(null);
      showToast(isAllBrands ? 'Assigned to All Brands!' : 'Brand selection saved!', 'success');
    } catch (err) {
      showToast('Failed to update brand assignment', 'error');
    }
  };

  // =========================================================================
  // VIEW 1: OPENED FULL INTERACTIVE FORM (SaleScreen or InventoryScreen)
  // =========================================================================
  if (openedForm) {
    if (openedForm.type === 'sale') {
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
              style={{ width: '40px', height: '40px', borderRadius: '10px' }}
              title="Back to Sale Forms"
              id="opened-sale-back-btn"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {openedForm.template.heading || openedForm.template.title || 'Sale Form'}
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#f97316' }}>
                Active Sale Form
              </span>
            </div>

            <div style={{ width: '40px' }} />
          </div>

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

    if (openedForm.type === 'database') {
      const firstBrandId = openedForm.template.brands?.[0];
      const initialBrand = brands.find(b => b.id === firstBrandId) || brands[0];

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
              style={{ width: '40px', height: '40px', borderRadius: '10px' }}
              title="Back to Database Forms"
              id="opened-db-back-btn"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {openedForm.template.heading || openedForm.template.title || 'DataBase Form'}
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
                Accounts Database
              </span>
            </div>

            <div style={{ width: '40px' }} />
          </div>

          <div style={{ paddingTop: '4px' }}>
            <InventoryScreen
              brands={brands}
              selectedBrand={initialBrand}
              onSelectBrand={onSelectBrand}
              showToast={showToast}
            />
          </div>
        </div>
      );
    }
  }

  // =========================================================================
  // VIEW 2: FORMS HUB SCREEN (Matching image copy 51.png)
  // Shows only Group Names / Form categories: Sale Form & DataBase Form
  // Bottom: Create Group button
  // =========================================================================
  if (activeSection === null) {
    return (
      <div className="forms-hub-page" style={{ paddingBottom: '90px', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
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
          <button
            type="button"
            onClick={onBack}
            className="header-btn"
            style={{ width: '40px', height: '40px', borderRadius: '10px' }}
            aria-label="Back"
            title="Back"
            id="forms-hub-back-btn"
          >
            <ArrowLeft size={20} />
          </button>

          <div style={{ textAlign: 'center', flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
              Forms
            </h1>
          </div>

          <div style={{ width: '40px' }} />
        </div>

        {/* Content Body matching image copy 51.png */}
        <div style={{
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'space-between'
        }}>
          {/* Top 02 Primary Category Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingTop: '16px' }}>
            {/* Orange Button: Sale Form */}
            <button
              type="button"
              onClick={() => setActiveSection('sale')}
              id="forms-hub-sale-btn"
              style={{
                width: '100%',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.2px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(234, 88, 12, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Sale Form
            </button>

            {/* Green Button: DataBase Form */}
            <button
              type="button"
              onClick={() => setActiveSection('database')}
              id="forms-hub-db-btn"
              style={{
                width: '100%',
                height: '64px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '-0.2px',
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(22, 163, 74, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              DataBase Form
            </button>
          </div>

          {/* Bottom Button matching image copy 51.png: Create Group */}
          <div style={{ paddingBottom: '16px', paddingTop: '40px' }}>
            <button
              type="button"
              onClick={handleOpenCreateGroup}
              id="forms-hub-create-group-btn"
              style={{
                width: '100%',
                height: '58px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '20px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              Create Group
            </button>
          </div>
        </div>

        {/* Modal: Create Group */}
        {renderGroupModal()}
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: INDIVIDUAL FORMS LIST SCREEN (Matching image copy 52.png & 53.png)
  // - Top Header: Back button, Page Heading (Sale Form or DataBase Form), + Create Form
  // - Directly below: Create Group Button in Blue (same size)
  // - Clean Card:
  //   - Heading: 01. Heading with DEFAULT in colored box at right corner
  //   - Box:
  //     - Top row: OTT Brands on left, "Select Brands" button on right (remove from down)
  //     - Scrollable Form Style Preview with vertical scroll so content underneath is visible
  //     - Bottom row: Lock/Unlock button on left (replaces Edit), Open button on right
  // =========================================================================
  const sectionForms = customForms.filter(f => f.type === activeSection);
  const headerPageTitle = activeSection === 'sale' ? 'Sale Form' : 'DataBase Form';

  return (
    <div className="forms-list-page" style={{ paddingBottom: '90px' }}>
      {/* 1. TOP HEADER */}
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
        {/* Back button returns to Forms Hub */}
        <button
          type="button"
          onClick={() => setActiveSection(null)}
          className="header-btn"
          style={{ width: '40px', height: '40px', borderRadius: '10px' }}
          aria-label="Back to Forms"
          title="Back to Forms"
          id="forms-section-back-btn"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Dynamic Heading: Sale Form or DataBase Form */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            {headerPageTitle}
          </h1>
        </div>

        {/* Top Right: Create Form Button */}
        <button
          type="button"
          onClick={handleOpenCreateForm}
          className="glossy-btn glossy-btn-blue"
          style={{
            padding: '7px 14px',
            fontSize: '13px',
            fontWeight: 800,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          id="forms-create-form-top-btn"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Create Form</span>
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* 2. CREATE GROUP BUTTON DIRECTLY BELOW HEADER (Blue color, same full width) */}
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={handleOpenCreateGroup}
            id="forms-list-create-group-btn"
            style={{
              width: '100%',
              height: '50px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: 900,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'transform 0.15s ease'
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.99)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={18} strokeWidth={3} />
            <span>Create Group</span>
          </button>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
            Loading forms...
          </div>
        )}

        {/* Empty state */}
        {!loading && sectionForms.length === 0 && (
          <div style={{
            background: '#ffffff',
            border: '2px dashed #cbd5e1',
            borderRadius: '16px',
            padding: '36px 20px',
            textAlign: 'center',
            color: '#64748b'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
              No {headerPageTitle} Available
            </h3>
            <p style={{ fontSize: '13px', margin: '0 0 16px', color: '#64748b' }}>
              Tap '+ Create Form' above to set up your first template.
            </p>
            <button
              type="button"
              onClick={handleOpenCreateForm}
              className="glossy-btn glossy-btn-blue"
              style={{ padding: '8px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: 800 }}
            >
              + Create Form Now
            </button>
          </div>
        )}

        {/* 3. FORMS LIST (Clean cards matching image copy 52.png & 53.png) */}
        {!loading && sectionForms.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {sectionForms.map((form, index) => renderCleanFormCard(form, index))}
          </div>
        )}
      </div>

      {/* MODALS */}
      {renderGroupModal()}
      {renderFormModal()}
      {renderBrandAssignmentModal()}
      {renderDeleteModal()}
    </div>
  );

  // =========================================================================
  // CLEAN FORM CARD RENDERER (Matching image copy 52.png & 53.png requirements)
  // =========================================================================
  function renderCleanFormCard(form, index) {
    const numberStr = String(index + 1).padStart(2, '0');
    const isAll = Boolean(form.isAllBrands);
    const assignedBrands = (form.brands || [])
      .map(bId => brands.find(b => b.id === bId))
      .filter(Boolean);

    const isLocked = Boolean(form.isLocked);
    const isDefault = Boolean(form.isDefault || index === 0);

    return (
      <div key={form.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* Card Heading Row: Numbering + Heading on Left, DEFAULT colored box on Right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 4px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' }}>
              {numberStr}. {form.heading || form.title || form.name || 'Multi-Brand Subscriptions'}
            </span>
          </div>

          {/* Right Corner: Default Colored Box */}
          {isDefault && (
            <span style={{
              background: '#dcfce7',
              color: '#15803d',
              border: '1.5px solid #86efac',
              padding: '3px 10px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900,
              letterSpacing: '0.4px',
              textTransform: 'uppercase'
            }}>
              DEFAULT
            </span>
          )}
        </div>

        {/* Main Box Container */}
        <div
          id={`form-card-${form.id}`}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: isDefault ? '2px solid #0f172a' : '1.5px solid #cbd5e1',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Top row: Assigned OTT Brands on Left, "Select Brands" Button on Right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            {/* OTT Brands Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
              {isAll ? (
                // If All Brands was chosen, show single "All Brands" chip!
                <span style={{
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#ffffff',
                  padding: '5px 14px',
                  borderRadius: '20px',
                  fontSize: '11.5px',
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <Sparkles size={12} />
                  <span>ALL BRANDS</span>
                </span>
              ) : assignedBrands.length > 0 ? (
                // Individual brand chips
                assignedBrands.map(b => (
                  <span
                    key={b.id}
                    style={{
                      background: b.color || '#e50914',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '11.5px',
                      fontWeight: 900,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.12)'
                    }}
                  >
                    {b.name || b.displayName}
                  </span>
                ))
              ) : (
                <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No brands selected
                </span>
              )}
            </div>

            {/* Select Brands Button on Right */}
            <button
              type="button"
              onClick={() => setBrandAssignForm(form)}
              id={`select-brands-btn-${form.id}`}
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '10px',
                border: '1.5px solid #cbd5e1',
                background: '#f8fafc',
                color: '#0f172a',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            >
              Select Brands
            </button>
          </div>

          {/* Middle: Scrollable Form Style Preview Container */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '12px',
            maxHeight: '220px',
            overflowY: 'auto',
            scrollbarWidth: 'thin',
            display: 'flex',
            flexDirection: 'column',
            gap: '9px'
          }}>
            {activeSection === 'database' ? (
              // DATABASE FORM STYLE PREVIEW (Matching image copy 52.png with scrollable details)
              <>
                {/* Row 1: Ribbon 01, Validity pill, Checkbox */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 900,
                    fontSize: '12px',
                    padding: '3px 8px',
                    borderRadius: '6px'
                  }}>
                    01
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      background: '#0d3b66',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '20px'
                    }}>
                      06 Months
                    </span>
                    <div style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '5px',
                      background: '#2563eb',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Check size={12} strokeWidth={3} />
                    </div>
                  </div>
                </div>

                {/* ID row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#2563eb', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
                    ID
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#0f172a' }}>
                    netflix.user01@gmail.com
                  </div>
                </div>

                {/* Password row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#7c3aed', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
                    Password
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 700, color: '#0f172a', letterSpacing: '2px' }}>
                    ••••••••••••••••
                  </div>
                </div>

                {/* PINs row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {['1111', '2222', '3333', '4444', '5555'].map((pin, i) => (
                    <div key={i} style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: '#334155' }}>
                      {pin}
                    </div>
                  ))}
                </div>

                {/* Screen buttons row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} style={{
                      background: '#ea580c',
                      color: '#ffffff',
                      borderRadius: '6px',
                      padding: '4px 2px',
                      textAlign: 'center',
                      fontSize: '9.5px',
                      fontWeight: 800,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px'
                    }}>
                      <span>Screen {n}</span>
                      <Tv size={11} />
                    </div>
                  ))}
                </div>

                {/* Additional Scrollable Form Info (Revealed on vertical scroll) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '4px' }}>
                  <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                    Plan: Premium 4K UHD
                  </div>
                  <div style={{ background: '#f1f5f9', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                    Renewal: 17-Oct-2027
                  </div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#1d4ed8' }}>
                  Security: 2FA Active • Direct Screen Auto-Allocate Ready
                </div>
              </>
            ) : (
              // SALE FORM STYLE PREVIEW (Clean scrollable sale preview)
              <>
                {/* Row 1: Brand & Validity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Brand: {assignedBrands[0]?.displayName || 'Netflix'}</span>
                    <span>▾</span>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Validity: 12 Months</span>
                    <span>▾</span>
                  </div>
                </div>

                {/* Row 2: Activation & Expiry & Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 6px', fontSize: '10px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                    Act: 17-Oct-26
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 6px', fontSize: '10px', fontWeight: 700, color: '#475569', textAlign: 'center' }}>
                    Exp: 17-Oct-27
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px 6px', fontSize: '10.5px', fontWeight: 900, color: '#1e40af', textAlign: 'center' }}>
                    ₹1,599
                  </div>
                </div>

                {/* Row 3: Credentials */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
                  <span style={{ background: '#2563eb', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>ID</span>
                  <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>account.user@gmail.com</span>
                </div>

                {/* Row 4: Screen & PIN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 800, color: '#854d0e' }}>
                    Screen-1
                  </div>
                  <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 800, color: '#334155' }}>
                    PIN: 1111
                  </div>
                </div>

                {/* Additional Scrollable Details */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', color: '#0f172a' }}>
                  <div style={{ fontWeight: 800, color: '#475569', fontSize: '10px' }}>DEVICE NAME:</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>Living Room Samsung 55" Smart TV</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 800, color: '#166534' }}>
                  <span>WhatsApp Direct Share & Notification Ready</span>
                  <span style={{ fontSize: '13px' }}>💬</span>
                </div>
              </>
            )}
          </div>

          {/* Bottom row: Lock/Unlock Button on Left (replaces Edit), Open Button on Right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '2px'
          }}>
            {/* Left: Lock / Unlock Button */}
            <button
              type="button"
              onClick={() => handleToggleLock(form)}
              id={`lock-toggle-btn-${form.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: isLocked ? '#fef3c7' : '#f8fafc',
                border: isLocked ? '1.5px solid #fde047' : '1.5px solid #cbd5e1',
                color: isLocked ? '#b45309' : '#334155',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isLocked ? 'Click to Unlock form' : 'Click to Lock form'}
            >
              {isLocked ? (
                <>
                  <Lock size={15} color="#b45309" strokeWidth={2.5} />
                  <span>Locked</span>
                </>
              ) : (
                <>
                  <Unlock size={15} color="#475569" strokeWidth={2.5} />
                  <span>Unlock</span>
                </>
              )}
            </button>

            {/* Right: Open Button */}
            <button
              type="button"
              onClick={() => setOpenedForm({ type: activeSection, template: form })}
              id={`open-form-btn-${form.id}`}
              className={activeSection === 'database' ? 'glossy-btn glossy-btn-green' : 'glossy-btn glossy-btn-orange'}
              style={{
                padding: '8px 22px',
                fontSize: '13.5px',
                fontWeight: 900,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: activeSection === 'database'
                  ? '0 4px 12px rgba(22, 163, 74, 0.35)'
                  : '0 4px 12px rgba(249, 115, 22, 0.35)'
              }}
            >
              <span>Open</span>
              <ChevronRight size={16} strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODAL 1: CREATE / EDIT GROUP MODAL
  // =========================================================================
  function renderGroupModal() {
    if (!showGroupModal) return null;

    return (
      <div className="modal-backdrop" onClick={() => setShowGroupModal(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
          <div className="modal-header">
            <h3 className="modal-title">
              {editingGroup ? 'Edit Group' : 'Create New Group'}
            </h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowGroupModal(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveGroup} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">
                Group Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input-pill"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="e.g. Sales, Database, Premium Regional"
                required
              />
            </div>

            <div>
              <label className="form-label">
                Heading <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input-pill"
                value={groupHeading}
                onChange={e => setGroupHeading(e.target.value)}
                placeholder="e.g. Multi-Brand Subscriptions"
                required
              />
            </div>

            <div>
              <label className="form-label">Subheading (Optional)</label>
              <input
                type="text"
                className="form-input-pill"
                value={groupSubheading}
                onChange={e => setGroupSubheading(e.target.value)}
                placeholder="e.g. Premium shared & private streaming profiles"
              />
            </div>

            <div>
              <label className="form-label">Group Color</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
                {presetColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setGroupColor(color)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: groupColor === color ? '3px solid #0f172a' : '2px solid #ffffff',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                      cursor: 'pointer'
                    }}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="color"
                  value={groupColor}
                  onChange={e => setGroupColor(e.target.value)}
                  style={{ width: '40px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={groupColor}
                  onChange={e => setGroupColor(e.target.value)}
                  className="form-input-pill"
                  style={{ flex: 1, textTransform: 'uppercase', fontWeight: 800 }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                onClick={() => setShowGroupModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glossy-btn glossy-btn-blue"
                style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
              >
                Save Group
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODAL 2: CREATE / EDIT FORM MODAL
  // =========================================================================
  function renderFormModal() {
    if (!showFormModal) return null;

    return (
      <div className="modal-backdrop" onClick={() => setShowFormModal(false)}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="modal-header">
            <h3 className="modal-title">
              {editingForm ? `Edit ${formTitle}` : `Create New ${formType === 'sale' ? 'Sale Form' : 'Data Base Form'}`}
            </h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setShowFormModal(false)}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSaveForm} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label className="form-label">
                Form Title <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input-pill"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                placeholder="e.g. SALE FORM 01, DATABASE FORM 01"
                required
              />
            </div>

            <div>
              <label className="form-label">Heading</label>
              <input
                type="text"
                className="form-input-pill"
                value={formHeading}
                onChange={e => setFormHeading(e.target.value)}
                placeholder="e.g. Multi-Brand Subscriptions"
              />
            </div>

            <div>
              <label className="form-label">Subheading (Optional)</label>
              <input
                type="text"
                className="form-input-pill"
                value={formSubheading}
                onChange={e => setFormSubheading(e.target.value)}
                placeholder="e.g. Standard Customer Checkout"
              />
            </div>

            {/* Group Assignment */}
            <div>
              <label className="form-label">Group Assignment</label>
              <select
                value={formGroupId}
                onChange={e => setFormGroupId(e.target.value)}
                className="form-input-pill"
                style={{ width: '100%', fontWeight: 700 }}
              >
                <option value="">-- No Group (General) --</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.heading})</option>
                ))}
              </select>
            </div>

            {/* Default Template Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px' }}>
              <input
                type="checkbox"
                id="form-is-default-cb"
                checked={formIsDefault}
                onChange={e => setFormIsDefault(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="form-is-default-cb" style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', cursor: 'pointer' }}>
                Set as Default {formType === 'sale' ? 'Sale Form' : 'Data Base Form'}
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-gray"
                style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
                onClick={() => setShowFormModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="glossy-btn glossy-btn-blue"
                style={{ flex: 1, padding: '12px', borderRadius: '12px' }}
              >
                Save Form
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // MODAL 3: BRAND ASSIGNMENT QUICK MODAL (With Big "All Brands" Button at Top)
  // Matching Requirement:
  // "Select Brands ani kotagane. Brands list open kavali select cheskodaniki
  // and Ha List paina Top lo manaki Big All Brands ani button ravali adhi or
  // kindha Brands adho okati select cheskune la.
  // if All Brands ane Button select cheskunte e From paina chupinche individual
  // Brands kakunda All Brands ani chuoinchali"
  // =========================================================================
  function renderBrandAssignmentModal() {
    if (!brandAssignForm) return null;

    return (
      <BrandSelectionModal
        form={brandAssignForm}
        brands={brands}
        onSave={(data) => handleSaveBrandAssignment(brandAssignForm.id, data)}
        onClose={() => setBrandAssignForm(null)}
      />
    );
  }

  // =========================================================================
  // MODAL 4: DELETE CONFIRMATION MODAL
  // =========================================================================
  function renderDeleteModal() {
    if (!deleteConfirm) return null;

    return (
      <div className="modal-backdrop" onClick={() => setDeleteConfirm(null)}>
        <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', textAlign: 'center', padding: '24px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#fee2e2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <AlertTriangle size={24} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: '0 0 6px' }}>
            Delete Form Template?
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
            Are you sure you want to delete <strong>{deleteConfirm.item.title || deleteConfirm.item.name}</strong>?
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={() => setDeleteConfirm(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-red"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={async () => {
                await api.deleteCustomForm(deleteConfirm.item.id);
                setDeleteConfirm(null);
                showToast('Form template deleted', 'info');
                await loadData();
              }}
            >
              Yes, Delete
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// =========================================================================
// SUB-COMPONENT: BRAND SELECTION MODAL
// With Big "All Brands" Button at Top & Individual Selection below
// =========================================================================
function BrandSelectionModal({ form, brands, onSave, onClose }) {
  const [isAllBrands, setIsAllBrands] = useState(Boolean(form.isAllBrands));
  const [selectedBrands, setSelectedBrands] = useState(
    Array.isArray(form.brands) ? form.brands : []
  );

  const handleToggleBrand = (brandId) => {
    // If All Brands was selected, toggling a specific brand switches mode to individual
    if (isAllBrands) {
      setIsAllBrands(false);
      setSelectedBrands([brandId]);
      return;
    }

    setSelectedBrands(prev =>
      prev.includes(brandId)
        ? prev.filter(id => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSelectAllBrands = () => {
    setIsAllBrands(true);
    setSelectedBrands(brands.map(b => b.id));
  };

  const handleSave = () => {
    onSave({
      brands: isAllBrands ? brands.map(b => b.id) : selectedBrands,
      isAllBrands
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Select Brands</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Assign to {form.heading || form.title || form.name}
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          {/* BIG "ALL BRANDS" BUTTON AT TOP (Per requirement) */}
          <button
            type="button"
            onClick={handleSelectAllBrands}
            id="brand-modal-all-brands-btn"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: '14px',
              background: isAllBrands
                ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                : '#f8fafc',
              color: isAllBrands ? '#ffffff' : '#0f172a',
              border: isAllBrands ? '2px solid #1e40af' : '2px solid #cbd5e1',
              fontSize: '15px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: isAllBrands ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            {isAllBrands ? (
              <Check size={18} strokeWidth={3} />
            ) : (
              <Sparkles size={18} color="#2563eb" />
            )}
            <span>All Brands</span>
          </button>

          {/* Subheading / Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '16px 0 10px',
            paddingTop: '4px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Or Select Individual Brands ({brands.length})
            </span>
            {!isAllBrands && selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Individual Brands Grid / Wrap */}
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            maxHeight: '220px',
            overflowY: 'auto',
            marginBottom: '16px',
            padding: '2px 0'
          }}>
            {brands.map(brand => {
              const isSelected = !isAllBrands && selectedBrands.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleToggleBrand(brand.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '24px',
                    border: isSelected ? `2px solid ${brand.color || '#2563eb'}` : '1.5px solid #cbd5e1',
                    background: isSelected ? (brand.color || '#2563eb') : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSelected && <Check size={13} strokeWidth={3} />}
                  <span>{brand.displayName || brand.name}</span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '11px', borderRadius: '10px' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              style={{ flex: 1, padding: '11px', borderRadius: '10px' }}
              onClick={handleSave}
            >
              Save Brands
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
