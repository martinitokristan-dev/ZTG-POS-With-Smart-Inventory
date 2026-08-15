import api from '../api';

const TTL_MS = 2 * 60 * 1000; // 2 minutes

let reservationsCache = {
    pages: {}, // Key: `${search}_${status}` -> { data, ts }
};

export const resetReservationsCache = () => {
    reservationsCache = { pages: {} };
};

export async function fetchReservations(search = '', status = 'All', page = 1, dateFilter = '') {
    const key = `${search}_${status}_${page}_${dateFilter}`;
    const now = Date.now();

    if (reservationsCache.pages[key] && (now - reservationsCache.pages[key].ts < TTL_MS)) {
        return reservationsCache.pages[key].data;
    }

    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status !== 'All') params.set('status', status);
    if (page > 1) params.set('page', page);
    if (dateFilter && dateFilter !== 'all') params.set('date_filter', dateFilter);

    const res = await api.get(`/reservations?${params}`);
    const payload = res.data;

    const data = Array.isArray(payload) ? payload : (payload?.data || []);
    const currentPage = payload?.current_page || 1;
    const lastPage = payload?.last_page || 1;
    const total = payload?.total || data.length;

    const result = {
        data,
        currentPage,
        lastPage,
        total
    };

    reservationsCache.pages[key] = {
        data: result,
        ts: now
    };

    return result;
}
