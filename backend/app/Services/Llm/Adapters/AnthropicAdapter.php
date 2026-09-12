<?php

declare(strict_types=1);

namespace App\Services\Llm\Adapters;

use App\Services\Llm\LlmRequest;
use App\Services\Llm\LlmResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicAdapter implements LlmAdapterInterface
{
    public function send(LlmRequest $request): LlmResponse
    {
        $user = $request->getUser();
        $apiKey = $request->getApiKey()
            ?? ($user?->llm_api_key)
            ?? config('services.llm.anthropic.key')
            ?? env('ANTHROPIC_API_KEY');

        if (empty($apiKey)) {
            return LlmResponse::fail('No Anthropic API key configured. Check application settings or user profile.');
        }

        $baseUrl = $request->getBaseUrl()
            ?? ($user?->llm_base_url ? rtrim($user->llm_base_url, '/') : null)
            ?? config('services.llm.anthropic.base_url', 'https://api.anthropic.com/v1');

        $model = $request->getModel()
            ?? ($user?->llm_model)
            ?? config('services.llm.anthropic.model', 'claude-sonnet-4-5');

        $headers = [
            'x-api-key' => $apiKey,
            'anthropic-version' => '2023-06-01',
            'Content-Type' => 'application/json',
        ];

        // Format system and user messages for Anthropic
        $systemPrompt = '';
        $anthropicMessages = [];

        foreach ($request->getMessages() as $msg) {
            $role = $msg['role'] ?? 'user';
            $content = $msg['content'] ?? '';

            if ($role === 'system') {
                $systemPrompt = filled($systemPrompt) ? ($systemPrompt . "\n\n" . $content) : $content;
            } else {
                $anthropicMessages[] = [
                    'role' => $role === 'assistant' ? 'assistant' : 'user',
                    'content' => $content,
                ];
            }
        }

        if (empty($anthropicMessages)) {
            $anthropicMessages[] = ['role' => 'user', 'content' => 'Please proceed.'];
        }

        $tools = $request->getTools();
        $toolHandler = $request->getToolHandler();
        $toolLog = [];

        // If no tool handler is provided or no tools exist, run single request
        if (empty($tools) || $toolHandler === null) {
            $payload = [
                'model' => $model,
                'messages' => $anthropicMessages,
                'max_tokens' => $request->getMaxTokens(),
                'temperature' => $request->getTemperature(),
            ];

            if (filled($systemPrompt)) {
                $payload['system'] = $systemPrompt;
            }

            return $this->executeSingleCall($baseUrl, $headers, $payload, $request->getTimeout());
        }

        // Convert OpenAI-style tool schema to Anthropic format
        $anthropicTools = array_map(function ($tool) {
            $func = $tool['function'] ?? $tool;
            return [
                'name' => $func['name'] ?? '',
                'description' => $func['description'] ?? '',
                'input_schema' => $func['parameters'] ?? ['type' => 'object', 'properties' => new \stdClass()],
            ];
        }, $tools);

        // Multi-turn tool calling loop
        $maxRounds = $request->getMaxToolRounds();
        for ($round = 0; $round < $maxRounds; $round++) {
            $payload = [
                'model' => $model,
                'messages' => $anthropicMessages,
                'tools' => $anthropicTools,
                'max_tokens' => $request->getMaxTokens(),
                'temperature' => $request->getTemperature(),
            ];

            if (filled($systemPrompt)) {
                $payload['system'] = $systemPrompt;
            }

            try {
                $response = Http::timeout($request->getTimeout())
                    ->withHeaders($headers)
                    ->post($baseUrl . '/messages', $payload);

                if ($response->failed()) {
                    Log::error('AnthropicAdapter HTTP error', ['status' => $response->status(), 'body' => $response->body()]);
                    return LlmResponse::fail('Anthropic returned HTTP ' . $response->status(), $toolLog, $response->json() ?? []);
                }

                $json = $response->json();
                $contentBlocks = $json['content'] ?? [];
                $textParts = [];
                $toolUses = [];

                foreach ($contentBlocks as $block) {
                    if (($block['type'] ?? '') === 'text') {
                        $textParts[] = $block['text'] ?? '';
                    } elseif (($block['type'] ?? '') === 'tool_use') {
                        $toolUses[] = $block;
                    }
                }

                if (empty($toolUses)) {
                    return LlmResponse::success(implode("\n", $textParts), null, $toolLog, $json);
                }

                // Append assistant turn
                $anthropicMessages[] = [
                    'role' => 'assistant',
                    'content' => $contentBlocks,
                ];

                // Execute tool uses and append tool_result blocks
                $toolResults = [];
                foreach ($toolUses as $toolUse) {
                    $toolUseId = $toolUse['id'] ?? '';
                    $name = $toolUse['name'] ?? '';
                    $args = $toolUse['input'] ?? [];

                    $result = call_user_func($toolHandler, $name, $args);
                    $resultString = is_string($result) ? $result : json_encode($result);

                    $toolLog[] = [
                        'tool' => $name,
                        'args' => $args,
                        'result_summary' => $resultString,
                    ];

                    $toolResults[] = [
                        'type' => 'tool_result',
                        'tool_use_id' => $toolUseId,
                        'content' => $resultString,
                    ];
                }

                $anthropicMessages[] = [
                    'role' => 'user',
                    'content' => $toolResults,
                ];
            } catch (\Throwable $e) {
                Log::error('AnthropicAdapter exception during tool loop', ['error' => $e->getMessage()]);
                return LlmResponse::fail('Anthropic exception: ' . $e->getMessage(), $toolLog);
            }
        }

        return LlmResponse::fail('The assistant exceeded the maximum allowed tool call rounds.', $toolLog);
    }

    protected function executeSingleCall(string $baseUrl, array $headers, array $payload, int $timeout): LlmResponse
    {
        try {
            $response = Http::timeout($timeout)
                ->withHeaders($headers)
                ->post($baseUrl . '/messages', $payload);

            if ($response->failed()) {
                Log::error('AnthropicAdapter HTTP failure', ['status' => $response->status(), 'body' => $response->body()]);
                return LlmResponse::fail('Anthropic returned HTTP ' . $response->status(), [], $response->json() ?? []);
            }

            $json = $response->json();
            $text = '';
            foreach ($json['content'] ?? [] as $block) {
                if (($block['type'] ?? '') === 'text') {
                    $text .= ($block['text'] ?? '');
                }
            }

            return LlmResponse::success($text, null, [], $json);
        } catch (\Throwable $e) {
            Log::error('AnthropicAdapter exception', ['error' => $e->getMessage()]);
            return LlmResponse::fail('Anthropic exception: ' . $e->getMessage());
        }
    }
}
