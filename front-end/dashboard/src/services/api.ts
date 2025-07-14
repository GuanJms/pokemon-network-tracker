import type { SystemState, QueueStats } from '../types';

class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = import.meta.env.VITE_API_BASE || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Some endpoints (e.g., /reset/agents) may return 204 No Content or an empty body even with JSON content type.
      if (response.status === 204 || response.status === 205) {
        // No content
        return undefined as unknown as T;
      }

      const contentType = response.headers.get('content-type');
      const text = await response.text();

      if (!text) {
        return undefined as unknown as T;
      }

      if (contentType && contentType.includes('application/json')) {
        return JSON.parse(text) as T;
      }

      // Non-JSON plain text response
      return text as unknown as T;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async getSystemState(): Promise<SystemState> {
    return this.request<SystemState>('/state');
  }

  async getQueueStats(): Promise<QueueStats> {
    return this.request<QueueStats>('/state/queue', {
      method: 'POST',
      body: JSON.stringify({ name: 'pokemon_tasks' }),
    });
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    return this.request<{ status: string; timestamp: string }>('/health');
  }

  async getMetrics(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/metrics');
  }

  async getDLQCount(): Promise<number> {
    const res = await this.request<{ count: number }>('/state/dead-message');
    return typeof res === 'number' ? res : (res?.count ?? 0);
  }

  async getLiveUserCount(): Promise<number> {
    const res = await this.request<{ count: number }>('/state/hub/active');
    return typeof res === 'number' ? res : (res?.count ?? 0);
  }

  async getAgentsState(): Promise<Array<{ id: number; name: string }>> {
    const res = await this.request<unknown>('/state/agents');
    return Array.isArray(res) ? res : [];
  }

  async getSightings(): Promise<Array<{ id: string; pokemon: string; location: string; element: string }>> {
    return this.request('/sighting');
  }

  // Reset entire backend system (agents + DLQ counter)
  async resetSystem(): Promise<void> {
    await this.request<unknown>('/reset/system');
  }

  // Method to set base URL (useful for development/production switching)
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export default ApiService; 