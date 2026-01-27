import { useState, useEffect, useCallback, useRef } from 'react';
import {
  searchMCPSources,
  searchSkillSources,
  getDefaultSuggestions,
  type SuggestedSource,
} from '@/services/githubSearchService';

interface UseSourceSuggestionsResult {
  suggestions: SuggestedSource[];
  isLoading: boolean;
  error: string | null;
  search: (query: string, type?: 'mcp' | 'skill' | 'all') => void;
  clearSuggestions: () => void;
}

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 500;

export function useSourceSuggestions(): UseSourceSuggestionsResult {
  const [suggestions, setSuggestions] = useState<SuggestedSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep track of the latest search to avoid race conditions
  const latestSearchRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load default suggestions on mount
  useEffect(() => {
    const loadDefaults = async () => {
      setIsLoading(true);
      try {
        const defaults = await getDefaultSuggestions();
        setSuggestions(defaults);
      } catch (err) {
        console.error('[useSourceSuggestions] Error loading defaults:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDefaults();
  }, []);

  // Search function with debouncing
  const search = useCallback((query: string, type: 'mcp' | 'skill' | 'all' = 'all') => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If empty query, load defaults
    if (!query.trim()) {
      setIsLoading(true);
      getDefaultSuggestions()
        .then(setSuggestions)
        .catch(() => setError('Failed to load suggestions'))
        .finally(() => setIsLoading(false));
      return;
    }

    // Debounce the search
    debounceTimerRef.current = setTimeout(async () => {
      const searchId = ++latestSearchRef.current;
      setIsLoading(true);
      setError(null);

      try {
        let results: SuggestedSource[] = [];

        if (type === 'mcp' || type === 'all') {
          const mcpResults = await searchMCPSources(query);
          results = [...results, ...mcpResults];
        }

        if (type === 'skill' || type === 'all') {
          const skillResults = await searchSkillSources(query);
          results = [...results, ...skillResults];
        }

        // Deduplicate
        const seen = new Set<string>();
        const uniqueResults = results.filter(r => {
          if (seen.has(r.fullName)) return false;
          seen.add(r.fullName);
          return true;
        });

        // Only update if this is still the latest search
        if (searchId === latestSearchRef.current) {
          setSuggestions(uniqueResults);
        }
      } catch (err) {
        if (searchId === latestSearchRef.current) {
          setError(err instanceof Error ? err.message : 'Search failed');
        }
      } finally {
        if (searchId === latestSearchRef.current) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_DELAY);
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clearSuggestions,
  };
}
