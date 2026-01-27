import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ModelTier = 'auto' | 'opus' | 'sonnet' | 'haiku';

interface SettingsState {
  theme: 'dark' | 'light' | 'system';
  fontSize: 'sm' | 'md' | 'lg';
  showLineNumbers: boolean;
  autoSave: boolean;
  notifications: boolean;
  soundEffects: boolean;

  // Claude settings (GLOBAL)
  // Changed from claudeModelId to tier-based preference
  preferredTier: ModelTier;
  lastUsedModelId: string | null; // For upgrade detection

  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setFontSize: (size: 'sm' | 'md' | 'lg') => void;
  setShowLineNumbers: (show: boolean) => void;
  setAutoSave: (enabled: boolean) => void;
  setNotifications: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setPreferredTier: (tier: ModelTier) => void;
  setLastUsedModelId: (modelId: string | null) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  theme: 'dark' as const,
  fontSize: 'md' as const,
  showLineNumbers: true,
  autoSave: true,
  notifications: true,
  soundEffects: false,
  preferredTier: 'auto' as ModelTier,
  lastUsedModelId: null as string | null,
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
      setPreferredTier: (preferredTier) => set({ preferredTier }),
      setLastUsedModelId: (lastUsedModelId) => set({ lastUsedModelId }),
      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'vibes-settings',
      // Migration: convert old claudeModelId to preferredTier
      migrate: (persistedState: unknown, _version: number) => {
        const state = persistedState as Record<string, unknown>;

        // Migrate from old claudeModelId to preferredTier
        if (state.claudeModelId && !state.preferredTier) {
          const modelId = state.claudeModelId as string;
          let tier: ModelTier = 'auto';

          if (modelId.includes('opus')) tier = 'opus';
          else if (modelId.includes('sonnet')) tier = 'sonnet';
          else if (modelId.includes('haiku')) tier = 'haiku';

          return {
            ...state,
            preferredTier: tier,
            lastUsedModelId: modelId,
            claudeModelId: undefined, // Remove old field
          };
        }

        return state;
      },
      version: 1,
    }
  )
);
