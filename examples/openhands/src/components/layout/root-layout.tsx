import { Outlet } from 'react-router-dom';
import { Sidebar } from '#/components/features/sidebar';
import { cn } from '#/utils';

export function RootLayout() {
  return (
    <div
      className={cn(
        'h-screen min-w-[320px] flex flex-col md:flex-row bg-base overflow-hidden',
        'p-0 md:p-3 md:pl-0'
      )}
    >
      <Sidebar />
      <div className="flex-1 h-[calc(100%-54px)] md:h-full overflow-hidden rounded-xl bg-base-secondary md:ml-0">
        <Outlet />
      </div>
    </div>
  );
}
