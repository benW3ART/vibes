// Release Monitor Service - Track Claude Code releases and suggest improvements
import type { ClaudeCodeRelease, Feature, ReleaseSuggestion } from '@/types/releases';

// GitHub repo for Claude Code releases
const CLAUDE_CODE_REPO = 'anthropics/claude-code';

interface GitHubRelease {
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
}

class ReleaseMonitorServiceClass {
  // Fetch latest releases from GitHub
  async fetchReleases(limit = 5): Promise<ClaudeCodeRelease[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${CLAUDE_CODE_REPO}/releases?per_page=${limit}`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'vibes-app',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const releases: GitHubRelease[] = await response.json();
      return releases.map(release => this.parseRelease(release));
    } catch (error) {
      console.error('Failed to fetch releases:', error);
      return [];
    }
  }

  // Parse GitHub release into our format
  private parseRelease(release: GitHubRelease): ClaudeCodeRelease {
    const features = this.extractFeatures(release.body);
    const deprecations = this.extractDeprecations(release.body);

    return {
      version: release.tag_name.replace(/^v/, ''),
      date: release.published_at,
      features,
      deprecations,
      changelog: release.body,
      url: release.html_url,
    };
  }

  // Extract features from release notes
  private extractFeatures(body: string): Feature[] {
    const features: Feature[] = [];

    // Look for common patterns in release notes
    const featurePatterns = [
      // New features
      { regex: /\*\*New:\*\*\s*(.+)/gi, type: 'new' as const },
      { regex: /\*\s*Added\s+(.+)/gi, type: 'new' as const },
      { regex: /###\s*New Features?\s*\n([\s\S]*?)(?=###|$)/gi, type: 'new' as const },
      // Improvements
      { regex: /\*\*Improved:\*\*\s*(.+)/gi, type: 'improved' as const },
      { regex: /\*\s*Improved\s+(.+)/gi, type: 'improved' as const },
      { regex: /###\s*Improvements?\s*\n([\s\S]*?)(?=###|$)/gi, type: 'improved' as const },
      // Breaking changes
      { regex: /\*\*Breaking:\*\*\s*(.+)/gi, type: 'breaking' as const },
      { regex: /###\s*Breaking Changes?\s*\n([\s\S]*?)(?=###|$)/gi, type: 'breaking' as const },
    ];

    for (const pattern of featurePatterns) {
      let match;
      while ((match = pattern.regex.exec(body)) !== null) {
        const text = match[1].trim();
        const lines = text.split('\n').filter(l => l.trim());

        for (const line of lines) {
          const cleanLine = line.replace(/^\*\s*/, '').trim();
          if (cleanLine.length > 10) {
            features.push({
              name: this.extractFeatureName(cleanLine),
              description: cleanLine,
              type: pattern.type,
              impactedAreas: this.detectImpactedAreas(cleanLine),
              suggestedAction: this.generateSuggestedAction(cleanLine, pattern.type),
            });
          }
        }
      }
    }

    return features;
  }

  // Extract deprecations from release notes
  private extractDeprecations(body: string): string[] {
    const deprecations: string[] = [];
    const deprecationPattern = /\*\*Deprecated:\*\*\s*(.+)|deprecated\s+(.+)/gi;

    let match;
    while ((match = deprecationPattern.exec(body)) !== null) {
      const text = (match[1] || match[2]).trim();
      if (text.length > 5) {
        deprecations.push(text);
      }
    }

    return deprecations;
  }

  // Extract a short feature name from description
  private extractFeatureName(description: string): string {
    // Take first 50 characters or first sentence
    const firstSentence = description.split(/[.!?]/)[0];
    if (firstSentence.length <= 50) return firstSentence;
    return description.substring(0, 47) + '...';
  }

  // Detect which areas of the app might be impacted
  private detectImpactedAreas(text: string): Feature['impactedAreas'] {
    const areas: Feature['impactedAreas'] = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('skill')) areas.push('skills');
    if (lowerText.includes('mcp') || lowerText.includes('server')) areas.push('mcp');
    if (lowerText.includes('setting') || lowerText.includes('config')) areas.push('settings');
    if (lowerText.includes('hook')) areas.push('hooks');
    if (lowerText.includes('cli') || lowerText.includes('command')) areas.push('cli');

    return areas.length > 0 ? areas : ['cli'];
  }

  // Generate a suggested action based on the feature
  private generateSuggestedAction(_description: string, type: Feature['type']): string {
    if (type === 'breaking') {
      return 'Review and update affected code to maintain compatibility';
    }
    if (type === 'new') {
      return 'Consider using this new feature to enhance your workflow';
    }
    return 'Check if this improvement benefits your current setup';
  }

  // Generate suggestions for a project based on releases
  generateSuggestions(
    releases: ClaudeCodeRelease[],
    lastSeenVersion: string | null
  ): ReleaseSuggestion[] {
    const suggestions: ReleaseSuggestion[] = [];

    for (const release of releases) {
      // Skip versions we've already seen
      if (lastSeenVersion && this.compareVersions(release.version, lastSeenVersion) <= 0) {
        continue;
      }

      for (const feature of release.features) {
        // Only suggest if it has impacted areas that matter
        if (feature.impactedAreas.length > 0) {
          suggestions.push({
            id: `${release.version}-${feature.name.substring(0, 20).replace(/\s+/g, '-')}`,
            feature,
            releaseVersion: release.version,
            title: feature.name,
            description: feature.description,
            impact: feature.type === 'breaking' ? 'high' : feature.type === 'new' ? 'medium' : 'low',
            applied: false,
          });
        }
      }
    }

    return suggestions;
  }

  // Compare version strings (semver-like)
  private compareVersions(a: string, b: string): number {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);

    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const numA = partsA[i] || 0;
      const numB = partsB[i] || 0;
      if (numA > numB) return 1;
      if (numA < numB) return -1;
    }
    return 0;
  }

  // Check current installed version (via Claude CLI)
  async getCurrentVersion(): Promise<string | null> {
    if (!window.electron) return null;

    try {
      const status = await window.electron.claude.authStatus();
      if (status.version) {
        // Extract version from "claude-code/x.y.z" format
        const match = status.version.match(/(\d+\.\d+\.\d+)/);
        return match ? match[1] : status.version;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const releaseMonitorService = new ReleaseMonitorServiceClass();
