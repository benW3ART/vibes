import { useState } from 'react';
import { SectionTitle, Badge, Button, EmptyState, StatusDot } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useConnectionsStore, toast } from '@/stores';
import type { ConnectionType } from '@/stores';

// Service configuration
const services = [
  {
    type: 'claude' as ConnectionType,
    name: 'Claude',
    description: 'AI assistant for code generation and analysis',
    icon: '✨',
    authMethod: 'oauth',
  },
  {
    type: 'github' as ConnectionType,
    name: 'GitHub',
    description: 'Version control and collaboration',
    icon: '🐙',
    authMethod: 'oauth',
  },
];

export function Connections() {
  const {
    connections,
    isConnecting,
    addConnection,
    removeConnection,
    setConnecting,
  } = useConnectionsStore();

  const [showAddModal, setShowAddModal] = useState(false);

  const handleConnect = async (type: ConnectionType) => {
    setConnecting(type);

    try {
      if (type === 'claude') {
        await connectClaude();
      } else if (type === 'github') {
        await connectGitHub();
      }
    } catch (error) {
      toast.error(`Failed to connect to ${type}: ${error}`);
    } finally {
      setConnecting(null);
    }
  };

  const connectClaude = async () => {
    // Claude uses the Claude Code CLI which has its own OAuth
    if (!window.electron) {
      // Demo mode - simulate connection
      addConnection({
        type: 'claude',
        name: 'Claude',
        status: 'connected',
        lastConnected: new Date(),
        metadata: { mode: 'demo' },
      });
      toast.success('Claude connected (demo mode)');
      return;
    }

    // In Electron mode, check Claude CLI auth status
    try {
      const authStatus = await window.electron.claude.authStatus();

      if (!authStatus.installed) {
        toast.error('Claude CLI not installed. Please install it first: npm install -g @anthropic-ai/claude-code');
        addConnection({
          type: 'claude',
          name: 'Claude',
          status: 'error',
          error: 'Claude CLI not installed',
        });
        return;
      }

      if (!authStatus.authenticated) {
        // Need to authenticate
        toast.info('Opening Claude authentication...');
        const loginResult = await window.electron.claude.authLogin();

        if (!loginResult.success) {
          addConnection({
            type: 'claude',
            name: 'Claude',
            status: 'error',
            error: loginResult.error || 'Authentication failed',
          });
          toast.error(loginResult.error || 'Authentication failed');
          return;
        }
      }

      // Successfully authenticated
      addConnection({
        type: 'claude',
        name: 'Claude',
        status: 'connected',
        lastConnected: new Date(),
        metadata: {
          authenticated: true,
          version: authStatus.version,
        },
      });
      toast.success('Claude connected successfully');
    } catch (error) {
      addConnection({
        type: 'claude',
        name: 'Claude',
        status: 'error',
        error: String(error),
      });
      toast.error(`Failed to connect: ${error}`);
    }
  };

  const connectGitHub = async () => {
    // GitHub OAuth flow
    // In production, this would open a browser window for OAuth
    // and handle the callback via a custom protocol

    if (!window.electron) {
      // Demo mode - simulate connection
      addConnection({
        type: 'github',
        name: 'GitHub',
        status: 'connected',
        lastConnected: new Date(),
        metadata: {
          mode: 'demo',
          username: 'demo-user',
        },
      });
      toast.success('GitHub connected (demo mode)');
      return;
    }

    // In Electron mode, we would:
    // 1. Open browser with GitHub OAuth URL
    // 2. Handle callback via vibes:// protocol
    // 3. Exchange code for access token
    // For now, simulate the flow
    try {
      // Open GitHub OAuth (placeholder - would need actual client_id)
      const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID || 'demo';
      // const redirectUri = 'vibes://oauth/github/callback';
      // const scope = 'repo,user';

      if (clientId === 'demo') {
        // Demo mode
        addConnection({
          type: 'github',
          name: 'GitHub',
          status: 'connected',
          lastConnected: new Date(),
          metadata: { mode: 'demo' },
        });
        toast.success('GitHub connected (demo mode - configure VITE_GITHUB_CLIENT_ID for production)');
        return;
      }

      // Would open: https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}
      toast.info('GitHub OAuth flow would open here...');

      addConnection({
        type: 'github',
        name: 'GitHub',
        status: 'connected',
        lastConnected: new Date(),
      });
    } catch (error) {
      addConnection({
        type: 'github',
        name: 'GitHub',
        status: 'error',
        error: String(error),
      });
      throw error;
    }
  };

  const handleDisconnect = (id: string) => {
    removeConnection(id);
    toast.success('Disconnected successfully');
  };

  const getServiceInfo = (type: ConnectionType) => {
    return services.find(s => s.type === type);
  };

  const connectedServices = connections.filter(c => c.status === 'connected');
  const availableServices = services.filter(
    s => !connections.find(c => c.type === s.type && c.status === 'connected')
  );

  return (
    <div className="screen connections">
      <QuickActions />

      <div className="connections-content">
        <div className="connections-header">
          <SectionTitle>
            Connections <Badge>{connectedServices.length}</Badge>
          </SectionTitle>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
          >
            + Add Connection
          </Button>
        </div>

        {connectedServices.length === 0 ? (
          <EmptyState
            icon="link"
            title="No connections configured"
            description="Connect to Claude and GitHub to enable AI-powered development"
            action={{
              label: 'Add Connection',
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : (
          <div className="connections-grid">
            {connections.map(conn => {
              const service = getServiceInfo(conn.type);
              return (
                <div key={conn.id} className={`connection-card ${conn.status}`}>
                  <div className="connection-header">
                    <StatusDot
                      status={conn.status === 'connected' ? 'active' : conn.status === 'error' ? 'error' : 'idle'}
                      pulse={conn.status === 'connected'}
                    />
                    <span className="connection-icon">{service?.icon || '🔗'}</span>
                    <span className="connection-name">{conn.name}</span>
                    <Badge variant={conn.status === 'connected' ? 'success' : conn.status === 'error' ? 'error' : 'default'}>
                      {conn.status}
                    </Badge>
                  </div>
                  {conn.lastConnected && (
                    <div className="connection-meta">
                      Connected: {new Date(conn.lastConnected).toLocaleDateString()}
                    </div>
                  )}
                  {conn.error && (
                    <div className="connection-error">{conn.error}</div>
                  )}
                  <div className="connection-actions">
                    {conn.status === 'connected' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDisconnect(conn.id)}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleConnect(conn.type)}
                        disabled={isConnecting === conn.type}
                      >
                        {isConnecting === conn.type ? 'Connecting...' : 'Reconnect'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Connection Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Add Connection</h2>
            <p className="modal-description">
              Connect to external services to enhance your development workflow
            </p>

            <div className="service-list">
              {availableServices.map(service => (
                <div key={service.type} className="service-item">
                  <div className="service-info">
                    <span className="service-icon">{service.icon}</span>
                    <div className="service-details">
                      <span className="service-name">{service.name}</span>
                      <span className="service-description">{service.description}</span>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setShowAddModal(false);
                      handleConnect(service.type);
                    }}
                    disabled={isConnecting === service.type}
                  >
                    {isConnecting === service.type ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              ))}

              {availableServices.length === 0 && (
                <div className="service-item empty">
                  <span className="service-empty">All services are already connected</span>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
