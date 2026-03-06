import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiMoreVertical } from 'react-icons/fi';
import { ChatInterface } from '#/components/features/chat';
import { Terminal } from '#/components/features/terminal';
import { FileTree } from '#/components/features/files';
import { TabBar, type TabOption } from '#/components/features/controls';
import { LoadingSpinner } from '#/components/shared';
import { useClient } from '#/context';
import { useAgentStore, useEventStore, useConversationStore } from '#/stores';
import { AgentState } from '#/types';
import toast from 'react-hot-toast';

export function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const {
    connect,
    disconnect,
    sendMessage,
    pauseAgent,
    resumeAgent,
    stopAgent,
    isLoadingHistory,
  } = useClient();
  const { setCurrentAgentState } = useAgentStore();
  const { clearEvents } = useEventStore();
  const { setCurrentConversation } = useConversationStore();
  const [activeTab, setActiveTab] = useState<TabOption>('chat');
  const [isConnecting, setIsConnecting] = useState(false);

  // Connect to conversation on mount
  useEffect(() => {
    if (!conversationId) {
      navigate('/');
      return;
    }

    const connectToConversation = async () => {
      setIsConnecting(true);
      clearEvents();
      setCurrentAgentState(AgentState.LOADING);

      try {
        await connect(conversationId);
        setCurrentConversation({
          conversation_id: conversationId,
          title: 'Conversation',
          status: 'RUNNING',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Failed to connect:', error);
        toast.error('Failed to connect to conversation');
        navigate('/');
      } finally {
        setIsConnecting(false);
      }
    };

    connectToConversation();

    return () => {
      disconnect();
    };
  }, [conversationId]);

  const handleSendMessage = useCallback(
    async (message: string) => {
      try {
        await sendMessage(message);
      } catch (error) {
        console.error('Failed to send message:', error);
        toast.error('Failed to send message');
      }
    },
    [sendMessage]
  );

  const handlePause = useCallback(async () => {
    try {
      await pauseAgent();
      toast.success('Agent paused');
    } catch (error) {
      console.error('Failed to pause:', error);
      toast.error('Failed to pause agent');
    }
  }, [pauseAgent]);

  const handleResume = useCallback(async () => {
    try {
      await resumeAgent();
      toast.success('Agent resumed');
    } catch (error) {
      console.error('Failed to resume:', error);
      toast.error('Failed to resume agent');
    }
  }, [resumeAgent]);

  const handleStop = useCallback(async () => {
    try {
      await stopAgent();
      toast.success('Agent stopped');
    } catch (error) {
      console.error('Failed to stop:', error);
      toast.error('Failed to stop agent');
    }
  }, [stopAgent]);

  if (isConnecting) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="large" />
          <p className="text-basic">Connecting to conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-white/10 text-content transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-semibold text-content">Conversation</h1>
            <p className="text-xs text-basic truncate max-w-[200px]">
              {conversationId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <TabBar activeTab={activeTab} onTabChange={setActiveTab} />
          <button className="p-2 rounded-lg hover:bg-white/10 text-content transition-colors">
            <FiMoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main panel */}
        <div className="flex-1 min-w-0">
          {activeTab === 'chat' && (
            <ChatInterface
              onSendMessage={handleSendMessage}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              isLoading={isLoadingHistory}
            />
          )}
          {activeTab === 'terminal' && (
            <div className="h-full p-4">
              <Terminal className="h-full" />
            </div>
          )}
          {activeTab === 'code' && (
            <div className="h-full flex items-center justify-center text-basic">
              <p>Code editor coming soon...</p>
            </div>
          )}
          {activeTab === 'browser' && (
            <div className="h-full flex items-center justify-center text-basic">
              <p>Browser preview coming soon...</p>
            </div>
          )}
        </div>

        {/* Side panel (visible on larger screens) */}
        <div className="hidden lg:block w-[300px] border-l border-neutral-700 p-4">
          <FileTree className="h-full" />
        </div>
      </div>
    </div>
  );
}
