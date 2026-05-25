// Shared helpers for structure "use" side-effects.
// SETTLEMENT owns the actual side-effect engine (caps deduction, explore card
// draws, deck pulls, special-use modals). HOMESTEAD uses these helpers to know
// when its USED button should redirect to SETTLEMENT instead of toggling.

export const SPECIAL_STRUCTURE_NAMES = [
  'Listening Post',
  'Ranger Outpost',
  'Scout Camp',
  'Barracks',
  'Medical Center',
  'Stores',
]

// Parse "Draw X Y card(s), Keep Z" or "Draw & Keep X Y" from structure effect text.
// Returns null if the effect doesn't contain a draw clause.
export function parseDrawEffect(effect) {
  if (!effect) return null
  const m1 = effect.match(/Draw (\d+) (.+?) cards?, Keep (\d+)/i)
  if (m1) return { drawCount: parseInt(m1[1]), keepCount: parseInt(m1[3]), typeLabel: m1[2].trim() }
  const m2 = effect.match(/Draw & Keep (\d+) (.+?)(?:\s*[.(]|$)/i)
  if (m2) { const n = parseInt(m2[1]); return { drawCount: n, keepCount: n, typeLabel: m2[2].trim() } }
  return null
}

// True if a structure has side-effects when "used" that go beyond toggling
// a boolean — caps deduction, modal pickers, or deck pulls. These belong on
// the SETTLEMENT tab where the side-effect engine lives.
export function structureHasSideEffects(def) {
  if (!def) return false
  if (SPECIAL_STRUCTURE_NAMES.includes(def.name)) return true
  if (parseDrawEffect(def.effect)) return true
  return false
}
