import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Dices, Package, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcUnitTotalCaps, calcUnitItemCaps, getItemRef } from '../../utils/calculations'
import { STATUS_OPTIONS } from '../../utils/fateTable'
import AddUnitModal from './AddUnitModal'
import AddItemModal from './AddItemModal'
import FateRollModal from './FateRollModal'

export default function RosterPage() {
  const { state, setState } = useCampaign()
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [showAddItem, setShowAddItem] = useState(null)
  const [fateModalUnit, setFateModalUnit] = useState(null)

  const phase = state.phase ?? 1

  function handleAddUnit(unit) {
    setState(prev => ({ ...prev, roster: [...prev.roster, unit] }))
  }

  function handleRemoveUnit(slotId) {
    if (!confirm('Remove this unit from roster?')) return
    setState(prev => ({ ...prev, roster: prev.roster.filter(u => u.slotId !== slotId) }))
  }

  function handleUpdateUnit(slotId, field, value) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u => u.slotId === slotId ? { ...u, [field]: value } : u),
    }))
  }

  function handleApplyFate(slotId, fate) {
    // Map fate string to STATUS_OPTIONS value
    const fateMap = {
      'Fine': 'Active',
      'Delayed': 'Delayed',
      'Lost': 'Lost',
      'Shaken': 'Shaken',
      'Captured': 'Captured',
      'Injured': 'Injured',
      'Dead': 'Dead',
    }
    const status = fateMap[fate] || fate
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u => u.slotId === slotId ? { ...u, fate: status, removed: (u.removed || 0) + 1 } : u),
    }))
  }

  function handleAddItem(slotId, itemId) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === slotId ? { ...u, equippedItems: [...(u.equippedItems || []), itemId] } : u
      ),
    }))
  }

  function handleRemoveItem(slotId, itemIndex) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === slotId
          ? { ...u, equippedItems: u.equippedItems.filter((_, i) => i !== itemIndex) }
          : u
      ),
    }))
  }

  function handleAddPerk(slotId, perk) {
    if (!perk.trim()) return
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === slotId ? { ...u, perks: [...(u.perks || []), perk.trim()] } : u
      ),
    }))
  }

  function handleRemovePerk(slotId, perkIndex) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === slotId
          ? { ...u, perks: (u.perks || []).filter((_, i) => i !== perkIndex) }
          : u
      ),
    }))
  }

  function handleAdvanceToPhase3() {
    if (!confirm('This will clear all non-Dead fate results and reset Injuries and Addictions for all units. Dead units remain dead. Continue?')) return
    setState(prev => ({
      ...prev,
      phase: 3,
      roster: prev.roster.map(u =>
        u.fate === 'Dead' ? u : { ...u, fate: 'Active', addiction: '' }
      ),
    }))
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Phase 2 banner */}
      {phase === 2 && (
        <div className="mb-4 border border-amber rounded bg-amber-dim/10 px-4 py-2 text-amber text-xs">
          PHASE 2 MODE — Track Fate only. Battles and Removed counts are not tracked this phase.
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-pip text-sm tracking-wider">UNIT ROSTER ({state.roster.length})</h2>
        <button
          onClick={() => setShowAddUnit(true)}
          className="flex items-center gap-2 px-3 py-2 border border-pip-dim rounded text-pip text-sm hover:bg-pip-dim/30 transition-colors"
        >
          <Plus size={14} /> ADD UNIT
        </button>
      </div>

      {state.roster.length === 0 ? (
        <div className="border border-pip-dim/30 border-dashed rounded-lg p-8 text-center">
          <p className="text-pip-dim text-sm">No units on roster. Click ADD UNIT to get started.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {state.roster.map(unit => {
            const expanded = expandedSlot === unit.slotId
            const totalCaps = calcUnitTotalCaps(unit)
            const itemCaps = calcUnitItemCaps(unit)
            const items = (unit.equippedItems || []).map(id => getItemRef(id)).filter(Boolean)
            const perks = unit.perks || []

            return (
              <div key={unit.slotId} className="border border-pip-dim/50 rounded bg-panel">
                {/* Compact Row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-panel-alt transition-colors"
                  onClick={() => setExpandedSlot(expanded ? null : unit.slotId)}
                >
                  {expanded ? <ChevronDown size={14} className="text-pip-dim shrink-0" /> : <ChevronRight size={14} className="text-pip-dim shrink-0" />}
                  <span className="text-pip text-sm font-bold flex-1 min-w-0 truncate">{unit.unitName}</span>
                  <span className="text-pip-dim text-xs hidden sm:inline">{unit.faction}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    unit.fate === 'Active' ? 'bg-pip-dim/30 text-pip' :
                    unit.fate === 'Dead' ? 'bg-danger-dim/50 text-danger' :
                    'bg-amber-dim/30 text-amber'
                  }`}>{unit.fate}</span>
                  <span className="text-amber text-sm font-bold w-16 text-right">{totalCaps}c</span>
                  {items.length > 0 && <Package size={12} className="text-pip-dim" />}
                </div>

                {/* Expanded Detail */}
                {expanded && (
                  <div className="border-t border-pip-dim/30 px-4 py-3 space-y-3">
                    {/* Phase 2: minimal view */}
                    {phase === 2 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-pip-dim">FATE</label>
                          <div className="flex gap-1 mt-1">
                            <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1 px-2">
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => setFateModalUnit(unit)} className="px-2 border border-pip-dim rounded text-pip-dim hover:text-pip text-xs" title="Roll Fate">
                              <Dices size={14} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-pip-dim">DEAD</label>
                          <div className={`text-sm mt-1 ${unit.fate === 'Dead' ? 'text-danger font-bold' : 'text-pip-dim'}`}>
                            {unit.fate === 'Dead' ? '☠ DEAD' : '—'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-pip-dim">BASE CAPS</label>
                            <div className="text-amber text-sm">{unit.baseCaps}c</div>
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">ITEM CAPS</label>
                            <div className="text-amber text-sm">{itemCaps}c</div>
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">BATTLES</label>
                            <input type="number" min="0" value={unit.battles} onChange={(e) => handleUpdateUnit(unit.slotId, 'battles', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">REMOVED</label>
                            <input type="number" min="0" value={unit.removed} onChange={(e) => handleUpdateUnit(unit.slotId, 'removed', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-pip-dim">REG DAMAGE</label>
                            <input type="number" min="0" value={unit.regDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'regDamage', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">RAD DAMAGE</label>
                            <input type="number" min="0" value={unit.radDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'radDamage', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">FATE</label>
                            <div className="flex gap-1">
                              <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1 px-2">
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={() => setFateModalUnit(unit)} className="px-2 border border-pip-dim rounded text-pip-dim hover:text-pip text-xs" title="Roll Fate">
                                <Dices size={14} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">LUC SCORE</label>
                            <input type="number" min="0" max="10" value={unit.lucScore ?? 3} onChange={(e) => handleUpdateUnit(unit.slotId, 'lucScore', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-pip-dim">LEADER</label>
                            <select value={unit.isLeader ? 'Yes' : 'No'} onChange={(e) => handleUpdateUnit(unit.slotId, 'isLeader', e.target.value === 'Yes')} className="w-full text-xs py-1 px-2">
                              <option>No</option>
                              <option>Yes</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">ADDICTION</label>
                            <input type="text" value={unit.addiction || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'addiction', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="None" />
                          </div>
                          <div>
                            <label className="text-xs text-pip-dim">CONDITIONS</label>
                            <input type="text" value={unit.conditions || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'conditions', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="e.g. Stun, Crippled Arm" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-pip-dim">NOTES</label>
                          <input type="text" value={unit.notes || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'notes', e.target.value)} className="w-full text-xs py-1 px-2" />
                        </div>

                        {/* Capture tracking */}
                        {unit.fate === 'Captured' && (
                          <div className="grid grid-cols-2 gap-2 border border-amber/40 rounded p-2 bg-amber-dim/10">
                            <div>
                              <label className="text-xs text-amber">CAPTURED BY</label>
                              <input type="text" value={unit.capturedBy || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'capturedBy', e.target.value)} className="w-full text-xs py-1 px-2 mt-1" />
                            </div>
                            <div>
                              <label className="text-xs text-amber">CAPTURE ROUND</label>
                              <input type="number" min="0" value={unit.captureRound ?? ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'captureRound', parseInt(e.target.value) || null)} className="w-full text-xs py-1 px-2 mt-1" />
                            </div>
                            {unit.captureRound != null && (
                              <div className="col-span-2">
                                <span className={`text-xs font-bold ${(state.round || 0) >= (unit.captureRound + 2) ? 'text-danger' : 'text-amber'}`}>
                                  Deadline: Round {unit.captureRound + 2}
                                  {(state.round || 0) >= (unit.captureRound + 2) ? ' ⚠ OVERDUE' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Perks */}
                        <PerkPanel unit={unit} onAddPerk={handleAddPerk} onRemovePerk={handleRemovePerk} />
                      </>
                    )}

                    {/* Equipment */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-pip-dim">EQUIPMENT ({items.length})</label>
                        <button
                          onClick={() => setShowAddItem(unit.slotId)}
                          className="flex items-center gap-1 text-xs text-pip-dim hover:text-pip border border-pip-dim/30 rounded px-2 py-1"
                        >
                          <Plus size={12} /> ADD ITEM
                        </button>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-pip-dim text-xs">No equipment assigned</p>
                      ) : (
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between border border-pip-dim/20 rounded px-2 py-1 bg-panel-light">
                              <span className="text-pip text-xs">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-pip-dim text-xs">{item.subType}</span>
                                <span className="text-amber text-xs">{item.caps}c</span>
                                <button onClick={() => handleRemoveItem(unit.slotId, idx)} className="text-pip-dim hover:text-danger">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-pip-dim/20">
                      <button
                        onClick={() => handleRemoveUnit(unit.slotId)}
                        className="flex items-center gap-1 text-xs text-danger-dim hover:text-danger border border-danger-dim/30 rounded px-3 py-1"
                      >
                        <Trash2 size={12} /> REMOVE UNIT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Phase 2: Advance button */}
      {phase === 2 && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleAdvanceToPhase3}
            className="px-6 py-3 border border-amber text-amber rounded text-sm hover:bg-amber-dim/20 transition-colors"
          >
            ADVANCE TO PHASE 3
          </button>
        </div>
      )}

      <AddUnitModal isOpen={showAddUnit} onClose={() => setShowAddUnit(false)} onAdd={handleAddUnit} />
      {showAddItem && (
        <AddItemModal
          isOpen={!!showAddItem}
          onClose={() => setShowAddItem(null)}
          onAdd={(itemId) => handleAddItem(showAddItem, itemId)}
        />
      )}
      {fateModalUnit && (
        <FateRollModal
          isOpen={!!fateModalUnit}
          onClose={() => setFateModalUnit(null)}
          unit={fateModalUnit}
          onApply={(fate) => handleApplyFate(fateModalUnit.slotId, fate)}
        />
      )}
    </div>
  )
}

function PerkPanel({ unit, onAddPerk, onRemovePerk }) {
  const [newPerk, setNewPerk] = useState('')
  const perks = unit.perks || []
  const battles = unit.battles || 0
  const tooMany = perks.length > battles

  function handleAdd() {
    if (!newPerk.trim()) return
    onAddPerk(unit.slotId, newPerk)
    setNewPerk('')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-xs text-pip-dim">PERKS ({perks.length} / {battles} battles)</label>
        {tooMany && <span className="text-danger text-xs">⚠ Too many perks for battles fought</span>}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newPerk}
          onChange={(e) => setNewPerk(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Add perk..."
          className="flex-1 text-xs py-1 px-2"
        />
        <button onClick={handleAdd} className="px-3 py-1 border border-pip-dim text-pip text-xs rounded hover:bg-pip-dim/30">
          <Plus size={12} />
        </button>
      </div>
      {perks.length > 0 && (
        <div className="space-y-1">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center justify-between border border-pip-dim/20 rounded px-2 py-1 bg-panel-light">
              <span className="text-pip text-xs">{perk}</span>
              <button onClick={() => onRemovePerk(unit.slotId, i)} className="text-pip-dim hover:text-danger p-0.5">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
