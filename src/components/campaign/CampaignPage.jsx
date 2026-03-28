import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Shuffle } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { calcRosterTotalCaps } from '../../utils/calculations'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'

const PHASES = [
  { num: 1, name: 'THE ROAD AHEAD',           subtitle: 'Build your starting roster. 750 cap limit.' },
  { num: 2, name: 'GATHER SUPPLIES',           subtitle: 'Track Fate only. Permanent deaths.' },
  { num: 3, name: 'STAKING A CLAIM',           subtitle: 'Spend caps on structures and recruits only.' },
  { num: 4, name: 'FIGHTING FOR THE FRONTIER', subtitle: 'Open campaign loop. Fight, build, grow.' },
]

const WASTELAND_SEED = [
  { id: 'w01', name: 'Rad Storm',          type: 'hazard',      text: 'All models gain 1 Rad Damage at the start of each round this battle.' },
  { id: 'w02', name: 'Ambush',             type: 'event',       text: 'The player with the most units draws an extra Explore card this round.' },
  { id: 'w03', name: 'Scavenging Party',   type: 'event',       text: 'Each player may immediately loot one Searchable without moving.' },
  { id: 'w04', name: 'Raider Attack',      type: 'hazard',      text: 'Place 2 Raiders at a random board edge. They activate immediately.' },
  { id: 'w05', name: 'Trade Caravan',      type: 'boon',        text: 'One player may buy any one item at half price this round.' },
  { id: 'w06', name: 'Power Surge',        type: 'hazard',      text: 'All power-dependent structures lose their bonus until next round.' },
  { id: 'w07', name: 'Hidden Cache',       type: 'boon',        text: 'Place one extra Searchable token anywhere on the board.' },
  { id: 'w08', name: 'Fog of War',         type: 'hazard',      text: 'All models have movement reduced by 2 this round.' },
  { id: 'w09', name: 'Supply Drop',        type: 'boon',        text: 'Draw one item from the general item pool for free.' },
  { id: 'w10', name: 'Creature Encounter', type: 'hazard',      text: 'A random creature enters from the nearest board edge at the start of round 2.' },
  { id: 'w11', name: 'Old World Tech',     type: 'boon',        text: 'One unit may use any equipment without meeting requirements this battle.' },
  { id: 'w12', name: 'Wasteland Winds',    type: 'hazard',      text: 'Thrown weapons scatter an extra d6 inches this round.' },
]

const TYPE_STYLE = {
  hazard:      'text-danger border-danger/50 bg-danger-dim/20',
  event:       'text-amber border-amber/50 bg-amber-dim/20',
  boon:        'text-pip border-pip/50 bg-pip-dim/20',
  consequence: 'text-info border-info/50 bg-info-dim/20',
}

function useWastelandDeck() {
  const [deck, setDeck] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fww-wasteland-deck') || 'null') || [...WASTELAND_SEED] }
    catch { return [...WASTELAND_SEED] }
  })
  const [drawn, setDrawn] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fww-wasteland-drawn') || '[]') }
    catch { return [] }
  })

  useEffect(() => {
    try {
      localStorage.setItem('fww-wasteland-deck', JSON.stringify(deck))
      localStorage.setItem('fww-wasteland-drawn', JSON.stringify(drawn))
    } catch { /* ignore */ }
  }, [deck, drawn])

  function draw() {
    if (deck.length === 0) return
    const idx = Math.floor(Math.random() * deck.length)
    const card = deck[idx]
    setDeck(d => d.filter((_, i) => i !== idx))
    setDrawn(d => [{ ...card, drawnAt: Date.now() }, ...d])
  }

  function addToTop(card) {
    setDeck(d => [card, ...d])
  }

  function dismiss(idx) {
    setDrawn(d => d.filter((_, i) => i !== idx))
  }

  function reshuffle() {
    const conseqs = drawn.filter(c => c.type === 'consequence')
    setDeck([...WASTELAND_SEED, ...conseqs].sort(() => Math.random() - 0.5))
    setDrawn([])
  }

  return { deck, drawn, draw, addToTop, dismiss, reshuffle }
}

