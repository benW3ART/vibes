import { useReleaseMonitor } from '@/hooks/useReleaseMonitor';
import { Badge } from '@/components/ui';

export function Updates() {
  const {
    releases,
    suggestions,
    currentVersion,
    latestVersion,
    hasUpdates,
    isLoading,
    error,
    lastChecked,
    refresh,
    dismissSuggestion,
    markSuggestionApplied,
  } = useReleaseMonitor();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastChecked = (date: Date | null) => {
    if (!date) return 'Never';
    const now = Date.now();
    const diff = now - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getImpactBadge = (impact: 'high' | 'medium' | 'low') => {
    const variants = {
      high: 'error' as const,
      medium: 'warning' as const,
      low: 'default' as const,
    };
    return variants[impact];
  };

  const getFeatureTypeBadge = (type: 'new' | 'improved' | 'breaking') => {
    const config = {
      new: { variant: 'success' as const, label: 'New' },
      improved: { variant: 'info' as const, label: 'Improved' },
      breaking: { variant: 'error' as const, label: 'Breaking' },
    };
    return config[type];
  };

  return (
    <div className="updates-screen">
      <div className="updates-header">
        <div className="updates-title-row">
          <h2>Updates</h2>
          {hasUpdates && (
            <Badge variant="warning">Update Available</Badge>
          )}
        </div>
        <p className="updates-subtitle">
          Monitor Claude Code releases and discover new features for your workflow.
        </p>
      </div>

      <div className="updates-status-bar">
        <div className="version-info">
          <span className="version-label">Installed:</span>
          <span className="version-value">{currentVersion || 'Unknown'}</span>
          {latestVersion && latestVersion !== currentVersion && (
            <>
              <span className="version-arrow">→</span>
              <span className="version-label">Latest:</span>
              <span className="version-value version-new">{latestVersion}</span>
            </>
          )}
        </div>
        <div className="check-status">
          <span className="last-checked">Last checked: {formatLastChecked(lastChecked)}</span>
          <button
            className="refresh-button"
            onClick={refresh}
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Check for Updates'}
          </button>
        </div>
      </div>

      {error && (
        <div className="updates-error">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="updates-section">
          <h3 className="section-title">
            <span>Suggestions for Your Project</span>
            <Badge variant="info">{suggestions.length}</Badge>
          </h3>
          <div className="suggestions-list">
            {suggestions.map((suggestion) => {
              const typeConfig = getFeatureTypeBadge(suggestion.feature.type);
              return (
                <div key={suggestion.id} className="suggestion-card">
                  <div className="suggestion-header">
                    <div className="suggestion-badges">
                      <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                      <Badge variant={getImpactBadge(suggestion.impact)}>
                        {suggestion.impact} impact
                      </Badge>
                      <span className="suggestion-version">v{suggestion.releaseVersion}</span>
                    </div>
                    <button
                      className="dismiss-button"
                      onClick={() => dismissSuggestion(suggestion.id)}
                      title="Dismiss"
                    >
                      ×
                    </button>
                  </div>
                  <h4 className="suggestion-title">{suggestion.title}</h4>
                  <p className="suggestion-description">{suggestion.description}</p>
                  {suggestion.feature.impactedAreas.length > 0 && (
                    <div className="suggestion-areas">
                      <span className="areas-label">Affects:</span>
                      {suggestion.feature.impactedAreas.map((area) => (
                        <span key={area} className="area-tag">{area}</span>
                      ))}
                    </div>
                  )}
                  {suggestion.feature.suggestedAction && (
                    <div className="suggestion-action">
                      <span className="action-icon">💡</span>
                      <span>{suggestion.feature.suggestedAction}</span>
                    </div>
                  )}
                  <div className="suggestion-footer">
                    <button
                      className="apply-button"
                      onClick={() => markSuggestionApplied(suggestion.id)}
                    >
                      Mark as Applied
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Releases Section */}
      <div className="updates-section">
        <h3 className="section-title">Recent Releases</h3>
        {isLoading && releases.length === 0 ? (
          <div className="loading-state">
            <span className="loading-spinner"></span>
            <span>Fetching releases...</span>
          </div>
        ) : releases.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📦</span>
            <p>No releases found. Click "Check for Updates" to fetch the latest releases.</p>
          </div>
        ) : (
          <div className="releases-list">
            {releases.map((release, index) => (
              <div
                key={release.version}
                className={`release-card ${index === 0 && hasUpdates ? 'release-new' : ''}`}
              >
                <div className="release-header">
                  <div className="release-version">
                    <span className="version-number">v{release.version}</span>
                    {index === 0 && hasUpdates && (
                      <Badge variant="success">Latest</Badge>
                    )}
                  </div>
                  <span className="release-date">{formatDate(release.date)}</span>
                </div>

                {release.features.length > 0 && (
                  <div className="release-features">
                    {release.features.slice(0, 5).map((feature, i) => {
                      const typeConfig = getFeatureTypeBadge(feature.type);
                      return (
                        <div key={i} className="feature-item">
                          <Badge variant={typeConfig.variant}>{typeConfig.label}</Badge>
                          <span className="feature-name">{feature.name}</span>
                        </div>
                      );
                    })}
                    {release.features.length > 5 && (
                      <span className="more-features">
                        +{release.features.length - 5} more features
                      </span>
                    )}
                  </div>
                )}

                {release.deprecations.length > 0 && (
                  <div className="release-deprecations">
                    <span className="deprecation-label">⚠️ Deprecations:</span>
                    {release.deprecations.slice(0, 3).map((dep, i) => (
                      <span key={i} className="deprecation-item">{dep}</span>
                    ))}
                  </div>
                )}

                {release.url && (
                  <a
                    href={release.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="release-link"
                  >
                    View Full Changelog →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
