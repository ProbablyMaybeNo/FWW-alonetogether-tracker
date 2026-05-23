// Campaign Map seed — territories, trade routes, faction regions, marker palette.
// Coordinates are 0..100 percentages anchored to a 16:10 SVG viewport.
// Positions are loosely geographic (Colorado / SE Wyoming) but tuned for legibility,
// not cartographic accuracy.

export const MAP_VIEWBOX = { w: 160, h: 100 }

export const TERRITORY_TYPES = {
  bunker:     { label: 'Bunker',         glyph: '▣' },
  tunnel:     { label: 'Tunnel',         glyph: '⬣' },
  mine:       { label: 'Mine',           glyph: '⛯' },
  depot:      { label: 'Depot',          glyph: '◆' },
  military:   { label: 'Military Ruins', glyph: '✪' },
  research:   { label: 'Research',       glyph: '⚛' },
  bridge:     { label: 'Bridge',         glyph: '⊨' },
  rail:       { label: 'Rail Hub',       glyph: '═' },
  wilderness: { label: 'Wilderness',     glyph: '▲' },
  landmark:   { label: 'Landmark',       glyph: '★' },
}

export const TERRITORY_STATES = ['hidden', 'rumored', 'revealed', 'explored', 'controlled', 'contested', 'ruined', 'threatened']

export const ROUTE_STATES = ['hidden', 'revealed', 'open', 'controlled', 'contested', 'blocked', 'threatened']

// Faction labels & colors. Pressure regions paint a soft hex tint per zone.
export const FACTIONS = {
  brotherhood:  { label: 'Brotherhood of Steel', color: '#3aa0ff' },
  legion:       { label: "Caesar's Legion",      color: '#c0392b' },
  institute:    { label: 'Institute',            color: '#a78bfa' },
  supermutants: { label: 'Super Mutants',        color: '#7cbf2a' },
  raiders:      { label: 'Raiders',              color: '#ff7e1a' },
  neutral:      { label: 'Neutral / Contested',  color: '#888888' },
}

// Pressure regions: each lists a polygon (% coords) that softly tints territories inside.
export const PRESSURE_REGIONS = [
  { id: 'north',   faction: 'brotherhood',  label: 'NORTHERN PRESSURE — Brotherhood',
    polygon: [[0, 0], [160, 0], [160, 28], [0, 28]] },
  { id: 'south',   faction: 'legion',        label: 'SOUTHERN PRESSURE — Legion',
    polygon: [[0, 76], [160, 76], [160, 100], [0, 100]] },
  { id: 'east',    faction: 'institute',     label: 'EASTERN INFILTRATION — Institute',
    polygon: [[122, 28], [160, 28], [160, 76], [122, 76]] },
  { id: 'rockies', faction: 'supermutants',  label: 'ROCKIES — Mutants / Wildlife / Raiders',
    polygon: [[0, 28], [40, 28], [40, 76], [0, 76]] },
  { id: 'central', faction: 'neutral',       label: 'CENTRAL CORRIDOR — Contested',
    polygon: [[40, 28], [122, 28], [122, 76], [40, 76]] },
]

export const STARTER_REVEALED_IDS = ['bents-old-fort', 'royal-gorge-bridge', 'union-station-ruins', 'fort-carson', 'paint-mines']

