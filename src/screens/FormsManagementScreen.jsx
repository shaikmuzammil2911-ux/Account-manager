import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Plus, FileText, ChevronRight, CheckCircle2,
  Layers, Edit2, Trash2, Eye, EyeOff, Lock, Unlock,
  Check, Tv, Calendar, X, AlertTriangle, ShieldCheck
} from 'lucide-react';
import SaleScreen from './SaleScreen';
import InventoryScreen from './InventoryScreen';
import OttLogo from '../components/OttLogos';
import { api } from '../api/client';

export default function FormsManagementScreen({
  brands = [],
  selectedBrand,
  onSelectBrand,
  onNavigateToSale,
  onBack,
  showToast
}) {
  // Active Section: 'sale' | 'database'
  const [activeSection, setActiveSection] = useState('sale');

  // Opened Form state: null (management page) | { type: 'sale' | 'database', template: object }
  const [openedForm, setOpenedForm] = useState(null);

  // Data states
  const [groups, setGroups] = useState([]);
  const [customForms, setCustomForms] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // null for create, object for edit

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingForm, setEditingForm] = useState(null); // null for create, object for edit

  const [brandAssignForm, setBrandAssignForm] = useState(null); // form object to assign brands
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { type: 'group' | 'form', item: object }

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

  // Preset Colors for Group Picker
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

  const handleOpenEditGroup = (grp) => {
    setEditingGroup(grp);
    setGroupName(grp.name || '');
    setGroupHeading(grp.heading || grp.name || '');
    setGroupSubheading(grp.subheading || '');
    setGroupColor(grp.color || '#2563eb');
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

  const handleDeleteGroup = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'group') return;
    try {
      await api.deleteGroup(deleteConfirm.item.id);
      showToast('Group deleted (associated templates preserved)', 'info');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      showToast('Failed to delete group', 'error');
    }
  };

  // =========================================================================
  // FORM TEMPLATE CRUD HANDLERS
  // =========================================================================
  const handleOpenCreateForm = () => {
    const currentList = customForms.filter(f => f.type === activeSection);
    const nextNum = String(currentList.length + 1).padStart(2, '0');
    const defaultTitle = activeSection === 'sale' ? `SALE FORM ${nextNum}` : `DATABASE FORM ${nextNum}`;

    setEditingForm(null);
    setFormType(activeSection);
    setFormTitle(defaultTitle);
    setFormHeading(activeSection === 'sale' ? 'OTT Sale Form' : 'OTT Accounts Database');
    setFormSubheading('');
    setFormGroupId(groups[0]?.id || '');
    setFormBrands(brands.slice(0, 3).map(b => b.id)); // default first few brands
    setFormIsDefault(currentList.length === 0);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (form) => {
    setEditingForm(form);
    setFormType(form.type || activeSection);
    setFormTitle(form.title || form.name || 'FORM');
    setFormHeading(form.heading || form.title || form.name || '');
    setFormSubheading(form.subheading || '');
    setFormGroupId(form.groupId || '');
    setFormBrands(Array.isArray(form.brands) ? form.brands : []);
    setFormIsDefault(Boolean(form.isDefault));
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
        brands: formBrands,
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

  const handleDeleteForm = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'form') return;
    try {
      await api.deleteCustomForm(deleteConfirm.item.id);
      showToast('Form template deleted successfully', 'info');
      setDeleteConfirm(null);
      await loadData();
    } catch (err) {
      showToast('Failed to delete form template', 'error');
    }
  };

  // Quick Brand Assignment Save
  const handleSaveBrandAssignment = async (formId, newBrands) => {
    try {
      await api.updateCustomForm(formId, { brands: newBrands });
      setBrandAssignForm(null);
      showToast('Assigned brands updated successfully!', 'success');
      await loadData();
    } catch (err) {
      showToast('Failed to update brand assignment', 'error');
    }
  };

  // =========================================================================
  // VIEW: OPENED FULL FORM (Sale Form or Database Form)
  // =========================================================================
  if (openedForm) {
    if (openedForm.type === 'sale') {
      return (
        <div className="opened-form-wrapper" style={{ paddingBottom: '90px' }}>
          {/* Header */}
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
              title="Back to Forms"
              id="opened-sale-back-btn"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {openedForm.template.title || 'Sale Form'}
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#2563eb' }}>
                {openedForm.template.heading || 'Active Sale Form'}
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
      // Find starting brand for this template
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
              title="Back to Forms"
              id="opened-db-back-btn"
            >
              <ArrowLeft size={20} />
            </button>

            <div style={{ textAlign: 'center' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                {openedForm.template.title || 'Data Base Form'}
              </h2>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>
                {openedForm.template.heading || 'Accounts Database'}
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

  // Filter templates for current active section
  const sectionForms = customForms.filter(f => f.type === activeSection);

  // Group forms by group ID
  const groupedForms = {};
  groups.forEach(g => {
    groupedForms[g.id] = sectionForms.filter(f => f.groupId === g.id);
  });
  const unassignedForms = sectionForms.filter(f => !f.groupId || !groups.some(g => g.id === f.groupId));

  return (
    <div className="forms-list-page" style={{ paddingBottom: '90px' }}>
      {/* ========================================================================= */}
      {/* 1. TOP HEADER (Back button, Forms heading, Create Form button)            */}
      {/* ========================================================================= */}
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
          id="forms-main-back-btn"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Top Middle Heading */}
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '19px', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.3px' }}>
            Forms
          </h1>
        </div>

        {/* Top Right Create Form Button */}
        <button
          type="button"
          onClick={handleOpenCreateForm}
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
          id="forms-create-form-top-btn"
        >
          <Plus size={16} strokeWidth={3} />
          <span>Create Form</span>
        </button>
      </div>

      <div style={{ padding: '16px' }}>
        {/* ========================================================================= */}
        {/* 2. TWO PRIMARY BUTTONS (1. Sale Form & 2. Data Base Form)                */}
        {/* ========================================================================= */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* Button 1: 1). Sale Form */}
          <button
            type="button"
            onClick={() => setActiveSection('sale')}
            id="forms-tab-sale"
            className={activeSection === 'sale' ? 'glossy-btn glossy-btn-blue' : 'glossy-btn glossy-btn-gray'}
            style={{
              padding: '14px 12px',
              fontSize: '15px',
              fontWeight: 900,
              borderRadius: '14px',
              border: activeSection === 'sale' ? '2px solid #1d4ed8' : '1.5px solid #cbd5e1',
              boxShadow: activeSection === 'sale' ? '0 4px 14px rgba(37,99,235,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            1). Sale Form
          </button>

          {/* Button 2: 2). Data Base Form */}
          <button
            type="button"
            onClick={() => setActiveSection('database')}
            id="forms-tab-database"
            className={activeSection === 'database' ? 'glossy-btn glossy-btn-green' : 'glossy-btn glossy-btn-gray'}
            style={{
              padding: '14px 12px',
              fontSize: '15px',
              fontWeight: 900,
              borderRadius: '14px',
              border: activeSection === 'database' ? '2px solid #15803d' : '1.5px solid #cbd5e1',
              boxShadow: activeSection === 'database' ? '0 4px 14px rgba(22,163,74,0.3)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            2). Data Base Form
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 3. CREATE GROUP BUTTON (Directly below the 02 primary buttons)             */}
        {/* ========================================================================= */}
        <div style={{ marginBottom: '20px' }}>
          <button
            type="button"
            onClick={handleOpenCreateGroup}
            id="forms-create-group-btn"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: '14px',
              background: '#ffffff',
              border: '2px dashed #93c5fd',
              color: '#1d4ed8',
              fontSize: '14px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#2563eb'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#93c5fd'; }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create Group (New Batch)</span>
          </button>
        </div>

        {/* Section Heading & Counter */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
              {activeSection === 'sale' ? 'Sale Form Templates' : 'Database Form Templates'}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0' }}>
              Compact cards with assigned brand chips & instant live preview
            </p>
          </div>
          <span style={{
            background: '#f1f5f9',
            padding: '4px 10px',
            borderRadius: '10px',
            fontSize: '12px',
            fontWeight: 800,
            color: '#475569'
          }}>
            {sectionForms.length} {sectionForms.length === 1 ? 'Form' : 'Forms'}
          </span>
        </div>

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748b' }}>
            Loading forms...
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. TEMPLATE CARDS LIST (Grouped by Groups & Unassigned)                   */}
        {/* ========================================================================= */}
        {!loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Render Groups */}
            {groups.map(grp => {
              const formsInGroup = groupedForms[grp.id] || [];
              return (
                <div key={grp.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Group Header Banner */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    background: '#f8fafc',
                    borderLeft: `5px solid ${grp.color || '#2563eb'}`,
                    borderTop: '1px solid #e2e8f0',
                    borderRight: '1px solid #e2e8f0',
                    borderBottom: '1px solid #e2e8f0'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: grp.color || '#2563eb'
                      }} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14.5px', fontWeight: 900, color: '#0f172a' }}>
                            {grp.heading || grp.name}
                          </span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', background: '#ffffff', padding: '2px 6px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            Group: {grp.name}
                          </span>
                        </div>
                        {grp.subheading && (
                          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                            {grp.subheading}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditGroup(grp)}
                        className="header-btn"
                        style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                        title="Edit Group"
                      >
                        <Edit2 size={14} color="#475569" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({ type: 'group', item: grp })}
                        className="header-btn"
                        style={{ width: '32px', height: '32px', borderRadius: '8px' }}
                        title="Delete Group"
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>

                  {/* Forms in this group */}
                  {formsInGroup.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1.5px dashed #cbd5e1',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: '12.5px',
                      fontWeight: 600
                    }}>
                      No {activeSection === 'sale' ? 'sale' : 'database'} forms in this group yet.
                    </div>
                  ) : (
                    formsInGroup.map(form => renderFormCard(form))
                  )}
                </div>
              );
            })}

            {/* Unassigned forms (if any) */}
            {unassignedForms.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 800
                }}>
                  General Forms ({unassignedForms.length})
                </div>
                {unassignedForms.map(form => renderFormCard(form))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT GROUP (Name, Heading, Subheading, Color)          */}
      {/* ========================================================================= */}
      {showGroupModal && (
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
                  placeholder="e.g. Shared OTT Profiles"
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
                  placeholder="e.g. 4K Ultra HD & 5-Screen Profiles"
                />
              </div>

              {/* Group Color Picker */}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATE / EDIT FORM TEMPLATE                                      */}
      {/* ========================================================================= */}
      {showFormModal && (
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
                  placeholder="e.g. Multi-Brand OTT Subscription"
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

              {/* Assigned Brands Chips Selector */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Assigned Brands</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setFormBrands(brands.map(b => b.id))}
                      style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      All Brands
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button
                      type="button"
                      onClick={() => setFormBrands([])}
                      style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto', padding: '4px 0' }}>
                  {brands.map(brand => {
                    const isSelected = formBrands.includes(brand.id);
                    return (
                      <button
                        key={brand.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormBrands(prev => prev.filter(id => id !== brand.id));
                          } else {
                            setFormBrands(prev => [...prev, brand.id]);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 10px',
                          borderRadius: '20px',
                          border: isSelected ? `2px solid ${brand.color || '#2563eb'}` : '1.5px solid #cbd5e1',
                          background: isSelected ? (brand.color || '#2563eb') : '#ffffff',
                          color: isSelected ? '#ffffff' : '#334155',
                          fontWeight: 800,
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                        <span>{brand.displayName || brand.name}</span>
                      </button>
                    );
                  })}
                </div>
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BRAND ASSIGNMENT QUICK MODAL                                     */}
      {/* ========================================================================= */}
      {brandAssignForm && (
        <BrandAssignmentModal
          form={brandAssignForm}
          brands={brands}
          onSave={(newBrands) => handleSaveBrandAssignment(brandAssignForm.id, newBrands)}
          onClose={() => setBrandAssignForm(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE CONFIRMATION MODAL                                        */}
      {/* ========================================================================= */}
      {deleteConfirm && (
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
              Delete {deleteConfirm.type === 'group' ? 'Group' : 'Form Template'}?
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '18px' }}>
              {deleteConfirm.type === 'group' ? (
                <>
                  Are you sure you want to delete <strong>{deleteConfirm.item.name}</strong>?
                  Forms inside this group will NOT be deleted; they will become unassigned.
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong>{deleteConfirm.item.title || deleteConfirm.item.name}</strong>?
                  Historical customer sales will remain safe.
                </>
              )}
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
                onClick={deleteConfirm.type === 'group' ? handleDeleteGroup : handleDeleteForm}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // =========================================================================
  // HELPER: RENDER FORM CARD (Compact Card matching reference screenshots)
  // =========================================================================
  function renderFormCard(form) {
    const isSale = form.type === 'sale';
    const assignedBrands = (form.brands || []).map(bId => brands.find(b => b.id === bId)).filter(Boolean);

    if (isSale) {
      // Compact Sale Form Card
      return (
        <div
          key={form.id}
          className="form-compact-card"
          id={`form-card-${form.id}`}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: form.isDefault ? '2px solid #2563eb' : '1.5px solid #cbd5e1',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.05)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Card Top: Title, Heading, Subheading & Default badge */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  {form.title || form.name}
                </h3>
                {form.isDefault && (
                  <span style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    padding: '2px 8px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    <CheckCircle2 size={12} color="#2563eb" />
                    DEFAULT
                  </span>
                )}
              </div>
              {form.heading && (
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginTop: '2px' }}>
                  {form.heading}
                </div>
              )}
            </div>
          </div>

          {/* Assigned Brands Chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {assignedBrands.length === 0 ? (
              <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                No brands assigned &bull; Tap 'Select Brands' to configure
              </span>
            ) : (
              assignedBrands.map(b => (
                <span
                  key={b.id}
                  style={{
                    background: b.color || '#2563eb',
                    color: '#ffffff',
                    padding: '3px 10px',
                    borderRadius: '16px',
                    fontSize: '11.5px',
                    fontWeight: 800,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {b.displayName || b.name}
                </span>
              ))
            )}
          </div>

          {/* Compact Form Fields Preview (Representative layout) */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {/* Row 1: Brand & Validity */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#0f172a', color: '#ffffff', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Brand: {assignedBrands[0]?.displayName || 'Netflix'}</span>
                <span>▾</span>
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px', fontSize: '11px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Validity: 12 Months</span>
                <span>▾</span>
              </div>
            </div>

            {/* Row 2: Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px', fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                From: 17-Oct-2026
              </div>
              <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px', fontSize: '10.5px', fontWeight: 700, color: '#475569' }}>
                To: 17-Oct-2027
              </div>
            </div>

            {/* Row 3: Credentials */}
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px', alignItems: 'center' }}>
              <span style={{ background: '#2563eb', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '10.5px', fontWeight: 800 }}>ID</span>
              <span style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>account.user@gmail.com</span>
            </div>

            {/* Row 4: Screen & Amount */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ background: '#fefce8', border: '1px solid #fde047', borderRadius: '6px', padding: '4px 8px', fontSize: '10.5px', fontWeight: 800, color: '#854d0e' }}>
                Screen-1 &bull; PIN: 1111
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '4px 8px', fontSize: '10.5px', fontWeight: 800, color: '#1e40af' }}>
                Amount: ₹1,599
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setBrandAssignForm(form)}
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                title="Assign Brands"
              >
                Select Brands
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditForm(form)}
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                title="Edit Template"
              >
                Edit
              </button>
              {!form.isDefault && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ type: 'form', item: form })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}
                  title="Delete Template"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpenedForm({ type: 'sale', template: form })}
              className="glossy-btn glossy-btn-blue"
              style={{
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Open Form</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      );
    } else {
      // Compact Database Form Card matching image copy 29
      return (
        <div
          key={form.id}
          className="form-compact-card"
          id={`form-card-${form.id}`}
          style={{
            background: '#ffffff',
            borderRadius: '20px',
            border: form.isDefault ? '2px solid #0f172a' : '1.5px solid #cbd5e1',
            boxShadow: '0 3px 12px rgba(0, 0, 0, 0.05)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Top Brand Chips matching Screenshot image copy 29 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {assignedBrands.length === 0 ? (
                <span style={{ fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No brands assigned
                </span>
              ) : (
                assignedBrands.map(b => (
                  <span
                    key={b.id}
                    style={{
                      background: b.color || '#e50914',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 900,
                      letterSpacing: '0.4px',
                      textTransform: 'uppercase',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                    }}
                  >
                    {b.name || b.displayName}
                  </span>
                ))
              )}
            </div>

            {form.isDefault && (
              <span style={{
                background: '#f0fdf4',
                color: '#16a34a',
                border: '1px solid #bbf7d0',
                padding: '2px 8px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800
              }}>
                DEFAULT
              </span>
            )}
          </div>

          {/* Inner Card Preview matching image copy 29 */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #cbd5e1',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Top row: Ribbon, Screens count, Validity pill, Checkbox */}
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

              <div style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>
                3/5 Screens Available
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
              <div style={{ background: '#2563eb', color: '#ffffff', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
                ID
              </div>
              <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '5px 10px', fontSize: '11.5px', fontWeight: 600, color: '#0f172a' }}>
                netflix.user01@gmail.com
              </div>
            </div>

            {/* Password row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ background: '#7c3aed', color: '#ffffff', padding: '5px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 800, minWidth: '60px', textAlign: 'center' }}>
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
                <div key={n} style={{ background: '#ea580c', color: '#ffffff', borderRadius: '6px', padding: '4px 2px', textAlign: 'center', fontSize: '9.5px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                  Screen {n}
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setBrandAssignForm(form)}
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                title="Assign Brands"
              >
                Select Brands
              </button>
              <button
                type="button"
                onClick={() => handleOpenEditForm(form)}
                className="glossy-btn glossy-btn-gray"
                style={{ padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
                title="Edit Template"
              >
                Edit
              </button>
              {!form.isDefault && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ type: 'form', item: form })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#dc2626',
                    padding: '6px 8px',
                    cursor: 'pointer'
                  }}
                  title="Delete Template"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpenedForm({ type: 'database', template: form })}
              className="glossy-btn glossy-btn-green"
              style={{
                padding: '7px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Open Data Base</span>
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      );
    }
  }
}

// =========================================================================
// SUB-COMPONENT: BRAND ASSIGNMENT MODAL
// =========================================================================
function BrandAssignmentModal({ form, brands, onSave, onClose }) {
  const [selectedBrands, setSelectedBrands] = useState(Array.isArray(form.brands) ? form.brands : []);

  const handleToggle = (bId) => {
    setSelectedBrands(prev =>
      prev.includes(bId) ? prev.filter(x => x !== bId) : [...prev, bId]
    );
  };

  const handleSelectAll = () => {
    setSelectedBrands(brands.map(b => b.id));
  };

  const handleClearAll = () => {
    setSelectedBrands([]);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Brand Selection</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              Assign {form.title || form.name} to one, multiple, or all brands
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a' }}>
              Available Platforms ({brands.length})
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{ border: 'none', background: 'none', color: '#2563eb', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Select All
              </button>
              <span style={{ color: '#cbd5e1' }}>|</span>
              <button
                type="button"
                onClick={handleClearAll}
                style={{ border: 'none', background: 'none', color: '#dc2626', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Deselect All
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '240px', overflowY: 'auto', marginBottom: '16px' }}>
            {brands.map(brand => {
              const isSelected = selectedBrands.includes(brand.id);
              return (
                <button
                  key={brand.id}
                  type="button"
                  onClick={() => handleToggle(brand.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '24px',
                    border: isSelected ? `2px solid ${brand.color || '#2563eb'}` : '1.5px solid #cbd5e1',
                    background: isSelected ? (brand.color || '#2563eb') : '#ffffff',
                    color: isSelected ? '#ffffff' : '#334155',
                    fontWeight: 800,
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                    transition: 'all 0.15s'
                  }}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                  <span>{brand.displayName || brand.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-gray"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              style={{ flex: 1, padding: '10px', borderRadius: '10px' }}
              onClick={() => onSave(selectedBrands)}
            >
              Save Assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
