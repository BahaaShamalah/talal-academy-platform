<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SupportTicket\AssignSupportTicketRequest;
use App\Http\Requests\SupportTicket\ReplySupportTicketRequest;
use App\Http\Requests\SupportTicket\StoreSupportTicketRequest;
use App\Http\Resources\SupportTicketResource;
use App\Models\SupportTicket;
use App\Models\User;
use App\Services\SupportTicketService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class SupportTicketController extends Controller
{
    public function __construct(
        private readonly SupportTicketService $supportTicketService,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return SupportTicketResource::collection(
            $this->supportTicketService->listAdmin($request),
        );
    }

    public function show(SupportTicket $supportTicket): SupportTicketResource
    {
        return new SupportTicketResource(
            $this->supportTicketService->findAdmin($supportTicket),
        );
    }

    public function assign(AssignSupportTicketRequest $request, SupportTicket $supportTicket): SupportTicketResource
    {
        $user = User::query()->findOrFail($request->validated('user_id'));

        return new SupportTicketResource(
            $this->supportTicketService->assignTicket($supportTicket, $user),
        );
    }

    public function reply(ReplySupportTicketRequest $request, SupportTicket $supportTicket): SupportTicketResource
    {
        return new SupportTicketResource(
            $this->supportTicketService->addStaffReply(
                $supportTicket,
                $request->user(),
                $request->validated('message'),
            ),
        );
    }

    public function close(SupportTicket $supportTicket): SupportTicketResource
    {
        return new SupportTicketResource(
            $this->supportTicketService->closeTicket($supportTicket),
        );
    }

    public function guardianIndex(Request $request): AnonymousResourceCollection
    {
        return SupportTicketResource::collection(
            $this->supportTicketService->listForGuardian($request->user('guardian'), $request),
        );
    }

    public function guardianStore(StoreSupportTicketRequest $request): JsonResponse
    {
        $data = $request->validated();
        $ticket = $this->supportTicketService->createTicket(
            $request->user('guardian'),
            $data['subject'],
            $data['message'],
            isset($data['student_id']) ? (int) $data['student_id'] : null,
        );

        return (new SupportTicketResource($ticket))
            ->response()
            ->setStatusCode(201);
    }

    public function guardianShow(Request $request, SupportTicket $supportTicket): SupportTicketResource
    {
        return new SupportTicketResource(
            $this->supportTicketService->findForGuardianOrFail(
                $supportTicket,
                $request->user('guardian'),
            ),
        );
    }

    public function guardianReply(ReplySupportTicketRequest $request, SupportTicket $supportTicket): SupportTicketResource
    {
        return new SupportTicketResource(
            $this->supportTicketService->addGuardianReply(
                $supportTicket,
                $request->user('guardian'),
                $request->validated('message'),
            ),
        );
    }
}
