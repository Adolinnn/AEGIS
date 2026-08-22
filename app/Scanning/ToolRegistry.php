<?php

declare(strict_types=1);

namespace App\Scanning;

use App\Enums\ToolName;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\Tools\DigTool;
use App\Scanning\Tools\GobusterTool;
use App\Scanning\Tools\NiktoTool;
use App\Scanning\Tools\NmapTool;
use App\Scanning\Tools\NucleiTool;
use App\Scanning\Tools\SqlmapTool;
use App\Scanning\Tools\SslscanTool;
use App\Scanning\Tools\WhatwebTool;
use App\Scanning\Tools\WhoisTool;
use App\Scanning\Tools\WpscanTool;
use Illuminate\Support\Collection;

/**
 * Central registry mapping each ToolName to its adapter. Used by the jobs to
 * resolve a tool at runtime and by the UI to discover which tools are
 * installed and therefore available to run.
 */
class ToolRegistry
{
    /**
     * @var array<string, class-string<SecurityTool>>
     */
    protected array $map = [];

    public function __construct()
    {
        $this->map = [
            ToolName::Nmap->value => NmapTool::class,
            ToolName::Nikto->value => NiktoTool::class,
            ToolName::Wpscan->value => WpscanTool::class,
            ToolName::Gobuster->value => GobusterTool::class,
            ToolName::Sqlmap->value => SqlmapTool::class,
            ToolName::Whois->value => WhoisTool::class,
            ToolName::Dig->value => DigTool::class,
            ToolName::Sslscan->value => SslscanTool::class,
            ToolName::Whatweb->value => WhatwebTool::class,
            ToolName::Nuclei->value => NucleiTool::class,
        ];
    }

    /**
     * Resolve a tool adapter by name, or null if not registered.
     */
    public function get(ToolName $name): ?SecurityTool
    {
        if (! isset($this->map[$name->value])) {
            return null;
        }

        return app($this->map[$name->value]);
    }

    /**
     * All registered tools (regardless of installation status).
     *
     * @return Collection<int, SecurityTool>
     */
    public function all(): Collection
    {
        return collect($this->map)
            ->map(fn (string $class) => app($class));
    }

    /**
     * Only tools whose binary is present on the host.
     *
     * @return Collection<int, SecurityTool>
     */
    public function available(): Collection
    {
        return $this->all()->filter(
            fn (SecurityTool $tool) => $tool->name()->isInstalled()
        );
    }

    /**
     * Resolve several tools at once, skipping any that are unknown.
     *
     * @param  array<int, ToolName>  $names
     * @return Collection<int, SecurityTool>
     */
    public function resolveMany(array $names): Collection
    {
        return collect($names)
            ->map(fn (ToolName $name) => $this->get($name))
            ->filter();
    }
}
