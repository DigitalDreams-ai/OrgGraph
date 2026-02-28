import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orgumented Desktop',
  description: 'Ask-first desktop workflow for Orgumented semantic runtime operations.'
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
