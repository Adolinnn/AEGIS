<?php

declare(strict_types=1);

namespace App\Services\Llm;

/**
 * Universal Value Object representing an LLM execution response.
 */
class LlmResponse
{
    /**
     * @param array<int, array{tool: string, args: array<string, mixed>, result_summary: string}> $toolCalls
     * @param array<string, mixed> $raw
     */
    public function __construct(
        protected ?string $text = null,
        protected ?array $json = null,
        protected array $toolCalls = [],
        protected ?string $error = null,
        protected array $raw = []
    ) {}

    public static function success(string $text, ?array $json = null, array $toolCalls = [], array $raw = []): self
    {
        return new self($text, $json, $toolCalls, null, $raw);
    }

    public static function fail(string $errorMessage, array $toolCalls = [], array $raw = []): self
    {
        return new self(null, null, $toolCalls, $errorMessage, $raw);
    }

    public function isSuccess(): bool
    {
        return $this->error === null;
    }

    public function isError(): bool
    {
        return $this->error !== null;
    }

    public function text(): ?string
    {
        return $this->text;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function json(): ?array
    {
        if ($this->json !== null) {
            return $this->json;
        }

        if ($this->text !== null) {
            // Strip markdown code fences if model wrapped JSON in ```json ... ```
            $clean = trim($this->text);
            if (preg_match('/```(?:json)?\s*([\s\S]*?)\s*```/', $clean, $matches)) {
                $clean = trim($matches[1]);
            }
            $decoded = json_decode($clean, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return null;
    }

    /**
     * @return array<int, array{tool: string, args: array<string, mixed>, result_summary: string}>
     */
    public function toolCalls(): array
    {
        return $this->toolCalls;
    }

    public function error(): ?string
    {
        return $this->error;
    }

    /**
     * @return array<string, mixed>
     */
    public function raw(): array
    {
        return $this->raw;
    }
}
