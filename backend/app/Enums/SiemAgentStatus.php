<?php

namespace App\Enums;

enum SiemAgentStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Offline = 'offline';
    case Revoked = 'revoked';
}
