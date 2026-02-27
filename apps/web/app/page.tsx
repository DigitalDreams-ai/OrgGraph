'use client';

import { useEffect, useMemo, useState } from 'react';

type QueryKind =
  | 'refresh'
  | 'orgConnect'
  | 'orgSession'
  | 'orgPreflight'
  | 'orgSessionSwitch'
  | 'orgSessionDisconnect'
  | 'perms'
  | 'permsDiagnose'
  | 'permsSystem'
  | 'automation'
  | 'impact'
  | 'ask'
  | 'orgStatus'
  | 'orgRetrieve'
  | 'metadataCatalog'
  | 'metadataMembers'
  | 'metadataRetrieve'
  | 'refreshDiff'
  | 'askArchitecture'
  | 'askSimulate'
  | 'askSimulateCompare'
  | 'askProofsRecent'
  | 'askProof'
  | 'askReplay'
  | 'askMetrics'
  | 'askTrustDashboard'
  | 'metaContext'
  | 'metaAdapt';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3100';
const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION || 'dev-local';

type MetadataCatalogMember = { name: string };
type MetadataCatalogType = { type: string; memberCount: number };
type MetadataCatalogPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  search?: string;
  totalTypes: number;
  types: MetadataCatalogType[];
  warnings?: string[];
};
type MetadataMembersPayload = {
  source: 'local' | 'source_api' | 'metadata_api' | 'cache' | 'mixed';
  refreshedAt: string;
  type: string;
  search?: string;
  totalMembers: number;
  members: MetadataCatalogMember[];
  warnings?: string[];
};

type AskPayload = {
  answer?: string;
  deterministicAnswer?: string;
  plan?: unknown;
  citations?: Array<{ sourcePath?: string; score?: number }>;
  confidence?: number;
  trustLevel?: string;
  policy?: { policyId?: string; groundingThreshold?: number; constraintThreshold?: number; ambiguityMaxThreshold?: number };
  proof?: { proofId?: string; replayToken?: string; snapshotId?: string };
  status?: string;
};

type OrgSessionPayload = {
  status?: string;
  activeAlias?: string;
  authMode?: string;
  connectedAt?: string;
  disconnectedAt?: string;
  lastError?: string;
};

type OrgStatusPayload = {
  integrationEnabled?: boolean;
  authMode?: string;
  alias?: string;
  sf?: { installed?: boolean };
  session?: OrgSessionPayload;
};

type OrgPreflightPayload = {
  ok?: boolean;
  integrationEnabled?: boolean;
  authMode?: string;
  alias?: string;
  checks?: Record<string, boolean>;
  issues?: Array<{ code?: string; severity?: string; message?: string; remediation?: string }>;
  session?: OrgSessionPayload;
};

