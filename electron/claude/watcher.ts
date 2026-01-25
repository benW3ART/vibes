// electron/claude/watcher.ts
import { watch, FSWatcher } from 'fs';
import { EventEmitter } from 'events';
import path from 'path';

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: Date;
}

export class FileWatcher extends EventEmitter {
  private watchers: Map<string, FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private debounceMs = 100;

  watch(dirPath: string): boolean {
    if (this.watchers.has(dirPath)) {
      return false;
    }

    try {
      const watcher = watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        const fullPath = path.join(dirPath, filename);
        const key = fullPath;

        // Debounce rapid changes
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key)!);
        }

        this.debounceTimers.set(key, setTimeout(() => {
          this.debounceTimers.delete(key);
          this.emit('change', {
            type: eventType === 'rename' ? 'add' : 'change',
            path: fullPath,
            timestamp: new Date(),
          } as FileChangeEvent);
        }, this.debounceMs));
      });

      this.watchers.set(dirPath, watcher);
      return true;
    } catch (error) {
      this.emit('error', error);
      return false;
    }
  }

  unwatch(dirPath: string): boolean {
    const watcher = this.watchers.get(dirPath);
    if (!watcher) {
      return false;
    }

    watcher.close();
    this.watchers.delete(dirPath);
    return true;
  }

  unwatchAll(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close();
    }
    this.watchers.clear();
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
}
