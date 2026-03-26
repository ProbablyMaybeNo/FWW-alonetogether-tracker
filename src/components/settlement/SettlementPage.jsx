import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Zap, Droplets, Building2, Coins, Recycle, Shuffle } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, getStructureRef, calcSettlementTotalCaps } from '../../utils/calculations'
import AddStructureModal from './AddStructureModal'
import ItemPoolPanel from './ItemPoolPanel'
import { BarracksModal, MedicalCenterModal } from './StructureUseModals'
import { getDeckStats } from '../../utils/cardDraw'
import eventCardsData from '../../data/eventCards.json'
import exploreCardDeck from '../../data/exploreCardDeck.json'

const CONDITION_OPTIONS = ['Undamaged', 'Damaged', 'Badly Damaged', 'Wrecked', 'Reinforced']

// Free Phase 3 starting structures: 2x Generator-Small(1), Stores(53), Maintenance Shed(54), Listening Post(50)
const PHASE3_FREE_IDS = [1, 1, 53, 54, 50]

// Structures with special use handlers
const SPECIAL_STRUCTURE_NAMES = ['Listening Post', 'Ranger Outpost', 'Scout Camp', 'Barracks', 'Medical Center']

const SETTLEMENT_SUB_TABS = [
  { id: 'structures', label: 'STRUCTURES' },
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
  const [subTab, setSubTab] = useState('structures')
  const [showAddStructure, setShowAddStructure] = useState(false)
  const [atValidOnly, setAtValidOnly] = useState(true)
  const [showBarracks, setShowBarracks] = useState(false)
  const [showMedCenter, setShowMedCenter] = useState(false)
  // Lost model recovery: array of units to check
  const [lostRecoveryQueue, setLostRecoveryQueue] = useState([])

  const structures = state.settlement.structures || []
  const phase = state.phase ?? 1
  const caps = state.caps ?? 0
  const landPurchased = state.settlement.landPurchased ?? false
  const maxSlots = landPurchased ? 25 : 15
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

  // Quest-based land claim
  const completedQuestCount = (state.questCards || []).filter(q => q.status === 'Complete').length

  const roster = state.roster || []

  function handleAddStructure(structure) {
    setState(prev => ({
      ...prev,
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

    // First toggle the state
    setState(prev => {
      const newUsed = !s.usedThisRound
      const newStructures = prev.settlement.structures.map(st =>
        st.instanceId === instanceId ? { ...st, usedThisRound: newUsed } : st
      )

      if (!newUsed) {
        // Un-toggling: just update
        return {
          ...prev,
          settlement: { ...prev.settlement, structures: newStructures },
        }
      }

      // Special handling on toggle ON
      let extraUpdates = {}

      if (structureName === 'Listening Post') {
        const deduct = confirm('Listening Post use costs 50c. Deduct from caps?\n\n[OK = Deduct 50c | Cancel = Skip]')
        extraUpdates.caps = deduct ? Math.max(0, (prev.caps || 0) - 50) : prev.caps
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Ranger Outpost') {
        alert('Ranger Outpost: free Explore card this round.')
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Scout Camp') {
        alert('Scout Camp: draw and optionally redraw 1 Explore card.')
        const newCount = (prev.exploreCardsThisRound || 0) + 1
        extraUpdates.exploreCardsThisRound = newCount
        setTimeout(() => checkLostUnits(newCount), 100)
      } else if (structureName === 'Barracks') {
        setTimeout(() => setShowBarracks(true), 100)
      } else if (structureName === 'Medical Center') {
        setTimeout(() => setShowMedCenter(true), 100)
      }

      return {
        ...prev,
        ...extraUpdates,
        settlement: { ...prev.settlement, structures: newStructures },
      }
    })
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
    if (!confirm('Reset all structures to unused for the new round?')) return
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(s => ({ ...s, usedThisRound: false })),
      },
    }))
  }

  function handleBuyLand() {
    if (!confirm('Purchase additional land for 500c? This adds 10 extra structure slots.')) return
    setState(prev => ({
      ...prev,
      caps: Math.max(0, (prev.caps ?? 0) - 500),
      settlement: { ...prev.settlement, landPurchased: true },
    }))
  }

  function handleClaimLandViaQuests() {
    if (!confirm('Claim additional land via 5 completed quests? (No cap cost)')) return
    setState(prev => ({
      ...prev,
      settlement: { ...prev.settlement, landPurchased: true },
    }))
  }

  function handlePhase3Setup() {
    if (!confirm('Add free starting structures? (2× Generator – Small, Stores, Maintenance Shed, Listening Post)')) return
    const newStructures = PHASE3_FREE_IDS.map(id => ({
      instanceId: Date.now() + Math.random(),
      structureId: id,
      usedThisRound: false,
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

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Sub-tab switcher */}
      <div className="flex gap-1 mb-4">
        {SETTLEMENT_SUB_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={`flex-1 py-2 text-xs rounded border transition-colors font-bold tracking-wider ${
              subTab === t.id
                ? 'border-pip bg-panel-light text-pip'
                : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'structures' ? (
        <StructuresPanel
          state={state}
          setState={setState}
          structures={structures}
          phase={phase}
          caps={caps}
          landPurchased={landPurchased}
          maxSlots={maxSlots}
          usedSlots={usedSlots}
          pwrGen={pwrGen}
          pwrUsed={pwrUsed}
          waterGen={waterGen}
          waterUsed={waterUsed}
          totalCost={totalCost}
          usedCount={usedCount}
          completedQuestCount={completedQuestCount}
          roster={roster}
          atValidOnly={atValidOnly}
          setAtValidOnly={setAtValidOnly}
          showAddStructure={showAddStructure}
          setShowAddStructure={setShowAddStructure}
          showBarracks={showBarracks}
          setShowBarracks={setShowBarracks}
          showMedCenter={showMedCenter}
          setShowMedCenter={setShowMedCenter}
          currentLostUnit={currentLostUnit}
          handleAddStructure={handleAddStructure}
          handleRemoveStructure={handleRemoveStructure}
          handleScrapStructure={handleScrapStructure}
          handleToggleUsed={handleToggleUsed}
          handleUpdateStructure={handleUpdateStructure}
          handleResetRound={handleResetRound}
          handleBuyLand={handleBuyLand}
          handleClaimLandViaQuests={handleClaimLandViaQuests}
          handlePhase3Setup={handlePhase3Setup}
          handleBarracksApply={handleBarracksApply}
          handleMedCenterApply={handleMedCenterApply}
          handleMarkFound={handleMarkFound}
          handleNotFound={handleNotFound}
        />
      ) : (
        <ExplorePanel state={state} setState={setState} />
      )}
    </div>
  )
}

/* ── Structures sub-panel ── */
function StructuresPanel({
  state, setState,
  structures, phase, caps, landPurchased, maxSlots, usedSlots,
  pwrGen, pwrUsed, waterGen, waterUsed, totalCost, usedCount,
  completedQuestCount, roster,
  atValidOnly, setAtValidOnly,
  showAddStructure, setShowAddStructure,
  showBarracks, setShowBarracks,
  showMedCenter, setShowMedCenter,
  currentLostUnit,
  handleAddStructure, handleRemoveStructure, handleScrapStructure,
  handleToggleUsed, handleUpdateStructure, handleResetRound,
  handleBuyLand, handleClaimLandViaQuests, handlePhase3Setup,
  handleBarracksApply, handleMedCenterApply,
  handleMarkFound, handleNotFound,
}) {
  return (
    <>
      {/* Caps read-only */}
      <div className="mb-4 flex items-center gap-2 border border-amber/50 rounded px-3 py-2 bg-panel">
        <Coins size={14} className="text-amber" />
        <span className="text-xs text-muted">CAPS:</span>
        <span className="text-amber font-bold text-sm">{(caps).toLocaleString()}c</span>
        <span className="text-muted text-xs ml-2">(manage on Overview)</span>
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Zap size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{pwrGen - pwrUsed}</div>
          <div className="text-xs text-muted">NET PWR ({pwrGen}/{pwrUsed})</div>
        </div>
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Droplets size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{waterGen - waterUsed}</div>
          <div className="text-xs text-muted">NET H2O ({waterGen}/{waterUsed})</div>
        </div>
        <div className="border border-pip-mid/60 rounded bg-panel p-2 text-center">
          <Building2 size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{structures.length}</div>
          <div className="text-xs text-muted">STRUCTURES</div>
        </div>
        <div className={`border rounded bg-panel p-2 text-center ${usedSlots >= maxSlots ? 'border-danger/60' : 'border-pip-mid/60'}`}>
          <div className={`text-sm font-bold ${usedSlots >= maxSlots ? 'text-danger' : 'text-pip'}`}>{usedSlots} / {maxSlots}</div>
          <div className="text-xs text-muted">SLOTS</div>
          {usedSlots >= maxSlots && <div className="text-danger text-xs mt-0.5 font-bold">FULL</div>}
        </div>
        <div className="border border-amber/50 rounded bg-panel p-2 text-center">
          <div className="text-sm font-bold text-amber">{totalCost}c</div>
          <div className="text-xs text-muted">TOTAL COST</div>
        </div>
      </div>

      {/* Buy Land / Quest Claim buttons */}
      {!landPurchased && usedSlots >= 12 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={handleBuyLand}
            disabled={caps < 500}
            className="flex items-center gap-2 px-4 py-2 border border-amber text-amber rounded text-sm hover:bg-amber-dim/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold"
          >
            BUY LAND (+10 SLOTS) — 500c
          </button>
          {completedQuestCount >= 5 ? (
            <button
              onClick={handleClaimLandViaQuests}
              className="flex items-center gap-2 px-4 py-2 border border-pip text-pip rounded text-sm hover:bg-pip-dim transition-colors font-bold"
            >
              CLAIM LAND (5 Quests ✓)
            </button>
          ) : (
            <span className="text-muted text-xs self-center">{completedQuestCount}/5 quests completed</span>
          )}
        </div>
      )}

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
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setAtValidOnly(!atValidOnly)}
          className={`flex items-center gap-2 text-xs px-3 py-1.5 border rounded transition-colors ${
            atValidOnly ? 'border-pip text-pip bg-pip-dim/30' : 'border-muted/40 text-muted hover:text-pip hover:border-pip'
          }`}
        >
          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${atValidOnly ? 'border-pip bg-pip' : 'border-muted'}`}>
            {atValidOnly && <span className="text-terminal text-xs leading-none font-bold">✓</span>}
          </span>
          SHOW AT STRUCTURES ONLY
        </button>
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
        <div className="space-y-1">
          {structures.map(s => {
            const ref = getStructureRef(s.structureId)
            if (!ref) return null
            const isSpecial = SPECIAL_STRUCTURE_NAMES.includes(ref.name)
            return (
              <div key={s.instanceId} className={`border rounded px-3 py-2 flex items-start gap-3 transition-colors ${
                s.usedThisRound ? 'border-pip-dim/20 bg-panel-alt opacity-50' : isSpecial ? 'border-amber/30 bg-panel' : 'border-pip-mid/40 bg-panel'
              }`}>
                <button
                  onClick={() => handleToggleUsed(s.instanceId)}
                  className={`mt-1 w-5 h-5 rounded border shrink-0 flex items-center justify-center text-xs transition-colors ${
                    s.usedThisRound ? 'border-pip bg-pip text-terminal font-bold' : 'border-muted hover:border-pip'
                  } ${isSpecial ? 'ring-1 ring-amber/50' : ''}`}
                  title={isSpecial ? `${ref.name} — has special use effect` : undefined}
                >
                  {s.usedThisRound ? '✓' : ''}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-pip text-sm font-bold">{ref.name}</span>
                    {isSpecial && <span className="text-amber text-xs font-bold">★</span>}
                    <span className="text-xs text-muted">{ref.category}</span>
                    <span className="text-xs text-amber font-bold">{ref.cost}c</span>
                    {ref.pwrGen > 0 && <span className="text-xs text-pip font-bold">+{ref.pwrGen}⚡</span>}
                    {ref.pwrReq > 0 && <span className="text-xs text-muted">-{ref.pwrReq}⚡</span>}
                    {ref.waterGen > 0 && <span className="text-xs text-pip font-bold">+{ref.waterGen}💧</span>}
                    {ref.waterReq > 0 && <span className="text-xs text-muted">-{ref.waterReq}💧</span>}
                  </div>
                  <p className="text-muted text-xs mt-1 leading-relaxed">{ref.effect}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <select value={s.condition} onChange={(e) => handleUpdateStructure(s.instanceId, 'condition', e.target.value)}
                      className="text-xs py-0.5 px-1 bg-panel-alt">
                      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" value={s.notes || ''} onChange={(e) => handleUpdateStructure(s.instanceId, 'notes', e.target.value)}
                      placeholder="Notes..." className="flex-1 text-xs py-0.5 px-1 bg-panel-alt" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {s.condition === 'Undamaged' && (
                    <button
                      onClick={() => handleScrapStructure(s.instanceId)}
                      className="text-muted hover:text-amber flex items-center gap-0.5 text-xs transition-colors"
                      title={`Scrap for ${Math.floor((ref.cost || 0) / 2)}c`}
                    >
                      <Recycle size={12} />
                    </button>
                  )}
                  <button onClick={() => handleRemoveStructure(s.instanceId)} className="text-muted hover:text-danger mt-1 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Item Pool Panel */}
      <ItemPoolPanel structures={structures} />

      <AddStructureModal
        isOpen={showAddStructure}
        onClose={() => setShowAddStructure(false)}
        onAdd={handleAddStructure}
        atValidOnly={atValidOnly}
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
          {/* Stats */}
          <div className="flex gap-4 text-xs">
            <span className="text-pip font-bold">Available: {exploreStats.available}</span>
            <span className="text-muted">Drawn: {exploreStats.drawn}</span>
            <span className="text-amber font-bold">In Play: {exploreStats.inPlay}</span>
            <span className="text-muted">Complete: {exploreStats.completed}</span>
            <button onClick={handleResetExploreDeck} className="ml-auto text-muted hover:text-danger transition-colors">RESET DECK</button>
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
