import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Zap, Droplets, Building2, Coins, Recycle, Shuffle, X, Sparkles, LayoutGrid, Map } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, getStructureRef, calcSettlementTotalCaps, calcDefenseRating } from '../../utils/calculations'
import { SPECIAL_STRUCTURE_NAMES, parseDrawEffect } from '../../utils/structureEffects'
import AddStructureModal from './AddStructureModal'
import { BarracksModal, MedicalCenterModal, StoresModal } from './StructureUseModals'
import ItemDrawModal from './ItemDrawModal'
import DeckDrawModal from './DeckDrawModal'
import ExploreCardModal from './ExploreCardModal'
import ExplorePanel from './ExplorePanel'
import SettlementDeckPanel from './SettlementDeckPanel'
import Modal from '../layout/Modal'
import { drawCard } from '../../utils/cardDraw'
import CardDrawer from '../overview/CardDrawer'
import eventCardsData from '../../data/eventCards.json'
import itemsData from '../../data/items.json'

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

export default function SettlementPage({ onTabChange }) {
  const { state, setState } = useCampaign()
  const settings = state?.settings ?? {}
  // Open the wizard directly on Step 1 — the old Step 0 landing card was pure friction.
  // Step 0 still exists as the "wizard exited" state and is rendered as a compact banner below.
  const [step, setStep] = useState(1)
  // Below-wizard collapsible panels (always available, collapsed by default).
  const [showDeckPanel, setShowDeckPanel] = useState(false)
  const [showExplorePanel, setShowExplorePanel] = useState(false)
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
        // Listening Post draws an explore card and costs 50 caps. No confirmation —
        // mark the structure used to opt in, click again to undo.
        extraUpdates.caps = Math.max(0, (prev.caps || 0) - 50)
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
    onTabChange,
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

      {/* ── STEP 0 — Compact resume banner (after user exits the wizard) ── */}
      {step === 0 && (
        <div className="border border-amber/50 rounded-lg bg-panel px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-amber text-xs font-bold tracking-widest">SETTLEMENT PHASE PAUSED</span>
            <span className="text-muted text-xs hidden sm:inline">
              {caps.toLocaleString()}c · {recoveryPoolItems.length} recovery · {structures.length} structures
            </span>
          </div>
          <button
            onClick={() => setStep(1)}
            className="min-h-[44px] px-4 py-2 border border-amber text-amber bg-amber/10 font-bold tracking-wider text-xs hover:bg-amber/20 transition-colors"
          >
            RESUME PHASE →
          </button>
        </div>
      )}

      {/* ── WIZARD STEPS 1-4 ── */}
      {step >= 1 && (
        <div className="space-y-4">
          {/* Step bar */}
          <div className="sticky top-0 z-20 -mx-4 px-4 py-2 bg-panel/95 backdrop-blur-sm border-b border-pip-dim/40">
            <div className="flex gap-1 items-stretch">
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
              <button
                type="button"
                onClick={() => setStep(0)}
                title="Pause wizard — collapsed view with resume button"
                className="min-h-[44px] px-3 border border-muted/30 rounded text-muted text-xs tracking-wider hover:text-pip hover:border-pip transition-colors"
              >
                EXIT
              </button>
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

      {/* ── ALWAYS-VISIBLE: Item Deck + Explore (collapsed by default) ── */}
      {/* Structures live on HOMESTEAD; the structures sub-tab was a duplicate. */}
      <div className="mt-6 border-t border-pip-dim/30 pt-4 space-y-2">
        <button
          type="button"
          onClick={() => setShowDeckPanel(v => !v)}
          className="w-full px-3 py-2 flex items-center gap-2 text-left bg-panel-light border border-pip-mid/40 rounded hover:bg-panel-alt"
        >
          <span className="text-muted text-xs">{showDeckPanel ? '▼' : '▶'}</span>
          <span className="text-pip text-xs tracking-widest font-bold flex-1">ITEM + BOOST DECKS</span>
          <span className="text-muted/60 text-[10px] tracking-wider">Persistent deck · manual draw · reshuffle</span>
        </button>
        {showDeckPanel && <SettlementDeckPanel structures={structures} />}

        <button
          type="button"
          onClick={() => setShowExplorePanel(v => !v)}
          className="w-full px-3 py-2 flex items-center gap-2 text-left bg-panel-light border border-pip-mid/40 rounded hover:bg-panel-alt"
        >
          <span className="text-muted text-xs">{showExplorePanel ? '▼' : '▶'}</span>
          <span className="text-pip text-xs tracking-widest font-bold flex-1">EXPLORE</span>
          <span className="text-muted/60 text-[10px] tracking-wider">Active events · locations · deck draws</span>
        </button>
        {showExplorePanel && <ExplorePanel state={state} setState={setState} />}
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
  onTabChange,
}) {
  const defenseRating = calcDefenseRating(structures)
  return (
    <>
      {/* Caps — clickable to HOMESTEAD where they can be edited */}
      <button
        type="button"
        onClick={() => onTabChange?.('homestead')}
        className="mb-4 w-full sm:w-auto flex items-center gap-2 border border-amber/50 rounded px-3 py-2 bg-panel hover:bg-amber/10 transition-colors text-left min-h-[44px]"
        title="Edit caps on HOMESTEAD"
      >
        <Coins size={14} className="text-amber" />
        <span className="text-xs text-muted">CAPS:</span>
        <span className="text-amber font-bold text-sm">{(caps).toLocaleString()}c</span>
        <span className="text-muted text-xs ml-2">— edit on HOMESTEAD →</span>
      </button>

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

