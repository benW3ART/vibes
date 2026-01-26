import { useState, useEffect, useCallback } from 'react';
import { releaseMonitorService } from '@/services/releaseMonitorService';
import type { ClaudeCodeRelease, ReleaseSuggestion } from '@/types/releases';

interface UseReleaseMonitorResult {
  releases: ClaudeCodeRelease[];
  suggestions: ReleaseSuggestion[];
  currentVersion: string | null;
  latestVersion: string | null;
  hasUpdates: boolean;
  isLoading: boolean;
  error: string | null;
  lastChecked: Date | null;
  refresh: () => Promise<void>;
  dismissSuggestion: (id: string) => void;
  markSuggestionApplied: (id: string) => void;
}

const STORAGE_KEY = 'vibes-release-monitor';

interface StoredState {
  lastChecked: string | null;
  lastSeenVersion: string | null;
  dismissedSuggestions: string[];
}

export function useReleaseMonitor(): UseReleaseMonitorResult {
  const [releases, setReleases] = useState<ClaudeCodeRelease[]>([]);
  const [suggestions, setSuggestions] = useState<ReleaseSuggestion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load stored state
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data: StoredState = JSON.parse(stored);
        if (data.lastChecked) {
          setLastChecked(new Date(data.lastChecked));
        }
        if (data.dismissedSuggestions) {
          setDismissedIds(new Set(data.dismissedSuggestions));
        }
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save state
  useEffect(() => {
    const data: StoredState = {
      lastChecked: lastChecked?.toISOString() || null,
      lastSeenVersion: releases[0]?.version || null,
      dismissedSuggestions: Array.from(dismissedIds),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [lastChecked, releases, dismissedIds]);

  // Fetch releases and generate suggestions
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get current installed version
      const version = await releaseMonitorService.getCurrentVersion();
      setCurrentVersion(version);

      // Fetch releases
      const fetchedReleases = await releaseMonitorService.fetchReleases(10);
      setReleases(fetchedReleases);

      // Generate suggestions
      const stored = localStorage.getItem(STORAGE_KEY);
      const lastSeenVersion = stored ? JSON.parse(stored).lastSeenVersion : null;
      const newSuggestions = releaseMonitorService.generateSuggestions(
        fetchedReleases,
        lastSeenVersion
      );

      // Filter out dismissed suggestions
      setSuggestions(newSuggestions.filter(s => !dismissedIds.has(s.id)));

      setLastChecked(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check for updates');
    } finally {
      setIsLoading(false);
    }
  }, [dismissedIds]);

  // Initial fetch
  useEffect(() => {
    // Only auto-refresh if last check was more than 1 hour ago
    const shouldAutoRefresh = !lastChecked ||
      (Date.now() - lastChecked.getTime() > 3600000);

    if (shouldAutoRefresh) {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run only on mount for initial check
  }, []);

  // Dismiss a suggestion
  const dismissSuggestion = useCallback((id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    setSuggestions(prev => prev.filter(s => s.id !== id));
  }, []);

  // Mark suggestion as applied
  const markSuggestionApplied = useCallback((id: string) => {
    setSuggestions(prev => prev.map(s =>
      s.id === id ? { ...s, applied: true } : s
    ));
  }, []);

  // Compute derived values
  const latestVersion = releases[0]?.version || null;
  const hasUpdates = !!(latestVersion && currentVersion &&
    releaseMonitorService['compareVersions'](latestVersion, currentVersion) > 0);

  return {
    releases,
    suggestions: suggestions.filter(s => !s.applied),
    currentVersion,
    latestVersion,
    hasUpdates,
    isLoading,
    error,
    lastChecked,
    refresh,
    dismissSuggestion,
    markSuggestionApplied,
  };
}
