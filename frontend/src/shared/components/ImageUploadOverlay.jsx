import React from 'react';

/**
 * Reusable Image Upload Overlay
 * Displays a semi-transparent backdrop with an 8-spoke propeller spinner
 * centered vertically and horizontally, plus clean "Uploading..." status text.
 */
export default function ImageUploadOverlay({
    isUploading = false,
    borderRadius = '8px',
    spinnerSize = 26,
    textColor = 'var(--primary, #2563EB)'
}) {
    if (!isUploading) return null;

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(3px)',
                borderRadius,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 20,
                pointerEvents: 'auto',
                padding: '6px',
                boxSizing: 'border-box',
                textAlign: 'center',
            }}
        >
            {/* 8-Spoke Propeller SVG Spinner */}
            <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke={textColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                    width: `${spinnerSize}px`,
                    height: `${spinnerSize}px`,
                    animation: 'spin 0.9s linear infinite',
                    flexShrink: 0,
                }}
            >
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48 2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48 2.83-2.83" />
            </svg>

            {/* Processing status label */}
            <span
                style={{
                    marginTop: '6px',
                    fontSize: borderRadius === '50%' ? '10px' : '11px',
                    fontWeight: 700,
                    color: textColor,
                    lineHeight: 1.2,
                    letterSpacing: '0.01em',
                }}
            >
                Uploading...
            </span>
        </div>
    );
}
