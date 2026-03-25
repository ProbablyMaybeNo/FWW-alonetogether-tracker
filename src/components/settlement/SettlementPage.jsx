import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Zap, Droplets, Building2, Coins, Recycle } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, getStructureRef, calcSettlementTotalCaps } from '../../utils/calculations'
import AddStructureModal from './AddStructureModal'
import ItemPoolPanel from './ItemPoolPanel'
import { BarracksModal, MedicalCenterModal } from './StructureUseModals'

const CONDITION_OPTIONS = ['Undamaged', 'Damaged', 'Badly Damaged', 'Wrecked', 'Reinforced']

// Free Phase 3 starting structures: 2x Generator-Small(1), Stores(53), Maintenance Shed(54), Listening Post(50)
const PHASE3_FREE_IDS = [1, 1, 53, 54, 50]

// Structures with special use handlers
const SPECIAL_STRUCTURE_NAMES = ['Listening Post', 'Ranger Outpost', 'Scout Camp', 'Barracks', 'Medical Center']

export default function SettlementPage() {
  const { state, setState } = useCampaign()
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
      {/* Caps read-only */}
      <div className="mb-4 flex items-center gap-2 border border-amber/30 rounded px-3 py-2 bg-panel">
        <Coins size={14} className="text-amber" />
        <span className="text-xs text-pip-dim">CAPS:</span>
        <span className="text-amber font-bold text-sm">{(caps).toLocaleString()}c</span>
        <span className="text-pip-dim text-xs ml-2">(manage on Overview)</span>
      </div>

      {/* Lost Model Recovery Alert */}
      {currentLostUnit && (
        <div className="mb-4 border border-amber rounded bg-amber-dim/10 px-4 py-3">
          <div className="text-amber text-xs font-bold mb-1">LOST MODEL RECOVERY</div>
          <p className="text-pip-dim text-xs mb-2">
            <span className="text-pip font-bold">{currentLostUnit.unitName}</span> is Lost. Roll a red die: if result ≤{' '}
            <span className="text-amber font-bold">{currentLostUnit.exploreCount}</span> they are found.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleMarkFound(currentLostUnit.slotId)}
              className="text-xs px-3 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/30"
            >
              MARK FOUND
            </button>
            <button
              onClick={handleNotFound}
              className="text-xs px-3 py-1.5 border border-pip-dim text-pip-dim rounded hover:text-pip"
            >
              Not found
            </button>
          </div>
        </div>
      )}

      {/* Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
        <div className="border border-pip-dim rounded bg-panel p-2 text-center">
          <Zap size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{pwrGen - pwrUsed}</div>
          <div className="text-xs text-pip-dim">NET PWR ({pwrGen}/{pwrUsed})</div>
        </div>
        <div className="border border-pip-dim rounded bg-panel p-2 text-center">
          <Droplets size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{waterGen - waterUsed}</div>
          <div className="text-xs text-pip-dim">NET H2O ({waterGen}/{waterUsed})</div>
        </div>
        <div className="border border-pip-dim rounded bg-panel p-2 text-center">
          <Building2 size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{structures.length}</div>
          <div className="text-xs text-pip-dim">STRUCTURES</div>
        </div>
        <div className={`border rounded bg-panel p-2 text-center ${usedSlots >= maxSlots ? 'border-danger' : 'border-pip-dim'}`}>
          <div className={`text-sm font-bold ${usedSlots >= maxSlots ? 'text-danger' : 'text-pip'}`}>{usedSlots} / {maxSlots}</div>
          <div className="text-xs text-pip-dim">SLOTS</div>
          {usedSlots >= maxSlots && <div className="text-danger text-xs mt-0.5">FULL</div>}
        </div>
        <div className="border border-amber-dim rounded bg-panel p-2 text-center">
          <div className="text-sm font-bold text-amber">{totalCost}c</div>
          <div className="text-xs text-pip-dim">TOTAL COST</div>
        </div>
      </div>

      {/* Buy Land / Quest Claim buttons */}
      {!landPurchased && usedSlots >= 12 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          <button
            onClick={handleBuyLand}
            disabled={caps < 500}
            className="flex items-center gap-2 px-4 py-2 border border-amber rounded text-amber text-sm hover:bg-amber-dim/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            BUY LAND (+10 SLOTS) — 500c
          </button>
          {completedQuestCount >= 5 ? (
            <button
              onClick={handleClaimLandViaQuests}
              className="flex items-center gap-2 px-4 py-2 border border-pip rounded text-pip text-sm hover:bg-pip-dim/20 transition-colors"
            >
              CLAIM LAND (5 Quests ✓)
            </button>
          ) : (
            <span className="text-pip-dim text-xs self-center">{completedQuestCount}/5 quests completed</span>
          )}
        </div>
      )}

      {/* Phase 3 Setup */}
      {phase === 3 && structures.length === 0 && (
        <div className="mb-4">
          <button
            onClick={handlePhase3Setup}
            className="flex items-center gap-2 px-4 py-2 border border-pip rounded text-pip text-sm hover:bg-pip-dim/20 transition-colors"
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
            atValidOnly ? 'border-pip text-pip bg-pip-dim/20' : 'border-pip-dim text-pip-dim hover:text-pip'
          }`}
        >
          <span className={`w-3 h-3 rounded-sm border flex items-center justify-center ${atValidOnly ? 'border-pip bg-pip' : 'border-pip-dim'}`}>
            {atValidOnly && <span className="text-terminal text-xs leading-none">✓</span>}
          </span>
          SHOW AT STRUCTURES ONLY
        </button>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-pip text-sm tracking-wider">STRUCTURES ({structures.length}) — {usedCount} USED</h2>
        <div className="flex gap-2">
          <button
            onClick={handleResetRound}
            className="flex items-center gap-1 px-3 py-2 border border-amber-dim rounded text-amber text-sm hover:bg-amber-dim/20 transition-colors"
          >
            <RotateCcw size={14} /> RESET ROUND
          </button>
          <button
            onClick={() => setShowAddStructure(true)}
            className="flex items-center gap-1 px-3 py-2 border border-pip-dim rounded text-pip text-sm hover:bg-pip-dim/30 transition-colors"
          >
            <Plus size={14} /> ADD
          </button>
        </div>
      </div>

      {/* Structure Table */}
      {structures.length === 0 ? (
        <div className="border border-pip-dim/30 border-dashed rounded-lg p-8 text-center">
          <p className="text-pip-dim text-sm">No structures built. Click ADD to build your settlement.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {structures.map(s => {
            const ref = getStructureRef(s.structureId)
            if (!ref) return null
            const isSpecial = SPECIAL_STRUCTURE_NAMES.includes(ref.name)
            return (
              <div key={s.instanceId} className={`border rounded px-3 py-2 flex items-start gap-3 transition-colors ${
                s.usedThisRound ? 'border-pip-dim/20 bg-panel-alt opacity-60' : 'border-pip-dim/50 bg-panel'
              }`}>
                <button
                  onClick={() => handleToggleUsed(s.instanceId)}
                  className={`mt-1 w-5 h-5 rounded border shrink-0 flex items-center justify-center text-xs ${
                    s.usedThisRound ? 'border-pip bg-pip text-terminal' : 'border-pip-dim hover:border-pip'
                  } ${isSpecial ? 'ring-1 ring-amber/30' : ''}`}
                  title={isSpecial ? `${ref.name} — has special use effect` : undefined}
                >
                  {s.usedThisRound ? '✓' : ''}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-pip text-sm font-bold">{ref.name}</span>
                    {isSpecial && <span className="text-amber text-xs">★</span>}
                    <span className="text-xs text-pip-dim">{ref.category}</span>
                    <span className="text-xs text-amber">{ref.cost}c</span>
                    {ref.pwrGen > 0 && <span className="text-xs text-pip">+{ref.pwrGen}⚡</span>}
                    {ref.pwrReq > 0 && <span className="text-xs text-pip-dim">-{ref.pwrReq}⚡</span>}
                    {ref.waterGen > 0 && <span className="text-xs text-pip">+{ref.waterGen}💧</span>}
                    {ref.waterReq > 0 && <span className="text-xs text-pip-dim">-{ref.waterReq}💧</span>}
                  </div>
                  <p className="text-pip-dim text-xs mt-1 leading-relaxed">{ref.effect}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <select value={s.condition} onChange={(e) => handleUpdateStructure(s.instanceId, 'condition', e.target.value)}
                      className="text-xs py-0.5 px-1 bg-panel-alt border-pip-dim/30">
                      {CONDITION_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="text" value={s.notes || ''} onChange={(e) => handleUpdateStructure(s.instanceId, 'notes', e.target.value)}
                      placeholder="Notes..." className="flex-1 text-xs py-0.5 px-1 bg-panel-alt border-pip-dim/30" />
                  </div>
                </div>

                <div className="flex flex-col gap-1 shrink-0">
                  {s.condition === 'Undamaged' && (
                    <button
                      onClick={() => handleScrapStructure(s.instanceId)}
                      className="text-pip-dim hover:text-amber flex items-center gap-0.5 text-xs"
                      title={`Scrap for ${Math.floor((ref.cost || 0) / 2)}c`}
                    >
                      <Recycle size={12} />
                    </button>
                  )}
                  <button onClick={() => handleRemoveStructure(s.instanceId)} className="text-pip-dim hover:text-danger mt-1">
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
    </div>
  )
}
