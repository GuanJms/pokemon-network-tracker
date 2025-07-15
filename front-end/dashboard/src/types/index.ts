// Queue statistics interface
export interface QueueStats {
  name: string;
  depth?: number;
  consumers: number;
  messages?: number; // total tasks in queue (new API)
  messages_ready?: number;
  messages_unacknowledged?: number;
  messages_total?: number;
  status: 'healthy' | 'warning' | 'critical';
}

// Agent status interface
export interface AgentStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy';
  current_task?: string;
  last_seen: string;
  location?: {
    lat: number;
    lng: number;
  };
  imageNum?: number; // Add imageNum for avatar selection
}

// Task event interface
export interface TaskEvent {
  id: string;
  type: 'dispatch' | 'success' | 'failure' | 'retry';
  agent_id: string;
  task_type: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: string;
  metadata?: Record<string, unknown>;
}

// System state interface
export interface SystemState {
  queues: QueueStats[];
  agents: AgentStatus[];
  recent_events: TaskEvent[];
  system_health: {
    overall: 'healthy' | 'warning' | 'critical';
    rabbitmq: 'healthy' | 'warning' | 'critical';
    websocket: 'connected' | 'disconnected';
  };
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'log' | 'event' | 'state_update' | 'agent_status';
  data: LogEntry | TaskEvent | SystemState | AgentStatus;
} 