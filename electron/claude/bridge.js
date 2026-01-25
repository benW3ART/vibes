"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeBridge = void 0;
// electron/claude/bridge.ts
const child_process_1 = require("child_process");
const events_1 = require("events");
const parser_1 = require("./parser");
class ClaudeBridge extends events_1.EventEmitter {
    constructor(options) {
        super();
        this.process = null;
        this.projectPath = options.projectPath;
        this._mode = options.mode || 'auto';
    }
    spawn() {
        if (this.process) {
            return false;
        }
        try {
            this.process = (0, child_process_1.spawn)('claude', [], {
                cwd: this.projectPath,
                shell: true,
                env: { ...process.env },
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
