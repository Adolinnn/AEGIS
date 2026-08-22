<?php

declare(strict_types=1);

namespace Tests\Unit\Scanning;

use App\Enums\ToolName;
use App\Enums\VulnerabilitySeverity;
use App\Scanning\Tools\NmapTool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NmapToolTest extends TestCase
{
    use RefreshDatabase;

    protected NmapTool $tool;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tool = new NmapTool();
    }

    public function test_name_is_nmap(): void
    {
        $this->assertSame(ToolName::Nmap, $this->tool->name());
    }

    public function test_build_command_returns_argument_array(): void
    {
        $command = $this->tool->buildCommand('127.0.0.1');

        // First element is the binary; no shell string interpolation.
        $this->assertStringContainsString('nmap', $command[0]);
        $this->assertContains('-F', $command);
        $this->assertContains('-oX', $command);
        $this->assertContains('-sV', $command);
        $this->assertSame('127.0.0.1', $command[array_key_last($command)]);
    }

    public function test_parses_open_ports_and_risky_services(): void
    {
        $xml = <<<XML
<nmaprun>
  <host>
    <address addr="10.0.0.5" addrtype="ipv4"/>
    <ports>
      <port protocol="tcp" portid="21"><state state="open"/><service name="ftp" product="vsftpd" version="2.3.4"/></port>
      <port protocol="tcp" portid="22"><state state="open"/><service name="ssh"/></port>
      <port protocol="tcp" portid="80"><state state="open"/><service name="http" product="nginx"/></port>
      <port protocol="tcp" portid="23"><state state="open"/><service name="telnet"/></port>
      <port protocol="tcp" portid="443"><state state="closed"/></port>
    </ports>
  </host>
</nmaprun>
XML;

        $findings = $this->tool->parseOutput($xml, 0);

        // 4 open ports = 4 info findings + 2 risky services (ftp, telnet) = 6.
        $this->assertCount(6, $findings);

        $risky = array_filter($findings, fn ($f) => $f->category === 'risky-service');
        $this->assertCount(2, $risky);
        foreach ($risky as $f) {
            $this->assertSame(VulnerabilitySeverity::Medium, $f->severity);
        }

        $openPort = array_filter($findings, fn ($f) => $f->title === 'Open port 80/tcp (http)');
        $this->assertCount(1, $openPort);

        // Closed ports are skipped.
        $this->assertEmpty(array_filter($findings, fn ($f) => str_contains($f->title, '443')));
    }

    public function test_returns_empty_when_no_xml(): void
    {
        $this->assertSame([], $this->tool->parseOutput('no xml here', 0));
    }

    public function test_finding_dto_is_well_formed(): void
    {
        $xml = <<<XML
<nmaprun><host><address addr="1.2.3.4" addrtype="ipv4"/><ports>
<port protocol="tcp" portid="22"><state state="open"/><service name="ssh"/></port>
</ports></host></nmaprun>
XML;

        $findings = $this->tool->parseOutput($xml, 0);
        $f = $findings[0];

        $this->assertSame(ToolName::Nmap, $f->tool);
        $this->assertSame('open-port', $f->category);
        $this->assertSame(VulnerabilitySeverity::Info, $f->severity);
        $this->assertArrayHasKey('tool', $f->toArray());
        $this->assertSame('nmap', $f->toArray()['tool']);
    }
}
