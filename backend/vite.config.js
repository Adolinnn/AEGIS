import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';

// Monorepo layout: the React source lives in the sibling ../frontend folder,
// outside this Laravel app, symlinked in as resources/js and resources/css.
// Laravel + Inertia still compile and serve it via Vite. A symlink
// (frontend/node_modules -> backend/node_modules, created by start.sh /
// postinstall) lets bare imports in ../frontend resolve to the packages
// installed here.

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        // Keep symlinked paths as-is instead of resolving to their real
        // on-disk location, and keep the "@" alias pointing through that
        // SAME symlinked path (not straight at ../frontend/js). Both
        // matter together: the build manifest is keyed by the symlinked
        // path (resources/js/app.jsx) which is what app.blade.php's
        // @vite([...]) looks up, and every import of a given file must
        // resolve to the same module id or React/Inertia get double-
        // bundled ("usePage must be used within the Inertia component").
        preserveSymlinks: true,
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
    server: {
        fs: {
            allow: [path.resolve(__dirname, '..')],
        },
    },
});
