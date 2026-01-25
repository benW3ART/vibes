import { useState, useEffect, useCallback } from 'react';

interface MCPServer {
  id: string;
  name: string;
  command: string;
  args: string[];
  status: 'running' | 'stopped' | 'error';
  lastPing?: Date;
  pid?: number;
}

export function useMCP(projectPath?: string) {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadServers = useCallback(async () => {
    if (!projectPath) return;

    setIsLoading(true);
    setError(null);

    try {
      if (window.electron) {
        // First try to get list from IPC (which reads settings.json)
        const result = await window.electron.mcp.list(projectPath);
        if (result.success && result.servers) {
          const loaded: MCPServer[] = result.servers.map(server => ({
            id: server.id,
            name: server.name,
            command: server.command,
            args: [],
            status: server.status,
          }));
          setServers(loaded);
          return;
        }

        // Fallback: read from settings.json directly
        const configPath = `${projectPath}/.claude/settings.json`;
        try {
          const content = await window.electron.file.read(configPath);
          const config = JSON.parse(content);

          if (config.mcpServers) {
            // Check status for each server
            const loaded: MCPServer[] = await Promise.all(
              Object.entries(config.mcpServers).map(
                async ([id, server]: [string, unknown]) => {
                  const s = server as { command?: string; args?: string[] };
                  // Check if server is currently running
                  const statusResult = await window.electron.mcp.status(id);
                  return {
                    id,
                    name: id,
                    command: s.command || '',
                    args: s.args || [],
                    status: statusResult.running ? 'running' as const : 'stopped' as const,
                  };
                }
              )
            );
            setServers(loaded);
          }
        } catch {
          // No config file yet, return empty
          setServers([]);
        }
      } else {
        // Demo mode - return empty
        setServers([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load servers');
    } finally {
      setIsLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const startServer = useCallback(async (serverId: string) => {
    if (!projectPath) return;

    const server = servers.find(s => s.id === serverId);
    if (!server) return;

    if (window.electron) {
      // Optimistically update UI
      setServers(prev =>
        prev.map(s => s.id === serverId ? { ...s, status: 'running' as const } : s)
      );

      try {
        const result = await window.electron.mcp.start(
          serverId,
          server.command,
          projectPath
        );

        if (result.success) {
          setServers(prev =>
            prev.map(s => s.id === serverId ? {
              ...s,
              status: 'running' as const,
              lastPing: new Date(),
              pid: result.pid
            } : s)
          );
        } else {
          setServers(prev =>
            prev.map(s => s.id === serverId ? { ...s, status: 'error' as const } : s)
          );
          setError(result.error || 'Failed to start server');
        }
      } catch (err) {
        setServers(prev =>
          prev.map(s => s.id === serverId ? { ...s, status: 'error' as const } : s)
        );
        setError(err instanceof Error ? err.message : 'Failed to start server');
      }
    } else {
      // Demo mode - just update state
      setServers(prev =>
        prev.map(s => s.id === serverId ? { ...s, status: 'running' as const, lastPing: new Date() } : s)
      );
    }
  }, [projectPath, servers]);

  const stopServer = useCallback(async (serverId: string) => {
    if (window.electron) {
      // Optimistically update UI
      setServers(prev =>
        prev.map(s => s.id === serverId ? { ...s, status: 'stopped' as const } : s)
      );

      try {
        const result = await window.electron.mcp.stop(serverId);

        if (!result.success) {
          setError(result.error || 'Failed to stop server');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to stop server');
      }
    } else {
      // Demo mode - just update state
      setServers(prev =>
        prev.map(s => s.id === serverId ? { ...s, status: 'stopped' as const } : s)
      );
    }
  }, []);

  const addServer = useCallback(async (name: string, command: string) => {
    const newServer: MCPServer = {
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      command,
      args: [],
      status: 'stopped',
    };

    setServers(prev => [...prev, newServer]);

    // Persist to settings.json
    if (window.electron && projectPath) {
      try {
        const configPath = `${projectPath}/.claude/settings.json`;
        let config: Record<string, unknown> = {};

        try {
          const content = await window.electron.file.read(configPath);
          config = JSON.parse(content);
        } catch {
          // File doesn't exist yet
        }

        config.mcpServers = config.mcpServers || {};
        (config.mcpServers as Record<string, unknown>)[newServer.id] = {
          command: newServer.command,
          args: newServer.args,
        };

        await window.electron.file.write(configPath, JSON.stringify(config, null, 2));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save server config');
      }
    }
  }, [projectPath]);

  const removeServer = useCallback(async (serverId: string) => {
    // Stop server first if running
    const server = servers.find(s => s.id === serverId);
    if (server?.status === 'running') {
      await stopServer(serverId);
    }

    setServers(prev => prev.filter(s => s.id !== serverId));

    // Remove from settings.json
    if (window.electron && projectPath) {
      try {
        const configPath = `${projectPath}/.claude/settings.json`;
        const content = await window.electron.file.read(configPath);
        const config = JSON.parse(content);

        if (config.mcpServers && config.mcpServers[serverId]) {
          delete config.mcpServers[serverId];
          await window.electron.file.write(configPath, JSON.stringify(config, null, 2));
        }
      } catch {
        // Ignore errors
      }
    }
  }, [projectPath, servers, stopServer]);

  return {
    servers,
    isLoading,
    error,
    startServer,
    stopServer,
    addServer,
    removeServer,
    refresh: loadServers,
  };
}
