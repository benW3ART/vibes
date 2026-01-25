// electron/claude/parser.ts
export type ClaudeEventType =
  | 'thinking'
  | 'reading'
  | 'writing'
  | 'executing'
  | 'success'
  | 'error'
  | 'task_start'
  | 'task_complete'
  | 'agent_switch'
  | 'output';

export interface ParsedEvent {
  type: ClaudeEventType;
  content?: string;
  file?: string;
  lines?: number;
  command?: string;
  message?: string;
  taskId?: string;
  agent?: string;
  timestamp: Date;
  raw: string;
}

export function parseClaudeOutput(line: string): ParsedEvent {
  const timestamp = new Date();
  const raw = line;

  // Thinking patterns
  if (line.includes('Thinking...') || line.includes('...')) {
    return { type: 'thinking', content: line, timestamp, raw };
  }

  // File operations
  if (line.includes('Reading') || line.includes('read')) {
    const match = line.match(/(?:Reading|read)\s+(.+)/i);
    return {
      type: 'reading',
      file: match?.[1]?.trim(),
      content: line,
      timestamp,
      raw
    };
  }

  if (line.includes('Writing') || line.includes('wrote')) {
    const match = line.match(/(?:Writing|wrote)\s+(?:to\s+)?(.+)/i);
    return {
      type: 'writing',
      file: match?.[1]?.trim(),
      content: line,
      timestamp,
      raw
    };
  }

  // Command execution
  if (line.includes('Executing') || line.includes('Running')) {
    const match = line.match(/(?:Executing|Running)\s+(.+)/i);
    return {
      type: 'executing',
      command: match?.[1]?.trim(),
      content: line,
      timestamp,
      raw
    };
  }

  // Success/Error
  if (line.includes('\u2713') || line.includes('Success') || line.includes('Done')) {
    return { type: 'success', message: line, timestamp, raw };
  }

  if (line.includes('\u2717') || line.includes('Error') || line.includes('Failed')) {
    return { type: 'error', message: line, timestamp, raw };
  }

  // Task events
  if (line.includes('Starting task')) {
    const match = line.match(/task\s+(\S+)/i);
    return {
      type: 'task_start',
      taskId: match?.[1],
      content: line,
      timestamp,
      raw
    };
  }

  if (line.includes('Completed task')) {
    const match = line.match(/task\s+(\S+)/i);
    return {
      type: 'task_complete',
      taskId: match?.[1],
      content: line,
      timestamp,
      raw
    };
  }

  // Agent switch
  if (line.includes('genius-') || line.includes('Agent:')) {
    const match = line.match(/genius-(\w+)/i);
    return {
      type: 'agent_switch',
      agent: match?.[1] || 'unknown',
      content: line,
      timestamp,
      raw
    };
  }

  // Default output
  return { type: 'output', content: line, timestamp, raw };
}
