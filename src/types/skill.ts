export interface Skill {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  path: string;
  category: 'core' | 'integration' | 'custom';
  triggers?: string[];
  lastUsed?: Date;
}

export interface SkillConfig {
  id: string;
  settings: Record<string, unknown>;
}
