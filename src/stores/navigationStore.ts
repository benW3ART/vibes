import { create } from 'zustand';
import type { ScreenId } from '@/types';

interface NavigationState {
  currentScreen: ScreenId;
  chatPanelOpen: boolean;
  xrayPanelOpen: boolean;
  commandPaletteOpen: boolean;

  setScreen: (screen: ScreenId) => void;
  setChatPanelOpen: (open: boolean) => void;
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

  setScreen: (screen) => set({ currentScreen: screen }),
  setChatPanelOpen: (open) => set((state) => ({
    chatPanelOpen: open,
    xrayPanelOpen: open ? false : state.xrayPanelOpen
  })),
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
    commandPaletteOpen: false
  }),
}));
