#!/usr/bin/env bash
# Aegis — local dev startup (single command).

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_DIR="$REPO_ROOT/backend"
cd "$SCRIPT_DIR"

# Ensure local node/npm paths are in PATH
export PATH="$HOME/.local/bin:$HOME/.hermes/node/bin:$PATH"

# Enable required extensions without duplication
export PHP_INI_SCAN_DIR=":$SCRIPT_DIR/.php"
mkdir -p "$SCRIPT_DIR/.php"
if [ ! -f "$SCRIPT_DIR/.php/php.ini" ] || ! grep -q 'extension=pdo_mysql' "$SCRIPT_DIR/.php/php.ini" 2>/dev/null; then
    echo "extension=pdo_mysql" >> "$SCRIPT_DIR/.php/php.ini"
fi
if ! grep -q 'extension=intl' "$SCRIPT_DIR/.php/php.ini" 2>/dev/null; then
    echo "extension=intl" >> "$SCRIPT_DIR/.php/php.ini"
fi

echo "▶ Installing PHP dependencies..."
[ -d vendor ] || composer install --no-interaction --ignore-platform-req=ext-iconv

echo "▶ Installing JS dependencies..."
[ -d node_modules ] || npm install --legacy-peer-deps

# Monorepo glue: FIX SYMLINK PATHS (../frontend instead of ../../frontend)
ln -sfn ../backend/node_modules "$REPO_ROOT/frontend/node_modules"
mkdir -p resources
ln -sfn ../frontend/js resources/js
ln -sfn ../frontend/css resources/css

[ -f .env ] || cp .env.example .env

if ! grep -q '^APP_KEY=base64' .env 2>/dev/null; then
    php artisan key:generate --force
fi

# Ensure absolute path to Aiven CA cert if present
CA_PATH="$SCRIPT_DIR/storage/certs/aiven-ca.pem"
if [ -f "$CA_PATH" ]; then
    REAL_CA=$(realpath "$CA_PATH")
    if grep -q '^MYSQL_ATTR_SSL_CA=.*certs/aiven-ca.pem' .env 2>/dev/null || grep -q '^MYSQL_ATTR_SSL_CA=$' .env 2>/dev/null; then
        sed -i "s|^MYSQL_ATTR_SSL_CA=.*|MYSQL_ATTR_SSL_CA=$REAL_CA|" .env
    fi
fi

# Check for unconfigured DB password
if grep -q '^DB_PASSWORD=__PASTE_AIVEN_PASSWORD_HERE__' .env 2>/dev/null; then
    if [ -t 0 ]; then
        echo ""
        echo "🔑 Aiven MySQL password is required."
        read -rsp "    Enter Aiven MySQL password (avnadmin): " AIVEN_PASS
        echo ""
        if [ -n "$AIVEN_PASS" ]; then
            ESCAPED_PASS=$(printf '%s\n' "$AIVEN_PASS" | sed -e 's/[\/&]/\\&/g')
            sed -i "s/^DB_PASSWORD=__PASTE_AIVEN_PASSWORD_HERE__/DB_PASSWORD=$ESCAPED_PASS/" .env
            echo "✓ Saved password to backend/.env"
        else
            echo "❌ No password entered. Aborting."
            exit 1
        fi
    else
        echo "❌ Error: DB_PASSWORD is not configured in backend/.env."
        echo "    Please paste your Aiven password in backend/.env (line 28) and run ./start.sh again."
        exit 1
    fi
fi

mkdir -p database

echo "▶ Clearing caches..."
php artisan optimize:clear >/dev/null 2>&1 || true

echo "▶ Running migrations & seeders..."
php artisan migrate --force
php artisan db:seed --force || true

echo ""
# Pick the first free port from 8000 up.
PORT=8000
while (echo >"/dev/tcp/127.0.0.1/$PORT") 2>/dev/null; do
    echo "  port $PORT busy — trying $((PORT + 1))"
    PORT=$((PORT + 1))
done
export APP_URL="http://127.0.0.1:$PORT"

# Sync APP_URL in .env so Laravel Vite helper uses the correct host/port
sed -i "s|^APP_URL=.*|APP_URL=$APP_URL|" .env

echo "✓ Starting server, vite, queue worker, and scheduler together."
echo "  App:  $APP_URL"
echo "  (Press Ctrl+C to stop everything.)"
echo ""

CONCURRENTLY_BIN="./node_modules/.bin/concurrently"
if [ ! -x "$CONCURRENTLY_BIN" ]; then
    CONCURRENTLY_BIN="npx --yes concurrently"
fi

# Run processes concurrently
$CONCURRENTLY_BIN -k \
    -n server,vite,queue,schedule,reverb \
    -c "#93c5fd,#fdba74,#fb7185,#c4b5fd,#6ee7b7" \
    "php artisan serve --host=127.0.0.1 --port=$PORT" \
    "npm run dev" \
    "php artisan queue:listen --tries=1 --timeout=0" \
    "php artisan schedule:work" \
    "php artisan reverb:start"
