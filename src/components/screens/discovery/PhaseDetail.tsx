import { useEffect, useState } from 'react';
import { useWorkflowStore, useProjectStore, phaseDisplayInfo } from '@/stores';
import type { UserStory } from '@/stores/workflowStore';
import { Button, Card, Badge, EmptyState } from '@/components/ui';
import { useNavigationStore } from '@/stores';
import './PhaseDetail.css';

interface SectionData {
  title: string;
  content: string;
  isDefined: boolean;
}

interface PhaseProgress {
  steps: Array<{ label: string; done: boolean }>;
  completed: number;
  total: number;
  nextStep: string | null;
}

// Helper to validate if data is meaningful (not conversational garbage)
const isValidData = (data: string | undefined | null): boolean => {
  if (!data || typeof data !== 'string') return false;
  const trimmed = data.trim();
  if (trimmed.length < 10) return false;

  // Check for conversational phrases that indicate garbage data
  const garbagePhrases = [
    'let me know',
    'how you\'d like to proceed',
    'would you like',
    'any questions',
    'i can help',
    'analysis is complete',
    'let me',
    'shall i',
    'please share',
    'if the previous',
    'add more detail',
  ];

  const lower = trimmed.toLowerCase();
  for (const phrase of garbagePhrases) {
    if (lower.includes(phrase)) return false;
  }

  return true;
};

