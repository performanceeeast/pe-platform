import type { Config } from 'tailwindcss';
import peTailwindPreset from '@pe/config/tailwind';

const config: Config = {
  presets: [peTailwindPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
};

export default config;
