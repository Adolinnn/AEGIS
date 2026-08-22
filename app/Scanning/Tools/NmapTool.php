<?php

declare(strict_types=1);

namespace App\Scanning\Tools;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Contracts\SecurityTool;
use App\Scanning\NormalizedFinding;
use SimpleXMLElement;

/**
 * Adapter for `nmap`. Runs a fast scan (-F) requesting XML output on stdout
 * (-oX -) and parses the host/port/service tree. Services historically
 * associated with weak or cleartext protocols are flagged Medium.
 */
class NmapTool implements SecurityTool
{
    /**
     * Services that warrant a medium-severity flag when exposed.
     */
    protected const RISKY_SERVICES = [
        'telnet' => 'Telnet transmits credentials in cleartext.',
        'ftp' => 'Plaintext FTP exposes credentials and data in transit.',
        'rsh' => 'Remote shell services are commonly abused.',
        'rpcbind' => 'Open RPC services broaden the attack surface.',
        'snmp' => 'SNMP can leak network topology and credentials.',
        'mysql' => 'Database ports should not be exposed publicly.',
        'redis' => 'Unauthenticated Redis is a common RCE vector.',
        'mongodb' => 'Databases should not be directly internet-exposed.',
        'elasticsearch' => 'Public search clusters are frequently abused.',
    ];

    public function name(): ToolName
    {
        return ToolName::Nmap;
    }

    public function buildCommand(string $target, array $options = []): array
    {
        $args = ['-F', '-oX', '-', '--no-stylesheet'];

        if (! empty($options['ports'])) {
            $args[] = '-p';
            $args[] = (string) $options['ports'];
        }

        if (filled($options['scan_type'] ?? null)) {
            $args[] = (string) $options['scan_type']; // e.g. '-sV', '-sS'
        } else {
            $args[] = '-sV';
        }

        $args[] = $target;

        return array_merge([$this->binary()], $args);
    }

    public function parseOutput(string $raw, int $exitCode): array
    {
        $xml = $this->extractXml($raw);
        if ($xml === null) {
            return [];
        }

        $findings = [];

        foreach ($xml->host as $host) {
            $address = (string) ($host->address['addr'] ?? 'unknown');

            if (! isset($host->ports->port)) {
                continue;
            }

            foreach ($host->ports->port as $port) {
                $portId = (int) ($port['portid'] ?? 0);
                $protocol = (string) ($port['protocol'] ?? 'tcp');
                $state = strtolower((string) ($port->state['state'] ?? 'closed'));

                if ($state !== 'open') {
                    continue;
                }

                $serviceName = strtolower((string) ($port->service['name'] ?? 'unknown'));
                $product = (string) ($port->service['product'] ?? '');
                $version = (string) ($port->service['version'] ?? '');

                $findings[] = new NormalizedFinding(
                    tool: $this->name(),
                    title: "Open port {$portId}/{$protocol} ({$serviceName})",
                    category: 'open-port',
                    severity: VulnerabilitySeverity::Info,
                    description: "Service {$serviceName} is listening on {$address}:{$portId}"
                        . (filled($product) ? " — {$product} {$version}" : ''),
                    evidence: "{$address}:{$portId}/{$protocol} {$serviceName}",
                    recommendation: 'Confirm this port should be internet-exposed; restrict via firewall if not.',
                );

                if (array_key_exists($serviceName, self::RISKY_SERVICES)) {
                    $findings[] = new NormalizedFinding(
                        tool: $this->name(),
                        title: "Risky service exposed: {$serviceName}",
                        category: 'risky-service',
                        severity: VulnerabilitySeverity::Medium,
                        description: self::RISKY_SERVICES[$serviceName],
                        evidence: "{$address}:{$portId} running {$serviceName}",
                        recommendation: "Restrict {$serviceName} access to trusted networks or disable it.",
                    );
                }
            }
        }

        return $findings;
    }

    /**
     * nmap writes XML to stdout when given `-oX -`, but stderr may contain
     * progress lines. Locate the <nmaprun> document within the combined output.
     */
    protected function extractXml(string $raw): ?SimpleXMLElement
    {
        $start = strpos($raw, '<nmaprun');
        if ($start === false) {
            return null;
        }

        $end = strrpos($raw, '</nmaprun>');
        if ($end === false) {
            return null;
        }

        $xmlString = substr($raw, $start, ($end + strlen('</nmaprun>')) - $start);

        try {
            return new SimpleXMLElement($xmlString);
        } catch (\Throwable) {
            return null;
        }
    }

    protected function binary(): ?string
    {
        return $this->name()->binary();
    }
}
