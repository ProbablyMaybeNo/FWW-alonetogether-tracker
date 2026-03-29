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
