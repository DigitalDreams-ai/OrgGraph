'use client';

import { useState } from 'react';
import { getApiHealth, getApiReady } from '../lib/status-client';

export interface ReadyChecksPayload {
  bootstrap?: {
    ok?: boolean;
    status?: string;
    message?: string;
    updatedAt?: string;
  };
  db?: {
    ok?: boolean;
    backend?: string;
    storageRef?: string;
    nodeCount?: number;
    edgeCount?: number;
  };
  fixtures?: {
    ok?: boolean;
    sourcePath?: string;
  };
  evidence?: {
    ok?: boolean;
    indexPath?: string;
  };
}

export interface ReadyPayload {
  status?: string;
  message?: string;
  checks?: ReadyChecksPayload;
}

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function toReadyPayload(value: unknown): ReadyPayload | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as ReadyPayload;
}

export function useShellRuntime() {
  const [healthStatus, setHealthStatus] = useState('unknown');
  const [readyStatus, setReadyStatus] = useState('unknown');
  const [readyDetails, setReadyDetails] = useState('');
  const [readyPayload, setReadyPayload] = useState<ReadyPayload | null>(null);

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
      setReadyPayload(toReadyPayload(readyRes.payload));
    } catch {
      setReadyStatus('unreachable');
      setReadyDetails('');
      setReadyPayload(null);
    }
  }

  return {
    healthStatus,
    readyStatus,
    readyDetails,
    readyPayload,
    refreshStatuses
  };
}
