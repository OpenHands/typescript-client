import { HomeHeader, NewConversation } from '#/components/features/home';
import { FiPlus } from 'react-icons/fi';

function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-[280px] max-w-md bg-base-secondary rounded-xl p-5 border border-neutral-700">
      <div className="flex items-center gap-2 text-content-2 font-medium mb-3">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}

export function HomePage() {
  return (
    <div
      data-testid="home-screen"
      className="px-0 pt-4 bg-transparent h-full flex flex-col pt-[35px] overflow-y-auto rounded-xl lg:px-[42px] lg:pt-[42px] custom-scrollbar-always"
    >
      <HomeHeader />

      <div className="pt-6 flex justify-center">
        <div className="flex flex-col gap-5 px-6 sm:max-w-full sm:min-w-full md:flex-row lg:px-0 lg:max-w-[703px] lg:min-w-[703px]">
          <Card title="Start from scratch" icon={<FiPlus className="w-4 h-4" />}>
            <p className="text-basic text-sm mb-4">
              Begin a new project with AI assistance. Describe what you want to build.
            </p>
            <NewConversation />
          </Card>
        </div>
      </div>

      <div className="pt-8 flex justify-center">
        <div className="text-center text-basic text-sm space-y-2 px-6">
          <p>Powered by OpenHands Agent Server</p>
          <p className="text-xs opacity-60">
            Configure your agent server URL and LLM settings in the settings panel
          </p>
        </div>
      </div>
    </div>
  );
}
