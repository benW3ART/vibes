"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileWatcher = void 0;
// electron/claude/watcher.ts
const fs_1 = require("fs");
const events_1 = require("events");
const path_1 = __importDefault(require("path"));
class FileWatcher extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.watchers = new Map();
        this.debounceTimers = new Map();
        this.debounceMs = 100;
    }
    watch(dirPath) {
        if (this.watchers.has(dirPath)) {
            return false;
        }
        try {
            const watcher = (0, fs_1.watch)(dirPath, { recursive: true }, (eventType, filename) => {
                if (!filename)
                    return;
                const fullPath = path_1.default.join(dirPath, filename);
                const key = fullPath;
                // Debounce rapid changes
                if (this.debounceTimers.has(key)) {
                    clearTimeout(this.debounceTimers.get(key));
                }
                this.debounceTimers.set(key, setTimeout(() => {
                    this.debounceTimers.delete(key);
                    this.emit('change', {
                        type: eventType === 'rename' ? 'add' : 'change',
                        path: fullPath,
                        timestamp: new Date(),
                    });
                }, this.debounceMs));
            });
            this.watchers.set(dirPath, watcher);
            return true;
        }
        catch (error) {
            this.emit('error', error);
            return false;
        }
    }
    unwatch(dirPath) {
        const watcher = this.watchers.get(dirPath);
        if (!watcher) {
            return false;
        }
        watcher.close();
        this.watchers.delete(dirPath);
        return true;
    }
    unwatchAll() {
        for (const [, watcher] of this.watchers) {
            watcher.close();
        }
        this.watchers.clear();
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();
    }
}
exports.FileWatcher = FileWatcher;
