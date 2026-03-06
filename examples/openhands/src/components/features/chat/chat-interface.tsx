import { useRef, useEffect } from 'react';
import { FiChevronDown, FiPlay, FiPause, FiSquare } from 'react-icons/fi';
import { cn } from '#/utils';
import { ChatMessage } from './chat-message';
import { ChatInput } from './chat-input';
import { LoadingSpinner } from '#/components/shared';
import { useEventStore, useAgentStore } from '#/stores';
import { AgentState, getAgentStateLabel } from '#/types';
import type { Event } from '@openhands/client';

interface ChatInterfaceProps {
  onSendMessage: (message: string) => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isLoading?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-basic">Agent is thinking...</span>
    </div>
  );
}

function StatusIndicator({ state }: { state: AgentState }) {
  const colors: Record<AgentState, string> = {
    [AgentState.LOADING]: 'bg-yellow-500',
    [AgentState.INIT]: 'bg-yellow-500',
    [AgentState.RUNNING]: 'bg-green-500',
    [AgentState.PAUSED]: 'bg-yellow-500',
    [AgentState.STOPPED]: 'bg-red-500',
    [AgentState.FINISHED]: 'bg-blue-500',
    [AgentState.ERROR]: 'bg-red-500',
    [AgentState.AWAITING_USER_CONFIRMATION]: 'bg-yellow-500',
    [AgentState.AWAITING_USER_INPUT]: 'bg-blue-500',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 text-sm">
      <div className={cn('w-2 h-2 rounded-full', colors[state])} />
      <span className="text-basic">{getAgentStateLabel(state)}</span>
    </div>
  );
}

export function ChatInterface({
  onSendMessage,
  onPause,
  onResume,
  onStop,
  isLoading,
}: ChatInterfaceProps) {
  const { events } = useEventStore();
  const { currentAgentState } = useAgentStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottom = useRef(true);

  // Filter events to show only relevant ones
  const displayEvents = events.filter((event: Event) => {
    // Always show user messages and agent messages/thoughts
    if (event.source === 'user') return true;
    if (event.type === 'message' || event.type === 'thought') return true;
    // Show command executions and their outputs
    if (event.type === 'run' || event.type === 'run_ipython') return true;
    if (event.type === 'run_observation' || event.type === 'cmd_output') return true;
    // Show file operations
    if (event.type === 'read' || event.type === 'write') return true;
    // Show errors and finish events
    if (event.type === 'error' || event.type === 'finish') return true;
    return false;
  });

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (scrollRef.current && isAtBottom.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      isAtBottom.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      isAtBottom.current = true;
    }
  };

  const isRunning = currentAgentState === AgentState.RUNNING;
  const isPaused = currentAgentState === AgentState.PAUSED;
  const canControl = isRunning || isPaused;

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto custom-scrollbar-always px-4 py-4"
      >
        {isLoading && displayEvents.length === 0 && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="large" />
          </div>
        )}

        {displayEvents.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-basic">
            <p>No messages yet</p>
            <p className="text-sm mt-1">Send a message to start the conversation</p>
          </div>
        )}

        <div className="space-y-2">
          {displayEvents.map((event, index) => (
            <ChatMessage key={event.id || index} event={event} />
          ))}
        </div>

        {currentAgentState === AgentState.RUNNING && <TypingIndicator />}
      </div>

      {/* Controls and Input */}
      <div className="p-4 border-t border-neutral-700 space-y-3">
        <div className="flex items-center justify-between">
          <StatusIndicator state={currentAgentState} />
          
          <div className="flex items-center gap-2">
            {canControl && (
              <>
                {isRunning ? (
                  <button
                    onClick={onPause}
                    className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-500 transition-colors"
                    title="Pause"
                  >
                    <FiPause className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onResume}
                    className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-500 transition-colors"
                    title="Resume"
                  >
                    <FiPlay className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onStop}
                  className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-500 transition-colors"
                  title="Stop"
                >
                  <FiSquare className="w-4 h-4" />
                </button>
              </>
            )}

            {!isAtBottom.current && (
              <button
                onClick={scrollToBottom}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-content transition-colors"
                title="Scroll to bottom"
              >
                <FiChevronDown className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <ChatInput
          onSubmit={onSendMessage}
          disabled={isLoading}
          agentState={currentAgentState}
        />
      </div>
    </div>
  );
}
