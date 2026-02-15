"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
console.log('[Preload] Electron bridge initializing...');
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Claude process
    claude: {
        spawn: (projectPath) => electron_1.ipcRenderer.invoke('claude:spawn', projectPath),
        send: (command) => electron_1.ipcRenderer.invoke('claude:send', command),
        pause: () => electron_1.ipcRenderer.invoke('claude:pause'),
        resume: () => electron_1.ipcRenderer.invoke('claude:resume'),
        stop: () => electron_1.ipcRenderer.invoke('claude:stop'),
        query: (projectPath, prompt, systemPrompt, modelId) => electron_1.ipcRenderer.invoke('claude:query', projectPath, prompt, systemPrompt, modelId),
        queryCancel: (projectPath) => electron_1.ipcRenderer.invoke('claude:query:cancel', projectPath),
        authStatus: () => electron_1.ipcRenderer.invoke('claude:auth:status'),
        authLogin: () => electron_1.ipcRenderer.invoke('claude:auth:login'),
        authLoginStart: () => electron_1.ipcRenderer.invoke('claude:auth:login:start'),
        authLoginCancel: () => electron_1.ipcRenderer.invoke('claude:auth:login:cancel'),
        models: () => electron_1.ipcRenderer.invoke('claude:models'),
        invokeSkill: (projectPath, skillName, userInput) => electron_1.ipcRenderer.invoke('claude:invokeSkill', projectPath, skillName, userInput),
        onAuthOutput: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:auth:output', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:auth:output', handler);
        },
        onOutput: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:output', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:output', handler);
        },
        onError: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:error', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:error', handler);
        },
        onExit: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:exit', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:exit', handler);
        },
        onStatus: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:status', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:status', handler);
        },
        onQueryChunk: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('claude:query:chunk', handler);
            return () => electron_1.ipcRenderer.removeListener('claude:query:chunk', handler);
        },
    },
    // File operations
    file: {
        read: (filePath) => electron_1.ipcRenderer.invoke('file:read', filePath),
        write: (filePath, content) => electron_1.ipcRenderer.invoke('file:write', filePath, content),
        exists: (filePath) => electron_1.ipcRenderer.invoke('file:exists', filePath),
        list: (dirPath) => electron_1.ipcRenderer.invoke('file:list', dirPath),
        mkdir: (dirPath) => electron_1.ipcRenderer.invoke('file:mkdir', dirPath),
        watch: (dirPath) => electron_1.ipcRenderer.invoke('file:watch', dirPath),
        unwatch: (dirPath) => electron_1.ipcRenderer.invoke('file:unwatch', dirPath),
        onChanged: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('file:changed', handler);
            return () => electron_1.ipcRenderer.removeListener('file:changed', handler);
        },
    },
    // Skills
    skills: {
        list: (projectPath) => electron_1.ipcRenderer.invoke('skills:list', projectPath),
        get: (skillPath) => electron_1.ipcRenderer.invoke('skills:get', skillPath),
    },
    // MCP Servers
    mcp: {
        list: (projectPath) => electron_1.ipcRenderer.invoke('mcp:list', projectPath),
        start: (serverId, command, cwd) => electron_1.ipcRenderer.invoke('mcp:start', serverId, command, cwd),
        stop: (serverId) => electron_1.ipcRenderer.invoke('mcp:stop', serverId),
        status: (serverId) => electron_1.ipcRenderer.invoke('mcp:status', serverId),
        onOutput: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('mcp:output', handler);
            return () => electron_1.ipcRenderer.removeListener('mcp:output', handler);
        },
    },
    // GitHub OAuth
    github: {
        authStatus: () => electron_1.ipcRenderer.invoke('github:auth:status'),
        authStart: () => electron_1.ipcRenderer.invoke('github:auth:start'),
        createRepo: (name, description, isPrivate, accessToken) => electron_1.ipcRenderer.invoke('github:createRepo', name, description, isPrivate, accessToken),
        // Secure token storage (encrypted with OS keychain)
        saveToken: (token, username) => electron_1.ipcRenderer.invoke('github:token:save', token, username),
        loadToken: () => electron_1.ipcRenderer.invoke('github:token:load'),
        clearToken: () => electron_1.ipcRenderer.invoke('github:token:clear'),
    },
    // Git operations
    git: {
        status: (projectPath) => electron_1.ipcRenderer.invoke('git:status', projectPath),
        init: (projectPath) => electron_1.ipcRenderer.invoke('git:init', projectPath),
        addRemote: (projectPath, name, url) => electron_1.ipcRenderer.invoke('git:addRemote', projectPath, name, url),
        commitAndPush: (projectPath, message) => electron_1.ipcRenderer.invoke('git:commitAndPush', projectPath, message),
    },
    // Environment
    env: {
        get: (key) => electron_1.ipcRenderer.invoke('env:get', key),
        getAll: () => electron_1.ipcRenderer.invoke('env:getAll'),
        readFile: (projectPath) => electron_1.ipcRenderer.invoke('env:readFile', projectPath),
        writeFile: (projectPath, variables) => electron_1.ipcRenderer.invoke('env:writeFile', projectPath, variables),
    },
    // Shell
    shell: {
        exec: (command, cwd) => electron_1.ipcRenderer.invoke('shell:exec', command, cwd),
        onOutput: (callback) => {
            const handler = (_event, ...args) => callback(...args);
            electron_1.ipcRenderer.on('shell:output', handler);
            return () => electron_1.ipcRenderer.removeListener('shell:output', handler);
        },
    },
    // Dialogs
    dialog: {
        openDirectory: () => electron_1.ipcRenderer.invoke('dialog:open'),
        saveFile: (defaultPath) => electron_1.ipcRenderer.invoke('dialog:save', defaultPath),
        showInputBox: (title, placeholder) => electron_1.ipcRenderer.invoke('dialog:input', title, placeholder),
    },
    // Project operations
    project: {
        create: (name, path) => electron_1.ipcRenderer.invoke('project:create', name, path),
        registerPath: (path) => electron_1.ipcRenderer.invoke('project:registerPath', path),
    },
});
// Load GitHub token on startup
electron_1.ipcRenderer.invoke('github:token:load')
    .then((result) => {
    if (result.success) {
        console.log('[Preload] GitHub token loaded for user:', result.username);
    }
})
    .catch(() => {
    // Ignore errors - token may not exist yet
});
console.log('[Preload] Electron bridge ready');
