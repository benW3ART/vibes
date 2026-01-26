// electron/ipc/handlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { ClaudeBridge } from '../claude/bridge';
import { FileWatcher } from '../claude/watcher';
import { readFileContent, writeFileContent } from '../claude/fileReader';
import { startGitHubOAuth, isGitHubOAuthConfigured } from '../oauth/github';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import type { IncomingMessage } from 'http';
import { spawn, ChildProcess, execFile } from 'child_process';

let claudeBridge: ClaudeBridge | null = null;
let fileWatcher: FileWatcher | null = null;
const mcpProcesses: Map<string, ChildProcess> = new Map();

// Track allowed project paths (set when user selects via dialog)
const allowedProjectPaths: Set<string> = new Set();

// ============================================
// Security helpers
// ============================================

// Validate project name - only allow safe characters
function isValidProjectName(name: string): boolean {
  // Allow alphanumeric, dash, underscore, max 255 chars
  return /^[a-zA-Z0-9_-]{1,255}$/.test(name);
}

// Validate that a path is within an allowed project directory
function isPathAllowed(filePath: string, allowedBases: Set<string>): boolean {
  const resolved = path.resolve(filePath);

  // Check for path traversal attempts
  if (resolved.includes('..') || filePath.includes('\0')) {
    return false;
  }

  // Check if path is within an allowed base
  for (const base of allowedBases) {
    const resolvedBase = path.resolve(base);
    if (resolved.startsWith(resolvedBase + path.sep) || resolved === resolvedBase) {
      return true;
    }
  }

  return false;
}

// Whitelist of allowed shell commands
const ALLOWED_COMMANDS: Record<string, { cmd: string; args: string[] }[]> = {
  'npm test': [{ cmd: 'npm', args: ['test'] }],
  'npm run dev': [{ cmd: 'npm', args: ['run', 'dev'] }],
  'npm run build': [{ cmd: 'npm', args: ['run', 'build'] }],
  'npm install': [{ cmd: 'npm', args: ['install'] }],
  'yarn test': [{ cmd: 'yarn', args: ['test'] }],
  'yarn dev': [{ cmd: 'yarn', args: ['dev'] }],
  'yarn build': [{ cmd: 'yarn', args: ['build'] }],
  'vercel': [{ cmd: 'vercel', args: [] }],
  'vercel --prod': [{ cmd: 'vercel', args: ['--prod'] }],
  'vercel --yes': [{ cmd: 'vercel', args: ['--yes'] }],
  'vercel --prod --yes': [{ cmd: 'vercel', args: ['--prod', '--yes'] }],
  'railway up': [{ cmd: 'railway', args: ['up'] }],
  'claude --version': [{ cmd: 'claude', args: ['--version'] }],
  'claude auth status': [{ cmd: 'claude', args: ['auth', 'status'] }],
};

// Whitelist of safe environment variables to expose
const SAFE_ENV_KEYS = new Set([
  'NODE_ENV',
  'HOME',
  'USER',
  'SHELL',
  'LANG',
  'TERM',
]);

// Keys that should never be exposed
const SENSITIVE_KEY_PATTERNS = [
  /SECRET/i,
  /TOKEN/i,
  /PASSWORD/i,
  /KEY/i,
  /CREDENTIAL/i,
  /AUTH/i,
  /PRIVATE/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

// Sanitize error messages before sending to renderer
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Remove stack trace and sensitive path info
    return error.message.replace(/\/Users\/[^/]+/g, '/Users/***');
  }
  return 'An error occurred';
}

