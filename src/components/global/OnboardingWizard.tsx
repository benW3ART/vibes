import { useState, useEffect, useRef } from 'react';
import { useConnectionsStore } from '@/stores';
import { Button, Badge } from '@/components/ui';

type OnboardingStep = 'claude' | 'github' | 'vercel' | 'complete';

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

export function OnboardingWizard() {
  const { isClaudeConnected, isGitHubConnected, addConnection, updateConnection, getConnection } = useConnectionsStore();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('claude');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // SEC-006 FIX: Track poll interval for cleanup
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
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
    }
    if (githubConnected && currentStep === 'github') {
      setCurrentStep('vercel');
    }
  }, [claudeConnected, githubConnected, currentStep]);

  // Check Claude connection on mount
  useEffect(() => {
    const checkClaude = async () => {
      if (typeof window !== 'undefined' && window.electron) {
        try {
          const status = await window.electron.claude.authStatus();
          if (status.authenticated) {
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
          // Ignore errors
        }
      }
    };
    checkClaude();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Run only on mount to check initial auth status
  }, []);

  const handleConnectClaude = async () => {
    if (!window.electron) {
      setError('Electron not available. Run in desktop mode.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Start auth login (opens terminal)
      await window.electron.claude.authLogin();

      // Poll for auth status - store ref for cleanup
      pollIntervalRef.current = setInterval(async () => {
        try {
          const status = await window.electron.claude.authStatus();
          if (status.authenticated) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            setIsConnecting(false);

            const existing = getConnection('claude');
            if (existing) {
              updateConnection(existing.id, {
                status: 'connected',
                lastConnected: new Date(),
                metadata: { version: status.version },
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
          // Keep polling
        }
      }, 2000);

      // Timeout after 5 minutes - store ref for cleanup
      timeoutRef.current = setTimeout(() => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setIsConnecting(false);
        setError('Authentication timed out. Please try again.');
      }, 300000);
    } catch (err) {
      setIsConnecting(false);
      setError(err instanceof Error ? err.message : 'Failed to start authentication');
    }
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

      if (result.success) {
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
            metadata: { username: result.username, accessToken: result.accessToken },
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

  const handleConnectVercel = () => {
    // Vercel CLI-based auth would go here
    // For now, skip to complete
    setCurrentStep('complete');
    setDismissed(true);
  };

  const handleSkip = () => {
    if (currentStep === 'github') {
      setCurrentStep('vercel');
    } else if (currentStep === 'vercel') {
      setCurrentStep('complete');
      setDismissed(true);
    }
  };

  const handleFinish = () => {
    setCurrentStep('complete');
    setDismissed(true);
  };

  // Don't render if shouldn't show
  if (!shouldShow || currentStep === 'complete') {
    return null;
  }

  const currentStepConfig = steps.find(s => s.id === currentStep);
  const stepIndex = steps.findIndex(s => s.id === currentStep);

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
                {claudeConnected ? (
                  <div className="step-success">
                    <span className="success-icon">✓</span>
                    <span>Claude Code connected successfully!</span>
                  </div>
                ) : (
                  <>
                    <p className="step-note">
                      This will open a terminal window. Complete the authentication there, then return here.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleConnectClaude}
                      disabled={isConnecting}
                    >
                      {isConnecting ? 'Waiting for authentication...' : 'Connect Claude Code'}
                    </Button>
                  </>
                )}
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