export function PhaseDetail() {
  const { currentPhase, phases, conversationContext } = useWorkflowStore();
  const { currentProject } = useProjectStore();
  const { setChatPanelOpen, setChatContext } = useNavigationStore();
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const phaseInfo = phaseDisplayInfo[currentPhase];
  const phaseStatus = phases[currentPhase];

  // Calculate progress for current phase
  const getPhaseProgress = (): PhaseProgress => {
    const ctx = conversationContext;
    let steps: Array<{ label: string; done: boolean }> = [];

    switch (currentPhase) {
      case 'discovery':
        steps = [
          { label: 'Project Idea', done: !!ctx.projectIdea },
          { label: 'Target Users', done: !!ctx.targetUsers },
          { label: 'Main Features', done: !!ctx.mainFeatures },
          { label: 'Competitors', done: !!ctx.competitors },
          { label: 'Differentiator', done: !!ctx.differentiator },
        ];
        break;
      case 'market-analysis':
        steps = [
          { label: 'Market Size', done: isValidData(ctx.marketSize) },
          { label: 'Target Segments', done: isValidData(ctx.targetSegments) || isValidData(ctx.targetUsers) },
          { label: 'Competitive Landscape', done: isValidData(ctx.competitiveLandscape) || isValidData(ctx.competitors) },
          { label: 'Market Opportunity', done: isValidData(ctx.marketOpportunity) || isValidData(ctx.differentiator) },
        ];
        break;
      case 'specifications':
        steps = [
          { label: 'Summary', done: !!ctx.specificationsSummary },
          { label: 'User Stories', done: !!ctx.userStories?.length },
          { label: 'Functional Reqs', done: !!ctx.functionalRequirements?.length },
          { label: 'Non-Functional Reqs', done: !!ctx.nonFunctionalRequirements?.length },
          { label: 'Data Model', done: !!ctx.dataModel },
        ];
        break;
      case 'design':
        steps = [
          { label: 'Design Choice', done: !!ctx.designChoice },
          { label: 'Color Palette', done: !!ctx.colorPalette },
          { label: 'Typography', done: !!ctx.typography },
        ];
        break;
      case 'architecture':
        steps = [
          { label: 'Tech Stack', done: !!ctx.techStack },
          { label: 'Project Structure', done: !!ctx.projectStructure },
          { label: 'Decisions', done: !!ctx.architectureDecisions?.length },
        ];
        break;
      default:
        steps = [];
    }

    const completed = steps.filter(s => s.done).length;
    const nextIncomplete = steps.find(s => !s.done);

    return {
      steps,
      completed,
      total: steps.length,
      nextStep: nextIncomplete?.label || null,
    };
  };

  const progress = getPhaseProgress();

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

  const isCompleted = phaseStatus?.status === 'completed' || phaseStatus?.status === 'approved';
  const isInProgress = phaseStatus?.status === 'in_progress';

  const handleStartPhase = () => {
    const nextStep = progress?.nextStep;
    const phaseName = phaseInfo?.label || currentPhase;

    // Set context so the chat knows what sub-phase to work on
    setChatContext({
      phase: currentPhase,
      subPhase: nextStep || undefined,
      prefillMessage: nextStep
        ? `Let's work on the ${nextStep} for the ${phaseName} phase.`
        : `Let's continue with the ${phaseName} phase.`
    });
    setChatPanelOpen(true);
  };

  // Helper to create section with defined check
  const makeSection = (title: string, content: string | undefined, fallback: string): SectionData => {
    // Validate content to avoid showing garbage data
    const hasValidContent = isValidData(content);
    return {
      title,
      content: hasValidContent ? content! : fallback,
      isDefined: hasValidContent,
    };
  };

  // Render a section card - using inline styles to guarantee single column
  const renderSection = (section: SectionData, idx: number) => (
    <div
      key={idx}
      style={{
        padding: '16px',
        borderLeft: `3px solid ${section.isDefined ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)'}`,
        background: 'var(--bg-secondary, #0a0a0f)',
        borderRadius: '4px',
        opacity: section.isDefined ? 1 : 0.6,
        width: '100%',
      }}
    >
      <h3 style={{
        fontSize: '12px',
        fontWeight: 600,
        color: section.isDefined ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: '0 0 8px 0',
      }}>{section.title}</h3>
      <p style={{
        fontSize: '14px',
        color: 'var(--text-primary, #fff)',
        margin: 0,
        whiteSpace: 'pre-wrap',
        lineHeight: 1.5,
      }}>{section.content}</p>
    </div>
  );

  // Parse text into list items (split by newlines, bullets, or numbers)
  const parseListItems = (text: string): string[] => {
    if (!text) return [];
    return text
      .split(/[\n•-]+/)
      .map(item => item.replace(/^\d+[.)]\s*/, '').trim())
      .filter(item => item.length > 0);
  };

  // Render features as numbered cards
  const renderFeaturesGrid = (featuresText: string) => {
    const features = parseListItems(featuresText);
    if (features.length === 0) return <p className="empty-text">Not defined yet</p>;

    return (
      <div className="features-grid">
        {features.map((feature, i) => (
          <div key={i} className="feature-card">
            <span className="feature-number">{i + 1}</span>
            <span className="feature-text">{feature}</span>
          </div>
        ))}
      </div>
    );
  };

  // Render competitors as pill badges
  const renderCompetitorBadges = (competitorsText: string) => {
    const competitors = parseListItems(competitorsText);
    if (competitors.length === 0) return <p className="empty-text">Not analyzed yet</p>;

    return (
      <div className="competitors-grid">
        {competitors.map((competitor, i) => (
          <div key={i} className="competitor-badge">
            {competitor}
          </div>
        ))}
      </div>
    );
  };

  // Render user stories list
  const renderUserStories = (stories: UserStory[]) => (
    <div className="user-stories-list">
      {stories.map((story) => (
        <div key={story.id} className="user-story-item">
          <span className="user-story-id">{story.id}</span>
          <span className="user-story-text">{story.title}</span>
          {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
            <div className="user-story-criteria">
              {story.acceptanceCriteria.map((criteria, i) => (
                <div key={i}>• {criteria}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (currentPhase) {
      case 'discovery': {
        const ctx = conversationContext;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {/* Project Idea */}
            {renderSection(makeSection('Project Idea', ctx.projectIdea, 'Not defined yet'), 0)}

            {/* Target Users */}
            {renderSection(makeSection('Target Users', ctx.targetUsers, 'Not defined yet'), 1)}

            {/* Main Features - Structured Grid */}
            <div style={{
              padding: '16px',
              borderLeft: `3px solid ${ctx.mainFeatures ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)'}`,
              background: 'var(--bg-secondary, #0a0a0f)',
              borderRadius: '4px',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: ctx.mainFeatures ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 12px 0',
              }}>Main Features</h3>
              {ctx.mainFeatures ? renderFeaturesGrid(ctx.mainFeatures) : <p className="empty-text">Not defined yet</p>}
            </div>

            {/* Competitors - Pill Badges */}
            <div style={{
              padding: '16px',
              borderLeft: `3px solid ${ctx.competitors ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)'}`,
              background: 'var(--bg-secondary, #0a0a0f)',
              borderRadius: '4px',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: ctx.competitors ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 12px 0',
              }}>Competitors</h3>
              {ctx.competitors ? renderCompetitorBadges(ctx.competitors) : <p className="empty-text">Not analyzed yet</p>}
            </div>

            {/* Differentiator */}
            {renderSection(makeSection('Differentiator', ctx.differentiator, 'Not defined yet'), 4)}
          </div>
        );
      }

      case 'market-analysis': {
        // Use discovery data as fallback for market context if not explicitly set
        const sections = [
          makeSection('Market Size', conversationContext.marketSize, 'Open the assistant to analyze market size'),
          makeSection('Target Segments', conversationContext.targetSegments || conversationContext.targetUsers, 'Based on target users from discovery'),
          makeSection('Competitive Landscape', conversationContext.competitiveLandscape || conversationContext.competitors, 'Based on competitors from discovery'),
          makeSection('Market Opportunity', conversationContext.marketOpportunity || conversationContext.differentiator, 'Based on differentiator from discovery'),
        ];
        const hasFullText = !!conversationContext.marketAnalysisFullText;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {sections.map(renderSection)}
            {/* Full Analysis Text - collapsible */}
            {hasFullText && (
              <details style={{
                padding: '16px',
                borderLeft: '3px solid var(--primary, #f97316)',
                background: 'var(--bg-secondary, #0a0a0f)',
                borderRadius: '4px',
                width: '100%',
              }}>
                <summary style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--primary, #f97316)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  marginBottom: '8px',
                }}>Full Analysis (click to expand)</summary>
                <div style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  maxHeight: '400px',
                  overflowY: 'auto',
                }}>
                  {conversationContext.marketAnalysisFullText}
                </div>
              </details>
            )}
          </div>
        );
      }

      case 'specifications': {
        const hasUserStories = conversationContext.userStories && conversationContext.userStories.length > 0;
        const sections = [
          makeSection('Summary', conversationContext.specificationsSummary, 'Not generated yet'),
          makeSection('Functional Requirements', conversationContext.functionalRequirements?.join('\n• '), 'Not defined yet'),
          makeSection('Non-Functional Requirements', conversationContext.nonFunctionalRequirements?.join('\n• '), 'Not defined yet'),
          makeSection('UI/UX Brief', conversationContext.uiUxBrief, 'Not defined yet'),
          makeSection('Data Model', conversationContext.dataModel, 'Not defined yet'),
        ];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {sections.map(renderSection)}
            {/* User Stories - special rendering */}
            <div style={{
              padding: '16px',
              borderLeft: `3px solid ${hasUserStories ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)'}`,
              background: 'var(--bg-secondary, #0a0a0f)',
              borderRadius: '4px',
              width: '100%',
            }}>
              <h3 style={{
                fontSize: '12px',
                fontWeight: 600,
                color: hasUserStories ? 'var(--primary, #f97316)' : 'var(--text-muted, #666)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                margin: '0 0 8px 0',
              }}>User Stories</h3>
              {hasUserStories ? (
                renderUserStories(conversationContext.userStories!)
              ) : (
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>No user stories defined yet</p>
              )}
            </div>
          </div>
        );
      }

      case 'design': {
        const sections = [
          makeSection('Design Choice', conversationContext.designChoice ? `Option ${conversationContext.designChoice}` : undefined, 'Not chosen yet'),
          makeSection('Color Palette', conversationContext.colorPalette, 'Not defined yet'),
          makeSection('Typography', conversationContext.typography, 'Not defined yet'),
        ];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {sections.map(renderSection)}
          </div>
        );
      }

      case 'architecture': {
        const sections = [
          makeSection('Tech Stack', conversationContext.techStack, 'Not defined yet'),
          makeSection('Project Structure', conversationContext.projectStructure, 'Not defined yet'),
        ];
        const decisions = conversationContext.architectureDecisions || [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
            {sections.map(renderSection)}
            {decisions.length > 0 && decisions.map((decision, i) =>
              renderSection({ title: `Decision ${i + 1}`, content: decision, isDefined: true }, i + 100)
            )}
          </div>
        );
      }

      default:
        return null;
    }
  };

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'discovery': return 'Project Discovery';
      case 'market-analysis': return 'Market Analysis';
      case 'specifications': return 'Specifications';
      case 'design': return 'Design System';
      case 'architecture': return 'Architecture';
      default: return phaseInfo.label;
    }
  };

  const getPhaseDescription = () => {
    switch (currentPhase) {
      case 'discovery': return 'Define your project idea, target users, and key features.';
      case 'market-analysis': return 'Analyze market opportunity, competition, and positioning.';
      case 'specifications': return 'User stories, requirements, and acceptance criteria.';
      case 'design': return 'Visual identity, colors, typography, and components.';
      case 'architecture': return 'Technical stack, project structure, and implementation plan.';
      default: return 'Phase details';
    }
  };

  return (
    <div className="phase-detail-screen">
      <div className="phase-detail-header">
        <div className="phase-detail-title-row">
          <span className="phase-detail-icon">{phaseInfo.icon}</span>
          <h1 className="phase-detail-title">{getPhaseTitle()}</h1>
          <Badge variant={isCompleted ? 'success' : isInProgress ? 'warning' : 'default'}>
            {isCompleted ? 'Completed' : isInProgress ? 'In Progress' : 'Pending'}
          </Badge>
        </div>
        <p className="phase-detail-description">{getPhaseDescription()}</p>

        {/* Progress Indicator */}
        {progress.total > 0 && (
          <div className="phase-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.completed}/{progress.total} complete
            </span>
          </div>
        )}

        {/* Next Step Hint */}
        {!isCompleted && progress.nextStep && (
          <div className="next-step-hint">
            <span className="hint-icon">👉</span>
            <span className="hint-text">Next: {progress.nextStep}</span>
            <Button size="sm" variant="secondary" onClick={handleStartPhase}>
              Continue in Chat
            </Button>
          </div>
        )}
      </div>

      {!isCompleted && !isInProgress && (
        <EmptyState
          icon={phaseInfo.icon}
          title={`Start ${getPhaseTitle()}`}
          description="Open the assistant to begin this phase."
          action={{
            label: 'Start in Assistant',
            onClick: handleStartPhase,
          }}
        />
      )}

      {(isCompleted || isInProgress) && (
        <div className="phase-detail-content">
          {renderPhaseContent()}

          {/* Artifact File Content */}
          {phaseStatus?.artifact && (
            <Card className="phase-artifact-card">
              <div className="phase-artifact-header">
                <h3>Generated Artifact</h3>
                <Badge variant="default">{phaseStatus.artifact.split('/').pop()}</Badge>
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
