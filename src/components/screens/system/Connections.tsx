import { useState, useRef, useCallback } from 'react';
import { SectionTitle, Badge, Button, EmptyState, StatusDot } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useConnectionsStore, toast } from '@/stores';
import type { ConnectionType } from '@/stores';

const AUTH_POLL_INTERVAL = 2000; // 2 seconds
const AUTH_TIMEOUT = 300000; // 5 minutes

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
  const [authPollingMessage, setAuthPollingMessage] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    setAuthPollingMessage(null);
  }, []);

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

      if (authStatus.authenticated) {
        // Already authenticated
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
        return;
      }

      // Need to authenticate - open terminal and start polling
      toast.info('Opening Claude authentication in terminal...');
      const loginResult = await window.electron.claude.authLogin();

      if (!loginResult.success) {
        addConnection({
          type: 'claude',
          name: 'Claude',
          status: 'error',
          error: loginResult.error || 'Failed to open authentication',
        });
        toast.error(loginResult.error || 'Failed to open authentication');
        return;
      }

      // Start polling for auth status
      setAuthPollingMessage('Complete authentication in terminal. Waiting...');

      // Set timeout for 5 minutes
      pollingTimeoutRef.current = setTimeout(() => {
        stopPolling();
        toast.error('Authentication timed out. Please try again.');
        setConnecting(null);
      }, AUTH_TIMEOUT);

      // Poll every 2 seconds
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const status = await window.electron.claude.authStatus();
          if (status.authenticated) {
            stopPolling();
            addConnection({
              type: 'claude',
              name: 'Claude',
              status: 'connected',
              lastConnected: new Date(),
              metadata: {
                authenticated: true,
                version: status.version,
              },
            });
            toast.success('Claude connected successfully!');
            setConnecting(null);
          }
        } catch {
          // Continue polling on error
        }
      }, AUTH_POLL_INTERVAL);
    } catch (error) {
      stopPolling();
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

    try {
      // Check if OAuth is configured
      const status = await window.electron.github.authStatus();
      if (!status.configured) {
        addConnection({
          type: 'github',
          name: 'GitHub',
          status: 'error',
          error: 'GitHub OAuth not configured. Set VITE_GITHUB_CLIENT_ID and VITE_GITHUB_CLIENT_SECRET.',
        });
        toast.error('GitHub OAuth not configured. Check environment variables.');
        return;
      }

      // Start OAuth flow - this opens browser and waits for callback
      toast.info('Opening GitHub authentication in browser...');
      setAuthPollingMessage('Complete authentication in browser. Waiting...');

      const result = await window.electron.github.authStart();
      setAuthPollingMessage(null);

      if (result.success) {
        addConnection({
          type: 'github',
          name: 'GitHub',
          status: 'connected',
          lastConnected: new Date(),
          metadata: {
            username: result.username,
            scope: result.scope,
          },
        });
        toast.success(`GitHub connected as ${result.username || 'user'}`);
      } else {
        addConnection({
          type: 'github',
          name: 'GitHub',
          status: 'error',
          error: result.error || 'Authentication failed',
        });
        toast.error(result.error || 'GitHub authentication failed');
      }
    } catch (error) {
      setAuthPollingMessage(null);
      addConnection({
        type: 'github',
        name: 'GitHub',
        status: 'error',
        error: String(error),
      });
      toast.error(`GitHub connection failed: ${error}`);
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

        {/* Auth polling notification */}
        {authPollingMessage && (
          <div className="auth-polling-banner">
            <div className="auth-polling-content">
              <span className="auth-polling-icon">🔄</span>
              <span className="auth-polling-message">{authPollingMessage}</span>
              <Button variant="ghost" size="sm" onClick={stopPolling}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {connectedServices.length === 0 && !authPollingMessage ? (
          <EmptyState
            icon="link"
            title="No connections configured"
            description="Connect to Claude and GitHub to enable AI-powered development"
            action={{
              label: 'Add Connection',
              onClick: () => setShowAddModal(true),
            }}
          />
        ) : connectedServices.length === 0 && authPollingMessage ? null : (
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
