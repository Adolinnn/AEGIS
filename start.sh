#!/usr/bin/env bash
# Aegis — local dev startup (single command).
#
# Runs EVERYTHING the app needs, together:
#   • server   — php artisan serve         (backend, http://127.0.0.1:8000)
#   • vite     — npm run dev               (frontend dev server + HMR)
#   • queue    — php artisan queue:listen  (runs scan jobs + uptime jobs)
#   • schedule — php artisan schedule:work (fires interval-based uptime checks)
#
# Why the queue + schedule matter: scans and uptime checks are ASYNC jobs.
# Without the queue worker a scan run just sits in "pending" forever, and
# without the scheduler interval-based uptime never fires. Quick Scan is the
# only feature that works without them because it runs synchronously.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Make every PHP process (serve, queue, schedule, migrate) additionally load
# the local .php/php.ini that enables the sqlite extensions. The leading colon
# keeps PHP's default config and APPENDS ours, so nothing else is disabled.
export PHP_INI_SCAN_DIR=":$SCRIPT_DIR/.php"

echo "▶ Installing PHP dependencies..."
# --ignore-platform-req=ext-iconv: some symfony polyfills list ext-iconv as a
# hard requirement, but with ext-mbstring present (which Laravel requires) the
# iconv fallback is never used. Ignoring it lets install proceed on hosts where
# iconv isn't enabled in the CLI php.ini.
[ -d vendor ] || composer install --no-interaction --ignore-platform-req=ext-iconv

echo "▶ Installing JS dependencies..."
[ -d node_modules ] || npm install --legacy-peer-deps

[ -f .env ] || cp .env.example .env

if ! grep -q '^APP_KEY=base64' .env 2>/dev/null; then
    php artisan key:generate --force
fi

mkdir -p database
[ -f database/database.sqlite ] || touch database/database.sqlite

echo "▶ Clearing caches..."
php artisan optimize:clear >/dev/null 2>&1 || true

echo "▶ Running migrations..."
php artisan migrate --force
php artisan db:seed --force || true

echo ""
# Pick the first free port from 8000 up. Avoids "Address already in use" when a
# server from a previous run is still holding 8000 (which, with -k, would take
# the whole stack down).
PORT=8000
while (echo >"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; do
    echo "  port $PORT busy — trying $((PORT + 1))"
    PORT=$((PORT + 1))
done
export APP_URL="http://127.0.0.1:$PORT"

echo "✓ Starting server, vite, queue worker, and scheduler together."
echo "  App:  $APP_URL"
echo "  (Press Ctrl+C to stop everything.)"
echo ""

# Run all four processes concurrently. -k kills the others if any one exits,
# so a single Ctrl+C stops the whole stack.
npx concurrently -k \
    -n server,vite,queue,schedule \
    -c "#93c5fd,#fdba74,#fb7185,#c4b5fd" \
    "php artisan serve --host=127.0.0.1 --port=$PORT" \
    "npm run dev" \
    "php artisan queue:listen --tries=1 --timeout=0" \
    "php artisan schedule:work"
