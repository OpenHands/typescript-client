import { create } from 'zustand';
import { AgentState } from '#/types/agent-state';

interface AgentStore {
  currentAgentState: AgentState;
  setCurrentAgentState: (state: AgentState) => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  currentAgentState: AgentState.LOADING,
  setCurrentAgentState: (state) => set({ currentAgentState: state }),
}));
