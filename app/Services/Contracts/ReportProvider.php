<?php

declare(strict_types=1);

namespace App\Services\Contracts;

use App\Models\Target;

/**
 * A provider that turns normalized findings into a structured report payload.
 */
interface ReportProvider
{
    /**
     * @param  array<int, array{tool:string,title:string,category:string,severity:string,description:string,evidence:?string,recommendation:?string}>  $findings
     * @return array|null  Structured report, or null if generation failed / unavailable.
     */
    public function generate(array $findings, Target $target): ?array;
}
