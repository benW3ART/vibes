export interface MemoryEntry {
  id: string;
  content: string;
  category: 'decision' | 'pattern' | 'convention' | 'lesson' | 'context';
  createdAt: Date;
  source?: string;
  tags?: string[];
}

export interface MemoryStore {
  entries: MemoryEntry[];
  lastUpdated: Date;
  totalSize: number;
}
