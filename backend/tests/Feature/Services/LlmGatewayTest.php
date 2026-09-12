<?php

declare(strict_types=1);

namespace Tests\Feature\Services;

use App\Models\User;
use App\Services\Llm\Adapters\FakeLlmAdapter;
use App\Services\Llm\LlmGateway;
use App\Services\Llm\LlmGatewayInterface;
use App\Services\Llm\LlmRequest;
use App\Services\Llm\LlmResponse;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class LlmGatewayTest extends TestCase
{
    public function test_gateway_sends_openai_request_correctly(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => 'Hello security engineer',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $gateway = new LlmGateway();

        $request = LlmRequest::make()
            ->withProvider('openai')
            ->withApiKey('test-key-123')
            ->withMessages([
                ['role' => 'user', 'content' => 'Hello'],
            ]);

        $response = $gateway->send($request);

        $this->assertTrue($response->isSuccess());
        $this->assertSame('Hello security engineer', $response->text());

        Http::assertSent(function ($httpReq) {
            return $httpReq->url() === 'https://api.openai.com/v1/chat/completions'
                && $httpReq->hasHeader('Authorization', 'Bearer test-key-123');
        });
    }

    public function test_gateway_sends_anthropic_request_correctly(): void
    {
        Http::fake([
            'https://api.anthropic.com/v1/messages' => Http::response([
                'content' => [
                    [
                        'type' => 'text',
                        'text' => 'Anthropic security patch',
                    ],
                ],
            ], 200),
        ]);

        $gateway = new LlmGateway();

        $request = LlmRequest::make()
            ->withProvider('anthropic')
            ->withApiKey('sk-ant-test-key')
            ->withMessages([
                ['role' => 'system', 'content' => 'System prompt here'],
                ['role' => 'user', 'content' => 'User prompt here'],
            ]);

        $response = $gateway->send($request);

        $this->assertTrue($response->isSuccess());
        $this->assertSame('Anthropic security patch', $response->text());

        Http::assertSent(function ($httpReq) {
            return $httpReq->url() === 'https://api.anthropic.com/v1/messages'
                && $httpReq->hasHeader('x-api-key', 'sk-ant-test-key')
                && $httpReq['system'] === 'System prompt here';
        });
    }

    public function test_gateway_parses_json_responses(): void
    {
        Http::fake([
            'https://api.openai.com/v1/chat/completions' => Http::response([
                'choices' => [
                    [
                        'message' => [
                            'content' => '```json {"risk_score": 85, "risk_level": "high"} ```',
                        ],
                    ],
                ],
            ], 200),
        ]);

        $gateway = new LlmGateway();

        $request = LlmRequest::make()
            ->withProvider('openai')
            ->withApiKey('test-key')
            ->asJson()
            ->withMessages([
                ['role' => 'user', 'content' => 'Assess risk'],
            ]);

        $response = $gateway->send($request);

        $this->assertTrue($response->isSuccess());
        $this->assertSame(['risk_score' => 85, 'risk_level' => 'high'], $response->json());
    }

    public function test_gateway_fake_helper_binds_in_memory_fake(): void
    {
        $fake = LlmGateway::fake(LlmResponse::success('Fake AI text', ['key' => 'val']));

        $gateway = app(LlmGatewayInterface::class);

        $request = LlmRequest::make()->withMessages([
            ['role' => 'user', 'content' => 'Test message'],
        ]);

        $response = $gateway->send($request);

        $this->assertTrue($response->isSuccess());
        $this->assertSame('Fake AI text', $response->text());
        $this->assertSame(['key' => 'val'], $response->json());
        $this->assertCount(1, $fake->recorded());
    }
}
