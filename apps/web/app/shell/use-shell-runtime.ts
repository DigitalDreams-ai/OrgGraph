'use client';

import { useState } from 'react';
import { getApiHealth, getApiReady } from '../lib/status-client';

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function useShellRuntime() {
  const [healthStatus, setHealthStatus] = useState('unknown');
  const [readyStatus, setReadyStatus] = useState('unknown');
  const [readyDetails, setReadyDetails] = useState('');

  async function refreshStatuses(): Promise<void> {
    try {
      const healthRes = await getApiHealth();
      const payload = healthRes.payload as { status?: string } | undefined;
      setHealthStatus(healthRes.ok ? payload?.status ?? 'ok' : `http_${healthRes.statusCode ?? 503}`);
    } catch {
      setHealthStatus('unreachable');
    }

    try {
      const readyRes = await getApiReady();
      const payload = readyRes.payload as { status?: string } | undefined;
      setReadyStatus(readyRes.ok ? payload?.status ?? 'ready' : `http_${readyRes.statusCode ?? 503}`);
      setReadyDetails(readyRes.payload ? pretty(readyRes.payload) : '');
    } catch {
      setReadyStatus('unreachable');
      setReadyDetails('');
    }
  }

  return {
    healthStatus,
    readyStatus,
    readyDetails,
    refreshStatuses
  };
}
