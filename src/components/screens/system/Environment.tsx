import { useState, useEffect } from 'react';
import { Badge, Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { logger } from '@/utils/logger';

interface SystemInfo {
  platform: string;
  nodeVersion: string;
  electronVersion: string;
  appVersion: string;
}

interface EnvVar {
  key: string;
  value: string;
}

export function Environment() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    platform: 'Unknown',
    nodeVersion: 'Unknown',
    electronVersion: 'Unknown',
    appVersion: '0.1.0',
  });
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEnvironment();
  }, []);

  const loadEnvironment = async () => {
    setIsLoading(true);
    try {
      if (window.electron) {
        // Get all environment variables
        const allEnv = await window.electron.env.getAll();

        // Extract system info
        setSystemInfo({
          platform: allEnv.PLATFORM || navigator.platform || 'Unknown',
          nodeVersion: allEnv.NODE_VERSION || process.versions?.node || 'Unknown',
          electronVersion: allEnv.ELECTRON_VERSION || 'Unknown',
          appVersion: allEnv.APP_VERSION || '0.1.0',
        });

        // Get relevant env vars (filter sensitive ones)
        const relevantKeys = ['NODE_ENV', 'VITE_APP_VERSION', 'HOME', 'USER', 'SHELL', 'PATH', 'LANG'];
        const filtered = Object.entries(allEnv)
          .filter(([key]) => relevantKeys.includes(key) || key.startsWith('VITE_'))
          .filter(([key]) => !key.includes('SECRET') && !key.includes('TOKEN') && !key.includes('KEY'))
          .map(([key, value]) => ({
            key,
            value: value?.substring(0, 100) + (value && value.length > 100 ? '...' : '') || '',
          }));

        setEnvVars(filtered);
      } else {
        // Demo mode
        setSystemInfo({
          platform: navigator.platform,
          nodeVersion: 'N/A (Browser)',
          electronVersion: 'N/A (Browser)',
          appVersion: '0.1.0',
        });
        setEnvVars([
          { key: 'MODE', value: 'demo' },
          { key: 'VITE_APP_VERSION', value: '0.1.0' },
        ]);
      }
    } catch (err) {
      logger.error('[Environment] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="screen environment">
      <QuickActions />

      <div className="environment-content">
        <Card>
          <CardHeader>
            <CardTitle>System</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadEnvironment}>
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="env-loading">Loading...</div>
            ) : (
              <>
                <div className="env-row">
                  <span>Platform</span>
                  <Badge>{systemInfo.platform}</Badge>
                </div>
                <div className="env-row">
                  <span>Node Version</span>
                  <span>{systemInfo.nodeVersion}</span>
                </div>
                <div className="env-row">
                  <span>Electron Version</span>
                  <span>{systemInfo.electronVersion}</span>
                </div>
                <div className="env-row">
                  <span>App Version</span>
                  <Badge variant="info">{systemInfo.appVersion}</Badge>
                </div>
                <div className="env-row">
                  <span>Mode</span>
                  <Badge variant={window.electron ? 'success' : 'warning'}>
                    {window.electron ? 'Electron' : 'Browser (Demo)'}
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="env-loading">Loading...</div>
            ) : envVars.length === 0 ? (
              <div className="env-empty">No environment variables available</div>
            ) : (
              envVars.map(env => (
                <div key={env.key} className="env-row">
                  <code>{env.key}</code>
                  <span className="env-value">{env.value}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
