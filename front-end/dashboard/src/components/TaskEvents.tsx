import React, { useState } from 'react';
import type { TaskEvent } from '../types';

interface TaskEventsProps {
  events: TaskEvent[];
  maxEvents?: number;
  className?: string;
}

const TaskEvents: React.FC<TaskEventsProps> = ({ 
  events, 
  maxEvents = 50, 
  className = '' 
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'dispatch':
        return '🚀';
      case 'success':
        return '✅';
      case 'failure':
        return '❌';
      case 'retry':
        return '🔄';
      default:
        return '📋';
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'dispatch':
        return 'border-blue-500 bg-blue-900/20';
      case 'success':
        return 'border-green-500 bg-green-900/20';
      case 'failure':
        return 'border-red-500 bg-red-900/20';
      case 'retry':
        return 'border-yellow-500 bg-yellow-900/20';
      default:
        return 'border-gray-500 bg-gray-900/20';
    }
  };

  const getEventTextColor = (type: string) => {
    switch (type) {
      case 'dispatch':
        return 'text-blue-400';
      case 'success':
        return 'text-green-400';
      case 'failure':
        return 'text-red-400';
      case 'retry':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const eventTime = new Date(timestamp);
    const diffMs = now.getTime() - eventTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const uniqueAgents = [...new Set(events.map(event => event.agent_id))];

  const filteredEvents = events
    .filter(event => filterType === 'all' || event.type === filterType)
    .filter(event => filterAgent === 'all' || event.agent_id === filterAgent)
    .slice(-maxEvents);

  const eventCounts = events.reduce((acc, event) => {
    acc[event.type] = (acc[event.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">📋</span>
          Task Events
        </h2>
        <div className="text-sm text-gray-400">
          {filteredEvents.length} of {events.length} events
        </div>
      </div>

      {/* Event Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">🚀</div>
          <div className="text-white font-bold">{eventCounts.dispatch || 0}</div>
          <div className="text-xs text-gray-400">Dispatched</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">✅</div>
          <div className="text-white font-bold">{eventCounts.success || 0}</div>
          <div className="text-xs text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">❌</div>
          <div className="text-white font-bold">{eventCounts.failure || 0}</div>
          <div className="text-xs text-gray-400">Failed</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-3 text-center">
          <div className="text-2xl mb-1">🔄</div>
          <div className="text-white font-bold">{eventCounts.retry || 0}</div>
          <div className="text-xs text-gray-400">Retries</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Type:</span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-700"
          >
            <option value="all">All Types</option>
            <option value="dispatch">Dispatch</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
            <option value="retry">Retry</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-400">Agent:</span>
          <select
            value={filterAgent}
            onChange={(e) => setFilterAgent(e.target.value)}
            className="bg-gray-800 text-white text-sm rounded px-3 py-1 border border-gray-700"
          >
            <option value="all">All Agents</option>
            {uniqueAgents.map(agentId => (
              <option key={agentId} value={agentId}>
                {agentId}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-2xl mb-2">📭</div>
            <p>No events to display</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border-l-4 ${getEventColor(event.type)} hover:bg-gray-800/50 transition-colors`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-xl">{getEventIcon(event.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`font-semibold ${getEventTextColor(event.type)}`}>
                        {event.type.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-400">
                        {event.task_type}
                      </span>
                    </div>
                    <div className="text-sm text-white">
                      Agent: <span className="font-mono">{event.agent_id}</span>
                    </div>
                    {event.details && (
                      <div className="text-xs text-gray-400 mt-1">
                        {JSON.stringify(event.details)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">
                    {formatTimestamp(event.timestamp)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeAgo(event.timestamp)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskEvents; 