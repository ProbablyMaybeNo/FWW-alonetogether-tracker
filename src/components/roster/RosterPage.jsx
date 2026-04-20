import { useState } from 'react'
import { Plus, Trash2, ChevronDown, ChevronRight, Dices, Package, X, Star, Shield, Shuffle, Sparkles } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { calcUnitTotalCaps, calcUnitItemCaps, getItemRef, getStructureRef } from '../../utils/calculations'
import { STATUS_OPTIONS } from '../../utils/fateTable'
import unitsData from '../../data/units.json'
import boostsData from '../../data/boosts.json'
import AddUnitModal from './AddUnitModal'
import AddItemModal from './AddItemModal'
import FateRollModal from './FateRollModal'
import PerkPickerModal from './PerkPickerModal'
import { getPerkCaps, PERK_CARDS, parseSymbols } from '../../data/perkCards'

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

const EQUIP_TYPE_COLOR = {
  'Armor':           { border: 'border-blue-400/50',        text: 'text-blue-400'        },
  'Heavy Weapon':    { border: 'border-danger/50',           text: 'text-danger'          },
  'Melee':           { border: 'border-amber/50',            text: 'text-amber'           },
  'Rifle':           { border: 'border-pip/50',              text: 'text-pip'             },
  'Pistol':          { border: 'border-pip/40',              text: 'text-pip/80'          },
  'Grenade':         { border: 'border-orange-400/50',       text: 'text-orange-400'      },
  'Mine':            { border: 'border-orange-400/40',       text: 'text-orange-400/80'   },
  'Chem':            { border: 'border-purple-400/50',       text: 'text-purple-400'      },
  'Drink':           { border: 'border-cyan-400/40',         text: 'text-cyan-400'        },
  'Food':            { border: 'border-green-400/40',        text: 'text-green-400'       },
  'Clothing':        { border: 'border-pink-400/40',         text: 'text-pink-400'        },
  'Mod':             { border: 'border-amber/40',            text: 'text-amber/80'        },
  'Utility':         { border: 'border-muted/40',            text: 'text-muted'           },
  'Leader':          { border: 'border-amber/60',            text: 'text-amber'           },
  'Perk':            { border: 'border-amber/50',            text: 'text-amber/90'        },
  'Automatron Part': { border: 'border-gray-400/40',         text: 'text-gray-400'        },
}

