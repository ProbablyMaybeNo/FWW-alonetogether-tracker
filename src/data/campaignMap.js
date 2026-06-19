// Campaign Map — a blank, fully player-authored canvas.
//
// An admin uploads a background image, places generic icons on it, and draws
// snap-to-icon route lines. All textual detail (ownership, faction, rules, buffs)
// lives in the MAP TABLE, keyed by icon/line id — not in per-icon popups.
//
// See docs/vercel-comments/MAP_DESIGN.md for the full spec.

export const MAP_VIEWBOX = { w: 160, h: 100 }

// Generic, assignable marker icons. Players pick one, then recolour/label it for
// whatever they want it to mean on their map.
export const MARKER_KINDS = [
  { kind: 'pin',       label: 'Pin',        glyph: '⬤', color: '#00e676' },
  { kind: 'diamond',   label: 'Diamond',    glyph: '◆', color: '#1de9b6' },
  { kind: 'star',      label: 'Star',       glyph: '★', color: '#ffd700' },
  { kind: 'home',      label: 'Home',       glyph: '⌂', color: '#00e676' },
  { kind: 'flag',      label: 'Flag',       glyph: '⚑', color: '#3aa0ff' },
  { kind: 'skull',     label: 'Skull',      glyph: '☠', color: '#ff3c3c' },
  { kind: 'swords',    label: 'Swords',     glyph: '⚔', color: '#ff9100' },
  { kind: 'shield',    label: 'Shield',     glyph: '⛨', color: '#a78bfa' },
  { kind: 'cog',       label: 'Cog',        glyph: '⚙', color: '#76ff03' },
  { kind: 'bolt',      label: 'Bolt',       glyph: '⚡', color: '#ffd700' },
  { kind: 'exclaim',   label: 'Alert',      glyph: '!', color: '#ffd700' },
  { kind: 'cross',     label: 'Cross',      glyph: '✕', color: '#ff3c3c' },
]

// Initial state — a blank map. No seed territories, routes, fog, or threat factions.
export function defaultCampaignMapState() {
  return {
    background: null, // { url } once an admin uploads a map image (P2)
    markers: [],      // placed icons: [{ id, kind, x, y, color?, label? }]
    lines: [],        // snap-to-icon routes: [{ id, fromId, toId, color? }] (P5)
    table: {},        // id -> { owner, faction, rules, buffs, notes } (P4)
  }
}
