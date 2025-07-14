import React from 'react';
import type { QueueStats as QueueStatsType } from '../types';

interface QueueStatsProps {
  queues: QueueStatsType[];
  className?: string;
}

const QueueStats: React.FC<QueueStatsProps> = ({ queues, className = '' }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">📊</span>
          Queue Statistics
        </h2>
        <div className="text-sm text-gray-400">
          {queues.length} queues monitored
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {queues.map((queue) => (
          <div
            key={queue.name}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-pokemon-blue transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white truncate">
                {queue.name}
              </h3>
              <div className={`w-3 h-3 rounded-full ${getStatusColor(queue.status)}`} />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Depth:</span>
                <span className="text-white font-mono">{queue.depth}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Ready:</span>
                <span className="text-white font-mono">{queue.messages_ready}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Unacked:</span>
                <span className="text-white font-mono">{queue.messages_unacknowledged}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total:</span>
                <span className="text-white font-mono">{queue.messages_total}</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Consumers:</span>
                <span className="text-white font-mono">{queue.consumers}</span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Status:</span>
                <span className="text-xs font-medium text-white">
                  {getStatusIcon(queue.status)} {queue.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {queues.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">📭</div>
          <p>No queues available</p>
        </div>
      )}
    </div>
  );
};

export default QueueStats; 