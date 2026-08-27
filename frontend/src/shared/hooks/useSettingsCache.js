import api from '../api';

const TTL_MS = 15 * 60 * 1000; // 15 minutes
const EMPLOYEE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let settingsCache = {
    user: { data: null, ts: 0 },
    settings: { data: null, ts: 0 },
    categories: { data: null, ts: 0 },
    variants: { data: null, ts: 0 },
    alertRules: { data: null, ts: 0 },
    employees: { data: null, ts: 0 },
    checkers: { data: null, ts: 0 },
};

export const resetSettingsCache = (key = null) => {
    if (key) {
        settingsCache[key] = { data: null, ts: 0 };
    } else {
        settingsCache = {
            user: { data: null, ts: 0 },
            settings: { data: null, ts: 0 },
            categories: { data: null, ts: 0 },
            variants: { data: null, ts: 0 },
            alertRules: { data: null, ts: 0 },
            employees: { data: null, ts: 0 },
            checkers: { data: null, ts: 0 },
        };
    }
};

export async function fetchSettingData(key, endpoint) {
    const now = Date.now();
    const ttl = key === 'employees' ? EMPLOYEE_TTL_MS : TTL_MS;

    if (settingsCache[key] && settingsCache[key].data && (now - settingsCache[key].ts < ttl)) {
        return settingsCache[key].data;
    }

    const res = await api.get(endpoint);
    const data = res.data;

    settingsCache[key] = {
        data,
        ts: now
    };

    return data;
}
