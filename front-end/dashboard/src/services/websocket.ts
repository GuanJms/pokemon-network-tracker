import type { WebSocketMessage, LogEntry, TaskEvent, SystemState, AgentStatus } from '../types';

// Polyfill for crypto.randomUUID for browser compatibility
if (typeof crypto !== 'undefined' && !crypto.randomUUID) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (crypto as any).randomUUID = function(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
}

type LogHandler = (data: LogEntry) => void;
type EventHandler = (data: TaskEvent) => void;
type StateHandler = (data: SystemState) => void;
type AgentHandler = (data: AgentStatus) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private logHandlers: LogHandler[] = [];
  private eventHandlers: EventHandler[] = [];
  private stateHandlers: StateHandler[] = [];
  private agentHandlers: AgentHandler[] = [];
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: WebSocketMessage) {
    // Support legacy backend format that sends {type:"system log", message:"...", time:"..."}
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('message' in (message as any)) {
      const simple = message as unknown as { type: string; message: string; time?: string };
      const levelMap: Record<string, 'info' | 'warn' | 'error' | 'debug'> = {
        'system log': 'info',
        'headquarter dispatch': 'warn',
        'pokemon escape': 'error',
        'agent log': 'debug',
      };

      if (simple.message) {
        const logEntry = {
          id: crypto.randomUUID(),
          timestamp: simple.time || new Date().toISOString(),
          level: levelMap[simple.type] ?? 'info',
          message: simple.message,
          source: 'backend',
        } as const;
        this.logHandlers.forEach((h) => h(logEntry));
      }
      // No further structured handling; logs are delivered to UI
      return;
    }

    switch (message.type) {
      case 'log':
        this.logHandlers.forEach(handler => {
          try {
            handler(message.data as LogEntry);
          } catch (error) {
            console.error('Error in log handler:', error);
          }
        });
        break;
      case 'event':
        this.eventHandlers.forEach(handler => {
          try {
            handler(message.data as TaskEvent);
          } catch (error) {
            console.error('Error in event handler:', error);
          }
        });
        break;
      case 'state_update':
        this.stateHandlers.forEach(handler => {
          try {
            handler(message.data as SystemState);
          } catch (error) {
            console.error('Error in state handler:', error);
          }
        });
        break;
      case 'agent_status':
        this.agentHandlers.forEach(handler => {
          try {
            handler(message.data as AgentStatus);
          } catch (error) {
            console.error('Error in agent handler:', error);
          }
        });
        break;
    }
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  subscribe(type: 'log', handler: LogHandler): () => void;
  subscribe(type: 'event', handler: EventHandler): () => void;
  subscribe(type: 'state_update', handler: StateHandler): () => void;
  subscribe(type: 'agent_status', handler: AgentHandler): () => void;
  subscribe(type: string, handler: LogHandler | EventHandler | StateHandler | AgentHandler): () => void {
    switch (type) {
      case 'log':
        this.logHandlers.push(handler as LogHandler);
        return () => {
          const index = this.logHandlers.indexOf(handler as LogHandler);
          if (index > -1) {
            this.logHandlers.splice(index, 1);
          }
        };
      case 'event':
        this.eventHandlers.push(handler as EventHandler);
        return () => {
          const index = this.eventHandlers.indexOf(handler as EventHandler);
          if (index > -1) {
            this.eventHandlers.splice(index, 1);
          }
        };
      case 'state_update':
        this.stateHandlers.push(handler as StateHandler);
        return () => {
          const index = this.stateHandlers.indexOf(handler as StateHandler);
          if (index > -1) {
            this.stateHandlers.splice(index, 1);
          }
        };
      case 'agent_status':
        this.agentHandlers.push(handler as AgentHandler);
        return () => {
          const index = this.agentHandlers.indexOf(handler as AgentHandler);
          if (index > -1) {
            this.agentHandlers.splice(index, 1);
          }
        };
      default:
        console.warn(`Unknown message type: ${type}`);
        return () => {};
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default WebSocketService; 