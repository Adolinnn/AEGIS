<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title inertia>{{ config('app.name', 'Aegis Security') }}</title>

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.jsx', "resources/js/Pages/{$page['component']}.jsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased bg-[#020408] text-slate-200 selection:bg-red-500 selection:text-white min-h-screen relative overflow-x-hidden">
        <!-- Persistent Thematic Cyber Background Canvas (Never resets on Inertia page transitions) -->
        <div class="cyber-bg-canvas">
            <div class="cyber-bg-radar"></div>
            <div class="cyber-bg-grid"></div>
            <!-- Floating Volumetric Glow Orbs -->
            <div class="absolute -top-32 left-1/4 w-[550px] h-[550px] bg-rose-600/[0.045] rounded-full blur-[140px] animate-ambient-drift"></div>
            <div class="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-cyan-500/[0.045] rounded-full blur-[150px] animate-ambient-drift [animation-delay:5s]"></div>
            <div class="absolute -bottom-32 left-1/3 w-[650px] h-[650px] bg-purple-600/[0.035] rounded-full blur-[160px] animate-ambient-drift [animation-delay:9s]"></div>
        </div>

        @inertia
    </body>
</html>
