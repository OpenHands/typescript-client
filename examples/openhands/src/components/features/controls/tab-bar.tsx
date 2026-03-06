import { cn } from '#/utils';

export type TabOption = 'chat' | 'code' | 'browser' | 'terminal';

interface TabBarProps {
  activeTab: TabOption;
  onTabChange: (tab: TabOption) => void;
}

const tabs: { id: TabOption; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'code', label: 'Code' },
  { id: 'browser', label: 'Browser' },
  { id: 'terminal', label: 'Terminal' },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-base-secondary rounded-lg">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-white/10 text-content'
              : 'text-basic hover:text-content hover:bg-white/5'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