// 24 territories.
export const SEED_TERRITORIES = [
  // ── North (Brotherhood pressure) ──
  { id: 'fe-warren-afb', name: 'F.E. Warren Air Force Base', type: 'military',   x: 78,  y: 10, factionPressure: 'brotherhood',
    rewardSummary: 'Strategic Ordnance Cache', rewardType: 'weapons', threatLevel: 3 },
  { id: 'pawnee-grassland', name: 'Pawnee National Grassland', type: 'wilderness', x: 112, y: 20, factionPressure: 'brotherhood',
    rewardSummary: 'Foraging + scout vantage', rewardType: 'forage', threatLevel: 1 },
  { id: 'big-thompson-canyon', name: 'Big Thompson Canyon', type: 'wilderness',  x: 60,  y: 22, factionPressure: 'brotherhood',
    rewardSummary: 'Hidden caravan route', rewardType: 'route', threatLevel: 2 },

  // ── Denver cluster (Central / contested) ──
  { id: 'rocky-mountain-arsenal', name: 'Rocky Mountain Arsenal', type: 'military', x: 84, y: 33, factionPressure: 'neutral',
    rewardSummary: 'Chem stockpile (hazardous)', rewardType: 'chems', threatLevel: 4 },
  { id: 'rocky-flats-plant', name: 'Rocky Flats Plant',         type: 'research',  x: 68, y: 36, factionPressure: 'neutral',
    rewardSummary: 'Pre-war fissile materials', rewardType: 'science', threatLevel: 5 },
  { id: 'denver-federal-center', name: 'Denver Federal Center', type: 'bunker',    x: 72, y: 39, factionPressure: 'neutral',
    rewardSummary: 'Govt archives + bunker access', rewardType: 'intel', threatLevel: 2 },
  { id: 'union-station-ruins',  name: 'Union Station Ruins',    type: 'rail',      x: 76, y: 36, factionPressure: 'neutral',
    rewardSummary: 'Rail hub — fast travel anchor', rewardType: 'logistics', threatLevel: 1 },
  { id: 'buckley-sfb',          name: 'Buckley Space Force Base', type: 'military',x: 86, y: 39, factionPressure: 'neutral',
    rewardSummary: 'Radar uplink + drone parts', rewardType: 'tech', threatLevel: 3 },

  // ── Mountain corridor (Rockies — Mutants / Raiders) ──
  { id: 'eisenhower-tunnel', name: 'Eisenhower Tunnel', type: 'tunnel',  x: 46, y: 40, factionPressure: 'supermutants',
    rewardSummary: 'Sealed I-70 chokepoint', rewardType: 'route', threatLevel: 3 },
  { id: 'moffat-tunnel',     name: 'Moffat Tunnel',     type: 'tunnel',  x: 50, y: 32, factionPressure: 'supermutants',
    rewardSummary: 'Hidden rail bypass', rewardType: 'route', threatLevel: 3 },
  { id: 'hoosier-pass',      name: 'Hoosier Pass',      type: 'landmark', x: 50, y: 52, factionPressure: 'supermutants',
    rewardSummary: 'High-altitude lookout', rewardType: 'intel', threatLevel: 2 },
  { id: 'leadville-mining',  name: 'Leadville Mining District', type: 'mine', x: 36, y: 54, factionPressure: 'supermutants',
    rewardSummary: 'Silver, ore caches', rewardType: 'caps', threatLevel: 2 },
  { id: 'climax-mine',       name: 'Climax Mine',       type: 'mine',    x: 38, y: 48, factionPressure: 'supermutants',
    rewardSummary: 'Molybdenum + deep shelter', rewardType: 'shelter', threatLevel: 3 },

  // ── Colorado Springs cluster (Central / contested) ──
  { id: 'cheyenne-mountain', name: 'Cheyenne Mountain Complex', type: 'bunker', x: 64, y: 66, factionPressure: 'neutral',
    rewardSummary: 'Hardened command bunker', rewardType: 'shelter', threatLevel: 4 },
  { id: 'peterson-sfb',      name: 'Peterson Space Force Base', type: 'military', x: 70, y: 61, factionPressure: 'neutral',
    rewardSummary: 'Comms + sat downlink', rewardType: 'tech', threatLevel: 3 },
  { id: 'schriever-sfb',     name: 'Schriever Space Force Base', type: 'military', x: 86, y: 64, factionPressure: 'neutral',
    rewardSummary: 'Encrypted intel relay', rewardType: 'intel', threatLevel: 3 },
  { id: 'fort-carson',       name: 'Fort Carson',                type: 'military', x: 66, y: 70, factionPressure: 'neutral',
    rewardSummary: 'Standing garrison armory', rewardType: 'weapons', threatLevel: 3 },
  { id: 'pikes-peak-lab',    name: 'US Army Pikes Peak Research Lab', type: 'research', x: 56, y: 62, factionPressure: 'neutral',
    rewardSummary: 'Cold-research samples', rewardType: 'science', threatLevel: 3 },
  { id: 'garden-of-the-gods', name: 'Garden of the Gods',         type: 'landmark', x: 60, y: 58, factionPressure: 'neutral',
    rewardSummary: 'Defensible camp + tourism relic', rewardType: 'shelter', threatLevel: 1 },
  { id: 'paint-mines',       name: 'Paint Mines',                  type: 'wilderness', x: 108, y: 58, factionPressure: 'institute',
    rewardSummary: 'Strange anomalies', rewardType: 'science', threatLevel: 2 },

  // ── South (Legion pressure) ──
  { id: 'royal-gorge-bridge', name: 'Royal Gorge Bridge',          type: 'bridge', x: 50, y: 78, factionPressure: 'legion',
    rewardSummary: 'River crossing toll', rewardType: 'caps', threatLevel: 2 },
  { id: 'pueblo-chemical-depot', name: 'Pueblo Chemical Depot',    type: 'depot',  x: 80, y: 78, factionPressure: 'legion',
    rewardSummary: 'Chemical munitions stockpile', rewardType: 'chems', threatLevel: 4 },
  { id: 'bents-old-fort',     name: "Bent's Old Fort",              type: 'landmark', x: 116, y: 82, factionPressure: 'legion',
    rewardSummary: 'Trade post — caravan caps', rewardType: 'caps', threatLevel: 1 },
  { id: 'pinon-canyon',       name: 'Piñon Canyon Maneuver Site',   type: 'wilderness', x: 100, y: 92, factionPressure: 'legion',
    rewardSummary: 'Training range — vehicle wrecks', rewardType: 'salvage', threatLevel: 3 },
]

