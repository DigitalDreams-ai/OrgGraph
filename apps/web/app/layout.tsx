import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orgumented Console',
  description: 'Phase 4 web console for Orgumented API workflows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
