import { useState, useEffect, useCallback } from 'react';
import { Badge, Card, CardHeader, CardTitle, CardContent, Button, Modal } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useProjectStore, toast } from '@/stores';
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
  isNew?: boolean;
  isEditing?: boolean;
}

export function Environment() {
  const { currentProject } = useProjectStore();
  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    platform: 'Unknown',
    nodeVersion: 'Unknown',
    electronVersion: 'Unknown',
    appVersion: '0.1.0',
  });
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEnvFile, setHasEnvFile] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadEnvironment = useCallback(async () => {
    setIsLoading(true);
    try {
      if (window.electron) {
        // Get system info from process env
        const allEnv = await window.electron.env.getAll();
        setSystemInfo({
          platform: allEnv.PLATFORM || navigator.platform || 'Unknown',
          nodeVersion: allEnv.NODE_VERSION || 'Unknown',
          electronVersion: allEnv.ELECTRON_VERSION || 'Unknown',
          appVersion: allEnv.APP_VERSION || '0.1.0',
        });

        // Load project .env file if project is selected
        if (currentProject?.path) {
          const result = await window.electron.env.readFile(currentProject.path);
          if (result.success) {
            setHasEnvFile(result.exists ?? false);
            setEnvVars(result.variables.map(v => ({ key: v.key, value: v.value })));
          }
        } else {
          setEnvVars([]);
          setHasEnvFile(false);
        }
      } else {
        // Demo mode - show empty state, no fake data
        setSystemInfo({
          platform: navigator.platform,
          nodeVersion: 'N/A (Browser)',
          electronVersion: 'N/A (Browser)',
          appVersion: '0.1.0',
        });
        setEnvVars([]);
        setHasEnvFile(false);
      }
    } catch (err) {
      logger.error('[Environment] Failed to load:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentProject?.path]);

  useEffect(() => {
    loadEnvironment();
  }, [loadEnvironment]);

  const saveEnvFile = async (variables: EnvVar[]) => {
    if (!window.electron || !currentProject?.path) {
      toast.error('Cannot save: no project selected');
      return false;
    }

    const result = await window.electron.env.writeFile(
      currentProject.path,
      variables.map(v => ({ key: v.key, value: v.value }))
    );

    if (result.success) {
      toast.success('.env file saved');
      return true;
    } else {
      toast.error(result.error || 'Failed to save .env file');
      return false;
    }
  };

  const handleAddVariable = async () => {
    if (!newVarKey.trim()) {
      toast.error('Variable name is required');
      return;
    }

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(newVarKey)) {
      toast.error('Invalid variable name. Use letters, numbers, and underscores only.');
      return;
    }

    if (envVars.some(v => v.key === newVarKey)) {
      toast.error('Variable already exists');
      return;
    }

    const newVars = [...envVars, { key: newVarKey, value: newVarValue }];
    if (await saveEnvFile(newVars)) {
      setEnvVars(newVars);
      setHasEnvFile(true);
      setShowAddModal(false);
      setNewVarKey('');
      setNewVarValue('');
    }
  };

  const handleDeleteVariable = async (keyToDelete: string) => {
    const newVars = envVars.filter(v => v.key !== keyToDelete);
    if (await saveEnvFile(newVars)) {
      setEnvVars(newVars);
    }
  };

  const handleStartEdit = (variable: EnvVar) => {
    setEditingKey(variable.key);
    setEditValue(variable.value);
  };

  const handleSaveEdit = async () => {
    if (editingKey === null) return;

    const newVars = envVars.map(v =>
      v.key === editingKey ? { ...v, value: editValue } : v
    );

    if (await saveEnvFile(newVars)) {
      setEnvVars(newVars);
      setEditingKey(null);
      setEditValue('');
    }
  };

  const handleCancelEdit = () => {
    setEditingKey(null);
    setEditValue('');
  };

  const handleImportEnv = async () => {
    if (!window.electron) {
      toast.error('Import requires Electron mode');
      return;
    }

    const filePath = await window.electron.dialog.openDirectory();
    if (!filePath) return;

    // Read the .env file from the selected directory
    const result = await window.electron.env.readFile(filePath);
    if (result.success && result.variables.length > 0) {
      const newVars = result.variables.map(v => ({ key: v.key, value: v.value }));
      if (await saveEnvFile(newVars)) {
        setEnvVars(newVars);
        setHasEnvFile(true);
        toast.success(`Imported ${newVars.length} variables`);
      }
    } else {
      toast.error('No .env file found or file is empty');
    }
  };

  const handleExportEnv = async () => {
    if (!window.electron || envVars.length === 0) {
      toast.error('Nothing to export');
      return;
    }

    // Create .env content
    const content = envVars.map(v => `${v.key}=${v.value}`).join('\n');

    // Copy to clipboard
    await navigator.clipboard.writeText(content);
    toast.success('Environment variables copied to clipboard');
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
            <CardTitle>
              Project Environment Variables
              {currentProject && (
                <span className="env-project-name">({currentProject.name})</span>
              )}
            </CardTitle>
            <div className="env-actions">
              <Button variant="ghost" size="sm" onClick={handleImportEnv} disabled={!window.electron}>
                Import
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportEnv} disabled={envVars.length === 0}>
                Export
              </Button>
              <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} disabled={!currentProject}>
                + Add Variable
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!currentProject ? (
              <div className="env-empty">
                Select a project to manage environment variables
              </div>
            ) : isLoading ? (
              <div className="env-loading">Loading...</div>
            ) : envVars.length === 0 ? (
              <div className="env-empty">
                {hasEnvFile
                  ? 'No variables in .env file'
                  : 'No .env file found. Add variables to create one.'}
              </div>
            ) : (
              <div className="env-list">
                {envVars.map(env => (
                  <div key={env.key} className="env-row env-editable">
                    <code className="env-key">{env.key}</code>
                    {editingKey === env.key ? (
                      <div className="env-edit-row">
                        <input
                          type="text"
                          className="env-input"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                        <Button variant="success" size="sm" onClick={handleSaveEdit}>
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="env-value">{env.value || '(empty)'}</span>
                        <div className="env-row-actions">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(env)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVariable(env.key)}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Variable Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setNewVarKey('');
            setNewVarValue('');
          }}
          title="Add Environment Variable"
        >
          <div className="env-add-form">
            <div className="env-form-field">
              <label>Variable Name</label>
              <input
                type="text"
                className="env-input"
                placeholder="e.g., API_KEY"
                value={newVarKey}
                onChange={e => setNewVarKey(e.target.value.toUpperCase())}
                autoFocus
              />
              <span className="env-hint">Use UPPER_CASE with underscores</span>
            </div>
            <div className="env-form-field">
              <label>Value</label>
              <input
                type="text"
                className="env-input"
                placeholder="Enter value..."
                value={newVarValue}
                onChange={e => setNewVarValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleAddVariable();
                }}
              />
            </div>
            <div className="env-form-actions">
              <Button variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAddVariable}>
                Add Variable
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