// Routes connect logical expedition pathways.
export const SEED_ROUTES = [
  // Denver internal
  { id: 'r-union-fed',    from: 'union-station-ruins',  to: 'denver-federal-center',    name: 'Federal Spur',       incomeCaps: 10, rewardCategory: 'logistics' },
  { id: 'r-union-rocky',  from: 'union-station-ruins',  to: 'rocky-mountain-arsenal',   name: 'Arsenal Line',       incomeCaps: 15, rewardCategory: 'munitions' },
  { id: 'r-union-buckley', from: 'union-station-ruins', to: 'buckley-sfb',              name: 'Buckley Corridor',   incomeCaps: 10, rewardCategory: 'tech' },
  { id: 'r-fed-flats',    from: 'denver-federal-center', to: 'rocky-flats-plant',       name: 'Federal Flats Road', incomeCaps: 10, rewardCategory: 'science' },
  { id: 'r-rocky-flats',  from: 'rocky-flats-plant',   to: 'rocky-mountain-arsenal',    name: 'Old Plant Trail',    incomeCaps: 5,  rewardCategory: 'salvage' },

  // Mountain corridor
  { id: 'r-eisen-moffat', from: 'eisenhower-tunnel',   to: 'moffat-tunnel',             name: 'Continental Bypass', incomeCaps: 20, rewardCategory: 'route' },
  { id: 'r-eisen-union',  from: 'eisenhower-tunnel',   to: 'union-station-ruins',       name: 'I-70 East',          incomeCaps: 15, rewardCategory: 'logistics' },
  { id: 'r-moffat-climax', from: 'moffat-tunnel',      to: 'climax-mine',                name: 'Moffat Spur',        incomeCaps: 10, rewardCategory: 'mining' },
  { id: 'r-eisen-hoosier', from: 'eisenhower-tunnel',  to: 'hoosier-pass',               name: 'Loveland Path',      incomeCaps: 5,  rewardCategory: 'forage' },
  { id: 'r-hoosier-climax', from: 'hoosier-pass',      to: 'climax-mine',                name: 'High Pass Track',    incomeCaps: 5,  rewardCategory: 'forage' },
  { id: 'r-climax-leadville', from: 'climax-mine',     to: 'leadville-mining',           name: 'Ore Wagon Road',     incomeCaps: 15, rewardCategory: 'mining' },
  { id: 'r-leadville-royal', from: 'leadville-mining', to: 'royal-gorge-bridge',         name: 'Arkansas Headwaters', incomeCaps: 10, rewardCategory: 'route' },

  // North
  { id: 'r-arsenal-warren', from: 'rocky-mountain-arsenal', to: 'fe-warren-afb',         name: 'Old I-25 North',     incomeCaps: 15, rewardCategory: 'military' },
  { id: 'r-warren-pawnee', from: 'fe-warren-afb',       to: 'pawnee-grassland',           name: 'Plains Patrol',      incomeCaps: 10, rewardCategory: 'forage' },
  { id: 'r-bigt-rocky',    from: 'big-thompson-canyon', to: 'rocky-flats-plant',         name: 'Canyon Approach',    incomeCaps: 10, rewardCategory: 'forage' },
  { id: 'r-bigt-moffat',   from: 'big-thompson-canyon', to: 'moffat-tunnel',             name: 'Hidden Gulch',       incomeCaps: 10, rewardCategory: 'route' },
  { id: 'r-bigt-pawnee',   from: 'big-thompson-canyon', to: 'pawnee-grassland',          name: 'North Plains Trail', incomeCaps: 5,  rewardCategory: 'forage' },

  // I-25 / Springs
  { id: 'r-buckley-garden', from: 'buckley-sfb',        to: 'garden-of-the-gods',         name: 'I-25 South',         incomeCaps: 15, rewardCategory: 'route' },
  { id: 'r-garden-pikes',  from: 'garden-of-the-gods', to: 'pikes-peak-lab',              name: 'Foothills Climb',    incomeCaps: 5,  rewardCategory: 'science' },
  { id: 'r-pikes-peterson', from: 'pikes-peak-lab',    to: 'peterson-sfb',                name: 'Pikes Loop',         incomeCaps: 10, rewardCategory: 'tech' },
  { id: 'r-peterson-schriever', from: 'peterson-sfb', to: 'schriever-sfb',               name: 'Comms Belt',         incomeCaps: 15, rewardCategory: 'tech' },
  { id: 'r-peterson-cheyenne', from: 'peterson-sfb',  to: 'cheyenne-mountain',           name: 'NORAD Service Road', incomeCaps: 20, rewardCategory: 'intel' },
  { id: 'r-cheyenne-carson',  from: 'cheyenne-mountain', to: 'fort-carson',              name: 'Bunker Convoy',      incomeCaps: 10, rewardCategory: 'military' },
  { id: 'r-carson-peterson',  from: 'fort-carson',    to: 'peterson-sfb',                name: 'Garrison Spur',      incomeCaps: 5,  rewardCategory: 'military' },
  { id: 'r-carson-pueblo',    from: 'fort-carson',    to: 'pueblo-chemical-depot',       name: 'Southbound Convoy',  incomeCaps: 15, rewardCategory: 'munitions' },
  { id: 'r-schriever-paint',  from: 'schriever-sfb',  to: 'paint-mines',                  name: 'East Plains Track',  incomeCaps: 10, rewardCategory: 'intel' },
  { id: 'r-paint-pawnee',     from: 'paint-mines',    to: 'pawnee-grassland',             name: 'Calhan Line',        incomeCaps: 10, rewardCategory: 'forage' },

  // South / Legion approaches
  { id: 'r-pueblo-bents',  from: 'pueblo-chemical-depot', to: 'bents-old-fort',          name: 'Old Santa Fe Trail', incomeCaps: 15, rewardCategory: 'caps' },
  { id: 'r-pueblo-royal',  from: 'pueblo-chemical-depot', to: 'royal-gorge-bridge',      name: 'Arkansas River Run', incomeCaps: 15, rewardCategory: 'caps' },
  { id: 'r-bents-pinon',   from: 'bents-old-fort',     to: 'pinon-canyon',               name: 'South Range Trail',  incomeCaps: 10, rewardCategory: 'salvage' },
  { id: 'r-royal-pinon',   from: 'royal-gorge-bridge', to: 'pinon-canyon',               name: 'Gorge Drift',        incomeCaps: 10, rewardCategory: 'salvage' },
]

