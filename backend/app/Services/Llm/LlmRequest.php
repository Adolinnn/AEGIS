<?php

declare(strict_types=1);

namespace App\Services\Llm;

use App\Models\User;

/**
 * Universal Value Object representing an LLM execution request.
 */
class LlmRequest
{
    /** @var array<int, array{role: string, content: string}> */
    protected array $messages = [];

    /** @var array<int, array<string, mixed>> */
    protected array $tools = [];

    /** @var (callable(string, array<string, mixed>): mixed)|null */
    protected $toolHandler = null;

    protected ?array $jsonSchema = null;
    protected ?User $user = null;
    protected ?string $provider = null;
    protected ?string $apiKey = null;
    protected ?string $model = null;
    protected ?string $baseUrl = null;
    protected float $temperature = 0.3;
    protected int $maxTokens = 1500;
    protected int $timeout = 60;
    protected int $maxToolRounds = 4;
    protected ?string $referer = null;
    protected ?string $title = null;

    public static function make(): self
    {
        return new self();
    }

    /**
     * @param array<int, array{role: string, content: string}> $messages
     */
    public function withMessages(array $messages): self
    {
        $clone = clone $this;
        $clone->messages = $messages;
        return $clone;
    }

    public function addMessage(string $role, string $content): self
    {
        $clone = clone $this;
        $clone->messages[] = ['role' => $role, 'content' => $content];
        return $clone;
    }

    /**
     * @param array<int, array<string, mixed>> $tools
     */
    public function withTools(array $tools, ?callable $handler = null): self
    {
        $clone = clone $this;
        $clone->tools = $tools;
        $clone->toolHandler = $handler;
        return $clone;
    }

    public function withToolHandler(callable $handler): self
    {
        $clone = clone $this;
        $clone->toolHandler = $handler;
        return $clone;
    }

    public function asJson(?array $schema = null): self
    {
        $clone = clone $this;
        $clone->jsonSchema = $schema ?? ['type' => 'object'];
        return $clone;
    }

    public function forUser(?User $user): self
    {
        $clone = clone $this;
        $clone->user = $user;
        return $clone;
    }

    public function withProvider(string $provider): self
    {
        $clone = clone $this;
        $clone->provider = $provider;
        return $clone;
    }

    public function withModel(string $model): self
    {
        $clone = clone $this;
        $clone->model = $model;
        return $clone;
    }

    public function withApiKey(string $key): self
    {
        $clone = clone $this;
        $clone->apiKey = $key;
        return $clone;
    }

    public function withBaseUrl(string $url): self
    {
        $clone = clone $this;
        $clone->baseUrl = rtrim($url, '/');
        return $clone;
    }

    public function withTemperature(float $temperature): self
    {
        $clone = clone $this;
        $clone->temperature = $temperature;
        return $clone;
    }

    public function withMaxTokens(int $tokens): self
    {
        $clone = clone $this;
        $clone->maxTokens = $tokens;
        return $clone;
    }

    public function withTimeout(int $seconds): self
    {
        $clone = clone $this;
        $clone->timeout = $seconds;
        return $clone;
    }

    public function withMaxToolRounds(int $rounds): self
    {
        $clone = clone $this;
        $clone->maxToolRounds = $rounds;
        return $clone;
    }

    // Getters
    public function getMessages(): array { return $this->messages; }
    public function getTools(): array { return $this->tools; }
    public function getToolHandler(): ?callable { return $this->toolHandler; }
    public function getJsonSchema(): ?array { return $this->jsonSchema; }
    public function isJson(): bool { return $this->jsonSchema !== null; }
    public function getUser(): ?User { return $this->user; }
    public function getProvider(): ?string { return $this->provider; }
    public function getApiKey(): ?string { return $this->apiKey; }
    public function getModel(): ?string { return $this->model; }
    public function getBaseUrl(): ?string { return $this->baseUrl; }
    public function getTemperature(): float { return $this->temperature; }
    public function getMaxTokens(): int { return $this->maxTokens; }
    public function getTimeout(): int { return $this->timeout; }
    public function getMaxToolRounds(): int { return $this->maxToolRounds; }
    public function getReferer(): ?string { return $this->referer; }
    public function getTitle(): ?string { return $this->title; }
}
