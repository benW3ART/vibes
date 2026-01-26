// Marketplace Types

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  type: 'skill' | 'mcp';
  source: string; // GitHub repo URL
  path: string; // Path within repo
  readme?: string;
  stars?: number;
  lastUpdated?: string;
  tags?: string[];
}

export interface MarketplaceSource {
  id: string;
  name: string;
  url: string; // GitHub repo URL (e.g., 'modelcontextprotocol/servers')
  type: 'official' | 'community' | 'custom';
  enabled: boolean;
}

export interface InstalledItem {
  id: string;
  itemId: string;
  type: 'skill' | 'mcp';
  installedAt: Date;
  path: string; // Local path where installed
  enabled: boolean;
  source: string; // Original source URL
}

export interface MarketplaceState {
  sources: MarketplaceSource[];
  items: MarketplaceItem[];
  installed: InstalledItem[];
  isLoading: boolean;
  error: string | null;
}

// Default marketplace sources
export const DEFAULT_MARKETPLACE_SOURCES: MarketplaceSource[] = [
  {
    id: 'mcp-official',
    name: 'MCP Official Servers',
    url: 'modelcontextprotocol/servers',
    type: 'official',
    enabled: true,
  },
];
