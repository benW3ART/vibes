import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

interface UseProjectFilesOptions {
  watchForChanges?: boolean;
  includeHidden?: boolean;
}

export function useProjectFiles(projectPath?: string, options: UseProjectFilesOptions = {}) {
  const { watchForChanges = false, includeHidden = false } = options;
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const loadFiles = useCallback(async (dirPath?: string) => {
    const targetPath = dirPath || projectPath;
    if (!targetPath) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.electron) {
        const result = await window.electron.file.list(targetPath);
        if (result.success && result.files) {
          let filteredFiles = result.files;

          // Filter hidden files unless includeHidden is true
          if (!includeHidden) {
            filteredFiles = filteredFiles.filter(f => !f.name.startsWith('.'));
          }

          // Sort: directories first, then alphabetically
          filteredFiles.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
          });

          setFiles(filteredFiles);
        } else if (result.error) {
          setError(result.error);
        }
      } else {
        // Demo mode - return mock files
        setFiles([
          { name: 'src', path: `${targetPath}/src`, isDirectory: true, isFile: false },
          { name: 'package.json', path: `${targetPath}/package.json`, isDirectory: false, isFile: true },
          { name: 'README.md', path: `${targetPath}/README.md`, isDirectory: false, isFile: true },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath, includeHidden]);

  // Watch for file changes
  useEffect(() => {
    if (!projectPath || !watchForChanges || !window.electron) return;

    const setupWatcher = async () => {
      try {
        await window.electron.file.watch(projectPath);

        const unsub = window.electron.file.onChanged((changedPath: unknown) => {
          logger.debug('[useProjectFiles] File changed:', changedPath);
          // Reload files when changes detected
          loadFiles();
        });

        unsubscribeRef.current = unsub;
      } catch (err) {
        logger.error('[useProjectFiles] Failed to setup watcher:', err);
      }
    };

    setupWatcher();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (window.electron && projectPath) {
        window.electron.file.unwatch(projectPath);
      }
    };
  }, [projectPath, watchForChanges, loadFiles]);

  // Initial load
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const readFile = useCallback(async (filePath: string): Promise<string | null> => {
    if (!window.electron) return null;

    try {
      const content = await window.electron.file.read(filePath);
      return content;
    } catch (err) {
      logger.error('[useProjectFiles] Failed to read file:', err);
      return null;
    }
  }, []);

  const writeFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    if (!window.electron) return false;

    try {
      const success = await window.electron.file.write(filePath, content);
      if (success) {
        // Refresh file list
        loadFiles();
      }
      return success;
    } catch (err) {
      logger.error('[useProjectFiles] Failed to write file:', err);
      return false;
    }
  }, [loadFiles]);

  const fileExists = useCallback(async (filePath: string): Promise<boolean> => {
    if (!window.electron) return false;

    try {
      return await window.electron.file.exists(filePath);
    } catch {
      return false;
    }
  }, []);

  const createDirectory = useCallback(async (dirPath: string): Promise<boolean> => {
    if (!window.electron) return false;

    try {
      const result = await window.electron.file.mkdir(dirPath);
      if (result.success) {
        // Refresh file list
        loadFiles();
      }
      return result.success;
    } catch (err) {
      logger.error('[useProjectFiles] Failed to create directory:', err);
      return false;
    }
  }, [loadFiles]);

  return {
    files,
    isLoading,
    error,
    readFile,
    writeFile,
    fileExists,
    createDirectory,
    refresh: loadFiles,
    loadDirectory: loadFiles,
  };
}

// Hook for checking specific project files
export function useProjectArtifacts(projectPath?: string) {
  const [artifacts, setArtifacts] = useState({
    discovery: false,
    specs: false,
    design: false,
    architecture: false,
    plan: false,
    progress: false,
  });
  const [isLoading, setIsLoading] = useState(false);

  const checkArtifacts = useCallback(async () => {
    if (!projectPath || !window.electron) return;

    setIsLoading(true);

    try {
      const checks = await Promise.all([
        window.electron.file.exists(`${projectPath}/DISCOVERY.xml`),
        window.electron.file.exists(`${projectPath}/SPECIFICATIONS.xml`),
        window.electron.file.exists(`${projectPath}/DESIGN-SYSTEM.xml`),
        window.electron.file.exists(`${projectPath}/ARCHITECTURE.md`),
        window.electron.file.exists(`${projectPath}/.claude/plan.md`),
        window.electron.file.exists(`${projectPath}/PROGRESS.md`),
      ]);

      setArtifacts({
        discovery: checks[0],
        specs: checks[1],
        design: checks[2],
        architecture: checks[3],
        plan: checks[4],
        progress: checks[5],
      });
    } catch (err) {
      logger.error('[useProjectArtifacts] Failed to check artifacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    checkArtifacts();
  }, [checkArtifacts]);

  return {
    artifacts,
    isLoading,
    refresh: checkArtifacts,
  };
}
