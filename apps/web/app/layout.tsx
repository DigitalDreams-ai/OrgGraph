import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OrgGraph Console',
  description: 'Phase 4 web console for OrgGraph API workflows.'
};

export default function RootLayout({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
