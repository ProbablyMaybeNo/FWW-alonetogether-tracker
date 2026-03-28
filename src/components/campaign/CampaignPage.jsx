import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { calcRosterTotalCaps } from '../../utils/calculations'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import itemsData from '../../data/items.json'

const PHASES = [
  { num: 1, name: 'THE ROAD AHEAD',           subtitle: 'Build your starting roster. 750 cap limit.' },
  { num: 2, name: 'GATHER SUPPLIES',           subtitle: 'Track Fate only. Permanent deaths.' },
  { num: 3, name: 'STAKING A CLAIM',           subtitle: 'Spend caps on structures and recruits only.' },
  { num: 4, name: 'FIGHTING FOR THE FRONTIER', subtitle: 'Open campaign loop. Fight, build, grow.' },
]

const WASTELAND_DECK_TYPES = ['Pistol','Rifle','Heavy Weapon','Melee','Grenade','Mine','Armor','Clothing','Food','Drink','Chem','Utility','Mod']

const TYPE_FILTER_OPTIONS = [
  { id: 'any',        label: 'ANY',        types: WASTELAND_DECK_TYPES },
  { id: 'weapon',     label: 'WEAPON',     types: ['Pistol','Rifle','Heavy Weapon','Melee','Grenade','Mine'] },
  { id: 'armor',      label: 'ARMOR',      types: ['Armor','Clothing'] },
  { id: 'consumable', label: 'CONSUMABLE', types: ['Food','Drink','Chem'] },
  { id: 'mod',        label: 'MOD',        types: ['Mod'] },
  { id: 'utility',    label: 'UTILITY',    types: ['Utility'] },
]

const SUBTYPE_COLOR = {
  Pistol: 'text-amber', Rifle: 'text-amber', 'Heavy Weapon': 'text-amber', Melee: 'text-amber',
  Grenade: 'text-danger', Mine: 'text-danger',
  Armor: 'text-info', Clothing: 'text-info',
  Food: 'text-pip', Drink: 'text-pip', Chem: 'text-pip',
  Mod: 'text-amber', Utility: 'text-muted',
}

function buildItemDeck() {
  return itemsData
    .filter(i => WASTELAND_DECK_TYPES.includes(i.subType))
    .map(i => i.id)
}

function useWastelandItemDeck() {
  const allIds = buildItemDeck()

  const [deckIds, setDeckIds] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('fww-wasteland-item-deck') || 'null')
      if (Array.isArray(stored) && stored.length > 0) return stored
    } catch {}
    return [...allIds].sort(() => Math.random() - 0.5)
  })

  const [drawn, setDrawn] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fww-wasteland-item-drawn') || '[]') }
    catch { return [] }
  })

  const [typeFilter, setTypeFilter] = useState('any')

  useEffect(() => {
    try {
      localStorage.setItem('fww-wasteland-item-deck', JSON.stringify(deckIds))
      localStorage.setItem('fww-wasteland-item-drawn', JSON.stringify(drawn))
    } catch {}
  }, [deckIds, drawn])

  function draw() {
    const filterTypes = TYPE_FILTER_OPTIONS.find(f => f.id === typeFilter)?.types || WASTELAND_DECK_TYPES
    const eligible = deckIds.filter(id => {
      const item = itemsData.find(i => i.id === id)
      return item && filterTypes.includes(item.subType)
    })
    if (eligible.length === 0) return
    const randomId = eligible[Math.floor(Math.random() * eligible.length)]
    const item = itemsData.find(i => i.id === randomId)
    setDeckIds(d => d.filter(id => id !== randomId))
    setDrawn(d => [{ ...item, drawnAt: Date.now(), kept: false }, ...d])
  }

  function keep(idx) {
    setDrawn(d => d.map((c, i) => i === idx ? { ...c, kept: true } : c))
  }

  function discard(idx) {
    const item = drawn[idx]
    if (item) setDeckIds(d => [...d, item.id])
    setDrawn(d => d.filter((_, i) => i !== idx))
  }

  function dismiss(idx) {
    setDrawn(d => d.filter((_, i) => i !== idx))
  }

  function reshuffle() {
    const keptIds = new Set(drawn.filter(d => d.kept).map(d => d.id))
    const newDeck = allIds.filter(id => !keptIds.has(id))
    setDeckIds(newDeck.sort(() => Math.random() - 0.5))
    setDrawn(d => d.filter(c => c.kept))
  }

  function fullReset() {
    setDeckIds([...allIds].sort(() => Math.random() - 0.5))
    setDrawn([])
  }

  return {
    deckIds, drawn, draw, keep, discard, dismiss, reshuffle, fullReset,
    typeFilter, setTypeFilter,
    total: allIds.length,
    keptCount: drawn.filter(d => d.kept).length,
  }
}

