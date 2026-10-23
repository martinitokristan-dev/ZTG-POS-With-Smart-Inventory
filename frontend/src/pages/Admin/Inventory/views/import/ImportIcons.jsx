import React from 'react';

/** Small inline SVG icons used by the import wizard (Lucide-style, 2px stroke). */
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const IconUpload = ({ size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
);
export const IconClose = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
);
export const IconCheck = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} strokeWidth={3}><polyline points="20 6 9 17 4 12" /></svg>
);
export const IconChevron = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className="imp-chevron"><polyline points="6 9 12 15 18 9" /></svg>
);
export const IconSearch = ({ size = 15 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
);
export const IconImage = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
);
export const IconAlert = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
);
export const IconInfo = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
);
export const IconSpinner = ({ size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} className="imp-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
export const IconArrowRight = ({ size = 14 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);
export const IconSpellCheck = ({ size = 18 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="m6 16 6-12 6 12" /><path d="M8 12h8" /><path d="m16 20 2 2 4-4" /></svg>
);
export const IconFile = ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
);
