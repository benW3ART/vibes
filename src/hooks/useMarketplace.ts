import { useState, useEffect, useCallback } from 'react';
import { marketplaceService } from '@/services/marketplaceService';
import type { MarketplaceItem, MarketplaceSource, InstalledItem } from '@/types/marketplace';
import { DEFAULT_MARKETPLACE_SOURCES } from '@/types/marketplace';

interface UseMarketplaceResult {
  sources: MarketplaceSource[];
  items: MarketplaceItem[];
  installed: InstalledItem[];
  isLoading: boolean;
  error: string | null;
  refreshSources: () => Promise<void>;
  installItem: (item: MarketplaceItem, projectPath: string) => Promise<{ success: boolean; error?: string }>;
  addSource: (source: Omit<MarketplaceSource, 'id'>) => void;
  removeSource: (sourceId: string) => void;
  toggleSource: (sourceId: string, enabled: boolean) => void;
}

export function useMarketplace(): UseMarketplaceResult {
  const [sources, setSources] = useState<MarketplaceSource[]>(DEFAULT_MARKETPLACE_SOURCES);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [installed, setInstalled] = useState<InstalledItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sources from settings
  useEffect(() => {
    const savedSources = localStorage.getItem('vibes-marketplace-sources');
    if (savedSources) {
      try {
        setSources(JSON.parse(savedSources));
      } catch {
        setSources(DEFAULT_MARKETPLACE_SOURCES);
      }
    }

    const savedInstalled = localStorage.getItem('vibes-marketplace-installed');
    if (savedInstalled) {
      try {
        setInstalled(JSON.parse(savedInstalled));
      } catch {
        setInstalled([]);
      }
    }
  }, []);

  // Save sources to settings
  useEffect(() => {
    localStorage.setItem('vibes-marketplace-sources', JSON.stringify(sources));
  }, [sources]);

  // Save installed to settings
  useEffect(() => {
    localStorage.setItem('vibes-marketplace-installed', JSON.stringify(installed));
  }, [installed]);

  // Refresh all enabled sources
  const refreshSources = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const enabledSources = sources.filter(s => s.enabled);
      const allItems: MarketplaceItem[] = [];

      for (const source of enabledSources) {
        const sourceItems = await marketplaceService.fetchItems(source);
        allItems.push(...sourceItems);
      }

      setItems(allItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch marketplace items');
    } finally {
      setIsLoading(false);
    }
  }, [sources]);

  // Initial fetch
  useEffect(() => {
    refreshSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run only on mount
  }, []);

  // Install an item
  const installItem = useCallback(async (
    item: MarketplaceItem,
    projectPath: string
  ): Promise<{ success: boolean; error?: string }> => {
    const result = await marketplaceService.installItem(item, projectPath);

    if (result.success) {
      const newInstalled: InstalledItem = {
        id: `installed-${Date.now()}`,
        itemId: item.id,
        type: item.type,
        installedAt: new Date(),
        path: result.path!,
        enabled: true,
        source: item.source,
      };

      setInstalled(prev => [...prev, newInstalled]);
    }

    return result;
  }, []);

  // Add a custom source
  const addSource = useCallback((source: Omit<MarketplaceSource, 'id'>) => {
    const newSource: MarketplaceSource = {
      ...source,
      id: `custom-${Date.now()}`,
    };
    setSources(prev => [...prev, newSource]);
  }, []);

  // Remove a source
  const removeSource = useCallback((sourceId: string) => {
    setSources(prev => prev.filter(s => s.id !== sourceId));
  }, []);

  // Toggle source enabled status
  const toggleSource = useCallback((sourceId: string, enabled: boolean) => {
    setSources(prev => prev.map(s =>
      s.id === sourceId ? { ...s, enabled } : s
    ));
  }, []);

  return {
    sources,
    items,
    installed,
    isLoading,
    error,
    refreshSources,
    installItem,
    addSource,
    removeSource,
    toggleSource,
  };
}
