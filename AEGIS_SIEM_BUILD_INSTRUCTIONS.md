# Aegis SIEM — Build Instructions (for Antigravity)

> Read this whole file first, then build **phase by phase** (Section 17).
> After each phase, run its acceptance check against **real data from a
> real agent on a real machine** before moving on.
> This is a **university project**: it must **work properly on real logs
> and demo well**. It does not need to be industry-grade. Do not
> over-engineer.
> This document contains instructions only. **Write the code yourself**,
> following the existing Aegis conventions. Do not copy any code you were
> not shown; if you are unsure how an existing class looks, open it and
> read it first.

---

## 0. NON-NEGOTIABLE RULES FOR THE AI AGENT BUILDING THIS

These override everything else. If following another section would break
one of these, stop and follow these instead.

### 0.1 Real data only — no fabrication, ever
1. **Every alert, event, and metric shown in the UI must come from a log
   line that a real agent actually shipped from a real monitored
   machine.** There is no other source of truth.
2. **Do NOT build a simulator, demo-data generator, seeder, factory,
   faker, "test detection" button, or any `siem:simulate` command.** None.
   If you feel the urge to add one "so the dashboard isn't empty," that is
   exactly what is forbidden — an empty dashboard with no agents is the
   *correct* state, and you must render a clear empty state instead
   (Section 12).
3. **No hardcoded, mocked, placeholder, or sample rows in any model,
   controller, migration seeder, or React component.** No `const
   sampleAlerts = [...]`. No "if no data, show these examples." Empty
   means empty.
4. **Charts and KPIs must query the database.** A chart with no data
   renders as an empty chart with a "no data yet" state — never with
   invented points.
5. The only sample log lines permitted anywhere are **inside PHPUnit test
   fixtures** (Section 16) — real-format log strings used purely to assert
   that a parser produces the right output. They must never reach the
   database of a running app, never be seeded, and never be reachable from
   any HTTP route or artisan command available in a normal run.

### 0.2 No hallucination / no inventing the codebase
6. **Follow the existing codebase style by reading it, not guessing.**
   Before you write a class, open the analogous existing one and mirror
   it: `app/Scanning/` (`ToolRegistry.php`, `Contracts/SecurityTool.php`,
   `NormalizedFinding.php`, `ScanEngine.php`), `app/Jobs/` (e.g.
   `RunToolJob.php`, `GenerateReportJob.php`), `app/Http/Controllers/
   DashboardController.php`, `routes/console.php`, and
   `frontend/js/Components/StatCard.jsx`.
7. **Do not invent APIs, helpers, env vars, columns, package names,
   routes, or framework features.** If this document does not state a
   thing exists, verify it in the actual files before relying on it. The
   verified facts you may rely on are in Section 2 — treat anything beyond
   them as "check first."
8. **Do not invent MITRE ATT&CK IDs.** For each rule, either use an ID
   you can state with confidence or leave the `mitre` field null. A null
   MITRE tag is fine; a wrong one is not. Do not guess technique numbers.
9. If any instruction here conflicts with what the real code does, **trust
   the code and flag the conflict in your output** — do not silently
   invent a reconciliation.

### 0.3 Safety and correctness
10. **Do not break existing features** (scans, uptime, chat, billing,
    admin). Existing tests must still pass.
11. **Multi-tenant by default.** Every SIEM table has `user_id`; every
    query is scoped to the logged-in user. No exceptions.
12. **One-way agents.** Agents only send data out. **No remote command
    execution** from server to agent, ever.
13. **Treat all log content as hostile input** (attackers control
    User-Agent, URLs, usernames). Never render it as HTML/Markdown, never
    `dangerouslySetInnerHTML`, never pass it through `MarkdownRenderer`.
    Truncate before storing.
14. Do not print or commit secrets from `backend/.env`.

---

## 1. Goal and scope

**Goal:** A working mini-SIEM inside Aegis. Each user installs lightweight
agents on their own servers; agents ship **real** logs to the Aegis server
(which has a public IP); Aegis parses those logs, detects attacks, raises
alerts, and shows everything in a good dashboard. The system's entire
value is that what you see is what actually happened on the monitored
machine.

**In scope (MVP)**
- Per-user agent creation with an **auto-generated, pre-configured
  installer/agent** (server public URL + unique credentials baked in)
- Agent heartbeat + log shipping (Linux: auth/SSH/sudo logs, nginx/apache
  access logs, syslog)
- Server-side parsing, storage, search of real shipped lines
- Rule-based detection, alert dedup, alert workflow
- Dashboard: overview, alerts, log explorer, agents, rules
- Retention cleanup, allowlist, parser/rule unit tests

**Out of scope**
- **Any simulator or synthetic data generator** (explicitly forbidden —
  see 0.1)
- Windows agent, Kubernetes/cloud logs, ML anomaly detection,
  Elasticsearch/Kafka, active response/auto-blocking, multi-user
  org/roles, compliance reports

---

## 2. VERIFIED facts about the current codebase (you may rely on these)

These were confirmed against the actual project. Everything else, read
before using.

