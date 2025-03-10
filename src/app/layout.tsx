import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ToastProvider from '@/components/providers/toast-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Audio Learning Hub',
  description: 'Your personal audio development learning platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ToastProvider>
          <main className="flex min-h-screen flex-col">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
