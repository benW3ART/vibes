import { useState } from 'react';
import { useMemory } from '@/hooks';
import { useProjectStore } from '@/stores';
import { ListItem, SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';
import type { MemoryEntry } from '@/types';

const categoryLabels: Record<MemoryEntry['category'], string> = {
  decision: 'Decisions',
  pattern: 'Patterns',
  convention: 'Conventions',
  lesson: 'Lessons',
  context: 'Context',
};

export function Memory() {
  const { currentProject } = useProjectStore();
  const { entries, isLoading, addEntry, removeEntry } = useMemory(currentProject?.path);
  const [newEntry, setNewEntry] = useState('');
  const [category, setCategory] = useState<MemoryEntry['category']>('context');

  const handleAdd = () => {
    if (!newEntry.trim()) return;
    addEntry(newEntry, category);
    setNewEntry('');
  };

  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = [];
    acc[entry.category].push(entry);
    return acc;
  }, {} as Record<string, MemoryEntry[]>);

  if (isLoading) {
    return (
      <div className="screen memory">
        <div className="memory-loading">Loading memory...</div>
      </div>
    );
  }

  return (
    <div className="screen memory">
      <QuickActions />

      <div className="memory-content">
        <div className="memory-add">
          <textarea
            className="memory-input"
            placeholder="Add a memory entry..."
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
          />
          <div className="memory-add-actions">
            <select
              className="memory-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as MemoryEntry['category'])}
            >
              {Object.entries(categoryLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <Button variant="primary" onClick={handleAdd}>Add Memory</Button>
          </div>
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon="🧠"
            title="Memory is empty"
            description="Memory helps Claude remember important context"
          />
        ) : (
          <div className="memory-entries">
            {Object.entries(groupedEntries).map(([cat, catEntries]) => (
              <div key={cat} className="memory-section">
                <SectionTitle>
                  {categoryLabels[cat as MemoryEntry['category']]}
                  <Badge>{catEntries.length}</Badge>
                </SectionTitle>
                {catEntries.map(entry => (
                  <ListItem
                    key={entry.id}
                    onClick={() => removeEntry(entry.id)}
                  >
                    <div className="memory-entry-content">
                      <div className="memory-entry-text">{entry.content}</div>
                      <div className="memory-entry-meta">
                        {entry.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </ListItem>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
