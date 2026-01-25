import { useState, useCallback } from 'react';
import { useProjectStore, useNavigationStore, toast } from '@/stores';
import { PromptCard, SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';
import { usePlan } from '@/hooks';

export function Prompts() {
  const { prompts, addPrompt, currentProject } = useProjectStore();
  const { setScreen } = useNavigationStore();
  const { sections } = usePlan(currentProject?.path);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const pendingPrompts = prompts.filter(p => p.status === 'pending');
  const sentPrompts = prompts.filter(p => p.status === 'sent');
  const completedPrompts = prompts.filter(p => p.status === 'completed');

  const selected = prompts.find(p => p.id === selectedPrompt);

  const generateFromPlan = useCallback(async () => {
    if (!currentProject?.path) {
      toast.error('No project selected');
      return;
    }

    if (sections.length === 0) {
      toast.info('No plan found. Create a plan first.');
      setScreen('plan');
      return;
    }

    setIsGenerating(true);
    try {
      // Generate prompts from plan tasks
      let promptCount = 0;
      for (const section of sections) {
        for (const task of section.tasks) {
          if (!task.completed) {
            const taskText = task.text || `Task ${task.id}`;
            addPrompt({
              id: `prompt-${Date.now()}-${promptCount}`,
              taskId: task.id,
              title: taskText,
              content: `Implement the following task:\n\n**Task:** ${taskText}\n**Phase:** ${section.title}\n\nPlease implement this task following best practices and the project's existing patterns.`,
              category: 'implementation',
              status: 'pending',
              createdAt: new Date(),
            });
            promptCount++;
          }
        }
      }

      if (promptCount > 0) {
        toast.success(`Generated ${promptCount} prompts from plan`);
      } else {
        toast.info('All plan tasks are already completed');
      }
    } catch (err) {
      console.error('[Prompts] Failed to generate:', err);
      toast.error('Failed to generate prompts');
    } finally {
      setIsGenerating(false);
    }
  }, [currentProject, sections, addPrompt, setScreen]);

  if (prompts.length === 0) {
    return (
      <div className="screen prompts">
        <QuickActions />
        <EmptyState
          icon="chat"
          title="No prompts yet"
          description="Prompts will be generated from your plan"
          action={{
            label: isGenerating ? 'Generating...' : 'Generate from plan',
            onClick: generateFromPlan,
          }}
        />
      </div>
    );
  }

  return (
    <div className="screen prompts">
      <QuickActions />

      <div className="prompts-content">
        <div className="prompts-list">
          {pendingPrompts.length > 0 && (
            <div className="prompts-section">
              <SectionTitle>
                Pending <Badge>{pendingPrompts.length}</Badge>
              </SectionTitle>
              {pendingPrompts.map(prompt => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onClick={() => setSelectedPrompt(prompt.id)}
                />
              ))}
            </div>
          )}

          {sentPrompts.length > 0 && (
            <div className="prompts-section">
              <SectionTitle>
                Sent <Badge variant="info">{sentPrompts.length}</Badge>
              </SectionTitle>
              {sentPrompts.map(prompt => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onClick={() => setSelectedPrompt(prompt.id)}
                />
              ))}
            </div>
          )}

          {completedPrompts.length > 0 && (
            <div className="prompts-section">
              <SectionTitle>
                Completed <Badge variant="success">{completedPrompts.length}</Badge>
              </SectionTitle>
              {completedPrompts.map(prompt => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  onClick={() => setSelectedPrompt(prompt.id)}
                />
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div className="prompts-detail">
            <SectionTitle>{selected.title}</SectionTitle>
            <pre className="prompts-content-preview">{selected.content}</pre>
            <div className="prompts-actions">
              <Button variant="primary">Send to Claude</Button>
              <Button variant="ghost">Edit</Button>
              <Button variant="ghost">Copy</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
