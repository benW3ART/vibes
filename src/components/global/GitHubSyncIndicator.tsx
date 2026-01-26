import { useState } from 'react';
import { useProjectStore, useConnectionsStore, toast } from '@/stores';
import { useGitStatus } from '@/hooks';
import { Button, Badge, Modal } from '@/components/ui';

export function GitHubSyncIndicator() {
  const { currentProject } = useProjectStore();
  const { isGitHubConnected } = useConnectionsStore();
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const projectPath = currentProject?.path || null;
  const { status, loading, isCommitting, commitAndPush, refresh } = useGitStatus(projectPath);

  const githubConnected = isGitHubConnected();

  // Don't render if no project or not a git repo
  if (!projectPath || !status?.isRepo) {
    return null;
  }

  const handleSync = async () => {
    if (!commitMessage.trim()) {
      toast.error('Please enter a commit message');
      return;
    }

    const result = await commitAndPush(commitMessage.trim());
    if (result.success) {
      toast.success('Changes synced successfully');
      setShowCommitModal(false);
      setCommitMessage('');
    } else {
      toast.error(result.error || 'Sync failed');
    }
  };

  const handleOpenModal = () => {
    setCommitMessage('');
    setShowCommitModal(true);
  };

  // Determine status display
  const getStatusInfo = () => {
    if (status.hasUncommitted) {
      return {
        color: 'warning' as const,
        dotClass: 'sync-dot uncommitted',
        label: 'Uncommitted changes',
        canSync: true,
      };
    }
    if (status.hasUnpushed) {
      return {
        color: 'info' as const,
        dotClass: 'sync-dot unpushed',
        label: `${status.ahead} commit${status.ahead > 1 ? 's' : ''} to push`,
        canSync: true,
      };
    }
    return {
      color: 'success' as const,
      dotClass: 'sync-dot synced',
      label: 'Synced',
      canSync: false,
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <>
      <div className="github-sync-indicator">
        {!githubConnected && (
          <Badge variant="warning" className="sync-warning">
            No GitHub
          </Badge>
        )}

        <div className="sync-status">
          <span className={statusInfo.dotClass} />
          <span className="sync-branch">{status.branch || 'main'}</span>
          {status.ahead > 0 && status.hasUnpushed && !status.hasUncommitted && (
            <span className="sync-ahead">+{status.ahead}</span>
          )}
          {status.behind > 0 && (
            <span className="sync-behind">-{status.behind}</span>
          )}
        </div>

        {statusInfo.canSync && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleOpenModal}
            disabled={loading || isCommitting}
            className="sync-button"
          >
            {isCommitting ? 'Syncing...' : 'Sync'}
          </Button>
        )}

        <button
          className="sync-refresh"
          onClick={() => refresh()}
          disabled={loading}
          title="Refresh status"
        >
          {loading ? '...' : '*'}
        </button>
      </div>

      <Modal
        isOpen={showCommitModal}
        onClose={() => setShowCommitModal(false)}
        title="Commit & Push"
        size="sm"
      >
        <div className="commit-modal-content">
          <div className="commit-changes">
            <h4>Changes to commit:</h4>
            <ul className="change-list">
              {status.changes.slice(0, 10).map((change, i) => (
                <li key={i} className="change-item">
                  <span className={`change-status status-${change[0]?.toLowerCase()}`}>
                    {change[0]}
                  </span>
                  <span className="change-file">{change.slice(2).trim()}</span>
                </li>
              ))}
              {status.changes.length > 10 && (
                <li className="change-more">
                  +{status.changes.length - 10} more files
                </li>
              )}
            </ul>
          </div>

          <div className="commit-message-field">
            <label htmlFor="commit-message">Commit message:</label>
            <input
              id="commit-message"
              type="text"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe your changes..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSync();
                }
              }}
            />
          </div>

          <div className="commit-actions">
            <Button variant="ghost" onClick={() => setShowCommitModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSync}
              disabled={isCommitting || !commitMessage.trim()}
            >
              {isCommitting ? 'Syncing...' : 'Commit & Push'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
