import type { Prompt } from '@/types';
import { Badge } from './Badge';

export interface PromptCardProps {
  prompt: Prompt;
  onClick?: () => void;
}

export function PromptCard({ prompt, onClick }: PromptCardProps) {
  return (
    <div className="prompt-card" onClick={onClick}>
      <div className="prompt-card-header">
        <span className="prompt-id">{prompt.id}</span>
        <Badge variant={prompt.status === 'completed' ? 'success' : prompt.status === 'sent' ? 'info' : 'default'}>
          {prompt.status}
        </Badge>
      </div>
      <div className="prompt-card-title">{prompt.title}</div>
      <pre className="prompt-card-content">{prompt.content}</pre>
    </div>
  );
}
