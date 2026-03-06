import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiMessageSquare, FiTrash2 } from 'react-icons/fi';
import { cn } from '#/utils';
import { LoadingSpinner } from '#/components/shared';
import { useSettingsStore } from '#/stores';
import { HttpClient } from '@openhands/client';
import type { ConversationListItem } from '#/types';

interface ConversationPanelProps {
  onClose: () => void;
}

export function ConversationPanel({ onClose }: ConversationPanelProps) {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const client = new HttpClient({ baseUrl: settings.agentServerUrl });
        const response = await client.get<{ conversations: ConversationListItem[] }>(
          '/api/conversations'
        );
        setConversations(response.data.conversations || []);
      } catch (err) {
        setError('Failed to load conversations');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversations();
  }, [settings.agentServerUrl]);

  const handleConversationClick = (conversationId: string) => {
    navigate(`/conversations/${conversationId}`);
    onClose();
  };

  const handleDeleteConversation = async (
    e: React.MouseEvent,
    conversationId: string
  ) => {
    e.stopPropagation();
    try {
      const client = new HttpClient({ baseUrl: settings.agentServerUrl });
      await client.delete(`/api/conversations/${conversationId}`);
      setConversations((prev) =>
        prev.filter((c) => c.conversation_id !== conversationId)
      );
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={cn(
        'fixed md:absolute left-0 md:left-[75px] top-0 h-full w-full md:w-[320px]',
        'bg-base-secondary border-r border-neutral-700 z-50',
        'flex flex-col'
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-neutral-700">
        <h2 className="text-lg font-semibold text-content">Conversations</h2>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-content"
          aria-label="Close"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner size="medium" />
          </div>
        )}

        {error && (
          <div className="p-4 text-center text-danger">{error}</div>
        )}

        {!isLoading && !error && conversations.length === 0 && (
          <div className="p-4 text-center text-basic">
            No conversations yet
          </div>
        )}

        {!isLoading && !error && conversations.length > 0 && (
          <div className="p-2">
            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_id}
                onClick={() => handleConversationClick(conversation.conversation_id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left',
                  'hover:bg-white/5 transition-colors',
                  'flex items-start gap-3 group'
                )}
              >
                <FiMessageSquare className="w-5 h-5 text-basic mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-content text-sm font-medium truncate">
                    {conversation.title || 'Untitled'}
                  </p>
                  <p className="text-basic text-xs mt-1">
                    {formatDate(conversation.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) =>
                    handleDeleteConversation(e, conversation.conversation_id)
                  }
                  className={cn(
                    'p-1.5 rounded opacity-0 group-hover:opacity-100',
                    'hover:bg-danger/20 text-danger transition-all'
                  )}
                  aria-label="Delete conversation"
                >
                  <FiTrash2 className="w-4 h-4" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
