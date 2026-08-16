import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Laravel Echo requires Pusher to be on the window object
window.Pusher = Pusher;

const apiBaseUrl = import.meta.env.VITE_API_URL || '';
// Resolve absolute auth endpoint for cross-origin deployments (e.g. static Vercel frontend calling Render backend)
const resolvedAuthEndpoint = apiBaseUrl.includes('://')
    ? (apiBaseUrl.endsWith('/') ? apiBaseUrl : apiBaseUrl + '/') + 'broadcasting/auth'
    : '/api/broadcasting/auth';

const echoInstance = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || '',
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1',
    forceTLS: true,
    authEndpoint: resolvedAuthEndpoint,
    auth: {
        headers: {
            // Using a getter ensures the token is dynamically fetched
            // at the exact moment of connection / subscription auth
            get Authorization() {
                const token = (sessionStorage.getItem('auth_token') ?? localStorage.getItem('auth_token'));
                return token ? `Bearer ${token}` : '';
            }
        }
    }
});

try {
    echoInstance.connector.pusher.connection.bind('connected', () => {
        console.log('[Echo] Connected to Pusher successfully.');
    });
    echoInstance.connector.pusher.connection.bind('failed', (err) => {
        console.warn('[Echo] Connection to Pusher failed:', err);
    });
    echoInstance.connector.pusher.connection.bind('error', (err) => {
        console.error('[Echo] Pusher connection error:', err);
    });
} catch (e) {
    console.error('[Echo] Failed to bind connection listeners:', e);
}

export default echoInstance;
