<?php

declare(strict_types=1);

namespace App\Services\Llm\Adapters;

use App\Services\Llm\LlmRequest;
use App\Services\Llm\LlmResponse;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAiAdapter implements LlmAdapterInterface
{
    public function send(LlmRequest $request): LlmResponse
    {
        $user = $request->getUser();
        $provider = strtolower(
            $request->getProvider()
            ?? ($user?->llm_provider)
            ?? config('services.llm.provider', 'openai')
        );

        $isOpenRouter = $provider === 'openrouter'
            || str_contains($request->getBaseUrl() ?? '', 'openrouter.ai')
            || str_contains($user?->llm_base_url ?? '', 'openrouter.ai');

        $apiKey = $request->getApiKey()
            ?? ($user?->llm_api_key)
            ?? ($isOpenRouter ? (config('services.llm.openrouter.key') ?? env('OPENROUTER_API_KEY')) : null)
            ?? config('services.llm.openai.key')
            ?? env('OPENAI_API_KEY')
            ?? config('services.llm.openrouter.key')
            ?? env('OPENROUTER_API_KEY');

        if (empty($apiKey)) {
            return LlmResponse::fail('No AI API key configured. Please add your API key in Profile > AI Provider Settings or in .env.');
        }

        $baseUrl = $request->getBaseUrl()
            ?? ($user?->llm_base_url ? rtrim($user->llm_base_url, '/') : null)
            ?? ($isOpenRouter ? config('services.llm.openrouter.base_url', 'https://openrouter.ai/api/v1') : config('services.llm.openai.base_url', 'https://api.openai.com/v1'));

        $defaultModel = $isOpenRouter
            ? config('services.llm.openrouter.model', 'openai/gpt-4o-mini')
            : config('services.llm.openai.model', 'gpt-4o-mini');

        $model = $request->getModel()
            ?? ($user?->llm_model)
            ?? $defaultModel;

        $timeout = $request->getTimeout()
            ?: ($isOpenRouter ? (int) config('services.llm.openrouter.timeout', 120) : (int) config('services.llm.openai.timeout', 60));

        $headers = [
            'Authorization' => "Bearer {$apiKey}",
            'Content-Type' => 'application/json',
        ];

        if ($isOpenRouter || str_contains($baseUrl, 'openrouter.ai')) {
            $headers['HTTP-Referer'] = $request->getReferer() ?? config('services.llm.openrouter.referer') ?? config('app.url', 'http://127.0.0.1:8000');
            $headers['X-Title'] = $request->getTitle() ?? config('services.llm.openrouter.title') ?? 'Aegis Security Platform';
        }

        $messages = $request->getMessages();
        $tools = $request->getTools();
        $toolHandler = $request->getToolHandler();
        $toolLog = [];

        // If no tool handler is provided or no tools exist, run single request
        if (empty($tools) || $toolHandler === null) {
            $payload = [
                'model' => $model,
                'messages' => $messages,
                'temperature' => $request->getTemperature(),
                'max_tokens' => $request->getMaxTokens(),
            ];

            if ($request->isJson()) {
                $payload['response_format'] = ['type' => 'json_object'];
            }

            return $this->executeSingleCallWithFallback($baseUrl, $headers, $payload, $timeout, $request->isJson());
        }

        // Multi-turn tool-calling loop
        $maxRounds = $request->getMaxToolRounds();
        for ($round = 0; $round < $maxRounds; $round++) {
            $payload = [
                'model' => $model,
                'messages' => $messages,
                'tools' => $tools,
                'temperature' => $request->getTemperature(),
                'max_tokens' => $request->getMaxTokens(),
            ];

            try {
                $response = Http::timeout($timeout)
                    ->withHeaders($headers)
                    ->post($baseUrl . '/chat/completions', $payload);

                // If tool calling is not supported by the model (e.g. 400 error), fall back to single call without tools
                if ($response->status() === 400 && str_contains(strtolower($response->body()), 'tool')) {
                    Log::warning('Model does not support tools, falling back to direct prompt', ['model' => $model]);
                    unset($payload['tools']);
                    return $this->executeSingleCallWithFallback($baseUrl, $headers, $payload, $timeout, false);
                }

                if ($response->failed()) {
                    $errBody = $response->json('error.message') ?? $response->body();
                    Log::error('OpenAiAdapter HTTP error', ['status' => $response->status(), 'body' => $errBody]);
                    return LlmResponse::fail('AI provider error (' . $response->status() . '): ' . $errBody, $toolLog, $response->json() ?? []);
                }

                $json = $response->json();
                $choice = $json['choices'][0]['message'] ?? null;
                if (! $choice) {
                    return LlmResponse::fail('Unexpected AI provider response format.', $toolLog, $json ?? []);
                }

                $toolCalls = $choice['tool_calls'] ?? null;
                if (! $toolCalls) {
                    return LlmResponse::success($choice['content'] ?? '', null, $toolLog, $json);
                }

                $messages[] = $choice;
                foreach ($toolCalls as $call) {
                    $name = $call['function']['name'] ?? '';
                    $args = json_decode($call['function']['arguments'] ?? '{}', true) ?: [];
                    $result = call_user_func($toolHandler, $name, $args);
                    $resultString = is_string($result) ? $result : json_encode($result);

                    $toolLog[] = [
                        'tool' => $name,
                        'args' => $args,
                        'result_summary' => $resultString,
                    ];

                    $messages[] = [
                        'role' => 'tool',
                        'tool_call_id' => $call['id'] ?? '',
                        'content' => $resultString,
                    ];
                }
            } catch (\Throwable $e) {
                Log::error('OpenAiAdapter exception during tool loop', ['error' => $e->getMessage()]);
                return LlmResponse::fail('AI request exception: ' . $e->getMessage(), $toolLog);
            }
        }

        return LlmResponse::fail('The assistant exceeded the maximum allowed tool call rounds.', $toolLog);
    }

    protected function executeSingleCallWithFallback(string $baseUrl, array $headers, array $payload, int $timeout, bool $isJson): LlmResponse
    {
        try {
            $response = Http::timeout($timeout)
                ->withHeaders($headers)
                ->post($baseUrl . '/chat/completions', $payload);

            // If response_format json_object is rejected by this model (e.g. open models on OpenRouter), retry without response_format
            if ($response->status() === 400 && $isJson && isset($payload['response_format'])) {
                Log::warning('Provider rejected response_format, retrying with raw prompt');
                unset($payload['response_format']);
                $payload['messages'][] = [
                    'role' => 'user',
                    'content' => 'Note: Output valid JSON only, without any markdown formatting.',
                ];
                $response = Http::timeout($timeout)
                    ->withHeaders($headers)
                    ->post($baseUrl . '/chat/completions', $payload);
            }

            if ($response->failed()) {
                $errBody = $response->json('error.message') ?? $response->body();
                Log::error('OpenAiAdapter HTTP failure', ['status' => $response->status(), 'body' => $errBody]);
                return LlmResponse::fail('AI provider error (' . $response->status() . '): ' . $errBody, [], $response->json() ?? []);
            }

            $json = $response->json();
            $text = $json['choices'][0]['message']['content'] ?? '';

            return LlmResponse::success($text, null, [], $json);
        } catch (\Throwable $e) {
            Log::error('OpenAiAdapter exception', ['error' => $e->getMessage()]);
            return LlmResponse::fail('AI request exception: ' . $e->getMessage());
        }
    }
}