| Fact (verified) | What to do about it |
|---|---|
| Laravel, PHP 8.4, Inertia 2 + React 18, Tailwind 3, Ziggy. Monorepo: Laravel in `backend/`, React in `frontend/js/`. | Build SIEM as a new module inside this app. No separate service. |
| `backend/bootstrap/app.php` `withRouting(...)` registers only `web`, `commands` (console), `channels`, and `health: '/up'`. **There is no `api` route file.** | Create `backend/routes/api.php` and register it in `withRouting(api: __DIR__.'/../routes/api.php')`. Agent endpoints live there (no session, no CSRF). |
| `backend/bootstrap/app.php` `withExceptions(...)` already calls `shouldRenderJsonWhen(fn (Request $r) => $r->is('api/*'))`. | JSON error rendering for `api/*` is already wired — your agent endpoints will return JSON errors automatically. Do not re-add it. |
| `docker/entrypoint.sh` **force-rewrites `APP_URL` to `http://localhost:8000`** (and `SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN` to localhost) on every container start. | Agents must NOT use `APP_URL`. Add a new env var `SIEM_PUBLIC_URL` that the entrypoint does not touch (Section 4). |
| Queue connection is `database`, run by `queue:listen --tries=1 --timeout=0` (in both `start.sh` and `docker/entrypoint.sh`); scheduler is `schedule:work`. | Reuse them. Detection runs in a queued job; maintenance runs via `routes/console.php` schedule. |
| Migrations auto-run on container start. Migration naming style: `YYYY_MM_DD_NNNNNN_description.php` (e.g. `2026_09_11_162056_add_trial_ends_at_to_users_table.php`). | Just add migrations in that style; no manual step on the server. |
| DB is an external managed MySQL (Aiven), limited storage. | Strict retention + raw-line truncation (Section 5/13). |
| **`backend/package.json` is the single build driver** (there is no `frontend/package.json`); the Dockerfile runs `npm install` + `npm run build` from `backend/`. No chart library is currently installed. | Add **recharts** to `backend/package.json`. Updating it + the lockfile is enough. |
| `routes/console.php` already uses both `Schedule::call(...)->everyMinute()->name(...)->withoutOverlapping()` and `Schedule::command('aegis:trials')->daily()`. | Mirror these exact styles for the SIEM schedules. |
| `app/Scanning/` contains `ToolRegistry.php`, `Contracts/SecurityTool.php`, `NormalizedFinding.php`, `ScanEngine.php`, `ScanEngineResult.php`, `Tools/`. `app/Jobs/` contains `RunToolJob`, `RunScanJob`, `CheckUptimeJob`, `GenerateReportJob`, `GenerateAIPatchJob`. `app/Events/ScanToolOutputUpdated.php` exists. | These are your templates. Mirror the registry/contract/DTO pattern for parsers and rules, and the job pattern for `ProcessSiemBatchJob`. |
| `frontend/js/Layouts/AuthenticatedLayout.jsx` and `frontend/js/Components/StatCard.jsx` exist. | Add the SIEM nav link to the layout; reuse `StatCard` and the existing dark/cyber theme + severity colors from the Vulnerabilities pages. |
| User model has LLM provider/key settings and `LlmGateway` exists. | Reuse for "Explain this alert" (Section 11), gated on the user having their own key. |
| Reverb (websockets, port 8080) exists but `VITE_REVERB_HOST` is baked as `localhost` at build time. | **Do not use websockets for SIEM.** Use polling (Section 12). Less firewall risk on the uni server. |

If you need a fact not in this table, **open the file and confirm it**
before writing code against it.

---

## 3. Architecture (data flow)

```
 Monitored server (user's)                       Aegis server (uni, public IP)
 ┌───────────────────────┐   HTTP(S) POST       ┌─────────────────────────────────────────────┐
 │ aegis-agent (Python)  │ ───────────────────▶ │ /api/siem/heartbeat   /api/siem/ingest      │
 │  - tails log files    │   (outbound only)    │   ↓ auth by agent id + secret (hashed)      │
 │  - batches + spools   │                      │ store raw events → dispatch ProcessBatchJob │
 │  - heartbeat          │ ◀─────────────────── │   ↓ parse → normalize → detect → alerts     │
 └───────────────────────┘   config version     │ MySQL: agents, events, alerts, rules        │
                                                │   ↓                                         │
                                                │ Inertia/React dashboard (polling JSON)      │
                                                └─────────────────────────────────────────────┘
```

Agents make **outbound connections only**, so monitored machines need no
open inbound ports. Only the Aegis server's web port (8000) must be
reachable from the internet. **The dashboard reflects exactly and only
what agents send — nothing is generated server-side for display.**

---

## 4. Configuration

Add `backend/config/siem.php` reading env vars:

