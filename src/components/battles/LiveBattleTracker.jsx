import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Skull } from 'lucide-react'
import { normalizeActiveBattle, shuffleArray, buildInitialParticipants } from '../../utils/activeBattle'
import { getItemRef } from '../../utils/calculations'
import { getCardBodyText } from '../../utils/battleDeckCardUtils'
import { lookupItemMeta } from '../../utils/settlementItemDeckUtils'
import battleCreatures from '../../data/battle/battleCreatures.json'
import battleStrangers from '../../data/battle/battleStrangers.json'
import battleDangers from '../../data/battle/battleDangers.json'
import battleExplores from '../../data/battle/battleExplores.json'
import battleEvents from '../../data/battle/battleEvents.json'
import battleScenarios from '../../data/battle/battleScenarios.json'
import itemsCatalog from '../../data/items.json'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import { SECRET_PURPOSES } from '../../data/secretPurposes'

const DECKS = [
  { key: 'creature', label: 'CREATURE', cards: battleCreatures },
  { key: 'stranger', label: 'STRANGER', cards: battleStrangers },
  { key: 'danger', label: 'DANGER', cards: battleDangers },
  { key: 'explore', label: 'EXPLORE', cards: battleExplores },
  { key: 'event', label: 'EVENT', cards: battleEvents },
]

function resolveDrawPile(drawPile, discardPile) {
  let dp = [...drawPile]
  let di = [...discardPile]
  if (dp.length === 0 && di.length > 0) {
    dp = shuffleArray(di)
    di = []
  }
  return { dp, di }
}

function cardNameForDeck(deckKey, lastDrawn, cards) {
  if (lastDrawn == null || typeof lastDrawn !== 'number') return '—'
  const c = cards[lastDrawn]
  return c?.name ?? `#${lastDrawn}`
}

function deepClone(obj) {
  if (typeof structuredClone === 'function') return structuredClone(obj)
  return JSON.parse(JSON.stringify(obj))
}

