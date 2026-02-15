import { create } from 'zustand';
import type { ScreenId } from '@/types';

// Context to pass when opening chat from a specific phase/sub-phase
export interface ChatContext {
  phase?: string;
  subPhase?: string;
  prefillMessage?: string;
}

interface NavigationState {
  currentScreen: ScreenId;
  chatPanelOpen: boolean;
  xrayPanelOpen: boolean;
  commandPaletteOpen: boolean;
  chatContext: ChatContext | null;

  setScreen: (screen: ScreenId) => void;
  setChatPanelOpen: (open: boolean) => void;
  setChatContext: (context: ChatContext | null) => void;
  toggleChatPanel: () => void;
  toggleXrayPanel: () => void;
  toggleCommandPalette: () => void;
  closeAllPanels: () => void;
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentScreen: 'dashboard',
  chatPanelOpen: false,
  xrayPanelOpen: false,
  commandPaletteOpen: false,
  chatContext: null,

  setScreen: (screen) => set({ currentScreen: screen }),
  setChatPanelOpen: (open) => set((state) => ({
    chatPanelOpen: open,
    xrayPanelOpen: open ? false : state.xrayPanelOpen
  })),
  setChatContext: (context) => set({ chatContext: context }),
  toggleChatPanel: () => set((state) => ({
    chatPanelOpen: !state.chatPanelOpen,
    xrayPanelOpen: false
  })),
  toggleXrayPanel: () => set((state) => ({
    xrayPanelOpen: !state.xrayPanelOpen,
    chatPanelOpen: false
  })),
  toggleCommandPalette: () => set((state) => ({
    commandPaletteOpen: !state.commandPaletteOpen
  })),
  closeAllPanels: () => set({
    chatPanelOpen: false,
    xrayPanelOpen: false,
    commandPaletteOpen: false,
    chatContext: null
  }),
}));
