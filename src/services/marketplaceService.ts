// Marketplace Service - Browse and install skills/MCPs from GitHub
import type { MarketplaceItem, MarketplaceSource } from '@/types/marketplace';

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

interface GitHubTreeResponse {
  sha: string;
  url: string;
  tree: GitHubTreeItem[];
}

class MarketplaceServiceClass {
  // Fetch items from a marketplace source (GitHub repo)
  async fetchItems(source: MarketplaceSource): Promise<MarketplaceItem[]> {
    const items: MarketplaceItem[] = [];

    try {
      // Parse repo from URL
      const repoPath = source.url.replace('https://github.com/', '').replace('.git', '');

      // Fetch repo tree to find skills/MCPs
      const treeUrl = `https://api.github.com/repos/${repoPath}/git/trees/main?recursive=1`;
      const response = await fetch(treeUrl, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'vibes-app',
        },
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data: GitHubTreeResponse = await response.json();

      // Look for directories that might be skills or MCPs
      // MCP servers typically have package.json or index.js
      // Skills might have SKILL.md or skill.yaml

      const potentialItems = new Map<string, { path: string; files: string[] }>();

      for (const item of data.tree) {
        if (item.type === 'tree') continue;

        const parts = item.path.split('/');
        if (parts.length >= 2) {
          const dirPath = parts.slice(0, -1).join('/');
          const fileName = parts[parts.length - 1];

          if (!potentialItems.has(dirPath)) {
            potentialItems.set(dirPath, { path: dirPath, files: [] });
          }
          potentialItems.get(dirPath)!.files.push(fileName);
        }
      }

      // Classify each potential item
      for (const [dirPath, info] of potentialItems) {
        const hasPackageJson = info.files.includes('package.json');
        const hasSkillMd = info.files.includes('SKILL.md') || info.files.includes('skill.md');
        const hasSkillYaml = info.files.includes('SKILL.yaml') || info.files.includes('skill.yaml');
        const hasReadme = info.files.includes('README.md') || info.files.includes('readme.md');

        let type: 'skill' | 'mcp' | null = null;

        if (hasSkillMd || hasSkillYaml) {
          type = 'skill';
        } else if (hasPackageJson && dirPath.includes('src/')) {
          type = 'mcp';
        }

        if (type) {
          const name = dirPath.split('/').pop() || dirPath;
          items.push({
            id: `${source.id}:${dirPath}`,
            name: this.formatName(name),
            description: `${type === 'skill' ? 'Skill' : 'MCP Server'} from ${source.name}`,
            type,
            source: source.url,
            path: dirPath,
            tags: hasReadme ? ['has-readme'] : [],
          });
        }
      }

      return items;
    } catch (error) {
      console.error(`Failed to fetch items from ${source.url}:`, error);
      return [];
    }
  }

  // Fetch README for an item
  async fetchReadme(source: string, itemPath: string): Promise<string | null> {
    try {
      const repoPath = source.replace('https://github.com/', '').replace('.git', '');
      const readmeUrl = `https://raw.githubusercontent.com/${repoPath}/main/${itemPath}/README.md`;

      const response = await fetch(readmeUrl);
      if (!response.ok) {
        // Try lowercase
        const altUrl = `https://raw.githubusercontent.com/${repoPath}/main/${itemPath}/readme.md`;
        const altResponse = await fetch(altUrl);
        if (!altResponse.ok) return null;
        return await altResponse.text();
      }

      return await response.text();
    } catch {
      return null;
    }
  }

  // Install an item to the project
  async installItem(
    item: MarketplaceItem,
    projectPath: string,
    accessToken?: string
  ): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!window.electron) {
      return { success: false, error: 'Installation requires Electron mode' };
    }

    try {
      const targetDir = item.type === 'skill'
        ? `${projectPath}/.claude/skills/${item.name.toLowerCase().replace(/\s+/g, '-')}`
        : `${projectPath}/.claude/mcp/${item.name.toLowerCase().replace(/\s+/g, '-')}`;

      // Create directory
      await window.electron.file.mkdir(targetDir);

      // Fetch and write files
      const repoPath = item.source.replace('https://github.com/', '').replace('.git', '');

      // Get the tree for this specific path
      const treeUrl = `https://api.github.com/repos/${repoPath}/contents/${item.path}`;
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'vibes-app',
      };
      if (accessToken) {
        headers['Authorization'] = `token ${accessToken}`;
      }

      const response = await fetch(treeUrl, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch item contents: ${response.status}`);
      }

      const contents = await response.json();

      // Download each file
      for (const file of contents) {
        if (file.type === 'file') {
          const fileResponse = await fetch(file.download_url);
          if (fileResponse.ok) {
            const content = await fileResponse.text();
            await window.electron.file.write(`${targetDir}/${file.name}`, content);
          }
        }
      }

      return { success: true, path: targetDir };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // Format name from path
  private formatName(name: string): string {
    return name
      .replace(/-/g, ' ')
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}

export const marketplaceService = new MarketplaceServiceClass();
