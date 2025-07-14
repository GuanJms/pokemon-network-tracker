import React from 'react';

interface SystemHealthProps {
  health: {
    overall: 'healthy' | 'warning' | 'critical';
    rabbitmq: 'healthy' | 'warning' | 'critical';
    websocket: 'connected' | 'disconnected';
  };
  className?: string;
}

const SystemHealth: React.FC<SystemHealthProps> = ({ health, className = '' }) => {
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
      case 'disconnected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '🟢';
      case 'warning':
        return '🟡';
      case 'critical':
      case 'disconnected':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getHealthText = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'All Systems Operational';
      case 'warning':
        return 'Minor Issues Detected';
      case 'critical':
        return 'Critical Issues Detected';
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center">
          <span className="mr-2">🏥</span>
          System Health
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getHealthColor(health.overall)} text-white`}>
          {getHealthIcon(health.overall)} {health.overall.toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Health */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">Overall</h3>
            <div className={`w-3 h-3 rounded-full ${getHealthColor(health.overall)}`} />
          </div>
          <div className="text-sm text-gray-400">
            {getHealthText(health.overall)}
          </div>
        </div>

        {/* RabbitMQ Health */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">RabbitMQ</h3>
            <div className={`w-3 h-3 rounded-full ${getHealthColor(health.rabbitmq)}`} />
          </div>
          <div className="text-sm text-gray-400">
            {getHealthText(health.rabbitmq)}
          </div>
        </div>

        {/* WebSocket Connection */}
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-white">WebSocket</h3>
            <div className={`w-3 h-3 rounded-full ${getHealthColor(health.websocket)}`} />
          </div>
          <div className="text-sm text-gray-400">
            {getHealthText(health.websocket)}
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="text-sm font-semibold text-white mb-2">Status Summary</h4>
        <div className="space-y-1 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>System Status:</span>
            <span className={`${getHealthColor(health.overall)} px-2 py-1 rounded text-white`}>
              {health.overall.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Message Queue:</span>
            <span className={`${getHealthColor(health.rabbitmq)} px-2 py-1 rounded text-white`}>
              {health.rabbitmq.toUpperCase()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Real-time Connection:</span>
            <span className={`${getHealthColor(health.websocket)} px-2 py-1 rounded text-white`}>
              {health.websocket.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth; 