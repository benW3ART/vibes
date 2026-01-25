// electron/ipc/handlers.ts
import { ipcMain, dialog, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from './channels';
import { ClaudeBridge } from '../claude/bridge';
import { FileWatcher } from '../claude/watcher';
import { readFileContent, writeFileContent } from '../claude/fileReader';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess, execSync } from 'child_process';

let claudeBridge: ClaudeBridge | null = null;
let fileWatcher: FileWatcher | null = null;
const mcpProcesses: Map<string, ChildProcess> = new Map();

export function setupIpcHandlers(mainWindow: BrowserWindow): void {
  // Claude process management
  ipcMain.handle(IPC_CHANNELS.CLAUDE_SPAWN, async (_event, projectPath: string) => {
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

  // File operations
  ipcMain.handle(IPC_CHANNELS.FILE_READ, async (_event, filePath: string) => {
    try {
      return await readFileContent(filePath);
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WRITE, async (_event, filePath: string, content: string) => {
    try {
      await writeFileContent(filePath, content);
      return true;
    } catch (error) {
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_WATCH, async (_event, dirPath: string) => {
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
    return result.canceled ? null : result.filePaths[0];
  });

  ipcMain.handle(IPC_CHANNELS.DIALOG_SAVE, async (_event, defaultPath?: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      title: 'Save File',
    });
    return result.canceled ? null : result.filePath;
  });

  // Input dialog - using message box with input field workaround
  ipcMain.handle(IPC_CHANNELS.DIALOG_INPUT, async (_event, title: string, _placeholder: string) => {
    // Electron doesn't have a native input dialog, so we use prompt via the renderer
    // For now, we'll use a simple approach with showMessageBox for confirmation
    // and rely on the renderer to collect input
    const result = await dialog.showMessageBox(mainWindow, {
      type: 'question',
      title: title,
      message: 'Enter project name in the main window',
      buttons: ['OK'],
    });
    return result.response === 0;
  });

  // Project creation with Genius Team architecture
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, name: string, basePath: string) => {
    console.log('[PROJECT_CREATE] Creating project:', { name, basePath });
    const projectPath = path.join(basePath, name);
    console.log('[PROJECT_CREATE] Full path:', projectPath);

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

      console.log('[PROJECT_CREATE] Success! Created at:', projectPath);
      return { success: true, path: projectPath };
    } catch (error) {
      console.error('[PROJECT_CREATE] Error:', error);
      return { success: false, error: String(error) };
    }
  });

  // ============================================
  // File operations (extended)
  // ============================================

  ipcMain.handle(IPC_CHANNELS.FILE_EXISTS, async (_event, filePath: string) => {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_LIST, async (_event, dirPath: string) => {
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
      return { success: false, error: String(error), files: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.FILE_MKDIR, async (_event, dirPath: string) => {
    try {
      fs.mkdirSync(dirPath, { recursive: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // ============================================
  // Skills
  // ============================================

  ipcMain.handle(IPC_CHANNELS.SKILLS_LIST, async (_event, projectPath: string) => {
    try {
      const skillsDir = path.join(projectPath, '.claude', 'skills');
      if (!fs.existsSync(skillsDir)) {
        return { success: true, skills: [] };
      }

      const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
      const skills = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const skillPath = path.join(skillsDir, entry.name);
          const skillYamlPath = path.join(skillPath, 'skill.yaml');
          const skillMdPath = path.join(skillPath, 'skill.md');

          let skillData: { id: string; name: string; description?: string; path: string } = {
            id: entry.name,
            name: entry.name,
            path: skillPath,
          };

          // Try to read skill.yaml or skill.md for metadata
          if (fs.existsSync(skillYamlPath)) {
            const content = fs.readFileSync(skillYamlPath, 'utf-8');
            // Basic YAML parsing for name and description
            const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
            const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/);
            if (nameMatch) skillData.name = nameMatch[1];
            if (descMatch) skillData.description = descMatch[1];
          } else if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            // Extract first heading as name
            const headingMatch = content.match(/^#\s+(.+)/m);
            if (headingMatch) skillData.name = headingMatch[1];
            // Extract first paragraph as description
            const descMatch = content.match(/^[^#\n].+/m);
            if (descMatch) skillData.description = descMatch[0].substring(0, 100);
          }

          skills.push(skillData);
        }
      }

      return { success: true, skills };
    } catch (error) {
      return { success: false, error: String(error), skills: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.SKILLS_GET, async (_event, skillPath: string) => {
    try {
      const skillYamlPath = path.join(skillPath, 'skill.yaml');
      const skillMdPath = path.join(skillPath, 'skill.md');

      if (fs.existsSync(skillYamlPath)) {
        return { success: true, content: fs.readFileSync(skillYamlPath, 'utf-8'), type: 'yaml' };
      } else if (fs.existsSync(skillMdPath)) {
        return { success: true, content: fs.readFileSync(skillMdPath, 'utf-8'), type: 'markdown' };
      }

      return { success: false, error: 'Skill file not found' };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // ============================================
  // MCP Servers
  // ============================================

  ipcMain.handle(IPC_CHANNELS.MCP_LIST, async (_event, projectPath: string) => {
    try {
      // Check for MCP config in .claude/settings.json or mcp.json
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
      return { success: false, error: String(error), servers: [] };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_START, async (_event, serverId: string, command: string, cwd: string) => {
    try {
      if (mcpProcesses.has(serverId)) {
        return { success: false, error: 'Server already running' };
      }

      const [cmd, ...args] = command.split(' ');
      const proc = spawn(cmd, args, {
        cwd,
        shell: true,
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
      return { success: false, error: String(error) };
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
      return { success: false, error: String(error) };
    }
  });

  ipcMain.handle(IPC_CHANNELS.MCP_STATUS, async (_event, serverId: string) => {
    return { running: mcpProcesses.has(serverId) };
  });

  // ============================================
  // Environment
  // ============================================

  ipcMain.handle(IPC_CHANNELS.ENV_GET, async (_event, key: string) => {
    return process.env[key] || null;
  });

  ipcMain.handle(IPC_CHANNELS.ENV_GET_ALL, async () => {
    // Return safe subset of environment variables
    return {
      NODE_ENV: process.env.NODE_ENV || 'development',
      HOME: process.env.HOME,
      USER: process.env.USER,
      PATH: process.env.PATH,
      SHELL: process.env.SHELL,
    };
  });

  // ============================================
  // Shell execution
  // ============================================

  ipcMain.handle(IPC_CHANNELS.SHELL_EXEC, async (_event, command: string, cwd?: string) => {
    try {
      const output = execSync(command, {
        cwd: cwd || process.cwd(),
        encoding: 'utf-8',
        timeout: 30000,
      });
      return { success: true, output };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      return {
        success: false,
        error: execError.message || String(error),
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
      };
    }
  });

  // ============================================
  // Claude Auth
  // ============================================

  ipcMain.handle(IPC_CHANNELS.CLAUDE_AUTH_STATUS, async () => {
    try {
      // Check if claude CLI is installed and authenticated
      const output = execSync('claude --version', { encoding: 'utf-8', timeout: 5000 });
      // If we get here, claude is installed
      // Try to check auth status (this may vary based on claude CLI version)
      try {
        execSync('claude auth status', { encoding: 'utf-8', timeout: 5000 });
        return { installed: true, authenticated: true, version: output.trim() };
      } catch {
        // Auth check failed, but CLI is installed
        return { installed: true, authenticated: false, version: output.trim() };
      }
    } catch {
      return { installed: false, authenticated: false };
    }
  });

  ipcMain.handle(IPC_CHANNELS.CLAUDE_AUTH_LOGIN, async () => {
    try {
      // Open claude auth login in a new terminal
      // This is platform-specific
      const platform = process.platform;
      if (platform === 'darwin') {
        spawn('open', ['-a', 'Terminal', '--args', 'claude', 'auth', 'login']);
      } else if (platform === 'linux') {
        spawn('x-terminal-emulator', ['-e', 'claude auth login']);
      } else if (platform === 'win32') {
        spawn('cmd.exe', ['/c', 'start', 'cmd', '/k', 'claude auth login']);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
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
}
