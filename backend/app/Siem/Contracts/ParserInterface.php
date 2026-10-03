<?php

namespace App\Siem\Contracts;

use App\Siem\NormalizedEvent;

interface ParserInterface
{
    public function parse(string $raw, \Carbon\Carbon $receivedAt): NormalizedEvent;
}
