import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        '../frontend/js/**/*.jsx',
    ],

    theme: {
        extend: {
            colors: {
                exec: {
                    base: '#030408',
                    surface: '#090a10',
                    card: '#0f111a',
                    cardHover: '#151722',
                    border: '#2e3048',
                    borderHover: 'rgba(99, 102, 241, 0.5)',
                    muted: '#94a3b8',
                    indigo: '#6366f1',
                    indigoGlow: 'rgba(99, 102, 241, 0.15)',
                    critical: '#f43f5e',
                    criticalBg: '#4c0519',
                    high: '#f59e0b',
                    highBg: '#451a03',
                    medium: '#eab308',
                    mediumBg: '#422006',
                    low: '#60a5fa',
                    lowBg: '#172554',
                    info: '#10b981',
                    infoBg: '#064e3b',
                },
                codeRed: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#dc2626',
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                    950: '#450a0a',
                },
                surface: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                    950: '#09090b',
                },
            },
            boxShadow: {
                'exec-glow': '0 8px 32px -4px rgba(15, 17, 26, 0.8), 0 0 16px -2px rgba(99, 102, 241, 0.15)',
                'exec-card': '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
                'neon-red': '0 0 20px -3px rgba(244, 63, 94, 0.35)',
                'neon-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.35)',
                'neon-emerald': '0 0 20px -3px rgba(16, 185, 129, 0.35)',
                'cyber-card': '0 4px 20px -2px rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
            },
            fontFamily: {
                sans: ['Plus Jakarta Sans', ...defaultTheme.fontFamily.sans],
                body: ['Inter', ...defaultTheme.fontFamily.sans],
                mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
            },
            keyframes: {
                'radar-sweep': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                'hud-enter': {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                'cyber-pulse': {
                    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
                    '50%': { opacity: '0.6', transform: 'scale(0.96)' },
                },
                'beam-scan': {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(1000%)' },
                },
                'ambient-drift': {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '50%': { transform: 'translate(20px, -20px) scale(1.08)' },
                },
            },
            animation: {
                'radar': 'radar-sweep 4s linear infinite',
                'hud-enter': 'hud-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'cyber-pulse': 'cyber-pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'beam-scan': 'beam-scan 6s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'ambient-drift': 'ambient-drift 12s ease-in-out infinite',
            },
        },
    },

    plugins: [forms],
};