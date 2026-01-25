export interface Prompt {
  id: string;
  taskId: string;
  title: string;
  content: string;
  category: 'implementation' | 'review' | 'debug' | 'test';
  status: 'pending' | 'sent' | 'completed';
  createdAt: Date;
  sentAt?: Date;
  response?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  category: string;
}
