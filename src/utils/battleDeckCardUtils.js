/** Infer a coarse faction / tag from card id or name for filtering (battle JSON has no faction field). */
const FACTION_HINTS = [
  ['INSTITUTE', 'Institute'],
  ['BROTHERHOOD', 'Brotherhood'],
  ['RAILROAD', 'Railroad'],
  ['RAIDER', 'Raiders'],
  ['MINUTEMAN', 'Minutemen'],
  ['VAULT', 'Vault'],
  ['SUPER_MUTANT', 'Super Mutants'],
  ['MUTANT', 'Mutants'],
  ['GUNNER', 'Gunners'],
  ['CRIMSON_CARAVAN', 'Crimson Caravan'],
  ['NCR', 'NCR'],
  ['LEGION', 'Legion'],
  ['ENCLAVE', 'Enclave'],
]

export function inferFactionFromCard(id = '', name = '') {
  const u = `${id} ${name}`.toUpperCase()
  for (const [needle, label] of FACTION_HINTS) {
    if (u.includes(needle)) return label
  }
  return 'Other'
}

/** All string values on the card for search. */
export function cardSearchBlob(card) {
  if (!card || typeof card !== 'object') return ''
  return Object.values(card)
    .filter(v => typeof v === 'string' || typeof v === 'number')
    .map(String)
    .join(' ')
}

/** Body text for expanded row — prefer explicit fields, else name only. */
export function getCardBodyText(card) {
  if (!card) return ''
  const t = card.text ?? card.description ?? card.body ?? card.rules
  if (typeof t === 'string' && t.trim()) return t.trim()
  return card.name ?? ''
}
