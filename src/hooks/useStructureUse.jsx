import { useState } from 'react'
import { useCampaign } from '../context/CampaignContext'
import { getStructureRef } from '../utils/calculations'
import { SPECIAL_STRUCTURE_NAMES, parseDrawEffect } from '../utils/structureEffects'
import { drawCard } from '../utils/cardDraw'
import eventCardsData from '../data/eventCards.json'
import itemsData from '../data/items.json'
import { BarracksModal, MedicalCenterModal, StoresModal } from '../components/settlement/StructureUseModals'
import ExploreCardModal from '../components/settlement/ExploreCardModal'
import DeckDrawModal from '../components/settlement/DeckDrawModal'
import ItemDrawModal from '../components/settlement/ItemDrawModal'

// Shared "use a structure" engine. Ported from SettlementPage.handleToggleUsed.
// Owns all modal state + side-effect logic so HOMESTEAD can call toggleUsed()
// and get the same behaviour (caps deduction, explore card draw, deck pull,
// special-use modals) without redirecting to the SETTLEMENT tab.
//
// Usage:
//   const { toggleUsed, modalElements, currentLostUnit, handleMarkFound, handleNotFound } = useStructureUse()
//   ...
//   <button onClick={() => toggleUsed(structureInstanceId)}>USE</button>
//   {modalElements}
//   {currentLostUnit && <LostRecoveryAlert unit={currentLostUnit} onMarkFound={handleMarkFound} onNotFound={handleNotFound} />}

const SETTLEMENT_DECK_TYPES = [
  'Pistol', 'Rifle', 'Heavy Weapon', 'Melee', 'Grenade', 'Mine',
  'Armor', 'Clothing', 'Food', 'Drink', 'Chem', 'Utility', 'Mod',
]

function buildFullDeckIds() {
  return itemsData.map(i => i.id)
}

function itemMatchesTypeLabel(item, typeLabel) {
  const label = typeLabel.toLowerCase()
  if (label.includes('power armor')) return item.subType === 'Mod' && item.name.toLowerCase().includes('power armor')
  if (label.includes('creature mod')) return item.subType === 'Mod' && item.name.toLowerCase().includes('creature')
  if (label.includes('armor mod')) return item.subType === 'Mod'
  if (label.includes('weapon')) return ['Pistol', 'Rifle', 'Heavy Weapon', 'Melee', 'Grenade', 'Mine'].includes(item.subType)
  if (label.includes('armor')) return item.subType === 'Armor'
  if (label.includes('clothing')) return item.subType === 'Clothing'
  if (label.includes('drink')) return item.subType === 'Drink'
  if (label.includes('food')) return item.subType === 'Food'
  if (label.includes('chem')) return item.subType === 'Chem'
  if (label.includes('junk') || label.includes('gear')) return ['Utility', 'Mod', 'Automatron Part'].includes(item.subType)
  if (label.includes('mod')) return item.subType === 'Mod'
  return SETTLEMENT_DECK_TYPES.includes(item.subType)
}

export default function useStructureUse() {
  const { state, setState } = useCampaign()
  const [showBarracks, setShowBarracks] = useState(false)
  const [showMedCenter, setShowMedCenter] = useState(false)
  const [showStores, setShowStores] = useState(false)
  const [pendingExploreCard, setPendingExploreCard] = useState(null)
  const [pendingIsScoutCamp, setPendingIsScoutCamp] = useState(false)
  const [pendingItemDraw, setPendingItemDraw] = useState(null)
  const [lostRecoveryQueue, setLostRecoveryQueue] = useState([])

  const structures = state?.settlement?.structures || []
  const roster = state?.roster || []
  const currentLostUnit = lostRecoveryQueue[0] || null

  function checkLostUnits(exploreCount) {
    const lost = roster.filter(u => u.fate === 'Lost')
    if (lost.length > 0) {
      setLostRecoveryQueue(lost.map(u => ({ ...u, exploreCount })))
    }
  }

  function toggleUsed(instanceId) {
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
      const newStructures = (prev.settlement?.structures ?? []).map(st =>
        st.instanceId === instanceId ? { ...st, usedThisRound: newUsed } : st
      )

      if (!newUsed) {
        return { ...prev, settlement: { ...prev.settlement, structures: newStructures } }
      }

      let extraUpdates = {}

      if (structureName === 'Listening Post') {
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

    if (drawnCard) {
      setTimeout(() => {
        setPendingIsScoutCamp(structureName === 'Scout Camp')
        setPendingExploreCard(drawnCard)
      }, 150)
    }
  }

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
        if (action === 'heal') return { ...u, regDamage: Math.max(0, (u.regDamage || 0) - 2) }
        if (action === 'addiction') return { ...u, addiction: '' }
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

  const modalElements = (
    <>
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
        poolItems={state?.itemPool?.items || []}
        roster={roster}
        onApply={(selections) => { handleStoresApply(selections); setShowStores(false) }}
      />
    </>
  )

  return {
    toggleUsed,
    modalElements,
    currentLostUnit,
    handleMarkFound,
    handleNotFound,
  }
}
