// File Generation Service - Generates real project files
import { logger } from '@/utils/logger';

export interface DiscoveryContext {
  projectName: string;
  projectIdea: string;
  targetUsers: string;
  mainFeatures: string;
  competitors: string;
  differentiator: string;
}

export interface SpecsContext extends DiscoveryContext {
  discoveryPath: string;
}

export interface DesignContext extends SpecsContext {
  specsPath: string;
  designChoice: 'A' | 'B' | 'C';
}

export interface ArchitectureContext extends DesignContext {
  designPath: string;
}

// Generate DISCOVERY.xml
export function generateDiscoveryXML(context: DiscoveryContext): string {
  const timestamp = new Date().toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<discovery version="1.0" generated="${timestamp}">
  <project>
    <name>${escapeXml(context.projectName)}</name>
    <timestamp>${timestamp}</timestamp>
  </project>

  <vision>
    <one_liner>${escapeXml(context.projectIdea)}</one_liner>
    <problem_statement>
      ${escapeXml(context.projectIdea)}
    </problem_statement>
  </vision>

  <target_audience>
    <primary_persona>
      <description>${escapeXml(context.targetUsers)}</description>
    </primary_persona>
  </target_audience>

  <features>
    <core_features>
      ${context.mainFeatures.split('\n').map(f => `<feature>${escapeXml(f.trim())}</feature>`).join('\n      ')}
    </core_features>
  </features>

  <market>
    <competitors>
      ${context.competitors.split('\n').map(c => `<competitor>${escapeXml(c.trim())}</competitor>`).join('\n      ')}
    </competitors>
    <differentiator>${escapeXml(context.differentiator)}</differentiator>
  </market>

  <constraints>
    <timeline>MVP in 2 weeks</timeline>
    <budget>Bootstrap</budget>
    <team_size>1 developer + AI</team_size>
  </constraints>
</discovery>`;
}

// Generate SPECIFICATIONS.xml
export function generateSpecificationsXML(context: SpecsContext): string {
  const timestamp = new Date().toISOString();
  const features = context.mainFeatures.split('\n').filter(f => f.trim());

  const userStories = features.map((feature, idx) => `
    <user_story id="US-${String(idx + 1).padStart(3, '0')}">
      <as_a>user</as_a>
      <i_want>${escapeXml(feature.trim())}</i_want>
      <so_that>I can achieve my goals efficiently</so_that>
      <acceptance_criteria>
        <criterion>Feature is accessible from main navigation</criterion>
        <criterion>Feature works on mobile and desktop</criterion>
        <criterion>Feature provides feedback on user actions</criterion>
      </acceptance_criteria>
      <priority>high</priority>
    </user_story>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<specifications version="1.0" generated="${timestamp}">
  <project>
    <name>${escapeXml(context.projectName)}</name>
    <discovery_ref>${escapeXml(context.discoveryPath)}</discovery_ref>
  </project>

  <user_stories>${userStories}
  </user_stories>

  <functional_requirements>
    <requirement id="FR-001">
      <description>User authentication and authorization</description>
      <priority>critical</priority>
    </requirement>
    <requirement id="FR-002">
      <description>Responsive design for all screen sizes</description>
      <priority>high</priority>
    </requirement>
    <requirement id="FR-003">
      <description>Real-time updates and notifications</description>
      <priority>medium</priority>
    </requirement>
  </functional_requirements>

  <non_functional_requirements>
    <performance>
      <page_load_time>Under 3 seconds</page_load_time>
      <api_response_time>Under 500ms</api_response_time>
    </performance>
    <security>
      <authentication>OAuth 2.0 / JWT</authentication>
      <data_encryption>TLS 1.3</data_encryption>
    </security>
    <scalability>
      <target_users>10,000 concurrent users</target_users>
    </scalability>
  </non_functional_requirements>

  <data_model>
    <entity name="User">
      <field name="id" type="uuid" primary="true"/>
      <field name="email" type="string" unique="true"/>
      <field name="name" type="string"/>
      <field name="created_at" type="timestamp"/>
    </entity>
  </data_model>
</specifications>`;
}

// Design presets
const designPresets = {
  A: {
    name: 'Minimal',
    primary: '#000000',
    secondary: '#666666',
    accent: '#0066FF',
    background: '#FFFFFF',
    surface: '#F5F5F5',
    text: '#1A1A1A',
    fontHeading: 'Inter',
    fontBody: 'Inter',
  },
  B: {
    name: 'Vibrant',
    primary: '#FF6B35',
    secondary: '#F7C59F',
    accent: '#2EC4B6',
    background: '#1A1A2E',
    surface: '#16213E',
    text: '#EAEAEA',
    fontHeading: 'Poppins',
    fontBody: 'Open Sans',
  },
  C: {
    name: 'Professional',
    primary: '#2563EB',
    secondary: '#3B82F6',
    accent: '#10B981',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#1E293B',
    fontHeading: 'Plus Jakarta Sans',
    fontBody: 'Inter',
  },
};

// Generate DESIGN-SYSTEM.xml
export function generateDesignSystemXML(context: DesignContext): string {
  const timestamp = new Date().toISOString();
  const preset = designPresets[context.designChoice];

  return `<?xml version="1.0" encoding="UTF-8"?>
<design_system version="1.0" generated="${timestamp}">
  <project>
    <name>${escapeXml(context.projectName)}</name>
    <specs_ref>${escapeXml(context.specsPath)}</specs_ref>
    <theme>${preset.name}</theme>
  </project>

  <colors>
    <primary>${preset.primary}</primary>
    <secondary>${preset.secondary}</secondary>
    <accent>${preset.accent}</accent>
    <background>${preset.background}</background>
    <surface>${preset.surface}</surface>
    <text>${preset.text}</text>
    <text_muted>${preset.text}99</text_muted>
    <success>#10B981</success>
    <warning>#F59E0B</warning>
    <error>#EF4444</error>
  </colors>

  <typography>
    <font_heading>${preset.fontHeading}</font_heading>
    <font_body>${preset.fontBody}</font_body>
    <font_code>JetBrains Mono</font_code>
    <scale>
      <xs>0.75rem</xs>
      <sm>0.875rem</sm>
      <base>1rem</base>
      <lg>1.125rem</lg>
      <xl>1.25rem</xl>
      <xxl>1.5rem</xxl>
      <xxxl>2rem</xxxl>
    </scale>
  </typography>

  <spacing>
    <unit>4px</unit>
    <scale>
      <xs>4px</xs>
      <sm>8px</sm>
      <md>16px</md>
      <lg>24px</lg>
      <xl>32px</xl>
      <xxl>48px</xxl>
    </scale>
  </spacing>

  <borders>
    <radius>
      <sm>4px</sm>
      <md>8px</md>
      <lg>12px</lg>
      <full>9999px</full>
    </radius>
    <width>1px</width>
    <color>${preset.text}20</color>
  </borders>

  <shadows>
    <sm>0 1px 2px rgba(0,0,0,0.05)</sm>
    <md>0 4px 6px rgba(0,0,0,0.1)</md>
    <lg>0 10px 15px rgba(0,0,0,0.1)</lg>
  </shadows>

  <components>
    <button>
      <variants>primary, secondary, ghost, danger</variants>
      <sizes>sm, md, lg</sizes>
    </button>
    <input>
      <variants>default, error, success</variants>
      <sizes>sm, md, lg</sizes>
    </input>
    <card>
      <variants>default, elevated, bordered</variants>
    </card>
  </components>
</design_system>`;
}

// Generate ARCHITECTURE.md
export function generateArchitectureMD(context: ArchitectureContext): string {
  const timestamp = new Date().toISOString();

  return `# ${context.projectName} — Architecture

**Generated:** ${timestamp}

## Overview

${context.projectIdea}

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | Next.js 14 | App Router, Server Components, Edge Runtime |
| Styling | Tailwind CSS | Utility-first, consistent with design system |
| Database | Supabase | PostgreSQL + Auth + Realtime |
| State | Zustand | Lightweight, TypeScript-first |
| API | tRPC | Type-safe API layer |

## Project Structure

\`\`\`
${context.projectName}/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (auth)/         # Auth routes (login, signup)
│   │   ├── (dashboard)/    # Protected dashboard routes
│   │   ├── api/            # API routes
│   │   └── layout.tsx      # Root layout
│   ├── components/
│   │   ├── ui/             # Design system components
│   │   └── features/       # Feature-specific components
│   ├── lib/
│   │   ├── supabase/       # Supabase client & helpers
│   │   ├── trpc/           # tRPC router & procedures
│   │   └── utils/          # Utility functions
│   ├── stores/             # Zustand stores
│   └── types/              # TypeScript types
├── public/                  # Static assets
├── supabase/
│   ├── migrations/         # Database migrations
│   └── seed.sql            # Seed data
└── tests/                   # Test files
\`\`\`

## Key Decisions

### Authentication
- Supabase Auth with OAuth providers (Google, GitHub)
- JWT tokens stored in HTTP-only cookies
- Row Level Security (RLS) for data access

### Data Flow
1. Client → tRPC procedure → Supabase → Response
2. Real-time updates via Supabase subscriptions

### Performance
- Server Components by default
- Edge runtime for API routes
- Image optimization with next/image
- Static generation where possible

## Database Schema

Based on specifications, the core entities are:

- **users** - User accounts and profiles
- **projects** - User's projects/workspaces
- **tasks** - Tasks within projects

## Security Considerations

- Input validation with Zod
- CSRF protection
- Rate limiting on API routes
- Content Security Policy headers

## Deployment

- **Platform:** Vercel (recommended) or Railway
- **Database:** Supabase hosted
- **CDN:** Vercel Edge Network

## References

- Discovery: DISCOVERY.xml
- Specifications: SPECIFICATIONS.xml
- Design System: DESIGN-SYSTEM.xml
`;
}

