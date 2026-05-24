import { useState } from 'react'
import { Plus, X, RotateCcw, Heart, Skull, Shield, ShieldOff } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import structuresCatalog from '../../data/structures.json'
import itemsCatalog from '../../data/items.json'
import boostsCatalog from '../../data/boosts.json'

// ── Static catalog lookups (built once) ─────────────────────────────────
const STRUCT_BY_ID = Object.fromEntries(structuresCatalog.map(s => [s.id, s]))
const STRUCT_CATEGORIES = ['Infrastructure', 'Item Structure', 'Boost Structure', 'Exploration', 'Other']

// Module-level so they're not "called during render" per react-hooks/purity.
const genId = () => Date.now() + Math.random()
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Map a raw structure category to a display bucket.
function structBucket(s) {
  const c = s?.category ?? ''
  if (c === 'Infrastructure') return 'Infrastructure'
  if (/Boost|Rack|Newsstand|HQ|Bugle|Grognak|Survival/i.test(s?.name ?? '')) return 'Boost Structure'
  if (/Stand|Shop|Emporium|Stall|Stores|Clinic|Surgery|First Aid|Bar|Restaurant|Drink/i.test(s?.name ?? '')) return 'Item Structure'
  if (c === 'Exploration' || /Listening Post|Brahmin Ranch|Operations Room|Leader.?s Office|Land/i.test(s?.name ?? '')) return 'Exploration'
  return 'Other'
}

// Item draw categories — maps a "draw this kind" tap to matching catalog items.
const ITEM_DRAWS = [
  { key: 'any',      label: 'Any Scavenge', match: () => true },
  { key: 'weapon',   label: 'Weapon',       match: i => /weapon|gun|rifle|pistol|shotgun|launcher|knife|blade/i.test(i.subType ?? '') },
  { key: 'armor',    label: 'Armor',        match: i => /armor/i.test(i.subType ?? '') },
  { key: 'clothing', label: 'Clothing',     match: i => /cloth|hat|uniform/i.test(i.subType ?? '') },
  { key: 'drink',    label: 'Drink',        match: i => /drink|food|alcohol|liquor/i.test(i.subType ?? '') },
  { key: 'med',      label: 'Med',          match: i => /med|stim|first aid|antidote/i.test(i.subType ?? '') },
  { key: 'gear',     label: 'Junk/Gear',    match: i => /junk|gear/i.test(i.subType ?? '') },
]

const BOOST_DRAWS = [
  { key: 'any',         label: 'Any Boost', match: () => true },
  { key: 'tactical',    label: 'Tactical',    match: b => b.boostType === 'tactical' },
  { key: 'instinctive', label: 'Instinctive', match: b => b.boostType === 'instinctive' },
  { key: 'cunning',     label: 'Cunning',     match: b => b.boostType === 'cunning' },
  { key: 'mech',        label: 'Mech',        match: b => b.boostType === 'mech' },
  { key: 'protection',  label: 'Protection',  match: b => b.boostType === 'protection' },
  { key: 'psyche',      label: 'Psyche',      match: b => b.boostType === 'psyche' || b.boostType === 'psychedelic' },
]

const FATES = ['Active', 'Delayed', 'Lost', 'Captured', 'Dead']

