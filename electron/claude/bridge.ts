// electron/claude/bridge.ts
import { spawn, ChildProcess, execSync } from 'child_process';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { parseClaudeOutput } from './parser';

// Find claude binary - Electron may not have the same PATH as terminal
function findClaudeBinary(): string {
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
    const result = execSync('which claude', { encoding: 'utf8' }).trim();
    if (result && fs.existsSync(result)) {
      console.log('[ClaudeBridge] Found claude binary via which:', result);
      return result;
    }
  } catch {
    // which command failed
  }

  // Fall back to 'claude' and hope it's in PATH
  console.log('[ClaudeBridge] Could not find claude binary, using "claude" and hoping for the best');
  return 'claude';
}

// Cache the claude binary path
let claudeBinaryPath: string | null = null;
function getClaudeBinary(): string {
  if (!claudeBinaryPath) {
    claudeBinaryPath = findClaudeBinary();
  }
  return claudeBinaryPath;
}

export interface ClaudeBridgeOptions {
  projectPath: string;
  mode?: 'auto' | 'ask' | 'plan';
}

export interface QueryOptions {
  prompt: string;
  systemPrompt?: string;
  modelId?: string; // Model ID to use (e.g., 'claude-sonnet-4-20250514')
  timeout?: number;
  onChunk?: (chunk: string) => void;
}

export interface QueryResult {
  success: boolean;
  response?: string;
  error?: string;
}

export class ClaudeBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private projectPath: string;
  private _mode: string;
  private queryProcess: ChildProcess | null = null;
  private queryCancelled = false; // Track intentional cancellation

  constructor(options: ClaudeBridgeOptions) {
    super();
    this.projectPath = options.projectPath;
    this._mode = options.mode || 'auto';
  }

  // One-shot query using claude --print for conversational AI
  async query(options: QueryOptions): Promise<QueryResult> {
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
      const args: string[] = ['--print'];

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
        this.queryProcess = spawn(claudeBin, args, {
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
      } catch (spawnError) {
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

      this.queryProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        console.log('[ClaudeBridge] stdout chunk received, length:', chunk.length);
        console.log('[ClaudeBridge] stdout chunk preview:', chunk.substring(0, 200));
        response += chunk;
        onChunk?.(chunk);
      });

      this.queryProcess.stderr?.on('data', (data: Buffer) => {
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
        } else {
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
  cancelQuery(): boolean {
    if (this.queryProcess) {
      console.log('[ClaudeBridge] Cancelling query, PID:', this.queryProcess.pid);
      this.queryCancelled = true; // Mark as intentionally cancelled
      this.queryProcess.kill('SIGTERM');
      this.queryProcess = null;
      return true;
    }
    return false;
  }

  spawn(): boolean {
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

      this.process = spawn(claudeBin, [], {
        cwd: this.projectPath,
        shell: false, // SECURITY: Never use shell: true
        env: {
          ...process.env,
          PATH: `${extraPaths}:${process.env.PATH || ''}`,
        },
      });

      this.process.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          const event = parseClaudeOutput(line);
          this.emit('output', event);
        }
      });

      this.process.stderr?.on('data', (data: Buffer) => {
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
    } catch (error) {
      this.emit('error', {
        type: 'error',
        message: String(error),
        timestamp: new Date(),
        raw: String(error)
      });
      return false;
    }
  }

  send(command: string): boolean {
    if (!this.process?.stdin) {
      return false;
    }
    this.process.stdin.write(command + '\n');
    return true;
  }

  pause(): boolean {
    if (!this.process) return false;
    this.process.kill('SIGSTOP');
    this.emit('status', { running: false, paused: true });
    return true;
  }

  resume(): boolean {
    if (!this.process) return false;
    this.process.kill('SIGCONT');
    this.emit('status', { running: true, paused: false });
    return true;
  }

  stop(): boolean {
    if (!this.process) return false;
    this.process.kill('SIGTERM');
    this.process = null;
    this.emit('status', { running: false });
    return true;
  }

  isRunning(): boolean {
    return this.process !== null;
  }

  getPid(): number | null {
    return this.process?.pid || null;
  }
}
