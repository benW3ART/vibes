// electron/claude/fileReader.ts
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

export async function readFileContent(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8');
}

export async function writeFileContent(filePath: string, content: string): Promise<void> {
  await writeFile(filePath, content, 'utf-8');
}

export async function listDirectory(dirPath: string): Promise<FileInfo[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const results: FileInfo[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const stats = await stat(fullPath);

    results.push({
      name: entry.name,
      path: fullPath,
      isDirectory: entry.isDirectory(),
      size: stats.size,
      modified: stats.mtime,
    });
  }

  return results.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });
}

export async function readClaudeConfig(projectPath: string): Promise<Record<string, unknown> | null> {
  try {
    const configPath = path.join(projectPath, '.claude', 'settings.json');
    const content = await readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function readPlanFile(projectPath: string): Promise<string | null> {
  try {
    const planPath = path.join(projectPath, '.claude', 'plan.md');
    return await readFile(planPath, 'utf-8');
  } catch {
    return null;
  }
}
