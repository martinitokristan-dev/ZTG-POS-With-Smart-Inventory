import { useState, useEffect } from 'react';
import { useInventory } from '../../../../contexts/InventoryContext';
import { useNotifications } from '../../../../contexts/NotificationContext';
import { fetchDashboardData } from '../../../../shared/hooks/useDashboardCache';
import { flattenToSellableSKUs } from '../../../../shared/utils/skuHelpers';

export function useDashboard() {
    const userStr = localStorage.getItem('auth_user');
    const user = userStr ? JSON.parse(userStr) : null;
    const name = user ? user.real_name || user.name : 'Administrator';
    const [loading, setLoading] = useState(true);

    const [currentTimeRange, setCurrentTimeRange] = useState('Today');

    // UI state
    const [stats, setStats] = useState({
        totalStock: 0,
        todayRevenue: 0,
        productCount: 0,
        variantCount: 0,
        topCategories: []
    });

    // Replace local fetch with context
    const { unreadCount: notificationsCount } = useNotifications();
    const { inventory: products, refetch: refetchInventory } = useInventory();

    // Top selling products state
    const [topProducts, setTopProducts] = useState([]);

    // Always fetch fresh inventory data on dashboard load
    useEffect(() => {
        if (typeof refetchInventory === 'function') {
            refetchInventory();
        }
    }, [refetchInventory]);

    // Instantly calculate total stock & product metrics whenever products update
    useEffect(() => {
        if (!products) return;
        
        const sellableSKUs = flattenToSellableSKUs(products);
        const totalStock = sellableSKUs.reduce((sum, item) => sum + (item.stock || 0), 0);
        
        setStats(prev => ({
            ...prev,
            totalStock: totalStock,
            productCount: products.length,
            variantCount: sellableSKUs.length,
        }));
    }, [products]);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const cachedStats = await fetchDashboardData(currentTimeRange);

                setStats(prev => ({
                    ...prev,
                    todayRevenue: cachedStats.todayRevenue,
                    topCategories: cachedStats.topCategories || [],
                    last7Days: cachedStats.last7Days || []
                }));

                const topSellers = cachedStats.topSellers;
                if (topSellers.length > 0) {
                    const maxSales = topSellers[0].sales_count || 1;
                    const mapped = topSellers.slice(0, 5).map((p, idx) => {
                        const calculatedPercentage = p.stock > 0
                            ? Math.min(Math.round((p.sales_count / p.stock) * 100), 100)
                            : (p.sales_count > 0 ? 100 : 0);

                        const varOption = Array.isArray(p.variant_options)
                            ? p.variant_options.map(o => o.value || o).join(', ')
                            : (p.variant_option || (typeof p.variant_options === 'string' ? p.variant_options : '') || p.variant_name || '');

                        const nameWithVariant = varOption && !p.name.includes(`(${varOption})`)
                            ? `${p.name} (${varOption})`
                            : p.name;

                        return {
                            rank: idx + 1,
                            name: nameWithVariant,
                            partNo: p.part_no,
                            category: p.category || 'Heavy Parts',
                            unitsSold: p.sales_count,
                            revenue: p.revenue || 0,
                            percentage: calculatedPercentage,
                            image: p.image || ''
                        };
                    });
                    setTopProducts(mapped);
                } else {
                    setTopProducts([]);
                }
            } catch (err) {
                console.error("Error loading dashboard data: ", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [currentTimeRange]);

    return {
        name,
        loading,
        currentTimeRange,
        setCurrentTimeRange,
        stats,
        notificationsCount,
        topProducts
    };
}
