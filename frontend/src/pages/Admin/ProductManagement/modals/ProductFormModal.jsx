import React, { useState, useEffect } from 'react';
import IOSSelect from '../../../../shared/components/IOSSelect';
import ImageUploadOverlay from '../../../../shared/components/ImageUploadOverlay';
import api from '../../../../shared/api';

const VariantImageUpload = ({ variant, idx, onUpdateVariantImage }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        if (variant.image) {
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

    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <ImageUploadOverlay isUploading={uploading} borderRadius="6px" spinnerSize={18} />
            {variant.image ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <img src={variant.image} alt="Variant preview" style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid var(--border)' }} />
                    <button
                        type="button"
                        onClick={handleRemoveImage}
                        disabled={uploading}
                        style={{ fontSize: '11px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                    >
                        Remove Image
                    </button>
                </div>
            ) : (
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--primary, #2563EB)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px dashed var(--primary)', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#EFF6FF' }}>
                    <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} style={{ display: 'none' }} />
                    + Upload Custom Image
                </label>
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
    <div style={{ border: '2px dashed var(--border)', borderRadius: '8px', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px', backgroundColor: '#F8FAFC', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
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
    categories, variantOptions,
    handleAddressChange, handleImageUpload, uploadingImage = false, imageProgress = 0,
    errorMessage, selectedProduct,
    isSubmitting = false
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
    const [lastAutoTranslation, setLastAutoTranslation] = useState('');

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

    if (!isOpen) return null;

    const isEdit = mode === 'edit';
    const title = isEdit ? `Edit Product: ${selectedProduct?.name}` : 'Add New Product';
    const submitLabel = isEdit
        ? (isSubmitting ? 'Updating Product...' : 'Update Product')
        : (isSubmitting ? 'Adding Product...' : 'Add Product');

    const triggerTranslation = async () => {
        const nameVal = formData.name?.trim();
        if (!nameVal) {
            alert("Please enter an English Name first.");
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
                alert("Translation failed. Please enter it manually.");
            }
        } catch (err) {
            alert("Translation failed. Please enter it manually.");
        } finally {
            setIsTranslating(false);
        }
    };

    const renderVariantOptionsForVariant = (variant, idx) => {
        const selectedCatId = parseInt(formData.category_id);
        if (!selectedCatId) return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Select a category first.</div>;

        const selectedCatObj = categories.find(c => c.id === selectedCatId);
        if (!selectedCatObj || !selectedCatObj.variants || selectedCatObj.variants.length === 0) {
            return <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No variant types are assigned to this category.</div>;
        }

        const allowedTypes = selectedCatObj.variants ? selectedCatObj.variants.map(t => t.toLowerCase()) : [];
        const filteredOptions = variantOptions?.filter(v => allowedTypes.includes(v.name.toLowerCase()));
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
        if (formData.variants && formData.variants.length > 0) {
            for (let i = 0; i < formData.variants.length; i++) {
                const v = formData.variants[i];
                if (!v.name || !v.name.trim()) {
                    v.name = formData.name?.trim() || 'Variant';
                }
                if (v.part_no && v.part_no.endsWith('-')) {
                    alert(`Variant part number "${v.part_no}" cannot end with a trailing dash. Please provide a suffix.`);
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
                        {errorMessage && <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '6px', fontSize: '13px', fontWeight: 600, marginBottom: '16px' }}>{errorMessage}</div>}

                        <ImageUploadDropzone image={formData.image} onUpload={handleImageUpload} uploading={uploadingImage} progress={imageProgress} />

                        {/* Basic Information Section */}
                        <div className="section-header">Basic Information</div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Part Number <span style={{ color: 'red' }}>*</span></label>
                                <input type="text" className="form-control" required placeholder="e.g. TRK-003" value={formData.part_no} onChange={(e) => setFormData({ ...formData, part_no: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Category <span style={{ color: 'red' }}>*</span></label>
                                <IOSSelect
                                    value={formData.category_id}
                                    placeholder="Select Category"
                                    options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">English Name <span style={{ color: 'red' }}>*</span></label>
                                <input
                                    type="text"
                                    className="form-control"
                                    required
                                    placeholder="e.g. Track Link Assembly"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0 }}>Chinese Name <span style={{ color: 'red' }}>*</span></label>
                                    <button
                                        type="button"
                                        onClick={triggerTranslation}
                                        disabled={isTranslating}
                                        style={{ background: 'none', border: 'none', color: isTranslating ? 'var(--text-secondary, #64748B)' : 'var(--primary, #2563EB)', fontSize: '11px', fontWeight: 600, padding: 0, cursor: isTranslating ? 'not-allowed' : 'pointer', outline: 'none' }}
                                    >
                                        {isTranslating ? 'Translating...' : 'Auto-Translate'}
                                    </button>
                                </div>
                                <input type="text" className="form-control" required placeholder="e.g. 履带链节总成" value={formData.chinese_name} onChange={(e) => setFormData({ ...formData, chinese_name: e.target.value })} />
                            </div>
                        </div>

                        {/* Warehouse Address Section */}
                        <div className="section-header">Warehouse Address / Location</div>
                        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Aisle</label>
                                <input type="text" className="form-control" placeholder="e.g. A" value={formData.aisle} onChange={(e) => handleAddressChange('aisle', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Carrier</label>
                                <input type="text" className="form-control" placeholder="e.g. 12" value={formData.carrier} onChange={(e) => handleAddressChange('carrier', e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Hang</label>
                                <input type="text" className="form-control" placeholder="e.g. 3" value={formData.hang} onChange={(e) => handleAddressChange('hang', e.target.value)} />
                            </div>
                        </div>

                        {/* Pricing & Stock Alert levels */}
                        <div className="section-header">Pricing & Stock Alerts</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '16px' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Original Price <span style={{ color: 'red' }}>*</span></label>
                                <input type="number" className="form-control" required min="0" step="any" placeholder="₱0.00" value={formData.price1 === 0 ? '' : formData.price1} onChange={(e) => setFormData({ ...formData, price1: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Retail Price</label>
                                <input type="number" className="form-control" min="0" step="any" placeholder="₱0.00" value={formData.price2 === 0 ? '' : formData.price2} onChange={(e) => setFormData({ ...formData, price2: e.target.value === '' ? '' : parseFloat(e.target.value) })} />
                            </div>
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
                                    disabled={mode === 'edit'}
                                    style={mode === 'edit' ? { backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: '#94A3B8' } : {}}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label">Alert Level <span style={{ color: 'red' }}>*</span></label>
                                <input type="number" className="form-control" required min="1" placeholder="5" value={formData.alert_limit === 0 ? '' : formData.alert_limit} onChange={(e) => setFormData({ ...formData, alert_limit: e.target.value === '' ? '' : parseInt(e.target.value) })} />
                            </div>
                        </div>

                        {/* Status & Variants */}
                        <div className="section-header">Status & Variants</div>
                        <div className="grid-2">
                            <div className="form-group">
                                <label className="form-label">Product Status</label>
                                <select className="form-control" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: '24px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer' }}>
                                    <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }} checked={formData.is_dead_stock} onChange={(e) => setFormData({ ...formData, is_dead_stock: e.target.checked })} />
                                    Mark as Dead Stock
                                </label>
                            </div>
                        </div>

                        <div style={{ marginTop: '12px', border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--bg-main, #f5f6fa)', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Product Variants</span>
                                <button type="button" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px' }}
                                    onClick={() => {
                                        const newVariants = [...(formData.variants || []), {
                                            name: formData.name || '',
                                            chinese_name: formData.chinese_name || '',
                                            part_no: generateNextVariantPartNo(formData.part_no, formData.variants?.length || 0),
                                            price1: formData.price1 || 0, price2: formData.price2 || 0,
                                            stock: 0, alert_limit: formData.alert_limit || 5, option_ids: []
                                        }];
                                        setFormData({ ...formData, variants: newVariants });
                                    }}>
                                    <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', fill: 'none', stroke: 'currentColor', strokeWidth: 2.5 }}><path d="M12 5v14M5 12h14" /></svg>
                                    Add Variant
                                </button>
                            </div>

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

                                        return (
                                            <div key={idx} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'white', position: 'relative' }}>
                                                <button type="button" onClick={() => {
                                                    const nv = [...formData.variants];
                                                    nv.splice(idx, 1);
                                                    setFormData({ ...formData, variants: nv });
                                                }} style={{ position: 'absolute', top: '8px', right: '8px', color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>

                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #F1F5F9', paddingRight: '24px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0F172A' }}>
                                                            {variantDisplayName}
                                                        </span>
                                                        {selectedOptionLabels.length > 0 && (
                                                            <span style={{ color: '#3B82F6', fontWeight: '600', fontSize: '13px' }}>
                                                                ({selectedOptionLabels.join(', ')})
                                                            </span>
                                                        )}
                                                    </div>
                                                    <VariantImageUpload
                                                        variant={variant}
                                                        idx={idx}
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
                                                        <label className="form-label">Variant Part No. *</label>
                                                        <input type="text" className="form-control" required value={variant.part_no} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].part_no = e.target.value; setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                </div>

                                                <div className="grid-4" style={{ gap: '12px', marginBottom: '12px' }}>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Orig. Price</label>
                                                        <input type="number" className="form-control" required min="0" value={variant.price1 === 0 ? '' : variant.price1} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].price1 = e.target.value === '' ? '' : parseFloat(e.target.value); setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">Retail Price</label>
                                                        <input type="number" className="form-control" min="0" value={variant.price2 === 0 ? '' : variant.price2} onChange={(e) => {
                                                            const nv = [...formData.variants]; nv[idx].price2 = e.target.value === '' ? '' : parseFloat(e.target.value); setFormData({ ...formData, variants: nv });
                                                        }} />
                                                    </div>
                                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                                        <label className="form-label">{mode === 'edit' ? 'Current Stock' : 'Initial Stock'}</label>
                                                        <input
                                                            type="number"
                                                            className="form-control"
                                                            required
                                                            min="0"
                                                            value={variant.stock === 0 ? '' : variant.stock}
                                                            onChange={(e) => {
                                                                const nv = [...formData.variants]; nv[idx].stock = e.target.value === '' ? '' : parseInt(e.target.value); setFormData({ ...formData, variants: nv });
                                                            }}
                                                            disabled={mode === 'edit'}
                                                            style={mode === 'edit' ? { backgroundColor: '#F1F5F9', cursor: 'not-allowed', color: '#94A3B8' } : {}}
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
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Initial Damaged / Scrap Count</label>
                            <input type="number" className="form-control" min="0" value={formData.damaged} onChange={(e) => setFormData({ ...formData, damaged: parseInt(e.target.value) || 0 })} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes / Description</label>
                            <textarea className="form-control" rows="2" placeholder="Enter optional notes..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}></textarea>
                        </div>
                    </div>

                    <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Fields marked with <span style={{ color: 'red' }}>*</span> are required.</div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
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
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
