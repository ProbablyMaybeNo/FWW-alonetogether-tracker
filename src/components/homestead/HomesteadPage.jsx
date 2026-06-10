import { useEffect, useState } from 'react'
import {
  Plus, X, RotateCcw, Heart, Skull, Shield, ShieldOff,
  Trash2, ChevronDown, ChevronRight, Dices, Package, Star, Shuffle,
} from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import structuresCatalog from '../../data/structures.json'
import { calcUnitTotalCaps, calcUnitItemCaps, getItemRef, calcPowerGenerated, calcPowerConsumed, calcWaterGenerated, calcWaterConsumed, applyRestToUnit } from '../../utils/calculations'
import useStructureUse from '../../hooks/useStructureUse'
import { STATUS_OPTIONS } from '../../utils/fateTable'
import AddUnitModal from '../roster/AddUnitModal'
import AddItemModal from '../roster/AddItemModal'
import FateRollModal from '../roster/FateRollModal'
import PerkPickerModal from '../roster/PerkPickerModal'
import ItemPoolPanel from '../settlement/ItemPoolPanel'
import ManualPoolPanel from '../settlement/ManualPoolPanel'
import SettlementDeckPanel from '../settlement/SettlementDeckPanel'
import ExplorePanel from '../settlement/ExplorePanel'
import { PERK_CARDS, parseSymbols } from '../../data/perkCards'

// ── Static catalog lookups (built once) ─────────────────────────────────
const STRUCT_BY_ID = Object.fromEntries(structuresCatalog.map(s => [s.id, s]))
const STRUCT_CATEGORIES = ['Infrastructure', 'Item Structure', 'Boost Structure', 'Exploration', 'Other']

const genId = () => Date.now() + Math.random()

function structBucket(s) {
  const c = s?.category ?? ''
  if (c === 'Infrastructure') return 'Infrastructure'
  if (/Boost|Rack|Newsstand|HQ|Bugle|Grognak|Survival/i.test(s?.name ?? '')) return 'Boost Structure'
  if (/Stand|Shop|Emporium|Stall|Stores|Clinic|Surgery|First Aid|Bar|Restaurant|Drink/i.test(s?.name ?? '')) return 'Item Structure'
  if (c === 'Exploration' || /Listening Post|Brahmin Ranch|Operations Room|Leader.?s Office|Land/i.test(s?.name ?? '')) return 'Exploration'
  return 'Other'
}


const FATES = ['Active', 'Delayed', 'Lost', 'Captured', 'Dead']
const ABSENT_FATES = ['Delayed', 'Lost', 'Captured', 'Dead', 'Pending']

const EQUIP_TYPE_COLOR = {
  'Armor':           { border: 'border-white/50',   text: 'text-title' },
  'Heavy Weapon':    { border: 'border-danger/60',  text: 'text-title' },
  'Melee':           { border: 'border-amber/60',   text: 'text-title' },
  'Rifle':           { border: 'border-amber/50',   text: 'text-title' },
  'Pistol':          { border: 'border-amber/40',   text: 'text-title' },
  'Grenade':         { border: 'border-danger/50',  text: 'text-title' },
  'Mine':            { border: 'border-danger/40',  text: 'text-title' },
  'Chem':            { border: 'border-purple/50',  text: 'text-title' },
  'Drink':           { border: 'border-pip/50',     text: 'text-title' },
  'Food':            { border: 'border-pip/40',     text: 'text-title' },
  'Clothing':        { border: 'border-white/35',   text: 'text-title' },
  'Mod':             { border: 'border-amber/45',   text: 'text-title' },
  'Utility':         { border: 'border-white/30',   text: 'text-title' },
  'Leader':          { border: 'border-amber/70',   text: 'text-title' },
  'Perk':            { border: 'border-amber/55',   text: 'text-title' },
  'Automatron Part': { border: 'border-white/30',   text: 'text-title' },
}

const BOOST_TYPE_STYLE = {
  tactical:    { color: '#fbbf24', shadow: 'rgba(251,191,36,0.5)', label: 'TACTICAL'    },
  instinctive: { color: '#00b65a', shadow: 'rgba(0,182,90,0.5)',   label: 'INSTINCTIVE' },
  cunning:     { color: '#00a0ff', shadow: 'rgba(0,160,255,0.5)',  label: 'CUNNING'     },
  practiced:   { color: '#a855f7', shadow: 'rgba(168,85,247,0.5)', label: 'PRACTICED'   },
}

