import React, { useEffect, useState, useRef } from 'react';
import PixelPanel from './PixelPanel';
import PixelArrow from './PixelArrow';
import PixelControlPanel from './PixelControlPanel';
// Sightings panel removed
import RocketAgentsPanel from './RocketAgentsPanel';
import WebSocketService from '../services/websocket';
import ApiService from '../services/api';
import type { SystemState, LogEntry, TaskEvent, AgentStatus as AgentStatusType } from '../types';
import TerminalLog from './TerminalLog';
import ToastNotification from './ToastNotification';

const WS_URL = (import.meta.env.VITE_WS_URL as string) || 'ws://localhost:3000/state/events';
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
  const [arrowActive, setArrowActive] = useState<{ [key: string]: boolean }>({});
  const [escapeCount, setEscapeCount] = useState<number>(0);
  // Sightings panel removed
  const [currentDispatch, setCurrentDispatch] = useState<Sighting | null>(() => {
    const saved = sessionStorage.getItem('currentDispatch');
    return saved ? (JSON.parse(saved) as Sighting) : null;
  });

  const [agentsState, setAgentsState] = useState<{ id: number; name: string; avatar: string; lastLog?: string; task?: {pokemon:string; location:string; status:'processing'|'started'|'captured'|'failed'; element?:string} }[]>(() => {
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
        setAgentsState(prev => {
          const merged = list.map(a=>{
            const existing = prev.find(p=>p.id===a.id);
            return existing ?? { id:a.id, name:a.name, avatar:'/assets/pixel/rocket_agent.png' };
          });
          return merged;
        });
      }).catch(()=>{});
    };
    syncAgents();
    const interval = setInterval(syncAgents,5000);
    return ()=> clearInterval(interval);
  },[]);
  const [toasts, setToasts] = useState<{id:string; message:string}[]>([]);
  const [nextAgentId, setNextAgentId] = useState(() => {
    const saved = sessionStorage.getItem('nextAgentId');
    return saved ? Number(saved) : 0;
  });
  const wsRef = useRef<WebSocketService | null>(null);

  // Persist nextAgentId whenever it changes
  useEffect(() => {
    sessionStorage.setItem('nextAgentId', String(nextAgentId));
  }, [nextAgentId]);

  // Helper to trigger arrow animation
  const triggerArrow = (key: string) => {
    setArrowActive((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => setArrowActive((prev) => ({ ...prev, [key]: false })), 600);
  };

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
    triggerArrow('dispatch');
    // update dispatch center immediately
    setCurrentDispatch({ id: crypto.randomUUID(), pokemon: pokemon.name, location: pokemon.location, element: pokemon.element });
    // toast auto-dismiss handles.
  };

  // Add Agent handler
  const handleAddAgent = (agent: { name: string; avatar: string }) => {
    pushToast(`📝 Spawned agent ${agent.name}`);
    const id = nextAgentId;
    setNextAgentId(id + 1);

    // Update local state immediately
    setAgentsState((prev) => [...prev, { id, name: agent.name, avatar: agent.avatar }]);

    // POST to backend
    fetch(`${apiService.getBaseUrl()}/spawn/rocket-agent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name: agent.name }),
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .catch(() => pushToast('Failed to add agent!'));
    triggerArrow('dlq');
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
    setNextAgentId(0);
    apiService.resetSystem().then(()=>{
      // Refresh queue stats from backend so monitor stays accurate
      apiService.getQueueStats().then((qs)=>{
        setSystemState((prev)=>({...prev, queues:[qs]}));
      }).catch(()=>{});
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
            triggerArrow('dispatch');
          }

          // Pokemon escape -> Escape Zone arrow trigger and counter
          if ((data.message.includes('Missed opportunity') || data.message.includes('escaped'))) {
            triggerArrow('dlq');
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
          if (data.type === 'dispatch') triggerArrow('dispatch');
          if (data.type === 'failure' || data.type === 'retry') triggerArrow('dlq');
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

  return (
    <div className="min-h-screen bg-pixel-dark px-2 py-4 flex flex-col md:flex-row items-stretch md:items-start relative" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      {/* Dashboard grid */}
      <div className="flex-1 w-full max-w-6xl grid grid-cols-12 gap-4 auto-rows-min md:grid-cols-12 md:gap-4 sm:grid-cols-6 sm:gap-2 grid-cols-1 gap-2 relative">
        {/* Sightings panel removed */}
        {/* Dispatch Center */}
        <div className="col-span-3 col-start-5 row-span-2 sm:col-span-6 sm:row-span-1 col-span-1 relative">
          <PixelPanel title="Dispatch Center" color="green" headerIcon={null}>
            {currentDispatch ? (
              <div className="flex flex-col items-center">
                <img src={`/assets/pixel/${currentDispatch.pokemon.toLowerCase()}.png`} alt={currentDispatch.pokemon} className="mb-2" style={{ imageRendering: 'pixelated', width: 64, height: 64 }} />
                <div className="text-center text-lg mt-2">{currentDispatch.pokemon}</div>
                <div className="text-xs text-pixel-yellow mt-1">{currentDispatch.location}</div>
              </div>
            ) : (
              <div className="text-center text-pixel-gray text-sm">No active dispatch</div>
            )}
          </PixelPanel>
          {/* Arrow to Task Queue Monitor */}
          <div className="hidden md:block absolute top-1/2 right-[-28px] z-10">
            <PixelArrow direction="right" active={arrowActive['dispatch']} />
          </div>
        </div>
        {/* Task Queue Monitor */}
        <div className="col-span-3 col-start-9 row-span-2 sm:col-span-6 sm:row-span-1 col-span-1 relative">
          <PixelPanel title="Task Queue Monitor" color="orange" headerIcon={null}>
            <div className="bg-pixel-gray p-2 rounded mb-2 flex items-center">
              <span className="bg-pixel-green px-2 py-1 rounded mr-2">{systemState.queues[0]?.name || 'pokemon_tasks'}</span>
            </div>
            <div className="flex flex-col space-y-1 text-xs">
              <div className="flex justify-between"><span>POKEMON TASKS</span><span>{systemState.queues[0]?.messages ?? 0}</span></div>
              <div className="flex justify-between"><span>AGENTS</span><span>{systemState.queues[0]?.consumers ?? 0}</span></div>
            </div>
          </PixelPanel>
          {/* Arrow to DLQ Zone */}
          <div className="hidden md:block absolute bottom-[-32px] left-1/2 -translate-x-1/2 z-10">
            <PixelArrow direction="down" active={arrowActive['dlq']} />
          </div>
        </div>
        {/* Rocket Agents */}
        <div className="col-span-6 row-span-2 mt-4 sm:col-span-6 sm:row-span-1 col-span-1 relative">
          <PixelPanel title="Rocket Agents" color="blue" headerIcon={null}>
            <RocketAgentsPanel agents={agentsState} />
          </PixelPanel>
          <div className="hidden md:block absolute right-[-28px] top-1/2 z-10">
            <PixelArrow direction="right" active={arrowActive['dlq']} />
          </div>
        </div>
        {/* Escape Zone */}
        <div className="col-span-2 row-span-2 mt-4 sm:col-span-3 sm:row-span-1 col-span-1">
          <PixelPanel title="Escape Zone" color="red" headerIcon={null}>
            <div className="flex flex-col items-center">
              <img src="/assets/pixel/grave.svg" alt="Grave" style={{ imageRendering: 'pixelated', width: 32, height: 32 }} />
              <div className="flex items-center mt-2">
                <img src="/assets/pixel/pokeball.png" alt="Pokeball" style={{ imageRendering: 'pixelated', width: 24, height: 24 }} />
                <span className="ml-2">x{escapeCount}</span>
              </div>
            </div>
          </PixelPanel>
        </div>
        {/* System Log (full width) */}
        <div className="col-span-12 mt-4">
          <PixelPanel title="System Log" color="gray" headerIcon={null}>
            <TerminalLog logs={logs} />
          </PixelPanel>
        </div>
      </div>
      {/* Control panel (side on desktop, below on mobile) */}
      <div className="w-full md:w-80 mt-8 md:mt-0 md:ml-8 flex-shrink-0">
        <PixelControlPanel onAddPokemon={handleAddPokemon} onAddAgent={handleAddAgent} onReset={handleReset} />
      </div>
      {/* Mobile stacked arrows */}
      <div className="md:hidden flex flex-col items-center w-full max-w-2xl mx-auto mt-4 space-y-2">
        <PixelArrow direction="down" active={arrowActive['dispatch']} />
        <PixelArrow direction="down" active={arrowActive['dispatch']} />
        <PixelArrow direction="down" active={arrowActive['dlq']} />
      </div>

      {/* Toast notifications */}
      <ToastNotification toasts={toasts} onRemove={(id)=>setToasts((t)=>t.filter(x=>x.id!==id))} />
    </div>
  );
};

export default Dashboard; 