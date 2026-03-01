'use client';

interface StatusStripProps {
  healthStatus: string;
  readyStatus: string;
  sessionStatus: string;
  askTrust: string;
}

function statusTone(status: string): string {
  if (status === 'ok' || status === 'ready' || status === 'connected') return 'good';
  if (status === 'unknown') return 'muted';
  return 'bad';
}

function trustTone(trustLevel: string): string {
  if (trustLevel === 'trusted') return 'good';
  if (trustLevel === 'conditional' || trustLevel === 'waiting') return 'muted';
  return 'bad';
}

export function StatusStrip(props: StatusStripProps): JSX.Element {
  return (
    <section className="status-strip">
      <article className={`status-pill ${statusTone(props.healthStatus)}`}>
        <span>API Health</span>
        <strong>{props.healthStatus}</strong>
      </article>
      <article className={`status-pill ${statusTone(props.readyStatus)}`}>
        <span>API Ready</span>
        <strong>{props.readyStatus}</strong>
      </article>
      <article className={`status-pill ${statusTone(props.sessionStatus)}`}>
        <span>Org Session</span>
        <strong>{props.sessionStatus}</strong>
      </article>
      <article className={`status-pill ${trustTone(props.askTrust)}`}>
        <span>Ask Trust</span>
        <strong>{props.askTrust}</strong>
      </article>
    </section>
  );
}
