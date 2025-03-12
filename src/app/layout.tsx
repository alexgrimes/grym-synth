import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Grym-Synth: Gravitational Parameter Interface',
  description: 'A physics-based interface for controlling audio parameters inspired by Xenakis\' stochastic music principles.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
