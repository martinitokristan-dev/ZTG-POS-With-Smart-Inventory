import api from '../api';

const TTL_MS = 5 * 60 * 1000; // 5 minutes

let dashboardCache = {
    data: null,
    fetchedAt: 0,
    promise: null
};

export const resetDashboardCache = () => {
    dashboardCache = {};
};

export async function fetchDashboardData(timeframe = 'Today') {
    const now = Date.now();
    const cacheKey = timeframe;

    if (dashboardCache[cacheKey] && dashboardCache[cacheKey].data && (now - dashboardCache[cacheKey].fetchedAt < TTL_MS)) {
        return dashboardCache[cacheKey].data;
    }

    if (dashboardCache[cacheKey] && dashboardCache[cacheKey].promise) {
        return dashboardCache[cacheKey].promise;
    }

    if (!dashboardCache[cacheKey]) {
        dashboardCache[cacheKey] = {};
    }

    const tfParam = timeframe.toLowerCase().replace(' ', '_');

    dashboardCache[cacheKey].promise = Promise.all([
        api.get(`/reports/sales-summary?timeframe=${tfParam}`).catch(() => ({ data: { total_revenue: 0 } })),
        api.get(`/reports/product-performance?timeframe=${tfParam}`).catch(() => ({ data: { top_sellers: [] } }))
    ]).then(([summaryRes, performanceRes]) => {
        const topSellers = performanceRes.data.top_sellers || [];
        const topCategories = performanceRes.data.top_categories || [];

        const stats = {
            todayRevenue: summaryRes.data.total_revenue || 0,
            topCategories,
            topSellers,
            last7Days: summaryRes.data.last_7_days || []
        };

        dashboardCache[cacheKey].data = stats;
        dashboardCache[cacheKey].fetchedAt = Date.now();
        dashboardCache[cacheKey].promise = null;
        return stats;
    }).catch(err => {
        dashboardCache[cacheKey].promise = null;
        throw err;
    });

    return dashboardCache[cacheKey].promise;
}