// Generate .claude/plan.md
export function generatePlanMD(context: ArchitectureContext): string {
  const features = context.mainFeatures.split('\n').filter(f => f.trim());

  let taskNumber = 1;
  const tasks: string[] = [];

  // Phase 1: Setup
  tasks.push(`## Phase 1: Project Setup\n`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Initialize Next.js 14 project with TypeScript`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Configure Tailwind CSS with design tokens`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Set up Supabase client and auth`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Configure environment variables`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Set up project structure\n`);

  // Phase 2: Auth
  tasks.push(`## Phase 2: Authentication\n`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create auth layout and pages`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Implement login form`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Implement signup form`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Add OAuth providers (Google, GitHub)`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create auth middleware\n`);

  // Phase 3: UI Components
  tasks.push(`## Phase 3: UI Components\n`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create Button component`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create Input component`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create Card component`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create Modal component`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Create Navigation component\n`);

  // Phase 4: Features
  tasks.push(`## Phase 4: Core Features\n`);
  features.forEach(feature => {
    tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Implement: ${feature.trim()}`);
  });
  tasks.push('');

  // Phase 5: Polish
  tasks.push(`## Phase 5: Polish & Deploy\n`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Add loading states and skeletons`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Implement error handling`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Add responsive design adjustments`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Write tests`);
  tasks.push(`- [ ] MP-${String(taskNumber++).padStart(3, '0')} Deploy to production\n`);

  return `# ${context.projectName} — Execution Plan

**Project:** ${context.projectName}
**Total Tasks:** ${taskNumber - 1}
**Generated:** ${new Date().toISOString()}

---

${tasks.join('\n')}
---

*This plan was generated by vibes based on your specifications.*
`;
}

// Helper to escape XML special characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Service class for file operations
class FileGenerationServiceClass {
  async writeFile(projectPath: string, fileName: string, content: string): Promise<boolean> {
    if (!window.electron) {
      logger.debug(`[FileGeneration] Demo mode - would write ${fileName}`);
      logger.debug(content);
      return true;
    }

    try {
      const filePath = `${projectPath}/${fileName}`;
      await window.electron.file.write(filePath, content);
      logger.debug(`[FileGeneration] Wrote ${filePath}`);
      return true;
    } catch (error) {
      logger.error(`[FileGeneration] Failed to write ${fileName}:`, error);
      return false;
    }
  }

  async generateDiscovery(projectPath: string, context: DiscoveryContext): Promise<{ success: boolean; path: string }> {
    const content = generateDiscoveryXML(context);
    const fileName = 'DISCOVERY.xml';
    const success = await this.writeFile(projectPath, fileName, content);
    return { success, path: `${projectPath}/${fileName}` };
  }

  async generateSpecifications(projectPath: string, context: SpecsContext): Promise<{ success: boolean; path: string }> {
    const content = generateSpecificationsXML(context);
    const fileName = 'SPECIFICATIONS.xml';
    const success = await this.writeFile(projectPath, fileName, content);
    return { success, path: `${projectPath}/${fileName}` };
  }

  async generateDesignSystem(projectPath: string, context: DesignContext): Promise<{ success: boolean; path: string }> {
    const content = generateDesignSystemXML(context);
    const fileName = 'DESIGN-SYSTEM.xml';
    const success = await this.writeFile(projectPath, fileName, content);
    return { success, path: `${projectPath}/${fileName}` };
  }

  async generateArchitecture(projectPath: string, context: ArchitectureContext): Promise<{ success: boolean; paths: string[] }> {
    const archContent = generateArchitectureMD(context);
    const planContent = generatePlanMD(context);

    const archSuccess = await this.writeFile(projectPath, 'ARCHITECTURE.md', archContent);
    const planSuccess = await this.writeFile(projectPath, '.claude/plan.md', planContent);

    return {
      success: archSuccess && planSuccess,
      paths: [`${projectPath}/ARCHITECTURE.md`, `${projectPath}/.claude/plan.md`],
    };
  }
}

export const fileGenerationService = new FileGenerationServiceClass();