export default function CampaignPage({ campaignId }) {
  const { state, setState, updateShared, isOnline, sharedState } = useCampaign()
  const { user } = useAuth()
  const [allPlayers, setAllPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [showDeck, setShowDeck] = useState(false)
  const wasteland = useWastelandDeck()

  const phase = state?.phase ?? 1
  const round = state?.round ?? 0
  const battleCount = state?.battleCount ?? 0
  const phaseInfo = PHASES[phase - 1] || PHASES[0]

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
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-amber text-xl font-bold tracking-widest">PHASE {phase}</span>
              <span className="text-pip text-base font-bold tracking-wider">— {phaseInfo.name}</span>
            </div>
            <p className="text-muted text-xs italic">{phaseInfo.subtitle}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            {/* Phase stepper */}
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
            {/* Round */}
            <div className="flex items-center gap-2 border-l border-pip-dim/30 pl-4">
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

      {/* ── Wasteland Deck ── */}
      <div>
        <div className="flex items-center gap-3 mb-3 border-b border-pip-mid/50 pb-2">
          <h2 className="text-pip text-sm tracking-widest font-bold flex-1">
            WASTELAND DECK
            <span className="text-muted text-xs font-normal ml-2">({wasteland.deck.length} remaining)</span>
          </h2>
          <button
            onClick={() => setShowDeck(s => !s)}
            className="text-xs text-muted hover:text-pip border border-muted/30 hover:border-pip rounded px-2 py-1 transition-colors"
          >{showDeck ? 'HIDE' : 'VIEW DECK'}</button>
          <button
            onClick={wasteland.reshuffle}
            className="flex items-center gap-1 text-xs text-muted hover:text-amber border border-muted/30 hover:border-amber/60 rounded px-2 py-1 transition-colors"
          ><Shuffle size={11} /> RESHUFFLE</button>
          <button
            onClick={wasteland.draw}
            disabled={wasteland.deck.length === 0}
            className="text-xs border border-pip text-pip font-bold hover:bg-pip-dim rounded px-3 py-1.5 transition-colors disabled:opacity-40"
            style={{ boxShadow: '0 0 6px var(--color-pip-glow)' }}
          >DRAW CARD</button>
        </div>

        {/* Drawn / in-play */}
        {wasteland.drawn.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-muted text-xs tracking-wider">IN PLAY</p>
            {wasteland.drawn.map((card, i) => (
              <div key={i} className={`flex items-start justify-between gap-3 border rounded px-3 py-2 ${TYPE_STYLE[card.type] || TYPE_STYLE.event}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-xs tracking-wider">{card.name}</span>
                    <span className="text-xs opacity-70 capitalize border border-current/30 rounded px-1">{card.type}</span>
                  </div>
                  <p className="text-xs opacity-90">{card.text}</p>
                </div>
                <button
                  onClick={() => wasteland.dismiss(i)}
                  className="text-xs border border-current/30 rounded px-2 py-1 opacity-70 hover:opacity-100 shrink-0 transition-opacity"
                >DONE</button>
              </div>
            ))}
          </div>
        )}

        {wasteland.deck.length === 0 && wasteland.drawn.length === 0 && (
          <p className="text-center py-4 text-muted text-xs border border-dashed border-muted/30 rounded">Deck empty — click RESHUFFLE to reset</p>
        )}

        {showDeck && wasteland.deck.length > 0 && (
          <div className="max-h-48 overflow-y-auto border border-pip-dim/30 rounded p-2 bg-panel-alt space-y-1">
            {wasteland.deck.map((card, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-1 border-b border-pip-dim/10 last:border-0">
                {i === 0 && <span className="text-amber text-xs shrink-0">TOP →</span>}
                <span className={`shrink-0 px-1 rounded text-xs capitalize ${TYPE_STYLE[card.type]}`}>{card.type}</span>
                <span className="text-muted">{card.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Explore Consequences → add to Wasteland ── */}
      {(state.activeEvents || []).length > 0 && (
        <div>
          <h2 className="text-pip text-sm tracking-widest font-bold mb-2 border-b border-pip-mid/50 pb-1">
            ACTIVE EXPLORE CONSEQUENCES
          </h2>
          <p className="text-muted text-xs mb-3 italic">
            Per campaign rules, explore consequences can be placed on top of the Wasteland Deck to be triggered soon during play.
          </p>
          <div className="space-y-2">
            {(state.activeEvents || []).map((ev, i) => (
              <div key={i} className="flex items-center justify-between gap-3 border border-info/40 rounded bg-info-dim/10 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="text-info text-xs font-bold">{ev.title || ev.name || 'Consequence'}</span>
                  {ev.text && <p className="text-muted text-xs mt-0.5">{ev.text}</p>}
                </div>
                <button
                  onClick={() => wasteland.addToTop({
                    id: `consequence-${Date.now()}-${i}`,
                    name: ev.title || ev.name || 'Consequence',
                    type: 'consequence',
                    text: ev.text || 'Explore consequence.',
                  })}
                  className="text-xs border border-info/50 text-info hover:bg-info-dim/20 rounded px-2 py-1 transition-colors shrink-0"
                >+ DECK TOP</button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
