import { useState } from 'react';
import { FiX, FiSave } from 'react-icons/fi';
import { cn } from '#/utils';
import { useSettingsStore } from '#/stores';
import toast from 'react-hot-toast';

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, setSettings } = useSettingsStore();
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = () => {
    setSettings(localSettings);
    toast.success('Settings saved');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-base-secondary rounded-xl border border-neutral-700',
          'w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-700">
          <h2 className="text-lg font-semibold text-content">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-content"
            aria-label="Close"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Agent Server URL */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              Agent Server URL
            </label>
            <input
              type="text"
              value={localSettings.agentServerUrl}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, agentServerUrl: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-base border border-neutral-600',
                'text-content placeholder-basic',
                'focus:outline-none focus:border-primary'
              )}
              placeholder="http://localhost:8000"
            />
          </div>

          {/* LLM Model */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              LLM Model
            </label>
            <input
              type="text"
              value={localSettings.llmModel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, llmModel: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-base border border-neutral-600',
                'text-content placeholder-basic',
                'focus:outline-none focus:border-primary'
              )}
              placeholder="anthropic/claude-sonnet-4-20250514"
            />
          </div>

          {/* LLM API Key */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              LLM API Key
            </label>
            <input
              type="password"
              value={localSettings.llmApiKey}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, llmApiKey: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-base border border-neutral-600',
                'text-content placeholder-basic',
                'focus:outline-none focus:border-primary'
              )}
              placeholder="Enter your API key"
            />
          </div>

          {/* Agent */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">
              Agent
            </label>
            <select
              value={localSettings.agent}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, agent: e.target.value })
              }
              className={cn(
                'w-full px-3 py-2 rounded-lg',
                'bg-base border border-neutral-600',
                'text-content',
                'focus:outline-none focus:border-primary'
              )}
            >
              <option value="CodeActAgent">CodeActAgent</option>
              <option value="BrowsingAgent">BrowsingAgent</option>
            </select>
          </div>

          {/* Confirmation Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-content">
                Confirmation Mode
              </label>
              <p className="text-xs text-basic mt-1">
                Require confirmation before executing actions
              </p>
            </div>
            <button
              onClick={() =>
                setLocalSettings({
                  ...localSettings,
                  confirmationMode: !localSettings.confirmationMode,
                })
              }
              className={cn(
                'relative w-11 h-6 rounded-full transition-colors',
                localSettings.confirmationMode ? 'bg-primary' : 'bg-tertiary'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform',
                  localSettings.confirmationMode && 'translate-x-5'
                )}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-neutral-700">
          <button
            onClick={onClose}
            className={cn(
              'px-4 py-2 rounded-lg',
              'bg-tertiary hover:bg-tertiary/80',
              'text-content transition-colors'
            )}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2',
              'bg-primary hover:bg-primary/80',
              'text-base font-medium transition-colors'
            )}
          >
            <FiSave className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
