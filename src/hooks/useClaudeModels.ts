import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettingsStore, type ModelTier } from '@/stores/settingsStore';

export interface ClaudeModel {
  id: string;
  name: string;
  tier: 'opus' | 'sonnet' | 'haiku';
  version?: ModelVersion;
}

export interface ModelVersion {
  tier: string;
  major: number;
  minor: number;
  date: number; // YYYYMMDD format
}

interface UseClaudeModelsResult {
  models: ClaudeModel[];
  selectedModel: ClaudeModel | null;
  isLoading: boolean;
  error: string | null;
  isUpgraded: boolean;
  upgradedFrom: string | null;
  refresh: () => Promise<void>;
}

// Default models as fallback
const DEFAULT_MODELS: ClaudeModel[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'sonnet' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'opus' },
  { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', tier: 'haiku' },
];

// Parse model ID to extract version information
// Examples: claude-opus-4-20250514, claude-opus-4-5-20251015, claude-sonnet-4-20250514
export function parseModelVersion(modelId: string): ModelVersion | null {
  // Pattern: claude-{tier}-{major}[-{minor}]-{date}
  const match = modelId.match(/claude-(\w+)-(\d+)(?:-(\d+))?-(\d{8})/);
  if (!match) return null;

  return {
    tier: match[1],
    major: parseInt(match[2], 10),
    minor: match[3] ? parseInt(match[3], 10) : 0,
    date: parseInt(match[4], 10),
  };
}

// Compare two versions, return positive if a > b, negative if a < b, 0 if equal
export function compareVersions(a: ModelVersion, b: ModelVersion): number {
  // First compare by major version
  if (a.major !== b.major) return a.major - b.major;
  // Then by minor version
  if (a.minor !== b.minor) return a.minor - b.minor;
  // Finally by date
  return a.date - b.date;
}

// Format a human-readable version string
export function formatVersion(version: ModelVersion): string {
  const minor = version.minor > 0 ? `.${version.minor}` : '';
  const date = String(version.date);
  const formattedDate = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
  return `${version.major}${minor} (${formattedDate})`;
}

// Get the latest model for a given tier
function getLatestModelForTier(models: ClaudeModel[], tier: string): ClaudeModel | null {
  const tierModels = models.filter(m => m.tier === tier && m.version);
  if (tierModels.length === 0) return null;

  return tierModels.reduce((latest, current) => {
    if (!latest.version || !current.version) return latest;
    return compareVersions(current.version, latest.version) > 0 ? current : latest;
  });
}

// Determine the default tier based on available models (prefer sonnet)
function getDefaultTier(models: ClaudeModel[]): 'opus' | 'sonnet' | 'haiku' {
  const hasSonnet = models.some(m => m.tier === 'sonnet');
  if (hasSonnet) return 'sonnet';
  const hasOpus = models.some(m => m.tier === 'opus');
  if (hasOpus) return 'opus';
  return 'haiku';
}

export function useClaudeModels(): UseClaudeModelsResult {
  const [models, setModels] = useState<ClaudeModel[]>(DEFAULT_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpgraded, setIsUpgraded] = useState(false);
  const [upgradedFrom, setUpgradedFrom] = useState<string | null>(null);

  const { preferredTier, lastUsedModelId, setLastUsedModelId } = useSettingsStore();

  // Add version info to models
  const modelsWithVersions = useMemo(() => {
    return models.map(model => ({
      ...model,
      version: parseModelVersion(model.id) ?? undefined,
    }));
  }, [models]);

  // Select the best model based on preferred tier
  const selectedModel = useMemo(() => {
    if (modelsWithVersions.length === 0) return null;

    // If auto, use sonnet as default
    const tier = preferredTier === 'auto'
      ? getDefaultTier(modelsWithVersions)
      : preferredTier;

    const latest = getLatestModelForTier(modelsWithVersions, tier);
    return latest || modelsWithVersions[0];
  }, [modelsWithVersions, preferredTier]);

  // Check for upgrade when selected model changes
  useEffect(() => {
    if (!selectedModel) return;

    if (lastUsedModelId && lastUsedModelId !== selectedModel.id) {
      const lastVersion = parseModelVersion(lastUsedModelId);
      const newVersion = selectedModel.version;

      // Only show upgrade notification if same tier but newer version
      if (lastVersion && newVersion && lastVersion.tier === newVersion.tier) {
        if (compareVersions(newVersion, lastVersion) > 0) {
          setIsUpgraded(true);
          setUpgradedFrom(lastUsedModelId);
        }
      }
    }

    // Update last used model
    setLastUsedModelId(selectedModel.id);
  }, [selectedModel, lastUsedModelId, setLastUsedModelId]);

  const fetchModels = useCallback(async () => {
    if (!window.electron) {
      // Browser mode - use defaults with versions
      setModels(DEFAULT_MODELS);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsUpgraded(false);
    setUpgradedFrom(null);

    try {
      const result = await window.electron.claude.models();
      if (result.models && result.models.length > 0) {
        setModels(result.models as ClaudeModel[]);
      } else {
        setModels(DEFAULT_MODELS);
      }
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
      setModels(DEFAULT_MODELS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models: modelsWithVersions,
    selectedModel,
    isLoading,
    error,
    isUpgraded,
    upgradedFrom,
    refresh: fetchModels,
  };
}

// Export tier display names
export const TIER_DISPLAY_NAMES: Record<ModelTier, string> = {
  auto: 'Auto (Sonnet)',
  opus: 'Opus (Most Capable)',
  sonnet: 'Sonnet (Balanced)',
  haiku: 'Haiku (Fastest)',
};
