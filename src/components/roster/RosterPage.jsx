import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Dices, Package } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcUnitTotalCaps, calcUnitItemCaps, getItemRef } from '../../utils/calculations'
import { rollFate, STATUS_OPTIONS } from '../../utils/fateTable'
import AddUnitModal from './AddUnitModal'
import AddItemModal from './AddItemModal'

export default function RosterPage() {
  const { state, setState } = useCampaign()
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [showAddItem, setShowAddItem] = useState(null)

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

  function handleRollFate(slotId) {
    const result = rollFate()
    alert(`Fate Roll: ${result.roll}\n${result.result}: ${result.description}`)
    if (result.result !== 'Nothing') {
      handleUpdateUnit(slotId, 'fate', result.result)
    }
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

  return (
    <div className="p-4 max-w-5xl mx-auto">
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
                          <button onClick={() => handleRollFate(unit.slotId)} className="px-2 border border-pip-dim rounded text-pip-dim hover:text-pip text-xs" title="Roll Fate">
                            <Dices size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-pip-dim">LEADER</label>
                        <select value={unit.isLeader ? 'Yes' : 'No'} onChange={(e) => handleUpdateUnit(unit.slotId, 'isLeader', e.target.value === 'Yes')} className="w-full text-xs py-1 px-2">
                          <option>No</option>
                          <option>Yes</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-pip-dim">CONDITIONS</label>
                        <input type="text" value={unit.conditions || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'conditions', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="e.g. Stun, Crippled Arm" />
                      </div>
                      <div>
                        <label className="text-xs text-pip-dim">NOTES</label>
                        <input type="text" value={unit.notes || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'notes', e.target.value)} className="w-full text-xs py-1 px-2" />
                      </div>
                    </div>

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

      <AddUnitModal isOpen={showAddUnit} onClose={() => setShowAddUnit(false)} onAdd={handleAddUnit} />
      {showAddItem && (
        <AddItemModal
          isOpen={!!showAddItem}
          onClose={() => setShowAddItem(null)}
          onAdd={(itemId) => handleAddItem(showAddItem, itemId)}
        />
      )}
    </div>
  )
}
