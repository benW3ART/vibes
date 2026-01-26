import { useState } from 'react';
import { SectionTitle, Badge, Button, Card, CardHeader, CardTitle, CardContent, EmptyState, Modal } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useProjectStore, toast } from '@/stores';
import type { MarketplaceItem } from '@/types/marketplace';

export function Marketplace() {
  const { currentProject } = useProjectStore();
  const {
    sources,
    items,
    installed,
    isLoading,
    error,
    refreshSources,
    installItem,
    addSource,
    removeSource,
    toggleSource,
  } = useMarketplace();

  const [filter, setFilter] = useState<'all' | 'skill' | 'mcp'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');

  // Filter items
  const filteredItems = items.filter(item => {
    if (filter !== 'all' && item.type !== filter) return false;
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // Check if item is installed
  const isItemInstalled = (item: MarketplaceItem) => {
    return installed.some(i => i.itemId === item.id);
  };

  // Handle install
  const handleInstall = async (item: MarketplaceItem) => {
    if (!currentProject) {
      toast.error('Please select a project first');
      return;
    }

    setIsInstalling(true);
    const result = await installItem(item, currentProject.path);
    setIsInstalling(false);

    if (result.success) {
      toast.success(`${item.name} installed successfully`);
      setSelectedItem(null);
    } else {
      toast.error(result.error || 'Installation failed');
    }
  };

  // Handle add source
  const handleAddSource = () => {
    if (!newSourceUrl.trim()) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    addSource({
      name: newSourceName || newSourceUrl.split('/').pop() || 'Custom Source',
      url: newSourceUrl.replace('https://github.com/', ''),
      type: 'custom',
      enabled: true,
    });

    setShowAddSourceModal(false);
    setNewSourceUrl('');
    setNewSourceName('');
    toast.success('Source added. Refreshing...');
    refreshSources();
  };

  return (
    <div className="screen marketplace">
      <QuickActions />

      <div className="marketplace-content">
        <div className="marketplace-header">
          <SectionTitle>
            Marketplace <Badge>{items.length} items</Badge>
          </SectionTitle>
          <div className="marketplace-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshSources}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddSourceModal(true)}
            >
              + Add Source
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="marketplace-filters">
          <input
            type="text"
            className="marketplace-search"
            placeholder="Search skills and MCPs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="marketplace-type-filters">
            <button
              className={`type-filter ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`type-filter ${filter === 'skill' ? 'active' : ''}`}
              onClick={() => setFilter('skill')}
            >
              Skills
            </button>
            <button
              className={`type-filter ${filter === 'mcp' ? 'active' : ''}`}
              onClick={() => setFilter('mcp')}
            >
              MCPs
            </button>
          </div>
        </div>

        {/* Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="sources-list">
              {sources.map(source => (
                <div key={source.id} className="source-item">
                  <div className="source-info">
                    <span className="source-name">{source.name}</span>
                    <span className="source-url">{source.url}</span>
                  </div>
                  <div className="source-actions">
                    <Badge variant={source.type === 'official' ? 'success' : 'default'}>
                      {source.type}
                    </Badge>
                    <input
                      type="checkbox"
                      checked={source.enabled}
                      onChange={(e) => toggleSource(source.id, e.target.checked)}
                    />
                    {source.type === 'custom' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSource(source.id)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <div className="marketplace-error">
            <span>Error: {error}</span>
            <Button variant="ghost" size="sm" onClick={refreshSources}>
              Retry
            </Button>
          </div>
        )}

        {/* Items grid */}
        {isLoading ? (
          <div className="marketplace-loading">Loading marketplace items...</div>
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="box"
            title="No items found"
            description={searchQuery ? 'Try a different search term' : 'Add a source to browse available skills and MCPs'}
            action={{
              label: 'Add Source',
              onClick: () => setShowAddSourceModal(true),
            }}
          />
        ) : (
          <div className="marketplace-grid">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`marketplace-item ${isItemInstalled(item) ? 'installed' : ''}`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="item-header">
                  <span className="item-icon">{item.type === 'skill' ? '⚡' : '🔌'}</span>
                  <span className="item-name">{item.name}</span>
                  <Badge variant={item.type === 'skill' ? 'info' : 'default'}>
                    {item.type}
                  </Badge>
                </div>
                <p className="item-description">{item.description}</p>
                <div className="item-footer">
                  {isItemInstalled(item) && (
                    <Badge variant="success">Installed</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Item detail modal */}
      {selectedItem && (
        <Modal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          title={selectedItem.name}
          size="lg"
        >
          <div className="marketplace-detail">
            <div className="detail-header">
              <Badge variant={selectedItem.type === 'skill' ? 'info' : 'default'}>
                {selectedItem.type}
              </Badge>
              <span className="detail-source">from {selectedItem.source}</span>
            </div>
            <p className="detail-description">{selectedItem.description}</p>
            <div className="detail-path">
              <code>{selectedItem.path}</code>
            </div>
            <div className="detail-actions">
              {isItemInstalled(selectedItem) ? (
                <Badge variant="success">Already Installed</Badge>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => handleInstall(selectedItem)}
                  disabled={isInstalling || !currentProject}
                >
                  {isInstalling ? 'Installing...' : 'Install to Project'}
                </Button>
              )}
            </div>
            {!currentProject && (
              <p className="detail-warning">Select a project to install this item</p>
            )}
          </div>
        </Modal>
      )}

      {/* Add source modal */}
      <Modal
        isOpen={showAddSourceModal}
        onClose={() => setShowAddSourceModal(false)}
        title="Add Marketplace Source"
      >
        <div className="add-source-form">
          <div className="form-field">
            <label>GitHub Repository</label>
            <input
              type="text"
              placeholder="e.g., owner/repository"
              value={newSourceUrl}
              onChange={(e) => setNewSourceUrl(e.target.value)}
            />
            <span className="form-hint">Enter the owner/repo path (e.g., modelcontextprotocol/servers)</span>
          </div>
          <div className="form-field">
            <label>Name (optional)</label>
            <input
              type="text"
              placeholder="Custom name for this source"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
            />
          </div>
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setShowAddSourceModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddSource}>
              Add Source
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
