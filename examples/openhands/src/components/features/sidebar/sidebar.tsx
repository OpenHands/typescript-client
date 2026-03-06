import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiPlus, FiList, FiSettings, FiUser } from 'react-icons/fi';
import { cn } from '#/utils';
import { ConversationPanel } from '../conversation/conversation-panel';
import { SettingsModal } from '../settings/settings-modal';
import OpenHandsLogo from '#/assets/branding/openhands-logo.svg?react';

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [conversationPanelOpen, setConversationPanelOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const isHome = pathname === '/';

  return (
    <>
      <aside
        aria-label="Navigation"
        className={cn(
          'h-[54px] p-3 md:p-0 md:h-auto flex flex-row md:flex-col gap-1 bg-base md:w-[75px] md:min-w-[75px]',
          'sm:pt-0 sm:px-2 md:pt-[14px] md:px-0',
          isHome && 'md:pt-6.5 md:pb-3'
        )}
      >
        <nav className="flex flex-row md:flex-col items-center justify-between w-full h-auto md:w-auto md:h-full">
          <div className="flex flex-row md:flex-col items-center gap-[26px]">
            {/* Logo */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="OpenHands Home"
              title="OpenHands"
            >
              <OpenHandsLogo width={46} height={30} />
            </button>

            {/* New Project */}
            <button
              onClick={() => navigate('/')}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                'hover:bg-white/10 text-content'
              )}
              aria-label="New Project"
              title="New Project"
            >
              <FiPlus className="w-5 h-5" />
            </button>

            {/* Conversation List */}
            <button
              onClick={() => setConversationPanelOpen(!conversationPanelOpen)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                'hover:bg-white/10 text-content',
                conversationPanelOpen && 'bg-white/10'
              )}
              aria-label="Conversations"
              title="Conversations"
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-row md:flex-col items-center gap-[26px]">
            {/* Settings */}
            <button
              onClick={() => setSettingsModalOpen(true)}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                'hover:bg-white/10 text-content'
              )}
              aria-label="Settings"
              title="Settings"
            >
              <FiSettings className="w-5 h-5" />
            </button>

            {/* User */}
            <button
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-tertiary text-content'
              )}
              aria-label="User"
              title="User"
            >
              <FiUser className="w-5 h-5" />
            </button>
          </div>
        </nav>

        {conversationPanelOpen && (
          <ConversationPanel onClose={() => setConversationPanelOpen(false)} />
        )}
      </aside>

      {settingsModalOpen && (
        <SettingsModal onClose={() => setSettingsModalOpen(false)} />
      )}
    </>
  );
}
