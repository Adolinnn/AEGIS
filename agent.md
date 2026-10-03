# Aegis — Project Architecture & Agent Guide (`AGENTS.md`)

## 1. Project Overview

**Aegis** is an automated web vulnerability scanning, reconnaissance, and uptime monitoring platform built with a **Laravel (backend)** and **React + Inertia.js (frontend)** architecture.

### Key Capabilities
- **Target Management**: Authorize and monitor domain URLs and IP addresses.
- **Unified Scanning Engine**:
  - **Quick Scan**: Real-time synchronous HTTP reconnaissance (headers, SSL/TLS, open ports, robots.txt, security headers).
  - **Full Tool Runs (Async via Queue)**: Integrates standard CLI security binaries: `nmap`, `nikto`, `nuclei`, `sqlmap`, `sslscan`, `whatweb`, `whois`, `wpscan`, `dig`, `gobuster`.
- **Unified Finding Model**: Single consolidated database entity (`findings`) for all vulnerabilities, findings, and evidence produced across built-in checks and external tools.
- **AI Remediation & Assistant**:
  - Auto-generated remediation code snippets / patches for detected vulnerabilities.
  - Context-aware AI Chat Sidebar (interacts with targets, findings, and scan history).
  - Executive summary and security report generation.
  - Multi-LLM support: OpenAI, Anthropic, Gemini, DeepSeek, Groq, Ollama, OpenRouter.
- **Uptime & Response Monitoring**: Background cron-based interval checks with status logging and response time tracking.
- **Subscription Tiers & Admin Panel**: Free, Pro, Agency tiers + dedicated admin portal (`/admin`).

---

## 2. Monorepo Directory Structure

The project is split into a **backend** and **frontend** layout with shared workspace root scripts:

```
aegis-restructured/
├── backend/                  # Laravel 11/12 Application Root
│   ├── app/
│   │   ├── Console/Commands/ # aegis:scan, aegis:uptime, etc.
│   │   ├── Enums/            # ToolName, ScanType, ScanRunStatus, VulnerabilitySeverity, SubscriptionTier
│   │   ├── Http/Controllers/ # Web, Admin, Auth, API controllers
│   │   ├── Jobs/             # RunScanJob, CheckUptimeJob, GenerateAIPatchJob, GenerateReportJob
│   │   ├── Models/           # User, Target, ScanRun, Finding, ScanToolOutput, Report, UptimeLog
│   │   ├── Scanning/         # ToolRegistry, ToolRunnerService, QuickReconService, Tool wrappers
│   │   └── Services/         # ScannerService, UptimeService, AiRemediationService, ChatService, ReportAgentService
│   ├── config/               # app.php, database.php, scanning.php, services.php, inertia.php
│   ├── database/             # Migrations, seeders, factories
│   ├── routes/               # web.php, auth.php, admin.php, console.php
│   ├── package.json          # Node dependencies & Vite build scripts
│   ├── vite.config.js        # Multi-folder Vite config linking ../frontend
│   ├── tailwind.config.js    # Styling config scanning ../frontend/js
│   ├── phpunit.xml           # Test configuration
│   └── .php/php.ini          # PHP CLI extensions config (pdo_mysql) (pdo_mysql)
├── frontend/                 # React 18 SPA Frontend
│   ├── css/
│   │   └── app.css           # Tailwind base, components, utilities
│   ├── js/
│   │   ├── app.jsx           # Inertia app initialization & dynamic page resolver
│   │   ├── bootstrap.js      # Axios & CSRF token setup
│   │   ├── Components/       # UI building blocks (ChatSidebar, Modal, Dropdown, Buttons, etc.)
│   │   ├── Layouts/          # AuthenticatedLayout, GuestLayout
│   │   └── Pages/            # Inertia Page Views
│   │       ├── Admin/        # Login, Dashboard
│   │       ├── Auth/         # Login, Register, ForgotPassword, ResetPassword, VerifyEmail, ConfirmPassword
│   │       ├── Billing/      # Index (tier management)
│   │       ├── Profile/      # Edit, API keys, password, delete account
│   │       ├── QuickScan/    # Index (live reconnaissance runner)
│   │       ├── ScanRuns/     # Index, Show (scan execution & tool logs)
│   │       ├── Targets/      # Index, Create, Edit, Show, Vulnerabilities, UptimeHistory
│   │       ├── Uptime/       # Index, Show
│   │       ├── Vulnerabilities/ # Index (findings filter, resolve, patch generator)
│   │       └── Welcome.jsx   # Landing page
│   └── node_modules -> ../backend/node_modules # Symlink for module resolution
├── start.sh                  # Single-command dev environment runner
└── AGENTS.md                 # Project architecture and developer manual
```

