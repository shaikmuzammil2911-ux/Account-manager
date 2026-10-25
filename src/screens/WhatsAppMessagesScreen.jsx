import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, ShoppingBag, Bell, Upload, Trash2, Image as ImageIcon,
  Save, RotateCcw, ArrowLeft, Check, Copy, ExternalLink, Sparkles, Send, CheckCheck,
  Plus, CopyCheck, Edit3, CheckCircle2, FolderPlus, Layers, HelpCircle
} from 'lucide-react';
import { api } from '../api/client';
import {
  DEFAULT_SALE_WHATSAPP_TEMPLATE,
  DEFAULT_EXPIRY_WHATSAPP_TEMPLATE,
  DEFAULT_WHATSAPP_CATEGORIES,
  DEFAULT_WHATSAPP_TEMPLATES,
  fillTemplate
} from '../utils/whatsapp';

export default function WhatsAppMessagesScreen({ currentUser, onBack, showToast }) {
  // activeView: 'hub' | 'category' | 'editor'
  const [activeView, setActiveView] = useState('hub');
  const [selectedCategoryId, setSelectedCategoryId] = useState('sale');
  const [editingTemplateId, setEditingTemplateId] = useState(null);

  const [categories, setCategories] = useState(DEFAULT_WHATSAPP_CATEGORIES);
  const [templates, setTemplates] = useState(DEFAULT_WHATSAPP_TEMPLATES);

  // Editor Draft State
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftImage, setDraftImage] = useState(null);
  const [draftIsActive, setDraftIsActive] = useState(false);

  // Modal for creating custom category
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);
  const editorTextareaRef = useRef(null);

  // Sample mock data for live WhatsApp chat preview
  const mockPreviewData = {
    customerName: 'Kishore Kumar',
    customerNumber: '9876543210',
    brandName: 'Netflix',
    planVariant: '4K Ultra HD',
    accountEmail: 'netflix.user01@gmail.com',
    accountPassword: 'Nfl!x2026@Secure',
    screenNumber: '02',
    screenPin: '2468',
    amount: '899',
    deviceName: 'Samsung TV',
    validity: '03 Months',
    activationDate: '24-Oct-2026',
    expiryDate: '17-Jan-2027',
    remainingDays: '10',
    daysRemaining: '10',
    overdueDays: '0',
    expiryStatus: '10 days remaining',
    renewalAmount: '899',
    referenceName: 'Sunil',
    referenceNumber: '9123456780'
  };

  // Load saved templates and categories from backend
  const loadAuthoritativeSettings = async () => {
    try {
      setLoading(true);
      const settings = await api.getSettings(currentUser?.email);
      if (settings) {
        // 1. Categories
        if (Array.isArray(settings.whatsappCategories) && settings.whatsappCategories.length > 0) {
          setCategories(settings.whatsappCategories);
        } else {
          setCategories(DEFAULT_WHATSAPP_CATEGORIES);
        }

        // 2. Templates
        let loadedTemplates = Array.isArray(settings.whatsappTemplates) && settings.whatsappTemplates.length > 0
          ? settings.whatsappTemplates
          : DEFAULT_WHATSAPP_TEMPLATES;

        // Cleanse any unwanted "Custom template from test" strings
        loadedTemplates = loadedTemplates.map(t => {
          let content = t.content || '';
          if (content.includes('Custom template from test')) {
            content = t.categoryId === 'sale' ? DEFAULT_SALE_WHATSAPP_TEMPLATE : DEFAULT_EXPIRY_WHATSAPP_TEMPLATE;
          }
          return { ...t, content };
        });

        // Ensure legacy customized sale/expiry templates are respected as the active templates
        if (settings.whatsappSaleTemplate && !settings.whatsappSaleTemplate.includes('Custom template from test')) {
          const saleIdx = loadedTemplates.findIndex(t => t.categoryId === 'sale' && t.isActive);
          if (saleIdx !== -1) {
            loadedTemplates[saleIdx].content = settings.whatsappSaleTemplate;
          }
        }
        if (settings.whatsappExpiryTemplate) {
          const expIdx = loadedTemplates.findIndex(t => t.categoryId === 'expiry' && t.isActive);
          if (expIdx !== -1) {
            loadedTemplates[expIdx].content = settings.whatsappExpiryTemplate;
            if (settings.whatsappExpiryImage) {
              loadedTemplates[expIdx].imageUrl = settings.whatsappExpiryImage;
            }
          }
        }

        setTemplates(loadedTemplates);
      }
    } catch (e) {
      console.warn('Settings load notice:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Purge any stale test templates from localStorage immediately
    try {
      const cached = localStorage.getItem('accounts_whatsapp_sale_template');
      if (cached && cached.includes('Custom template from test')) {
        localStorage.removeItem('accounts_whatsapp_sale_template');
      }
    } catch (e) {}

    loadAuthoritativeSettings();
  }, [currentUser]);

  // Open Template Editor for editing an existing template or creating a new one
  const handleOpenEditor = (templateToEdit, categoryId) => {
    if (templateToEdit) {
      setEditingTemplateId(templateToEdit.id);
      setSelectedCategoryId(templateToEdit.categoryId);
      setDraftName(templateToEdit.name);
      setDraftContent(templateToEdit.content);
      setDraftImage(templateToEdit.imageUrl || null);
      setDraftIsActive(Boolean(templateToEdit.isActive));
    } else {
      // Create new template in categoryId
      setEditingTemplateId(null);
      setSelectedCategoryId(categoryId);
      const catTemplates = templates.filter(t => t.categoryId === categoryId);
      const nextNum = catTemplates.length + 1;
      const baseDefault = categoryId === 'sale'
        ? DEFAULT_SALE_WHATSAPP_TEMPLATE
        : (categoryId === 'expiry' ? DEFAULT_EXPIRY_WHATSAPP_TEMPLATE : 'Hello {customerName}!\n\nYour update details:\n...');

      setDraftName(`Template ${String(nextNum).padStart(2, '0')} — Custom Message`);
      setDraftContent(baseDefault);
      setDraftImage(null);
      setDraftIsActive(catTemplates.length === 0); // Active only if first in category
    }
    setActiveView('editor');
  };

  // Save the current draft template
  const handleSaveDraft = async () => {
    if (!draftName.trim()) {
      showToast('Please provide a template name', 'error');
      return;
    }
    if (!draftContent.trim()) {
      showToast('Please provide message text for the template', 'error');
      return;
    }

    setSaving(true);
    const nowIso = new Date().toISOString();

    let updatedList = [...templates];

    if (editingTemplateId) {
      // Update existing template
      updatedList = updatedList.map(t => {
        if (t.id === editingTemplateId) {
          return {
            ...t,
            name: draftName.trim(),
            content: draftContent,
            imageUrl: draftImage,
            updatedAt: nowIso
          };
        }
        return t;
      });
    } else {
      // Create brand new template
      const newTemplate = {
        id: `tpl_${selectedCategoryId}_${Date.now()}`,
        categoryId: selectedCategoryId,
        name: draftName.trim(),
        content: draftContent,
        imageUrl: draftImage,
        isActive: draftIsActive,
        createdAt: nowIso,
        updatedAt: nowIso
      };

      // If active, deactivate others in this category
      if (draftIsActive) {
        updatedList = updatedList.map(t => t.categoryId === selectedCategoryId ? { ...t, isActive: false } : t);
      }
      updatedList.push(newTemplate);
    }

    // Determine active templates to synchronize legacy fields
    const activeSale = updatedList.find(t => t.categoryId === 'sale' && t.isActive) || updatedList.find(t => t.categoryId === 'sale');
    const activeExp = updatedList.find(t => t.categoryId === 'expiry' && t.isActive) || updatedList.find(t => t.categoryId === 'expiry');

    try {
      const payload = {
        whatsappCategories: categories,
        whatsappTemplates: updatedList,
        whatsappSaleTemplate: activeSale ? activeSale.content : DEFAULT_SALE_WHATSAPP_TEMPLATE,
        whatsappExpiryTemplate: activeExp ? activeExp.content : DEFAULT_EXPIRY_WHATSAPP_TEMPLATE,
        whatsappExpiryImage: activeExp ? (activeExp.imageUrl || '') : ''
      };

      await api.updateSettings(payload, currentUser?.email);

      // Local storage cache sync
      try {
        if (activeSale) localStorage.setItem('accounts_whatsapp_sale_template', activeSale.content);
        if (activeExp) {
          localStorage.setItem('accounts_whatsapp_expiry_template', activeExp.content);
          if (activeExp.imageUrl) localStorage.setItem('accounts_whatsapp_expiry_image', activeExp.imageUrl);
        }
      } catch (e) {}

      setTemplates(updatedList);
      showToast(`Template "${draftName.trim()}" saved successfully!`, 'success');
      setActiveView('category');
    } catch (err) {
      showToast('Saved locally. Backend sync issue: ' + (err.message || 'Check connection'), 'info');
      setTemplates(updatedList);
      setActiveView('category');
    } finally {
      setSaving(false);
    }
  };

  // Atomically set a template as the single Active default for its category
  const handleSetActive = async (templateId, categoryId) => {
    setSaving(true);
    const updatedList = templates.map(t => {
      if (t.categoryId === categoryId) {
        return { ...t, isActive: t.id === templateId };
      }
      return t;
    });

    const activeSale = updatedList.find(t => t.categoryId === 'sale' && t.isActive) || updatedList.find(t => t.categoryId === 'sale');
    const activeExp = updatedList.find(t => t.categoryId === 'expiry' && t.isActive) || updatedList.find(t => t.categoryId === 'expiry');

    try {
      await api.updateSettings({
        whatsappTemplates: updatedList,
        whatsappSaleTemplate: activeSale ? activeSale.content : undefined,
        whatsappExpiryTemplate: activeExp ? activeExp.content : undefined,
        whatsappExpiryImage: activeExp ? (activeExp.imageUrl || '') : undefined
      }, currentUser?.email);

      try {
        if (categoryId === 'sale' && activeSale) {
          localStorage.setItem('accounts_whatsapp_sale_template', activeSale.content);
        }
        if (categoryId === 'expiry' && activeExp) {
          localStorage.setItem('accounts_whatsapp_expiry_template', activeExp.content);
          if (activeExp.imageUrl) localStorage.setItem('accounts_whatsapp_expiry_image', activeExp.imageUrl);
        }
      } catch (e) {}

      setTemplates(updatedList);
      const chosen = updatedList.find(t => t.id === templateId);
      showToast(`"${chosen?.name}" is now the active default!`, 'success');
    } catch (err) {
      showToast('Failed to set active template: ' + (err.message || 'Unknown error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  // Duplicate template (starts inactive)
  const handleDuplicateTemplate = async (template) => {
    setSaving(true);
    const nowIso = new Date().toISOString();
    const newTemplate = {
      ...template,
      id: `tpl_${template.categoryId}_${Date.now()}`,
      name: `Copy of ${template.name}`,
      isActive: false, // Duplicates start inactive
      createdAt: nowIso,
      updatedAt: nowIso
    };

    const updatedList = [...templates, newTemplate];

    try {
      await api.updateSettings({ whatsappTemplates: updatedList }, currentUser?.email);
      setTemplates(updatedList);
      showToast(`Duplicated as "${newTemplate.name}"`, 'success');
    } catch (err) {
      showToast('Error duplicating template: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Delete template (if active, require selecting a replacement or prevent deletion)
  const handleDeleteTemplate = async (template) => {
    const catTemplates = templates.filter(t => t.categoryId === template.categoryId);

    if (template.isActive) {
      if (catTemplates.length <= 1) {
        showToast('Cannot delete the only template in this category. Create another first.', 'error');
        return;
      }
      showToast('This template is currently active. Please set another template active before deleting.', 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    setSaving(true);
    const updatedList = templates.filter(t => t.id !== template.id);

    try {
      await api.updateSettings({ whatsappTemplates: updatedList }, currentUser?.email);
      setTemplates(updatedList);
      showToast(`Deleted "${template.name}"`, 'info');
    } catch (err) {
      showToast('Error deleting template: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Create Custom Category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('Please enter a category name', 'error');
      return;
    }
    const slug = newCategoryName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    if (categories.some(c => c.id === slug)) {
      showToast('A category with a similar name already exists', 'error');
      return;
    }

    const newCat = {
      id: slug,
      name: newCategoryName.trim(),
      description: newCategoryDesc.trim() || 'Custom customer notifications'
    };

    const updatedCats = [...categories, newCat];

    // Seed with a starter template
    const starterTemplate = {
      id: `tpl_${slug}_default`,
      categoryId: slug,
      name: `${newCategoryName.trim()} Default`,
      content: `Hello {customerName}!\n\nThis is an update regarding your {brandName} subscription.\n\nExpiry Date: {expiryDate}\n\nRegards,\n*OTTMoneySaver.Com*`,
      isActive: true,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedTemplates = [...templates, starterTemplate];

    try {
      await api.updateSettings({
        whatsappCategories: updatedCats,
        whatsappTemplates: updatedTemplates
      }, currentUser?.email);

      setCategories(updatedCats);
      setTemplates(updatedTemplates);
      setShowCreateCategoryModal(false);
      setNewCategoryName('');
      setNewCategoryDesc('');
      showToast(`Category "${newCat.name}" created!`, 'success');
      setSelectedCategoryId(slug);
      setActiveView('category');
    } catch (err) {
      showToast('Error creating category: ' + err.message, 'error');
    }
  };

  // Handle Image Upload for draft template
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      showToast('Image size should be less than 3MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setDraftImage(event.target.result);
      showToast('Picture uploaded! Remember to Save Template.', 'success');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setDraftImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Picture removed', 'info');
  };

  // Insert tag at textarea cursor
  const insertTagAtCursor = (tag) => {
    const textarea = editorTextareaRef.current;
    if (!textarea) {
      setDraftContent(prev => prev + ` {${tag}}`);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = draftContent;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    const newText = `${before}{${tag}}${after}`;
    setDraftContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + tag.length + 2;
    }, 50);
  };

  // Tag definitions for categories
  const saleTags = [
    { label: 'Customer Name', tag: 'customerName' },
    { label: 'Phone Number', tag: 'customerNumber' },
    { label: 'Brand Name', tag: 'brandName' },
    { label: 'Plan Variant', tag: 'planVariant' },
    { label: 'ID / Email', tag: 'accountEmail' },
    { label: 'Password', tag: 'accountPassword' },
    { label: 'Screen No', tag: 'screenNumber' },
    { label: 'Screen PIN', tag: 'screenPin' },
    { label: 'Amount', tag: 'amount' },
    { label: 'Device Name', tag: 'deviceName' },
    { label: 'Validity', tag: 'validity' },
    { label: 'Activation Date', tag: 'activationDate' },
    { label: 'Expiry Date', tag: 'expiryDate' },
    { label: 'Ref Name', tag: 'referenceName' },
    { label: 'Ref Number', tag: 'referenceNumber' } // ISSUE 1: Ref Number right beside Ref Name!
  ];

  const expiryTags = [
    { label: 'Customer Name', tag: 'customerName' },
    { label: 'Brand Name', tag: 'brandName' },
    { label: 'Screen No', tag: 'screenNumber' },
    { label: 'Screen PIN', tag: 'screenPin' },
    { label: 'Expiry Date', tag: 'expiryDate' },
    { label: 'Remaining Days', tag: 'remainingDays' },
    { label: 'Overdue Days', tag: 'overdueDays' },
    { label: 'Expiry Status', tag: 'expiryStatus' },
    { label: 'Days Left', tag: 'daysRemaining' },
    { label: 'Validity', tag: 'validity' },
    { label: 'Renewal Amount', tag: 'renewalAmount' },
    { label: 'Ref Name', tag: 'referenceName' },
    { label: 'Ref Number', tag: 'referenceNumber' }
  ];

  const activeCategoryObj = categories.find(c => c.id === selectedCategoryId) || categories[0];
  const categoryTemplates = templates.filter(t => t.categoryId === selectedCategoryId);

  return (
    <div className="screen-content" style={{ paddingBottom: '90px', paddingTop: '10px' }}>
      {/* Top Header Navigation Bar */}
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
          onClick={() => {
            if (activeView === 'editor') {
              setActiveView('category');
            } else if (activeView === 'category') {
              setActiveView('hub');
            } else if (onBack) {
              onBack();
            }
          }}
          className="header-btn"
          style={{ width: '38px', height: '38px', borderRadius: '10px' }}
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center', flex: 1, padding: '0 8px' }}>
          <h2 style={{ fontSize: '17px', fontWeight: 900, color: '#0f172a', margin: 0 }}>
            {activeView === 'hub' && 'Custom WhatsApp Message'}
            {activeView === 'category' && activeCategoryObj?.name}
            {activeView === 'editor' && (editingTemplateId ? 'Edit Message Template' : 'New Message Template')}
          </h2>
          <span style={{ fontSize: '11px', color: '#64748b' }}>
            {activeView === 'hub' && 'Multi-template manager for Sale, Expiry, and Custom customer messages'}
            {activeView === 'category' && `${categoryTemplates.length} saved templates • Select, edit, or activate default`}
            {activeView === 'editor' && `${activeCategoryObj?.name} • Live preview & tag builder`}
          </span>
        </div>

        <div style={{ width: '38px' }} />
      </div>

      {/* ===================================================================== */}
      {/* VIEW 1: HUB LANDING - CATEGORIES & MULTI-TEMPLATE MANAGER             */}
      {/* ===================================================================== */}
      {activeView === 'hub' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '6px' }}>
          {/* Information Card */}
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%)',
            border: '1.5px solid #a7f3d0',
            borderRadius: '14px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div style={{
              background: '#10b981',
              color: '#ffffff',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <strong style={{ fontSize: '13px', color: '#065f46', display: 'block' }}>
                Multi-Template WhatsApp Manager
              </strong>
              <span style={{ fontSize: '11.5px', color: '#047857' }}>
                Store multiple templates per category, switch active defaults, and customize with dynamic tags.
              </span>
            </div>
          </div>

          {/* Categories Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categories.map(cat => {
              const catTpls = templates.filter(t => t.categoryId === cat.id);
              const activeTpl = catTpls.find(t => t.isActive) || catTpls[0];
              const isSale = cat.id === 'sale';
              const isExpiry = cat.id === 'expiry';

              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setActiveView('category');
                  }}
                  style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: isSale ? '#dbeafe' : (isExpiry ? '#fef3c7' : '#e0e7ff'),
                      color: isSale ? '#1d4ed8' : (isExpiry ? '#b45309' : '#4338ca'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {isSale && <ShoppingBag size={22} />}
                      {isExpiry && <Bell size={22} />}
                      {!isSale && !isExpiry && <Layers size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                          {cat.name}
                        </h3>
                        <span style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          background: '#f1f5f9',
                          color: '#475569',
                          padding: '1px 6px',
                          borderRadius: '6px'
                        }}>
                          {catTpls.length} {catTpls.length === 1 ? 'Template' : 'Templates'}
                        </span>
                      </div>
                      <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: '#64748b' }}>
                        Active: <strong style={{ color: '#0f172a' }}>{activeTpl?.name || 'None'}</strong>
                      </p>
                    </div>
                  </div>

                  <span style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#2563eb',
                    background: '#eff6ff',
                    padding: '6px 12px',
                    borderRadius: '8px'
                  }}>
                    Manage →
                  </span>
                </div>
              );
            })}
          </div>

          {/* Create Category Action Button */}
          <button
            type="button"
            onClick={() => setShowCreateCategoryModal(true)}
            style={{
              background: '#f8fafc',
              border: '1.5px dashed #cbd5e1',
              borderRadius: '14px',
              padding: '14px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#334155',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease'
            }}
          >
            <FolderPlus size={18} color="#2563eb" />
            <span>+ Create Category for Future Message Types</span>
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 2: CATEGORY VIEW - TEMPLATES LIST                                */}
      {/* ===================================================================== */}
      {activeView === 'category' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Category Top Action Bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '10px 14px'
          }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>CATEGORY</span>
              <strong style={{ fontSize: '14px', color: '#0f172a', display: 'block' }}>
                {activeCategoryObj?.name}
              </strong>
            </div>

            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              onClick={() => handleOpenEditor(null, selectedCategoryId)}
              style={{
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={15} />
              <span>New Template</span>
            </button>
          </div>

          {/* Templates Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {categoryTemplates.map((tpl, tIdx) => (
              <div
                key={tpl.id}
                style={{
                  background: '#ffffff',
                  border: tpl.isActive ? '2px solid #10b981' : '1.5px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: tpl.isActive ? '0 2px 8px rgba(16, 185, 129, 0.15)' : '0 1px 3px rgba(0,0,0,0.03)'
                }}
              >
                {/* Template Title & Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>
                      {tpl.name}
                    </h4>
                    {tpl.isActive && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        background: '#10b981',
                        color: '#ffffff',
                        padding: '2px 7px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Check size={11} strokeWidth={3} />
                        Active Default
                      </span>
                    )}
                  </div>

                  {tpl.imageUrl && (
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      background: '#fef3c7',
                      color: '#b45309',
                      padding: '2px 6px',
                      borderRadius: '5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <ImageIcon size={11} />
                      Flyer Attached
                    </span>
                  )}
                </div>

                {/* Content Snippet */}
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  fontSize: '11.5px',
                  color: '#475569',
                  lineHeight: '1.4',
                  maxHeight: '65px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'pre-line'
                }}>
                  {tpl.content}
                </div>

                {/* Card Action Controls */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '6px',
                  borderTop: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditor(tpl, selectedCategoryId)}
                      style={{
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: '7px',
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicateTemplate(tpl)}
                      style={{
                        background: '#f8fafc',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: '7px',
                        padding: '5px 9px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Duplicate this template"
                    >
                      <Copy size={13} />
                      <span>Duplicate</span>
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!tpl.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleSetActive(tpl.id, selectedCategoryId)}
                        style={{
                          background: '#ecfdf5',
                          color: '#059669',
                          border: '1px solid #a7f3d0',
                          borderRadius: '7px',
                          padding: '5px 10px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        Set Active
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                        Currently Active
                      </span>
                    )}

                    {!tpl.isActive && (
                      <button
                        type="button"
                        onClick={() => handleDeleteTemplate(tpl)}
                        style={{
                          background: 'transparent',
                          color: '#ef4444',
                          border: 'none',
                          padding: '5px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Delete template"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* VIEW 3: TEMPLATE EDITOR WITH REAL-TIME PREVIEW & TAG BUILDER          */}
      {/* ===================================================================== */}
      {activeView === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Bar: Template Name Input */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
              TEMPLATE NAME
            </label>
            <input
              type="text"
              value={draftName}
              onChange={e => setDraftName(e.target.value)}
              placeholder="e.g. Template 01 — Friendly Reminder"
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0f172a'
              }}
            />
          </div>

          {/* Insertable Tags Panel */}
          <div style={{
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px 14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                CLICK TO INSERT FIELD TAGS AT CURSOR:
              </span>
              <span style={{ fontSize: '10.5px', color: '#64748b' }}>
                Inserts without resetting text
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {(selectedCategoryId === 'sale' ? saleTags : expiryTags).map(({ label, tag }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertTagAtCursor(tag)}
                  style={{
                    background: tag === 'referenceNumber' ? '#eff6ff' : '#ffffff',
                    border: tag === 'referenceNumber' ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 9px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: tag === 'referenceNumber' ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                  }}
                  title={`Insert {${tag}}`}
                >
                  + {label}
                </button>
              ))}
            </div>

            {/* Explanation Guide for Expiry & Remaining Days Tags */}
            {selectedCategoryId !== 'sale' && (
              <div style={{
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid #e2e8f0',
                fontSize: '10.5px',
                color: '#64748b',
                lineHeight: 1.4
              }}>
                <strong style={{ color: '#0f172a' }}>Dynamic Days Guide:</strong>{' '}
                <span style={{ color: '#1d4ed8', fontWeight: 700 }}>{`{remainingDays}`}</span> = positive count until renewal •{' '}
                <span style={{ color: '#b45309', fontWeight: 700 }}>{`{overdueDays}`}</span> = elapsed days if expired •{' '}
                <span style={{ color: '#15803d', fontWeight: 700 }}>{`{expiryStatus}`}</span> = '10 days remaining' / 'Expires today' / 'Expired 2 days ago'.
              </div>
            )}
          </div>

          {/* Textarea Message Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '12px', fontWeight: 800, color: '#334155' }}>
                MESSAGE CONTENT (WHATSAPP FORMATTING):
              </label>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Use *bold*, _italic_, ~strike~
              </span>
            </div>

            <textarea
              ref={editorTextareaRef}
              rows={11}
              value={draftContent}
              onChange={e => setDraftContent(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1.5px solid #cbd5e1',
                fontFamily: 'inherit',
                fontSize: '13px',
                lineHeight: '1.5',
                color: '#0f172a',
                resize: 'vertical',
                background: '#ffffff'
              }}
              placeholder="Write your custom WhatsApp message template here..."
            />
          </div>

          {/* Picture / Flyer Upload for Templates */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #e2e8f0',
            borderRadius: '14px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', display: 'block' }}>
                  Template Flyer / Banner (Optional)
                </span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  Attach a promotional picture or renewal flyer unique to this template
                </span>
              </div>

              {draftImage ? (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  style={{
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Remove Picture</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Upload size={14} />
                  <span>Upload Flyer</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageFileChange}
            />

            {draftImage && (
              <div style={{
                position: 'relative',
                borderRadius: '10px',
                overflow: 'hidden',
                border: '1px solid #cbd5e1',
                maxHeight: '180px',
                textAlign: 'center',
                background: '#0f172a'
              }}>
                <img
                  src={draftImage}
                  alt="Template Flyer"
                  style={{ maxHeight: '180px', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
          </div>

          {/* Live WhatsApp Chat Bubble Preview */}
          <div style={{
            background: '#efeae2',
            backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            border: '1px solid #cbd5e1',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 900, color: '#475569', letterSpacing: '0.4px' }}>
                LIVE WHATSAPP CHAT PREVIEW (SAMPLE DATA)
              </span>
              <span style={{
                fontSize: '10px',
                fontWeight: 800,
                background: '#25d366',
                color: '#ffffff',
                padding: '2px 7px',
                borderRadius: '6px'
              }}>
                WhatsApp Verified
              </span>
            </div>

            {/* Chat bubble */}
            <div style={{
              background: '#ffffff',
              borderRadius: '12px 12px 12px 2px',
              padding: '12px 14px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
              maxWidth: '92%',
              alignSelf: 'flex-start',
              position: 'relative'
            }}>
              {draftImage && (
                <div style={{ marginBottom: '10px', borderRadius: '8px', overflow: 'hidden' }}>
                  <img
                    src={draftImage}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: '150px', objectFit: 'cover' }}
                  />
                </div>
              )}

              <div style={{
                fontSize: '13px',
                lineHeight: '1.45',
                color: '#111827',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {fillTemplate(draftContent, mockPreviewData)}
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '3px',
                marginTop: '6px',
                fontSize: '10px',
                color: '#6b7280'
              }}>
                <span>12:42 PM</span>
                <CheckCheck size={14} color="#34b7f1" />
              </div>
            </div>
          </div>

          {/* Action Buttons: Save & Cancel */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              onClick={handleSaveDraft}
              disabled={saving}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '13.5px',
                fontWeight: 900,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving to Database...' : 'Save Template'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveView('category')}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 800,
                color: '#64748b',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modal: Create Category */}
      {showCreateCategoryModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowCreateCategoryModal(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 1200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#ffffff',
              borderRadius: '18px',
              padding: '20px',
              maxWidth: '380px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderPlus size={20} color="#2563eb" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>
                  Create Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                CATEGORY NAME
              </label>
              <input
                type="text"
                value={newCategoryName}
                onChange={e => setNewCategoryName(e.target.value)}
                placeholder="e.g. Renewal Confirmation or Payment Reminder"
                style={{
                  padding: '9px 12px',
                  borderRadius: '9px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 800, color: '#475569' }}>
                PURPOSE / DESCRIPTION (OPTIONAL)
              </label>
              <input
                type="text"
                value={newCategoryDesc}
                onChange={e => setNewCategoryDesc(e.target.value)}
                placeholder="e.g. Sent when customer pays for renewal"
                style={{
                  padding: '9px 12px',
                  borderRadius: '9px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              <button
                type="button"
                className="glossy-btn glossy-btn-blue"
                onClick={handleCreateCategory}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '13px',
                  fontWeight: 900,
                  borderRadius: '10px'
                }}
              >
                Create Category
              </button>
              <button
                type="button"
                onClick={() => setShowCreateCategoryModal(false)}
                style={{
                  padding: '10px 14px',
                  fontSize: '13px',
                  fontWeight: 800,
                  color: '#64748b',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