export default function LiveBattleTracker({
  activeBattle: activeBattleProp,
  currentUserId,
  saveActiveBattle,
  roster,
}) {
  const ab = normalizeActiveBattle(activeBattleProp)
  const seedRef = useRef(false)
  const setup = ab.setup || {}
  const scenario = battleScenarios.find(s => s.id === setup.scenario?.scenarioId)
  const [mobileYour, setMobileYour] = useState(false)
  const [mobileOpp, setMobileOpp] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [lootModal, setLootModal] = useState(null)
  const [lootSearch, setLootSearch] = useState('')
  const [lootPickId, setLootPickId] = useState(null)
  const [endOpen, setEndOpen] = useState(false)
  const [outcome, setOutcome] = useState('major_victory')
  const [pendingWasteland, setPendingWasteland] = useState(null)
  const [assignTarget, setAssignTarget] = useState('tray')

  const opponentIds = setup.opponentUserIds || []

  const patch = useCallback((next) => {
    const base = normalizeActiveBattle(activeBattleProp)
    const n = normalizeActiveBattle(typeof next === 'function' ? next(base) : next)
    saveActiveBattle({ ...n, lastUpdatedBy: currentUserId })
  }, [activeBattleProp, saveActiveBattle, currentUserId])

  useEffect(() => {
    const cur = normalizeActiveBattle(activeBattleProp)
    if (cur.status !== 'active') {
      seedRef.current = false
      return
    }
    if (cur.participants && Object.keys(cur.participants).length > 0) return
    if (seedRef.current) return
    seedRef.current = true
    saveActiveBattle({
      ...cur,
      participants: buildInitialParticipants(cur),
      lastUpdatedBy: currentUserId,
    })
  }, [activeBattleProp, saveActiveBattle, currentUserId])

  const rosterBySlot = useMemo(() => {
    const m = new Map()
    for (const u of roster || []) m.set(u.slotId, u)
    return m
  }, [roster])

  function appendLog(base, event) {
    const turn = base.turn || 1
    const entry = {
      turn,
      timestamp: new Date().toISOString(),
      userId: currentUserId,
      event,
    }
    return { ...base, log: [...(base.log || []), entry] }
  }

  function unitLabel(uid, entry, slotId) {
    if (entry?.unitName) return entry.unitName
    if (uid === currentUserId) {
      const u = rosterBySlot.get(slotId)
      return u?.unitName ?? `Unit #${slotId}`
    }
    return entry?.unitName ?? `Unit #${slotId}`
  }

  function drawFromDeck(deckKey) {
    const de = setup.decksEnabled || {}
    if (deckKey !== 'wastelandItems' && de[deckKey] === false) return

    const ds = ab.deckStates?.[deckKey]
    if (!ds) return
    const { dp, di } = resolveDrawPile(ds.drawPile || [], ds.discardPile || [])
    if (dp.length === 0) return
    const drawn = dp[0]
    const newDraw = dp.slice(1)
    const newDiscard = [...di, drawn]
    const deckMeta = DECKS.find(d => d.key === deckKey)
    let label = 'card'
    if (deckKey === 'wastelandItems') {
      const meta = lookupItemMeta(drawn)
      label = meta.name
      setPendingWasteland({ itemId: drawn, name: meta.name, subType: meta.subType })
      setAssignTarget('tray')
    } else if (deckMeta) {
      label = deckMeta.cards[drawn]?.name ?? `#${drawn}`
    }

    let next = {
      ...ab,
      deckStates: {
        ...ab.deckStates,
        [deckKey]: {
          ...ds,
          drawPile: newDraw,
          discardPile: newDiscard,
          lastDrawn: drawn,
        },
      },
    }
    next = appendLog(next, `Drew ${label} from ${deckKey === 'wastelandItems' ? 'Wasteland Items' : deckMeta?.label || deckKey} deck`)
    next.lastUpdatedBy = currentUserId
    patch(next)
  }

  function assignPendingWasteland() {
    if (!pendingWasteland) return
    const itemId = pendingWasteland.itemId
    const p = ab.participants?.[currentUserId] || { units: {}, itemTray: [] }
    let nextP = { ...p, units: { ...p.units } }
    if (assignTarget === 'tray') {
      nextP.itemTray = [...(p.itemTray || []), { itemId, name: pendingWasteland.name }]
    } else {
      const slotId = Number(assignTarget)
      const u = nextP.units[slotId] || { slotId, lootedItems: [] }
      nextP.units[slotId] = {
        ...u,
        lootedItems: [...(u.lootedItems || []), { itemId, name: pendingWasteland.name }],
      }
    }
    const next = appendLog(
      {
        ...ab,
        participants: { ...ab.participants, [currentUserId]: nextP },
      },
      assignTarget === 'tray'
        ? `Added ${pendingWasteland.name} to item tray`
        : `Assigned ${pendingWasteland.name} to unit`,
    )
    setPendingWasteland(null)
    patch(next)
  }

  function wound(uid, slotId, kind) {
    if (uid !== currentUserId) return
    const part = ab.participants?.[uid]
    if (!part?.units?.[slotId]) return
    const u = { ...part.units[slotId] }
    if (kind === 'wound') u.regDamage = (u.regDamage || 0) + 1
    if (kind === 'rad') u.radDamage = (u.radDamage || 0) + 1
    const units = { ...part.units, [slotId]: u }
    const uname = unitLabel(uid, ab.battleRosters?.[uid]?.entries?.find(e => e.slotId === slotId), slotId)
    let next = {
      ...ab,
      participants: { ...ab.participants, [uid]: { ...part, units } },
    }
    next = appendLog(next, `${uname} took 1 ${kind === 'wound' ? 'wound' : 'rad'}`)
    patch(next)
  }

  function toggleCondition(uid, slotId, key) {
    if (uid !== currentUserId) return
    const part = ab.participants?.[uid]
    if (!part?.units?.[slotId]) return
    const u = { ...part.units[slotId], conditions: { ...part.units[slotId].conditions } }
    u.conditions[key] = !u.conditions[key]
    const units = { ...part.units, [slotId]: u }
    patch({
      ...ab,
      participants: { ...ab.participants, [uid]: { ...part, units } },
    })
  }

  function removeUnit(uid, slotId) {
    if (uid !== currentUserId) return
    const part = ab.participants?.[uid]
    if (!part?.units?.[slotId]) return
    const u = { ...part.units[slotId], removed: true }
    const units = { ...part.units, [slotId]: u }
    const uname = unitLabel(uid, ab.battleRosters?.[uid]?.entries?.find(e => e.slotId === slotId), slotId)
    let next = {
      ...ab,
      participants: { ...ab.participants, [uid]: { ...part, units } },
    }
    next = appendLog(next, `${uname} removed from battle`)
    patch(next)
    setLootModal({ slotId, unitName: uname })
    setLootSearch('')
    setLootPickId(null)
  }

  function addLootToTray(itemId) {
    const ref = getItemRef(itemId)
    if (!ref || !lootModal) return
    const p = ab.participants?.[currentUserId] || { units: {}, itemTray: [] }
    const nextP = {
      ...p,
      itemTray: [...(p.itemTray || []), { itemId, name: ref.name }],
    }
    let next = {
      ...ab,
      participants: { ...ab.participants, [currentUserId]: nextP },
    }
    next = appendLog(next, `Looted ${ref.name} (${lootModal.unitName})`)
    patch(next)
    setLootModal(null)
  }

  function nextTurn() {
    const t = ab.turn || 1
    const snap = { turn: t, participants: deepClone(ab.participants || {}) }
    const history = [...(ab.turnHistory || []).filter(h => h.turn !== t), snap].sort((a, b) => a.turn - b.turn)
    let next = { ...ab, turn: t + 1, turnHistory: history }
    next = appendLog(next, `Advanced to turn ${t + 1}`)
    patch(next)
  }

  function prevTurn() {
    const t = ab.turn || 1
    if (t <= 1) return
    const prevT = t - 1
    const snap = (ab.turnHistory || []).find(h => h.turn === prevT)
    if (!snap) return
    let next = {
      ...ab,
      turn: prevT,
      participants: deepClone(snap.participants),
    }
    next = appendLog(next, `Returned to turn ${prevT}`)
    patch(next)
  }

  function toggleObjectiveComplete() {
    const p = ab.participants?.[currentUserId] || {}
    patch({
      ...ab,
      participants: {
        ...ab.participants,
        [currentUserId]: { ...p, objectiveComplete: !p.objectiveComplete },
      },
    })
  }

  function confirmEndBattle() {
    const prevOutcome = (ab.outcome && typeof ab.outcome === 'object') ? ab.outcome : {}
    patch({
      ...ab,
      status: 'ended',
      endedAt: new Date().toISOString(),
      outcome: { ...prevOutcome, [currentUserId]: outcome },
      log: [
        ...(ab.log || []),
        {
          turn: ab.turn || 1,
          timestamp: new Date().toISOString(),
          userId: currentUserId,
          event: `Battle ended (${outcome})`,
        },
      ],
    })
    setEndOpen(false)
  }

  const battleObjective = SCAVENGER_OBJECTIVES.find(o => o.id === setup.battleObjectiveId)
  const secretPurp = SECRET_PURPOSES.find(o => o.id === setup.secretPurposeId)

  const myEntries = ab.battleRosters?.[currentUserId]?.entries || []
  const myPart = ab.participants?.[currentUserId] || { units: {}, itemTray: [] }

  const wastelandDs = ab.deckStates?.wastelandItems || { drawPile: [], discardPile: [], lastDrawn: null }

  const filteredItems = useMemo(() => {
    const q = lootSearch.trim().toLowerCase()
    if (!q) return itemsCatalog.slice(0, 200)
    return itemsCatalog.filter(i => i.name?.toLowerCase().includes(q)).slice(0, 200)
  }, [lootSearch])

  function renderUnitCard(uid, entry, readOnly) {
    const slotId = entry.slotId
    const ustate = ab.participants?.[uid]?.units?.[slotId] || {}
    const reg = ustate.regDamage || 0
    const rad = ustate.radDamage || 0
    const maxBar = 10
    const name = unitLabel(uid, entry, slotId)
    const cond = ustate.conditions || {}

    return (
      <div
        key={`${uid}-${slotId}`}
        className={`border rounded-lg p-2 space-y-2 text-xs ${
          uid === currentUserId ? 'border-pip/50 bg-pip/5' : 'border-info/40 bg-info/5'
        }`}
      >
        <div className="flex justify-between gap-2 flex-wrap">
          <span className="font-bold text-pip">{name}</span>
          <span className="text-muted">{ustate.removed ? 'Removed' : 'Active'}</span>
        </div>
        <div className="space-y-1">
          <div className="flex gap-2 items-center">
            <span className="text-muted w-10">HP</span>
            <div className="flex-1 h-2 bg-terminal rounded overflow-hidden border border-pip-dim/30">
              <div
                className="h-full bg-pip"
                style={{ width: `${Math.min(100, (reg / maxBar) * 100)}%` }}
              />
            </div>
            <span className="text-pip w-8">{reg}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-muted w-10">Rad</span>
            <div className="flex-1 h-2 bg-terminal rounded overflow-hidden border border-amber/30">
              <div
                className="h-full bg-amber"
                style={{ width: `${Math.min(100, (rad / maxBar) * 100)}%` }}
              />
            </div>
            <span className="text-amber w-8">{rad}</span>
          </div>
        </div>
        <p className="text-muted">
          Looted: {(ustate.lootedItems || []).length ? (ustate.lootedItems || []).map(l => l.name).join(', ') : '—'}
        </p>
        {!readOnly && !ustate.removed && (
          <div className="flex flex-wrap gap-1">
            <button type="button" className="min-h-[44px] px-2 py-1 border border-danger/50 text-danger rounded text-xs" onClick={() => wound(uid, slotId, 'wound')}>
              WOUND
            </button>
            <button type="button" className="min-h-[44px] px-2 py-1 border border-amber/50 text-amber rounded text-xs" onClick={() => wound(uid, slotId, 'rad')}>
              RAD
            </button>
            <select
              className="min-h-[44px] text-xs bg-panel border border-pip-dim/40 rounded px-1"
              value=""
              onChange={e => {
                const v = e.target.value
                if (v) toggleCondition(uid, slotId, v)
                e.target.value = ''
              }}
            >
              <option value="">CONDITION…</option>
              <option value="poisoned">Poisoned</option>
              <option value="injuredArm">Injured Arm</option>
              <option value="injuredLeg">Injured Leg</option>
            </select>
            <button type="button" className="min-h-[44px] px-2 py-1 border border-muted text-muted rounded text-xs" onClick={() => removeUnit(uid, slotId)}>
              REMOVE
            </button>
          </div>
        )}
        {(cond.poisoned || cond.injuredArm || cond.injuredLeg) && (
          <p className="text-xs text-amber">
            {[cond.poisoned && 'Poisoned', cond.injuredArm && 'Injured Arm', cond.injuredLeg && 'Injured Leg'].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
    )
  }

  const header = (
    <header className="sticky top-0 z-10 border-b border-pip-dim/40 bg-[var(--color-terminal)]/95 backdrop-blur px-3 py-3 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="text-xs text-muted tracking-widest">LIVE BATTLE</p>
        <p className="text-pip font-bold text-sm">{scenario?.name ?? 'Scenario'}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-amber font-mono font-bold text-lg">Turn {ab.turn || 1}</span>
        <button type="button" className="min-h-[44px] px-3 border border-pip-dim/50 rounded flex items-center gap-1 text-xs" onClick={prevTurn} disabled={(ab.turn || 1) <= 1}>
          <ChevronLeft size={16} /> PREV
        </button>
        <button type="button" className="min-h-[44px] px-3 border border-pip-dim/50 rounded flex items-center gap-1 text-xs" onClick={nextTurn}>
          NEXT <ChevronRight size={16} />
        </button>
      </div>
    </header>
  )

  const decksBlock = (
    <section className="border border-pip-dim/30 rounded-lg p-3 space-y-3 bg-panel/40">
      <h3 className="text-amber text-xs font-bold tracking-widest">DECKS</h3>
      <div className="space-y-2">
        {DECKS.map(({ key, label, cards }) => {
          const ds = ab.deckStates?.[key] || { drawPile: [], discardPile: [], lastDrawn: null }
          const disabled = setup.decksEnabled?.[key] === false
          const remaining = (ds.drawPile || []).length
          const disc = (ds.discardPile || []).length
          const last = cardNameForDeck(key, ds.lastDrawn, cards)
          return (
            <div key={key} className="border border-pip-dim/25 rounded p-2 text-xs space-y-1">
              <div className="flex flex-wrap justify-between gap-1">
                <span className="text-pip font-bold">{label}</span>
                <span className="text-muted">{remaining} left · {disc} discard</span>
              </div>
              <p className="text-muted">Last: {last}</p>
              {key === 'event' && ds.lastDrawn != null && typeof ds.lastDrawn === 'number' && cards[ds.lastDrawn] && (
                <p className="text-pip/90 whitespace-pre-wrap border border-amber/30 rounded p-2 bg-panel">
                  {getCardBodyText(cards[ds.lastDrawn])}
                </p>
              )}
              <button
                type="button"
                disabled={disabled || remaining === 0}
                className="min-h-[44px] w-full text-xs font-bold border border-amber/60 text-amber rounded py-2 disabled:opacity-40"
                onClick={() => drawFromDeck(key)}
              >
                DRAW: {label}
              </button>
            </div>
          )
        })}
      </div>
      <div className="border border-pip/30 rounded p-2 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-pip font-bold">WASTELAND ITEMS</span>
          <span className="text-muted">{(wastelandDs.drawPile || []).length} left · {(wastelandDs.discardPile || []).length} discard</span>
        </div>
        <p className="text-muted text-xs">
          Last: {wastelandDs.lastDrawn != null ? lookupItemMeta(wastelandDs.lastDrawn).name : '—'}
        </p>
        <button
          type="button"
          disabled={(wastelandDs.drawPile || []).length === 0}
          className="min-h-[44px] w-full text-xs font-bold border border-pip/50 text-pip rounded py-2 disabled:opacity-40"
          onClick={() => drawFromDeck('wastelandItems')}
        >
          DRAW: Wasteland Items
        </button>
        {pendingWasteland && (
          <div className="border border-amber/40 rounded p-2 space-y-2">
            <p className="text-pip font-bold">{pendingWasteland.name}</p>
            <select
              className="w-full text-xs bg-panel border rounded min-h-[44px]"
              value={assignTarget}
              onChange={e => setAssignTarget(e.target.value)}
            >
              <option value="tray">Add to item tray</option>
              {myEntries.map(e => (
                <option key={e.slotId} value={String(e.slotId)}>
                  Assign to {unitLabel(currentUserId, e, e.slotId)}
                </option>
              ))}
            </select>
            <button type="button" className="w-full min-h-[44px] bg-amber/20 border border-amber text-amber rounded text-xs font-bold" onClick={assignPendingWasteland}>
              CONFIRM
            </button>
          </div>
        )}
      </div>
    </section>
  )

  const battleLogPanel = (
    <div className="border border-pip-dim/30 rounded-lg overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted bg-panel/60"
        onClick={() => setLogOpen(o => !o)}
      >
        BATTLE LOG
        {logOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {logOpen && (
        <div className="max-h-40 overflow-y-auto px-3 py-2 text-xs font-mono text-pip/90 space-y-1 border-t border-pip-dim/30">
          {(ab.log || []).slice(-80).map((line, i) => (
            <p key={i}>
              <span className="text-muted">T{line.turn}</span> {line.event}
            </p>
          ))}
        </div>
      )}
    </div>
  )

  const yourColumn = (
    <div className="space-y-3 md:border-r md:border-pip-dim/30 md:pr-3 order-1 md:order-none">
      <button
        type="button"
        className="md:hidden w-full flex items-center justify-between py-2 text-xs font-bold text-pip border-b border-pip-dim/30"
        onClick={() => setMobileYour(o => !o)}
      >
        YOUR ROSTER
        {mobileYour ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <div className={`space-y-2 ${mobileYour ? 'block' : 'hidden'} md:block`}>
        <h3 className="hidden md:block text-pip text-xs font-bold tracking-widest border-b border-pip/30 pb-1">YOUR ROSTER</h3>
        {myEntries.map(e => renderUnitCard(currentUserId, e, false))}
        <div className="text-xs border border-pip/20 rounded p-2 space-y-1">
          <p className="text-muted">Item tray</p>
          {(myPart.itemTray || []).length === 0 ? (
            <p className="text-muted">—</p>
          ) : (
            <ul className="text-pip space-y-0.5">
              {(myPart.itemTray || []).map((it, i) => (
                <li key={i}>{it.name}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="text-xs space-y-1 border border-pip-dim/30 rounded p-2">
          <p className="text-amber font-bold">Objectives</p>
          {battleObjective && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!!myPart.objectiveComplete} onChange={toggleObjectiveComplete} />
              <span>{battleObjective.name}</span>
            </label>
          )}
          {secretPurp && (
            <p className="text-pip mt-1">
              <span className="text-muted">Secret quest: </span>
              {secretPurp.name}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const oppColumn = (
    <div className="space-y-3 md:border-l md:border-pip-dim/30 md:pl-3 order-3 md:order-none">
      <button
        type="button"
        className="md:hidden w-full flex items-center justify-between py-2 text-xs font-bold text-info border-b border-info/30"
        onClick={() => setMobileOpp(o => !o)}
      >
        OPPONENT(S)
        {mobileOpp ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      <div className={`space-y-3 ${mobileOpp ? 'block' : 'hidden'} md:block`}>
        <h3 className="hidden md:block text-info text-xs font-bold tracking-widest border-b border-info/30 pb-1">OPPONENT ROSTER</h3>
        {opponentIds.length === 0 && <p className="text-muted text-xs">No opponents listed.</p>}
        {opponentIds.map(oid => {
          const entries = ab.battleRosters?.[oid]?.entries || []
          return (
            <div key={oid} className="space-y-2">
              <p className="text-xs text-muted">Player {oid.slice(0, 8)}…</p>
              {entries.map(e => renderUnitCard(oid, e, true))}
            </div>
          )
        })}
        <p className="text-xs text-muted pt-1 border-t border-info/20">
          Opponents&apos; secret quests: [SECRET] · Public objectives use shared match setup when present.
        </p>
      </div>
    </div>
  )

  const centerColumn = (
    <div className="space-y-3 min-w-0 order-2 md:order-none">
      {decksBlock}
      {battleLogPanel}
      <button
        type="button"
        className="w-full min-h-[48px] rounded-lg border-2 border-danger bg-danger/20 text-danger font-bold tracking-widest text-sm shadow-[0_0_20px_rgba(239,68,68,0.35)] flex items-center justify-center gap-2"
        onClick={() => setEndOpen(true)}
      >
        <Skull size={18} /> END BATTLE
      </button>
    </div>
  )

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg)] text-pip"
      style={{ fontFamily: 'var(--font-family-mono)' }}
    >
      {header}
      <div className="flex-1 overflow-y-auto p-3 md:p-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-4 md:gap-3">
          {yourColumn}
          {centerColumn}
          {oppColumn}
        </div>
      </div>

      {lootModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog">
          <div className="bg-panel border border-pip/40 rounded-lg max-w-lg w-full max-h-[85vh] flex flex-col p-4 space-y-3">
            <p className="text-pip font-bold text-sm">Loot corpse — {lootModal.unitName}</p>
            <input
              type="search"
              placeholder="Search items…"
              className="w-full text-xs px-2 py-2 rounded border border-pip-dim/40 bg-terminal"
              value={lootSearch}
              onChange={e => setLootSearch(e.target.value)}
            />
            <div className="flex-1 overflow-y-auto min-h-[12rem] space-y-1 text-xs border border-pip-dim/30 rounded p-2">
              {filteredItems.map(i => (
                <button
                  key={i.id}
                  type="button"
                  className={`w-full text-left px-2 py-2 rounded border ${lootPickId === i.id ? 'border-amber bg-amber/10' : 'border-transparent hover:border-pip-dim/40'}`}
                  onClick={() => setLootPickId(i.id)}
                >
                  {i.name} · {i.subType} · {i.caps}c
                </button>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button type="button" className="flex-1 min-h-[44px] border border-muted rounded text-xs" onClick={() => setLootModal(null)}>
                SKIP
              </button>
              <button
                type="button"
                className="flex-1 min-h-[44px] border border-amber text-amber rounded text-xs font-bold disabled:opacity-40"
                disabled={lootPickId == null}
                onClick={() => addLootToTray(lootPickId)}
              >
                LOOT SELECTED
              </button>
            </div>
          </div>
        </div>
      )}

      {endOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" role="dialog">
          <div className="bg-panel border border-danger/50 rounded-lg max-w-md w-full p-4 space-y-4">
            <p className="text-danger font-bold">End the battle?</p>
            <label className="block text-xs text-muted space-y-1">
              Your outcome
              <select className="w-full min-h-[44px] bg-terminal border rounded px-2" value={outcome} onChange={e => setOutcome(e.target.value)}>
                <option value="major_victory">Major Victory</option>
                <option value="minor_victory">Minor Victory</option>
                <option value="draw">Draw</option>
                <option value="loss">Loss</option>
                <option value="na">N/A</option>
              </select>
            </label>
            <div className="flex gap-2">
              <button type="button" className="flex-1 min-h-[44px] border border-muted rounded text-xs" onClick={() => setEndOpen(false)}>
                CANCEL
              </button>
              <button type="button" className="flex-1 min-h-[44px] bg-danger/30 border-2 border-danger text-danger font-bold rounded text-xs" onClick={confirmEndBattle}>
                CONFIRM END
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
