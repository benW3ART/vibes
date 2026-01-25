import { useEffect, useCallback, useState } from 'react';
import { logger } from '@/utils/logger';

export interface FileChange {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export function useFileWatcher(dirPath?: string) {
  const [changes, setChanges] = useState<FileChange[]>([]);
  const [isWatching, setIsWatching] = useState(false);

  useEffect(() => {
    if (!dirPath || typeof window === 'undefined' || !window.electron) return;

    const unsub = window.electron.file.onChanged((event: unknown) => {
      const change = event as FileChange;
      setChanges(prev => [...prev.slice(-99), change]);
    });

    window.electron.file.watch(dirPath)
      .then(result => {
        setIsWatching(result);
      })
      .catch(err => {
        logger.error('[useFileWatcher] Failed to watch directory:', err);
        setIsWatching(false);
      });

    return () => {
      unsub();
      if (dirPath) {
        window.electron.file.unwatch(dirPath);
      }
    };
  }, [dirPath]);

  const clearChanges = useCallback(() => {
    setChanges([]);
  }, []);

  return {
    changes,
    isWatching,
    clearChanges,
  };
}
