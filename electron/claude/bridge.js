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
        this.queryProcess = null;
        this.projectPath = options.projectPath;
        this._mode = options.mode || 'auto';
    }
    // One-shot query using claude --print for conversational AI
    async query(options) {
        const { prompt, systemPrompt, timeout = 120000, onChunk } = options;
        return new Promise((resolve) => {
            const args = ['--print'];
            // Add system prompt if provided
            if (systemPrompt) {
                args.push('--system-prompt', systemPrompt);
            }
            // Add the prompt
            args.push(prompt);
            let response = '';
            let errorOutput = '';
            this.queryProcess = (0, child_process_1.spawn)('claude', args, {
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
            this.queryProcess.stdout?.on('data', (data) => {
                const chunk = data.toString();
                response += chunk;
                onChunk?.(chunk);
            });
            this.queryProcess.stderr?.on('data', (data) => {
                errorOutput += data.toString();
            });
            this.queryProcess.on('close', (code) => {
                clearTimeout(timeoutId);
                this.queryProcess = null;
                if (code === 0) {
                    resolve({ success: true, response: response.trim() });
                }
                else {
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
    cancelQuery() {
        if (this.queryProcess) {
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
            this.process = (0, child_process_1.spawn)('claude', [], {
                cwd: this.projectPath,
                shell: false, // SECURITY: Never use shell: true
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
