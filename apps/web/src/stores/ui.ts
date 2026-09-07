/**
 * @fileoverview Zustand store for UI-only state (palette open, drawer
 * state, selected session). Server state lives in TanStack Query.
 */

import {create} from 'zustand';
import {persist} from 'zustand/middleware';

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
