// electron/claude/bridge.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { parseClaudeOutput } from './parser';

export interface ClaudeBridgeOptions {
  projectPath: string;
  mode?: 'auto' | 'ask' | 'plan';
}

export class ClaudeBridge extends EventEmitter {
  private process: ChildProcess | null = null;
  private projectPath: string;
  private _mode: string;

  constructor(options: ClaudeBridgeOptions) {
    super();
    this.projectPath = options.projectPath;
    this._mode = options.mode || 'auto';
  }

  spawn(): boolean {
    if (this.process) {
      return false;
    }

    try {
      this.process = spawn('claude', [], {
        cwd: this.projectPath,
        shell: true,
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
