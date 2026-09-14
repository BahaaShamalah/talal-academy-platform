<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ProductType\StoreProductTypeRequest;
use App\Http\Requests\ProductType\UpdateProductTypeRequest;
use App\Http\Resources\ProductTypeResource;
use App\Models\ProductType;
use App\Services\ProductTypeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductTypeController extends Controller
{
    public function __construct(
        private readonly ProductTypeService $productTypeService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return ProductTypeResource::collection($this->productTypeService->list($request));
    }

    public function store(StoreProductTypeRequest $request): JsonResponse
    {
        $type = $this->productTypeService->create($request->validated());

        return (new ProductTypeResource($type))
            ->response()
            ->setStatusCode(201);
    }

    public function show(ProductType $productType): ProductTypeResource
    {
        return new ProductTypeResource($productType);
    }

    public function update(UpdateProductTypeRequest $request, ProductType $productType): ProductTypeResource
    {
        return new ProductTypeResource(
            $this->productTypeService->update($productType, $request->validated())
        );
    }

    public function destroy(ProductType $productType): JsonResponse
    {
        $this->productTypeService->delete($productType);

        return response()->json(['message' => 'تم حذف نوع الباقة بنجاح.']);
    }
}
