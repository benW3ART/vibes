import { useState, useEffect, useRef } from 'react';
import { useConnectionsStore } from '@/stores';
import { Button, Badge } from '@/components/ui';

type OnboardingStep = 'claude' | 'github' | 'vercel' | 'complete';
type ClaudeSetupState = 'checking' | 'not-installed' | 'installed' | 'authenticating' | 'authenticated';

interface StepConfig {
  id: OnboardingStep;
  title: string;
  description: string;
  required: boolean;
  icon: string;
}

const steps: StepConfig[] = [
  {
    id: 'claude',
    title: 'Connect Claude',
    description: 'Claude Code is required to use vibes. This powers all AI features.',
    required: true,
    icon: '🤖',
  },
  {
    id: 'github',
    title: 'Connect GitHub',
    description: 'Sync your projects, create repos automatically, and collaborate with your team.',
    required: false,
    icon: '🐙',
  },
  {
    id: 'vercel',
    title: 'Connect Vercel',
    description: 'Deploy your projects with one click directly from vibes.',
    required: false,
    icon: '▲',
  },
];

const CLAUDE_DOWNLOAD_URL = 'https://claude.ai/download';

const ONBOARDING_COMPLETE_KEY = 'vibes:onboardingComplete';

export function OnboardingWizard() {
  const { isClaudeConnected, isGitHubConnected, addConnection, updateConnection, getConnection, saveGitHubToken } = useConnectionsStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('claude');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Check localStorage on mount to persist onboarding completion
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ONBOARDING_COMPLETE_KEY) === 'true';
    }
    return false;
  });

  // Claude-specific state
  const [claudeState, setClaudeState] = useState<ClaudeSetupState>('checking');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      // Cancel any running auth process
      if (window.electron) {
        window.electron.claude.authLoginCancel().catch(() => {});
      }
    };
  }, []);

  // Check connection status on mount and when connections change
  const claudeConnected = isClaudeConnected();
  const githubConnected = isGitHubConnected();

  // Don't show if Claude is connected and user dismissed optional steps
  const shouldShow = !claudeConnected || (!dismissed && currentStep !== 'complete');

  // Auto-advance when connections are made
  useEffect(() => {
    if (claudeConnected && currentStep === 'claude') {
      setCurrentStep('github');
      setClaudeState('authenticated');
    }
    if (githubConnected && currentStep === 'github') {
      setCurrentStep('vercel');
    }
  }, [claudeConnected, githubConnected, currentStep]);

  // Check Claude installation and auth status on mount
  useEffect(() => {
    const checkClaude = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        try {
          const status = await window.electron.claude.authStatus();

          if (!status.installed) {
            setClaudeState('not-installed');
            return;
          }

          setClaudeState('installed');

          if (status.authenticated) {
            setClaudeState('authenticated');
            const existing = getConnection('claude');
            if (existing) {
              updateConnection(existing.id, {
                status: 'connected',
                lastConnected: new Date(),
              });
            } else {
              addConnection({
                type: 'claude',
                name: 'Claude Code',
                status: 'connected',
                lastConnected: new Date(),
                metadata: { version: status.version },
              });
            }
          }
        } catch {
          setClaudeState('not-installed');
        }
      }
    };
    checkClaude();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run only on mount to check initial status
  }, []);

  // Auto-scroll terminal output
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalOutput]);

  const handleDownloadClaude = () => {
    window.open(CLAUDE_DOWNLOAD_URL, '_blank');
  };

  const handleRefreshStatus = async () => {
    if (!window.electron) return;

    setClaudeState('checking');
    try {
      const status = await window.electron.claude.authStatus();
      if (!status.installed) {
        setClaudeState('not-installed');
      } else if (status.authenticated) {
        setClaudeState('authenticated');
        const existing = getConnection('claude');
        if (existing) {
          updateConnection(existing.id, {
            status: 'connected',
            lastConnected: new Date(),
          });
        } else {
          addConnection({
            type: 'claude',
            name: 'Claude Code',
            status: 'connected',
            lastConnected: new Date(),
            metadata: { version: status.version },
          });
        }
      } else {
        setClaudeState('installed');
      }
    } catch {
      setClaudeState('not-installed');
    }
  };

  const handleStartAuth = async () => {
    if (!window.electron) {
      setError('Electron not available. Run in desktop mode.');
      return;
    }

    setIsConnecting(true);
    setError(null);
    setTerminalOutput([]);
    setClaudeState('authenticating');

    // Subscribe to auth output
    unsubscribeRef.current = window.electron.claude.onAuthOutput((event) => {
      if (event.type === 'stdout' || event.type === 'stderr') {
        if (event.data) {
          setTerminalOutput(prev => [...prev, event.data!]);
        }
      } else if (event.type === 'exit') {
        // Check if auth succeeded
        handleRefreshStatus();
        setIsConnecting(false);
      } else if (event.type === 'error') {
        setError(event.data || 'Authentication failed');
        setIsConnecting(false);
        setClaudeState('installed');
      }
    });

    try {
      const result = await window.electron.claude.authLoginStart();
      if (!result.success) {
        setError(result.error || 'Failed to start authentication');
        setIsConnecting(false);
        setClaudeState('installed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
      setIsConnecting(false);
      setClaudeState('installed');
    }
  };

  const handleCancelAuth = async () => {
    if (window.electron) {
      await window.electron.claude.authLoginCancel();
    }
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    setIsConnecting(false);
    setClaudeState('installed');
    setTerminalOutput([]);
  };

  const handleConnectGitHub = async () => {
    if (!window.electron) {
      setError('Electron not available. Run in desktop mode.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await window.electron.github.authStart();
      setIsConnecting(false);

      if (result.success && result.accessToken) {
        // Save token securely using Electron's safeStorage
        const saved = await saveGitHubToken(result.accessToken, result.username || 'unknown');
        if (!saved) {
          console.warn('[OnboardingWizard] Failed to save token to secure storage');
        }

        const existing = getConnection('github');
        if (existing) {
          updateConnection(existing.id, {
            status: 'connected',
            lastConnected: new Date(),
            metadata: { username: result.username },
          });
        } else {
          addConnection({
            type: 'github',
            name: 'GitHub',
            status: 'connected',
            lastConnected: new Date(),
            metadata: { username: result.username },
          });
        }
      } else {
        setError(result.error || 'GitHub authentication failed');
      }
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to connect GitHub');
    }
  };

  // Helper to dismiss onboarding and persist to localStorage
  const completeOnboarding = () => {
    setCurrentStep('complete');
    setDismissed(true);
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, 'true');
  };

  const handleConnectVercel = () => {
    completeOnboarding();
  };

  const handleSkip = () => {
    if (currentStep === 'github') {
      setCurrentStep('vercel');
    } else if (currentStep === 'vercel') {
      completeOnboarding();
    }
  };

  const handleFinish = () => {
    completeOnboarding();
  };

  // Don't render if shouldn't show
  if (!shouldShow || currentStep === 'complete') {
    return null;
  }

  const currentStepConfig = steps.find(s => s.id === currentStep);
  const stepIndex = steps.findIndex(s => s.id === currentStep);

  const renderClaudeStep = () => {
    if (claudeConnected || claudeState === 'authenticated') {
      return (
        <div className="step-success">
          <span className="success-icon">✓</span>
          <span>Claude Code connected successfully!</span>
        </div>
      );
    }

    if (claudeState === 'checking') {
      return (
        <div className="step-checking">
          <div className="spinner" />
          <span>Checking Claude Code installation...</span>
        </div>
      );
    }

    if (claudeState === 'not-installed') {
      return (
        <div className="step-not-installed">
          <div className="install-message">
            <span className="warning-icon">⚠️</span>
            <p>Claude Code CLI is not installed on your system.</p>
          </div>
          <div className="install-instructions">
            <p>To use vibes, you need to install Claude Code first:</p>
            <ol>
              <li>Click the button below to download Claude Code</li>
              <li>Follow the installation instructions</li>
              <li>Come back here and click "Check Again"</li>
            </ol>
          </div>
          <div className="step-actions">
            <Button variant="primary" onClick={handleDownloadClaude}>
              Download Claude Code
            </Button>
            <Button variant="secondary" onClick={handleRefreshStatus}>
              Check Again
            </Button>
          </div>
        </div>
      );
    }

    if (claudeState === 'authenticating') {
      return (
        <div className="step-authenticating">
          <div className="auth-message-container">
            <div className="auth-icon">🔐</div>
            <h3>Terminal Opened</h3>
            <p>A Terminal window has been opened with the Claude authentication command.</p>
            <ol className="auth-steps">
              <li>Complete the authentication in the Terminal window</li>
              <li>A browser will open for you to sign in to Claude</li>
              <li>After signing in, return here and click the button below</li>
            </ol>
          </div>

          {terminalOutput.length > 0 && (
            <div className="terminal-output-small">
              {terminalOutput.map((line, i) => (
                <div key={i} className="terminal-line">{line}</div>
              ))}
            </div>
          )}

          <div className="step-actions">
            <Button variant="primary" onClick={handleRefreshStatus}>
              Check Connection
            </Button>
            <Button variant="ghost" onClick={handleCancelAuth}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }

    // claudeState === 'installed' - show start auth button
    return (
      <div className="step-installed">
        <div className="install-message success">
          <span className="success-icon">✓</span>
          <p>Claude Code CLI is installed!</p>
        </div>
        <p className="step-note">
          Click below to authenticate. This will open a Terminal window where you can sign in to Claude.
        </p>
        <div className="step-actions">
          <Button
            variant="primary"
            onClick={handleStartAuth}
            disabled={isConnecting}
          >
            Authenticate with Claude
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-wizard">
        <div className="onboarding-header">
          <h1 className="onboarding-title">Welcome to vibes</h1>
          <p className="onboarding-subtitle">Let's get you set up in a few quick steps</p>
        </div>

        {/* Progress indicator */}
        <div className="onboarding-progress">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`progress-step ${i < stepIndex ? 'completed' : ''} ${i === stepIndex ? 'active' : ''}`}
            >
              <div className="progress-dot">
                {i < stepIndex ? '✓' : i + 1}
              </div>
              <span className="progress-label">{step.title}</span>
            </div>
          ))}
        </div>

        {/* Current step content */}
        {currentStepConfig && (
          <div className="onboarding-step">
            <div className="step-icon">{currentStepConfig.icon}</div>
            <h2 className="step-title">
              {currentStepConfig.title}
              {currentStepConfig.required && <Badge variant="error">Required</Badge>}
              {!currentStepConfig.required && <Badge variant="info">Recommended</Badge>}
            </h2>
            <p className="step-description">{currentStepConfig.description}</p>

            {error && (
              <div className="step-error">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Step-specific content */}
            {currentStep === 'claude' && (
              <div className="step-content">
                {renderClaudeStep()}
              </div>
            )}

            {currentStep === 'github' && (
              <div className="step-content">
                {githubConnected ? (
                  <div className="step-success">
                    <span className="success-icon">✓</span>
                    <span>GitHub connected successfully!</span>
                  </div>
                ) : (
                  <>
                    <p className="step-note">
                      Connect GitHub to automatically create repositories for your projects.
                    </p>
                    <div className="step-actions">
                      <Button
                        variant="primary"
                        onClick={handleConnectGitHub}
                        disabled={isConnecting}
                      >
                        {isConnecting ? 'Connecting...' : 'Connect GitHub'}
                      </Button>
                      <Button variant="ghost" onClick={handleSkip}>
                        Skip for now
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {currentStep === 'vercel' && (
              <div className="step-content">
                <p className="step-note">
                  Connect Vercel for one-click deployments. You can also set this up later in Settings.
                </p>
                <div className="step-actions">
                  <Button
                    variant="primary"
                    onClick={handleConnectVercel}
                    disabled={isConnecting}
                  >
                    Connect Vercel
                  </Button>
                  <Button variant="ghost" onClick={handleSkip}>
                    Skip for now
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="onboarding-footer">
          {currentStep !== 'claude' && claudeConnected && (
            <Button variant="success" onClick={handleFinish}>
              Finish Setup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
