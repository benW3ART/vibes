import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ConnectionType = 'claude' | 'github' | 'custom';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface Connection {
  id: string;
  type: ConnectionType;
  name: string;
  status: ConnectionStatus;
  lastConnected?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
}

interface ConnectionsState {
  connections: Connection[];
  isConnecting: ConnectionType | null;

  // GitHub token stored in memory (loaded from secure storage)
  githubToken: string | null;

  // Actions
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  setConnecting: (type: ConnectionType | null) => void;

  // Secure GitHub token management
  setGitHubToken: (token: string | null) => void;
  loadGitHubToken: () => Promise<void>;
  saveGitHubToken: (token: string, username: string) => Promise<boolean>;
  clearGitHubToken: () => Promise<void>;

  // Connection status helpers
  isClaudeConnected: () => boolean;
  isGitHubConnected: () => boolean;
  getConnection: (type: ConnectionType) => Connection | undefined;
  getGitHubToken: () => string | null;
}

export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => ({
      connections: [],
      isConnecting: null,
      githubToken: null,

      addConnection: (connection) => set((state) => ({
        connections: [
          ...state.connections.filter(c => c.type !== connection.type), // Replace existing of same type
          { ...connection, id: `${connection.type}-${Date.now()}` }
        ]
      })),

      updateConnection: (id, updates) => set((state) => ({
        connections: state.connections.map(c =>
          c.id === id ? { ...c, ...updates } : c
        )
      })),

      removeConnection: (id) => set((state) => ({
        connections: state.connections.filter(c => c.id !== id)
      })),

      setConnecting: (type) => set({ isConnecting: type }),

      // Set GitHub token in memory
      setGitHubToken: (token) => set({ githubToken: token }),

      // Load GitHub token from secure storage on app start
      loadGitHubToken: async () => {
        if (typeof window === 'undefined' || !window.electron) return;

        try {
          const result = await window.electron.github.loadToken();
          if (result.success && result.token) {
            set({ githubToken: result.token });

            // Update connection status if we have a stored token
            const state = get();
            const githubConn = state.connections.find(c => c.type === 'github');
            if (githubConn) {
              set({
                connections: state.connections.map(c =>
                  c.type === 'github'
                    ? { ...c, status: 'connected' as ConnectionStatus, metadata: { ...c.metadata, username: result.username } }
                    : c
                )
              });
            } else if (result.username) {
              // Create connection entry if token exists but no connection record
              set({
                connections: [
                  ...state.connections,
                  {
                    id: `github-${Date.now()}`,
                    type: 'github',
                    name: 'GitHub',
                    status: 'connected',
                    lastConnected: new Date(result.savedAt || Date.now()),
                    metadata: { username: result.username }
                  }
                ]
              });
            }
          }
        } catch (err) {
          console.error('[ConnectionsStore] Failed to load GitHub token:', err);
        }
      },

      // Save GitHub token to secure storage
      saveGitHubToken: async (token, username) => {
        if (typeof window === 'undefined' || !window.electron) return false;

        try {
          const result = await window.electron.github.saveToken(token, username);
          if (result.success) {
            set({ githubToken: token });
            return true;
          }
          console.error('[ConnectionsStore] Failed to save token:', result.error);
          return false;
        } catch (err) {
          console.error('[ConnectionsStore] Failed to save GitHub token:', err);
          return false;
        }
      },

      // Clear GitHub token from secure storage
      clearGitHubToken: async () => {
        if (typeof window === 'undefined' || !window.electron) return;

        try {
          await window.electron.github.clearToken();
          set({ githubToken: null });
        } catch (err) {
          console.error('[ConnectionsStore] Failed to clear GitHub token:', err);
        }
      },

      isClaudeConnected: () => {
        const connection = get().connections.find(c => c.type === 'claude');
        return connection?.status === 'connected';
      },

      isGitHubConnected: () => {
        const connection = get().connections.find(c => c.type === 'github');
        const hasToken = !!get().githubToken;
        return connection?.status === 'connected' && hasToken;
      },

      getConnection: (type) => {
        return get().connections.find(c => c.type === type);
      },

      getGitHubToken: () => get().githubToken,
    }),
    {
      name: 'vibes-connections',
      // Only persist connection metadata, not tokens
      // Token is stored securely via Electron's safeStorage
      partialize: (state) => ({
        connections: state.connections.map(c => ({
          ...c,
          // Don't persist accessToken in metadata (now using secure storage)
          metadata: c.type === 'github'
            ? { username: (c.metadata as { username?: string })?.username }
            : c.metadata
        })),
        isConnecting: null,
        // githubToken is NOT persisted - loaded from secure storage on init
      }),
    }
  )
);

// Initialize: Load GitHub token from secure storage on app start
if (typeof window !== 'undefined') {
  // Delay to ensure electron bridge is ready
  setTimeout(() => {
    if (window.electron?.github && typeof window.electron.github.loadToken === 'function') {
      useConnectionsStore.getState().loadGitHubToken();
    }
  }, 500);
}
