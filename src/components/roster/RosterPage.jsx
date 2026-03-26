import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Dices, Package, X, Star, Shield } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcUnitTotalCaps, calcUnitItemCaps, getItemRef, getStructureRef } from '../../utils/calculations'
import { STATUS_OPTIONS } from '../../utils/fateTable'
import unitsData from '../../data/units.json'
import AddUnitModal from './AddUnitModal'
import AddItemModal from './AddItemModal'
import FateRollModal from './FateRollModal'

// Armor budget calc: items on units that have subType === 'Armor' via equippedItems (uses items.json ref)
// We need to look at item pool items with location 'stores' assigned to units — but equipped items are separate
// For Phase 1 armor budget: sum caps of equippedItems where the ref has subType === 'Armor'
function calcArmorBudget(roster) {
  return roster.reduce((sum, unit) => {
    return sum + (unit.equippedItems || []).reduce((s, itemId) => {
      const ref = getItemRef(itemId)
      return s + (ref?.subType === 'Armor' ? (ref.caps || 0) : 0)
    }, 0)
  }, 0)
}

const ABSENT_FATES = ['Delayed', 'Lost', 'Captured', 'Dead', 'Pending']

export default function RosterPage() {
  const { state, setState } = useCampaign()
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [showAddItem, setShowAddItem] = useState(null)
  const [fateModalUnit, setFateModalUnit] = useState(null)

  const phase = state.phase ?? 1
  const roster = state.roster || []
  const phase1CapLimit = state.phase1CapLimit ?? 750

  // Phase 1 restriction calculations
  const rosterCapsTotal = roster.reduce((s, u) => s + calcUnitTotalCaps(u), 0)
  const uniqueCount = roster.filter(u => {
    const ref = unitsData.find(d => d.id === u.unitId)
    return ref?.type === 'UNIQUE'
  }).length
  const armorBudget = calcArmorBudget(roster)
  const nonLeaderWithPerks = roster.filter(u => !u.isLeader && (u.perks || []).length > 0)

  // Leader check
  const leaderUnit = roster.find(u => u.isLeader)
  const leaderAbsent = leaderUnit && ABSENT_FATES.includes(leaderUnit.fate)

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

  function handleUpdateUnitMulti(slotId, fields) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u => u.slotId === slotId ? { ...u, ...fields } : u),
    }))
  }

  function handleApplyFate(slotId, fate) {
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

  function handleMarkRemoved(slotId) {
    setState(prev => ({
      ...prev,
      roster: prev.roster.map(u =>
        u.slotId === slotId
          ? { ...u, fate: 'Pending', removed: (u.removed || 0) + 1, battles: (u.battles || 0) + 1 }
          : u
      ),
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
        u.slotId === slotId
          ? { ...u, perks: [...(u.perks || []), perk.trim()], perksThisRound: (u.perksThisRound || 0) + 1 }
          : u
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

  function handlePhase1LimitChange(val) {
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 0) {
      setState(prev => ({ ...prev, phase1CapLimit: num }))
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Leader Absent Banner */}
      {leaderAbsent && (
        <div className="mb-3 border border-danger rounded bg-danger-dim/20 px-4 py-2 text-danger text-xs font-bold" style={{ boxShadow: '0 0 8px var(--color-danger-glow)' }}>
          YOUR LEADER IS {leaderUnit.fate.toUpperCase()} — Designate a new Leader
        </div>
      )}

      {/* Phase 1 Restrictions Panel */}
      {phase === 1 && (
        <div className="mb-4 border border-pip-mid/50 rounded bg-panel-alt px-4 py-3">
          <div className="text-pip text-xs font-bold tracking-widest mb-2">PHASE 1 RESTRICTIONS</div>
          <div className="flex flex-wrap gap-4 text-xs items-center">
            <span>
              Roster Caps:{' '}
              <span className={rosterCapsTotal > phase1CapLimit ? 'text-danger font-bold' : 'text-pip font-bold'}>
                {rosterCapsTotal}
              </span>
              {' / '}
              <span className="text-muted">{phase1CapLimit}c</span>
              {' '}
              <span className="text-muted">(limit:</span>
              <input
                type="number"
                min="0"
                value={phase1CapLimit}
                onChange={(e) => handlePhase1LimitChange(e.target.value)}
                className="w-16 text-xs py-0 px-1 ml-1 inline-block"
              />
              <span className="text-muted">c)</span>
            </span>
            <span>
              Unique:{' '}
              <span className={uniqueCount > 3 ? 'text-danger font-bold' : 'text-pip font-bold'}>
                {uniqueCount}
              </span>
              {' / 3'}
            </span>
            <span>
              Armor Budget:{' '}
              <span className={armorBudget > 150 ? 'text-danger font-bold' : 'text-pip font-bold'}>
                {armorBudget}c
              </span>
              {' / 150c'}
            </span>
          </div>
          {nonLeaderWithPerks.length > 0 && (
            <div className="text-danger text-xs mt-2">
              Non-leader units cannot have perks in Phase 1: {nonLeaderWithPerks.map(u => u.unitName).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Phase 2 banner */}
      {phase === 2 && (
        <div className="mb-4 border border-amber/60 rounded bg-amber-dim/20 px-4 py-2 text-amber text-xs font-bold tracking-wider">
          PHASE 2 MODE — Track Fate only. Battles and Removed counts are not tracked this phase.
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-pip text-sm tracking-widest font-bold">UNIT ROSTER ({roster.length})</h2>
        <button
          onClick={() => setShowAddUnit(true)}
          className="flex items-center gap-2 px-3 py-2 border border-pip text-pip text-sm rounded hover:bg-pip-dim hover:border-pip-mid transition-colors font-bold"
        >
          <Plus size={14} /> ADD UNIT
        </button>
      </div>

      {roster.length === 0 ? (
        <div className="border border-pip-dim/40 border-dashed rounded-lg p-8 text-center">
          <p className="text-muted text-sm">No units on roster. Click ADD UNIT to get started.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {roster.map(unit => {
            const expanded = expandedSlot === unit.slotId
            const totalCaps = calcUnitTotalCaps(unit)
            const itemCaps = calcUnitItemCaps(unit)
            const items = (unit.equippedItems || []).map(id => getItemRef(id)).filter(Boolean)
            const perks = unit.perks || []

            // Status badge color — each status is visually distinct
            const fateBadge = unit.fate === 'Active'
              ? 'bg-pip-dim/40 text-pip border border-pip/40'
              : unit.fate === 'Dead'
              ? 'bg-danger-dim/60 text-danger border border-danger/50'
              : unit.fate === 'Captured'
              ? 'bg-amber-dim/40 text-amber border border-amber/50'
              : unit.fate === 'Pending'
              ? 'bg-amber-dim/30 text-amber border border-amber/30'
              : unit.fate === 'Injured'
              ? 'bg-amber-dim/30 text-amber border border-amber/40'
              : unit.fate === 'Lost'
              ? 'bg-info-dim/30 text-info border border-info/40'
              : 'bg-muted/20 text-muted border border-muted/30'

            return (
              <div key={unit.slotId} className={`border rounded bg-panel transition-colors ${
                unit.fate === 'Dead' ? 'border-danger-dim/60 opacity-75' :
                unit.fate === 'Active' ? 'border-pip-mid/50' :
                'border-muted/40'
              }`}>
                {/* Compact Row */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-panel-light transition-colors"
                  onClick={() => setExpandedSlot(expanded ? null : unit.slotId)}
                >
                  {expanded ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
                  <span className="text-pip text-sm font-bold flex-1 min-w-0 truncate">{unit.unitName}</span>
                  {unit.isLeader && <span className="text-amber text-xs px-1.5 py-0.5 border border-amber/60 rounded hidden sm:inline font-bold">LDR</span>}
                  {unit.heroic && <Star size={12} className="text-amber shrink-0" />}
                  {unit.hasPowerArmor && (
                    <span className={`text-xs px-1 py-0.5 rounded font-bold hidden sm:inline ${unit.paDegraded ? 'text-amber border border-amber/40' : 'text-pip border border-pip/40'}`}>PA</span>
                  )}
                  <span className="text-muted text-xs hidden sm:inline">{unit.faction}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${fateBadge}`}>{unit.fate === 'Pending' ? 'FATE?' : unit.fate.toUpperCase()}</span>
                  <span className="text-amber text-sm font-bold w-16 text-right">{totalCaps}c</span>
                  {items.length > 0 && <Package size={12} className="text-muted" />}
                </div>

                {/* Expanded Detail */}
                {expanded && (
                  <div className="border-t border-pip-dim/40 px-4 py-3 space-y-3">
                    {/* Phase 2: minimal view */}
                    {phase === 2 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-muted tracking-wider">FATE</label>
                          <div className="flex gap-1 mt-1">
                            <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1 px-2">
                              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <button onClick={() => setFateModalUnit(unit)} className="px-2 border border-muted rounded text-muted hover:text-pip hover:border-pip text-xs transition-colors" title="Roll Fate">
                              <Dices size={14} />
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted tracking-wider">DEAD</label>
                          <div className={`text-sm mt-1 font-bold ${unit.fate === 'Dead' ? 'text-danger' : 'text-muted'}`}>
                            {unit.fate === 'Dead' ? 'DEAD' : '—'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-muted tracking-wider">BASE CAPS</label>
                            <div className="text-amber text-sm font-bold">{unit.baseCaps}c</div>
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">ITEM CAPS</label>
                            <div className="text-amber text-sm font-bold">{itemCaps}c</div>
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">BATTLES</label>
                            <input type="number" min="0" value={unit.battles} onChange={(e) => handleUpdateUnit(unit.slotId, 'battles', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">REMOVED</label>
                            <input type="number" min="0" value={unit.removed} onChange={(e) => handleUpdateUnit(unit.slotId, 'removed', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div>
                            <label className="text-xs text-muted tracking-wider">REG DAMAGE</label>
                            <input type="number" min="0" value={unit.regDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'regDamage', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">RAD DAMAGE</label>
                            <input type="number" min="0" value={unit.radDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'radDamage', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">FATE</label>
                            <div className="flex gap-1">
                              <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1 px-2">
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={() => setFateModalUnit(unit)} className="px-2 border border-muted rounded text-muted hover:text-pip hover:border-pip text-xs transition-colors" title="Roll Fate">
                                <Dices size={14} />
                              </button>
                            </div>
                            {unit.fate === 'Pending' && (
                              <p className="text-amber text-xs mt-1">Fate pending — roll at start of next round</p>
                            )}
                            <button
                              onClick={() => handleMarkRemoved(unit.slotId)}
                              className="mt-1 text-xs text-muted hover:text-amber border border-muted/30 hover:border-amber/60 rounded px-2 py-0.5 transition-colors"
                              title="Mark as removed in battle — sets fate to Pending"
                            >
                              MARK REMOVED (?)
                            </button>
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">LUC SCORE</label>
                            <input type="number" min="0" max="10" value={unit.lucScore ?? 3} onChange={(e) => handleUpdateUnit(unit.slotId, 'lucScore', parseInt(e.target.value) || 0)} className="w-full text-xs py-1 px-2" />
                          </div>
                        </div>

                        {/* Leader + Heroic Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div>
                            <label className="text-xs text-muted tracking-wider">LEADER</label>
                            <select value={unit.isLeader ? 'Yes' : 'No'} onChange={(e) => handleUpdateUnit(unit.slotId, 'isLeader', e.target.value === 'Yes')} className="w-full text-xs py-1 px-2">
                              <option>No</option>
                              <option>Yes</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">HEROIC</label>
                            <div className="mt-1">
                              {(unit.battles || 0) < 2 ? (
                                <button
                                  disabled
                                  title="Available after 2 battles"
                                  className="flex items-center gap-1 text-xs px-3 py-1 border border-pip-dim/30 text-pip-dim rounded opacity-40 cursor-not-allowed"
                                >
                                  <Star size={12} /> HEROIC
                                  <span className="text-pip-dim">(2 battles req.)</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateUnit(unit.slotId, 'heroic', !unit.heroic)}
                                  className={`flex items-center gap-1 text-xs px-3 py-1 border rounded transition-colors ${
                                    unit.heroic
                                      ? 'border-amber text-amber bg-amber-dim/20'
                                      : 'border-pip-dim text-pip-dim hover:text-amber hover:border-amber/50'
                                  }`}
                                >
                                  <Star size={12} /> {unit.heroic ? 'HEROIC (ON)' : 'HEROIC'}
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">ADDICTION</label>
                            <input type="text" value={unit.addiction || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'addiction', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="None" />
                          </div>
                        </div>

                        {/* Power Armor */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={unit.hasPowerArmor ?? false}
                              onChange={(e) => handleUpdateUnit(unit.slotId, 'hasPowerArmor', e.target.checked)}
                              className="accent-pip"
                            />
                            <span className="text-xs text-muted flex items-center gap-1">
                              <Shield size={12} /> POWER ARMOR
                            </span>
                          </label>
                          {unit.hasPowerArmor && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={unit.paDegraded ?? false}
                                onChange={(e) => handleUpdateUnit(unit.slotId, 'paDegraded', e.target.checked)}
                                className="accent-amber"
                              />
                              <span className="text-xs text-muted">DEGRADED</span>
                            </label>
                          )}
                          {unit.hasPowerArmor && unit.paDegraded && (
                            <span className="text-amber text-xs">Needs Power Armor Station to repair</span>
                          )}
                        </div>

                        {/* Conditions */}
                        <div>
                          <label className="text-xs text-muted tracking-wider block mb-1">CONDITIONS</label>
                          <div className="flex gap-2 flex-wrap mb-2">
                            {[
                              { key: 'condPoisoned', label: 'POISONED' },
                              { key: 'condInjuredArm', label: 'INJ ARM' },
                              { key: 'condInjuredLeg', label: 'INJ LEG' },
                            ].map(({ key, label }) => (
                              <button
                                key={key}
                                onClick={() => handleUpdateUnit(unit.slotId, key, !unit[key])}
                                className={`text-xs px-3 py-1 border rounded transition-colors font-bold ${
                                  unit[key]
                                    ? 'border-danger text-danger bg-danger-dim/30'
                                    : 'border-muted/40 text-muted hover:border-danger/50 hover:text-danger'
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          <div>
                            <label className="text-xs text-muted tracking-wider">OTHER CONDITIONS</label>
                            <input type="text" value={unit.conditions || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'conditions', e.target.value)} className="w-full text-xs py-1 px-2 mt-1" placeholder="e.g. Stun, custom condition" />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted tracking-wider">NOTES</label>
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
                                  {(state.round || 0) >= (unit.captureRound + 2) ? ' OVERDUE' : ''}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Perks */}
                        <PerkPanel
                          unit={unit}
                          phase={phase}
                          battleCount={state.battleCount ?? 0}
                          onAddPerk={handleAddPerk}
                          onRemovePerk={handleRemovePerk}
                        />
                      </>
                    )}

                    {/* Equipment */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-muted tracking-wider">EQUIPMENT ({items.length})</label>
                        <button
                          onClick={() => setShowAddItem(unit.slotId)}
                          className="flex items-center gap-1 text-xs text-muted hover:text-pip border border-muted/40 hover:border-pip rounded px-2 py-1 transition-colors"
                        >
                          <Plus size={12} /> ADD ITEM
                        </button>
                      </div>
                      {items.length === 0 ? (
                        <p className="text-muted text-xs">No equipment assigned</p>
                      ) : (
                        <div className="space-y-1">
                          {items.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between border border-pip-dim/30 rounded px-2 py-1 bg-panel-light">
                              <span className="text-pip text-xs">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-muted text-xs">{item.subType}</span>
                                <span className="text-amber text-xs font-bold">{item.caps}c</span>
                                <button onClick={() => handleRemoveItem(unit.slotId, idx)} className="text-muted hover:text-danger transition-colors">
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-pip-dim/30">
                      <button
                        onClick={() => handleRemoveUnit(unit.slotId)}
                        className="flex items-center gap-1 text-xs text-muted hover:text-danger border border-muted/30 hover:border-danger/50 rounded px-3 py-1 transition-colors"
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
            className="px-6 py-3 border border-amber text-amber rounded text-sm hover:bg-amber-dim/30 transition-colors font-bold tracking-wider"
            style={{ boxShadow: '0 0 8px var(--color-amber-glow)' }}
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

function PerkPanel({ unit, phase, battleCount, onAddPerk, onRemovePerk }) {
  const [newPerk, setNewPerk] = useState('')
  const perks = unit.perks || []
  const battles = unit.battles || 0
  const perksThisRound = unit.perksThisRound || 0

  const tooMany = perks.length > battles
  const roundLimitReached = perksThisRound >= 1
  const phase4FirstBattle = phase === 4 && battleCount === 0
  const canAdd = !roundLimitReached && !phase4FirstBattle && perks.length < battles

  function handleAdd() {
    if (!newPerk.trim()) return
    if (!canAdd) return
    onAddPerk(unit.slotId, newPerk)
    setNewPerk('')
  }

  let warning = null
  if (phase4FirstBattle) {
    warning = 'First perk available after first Phase 4 battle'
  } else if (roundLimitReached) {
    warning = 'Max 1 new perk per settlement round'
  } else if (perks.length >= battles && battles > 0) {
    warning = 'Cannot exceed battles fought'
  } else if (battles === 0) {
    warning = 'No battles fought yet — perks require at least 1 battle'
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <label className="text-xs text-muted tracking-wider">PERKS ({perks.length} / {battles} battles)</label>
        <span className="text-muted text-xs">PERKS THIS ROUND: {perksThisRound}/1</span>
        {tooMany && <span className="text-danger text-xs font-bold">Too many perks for battles fought</span>}
      </div>
      <div className="flex gap-2 mb-1">
        <input
          type="text"
          value={newPerk}
          onChange={(e) => setNewPerk(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Add perk..."
          className="flex-1 text-xs py-1 px-2"
          disabled={!canAdd}
        />
        <button
          onClick={handleAdd}
          disabled={!canAdd || !newPerk.trim()}
          className="px-3 py-1 border border-muted text-pip text-xs rounded hover:bg-pip-dim hover:border-pip disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus size={12} />
        </button>
      </div>
      {warning && (
        <p className="text-amber text-xs mb-1">{warning}</p>
      )}
      {perks.length > 0 && (
        <div className="space-y-1">
          {perks.map((perk, i) => (
            <div key={i} className="flex items-center justify-between border border-pip-dim/30 rounded px-2 py-1 bg-panel-light">
              <span className="text-pip text-xs">{perk}</span>
              <button onClick={() => onRemovePerk(unit.slotId, i)} className="text-muted hover:text-danger p-0.5 transition-colors">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
