import React, { useState, useEffect } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';
import ImageUploadOverlay from '../../../../shared/components/ImageUploadOverlay';
import api from '../../../../shared/api';
import useSystemSettings from '../../../../shared/hooks/useSystemSettings';
import VariantGeneratorPanel from './VariantGeneratorPanel';
import { showToast } from '../../../../utils/toast';
import { priceInputValue, priceForApi } from '../../../../shared/utils/price';

const VariantImageUpload = ({ variant, idx, onUpdateVariantImage, baseImage }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        if (variant.image && variant.image !== baseImage) {
            fd.append('old_image', variant.image);
        }

        try {
            setUploading(true);
            const res = await api.post('/products/upload-image', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            onUpdateVariantImage(idx, res.data.url);
        } catch (err) {
            console.error('Failed to upload variant image', err);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveImage = (e) => {
        e.stopPropagation();
        onUpdateVariantImage(idx, null);
    };

    const hasCustomImage = variant.image && variant.image !== baseImage;

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <ImageUploadOverlay isUploading={uploading} borderRadius="6px" spinnerSize={18} />
            {hasCustomImage ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={variant.image} alt="Variant preview" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                    <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                        style={{ fontSize: '11px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                        Remove Custom Image
                    </button>
                </div>
            ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {baseImage && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', opacity: 0.9 }} title="Inheriting base product image">
                            <img src={baseImage} alt="Base preview" style={{ width: '28px', height: '28px', borderRadius: '4px', objectFit: 'cover', border: '1.5px dashed var(--primary)' }} />
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>(Base Image)</span>
                        </div>
                    )}
                    <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #2563EB)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px dashed var(--primary)', padding: '3px 8px', borderRadius: '4px', backgroundColor: 'rgba(37, 99, 235, 0.1)' }}>
                        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
                        + Custom Image
                    </label>
                </div>
            )}
        </div>
    );
};

const generateNextVariantPartNo = (basePartNo, index) => {
    if (!basePartNo || !basePartNo.trim()) return '';
    const trimmed = basePartNo.trim();
    const match = trimmed.match(/^(.*?)(\d+)$/);
    if (match) {
        const prefix = match[1];
        const numStr = match[2];
        const nextNum = parseInt(numStr, 10) + index + 1;
        const padded = String(nextNum).padStart(numStr.length, '0');
        return `${prefix}${padded}`;
    }
    return `${trimmed}-${index + 1}`;
};

const ImageUploadDropzone = ({ image, onUpload, uploading = false, progress = 0 }) => (
    <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', backgroundColor: 'var(--bg-secondary)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        <input type="file" accept="image/*" onChange={onUpload} disabled={uploading} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: uploading ? 'wait' : 'pointer', width: '100%', height: '100%', zIndex: 5 }} />
        <ImageUploadOverlay isUploading={uploading} progress={progress} borderRadius="8px" />
        {image ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img src={image} alt="Preview" style={{ maxHeight: '120px', borderRadius: '4px', objectFit: 'cover' }} />
                <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>Replace product image</span>
            </div>
        ) : (
            <>
                <svg viewBox="0 0 24 24" style={{ width: '32px', height: '32px', fill: 'none', stroke: 'currentColor', strokeWidth: 2, display: 'block', margin: '0 auto 8px auto', opacity: 0.5 }}>
                    <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Click to upload product image or drag and drop<br />
                <span style={{ fontSize: '11px', opacity: 0.7 }}>SVG, PNG, JPG or GIF (max. 800x400px)</span>
            </>
        )}
    </div>
);

