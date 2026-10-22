<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProductImport\AnalyzeProductImportRequest;
use App\Http\Requests\ProductImport\CommitImportChunkRequest;
use App\Http\Requests\ProductImport\ShowImportBatchRequest;
use App\Http\Requests\ProductImport\StartProductImportRequest;
use App\Http\Requests\ProductImport\UploadProductImportRequest;
use App\Models\ImportBatch;
use App\Services\Products\Import\ImportAnalysisService;
use App\Services\Products\Import\ImportBatchQueryService;
use App\Services\Products\Import\ImportCommitService;
use App\Services\Products\Import\ImportUndoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Smart Excel product import: upload, review, save in chunks, list and undo.
 */
class ProductImportController extends Controller
{
    public function __construct(
        private ImportAnalysisService $analysis,
        private ImportCommitService $commit,
        private ImportUndoService $undoService,
        private ImportBatchQueryService $query,
    ) {
    }

    /**
     * What one import created (summary + one page of products), for the Done screen and History Logs.
     *
     * @param ShowImportBatchRequest $request Accepts `page` and `search`.
     * @param ImportBatch            $batch
     * @return JsonResponse
     */
    public function show(ShowImportBatchRequest $request, ImportBatch $batch): JsonResponse
    {
        return response()->json($this->query->details(
            $batch,
            (int) ($request->validated('page') ?? 1),
            $request->validated('search')
        ));
    }

    /**
     * Upload a spreadsheet and get the organised preview. Nothing is saved to the catalog.
     *
     * @param UploadProductImportRequest $request
     * @return JsonResponse
     */
    public function upload(UploadProductImportRequest $request): JsonResponse
    {
        return response()->json($this->analysis->upload($request->file('file'), (int) $request->user()->id));
    }

    /**
     * Rebuild the preview with corrected columns and review decisions.
     *
     * @param AnalyzeProductImportRequest $request
     * @return JsonResponse
     */
    public function analyze(AnalyzeProductImportRequest $request): JsonResponse
    {
        return response()->json($this->analysis->analyze(
            $request->validated('token'),
            (int) $request->user()->id,
            $request->sheetChoices(),
            $request->validated('decisions') ?? []
        ));
    }

    /**
     * Discard an upload.
     *
     * @param Request $request
     * @param string  $token
     * @return JsonResponse
     */
    public function cancel(Request $request, string $token): JsonResponse
    {
        $this->analysis->cancel($token, (int) $request->user()->id);

        return response()->json(['message' => 'Upload discarded.']);
    }

    /**
     * Open an import batch.
     *
     * @param StartProductImportRequest $request
     * @return JsonResponse
     */
    public function start(StartProductImportRequest $request): JsonResponse
    {
        $batch = $this->commit->start($request->validated('token'), (int) $request->user()->id);

        return response()->json(['batch' => $batch], 201);
    }

    /**
     * Save one chunk of product families.
     *
     * @param CommitImportChunkRequest $request
     * @param ImportBatch              $batch
     * @return JsonResponse
     */
    public function chunk(CommitImportChunkRequest $request, ImportBatch $batch): JsonResponse
    {
        return response()->json($this->commit->commitChunk($batch, $request->validated('families'), (int) $request->user()->id));
    }

    /**
     * Finish an import batch.
     *
     * @param Request     $request
     * @param ImportBatch $batch
     * @return JsonResponse
     */
    public function finish(Request $request, ImportBatch $batch): JsonResponse
    {
        return response()->json(['batch' => $this->commit->finish($batch, (int) $request->user()->id)]);
    }

    /**
     * Recent imports, newest first.
     *
     * @return JsonResponse
     */
    public function index(): JsonResponse
    {
        $batches = ImportBatch::with('user:id,username')->latest('id')->limit(20)
            ->get(['id', 'user_id', 'file_name', 'status', 'products_created', 'variants_created', 'families_failed', 'created_at', 'completed_at', 'undone_at']);

        return response()->json(['batches' => $batches]);
    }

    /**
     * Undo an import (only while none of its products has sales or stock history).
     *
     * @param Request     $request
     * @param ImportBatch $batch
     * @return JsonResponse
     */
    public function undo(Request $request, ImportBatch $batch): JsonResponse
    {
        $removed = $this->undoService->undo($batch, (int) $request->user()->id);

        return response()->json(['message' => 'Import undone.', 'removed' => $removed]);
    }
}
