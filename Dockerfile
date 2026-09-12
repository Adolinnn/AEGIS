# syntax=docker/dockerfile:1
#
# Aegis — single-container image.
# Builds the React/Inertia frontend, installs the PHP app + security
# scanning binaries, and serves everything from ONE origin
# (php artisan serve on :8000). There's no separate Vite dev server
# exposed to the browser, so there's no cross-origin request in the
# first place — which is what was causing the CORS errors from
# start.sh running "npm run dev" (Vite on its own port) alongside
# "php artisan serve" on a different port.

############################################
# Stage 1 — build frontend assets with Vite
############################################
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /app/backend

# Install JS deps first (better layer caching)
COPY backend/package.json backend/package-lock.json ./
RUN npm install --legacy-peer-deps

# Bring in the rest of the backend (needed for vite.config.js, tailwind
# config, resources/views) and the sibling frontend/ source tree, since
# vite.config.js aliases "@" -> resources/js (which symlinks to
# ../frontend/js).
COPY backend/ ./
COPY frontend/ /app/frontend

# Bare imports inside frontend/js/**.jsx (e.g. "@headlessui/react") resolve
# by walking up from that file's real on-disk location — and /app/frontend
# is a *sibling* of /app/backend, not an ancestor, so node_modules is never
# found there. Recreate the symlink start.sh sets up locally.
RUN ln -sfn ../backend/node_modules /app/frontend/node_modules

# Vite inlines VITE_* variables into the JS bundle at build time, but this
# stage never sees backend/.env (deliberately — that's where the DB
# password lives). REVERB_APP_KEY is a public identifier (like a Stripe
# publishable key), not a secret — REVERB_APP_SECRET is the real secret
# and stays server-side only, never passed here. Without this, pusher-js
# throws "You must pass your app key" in the browser console.
ARG VITE_APP_NAME=Aegis
ARG VITE_REVERB_APP_KEY=xkh2kzk4jnbyuwmdrzq5
ARG VITE_REVERB_HOST=localhost
ARG VITE_REVERB_PORT=8080
ARG VITE_REVERB_SCHEME=http
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_REVERB_APP_KEY=$VITE_REVERB_APP_KEY \
    VITE_REVERB_HOST=$VITE_REVERB_HOST \
    VITE_REVERB_PORT=$VITE_REVERB_PORT \
    VITE_REVERB_SCHEME=$VITE_REVERB_SCHEME

# start.sh wires resources/js -> ../frontend/js via a symlink for local dev.
# Recreate that here (one more ../ than start.sh's version, since we're
# one level deeper at /app/backend rather than the repo root's backend/).
RUN rm -rf resources/js resources/css \
 && ln -s ../../frontend/js resources/js \
 && ln -s ../../frontend/css resources/css

RUN npm run build

############################################
# Stage 2 — PHP runtime + scanning tools
############################################
FROM php:8.4-cli-bookworm AS app

# --- Core system packages + PHP extensions (must succeed) --------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip zip curl ca-certificates perl \
        libicu-dev libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
        libonig-dev libxml2-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" \
        pdo pdo_mysql mbstring bcmath intl zip gd exif pcntl sockets

# --- Scanning tool binaries (see backend/app/Enums/ToolName.php) --------
# Installed one at a time, each non-fatal: package names/availability
# drift across Debian releases, and the app already auto-detects
# whichever binaries are actually present (ToolName::isInstalled()) — so
# a tool that fails here just shows as unavailable instead of breaking
# the whole image build.
RUN apt-get install -y --no-install-recommends nmap || echo "!! nmap unavailable"
RUN apt-get install -y --no-install-recommends whois || echo "!! whois unavailable"
RUN apt-get install -y --no-install-recommends dnsutils || echo "!! dnsutils unavailable"
RUN apt-get install -y --no-install-recommends sslscan || echo "!! sslscan unavailable"
RUN apt-get install -y --no-install-recommends whatweb || echo "!! whatweb unavailable"
RUN apt-get install -y --no-install-recommends sqlmap || echo "!! sqlmap unavailable"
RUN apt-get install -y --no-install-recommends gobuster || echo "!! gobuster unavailable"
RUN apt-get install -y --no-install-recommends libnet-ssleay-perl liblwp-useragent-determined-perl \
    || echo "!! nikto's optional perl SSL deps unavailable — nikto will still run without HTTPS support"

# nikto isn't packaged for Debian at all — it's just a Perl script, so
# grab it straight from GitHub.
RUN git clone --depth 1 https://github.com/sullo/nikto.git /opt/nikto \
    && ln -sf /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
    && chmod +x /opt/nikto/program/nikto.pl \
    || echo "!! nikto install failed — continuing without it"

# nuclei: not packaged for Debian either — grab the prebuilt release binary.
ARG NUCLEI_VERSION=3.3.7
RUN curl -fsSL -o /tmp/nuclei.zip \
        "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" \
    && unzip -o /tmp/nuclei.zip -d /usr/local/bin nuclei \
    && chmod +x /usr/local/bin/nuclei \
    && rm -f /tmp/nuclei.zip \
    || echo "!! nuclei download failed — continuing without it"

# wpscan: Ruby gem, needs a Ruby toolchain. Also non-fatal.
RUN apt-get install -y --no-install-recommends \
        ruby-full build-essential libcurl4-openssl-dev zlib1g-dev \
    && gem install wpscan --no-document \
    || echo "!! wpscan install failed — continuing without it"

RUN rm -rf /var/lib/apt/lists/*

# --- Composer ----------------------------------------------------------
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

# --- App source ----------------------------------------------------------
COPY backend/ ./
COPY --from=frontend-build /app/backend/public/build ./public/build

RUN composer install --no-interaction --optimize-autoloader --ignore-platform-req=ext-iconv

# Writable dirs
RUN chmod -R 775 storage bootstrap/cache

COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000 8080

ENTRYPOINT ["entrypoint.sh"]
