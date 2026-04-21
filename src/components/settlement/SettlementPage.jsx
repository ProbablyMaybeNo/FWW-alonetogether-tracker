import { useState, useEffect } from 'react'
import { Plus, Trash2, RotateCcw, Zap, Droplets, Building2, Coins, Recycle, Shuffle, X, Sparkles, LayoutGrid, Map } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, getStructureRef, calcSettlementTotalCaps, calcDefenseRating } from '../../utils/calculations'
import AddStructureModal from './AddStructureModal'
import ItemPoolPanel from './ItemPoolPanel'
import { BarracksModal, MedicalCenterModal, StoresModal } from './StructureUseModals'
import { getDeckStats, drawCard } from '../../utils/cardDraw'
import CardDrawer from '../overview/CardDrawer'
import eventCardsData from '../../data/eventCards.json'
import exploreCardDeck from '../../data/exploreCardDeck.json'
import itemsData from '../../data/items.json'
import boostsData from '../../data/boosts.json'

// Parse "Draw X Y card(s), Keep Z" or "Draw & Keep X Y" from structure effect text
function parseDrawEffect(effect) {
  if (!effect) return null
  const m1 = effect.match(/Draw (\d+) (.+?) cards?, Keep (\d+)/i)
  if (m1) return { drawCount: parseInt(m1[1]), keepCount: parseInt(m1[3]), typeLabel: m1[2].trim() }
  const m2 = effect.match(/Draw & Keep (\d+) (.+?)(?:\s*[\.(]|$)/i)
  if (m2) { const n = parseInt(m2[1]); return { drawCount: n, keepCount: n, typeLabel: m2[2].trim() } }
  return null
}


// ── Settlement Item Deck ──────────────────────────────────────
const SETTLEMENT_DECK_TYPES = ['Pistol','Rifle','Heavy Weapon','Melee','Grenade','Mine','Armor','Clothing','Food','Drink','Chem','Utility','Mod']

const DECK_FILTER_OPTIONS = [
  { id: 'any',        label: 'ANY',        types: [...SETTLEMENT_DECK_TYPES, 'Boost'] },
  { id: 'weapon',     label: 'WEAPON',     types: ['Pistol','Rifle','Heavy Weapon','Melee','Grenade','Mine'] },
  { id: 'armor',      label: 'ARMOR',      types: ['Armor','Clothing'] },
  { id: 'consumable', label: 'CONSUMABLE', types: ['Food','Drink','Chem'] },
  { id: 'mod',        label: 'MOD',        types: ['Mod'] },
  { id: 'utility',    label: 'UTILITY',    types: ['Utility'] },
  { id: 'boost',      label: 'BOOST',      types: ['Boost'] },
]

// Boost card type colours
const BOOST_TYPE_STYLE = {
  tactical:   { color: '#fbbf24', shadow: 'rgba(251,191,36,0.55)',  label: 'TACTICAL' },
  instinctive:{ color: '#00b65a', shadow: 'rgba(0,182,90,0.55)',    label: 'INSTINCTIVE' },
  cunning:    { color: '#00a0ff', shadow: 'rgba(0,160,255,0.55)',   label: 'CUNNING' },
  practiced:  { color: '#a855f7', shadow: 'rgba(168,85,247,0.55)', label: 'PRACTICED' },
}

function buildBoostDeckIds() {
  return boostsData.map(b => b.id)
}

const DECK_SUBTYPE_COLOR = {
  Pistol: 'text-amber', Rifle: 'text-amber', 'Heavy Weapon': 'text-amber', Melee: 'text-amber',
  Grenade: 'text-danger', Mine: 'text-danger',
  Armor: 'text-info', Clothing: 'text-info',
  Food: 'text-pip', Drink: 'text-pip', Chem: 'text-pip',
  Mod: 'text-amber', Utility: 'text-muted',
}

function buildFullDeckIds() {
  return itemsData.map(i => i.id)
}

function itemMatchesTypeLabel(item, typeLabel) {
  const label = typeLabel.toLowerCase()
  if (label.includes('power armor')) return item.subType === 'Mod' && item.name.toLowerCase().includes('power armor')
  if (label.includes('creature mod')) return item.subType === 'Mod' && item.name.toLowerCase().includes('creature')
  if (label.includes('armor mod')) return item.subType === 'Mod'
  if (label.includes('weapon')) return ['Pistol','Rifle','Heavy Weapon','Melee','Grenade','Mine'].includes(item.subType)
  if (label.includes('armor')) return item.subType === 'Armor'
  if (label.includes('clothing')) return item.subType === 'Clothing'
  if (label.includes('drink')) return item.subType === 'Drink'
  if (label.includes('food')) return item.subType === 'Food'
  if (label.includes('chem')) return item.subType === 'Chem'
  if (label.includes('junk') || label.includes('gear')) return ['Utility','Mod','Automatron Part'].includes(item.subType)
  if (label.includes('mod')) return item.subType === 'Mod'
  return SETTLEMENT_DECK_TYPES.includes(item.subType)
}
// ─────────────────────────────────────────────────────────────

const CONDITION_OPTIONS = ['Undamaged', 'Damaged', 'Badly Damaged', 'Wrecked', 'Reinforced']

function structureConditionDotClass(condition) {
  if (condition === 'Undamaged' || condition === 'Reinforced') return 'bg-pip shadow-[0_0_6px_var(--color-pip-glow)]'
  if (condition === 'Damaged') return 'bg-amber shadow-[0_0_6px_rgba(251,191,36,0.45)]'
  if (condition === 'Badly Damaged') return 'bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.45)]'
  if (condition === 'Wrecked') return 'bg-danger shadow-[0_0_6px_var(--color-danger-glow)]'
  return 'bg-muted'
}

// Free Phase 3 starting structures: 2x Generator-Small(1), Stores(53), Maintenance Shed(54), Listening Post(50)
const PHASE3_FREE_IDS = [1, 1, 53, 54, 50]

// Homestead starting: 1x Land, 2x Generator-Small, Stores, Maintenance Shed, Listening Post, Resource Stand, Hut
const HOMESTEAD_FREE_IDS = [69, 1, 1, 53, 54, 50, 65, 77]

// Structures with special use handlers
const SPECIAL_STRUCTURE_NAMES = ['Listening Post', 'Ranger Outpost', 'Scout Camp', 'Barracks', 'Medical Center', 'Stores']

const SETTLEMENT_SUB_TABS = [
  { id: 'structures', label: 'STRUCTURES' },
  { id: 'deck',       label: 'ITEM + BOOST DECKS' },
  { id: 'explore',    label: 'EXPLORE' },
]

const EXPLORE_EVENT_FILTERS = [
  { id: 'all', label: 'ALL' },
  { id: 'available', label: 'AVAILABLE' },
  { id: 'drawn', label: 'DRAWN' },
  { id: 'inPlay', label: 'IN PLAY' },
  { id: 'complete', label: 'COMPLETE' },
]

export default function SettlementPage() {
  const { state, setState } = useCampaign()
  const settings = state?.settings ?? {}
  const [subTab, setSubTab] = useState('structures')
  const [step, setStep] = useState(0)
  const [showAddStructure, setShowAddStructure] = useState(false)
  const [atValidOnly, setAtValidOnly] = useState(() => settings?.settlementMode !== 'homestead')
  const [showBarracks, setShowBarracks] = useState(false)
  const [showMedCenter, setShowMedCenter] = useState(false)
  const [showStores, setShowStores] = useState(false)
  // Lost model recovery: array of units to check
  const [lostRecoveryQueue, setLostRecoveryQueue] = useState([])
  const [pendingExploreCard, setPendingExploreCard] = useState(null)
  const [pendingIsScoutCamp, setPendingIsScoutCamp] = useState(false)
  const [pendingItemDraw, setPendingItemDraw] = useState(null)
  const [deckFilter, setDeckFilter] = useState('any')
  const [recentlyDrawn, setRecentlyDrawn] = useState([])

  const structures = state.settlement.structures || []
  const phase = state.phase ?? 1
  const caps = state.caps ?? 0
  const landPurchased = state.settlement.landPurchased ?? false
  const landCount = state.settlement.landCount ?? (landPurchased ? 1 : 0)
  const maxSlots = 15 + (landCount * 10)
  const usedSlots = structures.reduce((sum, s) => {
    const ref = getStructureRef(s.structureId)
    return sum + (ref?.size || 1)
  }, 0)

  const pwrGen = calcPowerGenerated(structures)
  const pwrUsed = calcPowerConsumed(structures)
  const waterGen = calcWaterGenerated(structures)
  const waterUsed = calcWaterConsumed(structures)
  const totalCost = calcSettlementTotalCaps(structures)
  const usedCount = structures.filter(s => s.usedThisRound).length
  const resources = state.settlement.resources ?? 0
  const resourceSheds = structures.filter(s => getStructureRef(s.structureId)?.name === 'Resource Shed')
  const maxResources = resourceSheds.reduce((sum, s) => {
    const ref = getStructureRef(s.structureId)
    return sum + (ref?.size ?? 4) * 2
  }, 0)

  // Quest-based land claim
  const completedQuestCount = (state.questCards || []).filter(q => q.status === 'Complete').length

  const roster = state.roster || []

  function handleAddStructure(structure) {
    const ref = getStructureRef(structure.structureId)
    const cost = ref?.cost || 0
    setState(prev => ({
      ...prev,
      caps: Math.max(0, (prev.caps ?? 0) - cost),
      settlement: { ...prev.settlement, structures: [...prev.settlement.structures, structure] },
    }))
  }

  function handleRemoveStructure(instanceId) {
    if (!confirm('Remove this structure?')) return
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.filter(s => s.instanceId !== instanceId),
      },
    }))
  }

  function handleAdjustResources(delta) {
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        resources: Math.max(0, (prev.settlement.resources ?? 0) + delta),
      },
    }))
  }

  function handleReinforceStructure(instanceId) {
    const resources = state.settlement.resources ?? 0
    if (resources < 2) { alert('Need 2 Resources to reinforce.'); return }
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        resources: (prev.settlement.resources ?? 0) - 2,
        structures: prev.settlement.structures.map(s =>
          s.instanceId === instanceId ? { ...s, condition: 'Reinforced' } : s
        ),
      },
    }))
  }

  function handleRepairStructure(instanceId) {
    const s = structures.find(st => st.instanceId === instanceId)
    if (!s) return
    if (s.condition === 'Wrecked') { alert('Wrecked structures cannot be repaired.'); return }
    const resources = state.settlement.resources ?? 0
    if (resources < 2) { alert('Need 2 Resources to repair.'); return }
    const next = s.condition === 'Badly Damaged' ? 'Damaged' : 'Undamaged'
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        resources: (prev.settlement.resources ?? 0) - 2,
        structures: prev.settlement.structures.map(st =>
          st.instanceId === instanceId ? { ...st, condition: next } : st
        ),
      },
    }))
  }

  function handleScrapStructure(instanceId) {
    const s = structures.find(st => st.instanceId === instanceId)
    if (!s) return
    const ref = getStructureRef(s.structureId)
    if (!ref) return
    const scrapValue = Math.floor((ref.cost || 0) / 2)
    if (!confirm(`Scrap ${ref.name} for ${scrapValue}c?`)) return
    setState(prev => ({
      ...prev,
      caps: (prev.caps || 0) + scrapValue,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.filter(st => st.instanceId !== instanceId),
      },
    }))
  }

  function checkLostUnits(exploreCount) {
    const lost = roster.filter(u => u.fate === 'Lost')
    if (lost.length > 0) {
      setLostRecoveryQueue(lost.map(u => ({ ...u, exploreCount })))
    }
  }

  function handleToggleUsed(instanceId) {
    const s = structures.find(st => st.instanceId === instanceId)
    if (!s) return
    const ref = getStructureRef(s.structureId)
    const structureName = ref?.name || ''
    const togglingOn = !s.usedThisRound

    // Pre-draw explore card before setState (needs current eventCards state)
    let drawnCard = null
    if (togglingOn && ['Listening Post', 'Ranger Outpost', 'Scout Camp'].includes(structureName)) {
      drawnCard = drawCard('explore', state.eventCards, eventCardsData)
    }

    setState(prev => {
      const newUsed = !s.usedThisRound
      const newStructures = prev.settlement.structures.map(st =>
        st.instanceId === instanceId ? { ...st, usedThisRound: newUsed } : st
      )

      if (!newUsed) {
        return { ...prev, settlement: { ...prev.settlement, structures: newStructures } }
      }

      let extraUpdates = {}

      if (structureName === 'Listening Post') {
        const deduct = confirm('Listening Post use costs 50c. Deduct from caps?\n\n[OK = Deduct 50c | Cancel = Skip]')
        extraUpdates.caps = deduct ? Math.max(0, (prev.caps || 0) - 50) : prev.caps
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        if (drawnCard) extraUpdates.eventCards = { ...prev.eventCards, [drawnCard.id]: { drawn: true } }
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Ranger Outpost') {
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        if (drawnCard) extraUpdates.eventCards = { ...prev.eventCards, [drawnCard.id]: { drawn: true } }
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Scout Camp') {
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        if (drawnCard) extraUpdates.eventCards = { ...prev.eventCards, [drawnCard.id]: { drawn: true } }
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Barracks') {
        setTimeout(() => setShowBarracks(true), 100)
      } else if (structureName === 'Medical Center') {
        setTimeout(() => setShowMedCenter(true), 100)
      } else if (structureName === 'Stores') {
        setTimeout(() => setShowStores(true), 100)
      } else {
        // Equipment draw mechanic — draw from Settlement Item Deck
        const drawDef = parseDrawEffect(ref?.effect)
        if (drawDef) {
          // Compute deck draw now using current state (same pattern as explore card draw)
          const allIds = buildFullDeckIds()
          const hasDeckData = (state.settlementDeck?.length > 0 || state.settlementDiscard?.length > 0)
          let deckArr = hasDeckData
            ? [...(state.settlementDeck ?? [])]
            : [...allIds].sort(() => Math.random() - 0.5)
          let discardArr = hasDeckData
            ? [...(state.settlementDiscard ?? [])]
            : []

          if (deckArr.length === 0 && discardArr.length === 0) {
            deckArr = [...allIds].sort(() => Math.random() - 0.5)
          }

          const drawnCards = []
          let foundItem = null
          let attempts = 0
          const maxAttempts = allIds.length * 2 + 10

          while (attempts < maxAttempts) {
            if (deckArr.length === 0) {
              if (discardArr.length === 0) break
              deckArr = [...discardArr].sort(() => Math.random() - 0.5)
              discardArr = []
            }
            const id = deckArr.shift()
            const item = itemsData.find(i => i.id === id)
            if (!item) { attempts++; continue }
            drawnCards.push(item)
            discardArr.push(id)
            if (itemMatchesTypeLabel(item, drawDef.typeLabel)) {
              foundItem = item
              break
            }
            attempts++
          }

          extraUpdates.settlementDeck = deckArr
          extraUpdates.settlementDiscard = discardArr

          if (drawnCards.length > 0) {
            setTimeout(() => setPendingItemDraw({
              structureName,
              typeLabel: drawDef.typeLabel,
              keepCount: drawDef.keepCount,
              drawnCards,
              foundItem,
              deckDraw: true,
            }), 150)
          }
        }
      }

      return {
        ...prev,
        ...extraUpdates,
        settlement: { ...prev.settlement, structures: newStructures },
      }
    })

    // Show drawn explore card modal
    if (drawnCard) {
      setTimeout(() => {
        setPendingIsScoutCamp(structureName === 'Scout Camp')
        setPendingExploreCard(drawnCard)
      }, 150)
    }
  }

  function handleTogglePowered(instanceId) {
    const s = structures.find(st => st.instanceId === instanceId)
    if (!s) return
    const ref = getStructureRef(s.structureId)
    if (!ref) return

    if (!s.powered) {
      const netPower = pwrGen - pwrUsed
      const netWater = waterGen - waterUsed
      if (ref.pwrReq > 0 && netPower < ref.pwrReq) {
        alert(`Not enough power. Need ${ref.pwrReq}⚡, only ${netPower}⚡ available.`)
        return
      }
      if (ref.waterReq > 0 && netWater < ref.waterReq) {
        alert(`Not enough water. Need ${ref.waterReq}💧, only ${netWater}💧 available.`)
        return
      }
    }

    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(st =>
          st.instanceId === instanceId ? { ...st, powered: !st.powered } : st
        ),
      },
    }))
  }

  function handleUpdateStructure(instanceId, field, value) {
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(s =>
          s.instanceId === instanceId ? { ...s, [field]: value } : s
        ),
      },
    }))
  }

  function handleResetRound() {
    if (!confirm('Reset all structures for new round? (Clears powered and used status)')) return
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(s => ({ ...s, usedThisRound: false, powered: false })),
      },
    }))
  }

  function handleBuyLand() {
    const currentLand = state.settlement.landCount ?? (landPurchased ? 1 : 0)
    if (!confirm(`Purchase additional land for 500c? This adds 10 extra structure slots. (Current land: ${currentLand})`)) return
    setState(prev => ({
      ...prev,
      caps: Math.max(0, (prev.caps ?? 0) - 500),
      settlement: { ...prev.settlement, landPurchased: true, landCount: (prev.settlement.landCount ?? (prev.settlement.landPurchased ? 1 : 0)) + 1 },
    }))
  }

  function handleClaimLandViaQuests() {
    if (!confirm('Claim additional land via 5 completed quests? (No cap cost)')) return
    setState(prev => ({
      ...prev,
      settlement: { ...prev.settlement, landPurchased: true, landCount: (prev.settlement.landCount ?? (prev.settlement.landPurchased ? 1 : 0)) + 1 },
    }))
  }

  function handlePhase3Setup() {
    const isHomestead = settings?.settlementMode === 'homestead'
    const freeIds = isHomestead ? HOMESTEAD_FREE_IDS : PHASE3_FREE_IDS
    const label = isHomestead
      ? 'Add free Homestead starting structures? (Land, 2× Generator–Small, Stores, Maintenance Shed, Listening Post, Resource Stand, Hut)'
      : 'Add free AT starting structures? (2× Generator–Small, Stores, Maintenance Shed, Listening Post)'
    if (!confirm(label)) return
    const newStructures = freeIds.map(id => ({
      instanceId: Date.now() + Math.random(),
      structureId: id,
      usedThisRound: false,
      powered: false,
      condition: 'Undamaged',
      notes: '',
    }))
    setState(prev => ({
      ...prev,
      phase: 4,
      settlement: {
        ...prev.settlement,
        structures: [...prev.settlement.structures, ...newStructures],
      },
    }))
  }

  function handleBarracksApply(unitSlotId, condKey) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === unitSlotId ? { ...u, [condKey]: false } : u
      ),
    }))
  }

  function handleMedCenterApply(unitSlotId, action) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u => {
        if (u.slotId !== unitSlotId) return u
        if (action === 'heal') {
          return { ...u, regDamage: Math.max(0, (u.regDamage || 0) - 2) }
        } else if (action === 'addiction') {
          return { ...u, addiction: '' }
        }
        return u
      }),
    }))
  }

  function handleStoresApply(selections) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(item => {
          const sel = selections.find(s => s.id === item.id)
          if (!sel) return item
          return { ...item, location: 'stores', assignedUnit: sel.unitSlotId ?? null }
        }),
      },
    }))
  }

  // Lost recovery handlers
  const currentLostUnit = lostRecoveryQueue[0] || null

  function handleMarkFound(unitSlotId) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === unitSlotId ? { ...u, fate: 'Active' } : u
      ),
    }))
    setLostRecoveryQueue(prev => prev.slice(1))
  }

  function handleNotFound() {
    setLostRecoveryQueue(prev => prev.slice(1))
  }

  // ── Settlement Item Deck helpers ──────────────────────────────
  function getInitializedDeck() {
    const deck = state.settlementDeck ?? []
    const discard = state.settlementDiscard ?? []
    if (deck.length === 0 && discard.length === 0) {
      return { deck: [...buildFullDeckIds()].sort(() => Math.random() - 0.5), discard: [] }
    }
    return { deck, discard }
  }

  function drawManualFromDeck() {
    const allIds = buildFullDeckIds()
    const filterTypes = DECK_FILTER_OPTIONS.find(f => f.id === deckFilter)?.types || SETTLEMENT_DECK_TYPES
    let { deck, discard } = getInitializedDeck()
    deck = [...deck]
    discard = [...discard]

    if (deck.length === 0 && discard.length === 0) return null

    let foundItem = null
    let attempts = 0
    const maxAttempts = allIds.length + 10

    while (attempts < maxAttempts) {
      if (deck.length === 0) {
        if (discard.length === 0) break
        deck = [...discard].sort(() => Math.random() - 0.5)
        discard = []
      }
      const id = deck.shift()
      const item = itemsData.find(i => i.id === id)
      if (!item) { attempts++; continue }
      discard.push(id)
      if (filterTypes.includes(item.subType)) {
        foundItem = item
        break
      }
      attempts++
    }

    setState(prev => ({ ...prev, settlementDeck: deck, settlementDiscard: discard }))
    if (foundItem) {
      setRecentlyDrawn(prev => [{ ...foundItem, drawnAt: Date.now() }, ...prev.slice(0, 19)])
    }
    return foundItem
  }

  function reshuffleDeck() {
    const discard = state.settlementDiscard ?? []
    setState(prev => ({
      ...prev,
      settlementDeck: [...discard].sort(() => Math.random() - 0.5),
      settlementDiscard: [],
    }))
  }

  function fullResetDeck() {
    if (!confirm('Reset Settlement Item Deck? This shuffles all cards back in.')) return
    setState(prev => ({
      ...prev,
      settlementDeck: [...buildFullDeckIds()].sort(() => Math.random() - 0.5),
      settlementDiscard: [],
    }))
    setRecentlyDrawn([])
  }

  function addRecentlyDrawnToPool(item) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [
          ...(prev.itemPool?.items || []),
          {
            id: Date.now() + Math.random(),
            catalogId: item.id,
            name: item.name,
            caps: item.caps,
            subType: item.subType,
            isBoost: false,
            location: 'stored',
            assignedUnit: null,
          },
        ],
      },
    }))
  }
  // ─────────────────────────────────────────────────────────────

  // ── Wizard handler functions ──────────────────────────────────
  function handleRestRoster() {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u => u.fate === 'Active' ? {
        ...u,
        regDamage: Math.max(0, (u.regDamage || 0) - 1),
      } : u),
    }))
  }

  function handleSellItem(itemId) {
    const item = (state.itemPool?.items || []).find(i => i.id === itemId)
    if (!item) return
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + (item.caps ?? 0),
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => i.id !== itemId) },
    }))
  }

  function handleSellAllAtLocation(location) {
    const selling = (state.itemPool?.items || []).filter(i => i.location === location)
    const total = selling.reduce((s, i) => s + (i.caps ?? 0), 0)
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + total,
      itemPool: { ...prev.itemPool, items: (prev.itemPool?.items || []).filter(i => i.location !== location) },
    }))
  }

  function handleMoveItem(itemId, toLocation) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: (prev.itemPool?.items || []).map(i => i.id === itemId ? { ...i, location: toLocation } : i),
      },
    }))
  }
  // ─────────────────────────────────────────────────────────────

  function handleItemDrawKeep(keptItems) {
    if (!keptItems.length) return
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [
          ...(prev.itemPool?.items || []),
          ...keptItems.map(item => ({
            id: Date.now() + Math.random(),
            catalogId: item.id,
            name: item.name,
            caps: item.caps,
            subType: item.subType,
            isBoost: false,
            location: 'stored',
            assignedUnit: null,
          })),
        ],
      },
    }))
  }

  // Shared props for StructuresPanel
  const structuresPanelProps = {
    state, setState,
    structures, phase, caps,
    landPurchased, landCount, maxSlots, usedSlots,
    pwrGen, pwrUsed, waterGen, waterUsed,
    totalCost, usedCount, completedQuestCount, roster,
    atValidOnly, setAtValidOnly,
    showAddStructure, setShowAddStructure,
    showBarracks, setShowBarracks,
    showMedCenter, setShowMedCenter,
    showStores, setShowStores,
    currentLostUnit,
    handleAddStructure, handleRemoveStructure, handleScrapStructure,
    handleToggleUsed, handleTogglePowered, handleUpdateStructure, handleResetRound,
    handleBuyLand, handleClaimLandViaQuests, handlePhase3Setup,
    handleBarracksApply, handleMedCenterApply, handleStoresApply,
    handleMarkFound, handleNotFound,
    resources, maxResources, handleAdjustResources,
    handleReinforceStructure, handleRepairStructure,
    settings,
  }

  const WIZARD_STEPS = [
    { n: 1, label: 'REST & RECOVERY' },
    { n: 2, label: 'BUILD & HIRE' },
    { n: 3, label: 'USE STRUCTURES' },
    { n: 4, label: 'ASSIGN TO BATTLE' },
  ]

  const itemPoolItems = state.itemPool?.items || []
  const recoveryPoolItems = itemPoolItems.filter(i => i.location === 'recovery')
  const maintShedItems = itemPoolItems.filter(i => i.location === 'Maint. Shed')
  const storedPoolItems = itemPoolItems.filter(i => i.location === 'stored')
  const lockerPoolItems = itemPoolItems.filter(i => i.location === 'locker')
  const storesPoolItems = itemPoolItems.filter(i => i.location === 'stores')

  const activeRoster = roster.filter(u => u.fate === 'Active' && (u.regDamage || 0) > 0)
  const woundsToHeal = activeRoster.length

  const usableStructures = structures.filter(s => {
    const ref = getStructureRef(s.structureId)
    if (!ref) return false
    if (s.condition === 'Wrecked') return false
    const needsPower = (ref.pwrReq > 0) || (ref.waterReq > 0)
    const selfPowering = !needsPower
    const isPowered = selfPowering || s.powered
    return isPowered
  })

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Modals — always at top level */}
      {pendingExploreCard && (
        <ExploreCardModal
          card={pendingExploreCard}
          isScoutCamp={pendingIsScoutCamp}
          onRedraw={() => {
            const newCard = drawCard('explore', state.eventCards, eventCardsData)
            if (newCard) {
              setState(prev => ({
                ...prev,
                eventCards: { ...prev.eventCards, [newCard.id]: { drawn: true } },
              }))
              setPendingExploreCard(newCard)
            }
          }}
          onAddToEvents={() => {
            setState(prev => ({
              ...prev,
              eventCards: { ...prev.eventCards, [pendingExploreCard.id]: { drawn: true, inPlay: true } },
              activeEvents: [
                ...(prev.activeEvents || []),
                {
                  cardId: pendingExploreCard.id,
                  name: pendingExploreCard.name,
                  text: pendingExploreCard.consequence,
                  consequence: '',
                  type: 'EXPLORE CONSEQUENCE',
                  sinceRound: prev.round,
                },
              ],
            }))
            setPendingExploreCard(null)
          }}
          onDismiss={() => setPendingExploreCard(null)}
        />
      )}

      {pendingItemDraw && (
        pendingItemDraw.deckDraw ? (
          <DeckDrawModal
            draw={pendingItemDraw}
            onKeep={handleItemDrawKeep}
            onClose={() => setPendingItemDraw(null)}
          />
        ) : (
          <ItemDrawModal
            draw={pendingItemDraw}
            onKeep={handleItemDrawKeep}
            onClose={() => setPendingItemDraw(null)}
          />
        )
      )}

      {/* ── STEP 0 — Landing ── */}
      {step === 0 && (
        <div className="space-y-4">
          {/* Hero action */}
          <div className="border-2 border-amber rounded-xl bg-amber/5 p-6 text-center" style={{ boxShadow: '0 0 32px var(--color-amber-glow)' }}>
            <div className="text-title text-xs font-bold tracking-widest mb-1 opacity-60">SETTLEMENT PHASE</div>
            <h2 className="text-amber text-lg font-bold tracking-widest mb-4">READY TO BEGIN?</h2>
            <button
              onClick={() => setStep(1)}
              className="min-h-[44px] px-8 py-3 border-2 border-amber text-amber bg-amber/10 font-bold tracking-widest text-sm hover:bg-amber/20 transition-colors"
              style={{ boxShadow: '0 0 24px var(--color-amber-glow)' }}
            >
              BEGIN SETTLEMENT PHASE
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border border-amber/50 rounded bg-panel p-3 text-center">
              <div className="text-amber font-bold text-lg">{caps.toLocaleString()}c</div>
              <div className="text-muted text-xs">CAPS</div>
            </div>
            <div className="border border-pip-mid/50 rounded bg-panel p-3 text-center">
              <div className="text-pip font-bold text-lg">{recoveryPoolItems.length}</div>
              <div className="text-muted text-xs">RECOVERY ITEMS</div>
            </div>
            <div className="border border-pip-mid/50 rounded bg-panel p-3 text-center">
              <div className="text-pip font-bold text-lg">{structures.length}</div>
              <div className="text-muted text-xs">STRUCTURES</div>
            </div>
          </div>
        </div>
      )}

      {/* ── WIZARD STEPS 1-4 ── */}
      {step >= 1 && (
        <div className="space-y-4">
          {/* Step bar */}
          <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-panel/95 backdrop-blur-sm border-b border-pip-dim/40">
            <div className="flex gap-1">
              {WIZARD_STEPS.map(s => {
                const isComplete = step > s.n
                const isCurrent = step === s.n
                const isFuture = step < s.n
                return (
                  <button
                    key={s.n}
                    onClick={() => isComplete && setStep(s.n)}
                    disabled={isFuture}
                    className={`flex-1 min-h-[44px] py-1.5 rounded border text-xs font-bold tracking-wider transition-colors flex flex-col items-center justify-center gap-0.5 ${
                      isCurrent
                        ? 'border-amber bg-amber/10 text-amber'
                        : isComplete
                        ? 'border-pip/60 bg-pip-dim/20 text-pip cursor-pointer hover:bg-pip-dim/30'
                        : 'border-pip-dim/20 text-dim cursor-not-allowed opacity-40'
                    }`}
                    style={isCurrent ? { boxShadow: '0 0 12px var(--color-amber-glow)' } : {}}
                  >
                    <span className="text-xs opacity-70">{s.n}</span>
                    <span className="hidden sm:block leading-tight text-center" style={{ fontSize: '0.6rem' }}>{s.label}</span>
                    {isComplete && <span className="text-pip text-xs">✓</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── STEP 1 — REST & RECOVERY ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-amber text-sm font-bold tracking-widest">STEP 1 — REST & RECOVERY</h2>

              {/* Rest Roster */}
              <div className="border border-pip-mid/50 rounded bg-panel p-4 space-y-3">
                <div className="text-title text-xs font-bold tracking-widest">ROSTER REST</div>
                <p className="text-muted text-xs">
                  Active units with wounds heal 1 regular damage.
                  {woundsToHeal > 0
                    ? <span className="text-pip font-bold"> {woundsToHeal} unit{woundsToHeal !== 1 ? 's' : ''} will be healed.</span>
                    : <span className="text-muted"> No active units with wounds.</span>
                  }
                </p>
                <button
                  onClick={handleRestRoster}
                  disabled={woundsToHeal === 0}
                  className="min-h-[44px] px-6 border-2 border-amber text-amber bg-amber/10 text-xs font-bold tracking-wider hover:bg-amber/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  REST ROSTER {woundsToHeal > 0 ? `(−1 wound × ${woundsToHeal})` : ''}
                </button>
              </div>

              {/* Recovery Pool */}
              <div className="border border-pip-mid/50 rounded bg-panel p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-title text-xs font-bold tracking-widest">RECOVERY POOL ({recoveryPoolItems.length})</div>
                  {recoveryPoolItems.length > 0 && (
                    <button
                      onClick={() => {
                        const total = recoveryPoolItems.reduce((s, i) => s + (i.caps ?? 0), 0)
                        if (confirm(`Sell all ${recoveryPoolItems.length} recovery items for ${total}c?`)) {
                          handleSellAllAtLocation('recovery')
                        }
                      }}
                      className="min-h-[44px] px-4 border border-danger/60 text-danger text-xs font-bold hover:bg-danger/5 transition-colors"
                    >
                      SELL ALL RECOVERY ({recoveryPoolItems.reduce((s, i) => s + (i.caps ?? 0), 0)}c)
                    </button>
                  )}
                </div>
                {recoveryPoolItems.length === 0 ? (
                  <p className="text-muted text-xs">No items in recovery pool.</p>
                ) : (
                  <div className="space-y-1">
                    {recoveryPoolItems.map(item => (
                      <div key={item.id} className="border border-pip-dim/30 rounded p-2 flex items-center justify-between gap-2 text-xs flex-wrap">
                        <span className="text-pip flex-1 min-w-0">{item.name}</span>
                        <span className="text-muted px-1.5 py-0.5 border border-muted/30 rounded">{item.subType}</span>
                        <span className="text-amber font-bold">{item.caps}c</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'stored')}
                            className="min-h-[44px] px-3 border border-muted/30 text-muted hover:text-pip hover:border-pip transition-colors text-xs"
                          >KEEP</button>
                          <button
                            onClick={() => handleSellItem(item.id)}
                            className="min-h-[44px] px-3 border border-danger/60 text-danger hover:bg-danger/5 transition-colors text-xs"
                          >SELL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Maintenance Shed Items */}
              {maintShedItems.length > 0 && (
                <div className="border border-pip-mid/50 rounded bg-panel p-4 space-y-3">
                  <div className="text-title text-xs font-bold tracking-widest">MAINTENANCE SHED ({maintShedItems.length})</div>
                  <div className="space-y-1">
                    {maintShedItems.map(item => (
                      <div key={item.id} className="border border-pip-dim/30 rounded p-2 flex items-center justify-between gap-2 text-xs flex-wrap">
                        <span className="text-pip flex-1 min-w-0">{item.name}</span>
                        <span className="text-muted px-1.5 py-0.5 border border-muted/30 rounded">{item.subType}</span>
                        <span className="text-amber font-bold">{item.caps}c</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleMoveItem(item.id, 'stored')}
                            className="min-h-[44px] px-3 border border-muted/30 text-muted hover:text-pip hover:border-pip transition-colors text-xs"
                          >KEEP</button>
                          <button
                            onClick={() => handleSellItem(item.id)}
                            className="min-h-[44px] px-3 border border-danger/60 text-danger hover:bg-danger/5 transition-colors text-xs"
                          >SELL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                className="w-full min-h-[44px] border-2 border-amber/80 bg-amber/15 text-amber text-sm font-bold tracking-widest hover:bg-amber/25 transition-colors"
                style={{ boxShadow: '0 0 24px var(--color-amber-glow)' }}
              >
                DONE — GO TO BUILD & HIRE
              </button>
            </div>
          )}

          {/* ── STEP 2 — BUILD & HIRE ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-amber text-sm font-bold tracking-widest">STEP 2 — BUILD & HIRE</h2>

              {/* Caps display */}
              <div className="border border-amber/60 rounded bg-panel px-4 py-3 flex items-center gap-3">
                <Coins size={16} className="text-amber" />
                <div>
                  <div className="text-amber font-bold text-xl">{caps.toLocaleString()}c</div>
                  <div className="text-muted text-xs">Available Caps</div>
                </div>
              </div>

              <StructuresPanel {...structuresPanelProps} />

              <button
                onClick={() => setStep(3)}
                className="w-full min-h-[44px] border-2 border-amber/80 bg-amber/15 text-amber text-sm font-bold tracking-widest hover:bg-amber/25 transition-colors"
                style={{ boxShadow: '0 0 24px var(--color-amber-glow)' }}
              >
                DONE — GO TO USE STRUCTURES
              </button>
            </div>
          )}

          {/* ── STEP 3 — USE STRUCTURES ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-amber text-sm font-bold tracking-widest">STEP 3 — USE STRUCTURES</h2>

              {usableStructures.length === 0 ? (
                <div className="border border-pip-dim/30 rounded p-6 text-center">
                  <p className="text-muted text-xs">No usable structures available.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {usableStructures.map(s => {
                    const ref = getStructureRef(s.structureId)
                    if (!ref) return null
                    const isSpecial = SPECIAL_STRUCTURE_NAMES.includes(ref.name)
                    return (
                      <div
                        key={s.instanceId}
                        className={`border rounded p-3 transition-colors ${
                          s.usedThisRound
                            ? 'border-pip-dim/20 bg-panel-alt opacity-50'
                            : isSpecial
                            ? 'border-amber/40 bg-panel'
                            : 'border-pip-mid/40 bg-panel'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-xs font-bold ${s.usedThisRound ? 'text-muted/50' : isSpecial ? 'text-amber' : 'text-pip'}`}>{ref.name}</span>
                              {ref.pwrReq > 0 && <span className="text-xs text-muted">req {ref.pwrReq}⚡</span>}
                              {ref.waterReq > 0 && <span className="text-xs text-muted">req {ref.waterReq}💧</span>}
                              {s.condition !== 'Undamaged' && s.condition !== 'Reinforced' && (
                                <span className="text-danger text-xs">{s.condition}</span>
                              )}
                            </div>
                            <p className="text-muted text-xs mt-0.5 leading-relaxed">{ref.effect}</p>
                          </div>
                          {s.usedThisRound ? (
                            <span className="text-xs text-dim border border-pip-dim/20 px-3 py-2 rounded font-bold">USED ✓</span>
                          ) : (
                            <button
                              onClick={() => handleToggleUsed(s.instanceId)}
                              className={`min-h-[44px] px-4 border text-xs font-bold tracking-wider transition-colors ${
                                isSpecial
                                  ? 'border-amber text-amber hover:bg-amber/10'
                                  : 'border-pip text-pip hover:bg-pip-dim/30'
                              }`}
                            >
                              USE
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Settlement pool live preview */}
              <div className="border border-pip-mid/40 rounded bg-panel-alt px-4 py-3">
                <div className="text-title text-xs font-bold tracking-widest mb-1">SETTLEMENT POOL</div>
                <div className="text-pip font-bold text-lg">{storedPoolItems.length} <span className="text-muted text-xs font-normal">items stored</span></div>
              </div>

              <button
                onClick={() => setStep(4)}
                className="w-full min-h-[44px] border-2 border-amber/80 bg-amber/15 text-amber text-sm font-bold tracking-widest hover:bg-amber/25 transition-colors"
                style={{ boxShadow: '0 0 24px var(--color-amber-glow)' }}
              >
                DONE — GO TO ASSIGN TO BATTLE
              </button>
            </div>
          )}

          {/* ── STEP 4 — ASSIGN TO BATTLE ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-amber text-sm font-bold tracking-widest">STEP 4 — ASSIGN TO BATTLE</h2>

              {/* Settlement Pool — assign items */}
              <div className="border border-pip-mid/50 rounded bg-panel p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="text-title text-xs font-bold tracking-widest">SETTLEMENT POOL ({storedPoolItems.length})</div>
                  {storedPoolItems.length > 0 && (
                    <button
                      onClick={() => {
                        const total = storedPoolItems.reduce((s, i) => s + (i.caps ?? 0), 0)
                        if (confirm(`Sell all ${storedPoolItems.length} stored items for ${total}c?`)) {
                          handleSellAllAtLocation('stored')
                        }
                      }}
                      className="min-h-[44px] px-4 border border-danger/60 text-danger text-xs font-bold hover:bg-danger/5 transition-colors"
                    >
                      SELL ALL REMAINING ({storedPoolItems.reduce((s, i) => s + (i.caps ?? 0), 0)}c)
                    </button>
                  )}
                </div>
                {storedPoolItems.length === 0 ? (
                  <p className="text-muted text-xs">No items in settlement pool.</p>
                ) : (
                  <div className="space-y-1">
                    {storedPoolItems.map(item => (
                      <div key={item.id} className="border border-pip-dim/30 rounded p-2 flex items-center justify-between gap-2 text-xs flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-pip flex-1 min-w-0">{item.name}</span>
                          <span className="text-muted px-1.5 py-0.5 border border-muted/30 rounded">{item.subType}</span>
                          <span className="text-amber font-bold">{item.caps}c</span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => handleMoveItem(item.id, 'locker')}
                            className="min-h-[44px] px-3 border border-muted/30 text-muted hover:text-pip hover:border-pip transition-colors text-xs"
                          >LOCKER</button>
                          <button
                            onClick={() => handleMoveItem(item.id, 'stores')}
                            className="min-h-[44px] px-3 border border-amber/60 text-amber bg-amber/5 hover:bg-amber/15 transition-colors text-xs font-bold"
                          >STORES — BATTLE POOL</button>
                          <button
                            onClick={() => handleSellItem(item.id)}
                            className="min-h-[44px] px-3 border border-danger/60 text-danger hover:bg-danger/5 transition-colors text-xs"
                          >SELL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Locker summary */}
              {lockerPoolItems.length > 0 && (
                <div className="border border-pip-dim/30 rounded bg-panel-alt px-4 py-3">
                  <div className="text-title text-xs font-bold tracking-widest mb-2">LOCKER ({lockerPoolItems.length})</div>
                  <div className="space-y-1">
                    {lockerPoolItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="text-pip flex-1 min-w-0">{item.name}</span>
                        <span className="text-amber">{item.caps}c</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Battle Pool summary */}
              {storesPoolItems.length > 0 && (
                <div className="border border-amber/40 rounded bg-panel-alt px-4 py-3">
                  <div className="text-title text-xs font-bold tracking-widest mb-2">BATTLE POOL — STORES ({storesPoolItems.length})</div>
                  <div className="space-y-1">
                    {storesPoolItems.map(item => (
                      <div key={item.id} className="flex items-center gap-2 text-xs">
                        <span className="text-amber font-bold flex-1 min-w-0">{item.name}</span>
                        <span className="text-muted">{item.subType}</span>
                        <span className="text-amber">{item.caps}c</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End Settlement */}
              <button
                onClick={() => {
                  handleResetRound()
                  setStep(0)
                }}
                className="w-full min-h-[44px] border-2 border-amber bg-amber/15 text-amber text-sm font-bold tracking-widest hover:bg-amber/25 transition-colors"
                style={{ boxShadow: '0 0 32px var(--color-amber-glow)' }}
              >
                END SETTLEMENT PHASE
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SETTLEMENT VIEW — always visible ── */}
      <div className="mt-8 border-t-2 border-pip-dim/30 pt-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-title text-xs font-bold tracking-widest">SETTLEMENT OVERVIEW</h2>
          {step > 0 && (
            <button
              onClick={() => setStep(0)}
              className="text-xs border border-muted/30 text-muted px-3 py-1.5 rounded hover:text-pip hover:border-pip transition-colors"
            >
              ← EXIT PHASE
            </button>
          )}
        </div>

        {/* Sub-tab switcher */}
        <div className="flex gap-1 mb-4">
          {SETTLEMENT_SUB_TABS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex-1 min-h-[44px] py-2 text-xs rounded border transition-colors font-bold tracking-wider ${
                subTab === t.id
                  ? 'border-pip bg-panel-light text-pip'
                  : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {subTab === 'structures' && <StructuresPanel {...structuresPanelProps} />}
        {subTab === 'deck' && (
          <SettlementDeckPanel
            state={state} setState={setState} structures={structures}
            deckFilter={deckFilter} setDeckFilter={setDeckFilter}
            recentlyDrawn={recentlyDrawn} setRecentlyDrawn={setRecentlyDrawn}
            drawManualFromDeck={drawManualFromDeck} reshuffleDeck={reshuffleDeck}
            fullResetDeck={fullResetDeck} addRecentlyDrawnToPool={addRecentlyDrawnToPool}
          />
        )}
        {subTab === 'explore' && <ExplorePanel state={state} setState={setState} />}
      </div>
    </div>
  )
}

/* ── Structures sub-panel ── */
function StructuresPanel({
  state, setState,
  structures, phase, caps, landPurchased, landCount, maxSlots, usedSlots,
  pwrGen, pwrUsed, waterGen, waterUsed, totalCost, usedCount,
  completedQuestCount, roster,
  atValidOnly, setAtValidOnly,
  showAddStructure, setShowAddStructure,
  showBarracks, setShowBarracks,
  showMedCenter, setShowMedCenter,
  showStores, setShowStores,
  currentLostUnit,
  handleAddStructure, handleRemoveStructure, handleScrapStructure,
  handleToggleUsed, handleTogglePowered, handleUpdateStructure, handleResetRound,
  handleBuyLand, handleClaimLandViaQuests, handlePhase3Setup,
  handleBarracksApply, handleMedCenterApply, handleStoresApply,
  handleMarkFound, handleNotFound,
  resources, maxResources, handleAdjustResources,
  handleReinforceStructure, handleRepairStructure,
  settings = {},
}) {
  const defenseRating = calcDefenseRating(structures)
  return (
    <>
      {/* Caps read-only */}
      <div className="mb-4 flex items-center gap-2 border border-amber/50 rounded px-3 py-2 bg-panel">
        <Coins size={14} className="text-amber" />
        <span className="text-xs text-muted">CAPS:</span>
        <span className="text-amber font-bold text-sm">{(caps).toLocaleString()}c</span>
        <span className="text-muted text-xs ml-2">(Manage in Player)</span>
      </div>

      {/* Lost Model Recovery Alert */}
      {currentLostUnit && (
        <div className="mb-4 border border-amber rounded bg-amber-dim/20 px-4 py-3" style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}>
          <div className="text-amber text-xs font-bold mb-1 tracking-wider">LOST MODEL RECOVERY</div>
          <p className="text-muted text-xs mb-2">
            <span className="text-pip font-bold">{currentLostUnit.unitName}</span> is Lost. Roll a red die: if result ≤{' '}
            <span className="text-amber font-bold">{currentLostUnit.exploreCount}</span> they are found.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleMarkFound(currentLostUnit.slotId)}
              className="text-xs px-3 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim hover:border-pip-mid transition-colors font-bold"
            >
              MARK FOUND
            </button>
            <button
              onClick={handleNotFound}
              className="text-xs px-3 py-1.5 border border-muted text-muted rounded hover:text-pip hover:border-pip transition-colors"
            >
              Not found
            </button>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Zap size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-title">{pwrGen - pwrUsed}</div>
          <div className="text-xs text-muted">NET PWR ({pwrGen}/{pwrUsed})</div>
        </div>
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Droplets size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-title">{waterGen - waterUsed}</div>
          <div className="text-xs text-muted">NET H2O ({waterGen}/{waterUsed})</div>
        </div>
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Building2 size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-title">{structures.length}</div>
          <div className="text-xs text-muted">STRUCTURES</div>
        </div>
        <div className={`border rounded bg-panel p-2 text-center ${usedSlots >= maxSlots ? 'border-danger/60' : 'border-pip-mid/60'}`}>
          <LayoutGrid size={14} className={`mx-auto mb-1 ${usedSlots >= maxSlots ? 'text-danger' : 'text-pip'}`} />
          <div className={`text-sm font-bold ${usedSlots >= maxSlots ? 'text-danger' : 'text-title'}`}>{usedSlots}/{maxSlots}</div>
          <div className="text-xs text-muted">SLOTS</div>
        </div>
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Map size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-title">{landCount}</div>
          <div className="text-xs text-muted">LAND</div>
        </div>
        <div className="border border-amber/50 rounded bg-panel p-2 text-center">
          <div className="text-sm font-bold text-amber">{totalCost}c</div>
          <div className="text-xs text-muted">TOTAL COST</div>
        </div>
        {settings.settlementMode === 'homestead' && (
          <div className={`border rounded bg-panel p-2 text-center ${maxResources > 0 && resources >= maxResources ? 'border-amber/60' : 'border-pip-mid/60'}`}>
            <Recycle size={14} className="mx-auto mb-1 text-pip" />
            <div className="text-sm font-bold text-title flex items-center justify-center gap-1">
              {resources}
              {maxResources > 0 && <span className="text-muted text-xs">/{maxResources}</span>}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <button onClick={() => handleAdjustResources(-1)} className="w-5 h-5 rounded border border-pip-mid/60 text-pip hover:bg-pip-dim flex items-center justify-center text-sm leading-none">−</button>
              <span className="text-xs text-muted">RES</span>
              <button onClick={() => handleAdjustResources(1)} className="w-5 h-5 rounded border border-pip-mid/60 text-pip hover:bg-pip-dim flex items-center justify-center text-sm leading-none">+</button>
            </div>
          </div>
        )}
        {settings.settlementMode === 'homestead' && (
          <div className="border rounded bg-panel p-2 text-center border-info/40">
            <Zap size={14} className="mx-auto mb-1 text-info" />
            <div className="text-sm font-bold text-info">{defenseRating}</div>
            <div className="text-xs text-muted">DEFENSE</div>
          </div>
        )}
      </div>

      {/* Buy Land section — always visible when land could be useful */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          onClick={handleBuyLand}
          disabled={caps < 500}
          className="flex items-center gap-2 px-3 py-1.5 border border-amber text-amber rounded text-xs hover:bg-amber-dim/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
        >
          BUY LAND +10 SLOTS (500c)
        </button>
        {completedQuestCount >= 5 ? (
          <button
            onClick={handleClaimLandViaQuests}
            className="flex items-center gap-2 px-3 py-1.5 border border-pip text-pip rounded text-xs hover:bg-pip-dim transition-colors font-bold"
          >
            CLAIM LAND FREE (5 Quests ✓)
          </button>
        ) : (
          <span className="text-muted text-xs self-center">{completedQuestCount}/5 quests for free land</span>
        )}
      </div>

      {/* Phase 3 Setup */}
      {phase === 3 && structures.length === 0 && (
        <div className="mb-4">
          <button
            onClick={handlePhase3Setup}
            className="flex items-center gap-2 px-4 py-2 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold"
          >
            PHASE 3 SETUP — Add Free Starting Structures
          </button>
        </div>
      )}

      {/* Item Pool Panel — above structure list */}
      <div className="border-2 border-white/20 rounded-xl p-3 space-y-3 mt-4">
        <h3 className="text-title text-xs font-bold tracking-widest border-b border-white/20 pb-1">POOLS</h3>
        <ItemPoolPanel structures={structures} />
      </div>

      {/* AT Filter toggle */}
      <div className="flex items-center gap-2 mb-4 mt-4">
        {settings.settlementMode !== 'alone-together' && (
          <button
            onClick={() => setAtValidOnly(!atValidOnly)}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 border rounded transition-colors ${
              atValidOnly ? 'border-pip text-pip bg-pip-dim/30' : 'border-muted/40 text-muted hover:text-pip hover:border-pip'
            }`}
          >
            <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${atValidOnly ? 'border-pip bg-pip' : 'border-muted'}`}>
              {atValidOnly && <span className="text-terminal text-xs leading-none font-bold">✓</span>}
            </span>
            AT VALID
          </button>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-pip text-sm tracking-widest font-bold">STRUCTURES ({structures.length}) — {usedCount} USED</h2>
        <div className="flex gap-2">
          <button
            onClick={handleResetRound}
            className="flex items-center gap-1 px-3 py-2 border border-amber/60 text-amber rounded text-sm hover:bg-amber-dim/30 transition-colors"
          >
            <RotateCcw size={14} /> RESET ROUND
          </button>
          <button
            onClick={() => setShowAddStructure(true)}
            className="flex items-center gap-1 px-3 py-2 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold"
          >
            <Plus size={14} /> ADD
          </button>
        </div>
      </div>

      {/* Structure Table */}
      {structures.length === 0 ? (
        <div className="border border-pip-dim/40 border-dashed rounded-lg p-8 text-center">
          <p className="text-muted text-sm">No structures built. Click ADD to build your settlement.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {structures.map(s => {
            const ref = getStructureRef(s.structureId)
            if (!ref) return null
            const isSpecial = SPECIAL_STRUCTURE_NAMES.includes(ref.name)
            // Structures that generate power/water or need no power are auto-powered
            const needsPower = (ref.pwrReq > 0) || (ref.waterReq > 0)
            const selfPowering = !needsPower // generators, land, crop fields, etc.
            const isPowered = selfPowering || s.powered
            const canUse = isPowered && !s.usedThisRound && s.condition !== 'Damaged' && s.condition !== 'Badly Damaged' && s.condition !== 'Wrecked'

            return (
              <div key={s.instanceId} className={`border rounded transition-colors ${
                s.usedThisRound
                  ? 'border-pip-dim/20 bg-panel-alt opacity-40'
                  : s.condition === 'Wrecked'
                    ? 'border-danger/40 bg-panel-alt opacity-60'
                  : s.condition === 'Badly Damaged'
                    ? 'border-danger/30 bg-panel-alt'
                  : s.condition === 'Damaged'
                    ? 'border-amber/30 bg-panel'
                  : isPowered
                    ? isSpecial ? 'border-amber/40 bg-panel' : 'border-pip-mid/50 bg-panel'
                    : 'border-pip-dim/30 bg-panel-alt'
              }`}>
                <div className="hidden md:block">
                {/* Header row */}
                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${s.usedThisRound ? 'text-amber/40' : 'text-amber'}`}>{ref.name}</span>
                      {isSpecial && !s.usedThisRound && <span className="text-amber text-xs">★</span>}
                      {s.condition === 'Damaged' && <span className="text-amber text-xs font-bold">DMG</span>}
                      {s.condition === 'Badly Damaged' && <span className="text-danger text-xs font-bold">B.DMG</span>}
                      {s.condition === 'Wrecked' && <span className="text-danger text-xs font-bold">WRECKED</span>}
                      {s.condition === 'Reinforced' && <span className="text-info text-xs font-bold">RNF</span>}
                      <span className="text-xs text-muted">{ref.category}</span>
                      <span className="text-xs text-amber">{ref.cost}c</span>
                      {ref.pwrGen > 0 && <span className="text-xs text-pip font-bold">+{ref.pwrGen}⚡</span>}
                      {ref.pwrReq > 0 && <span className="text-xs text-muted">req {ref.pwrReq}⚡</span>}
                      {ref.waterGen > 0 && <span className="text-xs text-pip font-bold">+{ref.waterGen}💧</span>}
                      {ref.waterReq > 0 && <span className="text-xs text-muted">req {ref.waterReq}💧</span>}
                    </div>
                    <p className="text-muted text-xs mt-0.5 leading-relaxed">{ref.effect}</p>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Power toggle — only for structures that need power */}
                    {needsPower && !s.usedThisRound && (
                      <button
                        onClick={() => handleTogglePowered(s.instanceId)}
                        title={s.powered ? 'Powered — click to cut power' : 'Unpowered — click to allocate power'}
                        className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold transition-colors ${
                          s.powered
                            ? 'border-amber text-amber bg-amber/10'
                            : 'border-muted/30 text-dim hover:border-amber/60 hover:text-muted'
                        }`}
                        style={s.powered ? { boxShadow: '0 0 6px rgba(251,191,36,0.3)' } : {}}
                      >
                        <Zap size={11} />
                        {s.powered ? 'ON' : 'OFF'}
                      </button>
                    )}

                    {/* USE button */}
                    {s.usedThisRound ? (
                      <span className="px-2 py-1 rounded border border-pip-dim/20 text-dim text-xs font-bold tracking-wider">USED ✓</span>
                    ) : (
                      <button
                        onClick={() => canUse && handleToggleUsed(s.instanceId)}
                        disabled={!canUse}
                        title={
                          s.condition !== 'Undamaged' && s.condition !== 'Reinforced' ? `${s.condition} — cannot use`
                          : !isPowered ? 'Power not allocated'
                          : isSpecial ? `Use ${ref.name}`
                          : 'Use structure'
                        }
                        className={`px-2 py-1 rounded border text-xs font-bold tracking-wider transition-colors ${
                          canUse
                            ? isSpecial
                              ? 'border-amber text-amber hover:bg-amber/10'
                              : 'border-pip text-pip hover:bg-pip-dim/30'
                            : 'border-pip-dim/20 text-dim cursor-not-allowed opacity-40'
                        }`}
                        style={canUse ? { boxShadow: isSpecial ? '0 0 6px rgba(251,191,36,0.25)' : '0 0 6px rgba(0,182,90,0.2)' } : {}}
                      >
                        USE
                      </button>
                    )}

                    {/* Homestead: Repair / Reinforce */}
                    {settings.settlementMode === 'homestead' && (s.condition === 'Damaged' || s.condition === 'Badly Damaged') && (
                      <button
                        onClick={() => handleRepairStructure(s.instanceId)}
                        title="Repair (2 Resources)"
                        className="text-amber hover:text-pip transition-colors text-xs px-1 border border-amber/30 rounded"
                      >
                        FIX
                      </button>
                    )}
                    {settings.settlementMode === 'homestead' && s.condition === 'Undamaged' && !s.usedThisRound && (
                      <button
                        onClick={() => handleReinforceStructure(s.instanceId)}
                        title="Reinforce (2 Resources) — 50% chance to ignore structural damage"
                        className="text-info hover:text-pip transition-colors text-xs px-1 border border-info/30 rounded"
                      >
                        RNF
                      </button>
                    )}

                    {/* Scrap / Remove */}
                    {!s.usedThisRound && s.condition === 'Undamaged' && (
                      <button
                        onClick={() => handleScrapStructure(s.instanceId)}
                        className="text-muted hover:text-amber transition-colors"
                        title={`Scrap for ${Math.floor((ref.cost || 0) / 2)}c`}
                      >
                        <Recycle size={12} />
                      </button>
                    )}
                    <button onClick={() => handleRemoveStructure(s.instanceId)} className="text-muted hover:text-danger transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Condition / Notes row */}
                <div className="flex items-center gap-2 px-3 pb-2">
                  <select value={s.condition} onChange={(e) => handleUpdateStructure(s.instanceId, 'condition', e.target.value)}
                    className="text-xs py-0.5 px-1 bg-panel-alt">
                    {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input type="text" value={s.notes || ''} onChange={(e) => handleUpdateStructure(s.instanceId, 'notes', e.target.value)}
                    placeholder="Notes..." className="flex-1 text-xs py-0.5 px-1 bg-panel-alt" />
                </div>
                </div>

                {/* Mobile: structure card */}
                <div className="md:hidden px-3 py-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-amber font-bold text-sm">{ref.name}</div>
                      <div className="flex items-center gap-2 mt-1 text-xs">
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${structureConditionDotClass(s.condition)}`} />
                          Condition: <span className="text-pip font-bold">{s.condition}</span>
                        </span>
                      </div>
                      <p className="text-xs text-pip mt-1">
                        PWR: {ref.pwrGen > 0 ? `+${ref.pwrGen}` : '0'}
                        {ref.pwrReq > 0 && <span className="text-muted"> (req {ref.pwrReq})</span>}
                        {' '}| Water: {ref.waterGen > 0 ? `+${ref.waterGen}` : '0'}
                        {ref.waterReq > 0 && <span className="text-muted"> (req {ref.waterReq})</span>}
                      </p>
                    </div>
                    {needsPower && !s.usedThisRound && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => { if (!s.powered) handleTogglePowered(s.instanceId) }}
                          className={`min-h-[44px] min-w-[52px] px-2 rounded border text-xs font-bold ${s.powered ? 'border-pip text-pip bg-pip/10' : 'border-pip-dim/40 text-muted'}`}
                          style={s.powered ? { boxShadow: '0 0 8px var(--color-pip-glow)' } : undefined}
                        >
                          ON
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (s.powered) handleTogglePowered(s.instanceId) }}
                          className={`min-h-[44px] min-w-[52px] px-2 rounded border text-xs font-bold ${!s.powered ? 'border-muted text-muted bg-panel-alt' : 'border-muted/40 text-dim'}`}
                        >
                          OFF
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-muted text-xs leading-relaxed">{ref.effect}</p>
                  <div className="flex flex-wrap gap-2">
                    {s.usedThisRound ? (
                      <span className="min-h-[44px] px-3 flex items-center rounded border border-pip-dim/20 text-dim text-xs font-bold">USED ✓</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => canUse && handleToggleUsed(s.instanceId)}
                        disabled={!canUse}
                        className={`min-h-[44px] flex-1 min-w-[5rem] px-2 rounded border text-xs font-bold ${canUse ? (isSpecial ? 'border-amber text-amber' : 'border-pip text-pip') : 'border-pip-dim/20 text-dim opacity-40'}`}
                      >
                        USE
                      </button>
                    )}
                    {settings.settlementMode === 'homestead' && (s.condition === 'Damaged' || s.condition === 'Badly Damaged') && (
                      <button type="button" onClick={() => handleRepairStructure(s.instanceId)} className="min-h-[44px] px-3 border border-amber text-amber rounded text-xs font-bold">
                        REPAIR
                      </button>
                    )}
                    {settings.settlementMode === 'homestead' && s.condition === 'Undamaged' && !s.usedThisRound && (
                      <button type="button" onClick={() => handleReinforceStructure(s.instanceId)} className="min-h-[44px] px-3 border border-info text-info rounded text-xs font-bold">
                        REINFORCE
                      </button>
                    )}
                    {!s.usedThisRound && s.condition === 'Undamaged' && (
                      <button type="button" onClick={() => handleScrapStructure(s.instanceId)} className="min-h-[44px] px-3 border border-muted text-muted rounded text-xs font-bold">
                        SCRAP
                      </button>
                    )}
                    <button type="button" onClick={() => handleRemoveStructure(s.instanceId)} className="min-h-[44px] px-3 border border-danger/40 text-danger rounded text-xs font-bold">
                      REMOVE
                    </button>
                  </div>
                  <div className="flex items-center gap-2 pt-1 border-t border-pip-dim/20">
                    <select value={s.condition} onChange={(e) => handleUpdateStructure(s.instanceId, 'condition', e.target.value)}
                      className="text-xs py-2 px-1 bg-panel-alt rounded border border-pip-dim/30 min-h-[44px]">
                      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" value={s.notes || ''} onChange={(e) => handleUpdateStructure(s.instanceId, 'notes', e.target.value)}
                      placeholder="Notes..." className="flex-1 text-xs py-2 px-2 bg-panel-alt rounded border border-pip-dim/30 min-h-[44px]" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddStructureModal
        isOpen={showAddStructure}
        onClose={() => setShowAddStructure(false)}
        onAdd={handleAddStructure}
        atValidOnly={atValidOnly}
        caps={caps}
      />

      <BarracksModal
        isOpen={showBarracks}
        onClose={() => setShowBarracks(false)}
        roster={roster}
        onApply={handleBarracksApply}
      />

      <MedicalCenterModal
        isOpen={showMedCenter}
        onClose={() => setShowMedCenter(false)}
        roster={roster}
        onApply={handleMedCenterApply}
      />

      <StoresModal
        isOpen={showStores}
        onClose={() => setShowStores(false)}
        poolItems={state.itemPool?.items || []}
        roster={roster}
        onApply={(selections) => { handleStoresApply(selections); setShowStores(false) }}
      />
    </>
  )
}

/* ── Explore sub-panel (Explore Events + Explore Locations) ── */
function ExplorePanel({ state, setState }) {
  const [exploreSubTab, setExploreSubTab] = useState('events')
  const [filter, setFilter] = useState('all')

  const exploreStats = getDeckStats('explore', state.eventCards, eventCardsData)
  const cards = eventCardsData.filter(c => c.deckType === 'explore')

  const filteredCards = cards.filter(card => {
    const cardState = state.eventCards[card.id]
    switch (filter) {
      case 'available': return !cardState || (!cardState.drawn && !cardState.inPlay && !cardState.complete)
      case 'drawn': return cardState?.drawn && !cardState.inPlay && !cardState.complete
      case 'inPlay': return cardState?.inPlay
      case 'complete': return cardState?.complete
      default: return true
    }
  })

  function handleToggle(cardId, field) {
    setState(prev => {
      const current = prev.eventCards[cardId] || {}
      const updates = { ...current }

      if (field === 'drawn') {
        updates.drawn = !updates.drawn
        if (!updates.drawn) { updates.inPlay = false; updates.complete = false }
      } else if (field === 'inPlay') {
        updates.inPlay = !updates.inPlay
        if (updates.inPlay) updates.drawn = true
        updates.complete = false
      } else if (field === 'complete') {
        updates.complete = !updates.complete
        if (updates.complete) { updates.drawn = true; updates.inPlay = false }
      }

      return { ...prev, eventCards: { ...prev.eventCards, [cardId]: updates } }
    })
  }

  function addConsequenceToWasteland(card) {
    try {
      const existing = JSON.parse(localStorage.getItem('fww-wasteland-deck') || '[]')
      const entry = { id: `consequence-${card.id}-${Date.now()}`, name: card.name, type: 'consequence', text: card.consequence || card.text || '' }
      localStorage.setItem('fww-wasteland-deck', JSON.stringify([entry, ...existing]))
    } catch { /* ignore */ }
  }

  function handleResetExploreDeck() {
    if (!confirm('Reset all explore event cards? This will clear drawn/in-play/complete status.')) return
    setState(prev => {
      const newCards = { ...prev.eventCards }
      cards.forEach(c => { delete newCards[c.id] })
      return {
        ...prev,
        eventCards: newCards,
        activeEvents: prev.activeEvents.filter(e => {
          const card = eventCardsData.find(c => c.id === e.cardId)
          return card?.deckType !== 'explore'
        }),
      }
    })
  }

  return (
    <div className="space-y-4">
      {/* Explore sub-tabs */}
      <div className="flex gap-1">
        <button
          onClick={() => setExploreSubTab('events')}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors font-bold ${
            exploreSubTab === 'events'
              ? 'border-pip bg-panel-light text-pip'
              : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
          }`}
        >
          EXPLORE EVENTS ({exploreStats.total})
        </button>
        <button
          onClick={() => setExploreSubTab('locations')}
          className={`flex-1 py-1.5 text-xs rounded border transition-colors font-bold ${
            exploreSubTab === 'locations'
              ? 'border-pip bg-panel-light text-pip'
              : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
          }`}
        >
          EXPLORE LOCATIONS ({exploreCardDeck.length})
        </button>
      </div>

      {exploreSubTab === 'events' ? (
        <>
          {/* Quick Draw */}
          <CardDrawer deckType="explore" title="DRAW EXPLORE CARD" />

          {/* Stats */}
          <div className="flex gap-4 text-xs">
            <span className="text-pip font-bold">Available: {exploreStats.available}</span>
            <span className="text-pip">Drawn: {exploreStats.drawn}</span>
            <span className="text-amber font-bold">In Play: {exploreStats.inPlay}</span>
            <span className="text-pip">Complete: {exploreStats.completed}</span>
            <button onClick={handleResetExploreDeck} className="ml-auto text-pip/60 hover:text-danger transition-colors">RESET DECK</button>
          </div>

          {/* Filters */}
          <div className="flex gap-1">
            {EXPLORE_EVENT_FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  filter === f.id ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Card List */}
          <div className="space-y-1">
            {filteredCards.map(card => {
              const cardState = state.eventCards[card.id] || {}
              return (
                <div key={card.id} className={`border rounded px-3 py-2 transition-colors ${
                  cardState.complete ? 'border-pip-dim/20 bg-panel-alt opacity-40' :
                  cardState.inPlay ? 'border-amber/60 bg-panel' :
                  cardState.drawn ? 'border-muted/30 bg-panel-alt opacity-70' :
                  'border-pip-mid/40 bg-panel'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className="text-amber text-xs font-bold w-6 shrink-0 mt-0.5">#{card.id}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-pip text-sm font-bold">{card.name}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          card.type.includes('★') ? 'bg-amber-dim/50 text-amber font-bold' : 'bg-pip-dim/20 text-muted'
                        }`}>{card.type}</span>
                      </div>
                      <p className="text-muted text-xs leading-relaxed">{card.text}</p>
                      {card.consequence && (
                        <p className="text-amber text-xs leading-relaxed mt-1 italic">{card.consequence}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(card.id, 'drawn')}
                        title="Mark as drawn"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.drawn ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                        }`}
                      >DRAWN</button>
                      <button
                        onClick={() => handleToggle(card.id, 'inPlay')}
                        title="Mark as in play"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.inPlay ? 'border-amber text-amber bg-amber-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-amber hover:border-amber'
                        }`}
                      >IN PLAY</button>
                      <button
                        onClick={() => handleToggle(card.id, 'complete')}
                        title="Mark as complete"
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          cardState.complete ? 'border-pip text-pip bg-pip-dim/30 font-bold' : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                        }`}
                      >DONE</button>
                      {cardState.inPlay && (card.consequence || card.text) && (
                        <button
                          onClick={() => addConsequenceToWasteland(card)}
                          title="Add consequence to top of Wasteland Deck"
                          className="px-2 py-1 text-xs rounded border border-info/40 text-info hover:bg-info-dim/20 transition-colors"
                        >→ DECK</button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <ExploreLocationsPanel state={state} setState={setState} />
      )}

    </div>
  )
}

/* ── Explore Locations Deck ── */
function ExploreLocationsPanel({ state, setState }) {
  const [search, setSearch] = useState('')

  const locations = state.exploreLocations || {}

  const drawnIds = new Set(
    Object.entries(locations).filter(([, v]) => v.drawn && !v.discarded).map(([k]) => parseInt(k))
  )
  const discardedIds = new Set(
    Object.entries(locations).filter(([, v]) => v.discarded).map(([k]) => parseInt(k))
  )
  const remainingDeck = exploreCardDeck.filter(c => !drawnIds.has(c.id) && !discardedIds.has(c.id))

  function handleDrawRandom() {
    if (remainingDeck.length === 0) return
    const idx = Math.floor(Math.random() * remainingDeck.length)
    const card = remainingDeck[idx]
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [card.id]: { drawn: true, discarded: false },
      },
    }))
  }

  function handleDiscard(id) {
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [id]: { drawn: true, discarded: true },
      },
    }))
  }

  function handleUndiscard(id) {
    setState(prev => ({
      ...prev,
      exploreLocations: {
        ...prev.exploreLocations,
        [id]: { drawn: false, discarded: false },
      },
    }))
  }

  function handleReset() {
    if (!confirm('Reset explore location deck? This clears all drawn/discarded tracking.')) return
    setState(prev => ({ ...prev, exploreLocations: {} }))
  }

  const drawnCards = exploreCardDeck.filter(c => drawnIds.has(c.id))
  const discardedCards = exploreCardDeck.filter(c => discardedIds.has(c.id))

  const filteredAll = search
    ? exploreCardDeck.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : null

  return (
    <div className="space-y-4">
      {/* Stats + Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-4 text-xs">
          <span className="text-pip font-bold">{remainingDeck.length} <span className="text-muted font-normal">remaining</span></span>
          <span className="text-muted">{drawnIds.size} drawn</span>
          <span className="text-muted">{discardedIds.size} discarded</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDrawRandom}
            disabled={remainingDeck.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 border border-pip text-pip rounded text-xs hover:bg-pip-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
          >
            <Shuffle size={12} /> DRAW ({remainingDeck.length})
          </button>
          <button onClick={handleReset} className="text-xs text-muted hover:text-danger px-2 transition-colors">RESET</button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search all locations..."
        className="w-full text-xs"
      />

      {/* Search Results */}
      {filteredAll && (
        <div className="border border-pip-mid/30 rounded bg-panel-alt p-2 max-h-48 overflow-y-auto space-y-1">
          {filteredAll.map(card => {
            const isDrawn = drawnIds.has(card.id)
            const isDiscarded = discardedIds.has(card.id)
            return (
              <div key={card.id} className={`flex items-center justify-between px-2 py-1 rounded text-xs ${
                isDiscarded ? 'opacity-40' : isDrawn ? 'text-amber' : 'text-pip'
              }`}>
                <span className={isDiscarded ? 'line-through' : ''}>{card.name}</span>
                <span className="text-muted ml-2">
                  {isDiscarded ? 'discarded' : isDrawn ? 'drawn' : 'available'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Currently Drawn */}
      {drawnCards.length > 0 && (
        <div>
          <h3 className="text-amber text-xs tracking-widest mb-2 font-bold">DRAWN ({drawnCards.length})</h3>
          <div className="space-y-1">
            {drawnCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-amber/50 rounded px-3 py-1.5 bg-panel">
                <span className="text-amber text-sm font-bold">{card.name}</span>
                <button
                  onClick={() => handleDiscard(card.id)}
                  className="text-xs text-muted hover:text-pip border border-muted/30 hover:border-pip px-2 py-0.5 rounded transition-colors"
                >
                  DISCARD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discarded Pile */}
      {discardedCards.length > 0 && (
        <div>
          <h3 className="text-muted text-xs tracking-widest mb-2 font-bold">DISCARDED ({discardedCards.length})</h3>
          <div className="space-y-1">
            {discardedCards.map(card => (
              <div key={card.id} className="flex items-center justify-between border border-pip-dim/20 rounded px-3 py-1 bg-panel-alt opacity-60">
                <span className="text-muted text-xs line-through">{card.name}</span>
                <button
                  onClick={() => handleUndiscard(card.id)}
                  className="text-xs text-muted/60 hover:text-muted border border-pip-dim/20 px-2 py-0.5 rounded transition-colors"
                >
                  UNDO
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {drawnCards.length === 0 && discardedCards.length === 0 && !search && (
        <p className="text-muted text-xs text-center py-6">
          Press DRAW to pull a random location card from the deck.
        </p>
      )}
    </div>
  )
}

/* ── Item Draw Modal (equipment structures) ── */
function ItemDrawModal({ draw, onKeep, onClose }) {
  const [selected, setSelected] = useState([])
  const { structureName, drawnItems, keepCount, typeLabel } = draw

  function toggle(item) {
    setSelected(prev => {
      if (prev.find(i => i.id === item.id)) return prev.filter(i => i.id !== item.id)
      if (prev.length >= keepCount) return prev
      return [...prev, item]
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal/70 backdrop-blur-sm">
      <div className="bg-panel border border-pip-mid/60 rounded-lg w-full max-w-lg shadow-xl" style={{ boxShadow: '0 0 24px var(--color-pip-glow)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-pip-mid/40">
          <h3 className="text-pip text-sm tracking-widest font-bold">ITEM DRAW — {structureName.toUpperCase()}</h3>
          <button onClick={onClose} className="text-muted hover:text-pip text-xs px-2 py-1 border border-muted/40 rounded hover:border-pip transition-colors">CLOSE</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <p className="text-muted text-xs">
            Drew <span className="text-pip font-bold">{drawnItems.length}</span> {typeLabel} card{drawnItems.length !== 1 ? 's' : ''}.{' '}
            Select up to <span className="text-amber font-bold">{keepCount}</span> to add to your Item Pool.{' '}
            <span className="text-muted/60">({selected.length}/{keepCount} selected)</span>
          </p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {drawnItems.map((item, idx) => {
              const isSel = !!selected.find(i => i.id === item.id)
              const maxed = !isSel && selected.length >= keepCount
              return (
                <div
                  key={`${item.id}-${idx}`}
                  onClick={() => !maxed && toggle(item)}
                  className={`flex items-center gap-3 border rounded px-3 py-2.5 transition-colors ${
                    isSel
                      ? 'border-pip bg-pip-dim/20 cursor-pointer'
                      : maxed
                      ? 'border-muted/20 opacity-40 cursor-not-allowed'
                      : 'border-muted/40 hover:border-pip/60 hover:bg-panel-light cursor-pointer'
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'border-pip bg-pip' : 'border-muted'}`}>
                    {isSel && <span className="text-terminal text-xs font-bold leading-none">✓</span>}
                  </div>
                  <span className="flex-1 min-w-0 text-sm font-bold text-pip truncate">{item.name}</span>
                  <span className="text-muted text-xs shrink-0">{item.subType}</span>
                  <span className="text-amber text-sm font-bold shrink-0">{item.caps}c</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { onKeep(selected); onClose() }}
              disabled={selected.length === 0}
              className="flex-1 px-4 py-2.5 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              style={selected.length > 0 ? { boxShadow: '0 0 6px var(--color-pip-glow)' } : {}}
            >
              {selected.length > 0 ? `KEEP ${selected.length} ITEM${selected.length !== 1 ? 'S' : ''} → POOL` : 'SELECT ITEMS TO KEEP'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-muted/40 text-muted rounded text-sm hover:text-pip hover:border-pip transition-colors"
            >
              Discard All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Deck Draw Modal (deck-based equipment structure draws) ── */
function DeckDrawModal({ draw, onKeep, onClose }) {
  const { structureName, typeLabel, drawnCards = [], foundItem } = draw
  const [visibleCount, setVisibleCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (drawnCards.length === 0) { setDone(true); return }
    let i = 0
    const tick = () => {
      i++
      setVisibleCount(i)
      if (i < drawnCards.length) {
        setTimeout(tick, 340)
      } else {
        setTimeout(() => setDone(true), 200)
      }
    }
    setTimeout(tick, 180)
  }, [drawnCards.length])

  const visibleCards = drawnCards.slice(0, visibleCount)
  const drawing = !done

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-panel border border-pip-mid/50 rounded-lg w-full max-w-md space-y-4 p-5" style={{ boxShadow: '0 0 24px rgba(0,0,0,0.8)' }}>
        <div className="flex items-center justify-between">
          <div className="text-title text-xs font-bold tracking-widest">{structureName} — DRAW</div>
          {done && <button onClick={onClose} className="text-muted hover:text-pip transition-colors"><X size={14} /></button>}
        </div>

        <div className="text-muted text-xs">
          {drawing
            ? <span className="text-pip animate-pulse">DRAWING... searching for <span className="text-amber font-bold">{typeLabel}</span></span>
            : <>Drew <span className="text-pip font-bold">{drawnCards.length}</span> card{drawnCards.length !== 1 ? 's' : ''} looking for a{' '}<span className="text-amber font-bold">{typeLabel}</span> — all go to discard.</>
          }
        </div>

        {/* Animated card list */}
        <div className="space-y-1 max-h-56 overflow-y-auto">
          {visibleCards.map((item, i) => {
            const isMatch = done && foundItem && item.id === foundItem.id && i === drawnCards.length - 1
            const isLatest = i === visibleCards.length - 1 && drawing
            return (
              <div
                key={i}
                className={`flex items-center gap-2 px-3 py-1.5 rounded border text-xs transition-all ${
                  isMatch
                    ? 'border-amber/70 bg-amber/5'
                    : isLatest
                      ? 'border-pip/50 bg-pip-dim/10'
                      : 'border-pip-dim/20 opacity-50'
                }`}
                style={isMatch ? { boxShadow: '0 0 10px rgba(251,191,36,0.3)' } : isLatest ? { boxShadow: '0 0 6px rgba(0,182,90,0.2)' } : {}}
              >
                <span className={isMatch ? 'text-amber font-bold' : isLatest ? 'text-pip' : 'text-muted'}>{item.name}</span>
                <span className={`text-xs px-1 border border-current/30 rounded ml-auto ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                {item.caps != null && <span className="text-muted">{item.caps}c</span>}
                {isMatch && <span className="text-amber text-xs font-bold">✓ MATCH</span>}
              </div>
            )
          })}
          {drawing && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded border border-pip-dim/20 text-xs">
              <span className="text-dim animate-pulse">drawing...</span>
            </div>
          )}
        </div>

        {done && (
          foundItem ? (
            <div className="border-t border-pip-dim/30 pt-3 space-y-2">
              <div className="text-pip text-xs">Found: <span className="text-amber font-bold">{foundItem.name}</span></div>
              <div className="flex gap-2">
                <button
                  onClick={() => { onKeep([foundItem]); onClose() }}
                  className="flex-1 py-2 text-xs border border-pip text-pip rounded hover:bg-pip-dim/20 transition-colors font-bold"
                >ADD TO POOL</button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-xs border border-muted/40 text-muted rounded hover:text-pip hover:border-pip transition-colors"
                >DISCARD</button>
              </div>
            </div>
          ) : (
            <div className="border-t border-pip-dim/30 pt-3">
              <p className="text-danger text-xs text-center">No matching {typeLabel} found in deck.</p>
              <button onClick={onClose} className="mt-2 w-full py-2 text-xs border border-muted/40 text-muted rounded hover:text-pip hover:border-pip transition-colors">CLOSE</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/* ── Settlement Item Deck Panel ── */
function SettlementDeckPanel({ state, setState, structures, deckFilter, setDeckFilter, recentlyDrawn, setRecentlyDrawn, drawManualFromDeck, reshuffleDeck, fullResetDeck, addRecentlyDrawnToPool }) {
  const allIds = buildFullDeckIds()
  const deck = state.settlementDeck ?? []
  const discard = state.settlementDiscard ?? []
  const total = allIds.length
  const deckCount = (deck.length === 0 && discard.length === 0) ? total : deck.length
  const discardCount = discard.length
  const [pooledSet, setPooledSet] = useState(new Set())
  const [recoveryFilter, setRecoveryFilter] = useState('any')
  const [settlementFilter, setSettlementFilter] = useState('any')
  const [showAddRecovery, setShowAddRecovery] = useState(false)
  const [addRecoverySearch, setAddRecoverySearch] = useState('')
  const [addRecoveryResults, setAddRecoveryResults] = useState([])

  // Boost deck state
  const boostDeck = state.boostDeck ?? []
  const boostDiscard = state.boostDiscard ?? []
  const allBoostIds = buildBoostDeckIds()
  const boostDeckCount = (boostDeck.length === 0 && boostDiscard.length === 0) ? allBoostIds.length : boostDeck.length
  const boostDiscardCount = boostDiscard.length
  const [showBoostBrowse, setShowBoostBrowse] = useState(false)
  const [boostBrowseSearch, setBoostBrowseSearch] = useState('')
  const [boostBrowseType, setBoostBrowseType] = useState('all')

  // Item pool data
  const items = state.itemPool?.items ?? []
  const roster = state.roster ?? []

  // Slot counts from structures
  const shedCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Maintenance Shed').length
  const lockerCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Lockers').length
  const storesCount = (structures || []).filter(s => getStructureRef(s.structureId)?.name === 'Stores').length

  const recoveryItems = items.filter(i => i.location === 'recovery' || i.location === 'Temp Pool')
  const storedItems = items.filter(i => i.location === 'stored' || i.location === 'Maint. Shed')
  const lockerItems = items.filter(i => i.location === 'locker' || i.location === 'Locker')
  const storesItems = items.filter(i => i.location === 'stores' || i.location === 'Stores')

  const recoveryFilterTypes = DECK_FILTER_OPTIONS.find(f => f.id === recoveryFilter)?.types ?? [...SETTLEMENT_DECK_TYPES, 'Boost']
  const settlementFilterTypes = DECK_FILTER_OPTIONS.find(f => f.id === settlementFilter)?.types ?? [...SETTLEMENT_DECK_TYPES, 'Boost']

  const filteredRecovery = recoveryItems.filter(i => recoveryFilterTypes.includes(i.subType))
  const filteredStored = storedItems.filter(i => settlementFilterTypes.includes(i.subType))

  // Boost deck functions
  function handleDrawRandomBoost() {
    let bdeck = [...boostDeck]
    let bdiscard = [...boostDiscard]
    if (bdeck.length === 0 && bdiscard.length === 0) {
      bdeck = [...allBoostIds].sort(() => Math.random() - 0.5)
    }
    if (bdeck.length === 0 && bdiscard.length > 0) {
      bdeck = [...bdiscard].sort(() => Math.random() - 0.5)
      bdiscard = []
    }
    if (bdeck.length === 0) return
    const boostId = bdeck.shift()
    bdiscard.push(boostId)
    const boost = boostsData.find(b => b.id === boostId)
    if (!boost) { setState(prev => ({ ...prev, boostDeck: bdeck, boostDiscard: bdiscard })); return }
    setState(prev => ({
      ...prev,
      boostDeck: bdeck,
      boostDiscard: bdiscard,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items ?? []), {
          id: Date.now() + Math.random(),
          boostId: boost.id,
          name: boost.name,
          caps: 0,
          subType: 'Boost',
          isBoost: true,
          boostType: boost.boostType,
          location: 'recovery',
          assignedUnit: null,
        }],
      },
    }))
  }

  function handleAddBoostToRecovery(boost) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items ?? []), {
          id: Date.now() + Math.random(),
          boostId: boost.id,
          name: boost.name,
          caps: 0,
          subType: 'Boost',
          isBoost: true,
          boostType: boost.boostType,
          location: 'recovery',
          assignedUnit: null,
        }],
      },
    }))
  }

  function handleMoveBoostToHand(item) {
    setState(prev => ({
      ...prev,
      itemPool: { ...prev.itemPool, items: prev.itemPool.items.filter(i => i.id !== item.id) },
      boostHand: [...(prev.boostHand ?? []), {
        instanceId: item.id,
        boostId: item.boostId,
        name: item.name,
        boostType: item.boostType,
        usedThisRound: false,
      }],
    }))
  }

  function handleMoveBoostToStores(item) {
    updateItem(item.id, { location: 'stores', assignedUnit: null })
  }

  function handleDiscardBoostItem(item) {
    setState(prev => ({
      ...prev,
      itemPool: { ...prev.itemPool, items: prev.itemPool.items.filter(i => i.id !== item.id) },
    }))
  }

  function updateItem(id, changes) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.map(i => i.id === id ? { ...i, ...changes } : i),
      },
    }))
  }

  function removeItemAndAddCaps(item) {
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + (item.caps ?? 0),
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.id !== item.id),
      },
    }))
  }

  function handleSellAllRecovery() {
    const total = recoveryItems.reduce((s, i) => s + (i.caps ?? 0), 0)
    if (!confirm(`Sell all ${recoveryItems.length} recovery items for ${total}c?`)) return
    setState(prev => ({
      ...prev,
      caps: (prev.caps ?? 0) + total,
      itemPool: {
        ...prev.itemPool,
        items: prev.itemPool.items.filter(i => i.location !== 'recovery' && i.location !== 'Temp Pool'),
      },
    }))
  }

  function handleMoveToSettlement(item) {
    const nonBoostStored = storedItems.filter(i => !i.isBoost).length
    if (!item.isBoost && shedCount > 0 && nonBoostStored >= shedCount) {
      alert(`Maintenance Shed full (${shedCount} slot${shedCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'stored' })
  }

  function handleMoveToLocker(item) {
    if (lockerCount > 0 && lockerItems.length >= lockerCount) {
      alert(`Lockers full (${lockerCount} slot${lockerCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'locker' })
  }

  function handleEquipItem(item, unitSlotId) {
    if (storesCount > 0 && storesItems.length >= storesCount) {
      alert(`Stores full (${storesCount} slot${storesCount !== 1 ? 's' : ''})`)
      return
    }
    updateItem(item.id, { location: 'stores', assignedUnit: parseInt(unitSlotId) })
  }

  function handleAddToRecovery(item) {
    setState(prev => ({
      ...prev,
      itemPool: {
        ...prev.itemPool,
        items: [
          ...(prev.itemPool?.items ?? []),
          {
            id: Date.now() + Math.random(),
            catalogId: item.id,
            name: item.name,
            caps: item.caps,
            subType: item.subType,
            isBoost: false,
            location: 'recovery',
            assignedUnit: null,
          },
        ],
      },
    }))
  }

  function handleAddRecoverySearchChange(val) {
    setAddRecoverySearch(val)
    if (!val.trim()) { setAddRecoveryResults([]); return }
    const q = val.toLowerCase()
    setAddRecoveryResults(itemsData.filter(i => i.name.toLowerCase().includes(q)).slice(0, 20))
  }

  function handleAddToPool(item, drawnAt) {
    addRecentlyDrawnToPool(item)
    setPooledSet(prev => new Set([...prev, drawnAt]))
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-white/20 rounded-xl p-3 space-y-3">
        <h3 className="text-title text-xs font-bold tracking-widest border-b border-white/20 pb-1">DECKS</h3>

        <div className="border border-deck-item/50 rounded-lg bg-deck-item-dim/20 p-3 space-y-3">
      {/* Header — filtered subtype deck for structure equipment draws */}
      <div className="flex items-center gap-3 border-b border-deck-item/20 pb-2 flex-wrap gap-y-2">
        <h2 className="text-deck-item text-sm tracking-widest font-bold flex-1">ITEM DECK</h2>
        <span className="text-muted text-xs">{deckCount}/{total} remaining · {discardCount} in discard</span>
        {deck.length === 0 && discard.length > 0 && (
          <button
            onClick={reshuffleDeck}
            className="flex items-center gap-1 text-xs text-amber border border-amber/50 rounded px-2 py-1 hover:bg-amber/10 transition-colors font-bold"
          >
            <Shuffle size={11} /> RESHUFFLE DISCARD
          </button>
        )}
        {(deck.length > 0 || discard.length > 0) && (
          <button
            onClick={reshuffleDeck}
            className="flex items-center gap-1 text-xs text-muted hover:text-amber border border-muted/30 hover:border-amber/60 rounded px-2 py-1 transition-colors"
          ><Shuffle size={11} /> RESHUFFLE</button>
        )}
        <button
          onClick={fullResetDeck}
          className="text-xs text-muted hover:text-danger border border-muted/30 hover:border-danger/60 rounded px-2 py-1 transition-colors"
        >FULL RESET</button>
      </div>

      {/* Deck stats */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="border border-pip-mid/50 rounded bg-panel p-3">
          <div className="text-pip font-bold text-lg">{deckCount}</div>
          <div className="text-muted text-xs">IN DECK</div>
        </div>
        <div className="border border-pip-mid/50 rounded bg-panel p-3">
          <div className="text-pip font-bold text-lg">{discardCount}</div>
          <div className="text-muted text-xs">DISCARDED</div>
        </div>
        <div className="border border-pip-mid/50 rounded bg-panel p-3">
          <div className="text-muted font-bold text-lg">{total}</div>
          <div className="text-muted text-xs">TOTAL</div>
        </div>
      </div>

      {/* Type filter + Draw button */}
      <div className="flex flex-wrap gap-1.5">
        {DECK_FILTER_OPTIONS.map(f => (
          <button
            key={f.id}
            onClick={() => setDeckFilter(f.id)}
            className={`text-xs px-2.5 py-1 border rounded transition-colors ${
              deckFilter === f.id
                ? 'border-pip text-pip bg-pip-dim/20 font-bold'
                : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
            }`}
          >{f.label}</button>
        ))}
        <button
          onClick={drawManualFromDeck}
          disabled={deckCount === 0 && discardCount === 0}
          className="ml-auto text-xs border border-amber text-amber font-bold hover:bg-amber-dim/30 rounded px-4 py-1 transition-colors disabled:opacity-40"
          style={{ boxShadow: '0 0 6px var(--color-amber-glow)' }}
        >DRAW CARD</button>
      </div>

      <p className="text-muted text-xs italic">
        Draws sequentially through the deck. All drawn cards go to discard — even items added to your Settlement Pool.
        When the deck runs empty the discard pile reshuffles into a new deck.
      </p>

      {/* Recently drawn */}
      {recentlyDrawn.length > 0 && (
        <div>
          <div className="text-muted text-xs tracking-wider mb-2">RECENTLY DRAWN</div>
          <div className="space-y-1.5">
            {recentlyDrawn.map((item, i) => {
              const added = pooledSet.has(item.drawnAt)
              return (
                <div key={item.drawnAt} className={`flex items-center gap-3 border rounded px-3 py-2 ${
                  added ? 'border-pip-dim/30 opacity-60' : 'border-pip-mid/40 bg-panel-light'
                }`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-pip text-xs font-bold">{item.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                      {item.caps != null && <span className="text-muted text-xs">{item.caps}c</span>}
                      {added && <span className="text-pip text-xs">✓ ADDED TO POOL</span>}
                    </div>
                  </div>
                  {!added && (
                    <button
                      onClick={() => handleAddToPool(item, item.drawnAt)}
                      className="text-xs border border-pip text-pip hover:bg-pip-dim rounded px-2 py-1 transition-colors font-bold shrink-0"
                    >ADD TO POOL</button>
                  )}
                  <button
                    onClick={() => setRecentlyDrawn(prev => prev.filter((_, j) => j !== i))}
                    className="text-xs border border-muted/30 text-muted hover:text-pip rounded px-2 py-1 transition-colors shrink-0"
                  >DISCARD</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {deckCount === 0 && discardCount === 0 && recentlyDrawn.length === 0 && (
        <p className="text-center py-8 text-muted text-xs border border-dashed border-muted/30 rounded">
          No deck initialized — draw a card or use a structure to start.
        </p>
      )}
        </div>

        {/* ── BOOST DECK ── */}
        <div className="border rounded bg-deck-boost-dim/20" style={{ borderColor: 'rgba(29,233,182,0.5)', boxShadow: '0 0 10px rgba(29,233,182,0.12)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap gap-y-1" style={{ borderColor: 'rgba(29,233,182,0.25)' }}>
          <Sparkles size={13} className="text-deck-boost" />
          <h3 className="text-deck-boost text-sm font-bold tracking-wider flex-1">BOOST DECK</h3>
          <span className="text-muted text-xs">{boostDeckCount}/{allBoostIds.length} remaining · {boostDiscardCount} discarded</span>
          {boostDeck.length === 0 && boostDiscard.length > 0 && (
            <button
              onClick={() => setState(prev => ({ ...prev, boostDeck: [...(prev.boostDiscard ?? [])].sort(() => Math.random() - 0.5), boostDiscard: [] }))}
              className="flex items-center gap-1 text-xs border rounded px-2 py-1 hover:opacity-80 transition-colors font-bold text-deck-boost border-deck-boost/60"
            ><Shuffle size={11} /> RESHUFFLE</button>
          )}
          {(boostDeck.length > 0 || boostDiscard.length > 0) && (
            <button
              onClick={() => { if (!confirm('Reset Boost Deck? This reshuffles all boost cards back in.')) return; setState(prev => ({ ...prev, boostDeck: [...buildBoostDeckIds()].sort(() => Math.random() - 0.5), boostDiscard: [] })) }}
              className="text-xs border rounded px-2 py-1 transition-colors text-muted hover:text-danger border-muted/30 hover:border-danger/50"
            >RESET</button>
          )}
        </div>
        <div className="p-4 space-y-3">
          <p className="text-muted text-xs italic">Draw boost cards during settlement phase. Boosts go to your Recovery Pool — move to hand before battle or to Stores to keep them. Unused boosts are discarded at round end.</p>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleDrawRandomBoost}
              className="flex items-center gap-1.5 text-xs border font-bold rounded px-4 py-1.5 hover:opacity-80 transition-colors text-deck-boost border-deck-boost/70"
              style={{ boxShadow: '0 0 6px rgba(29,233,182,0.25)' }}
            ><Sparkles size={11} /> DRAW RANDOM BOOST</button>
            <button
              onClick={() => { setShowBoostBrowse(v => !v); setBoostBrowseSearch('') }}
              className="flex items-center gap-1.5 text-xs border rounded px-3 py-1.5 transition-colors text-muted hover:text-pip hover:border-pip border-muted/40"
            ><Plus size={11} /> ADD MANUALLY</button>
          </div>

          {/* Browse boost cards */}
          {showBoostBrowse && (
            <div className="border rounded p-3 space-y-2 bg-panel-alt border-deck-boost/30">
              <div className="flex items-center justify-between">
                <span className="text-deck-boost text-xs tracking-wider">BROWSE BOOSTS</span>
                <button onClick={() => setShowBoostBrowse(false)} className="text-muted hover:text-danger"><X size={13} /></button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <input
                  type="text"
                  value={boostBrowseSearch}
                  onChange={e => setBoostBrowseSearch(e.target.value)}
                  placeholder="Search boost name..."
                  className="flex-1 text-xs py-1 px-2 min-w-0"
                  autoFocus
                />
                <select value={boostBrowseType} onChange={e => setBoostBrowseType(e.target.value)} className="text-xs py-1 px-1">
                  <option value="all">All Types</option>
                  <option value="tactical">Tactical</option>
                  <option value="instinctive">Instinctive</option>
                  <option value="cunning">Cunning</option>
                  <option value="practiced">Practiced</option>
                </select>
              </div>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {boostsData
                  .filter(b =>
                    (boostBrowseType === 'all' || b.boostType === boostBrowseType) &&
                    (!boostBrowseSearch.trim() || b.name.toLowerCase().includes(boostBrowseSearch.toLowerCase()))
                  )
                  .map(b => {
                    const s = BOOST_TYPE_STYLE[b.boostType] || {}
                    return (
                      <div
                        key={b.id}
                        onClick={() => { handleAddBoostToRecovery(b); setShowBoostBrowse(false) }}
                        className="flex items-start gap-2 border rounded px-3 py-2 cursor-pointer hover:opacity-80 transition-colors"
                        style={{ borderColor: `${s.color}40` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold" style={{ color: s.color }}>{b.name}</span>
                            <span className="text-xs px-1 rounded border" style={{ color: s.color, borderColor: `${s.color}50` }}>{s.label}</span>
                          </div>
                          <p className="text-muted text-xs mt-0.5 leading-relaxed">{b.effect}</p>
                        </div>
                        <Plus size={12} className="text-muted shrink-0 mt-0.5" />
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      </div>{/* end DECKS section */}

      <div className="border-2 border-white/20 rounded-xl p-3 space-y-3 mt-4">
        <h3 className="text-title text-xs font-bold tracking-widest border-b border-white/20 pb-1">POOLS</h3>

      {/* ── RECOVERY POOL ── */}
      <div className="border rounded bg-panel mt-2" style={{ borderColor: 'rgba(255,145,0,0.55)', boxShadow: '0 0 10px rgba(255,145,0,0.15)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'rgba(255,145,0,0.3)' }}>
          <h3 className="text-pool-recovery text-sm font-bold tracking-wider flex-1">RECOVERY POOL ({recoveryItems.length})</h3>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-muted text-xs">Items gathered from battle. Use Maintenance Sheds to process into your Settlement Pool.</p>

          {/* Filter + Add */}
          <div className="flex gap-1.5 flex-wrap items-center">
            {DECK_FILTER_OPTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => setRecoveryFilter(f.id)}
                className={`text-xs px-2 py-0.5 border rounded transition-colors ${
                  recoveryFilter === f.id
                    ? 'border-pip text-pip bg-pip-dim/20 font-bold'
                    : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                }`}
              >{f.label}</button>
            ))}
            <button
              onClick={() => { setShowAddRecovery(true); setAddRecoverySearch(''); setAddRecoveryResults([]) }}
              className="ml-auto flex items-center gap-1 text-xs px-3 py-1 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors"
            >
              <Plus size={11} /> ADD ITEM
            </button>
          </div>

          {/* Add item modal inline */}
          {showAddRecovery && (
            <div className="border border-pip-mid/40 rounded bg-panel-alt p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted text-xs tracking-wider">ADD ITEM TO RECOVERY</span>
                <button onClick={() => setShowAddRecovery(false)} className="text-muted hover:text-danger"><X size={13} /></button>
              </div>
              <input
                type="text"
                value={addRecoverySearch}
                onChange={e => handleAddRecoverySearchChange(e.target.value)}
                placeholder="Search items by name..."
                className="w-full text-xs py-1 px-2"
                autoFocus
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {addRecoveryResults.length === 0 && addRecoverySearch.trim() && (
                  <p className="text-muted text-xs">No results found.</p>
                )}
                {addRecoveryResults.map(item => (
                  <div
                    key={item.id}
                    onClick={() => { handleAddToRecovery(item); setShowAddRecovery(false) }}
                    className="flex items-center justify-between border border-muted/40 rounded px-3 py-2 hover:bg-panel cursor-pointer"
                  >
                    <span className="text-pip text-xs">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted text-xs">{item.subType}</span>
                      <span className="text-amber text-xs font-bold">{item.caps}c</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recovery items list */}
          {filteredRecovery.length === 0 ? (
            <p className="text-muted text-xs">No items in recovery pool.</p>
          ) : (
            <div className="space-y-1">
              {filteredRecovery.map(item => {
                if (item.isBoost) {
                  const bs = BOOST_TYPE_STYLE[item.boostType] || {}
                  const boostRef = boostsData.find(b => b.id === item.boostId)
                  return (
                    <div key={item.id} className="border rounded px-3 py-2 bg-panel-light space-y-1" style={{ borderColor: `${bs.color || '#a855f7'}40` }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Sparkles size={11} style={{ color: bs.color }} />
                        <span className="text-xs font-bold flex-1 min-w-0" style={{ color: bs.color }}>{item.name}</span>
                        <span className="text-xs px-1.5 py-0.5 border rounded" style={{ color: bs.color, borderColor: `${bs.color}50` }}>{bs.label || item.boostType}</span>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            onClick={() => handleMoveBoostToHand(item)}
                            className="text-xs px-2 py-0.5 border font-bold rounded hover:opacity-80 transition-colors"
                            style={{ color: bs.color, borderColor: `${bs.color}70` }}
                          >TO HAND</button>
                          <button
                            onClick={() => handleMoveBoostToStores(item)}
                            className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors"
                          >TO STORES</button>
                          <button
                            onClick={() => handleDiscardBoostItem(item)}
                            className="text-xs px-2 py-0.5 border border-muted/30 rounded text-dim hover:text-danger hover:border-danger/40 transition-colors"
                          >DISCARD</button>
                        </div>
                      </div>
                      {boostRef && <p className="text-muted text-xs leading-relaxed pl-5">{boostRef.effect}</p>}
                    </div>
                  )
                }
                return (
                  <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                    <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                    <span className="text-amber text-xs font-bold">{item.caps}c</span>
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => handleMoveToSettlement(item)}
                        disabled={shedCount > 0 && storedItems.filter(i => !i.isBoost).length >= shedCount}
                        className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={`Move to Settlement Pool (${storedItems.filter(i => !i.isBoost).length}/${shedCount} shed slots)`}
                      >TO SETTLEMENT</button>
                      <button
                        onClick={() => handleMoveToLocker(item)}
                        disabled={lockerCount > 0 && lockerItems.length >= lockerCount}
                        className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={`Move to Locker (${lockerItems.length}/${lockerCount} slots)`}
                      >LOCKER</button>
                      <button
                        onClick={() => removeItemAndAddCaps(item)}
                        className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors"
                      >SELL {item.caps}c</button>
                    </div>
                  </div>
                )
              })}
              <div className="pt-2">
                <button
                  onClick={handleSellAllRecovery}
                  className="text-xs px-4 py-2 border border-danger/40 text-danger rounded hover:bg-danger-dim/10 transition-colors"
                >
                  SELL ALL ({recoveryItems.filter(i => !i.isBoost).reduce((s, i) => s + (i.caps ?? 0), 0)}c)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── SETTLEMENT POOL ── */}
      <div className="border rounded bg-panel" style={{ borderColor: 'rgba(0,160,255,0.55)', boxShadow: '0 0 10px rgba(0,160,255,0.15)' }}>
        <div className="flex items-center gap-3 px-4 py-3 border-b flex-wrap gap-y-1" style={{ borderColor: 'rgba(0,160,255,0.3)' }}>
          <h3 className="text-sm font-bold tracking-wider flex-1" style={{ color: '#00a0ff', textShadow: '0 0 8px rgba(0,160,255,0.6)' }}>SETTLEMENT POOL ({storedItems.length})</h3>
          <span className="text-muted text-xs">
            SHED {storedItems.filter(i => !i.isBoost).length}/{shedCount} · LOCKERS {lockerItems.length}/{lockerCount} · STORES {storesItems.length}/{storesCount}
          </span>
        </div>
        <div className="p-4 space-y-3">
          <p className="text-muted text-xs">Items available for equipping or storing. Unsaved items are sold at round end.</p>

          {/* Filter */}
          <div className="flex gap-1.5 flex-wrap">
            {DECK_FILTER_OPTIONS.map(f => (
              <button
                key={f.id}
                onClick={() => setSettlementFilter(f.id)}
                className={`text-xs px-2 py-0.5 border rounded transition-colors ${
                  settlementFilter === f.id
                    ? 'border-pip text-pip bg-pip-dim/20 font-bold'
                    : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                }`}
              >{f.label}</button>
            ))}
          </div>

          {/* Stored items */}
          {filteredStored.length === 0 ? (
            <p className="text-muted text-xs">No items in settlement pool.</p>
          ) : (
            <div className="space-y-1">
              {filteredStored.map(item => (
                <SettlementPoolItem
                  key={item.id}
                  item={item}
                  roster={roster}
                  storesCount={storesCount}
                  storesItems={storesItems}
                  lockerCount={lockerCount}
                  lockerItems={lockerItems}
                  onEquip={(unitSlotId) => handleEquipItem(item, unitSlotId)}
                  onLocker={() => handleMoveToLocker(item)}
                  onSell={() => removeItemAndAddCaps(item)}
                  onMoveBoostToHand={() => handleMoveBoostToHand(item)}
                  onDiscardBoost={() => handleDiscardBoostItem(item)}
                />
              ))}
            </div>
          )}

          {/* Lockers sub-section */}
          <div className="border-t border-muted/20 pt-3">
            <div className="text-muted text-xs font-bold tracking-wider mb-2">
              LOCKERS ({lockerItems.length}/{lockerCount})
            </div>
            {lockerItems.length === 0 ? (
              <p className="text-muted text-xs">No items in lockers.</p>
            ) : (
              <div className="space-y-1 ml-2">
                {lockerItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                    <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                    <span className="text-amber text-xs font-bold">{item.caps}c</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateItem(item.id, { location: 'stored' })}
                        className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors"
                      >RETURN TO POOL</button>
                      <button
                        onClick={() => removeItemAndAddCaps(item)}
                        className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors"
                      >SELL {item.caps}c</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Equipped / Stores sub-section */}
          <div className="border-t border-muted/20 pt-3">
            <div className="text-muted text-xs font-bold tracking-wider mb-2">
              EQUIPPED / STORES ({storesItems.length}/{storesCount})
            </div>
            {storesItems.length === 0 ? (
              <p className="text-muted text-xs">No items equipped or in stores.</p>
            ) : (
              <div className="space-y-3 ml-2">
                {(() => {
                  const groups = {}
                  storesItems.forEach(item => {
                    const key = item.assignedUnit != null ? String(item.assignedUnit) : 'unassigned'
                    if (!groups[key]) groups[key] = []
                    groups[key].push(item)
                  })
                  return Object.entries(groups).map(([unitKey, groupItems]) => {
                    const unit = roster.find(u => String(u.slotId) === unitKey)
                    return (
                      <div key={unitKey}>
                        <div className="text-muted text-xs mb-1 font-bold">
                          {unit ? unit.unitName : 'Unassigned'}
                        </div>
                        <div className="space-y-1">
                          {groupItems.map(item => (
                            <div key={item.id} className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
                              <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                              <span className="text-amber text-xs font-bold">{item.caps}c</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => updateItem(item.id, { location: 'stored', assignedUnit: null })}
                                  className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors"
                                >UNEQUIP</button>
                                <button
                                  onClick={() => removeItemAndAddCaps(item)}
                                  className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors"
                                >SELL {item.caps}c</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>{/* end POOLS section */}
    </div>
  )
}

/* Inline equip helper for SettlementDeckPanel */
function SettlementPoolItem({ item, roster, storesCount, storesItems, lockerCount, lockerItems, onEquip, onLocker, onSell, onMoveBoostToHand, onDiscardBoost }) {
  const [pickingUnit, setPickingUnit] = useState(false)

  if (item.isBoost) {
    const bs = BOOST_TYPE_STYLE[item.boostType] || {}
    const boostRef = boostsData.find(b => b.id === item.boostId)
    return (
      <div className="border rounded px-3 py-2 bg-panel-light space-y-1" style={{ borderColor: `${bs.color || '#a855f7'}40` }}>
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={11} style={{ color: bs.color }} />
          <span className="text-xs font-bold flex-1 min-w-0" style={{ color: bs.color }}>{item.name}</span>
          <span className="text-xs px-1.5 py-0.5 border rounded" style={{ color: bs.color, borderColor: `${bs.color}50` }}>{bs.label || item.boostType}</span>
          <div className="flex gap-1">
            <button onClick={onMoveBoostToHand} className="text-xs px-2 py-0.5 border font-bold rounded hover:opacity-80 transition-colors" style={{ color: bs.color, borderColor: `${bs.color}70` }}>TO HAND</button>
            <button onClick={onDiscardBoost} className="text-xs px-2 py-0.5 border border-muted/30 rounded text-dim hover:text-danger hover:border-danger/40 transition-colors">DISCARD</button>
          </div>
        </div>
        {boostRef && <p className="text-muted text-xs leading-relaxed pl-5">{boostRef.effect}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 border border-pip-mid/30 rounded px-3 py-2 bg-panel-light flex-wrap">
      <span className="text-pip text-xs flex-1 min-w-0">{item.name}</span>
      <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${DECK_SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
      <span className="text-amber text-xs font-bold">{item.caps}c</span>
      <div className="flex gap-1 flex-wrap items-center">
        {pickingUnit ? (
          <>
            <select
              autoFocus
              defaultValue=""
              onChange={e => { if (e.target.value) { onEquip(e.target.value); setPickingUnit(false) } }}
              className="text-xs py-0.5 px-1"
            >
              <option value="">Pick unit...</option>
              {roster.map(u => (
                <option key={u.slotId} value={u.slotId}>{u.unitName}</option>
              ))}
            </select>
            <button onClick={() => setPickingUnit(false)} className="text-muted hover:text-danger"><X size={12} /></button>
          </>
        ) : (
          <button
            onClick={() => setPickingUnit(true)}
            disabled={storesCount > 0 && storesItems.length >= storesCount}
            className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >EQUIP</button>
        )}
        <button
          onClick={onLocker}
          disabled={lockerCount > 0 && lockerItems.length >= lockerCount}
          className="text-xs px-2 py-0.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >LOCKER</button>
        <button
          onClick={onSell}
          className="text-xs px-2 py-0.5 border border-amber/40 rounded text-amber hover:bg-amber-dim/20 transition-colors"
        >SELL {item.caps}c</button>
      </div>
    </div>
  )
}

/* ── Explore Card Draw Result Modal ── */
function ExploreCardModal({ card, isScoutCamp, onRedraw, onAddToEvents, onDismiss }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal/70 backdrop-blur-sm">
      <div className="bg-panel border border-pip-mid/60 rounded-lg w-full max-w-lg shadow-xl" style={{ boxShadow: '0 0 24px var(--color-pip-glow)' }}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-pip-mid/40">
          <h3 className="text-pip text-sm tracking-widest font-bold">EXPLORE CARD DRAWN</h3>
          <button onClick={onDismiss} className="text-muted hover:text-pip text-xs px-2 py-1 border border-muted/40 rounded hover:border-pip transition-colors">CLOSE</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="border border-pip-mid/40 rounded p-4 bg-panel-alt space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-title text-xs font-bold tracking-wider">#{card.id}</span>
              {card.type && (
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  card.type.includes('★') ? 'bg-amber-dim/50 text-amber' : 'bg-pip-dim/30 text-muted'
                }`}>{card.type}</span>
              )}
            </div>
            <h4 className="text-pip font-bold text-base">{card.name}</h4>
            <p className="text-muted text-sm leading-relaxed">{card.text}</p>
            {card.consequence && (
              <div className="border-t border-pip-dim/30 pt-2 mt-2">
                <p className="text-amber text-xs font-bold mb-1 tracking-wider">CONSEQUENCE</p>
                <p className="text-amber text-sm leading-relaxed">{card.consequence}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {isScoutCamp && (
              <button
                onClick={onRedraw}
                className="flex items-center gap-2 px-4 py-2 border border-amber text-amber rounded text-sm hover:bg-amber-dim/30 transition-colors font-bold"
              >
                <Shuffle size={14} /> REDRAW (Scout Camp)
              </button>
            )}
            {card.consequence && (
              <button
                onClick={onAddToEvents}
                className="flex items-center gap-2 px-4 py-2 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold"
                style={{ boxShadow: '0 0 6px var(--color-pip-glow)' }}
              >
                ADD CONSEQUENCE TO ACTIVE EVENTS
              </button>
            )}
            <button
              onClick={onDismiss}
              className="px-4 py-2 border border-muted/40 text-muted rounded text-sm hover:text-pip hover:border-pip transition-colors ml-auto"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
