import { useEffect, useCallback, useMemo } from 'react';
import { useNavigationStore } from '@/stores';

interface ShortcutConfig {
  key: string;
  meta?: boolean;
  shift?: boolean;
  ctrl?: boolean;
  action: () => void;
}

export function useKeyboardShortcuts() {
  const {
    setScreen,
    toggleChatPanel,
    toggleXrayPanel,
    toggleCommandPalette
  } = useNavigationStore();

  const shortcuts: ShortcutConfig[] = useMemo(() => [
    { key: 'k', meta: true, action: toggleCommandPalette },
    { key: '/', meta: true, action: toggleChatPanel },
    { key: '.', meta: true, action: toggleXrayPanel },
    { key: '1', meta: true, action: () => setScreen('dashboard') },
    { key: '2', meta: true, action: () => setScreen('execution') },
    { key: '3', meta: true, action: () => setScreen('tasks') },
    { key: '4', meta: true, action: () => setScreen('prompts') },
    { key: 'p', meta: true, shift: true, action: () => setScreen('plan') },
    { key: 's', meta: true, shift: true, action: () => setScreen('skills') },
    { key: 'd', meta: true, shift: true, action: () => setScreen('debug') },
  ], [setScreen, toggleChatPanel, toggleXrayPanel, toggleCommandPalette]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const metaMatch = shortcut.meta ? event.metaKey : !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const ctrlMatch = shortcut.ctrl ? event.ctrlKey : !event.ctrlKey;

      if (
        event.key.toLowerCase() === shortcut.key.toLowerCase() &&
        metaMatch &&
        shiftMatch &&
        ctrlMatch
      ) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return { shortcuts };
}
