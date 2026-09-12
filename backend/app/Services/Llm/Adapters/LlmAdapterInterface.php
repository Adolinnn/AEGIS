<?php

declare(strict_types=1);

namespace App\Services\Llm\Adapters;

use App\Services\Llm\LlmRequest;
use App\Services\Llm\LlmResponse;

interface LlmAdapterInterface
{
    public function send(LlmRequest $request): LlmResponse;
}
