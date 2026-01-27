import { useEffect } from 'react';
import { useSettingsStore, type ModelTier } from '@/stores/settingsStore';
import { useToastStore } from '@/stores';
import { Toggle, Button, Card, CardHeader, CardTitle, CardContent, Badge } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useClaudeModels, TIER_DISPLAY_NAMES, formatVersion } from '@/hooks/useClaudeModels';

const TIER_OPTIONS: ModelTier[] = ['auto', 'opus', 'sonnet', 'haiku'];

export function Settings() {
  const {
    theme,
    fontSize,
    showLineNumbers,
    autoSave,
    notifications,
    soundEffects,
    preferredTier,
    setTheme,
    setFontSize,
    setShowLineNumbers,
    setAutoSave,
    setNotifications,
    setSoundEffects,
    setPreferredTier,
    resetSettings,
  } = useSettingsStore();

  const {
    models,
    selectedModel,
    isLoading: modelsLoading,
    error: modelsError,
    isUpgraded,
    upgradedFrom,
    refresh: refreshModels,
  } = useClaudeModels();

  const addToast = useToastStore(state => state.addToast);

  // Show upgrade notification
  useEffect(() => {
    if (isUpgraded && selectedModel) {
      addToast(
        `Upgraded to ${selectedModel.name}${selectedModel.version ? ` ${formatVersion(selectedModel.version)}` : ''}`,
        'success'
      );
    }
  }, [isUpgraded, selectedModel, addToast]);

  return (
    <div className="screen settings">
      <QuickActions />

      <div className="settings-content">
        {/* Claude Settings - GLOBAL */}
        <Card>
          <CardHeader>
            <CardTitle>
              Claude <Badge variant="info">Global</Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={refreshModels} disabled={modelsLoading}>
              {modelsLoading ? 'Loading...' : 'Refresh Models'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="settings-row">
              <div className="settings-label">
                <span>Model Tier</span>
                <span className="settings-desc">
                  Select preferred model tier - automatically uses the latest version
                  {modelsError && <span className="settings-error"> (using defaults)</span>}
                </span>
              </div>
              <select
                className="settings-select"
                value={preferredTier}
                onChange={(e) => setPreferredTier(e.target.value as ModelTier)}
                disabled={modelsLoading}
              >
                {TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {TIER_DISPLAY_NAMES[tier]}
                  </option>
                ))}
              </select>
            </div>

            {selectedModel && (
              <div className="settings-row">
                <div className="settings-label">
                  <span>Current Model</span>
                  <span className="settings-desc">
                    {isUpgraded && upgradedFrom && (
                      <span className="settings-upgraded">
                        Upgraded from {upgradedFrom}
                      </span>
                    )}
                  </span>
                </div>
                <div className="settings-model-info">
                  <span className="settings-model-name">{selectedModel.name}</span>
                  {selectedModel.version && (
                    <Badge variant="info">v{formatVersion(selectedModel.version)}</Badge>
                  )}
                </div>
              </div>
            )}

            {selectedModel && (
              <div className="settings-row">
                <div className="settings-label">
                  <span>Model ID</span>
                  <span className="settings-desc">Exact model identifier being used</span>
                </div>
                <code className="settings-code">{selectedModel.id}</code>
              </div>
            )}

            {/* Show available models per tier */}
            <div className="settings-row">
              <div className="settings-label">
                <span>Available Models</span>
                <span className="settings-desc">{models.length} models detected</span>
              </div>
              <div className="settings-models-list">
                {models.map((model) => (
                  <div
                    key={model.id}
                    className={`settings-model-item ${model.id === selectedModel?.id ? 'active' : ''}`}
                  >
                    <span className="settings-model-tier">{model.tier}</span>
                    <span className="settings-model-version">
                      {model.version ? formatVersion(model.version) : model.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-row">
              <div className="settings-label">
                <span>Theme</span>
                <span className="settings-desc">Choose your preferred theme</span>
              </div>
              <select
                className="settings-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="system">System</option>
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Font Size</span>
                <span className="settings-desc">Editor font size</span>
              </div>
              <select
                className="settings-select"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'sm' | 'md' | 'lg')}
              >
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Line Numbers</span>
                <span className="settings-desc">Show line numbers in code views</span>
              </div>
              <Toggle checked={showLineNumbers} onChange={setShowLineNumbers} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Behavior</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="settings-row">
              <div className="settings-label">
                <span>Auto Save</span>
                <span className="settings-desc">Automatically save changes</span>
              </div>
              <Toggle checked={autoSave} onChange={setAutoSave} />
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Notifications</span>
                <span className="settings-desc">Show desktop notifications</span>
              </div>
              <Toggle checked={notifications} onChange={setNotifications} />
            </div>

            <div className="settings-row">
              <div className="settings-label">
                <span>Sound Effects</span>
                <span className="settings-desc">Play sounds on events</span>
              </div>
              <Toggle checked={soundEffects} onChange={setSoundEffects} />
            </div>
          </CardContent>
        </Card>

        <div className="settings-footer">
          <Button variant="ghost" onClick={resetSettings}>Reset to Defaults</Button>
        </div>
      </div>
    </div>
  );
}
