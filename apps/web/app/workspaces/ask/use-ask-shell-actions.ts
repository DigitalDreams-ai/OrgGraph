type AskShellTab = 'connect' | 'browser' | 'refresh' | 'analyze' | 'proofs';
type AnalyzeMode = 'automation' | 'perms';

type AskShellActionsOptions = {
  askProofId: string;
  askReplayToken: string;
  maxCitationsRaw: string;
  parseOptionalInt: (raw: string) => number | undefined;
  runAsk: (maxCitations: number) => Promise<void>;
  runAskElaboration: (maxCitations: number) => Promise<void>;
  loadAliases: () => Promise<unknown>;
  setAnalyzeMode: (mode: AnalyzeMode) => void;
  syncProofs: (proofId: string, replayToken: string) => void;
  setUiTab: (tab: AskShellTab) => void;
};

export function useAskShellActions(options: AskShellActionsOptions) {
  function resolveMaxCitations(): number {
    return options.parseOptionalInt(options.maxCitationsRaw) ?? 5;
  }

  return {
    runAsk: () => options.runAsk(resolveMaxCitations()),
    runAskElaboration: () => options.runAskElaboration(resolveMaxCitations()),
    openConnect: () => options.setUiTab('connect'),
    refreshAliases: () => options.loadAliases(),
    openBrowser: () => options.setUiTab('browser'),
    openRefresh: () => options.setUiTab('refresh'),
    inspectAutomation: () => {
      options.setAnalyzeMode('automation');
      options.setUiTab('analyze');
    },
    inspectPermissions: () => {
      options.setAnalyzeMode('perms');
      options.setUiTab('analyze');
    },
    openProof: () => {
      options.syncProofs(options.askProofId, options.askReplayToken);
      options.setUiTab('proofs');
    }
  };
}
