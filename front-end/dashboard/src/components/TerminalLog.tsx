import React, { useEffect, useRef } from 'react';
import type { LogEntry } from '../types';

interface Props {
  logs: LogEntry[];
  maxLines?: number;
}

const levelColor = (level: string) => {
  switch (level) {
    case 'error':
      return 'text-red-400';
    case 'warn':
      return 'text-yellow-400';
    case 'debug':
      return 'text-pixel-blue';
    default:
      return 'text-green-400';
  }
};

const TerminalLog: React.FC<Props> = ({ logs, maxLines = 200 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new log arrives
  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const visible = logs.slice(-maxLines);

  return (
    <div
      className="bg-black p-2 rounded overflow-y-auto font-mono text-[10px] leading-relaxed h-96 border-4 border-pixel-border w-full"
      style={{ scrollbarGutter: 'stable' }}
      ref={containerRef}
    >
      {visible.map((log) => (
        <div key={log.id} className={`${levelColor(log.level)} break-words whitespace-pre-wrap`}>
          <span className="text-pixel-gray">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
          {log.message}
        </div>
      ))}
      {/* bottom marker removed */}
    </div>
  );
};

export default TerminalLog; 