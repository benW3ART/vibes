import type { ClaudeEventType } from '@/types';

export interface MockOutputEvent {
  type: ClaudeEventType;
  content?: string;
  file?: string;
  lines?: number;
  command?: string;
  message?: string;
  taskId?: string;
  agent?: string;
  delay: number; // Delay in ms before this event appears
}

export const mockLiveOutput: MockOutputEvent[] = [
  {
    type: 'task_start',
    taskId: 'task-9',
    message: 'Starting: Implement recurring transactions',
    delay: 0,
  },
  {
    type: 'agent_switch',
    agent: 'Logic',
    message: 'Backend developer activated',
    delay: 200,
  },
  {
    type: 'thinking',
    content: 'Analyzing the transaction data structure to identify patterns for recurring transactions...',
    delay: 800,
  },
  {
    type: 'reading',
    file: 'src/types/transaction.ts',
    delay: 1500,
  },
  {
    type: 'reading',
    file: 'src/services/transactionParser.ts',
    delay: 2200,
  },
  {
    type: 'thinking',
    content: 'I need to create a new service to detect recurring transactions based on merchant, amount, and frequency.',
    delay: 3000,
  },
  {
    type: 'writing',
    file: 'src/services/recurringDetector.ts',
    lines: 145,
    delay: 4500,
  },
  {
    type: 'thinking',
    content: 'Now implementing the core detection algorithm using temporal pattern matching...',
    delay: 6000,
  },
  {
    type: 'writing',
    file: 'src/services/recurringDetector.ts',
    lines: 78,
    delay: 7500,
  },
  {
    type: 'reading',
    file: 'src/hooks/useTransactions.ts',
    delay: 8500,
  },
  {
    type: 'thinking',
    content: 'Adding a hook to expose recurring transactions to the UI components.',
    delay: 9200,
  },
  {
    type: 'writing',
    file: 'src/hooks/useRecurring.ts',
    lines: 52,
    delay: 10000,
  },
  {
    type: 'executing',
    command: 'npm run typecheck',
    delay: 11500,
  },
  {
    type: 'success',
    message: 'TypeScript compilation successful',
    delay: 14000,
  },
  {
    type: 'reading',
    file: 'src/components/Dashboard/SubscriptionsList.tsx',
    delay: 15000,
  },
  {
    type: 'thinking',
    content: 'The UI component needs to be updated to use the new recurring transactions hook.',
    delay: 15800,
  },
  {
    type: 'writing',
    file: 'src/components/Dashboard/SubscriptionsList.tsx',
    lines: 34,
    delay: 17000,
  },
  {
    type: 'executing',
    command: 'npm run test -- recurringDetector',
    delay: 18500,
  },
  {
    type: 'success',
    message: 'All 12 tests passed',
    delay: 22000,
  },
  {
    type: 'thinking',
    content: 'Tests pass. Now adding edge case handling for variable amounts in recurring transactions.',
    delay: 23000,
  },
  {
    type: 'writing',
    file: 'src/services/recurringDetector.ts',
    lines: 28,
    delay: 24500,
  },
  {
    type: 'reading',
    file: 'src/utils/dateHelpers.ts',
    delay: 25500,
  },
  {
    type: 'writing',
    file: 'src/utils/dateHelpers.ts',
    lines: 15,
    delay: 26500,
  },
  {
    type: 'executing',
    command: 'npm run lint',
    delay: 27500,
  },
  {
    type: 'success',
    message: 'No linting errors',
    delay: 29000,
  },
  {
    type: 'thinking',
    content: 'Completing the implementation. All recurring transaction detection is now functional.',
    delay: 30000,
  },
  {
    type: 'task_complete',
    taskId: 'task-9',
    message: 'Completed: Implement recurring transactions',
    delay: 31000,
  },
  {
    type: 'task_start',
    taskId: 'task-10',
    message: 'Starting: Add export functionality',
    delay: 32000,
  },
  {
    type: 'agent_switch',
    agent: 'Logic',
    message: 'Continuing with backend developer',
    delay: 32500,
  },
  {
    type: 'thinking',
    content: 'Planning the export functionality. Need to support CSV and PDF formats.',
    delay: 33500,
  },
  {
    type: 'reading',
    file: 'package.json',
    delay: 34500,
  },
  {
    type: 'executing',
    command: 'npm install jspdf papaparse --save',
    delay: 35500,
  },
  {
    type: 'success',
    message: 'Dependencies installed',
    delay: 38000,
  },
  {
    type: 'writing',
    file: 'src/services/exportService.ts',
    lines: 120,
    delay: 40000,
  },
  {
    type: 'thinking',
    content: 'Export service created. Now implementing the PDF template...',
    delay: 42000,
  },
];

// Calculate total duration
export const getTotalDuration = (): number => {
  return mockLiveOutput.reduce((max, event) => Math.max(max, event.delay), 0);
};

// Get events up to a specific time
export const getEventsUpTo = (time: number): MockOutputEvent[] => {
  return mockLiveOutput.filter(event => event.delay <= time);
};
