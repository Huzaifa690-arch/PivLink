import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PrivyProvider } from '@/components/PrivyProvider';
import { ToastProvider } from '@/components/Toast';
import { KycGuard } from '@/components/KycGuard';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'PivLinks — The Global Financial Bridge',
  description: 'Borderless, instant, and secure payment infrastructure for the global workforce. Powered by Solana.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'PivLinks — The Global Financial Bridge',
    description: 'Settle cross-border payments in ~400ms with smart contract escrow on Solana.',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'PivLinks — The Global Financial Bridge' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <PrivyProvider>
          <ToastProvider>
            <KycGuard>{children}</KycGuard>
          </ToastProvider>
        </PrivyProvider>
      </body>
    </html>
  );
}
