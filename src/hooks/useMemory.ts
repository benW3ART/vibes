import { useState, useEffect, useCallback } from 'react';
import type { MemoryEntry } from '@/types';

export function useMemory(projectPath?: string) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMemory = useCallback(async () => {
    if (!projectPath || !window.electron) return;

    setIsLoading(true);
    setError(null);

    try {
      const memoryPath = `${projectPath}/.claude/CLAUDE.md`;
      const content = await window.electron.file.read(memoryPath);

      // Parse memory entries from markdown
      const lines = content.split('\n');
      const parsed: MemoryEntry[] = [];
      let currentEntry: Partial<MemoryEntry> | null = null;

      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (currentEntry?.content) {
            parsed.push(currentEntry as MemoryEntry);
          }
          currentEntry = {
            id: `mem-${parsed.length}`,
            content: '',
            category: 'context',
            createdAt: new Date(),
          };
        } else if (currentEntry) {
          currentEntry.content += line + '\n';
        }
      }

      if (currentEntry?.content) {
        parsed.push(currentEntry as MemoryEntry);
      }

      setEntries(parsed);
    } catch {
      // No memory file yet
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const addEntry = useCallback((content: string, category: MemoryEntry['category']) => {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}`,
      content,
      category,
      createdAt: new Date(),
    };
    setEntries(prev => [...prev, entry]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return {
    entries,
    isLoading,
    error,
    addEntry,
    removeEntry,
    refresh: loadMemory,
  };
}
