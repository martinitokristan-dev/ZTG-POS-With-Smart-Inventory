import React, { useEffect, useState } from 'react';
import ConfirmModal from './ConfirmModal';
import { subscribeConfirmDialog } from '../utils/confirmDialog';

/**
 * Renders the in-app confirmation dialog requested through confirmDialog().
 * Mount once, near the root of the app.
 */
export default function ConfirmDialogHost() {
    const [request, setRequest] = useState(null);

    useEffect(() => subscribeConfirmDialog(setRequest), []);

    const close = (answer) => {
        if (!request) return;
        request.resolve(answer);
        setRequest(null);
    };

    return (
        <ConfirmModal
            isOpen={!!request}
            onClose={() => close(false)}
            onConfirm={() => close(true)}
            title={request?.title}
            message={request?.message}
            confirmText={request?.confirmText}
            cancelText={request?.cancelText}
            variant={request?.variant}
        />
    );
}
