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

interface EnvVariable {
  key: string;
  value: string;
  comment?: string;
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

interface ClaudeModel {
  id: string;
  name: string;
  tier: 'opus' | 'sonnet' | 'haiku';
}

interface ClaudeModelsResult {
  success: boolean;
  models: ClaudeModel[];
  error?: string;
}

interface GitChange {
  status: string;
  path: string;
}

interface GitStatusResult {
  success: boolean;
  isRepo: boolean;
  hasUncommitted: boolean;
  hasUnpushed: boolean;
  branch: string;
  ahead: number;
  behind: number;
  changes: GitChange[];
  error?: string;
}

interface GitCommitPushResult {
  success: boolean;
  error?: string;
  stage?: 'add' | 'commit' | 'push';
  note?: string;
}

interface GitInitResult {
  success: boolean;
  error?: string;
}

interface GitAddRemoteResult {
  success: boolean;
  error?: string;
}

interface GitHubRepoResult {
  success: boolean;
  repoUrl?: string;
  cloneUrl?: string;
  sshUrl?: string;
  error?: string;
}

interface ElectronAPI {
  claude: {
    spawn: (projectPath: string) => Promise<boolean>;
    send: (command: string) => Promise<boolean>;
    pause: () => Promise<boolean>;
    resume: () => Promise<boolean>;
    stop: () => Promise<boolean>;
    query: (projectPath: string, prompt: string, systemPrompt?: string, modelId?: string) => Promise<ClaudeQueryResult>;
    queryCancel: () => Promise<boolean>;
    authStatus: () => Promise<ClaudeAuthStatus>;
    authLogin: () => Promise<{ success: boolean; error?: string }>;
    models: () => Promise<ClaudeModelsResult>;
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
  github: {
    authStatus: () => Promise<{ configured: boolean }>;
    authStart: () => Promise<{
      success: boolean;
      accessToken?: string;
      tokenType?: string;
      scope?: string;
      username?: string;
      error?: string;
    }>;
    createRepo: (
      name: string,
      description: string,
      isPrivate: boolean,
      accessToken: string
    ) => Promise<GitHubRepoResult>;
  };
  git: {
    status: (projectPath: string) => Promise<GitStatusResult>;
    init: (projectPath: string) => Promise<GitInitResult>;
    addRemote: (projectPath: string, name: string, url: string) => Promise<GitAddRemoteResult>;
    commitAndPush: (projectPath: string, message: string) => Promise<GitCommitPushResult>;
  };
  env: {
    get: (key: string) => Promise<string | null>;
    getAll: () => Promise<Record<string, string | undefined>>;
    readFile: (projectPath: string) => Promise<{
      success: boolean;
      variables: EnvVariable[];
      exists?: boolean;
      error?: string;
    }>;
    writeFile: (projectPath: string, variables: Array<{ key: string; value: string }>) => Promise<{
      success: boolean;
      error?: string;
    }>;
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
