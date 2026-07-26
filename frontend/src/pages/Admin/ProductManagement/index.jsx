import React from 'react';
import useProductManagement from './hooks/useProductManagement';
import ProductsTable from './ProductsTable';
import RestockView from './RestockView';
import ProductFormModal from './modals/ProductFormModal';
import ViewProductModal from './modals/ViewProductModal';
import DamageLogModal from './modals/DamageLogModal';
import ReviewRestockModal from './modals/ReviewRestockModal';
import LeaveRestockModal from './modals/LeaveRestockModal';
import { flattenToSellableSKUs } from '../../../shared/utils/skuHelpers';

function ProductManagement() {
    const pm = useProductManagement();

    return (
        <div className="main-workspace-outer">
            {/* Sidebar */}

            {/* Main Workspace */}
            <div className="main-workspace">

                {/* Top Bar */}
                <div className="top-bar">
                    <div>
                        <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>
                            {pm.viewMode === 'list' ? 'Product Management' : 'Inventory Restock'}
                        </h1>
                        <div className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                            {pm.viewMode === 'list'
                                ? 'Add, edit, restock, and manage all products in your system.'
                                : 'Batch restock items and confirm with supervisor verification.'}
                        </div>
                    </div>

                    <div className="top-bar-actions">
                        {pm.viewMode === 'list' ? (
                            <>
                                <button onClick={pm.switchToRestock} className="btn btn-secondary">
                                    Restock
                                </button>
                                <button onClick={() => { pm.resetForm(); pm.setShowAddModal(true); }} className="btn btn-primary">
                                    Add Product
                                </button>
                            </>
                        ) : (
                            <button onClick={pm.handleExitRestockAttempt} className="btn btn-secondary">
                                Back to Products
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Body */}
                <div className="content-body">

                    {/* VIEW 1: Products List */}
                    {pm.viewMode === 'list' && (
                        <>
                            <ProductsTable
                                products={pm.sortedProducts.filter(p => !p.parent_product_id)}
                                pagination={pm.pagination}
                                loading={pm.loading}
                                categories={pm.categories}
                                variantOptions={pm.variantOptions}
                                search={pm.search} setSearch={pm.setSearch}
                                categoryId={pm.categoryId} setCategoryId={pm.setCategoryId}
                                statusFilter={pm.statusFilter} setStatusFilter={pm.setStatusFilter}
                                sortOption={pm.sortOption} setSortOption={pm.setSortOption}
                                DEFAULT_PLACEHOLDER_IMAGE={pm.DEFAULT_PLACEHOLDER_IMAGE}
                                onView={pm.openView}
                                onEdit={pm.openEdit}
                                onDamage={pm.openDamage}
                                onDelete={pm.handleDeleteProduct}
                                onRestock={(p) => { pm.switchToRestock(); pm.updateRestockQty(p.id, 1); }}
                                onToggleStatus={pm.handleToggleStatus}
                                successMessage={pm.successMessage}
                                setSuccessMessage={pm.setSuccessMessage}
                            />

                            {/* Standardized System Pagination Card */}
                            {pm.pagination && pm.pagination.last_page > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', background: '#FFFFFF', padding: '12px 24px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Showing page {pm.pagination.current_page} of {pm.pagination.last_page} ({pm.pagination.total} total items)
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ border: '1px solid var(--border)', background: '#fff' }}
                                            disabled={pm.pagination.current_page <= 1}
                                            onClick={() => pm.pagination.onPageChange(pm.pagination.current_page - 1)}
                                        >
                                            Previous
                                        </button>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ border: '1px solid var(--border)', background: '#fff' }}
                                            disabled={pm.pagination.current_page >= pm.pagination.last_page}
                                            onClick={() => pm.pagination.onPageChange(pm.pagination.current_page + 1)}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* VIEW 2: Batch Restock */}
                    {pm.viewMode === 'restock' && (
                        <RestockView
                            products={flattenToSellableSKUs(pm.restockProducts)}
                            categories={pm.categories}
                  variantOptions={pm.variantOptions}
                            loading={pm.loading}
                            restockSearch={pm.restockSearch} setRestockSearch={pm.setRestockSearch}
                            restockCategory={pm.restockCategory} setRestockCategory={pm.setRestockCategory}
                            restockStockLevel={pm.restockStockLevel} setRestockStockLevel={pm.setRestockStockLevel}
                            restockQuantities={pm.restockQuantities}
                            updateRestockQty={pm.updateRestockQty}
                            handleClearAllRestock={pm.handleClearAllRestock}
                            restockDate={pm.restockDate} setRestockDate={pm.setRestockDate}
                            restockTime={pm.restockTime} setRestockTime={pm.setRestockTime}
                            restockVerifiedBy={pm.restockVerifiedBy}
                            restockItemsCount={pm.restockItemsCount}
                            restockUnitsCount={pm.restockUnitsCount}
                            onExit={pm.handleExitRestockAttempt}
                            onReview={() => pm.setShowReviewRestockModal(true)}
                            DEFAULT_PLACEHOLDER_IMAGE={pm.DEFAULT_PLACEHOLDER_IMAGE}
                        />
                    )}
                </div>
            </div>

            {/* ── Modals ── */}

            {/* Add Product */}
            <ProductFormModal
                isOpen={pm.showAddModal}
                mode="add"
                onClose={() => pm.setShowAddModal(false)}
                onSubmit={pm.handleAddProduct}
                formData={pm.formData} setFormData={pm.setFormData}
                categories={pm.categories}
                  variantOptions={pm.variantOptions}
                handleAddressChange={pm.handleAddressChange}
                handleImageUpload={pm.handleImageUpload}
                errorMessage={pm.errorMessage}
                isSubmitting={pm.isSubmitting}
            />

            {/* Edit Product */}
            <ProductFormModal
                isOpen={pm.showEditModal}
                mode="edit"
                onClose={() => pm.setShowEditModal(false)}
                onSubmit={pm.handleEditProduct}
                formData={pm.formData} setFormData={pm.setFormData}
                categories={pm.categories}
                  variantOptions={pm.variantOptions}
                handleAddressChange={pm.handleAddressChange}
                handleImageUpload={pm.handleImageUpload}
                errorMessage={pm.errorMessage}
                selectedProduct={pm.selectedProduct}
                isSubmitting={pm.isSubmitting}
            />

            {/* View Product */}
            <ViewProductModal
                isOpen={pm.showViewModal}
                onClose={() => pm.setShowViewModal(false)}
                product={pm.selectedProduct}
                categories={pm.categories}
                DEFAULT_PLACEHOLDER_IMAGE={pm.DEFAULT_PLACEHOLDER_IMAGE}
            />

            {/* Log Damaged */}
            <DamageLogModal
                isOpen={pm.showDamageModal}
                onClose={() => pm.setShowDamageModal(false)}
                onSubmit={pm.handleDamageSubmit}
                product={pm.selectedProduct}
                damageQty={pm.damageQty} setDamageQty={pm.setDamageQty}
                damageReason={pm.damageReason} setDamageReason={pm.setDamageReason}
                errorMessage={pm.errorMessage}
                isSubmitting={pm.isSubmitting}
            />

            {/* Review Restock */}
            <ReviewRestockModal
                isOpen={pm.showReviewRestockModal}
                onClose={() => pm.setShowReviewRestockModal(false)}
                onConfirm={pm.handleConfirmRestock}
                products={flattenToSellableSKUs(pm.restockProducts)}
                restockQuantities={pm.restockQuantities}
                restockItemsCount={pm.restockItemsCount}
                restockUnitsCount={pm.restockUnitsCount}
                restockVerifiedBy={pm.restockVerifiedBy}
                restockDate={pm.restockDate}
                restockTime={pm.restockTime}
                errorMessage={pm.errorMessage}
                DEFAULT_PLACEHOLDER_IMAGE={pm.DEFAULT_PLACEHOLDER_IMAGE}
                isSubmitting={pm.isSubmitting}
            />

            {/* Leave Restock Confirm */}
            <LeaveRestockModal
                isOpen={pm.showLeaveConfirmModal}
                onClose={() => pm.setShowLeaveConfirmModal(false)}
                onSaveDraft={pm.handleSaveDraftAndExit}
                onDiscard={pm.handleDiscardDraftAndExit}
            />
        </div>
    );
}

export default ProductManagement;

