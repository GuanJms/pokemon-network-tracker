import React from 'react';

const AGENT_AVATARS = [
  '/assets/pixel/rocket_agent.svg',
  '/assets/pixel/rocket_agent2.svg',
  '/assets/pixel/rocket_agent3.svg',
];

interface Agent {
  id: number;
  name: string;
  imageNum?: number;
  lastLog?: string;
  task?: { pokemon: string; location: string; status: 'processing'|'started'|'captured'|'failed'; element?: string };
}

interface Props {
  agents: Agent[];
}

const RocketAgentsPanel: React.FC<Props> = ({ agents }) => {
  const colorFor = (msg?: string) => {
    if (!msg) return 'text-pixel-gray';
    const lower = msg.toLowerCase();
    if (lower.includes('captured')) return 'text-green-400';
    if (lower.includes('failed') || lower.includes('escape')) return 'text-red-400';
    if (lower.includes('processing') || lower.includes('started')) return 'text-yellow-400';
    return 'text-pixel-blue';
  };

  return (
    <div className="flex flex-wrap gap-3">
      {agents.map((a) => (
        <div
          key={a.id}
          className="bg-pixel-dark border-4 border-pixel-border p-2 flex flex-col items-start relative"
          style={{ width: 200, minHeight: 140 }}
        >
          {/* Agent avatar & name row */}
          <div className="flex items-center gap-2">
            <img
              src={AGENT_AVATARS[a.imageNum ?? 0]}
              alt={a.name}
              width={24}
              height={24}
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="text-xs text-pixel-yellow">#{a.id} {a.name}</div>
          </div>

          {/* Task sprite overlay */}
          {a.task && (
            <img
              src={`/assets/pixel/${a.task.pokemon.toLowerCase()}.png`}
              alt={a.task.pokemon}
              width={56}
              height={56}
              className="absolute top-1 right-1"
              style={{ imageRendering: 'pixelated', filter: a.task.status==='captured'?'drop-shadow(0 0 4px #31c48d)':a.task.status==='failed'?'grayscale(1) brightness(0.6)':undefined }}
            />
          )}

          {/* Log message */}
          <div className={`text-[10px] mt-2 whitespace-pre-wrap break-words ${colorFor(a.lastLog)}`} style={{ minHeight: 60, width: '100%' }}>
            {a.lastLog || 'Idle'}
          </div>
        </div>
      ))}
      {agents.length === 0 && <div className="text-pixel-gray text-xs">No agents</div>}
    </div>
  );
};

export default RocketAgentsPanel; 