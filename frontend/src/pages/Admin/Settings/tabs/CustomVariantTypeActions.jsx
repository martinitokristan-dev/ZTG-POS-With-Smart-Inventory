import React, { useState } from 'react';

/**
 * Rename / delete controls shown above a custom variant type's options.
 * Own component so its state does not add hooks to ProductsTab.
 *
 * onRename(type, newName) must resolve to true when the rename succeeded.
 */
export default function CustomVariantTypeActions({ type, onRename, onDelete }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState('');
    const [saving, setSaving] = useState(false);

    const startEdit = () => {
        setValue(type.name);
        setEditing(true);
    };

    const save = async () => {
        if (saving) return;
        if (!value.trim() || value.trim() === type.name) {
            setEditing(false);
            return;
        }
        setSaving(true);
        try {
            const ok = await onRename(type, value);
            if (ok) setEditing(false);
        } finally {
            setSaving(false);
        }
    };

    const linkStyle = { padding: 0, background: 'none', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' };

    if (editing) {
        return (
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '8px' }}>
                <input
                    type="text"
                    className="form-control"
                    aria-label="Variant type name"
                    autoFocus
                    maxLength={100}
                    value={value}
                    disabled={saving}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); save(); }
                        if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
                    }}
                    style={{ height: '32px', fontSize: '13px', width: '220px' }}
                />
                <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving || !value.trim()}>
                    {saving ? 'Saving...' : 'Save'}
                </button>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', gap: '14px', marginTop: '8px' }}>
            {onRename && (
                <button type="button" onClick={startEdit} style={{ ...linkStyle, color: 'var(--primary)' }}>Rename this variant type</button>
            )}
            {onDelete && (
                <button type="button" onClick={() => onDelete(type)} style={{ ...linkStyle, color: '#DC2626' }}>Delete this variant type</button>
            )}
        </div>
    );
}
