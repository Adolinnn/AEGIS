<?php

declare(strict_types=1);

namespace App\Services\Llm;

use App\Services\Llm\Adapters\AnthropicAdapter;
use App\Services\Llm\Adapters\FakeLlmAdapter;
use App\Services\Llm\Adapters\LlmAdapterInterface;
use App\Services\Llm\Adapters\OpenAiAdapter;
use Illuminate\Support\Facades\App;

class LlmGateway implements LlmGatewayInterface
{
    /**
     * Send an LLM request through the resolved provider adapter.
     */
    public function send(LlmRequest $request): LlmResponse
    {
        $adapter = $this->resolveAdapter($request);
        return $adapter->send($request);
    }

    /**
     * Resolve the appropriate provider adapter based on user settings or system config.
     */
    protected function resolveAdapter(LlmRequest $request): LlmAdapterInterface
    {
        // If an adapter is explicitly bound in the container (e.g. during testing)
        if (App::bound(LlmAdapterInterface::class)) {
            return App::make(LlmAdapterInterface::class);
        }

        $user = $request->getUser();
        $provider = strtolower(
            $request->getProvider()
            ?? ($user?->llm_provider)
            ?? config('services.llm.provider', 'openai')
        );

        return match ($provider) {
            'anthropic' => new AnthropicAdapter(),
            'openrouter', 'openai' => new OpenAiAdapter(),
            default => new OpenAiAdapter(),
        };
    }

    /**
     * Bind a test fake adapter into the service container.
     */
    public static function fake(?LlmResponse $defaultResponse = null): FakeLlmAdapter
    {
        $fake = new FakeLlmAdapter($defaultResponse);
        App::instance(LlmAdapterInterface::class, $fake);
        App::instance(LlmGatewayInterface::class, new self());
        return $fake;
    }
}
