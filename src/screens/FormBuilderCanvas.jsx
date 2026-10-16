import React, { useState, useRef } from 'react';
import {
  ArrowLeft, Save, Plus, Square, Type, Copy, ExternalLink,
  Trash2, Move, Palette, Check, Layers, Sliders
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
  const [formName, setFormName] = useState(initialData?.name || (formType === 'sale' ? 'New Sale Form' : 'New Data Base Form'));
  const [selectedBrands, setSelectedBrands] = useState(initialData?.brands || []);
  const [showBrandSelector, setShowBrandSelector] = useState(false);

  // Canvas elements array
  const [elements, setElements] = useState(initialData?.elements || [
    {
      id: 'heading_1',
      type: 'heading',
      text: formType === 'sale' ? 'OTT Subscription Sale Form' : 'OTT Accounts Database',
      x: 20,
      y: 20,
      fontSize: 22,
      color: '#0f172a'
    },
    {
      id: 'box_brand',
      type: 'box',
      text: 'Brand: Select OTT Platform',
      x: 20,
      y: 70,
      width: 320,
      height: 48,
      bgColor: '#ffffff',
      borderColor: '#cbd5e1',
      borderWidth: 2,
      textColor: '#0f172a'
    },
    {
      id: 'box_email',
      type: 'box',
      text: 'Mail ID: account@gmail.com',
      x: 20,
      y: 130,
      width: 260,
      height: 48,
      bgColor: '#ffffff',
      borderColor: '#3b82f6',
      borderWidth: 2,
      textColor: '#1e40af'
    },
    {
      id: 'copy_email',
      type: 'copy_btn',
      label: 'Copy Mail',
      copyValue: 'account@gmail.com',
      x: 290,
      y: 134,
      width: 50,
      height: 40
    }
  ]);

  const [selectedElementId, setSelectedElementId] = useState(null);
  const [dragState, setDragState] = useState(null); // { id, startX, startY, origX, origY }
  const canvasRef = useRef(null);

  const selectedElement = elements.find(el => el.id === selectedElementId);

  // Add a new Box
  const handleAddBox = () => {
    const newBox = {
      id: `box_${Date.now()}`,
      type: 'box',
      text: 'Box Text Field',
      x: 30,
      y: 100 + (elements.length * 20) % 200,
      width: 240,
      height: 48,
      bgColor: '#ffffff',
      borderColor: '#94a3b8',
      borderWidth: 2,
      textColor: '#0f172a'
    };
    setElements(prev => [...prev, newBox]);
    setSelectedElementId(newBox.id);
    showToast('Added draggable box', 'info');
  };

  // Add a new Text Heading
  const handleAddHeading = () => {
    const newHeading = {
      id: `heading_${Date.now()}`,
      type: 'heading',
      text: 'Custom Section Heading',
      x: 30,
      y: 80 + (elements.length * 20) % 200,
      fontSize: 18,
      color: '#0f172a'
    };
    setElements(prev => [...prev, newHeading]);
    setSelectedElementId(newHeading.id);
    showToast('Added draggable text heading', 'info');
  };

  // Add a Copy Button
  const handleAddCopyButton = () => {
    const newBtn = {
      id: `copy_${Date.now()}`,
      type: 'copy_btn',
      label: 'Copy',
      copyValue: 'Credentials',
      x: 40,
      y: 120 + (elements.length * 20) % 200,
      width: 60,
      height: 38
    };
    setElements(prev => [...prev, newBtn]);
    setSelectedElementId(newBtn.id);
    showToast('Added draggable copy button', 'info');
  };

  // Add Custom Link Button (WhatsApp)
  const handleAddLinkButton = () => {
    const newLink = {
      id: `link_${Date.now()}`,
      type: 'link_btn',
      label: 'Chat on WhatsApp',
      url: 'https://wa.me/',
      x: 30,
      y: 160 + (elements.length * 20) % 200,
      width: 180,
      height: 44,
      bgColor: '#25D366',
      textColor: '#ffffff'
    };
    setElements(prev => [...prev, newLink]);
    setSelectedElementId(newLink.id);
    showToast('Added draggable WhatsApp link button', 'info');
  };

  // Delete element
  const handleDeleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  // Update element properties
  const updateSelectedElement = (updates) => {
    if (!selectedElementId) return;
    setElements(prev => prev.map(el => (el.id === selectedElementId ? { ...el, ...updates } : el)));
  };

  // Dragging handlers (supports mouse and touch)
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

  const toggleBrandSelection = (brandId) => {
    setSelectedBrands(prev => (
      prev.includes(brandId) ? prev.filter(id => id !== brandId) : [...prev, brandId]
    ));
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      showToast('Please give a heading for this form', 'error');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        type: formType,
        brands: selectedBrands,
        elements
      };

      if (initialData?.id) {
        await api.updateCustomForm?.(initialData.id, payload);
      } else {
        await api.createCustomForm(payload);
      }

      showToast(`Form "${formName}" saved successfully!`, 'success');
      if (onSaveComplete) onSaveComplete();
    } catch (err) {
      showToast('Failed to save form', 'error');
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f1f5f9',
        userSelect: 'none'
      }}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      {/* Top Header Bar */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Form Heading / Name..."
            style={{
              fontSize: '15px',
              fontWeight: 800,
              color: '#0f172a',
              border: 'none',
              background: 'transparent',
              outline: 'none',
              width: '100%',
              maxWidth: '240px'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {formType === 'database' && (
            <button
              type="button"
              onClick={() => setShowBrandSelector(true)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                background: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer'
              }}
            >
              Select Brands ({selectedBrands.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="glossy-btn glossy-btn-green"
            style={{ padding: '8px 14px', fontSize: '13px', borderRadius: '10px' }}
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>

      {/* Toolbar - Canva Style Action Buttons */}
      <div style={{
        background: '#ffffff',
        borderBottom: '1px solid #cbd5e1',
        padding: '8px 14px',
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        alignItems: 'center'
      }}>
        <button
          type="button"
          onClick={handleAddBox}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <Square size={14} color="#2563eb" /> + Add Box
        </button>

        <button
          type="button"
          onClick={handleAddHeading}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <Type size={14} color="#7c3aed" /> + Text Heading
        </button>

        <button
          type="button"
          onClick={handleAddCopyButton}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <Copy size={14} color="#059669" /> + Copy Button
        </button>

        <button
          type="button"
          onClick={handleAddLinkButton}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            fontWeight: 700,
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          <ExternalLink size={14} color="#25D366" /> + WhatsApp Link
        </button>
      </div>

      {/* Main Plain Page Canvas (Freely Draggable elements like Canva) */}
      <div
        ref={canvasRef}
        onClick={() => setSelectedElementId(null)}
        style={{
          flex: 1,
          position: 'relative',
          minHeight: '520px',
          background: '#fafafa',
          backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
          backgroundSize: '20px 20px',
          overflow: 'hidden',
          padding: '20px'
        }}
      >
        {elements.map(el => {
          const isSelected = el.id === selectedElementId;

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
                  fontSize: `${el.fontSize || 20}px`,
                  fontWeight: 900,
                  color: el.color || '#0f172a',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: isSelected ? '2px dashed #2563eb' : '1px dashed transparent',
                  background: isSelected ? 'rgba(37,99,235,0.06)' : 'transparent'
                }}
              >
                {el.text}
              </div>
            );
          }

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
                  width: `${el.width}px`,
                  minHeight: `${el.height}px`,
                  cursor: 'move',
                  backgroundColor: el.bgColor || '#ffffff',
                  border: `${el.borderWidth || 2}px solid ${el.borderColor || '#cbd5e1'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  boxSizing: 'border-box',
                  color: el.textColor || '#0f172a',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: isSelected ? '0 0 0 3px rgba(37,99,235,0.3)' : '0 2px 6px rgba(0,0,0,0.04)'
                }}
              >
                {el.text}
              </div>
            );
          }

          if (el.type === 'copy_btn') {
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
                  background: '#2563eb',
                  color: '#ffffff',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '12px',
                  border: isSelected ? '2px solid #000000' : 'none',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.3)'
                }}
              >
                <Copy size={14} />
                <span>{el.label || 'Copy'}</span>
              </div>
            );
          }

          if (el.type === 'link_btn') {
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
                  background: el.bgColor || '#25D366',
                  color: el.textColor || '#ffffff',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 800,
                  fontSize: '13px',
                  border: isSelected ? '2px solid #000000' : 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
                }}
              >
                <ExternalLink size={15} />
                <span>{el.label || 'WhatsApp'}</span>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Selected Element Property Inspector Panel (When element is clicked) */}
      {selectedElement && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: '#ffffff',
            borderTop: '2px solid #e2e8f0',
            padding: '12px 16px',
            boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
            position: 'sticky',
            bottom: 0,
            zIndex: 40
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
              Edit {selectedElement.type.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => handleDeleteElement(selectedElement.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>

          {/* Properties for Heading */}
          {selectedElement.type === 'heading' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={selectedElement.text}
                onChange={e => updateSelectedElement({ text: e.target.value })}
                placeholder="Heading text..."
                style={{ flex: 2, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Size:</span>
                <input
                  type="number"
                  min="12"
                  max="40"
                  value={selectedElement.fontSize || 20}
                  onChange={e => updateSelectedElement({ fontSize: Number(e.target.value) })}
                  style={{ width: '56px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Color:</span>
                <input
                  type="color"
                  value={selectedElement.color || '#0f172a'}
                  onChange={e => updateSelectedElement({ color: e.target.value })}
                  style={{ width: '36px', height: '34px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}

          {/* Properties for Box */}
          {selectedElement.type === 'box' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={selectedElement.text}
                  onChange={e => updateSelectedElement({ text: e.target.value })}
                  placeholder="Text inside box..."
                  style={{ flex: 2, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Width:</span>
                  <input
                    type="number"
                    min="100"
                    max="600"
                    value={selectedElement.width || 240}
                    onChange={e => updateSelectedElement({ width: Number(e.target.value) })}
                    style={{ width: '64px', padding: '6px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Inside Color:
                  <input
                    type="color"
                    value={selectedElement.bgColor || '#ffffff'}
                    onChange={e => updateSelectedElement({ bgColor: e.target.value })}
                    style={{ width: '32px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Border Color:
                  <input
                    type="color"
                    value={selectedElement.borderColor || '#cbd5e1'}
                    onChange={e => updateSelectedElement({ borderColor: e.target.value })}
                    style={{ width: '32px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 700, color: '#334155' }}>
                  Text Color:
                  <input
                    type="color"
                    value={selectedElement.textColor || '#0f172a'}
                    onChange={e => updateSelectedElement({ textColor: e.target.value })}
                    style={{ width: '32px', height: '28px', borderRadius: '6px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Properties for Copy Button */}
          {selectedElement.type === 'copy_btn' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={selectedElement.label}
                onChange={e => updateSelectedElement({ label: e.target.value })}
                placeholder="Button Label (e.g. Copy Mail)"
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                value={selectedElement.copyValue || ''}
                onChange={e => updateSelectedElement({ copyValue: e.target.value })}
                placeholder="Value to copy..."
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          )}

          {/* Properties for Link Button */}
          {selectedElement.type === 'link_btn' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={selectedElement.label}
                onChange={e => updateSelectedElement({ label: e.target.value })}
                placeholder="Link Label..."
                style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
              <input
                type="text"
                value={selectedElement.url}
                onChange={e => updateSelectedElement({ url: e.target.value })}
                placeholder="URL or WhatsApp phone (e.g. https://wa.me/91...)"
                style={{ flex: 1.5, padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* Select Brands Checklist Modal for Database Form */}
      {showBrandSelector && (
        <div className="modal-backdrop" onClick={() => setShowBrandSelector(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px' }}>
              Select Brands for this Data Base Form
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px' }}>
              Choose which OTT brands will use this customized layout
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
              {brands.map(brand => {
                const isChecked = selectedBrands.includes(brand.id);
                return (
                  <div
                    key={brand.id}
                    onClick={() => toggleBrandSelection(brand.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid',
                      borderColor: isChecked ? '#2563eb' : '#e2e8f0',
                      background: isChecked ? '#eff6ff' : '#ffffff',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                      {brand.displayName || brand.name}
                    </span>
                    <div className={`custom-checkbox ${isChecked ? 'checked' : ''}`}>
                      {isChecked && <Check size={14} strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              className="glossy-btn glossy-btn-blue"
              style={{ width: '100%', marginTop: '16px', padding: '12px', borderRadius: '12px' }}
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