export default function CampaignPage({ campaignId }) {
  const { state, setState, updateShared, isOnline, sharedState } = useCampaign()
  const { user } = useAuth()
  const [allPlayers, setAllPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const wasteland = useWastelandItemDeck()

  const phase = state?.phase ?? 1
  const round = state?.round ?? 0
  const battleCount = state?.battleCount ?? 0
  const phaseInfo = PHASES[phase - 1] || PHASES[0]
  const isAT = !state?.settings?.settlementMode || state.settings.settlementMode === 'alone-together'

  useEffect(() => {
    if (!isOnline || !campaignId) return
    fetchAllPlayers()
  }, [campaignId, isOnline, sharedState?._playerListVersion])

  async function fetchAllPlayers() {
    if (!supabase || !campaignId) return
    setLoadingPlayers(true)
    try {
      const { data: players } = await supabase
        .from('campaign_players')
        .select('user_id, is_gm, profiles(username)')
        .eq('campaign_id', campaignId)

      const { data: playerData } = await supabase
        .from('player_data')
        .select('user_id, caps, roster, settlement, quest_cards, completed_objectives, active_scavenger_objective, player_info')
        .eq('campaign_id', campaignId)

      const dataMap = {}
      ;(playerData || []).forEach(pd => { dataMap[pd.user_id] = pd })

      setAllPlayers((players || []).map(p => {
        const pd = dataMap[p.user_id] || {}
        const roster = pd.roster || []
        const structures = pd.settlement?.structures || []
        return {
          userId: p.user_id,
          username: p.profiles?.username || 'Player',
          isGm: p.is_gm,
          isMe: p.user_id === user?.id,
          caps: pd.caps ?? 0,
          faction: pd.player_info?.faction || '—',
          subFaction: pd.player_info?.leader || '',
          activeUnits: roster.filter(u => u.fate !== 'Dead' && !['Delayed', 'Lost', 'Captured'].includes(u.fate)).length,
          deadUnits: roster.filter(u => u.fate === 'Dead').length,
          rosterValue: calcRosterTotalCaps(roster.filter(u => u.fate !== 'Dead')),
          structures: structures.length,
          activeQuests: (pd.quest_cards || []).filter(q => q.status === 'Active').length,
          completedObjectives: (pd.completed_objectives || []).length,
          completedObjectiveIds: pd.completed_objectives || [],
          activeObjectiveId: pd.active_scavenger_objective ?? null,
          totalPerks: roster.reduce((s, u) => s + (u.perks || []).length, 0),
        }
      }))
    } catch (e) {
      console.error('fetchAllPlayers error:', e)
    } finally {
      setLoadingPlayers(false)
    }
  }

  const myStats = state ? {
    userId: user?.id,
    username: state.player?.name || 'You',
    isMe: true,
    isGm: false,
    caps: state.caps ?? 0,
    faction: state.player?.faction || '—',
    subFaction: state.player?.leader || '',
    activeUnits: (state.roster || []).filter(u => u.fate !== 'Dead' && !['Delayed', 'Lost', 'Captured'].includes(u.fate)).length,
    deadUnits: (state.roster || []).filter(u => u.fate === 'Dead').length,
    rosterValue: calcRosterTotalCaps((state.roster || []).filter(u => u.fate !== 'Dead')),
    structures: (state.settlement?.structures || []).length,
    activeQuests: (state.questCards || []).filter(q => q.status === 'Active').length,
    completedObjectives: (state.completedObjectives || []).length,
    completedObjectiveIds: state.completedObjectives || [],
    activeObjectiveId: state.activeScavengerObjective ?? null,
    totalPerks: (state.roster || []).reduce((s, u) => s + (u.perks || []).length, 0),
  } : null

  const displayPlayers = (isOnline && allPlayers.length > 0) ? allPlayers : (myStats ? [myStats] : [])

  function handlePhaseChange(delta) {
    const newPhase = Math.max(1, Math.min(4, phase + delta))
    if (isOnline) updateShared('phase', newPhase)
    else setState(prev => ({ ...prev, phase: newPhase }))
  }

  function handleRoundChange(val) {
    const n = parseInt(val, 10)
    const newRound = isNaN(n) ? 0 : n
    if (isOnline) updateShared('round', newRound)
    else setState(prev => ({ ...prev, round: newRound }))
  }

  function handleBattleInc() {
    const n = battleCount + 1
    if (isOnline) updateShared('battleCount', n)
    else setState(prev => ({ ...prev, battleCount: n }))
  }

  if (!state) return <div className="p-8 text-center text-muted text-xs tracking-wider">LOADING...</div>

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">

      {/* ── Phase / Round Banner ── */}
      <div
        className="bg-panel-light border border-amber/40 rounded-lg px-5 py-4"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}
      >
        <div className="flex items-start justify-between flex-wrap gap-4">
          {/* Phase name — AT only */}
          {isAT && (
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-amber text-xl font-bold tracking-widest">PHASE {phase}</span>
                <span className="text-pip text-base font-bold tracking-wider">— {phaseInfo.name}</span>
              </div>
              <p className="text-muted text-xs italic">{phaseInfo.subtitle}</p>
            </div>
          )}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Phase stepper — AT only */}
            {isAT && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePhaseChange(-1)} disabled={phase <= 1}
                  className="p-1.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 transition-colors"
                ><ChevronLeft size={14} /></button>
                <span className="text-pip text-xs w-20 text-center tracking-wider">PHASE {phase} / 4</span>
                <button
                  onClick={() => handlePhaseChange(1)} disabled={phase >= 4}
                  className="p-1.5 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 transition-colors"
                ><ChevronRight size={14} /></button>
              </div>
            )}
            {/* Round */}
            <div className={`flex items-center gap-2 ${isAT ? 'border-l border-pip-dim/30 pl-4' : ''}`}>
              <span className="text-pip text-xs tracking-wider">ROUND</span>
              <input
                type="number" min="0" value={round}
                onChange={e => handleRoundChange(e.target.value)}
                className="text-sm py-1 px-2 w-16 text-center font-bold"
              />
            </div>
            {/* Battles */}
            <div className="flex items-center gap-2 border-l border-pip-dim/30 pl-4">
              <span className="text-pip text-xs tracking-wider">BATTLES</span>
              <span className="text-pip font-bold text-lg">{battleCount}</span>
              <button
                onClick={handleBattleInc}
                className="text-xs border border-muted/50 text-muted hover:text-pip hover:border-pip rounded px-2 py-0.5 transition-colors"
              >+1</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Player Table ── */}
      <div>
        <div className="flex items-center gap-3 mb-3 border-b border-pip-mid/50 pb-2">
          <h2 className="text-pip text-sm tracking-widest font-bold flex-1">
            PLAYERS ({displayPlayers.length})
          </h2>
          {isOnline && (
            <button
              onClick={fetchAllPlayers}
              className="text-xs text-muted hover:text-pip border border-muted/30 hover:border-pip rounded px-2 py-1 transition-colors"
            >
              {loadingPlayers ? 'SYNCING...' : 'REFRESH'}
            </button>
          )}
        </div>

        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-pip-mid/40">
                {['PLAYER', 'FACTION', 'CAPS', 'ACTIVE', 'DEAD', 'ROSTER VALUE', 'STRUCTURES', 'QUESTS', 'OBJECTIVES', 'PERKS'].map(h => (
                  <th key={h} className={`text-muted tracking-wider py-2 pr-3 font-normal ${h === 'PLAYER' || h === 'FACTION' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayPlayers.map((p, i) => (
                <tr key={p.userId || i} className={`border-b border-pip-dim/20 hover:bg-panel-light transition-colors ${p.isMe ? 'bg-pip-dim/10' : ''}`}>
                  <td className="py-2.5 pr-3">
                    <span className={`font-bold ${p.isMe ? 'text-pip' : 'text-pip'}`}>{p.username}</span>
                    {p.isGm && <span className="ml-1 text-amber text-xs px-1 border border-amber/50 rounded">GM</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-pip">
                    {p.faction}
                    {p.subFaction && <span className="text-pip"> / {p.subFaction}</span>}
                  </td>
                  <td className="py-2.5 pr-3 text-right text-amber font-bold">{(p.caps || 0).toLocaleString()}c</td>
                  <td className="py-2.5 pr-3 text-right text-pip font-bold">{p.activeUnits}</td>
                  <td className="py-2.5 pr-3 text-right text-danger">{p.deadUnits || 0}</td>
                  <td className="py-2.5 pr-3 text-right text-amber">{(p.rosterValue || 0).toLocaleString()}c</td>
                  <td className="py-2.5 pr-3 text-right text-pip">{p.structures}</td>
                  <td className="py-2.5 pr-3 text-right text-pip">{p.activeQuests}</td>
                  <td className="py-2.5 pr-3 text-right text-pip">{p.completedObjectives}</td>
                  <td className="py-2.5 text-right text-pip">{p.totalPerks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-2">
          {displayPlayers.map((p, i) => (
            <div key={p.userId || i} className={`border rounded bg-panel p-3 ${p.isMe ? 'border-pip/40' : 'border-pip-dim/40'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-pip">{p.username}</span>
                <span className="text-amber font-bold">{(p.caps || 0).toLocaleString()}c</span>
              </div>
              <p className="text-pip text-xs mb-2">{p.faction}</p>
              <div className="grid grid-cols-4 gap-1 text-xs text-center">
                <div><span className="text-pip font-bold block">{p.activeUnits}</span><span className="text-muted">Units</span></div>
                <div><span className="text-danger font-bold block">{p.deadUnits || 0}</span><span className="text-muted">Dead</span></div>
                <div><span className="text-pip font-bold block">{p.structures}</span><span className="text-muted">Structs</span></div>
                <div><span className="text-pip font-bold block">{p.activeQuests}</span><span className="text-muted">Quests</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scavenger Objectives Board ── */}
      {displayPlayers.some(p => p.activeObjectiveId != null || p.completedObjectiveIds?.length > 0) && (
        <div>
          <h2 className="text-pip text-sm tracking-widest font-bold mb-3 border-b border-pip-mid/50 pb-1">
            SCAVENGER OBJECTIVES
          </h2>
          <div className="space-y-1">
            {SCAVENGER_OBJECTIVES.map(obj => {
              const statuses = displayPlayers.map(p => {
                const done = (p.completedObjectiveIds || []).includes(obj.id)
                const active = p.activeObjectiveId === obj.id
                return { username: p.username, done, active }
              }).filter(s => s.done || s.active)
              if (statuses.length === 0) return null
              return (
                <div key={obj.id} className="flex items-center gap-3 border border-pip-dim/30 rounded px-3 py-2 bg-panel">
                  <div className="flex-1 min-w-0">
                    <span className="text-pip text-xs font-bold">{obj.name}</span>
                    <span className="ml-2 text-muted/60 text-xs">{obj.mode}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {statuses.map(s => (
                      <span key={s.username} className={`text-xs px-2 py-0.5 rounded border font-bold ${
                        s.done ? 'border-pip/40 text-pip bg-pip-dim/10' : 'border-amber/50 text-amber bg-amber-dim/10'
                      }`}>
                        {s.done ? '✓' : '●'} {s.username}
                      </span>
                    ))}
                  </div>
                </div>
              )
            }).filter(Boolean)}
          </div>
        </div>
      )}

      {/* ── Wasteland Item Deck ── */}
      <div>
        <div className="flex items-center gap-3 mb-3 border-b border-pip-mid/50 pb-2 flex-wrap gap-y-2">
          <h2 className="text-pip text-sm tracking-widest font-bold flex-1">
            WASTELAND ITEM DECK
          </h2>
          <span className="text-muted text-xs">
            {wasteland.deckIds.length}/{wasteland.total} remaining
            {wasteland.keptCount > 0 && ` · ${wasteland.keptCount} kept`}
          </span>
          <button
            onClick={wasteland.reshuffle}
            className="flex items-center gap-1 text-xs text-muted hover:text-amber border border-muted/30 hover:border-amber/60 rounded px-2 py-1 transition-colors"
          ><Shuffle size={11} /> RESHUFFLE</button>
          <button
            onClick={wasteland.fullReset}
            className="text-xs text-muted hover:text-danger border border-muted/30 hover:border-danger/60 rounded px-2 py-1 transition-colors"
          >FULL RESET</button>
        </div>

        {/* Type filter */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {TYPE_FILTER_OPTIONS.map(f => (
            <button
              key={f.id}
              onClick={() => wasteland.setTypeFilter(f.id)}
              className={`text-xs px-2.5 py-1 border rounded transition-colors ${
                wasteland.typeFilter === f.id
                  ? 'border-pip text-pip bg-pip-dim/20 font-bold'
                  : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
              }`}
            >{f.label}</button>
          ))}
          <button
            onClick={wasteland.draw}
            disabled={wasteland.deckIds.length === 0}
            className="ml-auto text-xs border border-amber text-amber font-bold hover:bg-amber-dim/30 rounded px-4 py-1 transition-colors disabled:opacity-40"
            style={{ boxShadow: '0 0 6px var(--color-amber-glow)' }}
          >DRAW ITEM</button>
        </div>

        {/* Drawn cards */}
        {wasteland.drawn.length > 0 && (
          <div className="space-y-2 mb-2">
            {wasteland.drawn.map((item, i) => (
              <div key={`${item.id}-${item.drawnAt}`} className={`flex items-center gap-3 border rounded px-3 py-2 ${
                item.kept ? 'border-pip/40 bg-pip-dim/10 opacity-70' : 'border-amber/40 bg-panel-light'
              }`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold ${item.kept ? 'text-pip' : 'text-amber'}`}>{item.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 border border-current/30 rounded ${SUBTYPE_COLOR[item.subType] || 'text-muted'}`}>{item.subType}</span>
                    {item.caps != null && <span className="text-muted text-xs">{item.caps}c</span>}
                    {item.kept && <span className="text-pip text-xs font-bold">✓ KEPT</span>}
                  </div>
                </div>
                {!item.kept ? (
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => wasteland.keep(i)}
                      className="text-xs border border-pip text-pip hover:bg-pip-dim rounded px-2 py-1 transition-colors font-bold"
                    >KEEP</button>
                    <button
                      onClick={() => wasteland.discard(i)}
                      className="text-xs border border-muted/40 text-muted hover:text-pip hover:border-pip rounded px-2 py-1 transition-colors"
                    >RETURN</button>
                  </div>
                ) : (
                  <button
                    onClick={() => wasteland.dismiss(i)}
                    className="text-xs border border-muted/30 text-muted hover:text-pip rounded px-2 py-1 transition-colors shrink-0"
                  >DISMISS</button>
                )}
              </div>
            ))}
          </div>
        )}

        {wasteland.deckIds.length === 0 && wasteland.drawn.filter(d => !d.kept).length === 0 && (
          <p className="text-center py-4 text-muted text-xs border border-dashed border-muted/30 rounded">
            Deck empty — click RESHUFFLE to return discarded items, or FULL RESET to start fresh
          </p>
        )}
      </div>

      {/* ── Active Explore Consequences ── */}
      {(state.activeEvents || []).length > 0 && (
        <div>
          <h2 className="text-pip text-sm tracking-widest font-bold mb-2 border-b border-pip-mid/50 pb-1">
            ACTIVE EXPLORE CONSEQUENCES
          </h2>
          <p className="text-muted text-xs mb-3 italic">
            Shuffle these into the Event Deck before your next battle (Campaign Handbook p.5).
          </p>
          <div className="space-y-2">
            {(state.activeEvents || []).map((ev, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border border-info/40 rounded bg-info-dim/10 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-info text-xs font-bold">{ev.title || ev.name || 'Consequence'}</span>
                  {ev.text && <p className="text-muted text-xs mt-0.5">{ev.text}</p>}
                </div>
                <button
                  onClick={() => setState(prev => ({ ...prev, activeEvents: (prev.activeEvents || []).filter((_, j) => j !== i) }))}
                  className="text-xs border border-muted/30 text-muted hover:text-pip rounded px-2 py-1 transition-colors shrink-0"
                >DONE</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
