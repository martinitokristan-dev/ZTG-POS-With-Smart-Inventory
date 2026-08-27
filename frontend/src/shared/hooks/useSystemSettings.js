import { useState, useEffect, useCallback } from 'react';
import { fetchSettingData } from './useSettingsCache';

const parseBool = (val, defaultValue = true) => {
    if (val === undefined || val === null) return defaultValue;
    if (typeof val === 'boolean') return val;
    const str = String(val).toLowerCase().trim();
    if (str === 'true' || str === '1') return true;
    if (str === 'false' || str === '0') return false;
    return defaultValue;
};

export default function useSystemSettings() {
    const [settingsMap, setSettingsMap] = useState(() => {
        try {
            const cached = localStorage.getItem('cached_business_info');
            if (cached) {
                return JSON.parse(cached);
            }
        } catch (_) {}
        return {};
    });
    const [loading, setLoading] = useState(true);

    const loadSettings = useCallback(async () => {
        try {
            const data = await fetchSettingData('settings', '/settings');
            let map = {};
            if (Array.isArray(data)) {
                data.forEach(item => {
                    if (item && item.key) map[item.key] = item.value;
                });
            } else if (data && typeof data === 'object') {
                map = data.settings || data;
            }
            setSettingsMap(map);
            try {
                localStorage.setItem('cached_business_info', JSON.stringify(map));
            } catch (_) {}
        } catch (err) {
            console.error('Failed to load system settings:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();

        const handleSettingsUpdated = () => {
            loadSettings();
        };

        window.addEventListener('settings_updated', handleSettingsUpdated);
        return () => {
            window.removeEventListener('settings_updated', handleSettingsUpdated);
        };
    }, [loadSettings]);

    let uomList = [
        'Piece / PCS', 'Unit', 'Roll', 'Meter / m', 'Set', 'Box', 'Pack', 'Pair', 'Kilogram / kg', 'Liter / L'
    ];
    if (settingsMap.units_of_measure) {
        try {
            const parsed = typeof settingsMap.units_of_measure === 'string'
                ? JSON.parse(settingsMap.units_of_measure)
                : settingsMap.units_of_measure;
            if (Array.isArray(parsed) && parsed.length > 0) {
                uomList = parsed;
            }
        } catch (_) {}
    }

    return {
        settings: settingsMap,
        loading,
        display_chinese_names: parseBool(settingsMap.display_chinese_names, true),
        enable_product_variants: parseBool(settingsMap.enable_product_variants ?? settingsMap.enable_variants, true),
        enable_dual_pricing: parseBool(settingsMap.enable_dual_pricing, true),
        track_warehouse_locations: parseBool(settingsMap.track_warehouse_locations ?? settingsMap.track_locations, true),
        show_stock_levels_pos: parseBool(settingsMap.show_stock_levels_pos, true),
        show_alerts_on_dashboard: parseBool(settingsMap.show_alerts_on_dashboard, true),
        price1_label: settingsMap.price1_label || 'Original Price',
        price2_label: settingsMap.price2_label || 'Retail Price',
        units_of_measure: uomList,
        refetch: loadSettings
    };
}
