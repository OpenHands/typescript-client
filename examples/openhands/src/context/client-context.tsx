import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  HttpClient,
  RemoteConversation,
  RemoteWorkspace,
  WebSocketCallbackClient,
} from '@openhands/client';
import type { ConversationInfo, Event } from '@openhands/client';
import { useSettingsStore } from '#/stores/settings-store';
import { useEventStore } from '#/stores/event-store';
import { useAgentStore } from '#/stores/agent-store';
import { AgentState } from '#/types/agent-state';

interface ClientContextValue {
  httpClient: HttpClient | null;
  conversation: RemoteConversation | null;
  workspace: RemoteWorkspace | null;
  wsClient: WebSocketCallbackClient | null;
  isConnected: boolean;
  isLoadingHistory: boolean;
  connect: (conversationId: string) => Promise<void>;
  disconnect: () => void;
  createConversation: (initialMessage?: string) => Promise<ConversationInfo>;
  sendMessage: (content: string) => Promise<void>;
  pauseAgent: () => Promise<void>;
  resumeAgent: () => Promise<void>;
  stopAgent: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettingsStore();
  const { addEvent, setEvents, clearEvents } = useEventStore();
  const { setCurrentAgentState } = useAgentStore();

  const [httpClient, setHttpClient] = useState<HttpClient | null>(null);
  const [conversation, setConversation] = useState<RemoteConversation | null>(null);
  const [workspace, setWorkspace] = useState<RemoteWorkspace | null>(null);
  const [wsClient, setWsClient] = useState<WebSocketCallbackClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const disconnect = useCallback(() => {
    if (wsClient) {
      wsClient.stop();
    }
    setConversation(null);
    setWorkspace(null);
    setWsClient(null);
    setIsConnected(false);
    clearEvents();
  }, [wsClient, clearEvents]);

  const connect = useCallback(
    async (conversationId: string) => {
      disconnect();
      setIsLoadingHistory(true);

      try {
        const client = new HttpClient({ baseUrl: settings.agentServerUrl });
        setHttpClient(client);

        // Create workspace
        const ws = new RemoteWorkspace({
          host: settings.agentServerUrl,
          workingDir: '/workspace',
        });
        setWorkspace(ws);

        // Load existing events via HTTP
        try {
          const eventsResponse = await client.get<{ events: Event[] }>(`/api/conversations/${conversationId}/events`);
          if (eventsResponse.data.events) {
            setEvents(eventsResponse.data.events);
          }
        } catch {
          // Events endpoint might not exist or return empty
          console.log('No existing events found');
        }

        // Connect WebSocket for real-time updates
        const socket = new WebSocketCallbackClient({
          host: settings.agentServerUrl,
          conversationId,
          callback: (event: Event) => {
            addEvent(event);
            // Update agent state based on events
            if (event.type === 'agent_state_changed') {
              const payload = event.payload as { state?: string };
              if (payload?.state) {
                setCurrentAgentState(payload.state as AgentState);
              }
            }
          },
        });

        socket.start();
        setWsClient(socket);
        setIsConnected(true);
        setCurrentAgentState(AgentState.INIT);
      } catch (error) {
        console.error('Failed to connect:', error);
        setCurrentAgentState(AgentState.ERROR);
        throw error;
      } finally {
        setIsLoadingHistory(false);
      }
    },
    [settings.agentServerUrl, disconnect, addEvent, setEvents, setCurrentAgentState]
  );

  const createConversation = useCallback(
    async (initialMessage?: string): Promise<ConversationInfo> => {
      const client = new HttpClient({ baseUrl: settings.agentServerUrl });

      const response = await client.post<ConversationInfo>('/api/conversations', {
        agent: settings.agent,
        llm: {
          model: settings.llmModel,
          api_key: settings.llmApiKey,
        },
        initial_message: initialMessage,
        confirmation_mode: settings.confirmationMode,
      });

      return response.data;
    },
    [settings]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      if (!httpClient) {
        throw new Error('No HTTP client');
      }
      
      // Get conversation ID from the URL or state
      const conversationId = window.location.pathname.split('/').pop();
      if (!conversationId) {
        throw new Error('No conversation ID');
      }

      await httpClient.post(`/api/conversations/${conversationId}/messages`, {
        content: [{ type: 'text', text: content }],
        timestamp: new Date().toISOString(),
      });

      setCurrentAgentState(AgentState.RUNNING);
    },
    [httpClient, setCurrentAgentState]
  );

  const pauseAgent = useCallback(async () => {
    if (!httpClient) return;
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId) return;
    await httpClient.post(`/api/conversations/${conversationId}/pause`);
    setCurrentAgentState(AgentState.PAUSED);
  }, [httpClient, setCurrentAgentState]);

  const resumeAgent = useCallback(async () => {
    if (!httpClient) return;
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId) return;
    await httpClient.post(`/api/conversations/${conversationId}/run`);
    setCurrentAgentState(AgentState.RUNNING);
  }, [httpClient, setCurrentAgentState]);

  const stopAgent = useCallback(async () => {
    if (!httpClient) return;
    const conversationId = window.location.pathname.split('/').pop();
    if (!conversationId) return;
    await httpClient.post(`/api/conversations/${conversationId}/stop`);
    setCurrentAgentState(AgentState.STOPPED);
  }, [httpClient, setCurrentAgentState]);

  const value = useMemo(
    () => ({
      httpClient,
      conversation,
      workspace,
      wsClient,
      isConnected,
      isLoadingHistory,
      connect,
      disconnect,
      createConversation,
      sendMessage,
      pauseAgent,
      resumeAgent,
      stopAgent,
    }),
    [
      httpClient,
      conversation,
      workspace,
      wsClient,
      isConnected,
      isLoadingHistory,
      connect,
      disconnect,
      createConversation,
      sendMessage,
      pauseAgent,
      resumeAgent,
      stopAgent,
    ]
  );

  return <ClientContext.Provider value={value}>{children}</ClientContext.Provider>;
}

export function useClient() {
  const context = useContext(ClientContext);
  if (!context) {
    throw new Error('useClient must be used within a ClientProvider');
  }
  return context;
}
