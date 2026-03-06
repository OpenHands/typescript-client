export type ConversationStatus = 'RUNNING' | 'STOPPED' | 'PAUSED' | 'ERROR' | 'FINISHED';

export interface Conversation {
  conversation_id: string;
  title: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
  selected_repository?: string;
}

export interface ConversationListItem {
  conversation_id: string;
  title: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}
