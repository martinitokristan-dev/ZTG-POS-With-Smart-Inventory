export function ensureToastContainer() {
    let el = document.getElementById('toast-container');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast-container';
        const isMobile = window.innerWidth <= 768;
        el.style.cssText = isMobile 
            ? 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none;max-width:90vw;' 
            : 'position:fixed;bottom:24px;right:24px;z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:flex-end;pointer-events:none;';
        document.body.appendChild(el);
    }
}

export function showToast(message, type = 'success') {
    ensureToastContainer();
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');

    toast.style.cssText = `
        background: #0F172A;
        color: #F8FAFC;
        padding: 11px 20px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
        font-size: 13.5px;
        font-weight: 600;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: -0.1px;
        pointer-events: auto;
        opacity: 0;
        transform: translateY(12px) scale(0.96);
        transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: calc(100vw - 32px);
        word-break: break-word;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    `;

    toast.innerHTML = `<span>${message}</span>`;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0) scale(1)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-6px) scale(0.97)';
        setTimeout(() => toast.remove(), 350);
    }, 3000);
}

export function showCenterToast(message, duration = 2800) {
    const existing = document.getElementById('center-toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'center-toast-notification';
    toast.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.94);
        background: rgba(255, 255, 255, 0.90);
        color: #0F172A;
        padding: 14px 26px;
        border-radius: 12px;
        border: 1px solid rgba(0, 0, 0, 0.12);
        box-shadow: 0 20px 35px -5px rgba(0, 0, 0, 0.15), 0 10px 15px -5px rgba(0, 0, 0, 0.08);
        font-size: 13.5px;
        font-weight: 600;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: -0.1px;
        z-index: 999999;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        max-width: min(480px, calc(100vw - 32px));
        text-align: center;
        line-height: 1.45;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    `;

    toast.innerText = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translate(-50%, -50%) scale(1)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translate(-50%, -50%) scale(0.94)';
        setTimeout(() => toast.remove(), 280);
    }, duration);
}



