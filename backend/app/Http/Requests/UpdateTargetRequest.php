<?php

declare(strict_types=1);

namespace App\Http\Requests;

use App\Enums\ScanType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTargetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'display_name' => [
                'nullable',
                'string',
                'max:255',
            ],
            'is_active' => [
                'sometimes',
                'boolean',
            ],
            'is_authorized' => [
                'sometimes',
                'boolean',
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
        ];
    }
}