export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export enum ChatMode {
  NORMAL = 'normal',
  IMAGE = 'image',
  SEARCH = 'search',
  DEVELOPER = 'developer',
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  image?: string; // base64 string
  isLoading?: boolean;
  groundingChunks?: any[]; // For search results
}

// Fix: Centralize global type declarations to avoid conflicts.
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}