// Build adjacency from routes (territories are "connected" when they share a route id).
export function buildAdjacency(routes = SEED_ROUTES) {
  const adj = {}
  for (const r of routes) {
    if (!adj[r.from]) adj[r.from] = new Set()
    if (!adj[r.to]) adj[r.to] = new Set()
    adj[r.from].add(r.to)
    adj[r.to].add(r.from)
  }
  return adj
}

// Marker palette — draggable, stackable icons independent of ownership.
export const MARKER_KINDS = [
  { kind: 'player1',     label: 'Player 1',        glyph: '①', color: '#00e676' },
  { kind: 'player2',     label: 'Player 2',        glyph: '②', color: '#1de9b6' },
  { kind: 'brotherhood', label: 'Brotherhood',     glyph: 'B', color: '#3aa0ff' },
  { kind: 'legion',      label: 'Legion',          glyph: 'L', color: '#c0392b' },
  { kind: 'institute',   label: 'Institute',       glyph: 'I', color: '#a78bfa' },
  { kind: 'mutants',     label: 'Super Mutants',   glyph: 'M', color: '#7cbf2a' },
  { kind: 'raiders',     label: 'Raiders',         glyph: 'R', color: '#ff7e1a' },
  { kind: 'caravan',     label: 'Caravan',         glyph: 'C', color: '#ffd700' },
  { kind: 'vault',       label: 'Vault',           glyph: 'V', color: '#76ff03' },
  { kind: 'quest',       label: 'Quest',           glyph: '!', color: '#ffd700' },
  { kind: 'threat',      label: 'Threat',          glyph: '✕', color: '#ff3c3c' },
  { kind: 'contested',   label: 'Contested',       glyph: '⚔', color: '#ff9100' },
  { kind: 'blocked',     label: 'Blocked Route',   glyph: '⊘', color: '#ff3c3c' },
  { kind: 'settlement',  label: 'Settlement',      glyph: '⌂', color: '#00e676' },
  { kind: 'outpost',     label: 'Outpost',         glyph: '◇', color: '#1de9b6' },
]

