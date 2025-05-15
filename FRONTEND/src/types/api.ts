export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  messages?: Message[];
}

export interface ApiError {
  error: string;
  status: number;
} 