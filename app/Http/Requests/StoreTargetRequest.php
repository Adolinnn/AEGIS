<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ScanType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTargetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'domain_url' => [
                'required',
                'string',
                'url',
                'max:2048',
                'active_url', // DNS validation
            ],
            'display_name' => [
                'nullable',
                'string',
                'max:255',
            ],
            'uptime_check_interval_minutes' => [
                'sometimes',
                'integer',
                'min:1',
                'max:1440',
            ],
            'scan_types' => [
                'sometimes',
                'array',
                'min:1',
            ],
            'scan_types.*' => [
                'string',
                Rule::in(array_column(ScanType::cases(), 'value')),
            ],
            'custom_headers' => [
                'sometimes',
                'array',
            ],
            'custom_headers.*' => [
                'string',
                'max:500',
            ],
            'follow_redirects' => [
                'sometimes',
                'boolean',
            ],
            'timeout_seconds' => [
                'sometimes',
                'integer',
                'min:5',
                'max:60',
            ],
            'is_authorized' => [
                'sometimes',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'domain_url.required' => 'Target URL is required.',
            'domain_url.url' => 'Please enter a valid URL (including http:// or https://).',
            'domain_url.active_url' => 'The domain could not be resolved. Please check the URL.',
            'scan_types.min' => 'At least one scan type must be selected.',
            'scan_types.*.in' => 'Invalid scan type selected.',
            'is_authorized' => 'Authorization must be true or false.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'domain_url' => $this->normalizeUrl($this->string('domain_url')->toString()),
        ]);
    }

    protected function normalizeUrl(string $url): string
    {
        $url = trim($url);

        if (!preg_match('/^https?:\/\//i', $url)) {
            $url = 'https://' . $url;
        }

        return rtrim($url, '/');
    }
}