export const THREAT_FACTIONS = ['brotherhood', 'legion', 'institute', 'supermutants', 'raiders']

// Initial state seed (mutable runtime state stored in player_data.campaign_map).
export function defaultCampaignMapState() {
  const territories = {}
  for (const t of SEED_TERRITORIES) {
    territories[t.id] = {
      state: STARTER_REVEALED_IDS.includes(t.id) ? 'revealed' : 'hidden',
      owner: null,
      threatLevel: t.threatLevel ?? 0,
      notes: '',
      rewardClaimed: false,
    }
  }
  const routes = {}
  for (const r of SEED_ROUTES) {
    const bothRevealed =
      STARTER_REVEALED_IDS.includes(r.from) && STARTER_REVEALED_IDS.includes(r.to)
    routes[r.id] = {
      state: bothRevealed ? 'revealed' : 'hidden',
      owner: null,
      threatLevel: 0,
      notes: '',
      oneTimeRewardClaimed: false,
    }
  }
  return {
    territories,       // id -> mutable territory state
    routes,            // id -> mutable route state
    markers: [],       // [{ id, kind, x, y, label? }]
    threats: {         // faction -> 0..5 pressure score
      brotherhood: 1,
      legion: 1,
      institute: 1,
      supermutants: 2,
      raiders: 2,
    },
    showHidden: false, // GM toggle
  }
}
