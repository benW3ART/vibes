import { useState, useEffect, useCallback } from 'react';

interface ClaudeModel {
  id: string;
  name: string;
  tier: 'opus' | 'sonnet' | 'haiku';
}

interface UseClaudeModelsResult {
  models: ClaudeModel[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// Default models as fallback
const DEFAULT_MODELS: ClaudeModel[] = [
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'sonnet' },
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'opus' },
  { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', tier: 'haiku' },
];

export function useClaudeModels(): UseClaudeModelsResult {
  const [models, setModels] = useState<ClaudeModel[]>(DEFAULT_MODELS);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    if (!window.electron) {
      // Browser mode - use defaults
      setModels(DEFAULT_MODELS);
      return;
    }

    setIsLoading(true);
    setError(null);

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
    models,
    isLoading,
    error,
    refresh: fetchModels,
  };
}
