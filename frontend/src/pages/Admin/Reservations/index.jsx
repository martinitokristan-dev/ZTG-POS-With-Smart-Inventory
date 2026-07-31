import React from 'react';
import useReservations from './hooks/useReservations';
import ReservationsTable from './ReservationsTable';
import AddReservationModal from './modals/AddReservationModal';
import FulfillOrderModal from './modals/FulfillOrderModal';
import CancelReservationModal from './modals/CancelReservationModal';
import SuccessModal from './modals/SuccessModal';
import ReservationDetailsModal from './modals/ReservationDetailsModal';

export default function Reservations() {
    const res = useReservations();

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
                    <div className="top-bar-actions">
                        <button className="btn btn-primary" onClick={() => { res.resetAddForm(); res.setShowAddModal(true); }}>
                            + New Reservation
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="content-body">
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
                pickupDate={res.pickupDate} setPickupDate={res.setPickupDate}
                pickupTime={res.pickupTime} setPickupTime={res.setPickupTime}
                notes={res.notes} setNotes={res.setNotes}
                paymentType={res.paymentType} setPaymentType={res.setPaymentType}
                paymentMethod={res.paymentMethod} setPaymentMethod={res.setPaymentMethod}
                cartItems={res.cartItems}
                productSearch={res.productSearch}
                suggestions={res.suggestions}
                addError={res.addError}
                addLoading={res.addLoading}
                handleProductSearch={res.handleProductSearch}
                addToCart={res.addToCart}
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
