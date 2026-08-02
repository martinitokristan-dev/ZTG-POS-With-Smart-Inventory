import React, { useState, useRef, useEffect } from 'react';
import ImageUploadOverlay from '../../../../shared/components/ImageUploadOverlay';

/**
 * LogoCropModal Component
 * Interactive circle-crop modal for sidebar logo positioning.
 * Allows user to pan (drag) and zoom (0% - 100%) inside a circular viewport.
 * Uses a clean, light modal design without dark background overlays.
 */
function LogoCropModal({ isOpen, onClose, onConfirm, imageFile, loading, progress = 0 }) {
    const [imageSrc, setImageSrc] = useState(null);
    const [zoomPercent, setZoomPercent] = useState(100); // 20% to 300%
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const imgRef = useRef(null);

    useEffect(() => {
        if (!imageFile) {
            setImageSrc(null);
            return;
        }
        const url = URL.createObjectURL(imageFile);
        setImageSrc(url);
        setZoomPercent(100);
        setPosition({ x: 0, y: 0 });

        return () => {
            URL.revokeObjectURL(url);
        };
    }, [imageFile]);

    if (!isOpen || !imageFile) return null;

    // Calculate actual scale factor (20% = 0.2x, 100% = 1.0x, 300% = 3.0x)
    const currentScale = zoomPercent / 100;

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPosition({
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
                x: e.touches[0].clientX - position.x,
                y: e.touches[0].clientY - position.y
            });
        }
    };

    const handleTouchMove = (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        setPosition({
            x: e.touches[0].clientX - dragStart.x,
            y: e.touches[0].clientY - dragStart.y
        });
    };

    const handleSave = () => {
        if (!imgRef.current) return;

        const canvas = document.createElement('canvas');
        const cropSize = 350; // Output resolution for sidebar icon
        canvas.width = cropSize;
        canvas.height = cropSize;
        const ctx = canvas.getContext('2d');

        // Circular clipping mask
        ctx.beginPath();
        ctx.arc(cropSize / 2, cropSize / 2, cropSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        // Calculate viewport bounds
        const viewportSize = 220;
        const img = imgRef.current;
        const scaleFactor = cropSize / viewportSize;

        // Center coordinates and scale
        ctx.translate(cropSize / 2, cropSize / 2);
        ctx.translate(position.x * scaleFactor, position.y * scaleFactor);
        ctx.scale(currentScale * scaleFactor, currentScale * scaleFactor);

        // Draw image centered
        ctx.drawImage(
            img, 
            -img.naturalWidth / 2, 
            -img.naturalHeight / 2, 
            img.naturalWidth, 
            img.naturalHeight
        );

        canvas.toBlob((blob) => {
            if (blob) {
                const sidebarBlobFile = new File([blob], 'sidebar_logo.png', { type: 'image/png' });
                onConfirm(imageFile, sidebarBlobFile);
            }
        }, 'image/png');
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                position: 'relative'
            }}>
                <ImageUploadOverlay isUploading={loading} progress={progress} borderRadius="16px" />
                {/* Header */}
                <div style={{
                    padding: '18px 24px',
                    borderBottom: '1px solid #E2E8F0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#FFFFFF'
                }}>
                    <div>
                        <h5 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#0F172A' }}>
                            Crop Logo for Sidebar
                        </h5>
                        <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#64748B' }}>
                            Adjust position and zoom for the circular sidebar icon
                        </p>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            color: '#94A3B8',
                            cursor: 'pointer',
                            padding: '4px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Body - Crop Area */}
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
                    
                    {/* Light Crop Container */}
                    <div style={{
                        width: '100%',
                        padding: '20px',
                        backgroundColor: '#F8FAFC',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div 
                            onMouseDown={handleMouseDown}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleMouseUp}
                            style={{
                                width: '220px',
                                height: '220px',
                                borderRadius: '50%',
                                border: '3px solid #3B82F6',
                                position: 'relative',
                                overflow: 'hidden',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                userSelect: 'none',
                                backgroundColor: '#FFFFFF',
                                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.15)'
                            }}
                        >
                            {imageSrc && (
                                <img
                                    ref={imgRef}
                                    src={imageSrc}
                                    alt="Crop Target"
                                    draggable={false}
                                    style={{
                                        maxWidth: 'none',
                                        maxHeight: 'none',
                                        transform: `translate(${position.x}px, ${position.y}px) scale(${currentScale})`,
                                        transformOrigin: 'center center',
                                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                                        pointerEvents: 'none'
                                    }}
                                />
                            )}
                        </div>

                        <div style={{ fontSize: '11.5px', fontWeight: '500', color: '#64748B', marginTop: '12px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="5 9 2 12 5 15"></polyline>
                                <polyline points="9 5 12 2 15 5"></polyline>
                                <polyline points="15 19 12 22 9 19"></polyline>
                                <polyline points="19 9 22 12 19 15"></polyline>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <line x1="12" y1="2" x2="12" y2="22"></line>
                            </svg>
                            <span>Drag to adjust position inside the circle</span>
                        </div>
                    </div>

                    {/* Controls */}
                    <div style={{ width: '100%', marginTop: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>
                            <span>Zoom</span>
                            <span>{zoomPercent}%</span>
                        </div>
                        <input
                            type="range"
                            min="20"
                            max="300"
                            step="1"
                            value={zoomPercent}
                            onChange={(e) => setZoomPercent(parseInt(e.target.value, 10))}
                            disabled={loading}
                            style={{
                                width: '100%',
                                accentColor: '#3B82F6',
                                cursor: 'pointer'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>
                            <span>20%</span>
                            <span>100%</span>
                            <span>300%</span>
                        </div>
                    </div>

                    <div style={{
                        marginTop: '16px',
                        padding: '10px 14px',
                        backgroundColor: '#EFF6FF',
                        borderRadius: '8px',
                        border: '1px solid #BFDBFE',
                        fontSize: '11.5px',
                        color: '#1E40AF',
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1D4ED8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>
                            <strong>Note:</strong> The circle-cropped image will display on the <strong>Sidebar</strong>. The full uncropped image will display on the <strong>Login Page</strong>.
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 24px',
                    borderTop: '1px solid #E2E8F0',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '10px',
                    backgroundColor: '#F8FAFC'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="btn btn-light"
                        style={{ padding: '8px 16px', fontSize: '13px', fontWeight: '600' }}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ padding: '8px 20px', fontSize: '13px', fontWeight: '600', backgroundColor: '#3B82F6', borderColor: '#3B82F6' }}
                    >
                        {loading ? 'Uploading...' : 'Apply & Save Logo'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default LogoCropModal;
