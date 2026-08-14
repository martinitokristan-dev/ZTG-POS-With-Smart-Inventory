<?php

namespace App\Http\Controllers;

use App\Http\Requests\CancelReservationRequest;
use App\Http\Requests\FulfillReservationRequest;
use App\Http\Requests\StoreReservationRequest;
use App\Models\Reservation;
use App\Services\Reservations\ReservationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservationController extends Controller
{
    protected ReservationService $reservationService;

    public function __construct(ReservationService $reservationService)
    {
        $this->reservationService = $reservationService;
    }

    /**
     * List reservations with optional status and search filters.
     */
    public function index(Request $request): JsonResponse
    {
        $reservations = $this->reservationService->getAll(
            $request->only(['status', 'search', 'per_page'])
        );

        return response()->json($reservations);
    }

    /**
     * Show a single reservation with all relationships.
     */
    public function show(int $id): JsonResponse
    {
        $reservation = $this->reservationService->show($id);
        return response()->json($reservation);
    }

    /**
     * Create a new reservation (stock NOT deducted yet).
     */
    public function store(StoreReservationRequest $request): JsonResponse
    {
        $reservation = $this->reservationService->createReservation(
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Reservation created successfully.',
            'reservation' => $reservation,
        ], 201);
    }

    /**
     * Fulfill a reservation: deducts stock and creates sale transaction.
     */
    public function fulfill(FulfillReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $fulfilled = $this->reservationService->fulfillReservation(
            $reservation,
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message'     => 'Reservation fulfilled successfully.',
            'reservation' => $fulfilled,
        ]);
    }

    /**
     * Cancel a reservation (no stock changes).
     */
    public function cancel(CancelReservationRequest $request, Reservation $reservation): JsonResponse
    {
        $cancelled = $this->reservationService->cancelReservation(
            $reservation,
            $request->validated()['reason'] ?? null
        );

        return response()->json([
            'message'     => 'Reservation cancelled.',
            'reservation' => $cancelled,
        ]);
    }
}
