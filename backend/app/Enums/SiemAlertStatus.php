<?php

namespace App\Enums;

enum SiemAlertStatus: string
{
    case Open = 'open';
    case Acknowledged = 'acknowledged';
    case Resolved = 'resolved';
    case FalsePositive = 'false_positive';
}
