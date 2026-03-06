import { useState, useRef, useEffect } from 'react';
import { FiSend, FiPaperclip } from 'react-icons/fi';
import { cn } from '#/utils';
import { LoadingSpinner } from '#/components/shared';
import { AgentState } from '#/types';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  agentState: AgentState;
}

export function ChatInput({ onSubmit, disabled, agentState }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled) return;
    onSubmit(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isRunning = agentState === AgentState.RUNNING || agentState === AgentState.LOADING;
  const placeholder = isRunning 
    ? 'Agent is working...' 
    : agentState === AgentState.AWAITING_USER_CONFIRMATION 
      ? 'Confirm or reject the action above...'
      : 'Type a message...';

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={cn(
          'rounded-xl border border-neutral-600 bg-base-secondary',
          'transition-colors focus-within:border-primary',
          disabled && 'opacity-50'
        )}
      >
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isRunning}
          className={cn(
            'w-full px-4 py-3 bg-transparent text-content resize-none',
            'placeholder-basic focus:outline-none',
            'min-h-[56px] max-h-[200px]'
          )}
          rows={1}
        />
        <div className="flex items-center justify-between px-3 py-2 border-t border-neutral-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-white/10 text-basic transition-colors"
              disabled={disabled}
              title="Attach file"
            >
              <FiPaperclip className="w-4 h-4" />
            </button>
          </div>
          <button
            type="submit"
            disabled={!message.trim() || disabled || isRunning}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'bg-primary hover:bg-primary/80 text-base',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <LoadingSpinner size="small" />
            ) : (
              <FiSend className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