---

## 3. Backend & Frontend Connection (The "Glue")

### 1. Asset Bundling & Routing via Vite & Symlinks
- **Symlink Bridge**:
  - `backend/resources/js -> ../../frontend/js`
  - `backend/resources/css -> ../../frontend/css`
  - `frontend/node_modules -> ../backend/node_modules`
- **`backend/vite.config.js`**:
  - Configured with `laravel-vite-plugin` with entry point `'resources/js/app.jsx'`.
  - Configures alias `'@'` -> `path.resolve(__dirname, '../frontend/js')`.
  - Grants filesystem permission to serve files from parent directory (`server.fs.allow: ['..']`).
- **`backend/resources/views/app.blade.php`**:
  - Serves as the single HTML entrypoint for Inertia:
    ```blade
    @routes
    @viteReactRefresh
    @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
    @inertiaHead
    ```
- **Ziggy Route Helper (`@routes`)**:
  - Generates route JSON in the Blade template so React components can call `route('targets.show', id)`.

### 2. Inertia Page Resolution
- **In `frontend/js/app.jsx`**:
  ```javascript
  createInertiaApp({
      title: (title) => `${title} - ${appName}`,
      resolve: (name) =>
          resolvePageComponent(
              `./Pages/${name}.jsx`,
              import.meta.glob('./Pages/**/*.jsx'),
          ),
      setup({ el, App, props }) {
          const root = createRoot(el);
          root.render(<App {...props} />);
      },
  });
  ```
- **In Laravel Tests**:
  - `backend/config/inertia.php` must point `page_paths` and `testing.page_paths` to `base_path('../frontend/js/Pages')` so `assertInertia` assertions can locate component files.

### 3. Shared `node_modules`
- All NPM dependencies live in `backend/package.json`.
- A symbolic link `frontend/node_modules -> backend/node_modules` is maintained so that bare imports inside `frontend/` resolve seamlessly in both IDEs and build tooling.

---

## 4. Key Workflows & Data Pipelines

### A. Vulnerability Scanning Workflow
1. User creates an authorized **Target** (`/targets/create`).
2. User triggers a Scan Run (`POST /targets/{target}/scan-run`) with selected tools and consent confirmation.
3. Controller creates a `ScanRun` record (`status = PENDING`) and dispatches `RunScanJob`.
4. Queue worker executes `RunScanJob`:
   - Runs selected tools via `ToolRunnerService` (or built-in HTTP checks via `ScannerService`).
   - Parses stdout/stderr and stores tool raw logs in `ScanToolOutput`.
   - Normalizes discovered security issues into unified `Finding` records.
   - If AI report generation is enabled, dispatches `GenerateReportJob`.
   - Updates `ScanRun` status to `COMPLETED` or `FAILED`.
5. Frontend polls/displays real-time progress at `/scan-runs/{id}`.

### B. AI Remediation & Chat
1. **Finding Remediation**: Dispatches `GenerateAIPatchJob` to analyze `evidence`, `raw_output`, and `recommendation`, generating code patches saved to `finding.ai_patch_snippet`.
2. **Contextual Chat**: `ChatController` uses `ChatService` to ingest user target history and findings into prompt context, enabling security recommendations and target management directly from the sidebar.

### C. Uptime Monitoring
1. Scheduler (`php artisan schedule:work`) runs `aegis:uptime` on scheduled intervals.
2. `UptimeService` performs HTTP HEAD/GET probes against active targets, logging response times, status codes, and SSL certificate validity into `uptime_logs`.

---

## 5. Discrepancies & Recommended Fixes

