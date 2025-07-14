import React from 'react';
import type { AgentStatus as AgentStatusType } from '../types';

interface AgentStatusProps {
  agents: AgentStatusType[];
  className?: string;
}

const AgentStatus: React.FC<AgentStatusProps> = ({ agents, className = '' }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return '🟢';
      case 'busy':
        return '🟡';
      case 'offline':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getAgentIcon = (name: string) => {
    // Simple hash-based icon selection
    const hash = name.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const icons = ['👤', '🕵️', '🎭', '🎪', '🎨', '🎯', '🎲', '🎮'];
    return icons[Math.abs(hash) % icons.length];
  };

  const formatLastSeen = (timestamp: string) => {
    const now = new Date();
    const lastSeen = new Date(timestamp);
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const onlineAgents = agents.filter(agent => agent.status === 'online');
  const busyAgents = agents.filter(agent => agent.status === 'busy');
  const offlineAgents = agents.filter(agent => agent.status === 'offline');

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">🕵️</span>
          Agent Status
        </h2>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-400">{onlineAgents.length} Online</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-gray-400">{busyAgents.length} Busy</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-gray-400">{offlineAgents.length} Offline</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-pokemon-blue transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{getAgentIcon(agent.name)}</span>
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-gray-400">ID: {agent.id}</p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Status:</span>
                <span className="text-white font-medium">
                  {getStatusIcon(agent.status)} {agent.status}
                </span>
              </div>

              {agent.current_task && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Current Task:</span>
                  <span className="text-white font-mono text-xs bg-gray-700 px-2 py-1 rounded">
                    {agent.current_task}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Last Seen:</span>
                <span className="text-white text-xs">
                  {formatLastSeen(agent.last_seen)}
                </span>
              </div>

              {agent.location && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Location:</span>
                  <span className="text-white text-xs font-mono">
                    {agent.location.lat.toFixed(4)}, {agent.location.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Agent Type:</span>
                <span className="text-white">Rocket Agent</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🕵️</div>
          <p>No agents available</p>
        </div>
      )}
    </div>
  );
};

export default AgentStatus; 