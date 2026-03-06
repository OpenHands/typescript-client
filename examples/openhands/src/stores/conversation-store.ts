import { create } from 'zustand';
import type { Conversation } from '#/types/conversation';

interface ConversationStore {
  currentConversation: Conversation | null;
  setCurrentConversation: (conversation: Conversation | null) => void;
  messageToSend: string;
  setMessageToSend: (message: string) => void;
  resetConversationState: () => void;
}

export const useConversationStore = create<ConversationStore>((set) => ({
  currentConversation: null,
  setCurrentConversation: (conversation) => set({ currentConversation: conversation }),
  messageToSend: '',
  setMessageToSend: (message) => set({ messageToSend: message }),
  resetConversationState: () => set({ currentConversation: null, messageToSend: '' }),
}));
