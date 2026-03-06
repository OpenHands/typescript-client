import { memo } from 'react';
import { FiUser, FiCpu, FiTerminal, FiFile, FiAlertCircle } from 'react-icons/fi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '#/utils';
import type { Event } from '@openhands/client';

interface ChatMessageProps {
  event: Event;
}

function getEventIcon(event: Event) {
  const source = event.source;
  switch (source) {
    case 'user':
      return <FiUser className="w-5 h-5" />;
    case 'agent':
      return <FiCpu className="w-5 h-5" />;
    default:
      if (event.type?.includes('cmd') || event.type?.includes('command')) {
        return <FiTerminal className="w-5 h-5" />;
      }
      if (event.type?.includes('file') || event.type?.includes('read') || event.type?.includes('write')) {
        return <FiFile className="w-5 h-5" />;
      }
      if (event.type?.includes('error')) {
        return <FiAlertCircle className="w-5 h-5" />;
      }
      return <FiCpu className="w-5 h-5" />;
  }
}

function getEventContent(event: Event): string {
  const payload = event.payload as Record<string, unknown>;

  // User message
  if (event.source === 'user' && event.type === 'message') {
    return (payload.content as string) || '';
  }

  // Agent message/thought
  if (event.type === 'message' || event.type === 'thought') {
    return (payload.content as string) || (payload.thought as string) || '';
  }

  // Command action
  if (event.type === 'run' || event.type === 'run_ipython') {
    return `\`\`\`bash\n${payload.command || payload.code}\n\`\`\``;
  }

  // Command observation
  if (event.type === 'run_observation' || event.type === 'cmd_output') {
    const output = (payload.content as string) || (payload.output as string) || '';
    return `\`\`\`\n${output}\n\`\`\``;
  }

  // File read
  if (event.type === 'read') {
    return `Reading file: ${payload.path}`;
  }

  // File write
  if (event.type === 'write') {
    return `Writing to file: ${payload.path}`;
  }

  // Browse
  if (event.type === 'browse') {
    return `Browsing: ${payload.url}`;
  }

  // Error
  if (event.type === 'error') {
    return `Error: ${payload.message || payload.content || 'Unknown error'}`;
  }

  // Finish
  if (event.type === 'finish') {
    return `Task completed: ${payload.thought || payload.message || 'Done'}`;
  }

  // Default: try to extract content
  return (payload.content as string) || (payload.message as string) || JSON.stringify(payload, null, 2);
}

function ChatMessageComponent({ event }: ChatMessageProps) {
  const isUser = event.source === 'user';
  const content = getEventContent(event);
  const icon = getEventIcon(event);

  // Skip empty messages
  if (!content || content === '{}') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-3 p-3 rounded-lg',
        isUser ? 'bg-white/5' : 'bg-transparent'
      )}
    >
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary text-base' : 'bg-tertiary text-content'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-xs text-basic mb-1 capitalize">
          {event.source || event.type}
        </div>
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ className, children, ...props }) => {
                const isInline = !className;
                if (isInline) {
                  return (
                    <code
                      className="bg-base px-1.5 py-0.5 rounded text-primary text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  );
                }
                return (
                  <pre className="bg-base p-3 rounded-lg overflow-x-auto">
                    <code className="text-sm text-content" {...props}>
                      {children}
                    </code>
                  </pre>
                );
              },
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

export const ChatMessage = memo(ChatMessageComponent);
