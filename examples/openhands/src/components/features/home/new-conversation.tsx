import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend } from 'react-icons/fi';
import { cn } from '#/utils';
import { useSettingsStore } from '#/stores';
import { HttpClient } from '@openhands/client';
import type { ConversationInfo } from '@openhands/client';
import { LoadingSpinner } from '#/components/shared';
import toast from 'react-hot-toast';

export function NewConversation() {
  const navigate = useNavigate();
  const { settings } = useSettingsStore();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    if (!settings.llmApiKey) {
      toast.error('Please configure your LLM API key in settings');
      return;
    }

    setIsLoading(true);
    try {
      const client = new HttpClient({ baseUrl: settings.agentServerUrl });
      const response = await client.post<ConversationInfo>('/api/conversations', {
        agent: settings.agent,
        llm: {
          model: settings.llmModel,
          api_key: settings.llmApiKey,
        },
        initial_message: message.trim(),
        confirmation_mode: settings.confirmationMode,
      });

      const conversationId = response.data.conversation_id;
      navigate(`/conversations/${conversationId}`);
    } catch (error) {
      console.error('Failed to create conversation:', error);
      toast.error('Failed to create conversation. Check your settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={cn(
            'rounded-xl border border-neutral-600 bg-base-secondary',
            'transition-colors focus-within:border-primary'
          )}
        >
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you want to build?"
            disabled={isLoading}
            className={cn(
              'w-full px-4 py-3 bg-transparent text-content resize-none',
              'placeholder-basic focus:outline-none',
              'min-h-[100px] max-h-[300px]'
            )}
            rows={3}
          />
          <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-700">
            <div className="text-xs text-basic">
              Press Enter to send, Shift+Enter for new line
            </div>
            <button
              type="submit"
              disabled={!message.trim() || isLoading}
              className={cn(
                'p-2 rounded-lg transition-colors',
                'bg-primary hover:bg-primary/80 text-base',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? (
                <LoadingSpinner size="small" />
              ) : (
                <FiSend className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