export default function HomesteadPage() {
  const { state, setState } = useCampaign()
  const [step, setStep] = useState('build') // 'build' | 'use' | 'select' — session only
  const [structPick, setStructPick] = useState('')

  if (!state) return <div className="p-8 text-center text-muted text-xs tracking-wider">LOADING…</div>

  const caps = state.caps ?? 0
  const roster = state.roster ?? []
  const structures = state.settlement?.structures ?? []
  const items = state.itemPool?.items ?? []
  const boostHand = state.boostHand ?? []

  // ── Derived settlement stats ──────────────────────────────────────────
  const power = structures.reduce((sum, s) => {
    const def = STRUCT_BY_ID[s.structureId]
    if (!def) return sum
    const gen = s.powered === false ? 0 : (def.pwrGen ?? 0)  // generators auto-on (no pwrReq)
    const req = s.powered ? (def.pwrReq ?? 0) : 0
    return sum + gen - req
  }, 0)
  const water = structures.reduce((sum, s) => {
    const def = STRUCT_BY_ID[s.structureId]
    if (!def) return sum
    const gen = s.powered === false ? 0 : (def.waterGen ?? 0)
    const req = s.powered ? (def.waterReq ?? 0) : 0
    return sum + gen - req
  }, 0)
  // Stores = item-structure instances that are powered (or have no power requirement).
  const storesCount = structures.filter(s => {
    const def = STRUCT_BY_ID[s.structureId]
    if (!def) return false
    if (structBucket(def) !== 'Item Structure') return false
    if ((def.pwrReq ?? 0) === 0) return true
    return s.powered === true
  }).length

  // Pool / hand views
  const pool = items.filter(i => i.location === 'recovery')

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

  function drawItem(filterFn) {
    const matches = itemsCatalog.filter(filterFn)
    if (matches.length === 0) return
    const pick = pickRandom(matches)
    const newItem = {
      id: genId(),
      catalogId: pick.id,
      name: pick.name,
      caps: pick.caps ?? 0,
      subType: pick.subType ?? 'Other',
      isBoost: false,
      boostId: null,
      boostType: null,
      location: 'recovery',
      assignedUnit: null,
    }
    setState(p => ({ ...p, itemPool: { ...(p.itemPool ?? {}), items: [...(p.itemPool?.items ?? []), newItem] } }))
  }

  function drawBoost(filterFn) {
    const matches = boostsCatalog.filter(filterFn)
    if (matches.length === 0) return
    const pick = pickRandom(matches)
    const newItem = {
      id: genId(),
      name: pick.name,
      caps: 0,
      subType: 'Boost',
      isBoost: true,
      boostId: pick.id,
      boostType: pick.boostType ?? null,
      location: 'recovery',
      assignedUnit: null,
    }
    setState(p => ({ ...p, itemPool: { ...(p.itemPool ?? {}), items: [...(p.itemPool?.items ?? []), newItem] } }))
  }

  function keepFromPool(itemId) {
    const item = pool.find(i => i.id === itemId)
    if (!item) return
    if (item.isBoost) {
      // Move to boostHand
      setState(p => {
        const remaining = (p.itemPool?.items ?? []).filter(i => i.id !== itemId)
        const handEntry = {
          id: genId(),
          boostId: item.boostId,
          name: item.name,
          boostType: item.boostType,
          usedThisRound: false,
        }
        return {
          ...p,
          itemPool: { ...(p.itemPool ?? {}), items: remaining },
          boostHand: [...(p.boostHand ?? []), handEntry],
        }
      })
    } else {
      // Move to settlement pool ('stored')
      setState(p => ({
        ...p,
        itemPool: {
          ...(p.itemPool ?? {}),
          items: (p.itemPool?.items ?? []).map(i => i.id === itemId ? { ...i, location: 'stored' } : i),
        },
      }))
    }
  }

  function sellFromPool(itemId) {
    const item = pool.find(i => i.id === itemId)
    if (!item) return
    setState(p => ({
      ...p,
      caps: (p.caps ?? 0) + (item.caps ?? 0),
      itemPool: { ...(p.itemPool ?? {}), items: (p.itemPool?.items ?? []).filter(i => i.id !== itemId) },
    }))
  }

  function removeFromHand(handId) {
    setState(p => ({ ...p, boostHand: (p.boostHand ?? []).filter(h => h.id !== handId) }))
  }

  // ── Roster mutators ──────────────────────────────────────────────────
  function patchUnit(uid, patch) {
    setState(p => ({ ...p, roster: (p.roster ?? []).map(u => u.id === uid ? { ...u, ...patch } : u) }))
  }

  function restUnit(uid) {
    setState(p => ({
      ...p,
      roster: (p.roster ?? []).map(u => {
        if (u.id !== uid) return u
        if (['Delayed', 'Lost', 'Captured', 'Dead'].includes(u.fate)) return u  // no rest
        // halve damage rounded up — discard half
        const dmg = u.damage ?? 0
        const newDmg = Math.floor(dmg / 2)  // discard half (rounded up = remove ceil(dmg/2), leaves floor(dmg/2))
        // remove one condition (priority: P → IA → IL)
        let condPoisoned = u.condPoisoned ?? false
        let condInjuredArm = u.condInjuredArm ?? false
        let condInjuredLeg = u.condInjuredLeg ?? false
        if (condPoisoned) condPoisoned = false
        else if (condInjuredArm) condInjuredArm = false
        else if (condInjuredLeg) condInjuredLeg = false
        return { ...u, damage: newDmg, condPoisoned, condInjuredArm, condInjuredLeg }
      }),
    }))
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      {/* Header strip */}
      <div className="bg-panel-light border border-amber/40 rounded-lg px-4 py-3 flex items-center gap-4 flex-wrap"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}>
        <div className="flex items-center gap-2">
          <span className="text-title text-lg font-bold tracking-widest">HOMESTEAD</span>
          <span className="text-amber/80 text-xs tracking-wider">— LEAN TRACKER</span>
        </div>
        <span className="text-muted/60 text-[10px] tracking-wider">Round {state.round ?? 0}</span>
        <div className="ml-auto flex items-center gap-1.5">
          {['build', 'use', 'select'].map(s => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`text-[10px] tracking-widest px-3 py-1.5 border rounded transition-colors ${
                step === s
                  ? 'border-amber text-amber bg-amber-dim/10'
                  : 'border-pip-dim/50 text-pip/70 hover:border-pip hover:text-pip'
              }`}
            >
              {s === 'build' ? '1 · BUILD' : s === 'use' ? '2 · USE' : '3 · SELECT'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-4">
        {/* ───── LEFT: ROSTER ───── */}
        <section className="border border-pip-mid/40 rounded-lg bg-panel">
          <div className="px-3 py-2 border-b border-pip-mid/30 flex items-center gap-2">
            <h3 className="text-amber text-xs tracking-widest font-bold flex-1">ROSTER ({roster.length})</h3>
            <span className="text-muted/60 text-[10px] tracking-wider">Edit inline · Rest applies recovery</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-pip-dim/30 bg-panel-alt">
                  <th className="text-left text-info py-1.5 px-2 font-normal tracking-wider w-[16%]">UNIT</th>
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
                  <tr><td colSpan={8} className="text-center text-muted/60 py-6 text-xs">No units in roster. Add them from the legacy ROSTER tab while testing.</td></tr>
                )}
                {roster.map(u => {
                  const isDown = ['Delayed', 'Lost', 'Captured', 'Dead'].includes(u.fate)
                  const dmg = u.damage ?? 0
                  const rads = u.rads ?? 0
                  return (
                    <tr key={u.id} className={`border-b border-pip-dim/20 hover:bg-panel-alt ${isDown ? 'opacity-50' : ''}`}>
                      <td className="py-1 px-2">
                        <div className="text-pip font-bold leading-tight">{u.name || '—'}</div>
                        {u.faction && <div className="text-muted/60 text-[10px] leading-tight">{u.faction}</div>}
                      </td>
                      <td className="py-1 px-1">
                        <Counter value={dmg} onChange={v => patchUnit(u.id, { damage: v })} accent="danger" />
                      </td>
                      <td className="py-1 px-1">
                        <Counter value={rads} onChange={v => patchUnit(u.id, { rads: v })} accent="purple" />
                      </td>
                      <td className="py-1 px-1">
                        <div className="flex items-center justify-center gap-0.5">
                          <CondPill on={u.condPoisoned}    label="P"  onToggle={() => patchUnit(u.id, { condPoisoned:    !u.condPoisoned    })} />
                          <CondPill on={u.condInjuredArm}  label="IA" onToggle={() => patchUnit(u.id, { condInjuredArm:  !u.condInjuredArm  })} />
                          <CondPill on={u.condInjuredLeg}  label="IL" onToggle={() => patchUnit(u.id, { condInjuredLeg:  !u.condInjuredLeg  })} />
                        </div>
                      </td>
                      <td className="py-1 px-1">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => patchUnit(u.id, { hasPowerArmor: !u.hasPowerArmor, paDegraded: u.hasPowerArmor ? false : u.paDegraded })}
                            title="Power Armor"
                            className={`p-0.5 rounded border ${u.hasPowerArmor ? 'border-pip text-pip' : 'border-muted/40 text-muted/40'}`}
                          >
                            {u.hasPowerArmor ? <Shield size={11} /> : <ShieldOff size={11} />}
                          </button>
                          {u.hasPowerArmor && (
                            <button
                              onClick={() => patchUnit(u.id, { paDegraded: !u.paDegraded })}
                              title="Degraded"
                              className={`text-[10px] font-bold px-1 rounded border ${u.paDegraded ? 'border-danger text-danger' : 'border-muted/40 text-muted/40'}`}
                            >D</button>
                          )}
                        </div>
                      </td>
                      <td className="py-1 px-1">
                        <input
                          value={u.addiction ?? ''}
                          onChange={e => patchUnit(u.id, { addiction: e.target.value })}
                          placeholder="—"
                          className="w-full text-[11px] py-0.5 px-1.5"
                        />
                      </td>
                      <td className="py-1 px-1">
                        <select
                          value={u.fate ?? 'Active'}
                          onChange={e => patchUnit(u.id, { fate: e.target.value })}
                          className="w-full text-[11px] py-0.5 px-1.5"
                        >
                          {FATES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                      </td>
                      <td className="py-1 px-1 text-center">
                        {u.fate === 'Dead' ? (
                          <Skull size={14} className="text-danger inline" />
                        ) : (
                          <button
                            onClick={() => restUnit(u.id)}
                            title="Rest: halve damage, drop one condition"
                            disabled={isDown}
                            className="inline-flex items-center justify-center w-7 h-7 rounded border border-pip/40 text-pip hover:bg-pip-dim/20 disabled:opacity-30"
                          >
                            <Heart size={11} />
                          </button>
                        )}
                      </td>
                    </tr>
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
          </div>

          {/* Structures */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel">
            <div className="px-3 py-2 border-b border-pip-mid/30">
              <h3 className="text-amber text-xs tracking-widest font-bold">STRUCTURES ({structures.length})</h3>
            </div>
            <div className="p-2 space-y-2">
              {/* Add */}
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

              {/* List */}
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
                              onClick={() => patchStructure(s.instanceId, { usedThisRound: !s.usedThisRound })}
                              disabled={!canUse && !s.usedThisRound}
                              title="Used this phase"
                              className={`text-[9px] tracking-widest px-1.5 py-0.5 border rounded ${s.usedThisRound ? 'border-amber text-amber' : 'border-muted/40 text-muted'} disabled:opacity-30`}
                            >{s.usedThisRound ? 'USED' : 'IDLE'}</button>
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

              {/* Reset used-flags */}
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

          {/* Draw buttons — Use step */}
          {step === 'use' && (
            <div className="border border-pip-mid/40 rounded-lg bg-panel">
              <div className="px-3 py-2 border-b border-pip-mid/30">
                <h3 className="text-amber text-xs tracking-widest font-bold">DRAW INTO POOL</h3>
                <p className="text-muted/60 text-[10px] tracking-wider mt-0.5">Tap a category — pulls a random card into the pool</p>
              </div>
              <div className="p-2 space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {ITEM_DRAWS.map(d => (
                    <button key={d.key} onClick={() => drawItem(d.match)}
                      className="text-[10px] tracking-widest px-2 py-1 border border-pip-dim/50 text-pip/80 hover:border-pip hover:text-pip rounded">
                      + {d.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 pt-1 border-t border-pip-mid/20">
                  {BOOST_DRAWS.map(d => (
                    <button key={d.key} onClick={() => drawBoost(d.match)}
                      className="text-[10px] tracking-widest px-2 py-1 border border-purple/50 text-purple hover:border-purple rounded">
                      + {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Card pool */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel">
            <div className="px-3 py-2 border-b border-pip-mid/30 flex items-center gap-2">
              <h3 className="text-amber text-xs tracking-widest font-bold flex-1">CARD POOL ({pool.length})</h3>
              <span className="text-muted/60 text-[10px] tracking-wider">Stores: {storesCount} = keep {storesCount} items / {storesCount * 2} boosts</span>
            </div>
            <div className="p-2 space-y-1">
              {pool.length === 0 && (
                <p className="text-muted/60 text-[11px] text-center py-2">Pool is empty.</p>
              )}
              {pool.map(i => (
                <div key={i.id} className="flex items-center gap-1.5 border border-pip-dim/30 rounded px-2 py-1 bg-panel-alt">
                  <span className={`text-[11px] flex-1 truncate ${i.isBoost ? 'text-purple' : 'text-pip'}`}>
                    {i.name}
                  </span>
                  <span className="text-[10px] text-muted">{i.isBoost ? i.boostType ?? 'boost' : i.subType}</span>
                  {!i.isBoost && <span className="text-[10px] text-amber tabular-nums">{i.caps}c</span>}
                  <button onClick={() => keepFromPool(i.id)}
                    className="text-[10px] tracking-widest px-2 py-0.5 border border-pip text-pip rounded hover:bg-pip-dim/20">KEEP</button>
                  <button onClick={() => sellFromPool(i.id)}
                    className="text-[10px] tracking-widest px-2 py-0.5 border border-muted/40 text-muted rounded hover:border-amber hover:text-amber">SELL</button>
                </div>
              ))}
            </div>
          </div>

          {/* Boost hand */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel">
            <div className="px-3 py-2 border-b border-pip-mid/30">
              <h3 className="text-amber text-xs tracking-widest font-bold">BOOST HAND ({boostHand.length})</h3>
            </div>
            <div className="p-2 flex flex-wrap gap-1">
              {boostHand.length === 0 && <p className="text-muted/60 text-[11px]">No boosts held.</p>}
              {boostHand.map(b => (
                <span key={b.id} className="inline-flex items-center gap-1 border border-purple/50 text-purple text-[10px] tracking-wider px-2 py-0.5 rounded bg-purple-dim/20">
                  {b.name}
                  <button onClick={() => removeFromHand(b.id)} className="opacity-60 hover:opacity-100">
                    <X size={9} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Rewards quick entry */}
          <div className="border border-pip-mid/40 rounded-lg bg-panel p-3">
            <h3 className="text-amber text-xs tracking-widest font-bold mb-2">POST-BATTLE</h3>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => addCaps(200)} className="text-[10px] tracking-widest px-2 py-1.5 border border-pip text-pip rounded hover:bg-pip-dim/20">WIN +200c</button>
              <button onClick={() => addCaps(120)} className="text-[10px] tracking-widest px-2 py-1.5 border border-muted/40 text-muted rounded hover:border-pip hover:text-pip">LOSS +120c</button>
              <button onClick={() => addCaps(50)}  className="text-[10px] tracking-widest px-2 py-1.5 border border-amber/50 text-amber rounded hover:bg-amber-dim/20 col-span-2">1000+ FORCE +50c</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────
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

