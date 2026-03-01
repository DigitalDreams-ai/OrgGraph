'use client';

import { useEffect } from 'react';

interface UseShellPreferencesOptions<TTab extends string> {
  uiTab: TTab;
  setUiTab: (value: TTab) => void;
  orgAlias: string;
  setOrgAlias: (value: string) => void;
  askQuery: string;
  setAskQuery: (value: string) => void;
  onHydrated?: () => void;
}

export function useShellPreferences<TTab extends string>(options: UseShellPreferencesOptions<TTab>) {
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem('orgumented.newui.tab') as TTab | null;
      if (savedTab) options.setUiTab(savedTab);
      const savedAlias = localStorage.getItem('orgumented.newui.alias');
      if (savedAlias) options.setOrgAlias(savedAlias);
      const savedAsk = localStorage.getItem('orgumented.newui.ask');
      if (savedAsk) options.setAskQuery(savedAsk);
    } catch {
      // ignore
    }

    options.onHydrated?.();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('orgumented.newui.tab', options.uiTab);
      localStorage.setItem('orgumented.newui.alias', options.orgAlias);
      localStorage.setItem('orgumented.newui.ask', options.askQuery);
    } catch {
      // ignore
    }
  }, [options.uiTab, options.orgAlias, options.askQuery]);
}
