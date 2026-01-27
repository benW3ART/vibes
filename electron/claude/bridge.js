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
exports.ClaudeBridge = void 0;
// electron/claude/bridge.ts
const child_process_1 = require("child_process");
const events_1 = require("events");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const parser_1 = require("./parser");
// Find claude binary - Electron may not have the same PATH as terminal
function findClaudeBinary() {
    // Common locations for claude binary
    const possiblePaths = [
        path.join(os.homedir(), '.local', 'bin', 'claude'),
        '/usr/local/bin/claude',
        '/opt/homebrew/bin/claude',
        path.join(os.homedir(), '.nvm', 'current', 'bin', 'claude'),
    ];
    // Check if any of these exist
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            console.log('[ClaudeBridge] Found claude binary at:', p);
            return p;
        }
    }
    // Try to find via which command (in case it's somewhere else)
    try {
        const result = (0, child_process_1.execSync)('which claude', { encoding: 'utf8' }).trim();
        if (result && fs.existsSync(result)) {
            console.log('[ClaudeBridge] Found claude binary via which:', result);
            return result;
        }
    }
    catch {
        // which command failed
    }
    // Fall back to 'claude' and hope it's in PATH
    console.log('[ClaudeBridge] Could not find claude binary, using "claude" and hoping for the best');
    return 'claude';
}
// Cache the claude binary path
let claudeBinaryPath = null;
function getClaudeBinary() {
    if (!claudeBinaryPath) {
        claudeBinaryPath = findClaudeBinary();
    }
    return claudeBinaryPath;
}
class ClaudeBridge extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.process = null;
        this.queryProcess = null;
        this.queryCancelled = false; // Track intentional cancellation
        this.projectPath = options.projectPath;
        this._mode = options.mode || 'auto';
    }
    // One-shot query using claude --print for conversational AI
    async query(options) {
        const { prompt, systemPrompt, modelId, timeout = 120000, onChunk } = options;
        console.log('[ClaudeBridge] query() called');
        console.log('[ClaudeBridge] Project path:', this.projectPath);
        console.log('[ClaudeBridge] Timeout:', timeout);
        console.log('[ClaudeBridge] Model ID:', modelId || 'default');
        console.log('[ClaudeBridge] System prompt length:', systemPrompt?.length || 0);
        console.log('[ClaudeBridge] Prompt length:', prompt?.length || 0);
        console.log('[ClaudeBridge] Prompt preview:', prompt?.substring(0, 200) + (prompt?.length > 200 ? '...' : ''));
        // Validate project path exists
        if (!fs.existsSync(this.projectPath)) {
            console.error('[ClaudeBridge] Project path does not exist:', this.projectPath);
            return { success: false, error: `Project directory not found: ${this.projectPath}` };
        }
        // Reset cancellation flag for new query
        this.queryCancelled = false;
        return new Promise((resolve) => {
            const args = ['--print'];
            // Add model if specified
            if (modelId) {
                args.push('--model', modelId);
            }
            // Add system prompt if provided
            if (systemPrompt) {
                args.push('--system-prompt', systemPrompt);
            }
            // Add the prompt
            args.push(prompt);
            const claudeBin = getClaudeBinary();
            console.log('[ClaudeBridge] Using claude binary:', claudeBin);
            console.log('[ClaudeBridge] Spawning with args:', args.map((a, i) => i === args.length - 1 ? `[prompt:${a.length}chars]` : a).join(' '));
            let response = '';
            let errorOutput = '';
            // Ensure PATH includes common binary locations
            const extraPaths = [
                path.join(os.homedir(), '.local', 'bin'),
                '/usr/local/bin',
                '/opt/homebrew/bin',
            ].join(':');
            const enhancedEnv = {
                ...process.env,
                PATH: `${extraPaths}:${process.env.PATH || ''}`,
            };
            try {
                this.queryProcess = (0, child_process_1.spawn)(claudeBin, args, {
                    cwd: this.projectPath,
                    shell: false,
                    env: enhancedEnv,
                    stdio: ['pipe', 'pipe', 'pipe'], // Explicitly set stdio
                });
                console.log('[ClaudeBridge] Process spawned, PID:', this.queryProcess.pid);
                // Close stdin immediately - claude --print doesn't need input
                if (this.queryProcess.stdin) {
                    this.queryProcess.stdin.end();
                    console.log('[ClaudeBridge] stdin closed');
                }
            }
            catch (spawnError) {
                console.error('[ClaudeBridge] Failed to spawn process:', spawnError);
                resolve({ success: false, error: `Failed to spawn: ${spawnError}` });
                return;
            }
            const timeoutId = setTimeout(() => {
                console.log('[ClaudeBridge] TIMEOUT reached after', timeout, 'ms');
                console.log('[ClaudeBridge] Response so far:', response.substring(0, 500));
                console.log('[ClaudeBridge] Error output so far:', errorOutput);
                if (this.queryProcess) {
                    console.log('[ClaudeBridge] Killing process due to timeout');
                    this.queryProcess.kill('SIGTERM');
                    resolve({ success: false, error: 'Query timed out' });
                }
            }, timeout);
            this.queryProcess.stdout?.on('data', (data) => {
                const chunk = data.toString();
                console.log('[ClaudeBridge] stdout chunk received, length:', chunk.length);
                console.log('[ClaudeBridge] stdout chunk preview:', chunk.substring(0, 200));
                response += chunk;
                onChunk?.(chunk);
            });
            this.queryProcess.stderr?.on('data', (data) => {
                const chunk = data.toString();
                console.log('[ClaudeBridge] stderr:', chunk);
                errorOutput += chunk;
            });
            this.queryProcess.on('close', (code) => {
                console.log('[ClaudeBridge] Process closed with code:', code);
                console.log('[ClaudeBridge] Total response length:', response.length);
                console.log('[ClaudeBridge] Total error output length:', errorOutput.length);
                console.log('[ClaudeBridge] Was cancelled:', this.queryCancelled);
                clearTimeout(timeoutId);
                this.queryProcess = null;
                // If query was intentionally cancelled, resolve with cancelled status (not an error)
                if (this.queryCancelled) {
                    console.log('[ClaudeBridge] Query was cancelled, resolving with cancelled status');
                    resolve({ success: false, error: 'Query cancelled', response: undefined });
                    return;
                }
                if (code === 0) {
                    console.log('[ClaudeBridge] Success! Response preview:', response.substring(0, 300));
                    resolve({ success: true, response: response.trim() });
                }
                else {
                    console.log('[ClaudeBridge] Failed with code:', code);
                    console.log('[ClaudeBridge] Error output:', errorOutput);
                    resolve({
                        success: false,
                        error: errorOutput || `Process exited with code ${code}`,
                        response: response.trim() || undefined,
                    });
                }
            });
            this.queryProcess.on('error', (err) => {
                console.error('[ClaudeBridge] Process error event:', err);
                clearTimeout(timeoutId);
                this.queryProcess = null;
                resolve({ success: false, error: err.message });
            });
        });
    }
    // Cancel ongoing query
    cancelQuery() {
        if (this.queryProcess) {
            console.log('[ClaudeBridge] Cancelling query, PID:', this.queryProcess.pid);
            this.queryCancelled = true; // Mark as intentionally cancelled
            this.queryProcess.kill('SIGTERM');
            this.queryProcess = null;
            return true;
        }
        return false;
    }
    spawn() {
        if (this.process) {
            return false;
        }
        try {
            const claudeBin = getClaudeBinary();
            const extraPaths = [
                path.join(os.homedir(), '.local', 'bin'),
                '/usr/local/bin',
                '/opt/homebrew/bin',
            ].join(':');
            this.process = (0, child_process_1.spawn)(claudeBin, [], {
                cwd: this.projectPath,
                shell: false, // SECURITY: Never use shell: true
                env: {
                    ...process.env,
                    PATH: `${extraPaths}:${process.env.PATH || ''}`,
                },
            });
            this.process.stdout?.on('data', (data) => {
                const lines = data.toString().split('\n').filter(Boolean);
                for (const line of lines) {
                    const event = (0, parser_1.parseClaudeOutput)(line);
                    this.emit('output', event);
                }
            });
            this.process.stderr?.on('data', (data) => {
                this.emit('error', {
                    type: 'error',
                    message: data.toString(),
                    timestamp: new Date(),
                    raw: data.toString()
                });
            });
            this.process.on('exit', (code) => {
                this.emit('exit', code);
                this.process = null;
            });
            this.emit('status', { running: true, pid: this.process.pid });
            return true;
        }
        catch (error) {
            this.emit('error', {
                type: 'error',
                message: String(error),
                timestamp: new Date(),
                raw: String(error)
            });
            return false;
        }
    }
    send(command) {
        if (!this.process?.stdin) {
            return false;
        }
        this.process.stdin.write(command + '\n');
        return true;
    }
    pause() {
        if (!this.process)
            return false;
        this.process.kill('SIGSTOP');
        this.emit('status', { running: false, paused: true });
        return true;
    }
    resume() {
        if (!this.process)
            return false;
        this.process.kill('SIGCONT');
        this.emit('status', { running: true, paused: false });
        return true;
    }
    stop() {
        if (!this.process)
            return false;
        this.process.kill('SIGTERM');
        this.process = null;
        this.emit('status', { running: false });
        return true;
    }
    isRunning() {
        return this.process !== null;
    }
    getPid() {
        return this.process?.pid || null;
    }
}
exports.ClaudeBridge = ClaudeBridge;
