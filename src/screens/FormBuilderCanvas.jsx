import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, Save, Plus, Square, Type, Copy, ExternalLink,
  Trash2, Palette, Check, Sparkles, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight, Layers, Sliders, Tv, Shield,
  Eye, User, Phone, Key, Smartphone, Calendar, Hash
} from 'lucide-react';
import { api } from '../api/client';

export default function FormBuilderCanvas({
  formType = 'sale', // 'sale' | 'database'
  brands = [],
  initialData = null,
  onSaveComplete,
  onBack,
  showToast
}) {
  const [formName, setFormName] = useState(
    initialData?.heading || initialData?.title || initialData?.name ||
    (formType === 'sale' ? 'Sale Form Template' : 'DataBase Form Template')
  );
  const [selectedBrands, setSelectedBrands] = useState(initialData?.brands || []);
  const [isAllBrands, setIsAllBrands] = useState(Boolean(initialData?.isAllBrands));
  const [showBrandSelector, setShowBrandSelector] = useState(false);
  const [activeToolTab, setActiveToolTab] = useState('add'); // 'add' | 'box' | 'heading' | 'field' | 'button'

  // Initialize elements with sensible defaults matching image copy 84.png, 85.png & 86.png
  const getDefaultElements = () => {
    if (formType === 'sale') {
      return [
        {
          id: 'heading_main',
          type: 'heading',
          text: 'OTT Subscription Sale Form',
          x: 20,
          y: 20,
          fontSize: 20,
          fontWeight: '900',
          color: '#0f172a'
        },
        {
          id: 'box_brand',
          type: 'field',
          label: 'Brand',
          placeholder: 'Select Brand ▾',
          fieldType: 'dropdown',
          x: 20,
          y: 65,
          width: 170,
          height: 44,
          bgColor: '#0f172a',
          borderColor: '#0f172a',
          textColor: '#ffffff'
        },
        {
          id: 'box_validity',
          type: 'field',
          label: 'Validity',
          placeholder: 'Select Validity ▾',
          fieldType: 'dropdown',
          x: 200,
          y: 65,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'box_date_from',
          type: 'field',
          label: 'Date From',
          placeholder: 'DD/MM/YYYY',
          fieldType: 'date',
          x: 20,
          y: 125,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'box_date_to',
          type: 'field',
          label: 'Date To',
          placeholder: 'DD/MM/YYYY',
          fieldType: 'date',
          x: 200,
          y: 125,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_id_1',
          type: 'field',
          label: 'ID',
          placeholder: 'Enter Account Email / ID',
          fieldType: 'email',
          x: 20,
          y: 185,
          width: 350,
          height: 44,
          badgeColor: '#2563eb',
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_password',
          type: 'field',
          label: 'Password',
          placeholder: 'Enter Password',
          fieldType: 'password',
          x: 20,
          y: 245,
          width: 350,
          height: 44,
          badgeColor: '#7c3aed',
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_screen',
          type: 'field',
          label: 'Screen',
          placeholder: 'Screen 1',
          fieldType: 'text',
          x: 20,
          y: 305,
          width: 170,
          height: 44,
          badgeColor: '#ea580c',
          bgColor: '#fefce8',
          borderColor: '#fde047',
          textColor: '#854d0e'
        },
        {
          id: 'field_pin',
          type: 'field',
          label: 'PIN',
          placeholder: '0000',
          fieldType: 'text',
          x: 200,
          y: 305,
          width: 170,
          height: 44,
          badgeColor: '#0891b2',
          bgColor: '#ecfeff',
          borderColor: '#a5f3fc',
          textColor: '#155e75'
        },
        {
          id: 'field_amount',
          type: 'field',
          label: 'Amount (₹)',
          placeholder: '₹ 0.00',
          fieldType: 'number',
          x: 20,
          y: 365,
          width: 170,
          height: 44,
          badgeColor: '#16a34a',
          bgColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          textColor: '#166534'
        },
        {
          id: 'field_device',
          type: 'field',
          label: 'Device',
          placeholder: 'TV / Mobile / Laptop',
          fieldType: 'text',
          x: 200,
          y: 365,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'heading_customer',
          type: 'heading',
          text: 'Customer Details',
          x: 20,
          y: 430,
          fontSize: 16,
          fontWeight: '900',
          color: '#0f172a'
        },
        {
          id: 'field_cust_name',
          type: 'field',
          label: 'Customer Name',
          placeholder: 'Enter customer name',
          fieldType: 'text',
          x: 20,
          y: 465,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_cust_phone',
          type: 'field',
          label: 'Customer Mobile',
          placeholder: 'Phone number',
          fieldType: 'phone',
          x: 200,
          y: 465,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_ref_name',
          type: 'field',
          label: 'Ref Name',
          placeholder: 'Reference name',
          fieldType: 'text',
          x: 20,
          y: 525,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'field_ref_phone',
          type: 'field',
          label: 'Ref Number',
          placeholder: 'Reference number',
          fieldType: 'phone',
          x: 200,
          y: 525,
          width: 170,
          height: 44,
          bgColor: '#ffffff',
          borderColor: '#cbd5e1',
          textColor: '#0f172a'
        },
        {
          id: 'btn_submit',
          type: 'button',
          label: 'Submit Sale & Share WhatsApp',
          btnType: 'submit',
          x: 20,
          y: 590,
          width: 350,
          height: 48,
          bgColor: '#ea580c',
          textColor: '#ffffff'
        }
      ];
    }

    // Default Database Form elements matching image copy 85.png / 77.png
    return [
      {
        id: 'heading_db_main',
        type: 'heading',
        text: 'Multi-Brand Subscriptions Database',
        x: 20,
        y: 20,
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a'
      },
      {
        id: 'box_ribbon',
        type: 'box',
        text: '01. Primary Slot (06 Months)',
        x: 20,
        y: 65,
        width: 350,
        height: 40,
        bgColor: '#dc2626',
        borderColor: '#b91c1c',
        textColor: '#ffffff',
        fontSize: 13,
        fontWeight: '900'
      },
      {
        id: 'field_db_email',
        type: 'field',
        label: 'ID',
        placeholder: 'Enter Email / ID',
        fieldType: 'email',
        x: 20,
        y: 120,
        width: 350,
        height: 44,
        badgeColor: '#2563eb',
        bgColor: '#ffffff',
        borderColor: '#cbd5e1',
        textColor: '#0f172a'
      },
      {
        id: 'field_db_pwd',
        type: 'field',
        label: 'Password',
        placeholder: 'Enter Password',
        fieldType: 'password',
        x: 20,
        y: 180,
        width: 350,
        height: 44,
        badgeColor: '#7c3aed',
        bgColor: '#ffffff',
        borderColor: '#cbd5e1',
        textColor: '#0f172a'
      },
      {
        id: 'box_pins',
        type: 'box',
        text: 'PIN 1: [____]  PIN 2: [____]  PIN 3: [____]  PIN 4: [____]  PIN 5: [____]',
        x: 20,
        y: 240,
        width: 350,
        height: 44,
        bgColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        textColor: '#334155',
        fontSize: 11,
        fontWeight: '800'
      },
      {
        id: 'box_screens',
        type: 'box',
        text: '📺 Screen 1   📺 Screen 2   📺 Screen 3   📺 Screen 4   📺 Screen 5',
        x: 20,
        y: 298,
        width: 350,
        height: 44,
        bgColor: '#fff7ed',
        borderColor: '#fed7aa',
        textColor: '#ea580c',
        fontSize: 11,
        fontWeight: '900'
      },
      {
        id: 'field_db_plan',
        type: 'field',
        label: 'Plan Name',
        placeholder: 'Premium 4K UHD',
        fieldType: 'text',
        x: 20,
        y: 358,
        width: 170,
        height: 44,
        bgColor: '#ffffff',
        borderColor: '#cbd5e1',
        textColor: '#0f172a'
      },
      {
        id: 'field_db_expiry',
        type: 'field',
        label: 'Expiry / Renewal',
        placeholder: 'DD/MM/YYYY',
        fieldType: 'date',
        x: 200,
        y: 358,
        width: 170,
        height: 44,
        bgColor: '#ffffff',
        borderColor: '#cbd5e1',
        textColor: '#0f172a'
      },
      {
        id: 'btn_db_save',
        type: 'button',
        label: 'Save Account to Database',
        btnType: 'submit',
        x: 20,
        y: 420,
        width: 350,
        height: 48,
        bgColor: '#16a34a',
        textColor: '#ffffff'
      }
    ];
  };

  const [elements, setElements] = useState(
    Array.isArray(initialData?.elements) && initialData.elements.length > 0
      ? initialData.elements
      : getDefaultElements()
  );

  const [selectedElementId, setSelectedElementId] = useState(elements[0]?.id || null);
  const [dragState, setDragState] = useState(null);
  const canvasRef = useRef(null);

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Switch tools panel tab automatically when selecting an element
  useEffect(() => {
    if (selectedElement) {
      if (selectedElement.type === 'box') setActiveToolTab('box');
      else if (selectedElement.type === 'heading') setActiveToolTab('heading');
      else if (selectedElement.type === 'field') setActiveToolTab('field');
      else if (selectedElement.type === 'button') setActiveToolTab('button');
    }
  }, [selectedElementId]);

  // Update properties of selected element
  const updateSelectedElement = (updates) => {
    if (!selectedElementId) return;
    setElements(prev => prev.map(el => (el.id === selectedElementId ? { ...el, ...updates } : el)));
  };

  // Delete element
  const handleDeleteElement = (id = selectedElementId) => {
    if (!id) return;
    setElements(prev => prev.filter(el => el.id !== id));
    setSelectedElementId(null);
    showToast('Element deleted', 'info');
  };

  // Duplicate element
  const handleDuplicateElement = () => {
    if (!selectedElement) return;
    const duplicated = {
      ...selectedElement,
      id: `${selectedElement.type}_${Date.now()}`,
      x: selectedElement.x + 20,
      y: selectedElement.y + 20
    };
    setElements(prev => [...prev, duplicated]);
    setSelectedElementId(duplicated.id);
    showToast('Duplicated element', 'info');
  };

  // Position control steps (Up, Down, Left, Right) per image copy 85.png
  const handleMovePosition = (direction, step = 15) => {
    if (!selectedElementId) return;
    setElements(prev => prev.map(el => {
      if (el.id !== selectedElementId) return el;
      let newX = el.x;
      let newY = el.y;
      if (direction === 'up') newY = Math.max(0, el.y - step);
      if (direction === 'down') newY = el.y + step;
      if (direction === 'left') newX = Math.max(0, el.x - step);
      if (direction === 'right') newX = el.x + step;
      return { ...el, x: newX, y: newY };
    }));
  };

  // Pointer dragging handlers
  const handlePointerDown = (e, el) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    setDragState({
      id: el.id,
      startX: clientX,
      startY: clientY,
      origX: el.x,
      origY: el.y
    });
  };

  const handlePointerMove = (e) => {
    if (!dragState) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    const dx = clientX - dragState.startX;
    const dy = clientY - dragState.startY;

    setElements(prev => prev.map(el => {
      if (el.id === dragState.id) {
        return {
          ...el,
          x: Math.max(0, Math.round(dragState.origX + dx)),
          y: Math.max(0, Math.round(dragState.origY + dy))
        };
      }
      return el;
    }));
  };

  const handlePointerUp = () => {
    setDragState(null);
  };

  // =========================================================================
  // ADD ELEMENT HELPERS (Matching image copy 85.png & image copy 86.png)
  // =========================================================================
  const handleAddBox = () => {
    const nextY = Math.max(...elements.map(e => e.y + (e.height || 44)), 100) + 15;
    const newBox = {
      id: `box_${Date.now()}`,
      type: 'box',
      text: 'Custom Box Container',
      x: 20,
      y: nextY,
      width: 350,
      height: 48,
      bgColor: '#ffffff',
      borderColor: '#94a3b8',
      borderWidth: 2,
      borderRadius: 12,
      textColor: '#0f172a',
      fontSize: 13,
      fontWeight: '700'
    };
    setElements(prev => [...prev, newBox]);
    setSelectedElementId(newBox.id);
    setActiveToolTab('box');
    showToast('Added custom box', 'info');
  };

  const handleAddHeading = () => {
    const nextY = Math.max(...elements.map(e => e.y + 40), 100) + 15;
    const newHeading = {
      id: `heading_${Date.now()}`,
      type: 'heading',
      text: 'Section Heading',
      x: 20,
      y: nextY,
      fontSize: 18,
      fontWeight: '900',
      color: '#0f172a'
    };
    setElements(prev => [...prev, newHeading]);
    setSelectedElementId(newHeading.id);
    setActiveToolTab('heading');
    showToast('Added heading', 'info');
  };

  const handleAddButton = () => {
    const nextY = Math.max(...elements.map(e => e.y + (e.height || 44)), 100) + 15;
    const newBtn = {
      id: `btn_${Date.now()}`,
      type: 'button',
      label: 'Submit Action',
      btnType: 'submit',
      x: 20,
      y: nextY,
      width: 350,
      height: 48,
      bgColor: '#2563eb',
      textColor: '#ffffff'
    };
    setElements(prev => [...prev, newBtn]);
    setSelectedElementId(newBtn.id);
    setActiveToolTab('button');
    showToast('Added button', 'info');
  };

  const handleAddIcon = () => {
    const nextY = Math.max(...elements.map(e => e.y + 40), 100) + 15;
    const newIcon = {
      id: `icon_${Date.now()}`,
      type: 'icon',
      iconType: 'sparkles',
      size: 24,
      color: '#2563eb',
      x: 30,
      y: nextY
    };
    setElements(prev => [...prev, newIcon]);
    setSelectedElementId(newIcon.id);
    showToast('Added icon', 'info');
  };

  // MULTIPLE ID BOX CREATION (Per image copy 86.png requirement)
  const handleAddIdField = () => {
    const idCount = elements.filter(el => el.label && el.label.startsWith('ID')).length + 1;
    const nextY = Math.max(...elements.map(e => e.y + (e.height || 44)), 100) + 15;
    const newIdField = {
      id: `field_id_${Date.now()}`,
      type: 'field',
      label: `ID ${idCount}`,
      placeholder: `Enter Account Email / ID ${idCount}`,
      fieldType: 'email',
      x: 20,
      y: nextY,
      width: 350,
      height: 44,
      badgeColor: idCount % 2 === 0 ? '#7c3aed' : '#2563eb',
      bgColor: '#ffffff',
      borderColor: '#cbd5e1',
      textColor: '#0f172a'
    };
    setElements(prev => [...prev, newIdField]);
    setSelectedElementId(newIdField.id);
    setActiveToolTab('field');
    showToast(`Added ID ${idCount} Field`, 'success');
  };

  const handleAddCustomerDetails = () => {
    const nextY = Math.max(...elements.map(e => e.y + (e.height || 44)), 100) + 15;
    const heading = {
      id: `heading_cust_${Date.now()}`,
      type: 'heading',
      text: 'Customer Details',
      x: 20,
      y: nextY,
      fontSize: 16,
      fontWeight: '900',
      color: '#0f172a'
    };
    const nameField = {
      id: `field_name_${Date.now()}`,
      type: 'field',
      label: 'Customer Name',
      placeholder: 'Enter customer name',
      fieldType: 'text',
      x: 20,
      y: nextY + 35,
      width: 170,
      height: 44,
      bgColor: '#ffffff',
      borderColor: '#cbd5e1',
      textColor: '#0f172a'
    };
    const phoneField = {
      id: `field_phone_${Date.now()}`,
      type: 'field',
      label: 'Customer Number',
      placeholder: 'Enter phone number',
      fieldType: 'phone',
      x: 200,
      y: nextY + 35,
      width: 170,
      height: 44,
      bgColor: '#ffffff',
      borderColor: '#cbd5e1',
      textColor: '#0f172a'
    };
    setElements(prev => [...prev, heading, nameField, phoneField]);
    setSelectedElementId(nameField.id);
    showToast('Added Customer Details section', 'success');
  };

  // Save the customized form layout
  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Please give a name for this form template', 'error');
      return;
    }

    try {
      const payload = {
        title: formName.trim(),
        name: formName.trim(),
        heading: formName.trim(),
        type: formType,
        brands: isAllBrands ? brands.map(b => b.id) : selectedBrands,
        isAllBrands,
        elements
      };

      if (initialData?.id) {
        await api.updateCustomForm(initialData.id, payload);
      } else {
        await api.createCustomForm(payload);
      }

      showToast(`Form "${formName}" saved successfully!`, 'success');
      if (onSaveComplete) onSaveComplete(payload);
    } catch (err) {
      showToast('Failed to save form template', 'error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f8fafc',
        userSelect: 'none'
      }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      {/* 1. TOP HEADER BAR */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <button
            type="button"
            onClick={onBack}
            className="header-btn"
            style={{ width: '38px', height: '38px', borderRadius: '10px' }}
            title="Back to Forms"
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Form Heading / Title..."
              style={{
                fontSize: '16px',
                fontWeight: 900,
                color: '#0f172a',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                width: '100%',
                maxWidth: '280px'
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
              <span style={{
                fontSize: '10.5px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '6px',
                background: formType === 'sale' ? '#ffedd5' : '#dcfce7',
                color: formType === 'sale' ? '#c2410c' : '#15803d'
              }}>
                {formType === 'sale' ? 'Sale Form Builder' : 'DataBase Form Builder'}
              </span>
              {isAllBrands ? (
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563eb' }}>
                  • All Brands Assigned
                </span>
              ) : selectedBrands.length > 0 ? (
                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563eb' }}>
                  • {selectedBrands.length} Brands Assigned
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setShowBrandSelector(true)}
            style={{
              padding: '7px 12px',
              borderRadius: '10px',
              border: '1.5px solid #2563eb',
              background: '#eff6ff',
              color: '#1d4ed8',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Sparkles size={14} />
            <span>Select Brands</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="glossy-btn glossy-btn-green"
            style={{
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 900,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)'
            }}
          >
            <Save size={16} strokeWidth={2.5} />
            <span>Save Form</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: CANVAS ON LEFT + TOOLS PANEL ON RIGHT (Matching image copy 85.png) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row',
        position: 'relative'
      }}>
        {/* LEFT / CENTER: CANVAS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '600px' }}>
          <div
            ref={canvasRef}
            onClick={() => setSelectedElementId(null)}
            style={{
              flex: 1,
              position: 'relative',
              minHeight: '620px',
              background: '#ffffff',
              backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
              backgroundSize: '20px 20px',
              overflow: 'auto',
              padding: '24px'
            }}
          >
            {elements.map(el => {
              const isSelected = el.id === selectedElementId;

              // RENDER HEADING
              if (el.type === 'heading') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => handlePointerDown(e, el)}
                    onTouchStart={e => handlePointerDown(e, el)}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      cursor: 'move',
                      fontSize: `${el.fontSize || 18}px`,
                      fontWeight: el.fontWeight || '900',
                      color: el.color || '#0f172a',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: isSelected ? '2px dashed #2563eb' : '1px dashed transparent',
                      background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {el.text}
                  </div>
                );
              }

              // RENDER BOX CONTAINER
              if (el.type === 'box') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => handlePointerDown(e, el)}
                    onTouchStart={e => handlePointerDown(e, el)}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: `${el.width || 320}px`,
                      minHeight: `${el.height || 44}px`,
                      cursor: 'move',
                      backgroundColor: el.bgColor || '#ffffff',
                      border: `${el.borderWidth || 2}px solid ${el.borderColor || '#cbd5e1'}`,
                      borderRadius: `${el.borderRadius || 12}px`,
                      padding: '8px 12px',
                      boxSizing: 'border-box',
                      color: el.textColor || '#0f172a',
                      fontWeight: el.fontWeight || '700',
                      fontSize: `${el.fontSize || 13}px`,
                      boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.35)' : '0 2px 6px rgba(0,0,0,0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center'
                    }}
                  >
                    {el.text}
                  </div>
                );
              }

              // RENDER FIELD (ID, Password, Customer Info, Dropdowns)
              if (el.type === 'field') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => handlePointerDown(e, el)}
                    onTouchStart={e => handlePointerDown(e, el)}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: `${el.width || 320}px`,
                      cursor: 'move',
                      boxSizing: 'border-box',
                      boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.35)' : 'none',
                      borderRadius: '10px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'stretch',
                      background: el.bgColor || '#ffffff',
                      border: `1.5px solid ${el.borderColor || '#cbd5e1'}`,
                      borderRadius: '10px',
                      overflow: 'hidden',
                      height: `${el.height || 44}px`
                    }}>
                      {/* Label Badge */}
                      {el.label && (
                        <div style={{
                          background: el.badgeColor || '#0f172a',
                          color: '#ffffff',
                          fontWeight: 800,
                          fontSize: '11.5px',
                          padding: '0 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          whiteSpace: 'nowrap'
                        }}>
                          {el.label}
                        </div>
                      )}

                      {/* Empty Input Box with Placeholder */}
                      <div style={{
                        flex: 1,
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: '#94a3b8'
                      }}>
                        {el.placeholder || 'Enter value...'}
                      </div>
                    </div>
                  </div>
                );
              }

              // RENDER BUTTON
              if (el.type === 'button') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => handlePointerDown(e, el)}
                    onTouchStart={e => handlePointerDown(e, el)}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      width: `${el.width || 320}px`,
                      height: `${el.height || 46}px`,
                      cursor: 'move',
                      background: el.bgColor || '#ea580c',
                      color: el.textColor || '#ffffff',
                      borderRadius: '12px',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 900,
                      fontSize: '13.5px',
                      boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.4)' : '0 4px 12px rgba(0,0,0,0.12)'
                    }}
                  >
                    {el.label}
                  </div>
                );
              }

              // RENDER ICON
              if (el.type === 'icon') {
                return (
                  <div
                    key={el.id}
                    onMouseDown={e => handlePointerDown(e, el)}
                    onTouchStart={e => handlePointerDown(e, el)}
                    style={{
                      position: 'absolute',
                      left: el.x,
                      top: el.y,
                      cursor: 'move',
                      padding: '6px',
                      borderRadius: '8px',
                      border: isSelected ? '2px dashed #2563eb' : 'none'
                    }}
                  >
                    <Sparkles size={el.size || 24} color={el.color || '#2563eb'} />
                  </div>
                );
              }

              return null;
            })}
          </div>

          {/* BOTTOM CANVAS TOOLBAR: POSITION CONTROLS [ ↑ Up ] [ ↓ Down ] [ ← Left ] [ → Right ] */}
          <div style={{
            background: '#ffffff',
            borderTop: '1.5px solid #e2e8f0',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            {/* Selected Element Label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>
                Selected Element:
              </span>
              <span style={{
                fontSize: '12px',
                fontWeight: 900,
                color: selectedElement ? '#2563eb' : '#94a3b8',
                background: selectedElement ? '#eff6ff' : '#f1f5f9',
                padding: '3px 8px',
                borderRadius: '6px'
              }}>
                {selectedElement
                  ? (selectedElement.label || selectedElement.text || selectedElement.type.toUpperCase())
                  : 'None (Tap an element on canvas)'}
              </span>
            </div>

            {/* Position Controls matching image copy 85.png */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginRight: '4px' }}>
                Position:
              </span>

              <button
                type="button"
                onClick={() => handleMovePosition('up')}
                disabled={!selectedElement}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: selectedElement ? 'pointer' : 'not-allowed',
                  opacity: selectedElement ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronUp size={15} /> Up
              </button>

              <button
                type="button"
                onClick={() => handleMovePosition('down')}
                disabled={!selectedElement}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: selectedElement ? 'pointer' : 'not-allowed',
                  opacity: selectedElement ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronDown size={15} /> Down
              </button>

              <button
                type="button"
                onClick={() => handleMovePosition('left')}
                disabled={!selectedElement}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: selectedElement ? 'pointer' : 'not-allowed',
                  opacity: selectedElement ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronLeft size={15} /> Left
              </button>

              <button
                type="button"
                onClick={() => handleMovePosition('right')}
                disabled={!selectedElement}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  background: '#ffffff',
                  fontWeight: 800,
                  fontSize: '12px',
                  cursor: selectedElement ? 'pointer' : 'not-allowed',
                  opacity: selectedElement ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronRight size={15} /> Right
              </button>

              {/* Duplicate & Delete shortcuts */}
              {selectedElement && (
                <>
                  <button
                    type="button"
                    onClick={handleDuplicateElement}
                    title="Duplicate element"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      background: '#f8fafc',
                      cursor: 'pointer'
                    }}
                  >
                    <Copy size={14} color="#475569" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteElement(selectedElement.id)}
                    title="Delete element"
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1.5px solid #fca5a5',
                      background: '#fef2f2',
                      color: '#dc2626',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT: TOOLS PANEL (Matching image copy 85.png layout) */}
        <div style={{
          width: window.innerWidth < 768 ? '100%' : '340px',
          background: '#ffffff',
          borderLeft: '1.5px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 'calc(100vh - 65px)',
          overflowY: 'auto'
        }}>
          {/* Tools Panel Tab Header */}
          <div style={{
            display: 'flex',
            borderBottom: '1.5px solid #e2e8f0',
            background: '#f8fafc',
            overflowX: 'auto'
          }}>
            <button
              type="button"
              onClick={() => setActiveToolTab('add')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: activeToolTab === 'add' ? '#ffffff' : 'transparent',
                borderBottom: activeToolTab === 'add' ? '2.5px solid #2563eb' : 'none',
                color: activeToolTab === 'add' ? '#2563eb' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              + Add
            </button>
            <button
              type="button"
              onClick={() => setActiveToolTab('box')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: activeToolTab === 'box' ? '#ffffff' : 'transparent',
                borderBottom: activeToolTab === 'box' ? '2.5px solid #2563eb' : 'none',
                color: activeToolTab === 'box' ? '#2563eb' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Box
            </button>
            <button
              type="button"
              onClick={() => setActiveToolTab('heading')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: activeToolTab === 'heading' ? '#ffffff' : 'transparent',
                borderBottom: activeToolTab === 'heading' ? '2.5px solid #2563eb' : 'none',
                color: activeToolTab === 'heading' ? '#2563eb' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Heading
            </button>
            <button
              type="button"
              onClick={() => setActiveToolTab('field')}
              style={{
                flex: 1,
                padding: '10px 8px',
                border: 'none',
                background: activeToolTab === 'field' ? '#ffffff' : 'transparent',
                borderBottom: activeToolTab === 'field' ? '2.5px solid #2563eb' : 'none',
                color: activeToolTab === 'field' ? '#2563eb' : '#64748b',
                fontWeight: 900,
                fontSize: '12px',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              Field
            </button>
          </div>

          {/* Tools Body */}
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* TAB 1: ADD ELEMENTS (Matching image copy 85.png) */}
            {activeToolTab === 'add' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Add Elements
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleAddBox}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Square size={20} color="#2563eb" />
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>+ Add Box</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddHeading}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Type size={20} color="#7c3aed" />
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>+ Add Heading</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddButton}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Layers size={20} color="#ea580c" />
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>+ Add Button</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddIcon}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      background: '#ffffff',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={20} color="#16a34a" />
                    <span style={{ fontSize: '12px', fontWeight: 800 }}>+ Add Icon</span>
                  </button>
                </div>

                {/* Quick Presets for Custom Multi-ID Forms (Per image copy 86.png) */}
                <div style={{ marginTop: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>
                    Quick Fields (Custom Form Builder)
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <button
                      type="button"
                      onClick={handleAddIdField}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #93c5fd',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>+ Add ID Box (e.g. ID 1, ID 2...)</span>
                      <Plus size={16} />
                    </button>

                    <button
                      type="button"
                      onClick={handleAddCustomerDetails}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1.5px solid #cbd5e1',
                        background: '#ffffff',
                        color: '#0f172a',
                        fontWeight: 800,
                        fontSize: '12.5px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                    >
                      <span>+ Add Customer Details</span>
                      <User size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: BOX OPTIONS (Matching image copy 85.png) */}
            {activeToolTab === 'box' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Box Options
                </span>

                {selectedElement && selectedElement.type === 'box' ? (
                  <>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                        Add / Edit Text Inside Box
                      </label>
                      <input
                        type="text"
                        value={selectedElement.text || ''}
                        onChange={e => updateSelectedElement({ text: e.target.value })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Width (px)</label>
                        <input
                          type="number"
                          value={selectedElement.width || 320}
                          onChange={e => updateSelectedElement({ width: Number(e.target.value) })}
                          className="form-input-pill"
                          style={{ marginTop: '4px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Height (px)</label>
                        <input
                          type="number"
                          value={selectedElement.height || 44}
                          onChange={e => updateSelectedElement({ height: Number(e.target.value) })}
                          className="form-input-pill"
                          style={{ marginTop: '4px' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Inside Color (Background)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="color"
                          value={selectedElement.bgColor || '#ffffff'}
                          onChange={e => updateSelectedElement({ bgColor: e.target.value })}
                          style={{ width: '38px', height: '34px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={selectedElement.bgColor || '#ffffff'}
                          onChange={e => updateSelectedElement({ bgColor: e.target.value })}
                          className="form-input-pill"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Border Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="color"
                          value={selectedElement.borderColor || '#cbd5e1'}
                          onChange={e => updateSelectedElement({ borderColor: e.target.value })}
                          style={{ width: '38px', height: '34px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={selectedElement.borderColor || '#cbd5e1'}
                          onChange={e => updateSelectedElement({ borderColor: e.target.value })}
                          className="form-input-pill"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Text Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="color"
                          value={selectedElement.textColor || '#0f172a'}
                          onChange={e => updateSelectedElement({ textColor: e.target.value })}
                          style={{ width: '38px', height: '34px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={selectedElement.textColor || '#0f172a'}
                          onChange={e => updateSelectedElement({ textColor: e.target.value })}
                          className="form-input-pill"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Select a Box on the canvas or tap "+ Add Box"
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HEADING OPTIONS (Matching image copy 85.png) */}
            {activeToolTab === 'heading' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Heading Options
                </span>

                {selectedElement && selectedElement.type === 'heading' ? (
                  <>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Heading Text</label>
                      <input
                        type="text"
                        value={selectedElement.text || ''}
                        onChange={e => updateSelectedElement({ text: e.target.value })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>
                        Font Size: {selectedElement.fontSize || 18}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="36"
                        value={selectedElement.fontSize || 18}
                        onChange={e => updateSelectedElement({ fontSize: Number(e.target.value) })}
                        style={{ width: '100%', marginTop: '6px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Text Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="color"
                          value={selectedElement.color || '#0f172a'}
                          onChange={e => updateSelectedElement({ color: e.target.value })}
                          style={{ width: '38px', height: '34px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={selectedElement.color || '#0f172a'}
                          onChange={e => updateSelectedElement({ color: e.target.value })}
                          className="form-input-pill"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Font Weight</label>
                      <select
                        value={selectedElement.fontWeight || '900'}
                        onChange={e => updateSelectedElement({ fontWeight: e.target.value })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      >
                        <option value="400">Regular (400)</option>
                        <option value="700">Bold (700)</option>
                        <option value="900">Black / Extra Bold (900)</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Select a Heading on the canvas or tap "+ Add Heading"
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: FIELD OPTIONS (For ID, Password, Inputs) */}
            {activeToolTab === 'field' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 900, color: '#0f172a' }}>
                  Field Options
                </span>

                {selectedElement && selectedElement.type === 'field' ? (
                  <>
                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Field Label</label>
                      <input
                        type="text"
                        value={selectedElement.label || ''}
                        onChange={e => updateSelectedElement({ label: e.target.value })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Placeholder Text</label>
                      <input
                        type="text"
                        value={selectedElement.placeholder || ''}
                        onChange={e => updateSelectedElement({ placeholder: e.target.value })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Label Badge Color</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        <input
                          type="color"
                          value={selectedElement.badgeColor || '#2563eb'}
                          onChange={e => updateSelectedElement({ badgeColor: e.target.value })}
                          style={{ width: '38px', height: '34px', border: 'none', cursor: 'pointer' }}
                        />
                        <input
                          type="text"
                          value={selectedElement.badgeColor || '#2563eb'}
                          onChange={e => updateSelectedElement({ badgeColor: e.target.value })}
                          className="form-input-pill"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '11.5px', fontWeight: 800, color: '#475569' }}>Width (px)</label>
                      <input
                        type="number"
                        value={selectedElement.width || 350}
                        onChange={e => updateSelectedElement({ width: Number(e.target.value) })}
                        className="form-input-pill"
                        style={{ marginTop: '4px' }}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    Select an input field on the canvas or tap "+ Add ID Box"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BRAND ASSIGNMENT MODAL (Big All Brands button at top + individual below) */}
      {showBrandSelector && (
        <div className="modal-backdrop" onClick={() => setShowBrandSelector(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', padding: '16px' }}>
            <div className="modal-header" style={{ marginBottom: '14px' }}>
              <div>
                <h3 className="modal-title">Assign Brands to this Form</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  {formName}
                </p>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setShowBrandSelector(false)}>
                ✕
              </button>
            </div>

            {/* BIG ALL BRANDS BUTTON */}
            <button
              type="button"
              onClick={() => {
                setIsAllBrands(true);
                setSelectedBrands(brands.map(b => b.id));
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '12px',
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
                marginBottom: '14px'
              }}
            >
              <Sparkles size={18} />
              <span>All Brands</span>
            </button>

            {/* INDIVIDUAL BRANDS */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '220px', overflowY: 'auto' }}>
              {brands.map(brand => {
                const isSelected = !isAllBrands && selectedBrands.includes(brand.id);
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => {
                      if (isAllBrands) {
                        setIsAllBrands(false);
                        setSelectedBrands([brand.id]);
                      } else {
                        setSelectedBrands(prev =>
                          prev.includes(brand.id) ? prev.filter(id => id !== brand.id) : [...prev, brand.id]
                        );
                      }
                    }}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '20px',
                      border: isSelected ? `2px solid ${brand.color || '#2563eb'}` : '1.5px solid #cbd5e1',
                      background: isSelected ? (brand.color || '#2563eb') : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      fontWeight: 800,
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {isSelected && '✓ '} {brand.displayName || brand.name}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              style={{ width: '100%', marginTop: '16px', padding: '11px', borderRadius: '10px' }}
              onClick={() => setShowBrandSelector(false)}
            >
              Done Selecting Brands
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
