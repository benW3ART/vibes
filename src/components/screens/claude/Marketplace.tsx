import { useState, useEffect } from 'react';
import { SectionTitle, Badge, Button, Card, CardHeader, CardTitle, CardContent, EmptyState, Modal } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { useMarketplace } from '@/hooks/useMarketplace';
import { useSourceSuggestions } from '@/hooks/useSourceSuggestions';
import { useProjectStore, toast } from '@/stores';
import { TRUST_LEVEL_CONFIG, type TrustLevel } from '@/services/githubSearchService';
import type { MarketplaceItem } from '@/types/marketplace';

// Trust badge component
function TrustBadge({ level }: { level: TrustLevel }) {
  const config = TRUST_LEVEL_CONFIG[level];
  return (
    <span
      className="trust-badge"
      style={{ color: config.color }}
      title={config.label}
    >
      {config.icon} {config.label}
    </span>
  );
}

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

  const {
    suggestions,
    isLoading: suggestionsLoading,
    error: suggestionsError,
    search: searchSuggestions,
  } = useSourceSuggestions();

  const [filter, setFilter] = useState<'all' | 'skill' | 'mcp'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showAddSourceModal, setShowAddSourceModal] = useState(false);
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceName, setNewSourceName] = useState('');
  const [suggestionSearch, setSuggestionSearch] = useState('');

  // Search suggestions when input changes
  useEffect(() => {
    searchSuggestions(suggestionSearch);
  }, [suggestionSearch, searchSuggestions]);

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

  // Check if source already exists
  const isSourceAdded = (fullName: string) => {
    return sources.some(s => s.url.toLowerCase() === fullName.toLowerCase());
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
  const handleAddSource = (url?: string, name?: string) => {
    const sourceUrl = url || newSourceUrl.trim();
    if (!sourceUrl) {
      toast.error('Please enter a GitHub repository URL');
      return;
    }

    addSource({
      name: name || newSourceName || sourceUrl.split('/').pop() || 'Custom Source',
      url: sourceUrl.replace('https://github.com/', ''),
      type: 'custom',
      enabled: true,
    });

    setShowAddSourceModal(false);
    setNewSourceUrl('');
    setNewSourceName('');
    setSuggestionSearch('');
    toast.success('Source added. Refreshing...');
    refreshSources();
  };

  // Handle add from suggestion
  const handleAddFromSuggestion = (fullName: string, displayName: string) => {
    handleAddSource(fullName, displayName);
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

      {/* Add source modal with suggestions */}
      <Modal
        isOpen={showAddSourceModal}
        onClose={() => {
          setShowAddSourceModal(false);
          setSuggestionSearch('');
        }}
        title="Add Marketplace Source"
        size="lg"
      >
        <div className="add-source-form">
          {/* Search for suggestions */}
          <div className="form-field">
            <label>Search for sources</label>
            <input
              type="text"
              placeholder="Search for MCP servers or skills..."
              value={suggestionSearch}
              onChange={(e) => setSuggestionSearch(e.target.value)}
            />
            <span className="form-hint">Search GitHub for popular MCP servers and skills</span>
          </div>

          {/* Suggestions list */}
          <div className="suggestions-section">
            <div className="suggestions-header">
              <span>Suggested Sources</span>
              {suggestionsLoading && <span className="suggestions-loading">Searching...</span>}
            </div>

            {suggestionsError && (
              <div className="suggestions-error">
                Could not load suggestions: {suggestionsError}
              </div>
            )}

            <div className="suggestions-list">
              {suggestions.map((suggestion) => (
                <div key={suggestion.fullName} className="suggestion-card">
                  <div className="suggestion-header">
                    <span className="suggestion-name">{suggestion.fullName}</span>
                    <TrustBadge level={suggestion.trustLevel} />
                  </div>
                  <p className="suggestion-description">{suggestion.description}</p>
                  <div className="suggestion-stats">
                    <span className="suggestion-stat">
                      <span className="stat-icon">⭐</span> {suggestion.stars.toLocaleString()}
                    </span>
                    <span className="suggestion-stat">
                      <span className="stat-icon">🍴</span> {suggestion.forks.toLocaleString()}
                    </span>
                    {suggestion.language && (
                      <span className="suggestion-stat">{suggestion.language}</span>
                    )}
                  </div>
                  <div className="suggestion-action">
                    {isSourceAdded(suggestion.fullName) ? (
                      <Badge variant="success">Added</Badge>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAddFromSuggestion(
                          suggestion.fullName,
                          suggestion.repo
                        )}
                      >
                        Add Source
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {suggestions.length === 0 && !suggestionsLoading && (
                <div className="suggestions-empty">
                  {suggestionSearch
                    ? 'No sources found. Try a different search term.'
                    : 'Loading suggested sources...'}
                </div>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="form-divider">
            <span>or add manually</span>
          </div>

          {/* Manual add */}
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
            <Button variant="primary" onClick={() => handleAddSource()}>
              Add Source
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
