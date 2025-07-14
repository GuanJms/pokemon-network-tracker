import React, { useState } from 'react';
import PixelPanel from './PixelPanel';

const POKEMON_LIST = [
  { name: 'Charmander', sprite: '/assets/pixel/charmander.png', element: 'fire' },
  { name: 'Bulbasaur', sprite: '/assets/pixel/bulbasaur.png', element: 'grass' },
  { name: 'Squirtle', sprite: '/assets/pixel/squirtle.png', element: 'water' },
  { name: 'Pikachu', sprite: '/assets/pixel/pikachu.png', element: 'lighting' },
];
const AGENT_AVATARS = [
  { name: 'Rocket Agent', sprite: '/assets/pixel/rocket_agent.svg' },
  { name: 'Rocket Agent 2', sprite: '/assets/pixel/rocket_agent2.svg' },
  { name: 'Rocket Agent 3', sprite: '/assets/pixel/rocket_agent3.svg' },
];

const LOCATIONS = [
  'Route 1', 'Route 2', 'Route 3', 'Pallet Town', 'Viridian City', 'Pewter City', 'Cerulean City',
];

const PixelControlPanel: React.FC<{
  onAddPokemon: (pokemon: { name: string; location: string; element: string }) => void;
  onAddAgent: (agent: { name: string; avatar: string }) => void;
  onReset: () => void;
}> = ({ onAddPokemon, onAddAgent, onReset }) => {
  // Pokémon form state
  const [pokemon, setPokemon] = useState(POKEMON_LIST[0].name);
  const [location, setLocation] = useState(LOCATIONS[2]);
  const [addingPokemon, setAddingPokemon] = useState(false);

  // Agent form state
  const [agentName, setAgentName] = useState('Rocket Agent');
  const [avatar, setAvatar] = useState(AGENT_AVATARS[0].sprite);
  const [addingAgent, setAddingAgent] = useState(false);

  return (
    <div className="w-full md:w-80 max-w-full flex flex-col gap-6">
      <PixelPanel title="Control Board" color="gray" headerIcon={<span>🎮</span>}>
        {/* Add Pokémon Sighting */}
        <form
          className="mb-6 flex flex-col gap-2"
          onSubmit={e => {
            e.preventDefault();
            setAddingPokemon(true);
            setTimeout(() => {
              const poke = POKEMON_LIST.find(p => p.name === pokemon)!;
              onAddPokemon({ name: poke.name, location, element: poke.element });
              setAddingPokemon(false);
            }, 500);
          }}
        >
          <div className="font-bold text-pixel-orange text-xs mb-1">Add Pokémon Sighting</div>
          <div className="flex items-center gap-2">
            <select
              className="bg-pixel-gray border-4 border-pixel-border text-white px-2 py-1 font-pixel text-xs"
              value={pokemon}
              onChange={e => setPokemon(e.target.value)}
            >
              {POKEMON_LIST.map(p => (
                <option key={p.name} value={p.name}>{p.name}</option>
              ))}
            </select>
            <img
              src={POKEMON_LIST.find(p => p.name === pokemon)?.sprite}
              alt={pokemon}
              className="w-8 h-8 ml-2"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <select
            className="bg-pixel-gray border-4 border-pixel-border text-white px-2 py-1 font-pixel text-xs mt-1"
            value={location}
            onChange={e => setLocation(e.target.value)}
          >
            {LOCATIONS.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <button
            type="submit"
            className={`mt-2 bg-pixel-green text-black border-4 border-pixel-border px-2 py-1 font-pixel text-xs transition-transform ${addingPokemon ? 'scale-95 animate-pulse' : 'hover:scale-105'}`}
            disabled={addingPokemon}
          >
            {addingPokemon ? 'Adding...' : 'Add Sighting'}
          </button>
        </form>
        {/* Add Rocket Agent */}
        <form
          className="flex flex-col gap-2"
          onSubmit={e => {
            e.preventDefault();
            setAddingAgent(true);
            setTimeout(() => {
              onAddAgent({ name: agentName, avatar });
              setAddingAgent(false);
            }, 500);
          }}
        >
          <div className="font-bold text-pixel-blue text-xs mb-1">Add Rocket Agent</div>
          <input
            className="bg-pixel-gray border-4 border-pixel-border text-white px-2 py-1 font-pixel text-xs"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
            placeholder="Agent Name"
          />
          <div className="flex items-center gap-2 mt-1">
            {AGENT_AVATARS.map(a => (
              <button
                key={a.sprite}
                type="button"
                className={`border-4 border-pixel-border p-1 ${avatar === a.sprite ? 'bg-pixel-blue' : 'bg-pixel-gray'} transition-transform hover:scale-110`}
                onClick={() => setAvatar(a.sprite)}
              >
                <img src={a.sprite} alt={a.name} className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
              </button>
            ))}
          </div>
          <button
            type="submit"
            className={`mt-2 bg-pixel-blue text-white border-4 border-pixel-border px-2 py-1 font-pixel text-xs transition-transform ${addingAgent ? 'scale-95 animate-pulse' : 'hover:scale-105'}`}
            disabled={addingAgent}
          >
            {addingAgent ? 'Adding...' : 'Add Agent'}
          </button>
        </form>
        {/* Reset Button */}
        <button
          type="button"
          className="mt-6 bg-pixel-red text-white border-4 border-pixel-border px-2 py-1 font-pixel text-xs transition-transform hover:scale-105"
          onClick={onReset}
        >
          Reset System
        </button>
      </PixelPanel>
    </div>
  );
};

export default PixelControlPanel; 