import { useState, useEffect, useCallback } from 'react';

interface PlanSection {
  title: string;
  tasks: { id: string; text: string; completed: boolean }[];
}

export function usePlan(projectPath?: string) {
  const [content, setContent] = useState<string>('');
  const [sections, setSections] = useState<PlanSection[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    if (!projectPath || !window.electron) return;

    setIsLoading(true);
    setError(null);

    try {
      const planPath = `${projectPath}/.claude/plan.md`;
      const planContent = await window.electron.file.read(planPath);
      setContent(planContent);

      // Parse sections
      const parsed: PlanSection[] = [];
      const lines = planContent.split('\n');
      let currentSection: PlanSection | null = null;

      for (const line of lines) {
        if (line.startsWith('## ')) {
          if (currentSection) parsed.push(currentSection);
          currentSection = { title: line.slice(3).trim(), tasks: [] };
        } else if (line.match(/^- \[[ x]\]/)) {
          const completed = line.includes('[x]');
          const match = line.match(/^- \[[ x]\] (\S+):\s*(.+)/);
          if (match && currentSection) {
            currentSection.tasks.push({
              id: match[1],
              text: match[2],
              completed,
            });
          }
        }
      }
      if (currentSection) parsed.push(currentSection);

      setSections(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const refresh = useCallback(() => {
    loadPlan();
  }, [loadPlan]);

  return {
    content,
    sections,
    isLoading,
    error,
    refresh,
  };
}
