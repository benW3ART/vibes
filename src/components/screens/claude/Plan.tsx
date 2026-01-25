import { useState, useCallback } from 'react';
import { usePlan } from '@/hooks';
import { useProjectStore, useNavigationStore, toast } from '@/stores';
import { SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';

export function Plan() {
  const { currentProject } = useProjectStore();
  const { setScreen } = useNavigationStore();
  const { content, sections, isLoading, error, refresh } = usePlan(currentProject?.path);
  const [isCreating, setIsCreating] = useState(false);

  const createPlan = useCallback(async () => {
    if (!currentProject?.path) {
      toast.error('No project selected. Please select or create a project first.');
      return;
    }

    setIsCreating(true);
    try {
      // Create the .claude directory if it doesn't exist
      if (window.electron) {
        await window.electron.file.mkdir(`${currentProject.path}/.claude`);

        // Create a basic plan template
        const planTemplate = `# ${currentProject.name || 'Project'} — Execution Plan

**Generated:** ${new Date().toISOString()}

---

## Phase 1: Setup

- [ ] MP-001 Initialize project structure
- [ ] MP-002 Configure development environment
- [ ] MP-003 Set up version control

## Phase 2: Core Development

- [ ] MP-004 Implement core features
- [ ] MP-005 Add tests

## Phase 3: Polish & Deploy

- [ ] MP-006 Final testing
- [ ] MP-007 Deploy to production

---

*Edit this plan to define your project tasks.*
`;

        await window.electron.file.write(`${currentProject.path}/.claude/plan.md`, planTemplate);
        toast.success('Plan created successfully!');
        refresh();
      } else {
        toast.info('Plan creation requires Electron. In demo mode, navigate to the assistant guide.');
        setScreen('dashboard');
      }
    } catch (err) {
      console.error('[Plan] Failed to create plan:', err);
      toast.error('Failed to create plan');
    } finally {
      setIsCreating(false);
    }
  }, [currentProject, refresh, setScreen]);

  if (isLoading) {
    return (
      <div className="screen plan">
        <div className="plan-loading">Loading plan...</div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="screen plan">
        <QuickActions />
        <EmptyState
          icon="📝"
          title="No plan found"
          description="Create a plan.md file in .claude/ to get started"
          action={{
            label: isCreating ? 'Creating...' : 'Create plan',
            onClick: createPlan,
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen plan">
      <QuickActions />

      <div className="plan-content">
        <div className="plan-sidebar">
          <SectionTitle>Sections</SectionTitle>
          {sections.map((section, i) => (
            <div key={i} className="plan-section-item">
              <span className="plan-section-name">{section.title}</span>
              <Badge>
                {section.tasks.filter(t => t.completed).length}/{section.tasks.length}
              </Badge>
            </div>
          ))}
        </div>

        <div className="plan-main">
          <div className="plan-header">
            <SectionTitle>Plan</SectionTitle>
            <Button variant="ghost" size="sm" onClick={refresh}>Refresh</Button>
          </div>
          <pre className="plan-markdown">{content}</pre>
        </div>
      </div>
    </div>
  );
}
