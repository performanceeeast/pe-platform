import type { Config } from 'tailwindcss';
import peTailwindPreset from '@pe/config/tailwind';

const config: Config = {
  presets: [peTailwindPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        store: {
          50: 'rgb(var(--store-50) / <alpha-value>)',
          100: 'rgb(var(--store-100) / <alpha-value>)',
          200: 'rgb(var(--store-200) / <alpha-value>)',
          300: 'rgb(var(--store-300) / <alpha-value>)',
          400: 'rgb(var(--store-400) / <alpha-value>)',
          500: 'rgb(var(--store-500) / <alpha-value>)',
          600: 'rgb(var(--store-600) / <alpha-value>)',
          700: 'rgb(var(--store-700) / <alpha-value>)',
          800: 'rgb(var(--store-800) / <alpha-value>)',
          900: 'rgb(var(--store-900) / <alpha-value>)',
        },
      },
    },
  },
};

export default config;