| Discrepancy / Issue | Root Cause | Fix / Solution |
| :--- | :--- | :--- |
| **Inertia Test Failures (`assertInertia`)** | Inertia defaults `page_paths` to `backend/resources/js/Pages` which was moved to `../frontend/js/Pages`. | Add `backend/config/inertia.php` configuring `page_paths => [base_path('../frontend/js/Pages')]`. |
| **Admin Controller Model Reference** | `Admin\AuthenticatedSessionController` referenced retired `VulnerabilityLog` instead of `Finding`. | Update controller to query `Finding::count()`, `Finding::unresolved()->count()`, and `Finding::with('target:id,domain_url,user_id')`. |
| **Admin Dashboard React Binding** | `Admin/Dashboard.jsx` displayed `v.vulnerability_type`. | Update JSX to display `v.title || v.category`. |
| **Node / NPM Environment in Shells** | Node binaries are installed at `~/.local/bin` / `~/.hermes/node/bin`. | Ensure `start.sh` and shell profiles include user Node directories in `PATH`. |
| **PHP Extensions** | CLI PHP on host requires PDO MySQL extensions from `.php/php.ini`. | Export `PHP_INI_SCAN_DIR=":$PWD/.php"` during CLI commands and test runs. |

---

## 6. Development & Run Commands

### Starting the Development Stack
Run everything (backend server, Vite dev server, queue worker, scheduler) with a single command:
```bash
./start.sh
```

### Manual Individual Commands (from `backend/` directory)
```bash
cd backend

# Configure PHP extensions (MySQL) & User Node PATH
export PHP_INI_SCAN_DIR=":$PWD/.php"
export PATH="$HOME/.local/bin:$HOME/.hermes/node/bin:$PATH"

# Run migrations & seeders
php artisan migrate --force
php artisan db:seed --force

# Start backend server
php artisan serve --port=8000

# Start Vite dev server
npm run dev

# Start queue worker for async scans
php artisan queue:listen --tries=1 --timeout=0

# Start scheduler for uptime checks
php artisan schedule:work

# Run test suite
./vendor/bin/phpunit
```

---

## 7. Change Log & Architecture Evolution

### [2026-08-27] Architecture Deepening & Pentester / SecOps UI Overhaul

#### 1. Scan Engine Deepening & Adapter Seam (`BuiltinTool`)
- **Created `backend/app/Scanning/Tools/BuiltinTool.php`**: Implemented `SecurityTool` contract to wrap internal synchronous HTTP recon checks (`ScannerService`) behind the same uniform adapter interface used by external CLI tools.
- **Updated `backend/app/Scanning/ToolRegistry.php`**: Added `ToolName::Builtin => BuiltinTool::class` to registry mapping.
- **Deepened `backend/app/Scanning/ScanEngine.php`**: Removed hardcoded `if ($tool === ToolName::Builtin)` special-case execution branch in `runSingleTool()`. All tool execution, timeout handling, output capture (`ScanToolOutput`), and finding extraction now flow through the unified polymorphism seam.
- **Simplified Controllers**: Cleaned up `ScanRunController` and `TargetController` to source available tool definitions directly from `ToolRegistry::all()`.
- **Created Feature Test**: Added `backend/tests/Feature/Scanning/BuiltinToolTest.php`.

#### 2. Pentester / SecOps Operations Center UI Overhaul & Neo Animation Suite
- **Design System & Typography**:
  - Configured Google Fonts (`Inter` + `JetBrains Mono`) in `backend/resources/views/app.blade.php`.
  - Added cyber color palette, glow filters, dot matrix backgrounds, and dark scrollbars in `backend/tailwind.config.js` and `frontend/css/app.css`.
- **Persistent Thematic Background Canvas**:
  - Embedded directly into root HTML shell (`backend/resources/views/app.blade.php`) so background animations (360° radar surveillance sweep, precision dot matrix grid, and drifting volumetric nebula orbs) never reset or stutter during Inertia page navigations.
  - Tuned with dark void gradient palette (`#050a16` radial center tapering to `#010205` outer edges) for maximum text and card contrast.
- **Elegant Navbar Page Transitions & Navigation**:
  - High-tech cyber laser page loading bar (`#nprogress .bar`) with `#f43f5e` neon glow and `#06b6d4` trailing beam.
  - Luminescent bottom telemetry line (`.navbar-telemetry-line`) for clean navbar separation.
  - Active `NavLink` indicator with pulsing ruby beacon dot (`animate-ping`) and animated multi-gradient underline bar (`from-cyan-400 via-rose-500 to-cyan-400`).
- **Telemetry Terminal Component (`TelemetryTerminal.jsx`)**:
  - Mac/Linux styled window titlebar with glowing traffic lights (`rose`, `amber`, `emerald`) and live stream badge.
  - In-terminal grep search/filter to search logs on the fly for IPs, ports, CVEs, or errors.
  - Line numbers gutter with hover illumination.
  - Automatic syntax highlighting for IPv4 addresses, URLs, CVE identifiers, open ports, and severity tokens (`[+]`, `[-]`, `[!]`, `[CRITICAL]`, `[HIGH]`, `[INFO]`).
  - Integrated operator controls: font scaling (`AA-`/`AA`/`AA+`), soft line wrapping, 1-click clipboard copy with feedback, fullscreen mode, and live blinking cursor (`▌`).
