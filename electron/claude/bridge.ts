// electron/claude/bridge.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { parseClaudeOutput } from './parser';

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

  constructor(options: ClaudeBridgeOptions) {
    super();
    this.projectPath = options.projectPath;
    this._mode = options.mode || 'auto';
  }

  // One-shot query using claude --print for conversational AI
  async query(options: QueryOptions): Promise<QueryResult> {
    const { prompt, systemPrompt, modelId, timeout = 120000, onChunk } = options;

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

      let response = '';
      let errorOutput = '';

      this.queryProcess = spawn('claude', args, {
        cwd: this.projectPath,
        shell: false,
        env: { ...process.env },
      });

      const timeoutId = setTimeout(() => {
        if (this.queryProcess) {
          this.queryProcess.kill('SIGTERM');
          resolve({ success: false, error: 'Query timed out' });
        }
      }, timeout);

      this.queryProcess.stdout?.on('data', (data: Buffer) => {
        const chunk = data.toString();
        response += chunk;
        onChunk?.(chunk);
      });

      this.queryProcess.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      this.queryProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        this.queryProcess = null;

        if (code === 0) {
          resolve({ success: true, response: response.trim() });
        } else {
          resolve({
            success: false,
            error: errorOutput || `Process exited with code ${code}`,
            response: response.trim() || undefined,
          });
        }
      });

      this.queryProcess.on('error', (err) => {
        clearTimeout(timeoutId);
        this.queryProcess = null;
        resolve({ success: false, error: err.message });
      });
    });
  }

  // Cancel ongoing query
  cancelQuery(): boolean {
    if (this.queryProcess) {
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
      this.process = spawn('claude', [], {
        cwd: this.projectPath,
        shell: false, // SECURITY: Never use shell: true
        env: { ...process.env },
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
