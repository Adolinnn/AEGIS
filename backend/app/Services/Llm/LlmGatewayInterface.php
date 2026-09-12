<?php

declare(strict_types=1);

namespace App\Services\Llm;

interface LlmGatewayInterface
{
    /**
     * Send an LLM request and obtain a unified response.
     */
    public function send(LlmRequest $request): LlmResponse;
}
