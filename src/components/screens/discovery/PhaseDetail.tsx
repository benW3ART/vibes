import { useEffect, useState } from 'react';
import { useWorkflowStore, useProjectStore, phaseDisplayInfo } from '@/stores';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { useNavigationStore } from '@/stores';
import './PhaseDetail.css';

interface PhaseContent {
  title: string;
  description: string;
  artifact?: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export function PhaseDetail() {
  const { currentPhase, phases, conversationContext } = useWorkflowStore();
  const { currentProject } = useProjectStore();
  const { setChatPanelOpen } = useNavigationStore();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phaseInfo = phaseDisplayInfo[currentPhase];
  const phaseStatus = phases[currentPhase];

  // Load artifact file content if exists
  useEffect(() => {
    const loadArtifact = async () => {
      if (!currentProject?.path || !phaseStatus?.artifact) return;

      setLoading(true);
      try {
        if (window.electron?.file?.read) {
          const content = await window.electron.file.read(phaseStatus.artifact);
          setFileContent(content);
        }
      } catch (err) {
        console.error('Failed to load artifact:', err);
        setFileContent(null);
      } finally {
        setLoading(false);
      }
    };

    loadArtifact();
  }, [currentProject?.path, phaseStatus?.artifact]);

  // Get content based on phase
  const getPhaseContent = (): PhaseContent => {
    switch (currentPhase) {
      case 'discovery':
        return {
          title: 'Project Discovery',
          description: 'Define your project idea, target users, and key features.',
          artifact: phaseStatus?.artifact,
          sections: [
            { title: 'Project Idea', content: conversationContext.projectIdea || 'Not defined yet' },
            { title: 'Target Users', content: conversationContext.targetUsers || 'Not defined yet' },
            { title: 'Main Features', content: conversationContext.mainFeatures || 'Not defined yet' },
            { title: 'Competitors', content: conversationContext.competitors || 'Not analyzed yet' },
            { title: 'Differentiator', content: conversationContext.differentiator || 'Not defined yet' },
          ],
        };

      case 'market-analysis':
        return {
          title: 'Market Analysis',
          description: 'Analyze market opportunity, competition, and positioning.',
          artifact: phaseStatus?.artifact,
          sections: [
            { title: 'Market Size', content: 'Complete discovery phase first' },
            { title: 'Target Segments', content: 'Complete discovery phase first' },
            { title: 'Competitive Landscape', content: 'Complete discovery phase first' },
          ],
        };

      case 'specifications':
        return {
          title: 'Specifications',
          description: 'User stories, requirements, and acceptance criteria.',
          artifact: phaseStatus?.artifact,
          sections: [
            { title: 'Summary', content: conversationContext.specificationsSummary || 'Not generated yet' },
          ],
        };

      case 'design':
        return {
          title: 'Design System',
          description: 'Visual identity, colors, typography, and components.',
          artifact: phaseStatus?.artifact,
          sections: [
            { title: 'Design Choice', content: conversationContext.designChoice ? `Option ${conversationContext.designChoice}` : 'Not chosen yet' },
          ],
        };

      case 'architecture':
        return {
          title: 'Architecture',
          description: 'Technical stack, project structure, and implementation plan.',
          artifact: phaseStatus?.artifact,
          sections: conversationContext.architectureDecisions?.map((d, i) => ({
            title: `Decision ${i + 1}`,
            content: d,
          })) || [{ title: 'Decisions', content: 'Not defined yet' }],
        };

      default:
        return {
          title: phaseInfo.label,
          description: 'Phase details',
          sections: [],
        };
    }
  };

  const content = getPhaseContent();
  const isCompleted = phaseStatus?.status === 'completed' || phaseStatus?.status === 'approved';
  const isInProgress = phaseStatus?.status === 'in_progress';

  const handleStartPhase = () => {
    setChatPanelOpen(true);
  };

  return (
    <div className="phase-detail-screen">
      <div className="phase-detail-header">
        <div className="phase-detail-title-row">
          <span className="phase-detail-icon">{phaseInfo.icon}</span>
          <h1 className="phase-detail-title">{content.title}</h1>
          <Badge variant={isCompleted ? 'success' : isInProgress ? 'warning' : 'default'}>
            {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
          </Badge>
        </div>
        <p className="phase-detail-description">{content.description}</p>
      </div>

      {!isCompleted && !isInProgress && (
        <EmptyState
          icon={phaseInfo.icon}
          title={`Start ${content.title}`}
          description="Open the assistant to begin this phase."
          action={{
            label: 'Start in Assistant',
            onClick: handleStartPhase,
          }}
        />
      )}

      {(isCompleted || isInProgress) && (
        <div className="phase-detail-content">
          {/* Summary Cards */}
          <div className="phase-detail-sections">
            {content.sections.map((section, idx) => (
              <Card key={idx} className="phase-section-card">
                <h3 className="phase-section-title">{section.title}</h3>
                <p className="phase-section-content">{section.content}</p>
              </Card>
            ))}
          </div>

          {/* Artifact File Content */}
          {content.artifact && (
            <Card className="phase-artifact-card">
              <div className="phase-artifact-header">
                <h3>Generated Artifact</h3>
                <Badge variant="default">{content.artifact.split('/').pop()}</Badge>
              </div>
              {loading ? (
                <div className="phase-artifact-loading">Loading...</div>
              ) : fileContent ? (
                <pre className="phase-artifact-content">
                  <code>{fileContent}</code>
                </pre>
              ) : (
                <p className="phase-artifact-empty">Could not load file content</p>
              )}
            </Card>
          )}

          {/* Actions */}
          <div className="phase-detail-actions">
            <Button variant="secondary" onClick={handleStartPhase}>
              Continue in Assistant
            </Button>
            {isCompleted && (
              <Button variant="ghost" onClick={() => {/* TODO: regenerate */}}>
                Regenerate
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
