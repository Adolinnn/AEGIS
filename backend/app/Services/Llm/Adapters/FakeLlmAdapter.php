<?php

declare(strict_types=1);

namespace App\Services\Llm\Adapters;

use App\Services\Llm\LlmRequest;
use App\Services\Llm\LlmResponse;

class FakeLlmAdapter implements LlmAdapterInterface
{
    /** @var array<int, LlmResponse|callable(LlmRequest): LlmResponse> */
    protected array $queue = [];

    /** @var array<int, LlmRequest> */
    protected array $recorded = [];

    protected ?LlmResponse $defaultResponse = null;

    public function __construct(?LlmResponse $defaultResponse = null)
    {
        $this->defaultResponse = $defaultResponse ?? LlmResponse::success('Mocked LLM Response');
    }

    public function queueResponse(LlmResponse|callable $response): self
    {
        $this->queue[] = $response;
        return $this;
    }

    public function send(LlmRequest $request): LlmResponse
    {
        $this->recorded[] = $request;

        if (! empty($this->queue)) {
            $next = array_shift($this->queue);
            if (is_callable($next)) {
                return $next($request);
            }
            return $next;
        }

        return $this->defaultResponse ?? LlmResponse::success('Mocked LLM Response');
    }

    /**
     * @return array<int, LlmRequest>
     */
    public function recorded(): array
    {
        return $this->recorded;
    }

    public function reset(): void
    {
        $this->queue = [];
        $this->recorded = [];
    }
}
