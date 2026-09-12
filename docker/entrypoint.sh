#!/usr/bin/env bash
# Aegis — container entrypoint. Runs migrations against the external
# Aiven MySQL, then starts the app server + queue worker + scheduler +
# Reverb (websockets) as one process group.
set -euo pipefail
cd /var/www/html

# Force the in-container CA path, URL, and stateful domains directly into
# the .env file Laravel actually parses on disk. Relying on Docker Compose's
# "environment:" block to override the values already present in the .env
# baked into the image is fragile (dotenv only fills in what's *missing* by
# default) — this guarantees what Laravel reads matches the container,
# regardless of what host-machine paths your local backend/.env has.
CA_PATH="/var/www/html/storage/certs/aiven-ca.pem"
if [ -f .env ]; then
    if grep -q '^MYSQL_ATTR_SSL_CA=' .env; then
        sed -i "s|^MYSQL_ATTR_SSL_CA=.*|MYSQL_ATTR_SSL_CA=${CA_PATH}|" .env
    else
        echo "MYSQL_ATTR_SSL_CA=${CA_PATH}" >> .env
    fi

    if grep -q '^APP_URL=' .env; then
        sed -i "s|^APP_URL=.*|APP_URL=http://localhost:8000|" .env
    else
        echo "APP_URL=http://localhost:8000" >> .env
    fi

    if grep -q '^SANCTUM_STATEFUL_DOMAINS=' .env; then
        sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=localhost:8000,127.0.0.1:8000|" .env
    else
        echo "SANCTUM_STATEFUL_DOMAINS=localhost:8000,127.0.0.1:8000" >> .env
    fi

    if grep -q '^SESSION_DOMAIN=' .env; then
        sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=null|" .env
    else
        echo "SESSION_DOMAIN=null" >> .env
    fi
fi

# Also export it, so anything reading process env directly (rather than the
# .env file) sees the same value.
export MYSQL_ATTR_SSL_CA="${CA_PATH}"

if [ -z "${APP_KEY:-}" ] && ! grep -q '^APP_KEY=base64' .env 2>/dev/null; then
    echo "▶ No APP_KEY set — generating one..."
    php artisan key:generate --force
fi

php artisan config:clear >/dev/null 2>&1 || true

echo "▶ Running migrations against \$DB_HOST..."
php artisan migrate --force

echo "▶ Seeding (safe to fail if already seeded)..."
php artisan db:seed --force || true

echo "✓ Starting server (:8000), queue worker, scheduler, and Reverb (:8080)"

# Start background workers; keep their PIDs so we can clean up on exit.
php artisan reverb:start --host=0.0.0.0 --port=8080 &
REVERB_PID=$!

php artisan queue:listen --tries=1 --timeout=0 &
QUEUE_PID=$!

php artisan schedule:work &
SCHEDULE_PID=$!

cleanup() {
    echo "▶ Shutting down..."
    kill "$REVERB_PID" "$QUEUE_PID" "$SCHEDULE_PID" 2>/dev/null || true
}
trap cleanup SIGTERM SIGINT

# Foreground process — its exit stops the container.
php artisan serve --host=0.0.0.0 --port=8000 &
SERVE_PID=$!
wait "$SERVE_PID"
