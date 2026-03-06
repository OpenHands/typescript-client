import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  agentServerUrl: string;
  llmModel: string;
  llmApiKey: string;
  agent: string;
  confirmationMode: boolean;
}

interface SettingsStore {
  settings: Settings;
  setSettings: (settings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: Settings = {
  agentServerUrl: 'http://localhost:8000',
  llmModel: 'anthropic/claude-sonnet-4-20250514',
  llmApiKey: '',
  agent: 'CodeActAgent',
  confirmationMode: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      setSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'openhands-settings',
    }
  )
);
