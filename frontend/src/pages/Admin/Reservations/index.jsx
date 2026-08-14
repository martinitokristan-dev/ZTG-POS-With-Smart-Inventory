import React, { useState } from 'react';
import useReservations from './hooks/useReservations';
import ReservationsTable from './ReservationsTable';
import AddReservationModal from './modals/AddReservationModal';
import FulfillOrderModal from './modals/FulfillOrderModal';
import CancelReservationModal from './modals/CancelReservationModal';
import SuccessModal from './modals/SuccessModal';
import ReservationDetailsModal from './modals/ReservationDetailsModal';

export default function Reservations() {
    const res = useReservations();
    const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' or 'completed'

    const handleTabSwitch = (tab) => {
        setActiveTab(tab);
        if (tab === 'deposit') {
            res.handleStatusChange('Pending');
        } else {
            res.handleStatusChange('Completed');
        }
    };

    return (
        <div className="main-workspace-outer">
            <div className="main-workspace">

                {/* Top Bar */}
                <div className="top-bar">
                    <div>
                        <h1 style={{ fontSize: '20px', marginBottom: '2px' }}>Order Based Reservations</h1>
                        <div className="page-description" style={{ marginTop: 0, fontSize: '12px' }}>
                            Track deposits, expected pickup dates, and fulfill client product holds.
                        </div>
                    </div>
                    <div className="top-bar-actions" style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            id="copyReservationsBtn"
                            className="btn" 
                            onClick={() => res.handleCopyToClipboard(activeTab)}
                            title={`Copy ${activeTab === 'completed' ? 'Order Claimed And Paid' : 'For Order In China'} orders to clipboard for Excel`}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 600,
                                fontSize: '13px',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                background: 'var(--bg-card)',
                                border: res.copiedCount !== null ? '1px solid #10B981' : '1px solid var(--border)',
                                color: res.copiedCount !== null ? '#10B981' : 'var(--text-primary)',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {res.copiedCount !== null ? (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'none', stroke: '#10B981', strokeWidth: 2.5 }}><polyline points="20 6 9 17 4 12"/></svg>
                                    <span>Copied {res.copiedCount} {res.copiedCount === 1 ? 'row' : 'rows'}!</span>
                                </>
                            ) : (
                                <>
                                    <svg viewBox="0 0 24 24" style={{ width: '15px', height: '15px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}>
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                    <span>Copy to Clipboard</span>
                                </>
                            )}
                        </button>
                        <button className="btn btn-primary" onClick={() => { res.resetAddForm(); res.setShowAddModal(true); }}>
                            New Reservation
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="content-body">
                    {/* 2-Tab Navigation Matching Excel Sheet Names with Visible Borders */}
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                        <button
                            type="button"
                            onClick={() => handleTabSwitch('deposit')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: activeTab === 'deposit' ? 'var(--primary)' : 'var(--bg-card)',
                                color: activeTab === 'deposit' ? '#FFFFFF' : 'var(--text-secondary)',
                                border: activeTab === 'deposit' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                boxShadow: activeTab === 'deposit' ? '0 1px 3px rgba(37,99,235,0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            For Order In China
                        </button>
                        <button
                            type="button"
                            onClick={() => handleTabSwitch('completed')}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                fontWeight: '700',
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                backgroundColor: activeTab === 'completed' ? '#10B981' : 'var(--bg-card)',
                                color: activeTab === 'completed' ? '#FFFFFF' : 'var(--text-secondary)',
                                border: activeTab === 'completed' ? '1px solid #10B981' : '1px solid var(--border)',
                                boxShadow: activeTab === 'completed' ? '0 1px 3px rgba(16,185,129,0.3)' : '0 1px 2px rgba(0,0,0,0.04)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', fill: 'none', stroke: 'currentColor', strokeWidth: 2 }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            Order Claimed And Paid
                        </button>
                    </div>

                    <ReservationsTable
                        reservations={res.reservations}
                        loading={res.loading}
                        search={res.search}
                        setSearch={res.setSearch}
                        handleSearchChange={res.handleSearchChange}
                        statusFilter={res.statusFilter}
                        setStatusFilter={res.setStatusFilter}
                        handleStatusChange={res.handleStatusChange}
                        page={res.page}
                        setPage={res.setPage}
                        pagination={res.pagination}
                        fmt={res.fmt}
                        fmtDate={res.fmtDate}
                        openFulfill={res.openFulfill}
                        openCancel={res.openCancel}
                        openDetails={res.openDetails}
                        activeTab={activeTab}
                    />
                </div>
            </div>

            {/* Modals */}
            <AddReservationModal
                isOpen={res.showAddModal}
                onClose={() => { res.setShowAddModal(false); res.resetAddForm(); }}
                onOpen={() => res.refreshProducts && res.refreshProducts()}
                onSubmit={res.handleAddReservation}
                custName={res.custName} setCustName={res.setCustName}
                custPhone={res.custPhone} setCustPhone={res.setCustPhone}
                custEmail={res.custEmail} setCustEmail={res.setCustEmail}
                enginePlateNumber={res.enginePlateNumber} setEnginePlateNumber={res.setEnginePlateNumber}
                pickupDate={res.pickupDate} setPickupDate={res.setPickupDate}
                pickupTime={res.pickupTime} setPickupTime={res.setPickupTime}
                notes={res.notes} setNotes={res.setNotes}
                paymentType={res.paymentType} setPaymentType={res.setPaymentType}
                paymentMethod={res.paymentMethod} setPaymentMethod={res.setPaymentMethod}
                custChequeNumber={res.custChequeNumber} setCustChequeNumber={res.setCustChequeNumber}
                cartItems={res.cartItems}
                productSearch={res.productSearch}
                suggestions={res.suggestions}
                addError={res.addError}
                addLoading={res.addLoading}
                handleProductSearch={res.handleProductSearch}
                addToCart={res.addToCart}
                addCustomItemToCart={res.addCustomItemToCart}
                removeFromCart={res.removeFromCart}
                updateQty={res.updateQty}
                updateCartItemPriceTier={res.updateCartItemPriceTier}
                subtotal={res.subtotal}
                tax={res.tax}
                total={res.total}
                depositAmt={res.depositAmt}
                balance={res.balance}
                fmt={res.fmt}
            />

            <FulfillOrderModal
                isOpen={res.showFulfillModal}
                onClose={() => res.setShowFulfillModal(false)}
                onSubmit={res.handleFulfill}
                selected={res.selected}
                ffPaymentMethod={res.ffPaymentMethod} setFfPaymentMethod={res.setFfPaymentMethod}
                ffChequeNumber={res.ffChequeNumber} setFfChequeNumber={res.setFfChequeNumber}
                ffAmountReceived={res.ffAmountReceived} setFfAmountReceived={res.setFfAmountReceived}
                ffDocType={res.ffDocType} setFfDocType={res.setFfDocType}
                ffNotes={res.ffNotes} setFfNotes={res.setFfNotes}
                ffError={res.ffError}
                ffLoading={res.ffLoading}
                ffBalanceDue={res.ffBalanceDue}
                ffChange={res.ffChange}
                userName={res.userName}
                fmt={res.fmt}
                fmtDate={res.fmtDate}
            />

            <CancelReservationModal
                isOpen={res.showCancelModal}
                onClose={() => res.setShowCancelModal(false)}
                onSubmit={res.handleCancel}
                selected={res.selected}
                cancelReason={res.cancelReason} setCancelReason={res.setCancelReason}
                cancelLoading={res.cancelLoading}
                fmt={res.fmt}
            />

            <SuccessModal
                isOpen={res.showSuccessModal}
                onClose={() => res.setShowSuccessModal(false)}
                successData={res.successData}
                fmt={res.fmt}
                fmtDate={res.fmtDate}
            />

            <ReservationDetailsModal
                isOpen={res.showDetailsModal}
                onClose={() => res.setShowDetailsModal(false)}
                reservation={res.detailsReservation}
                fmt={res.fmt}
                fmtDate={res.fmtDate}
            />
        </div>
    );
}
