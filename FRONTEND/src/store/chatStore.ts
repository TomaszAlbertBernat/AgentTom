import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Message } from '../types/api';

interface ChatState {
  messages: Message[];
  currentConversationId: string | null;
  addMessage: (message: Message) => void;
  setConversationId: (id: string) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      currentConversationId: null,

      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),

      setConversationId: (id) =>
        set({
          currentConversationId: id,
        }),

      clearMessages: () =>
        set({
          messages: [],
          currentConversationId: null,
        }),
    }),
    {
      name: 'chat-storage',
    }
  )
); 