| Env var | Default | Purpose |
|---|---|---|
| `SIEM_PUBLIC_URL` | falls back to `APP_URL` | **The URL agents call**, e.g. `http://<UNI_PUBLIC_IP>:8000`. Baked into every generated agent. |
| `SIEM_RETENTION_DAYS` | 7 | Events older than this are deleted daily. |
| `SIEM_ALERT_RETENTION_DAYS` | 90 | Closed alerts older than this are deleted. |
| `SIEM_MAX_BATCH_EVENTS` | 500 | Reject bigger ingest batches. |
| `SIEM_MAX_BODY_KB` | 1024 | Max ingest request body. |
| `SIEM_RAW_MAX_CHARS` | 2000 | Truncate stored raw line. |
| `SIEM_OFFLINE_AFTER_SECONDS` | 180 | Agent considered offline after this. |
| `SIEM_INSTALL_TOKEN_TTL_MINUTES` | 60 | Installer link lifetime. |
| `SIEM_AGENT_VERSION` | `1.0.0` | Current agent template version. |

**Server URL safety check:** if `SIEM_PUBLIC_URL` is empty, or contains
`localhost` / `127.0.0.1` / a private range (10.x, 172.16–31.x,
192.168.x), show a red warning banner on the Agents page and in the "Add
agent" wizard: *"Agents on other machines cannot reach this address. Set
SIEM_PUBLIC_URL to your server's public IP/domain."* Still allow
generation (useful when the agent is on the same host for a first test).

**`.env.example` / `.env.docker`:** document `SIEM_PUBLIC_URL` and the
retention values. Confirm `docker/entrypoint.sh` and `docker-compose.yml`
do not overwrite `SIEM_PUBLIC_URL` (only `APP_URL` is forced; leave it
that way).

---

## 5. Database (new migrations)

Existing migration naming style (Section 2). `bigint` ids for events.

### `siem_agents`
| Column | Notes |
|---|---|
| id, `user_id` (FK, cascade) | owner |
| `uuid` (unique) | public agent id used in headers |
| `name` | user label, e.g. "web-server-1" |
| `os_type` | `linux` for now |
| `secret_hash` | sha256 of the agent secret. **Plaintext secret is never stored.** |
| `secret_last4` | for display |
| `install_token_hash`, `install_token_expires_at` | one-time installer link (nullable) |
| `status` | `pending` / `active` / `revoked` (online/offline computed from `last_seen_at`) |
| `config` (json) | enabled log sources + paths, options |
| `hostname`, `ip_address` (last seen public IP), `local_ips` (json), `os_info`, `agent_version`, `tz_offset_minutes` | filled from heartbeat |
| `host_stats` (json) | cpu/mem/disk/uptime snapshot |
| `last_seen_at`, `first_seen_at`, `revoked_at`, timestamps | |

### `siem_events`
| Column | Notes |
|---|---|
| id (bigint), `user_id`, `agent_id` | |
| `occurred_at` (datetime, UTC), `received_at` | |
| `source` | `auth`, `syslog`, `web_access`, `web_error`, `firewall`, `agent` |
| `event_type` | normalized, e.g. `ssh_failed_login`, `ssh_accepted_login`, `ssh_invalid_user`, `sudo_command`, `sudo_auth_failure`, `user_created`, `group_member_added`, `web_request`, `log_truncated`, `unknown` |
| `severity` | info/low/medium/high/critical (default info; rules raise alerts) |
| `src_ip` (nullable, index), `username` (nullable) | |
| `message` | short human summary (≤255) |
| `fields` (json) | parsed extras: method, path, status, bytes, user_agent, port, etc. |
| `raw` (text) | truncated raw line |
| **Indexes** | `(user_id, occurred_at)`, `(agent_id, occurred_at)`, `(agent_id, event_type, src_ip, occurred_at)`, `(src_ip)` |

### `siem_alerts`
| Column | Notes |
|---|---|
| id, `user_id`, `agent_id` | |
| `rule_key`, `title`, `severity`, `description` | |
| `status` | `open` / `acknowledged` / `resolved` / `false_positive` |
| `src_ip`, `username` (nullable) | |
| `event_count`, `first_seen_at`, `last_seen_at` | updated on dedup |
| `dedupe_key` (index) | `rule_key + agent + src_ip(+username)` |
| `evidence` (json) | up to 50 **real** event ids + small summary |
| `mitre` (nullable) | technique id + name, or null if not certain (rule 0.2.8) |
| `ai_summary` (text, nullable) | cached AI explanation |
| `acknowledged_at`, `resolved_at`, timestamps | |

### `siem_rule_settings`
`user_id`, `rule_key`, `enabled` (bool), `threshold` (nullable int),
`window_seconds` (nullable int). Rules live in code; this table stores
per-user overrides only.

