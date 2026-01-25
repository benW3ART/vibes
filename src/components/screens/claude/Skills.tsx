import { useState } from 'react';
import { useSkills } from '@/hooks';
import { useProjectStore, toast } from '@/stores';
import { SkillCard, SectionTitle, Badge, Button, EmptyState } from '@/components/ui';
import { QuickActions } from '@/components/global';

// Available skill templates for the library
const skillLibrary = [
  { id: 'genius-orchestrator', name: 'Genius Orchestrator', description: 'Autonomous execution engine that coordinates subagents', category: 'core' as const },
  { id: 'genius-dev', name: 'Genius Dev', description: 'Code implementation specialist', category: 'core' as const },
  { id: 'genius-qa', name: 'Genius QA', description: 'Quality assurance and testing', category: 'core' as const },
  { id: 'genius-qa-micro', name: 'Genius QA Micro', description: 'Quick 30-second quality validation', category: 'core' as const },
  { id: 'genius-debugger', name: 'Genius Debugger', description: 'Error diagnosis and fixing', category: 'core' as const },
  { id: 'genius-reviewer', name: 'Genius Reviewer', description: 'Code quality review and scoring', category: 'core' as const },
  { id: 'genius-architect', name: 'Genius Architect', description: 'Technical architecture planning', category: 'core' as const },
  { id: 'genius-interviewer', name: 'Genius Interviewer', description: 'Requirements discovery through conversation', category: 'core' as const },
  { id: 'genius-designer', name: 'Genius Designer', description: 'Brand identity and design system creation', category: 'core' as const },
  { id: 'genius-deployer', name: 'Genius Deployer', description: 'Deployment and operations', category: 'integration' as const },
];

export function Skills() {
  const { currentProject } = useProjectStore();
  const { skills, isLoading, toggleSkill, refresh } = useSkills(currentProject?.path);
  const [showLibrary, setShowLibrary] = useState(false);

  const coreSkills = skills.filter(s => s.category === 'core');
  const integrationSkills = skills.filter(s => s.category === 'integration');
  const customSkills = skills.filter(s => s.category === 'custom');

  if (isLoading) {
    return (
      <div className="screen skills">
        <div className="skills-loading">Loading skills...</div>
      </div>
    );
  }

  return (
    <div className="screen skills">
      <QuickActions />

      <div className="skills-content">
        {coreSkills.length > 0 && (
          <div className="skills-section">
            <SectionTitle>
              Core Skills <Badge>{coreSkills.length}</Badge>
            </SectionTitle>
            <div className="skills-grid">
              {coreSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={(enabled) => toggleSkill(skill.id, enabled)}
                />
              ))}
            </div>
          </div>
        )}

        {integrationSkills.length > 0 && (
          <div className="skills-section">
            <SectionTitle>
              Integrations <Badge>{integrationSkills.length}</Badge>
            </SectionTitle>
            <div className="skills-grid">
              {integrationSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={(enabled) => toggleSkill(skill.id, enabled)}
                />
              ))}
            </div>
          </div>
        )}

        {customSkills.length > 0 && (
          <div className="skills-section">
            <SectionTitle>
              Custom <Badge>{customSkills.length}</Badge>
            </SectionTitle>
            <div className="skills-grid">
              {customSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onToggle={(enabled) => toggleSkill(skill.id, enabled)}
                />
              ))}
            </div>
          </div>
        )}

        {skills.length === 0 && (
          <EmptyState
            icon="⚡"
            title="No skills found"
            description="Skills enhance Claude's capabilities"
            action={{
              label: 'Browse skill library',
              onClick: () => setShowLibrary(true),
            }}
          />
        )}

        {skills.length > 0 && (
          <div className="skills-actions">
            <Button
              variant="primary"
              onClick={() => setShowLibrary(true)}
            >
              Browse Skill Library
            </Button>
          </div>
        )}
      </div>

      {/* Skill Library Modal */}
      {showLibrary && (
        <div className="modal-overlay" onClick={() => setShowLibrary(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">Skill Library</h2>
            <p className="modal-description">
              Install skills to enhance Claude's capabilities
            </p>

            <div className="skill-library-grid">
              {skillLibrary.map(skill => {
                const isInstalled = skills.some(s => s.id === skill.id);
                return (
                  <div key={skill.id} className={`skill-library-item ${isInstalled ? 'installed' : ''}`}>
                    <div className="skill-library-header">
                      <span className="skill-library-name">{skill.name}</span>
                      <Badge variant={skill.category === 'core' ? 'default' : 'info'}>
                        {skill.category}
                      </Badge>
                    </div>
                    <p className="skill-library-description">{skill.description}</p>
                    <Button
                      variant={isInstalled ? 'ghost' : 'primary'}
                      size="sm"
                      disabled={isInstalled}
                      onClick={async () => {
                        if (!currentProject?.path || !window.electron) {
                          toast.info('Skill installation requires an active project in Electron mode');
                          return;
                        }
                        // Create a basic skill file
                        const skillPath = `${currentProject.path}/.claude/skills/${skill.id}`;
                        await window.electron.file.mkdir(skillPath);
                        await window.electron.file.write(
                          `${skillPath}/skill.md`,
                          `# ${skill.name}\n\n${skill.description}\n\n## Triggers\n\n- "${skill.id}"\n`
                        );
                        toast.success(`${skill.name} installed!`);
                        refresh();
                      }}
                    >
                      {isInstalled ? 'Installed' : 'Install'}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions">
              <Button variant="secondary" onClick={() => setShowLibrary(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
