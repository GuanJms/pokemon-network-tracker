import React, { useEffect, useState, useRef } from 'react';
import PixelPanel from './PixelPanel';
import PixelControlPanel from './PixelControlPanel';
// Sightings panel removed
import RocketAgentsPanel from './RocketAgentsPanel';
import WebSocketService from '../services/websocket';
import ApiService from '../services/api';
import type { SystemState, LogEntry, TaskEvent, AgentStatus as AgentStatusType } from '../types';
import TerminalLog from './TerminalLog';
import ToastNotification from './ToastNotification';

// Priority: window config > env var > default
const WS_URL = window.__APP_CONFIG__?.wsUrl || 
  (import.meta.env.VITE_WS_URL as string) || 
  'ws://localhost:3000/state/events';
const apiService = new ApiService();

interface Sighting {
  id: string;
  pokemon: string;
  location: string;
  element: string;
}

const Dashboard: React.FC = () => {
  // State
  const [systemState, setSystemState] = useState<SystemState>(() => {
    const saved = sessionStorage.getItem('systemState');
    return saved
      ? (JSON.parse(saved) as SystemState)
      : {
          queues: [],
          agents: [],
          recent_events: [],
          system_health: {
            overall: 'critical',
            rabbitmq: 'critical',
            websocket: 'disconnected',
          },
        };
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = sessionStorage.getItem('logs');
    return saved ? (JSON.parse(saved) as LogEntry[]) : [];
  });
  const [escapeCount, setEscapeCount] = useState<number>(0);
  // Sightings panel removed
  const [currentDispatch, setCurrentDispatch] = useState<Sighting | null>(() => {
    const saved = sessionStorage.getItem('currentDispatch');
    return saved ? (JSON.parse(saved) as Sighting) : null;
  });

  // Update agentsState type to always include imageNum
  interface AgentState {
    id: number;
    name: string;
    imageNum?: number;
    lastLog?: string;
    task?: {pokemon:string; location:string; status:'processing'|'started'|'captured'|'failed'; element?:string};
  }
  const [agentsState, setAgentsState] = useState<AgentState[]>(() => {
    const saved = sessionStorage.getItem('agentsState');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // Poll backend for authoritative agent list every 5s
  useEffect(()=>{
    const syncAgents = () => {
      apiService.getAgentsState().then(list => {
        if(!Array.isArray(list)) return;
        console.log('Fetched agents from backend:', list);
        setAgentsState(
          list.map((a: unknown) => {
            const agent = a as Partial<AgentState>;
            const imageNum = typeof agent.imageNum === 'number' ? agent.imageNum : 0;
            return {
              ...agent,
              imageNum,
            } as AgentState;
          })
        );
      }).catch(()=>{});
    };
    syncAgents();
    const interval = setInterval(syncAgents,5000);
    return ()=> clearInterval(interval);
  },[]);
  const [toasts, setToasts] = useState<{id:string; message:string}[]>([]);
  const [liveCount, setLiveCount] = useState<number>(0);
  const wsRef = useRef<WebSocketService | null>(null);

  // Add Pokémon handler
  const handleAddPokemon = (pokemon: { name: string; location: string; element: string }) => {
    pushToast(`📝 Added ${pokemon.name} sighting at ${pokemon.location}`);
    // POST to backend
    fetch(`${apiService.getBaseUrl()}/sighting`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pokemon: pokemon.name, location: pokemon.location, element: pokemon.element }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .catch(() => pushToast('Failed to add sighting!'));
    // update dispatch center immediately
    setCurrentDispatch({ id: crypto.randomUUID(), pokemon: pokemon.name, location: pokemon.location, element: pokemon.element });
    // toast auto-dismiss handles.
  };

  // Add Agent handler
  const handleAddAgent = (agent: { name: string; avatar: string; imageNum: number }) => {
    pushToast(`📝 Spawned agent ${agent.name}`);
    // POST to backend; backend assigns ID
    fetch(`${apiService.getBaseUrl()}/spawn/rocket-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: agent.name, imageNum: agent.imageNum }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .catch(() => pushToast('Failed to add agent!'));
    // toast auto-dismiss handles.
  };

  const pushToast = (message: string) => {
    const id = crypto.randomUUID();
    setToasts((t) => [...t.slice(-3), { id, message }]);
  };

  // Reset handler clears all local state and sessionStorage
  const handleReset = () => {
    sessionStorage.clear();
    setSystemState({
      queues: [],
      agents: [],
      recent_events: [],
      system_health: {
        overall: 'critical',
        rabbitmq: 'critical',
        websocket: systemState.system_health.websocket,
      },
    });
    // Immediately reflect cleared queue/agent counts in UI
    setSystemState((prev)=>({
      ...prev,
      queues:[{name:'pokemon_tasks', messages:0, consumers:0, status:'healthy'}]
    }));
    setLogs([]);
    setCurrentDispatch(null);
    setAgentsState([]);
    apiService.resetSystem().then(()=>{
      // Refresh queue stats from backend so monitor stays accurate
      apiService.getQueueStats().then((qs)=>{
        setSystemState((prev)=>({...prev, queues:[qs]}));
      }).catch(()=>{});
      // Immediately fetch DLQ count so Escape Zone is up to date
      apiService.getDLQCount().then(count => setEscapeCount(count)).catch(()=>{});
      pushToast('System reset');
    }).catch(()=>{
      pushToast('Failed to reset backend');
    });
  };

  // Sightings fetch removed

  // WebSocket and REST integration (unchanged)
  useEffect(() => {
    let ws: WebSocketService;
    // establish websocket
    const connect = async () => {
      try {
        ws = new WebSocketService(WS_URL);
        wsRef.current = ws;
        await ws.connect();
        setSystemState((prev) => ({ ...prev, system_health: { ...prev.system_health, websocket: 'connected' } }));
        ws.subscribe('log', (data: LogEntry) => {
          setLogs((prev) => [...prev, data].slice(-1000));

          // Sighting spawn => dispatch
          const spawnMatch = data.message.match(/Spawned\s+(\w+)\s+pokemon:\s+(\w+)\s+at\s+(.+)\s+with/);
          if (spawnMatch) {
            const [, element, pokemonName, location] = spawnMatch;
            setCurrentDispatch({ id: crypto.randomUUID(), pokemon: pokemonName, location, element });
          }

          // Agent log update
          const agentMatch = data.message.match(/\[(\d+) ID \| ([^\]]+)\] (.+)/);
          if (agentMatch) {
            const agentId = parseInt(agentMatch[1], 10);
            const logMsg = agentMatch[3];
            setAgentsState((prev) => prev.map((a) => (a.id === agentId ? { ...a, lastLog: logMsg } : a)));
          }

          // Headquarter dispatch arrow trigger
          if (data.message.includes('Dispatch capture task')) {
            // triggerArrow('dispatch'); // Removed
          }

          // Pokemon escape -> Escape Zone arrow trigger and counter
          if ((data.message.includes('Missed opportunity') || data.message.includes('escaped'))) {
            // triggerArrow('dlq'); // Removed
            apiService.getDLQCount().then(count => setEscapeCount(count)).catch(()=>{});
          }

            // Task processing
            const processingMatch = data.message.match(/Agent processing task: (\w+) at (.+)/);
            if (agentMatch && processingMatch) {
              const agentId = parseInt(agentMatch[1],10);
              const pokemon = processingMatch[1];
              const location = processingMatch[2];
              setAgentsState((prev)=>prev.map(a=>a.id===agentId?{...a,task:{pokemon,location,status:'processing'}}:a));
              setCurrentDispatch(null);
            }

            // Task captured
            const capturedMatch = data.message.match(/Agent captured (\w+) at (.+) \[(\w+)\]!/);
            if (agentMatch && capturedMatch) {
              const agentId=parseInt(agentMatch[1],10);
              const pokemon=capturedMatch[1];
              const location=capturedMatch[2];
              const elem=capturedMatch[3];
              setAgentsState((prev)=>prev.map(a=>a.id===agentId?{...a,task:{pokemon,location,status:'captured',element:elem}}:a));
              pushToast(`✅ ${pokemon} captured at ${location}!`);
            }

            // Task failed
            const failedMatch = data.message.match(/Agent failed task: (\w+) at (.+)/);
            if (agentMatch && failedMatch) {
              const agentId = parseInt(agentMatch[1],10);
              const pokemon = failedMatch[1];
              const location = failedMatch[2];
              setAgentsState((prev)=>prev.map(a=>a.id===agentId?{...a,task:{pokemon,location,status:'failed'}}:a));
              pushToast(`❌ ${pokemon} escaped at ${location}`);
            }

            // Clear sprite after capture or failure
            if ((capturedMatch || failedMatch) && agentMatch) {
              const agentIdClear = parseInt(agentMatch[1],10);
              setTimeout(()=>{
                setAgentsState(prev=>prev.map(a=>a.id===agentIdClear?{...a, task:undefined}:a));
              }, 3000);
            }
        });
        ws.subscribe('event', (data: TaskEvent) => {
          setSystemState((prev) => ({
            ...prev,
            recent_events: [...prev.recent_events, data].slice(-100),
          }));
          // if (data.type === 'dispatch') triggerArrow('dispatch'); // Removed
          // if (data.type === 'failure' || data.type === 'retry') triggerArrow('dlq'); // Removed
        });
        ws.subscribe('state_update', (data: SystemState) => {
          setSystemState(data);
        });
        ws.subscribe('agent_status', (data: AgentStatusType) => {
          setSystemState((prev) => ({
            ...prev,
            agents: prev.agents.map((a) => (a.id === data.id ? data : a)),
          }));
        });
      } catch {
        setSystemState((prev) => ({ ...prev, system_health: { ...prev.system_health, websocket: 'disconnected' } }));
      }
    };
    connect();

    // removed stale getSystemState call

    return () => {
      wsRef.current?.disconnect();
    };
  }, []);

  // Poll queue stats every 2 seconds to keep Task Queue Monitor fresh
  useEffect(() => {
    const interval = setInterval(() => {
      apiService.getQueueStats()
        .then((qs) => {
          setSystemState((prev)=>({...prev, queues: [qs]}));
        })
        .catch(()=>{});
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Demo/mock fallback for local dev (unchanged)
  useEffect(() => {
    if (systemState.queues.length === 0) {
      setSystemState({
        queues: [{ name: 'pokemon_tasks', depth: 1, consumers: 1, messages: 1, status: 'healthy' }],
        agents: [{ id: '2', name: 'Rocket Agent', status: 'busy', current_task: 'Capturing Charmander', last_seen: new Date().toISOString() }],
        recent_events: [],
        system_health: { overall: 'healthy', rabbitmq: 'healthy', websocket: 'connected' },
      });
    }
  }, [systemState.queues.length]);

  // Persist state slices to sessionStorage on change
  useEffect(() => {
    sessionStorage.setItem('systemState', JSON.stringify(systemState));
  }, [systemState]);

  useEffect(() => {
    sessionStorage.setItem('logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    sessionStorage.setItem('currentDispatch', JSON.stringify(currentDispatch));
  }, [currentDispatch]);

  useEffect(() => {
    sessionStorage.setItem('agentsState', JSON.stringify(agentsState));
  }, [agentsState]);

  // Fetch initial escape count on mount
  useEffect(() => {
    apiService.getDLQCount().then(count => setEscapeCount(count)).catch(()=>{});
    // Fetch live count
    const fetchLiveCount = () => apiService.getLiveUserCount().then(count => setLiveCount(count)).catch(()=>{});
    fetchLiveCount();
    const liveCountInterval = setInterval(fetchLiveCount, 5000);
    return () => clearInterval(liveCountInterval);
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      const connected = wsRef.current?.isConnected() ?? false;
      setSystemState(prev => ({
        ...prev,
        system_health: { ...prev.system_health, websocket: connected ? 'connected' : 'disconnected' },
      }));
    }, 2000);
    return () => clearInterval(heartbeat);
  }, []);

  // System health status calculation
  const getSystemHealthStatus = () => {
    const wsConnected = systemState.system_health?.websocket === 'connected';
    const hasAgents = agentsState.length > 0;
    const hasActiveTasks = (systemState.queues[0]?.messages ?? 0) > 0;
    
    if (wsConnected && hasAgents && hasActiveTasks) return { status: 'healthy', color: 'text-green-400', icon: '●' };
    if (wsConnected && hasAgents) return { status: 'idle', color: 'text-yellow-400', icon: '◐' };
    if (wsConnected) return { status: 'degraded', color: 'text-orange-400', icon: '◑' };
    return { status: 'critical', color: 'text-red-400', icon: '○' };
  };

  const systemHealth = getSystemHealthStatus();

  return (
    <div className="min-h-screen bg-pixel-dark p-4" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      {/* Hero Status Bar */}
      <div className="bg-pixel-gray border-4 border-pixel-border mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className={`${systemHealth.color} text-lg`}>{systemHealth.icon}</span>
              <span className="text-white">System: {systemHealth.status.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pixel-green">●</span>
              <span className="text-white">Live Users: {liveCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pixel-orange">⚡</span>
              <span className="text-white">Active Tasks: {systemState.queues[0]?.messages ?? 0}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-pixel-red">💀</span>
              <span className="text-white">Escaped: {escapeCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-pixel-blue">🤖</span>
            <span className="text-white">Agents: {agentsState.length}</span>
          </div>
        </div>
      </div>

      {/* Three-Column Layout for Desktop, Stacked for Mobile */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-7xl mx-auto">
         
        {/* Control Panel - Left Column on Desktop, Top on Mobile */}
        <div className="xl:col-span-3">
          <div className="sticky top-4">
            <PixelControlPanel onAddPokemon={handleAddPokemon} onAddAgent={handleAddAgent} onReset={handleReset} />
          </div>
        </div>
        
        {/* Main Dashboard Area - Center Column */}
        <div className="xl:col-span-6">
          {/* Primary Dashboard Content */}
          <div className="space-y-6">
            {/* Dispatch Center - Hero Panel */}
            <div className="h-72">
              <PixelPanel title="Dispatch Center" color="green" headerIcon={null}>
                <div className="h-full flex items-center justify-center">
                  {currentDispatch ? (
                    <div className="flex flex-col items-center">
                      <div className="relative">
                        <img 
                          src={`/assets/pixel/${currentDispatch.pokemon.toLowerCase()}.png`} 
                          alt={currentDispatch.pokemon} 
                          className="mb-4" 
                          style={{ imageRendering: 'pixelated', width: 96, height: 96 }} 
                        />
                        <div className="absolute -top-2 -right-2 w-4 h-4 bg-pixel-green rounded-full animate-pulse"></div>
                      </div>
                      <div className="text-center text-xl mb-2 text-pixel-yellow">{currentDispatch.pokemon}</div>
                      <div className="text-sm text-pixel-blue">{currentDispatch.location}</div>
                      <div className="text-xs text-green-400 mt-2">🎯 ACTIVE DISPATCH</div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="text-pixel-gray text-lg mb-2">⏳</div>
                      <div className="text-pixel-gray text-sm">Awaiting dispatch...</div>
                    </div>
                  )}
                </div>
              </PixelPanel>
            </div>
             
            {/* Rocket Agents - Primary Content */}
            <div className="h-96">
              <PixelPanel title="Rocket Agents Command" color="blue" headerIcon={null}>
                <RocketAgentsPanel agents={agentsState} />
              </PixelPanel>
            </div>
          </div>
        </div>
        
        {/* Quick Stats Panel - Right Column on Desktop */}
        <div className="xl:col-span-3">
          <div className="space-y-4">
            {/* Task Queue Monitor */}
            <div className="h-48">
              <PixelPanel title="Queue Monitor" color="orange" headerIcon={null}>
                <div className="space-y-3">
                  <div className="bg-pixel-dark p-2 rounded border border-pixel-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-pixel-green">pokemon_tasks</span>
                      <span className="text-xs text-white font-bold">{systemState.queues[0]?.messages ?? 0}</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-pixel-orange">⚡ Pending</span>
                      <span className="text-white">{systemState.queues[0]?.messages ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pixel-blue">🤖 Workers</span>
                      <span className="text-white">{systemState.queues[0]?.consumers ?? 0}</span>
                    </div>
                  </div>
                </div>
              </PixelPanel>
            </div>
            
            {/* Escape Zone */}
            <div className="h-48">
              <PixelPanel title="Escape Zone" color="red" headerIcon={null}>
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="relative mb-4">
                    <img 
                      src="/assets/pixel/grave.svg" 
                      alt="Grave" 
                      style={{ imageRendering: 'pixelated', width: 48, height: 48 }} 
                    />
                    {escapeCount > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
                        {escapeCount}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <img 
                      src="/assets/pixel/pokeball.png" 
                      alt="Pokeball" 
                      style={{ imageRendering: 'pixelated', width: 20, height: 20 }} 
                    />
                    <span className="text-lg text-red-400">×{escapeCount}</span>
                  </div>
                  <div className="text-xs text-pixel-gray mt-2">ESCAPED</div>
                </div>
              </PixelPanel>
            </div>
             
            {/* WebSocket Status */}
            <div className="h-32">
              <PixelPanel title="Connection" color="gray" headerIcon={null}>
                <div className="h-full flex flex-col items-center justify-center">
                  <div className={`text-2xl mb-2 ${
                    systemState.system_health?.websocket === 'connected' 
                      ? 'text-green-400' 
                      : 'text-red-400'
                  }`}>
                    {systemState.system_health?.websocket === 'connected' ? '🟢' : '🔴'}
                  </div>
                  <div className="text-xs text-center">
                    {systemState.system_health?.websocket === 'connected' ? 'ONLINE' : 'OFFLINE'}
                  </div>
                </div>
              </PixelPanel>
            </div>
          </div>
        </div>
      </div>
      
      {/* System Log - Full Width Below */}
      <div className="mt-6 max-w-7xl mx-auto">
        <div className="h-96">
          <PixelPanel title="System Log" color="gray" headerIcon={null}>
            <TerminalLog logs={logs} />
          </PixelPanel>
        </div>
      </div>

      {/* Toast notifications */}
      <ToastNotification toasts={toasts} onRemove={(id)=>setToasts((t)=>t.filter(x=>x.id!==id))} />
    </div>
  );
};

export default Dashboard; 