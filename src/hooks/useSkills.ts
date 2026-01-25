import { useState, useEffect, useCallback, useRef } from 'react';
import type { Skill } from '@/types';

// Helper to load disabled skills from settings.json
async function loadDisabledSkills(projectPath: string): Promise<Set<string>> {
  if (!window.electron) return new Set();

  try {
    const configPath = `${projectPath}/.claude/settings.json`;
    const content = await window.electron.file.read(configPath);
    const config = JSON.parse(content);
    return new Set(config.disabledSkills || []);
  } catch {
    return new Set();
  }
}

// Helper to save disabled skills to settings.json
async function saveDisabledSkills(projectPath: string, disabledSkills: Set<string>): Promise<void> {
  if (!window.electron) return;

  try {
    const configPath = `${projectPath}/.claude/settings.json`;
    let config: Record<string, unknown> = {};

    try {
      const content = await window.electron.file.read(configPath);
      config = JSON.parse(content);
    } catch {
      // File doesn't exist yet, start fresh
    }

    config.disabledSkills = Array.from(disabledSkills);
    await window.electron.file.write(configPath, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error('[useSkills] Failed to save disabled skills:', err);
  }
}

export function useSkills(projectPath?: string) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabledSkillsRef = useRef<Set<string>>(new Set());

  const loadSkills = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use real IPC to read skills from .claude/skills directory
      if (window.electron) {
        // First, load the disabled skills from settings
        disabledSkillsRef.current = await loadDisabledSkills(projectPath);

        const result = await window.electron.skills.list(projectPath);
        if (result.success && result.skills) {
          // Load skill content for each skill to get metadata
          const loadedSkills: Skill[] = await Promise.all(
            result.skills.map(async (skillInfo) => {
              // Try to get skill content to extract description
              let description = skillInfo.description || 'No description available';
              let triggers: string[] = [];

              try {
                const content = await window.electron.skills.get(skillInfo.path);
                if (content.success && content.content) {
                  // Parse YAML or markdown to extract triggers if available
                  const triggerMatch = content.content.match(/triggers?:\s*\[([^\]]+)\]/i);
                  if (triggerMatch) {
                    triggers = triggerMatch[1].split(',').map(t => t.trim().replace(/["']/g, ''));
                  }
                  // Extract description from content if not in skillInfo
                  const descMatch = content.content.match(/description:\s*["']?([^"'\n]+)/i);
                  if (descMatch) {
                    description = descMatch[1].trim();
                  }
                }
              } catch {
                // Ignore parsing errors
              }

              return {
                id: skillInfo.id,
                name: skillInfo.name,
                description,
                enabled: !disabledSkillsRef.current.has(skillInfo.id),
                path: skillInfo.path,
                category: skillInfo.id.includes('genius') ? 'core' as const : 'custom' as const,
                triggers: triggers.length > 0 ? triggers : undefined,
              };
            })
          );
          setSkills(loadedSkills);
        } else if (result.error) {
          setError(result.error);
        }
      } else {
        // Demo mode fallback
        const skillsPath = `${projectPath}/.claude/skills`;
        setSkills([
          {
            id: 'genius-orchestrator',
            name: 'Genius Orchestrator',
            description: 'Autonomous execution engine',
            enabled: true,
            path: `${skillsPath}/genius-orchestrator`,
            category: 'core',
            triggers: ['start building', 'go'],
          },
          {
            id: 'genius-dev',
            name: 'Genius Dev',
            description: 'Code implementation specialist',
            enabled: true,
            path: `${skillsPath}/genius-dev`,
            category: 'core',
            triggers: ['implement', 'code'],
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load skills');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadSkills();
  }, [loadSkills]);

  const toggleSkill = useCallback(async (skillId: string, enabled: boolean) => {
    setSkills(prev =>
      prev.map(s => s.id === skillId ? { ...s, enabled } : s)
    );

    // Persist to settings.json
    if (enabled) {
      disabledSkillsRef.current.delete(skillId);
    } else {
      disabledSkillsRef.current.add(skillId);
    }

    if (projectPath) {
      await saveDisabledSkills(projectPath, disabledSkillsRef.current);
    }
  }, [projectPath]);

  const getSkillContent = useCallback(async (skillPath: string): Promise<string | null> => {
    if (!window.electron) return null;

    try {
      const result = await window.electron.skills.get(skillPath);
      if (result.success && result.content) {
        return result.content;
      }
    } catch {
      // Ignore
    }
    return null;
  }, []);

  return {
    skills,
    isLoading,
    error,
    toggleSkill,
    getSkillContent,
    refresh: loadSkills,
  };
}
