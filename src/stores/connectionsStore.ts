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

  // Actions
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  setConnecting: (type: ConnectionType | null) => void;

  // Connection status helpers
  isClaudeConnected: () => boolean;
  isGitHubConnected: () => boolean;
  getConnection: (type: ConnectionType) => Connection | undefined;
}

export const useConnectionsStore = create<ConnectionsState>()(
  persist(
    (set, get) => ({
      connections: [],
      isConnecting: null,

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

      isClaudeConnected: () => {
        const connection = get().connections.find(c => c.type === 'claude');
        return connection?.status === 'connected';
      },

      isGitHubConnected: () => {
        const connection = get().connections.find(c => c.type === 'github');
        return connection?.status === 'connected';
      },

      getConnection: (type) => {
        return get().connections.find(c => c.type === type);
      },
    }),
    {
      name: 'vibes-connections',
      // SEC-001 FIX: Exclude sensitive tokens from localStorage persistence
      partialize: (state) => ({
        connections: state.connections.map(c => ({
          ...c,
          metadata: c.type === 'github'
            ? { username: (c.metadata as { username?: string })?.username } // Exclude accessToken
            : c.metadata
        })),
        isConnecting: null,
      }),
    }
  )
);
