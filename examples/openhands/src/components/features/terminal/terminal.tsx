import { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { cn } from '#/utils';
import { useEventStore } from '#/stores';
import type { Event } from '@openhands/client';

interface TerminalProps {
  className?: string;
}

export function Terminal({ className }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { events } = useEventStore();
  const [lastEventIndex, setLastEventIndex] = useState(0);

  // Initialize terminal
  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new XTerm({
      theme: {
        background: '#0d0f11',
        foreground: '#ecedee',
        cursor: '#c9b974',
        cursorAccent: '#0d0f11',
        selectionBackground: '#c9b97450',
        black: '#0d0f11',
        red: '#e76a5e',
        green: '#a5e75e',
        yellow: '#c9b974',
        blue: '#5e9ae7',
        magenta: '#c95eb5',
        cyan: '#5ec9c9',
        white: '#ecedee',
        brightBlack: '#454545',
        brightRed: '#e76a5e',
        brightGreen: '#a5e75e',
        brightYellow: '#c9b974',
        brightBlue: '#5e9ae7',
        brightMagenta: '#c95eb5',
        brightCyan: '#5ec9c9',
        brightWhite: '#f9fbfe',
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 13,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'block',
      scrollback: 10000,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = terminal;
    fitAddonRef.current = fitAddon;

    // Resize observer
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit();
    });
    resizeObserver.observe(terminalRef.current);

    // Welcome message
    terminal.writeln('\x1b[1;33m$ OpenHands Terminal\x1b[0m');
    terminal.writeln('');

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
    };
  }, []);

  // Process new events and write to terminal
  useEffect(() => {
    if (!xtermRef.current) return;

    const terminal = xtermRef.current;
    const newEvents = events.slice(lastEventIndex);

    newEvents.forEach((event: Event) => {
      const payload = event.payload as Record<string, unknown>;

      // Command execution
      if (event.type === 'run' || event.type === 'run_ipython') {
        const command = (payload.command as string) || (payload.code as string) || '';
        terminal.writeln(`\x1b[1;32m$ ${command}\x1b[0m`);
      }

      // Command output
      if (event.type === 'run_observation' || event.type === 'cmd_output') {
        const output = (payload.content as string) || (payload.output as string) || '';
        output.split('\n').forEach((line: string) => {
          terminal.writeln(line);
        });
        terminal.writeln('');
      }

      // Error output
      if (event.type === 'error') {
        const message = (payload.message as string) || (payload.content as string) || 'Unknown error';
        terminal.writeln(`\x1b[1;31mError: ${message}\x1b[0m`);
        terminal.writeln('');
      }
    });

    setLastEventIndex(events.length);
  }, [events, lastEventIndex]);

  return (
    <div className={cn('bg-base rounded-lg overflow-hidden', className)}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-700">
        <span className="text-sm font-medium text-content">Terminal</span>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
      </div>
      <div ref={terminalRef} className="h-[300px] p-2" />
    </div>
  );
}
