/**
 * Checks if a specific item (parent or variant) matches the status filter.
 * Compares actual stock levels against alert_limit to compute true status.
 */
export function matchesStatusFilter(item, statusFilter) {
    if (!item) return false;
    if (!statusFilter || statusFilter === 'All') return true;

    const alertLevel = item.alert_limit || 5;
    const isOutOfStock = Number(item.stock) === 0;
    const isLowStock = Number(item.stock) > 0 && Number(item.stock) <= alertLevel;

    let computedStatus = 'Active';
    if (item.status === 'Disabled') {
        computedStatus = 'Disabled';
    } else if (isOutOfStock) {
        computedStatus = 'No Stock';
    } else if (isLowStock) {
        computedStatus = 'Low Stock';
    } else {
        computedStatus = 'Active';
    }

    if (statusFilter === 'Dead Stock') {
        return Boolean(item.is_dead_stock);
    }

    const filterLower = statusFilter.toLowerCase().trim();
    const computedLower = computedStatus.toLowerCase();
    const rawLower = (item.status || '').toLowerCase().trim();

    if (filterLower === 'low stock') {
        return computedLower === 'low stock' || rawLower === 'low stock';
    }
    if (filterLower === 'no stock' || filterLower === 'out of stock') {
        return computedLower === 'no stock' || rawLower === 'no stock' || rawLower === 'out of stock';
    }

    return computedLower === filterLower || rawLower === filterLower;
}

/**
 * Flattens a list of products (which contains parent products and nested variants)
 * into a flat list of sellable SKUs.
 *
 * Rules:
 * 1. A parent product (parent_product_id IS NULL) is included if it has no variants
 *    OR if it has variants and its own stock is > 0.
 * 2. All variant products (either present flat at the root level or nested inside a parent product)
 *    are included.
 * 3. If a statusFilter is provided, filters the resulting SKUs so only matching items are returned.
 *
 * @param {Array} products - List of parent products (possibly with nested variants)
 * @param {string} [statusFilter=null] - Optional status filter to apply
 * @returns {Array} - List of sellable SKUs (flat)
 */
export function flattenToSellableSKUs(products, statusFilter = null) {
    if (!Array.isArray(products)) return [];
    
    const sellableMap = new Map();

    products.forEach(p => {
        if (!p) return;

        // Determine if it's a parent or variant
        const isParent = !p.parent_product_id;

        if (isParent) {
            // Include parent if:
            // - It has no variants
            // - OR it has variants but parent itself has stock > 0
            const hasVariants = Array.isArray(p.variants) && p.variants.length > 0;
            if (!hasVariants || p.stock > 0) {
                sellableMap.set(p.id, {
                    ...p,
                    displayName: p.name,
                    sku: p.part_no || p.partNo || 'N/A'
                });
            }
        } else {
            // Include variant
            const optionValues = Array.isArray(p.variant_options)
                ? p.variant_options.map(opt => opt.value).join(', ')
                : (Array.isArray(p.variantOptions) ? p.variantOptions.map(opt => opt.value).join(', ') : '');
            
            const displayName = optionValues && !p.name.includes(`(${optionValues})`)
                ? `${p.name} (${optionValues})`
                : p.name;

            sellableMap.set(p.id, {
                ...p,
                name: displayName,
                displayName,
                chinese_name: p.chinese_name || null,
                category: p.category || null,
                category_id: p.category_id || null,
                sku: p.part_no || p.partNo || 'N/A'
            });
        }

        // Also process any nested variants under the parent product
        if (Array.isArray(p.variants) && p.variants.length > 0) {
            p.variants.forEach(v => {
                if (!v) return;
                
                const optionValues = Array.isArray(v.variant_options)
                    ? v.variant_options.map(opt => opt.value).join(', ')
                    : (Array.isArray(v.variantOptions) ? v.variantOptions.map(opt => opt.value).join(', ') : '');

                const displayName = optionValues && !v.name.includes(`(${optionValues})`)
                    ? `${v.name || p.name} (${optionValues})`
                    : (v.name || p.name);

                sellableMap.set(v.id, {
                    ...v,
                    name: displayName,
                    displayName,
                    chinese_name: v.chinese_name || p.chinese_name || null,
                    category: v.category || p.category || null,
                    category_id: v.category_id || p.category_id || null,
                    sku: v.part_no || v.partNo || 'N/A'
                });
            });
        }
    });

    let result = Array.from(sellableMap.values());

    if (statusFilter && statusFilter !== 'All') {
        result = result.filter(item => matchesStatusFilter(item, statusFilter));
    }

    return result;
}

