# SIEM recovery — what was actually wrong and how to get logs flowing again

## The real situation (important)

Your uploaded code was mostly ALREADY FIXED. Almost every error in
`storage/logs/laravel.log` (strftime, `User::siemAgents()`, the `fim` enum
value, `VirusTotalRule::severity()` signature, the `evidence_event_ids`
column) was a *transient* state while the agent edited — those code paths
are already correct in the files you sent. Do not re-fix them; they're done.

**One genuine bug remained**, and it's what stalled everything:
`GenerateSiemAIExplainJob` called `SiemAlert::with('events')` / `$alert->events`,
but `SiemAlert` has no `events()` relationship (evidence is a JSON array of
ids, `evidence_event_ids`). So opening an alert's detail page queued an AI
job that always threw. With `QUEUE_CONNECTION=database` and no retry
guards, those failures piled up and wedged the worker — which is why
*new* ingest batches stopped being processed and "no logs pass" anymore.

## The 3 fixed files (in this zip)

- `GenerateSiemAIExplainJob.php` — loads evidence by `evidence_event_ids`
  (like the controller does) instead of a nonexistent `events` relationship.
- `ProcessSiemBatchJob.php`, `RunSiemDetectionJob.php`,
  `GenerateSiemAIExplainJob.php` — each now has `tries = 3`, `backoff = 10`,
  `timeout = 120` so a single failing job can **never again** exhaust
  retries and stall the whole queue.

Copy these over `backend/app/Jobs/` in your project.

## Then reset the poisoned runtime state (this is the part that gets logs flowing)

The code fix stops *new* breakage; you also have to clear the backlog of
dead jobs and the worker that's stuck on them. From `backend/`:

```bash
# 1. stop the running worker (Ctrl+C the start.sh / queue process, or:)
php artisan queue:restart

# 2. throw away the failed + queued poison jobs from the broken period
php artisan queue:flush        # clears failed_jobs
php artisan queue:clear        # clears pending jobs on the default (database) connection

# 3. reload code + config
php artisan optimize:clear

# 4. (only if you also changed migrations earlier) make sure they're applied
php artisan migrate

# 5. start the stack again
./start.sh      # or your usual compose up
```

## Confirm it's actually flowing (don't guess)

```bash
php artisan siem:diagnose      # the read-only checker from the last round
```

Then generate ONE real event and watch it land:
- From a monitored host, cause a few SSH failures, or let the agent ship a
  line.
- Within ~10s: `php artisan siem:diagnose` should show events climbing and
  none stuck at `unknown` (stuck-at-unknown = worker not running).
- A real SSH brute force (>=3 failures / 2 min from one IP) should create a
  `ssh_bruteforce` alert on `/siem/alerts`.

## If logs STILL don't pass after this

It's no longer the AI job. Check, in order:
1. Is the queue worker actually running? (`ProcessSiemBatchJob` is queued;
   if nothing consumes the queue, events sit at `event_type = unknown`
   forever.) Watch `start.sh` output for the `queue` process.
2. Is the agent reaching `/api/siem/ingest`? Hit `GET /api/siem/health`
   from the agent box; check the agent's own `--test`.
3. `php artisan queue:failed` — if `ProcessSiemBatchJob` shows up there
   now, read the error; it'll name the real cause instead of the AI job
   masking it.