### `siem_allowlist`
`user_id`, `ip` (single IP or CIDR), `note`. Detection ignores
allowlisted source IPs. (Needed because Aegis's own scans/uptime checks
would otherwise trigger web-attack alerts on the user's own sites.)

> No seeders for any of these tables. They start empty and are filled only
> by real agent traffic and real user actions.

---

## 6. Agent management and AUTO-GENERATION (core feature)

### 6.1 User flow ("Add Agent" wizard on `/siem/agents`)
1. User clicks **Add agent**.
2. Form: **name**, **OS** (Linux only), **log sources** as checkboxes with
   editable paths and sensible defaults:
   - SSH/auth log (`/var/log/auth.log`; RHEL-like `/var/log/secure`)
   - Syslog (`/var/log/syslog` or `/var/log/messages`)
   - Web access log (nginx `/var/log/nginx/access.log`, apache
     `/var/log/apache2/access.log`)
   - Web error log (optional)
   - Custom path (optional) + parser type
3. User submits → server creates the agent and shows a **result screen**:
   - A one-line install command (copy button), as plain text:
     `curl -fsSL <SIEM_PUBLIC_URL>/siem/install/<one-time-token> | sudo bash`
   - A **Download installer** button (same installer as a `.sh` file).
   - Short numbered steps, and a live status box that **polls until the
     first real heartbeat** arrives and then turns green: *"Agent
     connected: hostname, IP, version."* Show a timeout hint after ~2 min
     (firewall / wrong URL / python missing checklist).
4. The agent then appears in the list with status **online** — **only
   after a genuine heartbeat**. Never show an agent as online before it
   has actually called back.

### 6.2 What the server does when generating
1. Create `siem_agents` row, `uuid`, `status = pending`.
2. Generate a **high-entropy secret** (≥32 random bytes, URL-safe, prefix
   `aegis_`). Store **only its sha256 hash** + last 4 chars. Plaintext
   exists only inside the generated installer, shown once.
3. Generate a one-time **install token** (random; store its hash; expiry =
   `SIEM_INSTALL_TOKEN_TTL_MINUTES`). Invalidated on first successful
   heartbeat or on expiry.
4. Build the installer **on the fly** (do not store on disk) from a
   template: `backend/resources/siem/install.sh.stub` embedding
   `backend/resources/siem/agent.py.stub`. Replace placeholders: server
   URL (`SIEM_PUBLIC_URL`), agent uuid, agent secret, selected log
   sources/paths, intervals, TLS-verify flag, agent version.
5. Serve via `GET /siem/install/{token}` as `text/plain`. Rate-limit.
   Return 404 for unknown/expired tokens with no detail.
6. **Regenerate installer / rotate secret** on the agent page: new secret
   + new install token, invalidate old secret immediately (old agent gets
   401 and stops). Also the **upgrade path** (template regenerates).
7. **Revoke:** `status = revoked`; ingest rejects it. **Delete:** removes
   agent + its events (confirm dialog).

### 6.3 Per-user isolation
- An agent's credentials bind to exactly one `user_id`. Everything it
  sends is stored under that user. A user can never see another user's
  agents/events/alerts.
- Add a `SiemAgentPolicy` (and equivalent checks) for every
  agent/alert/event route. Tests: user B gets 404/403 on user A's
  resources (Section 16).

### 6.4 TLS / HTTP reality for a uni server
- If `SIEM_PUBLIC_URL` is `http://...`, agents use plain HTTP. Yellow
  wizard notice: *"HTTP sends the agent key unencrypted. Fine for a demo;
  use HTTPS if you can."*
- If `https://` with a self-signed cert, offer a checkbox **"Allow
  self-signed certificate"** setting the agent's `verify_tls` to false
  (default true).

---

## 7. Agent specification (the generated `agent.py`)

**Runtime:** Python 3 standard library only (no pip). Python 3.8+. Single
file. systemd service.

**Embedded config block (filled by the server):** server URL, agent uuid,
agent secret, sources (name, path, parser type), batch size (200), flush
interval (5 s), heartbeat interval (30 s), spool cap (50 MB), `verify_tls`,
start position, log level, agent version.

**Behavior**
1. **Tail files** like `tail -F`: remember byte offset **and inode** per
   file; survive rotation (inode change / shrink); wait if a file doesn't
   exist yet; never crash on permission errors (report them in heartbeat
   `source_errors`).
2. **Start position:** on first run start at the **end** of each file
   (don't flood the server with history).
3. **Persist state** (offsets) atomically in
   `/var/lib/aegis-agent/state.json` so restarts don't resend or lose
   lines.
4. **Batching:** collect lines, send on batch size or flush interval. Each
   event = `{source, path, line, collected_at}`. Lines sent **raw**; the
   server parses them. Truncate any line to 4000 chars client-side.
5. **Batch id:** random `batch_id` per batch so retries are idempotent.
6. **Heartbeat** every 30 s: version, hostname, OS/kernel, local IPs,
   uptime, cpu/mem/disk %, tz offset (minutes), spool depth, per-source
   status/errors. Response may include `config_version` and
   `latest_agent_version`.
7. **Reliability:** network error/5xx → exponential backoff (2→60 s) with
   jitter, on-disk spool (`/var/lib/aegis-agent/spool/`), oldest-first
   resend, drop oldest over cap. 429 → honor `Retry-After`. 413 → split
   and retry. 401/403 → revoked/rotated: log clearly, slow retry (5 min).
8. **Log tampering signal:** monitored file shrinks/truncates without a
   normal rotation → emit synthetic event `log_truncated`. (This is the
   one and only kind of agent-generated event, and it reflects a real
   observed condition on the machine — it is not fake data.)
9. **CLI flags:** `--test` (check DNS/connect/auth; print clear OK/FAIL:
   unreachable, timeout, TLS error, 401), `--version`, `--once` (send
   what's available and exit).
10. Resource-light; memory bounded.

**Generated installer `install.sh`**
- Run as root; check `python3` exists (clear fix message if not).
- Create `/opt/aegis-agent/` (file with secret mode 600) and
  `/var/lib/aegis-agent/`.
- Prefer a dedicated `aegis-agent` user in the `adm` group (log
  readability); fall back to root with a printed notice.
- Detect distro log paths (auth.log vs secure).
- Install + enable a **systemd unit** (auto-restart, start at boot). If no
  systemd, print manual run instructions.
- Run `--test` at the end; print success/failure summary.
- `install.sh --uninstall` stops the service and removes files.
- Idempotent (re-run upgrades in place).

---

## 8. HTTP API

### Agent-facing (`routes/api.php`, no session/CSRF)
Auth: header `X-Agent-Id: <uuid>` and `Authorization: Bearer <secret>`.
Look up by uuid, compare `sha256(secret)` with `secret_hash` using a
**constant-time compare**, reject if `status = revoked`. Generic 401 (no
hints). Custom middleware alias `siem.agent`, named rate limiter keyed by
agent id (~120 req/min).

| Method + path | Auth | Purpose |
|---|---|---|
| `GET /api/siem/health` | none | ok + server time. Lets `--test` tell "unreachable" from "bad key". Reveals nothing else. |
| `POST /api/siem/heartbeat` | agent | update `last_seen_at`, host info, stats; on first success set status active + invalidate install token; return config/version info. |
| `POST /api/siem/ingest` | agent | accept `{batch_id, agent_version, events:[...]}`; validate size/limits; reject duplicate `batch_id` (cache ~10 min, return success); bulk-insert raw events; dispatch `ProcessSiemBatchJob`; return **202**. |

Update `agents.ip_address` from request IP. Behind a reverse proxy,
configure trusted proxies; otherwise ignore `X-Forwarded-For`.

### Public
`GET /siem/install/{token}` → installer script (6.2), throttled.

### User-facing (`web.php` inside the existing `auth` group; Inertia pages + small JSON endpoints via axios)
- `/siem` overview + `/siem/data/overview?range=1h|24h|7d`
- `/siem/alerts` (list, filters), `/siem/alerts/{alert}` (detail), `POST`
  status change, `POST` bulk status change, `POST` AI explain
- `/siem/events` (explorer) + JSON endpoint for polling/live tail
- `/siem/agents` (list, create wizard, show/edit config, rotate
  secret/regenerate installer, revoke, delete, download installer, `GET`
  status for wizard polling)
- `/siem/rules` (list + update toggles/thresholds), `/siem/allowlist`
  (add/remove)

> There is **no** simulate/test-detection route. Do not add one.

---

## 9. Ingest pipeline and parsers

**Stage 1 (HTTP request):** authenticate → validate (max events, max body,
each `line` a string) → insert raw rows quickly (`source`, `raw`,
`received_at`, `event_type = unknown`) → dispatch job with the inserted id
range → return 202.

**Stage 2 (`ProcessSiemBatchJob`):** for each raw event: choose a parser by
`source` → produce a normalized event (mirror `NormalizedFinding`: a small
DTO `NormalizedEvent`) → update the row (`event_type`, `occurred_at`,
`src_ip`, `username`, `message`, `fields`) → run detection on the affected
`(agent, src_ip, event_type)` combinations once per batch.

Create `app/Siem/` with: `Parsers/`, `Rules/`, `Contracts/`, a
`ParserRegistry`, a `RuleRegistry` (mirror `ToolRegistry`),
`NormalizedEvent`, and `Services/` as needed.

### Parsers to implement
| Parser | Handles | Extract |
|---|---|---|
| **SshAuth** | sshd (Debian `auth.log` + RHEL `secure`): failed password, invalid user, accepted password/publickey, max auth attempts, disconnects | event_type, username, src_ip, port, method |
| **Sudo/Account** | `sudo` command lines, sudo auth failures, `useradd`, `usermod`/group additions, `passwd` | user, target user, command (truncated), group |
| **WebAccess** | nginx/apache **combined** format | src_ip, timestamp, method, path+query, protocol, status, bytes, referer, user_agent |
| **Syslog fallback** | any syslog-style line | timestamp + message, `event_type = unknown` |
| **Agent synthetic** | `log_truncated` | — |

Real sample lines to build **test fixtures** from (these are test data
only — see 0.1 rule 5; never seed or route them):

```text
Oct  2 14:03:11 web1 sshd[2211]: Failed password for invalid user admin from 203.0.113.50 port 51122 ssh2
Oct  2 14:05:42 web1 sshd[2301]: Accepted password for deploy from 198.51.100.7 port 40022 ssh2
Oct  2 14:07:10 web1 sudo:   deploy : TTY=pts/0 ; PWD=/home/deploy ; USER=root ; COMMAND=/usr/bin/apt update
203.0.113.50 - - [02/Oct/2026:14:08:01 +0000] "GET /index.php?id=1%20UNION%20SELECT%20null,version() HTTP/1.1" 200 512 "-" "sqlmap/1.7"
```

### Timestamps (common bug source)
Syslog lines have no year/timezone. Use the agent's `tz_offset_minutes`
(heartbeat) to convert to UTC, assume the current year, handle Dec→Jan
rollover (parsed date >~1 day in the future → previous year). Web logs
carry their own offset. On parse failure use `collected_at`/`received_at`.
Clamp timestamps >5 min in the future to `received_at`. Store UTC; UI shows
local time.

---

## 10. Detection engine

### Design
- Each rule implements a small contract (`DetectionRule`): `key()`,
  `title()`, `severity()`, `mitre()` (nullable — rule 0.2.8),
  `defaultThreshold()`, `defaultWindow()`, `appliesTo(event)`,
  `evaluate(context)`.
- Two kinds:
  1. **Stateless** (single event): pattern web attacks, root login, user
     created.
  2. **Windowed** (count in window): count from the **database**
     (`siem_events` filtered by agent + event type + src_ip +
     `occurred_at >= now - window`, using the composite index). No Redis.
- Respect per-user overrides (`siem_rule_settings`) and the **allowlist**
  (skip allowlisted IPs).
- **Alert creation = upsert with cooldown:** build `dedupe_key`; if an
  open/acknowledged alert with that key exists and was last seen within
  cooldown (default 15 min), **update it** (`event_count`, `last_seen_at`,
  append real evidence ids up to 50) instead of creating a new one.
  Otherwise create.

### MVP rule set
Implement these. For `mitre`, use the listed ID only if you can confirm
it; otherwise set null (do not guess — rule 0.2.8). The ones below are the
author's suggestions and **must be verified or nulled**, not trusted
blindly.

| Key | Detects | Default trigger | Severity | Suggested MITRE (verify or null) |
|---|---|---|---|---|
| `ssh_bruteforce` | repeated SSH failures from one IP | ≥5 / 2 min | high | T1110.001 |
| `ssh_success_after_failures` | success from an IP with many prior failures | success after ≥5 failures / 10 min | critical | T1078 |
| `ssh_user_enumeration` | one IP trying many usernames | ≥5 distinct / 5 min | medium | T1087 |
| `ssh_root_login` | successful root SSH login | any | medium | T1078 |
| `sudo_failures` | repeated sudo auth failures by a user | ≥3 / 5 min | medium | T1548 |
| `account_changes` | user created or added to privileged group | any | high | T1136 / T1098 |
| `log_tampering` | monitored log truncated without rotation | any | high | T1070 |
| `agent_offline` | no heartbeat | > `SIEM_OFFLINE_AFTER_SECONDS` | medium | null (auto-resolves) |
| `web_scanner_ua` | scanner User-Agents: sqlmap, nikto, nmap, gobuster, dirbuster, wpscan, nuclei, masscan, zgrab, acunetix, burp, hydra | any | high | T1595 |
| `web_dir_scan` | many 404/403 from one IP | ≥20 / 1 min | medium | T1595.003 |
| `web_sqli` | SQLi patterns (URL-decode, case-insensitive): `union select`, `or 1=1`, `' or '`, `sleep(`, `benchmark(`, `information_schema` | any | high | T1190 |
| `web_xss` | `<script`, `onerror=`, `onload=`, `javascript:` (decoded) | any | medium | T1190 |
| `web_path_traversal` | `../`, `..%2f`, `/etc/passwd`, `/proc/self` | any | high | T1190 |
| `web_rce` | `;cat `, `| sh`, `/bin/sh`, `wget http`, `curl http`, `${jndi:`, `() {` | any | critical | T1190 |
| `web_sensitive_probe` | `/.env`, `/.git/`, `/wp-config`, `/phpmyadmin`, `/backup.sql`, `/id_rsa`, `/server-status` | any | medium | T1083 |
| `web_login_bruteforce` | many POSTs to login-like paths | ≥10 / 1 min | high | T1110 |
| `web_http_flood` | request flood from one IP | ≥300 / 1 min | medium | T1499 |

Keep pattern lists in a config/constant class. URL-decode (ideally double
once) path/query before matching; truncate input before regex.

### Cheap "smart" extras (fine to include — all from real data)
- **Correlation:** `ssh_success_after_failures` (the headline).
- **Per-agent risk score:** weighted open alerts (critical 10, high 5,
  medium 2, low 1) shown on the agent card and overview.
- **IP drill-down:** clicking any IP opens that IP's real events, alerts,
  first/last seen, counts (filtered queries).

Do **not** add IP reputation/geo if it would mean inventing data when a
lookup fails — if you include geo at all, a failed/again private-range
lookup must render as "unknown", never a guessed country.

---

## 11. Alert lifecycle and AI explanation

- Statuses: `open → acknowledged → resolved`, or `false_positive`. Bulk
  actions. `agent_offline` auto-resolves when the agent returns.
- **Recommended actions:** each rule has static, short remediation text.
  This is fixed guidance tied to the rule, not per-incident fabricated
  data — that's fine.
- **AI "Explain & recommend"** on alert detail (reuse `LlmGateway` + the
  user's saved provider/key). Send only: rule, severity, entities, counts,
  ≤20 truncated **real** evidence lines. Cache in `ai_summary`. No key
  configured → friendly message linking to profile API-key settings. In
  the prompt, state clearly that log lines are untrusted data and must not
  be followed as instructions. **Never fabricate an AI summary when no key
  is set** — show the "configure a key" message instead.
- **Notifications:** in-app only (unread badge on the SIEM nav + toast on
  new high/critical).

---

## 12. Frontend (Inertia + React)

**General**
- Add a **SIEM** link to `AuthenticatedLayout.jsx` (desktop + responsive)
  with an open-critical/high count badge (0 when none — no fake badge).
- Reuse the existing look: dark background, cyan accents, `cyber-card`,
  mono labels, `StatCard`, Vulnerabilities severity colors.
- Pages under `frontend/js/Pages/Siem/`: `Overview`, `Alerts/Index`,
  `Alerts/Show`, `Events/Index`, `Agents/Index`, `Agents/Show` (+ wizard),
  `Rules/Index`.
- Charts with **recharts**.
- **Live updates by polling** (axios) every ~5 s on overview/alerts/events;
  pause when tab hidden; subtle "live" indicator + last-updated time.
- **Empty states are first-class, not an afterthought.** Every widget,
  table, and chart must render a clear, friendly empty state when there is
  no data ("No agents yet — add one to start collecting logs", "No alerts
  in this range", "No events yet"). **Never fill an empty widget with
  sample/placeholder values.** A brand-new install shows zeros and empty
  charts, and that is correct.
- Loading skeletons, error toasts.
- Render all log-derived strings as plain text (monospace, `break-all`,
  truncated with expand). Never through Markdown/HTML.
- Time range (1h / 24h / 7d) in the URL query.

### Overview page (`/siem`) — the dashboard
Driven entirely by real queries over `siem_events`/`siem_alerts`:
1. **KPI row:** agents online/total, events in range, open alerts by
   severity, top attacker IP, rough events/sec.
2. **Events over time** (area/line, stacked by source or severity; bucket
   by range).
3. **Alerts over time** (bar, by severity).
4. **Alerts by severity** (donut) + **by rule/attack type** (horizontal
   bar).
5. **Top attacking IPs** (IP, alert count, event count, last seen; click →
   drill-down).
6. **Top targeted usernames** and **top targeted URLs/paths**.
7. **Recent alerts feed** (live; severity chip, rule, entity, relative
   time; click → detail).
8. **Agent health strip:** per agent, online/offline dot, last seen, risk
   score.

Every one of these shows an empty state when its query returns nothing.

### Alerts list / detail, Log explorer, Agents, Rules
As per the data model above — all reading real rows. Alert detail:
entities, count + first/last seen, timeline of the triggering **real**
events, evidence table of the actual events, MITRE tag (or nothing if
null), recommended actions, AI explain, quick actions ("Allowlist this
IP", "Filter events by this IP"). Log explorer: search + filters,
pagination (50/page, cursor by id), newest first, live-tail toggle
(polling), expandable rows showing parsed fields + raw line, histogram for
the filtered range.

---

## 13. Scheduled jobs / commands (`routes/console.php`, existing style)

| Command | Schedule | Does |
|---|---|---|
| `siem:check-agents` | every minute | mark agents offline/online by `last_seen_at`; raise/auto-resolve `agent_offline` alerts |
| `siem:prune` | daily | delete events older than `SIEM_RETENTION_DAYS`, closed alerts older than alert retention; expire stale install tokens; delete in chunks (5–10k rows) |

> There is no `siem:simulate` command. Do not create one.

---

## 14. Security requirements (checklist)

- Agent secrets hashed (sha256 over high-entropy random), constant-time
  compare, shown once, rotation supported, never logged.
- Rate limits: agent endpoints per agent; installer route per IP.
- Strict validation + size caps on ingest; malformed → 422 (no stack
  traces).
- All SIEM queries scoped by `user_id`; policy checks on every route;
  cross-tenant tests.
- No server→agent execution path.
- Log content untrusted: escape on render, truncate on store, never into
  Markdown/HTML, flagged untrusted in AI prompts.
- Install tokens short-lived, invalidated after first heartbeat.
- Generic agent-auth error messages.
- Agent unprivileged where possible; config file mode 600.

---

## 15. Deployment on the university server (public IP)

1. Set in `backend/.env` on the server:
   `SIEM_PUBLIC_URL=http://<UNI_PUBLIC_IP>:8000` (or domain / https). Do
   **not** rely on `APP_URL` (entrypoint forces it to localhost).
2. Ensure the host firewall / university network allows **inbound TCP
   8000** from the internet (ask uni IT if needed). Port 8080 (Reverb) is
   not required.
3. `docker compose up -d --build`. Migrations run automatically.
4. From a **different machine**, verify `<SIEM_PUBLIC_URL>/api/siem/health`
   returns OK. If not → firewall/NAT/port, not an app issue.
5. Install an agent on a **separate VM/PC or the host itself** via the
   generated one-liner. An agent inside the Aegis container can't see the
   host's logs unless log dirs are mounted — install on the host or
   another machine.
6. Agent machines need correct time (NTP) — timestamps depend on it.
7. Keep retention at 7 days (or lower) — managed MySQL storage is limited.
8. Pre-existing deployment gotchas: the Dockerfile bakes
   `VITE_REVERB_HOST=localhost`; the entrypoint forces
   `APP_URL`/`SANCTUM_STATEFUL_DOMAINS`/`SESSION_DOMAIN` to localhost.
   Adjust for the public host if login/sessions/live scan logs misbehave
   remotely.

---

## 16. Testing (PHPUnit, existing style) — NO simulator

The only place sample log lines may exist is in these tests, as in-memory
fixtures asserting parser/rule output. They must not be seeded, routed, or
reachable at runtime.

- **Agent auth:** valid key accepted; wrong/revoked/rotated → 401; missing
  headers → 401.
- **Ingest:** size limits; duplicate `batch_id` idempotency; malformed →
  422.
- **Parsers:** fixture lines → expected
  `event_type/src_ip/username/path/status/timestamp` (include syslog
  year-rollover and timezone cases).
- **Rules:** each MVP rule fires at threshold and **not** below; dedupe/
  cooldown updates an existing alert; allowlisted IP does not alert;
  disabled rule does not alert.
- **Tenant isolation:** user B cannot see/modify user A's agents, events,
  alerts.
- **Installer:** valid token returns a script containing the correct
  server URL + agent uuid; expired/used token → 404; the secret is not
  stored in plaintext anywhere in the DB.

### How to populate data for manual testing / the demo — the ONLY way
You make real logs happen on a real monitored machine, and the agent ships
them. There is no shortcut and you must not build one. Concretely:

1. Install the agent on a Linux box you control (a VM, or the uni host
   itself).
2. Generate real auth events: from another machine, SSH to it with a few
   wrong passwords, then log in correctly → real `ssh_bruteforce` and
   `ssh_success_after_failures` alerts.
3. Generate real web events: run the existing Aegis scan tools (nikto /
   sqlmap / gobuster) against a web server you control that the agent
   monitors → real scanner/SQLi/dir-scan alerts from the actual access
   log.
4. Stop the agent service → real `agent_offline` after ~3 min; start it →
   auto-resolves.

If the dashboard is empty because none of this has happened yet, that is
the system working correctly, not a bug to paper over with fake data.

---

## 17. Build order (phases + acceptance checks)

Run each check with **real agent traffic**, never synthetic.

**Phase 1 — Foundation**
`config/siem.php` + env; create and register `routes/api.php` in
`bootstrap/app.php`; migrations; models; enums; policies; `app/Siem/`
skeleton.
*Check:* migrations run clean; `/api/siem/health` returns OK; existing
tests still pass.

**Phase 2 — Agents + auto-generated installer (core)**
Agents CRUD; secret + install token generation; installer/agent templates;
`/siem/install/{token}`; heartbeat endpoint; agent middleware + rate
limiting; wizard UI with live "connected" status; rotate/revoke/delete.
*Check:* create an agent in the UI → run the one-liner on a real Linux box
→ it goes **online** from a genuine heartbeat; `--test` prints OK; rotated
key makes the old agent 401; localhost-URL warning shows when expected.

**Phase 3 — Ingest + parsers + events**
Ingest endpoint; batch idempotency; `ProcessSiemBatchJob`;
SSH/sudo/web/syslog parsers; events table; Log explorer (filters,
pagination, live tail).
*Check:* **real** lines from the monitored host appear parsed within ~10 s;
timestamps correct; parser unit tests pass.

**Phase 4 — Detection + alerts**
Rule contract + registry; MVP rules; dedupe/cooldown; allowlist;
`siem:check-agents`; alerts list/detail; status workflow; recommended
actions.
*Check:* a **real** SSH brute force against the monitored host produces a
deduplicated alert with real evidence; allowlist and disable toggles work;
rule unit tests pass.

**Phase 5 — Dashboard**
Overview with all widgets (recharts); polling; nav badge; IP drill-down;
rules page; risk score. Empty states everywhere.
*Check:* with a real agent running and real attacks generated, the
dashboard fills with live data and looks consistent with Aegis; with a
fresh user and no agent, every widget shows a correct empty state (no
invented data).

**Phase 6 — Polish and hardening**
AI explain (gated on a real key); `siem:prune`; update-available badge;
security checklist pass; tests complete; add a short SIEM section to
`AGENTS.md` (architecture, env vars, how to add a rule/parser).
*Check:* full Section 16 real-traffic flow works end-to-end on the uni
server from an outside machine.

---

## 18. Definition of done

- A logged-in user can add an agent, run **one command** on their server,
  and see it online — **from a real heartbeat** — with the public server
  URL already configured.
- Each user only ever sees their own agents, logs, and alerts.
- **Real** SSH and web attacks on the monitored host produce clear,
  deduplicated alerts with real evidence and recommended actions.
- The dashboard shows live KPIs, charts, top attackers, recent alerts, and
  agent health from real data; empty states when there is none.
- Works from a different network against the uni server's public IP.
- **No simulator, seeder, faker, or hardcoded sample data exists anywhere
  in the shipped app.** The only sample lines live in PHPUnit fixtures.
- Old data is cleaned automatically; existing Aegis features and tests
  still pass.
```