function mobileFateBadgeClass(fate) {
  if (fate === 'Active') return 'bg-pip-dim/50 text-pip border border-pip/60'
  if (fate === 'Delayed' || fate === 'Shaken') return 'bg-amber-dim/40 text-amber border border-amber/50'
  if (fate === 'Pending') return 'bg-amber-dim/30 text-amber border border-amber/40'
  if (fate === 'Injured' || fate === 'Lost' || fate === 'Captured') return 'bg-danger-dim/40 text-danger border border-danger/50'
  if (fate === 'Dead') return 'bg-muted/30 text-muted border border-muted/40'
  return 'bg-muted/20 text-muted border border-muted/30'
}

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
    const cost = unit.baseCaps || 0
    setState(prev => ({
      ...prev,
      caps: Math.max(0, (prev.caps ?? 0) - cost),
      roster: [...prev.roster, unit],
    }))
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

  function handlePhase1LimitChange(val) {
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 0) {
      setState(prev => ({ ...prev, phase1CapLimit: num }))
    }
  }

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Roster Overview Bar */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="border border-pip-mid/50 rounded bg-panel p-2 text-center">
          <div className="text-pip text-lg font-bold">{roster.filter(u => u.fate !== 'Dead' && !ABSENT_FATES.includes(u.fate)).length}</div>
          <div className="text-xs text-muted tracking-wider">ACTIVE</div>
        </div>
        <div className="border border-danger/40 rounded bg-panel p-2 text-center">
          <div className="text-danger text-lg font-bold">{roster.filter(u => u.fate === 'Dead').length}</div>
          <div className="text-xs text-muted tracking-wider">DEAD</div>
        </div>
        <div className="border border-amber/40 rounded bg-panel p-2 text-center">
          <div className="text-amber text-lg font-bold">{roster.filter(u => ABSENT_FATES.filter(f => f !== 'Dead' && f !== 'Pending').includes(u.fate)).length}</div>
          <div className="text-xs text-muted tracking-wider">UNAVAILABLE</div>
        </div>
        <div className="border border-amber/50 rounded bg-panel p-2 text-center">
          <div className="text-amber text-lg font-bold">{roster.reduce((s, u) => s + calcUnitTotalCaps(u), 0).toLocaleString()}c</div>
          <div className="text-xs text-muted tracking-wider">ROSTER VALUE</div>
        </div>
        <div className="border border-pip-mid/40 rounded bg-panel p-2 text-center">
          <div className="text-pip text-lg font-bold">{roster.reduce((s, u) => s + (u.perks || []).length, 0)}</div>
          <div className="text-xs text-muted tracking-wider">TOTAL PERKS</div>
        </div>
      </div>

      {/* Leader Absent Banner */}
      {leaderAbsent && (
        <div className="mb-3 border border-danger rounded bg-danger-dim/20 px-4 py-2 text-danger text-xs font-bold" style={{ boxShadow: '0 0 8px var(--color-danger-glow)' }}>
          YOUR LEADER IS {leaderUnit.fate.toUpperCase()} — Designate a new Leader
        </div>
      )}

      {/* Phase 1 Restrictions Panel */}
      {phase === 1 && (
        <div className="mb-4 border border-pip-mid/50 rounded bg-panel-alt px-4 py-3">
          <div className="text-title text-xs font-bold tracking-widest mb-2">PHASE 1 RESTRICTIONS</div>
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
        <div className="mb-4 border border-amber/60 rounded bg-amber-dim/20 px-4 py-2 text-title text-xs font-bold tracking-wider">
          PHASE 2 MODE — Track Fate only. Battles and Removed counts are not tracked this phase.
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-amber text-sm tracking-widest font-bold">UNIT ROSTER ({roster.length})</h2>
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
            const activeConditions = [
              unit.condPoisoned && 'POISONED',
              unit.condInjuredArm && 'INJ ARM',
              unit.condInjuredLeg && 'INJ LEG',
            ].filter(Boolean)

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
                {/* Desktop: compact row + inline summary */}
                <div className="hidden md:block">
                  <div
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-panel-light transition-colors"
                    onClick={() => setExpandedSlot(expanded ? null : unit.slotId)}
                  >
                    {expanded ? <ChevronDown size={14} className="text-muted shrink-0" /> : <ChevronRight size={14} className="text-muted shrink-0" />}
                    <span className="text-amber text-sm font-bold flex-1 min-w-0 truncate">{unit.unitName}</span>
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

                  {/* Inline Summary — visible when collapsed */}
                  {!expanded && (items.length > 0 || perks.length > 0 || activeConditions.length > 0 || unit.conditions || (unit.regDamage || 0) > 0 || (unit.radDamage || 0) > 0 || (unit.battles || 0) > 0 || (unit.removed || 0) > 0 || unit.addiction) && (
                    <div className="px-3 pb-2 pt-1.5 border-t border-pip-dim/20 space-y-1">
                    {(items.length > 0 || perks.length > 0) && (
                      <div className="flex flex-wrap gap-1">
                        {items.slice(0, 3).map((item, idx) => {
                          const ec = EQUIP_TYPE_COLOR[item.subType] || { border: 'border-pip-dim/40', text: 'text-pip' }
                          return (
                            <span key={idx} className={`text-xs px-1.5 py-0.5 bg-panel-light border ${ec.border} rounded ${ec.text} truncate max-w-[140px]`} title={item.name}>{item.name}</span>
                          )
                        })}
                        {items.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5 text-muted">+{items.length - 3} items</span>
                        )}
                        {perks.slice(0, 3).map((perk, idx) => (
                          <span key={`p${idx}`} className="text-xs px-1.5 py-0.5 bg-panel-light border border-amber/30 rounded text-amber truncate max-w-[140px]" title={perk}>{perk}</span>
                        ))}
                        {perks.length > 3 && (
                          <span className="text-xs px-1.5 py-0.5 text-muted">+{perks.length - 3} perks</span>
                        )}
                      </div>
                    )}
                    {(activeConditions.length > 0 || unit.conditions || (unit.regDamage || 0) > 0 || (unit.radDamage || 0) > 0 || (unit.battles || 0) > 0 || (unit.removed || 0) > 0 || unit.addiction) && (
                      <div className="flex flex-wrap gap-2 items-center">
                        {activeConditions.map(c => (
                          <span key={c} className="text-xs px-1.5 py-0.5 border border-danger/60 rounded text-danger font-bold">{c}</span>
                        ))}
                        {unit.conditions && (
                          <span className="text-xs px-1.5 py-0.5 border border-muted/40 rounded text-muted">{unit.conditions}</span>
                        )}
                        {(unit.regDamage || 0) > 0 && (
                          <span className="text-xs text-muted">DMG <span className="text-danger font-bold">{unit.regDamage}</span></span>
                        )}
                        {(unit.radDamage || 0) > 0 && (
                          <span className="text-xs text-muted">RAD <span className="text-amber font-bold">{unit.radDamage}</span></span>
                        )}
                        {(unit.battles || 0) > 0 && (
                          <span className="text-xs text-muted">⚔ <span className="text-pip font-bold">{unit.battles}</span></span>
                        )}
                        {(unit.removed || 0) > 0 && (
                          <span className="text-xs text-muted">✕ <span className="text-muted font-bold">{unit.removed}</span></span>
                        )}
                        {unit.addiction && (
                          <span className="text-xs px-1.5 py-0.5 border border-amber/40 rounded text-amber">Addicted: {unit.addiction}</span>
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>

                {/* Mobile: card header */}
                <button
                  type="button"
                  className="md:hidden w-full text-left px-3 py-2 border-b border-pip-dim/20 hover:bg-panel-light transition-colors min-h-[44px]"
                  onClick={() => setExpandedSlot(expanded ? null : unit.slotId)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-amber text-sm font-bold truncate">{unit.unitName}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold ${mobileFateBadgeClass(unit.fate)}`} style={unit.fate === 'Active' ? { boxShadow: '0 0 8px var(--color-pip-glow)' } : undefined}>
                          {unit.fate === 'Pending' ? 'FATE?' : unit.fate.toUpperCase()}
                        </span>
                        {unit.isLeader && <span className="text-amber text-xs font-bold border border-amber/60 rounded px-1">LDR</span>}
                      </div>
                      <p className="text-xs text-muted mt-1">
                        HP: reg {unit.regDamage ?? 0} | Rad: {unit.radDamage ?? 0}
                      </p>
                      <p className="text-amber text-sm font-bold mt-0.5">
                        {totalCaps}c <span className="text-muted font-normal">·</span>{' '}
                        <span className="text-muted text-xs font-normal">
                          {unitsData.find(d => d.id === unit.unitId)?.type === 'UNIQUE' ? 'Unique' : 'Std'}
                        </span>
                        {unit.isLeader && <span className="text-amber text-xs ml-1">· Leader</span>}
                      </p>
                    </div>
                    <ChevronDown size={18} className={`text-muted shrink-0 mt-0.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Expanded Detail */}
                {expanded && (
                  <div className="border-t border-pip-mid/40 bg-panel-alt">
                    {phase === 2 ? (
                      // ── Phase 2 minimal view ──
                      <div className="px-4 py-3 space-y-3">
                        <div className="text-xs text-amber tracking-widest font-bold border-b border-pip-dim/20 pb-1">FATE</div>
                        <div className="flex gap-2 items-center">
                          <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1 px-2">
                            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={() => setFateModalUnit(unit)} className="flex items-center gap-1 px-3 py-1.5 border border-amber text-amber rounded text-xs hover:bg-amber-dim/30 transition-colors font-bold" title="Roll Fate">
                            <Dices size={12} /> ROLL
                          </button>
                          <button onClick={() => handleMarkRemoved(unit.slotId)} className="px-3 py-1.5 border border-muted/40 text-muted rounded text-xs hover:text-amber hover:border-amber/60 transition-colors">
                            MARK REMOVED
                          </button>
                        </div>

                        {/* Equipment section — available in Phase 2 */}
                        <div className="text-xs text-amber tracking-widest font-bold border-b border-pip-dim/20 pb-1">EQUIPMENT</div>
                        <div className="space-y-1">
                          {items.map((item, idx) => {
                            const ec = EQUIP_TYPE_COLOR[item.subType] || { text: 'text-muted' }
                            return (
                              <div key={idx} className="flex items-center justify-between border border-pip-dim/30 rounded px-3 py-1.5 bg-panel">
                                <span className="text-pip text-xs font-bold">{item.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs ${ec.text}`}>{item.subType}</span>
                                  <span className="text-amber text-xs font-bold">{item.caps}c</span>
                                  <button onClick={() => handleRemoveItem(unit.slotId, idx)} className="text-muted hover:text-danger transition-colors"><Trash2 size={12} /></button>
                                </div>
                              </div>
                            )
                          })}
                          <button onClick={() => setShowAddItem(unit.slotId)} className="w-full flex items-center justify-center gap-2 py-2 border border-dashed border-pip-mid/50 text-pip rounded text-xs hover:border-pip hover:bg-pip-dim/20 transition-colors font-bold tracking-wider">
                            <Plus size={12} /> ADD EQUIPMENT
                          </button>
                        </div>
                      </div>
                    ) : (
                      // ── Phase 3/4 full view ──
                      <div className="divide-y divide-pip-dim/20">

                        {/* ── STATS ── */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="text-xs text-amber tracking-widest font-bold">STATS</div>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <div className="text-amber font-bold text-sm">{unit.baseCaps}c</div>
                              <div className="text-xs text-muted">BASE</div>
                            </div>
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <div className="text-amber font-bold text-sm">{itemCaps}c</div>
                              <div className="text-xs text-muted">EQUIP</div>
                            </div>
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <div className="text-amber font-bold text-sm">{totalCaps}c</div>
                              <div className="text-xs text-muted">TOTAL</div>
                            </div>
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <input type="number" min="0" value={unit.battles} onChange={(e) => handleUpdateUnit(unit.slotId, 'battles', parseInt(e.target.value) || 0)} className="w-full text-xs py-0.5 px-1 text-center bg-transparent border-0 text-pip font-bold" />
                              <div className="text-xs text-muted">BATTLES</div>
                            </div>
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <input type="number" min="0" value={unit.removed} onChange={(e) => handleUpdateUnit(unit.slotId, 'removed', parseInt(e.target.value) || 0)} className="w-full text-xs py-0.5 px-1 text-center bg-transparent border-0 text-pip font-bold" />
                              <div className="text-xs text-muted">REMOVED</div>
                            </div>
                            <div className="bg-panel rounded px-2 py-1.5 text-center">
                              <input type="number" min="0" max="10" value={unit.lucScore ?? 3} onChange={(e) => handleUpdateUnit(unit.slotId, 'lucScore', parseInt(e.target.value) || 0)} className="w-full text-xs py-0.5 px-1 text-center bg-transparent border-0 text-pip font-bold" />
                              <div className="text-xs text-muted">LUC</div>
                            </div>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted">LEADER:</span>
                              <select value={unit.isLeader ? 'Yes' : 'No'} onChange={(e) => handleUpdateUnit(unit.slotId, 'isLeader', e.target.value === 'Yes')} className="text-xs py-0.5 px-1 w-16">
                                <option>No</option><option>Yes</option>
                              </select>
                            </div>
                            <div>
                              {(unit.battles || 0) < 2 ? (
                                <button disabled className="flex items-center gap-1 text-xs px-3 py-1 border border-muted/30 text-muted rounded opacity-40 cursor-not-allowed">
                                  <Star size={12} /> HEROIC <span className="text-muted">(need 2 battles)</span>
                                </button>
                              ) : (
                                <button onClick={() => handleUpdateUnit(unit.slotId, 'heroic', !unit.heroic)} className={`flex items-center gap-1 text-xs px-3 py-1 border rounded transition-colors font-bold ${unit.heroic ? 'border-amber text-amber bg-amber-dim/20' : 'border-pip/50 text-pip hover:bg-pip-dim/20'}`}>
                                  <Star size={12} /> {unit.heroic ? 'HEROIC ★' : 'HEROIC'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* ── FATE & DAMAGE ── */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="text-xs text-amber tracking-widest font-bold">FATE & DAMAGE</div>
                          <div className="flex gap-2 flex-wrap items-start">
                            <div className="flex gap-1 items-center flex-1 min-w-[180px]">
                              <select value={unit.fate} onChange={(e) => handleUpdateUnit(unit.slotId, 'fate', e.target.value)} className="flex-1 text-xs py-1.5 px-2">
                                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                              <button onClick={() => setFateModalUnit(unit)} className="flex items-center gap-1 px-3 py-1.5 border border-amber text-amber rounded text-xs hover:bg-amber-dim/30 transition-colors font-bold">
                                <Dices size={12} /> ROLL
                              </button>
                            </div>
                            <button onClick={() => handleMarkRemoved(unit.slotId)} className="px-3 py-1.5 border border-muted/40 text-muted rounded text-xs hover:text-amber hover:border-amber/60 transition-colors font-bold">
                              MARK REMOVED →PENDING
                            </button>
                          </div>
                          {unit.fate === 'Pending' && <p className="text-amber text-xs">Fate pending — roll at start of next round</p>}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-muted block mb-1">REG DAMAGE</label>
                              <div className="flex gap-1">
                                <button onClick={() => handleUpdateUnit(unit.slotId, 'regDamage', Math.max(0, (unit.regDamage || 0) - 1))} className="px-2 py-1 border border-muted/40 text-muted rounded text-xs hover:text-pip hover:border-pip transition-colors">−</button>
                                <input type="number" min="0" value={unit.regDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'regDamage', parseInt(e.target.value) || 0)} className="flex-1 text-xs py-1 px-2 text-center" />
                                <button onClick={() => handleUpdateUnit(unit.slotId, 'regDamage', (unit.regDamage || 0) + 1)} className="px-2 py-1 border border-danger/50 text-danger rounded text-xs hover:bg-danger/10 transition-colors">+</button>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs text-muted block mb-1">RAD DAMAGE</label>
                              <div className="flex gap-1">
                                <button onClick={() => handleUpdateUnit(unit.slotId, 'radDamage', Math.max(0, (unit.radDamage || 0) - 1))} className="px-2 py-1 border border-muted/40 text-muted rounded text-xs hover:text-pip hover:border-pip transition-colors">−</button>
                                <input type="number" min="0" value={unit.radDamage} onChange={(e) => handleUpdateUnit(unit.slotId, 'radDamage', parseInt(e.target.value) || 0)} className="flex-1 text-xs py-1 px-2 text-center" />
                                <button onClick={() => handleUpdateUnit(unit.slotId, 'radDamage', (unit.radDamage || 0) + 1)} className="px-2 py-1 border border-amber/50 text-amber rounded text-xs hover:bg-amber/10 transition-colors">+</button>
                              </div>
                            </div>
                          </div>
                          {unit.fate === 'Captured' && (
                            <div className="grid grid-cols-2 gap-2 border border-amber/40 rounded p-2 bg-amber-dim/10 mt-1">
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
                                    Deadline: Round {unit.captureRound + 2}{(state.round || 0) >= (unit.captureRound + 2) ? ' — OVERDUE' : ''}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ── CONDITIONS & STATUS ── */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="text-xs text-amber tracking-widest font-bold">CONDITIONS & STATUS</div>
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { key: 'condPoisoned', label: 'POISONED' },
                              { key: 'condInjuredArm', label: 'INJ ARM' },
                              { key: 'condInjuredLeg', label: 'INJ LEG' },
                            ].map(({ key, label }) => (
                              <button key={key} onClick={() => handleUpdateUnit(unit.slotId, key, !unit[key])} className={`text-xs px-3 py-1.5 border rounded transition-colors font-bold ${unit[key] ? 'border-danger text-danger bg-danger/10' : 'border-muted/40 text-muted hover:border-danger/50 hover:text-danger'}`}>
                                {label}
                              </button>
                            ))}
                            <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 border rounded transition-colors text-xs font-bold ${unit.hasPowerArmor ? 'border-pip text-pip bg-pip-dim/20' : 'border-muted/40 text-muted hover:border-pip/50 hover:text-pip'}`}>
                              <input type="checkbox" checked={unit.hasPowerArmor ?? false} onChange={(e) => handleUpdateUnit(unit.slotId, 'hasPowerArmor', e.target.checked)} className="accent-pip" />
                              <Shield size={12} /> PA
                            </label>
                            {unit.hasPowerArmor && (
                              <label className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 border rounded transition-colors text-xs ${unit.paDegraded ? 'border-amber text-amber' : 'border-muted/40 text-muted hover:border-amber/50 hover:text-amber'}`}>
                                <input type="checkbox" checked={unit.paDegraded ?? false} onChange={(e) => handleUpdateUnit(unit.slotId, 'paDegraded', e.target.checked)} className="accent-amber" />
                                PA DEGRADED
                              </label>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted block mb-1">OTHER CONDITIONS</label>
                              <input type="text" value={unit.conditions || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'conditions', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="e.g. Stun, Prone..." />
                            </div>
                            <div>
                              <label className="text-xs text-muted block mb-1">ADDICTION</label>
                              <input type="text" value={unit.addiction || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'addiction', e.target.value)} className="w-full text-xs py-1 px-2" placeholder="None" />
                            </div>
                          </div>
                        </div>

                        {/* ── EQUIPMENT ── */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-amber tracking-widest font-bold">EQUIPMENT {items.length > 0 && <span className="text-amber">({items.length})</span>}</div>
                            <span className="text-xs text-amber font-bold">{itemCaps > 0 ? `${itemCaps}c equipped` : ''}</span>
                          </div>
                          {items.map((item, idx) => {
                            const ec = EQUIP_TYPE_COLOR[item.subType] || { text: 'text-muted' }
                            return (
                              <div key={idx} className="flex items-center justify-between border border-pip-dim/30 rounded px-3 py-2 bg-panel">
                                <span className="text-pip text-sm font-bold flex-1">{item.name}</span>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className={`text-xs ${ec.text}`}>{item.subType}</span>
                                  <span className="text-amber text-sm font-bold">{item.caps}c</span>
                                  <button onClick={() => handleRemoveItem(unit.slotId, idx)} className="text-muted hover:text-danger transition-colors"><Trash2 size={13} /></button>
                                </div>
                              </div>
                            )
                          })}
                          <button
                            onClick={() => setShowAddItem(unit.slotId)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-pip-mid/50 text-pip rounded text-sm hover:border-pip hover:bg-pip-dim/20 transition-colors font-bold tracking-wider"
                            style={{ boxShadow: '0 0 4px var(--color-pip-glow)' }}
                          >
                            <Plus size={14} /> ADD EQUIPMENT
                          </button>
                        </div>

                        {/* ── PERKS ── */}
                        <div className="px-4 py-3">
                          <PerkPanel
                            unit={unit}
                            phase={phase}
                            battleCount={state.battleCount ?? 0}
                            onAddPerk={handleAddPerk}
                            onRemovePerk={handleRemovePerk}
                          />
                        </div>

                        {/* ── NOTES & ACTIONS ── */}
                        <div className="px-4 py-3 space-y-2">
                          <div className="text-xs text-amber tracking-widest font-bold">NOTES</div>
                          <input type="text" value={unit.notes || ''} onChange={(e) => handleUpdateUnit(unit.slotId, 'notes', e.target.value)} className="w-full text-xs py-1.5 px-2" placeholder="Any notes about this unit..." />
                          <div className="flex justify-end pt-1">
                            <button onClick={() => handleRemoveUnit(unit.slotId)} className="flex items-center gap-1 text-xs text-muted hover:text-danger border border-muted/30 hover:border-danger/50 rounded px-3 py-1.5 transition-colors">
                              <Trash2 size={12} /> REMOVE UNIT FROM ROSTER
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── BOOST HAND ── */}
      <BoostHandPanel state={state} setState={setState} />

      <PerksBrowser
        roster={roster}
        caps={state.caps ?? 0}
        onAddPerk={(slotId, perkName) => handleAddPerk(slotId, perkName)}
        onCapChange={setState}
      />

      <AddUnitModal isOpen={showAddUnit} onClose={() => setShowAddUnit(false)} onAdd={handleAddUnit} caps={state.caps ?? 0} />
      {showAddItem && (
        <AddItemModal
          isOpen={!!showAddItem}
          onClose={() => setShowAddItem(null)}
          onAdd={(itemId) => handleAddItem(showAddItem, itemId)}
          poolItems={state.itemPool?.items || []}
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

const BOOST_TYPE_STYLE = {
  tactical:   { color: '#fbbf24', shadow: 'rgba(251,191,36,0.5)',  label: 'TACTICAL' },
  instinctive:{ color: '#00b65a', shadow: 'rgba(0,182,90,0.5)',    label: 'INSTINCTIVE' },
  cunning:    { color: '#00a0ff', shadow: 'rgba(0,160,255,0.5)',   label: 'CUNNING' },
  practiced:  { color: '#a855f7', shadow: 'rgba(168,85,247,0.5)', label: 'PRACTICED' },
}

function BoostHandPanel({ state, setState }) {
  const boostHand = state.boostHand ?? []

  function handleUseBoost(instanceId) {
    setState(prev => ({
      ...prev,
      boostHand: prev.boostHand.map(b =>
        b.instanceId === instanceId ? { ...b, usedThisRound: !b.usedThisRound } : b
      ),
    }))
  }

  function handleDiscardBoost(instanceId) {
    setState(prev => ({
      ...prev,
      boostHand: prev.boostHand.filter(b => b.instanceId !== instanceId),
    }))
  }

  function handleReturnToRecovery(boost) {
    setState(prev => ({
      ...prev,
      boostHand: prev.boostHand.filter(b => b.instanceId !== boost.instanceId),
      itemPool: {
        ...prev.itemPool,
        items: [...(prev.itemPool?.items ?? []), {
          id: Date.now() + Math.random(),
          boostId: boost.boostId,
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

  return (
    <div className="mt-6 border rounded" style={{ borderColor: 'rgba(168,85,247,0.5)', boxShadow: '0 0 10px rgba(168,85,247,0.12)' }}>
      <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(168,85,247,0.25)' }}>
        <div className="flex items-center gap-2 mb-0.5">
          <Sparkles size={13} style={{ color: '#a855f7' }} />
          <h3 className="text-sm font-bold tracking-wider" style={{ color: '#a855f7', textShadow: '0 0 8px rgba(168,85,247,0.5)' }}>
            BOOST HAND ({boostHand.length})
          </h3>
        </div>
        <p className="text-muted text-xs">Secret — visible only to you · Max = leader's highest stat · Returns to Recovery Pool at round end</p>
      </div>
      <div className="p-4">
        {boostHand.length === 0 ? (
          <p className="text-muted text-xs">No boosts in hand. Move boosts from Recovery or Settlement Pool → TO HAND on the Settlement tab.</p>
        ) : (
          <div className="space-y-2">
            {boostHand.map(boost => {
              const bs = BOOST_TYPE_STYLE[boost.boostType] || {}
              const ref = boostsData.find(b => b.id === boost.boostId)
              return (
                <div
                  key={boost.instanceId}
                  className={`border rounded px-3 py-2 space-y-1 transition-opacity ${boost.usedThisRound ? 'opacity-50' : ''}`}
                  style={{ borderColor: boost.usedThisRound ? 'rgba(100,100,100,0.3)' : `${bs.color || '#a855f7'}50`, boxShadow: boost.usedThisRound ? 'none' : `0 0 6px ${bs.shadow || 'rgba(168,85,247,0.2)'}` }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Sparkles size={11} style={{ color: boost.usedThisRound ? '#666' : bs.color }} />
                    <span className="text-xs font-bold flex-1 min-w-0" style={{ color: boost.usedThisRound ? '#666' : bs.color }}>
                      {boost.name}
                      {boost.usedThisRound && <span className="ml-2 text-dim text-xs font-normal">(USED)</span>}
                    </span>
                    <span className="text-xs px-1.5 py-0.5 border rounded" style={{ color: bs.color, borderColor: `${bs.color}50` }}>{bs.label}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUseBoost(boost.instanceId)}
                        className="text-xs px-2 py-0.5 border font-bold rounded transition-colors"
                        style={boost.usedThisRound
                          ? { color: '#666', borderColor: 'rgba(100,100,100,0.3)' }
                          : { color: bs.color, borderColor: `${bs.color}70`, boxShadow: `0 0 4px ${bs.shadow}` }
                        }
                      >{boost.usedThisRound ? 'UNUSE' : 'USE'}</button>
                      <button
                        onClick={() => handleReturnToRecovery(boost)}
                        className="text-xs px-2 py-0.5 border border-muted/30 rounded text-muted hover:text-pip hover:border-pip transition-colors"
                        title="Return to Recovery Pool"
                      >RETURN</button>
                      <button
                        onClick={() => handleDiscardBoost(boost.instanceId)}
                        className="text-xs px-2 py-0.5 border border-muted/20 rounded text-dim hover:text-danger hover:border-danger/40 transition-colors"
                        title="Discard boost permanently"
                      >DISCARD</button>
                    </div>
                  </div>
                  {ref && <p className="text-xs leading-relaxed pl-5" style={{ color: boost.usedThisRound ? '#555' : '#888' }}>{ref.effect}</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PerkPanel({ unit, phase, battleCount, onAddPerk, onRemovePerk }) {
  const [showPerkModal, setShowPerkModal] = useState(false)
  const [expandedPerk, setExpandedPerk] = useState(null)

  const perks = unit.perks || []
  const battles = unit.battles || 0
  const perksThisRound = unit.perksThisRound || 0

  const tooMany = perks.length > battles
  const roundLimitReached = perksThisRound >= 1
  const phase4FirstBattle = phase === 4 && battleCount === 0
  const canAdd = !roundLimitReached && !phase4FirstBattle && perks.length < battles

  function handleDrawRandom() {
    if (!canAdd) return
    const available = PERK_CARDS.filter(p => !perks.includes(p.name))
    if (available.length === 0) return
    const picked = available[Math.floor(Math.random() * available.length)]
    onAddPerk(unit.slotId, picked.name)
  }

  let warning = null
  if (phase4FirstBattle) warning = 'First perk available after first Phase 4 battle'
  else if (roundLimitReached) warning = 'Max 1 new perk per settlement round'
  else if (perks.length >= battles && battles > 0) warning = 'Cannot exceed battles fought'
  else if (battles === 0) warning = 'No battles fought yet — perks require at least 1 battle'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <label className="text-xs text-muted tracking-wider">
          PERKS ({perks.length} / {battles} battles)
          <span className="ml-2 text-pip text-xs">THIS ROUND: {perksThisRound}/1</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDrawRandom}
            disabled={!canAdd}
            className="flex items-center gap-1 text-xs border border-info/60 text-info hover:bg-info-dim/20 rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold"
            title="Draw a random perk card"
          >
            <Shuffle size={11} /> RANDOM
          </button>
          <button
            onClick={() => setShowPerkModal(true)}
            disabled={!canAdd}
            className="flex items-center gap-1 text-xs border border-pip text-pip hover:bg-pip-dim/20 rounded px-2 py-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-bold"
          >
            <Plus size={11} /> SELECT PERK
          </button>
        </div>
      </div>

      {warning && <p className="text-amber text-xs mb-2">{warning}</p>}
      {tooMany && <p className="text-danger text-xs mb-2 font-bold">⚠ Too many perks for battles fought</p>}

      {/* Equipped perks */}
      {perks.length > 0 && (
        <div className="space-y-1">
          {perks.map((perkName, i) => {
            const perkRef = PERK_CARDS.find(p => p.name === perkName)
            const isExpanded = expandedPerk === i
            return (
              <div key={i} className="border border-pip-dim/30 rounded bg-panel-light overflow-hidden">
                <div
                  className="flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-panel"
                  onClick={() => setExpandedPerk(isExpanded ? null : i)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isExpanded ? <ChevronDown size={12} className="text-muted shrink-0" /> : <ChevronRight size={12} className="text-muted shrink-0" />}
                    <span className="text-pip text-xs font-bold truncate">{perkName}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onRemovePerk(unit.slotId, i) }}
                    className="text-muted hover:text-danger p-0.5 transition-colors shrink-0"
                  >
                    <X size={12} />
                  </button>
                </div>
                {isExpanded && perkRef && (
                  <div className="px-3 pb-2 pt-1 border-t border-pip-dim/20">
                    <p className="text-muted text-xs leading-relaxed">{parseSymbols(perkRef.text)}</p>
                    {perkRef.requires && (
                      <p className="text-amber text-xs mt-1">Requires: {perkRef.requires}</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <PerkPickerModal
        isOpen={showPerkModal}
        onClose={() => setShowPerkModal(false)}
        onSelect={(perkName) => {
          onAddPerk(unit.slotId, perkName)
          setShowPerkModal(false)
        }}
        equippedPerks={perks}
        canAdd={canAdd}
      />
    </div>
  )
}

function PerksBrowser({ roster, caps, onAddPerk, onCapChange }) {
  const [search, setSearch] = useState('')
  const [selectedPerk, setSelectedPerk] = useState(null)
  const [selectedUnitSlot, setSelectedUnitSlot] = useState('')
  const [confirmError, setConfirmError] = useState('')

  const filteredPerks = PERK_CARDS.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const activeRoster = roster.filter(u => u.fate !== 'Dead' && u.fate !== 'Pending')
  const cost = selectedPerk ? (getPerkCaps(selectedPerk.name) ?? null) : null

  function handleConfirm() {
    if (!selectedPerk || !selectedUnitSlot) return
    const unit = roster.find(u => u.slotId === selectedUnitSlot)
    if (!unit) return

    if (cost !== null && caps < cost) {
      setConfirmError(`Insufficient caps (need ${cost}c, have ${caps}c)`)
      return
    }

    onAddPerk(selectedUnitSlot, selectedPerk.name)
    if (cost !== null) {
      onCapChange(prev => ({ ...prev, caps: Math.max(0, (prev.caps ?? 0) - cost) }))
    }
    setConfirmError('')
    setSelectedUnitSlot('')
  }

  return (
    <div className="border border-pip-mid/40 rounded-lg bg-panel overflow-hidden mt-6">
      <div className="px-4 py-2 bg-panel-light border-b border-pip-mid/30">
        <h2 className="text-pip text-xs tracking-widest font-bold">PERK BROWSER</h2>
        <p className="text-muted text-xs mt-0.5">Browse all perks, read their effects, and assign to a unit.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-pip-dim/20">
        {/* Left: perk list */}
        <div className="p-3 space-y-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search perks..."
            className="w-full text-xs"
          />
          <div className="max-h-72 overflow-y-auto space-y-0.5 pr-1">
            {filteredPerks.map(perk => {
              const perkCost = getPerkCaps(perk.name)
              const isSelected = selectedPerk?.id === perk.id
              return (
                <button
                  key={perk.id}
                  onClick={() => { setSelectedPerk(perk); setSelectedUnitSlot(''); setConfirmError('') }}
                  className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between gap-2 transition-colors text-xs ${
                    isSelected
                      ? 'bg-pip-dim/20 border border-pip/40 text-pip'
                      : 'hover:bg-panel-light text-pip border border-transparent'
                  }`}
                >
                  <span className="font-bold truncate">{perk.name}</span>
                  {perkCost !== null && (
                    <span className="shrink-0 text-amber font-bold text-xs">{perkCost}c</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right: perk detail + assign */}
        <div className="p-3 space-y-3">
          {selectedPerk ? (
            <>
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-amber font-bold text-sm">{selectedPerk.name}</span>
                  {cost !== null && (
                    <span className="text-amber font-bold text-sm shrink-0">{cost}c</span>
                  )}
                  {cost === null && (
                    <span className="text-muted text-xs shrink-0">cost unknown</span>
                  )}
                </div>
                <div className="border border-pip-dim/20 rounded bg-panel-light p-3">
                  <p className="text-pip text-xs leading-relaxed">{parseSymbols(selectedPerk.text)}</p>
                  {selectedPerk.requires && (
                    <p className="text-amber text-xs mt-2">Requires: {selectedPerk.requires}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 pt-1 border-t border-pip-dim/20">
                <div>
                  <label className="text-muted text-xs block mb-1 tracking-wider">ASSIGN TO UNIT</label>
                  <select
                    value={selectedUnitSlot}
                    onChange={e => { setSelectedUnitSlot(e.target.value); setConfirmError('') }}
                    className="w-full text-xs"
                  >
                    <option value="">Select unit...</option>
                    {activeRoster.map(u => (
                      <option key={u.slotId} value={u.slotId}>{u.name}</option>
                    ))}
                  </select>
                </div>

                {cost !== null && (
                  <div className="text-xs text-muted">
                    Cost: <span className="text-amber font-bold">{cost}c</span>
                    {' '}(you have <span className={caps < cost ? 'text-danger font-bold' : 'text-pip font-bold'}>{caps}c</span>)
                  </div>
                )}

                {confirmError && (
                  <p className="text-danger text-xs">{confirmError}</p>
                )}

                <button
                  onClick={handleConfirm}
                  disabled={!selectedUnitSlot || (cost !== null && caps < cost)}
                  className="w-full py-2 border border-amber text-amber text-xs font-bold rounded hover:bg-amber/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {cost !== null ? `ASSIGN PERK (${cost}c)` : 'ASSIGN PERK'}
                </button>
              </div>
            </>
          ) : (
            <p className="text-muted text-xs text-center py-8">Select a perk from the list to read its effect.</p>
          )}
        </div>
      </div>
    </div>
  )
}
