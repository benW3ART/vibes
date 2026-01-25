import { SectionTitle, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function Code() {
  return (
    <div className="screen code">
      <QuickActions />

      <div className="code-content">
        <div className="code-sidebar">
          <SectionTitle>Files</SectionTitle>
          <div className="code-file-tree">
            <div className="code-folder">
              <span>src</span>
            </div>
            <div className="code-folder indent">
              <span>components</span>
            </div>
            <div className="code-file indent-2">
              <span>App.tsx</span>
            </div>
          </div>
        </div>

        <div className="code-main">
          <EmptyState
            icon="code"
            title="Select a file"
            description="Choose a file from the sidebar to view"
          />
        </div>

        <div className="code-context">
          <SectionTitle>Context</SectionTitle>
          <div className="code-context-item">
            <span>Current file</span>
            <span>None</span>
          </div>
          <div className="code-context-item">
            <span>Lines</span>
            <span>-</span>
          </div>
        </div>
      </div>
    </div>
  );
}
