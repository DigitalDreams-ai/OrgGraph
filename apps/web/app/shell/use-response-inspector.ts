'use client';

import { useState } from 'react';
import type { QueryResponse } from '../lib/ask-client';

function pretty(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function resolveQueryErrorMessage(data: QueryResponse): string {
  const payload = data.payload as
    | {
        error?: {
          message?: string;
          details?: { reason?: string; hint?: string };
        };
      }
    | undefined;
  const payloadErrorReason = payload?.error?.details?.reason;
  const payloadErrorHint = payload?.error?.details?.hint;
  const payloadError = payload?.error?.message;
  const topError = data.error?.message;
  return (
    payloadErrorReason ||
    payloadErrorHint ||
    payloadError ||
    topError ||
    'Request failed. Check inputs, alias/session state, and desktop API readiness.'
  );
}

export function useResponseInspector() {
  const [copied, setCopied] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [errorText, setErrorText] = useState('');

  function presentResponse(parsed: QueryResponse): void {
    setResponseText(pretty(parsed));
  }

  async function copyJson(): Promise<void> {
    if (!responseText) return;

    try {
      await navigator.clipboard.writeText(responseText);
      setCopied(true);
      return;
    } catch {
      // fallback
    }

    const area = document.createElement('textarea');
    area.value = responseText;
    area.setAttribute('readonly', 'true');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const copiedFallback = document.execCommand('copy');
    document.body.removeChild(area);
    if (copiedFallback) {
      setCopied(true);
      return;
    }

    setErrorText('Copy failed in this browser context. Select JSON from Raw JSON and copy manually.');
  }

  return {
    copied,
    setCopied,
    responseText,
    errorText,
    setErrorText,
    presentResponse,
    copyJson
  };
}
