import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, ChevronRight, CheckCircle2,
  Lock, Unlock, Check, Tv, X, AlertTriangle, Sparkles,
  Sliders, PenTool, ClipboardList, Database, ShoppingBag, Eye, EyeOff
} from 'lucide-react';
import FormBuilderCanvas from './FormBuilderCanvas';
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

  // Opened Form state: null | { type: 'sale' | 'database', template: object, mode: 'builder' | 'entry' }
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

    // Per user request: "After Clicking Create New Form, it should open plain white background then I will add the Boxes etc."
    setOpenedForm({
      type: currentSectionType,
      template: {
        title: defaultTitle,
        name: defaultTitle,
        heading: defaultTitle,
        type: currentSectionType,
        groupId: groups[0]?.id || null,
        brands: brands.map(b => b.id),
        isAllBrands: true,
        elements: [], // Plain white canvas with 0 elements!
        isNew: true,
        isNewForm: true,
        isLocked: true
      },
      mode: 'builder'
    });
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
        isDefault: formIsDefault,
        elements: editingForm?.elements || [],
        isLocked: true
      };

      if (editingForm) {
        await api.updateCustomForm(editingForm.id, payload);
        showToast('Form template updated successfully!', 'success');
      } else {
        const created = await api.createCustomForm(payload);
        showToast('Form template created successfully!', 'success');
        setOpenedForm({
          type: formType,
          template: created || payload,
          mode: 'builder'
        });
      }

      setShowFormModal(false);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to save form template', 'error');
    }
  };

  // Toggle Lock/Unlock state on a form (Default is Locked)
  const handleToggleLock = async (form) => {
    const currentLock = form.isLocked === undefined ? true : Boolean(form.isLocked);
    const newLockState = !currentLock;
    try {
      await api.updateCustomForm(form.id, { isLocked: newLockState });
      setCustomForms(prev => prev.map(f => f.id === form.id ? { ...f, isLocked: newLockState } : f));
      showToast(newLockState ? 'Form Locked 🔒' : 'Form Unlocked 🔓 Select Brands is now enabled!', 'info');
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
  // VIEW 1: OPENED FORM (Visual Form Builder & Empty Form Data Entry)
  // Per requirement: Open button lets user visually edit the form layout,
  // or enter empty data that updates the overall database for that OTT brand!
  // =========================================================================
  if (openedForm) {
    const isBuilderMode = !openedForm.mode || openedForm.mode === 'builder';

    return (
      <div className="opened-form-wrapper" style={{ minHeight: '100vh', background: '#f8fafc', paddingBottom: '90px' }}>
        {/* Top Header & Mode Toggle Switcher */}
        <div style={{
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 60,
          gap: '10px'
        }}>
          <button
            type="button"
            onClick={() => setOpenedForm(null)}
            className="header-btn"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            title="Back to Forms"
            id="opened-form-back-btn"
          >
            <ArrowLeft size={18} />
          </button>

          {/* Segmented Mode Switcher */}
          <div style={{
            display: 'flex',
            background: '#f1f5f9',
            padding: '3px',
            borderRadius: '10px',
            border: '1px solid #cbd5e1'
          }}>
            <button
              type="button"
              onClick={() => setOpenedForm(prev => ({ ...prev, mode: 'builder' }))}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: isBuilderMode ? '#ffffff' : 'transparent',
                color: isBuilderMode ? '#2563eb' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: isBuilderMode ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <PenTool size={13} />
              <span>Visual Form Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setOpenedForm(prev => ({ ...prev, mode: 'entry' }))}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: !isBuilderMode ? '#ffffff' : 'transparent',
                color: !isBuilderMode ? '#16a34a' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                boxShadow: !isBuilderMode ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <ClipboardList size={13} />
              <span>Fill Empty Form</span>
            </button>
          </div>

          <div style={{ width: '38px' }} />
        </div>

        {/* Content based on Mode */}
        {isBuilderMode ? (
          <FormBuilderCanvas
            formType={openedForm.type}
            brands={brands}
            initialData={openedForm.template}
            onSaveComplete={async (saved) => {
              await loadData();
              setOpenedForm(prev => prev ? { ...prev, template: { ...prev.template, ...saved } } : null);
              showToast('Form updated and saved to Database!', 'success');
            }}
            onBack={() => setOpenedForm(null)}
            showToast={showToast}
          />
        ) : (
          <EmptyFormDataEntry
            form={openedForm.template}
            formType={openedForm.type}
            brands={brands}
            onBack={() => setOpenedForm(null)}
            showToast={showToast}
            onNavigateToSale={onNavigateToSale}
            onAccountCreated={async () => {
              await loadData();
              showToast('Account added to Database successfully!', 'success');
            }}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FORMS HUB SCREEN (Matching image copy 51.png & image copy 73.png)
  // Shows only Group Names / Form categories: Sale Form & DataBase Form
  // Bottom: Create Group button (Down instead of middle per image copy 73.png)
  // =========================================================================
  if (activeSection === null) {
    return (
      <div className="forms-hub-page" style={{
        paddingBottom: '24px',
        minHeight: 'calc(100dvh - 140px)',
        display: 'flex',
        flexDirection: 'column'
      }}>
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

        {/* Content Body */}
        <div style={{
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          flex: 1
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

          {/* Spacer pushing Create Group firmly down to the bottom */}
          <div style={{ flex: 1, minHeight: '60px' }} />

          {/* Bottom Button matching image copy 87.png: Create Group on Down */}
          <div style={{ marginTop: 'auto', paddingBottom: '16px', paddingTop: '16px' }}>
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
  // VIEW 3: INDIVIDUAL FORMS LIST SCREEN (Matching image copy 74-80)
  // - Top Header: Back button, Page Heading (Sale Form or DataBase Form), + Create Form
  // - NOTE: "Remove Create Group on both inside butons of Sale Form and Database Form"
  //   per image copy 79.png & image copy 80.png
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

        {/* 2. FORMS LIST (Clean cards matching image copy 74-77) */}
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
  // CLEAN FORM CARD RENDERER (Matching image copy 74.png, 75.png & 77.png)
  // - Top row: OTT Brands on left, "Select Brands" button in BLUE on right
  // - Middle: EMPTY Form Style Preview with placeholders (not filled data)
  // - Bottom row: Lock/Unlock button (Green for Unlocked, Red for Locked) on left, Open button on right
  // =========================================================================
  function renderCleanFormCard(form, index) {
    const numberStr = String(index + 1).padStart(2, '0');
    const isAll = Boolean(form.isAllBrands);
    const assignedBrands = (form.brands || [])
      .map(bId => brands.find(b => b.id === bId))
      .filter(Boolean);

    const isLocked = form.isLocked === undefined ? true : Boolean(form.isLocked);
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
          {/* Top row: Assigned OTT Brands on Left, "Select Brands" Button in Blue on Right */}
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

            {/* Select Brands Button in Blue: Only works when unlocked per image copy 90.png */}
            <button
              type="button"
              disabled={isLocked}
              onClick={(e) => {
                e.stopPropagation();
                if (isLocked) {
                  showToast('Form is Locked 🔒 Please click "Locked" to unlock first!', 'warning');
                  return;
                }
                setBrandAssignForm(form);
              }}
              id={`select-brands-btn-${form.id}`}
              style={{
                padding: '7px 14px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '10px',
                border: isLocked ? '1.5px solid #cbd5e1' : '1.5px solid #2563eb',
                background: isLocked ? '#f1f5f9' : '#eff6ff',
                color: isLocked ? '#94a3b8' : '#1d4ed8',
                cursor: isLocked ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                opacity: isLocked ? 0.6 : 1,
                transition: 'all 0.15s ease',
                boxShadow: isLocked ? 'none' : '0 2px 6px rgba(37,99,235,0.15)'
              }}
              title={isLocked ? 'Form is Locked. Unlock first to change brands.' : 'Click to select brands'}
            >
              {isLocked && <Lock size={12} color="#94a3b8" />}
              <span>Select Brands</span>
            </button>
          </div>

          {/* Middle: EMPTY Form Style Preview Container (Matching image copy 75.png & image copy 77.png) */}
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
              // DATABASE EMPTY FORM PREVIEW (Matching image copy 77.png)
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
                      06 Months ▾
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

                {/* ID row: Empty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#2563eb', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
                    ID
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>
                    Enter Email / ID
                  </div>
                </div>

                {/* Password row: Empty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ background: '#7c3aed', color: '#ffffff', padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
                    Password
                  </div>
                  <div style={{ flex: 1, background: '#f8fafc', border: '1.5px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#94a3b8' }}>
                    Enter Password
                  </div>
                </div>

                {/* PINs row: Empty */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                  {['PIN 1', 'PIN 2', 'PIN 3', 'PIN 4', 'PIN 5'].map((pinPlaceholder, i) => (
                    <div key={i} style={{ background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: '6px', padding: '4px', textAlign: 'center', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8' }}>
                      {pinPlaceholder}
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

                {/* Additional Scrollable Form Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '4px' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8' }}>
                    Plan: [Plan Name]
                  </div>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#94a3b8' }}>
                    Renewal: [DD/MM/YYYY]
                  </div>
                </div>
                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 700, color: '#1d4ed8' }}>
                  Device / Notes: [Living Room TV / Mobile / Laptop]
                </div>
              </>
            ) : (
              // SALE EMPTY FORM PREVIEW (Matching image copy 75.png)
              <>
                {/* Row 1: Brand & Validity */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Brand: Select Brand ▾</span>
                    <span>▾</span>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px', fontSize: '11px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Validity: Select Validity ▾</span>
                    <span>▾</span>
                  </div>
                </div>

                {/* Row 2: Activation & Expiry & Amount */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 6px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>
                    Act: DD/MM/YYYY
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 6px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textAlign: 'center' }}>
                    Exp: DD/MM/YYYY
                  </div>
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '5px 6px', fontSize: '10.5px', fontWeight: 900, color: '#1e40af', textAlign: 'center' }}>
                    ₹ 0.00
                  </div>
                </div>

                {/* Row 3: Credentials Empty */}
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
                  <span style={{ background: '#2563eb', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>ID</span>
                  <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Enter Account Email / ID</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
                  <span style={{ background: '#7c3aed', color: '#ffffff', padding: '4px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>Password</span>
                  <span style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>Enter Password</span>
                </div>

                {/* Row 4: Screen & PIN */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 800, color: '#854d0e' }}>
                    Screen-1
                  </div>
                  <div style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '5px 8px', fontSize: '10.5px', fontWeight: 800, color: '#94a3b8' }}>
                    PIN: [0000]
                  </div>
                </div>

                {/* Additional Scrollable Details: Device & Customer */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', color: '#0f172a' }}>
                  <div style={{ fontWeight: 800, color: '#475569', fontSize: '10px' }}>DEVICE NAME:</div>
                  <div style={{ fontWeight: 600, color: '#94a3b8', marginTop: '2px' }}>Enter Device Name...</div>
                </div>

                {/* Customer Details Box */}
                <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '11px', marginBottom: '4px' }}>Customer Details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', color: '#94a3b8' }}>Name</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', color: '#94a3b8' }}>Number</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', color: '#94a3b8' }}>Ref Name</div>
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', color: '#94a3b8' }}>Ref Number</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom row: Lock/Unlock Button on Left (Green and Red per requirement), Open Button on Right */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '2px'
          }}>
            {/* Left: Lock / Unlock Button (Green for Unlocked, Red for Locked) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleLock(form);
              }}
              id={`lock-toggle-btn-${form.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: isLocked ? '#fef2f2' : '#f0fdf4',
                border: isLocked ? '1.5px solid #ef4444' : '1.5px solid #22c55e',
                color: isLocked ? '#dc2626' : '#16a34a',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title={isLocked ? 'Click to Unlock form' : 'Click to Lock form'}
            >
              {isLocked ? (
                <>
                  <Lock size={15} color="#dc2626" strokeWidth={2.5} />
                  <span>Locked</span>
                </>
              ) : (
                <>
                  <Unlock size={15} color="#16a34a" strokeWidth={2.5} />
                  <span>Unlock</span>
                </>
              )}
            </button>

            {/* Right: Open Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenedForm({ type: activeSection, template: form, mode: 'builder' });
              }}
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
  // MODAL 3: BRAND ASSIGNMENT QUICK MODAL (Matching image copy 76.png & 78.png)
  // With Big "All Brands" Button at Top & Individual side-by-side Brands below
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

// Helper: Get brand specific theme color matching image copy 89.png
function getBrandThemeColor(brand) {
  if (!brand) return '#2563eb';
  const id = (brand.id || '').toLowerCase();
  const name = (brand.displayName || brand.name || '').toLowerCase();
  if (id.includes('netflix') || name.includes('netflix')) return '#e50914';
  if (id.includes('prime') || name.includes('prime') || id.includes('amazon')) return '#00a8e1';
  if (id.includes('hotstar') || name.includes('hotstar') || id.includes('disney')) return '#113ccf';
  if (id.includes('sonyliv') || name.includes('sonyliv') || name.includes('sony')) return '#7c3aed';
  if (id.includes('zee5') || name.includes('zee5') || name.includes('zee')) return '#ea580c';
  if (id.includes('aha') || name.includes('aha')) return '#ff6600';
  if (id.includes('youtube') || name.includes('youtube')) return '#ff0000';
  if (id.includes('spotify') || name.includes('spotify')) return '#1ed760';
  if (id.includes('apple') || name.includes('apple')) return '#111827';
  if (id.includes('jiocinema') || name.includes('jiocinema') || id.includes('jio')) return '#e11d48';
  if (id.includes('sunnxt') || name.includes('sunnxt')) return '#f59e0b';
  if (id.includes('voot') || name.includes('voot')) return '#9333ea';
  if (id.includes('altbalaji') || name.includes('altbalaji')) return '#ef4444';
  return brand.color || '#2563eb';
}

// =========================================================================
// SUB-COMPONENT: BRAND SELECTION MODAL
// Centered small popup on middle of screen matching image copy 88.png & 89.png
// Each brand has its related signature color
// =========================================================================
function BrandSelectionModal({ form, brands = [], onSave, onClose }) {
  const [isAllBrands, setIsAllBrands] = useState(Boolean(form.isAllBrands));
  const [selectedBrands, setSelectedBrands] = useState(
    Array.isArray(form.brands) ? form.brands : []
  );

  const handleToggleBrand = (brandId) => {
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
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '380px',
          width: '100%',
          borderRadius: '20px',
          padding: '20px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div className="modal-header" style={{ marginBottom: '12px' }}>
          <div>
            <h3 className="modal-title" style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
              Select Brands
            </h3>
            <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
              Assign to {form.heading || form.title || form.name}
            </p>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          {/* BIG "ALL BRANDS" BUTTON AT TOP */}
          <button
            type="button"
            onClick={handleSelectAllBrands}
            id="brand-modal-all-brands-btn"
            style={{
              width: '100%',
              padding: '13px 16px',
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
            margin: '14px 0 10px',
            paddingTop: '4px',
            borderTop: '1px solid #e2e8f0'
          }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Or Select Individual Brands ({brands.length})
            </span>
            {!isAllBrands && selectedBrands.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedBrands([])}
                style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Individual Brands Grid - Side by Side in small popup with Signature Brand Colors */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
            gap: '8px',
            maxHeight: '230px',
            overflowY: 'auto',
            marginBottom: '16px',
            padding: '2px 0'
          }}>
            {brands.map(brand => {
              const isSelected = !isAllBrands && selectedBrands.includes(brand.id);
              const brandColor = getBrandThemeColor(brand);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleToggleBrand(brand.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '24px',
                    border: `2px solid ${brandColor}`,
                    background: isSelected ? brandColor : '#ffffff',
                    color: isSelected ? '#ffffff' : brandColor,
                    fontWeight: 900,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? `0 4px 10px ${brandColor}40` : '0 1px 3px rgba(0,0,0,0.06)',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                  title={brand.displayName || brand.name}
                >
                  {isSelected ? (
                    <Check size={12} strokeWidth={3} />
                  ) : (
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: brandColor,
                      display: 'inline-block'
                    }} />
                  )}
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
              style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px' }}
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

// =========================================================================
// SUB-COMPONENT: EMPTY FORM DATA ENTRY
// For entering actual accounts / sales using this form template for any selected brand
// Directly saves to database inventory accounts or sales records!
// =========================================================================
function EmptyFormDataEntry({
  form,
  formType,
  brands = [],
  onBack,
  showToast,
  onNavigateToSale,
  onAccountCreated
}) {
  const assignedBrandIds = Array.isArray(form?.brands) ? form.brands : [];
  const availableBrands = form?.isAllBrands || assignedBrandIds.length === 0
    ? brands
    : brands.filter(b => assignedBrandIds.includes(b.id));

  const [selectedBrandId, setSelectedBrandId] = useState(availableBrands[0]?.id || brands[0]?.id || '');
  const [validity, setValidity] = useState('06 Months');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [planName, setPlanName] = useState('Premium 4K UHD');
  const [deviceName, setDeviceName] = useState('');
  const [pins, setPins] = useState(['1111', '2222', '3333', '4444', '5555']);
  const [screensCount, setScreensCount] = useState(5);
  const [amount, setAmount] = useState('799');
  const [customerName, setCustomerName] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [refName, setRefName] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedBrandObj = brands.find(b => b.id === selectedBrandId) || brands[0];

  const handleSaveToDatabase = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter an Account Email / ID', 'error');
      return;
    }
    if (!password.trim()) {
      showToast('Please enter an Account Password', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const screens = Array.from({ length: screensCount }, (_, i) => ({
        screenNumber: i + 1,
        name: `Screen-${String(i + 1).padStart(2, '0')}`,
        pin: pins[i] || '1234',
        deviceType: 'tv',
        status: 'empty',
        saleId: null,
        expiryDate: null
      }));

      await api.createInventory({
        brandId: selectedBrandId,
        email: email.trim(),
        password: password.trim(),
        validity,
        planVariant: planName,
        deviceName: deviceName.trim(),
        notes: `Created via ${form.heading || form.title || 'DataBase Form'}`,
        screensCount,
        screens
      });

      showToast(`Account saved to Database for ${selectedBrandObj?.displayName || 'Brand'}!`, 'success');
      setEmail('');
      setPassword('');
      setDeviceName('');
      if (onAccountCreated) onAccountCreated();
    } catch (err) {
      showToast('Failed to save account to database', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteSale = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerNumber.trim()) {
      showToast('Customer Name and Mobile Number are required', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        brandId: selectedBrandId,
        brandName: selectedBrandObj?.displayName || 'Netflix',
        accountEmail: email.trim() || 'account.user@gmail.com',
        accountPassword: password.trim() || 'password123',
        customerName: customerName.trim(),
        customerNumber: customerNumber.trim(),
        referenceName: refName.trim(),
        referenceNumber: refNumber.trim(),
        validity,
        amount: Number(amount) || 0,
        deviceName: deviceName.trim() || 'Living Room TV',
        screenNumber: 'Screen-1',
        screenPin: pins[0] || '1111',
        saleDate: new Date().toISOString().slice(0, 10),
        activationDate: new Date().toISOString().slice(0, 10),
        expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      };

      if (onNavigateToSale) {
        await onNavigateToSale(payload);
      } else {
        await api.createSale(payload);
        showToast('Sale record created in database!', 'success');
      }

      setCustomerName('');
      setCustomerNumber('');
      setRefName('');
      setRefNumber('');
    } catch (err) {
      showToast('Failed to save sale', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', padding: '16px' }}>
      <div style={{
        background: '#ffffff',
        border: '2px solid #cbd5e1',
        borderRadius: '20px',
        padding: '20px',
        boxShadow: '0 4px 18px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: '0 0 2px' }}>
              {formType === 'database' ? 'Add Account to Database' : 'Enter Sale Details'}
            </h3>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              Template: {form.heading || form.title}
            </span>
          </div>
          <span style={{
            background: formType === 'database' ? '#dcfce7' : '#ffedd5',
            color: formType === 'database' ? '#15803d' : '#c2410c',
            fontWeight: 900,
            fontSize: '11px',
            padding: '4px 10px',
            borderRadius: '10px'
          }}>
            {formType === 'database' ? 'Database Form' : 'Sale Form'}
          </span>
        </div>

        <form onSubmit={formType === 'database' ? handleSaveToDatabase : handleCompleteSale} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Brand Selector */}
          <div>
            <label className="form-label">
              OTT Brand <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <select
              value={selectedBrandId}
              onChange={e => setSelectedBrandId(e.target.value)}
              className="form-input-pill"
              style={{ width: '100%', fontWeight: 800 }}
            >
              {availableBrands.map(b => (
                <option key={b.id} value={b.id}>{b.displayName || b.name}</option>
              ))}
            </select>
          </div>

          {/* Validity Selector */}
          <div>
            <label className="form-label">Validity</label>
            <select
              value={validity}
              onChange={e => setValidity(e.target.value)}
              className="form-input-pill"
              style={{ width: '100%', fontWeight: 700 }}
            >
              <option value="01 Month">01 Month</option>
              <option value="03 Months">03 Months</option>
              <option value="06 Months">06 Months</option>
              <option value="12 Months">12 Months</option>
            </select>
          </div>

          {/* Credentials: Email & Password */}
          <div>
            <label className="form-label">
              Account Email / ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. netflix.premium@gmail.com"
              className="form-input-pill"
              required
            />
          </div>

          <div>
            <label className="form-label">
              Account Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter account password"
                className="form-input-pill"
                style={{ paddingRight: '40px' }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* PINs row for Database Form */}
          {formType === 'database' && (
            <div>
              <label className="form-label">Screen PINs</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                {[0, 1, 2, 3, 4].map(idx => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={4}
                    value={pins[idx] || ''}
                    onChange={e => {
                      const newP = [...pins];
                      newP[idx] = e.target.value;
                      setPins(newP);
                    }}
                    placeholder={`P${idx + 1}`}
                    style={{
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      textAlign: 'center',
                      fontWeight: 800,
                      fontSize: '12px'
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Customer fields for Sale Form */}
          {formType === 'sale' && (
            <>
              <div>
                <label className="form-label">Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="₹ 799"
                  className="form-input-pill"
                />
              </div>

              <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', display: 'block', marginBottom: '8px' }}>
                  Customer Details
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Customer Name *"
                    className="form-input-pill"
                    required
                  />
                  <input
                    type="tel"
                    value={customerNumber}
                    onChange={e => setCustomerNumber(e.target.value)}
                    placeholder="Customer Mobile Number *"
                    className="form-input-pill"
                    required
                  />
                  <input
                    type="text"
                    value={refName}
                    onChange={e => setRefName(e.target.value)}
                    placeholder="Reference Name (Optional)"
                    className="form-input-pill"
                  />
                  <input
                    type="tel"
                    value={refNumber}
                    onChange={e => setRefNumber(e.target.value)}
                    placeholder="Reference Number (Optional)"
                    className="form-input-pill"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="form-label">Device Name (Optional)</label>
            <input
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="e.g. Living Room TV, Mobile"
              className="form-input-pill"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px' }}
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={formType === 'database' ? 'glossy-btn glossy-btn-green' : 'glossy-btn glossy-btn-orange'}
              style={{ flex: 1.5, padding: '12px', borderRadius: '12px', fontSize: '13.5px', fontWeight: 900 }}
            >
              {isSubmitting ? 'Saving...' : (formType === 'database' ? 'Save to Database' : 'Complete Sale')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
