"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupIpcHandlers = setupIpcHandlers;
exports.cleanupIpc = cleanupIpc;
// electron/ipc/handlers.ts
const electron_1 = require("electron");
const channels_1 = require("./channels");
const bridge_1 = require("../claude/bridge");
const watcher_1 = require("../claude/watcher");
const fileReader_1 = require("../claude/fileReader");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
let claudeBridge = null;
let fileWatcher = null;
const mcpProcesses = new Map();
// Track allowed project paths (set when user selects via dialog)
const allowedProjectPaths = new Set();
// ============================================
// Security helpers
// ============================================
// Validate project name - only allow safe characters
function isValidProjectName(name) {
    // Allow alphanumeric, dash, underscore, max 255 chars
    return /^[a-zA-Z0-9_-]{1,255}$/.test(name);
}
// Validate that a path is within an allowed project directory
function isPathAllowed(filePath, allowedBases) {
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
const ALLOWED_COMMANDS = {
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
function isSensitiveKey(key) {
    return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}
// Sanitize error messages before sending to renderer
function sanitizeError(error) {
    if (error instanceof Error) {
        // Remove stack trace and sensitive path info
        return error.message.replace(/\/Users\/[^/]+/g, '/Users/***');
    }
    return 'An error occurred';
}
// ============================================
// Main handlers
// ============================================
function setupIpcHandlers(mainWindow) {
    // Claude process management
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_SPAWN, async (_event, projectPath) => {
        // Validate project path
        if (!isPathAllowed(projectPath, allowedProjectPaths)) {
            return false;
        }
        if (claudeBridge) {
            claudeBridge.stop();
        }
        claudeBridge = new bridge_1.ClaudeBridge({ projectPath });
        claudeBridge.on('output', (event) => {
            mainWindow.webContents.send(channels_1.IPC_CHANNELS.CLAUDE_OUTPUT, event);
        });
        claudeBridge.on('error', (event) => {
            mainWindow.webContents.send(channels_1.IPC_CHANNELS.CLAUDE_ERROR, event);
        });
        claudeBridge.on('exit', (code) => {
            mainWindow.webContents.send(channels_1.IPC_CHANNELS.CLAUDE_EXIT, code);
        });
        claudeBridge.on('status', (status) => {
            mainWindow.webContents.send(channels_1.IPC_CHANNELS.CLAUDE_STATUS, status);
        });
        return claudeBridge.spawn();
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_SEND, async (_event, command) => {
        return claudeBridge?.send(command) ?? false;
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_PAUSE, async () => {
        return claudeBridge?.pause() ?? false;
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_RESUME, async () => {
        return claudeBridge?.resume() ?? false;
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_STOP, async () => {
        return claudeBridge?.stop() ?? false;
    });
    // File operations with path validation
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_READ, async (_event, filePath) => {
        if (!isPathAllowed(filePath, allowedProjectPaths)) {
            throw new Error('Access denied: path outside allowed directories');
        }
        try {
            return await (0, fileReader_1.readFileContent)(filePath);
        }
        catch (error) {
            throw new Error(sanitizeError(error));
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_WRITE, async (_event, filePath, content) => {
        if (!isPathAllowed(filePath, allowedProjectPaths)) {
            throw new Error('Access denied: path outside allowed directories');
        }
        try {
            await (0, fileReader_1.writeFileContent)(filePath, content);
            return true;
        }
        catch (error) {
            throw new Error(sanitizeError(error));
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_WATCH, async (_event, dirPath) => {
        if (!isPathAllowed(dirPath, allowedProjectPaths)) {
            return false;
        }
        if (!fileWatcher) {
            fileWatcher = new watcher_1.FileWatcher();
            fileWatcher.on('change', (event) => {
                mainWindow.webContents.send(channels_1.IPC_CHANNELS.FILE_CHANGED, event);
            });
        }
        return fileWatcher.watch(dirPath);
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_UNWATCH, async (_event, dirPath) => {
        return fileWatcher?.unwatch(dirPath) ?? false;
    });
    // Dialogs
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DIALOG_OPEN, async () => {
        const result = await electron_1.dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Select Project Folder',
        });
        if (!result.canceled && result.filePaths[0]) {
            // Add to allowed paths when user explicitly selects
            allowedProjectPaths.add(result.filePaths[0]);
        }
        return result.canceled ? null : result.filePaths[0];
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DIALOG_SAVE, async (_event, defaultPath) => {
        const result = await electron_1.dialog.showSaveDialog(mainWindow, {
            defaultPath,
            title: 'Save File',
        });
        return result.canceled ? null : result.filePath;
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.DIALOG_INPUT, async (_event, title, _placeholder) => {
        const result = await electron_1.dialog.showMessageBox(mainWindow, {
            type: 'question',
            title: title,
            message: 'Enter project name in the main window',
            buttons: ['OK'],
        });
        return result.response === 0;
    });
    // Project creation with input validation
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.PROJECT_CREATE, async (_event, name, basePath) => {
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
            fs.writeFileSync(path.join(geniusDir, 'STATE.json'), JSON.stringify(stateJson, null, 2));
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
            fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settingsJson, null, 2));
            // Create plan.md placeholder
            fs.writeFileSync(path.join(claudeDir, 'plan.md'), `# ${name} — Execution Plan\n\n**Project:** ${name}\n\n---\n\n*Run genius-architect to generate the execution plan.*\n`);
            return { success: true, path: projectPath };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    // ============================================
    // File operations (extended) with validation
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_EXISTS, async (_event, filePath) => {
        if (!isPathAllowed(filePath, allowedProjectPaths)) {
            return false;
        }
        try {
            return fs.existsSync(filePath);
        }
        catch {
            return false;
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_LIST, async (_event, dirPath) => {
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
        }
        catch (error) {
            return { success: false, error: sanitizeError(error), files: [] };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.FILE_MKDIR, async (_event, dirPath) => {
        if (!isPathAllowed(dirPath, allowedProjectPaths)) {
            return { success: false, error: 'Access denied' };
        }
        try {
            fs.mkdirSync(dirPath, { recursive: true });
            return { success: true };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    // ============================================
    // Skills (with path validation)
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SKILLS_LIST, async (_event, projectPath) => {
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
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const skillPath = path.join(skillsDir, entry.name);
                    const skillYamlPath = path.join(skillPath, 'skill.yaml');
                    const skillMdPath = path.join(skillPath, 'skill.md');
                    let skillData = {
                        id: entry.name,
                        name: entry.name,
                        path: skillPath,
                    };
                    if (fs.existsSync(skillYamlPath)) {
                        const content = fs.readFileSync(skillYamlPath, 'utf-8');
                        const nameMatch = content.match(/name:\s*["']?([^"'\n]+)["']?/);
                        const descMatch = content.match(/description:\s*["']?([^"'\n]+)["']?/);
                        if (nameMatch)
                            skillData.name = nameMatch[1];
                        if (descMatch)
                            skillData.description = descMatch[1];
                    }
                    else if (fs.existsSync(skillMdPath)) {
                        const content = fs.readFileSync(skillMdPath, 'utf-8');
                        const headingMatch = content.match(/^#\s+(.+)/m);
                        if (headingMatch)
                            skillData.name = headingMatch[1];
                        const descMatch = content.match(/^[^#\n].+/m);
                        if (descMatch)
                            skillData.description = descMatch[0].substring(0, 100);
                    }
                    skills.push(skillData);
                }
            }
            return { success: true, skills };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error), skills: [] };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SKILLS_GET, async (_event, skillPath) => {
        if (!isPathAllowed(skillPath, allowedProjectPaths)) {
            return { success: false, error: 'Access denied' };
        }
        try {
            const skillYamlPath = path.join(skillPath, 'skill.yaml');
            const skillMdPath = path.join(skillPath, 'skill.md');
            if (fs.existsSync(skillYamlPath)) {
                return { success: true, content: fs.readFileSync(skillYamlPath, 'utf-8'), type: 'yaml' };
            }
            else if (fs.existsSync(skillMdPath)) {
                return { success: true, content: fs.readFileSync(skillMdPath, 'utf-8'), type: 'markdown' };
            }
            return { success: false, error: 'Skill file not found' };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    // ============================================
    // MCP Servers (with command validation)
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MCP_LIST, async (_event, projectPath) => {
        if (!isPathAllowed(projectPath, allowedProjectPaths)) {
            return { success: false, error: 'Access denied', servers: [] };
        }
        try {
            const settingsPath = path.join(projectPath, '.claude', 'settings.json');
            const mcpConfigPath = path.join(projectPath, '.claude', 'mcp.json');
            let mcpServers = [];
            if (fs.existsSync(mcpConfigPath)) {
                const config = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf-8'));
                if (config.servers) {
                    mcpServers = Object.entries(config.servers).map(([id, server]) => ({
                        id,
                        name: server.name || id,
                        command: server.command || '',
                        status: mcpProcesses.has(id) ? 'running' : 'stopped',
                    }));
                }
            }
            else if (fs.existsSync(settingsPath)) {
                const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
                if (settings.mcp?.servers) {
                    mcpServers = Object.entries(settings.mcp.servers).map(([id, server]) => ({
                        id,
                        name: server.name || id,
                        command: server.command || '',
                        status: mcpProcesses.has(id) ? 'running' : 'stopped',
                    }));
                }
            }
            return { success: true, servers: mcpServers };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error), servers: [] };
        }
    });
    // MCP_START with secure command execution (no shell: true)
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MCP_START, async (_event, serverId, command, cwd) => {
        if (!isPathAllowed(cwd, allowedProjectPaths)) {
            return { success: false, error: 'Access denied: invalid working directory' };
        }
        try {
            if (mcpProcesses.has(serverId)) {
                return { success: false, error: 'Server already running' };
            }
            // Parse command safely - split by spaces but handle quoted strings
            const args = [];
            let current = '';
            let inQuote = false;
            let quoteChar = '';
            for (const char of command) {
                if ((char === '"' || char === "'") && !inQuote) {
                    inQuote = true;
                    quoteChar = char;
                }
                else if (char === quoteChar && inQuote) {
                    inQuote = false;
                    quoteChar = '';
                }
                else if (char === ' ' && !inQuote) {
                    if (current) {
                        args.push(current);
                        current = '';
                    }
                }
                else {
                    current += char;
                }
            }
            if (current)
                args.push(current);
            const cmd = args.shift();
            if (!cmd) {
                return { success: false, error: 'Invalid command' };
            }
            // Use spawn without shell: true for security
            const proc = (0, child_process_1.spawn)(cmd, args, {
                cwd,
                shell: false, // SECURITY: Never use shell: true
                env: { ...process.env },
            });
            proc.stdout?.on('data', (data) => {
                mainWindow.webContents.send(channels_1.IPC_CHANNELS.MCP_OUTPUT, {
                    serverId,
                    type: 'stdout',
                    data: data.toString(),
                });
            });
            proc.stderr?.on('data', (data) => {
                mainWindow.webContents.send(channels_1.IPC_CHANNELS.MCP_OUTPUT, {
                    serverId,
                    type: 'stderr',
                    data: data.toString(),
                });
            });
            proc.on('exit', (code) => {
                mcpProcesses.delete(serverId);
                mainWindow.webContents.send(channels_1.IPC_CHANNELS.MCP_OUTPUT, {
                    serverId,
                    type: 'exit',
                    code,
                });
            });
            mcpProcesses.set(serverId, proc);
            return { success: true, pid: proc.pid };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MCP_STOP, async (_event, serverId) => {
        try {
            const proc = mcpProcesses.get(serverId);
            if (!proc) {
                return { success: false, error: 'Server not running' };
            }
            proc.kill('SIGTERM');
            mcpProcesses.delete(serverId);
            return { success: true };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.MCP_STATUS, async (_event, serverId) => {
        return { running: mcpProcesses.has(serverId) };
    });
    // ============================================
    // Environment (with whitelist)
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.ENV_GET, async (_event, key) => {
        // Only allow safe, whitelisted keys
        if (!SAFE_ENV_KEYS.has(key) || isSensitiveKey(key)) {
            return null;
        }
        return process.env[key] || null;
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.ENV_GET_ALL, async () => {
        // Return only safe subset of environment variables
        const safeEnv = {};
        for (const key of SAFE_ENV_KEYS) {
            if (!isSensitiveKey(key)) {
                safeEnv[key] = process.env[key];
            }
        }
        return safeEnv;
    });
    // ============================================
    // Shell execution (whitelisted commands only)
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.SHELL_EXEC, async (_event, command, cwd) => {
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
                (0, child_process_1.execFile)(cmd, args, {
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
                    }
                    else {
                        resolve({ success: true, output: stdout, stdout, stderr });
                    }
                });
            });
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
    // ============================================
    // Claude Auth
    // ============================================
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_AUTH_STATUS, async () => {
        try {
            return new Promise((resolve) => {
                (0, child_process_1.execFile)('claude', ['--version'], { encoding: 'utf-8', timeout: 5000 }, (error, stdout) => {
                    if (error) {
                        resolve({ installed: false, authenticated: false });
                        return;
                    }
                    // Check auth status
                    (0, child_process_1.execFile)('claude', ['auth', 'status'], { encoding: 'utf-8', timeout: 5000 }, (authError) => {
                        resolve({
                            installed: true,
                            authenticated: !authError,
                            version: stdout.trim()
                        });
                    });
                });
            });
        }
        catch {
            return { installed: false, authenticated: false };
        }
    });
    electron_1.ipcMain.handle(channels_1.IPC_CHANNELS.CLAUDE_AUTH_LOGIN, async () => {
        try {
            const platform = process.platform;
            if (platform === 'darwin') {
                (0, child_process_1.spawn)('open', ['-a', 'Terminal', '--args', 'claude', 'auth', 'login']);
            }
            else if (platform === 'linux') {
                (0, child_process_1.spawn)('x-terminal-emulator', ['-e', 'claude', 'auth', 'login']);
            }
            else if (platform === 'win32') {
                (0, child_process_1.spawn)('cmd.exe', ['/c', 'start', 'cmd', '/k', 'claude', 'auth', 'login']);
            }
            return { success: true };
        }
        catch (error) {
            return { success: false, error: sanitizeError(error) };
        }
    });
}
function cleanupIpc() {
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
