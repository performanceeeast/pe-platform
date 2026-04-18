import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Performance East — Ops',
    short_name: 'PE Ops',
    description: 'GM command center for Performance East',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#ffffff',
    theme_color: '#E31C2F',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icon-mask.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
