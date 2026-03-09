export type RuntimeGateState = 'ready' | 'blocked' | 'unreachable' | 'unknown';

interface DeriveRuntimeGateStateInput {
  healthStatus: string;
  readyStatus: string;
  orgRuntimeUnavailable: boolean;
}

export function deriveRuntimeGateState(
  input: DeriveRuntimeGateStateInput
): RuntimeGateState {
  if (
    input.orgRuntimeUnavailable ||
    input.healthStatus === 'unreachable' ||
    input.readyStatus === 'unreachable'
  ) {
    return 'unreachable';
  }

  if (input.readyStatus === 'unknown') {
    return 'unknown';
  }

  if (input.readyStatus !== 'ready') {
    return 'blocked';
  }

  return 'ready';
}

export function isRuntimeBlocked(state: RuntimeGateState): boolean {
  return state === 'blocked' || state === 'unreachable';
}
