import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type Listener = (...args: unknown[]) => void;

contextBridge.exposeInMainWorld('electron', {
  // Claude process
  claude: {
    spawn: (projectPath: string) => ipcRenderer.invoke('claude:spawn', projectPath),
    send: (command: string) => ipcRenderer.invoke('claude:send', command),
    pause: () => ipcRenderer.invoke('claude:pause'),
    resume: () => ipcRenderer.invoke('claude:resume'),
    stop: () => ipcRenderer.invoke('claude:stop'),
    query: (projectPath: string, prompt: string, systemPrompt?: string, modelId?: string) =>
      ipcRenderer.invoke('claude:query', projectPath, prompt, systemPrompt, modelId),
    queryCancel: () => ipcRenderer.invoke('claude:query:cancel'),
    authStatus: () => ipcRenderer.invoke('claude:auth:status'),
    authLogin: () => ipcRenderer.invoke('claude:auth:login'),
    models: () => ipcRenderer.invoke('claude:models'),
    onOutput: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('claude:output', handler);
      return () => ipcRenderer.removeListener('claude:output', handler);
    },
    onError: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('claude:error', handler);
      return () => ipcRenderer.removeListener('claude:error', handler);
    },
    onExit: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('claude:exit', handler);
      return () => ipcRenderer.removeListener('claude:exit', handler);
    },
    onStatus: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('claude:status', handler);
      return () => ipcRenderer.removeListener('claude:status', handler);
    },
    onQueryChunk: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('claude:query:chunk', handler);
      return () => ipcRenderer.removeListener('claude:query:chunk', handler);
    },
  },

  // File operations
  file: {
    read: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
    write: (filePath: string, content: string) => ipcRenderer.invoke('file:write', filePath, content),
    exists: (filePath: string) => ipcRenderer.invoke('file:exists', filePath),
    list: (dirPath: string) => ipcRenderer.invoke('file:list', dirPath),
    mkdir: (dirPath: string) => ipcRenderer.invoke('file:mkdir', dirPath),
    watch: (dirPath: string) => ipcRenderer.invoke('file:watch', dirPath),
    unwatch: (dirPath: string) => ipcRenderer.invoke('file:unwatch', dirPath),
    onChanged: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('file:changed', handler);
      return () => ipcRenderer.removeListener('file:changed', handler);
    },
  },

  // Skills
  skills: {
    list: (projectPath: string) => ipcRenderer.invoke('skills:list', projectPath),
    get: (skillPath: string) => ipcRenderer.invoke('skills:get', skillPath),
  },

  // MCP Servers
  mcp: {
    list: (projectPath: string) => ipcRenderer.invoke('mcp:list', projectPath),
    start: (serverId: string, command: string, cwd: string) => ipcRenderer.invoke('mcp:start', serverId, command, cwd),
    stop: (serverId: string) => ipcRenderer.invoke('mcp:stop', serverId),
    status: (serverId: string) => ipcRenderer.invoke('mcp:status', serverId),
    onOutput: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('mcp:output', handler);
      return () => ipcRenderer.removeListener('mcp:output', handler);
    },
  },

  // GitHub OAuth
  github: {
    authStatus: () => ipcRenderer.invoke('github:auth:status'),
    authStart: () => ipcRenderer.invoke('github:auth:start'),
  },

  // Environment
  env: {
    get: (key: string) => ipcRenderer.invoke('env:get', key),
    getAll: () => ipcRenderer.invoke('env:getAll'),
    readFile: (projectPath: string) => ipcRenderer.invoke('env:readFile', projectPath),
    writeFile: (projectPath: string, variables: Array<{ key: string; value: string }>) =>
      ipcRenderer.invoke('env:writeFile', projectPath, variables),
  },

  // Shell
  shell: {
    exec: (command: string, cwd?: string) => ipcRenderer.invoke('shell:exec', command, cwd),
    onOutput: (callback: Listener) => {
      const handler = (_event: IpcRendererEvent, ...args: unknown[]) => callback(...args);
      ipcRenderer.on('shell:output', handler);
      return () => ipcRenderer.removeListener('shell:output', handler);
    },
  },

  // Dialogs
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:open'),
    saveFile: (defaultPath?: string) => ipcRenderer.invoke('dialog:save', defaultPath),
    showInputBox: (title: string, placeholder: string) => ipcRenderer.invoke('dialog:input', title, placeholder),
  },

  // Project operations
  project: {
    create: (name: string, path: string) => ipcRenderer.invoke('project:create', name, path),
  },
});
