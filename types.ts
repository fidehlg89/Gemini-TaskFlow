export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  createdAt: number;
  isAiGenerated?: boolean;
  parentId?: string;
  isExpanded?: boolean; // New property for collapse state
}

export enum FilterType {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED'
}

export interface AiSuggestion {
  text: string;
  priority: Priority;
}