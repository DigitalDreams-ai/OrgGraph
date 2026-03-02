'use client';

const DESKTOP_API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3100';

export function resolveDesktopApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${DESKTOP_API_BASE}${normalizedPath}`;
}
