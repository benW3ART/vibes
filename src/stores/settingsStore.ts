import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  showLineNumbers: boolean;
  autoSave: boolean;
  notifications: boolean;
  soundEffects: boolean;

  // Claude settings (GLOBAL)
  claudeModelId: string | null;

  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;
  setShowLineNumbers: (show: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setClaudeModelId: (modelId: string | null) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  theme: 'dark' as const,
  fontSize: 'md' as const,
  showLineNumbers: true,
  autoSave: true,
  notifications: true,
  soundEffects: false,
  claudeModelId: null as string | null,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setTheme: (theme) => set({ theme }),
      setFontSize: (fontSize) => set({ fontSize }),
      setShowLineNumbers: (showLineNumbers) => set({ showLineNumbers }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setNotifications: (notifications) => set({ notifications }),
      setSoundEffects: (soundEffects) => set({ soundEffects }),
      setClaudeModelId: (claudeModelId) => set({ claudeModelId }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'vibes-settings',
    }
  )
);
