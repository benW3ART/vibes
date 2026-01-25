import { useSettingsStore } from '@/stores';
import { Toggle, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function Settings() {
  const {
    theme,
    fontSize,
    showLineNumbers,
    autoSave,
    notifications,
    soundEffects,
    setTheme,
    setFontSize,
    setShowLineNumbers,
    setAutoSave,
    setNotifications,
    setSoundEffects,
    resetSettings,
  } = useSettingsStore();

  return (
    <div className="screen settings">
      <QuickActions />

      <div className="settings-content">
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