export default function HomesteadPage() {
  const { state, setState } = useCampaign()
  const structureUse = useStructureUse()
  const [step, setStep] = useState('build')                  // 'build' | 'select' | 'use'
  const [structPick, setStructPick] = useState('')
  const [expandedSlot, setExpandedSlot] = useState(null)
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [showAddItem, setShowAddItem] = useState(null)       // slotId of unit
  const [fateModalUnit, setFateModalUnit] = useState(null)
  const [showPools, setShowPools] = useState(false)
  const [poolsTab, setPoolsTab] = useState('items') // 'items' | 'decks' | 'explore'

  // Lock body scroll while the slide-out is open + Esc closes it
  useEffect(() => {
    if (!showPools) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e) { if (e.key === 'Escape') setShowPools(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [showPools])

  if (!state) return <div className="p-8 text-center text-muted text-xs tracking-wider">LOADING…</div>

  const caps = state.caps ?? 0
  const roster = state.roster ?? []
  const structures = state.settlement?.structures ?? []
  const items = state.itemPool?.items ?? []
  const itemPoolCount = items.length

  // ── Derived settlement stats ─────────────────────────────────────────
  // Use shared utils so HOMESTEAD/SETTLEMENT/OVERVIEW agree on the numbers.
  const power = calcPowerGenerated(structures) - calcPowerConsumed(structures)
  const water = calcWaterGenerated(structures) - calcWaterConsumed(structures)
  const storesCount = structures.filter(s => {
    const def = STRUCT_BY_ID[s.structureId]
    if (!def) return false
    if (structBucket(def) !== 'Item Structure') return false
    if ((def.pwrReq ?? 0) === 0) return true
    return s.powered === true
  }).length

  // ── Derived roster stats ─────────────────────────────────────────────
  const rosterCapsTotal = roster.reduce((s, u) => s + calcUnitTotalCaps(u), 0)
  const leaderUnit = roster.find(u => u.isLeader)
  const leaderAbsent = leaderUnit && ABSENT_FATES.includes(leaderUnit.fate)

  // ── Mutators ─────────────────────────────────────────────────────────
  const setCaps = (n) => setState(p => ({ ...p, caps: Math.max(0, n) }))
  const addCaps = (n) => setState(p => ({ ...p, caps: Math.max(0, (p.caps ?? 0) + n) }))

  function addStructure(structureId) {
    if (!structureId) return
    const id = parseInt(structureId, 10)
    const def = STRUCT_BY_ID[id]
    if (!def) return
    setState(p => {
      const newStruct = {
        instanceId: genId(),
        structureId: id,
        powered: (def.pwrReq ?? 0) === 0,
        usedThisRound: false,
        condition: 'Undamaged',
        notes: '',
      }
      const cost = def.cost ?? 0
      return {
        ...p,
        caps: Math.max(0, (p.caps ?? 0) - cost),
        settlement: { ...(p.settlement ?? {}), structures: [...(p.settlement?.structures ?? []), newStruct] },
      }
    })
    setStructPick('')
  }

  function removeStructure(instanceId) {
    setState(p => ({
      ...p,
      settlement: {
        ...(p.settlement ?? {}),
        structures: (p.settlement?.structures ?? []).filter(s => s.instanceId !== instanceId),
      },
    }))
  }

  function buyLand() {
    const currentLand = state.settlement?.landCount ?? (state.settlement?.landPurchased ? 1 : 0)
    if (!confirm(`Purchase additional land for 500c? Adds 10 extra structure slots. (Current land: ${currentLand})`)) return
    setState(p => ({
      ...p,
      caps: Math.max(0, (p.caps ?? 0) - 500),
      settlement: {
        ...(p.settlement ?? {}),
        landPurchased: true,
        landCount: (p.settlement?.landCount ?? (p.settlement?.landPurchased ? 1 : 0)) + 1,
      },
    }))
  }

  function claimLandViaQuests() {
    if (!confirm('Claim additional land via 5 completed quests? (No cap cost)')) return
    setState(p => ({
      ...p,
      settlement: {
        ...(p.settlement ?? {}),
        landPurchased: true,
        landCount: (p.settlement?.landCount ?? (p.settlement?.landPurchased ? 1 : 0)) + 1,
      },
    }))
  }

  function restAllWounded() {
    const eligible = roster.filter(u =>
      u.fate === 'Active' || u.fate === 'Delayed' || u.fate === 'Injured'
    )
    if (eligible.length === 0) { alert('No models eligible to rest.'); return }
    if (!confirm(
      `Apply REST to ${eligible.length} model${eligible.length !== 1 ? 's' : ''} per Alone Together rules?\n\n` +
      `• Delayed → Active (returns, no heal)\n` +
      `• Injured → Active (returns + heals)\n` +
      `• For healing units: convert half radiation (round up) to regular damage, then discard half regular damage (round up), drop 1 condition`
    )) return
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(applyRestToUnit),
    }))
  }

  function patchStructure(instanceId, patch) {
    setState(p => ({
      ...p,
      settlement: {
        ...(p.settlement ?? {}),
        structures: (p.settlement?.structures ?? []).map(s =>
          s.instanceId === instanceId ? { ...s, ...patch } : s
        ),
      },
    }))
  }


  // ── Roster mutators ──────────────────────────────────────────────────
  function addUnit(unit) {
    const cost = unit.baseCaps || 0
    setState(p => ({
      ...p,
      caps: Math.max(0, (p.caps ?? 0) - cost),
      roster: [...(p.roster ?? []), unit],
    }))
  }

  function removeUnit(slotId) {
    if (!confirm('Remove this unit from roster?')) return
    setState(p => ({ ...p, roster: (p.roster ?? []).filter(u => u.slotId !== slotId) }))
  }

  function patchUnit(slotId, patch) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u => u.slotId === slotId ? { ...u, ...patch } : u),
    }))
  }

  function restUnit(slotId) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u => u.slotId === slotId ? applyRestToUnit(u) : u),
    }))
  }

  function applyFate(slotId, fate) {
    const fateMap = {
      Fine: 'Active', Delayed: 'Delayed', Lost: 'Lost', Shaken: 'Shaken',
      Captured: 'Captured', Injured: 'Injured', Dead: 'Dead',
    }
    const status = fateMap[fate] || fate
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId ? { ...u, fate: status, removed: (u.removed || 0) + 1 } : u
      ),
    }))
  }

  function markRemoved(slotId) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId
          ? { ...u, fate: 'Pending', removed: (u.removed || 0) + 1, battles: (u.battles || 0) + 1 }
          : u
      ),
    }))
  }

  function addItem(slotId, itemId) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId ? { ...u, equippedItems: [...(u.equippedItems || []), itemId] } : u
      ),
    }))
  }

  function removeItem(slotId, idx) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId ? { ...u, equippedItems: (u.equippedItems || []).filter((_, i) => i !== idx) } : u
      ),
    }))
  }

  function addPerk(slotId, perkName) {
    if (!perkName.trim()) return
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId
          ? { ...u, perks: [...(u.perks || []), perkName.trim()], perksThisRound: (u.perksThisRound || 0) + 1 }
          : u
      ),
    }))
  }

  function removePerk(slotId, idx) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u =>
        u.slotId === slotId ? { ...u, perks: (u.perks || []).filter((_, i) => i !== idx) } : u
      ),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header strip */}
      <div className="bg-panel-light border border-amber/40 rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}>
        <div className="flex items-center gap-2">
          <span className="text-title text-lg font-bold tracking-widest">HOMESTEAD</span>
          <span className="text-amber/80 text-xs tracking-wider">— ROSTER · SETTLEMENT · TRACKER</span>
        </div>
        <span className="text-muted/60 text-[10px] tracking-wider">Round {state.round ?? 0}</span>
        <span
          className="text-purple text-xs font-bold tracking-widest px-2.5 py-1 border border-purple/50 rounded bg-purple-dim/20"
          style={{ boxShadow: '0 0 10px var(--color-purple-glow)', textShadow: '0 0 6px var(--color-purple-glow)' }}
          title="Total caps cost of every roster unit plus equipped items"
        >
          ROSTER COST {rosterCapsTotal}c
        </span>
        <div className="ml-auto flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => { setPoolsTab('items'); setShowPools(true) }}
            className="flex items-center gap-1 text-[10px] tracking-widest px-2.5 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/20"
            title="Pools, decks, explore — all your items + draws in one slide-out"
          >
            <Package size={11} /> POOLS ({itemPoolCount})
          </button>
          <button
            onClick={() => setShowAddUnit(true)}
            className="flex items-center gap-1 text-[10px] tracking-widest px-2.5 py-1.5 border border-amber text-amber rounded hover:bg-amber-dim/20"
            title="Add a unit to your roster"
          >
            <Plus size={11} /> ADD UNIT
          </button>
          <div className="w-px h-5 bg-pip-dim/40 mx-1" />
          {['build', 'select', 'use'].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${
                step === s
                  ? 'border-amber text-amber bg-amber-dim/10'
                  : 'border-pip-dim/50 text-pip/70 hover:border-pip hover:text-pip'
              }`}
            >
              {s === 'build' ? '1 · BUILD' : s === 'select' ? '2 · SELECT' : '3 · USE'}
            </button>
          ))}
        </div>
      </div>

      {/* Leader absent banner */}
      {leaderAbsent && (
        <div className="border border-danger rounded bg-danger-dim/20 px-4 py-2 text-danger text-xs font-bold"
          style={{ boxShadow: '0 0 8px var(--color-danger-glow)' }}>
          YOUR LEADER IS {leaderUnit.fate.toUpperCase()} — Designate a new Leader
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4">
        {/* ───── LEFT: ROSTER ───── */}
        <section className="border border-pip-mid/40 rounded-lg bg-panel">
          <div className="px-3 py-2 border-b border-pip-mid/30 flex items-center gap-2">
            <h3 className="text-amber text-xs tracking-widest font-bold flex-1">ROSTER ({roster.length})</h3>
            <button
              onClick={restAllWounded}
              title="Halve damage and drop one condition on every wounded Active unit"
              className="text-[10px] tracking-widest px-2 py-1 border border-pip/60 text-pip rounded hover:bg-pip-dim/20 font-bold"
            >REST ALL</button>
            <span className="text-muted/60 text-[10px] tracking-wider hidden sm:inline">Click row to expand</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-pip-dim/30 bg-panel-alt">
                  <th className="text-left  text-info py-1.5 px-2 font-normal tracking-wider w-[18%]">UNIT</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-12">DMG</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-12">RAD</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-20">COND</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-16">PA</th>
                  <th className="text-left  text-info py-1.5 px-1 font-normal tracking-wider w-24">ADDICTION</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-24">FATE</th>
                  <th className="text-center text-info py-1.5 px-1 font-normal tracking-wider w-16"></th>
                </tr>
              </thead>
              <tbody>
                {roster.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center text-muted/60 py-6 text-xs">
                      No units in roster. Click <span className="text-amber font-bold">+ ADD UNIT</span> at the top to get started.
                    </td>
                  </tr>
                )}
                {roster.map(u => {
                  const isDown = ABSENT_FATES.includes(u.fate)
                  const dmg = u.regDamage ?? 0
                  const rads = u.radDamage ?? 0
                  const expanded = expandedSlot === u.slotId
                  return (
                    <RosterRow
                      key={u.slotId}
                      unit={u}
                      isDown={isDown}
                      dmg={dmg}
                      rads={rads}
                      expanded={expanded}
                      onToggleExpand={() => setExpandedSlot(expanded ? null : u.slotId)}
                      onPatch={(patch) => patchUnit(u.slotId, patch)}
                      onRest={() => restUnit(u.slotId)}
                      onRemove={() => removeUnit(u.slotId)}
                      onShowAddItem={() => setShowAddItem(u.slotId)}
                      onShowFate={() => setFateModalUnit(u)}
                      onMarkRemoved={() => markRemoved(u.slotId)}
                      onAddPerk={(perk) => addPerk(u.slotId, perk)}
                      onRemovePerk={(idx) => removePerk(u.slotId, idx)}
                      onRemoveItem={(idx) => removeItem(u.slotId, idx)}
                      round={state.round ?? 0}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ───── RIGHT: SETTLEMENT ───── */}
        <aside className="space-y-3">
          {/* Caps + derived */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-amber text-xs tracking-widest font-bold flex-1">CAPS</span>
              <div className="flex items-center gap-1">
                <button onClick={() => addCaps(-50)} className="px-1.5 py-0.5 border border-muted/40 rounded text-muted hover:text-pip hover:border-pip text-[10px]">−50</button>
                <input type="number" min="0" value={caps} onChange={e => setCaps(parseInt(e.target.value || '0', 10))}
                  className="w-20 text-sm py-1 px-2 text-center font-bold text-amber" />
                <button onClick={() => addCaps(50)} className="px-1.5 py-0.5 border border-muted/40 rounded text-muted hover:text-pip hover:border-pip text-[10px]">+50</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <DerivedStat label="POWER"  value={power}  good={power >= 0} />
              <DerivedStat label="WATER"  value={water}  good={water >= 0} />
              <DerivedStat label="STORES" value={storesCount} good />
            </div>
            {/* Land + slots */}
            {(() => {
              const landCount = state.settlement?.landCount ?? (state.settlement?.landPurchased ? 1 : 0)
              const maxSlots = 15 + (landCount * 10)
              const usedSlots = structures.reduce((sum, s) => {
                const def = STRUCT_BY_ID[s.structureId]
                return sum + (def?.size || 1)
              }, 0)
              const overBudget = usedSlots > maxSlots
              const completedQuestCount = (state.questCards || []).filter(q => q.status === 'Complete').length
              const canClaimViaQuests = completedQuestCount >= 5
              return (
                <div className="mt-2 flex items-center gap-2 text-[10px] tracking-wider flex-wrap">
                  <span className={`${overBudget ? 'text-danger' : 'text-muted'}`}>SLOTS: <span className={`font-bold ${overBudget ? 'text-danger' : 'text-pip'}`}>{usedSlots}/{maxSlots}</span></span>
                  <span className="text-muted">LAND: <span className="text-pip font-bold">{landCount}</span></span>
                  <button
                    onClick={buyLand}
                    disabled={caps < 500}
                    title={caps < 500 ? `Need 500c (have ${caps}c)` : 'Purchase additional land for 500c (+10 slots)'}
                    className="ml-auto px-2 py-0.5 border border-amber/60 text-amber rounded hover:bg-amber-dim/20 disabled:opacity-30 disabled:cursor-not-allowed font-bold"
                  >+ LAND 500c</button>
                  {canClaimViaQuests && (
                    <button
                      onClick={claimLandViaQuests}
                      title="Claim free land via 5 completed quests"
                      className="px-2 py-0.5 border border-pip/60 text-pip rounded hover:bg-pip-dim/20 font-bold"
                    >+ LAND (quest)</button>
                  )}
                </div>
              )
            })()}
          </div>

          {/* Structures */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel">
            <div className="px-3 py-2 border-b border-pip-mid/30">
              <h3 className="text-amber text-xs tracking-widest font-bold">STRUCTURES ({structures.length})</h3>
            </div>
            <div className="p-2 space-y-2">
              <div className="flex items-center gap-1.5">
                <select
                  value={structPick}
                  onChange={e => setStructPick(e.target.value)}
                  className="flex-1 text-[11px] py-1 px-2"
                >
                  <option value="">+ Add structure…</option>
                  {STRUCT_CATEGORIES.map(cat => {
                    const opts = structuresCatalog.filter(s => structBucket(s) === cat && (s.atValid !== false))
                    if (opts.length === 0) return null
                    return (
                      <optgroup key={cat} label={cat}>
                        {opts.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.cost}c
                          </option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
                <button
                  onClick={() => addStructure(structPick)}
                  disabled={!structPick}
                  className="px-2 py-1 border border-pip text-pip text-[10px] tracking-widest rounded hover:bg-pip-dim/20 disabled:opacity-30"
                >ADD</button>
              </div>

              {STRUCT_CATEGORIES.map(cat => {
                const rows = structures
                  .map(s => ({ s, def: STRUCT_BY_ID[s.structureId] }))
                  .filter(({ def }) => def && structBucket(def) === cat)
                if (rows.length === 0) return null
                return (
                  <div key={cat}>
                    <div className="text-pip/60 text-[10px] tracking-widest mb-1 mt-1.5">{cat.toUpperCase()}</div>
                    <div className="space-y-0.5">
                      {rows.map(({ s, def }) => {
                        const needsPower = (def.pwrReq ?? 0) > 0
                        const canUse = step === 'use' && (!needsPower || s.powered)
                        return (
                          <div key={s.instanceId} className="flex items-center gap-1.5 border border-pip-dim/30 rounded px-2 py-1 bg-panel-alt">
                            <span className="text-pip text-[11px] flex-1 truncate">{def.name}</span>
                            {needsPower && (
                              <button
                                onClick={() => patchStructure(s.instanceId, { powered: !s.powered })}
                                title="Powered"
                                className={`text-[9px] tracking-widest px-1.5 py-0.5 border rounded ${s.powered ? 'border-pip text-pip' : 'border-danger/50 text-danger'}`}
                              >{s.powered ? 'PWR' : 'OFF'}</button>
                            )}
                            <button
                              onClick={() => structureUse.toggleUsed(s.instanceId)}
                              disabled={!canUse && !s.usedThisRound}
                              title={s.usedThisRound ? 'Undo use' : 'Use this structure (fires side-effects)'}
                              className={`text-[9px] tracking-widest px-1.5 py-0.5 border rounded ${s.usedThisRound ? 'border-amber text-amber' : 'border-muted/40 text-muted'} disabled:opacity-30`}
                            >{s.usedThisRound ? 'USED' : 'USE'}</button>
                            <button
                              onClick={() => removeStructure(s.instanceId)}
                              title="Remove"
                              className="text-muted hover:text-danger p-0.5"
                            ><X size={11} /></button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {structures.some(s => s.usedThisRound) && (
                <button
                  onClick={() => setState(p => ({
                    ...p,
                    settlement: {
                      ...(p.settlement ?? {}),
                      structures: (p.settlement?.structures ?? []).map(s => ({ ...s, usedThisRound: false })),
                    },
                  }))}
                  className="w-full mt-1 text-[10px] tracking-widest py-1 border border-muted/40 rounded text-muted hover:border-pip hover:text-pip flex items-center justify-center gap-1"
                >
                  <RotateCcw size={10} /> RESET USED FLAGS
                </button>
              )}
            </div>
          </div>

        </aside>
      </div>

      {/* Modals */}
      <AddUnitModal
        isOpen={showAddUnit}
        onClose={() => setShowAddUnit(false)}
        onAdd={addUnit}
        caps={caps}
      />
      {showAddItem && (
        <AddItemModal
          isOpen={!!showAddItem}
          onClose={() => setShowAddItem(null)}
          onAdd={(itemId) => addItem(showAddItem, itemId)}
          poolItems={items}
        />
      )}
      {fateModalUnit && (
        <FateRollModal
          isOpen={!!fateModalUnit}
          onClose={() => setFateModalUnit(null)}
          unit={fateModalUnit}
          onApply={(fate) => applyFate(fateModalUnit.slotId, fate)}
        />
      )}

      {/* Structure-use modals (Barracks, MedCenter, Stores, ExploreCard, DeckDraw, ItemDraw) */}
      {structureUse.modalElements}

      {/* Lost-unit recovery alert (fires after Listening Post / Ranger Outpost / Scout Camp explore draws) */}
      {structureUse.currentLostUnit && (
        <div className="fixed top-4 right-4 z-40 max-w-sm border border-amber rounded bg-amber-dim/95 backdrop-blur p-3 shadow-lg"
          style={{ boxShadow: '0 0 16px var(--color-amber-glow)' }}>
          <div className="text-amber text-xs font-bold tracking-widest mb-1">LOST MODEL RECOVERY</div>
          <p className="text-pip text-xs mb-2">
            Explore card drawn — recover <span className="text-amber font-bold">{structureUse.currentLostUnit.unitName}</span>?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => structureUse.handleMarkFound(structureUse.currentLostUnit.slotId)}
              className="flex-1 text-xs px-3 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/20 font-bold"
            >MARK FOUND</button>
            <button
              onClick={structureUse.handleNotFound}
              className="px-3 py-1.5 text-xs border border-muted/40 text-muted rounded hover:text-pip hover:border-pip"
            >SKIP</button>
          </div>
        </div>
      )}

      {/* POOLS slide-out — single home for item pool, settlement decks, explore */}
      {showPools && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70"
            onClick={() => setShowPools(false)}
            aria-hidden="true"
          />
          <aside
            className="fixed top-0 right-0 z-50 h-full w-full max-w-3xl bg-panel border-l-2 border-pip-mid/60 shadow-[0_0_32px_rgba(0,0,0,0.5)] flex flex-col"
            role="dialog"
            aria-label="Pools and decks"
          >
            <header className="flex items-center justify-between px-4 py-3 border-b border-pip-mid/40 bg-panel-light shrink-0">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-pip" />
                <h2 className="text-title text-sm font-bold tracking-widest">POOLS</h2>
                <span className="text-muted text-xs">({itemPoolCount} items)</span>
              </div>
              <button
                onClick={() => setShowPools(false)}
                className="text-muted hover:text-danger transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Close pools panel"
              >
                <X size={18} />
              </button>
            </header>
            <div className="flex gap-0 border-b border-pip-mid/40 bg-panel-alt shrink-0">
              {[
                { id: 'items',   label: 'ITEM POOL'    },
                { id: 'stash',   label: 'STASH'        },
                { id: 'decks',   label: 'DECKS'        },
                { id: 'explore', label: 'EXPLORE'      },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPoolsTab(t.id)}
                  className={`flex-1 px-3 py-2 text-xs tracking-widest font-bold border-b-2 transition-colors ${
                    poolsTab === t.id
                      ? 'border-pip text-pip bg-panel-light'
                      : 'border-transparent text-muted hover:text-pip'
                  }`}
                >{t.label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {poolsTab === 'items' && <ItemPoolPanel structures={structures} />}
              {poolsTab === 'stash' && <ManualPoolPanel />}
              {poolsTab === 'decks' && <SettlementDeckPanel />}
              {poolsTab === 'explore' && <ExplorePanel state={state} setState={setState} />}
            </div>
          </aside>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Per-unit row + expanded detail (renders as two <tr> siblings)
// ────────────────────────────────────────────────────────────────────────
function RosterRow({
  unit, isDown, dmg, rads, expanded,
  onToggleExpand, onPatch, onRest, onRemove,
  onShowAddItem, onShowFate, onMarkRemoved,
  onAddPerk, onRemovePerk, onRemoveItem,
  round,
}) {
  const u = unit
  const totalCaps = calcUnitTotalCaps(u)
  const itemCaps = calcUnitItemCaps(u)
  const itemsList = (u.equippedItems || []).map(id => getItemRef(id)).filter(Boolean)
  return (
    <>
      <tr className={`border-b border-pip-dim/20 hover:bg-panel-alt ${isDown ? 'opacity-50' : ''} ${expanded ? 'bg-panel-alt' : ''}`}>
        <td className="py-1 px-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1 text-left w-full hover:text-amber"
            title={expanded ? 'Collapse' : 'Expand detail'}
          >
            {expanded
              ? <ChevronDown size={11} className="text-muted shrink-0" />
              : <ChevronRight size={11} className="text-muted shrink-0" />}
            <span className="min-w-0">
              <div className="text-pip font-bold leading-tight truncate flex items-center gap-1">
                {u.unitName || '—'}
                {u.isLeader && <span className="text-amber text-[9px] px-1 border border-amber/60 rounded font-bold">LDR</span>}
                {u.heroic && <Star size={9} className="text-amber" />}
              </div>
              {u.faction && <div className="text-muted/60 text-[10px] leading-tight">{u.faction}</div>}
            </span>
          </button>
        </td>
        <td className="py-1 px-1">
          <Counter value={dmg} onChange={v => onPatch({ regDamage: v })} accent="danger" />
        </td>
        <td className="py-1 px-1">
          <Counter value={rads} onChange={v => onPatch({ radDamage: v })} accent="purple" />
        </td>
        <td className="py-1 px-1">
          <div className="flex items-center justify-center gap-0.5">
            <CondPill on={u.condPoisoned}   label="P"  onToggle={() => onPatch({ condPoisoned:   !u.condPoisoned   })} />
            <CondPill on={u.condInjuredArm} label="IA" onToggle={() => onPatch({ condInjuredArm: !u.condInjuredArm })} />
            <CondPill on={u.condInjuredLeg} label="IL" onToggle={() => onPatch({ condInjuredLeg: !u.condInjuredLeg })} />
          </div>
        </td>
        <td className="py-1 px-1">
          <div className="flex items-center justify-center gap-0.5">
            <button
              onClick={() => onPatch({ hasPowerArmor: !u.hasPowerArmor, paDegraded: u.hasPowerArmor ? false : u.paDegraded })}
              title="Power Armor"
              className={`p-0.5 rounded border ${u.hasPowerArmor ? 'border-pip text-pip' : 'border-muted/40 text-muted/40'}`}
            >
              {u.hasPowerArmor ? <Shield size={11} /> : <ShieldOff size={11} />}
            </button>
            {u.hasPowerArmor && (
              <button
                onClick={() => onPatch({ paDegraded: !u.paDegraded })}
                title="Degraded"
                className={`text-[10px] font-bold px-1 rounded border ${u.paDegraded ? 'border-danger text-danger' : 'border-muted/40 text-muted/40'}`}
              >D</button>
            )}
          </div>
        </td>
        <td className="py-1 px-1">
          <input
            value={u.addiction ?? ''}
            onChange={e => onPatch({ addiction: e.target.value })}
            placeholder="—"
            className="w-full text-[11px] py-0.5 px-1.5"
          />
        </td>
        <td className="py-1 px-1">
          <select
            value={u.fate ?? 'Active'}
            onChange={e => onPatch({ fate: e.target.value })}
            className="w-full text-[11px] py-0.5 px-1.5"
          >
            {STATUS_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </td>
        <td className="py-1 px-1 text-center">
          {u.fate === 'Dead' ? (
            <Skull size={14} className="text-danger inline" />
          ) : (
            <button
              onClick={onRest}
              title="Rest: halve damage, drop one condition"
              disabled={isDown}
              className="inline-flex items-center justify-center w-7 h-7 rounded border border-pip/40 text-pip hover:bg-pip-dim/20 disabled:opacity-30"
            >
              <Heart size={11} />
            </button>
          )}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-panel-alt border-b border-pip-mid/40">
          <td colSpan={8} className="p-0">
            <div className="px-4 py-3 space-y-3 border-t border-pip-mid/30">
              {/* STATS */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                <Stat label="BASE">{u.baseCaps}c</Stat>
                <Stat label="EQUIP">{itemCaps}c</Stat>
                <Stat label="TOTAL">{totalCaps}c</Stat>
                <StatInput label="BATTLES" value={u.battles ?? 0} onChange={v => onPatch({ battles: v })} />
                <StatInput label="REMOVED" value={u.removed ?? 0} onChange={v => onPatch({ removed: v })} />
                <StatInput label="LUC"     value={u.lucScore ?? 3} onChange={v => onPatch({ lucScore: v })} max={10} />
              </div>

              {/* Flags + fate roll */}
              <div className="flex gap-2 flex-wrap items-center">
                <label className="flex items-center gap-1 text-[11px] text-muted">
                  LEADER:
                  <select value={u.isLeader ? 'Yes' : 'No'} onChange={(e) => onPatch({ isLeader: e.target.value === 'Yes' })} className="text-[11px] py-0.5 px-1 w-16">
                    <option>No</option><option>Yes</option>
                  </select>
                </label>
                {(u.battles || 0) >= 2 && (
                  <button
                    onClick={() => onPatch({ heroic: !u.heroic })}
                    className={`flex items-center gap-1 text-[11px] px-2 py-1 border rounded font-bold ${u.heroic ? 'border-amber text-amber bg-amber-dim/20' : 'border-pip/50 text-pip hover:bg-pip-dim/20'}`}
                  >
                    <Star size={11} /> {u.heroic ? 'HEROIC ★' : 'HEROIC'}
                  </button>
                )}
                <button
                  onClick={onShowFate}
                  className="flex items-center gap-1 px-2 py-1 border border-amber text-amber rounded text-[11px] hover:bg-amber-dim/30 font-bold"
                >
                  <Dices size={11} /> ROLL FATE
                </button>
                <button
                  onClick={onMarkRemoved}
                  className="px-2 py-1 border border-muted/40 text-muted rounded text-[11px] hover:text-amber hover:border-amber/60 font-bold"
                >
                  MARK REMOVED → PENDING
                </button>
                {u.fate === 'Pending' && <span className="text-amber text-[11px]">Fate pending — roll at start of next round</span>}
              </div>

              {/* Captured detail */}
              {u.fate === 'Captured' && (
                <div className="grid grid-cols-2 gap-2 border border-amber/40 rounded p-2 bg-amber-dim/10">
                  <div>
                    <label className="text-[10px] text-amber tracking-widest">CAPTURED BY</label>
                    <input type="text" value={u.capturedBy || ''} onChange={(e) => onPatch({ capturedBy: e.target.value })} className="w-full text-[11px] py-1 px-2 mt-0.5" />
                  </div>
                  <div>
                    <label className="text-[10px] text-amber tracking-widest">CAPTURE ROUND</label>
                    <input type="number" min="0" value={u.captureRound ?? ''} onChange={(e) => onPatch({ captureRound: parseInt(e.target.value) || null })} className="w-full text-[11px] py-1 px-2 mt-0.5" />
                  </div>
                  {u.captureRound != null && (
                    <div className="col-span-2">
                      <span className={`text-[11px] font-bold ${round >= (u.captureRound + 2) ? 'text-danger' : 'text-amber'}`}>
                        Deadline: Round {u.captureRound + 2}{round >= (u.captureRound + 2) ? ' — OVERDUE' : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Equipment */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] text-amber tracking-widest font-bold">EQUIPMENT ({itemsList.length})</div>
                  <span className="text-[11px] text-amber font-bold">{itemCaps > 0 ? `${itemCaps}c equipped` : ''}</span>
                </div>
                {itemsList.map((item, idx) => {
                  const ec = EQUIP_TYPE_COLOR[item.subType] || { border: 'border-white/25', text: 'text-title' }
                  return (
                    <div key={idx} className={`flex items-center justify-between border ${ec.border} rounded px-2 py-1 bg-panel`}>
                      <span className={`text-xs font-bold flex-1 ${ec.text}`}>{item.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-muted text-[10px]">{item.subType}</span>
                        <span className="text-amber text-xs font-bold">{item.caps}c</span>
                        <button onClick={() => onRemoveItem(idx)} className="text-muted hover:text-danger transition-colors"><Trash2 size={11} /></button>
                      </div>
                    </div>
                  )
                })}
                <button
                  onClick={onShowAddItem}
                  className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-pip-mid/50 text-pip rounded text-[11px] hover:border-pip hover:bg-pip-dim/20 font-bold tracking-wider"
                >
                  <Plus size={11} /> ADD EQUIPMENT
                </button>
              </div>

              {/* Perks */}
              <PerkPanel
                unit={u}
                onAddPerk={onAddPerk}
                onRemovePerk={onRemovePerk}
              />

              {/* Conditions + notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted tracking-widest">OTHER CONDITIONS</label>
                  <input type="text" value={u.conditions || ''} onChange={(e) => onPatch({ conditions: e.target.value })} className="w-full text-[11px] py-1 px-2 mt-0.5" placeholder="e.g. Stun, Prone..." />
                </div>
                <div>
                  <label className="text-[10px] text-muted tracking-widest">NOTES</label>
                  <input type="text" value={u.notes || ''} onChange={(e) => onPatch({ notes: e.target.value })} className="w-full text-[11px] py-1 px-2 mt-0.5" placeholder="Any notes about this unit..." />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={onRemove}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-danger border border-muted/30 hover:border-danger/50 rounded px-3 py-1.5 transition-colors"
                >
                  <Trash2 size={11} /> REMOVE UNIT FROM ROSTER
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Per-unit Perk panel (with PerkPickerModal)
// ────────────────────────────────────────────────────────────────────────
function PerkPanel({ unit, onAddPerk, onRemovePerk }) {
  const [showPerkModal, setShowPerkModal] = useState(false)
  const [expandedPerk, setExpandedPerk] = useState(null)

  const perks = unit.perks || []
  const battles = unit.battles || 0
  const perksThisRound = unit.perksThisRound || 0

  const tooMany = perks.length > battles
  const roundLimitReached = perksThisRound >= 1
  const canAdd = !roundLimitReached && perks.length < battles

  function handleDrawRandom() {
    if (!canAdd) return
    const available = PERK_CARDS.filter(p => !perks.includes(p.name))
    if (available.length === 0) return
    const picked = available[Math.floor(Math.random() * available.length)]
    onAddPerk(picked.name)
  }

  let warning = null
  if (roundLimitReached) warning = 'Max 1 new perk per settlement round'
  else if (perks.length >= battles && battles > 0) warning = 'Cannot exceed battles fought'
  else if (battles === 0) warning = 'No battles fought yet — perks require at least 1 battle'

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-[11px] text-amber tracking-widest font-bold">
          PERKS ({perks.length} / {battles})
          <span className="ml-2 text-pip text-[11px]">THIS ROUND: {perksThisRound}/1</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDrawRandom}
            disabled={!canAdd}
            className="flex items-center gap-1 text-[11px] border border-info/60 text-info hover:bg-info-dim/20 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
            title="Draw a random perk card"
          >
            <Shuffle size={11} /> RANDOM
          </button>
          <button
            onClick={() => setShowPerkModal(true)}
            disabled={!canAdd}
            className="flex items-center gap-1 text-[11px] border border-pip text-pip hover:bg-pip-dim/20 rounded px-2 py-1 disabled:opacity-40 disabled:cursor-not-allowed font-bold"
          >
            <Plus size={11} /> SELECT PERK
          </button>
        </div>
      </div>

      {warning && <p className="text-amber text-[11px]">{warning}</p>}
      {tooMany && <p className="text-danger text-[11px] font-bold">⚠ Too many perks for battles fought</p>}

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
                    {isExpanded ? <ChevronDown size={11} className="text-muted shrink-0" /> : <ChevronRight size={11} className="text-muted shrink-0" />}
                    <span className="text-pip text-[11px] font-bold truncate">{perkName}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onRemovePerk(i) }}
                    className="text-muted hover:text-danger p-0.5 transition-colors shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
                {isExpanded && perkRef && (
                  <div className="px-3 pb-2 pt-1 border-t border-pip-dim/20">
                    <p className="text-muted text-[11px] leading-relaxed">{parseSymbols(perkRef.text)}</p>
                    {perkRef.requires && (
                      <p className="text-amber text-[11px] mt-1">Requires: {perkRef.requires}</p>
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
          onAddPerk(perkName)
          setShowPerkModal(false)
        }}
        equippedPerks={perks}
        canAdd={canAdd}
      />
    </div>
  )
}

// ────────────────────────────────────────────────────────────────────────
// Small presentational leaf components
// ────────────────────────────────────────────────────────────────────────
function Counter({ value, onChange, accent = 'pip' }) {
  const color = accent === 'danger' ? 'text-danger' : accent === 'purple' ? 'text-purple' : 'text-pip'
  return (
    <div className="flex items-center justify-center gap-0.5">
      <button onClick={() => onChange(Math.max(0, value - 1))}
        className="w-4 h-4 leading-none border border-muted/40 rounded text-muted text-[10px] hover:border-pip hover:text-pip">−</button>
      <span className={`w-5 text-center text-xs tabular-nums font-bold ${color}`}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        className="w-4 h-4 leading-none border border-muted/40 rounded text-muted text-[10px] hover:border-pip hover:text-pip">+</button>
    </div>
  )
}

function CondPill({ on, label, onToggle }) {
  return (
    <button
      onClick={onToggle}
      title={label === 'P' ? 'Poisoned' : label === 'IA' ? 'Injured Arm' : 'Injured Leg'}
      className={`text-[10px] font-bold w-5 h-5 rounded border ${
        on ? 'border-danger text-danger bg-danger/10' : 'border-muted/30 text-muted/40'
      }`}
    >{label}</button>
  )
}

function DerivedStat({ label, value, good }) {
  return (
    <div className={`border rounded bg-panel-alt px-2 py-1 text-center ${good ? 'border-pip-dim/40' : 'border-danger/50'}`}>
      <div className="text-label text-[9px] tracking-widest opacity-80">{label}</div>
      <div className={`text-sm font-bold tabular-nums ${good ? 'text-pip' : 'text-danger'}`}>{value}</div>
    </div>
  )
}

function Stat({ label, children }) {
  return (
    <div className="bg-panel rounded px-2 py-1.5 text-center">
      <div className="text-amber font-bold text-sm">{children}</div>
      <div className="text-[10px] text-muted tracking-widest">{label}</div>
    </div>
  )
}

function StatInput({ label, value, onChange, max }) {
  return (
    <div className="bg-panel rounded px-2 py-1.5 text-center">
      <input
        type="number" min="0" {...(max ? { max } : {})}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full text-xs py-0.5 px-1 text-center bg-transparent border-0 text-pip font-bold"
      />
      <div className="text-[10px] text-muted tracking-widest">{label}</div>
    </div>
  )
}
