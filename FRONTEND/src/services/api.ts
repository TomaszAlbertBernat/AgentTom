import axios from 'axios';
import { AuthResponse, Conversation, Message, User } from '../types/api';

const API_URL = 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  register: async (email: string, password: string, name: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', { email, password, name });
    localStorage.setItem('token', response.data.token);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};

export const conversationService = {
  createConversation: async (): Promise<Conversation> => {
    const response = await api.post<Conversation>('/agi/conversations');
    return response.data;
  },

  sendMessage: async (content: string, conversationId?: string): Promise<{ conversation_id: string; response: string }> => {
    const response = await api.post('/agi/messages', { content, conversation_id: conversationId });
    return response.data;
  },

  getConversationHistory: async (conversationId: string): Promise<Message[]> => {
    const response = await api.get<{ messages: Message[] }>(`/agi/conversations/${conversationId}/messages`);
    return response.data.messages;
  },
}; 