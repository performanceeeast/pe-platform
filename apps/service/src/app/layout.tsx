import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@pe/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'PE Service',
  description: 'Performance East service department dashboard',
};

export const viewport: Viewport = {
  themeColor: '#1F4E78',
  width: 'device-width',
  initialScale: 1,
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
