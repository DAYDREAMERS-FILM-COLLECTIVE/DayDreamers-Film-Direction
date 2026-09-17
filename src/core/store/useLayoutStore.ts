/**
 * src/core/store/useLayoutStore.ts
 * Central store for global layout state: burger menu room, 1600ms body-class timeline, page transitions, and cursor badges.
 */

import { create } from 'zustand';
import { PageRoute, CursorMode } from '../types';

export type MenuTimelineStage = 'idle' | 'running-open' | 'active' | 'open' | 'closing';

interface LayoutState {
  currentRoute: PageRoute;
  isMenuOpen: boolean;
  isMenuRunning: boolean;
  menuStage: MenuTimelineStage;
  isTransitioning: boolean;
  cursorMode: CursorMode;
  cursorLabel: string | null;

  // Actions
  setRoute: (route: PageRoute) => void;
  showMenu: () => void;
  hideMenu: () => void;
  toggleMenu: () => void;
  setMenuOpen: (open: boolean) => void;
  setTransitioning: (transitioning: boolean) => void;
  setCursor: (mode: CursorMode, label?: string | null) => void;
  resetCursor: () => void;
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  currentRoute: 'home',
  isMenuOpen: false,
  isMenuRunning: false,
  menuStage: 'idle',
  isTransitioning: false,
  cursorMode: 'DEFAULT',
  cursorLabel: null,

  setRoute: (currentRoute) => set({ currentRoute }),

  showMenu: () => {
    const { isMenuRunning, isMenuOpen } = get();
    if (isMenuRunning || isMenuOpen) return;

    set({ isMenuRunning: true, isMenuOpen: true, menuStage: 'running-open' });

    // 200ms: theme active
    setTimeout(() => {
      set({ menuStage: 'active' });
    }, 200);

    // 800ms: 50% curtain threshold, room revealed, cascade begins
    setTimeout(() => {
      set({ menuStage: 'open' });
    }, 800);

    // 1600ms: interactive again
    setTimeout(() => {
      set({ isMenuRunning: false });
    }, 1600);
  },

  hideMenu: () => {
    const { isMenuRunning, isMenuOpen } = get();
    if (isMenuRunning || !isMenuOpen) return;

    set({ isMenuRunning: true, menuStage: 'closing' });

    // 800ms: curtain covers teardown
    setTimeout(() => {
      set({ isMenuOpen: false });
    }, 800);

    // 1600ms: timeline ends, interactive again
    setTimeout(() => {
      set({ isMenuRunning: false, menuStage: 'idle' });
    }, 1600);
  },

  toggleMenu: () => {
    const { isMenuRunning, isMenuOpen, showMenu, hideMenu } = get();
    if (isMenuRunning) return;
    if (isMenuOpen) {
      hideMenu();
    } else {
      showMenu();
    }
  },

  setMenuOpen: (isMenuOpen) => set({ isMenuOpen }),

  setTransitioning: (isTransitioning) => set({ isTransitioning }),

  setCursor: (cursorMode, cursorLabel = null) =>
    set({
      cursorMode,
      cursorLabel: cursorLabel || (cursorMode !== 'DEFAULT' ? cursorMode : null)
    }),

  resetCursor: () => set({ cursorMode: 'DEFAULT', cursorLabel: null })
}));
