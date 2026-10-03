<?php

namespace App\Enums;

enum SiemEventSource: string
{
    case Auth = 'auth';
    case Syslog = 'syslog';
    case WebAccess = 'web_access';
    case WebError = 'web_error';
    case Firewall = 'firewall';
    case Agent = 'agent';
    case Fim = 'fim';
}
