export type ToolStatusSource = 'runtime_unavailable' | 'live' | 'unknown';

export function describeToolStatusSource(source: ToolStatusSource): string {
  if (source === 'runtime_unavailable') {
    return 'runtime unavailable';
  }

  if (source === 'live') {
    return 'live status';
  }

  return 'status not loaded';
}

export function describeRuntimeAwareBinaryLabel(
  runtimeUnavailable: boolean,
  value: boolean | undefined,
  labels: {
    trueLabel: string;
    falseLabel: string;
    unavailableLabel?: string;
    unknownLabel?: string;
  }
): string {
  if (runtimeUnavailable) {
    return labels.unavailableLabel || 'unknown';
  }

  if (value === true) {
    return labels.trueLabel;
  }

  if (value === false) {
    return labels.falseLabel;
  }

  return labels.unknownLabel || 'unknown';
}

export function describeSessionSurfaceStatus(
  runtimeUnavailable: boolean,
  sessionStatus?: string | null
): string {
  if (runtimeUnavailable) {
    return 'runtime unavailable';
  }

  return sessionStatus || 'unknown';
}

export function describeInstalledSurfaceStatus(input: {
  runtimeUnavailable: boolean;
  installed?: boolean | null;
  hasLiveStatus: boolean;
  installedLabel: string;
  missingLabel: string;
  unknownLabel?: string;
  unavailableLabel?: string;
}): string {
  if (input.runtimeUnavailable) {
    return input.unavailableLabel || 'unavailable';
  }

  if (input.installed === true) {
    return input.installedLabel;
  }

  if (input.installed === false && input.hasLiveStatus) {
    return input.missingLabel;
  }

  return input.unknownLabel || 'unknown';
}
