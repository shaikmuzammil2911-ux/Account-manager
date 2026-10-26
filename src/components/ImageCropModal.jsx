import React, { useState, useRef, useEffect } from 'react';
import { X, Crop, ZoomIn, ZoomOut, Check, ArrowRight } from 'lucide-react';

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onApplyCrop,
  onSkipCrop,
  onClose
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y
      });
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const executeCrop = () => {
    if (!imgRef.current) {
      if (onSkipCrop) onSkipCrop();
      return;
    }

    const canvas = document.createElement('canvas');
    const cropSize = 300; // Output square size
    canvas.width = cropSize;
    canvas.height = cropSize;
    const ctx = canvas.getContext('2d');

    const img = imgRef.current;
    const previewSize = 220; // Size of CSS viewport box

    // Calculate aspect ratio scale
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW, drawH;
    if (imgAspect >= 1) {
      drawH = previewSize * zoom;
      drawW = drawH * imgAspect;
    } else {
      drawW = previewSize * zoom;
      drawH = drawW / imgAspect;
    }

    // Scale from preview viewport (220px) to output canvas (300px)
    const factor = cropSize / previewSize;
    const canvasCenterX = cropSize / 2;
    const canvasCenterY = cropSize / 2;

    const scaledDrawW = drawW * factor;
    const scaledDrawH = drawH * factor;
    const scaledPanX = pan.x * factor;
    const scaledPanY = pan.y * factor;

    ctx.clearRect(0, 0, cropSize, cropSize);
    ctx.drawImage(
      img,
      canvasCenterX - scaledDrawW / 2 + scaledPanX,
      canvasCenterY - scaledDrawH / 2 + scaledPanY,
      scaledDrawW,
      scaledDrawH
    );

    const croppedBase64 = canvas.toDataURL('image/png', 0.95);
    onApplyCrop(croppedBase64);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Crop size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                Crop Brand Logo
              </h3>
              <p style={{ margin: 0, fontSize: '11.5px', color: '#64748b' }}>
                1:1 Square (Optional)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Crop Viewport */}
          <div
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              width: '220px',
              height: '220px',
              borderRadius: '16px',
              position: 'relative',
              overflow: 'hidden',
              cursor: isDragging ? 'grabbing' : 'grab',
              background: '#0f172a',
              boxShadow: 'inset 0 0 0 2px #2563eb, 0 8px 24px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none',
              touchAction: 'none'
            }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              draggable={false}
              style={{
                maxWidth: 'none',
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                pointerEvents: 'none'
              }}
            />

            {/* Grid overlay for centering guide */}
            <div style={{
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              border: '1px dashed rgba(255,255,255,0.4)',
              borderRadius: '16px'
            }}>
              <div style={{ position: 'absolute', top: '33.3%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ position: 'absolute', top: '66.6%', left: 0, right: 0, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ position: 'absolute', left: '33.3%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.18)' }} />
              <div style={{ position: 'absolute', left: '66.6%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.18)' }} />
            </div>
          </div>

          <p style={{ fontSize: '11.5px', color: '#64748b', marginTop: '8px', marginBottom: '14px', textAlign: 'center' }}>
            Drag to reposition &bull; Use slider below to zoom
          </p>

          {/* Zoom Controls */}
          <div style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            background: '#f1f5f9',
            borderRadius: '12px',
            marginBottom: '16px'
          }}>
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.2))}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
            >
              <ZoomOut size={16} />
            </button>
            <input
              type="range"
              min="0.6"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                cursor: 'pointer',
                accentColor: '#2563eb'
              }}
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3.0, prev + 0.2))}
              style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
            >
              <ZoomIn size={16} />
            </button>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#334155', minWidth: '32px', textAlign: 'right' }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Action Buttons: Apply Crop vs Skip Crop */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              onClick={executeCrop}
              style={{
                width: '100%',
                height: '42px',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
              }}
              id="crop-modal-apply-btn"
            >
              <Crop size={16} />
              <span>Apply 1:1 Crop</span>
            </button>

            <button
              type="button"
              onClick={onSkipCrop}
              style={{
                width: '100%',
                height: '38px',
                background: '#f8fafc',
                color: '#475569',
                border: '1.5px solid #cbd5e1',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
              id="crop-modal-skip-btn"
            >
              <ArrowRight size={15} />
              <span>Use Original (Skip Crop)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
