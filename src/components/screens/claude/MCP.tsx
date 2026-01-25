import { useState } from 'react';
import { useMCP } from '@/hooks';
import { useProjectStore, toast } from '@/stores';
import { ConnectionCard, SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function MCP() {
  const { currentProject } = useProjectStore();
  const { servers, isLoading, startServer, stopServer, addServer, refresh } = useMCP(currentProject?.path);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerCommand, setNewServerCommand] = useState('');

  const handleAddServer = async () => {
    const serverName = newServerName.trim();
    const serverCommand = newServerCommand.trim();

    if (!serverName || !serverCommand) {
      toast.error('Please fill in all fields');
      return;
    }
    await addServer(serverName, serverCommand);
    setShowAddModal(false);
    setNewServerName('');
    setNewServerCommand('');
    toast.success(`Server "${serverName}" added!`);
  };

  const runningServers = servers.filter(s => s.status === 'running');
  const stoppedServers = servers.filter(s => s.status === 'stopped');
  const errorServers = servers.filter(s => s.status === 'error');

  if (isLoading) {
    return (
      <div className="screen mcp">
        <div className="mcp-loading">Loading MCP servers...</div>
      </div>
    );
  }

  return (
    <div className="screen mcp">
      <QuickActions />

      <div className="mcp-content">
        <div className="mcp-header">
          <SectionTitle>
            MCP Servers <Badge>{servers.length}</Badge>
          </SectionTitle>
          <div className="mcp-actions">
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh</Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>+ Add Server</Button>
          </div>
        </div>

        {servers.length === 0 ? (
          <EmptyState
            icon="🔌"
            title="No MCP servers configured"
            description="MCP servers extend Claude's capabilities"
            action={{
              label: 'Add MCP server',
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="mcp-servers">
            {runningServers.length > 0 && (
              <div className="mcp-section">
                <SectionTitle>
                  Running <Badge variant="success">{runningServers.length}</Badge>
                </SectionTitle>
                <div className="mcp-grid">
                  {runningServers.map(server => (
                    <ConnectionCard
                      key={server.id}
                      connection={{
                        id: server.id,
                        name: server.name,
                        type: 'MCP',
                        status: 'connected',
                        lastPing: server.lastPing,
                      }}
                      onClick={() => stopServer(server.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {stoppedServers.length > 0 && (
              <div className="mcp-section">
                <SectionTitle>
                  Stopped <Badge>{stoppedServers.length}</Badge>
                </SectionTitle>
                <div className="mcp-grid">
                  {stoppedServers.map(server => (
                    <ConnectionCard
                      key={server.id}
                      connection={{
                        id: server.id,
                        name: server.name,
                        type: 'MCP',
                        status: 'disconnected',
                      }}
                      onClick={() => startServer(server.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {errorServers.length > 0 && (
              <div className="mcp-section">
                <SectionTitle>
                  Error <Badge variant="error">{errorServers.length}</Badge>
                </SectionTitle>
                <div className="mcp-grid">
                  {errorServers.map(server => (
                    <ConnectionCard
                      key={server.id}
                      connection={{
                        id: server.id,
                        name: server.name,
                        type: 'MCP',
                        status: 'error',
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Server Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add MCP Server</h2>
            <p className="modal-description">
              Configure a new MCP server to extend Claude's capabilities
            </p>

            <div className="form-group">
              <label className="form-label">Server Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., filesystem, sqlite"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Command</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., npx -y @modelcontextprotocol/server-filesystem"
                value={newServerCommand}
                onChange={(e) => setNewServerCommand(e.target.value)}
              />
              <span className="form-hint">
                The command to start the MCP server
              </span>
            </div>

            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleAddServer}
                disabled={!newServerName.trim() || !newServerCommand.trim()}
              >
                Add Server
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
