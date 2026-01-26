// Release Monitoring Types

export interface ClaudeCodeRelease {
  version: string;
  date: string;
  features: Feature[];
  deprecations: string[];
  changelog: string;
  url?: string;
}

export interface Feature {
  name: string;
  description: string;
  type: 'new' | 'improved' | 'breaking';
  impactedAreas: ('skills' | 'mcp' | 'settings' | 'hooks' | 'cli')[];
  suggestedAction?: string;
  codeExample?: string;
}

export interface ReleaseSuggestion {
  id: string;
  feature: Feature;
  releaseVersion: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  applied: boolean;
  dismissedAt?: Date;
}

export interface ReleaseMonitorState {
  lastChecked: Date | null;
  lastSeenVersion: string | null;
  releases: ClaudeCodeRelease[];
  suggestions: ReleaseSuggestion[];
  isLoading: boolean;
  error: string | null;
}
