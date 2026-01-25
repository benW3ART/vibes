import { useState, useCallback } from 'react';
import { SectionTitle, Badge, Button, Card, CardHeader, CardTitle, CardContent, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useProjectStore, toast } from '@/stores';
import { logger } from '@/utils/logger';

interface Deployment {
  id: string;
  environment: 'staging' | 'production';
  status: 'success' | 'failed' | 'pending' | 'deploying';
  version: string;
  timestamp: Date;
  url?: string;
}

export function Deploy() {
  const { currentProject } = useProjectStore();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isDeploying, setIsDeploying] = useState<'staging' | 'production' | null>(null);
  const [stagingUrl, setStagingUrl] = useState<string | null>(null);
  const [productionUrl, setProductionUrl] = useState<string | null>(null);

  const deploy = useCallback(async (environment: 'staging' | 'production') => {
    if (!currentProject?.path) {
      toast.error('No project selected');
      return;
    }

    setIsDeploying(environment);

    const deploymentId = `deploy-${Date.now()}`;
    const newDeployment: Deployment = {
      id: deploymentId,
      environment,
      status: 'deploying',
      version: `v0.0.${deployments.length + 1}`,
      timestamp: new Date(),
    };

    setDeployments(prev => [newDeployment, ...prev]);

    try {
      if (window.electron) {
        toast.info(`Deploying to ${environment}...`);

        // Try Vercel first (most common)
        let result = await window.electron.shell.exec(
          `vercel ${environment === 'production' ? '--prod' : ''} --yes 2>&1`,
          currentProject.path
        );

        if (!result.success || result.stdout?.includes('command not found')) {
          // Try Railway
          result = await window.electron.shell.exec(
            `railway up ${environment === 'production' ? '--environment production' : ''} 2>&1`,
            currentProject.path
          );
        }

        if (result.success && result.stdout) {
          // Extract URL from output
          const urlMatch = result.stdout.match(/https:\/\/[^\s]+/);
          const deployUrl = urlMatch ? urlMatch[0] : undefined;

          setDeployments(prev =>
            prev.map(d =>
              d.id === deploymentId
                ? { ...d, status: 'success', url: deployUrl }
                : d
            )
          );

          if (environment === 'staging') {
            setStagingUrl(deployUrl || null);
          } else {
            setProductionUrl(deployUrl || null);
          }

          toast.success(`Deployed to ${environment}!${deployUrl ? ` URL: ${deployUrl}` : ''}`);
        } else {
          throw new Error(result.stderr || 'Deployment failed');
        }
      } else {
        // Demo mode
        await new Promise(resolve => setTimeout(resolve, 2000));
        const demoUrl = `https://${currentProject.name || 'app'}-${environment}.vercel.app`;

        setDeployments(prev =>
          prev.map(d =>
            d.id === deploymentId
              ? { ...d, status: 'success', url: demoUrl }
              : d
          )
        );

        if (environment === 'staging') {
          setStagingUrl(demoUrl);
        } else {
          setProductionUrl(demoUrl);
        }

        toast.success(`Deployed to ${environment} (demo mode)`);
      }
    } catch (err) {
      logger.error('[Deploy] Failed:', err);
      setDeployments(prev =>
        prev.map(d =>
          d.id === deploymentId
            ? { ...d, status: 'failed' }
            : d
        )
      );
      toast.error(`Deployment failed: ${err}`);
    } finally {
      setIsDeploying(null);
    }
  }, [currentProject, deployments.length]);

  return (
    <div className="screen deploy">
      <QuickActions />

      <div className="deploy-content">
        <div className="deploy-environments">
          <Card>
            <CardHeader>
              <CardTitle>Staging</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="deploy-env-status">
                {stagingUrl ? (
                  <a href={stagingUrl} target="_blank" rel="noopener noreferrer" className="deploy-url">
                    {stagingUrl}
                  </a>
                ) : (
                  <Badge>Not deployed</Badge>
                )}
              </div>
              <Button
                variant="success"
                className="deploy-btn"
                onClick={() => deploy('staging')}
                disabled={isDeploying !== null}
              >
                {isDeploying === 'staging' ? 'Deploying...' : 'Deploy to Staging'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Production</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="deploy-env-status">
                {productionUrl ? (
                  <a href={productionUrl} target="_blank" rel="noopener noreferrer" className="deploy-url">
                    {productionUrl}
                  </a>
                ) : (
                  <Badge>Not deployed</Badge>
                )}
              </div>
              <Button
                variant="primary"
                className="deploy-btn"
                onClick={() => deploy('production')}
                disabled={isDeploying !== null}
              >
                {isDeploying === 'production' ? 'Deploying...' : 'Deploy to Production'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="deploy-history">
          <SectionTitle>Recent Deployments</SectionTitle>
          {deployments.length === 0 ? (
            <EmptyState
              icon="rocket"
              title="No deployments yet"
              description="Deploy your app to see history here"
            />
          ) : (
            deployments.map(d => (
              <div key={d.id} className={`deploy-item ${d.status}`}>
                <Badge variant={
                  d.status === 'success' ? 'success' :
                  d.status === 'failed' ? 'error' :
                  d.status === 'deploying' ? 'warning' : 'default'
                }>
                  {d.environment}
                </Badge>
                <span className="deploy-version">{d.version}</span>
                <span className="deploy-time">{d.timestamp.toLocaleString()}</span>
                <Badge variant={
                  d.status === 'success' ? 'success' :
                  d.status === 'failed' ? 'error' :
                  d.status === 'deploying' ? 'warning' : 'default'
                }>
                  {d.status}
                </Badge>
                {d.url && (
                  <a href={d.url} target="_blank" rel="noopener noreferrer" className="deploy-link">
                    View
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
