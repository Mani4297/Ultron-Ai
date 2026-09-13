export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface SidebarModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  prompt: string;
}

export interface SettingsState {
  voiceEnabled: boolean;
  typingDelay: number; // in milliseconds
  autoSpeak: boolean;
  systemVolume: number;
}
