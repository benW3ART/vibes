type Listener = (...args: unknown[]) => void;
type Unsubscribe = () => void;

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
}

interface SkillInfo {
  id: string;
  name: string;
  description?: string;
  path: string;
}

interface MCPServer {
  id: string;
  name: string;
  command: string;
  status: 'running' | 'stopped';
}

interface ClaudeAuthStatus {
  installed: boolean;
  authenticated: boolean;
  version?: string;
}

interface ClaudeQueryResult {
  success: boolean;
  response?: string;
  error?: string;
}

interface ElectronAPI {
  claude: {
    spawn: (projectPath: string) => Promise<boolean>;
    send: (command: string) => Promise<boolean>;
    pause: () => Promise<boolean>;
    resume: () => Promise<boolean>;
    stop: () => Promise<boolean>;
    query: (projectPath: string, prompt: string, systemPrompt?: string) => Promise<ClaudeQueryResult>;
    queryCancel: () => Promise<boolean>;
    authStatus: () => Promise<ClaudeAuthStatus>;
    authLogin: () => Promise<{ success: boolean; error?: string }>;
    onOutput: (callback: Listener) => Unsubscribe;
    onError: (callback: Listener) => Unsubscribe;
    onExit: (callback: Listener) => Unsubscribe;
    onStatus: (callback: Listener) => Unsubscribe;
    onQueryChunk: (callback: Listener) => Unsubscribe;
  };
  file: {
    read: (filePath: string) => Promise<string>;
    write: (filePath: string, content: string) => Promise<boolean>;
    exists: (filePath: string) => Promise<boolean>;
    list: (dirPath: string) => Promise<{ success: boolean; files: FileEntry[]; error?: string }>;
    mkdir: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
    watch: (dirPath: string) => Promise<boolean>;
    unwatch: (dirPath: string) => Promise<boolean>;
    onChanged: (callback: Listener) => Unsubscribe;
  };
  skills: {
    list: (projectPath: string) => Promise<{ success: boolean; skills: SkillInfo[]; error?: string }>;
    get: (skillPath: string) => Promise<{ success: boolean; content?: string; type?: string; error?: string }>;
  };
  mcp: {
    list: (projectPath: string) => Promise<{ success: boolean; servers: MCPServer[]; error?: string }>;
    start: (serverId: string, command: string, cwd: string) => Promise<{ success: boolean; pid?: number; error?: string }>;
    stop: (serverId: string) => Promise<{ success: boolean; error?: string }>;
    status: (serverId: string) => Promise<{ running: boolean }>;
    onOutput: (callback: Listener) => Unsubscribe;
  };
  env: {
    get: (key: string) => Promise<string | null>;
    getAll: () => Promise<Record<string, string | undefined>>;
  };
  shell: {
    exec: (command: string, cwd?: string) => Promise<{ success: boolean; output?: string; error?: string; stdout?: string; stderr?: string }>;
    onOutput: (callback: Listener) => Unsubscribe;
  };
  dialog: {
    openDirectory: () => Promise<string | null>;
    saveFile: (defaultPath?: string) => Promise<string | null>;
    showInputBox: (title: string, placeholder: string) => Promise<boolean>;
  };
  project: {
    create: (name: string, path: string) => Promise<{ success: boolean; path?: string; error?: string }>;
  };
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
