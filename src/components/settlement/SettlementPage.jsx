import { useState } from 'react'
import { Plus, Trash2, RotateCcw, Zap, Droplets, Shield, Building2, Package } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, calcDefenseRating, getStructureRef, calcSettlementTotalCaps } from '../../utils/calculations'
import AddStructureModal from './AddStructureModal'

const CONDITION_OPTIONS = ['Undamaged', 'Damaged', 'Badly Damaged', 'Wrecked', 'Reinforced']

export default function SettlementPage() {
  const { state, setState } = useCampaign()
  const [showAddStructure, setShowAddStructure] = useState(false)

  const structures = state.settlement.structures || []
  const pwrGen = calcPowerGenerated(structures)
  const pwrUsed = calcPowerConsumed(structures)
  const waterGen = calcWaterGenerated(structures)
  const waterUsed = calcWaterConsumed(structures)
  const defense = calcDefenseRating(structures)
  const totalCost = calcSettlementTotalCaps(structures)
  const usedCount = structures.filter(s => s.usedThisRound).length

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

  function handleToggleUsed(instanceId) {
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(s =>
          s.instanceId === instanceId ? { ...s, usedThisRound: !s.usedThisRound } : s
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
    if (!confirm('Reset all structures to unused for the new round?')) return
    setState(prev => ({
      ...prev,
      settlement: {
        ...prev.settlement,
        structures: prev.settlement.structures.map(s => ({ ...s, usedThisRound: false })),
      },
    }))
  }

  function handleResourceChange(field, value) {
    setState(prev => ({
      ...prev,
      settlement: { ...prev.settlement, [field]: parseInt(value) || 0 },
    }))
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Dashboard */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
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
          <Shield size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{defense}</div>
          <div className="text-xs text-pip-dim">DEFENSE</div>
        </div>
        <div className="border border-pip-dim rounded bg-panel p-2 text-center">
          <Building2 size={14} className="mx-auto mb-1 text-pip" />
          <div className="text-sm font-bold text-pip">{structures.length}</div>
          <div className="text-xs text-pip-dim">STRUCTURES</div>
        </div>
        <div className="border border-amber-dim rounded bg-panel p-2 text-center">
          <div className="text-sm font-bold text-amber">{totalCost}c</div>
          <div className="text-xs text-pip-dim">TOTAL COST</div>
        </div>
        <div className="border border-pip-dim rounded bg-panel p-2 text-center">
          <Package size={14} className="mx-auto mb-1 text-pip" />
          <div className="flex gap-1 justify-center">
            <input type="number" min="0" value={state.settlement.resourcesAvailable || 0}
              onChange={(e) => handleResourceChange('resourcesAvailable', e.target.value)}
              className="w-12 text-xs text-center py-0 px-1 bg-panel-alt border-pip-dim/30" />
          </div>
          <div className="text-xs text-pip-dim">RESOURCES</div>
        </div>
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
            return (
              <div key={s.instanceId} className={`border rounded px-3 py-2 flex items-start gap-3 transition-colors ${
                s.usedThisRound ? 'border-pip-dim/20 bg-panel-alt opacity-60' : 'border-pip-dim/50 bg-panel'
              }`}>
                <button
                  onClick={() => handleToggleUsed(s.instanceId)}
                  className={`mt-1 w-5 h-5 rounded border shrink-0 flex items-center justify-center text-xs ${
                    s.usedThisRound ? 'border-pip bg-pip text-terminal' : 'border-pip-dim hover:border-pip'
                  }`}
                >
                  {s.usedThisRound ? '✓' : ''}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-pip text-sm font-bold">{ref.name}</span>
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

                <button onClick={() => handleRemoveStructure(s.instanceId)} className="text-pip-dim hover:text-danger shrink-0 mt-1">
                  <Trash2 size={14} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      <AddStructureModal isOpen={showAddStructure} onClose={() => setShowAddStructure(false)} onAdd={handleAddStructure} />
    </div>
  )
}
