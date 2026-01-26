"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
// electron/ipc/channels.ts
exports.IPC_CHANNELS = {
    // Renderer -> Main: Claude
    CLAUDE_SPAWN: 'claude:spawn',
    CLAUDE_SEND: 'claude:send',
    CLAUDE_PAUSE: 'claude:pause',
    CLAUDE_RESUME: 'claude:resume',
    CLAUDE_STOP: 'claude:stop',
    CLAUDE_QUERY: 'claude:query',
    CLAUDE_QUERY_CANCEL: 'claude:query:cancel',
    CLAUDE_AUTH_STATUS: 'claude:auth:status',
    CLAUDE_AUTH_LOGIN: 'claude:auth:login',
    CLAUDE_MODELS: 'claude:models',
    // Renderer -> Main: GitHub
    GITHUB_AUTH_START: 'github:auth:start',
    GITHUB_AUTH_STATUS: 'github:auth:status',
    // Renderer -> Main: File operations
    FILE_READ: 'file:read',
    FILE_WRITE: 'file:write',
    FILE_WATCH: 'file:watch',
    FILE_UNWATCH: 'file:unwatch',
    FILE_EXISTS: 'file:exists',
    FILE_LIST: 'file:list',
    FILE_MKDIR: 'file:mkdir',
    // Renderer -> Main: Skills
    SKILLS_LIST: 'skills:list',
    SKILLS_GET: 'skills:get',
    // Renderer -> Main: MCP
    MCP_LIST: 'mcp:list',
    MCP_START: 'mcp:start',
    MCP_STOP: 'mcp:stop',
    MCP_STATUS: 'mcp:status',
    // Renderer -> Main: Environment
    ENV_GET: 'env:get',
    ENV_GET_ALL: 'env:getAll',
    ENV_READ_FILE: 'env:readFile',
    ENV_WRITE_FILE: 'env:writeFile',
    // Renderer -> Main: Shell commands
    SHELL_EXEC: 'shell:exec',
    // Renderer -> Main: Dialogs
    DIALOG_OPEN: 'dialog:open',
    DIALOG_SAVE: 'dialog:save',
    DIALOG_INPUT: 'dialog:input',
    // Renderer -> Main: Project
    PROJECT_CREATE: 'project:create',
    // Main -> Renderer (events)
    CLAUDE_OUTPUT: 'claude:output',
    CLAUDE_ERROR: 'claude:error',
    CLAUDE_EXIT: 'claude:exit',
    CLAUDE_STATUS: 'claude:status',
    CLAUDE_QUERY_CHUNK: 'claude:query:chunk',
    FILE_CHANGED: 'file:changed',
    MCP_OUTPUT: 'mcp:output',
    SHELL_OUTPUT: 'shell:output',
};
