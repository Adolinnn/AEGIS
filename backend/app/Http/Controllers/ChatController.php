<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\ChatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    public function send(Request $request, ChatService $chat): JsonResponse
    {
        $validated = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:40'],
            'messages.*.role' => ['required', 'string', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:8000'],
            'context.target_id' => ['nullable', 'integer'],
            'context.scan_run_id' => ['nullable', 'integer'],
        ]);

        $result = $chat->forUser($request->user())->reply(
            $request->user(),
            $validated['messages'],
            $validated['context'] ?? [],
        );

        return response()->json($result);
    }
}
