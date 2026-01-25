import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigationStore } from '@/stores';
import type { ScreenId } from '@/types';
import styles from './CommandPalette.module.css';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: string;
  shortcut?: string;
  action: () => void;
  category: string;
}

const screenCommands: Array<{
  id: ScreenId;
  label: string;
  icon: string;
  shortcut?: string;
  category: string;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: 'layout-dashboard', category: 'Command Center', shortcut: 'Cmd+1' },
  { id: 'execution', label: 'Execution', icon: 'play', category: 'Command Center', shortcut: 'Cmd+2' },
  { id: 'tasks', label: 'Tasks', icon: 'list-checks', category: 'Command Center', shortcut: 'Cmd+3' },
  { id: 'prompts', label: 'Prompts', icon: 'message-square', category: 'Command Center', shortcut: 'Cmd+4' },
  { id: 'plan', label: 'Plan', icon: 'file-text', category: '.claude', shortcut: 'Cmd+Shift+P' },
  { id: 'skills', label: 'Skills', icon: 'sparkles', category: '.claude', shortcut: 'Cmd+Shift+S' },
  { id: 'mcp', label: 'MCP Servers', icon: 'server', category: '.claude' },
  { id: 'settings', label: 'Settings', icon: 'settings', category: '.claude' },
  { id: 'memory', label: 'Memory', icon: 'brain', category: '.claude' },
  { id: 'code', label: 'Code', icon: 'code', category: 'Build' },
  { id: 'debug', label: 'Debug', icon: 'bug', category: 'Build', shortcut: 'Cmd+Shift+D' },
  { id: 'tests', label: 'Tests', icon: 'test-tube', category: 'Build' },
  { id: 'deploy', label: 'Deploy', icon: 'rocket', category: 'Ship' },
  { id: 'logs', label: 'Logs', icon: 'scroll', category: 'Ship' },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart', category: 'Ship' },
  { id: 'connections', label: 'Connections', icon: 'link', category: 'System' },
  { id: 'environment', label: 'Environment', icon: 'terminal', category: 'System' },
];

function fuzzyMatch(text: string, query: string): boolean {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === queryLower.length;
}

export function CommandPalette() {
  const { commandPaletteOpen, toggleCommandPalette, setScreen, toggleChatPanel, toggleXrayPanel } = useNavigationStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(() => {
    const cmds: Command[] = screenCommands.map((screen) => ({
      id: `screen-${screen.id}`,
      label: screen.label,
      icon: screen.icon,
      shortcut: screen.shortcut,
      category: screen.category,
      action: () => {
        setScreen(screen.id);
        toggleCommandPalette();
      },
    }));

    // Add action commands
    cmds.push(
      {
        id: 'action-chat',
        label: 'Toggle Chat Panel',
        icon: 'message-circle',
        shortcut: 'Cmd+/',
        category: 'Actions',
        action: () => {
          toggleChatPanel();
          toggleCommandPalette();
        },
      },
      {
        id: 'action-xray',
        label: 'Toggle X-Ray Panel',
        icon: 'scan',
        shortcut: 'Cmd+.',
        category: 'Actions',
        action: () => {
          toggleXrayPanel();
          toggleCommandPalette();
        },
      }
    );

    return cmds;
  }, [setScreen, toggleCommandPalette, toggleChatPanel, toggleXrayPanel]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return commands;
    return commands.filter(
      (cmd) =>
        fuzzyMatch(cmd.label, query) ||
        fuzzyMatch(cmd.category, query) ||
        (cmd.description && fuzzyMatch(cmd.description, query))
    );
  }, [commands, query]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (flatCommands[selectedIndex]) {
            flatCommands[selectedIndex].action();
          }
          break;
        case 'Escape':
          e.preventDefault();
          toggleCommandPalette();
          break;
      }
    },
    [flatCommands, selectedIndex, toggleCommandPalette]
  );

  useEffect(() => {
    const selected = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!commandPaletteOpen) return null;

  return (
    <div className={styles.overlay} onClick={toggleCommandPalette}>
      <div className={styles.palette} onClick={(e) => e.stopPropagation()}>
        <div className={styles.inputWrapper}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <kbd className={styles.escKey}>esc</kbd>
        </div>

        <div className={styles.results} ref={listRef}>
          {flatCommands.length === 0 ? (
            <div className={styles.empty}>No commands found</div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category} className={styles.group}>
                <div className={styles.groupTitle}>{category}</div>
                {cmds.map((cmd) => {
                  const index = flatCommands.indexOf(cmd);
                  return (
                    <div
                      key={cmd.id}
                      data-index={index}
                      className={`${styles.item} ${index === selectedIndex ? styles.selected : ''}`}
                      onClick={() => cmd.action()}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <span className={styles.itemLabel}>{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className={styles.itemShortcut}>{cmd.shortcut}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className={styles.footer}>
          <span><kbd>Enter</kbd> to select</span>
          <span><kbd>Arrow</kbd> to navigate</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  );
}
