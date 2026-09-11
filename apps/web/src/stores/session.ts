/**
 * @fileoverview Zustand stores for UI-only state (palette open, drawer
 * state, selected session) and the session-scoped API/WS tokens.
 * Server state lives in TanStack Query.
 */

import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface UiState {
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
}

/**
 * Global UI store. Persisted to localStorage for the theme-related
 * bits; the rest is session-local.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      paletteOpen: false,
      setPaletteOpen: (v) => {
        set({paletteOpen: v});
      },
      drawerOpen: false,
      setDrawerOpen: (v) => {
        set({drawerOpen: v});
      },
      selectedSessionId: null,
      setSelectedSessionId: (id) => {
        set({selectedSessionId: id});
      },
    }),
    {name: 'magic-ui', partialize: (s) => ({selectedSessionId: s.selectedSessionId})},
  ),
);

interface SessionTokenState {
  sessionId: string | null;
  wsToken: string | null;
  apiToken: string | null;
  setSession: (sessionId: string, wsToken: string, apiToken?: string) => void;
  clearSession: () => void;
}

/**
 * Per-tab session token store. WS tokens are short-lived (24h) so we
 * keep the store in \`sessionStorage\` — closing the tab discards it,
 * never \`localStorage\`, which would persist across tabs.
 */
export const useSessionTokenStore = create<SessionTokenState>()(
  persist(
    (set) => ({
      sessionId: null,
      wsToken: null,
      apiToken: null,
      setSession: (sessionId, wsToken, apiToken) => {
        set({sessionId, wsToken, apiToken: apiToken ?? null});
      },
      clearSession: () => {
        set({sessionId: null, wsToken: null, apiToken: null});
      },
    }),
    {
      name: 'magic-session-token',
      storage: createJSONStorage(() =>
        typeof window === 'undefined' ? noopStorage() : window.sessionStorage,
      ),
    },
  ),
);

/**
 * Storage shim for SSR contexts (the React build never runs there,
 * but tests may).
 */
function noopStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (k) => store.get(k) ?? null,
    key: (i) => [...store.keys()][i] ?? null,
    removeItem: (k) => {
      store.delete(k);
    },
    setItem: (k, v) => {
      store.set(k, v);
    },
  };
}