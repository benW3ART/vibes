import { useState, useEffect, useCallback, useRef } from 'react';

interface GitChange {
  status: string;
  path: string;
}

interface GitStatus {
  isRepo: boolean;
  hasUncommitted: boolean;
  hasUnpushed: boolean;
  branch: string;
  ahead: number;
  behind: number;
  changes: GitChange[];
}

interface UseGitStatusResult {
  status: GitStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  commitAndPush: (message: string) => Promise<{ success: boolean; error?: string }>;
  isCommitting: boolean;
}

const DEFAULT_POLL_INTERVAL = 5000; // 5 seconds

export function useGitStatus(projectPath: string | null, pollInterval = DEFAULT_POLL_INTERVAL): UseGitStatusResult {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!projectPath || typeof window === 'undefined' || !window.electron) {
      setStatus(null);
      return;
    }

    try {
      setLoading(true);
      const result = await window.electron.git.status(projectPath);

      if (result.success) {
        setStatus({
          isRepo: result.isRepo,
          hasUncommitted: result.hasUncommitted,
          hasUnpushed: result.hasUnpushed,
          branch: result.branch,
          ahead: result.ahead,
          behind: result.behind,
          changes: result.changes,
        });
        setError(null);
      } else {
        setError(result.error || 'Failed to get git status');
        setStatus(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get git status');
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  const commitAndPush = useCallback(async (message: string): Promise<{ success: boolean; error?: string }> => {
    if (!projectPath || typeof window === 'undefined' || !window.electron) {
      return { success: false, error: 'No project path or electron not available' };
    }

    try {
      setIsCommitting(true);
      const result = await window.electron.git.commitAndPush(projectPath, message);

      if (result.success) {
        // Refresh status after successful commit
        await fetchStatus();
        return { success: true };
      } else {
        return { success: false, error: result.error || 'Commit failed' };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Commit failed' };
    } finally {
      setIsCommitting(false);
    }
  }, [projectPath, fetchStatus]);

  // Initial fetch and polling
  useEffect(() => {
    if (!projectPath) {
      setStatus(null);
      return;
    }

    // Initial fetch
    fetchStatus();

    // Set up polling
    pollIntervalRef.current = setInterval(fetchStatus, pollInterval);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [projectPath, pollInterval, fetchStatus]);

  // Refresh on window focus
  useEffect(() => {
    if (!projectPath) return;

    const handleFocus = () => {
      fetchStatus();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [projectPath, fetchStatus]);

  return {
    status,
    loading,
    error,
    refresh: fetchStatus,
    commitAndPush,
    isCommitting,
  };
}
