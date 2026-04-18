import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { cn } from '@pe/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'PE Parts',
  description: 'Performance East parts department dashboard',
};

export const viewport: Viewport = {
  themeColor: '#E31C2F',
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
