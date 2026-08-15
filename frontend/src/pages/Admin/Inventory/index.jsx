import React from 'react';
import { useInventory } from './hooks/useInventory';
import InventoryTable from './views/InventoryTable';
import ViewProductModal from './modals/ViewProductModal';
import IOSSelect from '../../../shared/components/IOSSelect';

export default function Inventory() {
    const {
        products,
        categories,
        loading,
        search, setSearch,
        categoryId, setCategoryId,
        statusFilter, setStatusFilter,
        selectedProduct, setSelectedProduct,
        showViewModal, setShowViewModal,
        handleViewProduct,
        totalItems,
        categoriesCount,
        outOfStockCount,
        lowStockCount,
        dateFilter, setDateFilter
    } = useInventory();

    return (
        <>

                <div className="top-bar">
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <h1 style={{ fontSize: '20px', margin: 0 }}>Inventory Management</h1>
                            <span className="badge badge-success" style={{ fontSize: '11px', padding: '4px 10px', display: 'inline-block' }}>Read-Only View</span>
                        </div>
                        <div className="page-description" style={{ marginTop: '4px', fontSize: '12px' }}>
                            {totalItems} total items across {categoriesCount} categories · {outOfStockCount} out of stock · {lowStockCount} low stock
                        </div>
                    </div>
                </div>

                <div className="content-body">

                    <div className="card" style={{ marginBottom: '16px' }}>
                        <div className="table-filters" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                            <div className="table-search" style={{ flex: 1, minWidth: '240px' }}>
                                <svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                                <input
                                    type="text"
                                    placeholder="Search product description, part number, category, or address..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>
                            <div style={{ width: '180px' }}>
                                <IOSSelect
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    options={[{ value: '', label: 'All Categories' }, ...categories.map(cat => ({ value: cat.id, label: cat.name }))]}
                                />
                            </div>
                            <div style={{ width: '160px' }}>
                                <IOSSelect
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    options={[
                                        { value: '', label: 'All Stock Levels' },
                                        { value: 'Active', label: 'Active / Healthy' },
                                        { value: 'Low Stock', label: 'Low Stock' },
                                        { value: 'No Stock', label: 'No Stock' },
                                        { value: 'Dead Stock', label: 'Dead Stock' },
                                        { value: 'No Name/Part No', label: 'No Name / Part No' }
                                    ]}
                                />
                            </div>
                            <div style={{ width: '150px' }}>
                                <IOSSelect
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    options={[
                                        { value: 'today', label: 'Sold Today' },
                                        { value: 'this_week', label: 'Sold This Week' },
                                        { value: 'this_month', label: 'Sold This Month' },
                                        { value: 'this_year', label: 'Sold This Year' },
                                        { value: 'all', label: 'All Time' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <InventoryTable 
                        products={products}
                        loading={loading}
                        handleViewProduct={handleViewProduct}
                        statusFilter={statusFilter}
                    />

                </div>

            <ViewProductModal 
                showViewModal={showViewModal} setShowViewModal={setShowViewModal}
                selectedProduct={selectedProduct}
            />
        </>
    );
}
