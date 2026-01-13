
export enum AIMode {
  CHAT = 'Chat',
  DOCUMENT = 'Document',
  CODE = 'Code',
  EXPLANATION = 'Explanation'
}

export enum AIRole {
  GENERAL = 'General Assistant',
  DEVELOPER = 'Senior Developer',
  DESIGNER = 'UI/UX Designer',
  MANAGER = 'Product Manager',
  ANALYST = 'Data Analyst',
  SAVAGE = "Savage man"
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: AIMode;
  rating?: 'up' | 'down';
}

export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  lastUpdatedAt: number;
  mode: AIMode;
  role: AIRole;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  model: string;
  temperature: number;
  maxTokens: number;
  sidebarCollapsed: boolean;
}
