import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@pe/ui';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'PE Ops',
    template: '%s · PE Ops',
  },
  description: 'Performance East operations dashboard',
  applicationName: 'PE Ops',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1F4E78' },
    { media: '(prefers-color-scheme: dark)', color: '#051527' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, 'min-h-screen bg-background font-sans antialiased')}>
        {children}
      </body>
    </html>
  );
}