// ============================================
// Main handlers
// ============================================

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Claude process management
  ipcMain.handle(IPC_CHANNELS.CLAUDE_SPAWN, async (_event, projectPath: string) => {
    // Validate project path
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return false;
    }

    if (claudeBridge) {
      claudeBridge.stop();
    }

    claudeBridge = new ClaudeBridge({ projectPath });

    claudeBridge.on('output', (event) => {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_OUTPUT, event);
    });

    claudeBridge.on('error', (event) => {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_ERROR, event);
    });

    claudeBridge.on('exit', (code) => {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_EXIT, code);
    });

    claudeBridge.on('status', (status) => {
      mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_STATUS, status);
    });

    return claudeBridge.spawn();
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_SEND, async (_event, command: string) => {
    return claudeBridge?.send(command) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_PAUSE, async () => {
    return claudeBridge?.pause() ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_RESUME, async () => {
    return claudeBridge?.resume() ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_STOP, async () => {
    return claudeBridge?.stop() ?? false;
  });

  // Track current query bridge for cancellation
  let queryBridge: ClaudeBridge | null = null;

  // Claude query (one-shot for conversational AI)
  ipcMain.handle(IPC_CHANNELS.CLAUDE_QUERY, async (_event, projectPath: string, prompt: string, systemPrompt?: string, modelId?: string) => {
    // Validate project path
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied: path outside allowed directories' };
    }

    // Cancel any existing query
    if (queryBridge) {
      queryBridge.cancelQuery();
      queryBridge = null;
    }

    // Create bridge for this query
    queryBridge = new ClaudeBridge({ projectPath });

    try {
      const result = await queryBridge.query({
        prompt,
        systemPrompt,
        modelId,
        timeout: 120000,
        onChunk: (chunk) => {
          mainWindow.webContents.send(IPC_CHANNELS.CLAUDE_QUERY_CHUNK, chunk);
        },
      });

      queryBridge = null;
      return result;
    } catch (error) {
      queryBridge = null;
      return { success: false, error: sanitizeError(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_QUERY_CANCEL, async () => {
    if (queryBridge) {
      const result = queryBridge.cancelQuery();
      queryBridge = null;
      return result;
    }
    return false;
  });

  // File operations with path validation
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string) => {
    if (!isPathAllowed(filePath, allowedProjectPaths)) {
      throw new Error('Access denied: path outside allowed directories');
    }
    try {
      return await readFileContent(filePath);
    } catch (error) {
      throw new Error(sanitizeError(error));
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_event, filePath: string, content: string) => {
    if (!isPathAllowed(filePath, allowedProjectPaths)) {
      throw new Error('Access denied: path outside allowed directories');
    }
    try {
      await writeFileContent(filePath, content);
      return true;
    } catch (error) {
      throw new Error(sanitizeError(error));
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WATCH, async (_event, dirPath: string) => {
    if (!isPathAllowed(dirPath, allowedProjectPaths)) {
      return false;
    }
    if (!fileWatcher) {
      fileWatcher = new FileWatcher();
      fileWatcher.on('change', (event) => {
        mainWindow.webContents.send(IPC_CHANNELS.FILE_CHANGED, event);
      });
    }
    return fileWatcher.watch(dirPath);
  });

  ipcMain.handle(IPC_CHANNELS.FILE_UNWATCH, async (_event, dirPath: string) => {
    return fileWatcher?.unwatch(dirPath) ?? false;
  });

  // Dialogs
  ipcMain.handle(IPC_CHANNELS.DIALOG_OPEN, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Project Folder',
    });
    if (!result.canceled && result.filePaths[0]) {
      // Add to allowed paths when user explicitly selects
      allowedProjectPaths.add(result.filePaths[0]);
    }
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE, async (_event, defaultPath?: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      title: 'Save File',
    });
    return result.canceled ? null : result.filePath;
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_INPUT, async (_event, title: string, _placeholder: string) => {
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: title,
      message: 'Enter project name in the main window',
      buttons: ['OK'],
    });
    return result.response === 0;
  });

  // Project creation with input validation
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, name: string, basePath: string) => {
    // Validate project name
    if (!isValidProjectName(name)) {
      return { success: false, error: 'Invalid project name. Use only letters, numbers, dashes, and underscores.' };
    }

    // Validate base path is in allowed paths (selected via dialog)
    if (!allowedProjectPaths.has(basePath)) {
      return { success: false, error: 'Base path not authorized. Please select via folder dialog.' };
    }

    const projectPath = path.join(basePath, name);

    // Add new project path to allowed paths
    allowedProjectPaths.add(projectPath);

    try {
      // Create main project directory
      fs.mkdirSync(projectPath, { recursive: true });

      // Create .claude directory structure
      const claudeDir = path.join(projectPath, '.claude');
      fs.mkdirSync(claudeDir, { recursive: true });
      fs.mkdirSync(path.join(claudeDir, 'skills'), { recursive: true });
      fs.mkdirSync(path.join(claudeDir, 'agents'), { recursive: true });
      fs.mkdirSync(path.join(claudeDir, 'commands'), { recursive: true });

      // Create .genius directory
      const geniusDir = path.join(projectPath, '.genius');
      fs.mkdirSync(geniusDir, { recursive: true });

      // Create STATE.json
      const stateJson = {
        version: '6.2.0',
        project: {
          name: name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        phase: 'IDEATION',
        current_skill: null,
        skill_history: [],
        checkpoints: {
          discovery_complete: false,
          market_analysis_complete: false,
          specs_approved: false,
          design_chosen: false,
          architecture_approved: false,
          execution_started: false,
          execution_complete: false,
          qa_passed: false,
          deployed: false,
        },
        tasks: {
          total: 0,
          completed: 0,
          failed: 0,
          skipped: 0,
          current_task_id: null,
        },
        artifacts: {},
        git: {
          enabled: false,
          last_checkpoint: null,
          checkpoints: [],
        },
        errors: [],
        warnings: [],
      };
      fs.writeFileSync(
        path.join(geniusDir, 'STATE.json'),
        JSON.stringify(stateJson, null, 2)
      );

      // Create CLAUDE.md
      const claudeMd = `# ${name}

## Project Overview

This project was created with vibes - Visual IDE for Claude Code.

## Quick Commands

| Command | Description |
|---------|-------------|
| \`/status\` | Show current state |
| \`/continue\` | Resume execution |
| \`/reset\` | Start over |

## State Management

Check current state:
\`\`\`bash
genius status
\`\`\`

State is stored in \`.genius/STATE.json\`.
`;
      fs.writeFileSync(path.join(projectPath, 'CLAUDE.md'), claudeMd);

      // Create settings.json
      const settingsJson = {
        permissions: {
          allow: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
          deny: [],
        },
        hooks: {},
      };
      fs.writeFileSync(
        path.join(claudeDir, 'settings.json'),
        JSON.stringify(settingsJson, null, 2)
      );

      // Create plan.md placeholder
      fs.writeFileSync(
        path.join(claudeDir, 'plan.md'),
        `# ${name} — Execution Plan\n\n**Project:** ${name}\n\n---\n\n*Run genius-architect to generate the execution plan.*\n`
      );

      return { success: true, path: projectPath };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // File operations (extended) with validation
  // ============================================

  ipcMain.handle(IPC_CHANNELS.FILE_EXISTS, async (_event, filePath: string) => {
    if (!isPathAllowed(filePath, allowedProjectPaths)) {
      return false;
    }
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_event, dirPath: string) => {
    if (!isPathAllowed(dirPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied', files: [] };
    }
    try {
      if (!fs.existsSync(dirPath)) {
        return { success: false, error: 'Directory not found', files: [] };
      }
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const files = entries.map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
      }));
      return { success: true, files };
    } catch (error) {
      return { success: false, error: sanitizeError(error), files: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_MKDIR, async (_event, dirPath: string) => {
    if (!isPathAllowed(dirPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // Skills (with path validation)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.SKILLS_LIST, async (_event, projectPath: string) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied', skills: [] };
    }
    try {
      const skillsDir = path.join(projectPath, '.claude', 'skills');
      if (!fs.existsSync(skillsDir)) {
        return { success: true, skills: [] };
      }

      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      const skills = [];

      // Check multiple filename patterns (case-insensitive support)
      const skillFilePatterns = ['SKILL.md', 'skill.md', 'SKILL.yaml', 'skill.yaml', 'index.md'];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name);

          let skillData: { id: string; name: string; description?: string; path: string } = {
            id: entry.name,
            name: entry.name,
            path: skillPath,
          };

          // Find the skill file using multiple patterns
          let skillFilePath: string | null = null;
          let skillFileType: 'yaml' | 'markdown' = 'markdown';

          for (const pattern of skillFilePatterns) {
            const candidate = path.join(skillPath, pattern);
            if (fs.existsSync(candidate)) {
              skillFilePath = candidate;
              skillFileType = pattern.endsWith('.yaml') ? 'yaml' : 'markdown';
              break;
            }
          }

          if (skillFilePath) {
            const content = fs.readFileSync(skillFilePath, 'utf-8');

            if (skillFileType === 'yaml') {
              const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
              const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/);
              if (nameMatch) skillData.name = nameMatch[1];
              if (descMatch) skillData.description = descMatch[1];
            } else {
              // Markdown: check for YAML frontmatter first
              const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
              if (frontmatterMatch) {
                const frontmatter = frontmatterMatch[1];
                const nameMatch = frontmatter.match(/name:\s*["']?([^"'\n]+)["']?/);
                const descMatch = frontmatter.match(/description:\s*["']?([^"'\n]+)["']?/);
                if (nameMatch) skillData.name = nameMatch[1];
                if (descMatch) skillData.description = descMatch[1];
              } else {
                // Fallback to parsing heading and first paragraph
                const headingMatch = content.match(/^#\s+(.+)/m);
                if (headingMatch) skillData.name = headingMatch[1];
                const descMatch = content.match(/^[^#\n].+/m);
                if (descMatch) skillData.description = descMatch[0].substring(0, 100);
              }
            }
          }

          skills.push(skillData);
        }
      }

      return { success: true, skills };
    } catch (error) {
      return { success: false, error: sanitizeError(error), skills: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILLS_GET, async (_event, skillPath: string) => {
    if (!isPathAllowed(skillPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }
    try {
      // Check multiple filename patterns (case-insensitive support)
      const skillFilePatterns = ['SKILL.md', 'skill.md', 'SKILL.yaml', 'skill.yaml', 'index.md'];

      for (const pattern of skillFilePatterns) {
        const candidate = path.join(skillPath, pattern);
        if (fs.existsSync(candidate)) {
          const type = pattern.endsWith('.yaml') ? 'yaml' : 'markdown';
          return { success: true, content: fs.readFileSync(candidate, 'utf-8'), type };
        }
      }

      return { success: false, error: 'Skill file not found' };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // MCP Servers (with command validation)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.MCP_LIST, async (_event, projectPath: string) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied', servers: [] };
    }
    try {
      const settingsPath = path.join(projectPath, '.claude', 'settings.json');
      const mcpConfigPath = path.join(projectPath, '.claude', 'mcp.json');

      let mcpServers: Array<{ id: string; name: string; command: string; status: string }> = [];

      if (fs.existsSync(mcpConfigPath)) {
        const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
        if (config.servers) {
          mcpServers = Object.entries(config.servers).map(([id, server]: [string, unknown]) => ({
            id,
            name: (server as { name?: string }).name || id,
            command: (server as { command?: string }).command || '',
            status: mcpProcesses.has(id) ? 'running' : 'stopped',
          }));
        }
      } else if (fs.existsSync(settingsPath)) {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
        if (settings.mcp?.servers) {
          mcpServers = Object.entries(settings.mcp.servers).map(([id, server]: [string, unknown]) => ({
            id,
            name: (server as { name?: string }).name || id,
            command: (server as { command?: string }).command || '',
            status: mcpProcesses.has(id) ? 'running' : 'stopped',
          }));
        }
      }

      return { success: true, servers: mcpServers };
    } catch (error) {
      return { success: false, error: sanitizeError(error), servers: [] };
    }
  });

  // MCP_START with secure command execution (no shell: true)
  ipcMain.handle(IPC_CHANNELS.MCP_START, async (_event, serverId: string, command: string, cwd: string) => {
    if (!isPathAllowed(cwd, allowedProjectPaths)) {
      return { success: false, error: 'Access denied: invalid working directory' };
    }

    try {
      if (mcpProcesses.has(serverId)) {
        return { success: false, error: 'Server already running' };
      }

      // Parse command safely - split by spaces but handle quoted strings
      const args: string[] = [];
      let current = '';
      let inQuote = false;
      let quoteChar = '';

      for (const char of command) {
        if ((char === '"' || char === "'") && !inQuote) {
          inQuote = true;
          quoteChar = char;
        } else if (char === quoteChar && inQuote) {
          inQuote = false;
          quoteChar = '';
        } else if (char === ' ' && !inQuote) {
          if (current) {
            args.push(current);
            current = '';
          }
        } else {
          current += char;
        }
      }
      if (current) args.push(current);

      const cmd = args.shift();
      if (!cmd) {
        return { success: false, error: 'Invalid command' };
      }

      // Use spawn without shell: true for security
      const proc = spawn(cmd, args, {
        cwd,
        shell: false, // SECURITY: Never use shell: true
        env: { ...process.env },
      });

      proc.stdout?.on('data', (data: Buffer) => {
        mainWindow.webContents.send(IPC_CHANNELS.MCP_OUTPUT, {
          serverId,
          type: 'stdout',
          data: data.toString(),
        });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        mainWindow.webContents.send(IPC_CHANNELS.MCP_OUTPUT, {
          serverId,
          type: 'stderr',
          data: data.toString(),
        });
      });

      proc.on('exit', (code) => {
        mcpProcesses.delete(serverId);
        mainWindow.webContents.send(IPC_CHANNELS.MCP_OUTPUT, {
          serverId,
          type: 'exit',
          code,
        });
      });

      mcpProcesses.set(serverId, proc);
      return { success: true, pid: proc.pid };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_STOP, async (_event, serverId: string) => {
    try {
      const proc = mcpProcesses.get(serverId);
      if (!proc) {
        return { success: false, error: 'Server not running' };
      }

      proc.kill('SIGTERM');
      mcpProcesses.delete(serverId);
      return { success: true };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_STATUS, async (_event, serverId: string) => {
    return { running: mcpProcesses.has(serverId) };
  });

  // ============================================
  // Environment (with whitelist)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.ENV_GET, async (_event, key: string) => {
    // Only allow safe, whitelisted keys
    if (!SAFE_ENV_KEYS.has(key) || isSensitiveKey(key)) {
      return null;
    }
    return process.env[key] || null;
  });

  ipcMain.handle(IPC_CHANNELS.ENV_GET_ALL, async () => {
    // Return only safe subset of environment variables
    const safeEnv: Record<string, string | undefined> = {};
    for (const key of SAFE_ENV_KEYS) {
      if (!isSensitiveKey(key)) {
        safeEnv[key] = process.env[key];
      }
    }
    return safeEnv;
  });

  // Read .env file from project directory
  ipcMain.handle(IPC_CHANNELS.ENV_READ_FILE, async (_event, projectPath: string) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied', variables: [] };
    }
    try {
      const envPath = path.join(projectPath, '.env');
      if (!fs.existsSync(envPath)) {
        return { success: true, variables: [], exists: false };
      }

      const content = fs.readFileSync(envPath, 'utf-8');
      const variables: Array<{ key: string; value: string; comment?: string }> = [];

      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (match) {
          const [, key, rawValue] = match;
          // Remove surrounding quotes if present
          let value = rawValue;
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          variables.push({ key, value });
        }
      }

      return { success: true, variables, exists: true };
    } catch (error) {
      return { success: false, error: sanitizeError(error), variables: [] };
    }
  });

  // Write .env file to project directory
  ipcMain.handle(IPC_CHANNELS.ENV_WRITE_FILE, async (_event, projectPath: string, variables: Array<{ key: string; value: string }>) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }
    try {
      const envPath = path.join(projectPath, '.env');

      // Build .env content with proper escaping
      const lines: string[] = [
        '# Environment variables',
        '# Generated by vibes',
        '',
      ];

      for (const { key, value } of variables) {
        // Validate key format
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          return { success: false, error: `Invalid variable name: ${key}` };
        }
        // Quote values that contain spaces, quotes, or special chars
        const needsQuotes = /[\s"'$`\\]/.test(value);
        const escapedValue = needsQuotes
          ? `"${value.replace(/"/g, '\\"')}"`
          : value;
        lines.push(`${key}=${escapedValue}`);
      }

      fs.writeFileSync(envPath, lines.join('\n') + '\n', 'utf-8');
      return { success: true };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // Shell execution (whitelisted commands only)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.SHELL_EXEC, async (_event, command: string, cwd?: string) => {
    // Validate cwd if provided
    if (cwd && !isPathAllowed(cwd, allowedProjectPaths)) {
      return { success: false, error: 'Access denied: invalid working directory' };
    }

    // Normalize command (remove extra whitespace, trailing operators)
    const normalizedCmd = command.trim().replace(/\s+2>&1.*$/, '').replace(/\s+\|\|.*$/, '').trim();

    // Check if command is in whitelist
    const allowedCmd = ALLOWED_COMMANDS[normalizedCmd];
    if (!allowedCmd) {
      return {
        success: false,
        error: `Command not allowed. Whitelisted commands: ${Object.keys(ALLOWED_COMMANDS).join(', ')}`
      };
    }

    try {
      const { cmd, args } = allowedCmd[0];

      return new Promise((resolve) => {
        execFile(cmd, args, {
          cwd: cwd || process.cwd(),
          encoding: 'utf-8',
          timeout: 60000, // 60 second timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB max output
        }, (error, stdout, stderr) => {
          if (error) {
            resolve({
              success: false,
              error: error.message,
              stdout: stdout || '',
              stderr: stderr || '',
            });
          } else {
            resolve({ success: true, output: stdout, stdout, stderr });
          }
        });
      });
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // Claude Auth
  // ============================================

  ipcMain.handle(IPC_CHANNELS.CLAUDE_AUTH_STATUS, async () => {
    try {
      return new Promise((resolve) => {
        execFile('claude', ['--version'], { encoding: 'utf-8', timeout: 5000 }, (error, stdout) => {
          if (error) {
            resolve({ installed: false, authenticated: false });
            return;
          }

          // Check auth status
          execFile('claude', ['auth', 'status'], { encoding: 'utf-8', timeout: 5000 }, (authError) => {
            resolve({
              installed: true,
              authenticated: !authError,
              version: stdout.trim()
            });
          });
        });
      });
    } catch {
      return { installed: false, authenticated: false };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_AUTH_LOGIN, async () => {
    try {
      const platform = process.platform;
      if (platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', '--args', 'claude', 'auth', 'login']);
      } else if (platform === 'linux') {
        spawn('x-terminal-emulator', ['-e', 'claude', 'auth', 'login']);
      } else if (platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'claude', 'auth', 'login']);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: sanitizeError(error) };
    }
  });

  // ============================================
  // Claude Models (Dynamic)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.CLAUDE_MODELS, async () => {
    try {
      return new Promise((resolve) => {
        execFile('claude', ['models'], { encoding: 'utf-8', timeout: 10000 }, (error, stdout) => {
          if (error) {
            // Return default models if CLI fails
            resolve({
              success: false,
              error: sanitizeError(error),
              models: [
                { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'sonnet' },
                { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'opus' },
                { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', tier: 'haiku' },
              ],
            });
            return;
          }

          // Parse the output to extract model information
          const lines = stdout.trim().split('\n');
          const models: Array<{ id: string; name: string; tier: string }> = [];

          for (const line of lines) {
            // Try to parse model IDs from the output
            // Expected format varies, but model IDs typically follow patterns like:
            // claude-opus-4-20250514, claude-sonnet-4-20250514, etc.
            const modelMatch = line.match(/(claude-(?:opus|sonnet|haiku)-[\w-]+)/i);
            if (modelMatch) {
              const id = modelMatch[1];
              let tier = 'sonnet';
              let name = id;

              if (id.includes('opus')) {
                tier = 'opus';
                name = 'Claude Opus ' + (id.match(/opus-(\d)/)?.[1] || '4');
              } else if (id.includes('sonnet')) {
                tier = 'sonnet';
                name = 'Claude Sonnet ' + (id.match(/sonnet-(\d)/)?.[1] || '4');
              } else if (id.includes('haiku')) {
                tier = 'haiku';
                name = 'Claude Haiku ' + (id.match(/haiku-(\d)/)?.[1] || '3.5');
              }

              // Avoid duplicates
              if (!models.some(m => m.id === id)) {
                models.push({ id, name, tier });
              }
            }
          }

          // If no models found, return defaults
          if (models.length === 0) {
            resolve({
              success: true,
              models: [
                { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'sonnet' },
                { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'opus' },
                { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', tier: 'haiku' },
              ],
            });
            return;
          }

          resolve({ success: true, models });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: sanitizeError(error),
        models: [
          { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', tier: 'sonnet' },
          { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', tier: 'opus' },
          { id: 'claude-haiku-3-5-20241022', name: 'Claude Haiku 3.5', tier: 'haiku' },
        ],
      };
    }
  });

  // ============================================
  // GitHub OAuth
  // ============================================

  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_STATUS, async () => {
    return {
      configured: isGitHubOAuthConfigured(),
    };
  });

  ipcMain.handle(IPC_CHANNELS.GITHUB_AUTH_START, async () => {
    return new Promise((resolve) => {
      const started = startGitHubOAuth((result) => {
        resolve(result);
      });

      if (!started) {
        // Config error already resolved in callback
        return;
      }

      // Set a timeout for the OAuth flow (5 minutes)
      setTimeout(() => {
        resolve({
          success: false,
          error: 'OAuth timed out. Please try again.',
        });
      }, 300000);
    });
  });

  // GitHub create repo
  ipcMain.handle(IPC_CHANNELS.GITHUB_CREATE_REPO, async (
    _event,
    name: string,
    description: string,
    isPrivate: boolean,
    accessToken: string
  ) => {
    // Validate repo name
    if (!/^[a-zA-Z0-9._-]{1,100}$/.test(name)) {
      return { success: false, error: 'Invalid repository name' };
    }

    return new Promise((resolve) => {
      const postData = JSON.stringify({
        name,
        description,
        private: isPrivate,
        auto_init: false,
      });

      const options = {
        hostname: 'api.github.com',
        path: '/user/repos',
        method: 'POST',
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'vibes-app',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res: IncomingMessage) => {
        let data = '';
        res.on('data', (chunk: Buffer) => (data += chunk.toString()));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (res.statusCode && res.statusCode === 201) {
              resolve({
                success: true,
                repoUrl: result.html_url,
                cloneUrl: result.clone_url,
                sshUrl: result.ssh_url,
              });
            } else {
              resolve({
                success: false,
                error: result.message || 'Failed to create repository',
              });
            }
          } catch {
            resolve({ success: false, error: 'Failed to parse response' });
          }
        });
      });

      req.on('error', (err: Error) => {
        resolve({ success: false, error: err.message });
      });

      req.write(postData);
      req.end();
    });
  });

  // ============================================
  // Git Operations
  // ============================================

  // Git status - check for uncommitted and unpushed changes
  ipcMain.handle(IPC_CHANNELS.GIT_STATUS, async (_event, projectPath: string) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied', isRepo: false };
    }

    // Check if .git directory exists
    const gitDir = path.join(projectPath, '.git');
    if (!fs.existsSync(gitDir)) {
      return { success: true, isRepo: false };
    }

    return new Promise((resolve) => {
      // Get uncommitted changes
      execFile('git', ['status', '--porcelain'], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      }, (statusErr, statusOut) => {
        if (statusErr) {
          return resolve({
            success: false,
            error: 'Failed to get git status',
            isRepo: true,
          });
        }

        const hasUncommitted = statusOut.trim().length > 0;

        // Get current branch
        execFile('git', ['branch', '--show-current'], {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 5000,
        }, (branchErr, branchOut) => {
          const branch = branchErr ? 'main' : branchOut.trim() || 'main';

          // Check for unpushed commits
          execFile('git', ['rev-list', '--count', '@{u}..HEAD'], {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 5000,
          }, (unpushedErr, unpushedOut) => {
            const ahead = unpushedErr ? 0 : parseInt(unpushedOut.trim()) || 0;

            // Check for unpulled commits
            execFile('git', ['rev-list', '--count', 'HEAD..@{u}'], {
              cwd: projectPath,
              encoding: 'utf-8',
              timeout: 5000,
            }, (unpulledErr, unpulledOut) => {
              const behind = unpulledErr ? 0 : parseInt(unpulledOut.trim()) || 0;

              // SEC-007 FIX: Return only relative file paths, not full status output
              const changesList = statusOut.trim()
                .split('\n')
                .filter(line => line.trim())
                .map(line => {
                  const status = line.substring(0, 2);
                  const relativePath = line.substring(3);
                  return { status, path: relativePath };
                });

              resolve({
                success: true,
                isRepo: true,
                hasUncommitted,
                hasUnpushed: ahead > 0,
                branch,
                ahead,
                behind,
                changes: changesList,
              });
            });
          });
        });
      });
    });
  });

  // Git init
  ipcMain.handle(IPC_CHANNELS.GIT_INIT, async (_event, projectPath: string) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }

    return new Promise((resolve) => {
      execFile('git', ['init'], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      }, (err) => {
        if (err) {
          return resolve({ success: false, error: err.message });
        }
        resolve({ success: true });
      });
    });
  });

  // Git add remote
  ipcMain.handle(IPC_CHANNELS.GIT_ADD_REMOTE, async (
    _event,
    projectPath: string,
    remoteName: string,
    remoteUrl: string
  ) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }

    // Validate remote name
    if (!/^[a-zA-Z0-9_-]+$/.test(remoteName)) {
      return { success: false, error: 'Invalid remote name' };
    }

    // SEC-003 FIX: Validate git remote URL format
    const validGitUrlPatterns = [
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/,
      /^https:\/\/gitlab\.com\/[\w.-]+\/[\w.-]+(?:\.git)?$/,
      /^https:\/\/bitbucket\.org\/[\w.-]+\/[\w.-]+(?:\.git)?$/,
      /^git@github\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/,
      /^git@gitlab\.com:[\w.-]+\/[\w.-]+(?:\.git)?$/,
      /^git@bitbucket\.org:[\w.-]+\/[\w.-]+(?:\.git)?$/,
    ];

    if (!validGitUrlPatterns.some(pattern => pattern.test(remoteUrl))) {
      return { success: false, error: 'Invalid git URL format. Use HTTPS or SSH URLs from GitHub, GitLab, or Bitbucket.' };
    }

    return new Promise((resolve) => {
      execFile('git', ['remote', 'add', remoteName, remoteUrl], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 10000,
      }, (err) => {
        if (err) {
          // Check if remote already exists
          if (err.message.includes('already exists')) {
            // Update existing remote
            execFile('git', ['remote', 'set-url', remoteName, remoteUrl], {
              cwd: projectPath,
              encoding: 'utf-8',
              timeout: 10000,
            }, (setErr) => {
              if (setErr) {
                return resolve({ success: false, error: setErr.message });
              }
              resolve({ success: true });
            });
          } else {
            return resolve({ success: false, error: err.message });
          }
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  // Git commit and push
  ipcMain.handle(IPC_CHANNELS.GIT_COMMIT_AND_PUSH, async (
    _event,
    projectPath: string,
    message: string
  ) => {
    if (!isPathAllowed(projectPath, allowedProjectPaths)) {
      return { success: false, error: 'Access denied' };
    }

    // SEC-004 FIX: Relaxed validation - execFile with shell:false is safe
    // Only enforce length limit and require non-empty message
    if (!message || message.trim().length === 0) {
      return { success: false, error: 'Commit message is required' };
    }
    if (message.length > 500) {
      return { success: false, error: 'Commit message too long (max 500 characters)' };
    }

    return new Promise((resolve) => {
      // Step 1: git add .
      execFile('git', ['add', '.'], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 30000,
      }, (addErr) => {
        if (addErr) {
          return resolve({ success: false, error: addErr.message, stage: 'add' });
        }

        // Step 2: git commit
        execFile('git', ['commit', '-m', message], {
          cwd: projectPath,
          encoding: 'utf-8',
          timeout: 30000,
        }, (commitErr, commitOut) => {
          // Check if nothing to commit
          if (commitErr && commitErr.message.includes('nothing to commit')) {
            // No changes to commit, try push anyway
          } else if (commitErr) {
            return resolve({ success: false, error: commitErr.message, stage: 'commit' });
          }

          // Step 3: git push
          execFile('git', ['push', '-u', 'origin', 'HEAD'], {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 60000,
          }, (pushErr) => {
            if (pushErr) {
              return resolve({
                success: false,
                error: pushErr.message,
                stage: 'push',
                note: commitOut ? 'Commit succeeded but push failed' : undefined,
              });
            }

            resolve({ success: true, message: 'Committed and pushed successfully' });
          });
        });
      });
    });
  });
}

export function cleanupIpc(): void {
  // Stop all MCP processes
  for (const [, proc] of mcpProcesses) {
    proc.kill('SIGTERM');
  }
  mcpProcesses.clear();
  claudeBridge?.stop();
  fileWatcher?.unwatchAll();
  claudeBridge = null;
  fileWatcher = null;
  allowedProjectPaths.clear();
}
