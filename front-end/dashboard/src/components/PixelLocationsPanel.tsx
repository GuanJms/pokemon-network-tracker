import React, { useState } from 'react';

interface Sighting {
  id: string;
  pokemon: string;
  location: string;
  element: string;
}

interface Props {
  sightings: Sighting[];
}

// Pre-defined order for Kanto demo so boxes appear in consistent layout
const LOCATION_ORDER = [
  'Pallet Town',
  'Route 1',
  'Viridian City',
  'Route 2',
  'Pewter City',
  'Route 3',
  'Cerulean City',
];

const POKEMON_SPRITES: Record<string, string> = {
  Charmander: '/assets/pixel/charmander.png',
  Bulbasaur: '/assets/pixel/bulbasaur.png',
  Squirtle: '/assets/pixel/squirtle.png',
  Pikachu: '/assets/pixel/pikachu.png',
};

const PixelLocationsPanel: React.FC<Props> = ({ sightings }) => {
  const [hover, setHover] = useState<string | null>(null);

  // Group sightings by location
  const grouped = LOCATION_ORDER.map((loc) => ({
    loc,
    entries: sightings.filter((s) => s.location === loc),
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {grouped.map(({ loc, entries }) => (
        <div
          key={loc}
          className="bg-pixel-dark border-4 border-pixel-border p-2 flex flex-col"
          style={{ minHeight: 100 }}
        >
          <div className="text-pixel-yellow text-xs mb-1" style={{ fontFamily: 'inherit' }}>
            {loc}
          </div>
          {entries.length === 0 ? (
            <div className="text-pixel-gray text-xs">No sightings</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {entries.map((s) => (
                <img
                  key={s.id}
                  src={POKEMON_SPRITES[s.pokemon]}
                  alt={s.pokemon}
                  width={24}
                  height={24}
                  style={{ imageRendering: 'pixelated', filter: hover === s.id ? 'drop-shadow(0 0 8px #ffe066)' : undefined }}
                  onMouseEnter={() => setHover(s.id)}
                  onMouseLeave={() => setHover(null)}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PixelLocationsPanel; 