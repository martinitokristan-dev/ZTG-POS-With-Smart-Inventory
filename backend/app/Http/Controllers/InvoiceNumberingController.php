<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateInvoiceNumberingRequest;
use App\Services\Settings\InvoiceNumberingService;
use Illuminate\Http\JsonResponse;

/**
 * Technical Operations only: how S.I. / D.R. / C.R. numbers are issued (BIR compliance).
 * The routes are limited to the Technical Operations role.
 */
class InvoiceNumberingController extends Controller
{
    public function __construct(
        protected InvoiceNumberingService $invoiceNumberingService
    ) {}

    /**
     * Current numbering setup with the last used number of each series.
     */
    public function show(): JsonResponse
    {
        return response()->json($this->invoiceNumberingService->getStatus());
    }

    /**
     * Switch between the manual booklet and system-generated numbers (password confirmed).
     */
    public function update(UpdateInvoiceNumberingRequest $request): JsonResponse
    {
        $status = $this->invoiceNumberingService->update($request->user(), $request->validated());

        return response()->json([
            'message' => $status['mode'] === 'auto'
                ? 'System-generated numbering is on.'
                : 'Numbering switched to the manual booklet.',
            'status'  => $status,
        ]);
    }
}
