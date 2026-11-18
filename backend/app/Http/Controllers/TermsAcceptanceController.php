<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcceptTermsRequest;
use App\Services\UserManagement\TermsAcceptanceService;
use Illuminate\Http\JsonResponse;

class TermsAcceptanceController extends Controller
{
    public function __construct(private TermsAcceptanceService $termsAcceptanceService)
    {
    }

    /**
     * Record that the signed-in user accepted the Privacy Policy and Terms and Conditions.
     *
     * @param  AcceptTermsRequest  $request
     * @return JsonResponse
     */
    public function accept(AcceptTermsRequest $request): JsonResponse
    {
        $terms = $this->termsAcceptanceService->accept($request->user(), $request);

        return response()->json([
            'message' => 'Thank you. Your acceptance has been recorded.',
            'terms'   => $terms,
        ]);
    }
}
