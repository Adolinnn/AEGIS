# Task: migrate AEGIS from SQLite to Aiven MySQL

You are editing the AEGIS monorepo. The Laravel app lives in `backend/`.
This is a **configuration migration only** — the `mysql` connection block
already exists in `backend/config/database.php` and already supports the
Aiven SSL CA cert. **Do not** change any migration, model, controller, or
schema code. Do not "improve" anything outside the explicit edits below.

The user has already:
- created the Aiven MySQL service (running), and
- downloaded the CA certificate to `backend/storage/certs/aiven-ca.pem`.

Your job is the four file edits + the verification commands below.

---

## Connection facts (from the Aiven console)

```
Host:      mysql-c9366dc-aegis404.k.aivencloud.com
Port:      26268
Database:  defaultdb
User:      avnadmin
SSL mode:  REQUIRED   (CA cert verification is mandatory)
CA cert:   backend/storage/certs/aiven-ca.pem
```

The password is a secret the user will paste into `.env` themselves — see
the placeholder in Edit 1. **Never hardcode the password anywhere except
`backend/.env`, and never commit `.env`.**

---

## Edit 1 — `backend/.env`

**Find** this block (around line 23):

```
DB_CONNECTION=sqlite
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=laravel
# DB_USERNAME=root
# DB_PASSWORD=
```

**Replace** it with:

```
DB_CONNECTION=mysql
DB_HOST=mysql-c9366dc-aegis404.k.aivencloud.com
DB_PORT=26268
DB_DATABASE=defaultdb
DB_USERNAME=avnadmin
DB_PASSWORD=__PASTE_AIVEN_PASSWORD_HERE__
MYSQL_ATTR_SSL_CA=__ABSOLUTE_PATH_TO__/backend/storage/certs/aiven-ca.pem
```

Then resolve the two placeholders:
- `MYSQL_ATTR_SSL_CA` must be an **absolute** path. Compute it — run
  `realpath backend/storage/certs/aiven-ca.pem` from the repo root and put
  the exact output as the value. A relative or wrong path is the #1 cause
  of the TLS handshake failure in the verification step.
- Leave `__PASTE_AIVEN_PASSWORD_HERE__` literally in place and tell the
  user to paste the real password there themselves (it's a secret you
  should not handle). If the user has already given you the password to
  use, put it in — but only in this file.

Do not touch any other line in `.env`.

---

## Edit 2 — `backend/.env.example`

Same DB block, but with **no secrets** (so teammates know the shape). Find
the `DB_CONNECTION=sqlite` line and its commented DB lines, replace with:

```
DB_CONNECTION=mysql
DB_HOST=
DB_PORT=3306
DB_DATABASE=
DB_USERNAME=
DB_PASSWORD=
MYSQL_ATTR_SSL_CA=
```

---

## Edit 3 — `backend/.gitignore`

Ensure the CA cert is never committed. Append this line if not already
present:

```
storage/certs/
```

Also confirm `.env` is already ignored (it should be). If it is not, add
`.env` too.

---

## Edit 4 — `start.sh` (at the repo root)

Two changes:

**4a.** Remove the SQLite file-touch line (around line 54):

```
[ -f database/database.sqlite ] || touch database/database.sqlite
```

Delete that whole line — there is no local database file anymore.

**4b.** The script exports `PHP_INI_SCAN_DIR=":$SCRIPT_DIR/.php"` to load a
local ini that enables SQLite extensions. MySQL now needs `pdo_mysql`
instead. Do **not** remove the `PHP_INI_SCAN_DIR` line. Instead, ensure the
ini file it loads enables the MySQL driver. Check `backend/.php/php.ini`
(create it if the folder/file is missing) and make sure it contains:

```
extension=pdo_mysql
```

Leave any existing sqlite `extension=` lines — they're harmless if the
extensions are present, and removing them is out of scope. If `pdo_mysql`
is compiled into PHP already (common on Arch), this line is a harmless
no-op; keep it for portability.

Leave the `php artisan migrate --force` and `php artisan db:seed --force`
lines in `start.sh` exactly as they are — they work identically against
MySQL.

---

## Verification (run these; report exact output)

From the repo root:

```bash
# 1. PHP can talk MySQL
php -m | grep pdo_mysql          # must print: pdo_mysql

# 2. cert file really exists at the path you put in .env
ls -l backend/storage/certs/aiven-ca.pem

# 3. clear any cached config so the new .env is read
cd backend
php artisan config:clear

# 4. confirm Laravel resolves the mysql connection + Aiven host
php artisan db:show              # driver: mysql, host: ...aivencloud.com

# 5. build the schema on Aiven + seed the admin account
php artisan migrate:fresh --seed

# 6. sanity check data landed
php artisan tinker --execute="echo \App\Models\User::count();"
```

Expected: step 4 shows the mysql driver pointing at the aivencloud host;
step 5 runs all 18 migrations without error and seeds; step 6 prints a
non-zero user count (the seeded admin + any test users).

`migrate:fresh` is intentional — the Aiven database starts empty, so this
builds every table from scratch. It will **drop and recreate** all tables,
so never run it once real data exists; for this first cutover it's correct.

---

## Failure modes and what they mean (don't guess — match the error)

- **`SQLSTATE[HY000] [2002]` / connection refused / timed out** → wrong
  host/port, or the Aiven service is paused (free tier sleeps when idle —
  retry once after a few seconds), or a firewall is blocking the outbound
  port `26268`.
- **`SSL connection error` / certificate verify failed** → `MYSQL_ATTR_SSL_CA`
  path is wrong or relative. Re-run `realpath` and paste the exact absolute
  path. Confirm the file opens (`head -1` shows `-----BEGIN CERTIFICATE-----`).
- **`Access denied for user`** → wrong password (the user still has the
  `__PASTE_AIVEN_PASSWORD_HERE__` placeholder in, or a stale/rotated one).
- **`could not find driver`** → `pdo_mysql` not enabled (Edit 4b).
- **Change seems ignored / still hitting sqlite** → config was cached; run
  `php artisan config:clear` (step 3). Never run `config:cache` during this
  migration.

Report back the exact output of the verification block — do not declare
success unless steps 4–6 all pass.

---

## Out of scope (do NOT do)

- Do not edit any file in `backend/database/migrations/` — the schema is
  already MySQL-compatible (verified: no SQLite-specific SQL, no PRAGMA,
  unique columns are only `email`/`uuid` which are safe under MySQL's
  default `utf8mb4` key length on MySQL 8.4).
- Do not change `config/database.php` — the `mysql` block already reads
  `MYSQL_ATTR_SSL_CA`.
- Do not attempt to migrate existing SQLite data across. This is a clean
  cutover; the user has accepted starting fresh.
- Do not commit `.env` or the `.pem` file.

## Security reminder for the user (surface this, don't act on it)

The Aiven password was shown in a shared screenshot, so it should be
**rotated** in the Aiven console (reset icon next to the Password field)
once the connection is confirmed working — then update `DB_PASSWORD` in
`backend/.env` with the new value and re-run `php artisan config:clear`.