- **Neo Cyber Animation Suite**:
  - **Laser Beam Headers (`.laser-beam-header`)**: Holographic cyber laser sweep continually animating across table and card headers.
  - **Interactive 3D Card Lifts (`.cyber-card-interactive`)**: Elevation lift with ambient neon backdrop flare blooms (`cyan-500`, `amber-500`, `rose-500`) and icon micro-tilt on hover.
  - **Staggered HUD Entrance (`hud-fade-in`, `hud-stagger-1`, `hud-stagger-2`)**: Smooth decapsulation entrance on all page components.
  - **Live Sonar Ping Beacons**: Real-time pulsing radar rings for online status indicators and monitored targets.
  - **Tactical Cyber Buttons**: Tactical matte buttons with clean hover depth and click feedback.
- **Layout & Navigation**:
  - `AuthenticatedLayout.jsx`: Glassmorphic navigation header with live system status beacon (`[ONLINE]`), monospace tracking tabs, and user operator role badges.
  - `ChatSidebar.jsx`: High-tech docked AI Assistant panel with prompt suggestion pills, active target/scan context tracking, and code snippet rendering.
- **Primary Pages**:
  - `Dashboard.jsx`: Security Operations Center layout with glowing metric cards, 5-level Threat Severity Matrix, and recent operations feed.
  - `QuickScan/Index.jsx`: Live Reconnaissance Terminal with quick target presets and `TelemetryTerminal` output screen for `whois`, `dig`, `sslscan`, and `whatweb`.
  - `ScanRuns/Show.jsx` & `ScanRuns/Index.jsx`: Live telemetry terminal with autoscrolling log streaming via `TelemetryTerminal`, AI executive report synthesis, risk score meters, and tool dispatch checkboxes.
  - `Targets/Index.jsx` & `Vulnerabilities/Index.jsx`: Asset surveillance matrix with latency gauges and unified vulnerability triage with AI patch synthesis.
  - `Welcome.jsx`: High-impact landing page with interactive terminal animation, live capability badges, and tool integration showcase.

#### 3. Verification
- **Vite Build**: Compiled all 59 frontend chunks with 0 errors (`npm run build`).
- **PHPUnit Test Suite**: 79 tests, 277 assertions passing with 0 failures.

---

## 8. Deferred Features & Future Roadmap

### Feature: Uptime Monitoring & Response Time Telemetry Engine
- **Status**: Deferred from primary navigation to keep the application hyper-focused on its core penetration testing, scanning orchestration, and AI remediation capabilities.
- **Existing Backend Infrastructure**:
  - **Models**: `UptimeLog` (`target_id`, `status_code`, `response_time_ms`, `status` [up/down/degraded], `error_message`, `response_headers`, `checked_at`).
  - **Relationships**: `Target::uptimeLogs()`, `Target::latestUptimeLog()`, and dynamic model accessors `getUptimePercentageAttribute()`, `getAverageResponseTimeAttribute()`, and `isOverdueForCheck()`.
  - **Service**: `App\Services\UptimeService` executes HTTP probes with timeout handling and header filtering (`filterHeaders`).
  - **Queue / Scheduler**: `CheckUptimeJob` and console interval dispatcher in `routes/console.php` (`Schedule::call(...)` dispatching jobs for overdue targets).
  - **Controllers**: `App\Http\Controllers\UptimeController` with `index()`, `show()`, `check()`, `bulkCheck()`, `statistics()`.
- **Future Activation Checklist**:
  1. Register `uptime.*` routes in `backend/routes/web.php` (`uptime.index`, `uptime.show`, `uptime.check`, `uptime.bulk-check`, `uptime.statistics`).
  2. Restore `<NavLink href={route('uptime.index')}>Uptime</NavLink>` in `frontend/js/Layouts/AuthenticatedLayout.jsx`.
  3. Overhaul `frontend/js/Pages/Uptime/Index.jsx` and `frontend/js/Pages/Uptime/Show.jsx` with the SecOps laser-beam design system, real-time latency percentile gauges, and sparkline latency visualizers.
  4. Add feature test suite in `backend/tests/Feature/UptimeTest.php`.


