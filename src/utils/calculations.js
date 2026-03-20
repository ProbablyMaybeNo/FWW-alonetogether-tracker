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
    const ref = structuresById[s.structureId]
    return sum + (ref?.waterReq || 0)
  }, 0)
}

export function calcDefenseRating(structures) {
  let defense = 3
  structures.forEach(s => {
    const ref = structuresById[s.structureId]
    if (ref) defense += (ref.defenseValue || 0)
  })
  defense -= Math.floor(structures.length / 4)
  return defense
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
  const counts = { 'Stores': 0, 'Maint. Shed': 0, 'Locker': 0, 'Temp Pool': 0 }
  ;(itemPool?.items || []).forEach(item => {
    if (counts[item.location] !== undefined) counts[item.location]++
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
