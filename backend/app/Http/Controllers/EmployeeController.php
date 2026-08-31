<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\User;
use App\Services\Employees\EmployeeService;
use Illuminate\Http\JsonResponse;

class EmployeeController extends Controller
{
    protected EmployeeService $employeeService;

    public function __construct(EmployeeService $employeeService)
    {
        $this->employeeService = $employeeService;
    }

    /**
     * Display a listing of employees.
     */
    public function index(): JsonResponse
    {
        return response()->json($this->employeeService->getAll());
    }

    /**
     * Store a newly created employee.
     */
    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = $this->employeeService->createEmployee($request->validated());

        return response()->json([
            'message' => 'Employee created successfully.',
            'employee' => $employee,
        ], 201);
    }

    /**
     * Update the specified employee.
     */
    public function update(UpdateEmployeeRequest $request, User $employee): JsonResponse
    {
        $updatedEmployee = $this->employeeService->updateEmployee($employee, $request->validated());

        return response()->json([
            'message' => 'Employee updated successfully.',
            'employee' => $updatedEmployee,
        ]);
    }

    /**
     * Toggle status (active/inactive) for the employee.
     */
    public function toggle(User $employee): JsonResponse
    {
        $updatedEmployee = $this->employeeService->toggleStatus($employee);

        return response()->json([
            'message' => 'Employee status toggled successfully.',
            'employee' => $updatedEmployee,
        ]);
    }

    /**
     * Remove the specified employee from storage.
     */
    public function destroy(User $employee): JsonResponse
    {
        $this->employeeService->deleteEmployee($employee);

        return response()->json([
            'message' => 'Employee deleted successfully.',
        ]);
    }

    /**
     * Resend the staff verification email (admin action).
     * Generates a fresh token + temp password and re-locks the account until verified.
     */
    public function resendVerification(User $employee): JsonResponse
    {
        try {
            $this->employeeService->resendVerification($employee);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed to resend verification email for user {$employee->id}: " . $e->getMessage(), ['exception' => $e]);
            return response()->json([
                'message' => 'Failed to resend verification email: ' . $e->getMessage()
            ], 500);
        }

        return response()->json([
            'message' => "Verification email resent to {$employee->email}. The account has been re-locked until they click the new link.",
        ]);
    }
}
