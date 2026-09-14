<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\MarketingSectionResource;
use App\Services\MarketingSectionService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class PublicMarketingSectionController extends Controller
{
    public function __construct(
        private readonly MarketingSectionService $marketingSectionService,
    ) {}

    public function index(): AnonymousResourceCollection
    {
        return MarketingSectionResource::collection(
            $this->marketingSectionService->list(activeOnly: true)
        );
    }
}
