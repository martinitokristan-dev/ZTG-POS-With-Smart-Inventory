import React, { useState } from 'react';

/**
 * Small form in the Products sidebar for creating a custom variant type (e.g. "Voltage").
 * Kept as its own component so its state does not add hooks to ProductsTab.
 *
 * onAdd(name) must resolve to true when the type was created, so the input can be cleared.
 */
export default function NewVariantTypeForm({ onAdd }) {
    const [name, setName] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async () => {
        if (!name.trim() || saving) return;
        setSaving(true);
        try {
            const ok = await onAdd(name);
            if (ok) setName('');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div style={{ padding: '12px 10px 4px', borderTop: '1px solid var(--border)', marginTop: '8px' }}>
            <label htmlFor="newVariantTypeName" style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                New variant type
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    id="newVariantTypeName"
                    type="text"
                    className="form-control"
                    placeholder="e.g. Voltage"
                    maxLength={100}
                    value={name}
                    disabled={saving}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            submit();
                        }
                    }}
                    style={{ flex: 1, minWidth: 0, height: '34px', fontSize: '13px' }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={submit} disabled={saving || !name.trim()} style={{ flexShrink: 0 }}>
                    {saving ? 'Adding...' : 'Add'}
                </button>
            </div>
        </div>
    );
}