type RefreshPayload = {
  snapshotId?: string;
  semanticDiff?: {
    addedNodeCount?: number;
    removedNodeCount?: number;
    addedEdgeCount?: number;
    removedEdgeCount?: number;
  };
  meaningChangeSummary?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function Page(): JSX.Element {
  type UiTab = 'connect' | 'browser' | 'refresh' | 'analyze' | 'ask' | 'simulate' | 'proofs' | 'system';
  type AnalyzeTab = 'perms' | 'automation' | 'impact';
  type OperatorRole = 'admin' | 'architect' | 'reviewer';

  const [uiTab, setUiTab] = useState<UiTab>('connect');
  const [analyzeTab, setAnalyzeTab] = useState<AnalyzeTab>('perms');
  const [operatorRole, setOperatorRole] = useState<OperatorRole>('architect');
  const [actionCounts, setActionCounts] = useState<Record<string, number>>({});
  const [firstRunDismissed, setFirstRunDismissed] = useState(false);

  const [kind, setKind] = useState<QueryKind>('ask');
  const [loading, setLoading] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [responseObject, setResponseObject] = useState<Record<string, unknown> | null>(null);
  const [errorText, setErrorText] = useState('');
  const [copied, setCopied] = useState(false);
  const [healthStatus, setHealthStatus] = useState('unknown');
  const [readyStatus, setReadyStatus] = useState('unknown');
  const [readyDetails, setReadyDetails] = useState('');

  const [refreshMode, setRefreshMode] = useState<'full' | 'incremental'>('incremental');
  const [user, setUser] = useState('jane@example.com');
  const [objectName, setObjectName] = useState('Opportunity');
  const [fieldName, setFieldName] = useState('Opportunity.StageName');
  const [systemPermission, setSystemPermission] = useState('ApproveUninstalledConnectedApps');
  const [askQuery, setAskQuery] = useState('What touches Opportunity.StageName?');
  const [limitRaw, setLimitRaw] = useState('25');
  const [strictMode, setStrictMode] = useState(true);
  const [explainMode, setExplainMode] = useState(false);
  const [includeLowConfidence, setIncludeLowConfidence] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [maxCitationsRaw, setMaxCitationsRaw] = useState('5');
  const [consistencyCheck, setConsistencyCheck] = useState(true);
  const [askContextRaw, setAskContextRaw] = useState('{}');
  const [orgRunAuth, setOrgRunAuth] = useState(true);
  const [orgRunRetrieve, setOrgRunRetrieve] = useState(true);
  const [orgAutoRefresh, setOrgAutoRefresh] = useState(true);
  const [orgSessionAlias, setOrgSessionAlias] = useState('orgumented-sandbox');
  const [metadataSearch, setMetadataSearch] = useState('');
  const [metadataMemberSearch, setMetadataMemberSearch] = useState('');
  const [metadataLimitRaw, setMetadataLimitRaw] = useState('200');
  const [metadataForceRefresh, setMetadataForceRefresh] = useState(false);
  const [metadataAutoRefresh, setMetadataAutoRefresh] = useState(true);
  const [metadataCatalog, setMetadataCatalog] = useState<MetadataCatalogPayload | null>(null);
  const [metadataMembersByType, setMetadataMembersByType] = useState<Record<string, MetadataMembersPayload>>({});
  const [metadataLoadingType, setMetadataLoadingType] = useState<string>('');
  const [metadataSelected, setMetadataSelected] = useState<Array<{ type: string; members?: string[] }>>([]);
  const [metadataSelectionsRaw, setMetadataSelectionsRaw] = useState(
    JSON.stringify([{ type: 'CustomObject', members: ['Account'] }], null, 2)
  );
  const [fromSnapshot, setFromSnapshot] = useState('');
  const [toSnapshot, setToSnapshot] = useState('');
  const [archUser, setArchUser] = useState('jane@example.com');
  const [archObject, setArchObject] = useState('Opportunity');
  const [archField, setArchField] = useState('Opportunity.StageName');
  const [archMaxPathsRaw, setArchMaxPathsRaw] = useState('10');
  const [simProfile, setSimProfile] = useState<'strict' | 'balanced' | 'exploratory'>('balanced');
  const [simChangesRaw, setSimChangesRaw] = useState(
    JSON.stringify(
      [
        {
          action: 'modify_field',
          object: 'Opportunity',
          field: 'Opportunity.StageName',
          description: 'tighten stage transition behavior'
        }
      ],
      null,
      2
    )
  );
  const [simScenarioBRaw, setSimScenarioBRaw] = useState(
    JSON.stringify(
      [
        {
          action: 'modify_field',
          object: 'Opportunity',
          field: 'Opportunity.StageName',
          description: 'same as scenario A'
        },
        {
          action: 'add_automation',
          object: 'Opportunity',
          description: 'add enrichment flow on stage update'
        }
      ],
      null,
      2
    )
  );
  const [proofId, setProofId] = useState('');
  const [replayToken, setReplayToken] = useState('');
  const [metaDryRun, setMetaDryRun] = useState(true);
  const [askElaboration, setAskElaboration] = useState('');
  const [askElaborationLoading, setAskElaborationLoading] = useState(false);
  const [timeline, setTimeline] = useState<Array<{ at: string; step: string; detail: string }>>([]);
  const [operatorErrors, setOperatorErrors] = useState<Array<{ at: string; category: string; message: string }>>([]);
  const [latestSession, setLatestSession] = useState<OrgSessionPayload | null>(null);
  const [latestOrgStatus, setLatestOrgStatus] = useState<OrgStatusPayload | null>(null);
  const [latestRefresh, setLatestRefresh] = useState<RefreshPayload | null>(null);
  const [latestAsk, setLatestAsk] = useState<AskPayload | null>(null);
  const [latestPreflight, setLatestPreflight] = useState<OrgPreflightPayload | null>(null);

  const askPayload = useMemo(() => {
    if (kind !== 'ask' || !responseObject || typeof responseObject.payload !== 'object' || responseObject.payload === null) {
      return null;
    }
    return responseObject.payload as AskPayload;
  }, [kind, responseObject]);

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('orgumented.ui.tab') as UiTab | null;
      if (savedTab) {
        setUiTab(savedTab);
      }
      const savedAnalyzeTab = localStorage.getItem('orgumented.ui.analyzeTab') as AnalyzeTab | null;
      if (savedAnalyzeTab) {
        setAnalyzeTab(savedAnalyzeTab);
      }
      const savedRole = localStorage.getItem('orgumented.ui.operatorRole') as OperatorRole | null;
      if (savedRole) {
        setOperatorRole(savedRole);
      }
      const savedAlias = localStorage.getItem('orgumented.ui.alias');
      if (savedAlias) {
        setOrgSessionAlias(savedAlias);
      }
      const savedUser = localStorage.getItem('orgumented.ui.user');
      if (savedUser) {
        setUser(savedUser);
      }
      const savedObject = localStorage.getItem('orgumented.ui.object');
      if (savedObject) {
        setObjectName(savedObject);
      }
      const savedField = localStorage.getItem('orgumented.ui.field');
      if (savedField) {
        setFieldName(savedField);
      }
      const savedAsk = localStorage.getItem('orgumented.ui.askQuery');
      if (savedAsk) {
        setAskQuery(savedAsk);
      }
      const savedCounts = localStorage.getItem('orgumented.ui.actionCounts');
      if (savedCounts) {
        setActionCounts(JSON.parse(savedCounts) as Record<string, number>);
      }
      const dismissed = localStorage.getItem('orgumented.ui.firstRunDismissed');
      if (dismissed === '1') {
        setFirstRunDismissed(true);
      }
    } catch {
      // ignore localStorage failures
    }
    void refreshStatuses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('orgumented.ui.tab', uiTab);
      localStorage.setItem('orgumented.ui.analyzeTab', analyzeTab);
      localStorage.setItem('orgumented.ui.operatorRole', operatorRole);
      localStorage.setItem('orgumented.ui.alias', orgSessionAlias);
      localStorage.setItem('orgumented.ui.user', user);
      localStorage.setItem('orgumented.ui.object', objectName);
      localStorage.setItem('orgumented.ui.field', fieldName);
      localStorage.setItem('orgumented.ui.askQuery', askQuery);
      localStorage.setItem('orgumented.ui.actionCounts', JSON.stringify(actionCounts));
      localStorage.setItem('orgumented.ui.firstRunDismissed', firstRunDismissed ? '1' : '0');
    } catch {
      // ignore localStorage failures
    }
  }, [uiTab, analyzeTab, operatorRole, orgSessionAlias, user, objectName, fieldName, askQuery, actionCounts, firstRunDismissed]);

  const endpointHint = useMemo(() => {
    if (kind === 'refresh') {
      return 'POST /refresh';
    }
    if (kind === 'orgConnect') {
      return 'POST /org/retrieve (runAuth=true, runRetrieve=false, autoRefresh=false)';
    }
    if (kind === 'orgSession') {
      return 'GET /org/session';
    }
    if (kind === 'orgPreflight') {
      return 'GET /org/preflight';
    }
    if (kind === 'orgSessionSwitch') {
      return 'POST /org/session/switch';
    }
    if (kind === 'orgSessionDisconnect') {
      return 'POST /org/session/disconnect';
    }
    if (kind === 'perms') {
      return 'GET /perms?user=...&object=...&field=...&limit=...';
    }
    if (kind === 'permsDiagnose') {
      return 'GET /perms/diagnose?user=...';
    }
    if (kind === 'permsSystem') {
      return 'GET /perms/system?user=...&permission=...&limit=...';
    }
    if (kind === 'automation') {
      return 'GET /automation?object=...&limit=...&strict=...&explain=...&includeLowConfidence=...';
    }
    if (kind === 'impact') {
      return 'GET /impact?field=...&limit=...&strict=...&debug=...&explain=...&includeLowConfidence=...';
    }
    if (kind === 'orgStatus') {
      return 'GET /org/status';
    }
    if (kind === 'orgRetrieve') {
      return 'POST /org/retrieve';
    }
    if (kind === 'metadataCatalog') {
      return 'GET /org/metadata/catalog?q=...&limit=...&refresh=...';
    }
    if (kind === 'metadataMembers') {
      return 'GET /org/metadata/members?type=...&q=...&limit=...&refresh=...';
    }
    if (kind === 'metadataRetrieve') {
      return 'POST /org/metadata/retrieve';
    }
    if (kind === 'refreshDiff') {
      return 'GET /refresh/diff/:from/:to';
    }
    if (kind === 'askArchitecture') {
      return 'POST /ask/architecture';
    }
    if (kind === 'askSimulate') {
      return 'POST /ask/simulate';
    }
    if (kind === 'askSimulateCompare') {
      return 'POST /ask/simulate/compare';
    }
    if (kind === 'askProofsRecent') {
      return 'GET /ask/proofs/recent?limit=...';
    }
    if (kind === 'askProof') {
      return 'GET /ask/proof/:proofId';
    }
    if (kind === 'askReplay') {
      return 'POST /ask/replay';
    }
    if (kind === 'askMetrics') {
      return 'GET /ask/metrics/export';
    }
    if (kind === 'askTrustDashboard') {
      return 'GET /ask/trust/dashboard';
    }
    if (kind === 'metaContext') {
      return 'GET /meta/context';
    }
    if (kind === 'metaAdapt') {
      return 'POST /meta/adapt';
    }
    return 'POST /ask';
  }, [kind]);

  const visibleTabs = useMemo((): Array<[UiTab, string]> => {
    const all: Array<[UiTab, string]> = [
      ['connect', 'Connect'],
      ['browser', 'Org Browser'],
      ['refresh', 'Refresh'],
      ['analyze', 'Analyze'],
      ['ask', 'Ask'],
      ['simulate', 'Simulate'],
      ['proofs', 'Prove'],
      ['system', 'System']
    ];
    if (operatorRole === 'admin') {
      return all;
    }
    if (operatorRole === 'reviewer') {
      return all.filter(([tab]) => ['analyze', 'ask', 'proofs', 'system'].includes(tab));
    }
    return all.filter(([tab]) => tab !== 'connect');
  }, [operatorRole]);

  async function fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
    let lastError: Error | undefined;
    for (let i = 0; i < attempts; i += 1) {
      try {
        const res = await fetch(url, init);
        if (res.status === 502 || res.status === 503 || res.status === 504) {
          if (i < attempts - 1) {
            await sleep(200 * (i + 1));
            continue;
          }
        }
        return res;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('unknown request error');
        if (i < attempts - 1) {
          await sleep(200 * (i + 1));
          continue;
        }
      }
    }
    throw lastError ?? new Error('request failed after retries');
  }

  async function refreshStatuses(): Promise<void> {
    try {
      const health = await fetch('/api/health', { cache: 'no-store' });
      setHealthStatus(health.ok ? 'ok' : `http_${health.status}`);
    } catch {
      setHealthStatus('unreachable');
    }

    try {
      const ready = await fetch('/api/ready', { cache: 'no-store' });
      const readyPayload = (await ready.json()) as { upstreamApi?: { payload?: unknown } };
      if (ready.ok) {
        setReadyStatus('ready');
      } else {
        setReadyStatus(`http_${ready.status}`);
      }
      setReadyDetails(JSON.stringify(readyPayload, null, 2));
    } catch {
      setReadyStatus('unreachable');
      setReadyDetails('');
    }
  }

  function parseOptionalInt(raw: string): number | undefined {
    if (raw.trim().length === 0) {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isInteger(parsed) ? parsed : undefined;
  }

  function parseContext(raw: string): Record<string, unknown> | undefined {
    if (raw.trim().length === 0) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  function syncSelectionsRaw(next: Array<{ type: string; members?: string[] }>): void {
    setMetadataSelectionsRaw(JSON.stringify(next, null, 2));
  }

  function addTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      if (current.some((entry) => entry.type === type)) {
        return current;
      }
      const next = [...current, { type }];
      syncSelectionsRaw(next);
      return next;
    });
  }

  function removeTypeSelection(type: string): void {
    setMetadataSelected((current) => {
      const next = current.filter((entry) => entry.type !== type);
      syncSelectionsRaw(next);
      return next;
    });
  }

  function toggleMemberSelection(type: string, member: string): void {
    setMetadataSelected((current) => {
      const idx = current.findIndex((entry) => entry.type === type);
      if (idx === -1) {
        const next = [...current, { type, members: [member] }];
        syncSelectionsRaw(next);
        return next;
      }

      const existing = current[idx];
      const existingMembers = Array.isArray(existing.members) ? existing.members : [];
      const has = existingMembers.includes(member);
      const members = has
        ? existingMembers.filter((value) => value !== member)
        : [...existingMembers, member].sort((a, b) => a.localeCompare(b));
      const nextEntry = members.length > 0 ? { type, members } : { type };
      const next = [...current];
      next[idx] = nextEntry;
      syncSelectionsRaw(next);
      return next;
    });
  }

  function isTypeSelected(type: string): boolean {
    return metadataSelected.some((entry) => entry.type === type);
  }

  function isMemberSelected(type: string, member: string): boolean {
    const entry = metadataSelected.find((candidate) => candidate.type === type);
    if (!entry || !Array.isArray(entry.members)) {
      return false;
    }
    return entry.members.includes(member);
  }

  function metadataAgeLabel(refreshedAt: string): string {
    const refreshedMs = Date.parse(refreshedAt);
    if (Number.isNaN(refreshedMs)) {
      return 'unknown';
    }
    const ageSeconds = Math.max(0, Math.floor((Date.now() - refreshedMs) / 1000));
    if (ageSeconds < 60) {
      return `${ageSeconds}s ago`;
    }
    const ageMinutes = Math.floor(ageSeconds / 60);
    if (ageMinutes < 60) {
      return `${ageMinutes}m ago`;
    }
    const ageHours = Math.floor(ageMinutes / 60);
    return `${ageHours}h ago`;
  }

  function appendTimeline(step: string, detail: string): void {
    const event = { at: new Date().toISOString(), step, detail };
    setTimeline((current) => [event, ...current].slice(0, 20));
  }

  function appendOperatorError(category: string, message: string): void {
    const item = { at: new Date().toISOString(), category, message };
    setOperatorErrors((current) => [item, ...current].slice(0, 12));
  }

  function trackAction(action: string): void {
    setActionCounts((current) => ({
      ...current,
      [action]: (current[action] || 0) + 1
    }));
  }

  async function runQuery(nextKind: QueryKind = kind): Promise<void> {
    const activeKind = nextKind;
    if (kind !== activeKind) {
      setKind(activeKind);
    }
    setLoading(true);
    setResponseText('');
    setResponseObject(null);
    setErrorText('');
    setCopied(false);
    if (activeKind === 'ask') {
      setAskElaboration('');
    }

    try {
      const limit = parseOptionalInt(limitRaw);
      const metadataLimit = parseOptionalInt(metadataLimitRaw);
      const maxCitations = parseOptionalInt(maxCitationsRaw);
      const askContext = parseContext(askContextRaw);
      const archMaxPaths = parseOptionalInt(archMaxPathsRaw);
      let simChanges: Array<Record<string, unknown>> = [];
      let simScenarioBChanges: Array<Record<string, unknown>> = [];
      if (activeKind === 'askSimulate' || activeKind === 'askSimulateCompare') {
        const parsedA = JSON.parse(simChangesRaw) as unknown;
        if (Array.isArray(parsedA)) {
          simChanges = parsedA as Array<Record<string, unknown>>;
        }
      }
      if (activeKind === 'askSimulateCompare') {
        const parsedB = JSON.parse(simScenarioBRaw) as unknown;
        if (Array.isArray(parsedB)) {
          simScenarioBChanges = parsedB as Array<Record<string, unknown>>;
        }
      }
      let metadataSelections: Array<{ type: string; members?: string[] }> = [];
      if (activeKind === 'metadataRetrieve') {
        const parsed = JSON.parse(metadataSelectionsRaw) as unknown;
        if (Array.isArray(parsed)) {
          metadataSelections = parsed as Array<{ type: string; members?: string[] }>;
        }
      }

      const payload =
        activeKind === 'refresh'
          ? { mode: refreshMode }
          : activeKind === 'orgConnect'
            ? {}
          : activeKind === 'orgSession'
            ? {}
            : activeKind === 'orgPreflight'
              ? {}
            : activeKind === 'orgSessionSwitch'
              ? { alias: orgSessionAlias }
              : activeKind === 'orgSessionDisconnect'
                ? {}
          : activeKind === 'orgStatus'
            ? {}
            : activeKind === 'orgRetrieve'
              ? { runAuth: orgRunAuth, runRetrieve: orgRunRetrieve, autoRefresh: orgAutoRefresh }
              : activeKind === 'metadataCatalog'
                ? { q: metadataSearch, limit: metadataLimit, refresh: metadataForceRefresh }
                : activeKind === 'metadataRetrieve'
                  ? { selections: metadataSelections, autoRefresh: metadataAutoRefresh }
                  : activeKind === 'refreshDiff'
                    ? { fromSnapshot, toSnapshot }
                    : activeKind === 'askArchitecture'
                      ? { user: archUser, object: archObject, field: archField, maxPaths: archMaxPaths }
                      : activeKind === 'askSimulate'
                        ? {
                            user: archUser,
                            object: archObject,
                            field: archField,
                            maxPaths: archMaxPaths,
                            profile: simProfile,
                            proposedChanges: simChanges
                          }
                        : activeKind === 'askSimulateCompare'
                          ? {
                              scenarioA: {
                                user: archUser,
                                object: archObject,
                                field: archField,
                                maxPaths: archMaxPaths,
                                profile: simProfile,
                                proposedChanges: simChanges
                              },
                              scenarioB: {
                                user: archUser,
                                object: archObject,
                                field: archField,
                                maxPaths: archMaxPaths,
                                profile: 'exploratory',
                                proposedChanges: simScenarioBChanges
                              }
                            }
                      : activeKind === 'askProofsRecent'
                        ? { limit }
                      : activeKind === 'askProof'
                        ? { proofId }
                        : activeKind === 'askReplay'
                          ? { replayToken, proofId }
                          : activeKind === 'askMetrics'
                            ? {}
                            : activeKind === 'metaContext'
                              ? {}
                              : activeKind === 'metaAdapt'
                                ? { dryRun: metaDryRun }
          : activeKind === 'perms'
            ? { user, object: objectName, field: fieldName, limit }
            : activeKind === 'permsDiagnose'
              ? { user }
            : activeKind === 'permsSystem'
              ? { user, permission: systemPermission, limit }
            : activeKind === 'automation'
                ? { object: objectName, limit, strict: strictMode, explain: explainMode, includeLowConfidence }
                : activeKind === 'impact'
                  ? {
                      field: fieldName,
                      limit,
                      strict: strictMode,
                      explain: explainMode,
                      includeLowConfidence,
                      debug: debugMode
                    }
                  : {
                      query: askQuery,
                      maxCitations: typeof maxCitations === 'number' ? maxCitations : 5,
                      includeLowConfidence,
                      consistencyCheck,
                      context: askContext
                    };

      const response = await fetchWithRetry('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: activeKind, payload })
      });

      const wrapped = await response.json();
      setResponseText(JSON.stringify(wrapped, null, 2));
      if (wrapped && typeof wrapped === 'object') {
        setResponseObject(wrapped as Record<string, unknown>);
      }
      if (activeKind === 'metadataCatalog' && wrapped?.payload && typeof wrapped.payload === 'object') {
        const payload = wrapped.payload as Partial<MetadataCatalogPayload>;
        if (typeof payload.source === 'string' && Array.isArray(payload.types)) {
          setMetadataCatalog({
            source: payload.source as MetadataCatalogPayload['source'],
            refreshedAt: typeof payload.refreshedAt === 'string' ? payload.refreshedAt : new Date().toISOString(),
            search: typeof payload.search === 'string' ? payload.search : undefined,
            totalTypes: typeof payload.totalTypes === 'number' ? payload.totalTypes : payload.types.length,
            types: payload.types as MetadataCatalogType[],
            warnings: Array.isArray(payload.warnings) ? payload.warnings : []
          });
          setMetadataMembersByType({});
        }
      }

      if (activeKind === 'orgSession' && wrapped?.payload && typeof wrapped.payload === 'object') {
        setLatestSession(wrapped.payload as OrgSessionPayload);
      }
      if (activeKind === 'orgPreflight' && wrapped?.payload && typeof wrapped.payload === 'object') {
        setLatestPreflight(wrapped.payload as OrgPreflightPayload);
      }
      if (activeKind === 'orgStatus' && wrapped?.payload && typeof wrapped.payload === 'object') {
        const statusPayload = wrapped.payload as OrgStatusPayload;
        setLatestOrgStatus(statusPayload);
        if (statusPayload.session) {
          setLatestSession(statusPayload.session);
        }
      }
      if (activeKind === 'refresh' && wrapped?.payload && typeof wrapped.payload === 'object') {
        setLatestRefresh(wrapped.payload as RefreshPayload);
      }
      if (activeKind === 'ask' && wrapped?.payload && typeof wrapped.payload === 'object') {
        setLatestAsk(wrapped.payload as AskPayload);
      }

      if (!response.ok) {
        const wrappedPayload = wrapped?.payload as
          | { error?: { code?: string; message?: string }; details?: { code?: string; reason?: string } }
          | undefined;
        const category =
          wrappedPayload?.error?.code ??
          wrappedPayload?.details?.code ??
          'REQUEST_FAILED';
        const message =
          wrappedPayload?.error?.message ??
          wrappedPayload?.details?.reason ??
          `query ${activeKind} failed with status ${response.status}`;
        appendOperatorError(category, message);
        appendTimeline(activeKind, `failed (${category})`);
        setErrorText(`${category}: ${message}`);
      } else {
        appendTimeline(activeKind, 'completed');
        trackAction(activeKind);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown request error';
      appendOperatorError('NETWORK_ERROR', message);
      appendTimeline(activeKind, 'network_failure');
      setResponseText(JSON.stringify({ ok: false, error: message }, null, 2));
      setErrorText('Network request failed after retries. Check container health and retry in a few seconds.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMetadataMembers(type: string): Promise<void> {
    if (metadataLoadingType === type) {
      return;
    }
    if (!metadataForceRefresh && metadataMembersByType[type]) {
      return;
    }
    setMetadataLoadingType(type);
    try {
      const metadataLimit = parseOptionalInt(metadataLimitRaw);
      const response = await fetchWithRetry('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'metadataMembers',
          payload: { type, q: metadataMemberSearch, limit: metadataLimit, refresh: metadataForceRefresh }
        })
      });
      const wrapped = (await response.json()) as { payload?: MetadataMembersPayload };
      if (response.ok && wrapped.payload && Array.isArray(wrapped.payload.members)) {
        setMetadataMembersByType((current) => ({
          ...current,
          [type]: wrapped.payload as MetadataMembersPayload
        }));
      }
    } finally {
      setMetadataLoadingType('');
    }
  }

  async function runAskElaboration(): Promise<void> {
    if (!askPayload?.answer || askElaborationLoading) {
      return;
    }
    setAskElaborationLoading(true);
    setAskElaboration('');
    try {
      const response = await fetchWithRetry('/api/query', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'ask',
          payload: {
            query: `Explain this deterministically-derived answer in plain English for an admin: ${askPayload.answer}`,
            maxCitations: 3,
            includeLowConfidence: false,
            consistencyCheck: true,
            context: { source: 'ui-elaboration', originalQuery: askQuery }
          }
        })
      });
      const wrapped = (await response.json()) as { payload?: AskPayload };
      if (!response.ok) {
        setAskElaboration('Elaboration request failed. Check response JSON for details.');
      } else {
        setAskElaboration(
          wrapped?.payload?.answer?.trim() || 'No elaboration text returned; inspect raw response JSON.'
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown elaboration error';
      setAskElaboration(`Elaboration request failed: ${message}`);
    } finally {
      setAskElaborationLoading(false);
    }
  }

  async function copyResponse(): Promise<void> {
    if (!responseText) {
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(responseText);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = responseText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = responseText;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <main className="console-root">
      <div className="bg-orb bg-orb-a" />
      <div className="bg-orb bg-orb-b" />

      <section className="hero">
        <p className="hero-kicker">Workflow UI</p>
        <h1>Orgumented Mission Control</h1>
        <p>Connect, retrieve, build, analyze, and explain from one guided flow.</p>
        <p className="endpoint-hint">UI Build: {BUILD_VERSION}</p>
        <div className="row">
          <label htmlFor="operatorRole">Operator Role</label>
          <select
            id="operatorRole"
            value={operatorRole}
            onChange={(e) => setOperatorRole(e.target.value as OperatorRole)}
          >
            <option value="admin">admin</option>
            <option value="architect">architect</option>
            <option value="reviewer">reviewer</option>
          </select>
        </div>
      </section>

      {!firstRunDismissed ? (
        <section className="panel status-card">
          <h2>First-Run Checklist</h2>
          <ol>
            <li>Authenticate alias with Salesforce CLI keychain (`sf org login ...`).</li>
            <li>Browse metadata and add items to retrieval cart.</li>
            <li>Retrieve selected metadata and rebuild graph.</li>
            <li>Run Analyze and Ask workflows.</li>
          </ol>
          <button type="button" onClick={() => setFirstRunDismissed(true)}>Dismiss Checklist</button>
        </section>
      ) : null}

      <section className="status-grid">
        <section className="panel status-card">
          <h2>Current State</h2>
          <p className="endpoint-hint">API Base: {API_BASE}</p>
          <p className="endpoint-hint">Ready: {readyStatus}</p>
          <p className="endpoint-hint">Session: {latestSession?.status ?? 'unknown'}</p>
          <p className="endpoint-hint">Active Alias: {latestSession?.activeAlias ?? latestOrgStatus?.alias ?? 'n/a'}</p>
          <button type="button" onClick={refreshStatuses}>Refresh Status</button>
        </section>
        <section className="panel status-card">
          <h2>Toolchain</h2>
          <p className="endpoint-hint">sf installed: {String(latestOrgStatus?.sf?.installed ?? false)}</p>
          <p className="endpoint-hint">auth mode: {latestOrgStatus?.authMode ?? latestSession?.authMode ?? 'n/a'}</p>
          <p className="endpoint-hint">Next: go to Connect tab if session is not ready.</p>
        </section>
        <section className="panel status-card">
          <h2>Recent Activity</h2>
          {timeline.length === 0 ? (
            <p className="endpoint-hint">No actions yet.</p>
          ) : (
            <ul>
              {timeline.slice(0, 6).map((item) => (
                <li key={`${item.at}-${item.step}`}>{item.step}: {item.detail}</li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <section className="workspace-grid">
        <aside className="panel nav-panel">
          <h2>Workflows</h2>
          <div className="top-tabs" role="tablist" aria-label="workflow sections">
            {visibleTabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={uiTab === key ? 'tab active' : 'tab'}
                role="tab"
                aria-selected={uiTab === key}
                onClick={() => setUiTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="endpoint-hint">Current: {uiTab}</p>
          <p className="endpoint-hint">Ready: {readyStatus}</p>
          <p className="endpoint-hint">Session: {latestSession?.status ?? 'unknown'}</p>
          <p className="endpoint-hint">Alias: {latestSession?.activeAlias ?? latestOrgStatus?.alias ?? 'n/a'}</p>
          <button type="button" onClick={refreshStatuses}>
            Refresh Status
          </button>
        </aside>

        <section className="panel control-panel">
          {uiTab === 'connect' ? (
            <>
              <h2>Connect Org</h2>
              <p className="endpoint-hint">
                Org auth is delegated to Salesforce CLI keychain only. Authenticate once in runtime, then connect using alias.
              </p>
              <div className="row">
                <label htmlFor="orgSessionAlias">Org Alias</label>
                <input id="orgSessionAlias" value={orgSessionAlias} onChange={(e) => setOrgSessionAlias(e.target.value)} />
              </div>
              <p className="endpoint-hint">
                Login command: <code>sf org login web --alias {orgSessionAlias || 'orgumented-sandbox'} --instance-url https://test.salesforce.com --set-default</code>
              </p>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('orgPreflight')} disabled={loading}>Run Preflight</button>
                <button type="button" onClick={() => void runQuery('orgSession')} disabled={loading}>Check Session</button>
                <button type="button" onClick={() => void runQuery('orgStatus')} disabled={loading}>Check Tool Status</button>
                <button type="button" onClick={() => void runQuery('orgSessionSwitch')} disabled={loading}>Switch Alias</button>
                <button type="button" onClick={() => void runQuery('orgConnect')} disabled={loading}>Connect Org</button>
                <button type="button" onClick={() => void runQuery('orgSessionDisconnect')} disabled={loading}>Disconnect</button>
              </div>
              {latestPreflight ? (
                <details open>
                  <summary>Preflight Findings</summary>
                  <p className="endpoint-hint">ok: {String(latestPreflight.ok)}</p>
                  <p className="endpoint-hint">authMode: {latestPreflight.authMode ?? 'n/a'}</p>
                  <p className="endpoint-hint">alias: {latestPreflight.alias ?? 'n/a'}</p>
                  {latestPreflight.issues && latestPreflight.issues.length > 0 ? (
                    <ul>
                      {latestPreflight.issues.map((issue, index) => (
                        <li key={`${issue.code || 'issue'}-${index}`}>
                          {(issue.severity || 'unknown').toUpperCase()} {issue.code}: {issue.message} {issue.remediation ? ` | Fix: ${issue.remediation}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="endpoint-hint">No blocking issues detected.</p>
                  )}
                </details>
              ) : null}
              <p className="endpoint-hint">Next step: open Org Browser tab to select metadata for retrieval.</p>
            </>
          ) : null}

          {uiTab === 'browser' ? (
            <>
              <h2>Org Browser</h2>
              <p className="endpoint-hint">Search metadata, expand types, and add members to retrieval cart.</p>
              <div className="row">
                <label htmlFor="metadataSearch">Type Search</label>
                <input id="metadataSearch" value={metadataSearch} onChange={(e) => setMetadataSearch(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="metadataMemberSearch">Member Search</label>
                <input id="metadataMemberSearch" value={metadataMemberSearch} onChange={(e) => setMetadataMemberSearch(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="metadataLimit">Catalog Limit</label>
                <input id="metadataLimit" value={metadataLimitRaw} onChange={(e) => setMetadataLimitRaw(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="metadataForceRefresh">Force Refresh</label>
                <input id="metadataForceRefresh" type="checkbox" checked={metadataForceRefresh} onChange={(e) => setMetadataForceRefresh(e.target.checked)} />
              </div>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('metadataCatalog')} disabled={loading}>Refresh Types</button>
                <button type="button" onClick={() => { setMetadataSearch(''); setMetadataMemberSearch(''); }}>Clear Filters</button>
              </div>
              <div className="org-browser-frame">
                <div className="org-browser-col">
                  <h3>Metadata Types</h3>
                  {metadataCatalog?.types?.length ? (
                    <div className="scroll-pane">
                      {metadataCatalog.types.map((item) => (
                        <details
                          key={item.type}
                          onToggle={(event) => {
                            const node = event.currentTarget as HTMLDetailsElement;
                            if (node.open) {
                              void loadMetadataMembers(item.type);
                            }
                          }}
                        >
                          <summary>{item.type} ({item.memberCount})</summary>
                          <div className="action-row compact">
                            <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); addTypeSelection(item.type); }}>Add Type</button>
                            {isTypeSelected(item.type) ? (
                              <button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); removeTypeSelection(item.type); }}>Remove Type</button>
                            ) : null}
                          </div>
                          <ul>
                            {(metadataMembersByType[item.type]?.members ?? []).map((member) => (
                              <li key={`${item.type}.${member.name}`}>
                                {member.name}
                                <button type="button" onClick={() => toggleMemberSelection(item.type, member.name)}>
                                  {isMemberSelected(item.type, member.name) ? 'Remove' : 'Add'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  ) : (
                    <p className="endpoint-hint">No catalog loaded yet. Click Refresh Types.</p>
                  )}
                </div>
                <div className="org-browser-col">
                  <h3>Retrieval Cart</h3>
                  <div className="scroll-pane">
                    {metadataSelected.length === 0 ? (
                      <p className="endpoint-hint">No selected metadata.</p>
                    ) : (
                      <ul>
                        {metadataSelected.map((entry) => (
                          <li key={entry.type}>
                            <strong>{entry.type}</strong>
                            {entry.members && entry.members.length > 0 ? ` (${entry.members.length} members)` : ' (entire type)'}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="row">
                    <label htmlFor="metadataAutoRefresh">Auto Refresh Graph</label>
                    <input id="metadataAutoRefresh" type="checkbox" checked={metadataAutoRefresh} onChange={(e) => setMetadataAutoRefresh(e.target.checked)} />
                  </div>
                  <button type="button" onClick={() => { syncSelectionsRaw(metadataSelected); void runQuery('metadataRetrieve'); }} disabled={loading || metadataSelected.length === 0}>
                    Retrieve Selected
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {uiTab === 'refresh' ? (
            <>
              <h2>Refresh & Build</h2>
              <div className="row">
                <label htmlFor="refreshMode">Refresh Mode</label>
                <select id="refreshMode" value={refreshMode} onChange={(e) => setRefreshMode(e.target.value as 'full' | 'incremental')}>
                  <option value="incremental">incremental</option>
                  <option value="full">full</option>
                </select>
              </div>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('refresh')} disabled={loading}>Run Refresh</button>
              </div>
              <h3>Compare Snapshots</h3>
              <div className="row">
                <label htmlFor="fromSnapshot">From Snapshot ID</label>
                <input id="fromSnapshot" value={fromSnapshot} onChange={(e) => setFromSnapshot(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="toSnapshot">To Snapshot ID</label>
                <input id="toSnapshot" value={toSnapshot} onChange={(e) => setToSnapshot(e.target.value)} />
              </div>
              <button type="button" onClick={() => void runQuery('refreshDiff')} disabled={loading}>Run Diff</button>
              <p className="endpoint-hint">Next step: Analyze tab for permissions/automation/impact review.</p>
            </>
          ) : null}

          {uiTab === 'analyze' ? (
            <>
              <h2>Analyze</h2>
              <div className="tab-row">
                {([
                  ['perms', 'Permissions'],
                  ['automation', 'Automation'],
                  ['impact', 'Impact']
                ] as Array<[AnalyzeTab, string]>).map(([key, label]) => (
                  <button key={key} type="button" className={analyzeTab === key ? 'tab active' : 'tab'} onClick={() => setAnalyzeTab(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="row">
                <label htmlFor="user">User</label>
                <input id="user" value={user} onChange={(e) => setUser(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="object">Object</label>
                <input id="object" value={objectName} onChange={(e) => setObjectName(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="field">Field</label>
                <input id="field" value={fieldName} onChange={(e) => setFieldName(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="limitRaw">Limit</label>
                <input id="limitRaw" value={limitRaw} onChange={(e) => setLimitRaw(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="strictMode">Strict Mode</label>
                <input id="strictMode" type="checkbox" checked={strictMode} onChange={(e) => setStrictMode(e.target.checked)} />
              </div>
              <div className="row">
                <label htmlFor="explainMode">Explain Mode</label>
                <input id="explainMode" type="checkbox" checked={explainMode} onChange={(e) => setExplainMode(e.target.checked)} />
              </div>
              <button type="button" onClick={() => void runQuery(analyzeTab === 'perms' ? 'perms' : analyzeTab === 'automation' ? 'automation' : 'impact')} disabled={loading}>
                Run {analyzeTab === 'perms' ? 'Permissions' : analyzeTab === 'automation' ? 'Automation' : 'Impact'} Analysis
              </button>
              {analyzeTab === 'perms' ? (
                <button type="button" onClick={() => void runQuery('permsDiagnose')} disabled={loading}>
                  Diagnose User Mapping
                </button>
              ) : null}
            </>
          ) : null}

          {uiTab === 'ask' ? (
            <>
              <h2>Ask</h2>
              <p className="endpoint-hint">Deterministic summary first, proof envelope second.</p>
              <div className="row">
                <label htmlFor="askQuery">Question</label>
                <textarea id="askQuery" value={askQuery} onChange={(e) => setAskQuery(e.target.value)} rows={4} />
              </div>
              <div className="row">
                <label htmlFor="maxCitations">Max Citations</label>
                <input id="maxCitations" value={maxCitationsRaw} onChange={(e) => setMaxCitationsRaw(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="consistencyCheck">Consistency Check</label>
                <input id="consistencyCheck" type="checkbox" checked={consistencyCheck} onChange={(e) => setConsistencyCheck(e.target.checked)} />
              </div>
              <button type="button" onClick={() => void runQuery('ask')} disabled={loading}>Run Ask</button>
            </>
          ) : null}

          {uiTab === 'proofs' ? (
            <>
              <h2>Proofs & Metrics</h2>
              <div className="row">
                <label htmlFor="proofId">Proof ID</label>
                <input id="proofId" value={proofId} onChange={(e) => setProofId(e.target.value)} />
              </div>
              <div className="row">
                <label htmlFor="replayToken">Replay Token</label>
                <input id="replayToken" value={replayToken} onChange={(e) => setReplayToken(e.target.value)} />
              </div>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('askProofsRecent')} disabled={loading}>List Recent Proofs</button>
                <button type="button" onClick={() => void runQuery('askProof')} disabled={loading || proofId.trim().length === 0}>Get Proof</button>
                <button type="button" onClick={() => void runQuery('askReplay')} disabled={loading || (replayToken.trim().length === 0 && proofId.trim().length === 0)}>Replay Proof</button>
                <button type="button" onClick={() => void runQuery('askMetrics')} disabled={loading}>Export Metrics</button>
                <button type="button" onClick={() => void runQuery('askTrustDashboard')} disabled={loading}>Trust Dashboard</button>
              </div>
              <p className="endpoint-hint">Tip: run \"List Recent Proofs\" first, then paste proofId/replayToken.</p>
            </>
          ) : null}

          {uiTab === 'simulate' ? (
            <>
              <h2>What-If Simulation</h2>
              <p className="endpoint-hint">Run deterministic scenario scoring before release decisions.</p>
              <div className="row">
                <label htmlFor="simProfile">Risk Profile</label>
                <select
                  id="simProfile"
                  value={simProfile}
                  onChange={(e) => setSimProfile(e.target.value as 'strict' | 'balanced' | 'exploratory')}
                >
                  <option value="strict">strict</option>
                  <option value="balanced">balanced</option>
                  <option value="exploratory">exploratory</option>
                </select>
              </div>
              <div className="row">
                <label htmlFor="simChangesRaw">Scenario A Changes (JSON Array)</label>
                <textarea
                  id="simChangesRaw"
                  value={simChangesRaw}
                  onChange={(e) => setSimChangesRaw(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="row">
                <label htmlFor="simScenarioBRaw">Scenario B Changes (for Compare)</label>
                <textarea
                  id="simScenarioBRaw"
                  value={simScenarioBRaw}
                  onChange={(e) => setSimScenarioBRaw(e.target.value)}
                  rows={8}
                />
              </div>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('askArchitecture')} disabled={loading}>
                  Baseline Decision
                </button>
                <button type="button" onClick={() => void runQuery('askSimulate')} disabled={loading}>
                  Simulate Scenario A
                </button>
                <button type="button" onClick={() => void runQuery('askSimulateCompare')} disabled={loading}>
                  Compare A vs B
                </button>
              </div>
            </>
          ) : null}

          {uiTab === 'system' ? (
            <>
              <h2>System</h2>
              <p className="endpoint-hint">Endpoint hint: {endpointHint}</p>
              <div className="action-row">
                <button type="button" onClick={() => void runQuery('metaContext')} disabled={loading}>Meta Context</button>
                <button type="button" onClick={() => void runQuery('metaAdapt')} disabled={loading}>Meta Adapt (Dry Run)</button>
                <button type="button" onClick={() => void runQuery('orgStatus')} disabled={loading}>Org Status</button>
              </div>
              <h3>Action Telemetry</h3>
              {Object.keys(actionCounts).length === 0 ? (
                <p className="endpoint-hint">No actions tracked yet.</p>
              ) : (
                <ul>
                  {Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).map(([action, count]) => (
                    <li key={action}>{action}: {count}</li>
                  ))}
                </ul>
              )}
              {operatorErrors.length > 0 ? (
                <>
                  <h3>Recent Errors</h3>
                  <ul>
                    {operatorErrors.slice(0, 10).map((item) => (
                      <li key={`${item.at}-${item.category}`}>{item.category}: {item.message}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : null}
        </section>

        <section className="panel response-panel">
          <div className="response-header">
            <h2>Result</h2>
            <button type="button" onClick={copyResponse} disabled={!responseText}>{copied ? 'Copied' : 'Copy JSON'}</button>
          </div>
          {errorText ? <p className="error-text">{errorText}</p> : null}
          {askPayload ? (
            <div className="ask-grid">
              <details open>
                <summary>Deterministic Summary</summary>
                <p>{askPayload.answer || 'No deterministic summary returned.'}</p>
                <p className="endpoint-hint">confidence: {typeof askPayload.confidence === 'number' ? askPayload.confidence : 'n/a'}</p>
              </details>
              <details open>
                <summary>Proof + Trust</summary>
                <p className="endpoint-hint">trustLevel: {askPayload.trustLevel ?? 'n/a'}</p>
                <p className="endpoint-hint">policyId: {askPayload.policy?.policyId ?? 'n/a'}</p>
                <p className="endpoint-hint">proofId: {askPayload.proof?.proofId ?? 'n/a'}</p>
                <p className="endpoint-hint">snapshotId: {askPayload.proof?.snapshotId ?? 'n/a'}</p>
              </details>
            </div>
          ) : null}
          {askPayload ? (
            <details>
              <summary>Optional Elaboration</summary>
              <button type="button" onClick={runAskElaboration} disabled={askElaborationLoading}>
                {askElaborationLoading ? 'Generating...' : 'Generate Elaboration'}
              </button>
              {askElaboration ? <pre>{askElaboration}</pre> : null}
            </details>
          ) : null}
          <details open>
            <summary>Raw JSON</summary>
            <pre>{responseText || '{\n  "hint": "Run an action to view response"\n}'}</pre>
          </details>
          {readyDetails ? (
            <details>
              <summary>Ready Details</summary>
              <pre>{readyDetails}</pre>
            </details>
          ) : null}
        </section>
      </section>
    </main>
  );
}