export default function ProductFormModal({
    isOpen, mode,
    onClose, onSubmit,
    formData, setFormData,
    categories, brands = [], variantOptions, onCreateVariantOption = null,
    handleAddressChange, handleImageUpload, uploadingImage = false, imageProgress = 0,
    errorMessage, selectedProduct,
    isSubmitting = false,
    permissions = {}
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (isOpen && e.key === 'Enter') {
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') return;
                // prevent default to avoid double firing if focused on the form input
                e.preventDefault();
                const btn = document.getElementById('submitProductBtn');
                if (btn) btn.click();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const [isTranslating, setIsTranslating] = useState(false);
    // Client-side check messages (e.g. trailing dash in a part number), shown in the red box at the top.
    const [formError, setFormError] = useState('');
    useEffect(() => { if (!isOpen) setFormError(''); }, [isOpen]);
    const [lastAutoTranslation, setLastAutoTranslation] = useState('');
    const [availableBrands, setAvailableBrands] = useState(brands || []);

    useEffect(() => {
        if (Array.isArray(brands) && brands.length > 0) {
            setAvailableBrands(brands);
        }
    }, [brands]);

    useEffect(() => {
        if (isOpen) {
            api.get('/brands')
                .then(res => {
                    if (Array.isArray(res.data)) {
                        setAvailableBrands(res.data);
                    }
                })
                .catch(err => console.error('Failed to load brands in ProductFormModal:', err));
        }
    }, [isOpen]);

    // Debounced real-time automatic translation for main product name
    useEffect(() => {
        if (!isOpen) return;
        const nameVal = formData.name?.trim();
        if (!nameVal) return;

        const isChineseEmpty = !formData.chinese_name || formData.chinese_name.trim() === '';
        const isMatched = formData.chinese_name === lastAutoTranslation;

        let timer;
        if (isChineseEmpty || isMatched) {
            timer = setTimeout(async () => {
                setIsTranslating(true);
                try {
                    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(nameVal)}&langpair=en|zh-CN`);
                    const data = await res.json();
                    if (data?.responseData?.translatedText) {
                        const translated = data.responseData.translatedText;
                        setFormData(prev => ({
                            ...prev,
                            chinese_name: translated
                        }));
                        setLastAutoTranslation(translated);
                    }
                } catch (err) {
                    console.error("Auto-translation failed:", err);
                } finally {
                    setIsTranslating(false);
                }
            }, 600);
        }

        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [formData.name, isOpen]);

    const { 
        enable_product_variants, 
        enable_dual_pricing, 
        track_warehouse_locations, 
        price1_label, 
        price2_label,
        units_of_measure
    } = useSystemSettings();

    if (!isOpen) return null;

    const isEdit = mode === 'edit';
    const canMutate = isEdit ? (permissions.canEdit !== false) : (permissions.canCreate !== false);
    const isReadOnly = !canMutate;
    const title = isReadOnly 
        ? `Product Details: ${selectedProduct?.name || formData.name || 'Item'}` 
        : (isEdit ? `Edit Product: ${selectedProduct?.name}` : 'Add New Product');
    const submitLabel = isEdit
        ? (isSubmitting ? 'Updating Product...' : 'Update Product')
        : (isSubmitting ? 'Adding Product...' : 'Add Product');

    const triggerTranslation = async () => {
        const nameVal = formData.name?.trim();
        if (!nameVal) {
            showToast('Please enter an English Name first.', 'error');
            return;
        }
        setIsTranslating(true);
        try {
            const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(nameVal)}&langpair=en|zh-CN`);
            const data = await res.json();
            if (data?.responseData?.translatedText) {
                const translated = data.responseData.translatedText;
                setFormData(prev => ({
                    ...prev,
                    chinese_name: translated
                }));
                setLastAutoTranslation(translated);
            } else {
                showToast('Translation failed. Please enter it manually.', 'error');
            }
        } catch (err) {
            showToast('Translation failed. Please enter it manually.', 'error');
        } finally {
            setIsTranslating(false);
        }
    };

    // Variant types the selected category allows. Categories are linked to types by id (variant_type_ids),
    // so renaming a type never hides its options. Falls back to matching by lowercase name only for a
    // category object that carries just `variants` (e.g. an optimistic copy before the server reply).
    const selectedCatObj = categories.find(c => c.id === parseInt(formData.category_id));
    const allowedTypeIds = Array.isArray(selectedCatObj?.variant_type_ids) ? selectedCatObj.variant_type_ids : null;
    const allowedTypeNames = (selectedCatObj?.variants || []).map(t => t.toLowerCase());
    const allowedVariantTypes = (variantOptions || []).filter(v => allowedTypeIds
        ? allowedTypeIds.includes(v.id)
        : allowedTypeNames.includes(v.name.toLowerCase()));
    const assignedTypeCount = allowedTypeIds ? allowedTypeIds.length : allowedTypeNames.length;

    // New rows start from the parent's name, prices and alert level, with a suggested part number.
    const buildVariantRow = (rowIndex, optionIds = []) => ({
        name: formData.name || '',
        chinese_name: formData.chinese_name || '',
        part_no: generateNextVariantPartNo(formData.part_no, rowIndex),
        // New variant rows start with the product's prices; an empty price stays empty (never 0).
        price1: priceForApi(formData.price1), price2: priceForApi(formData.price2),
        stock: 0, alert_limit: formData.alert_limit || 5, option_ids: optionIds
    });

    // Rows come from the generator with their OWN price / stock / alert level (every variant is different).
    const handleGenerateVariants = (newRows) => {
        const current = formData.variants || [];
        const added = newRows.map((r, i) => ({
            ...buildVariantRow(current.length + i, r.option_ids),
            price1: r.price1,
            // Single-price mode keeps price2 equal to price1, same as the base product fields.
            price2: enable_dual_pricing ? r.price2 : r.price1,
            stock: r.stock,
            alert_limit: r.alert_limit,
        }));
        setFormData({ ...formData, variants: [...current, ...added] });
    };

    const renderVariantOptionsForVariant = (variant, idx) => {
        if (!selectedCatObj) return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a category first.</div>;

        if (assignedTypeCount === 0) {
            return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No variant types are assigned to this category.</div>;
        }

        const filteredOptions = allowedVariantTypes;
        if (!filteredOptions || filteredOptions.length === 0) {
            return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No variant options configured for category.</div>;
        }

        return filteredOptions.map(vType => {
            const targetCanonicalId = vType.canonical_type_id || vType.id;
            const siblingTypes = variantOptions?.filter(vt => (vt.canonical_type_id || vt.id) === targetCanonicalId);
            const selectedVal = variant.option_ids?.find(id => {
                return siblingTypes?.some(vt => vt.options.some(opt => opt.id === id));
            }) || '';

            const formattedOpts = vType.options.map(opt => ({
                value: String(opt.id),
                label: opt.value
            }));

            return (
                <div className="form-group" key={vType.id} style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ color: 'var(--primary)' }}>{vType.name} *</label>
                    <IOSSelect
                        value={selectedVal}
                        placeholder={`Select ${vType.name}...`}
                        options={formattedOpts}
                        onCreateOption={onCreateVariantOption
                            ? (text) => onCreateVariantOption(vType.id, text).then(created => created.id)
                            : null}
                        createLabel={`Add new ${vType.name}`}
                        onChange={(e) => {
                            const val = parseInt(e.target.value);
                            const nv = [...formData.variants];
                            const oldIds = nv[idx].option_ids || [];

                            const siblingOptionIds = siblingTypes?.flatMap(vt => vt.options.map(opt => opt.id)) || [];
                            const filteredIds = oldIds.filter(id => !siblingOptionIds.includes(id));
                            if (!isNaN(val)) filteredIds.push(val);
                            nv[idx].option_ids = filteredIds;
                            setFormData({ ...formData, variants: nv });
                        }}
                    />
                </div>
            );
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        if (formData.variants && formData.variants.length > 0) {
            for (let i = 0; i < formData.variants.length; i++) {
                const v = formData.variants[i];
                if (!v.name || !v.name.trim()) {
                    v.name = formData.name?.trim() || 'Variant';
                }
                if (v.part_no && v.part_no.endsWith('-')) {
                    // Shown in the form's red error box at the top (no browser popup).
                    setFormError(`Variant part number "${v.part_no}" cannot end with a trailing dash. Please provide a suffix.`);
                    document.querySelector('.modal-card-lg .modal-body')?.scrollTo({ top: 0, behavior: 'smooth' });
                    return;
                }
            }
        }
        onSubmit(e);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-card modal-card-lg" style={{ maxWidth: '700px', width: '90%' }}>
                <form onSubmit={handleSubmit}>
                    <div className="modal-header">
                        <h3 className="modal-title">{title}</h3>
                        <button type="button" className="modal-close" onClick={onClose}>
                            <svg viewBox="0 0 24 24" style={{ width: '20px', height: '20px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                                <path d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {isReadOnly && (
                            <div style={{
                                padding: '11px 14px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-secondary)',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                marginBottom: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                <span style={{ fontSize: '16px' }}>🔒</span>
                                <span><strong>Read-Only View:</strong> You have permission to inspect this product's details, but not modify them.</span>
                            </div>
                        )}

                        {(formError || errorMessage) && <div role="alert" style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{formError || errorMessage}</div>}

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Product Image <span style={{ color: 'red' }}>*</span></label>
                            <ImageUploadDropzone image={formData.image} onUpload={handleImageUpload} uploading={uploadingImage} progress={imageProgress} />
                        </div>

                        {/* Basic Information Section */}
                        <div className="section-header">Basic Information</div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Part Number (Optional)</label>
                                <input type="text" className="form-control" placeholder="e.g. TRK-003 or leave blank" value={formData.part_no} onChange={(e) => setFormData({ ...formData, part_no: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">English Name (Optional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. Track Link Assembly or leave blank"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Category <span style={{ color: 'red' }}>*</span></label>
                                <IOSSelect
                                    value={formData.category_id}
                                    placeholder="Select Category"
                                    options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Brand (Optional)</label>
                                <IOSSelect
                                    value={formData.brand_id ? String(formData.brand_id) : ''}
                                    placeholder="Select Brand (Optional)"
                                    options={[
                                        { value: '', label: 'None / Generic' },
                                        ...(availableBrands || []).map(b => ({ value: String(b.id), label: b.name }))
                                    ]}
                                    onChange={(e) => setFormData({ ...formData, brand_id: e.target.value || null })}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="chineseName">Chinese Name (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    id="chineseName"
                                    className="form-control"
                                    placeholder="e.g. 履带链节总成 or leave blank"
                                    value={formData.chinese_name}
                                    onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })}
                                    style={{ paddingRight: '115px' }}
                                />
                                <button
                                    type="button"
                                    onClick={triggerTranslation}
                                    disabled={isTranslating}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'var(--bg-secondary, #F1F5F9)',
                                        border: '1px solid var(--border, #CBD5E1)',
                                        borderRadius: '6px',
                                        color: isTranslating ? 'var(--text-secondary, #64748B)' : 'var(--primary, #2563EB)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '4px 8px',
                                        cursor: isTranslating ? 'not-allowed' : 'pointer',
                                        outline: 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    {isTranslating ? 'Translating...' : 'Auto-Translate'}
                                </button>
                            </div>
                        </div>

                        {/* Unit of Measure & Warehouse Address Section */}
                        <div className="section-header">Unit of Measure & Warehouse Location</div>
                        <div style={{ display: 'grid', gridTemplateColumns: track_warehouse_locations ? '1fr 2fr' : '1fr', gap: '16px', marginBottom: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Unit of Measure (UOM)</label>
                                <IOSSelect
                                    value={formData.uom || 'Piece / PCS'}
                                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                                    options={(units_of_measure || ['Piece / PCS', 'Unit', 'Roll', 'Meter / m', 'Set', 'Box', 'Pack', 'Pair', 'Kilogram / kg', 'Liter / L']).map(u => ({ value: u, label: u }))}
                                    placeholder="Select UOM..."
                                />
                            </div>
                            {track_warehouse_locations && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">Warehouse Address</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g. Aisle 1, Hang 3, Shelf A-2, etc."
                                        value={formData.address || ''}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Pricing & Stock Alert levels */}
                        <div className="section-header">Pricing & Stock Alerts</div>
                        <div style={{ display: 'grid', gridTemplateColumns: enable_dual_pricing ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">{price1_label || 'Original Price'}</label>
                                {/* Blank = no price yet (saved empty, cannot be sold at this price). 0 stays 0. */}
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    min="0" 
                                    step="any" 
                                    placeholder="No price" 
                                    value={priceInputValue(formData.price1)} 
                                    onChange={(e) => {
                                        const newPrice1 = e.target.value === '' ? '' : parseFloat(e.target.value);
                                        setFormData(prev => ({
                                            ...prev,
                                            price1: newPrice1,
                                            price2: !enable_dual_pricing ? newPrice1 : prev.price2
                                        }));
                                    }}
                                    onKeyDown={(e) => {
                                        if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                            {enable_dual_pricing && (
                                <div className="form-group" style={{ marginBottom: 0 }}>
                                    <label className="form-label">{price2_label || 'Retail Price'}</label>
                                    <input 
                                        type="number" 
                                        className="form-control" 
                                        min="0" 
                                        step="any" 
                                        placeholder="No price" 
                                        value={priceInputValue(formData.price2)} 
                                        onChange={(e) => setFormData({ ...formData, price2: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                                        onKeyDown={(e) => {
                                            if (!/^[0-9.]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                                e.preventDefault();
                                            }
                                        }}
                                    />
                                </div>
                            )}
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">{mode === 'edit' ? 'Current Stock' : 'Initial Stock'} {mode !== 'edit' && <span style={{ color: 'red' }}>*</span>}</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    required
                                    min="0"
                                    placeholder="0"
                                    value={formData.stock === 0 ? '' : formData.stock}
                                    onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                    onKeyDown={(e) => {
                                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                    disabled={mode === 'edit'}
                                    style={mode === 'edit' ? { backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Alert Level <span style={{ color: 'red' }}>*</span></label>
                                <input 
                                    type="number" 
                                    className="form-control" 
                                    required 
                                    min="1" 
                                    placeholder="5" 
                                    value={formData.alert_limit === 0 ? '' : formData.alert_limit} 
                                    onChange={(e) => setFormData({ ...formData, alert_limit: e.target.value === '' ? '' : parseInt(e.target.value) })}
                                    onKeyDown={(e) => {
                                        if (!/^[0-9]$/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter'].includes(e.key) && !e.ctrlKey && !e.metaKey) {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Status & Variants */}
                        <div className="section-header">Status & Variants</div>
                        <div className="grid-2">
                            {/* Status only applies when editing: new products get their status from stock, and the
                                server derives Low Stock / No Stock itself, so the dropdown offers Active or Disabled only. */}
                            {isEdit && (
                                <div className="form-group">
                                    <label className="form-label" htmlFor="productStatusSelect">
                                        {(formData.variants || []).length > 0 ? 'Base Product Status' : 'Product Status'}
                                    </label>
                                    <select
                                        id="productStatusSelect"
                                        className="form-control"
                                        value={formData.status === 'Disabled' ? 'Disabled' : 'Active'}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            // Re-enabling a base product that was Disabled also re-enables its variants on save,
                                            // so show them as Active here too. (Compared with the ORIGINAL status, so toggling
                                            // the dropdown back and forth never wipes a variant you disabled on its own.)
                                            const revive = next === 'Active' && selectedProduct?.status === 'Disabled';
                                            setFormData({
                                                ...formData,
                                                status: next,
                                                variants: revive ? (formData.variants || []).map(v => ({ ...v, status: 'Active' })) : formData.variants
                                            });
                                        }}
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Disabled">Disabled (hidden from POS)</option>
                                    </select>
                                    {(formData.variants || []).length > 0 && (
                                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.4 }}>
                                            Disabled here hides the base product and all {(formData.variants || []).length} of its variants.
                                            To hide only one variant, use that variant's own Status below.
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} checked={formData.is_dead_stock} onChange={(e) => setFormData({ ...formData, is_dead_stock: e.target.checked })} />
                                    Mark as Dead Stock
                                </label>
                            </div>
                        </div>

                        {enable_product_variants && (
                            <div style={{ marginTop: '12px', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--bg-secondary)', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Product Variants</span>
                                    <button type="button" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px' }}
                                        onClick={() => {
                                            const current = formData.variants || [];
                                            setFormData({ ...formData, variants: [...current, buildVariantRow(current.length)] });
                                        }}>
                                        <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 }}><path d="M12 5v14M5 12h14" /></svg>
                                        Add Variant
                                    </button>
                                </div>

                                <VariantGeneratorPanel
                                    variantTypes={allowedVariantTypes}
                                    existingVariants={formData.variants || []}
                                    onGenerate={handleGenerateVariants}
                                    price1Label={price1_label || 'Orig. Price'}
                                    price2Label={price2_label || 'Retail Price'}
                                    showPrice2={enable_dual_pricing}
                                    defaultAlertLimit={formData.alert_limit || 5}
                                />

                                {(!formData.variants || formData.variants.length === 0) ? (
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center', padding: '10px 0' }}>
                                        No variants added yet. Click "Add Variant" to configure options.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {formData.variants.map((variant, idx) => {
                                            const selectedOptionLabels = (variant.option_ids || []).map(id => {
                                                for (const vt of variantOptions || []) {
                                                    const found = vt.options?.find(o => o.id === id);
                                                    if (found) return found.value;
                                                }
                                                return null;
                                            }).filter(Boolean);

                                        const variantDisplayName = variant.name || formData.name || 'Variant';
                                        // A variant is hidden when it is Disabled itself OR when its base product is Disabled.
                                        const baseDisabled = formData.status === 'Disabled';
                                        const variantOff = baseDisabled || variant.status === 'Disabled';

                                        return (
                                            <div key={idx} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--bg-card)', position: 'relative' }}>
                                                <button type="button" onClick={() => {
                                                    const nv = [...formData.variants];
                                                    nv.splice(idx, 1);
                                                    setFormData({ ...formData, variants: nv });
                                                }} style={{ position: 'absolute', top: '8px', right: '8px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid var(--border)', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                                            {variantDisplayName}
                                                        </span>
                                                        {selectedOptionLabels.length > 0 && (
                                                            <span style={{ color: 'var(--primary, #3B82F6)', fontWeight: '600', fontSize: '13px' }}>
                                                                ({selectedOptionLabels.join(', ')})
                                                            </span>
                                                        )}
                                                        {isEdit && (
                                                            <span
                                                                style={{
                                                                    fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '9999px', lineHeight: 1,
                                                                    backgroundColor: variantOff ? '#FEE2E2' : '#DCFCE7',
                                                                    color: variantOff ? '#DC2626' : '#15803D'
                                                                }}
                                                            >
                                                                {variantOff ? 'Disabled' : 'Active'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <VariantImageUpload
                                                        variant={variant}
                                                        idx={idx}
                                                        baseImage={formData.image}
                                                        onUpdateVariantImage={(index, newUrl) => {
                                                            const nv = [...formData.variants];
                                                            nv[index].image = newUrl;
                                                            setFormData({ ...formData, variants: nv });
                                                        }}
                                                    />
                                                </div>

                                                <div className="grid-3" style={{ gap: '12px', marginBottom: '12px' }}>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Variant Name</label>
                                                        <input type="text" className="form-control" placeholder={formData.name || "Product Name"} value={variant.name} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].name = e.target.value; setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Chinese Name</label>
                                                        <input
                                                            type="text"
                                                            className="form-control"
                                                            placeholder="Auto-translating..."
                                                            value={variant.chinese_name || ''}
                                                            onChange={(e) => {
                                                                const nv = [...formData.variants]; nv[idx].chinese_name = e.target.value; setFormData({ ...formData, variants: nv });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Variant Part No. (Optional)</label>
                                                        <input type="text" className="form-control" placeholder="e.g. TRK-003-1 or blank" value={variant.part_no} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].part_no = e.target.value; setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                </div>

                                                <div className="grid-4" style={{ gap: '12px', marginBottom: '12px' }}>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Orig. Price</label>
                                                        <input type="number" className="form-control" min="0" placeholder="No price" value={priceInputValue(variant.price1)} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].price1 = e.target.value === '' ? '' : parseFloat(e.target.value); setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Retail Price</label>
                                                        <input type="number" className="form-control" min="0" placeholder="No price" value={priceInputValue(variant.price2)} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].price2 = e.target.value === '' ? '' : parseFloat(e.target.value); setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        {/* Stock of an already-saved variant changes through Restock. A variant that is being
                                                            added right now (no id yet) still needs its starting stock. */}
                                                        <label className="form-label">{isEdit && variant.id ? 'Current Stock' : 'Initial Stock'}</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            required
                                                            min="0"
                                                            value={variant.stock === 0 ? '' : variant.stock}
                                                            onChange={(e) => {
                                                                const nv = [...formData.variants]; nv[idx].stock = e.target.value === '' ? '' : parseInt(e.target.value); setFormData({ ...formData, variants: nv });
                                                            }}
                                                            disabled={isEdit && !!variant.id}
                                                            style={isEdit && variant.id ? { backgroundColor: 'var(--bg-secondary)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                                                        />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Alert Lvl</label>
                                                        <input type="number" className="form-control" required min="0" value={variant.alert_limit === 0 ? '' : variant.alert_limit} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].alert_limit = e.target.value === '' ? '' : parseInt(e.target.value); setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                </div>

                                                <div className="grid-2" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                                                    {renderVariantOptionsForVariant(variant, idx)}
                                                </div>

                                                {/* Availability: last row of the card, with a plain-words explanation beside the dropdown */}
                                                {isEdit && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 16px', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '12px' }}>
                                                        <div className="form-group" style={{ marginBottom: 0, flex: '0 0 260px', maxWidth: '100%' }}>
                                                            <label className="form-label" htmlFor={`variantStatus-${idx}`}>Variant Status</label>
                                                            <select
                                                                id={`variantStatus-${idx}`}
                                                                className="form-control"
                                                                value={variantOff ? 'Disabled' : 'Active'}
                                                                disabled={baseDisabled}
                                                                onChange={(e) => {
                                                                    const nv = [...formData.variants];
                                                                    nv[idx] = { ...nv[idx], status: e.target.value };
                                                                    setFormData({ ...formData, variants: nv });
                                                                }}
                                                            >
                                                                <option value="Active">Active</option>
                                                                <option value="Disabled">Disabled (hidden from POS)</option>
                                                            </select>
                                                        </div>
                                                        <div style={{ flex: '1 1 220px', fontSize: '12px', lineHeight: 1.45, color: 'var(--text-secondary)' }}>
                                                            {baseDisabled
                                                                ? 'The base product is Disabled, so this variant is hidden from POS too.'
                                                                : variantOff
                                                                    ? 'Only this variant is hidden from POS. The base product and the other variants are not affected.'
                                                                    : 'This variant can be sold in POS. Choose Disabled to hide only this variant.'}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Initial Damaged / Scrap Count</label>
                            <input type="number" className="form-control" min="0" value={formData.damaged} onChange={(e) => setFormData({ ...formData, damaged: parseInt(e.target.value) || 0 })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes / Description</label>
                            <textarea className="form-control" rows="2" placeholder="Enter optional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: isReadOnly ? 'flex-end' : 'space-between', alignItems: 'center' }}>
                        {!isReadOnly && (
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fields marked with <span style={{ color: 'red' }}>*</span> are required.</div>
                        )}
                        <div className="modal-footer" style={{ margin: 0, padding: 0, border: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
                                {isReadOnly ? 'Close' : 'Cancel'}
                            </button>
                            {!isReadOnly && (
                                <button id="submitProductBtn" type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                            <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: '13px', height: '13px', borderWidth: '2px' }}></span>
                                            {submitLabel}
                                        </span>
                                    ) : (
                                        submitLabel
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
