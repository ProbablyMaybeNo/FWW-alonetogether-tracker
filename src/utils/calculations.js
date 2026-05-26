import structuresData from '../data/structures.json'
import itemsData from '../data/items.json'

const structuresById = {}
structuresData.forEach(s => { structuresById[s.id] = s })

const itemsById = {}
itemsData.forEach(i => { itemsById[i.id] = i })

export function getStructureRef(structureId) {
  return structuresById[structureId] || null
}

export function getItemRef(itemId) {
  return itemsById[itemId] || null
}

export function calcPowerGenerated(structures) {
  return structures.reduce((sum, s) => {
    const ref = structuresById[s.structureId]
    return sum + (ref?.pwrGen || 0)
  }, 0)
}

export function calcPowerConsumed(structures) {
  return structures.reduce((sum, s) => {
    if (!s.powered) return sum
    const ref = structuresById[s.structureId]
    return sum + (ref?.pwrReq || 0)
  }, 0)
}

export function calcWaterGenerated(structures) {
  return structures.reduce((sum, s) => {
    const ref = structuresById[s.structureId]
    return sum + (ref?.waterGen || 0)
  }, 0)
}

export function calcWaterConsumed(structures) {
  return structures.reduce((sum, s) => {
    if (!s.powered) return sum
    const ref = structuresById[s.structureId]
    return sum + (ref?.waterReq || 0)
  }, 0)
}

export function calcDefenseRating(structures) {
  // Base defense rating is 3
  let defense = 3
  structures.forEach(s => {
    const ref = structuresById[s.structureId]
    if (!ref || ref.defenseValue <= 0) return
    // Only count powered, non-wrecked defense structures
    const usable = s.condition !== 'Damaged' && s.condition !== 'Badly Damaged' && s.condition !== 'Wrecked'
    const hasPower = (ref.pwrReq === 0) || s.powered
    if (usable && hasPower) defense += ref.defenseValue
  })
  return Math.max(0, defense)
}

export function calcUnitTotalCaps(unit) {
  const baseCaps = unit.baseCaps || 0
  const itemCaps = (unit.equippedItems || []).reduce((sum, itemId) => {
    const item = itemsById[itemId]
    return sum + (item?.caps || 0)
  }, 0)
  return baseCaps + itemCaps
}

export function calcUnitItemCaps(unit) {
  return (unit.equippedItems || []).reduce((sum, itemId) => {
    const item = itemsById[itemId]
    return sum + (item?.caps || 0)
  }, 0)
}

export function calcRosterTotalCaps(roster) {
  return roster.reduce((sum, unit) => sum + calcUnitTotalCaps(unit), 0)
}

export function calcItemPoolCounts(itemPool) {
  const counts = { stored: 0, locker: 0, stores: 0, recovery: 0 }
  ;(itemPool?.items || []).forEach(item => {
    const loc = item.location
    // support legacy location names
    if (loc === 'stored' || loc === 'Maint. Shed') counts.stored++
    else if (loc === 'locker' || loc === 'Locker') counts.locker++
    else if (loc === 'stores' || loc === 'Stores') counts.stores++
    else if (loc === 'recovery' || loc === 'Temp Pool') counts.recovery++
  })
  return counts
}

export function calcSettlementTotalCaps(structures) {
  return structures.reduce((sum, s) => {
    const ref = structuresById[s.structureId]
    const cost = typeof ref?.cost === 'number' ? ref.cost : 0
    return sum + cost
  }, 0)
}

/**
 * Applies the Alone Together "Rest" mechanic to a single unit per
 * alone_together_v2.1.pdf §9 Step 1 "Rest (Start of Every Round)".
 *
 *   - Delayed models return automatically (fate → Active) but do NOT heal.
 *   - Injured models are automatically healed (fate → Active) AND get healing.
 *   - Lost / Captured / Dead / Pending: no change.
 *   - Models eligible for healing: convert half Radiation Damage (rounded up)
 *     to Regular Damage, then discard half Regular Damage (rounded up),
 *     then discard up to 1 condition (priority Poisoned > Injured Arm > Injured Leg).
 *
 * Example: a unit with 4 reg / 2 rad → convert 1 rad to reg → 5 reg / 1 rad →
 * discard 3 reg (half of 5 rounded up) → 2 reg / 1 rad.
 *
 * Returns a NEW unit object with the changes applied.
 */
export function applyRestToUnit(unit) {
  if (!unit) return unit
  const wasDelayed = unit.fate === 'Delayed'
  const wasInjured = unit.fate === 'Injured'
  const fate = (wasDelayed || wasInjured) ? 'Active' : unit.fate

  // Delayed returns but doesn't heal. Lost/Captured/Dead/Pending: no change at all.
  const noHealing =
    wasDelayed ||
    fate === 'Lost' ||
    fate === 'Captured' ||
    fate === 'Dead' ||
    fate === 'Pending'
  if (noHealing) return { ...unit, fate }

  const rad = unit.radDamage ?? 0
  const radToConvert = Math.ceil(rad / 2)
  const remainingRad = rad - radToConvert
  const regAfterConvert = (unit.regDamage ?? 0) + radToConvert
  const regToDiscard = Math.ceil(regAfterConvert / 2)
  const newReg = regAfterConvert - regToDiscard

  // Discard up to 1 condition. Priority P > IA > IL (player-pick UI not yet implemented).
  let condPoisoned = unit.condPoisoned ?? false
  let condInjuredArm = unit.condInjuredArm ?? false
  let condInjuredLeg = unit.condInjuredLeg ?? false
  if (condPoisoned) condPoisoned = false
  else if (condInjuredArm) condInjuredArm = false
  else if (condInjuredLeg) condInjuredLeg = false

  return {
    ...unit,
    fate,
    regDamage: newReg,
    radDamage: remainingRad,
    condPoisoned,
    condInjuredArm,
    condInjuredLeg,
  }
}
