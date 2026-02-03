/**
 * Root Layout
 *
 * D&D-themed dark mode layout with providers
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import VersionFooter from '@/components/layout/VersionFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'KimbleAI v5 - D&D AI Assistant',
  description: 'AI-powered assistant with smart model routing, multimodal capabilities, and D&D integration',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-gray-100 antialiased`}>
        <Providers>
          <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950/20 to-gray-900">
            {/* Background Pattern - D&D-themed */}
            <div className="fixed inset-0 opacity-5 pointer-events-none">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0l25.98 15v30L30 60 4.02 45V15z' fill='%23fff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
                backgroundSize: '60px 60px',
              }} />
            </div>

            {/* Main Content */}
            <div className="relative z-10">
              {children}
            </div>

            {/* Version Footer */}
            <VersionFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
