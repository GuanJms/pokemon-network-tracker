import React, { useState, useRef, useEffect } from 'react';
import type { LogEntry } from '../types';

interface LogStreamProps {
  logs: LogEntry[];
  maxLogs?: number;
  className?: string;
}

const LogStream: React.FC<LogStreamProps> = ({ 
  logs, 
  maxLogs = 100, 
  className = '' 
}) => {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-400 bg-red-900/20';
      case 'warn':
        return 'text-yellow-400 bg-yellow-900/20';
      case 'info':
        return 'text-blue-400 bg-blue-900/20';
      case 'debug':
        return 'text-gray-400 bg-gray-900/20';
      default:
        return 'text-gray-300 bg-gray-900/20';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  };

  const filteredLogs = logs
    .filter(log => filterLevel === 'all' || log.level === filterLevel)
    .filter(log => 
      searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .slice(-maxLogs);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">📋</span>
          Live Log Stream
        </h2>
        <div className="flex items-center space-x-2">
          <label className="flex items-center text-sm text-gray-400">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="mr-2"
            />
            Auto-scroll
          </label>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Level:</span>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-700"
          >
            <option value="all">All</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Search:</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search logs..."
            className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-700 w-48"
          />
        </div>

        <div className="text-sm text-gray-400">
          {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* Log Container */}
      <div
        ref={logContainerRef}
        className="bg-gray-800 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📭</div>
            <p>No logs to display</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-2 rounded border-l-4 border-gray-700 hover:bg-gray-700/50 transition-colors ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-xs opacity-75">
                      {getLevelIcon(log.level)}
                    </span>
                    <span className="text-xs opacity-75">
                      {formatTimestamp(log.timestamp)}
                    </span>
                    <span className="text-xs opacity-75">
                      [{log.source}]
                    </span>
                  </div>
                  <span className="text-xs opacity-75 uppercase">
                    {log.level}
                  </span>
                </div>
                <div className="mt-1 text-white break-words">
                  {log.message}
                </div>
                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-400 cursor-pointer">
                      Metadata
                    </summary>
                    <pre className="text-xs text-gray-400 mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogStream; 