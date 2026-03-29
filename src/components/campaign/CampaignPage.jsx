import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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


export default function CampaignPage({ campaignId }) {
  const { state, setState, updateShared, isOnline, sharedState } = useCampaign()
  const { user } = useAuth()
  const [allPlayers, setAllPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [battleOpponent, setBattleOpponent] = useState('')
  const [battleResult, setBattleResult] = useState('win')
  const [battleSubmitting, setBattleSubmitting] = useState(false)

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

  // Battle data
  const battles = sharedState?.battles ?? {}
  const roundBattles = battles[String(round)] ?? {}
  const myBattleRecord = roundBattles[user?.id] ?? null
  const allReady = displayPlayers.length > 0 && displayPlayers.every(p => roundBattles[p.userId]?.ready)

  async function handleRecordBattle(e) {
    e.preventDefault()
    if (!battleOpponent || !user?.id) return
    setBattleSubmitting(true)

    const mirrorResult = battleResult === 'win' ? 'loss' : battleResult === 'loss' ? 'win' : 'draw'
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }

    // Update my record
    const myRecord = roundData[user.id] ?? { ready: true, noBattles: false, matches: [] }
    roundData[user.id] = {
      ...myRecord,
      ready: true,
      noBattles: false,
      matches: [...(myRecord.matches ?? []), { opponentId: battleOpponent, result: battleResult }],
    }

    // Update opponent's record (mirror)
    const oppRecord = roundData[battleOpponent] ?? { ready: true, noBattles: false, matches: [] }
    roundData[battleOpponent] = {
      ...oppRecord,
      ready: true,
      matches: [...(oppRecord.matches ?? []), { opponentId: user.id, result: mirrorResult }],
    }

    await updateShared('battles', { ...currentBattles, [roundKey]: roundData })
    setBattleOpponent('')
    setBattleSubmitting(false)
  }

  async function handleNoBattles() {
    if (!user?.id) return
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }
    roundData[user.id] = { ready: true, noBattles: true, matches: [] }
    await updateShared('battles', { ...currentBattles, [roundKey]: roundData })
  }

  async function handleNextRound() {
    if (!allReady && displayPlayers.length > 1) return
    const newRound = round + 1
    if (isOnline) updateShared('round', newRound)
    else setState(prev => ({ ...prev, round: newRound }))
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

      {/* ── Battles ── */}
      <div>
        <div className="flex items-center gap-3 mb-3 border-b border-pip-mid/50 pb-2">
          <h2 className="text-pip text-sm tracking-widest font-bold flex-1">BATTLES — ROUND {round}</h2>
          <span className="text-muted text-xs">
            {displayPlayers.filter(p => roundBattles[p.userId]?.ready).length}/{displayPlayers.length} reported
          </span>
        </div>

        {/* Battle log */}
        <div className="space-y-1.5 mb-4">
          {displayPlayers.map(p => {
            const record = roundBattles[p.userId]
            return (
              <div key={p.userId} className={`border rounded px-3 py-2 ${record?.ready ? 'border-pip-dim/40 bg-panel' : 'border-muted/20 bg-panel opacity-60'}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-pip">{p.username}</span>
                  {record?.ready ? (
                    record.noBattles ? (
                      <span className="text-muted text-xs">No battles this round</span>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {(record.matches ?? []).map((m, i) => {
                          const opp = displayPlayers.find(x => x.userId === m.opponentId)
                          return (
                            <span key={i} className={`text-xs px-2 py-0.5 border rounded font-bold ${
                              m.result === 'win' ? 'border-pip/40 text-pip' :
                              m.result === 'loss' ? 'border-danger/40 text-danger' :
                              'border-muted/40 text-muted'
                            }`}>
                              {m.result.toUpperCase()} vs {opp?.username ?? m.opponentId}
                            </span>
                          )
                        })}
                      </div>
                    )
                  ) : (
                    <span className="text-muted text-xs italic">Not yet reported</span>
                  )}
                  {record?.ready && <span className="ml-auto text-pip text-xs">✓</span>}
                </div>
              </div>
            )
          })}
        </div>

        {/* Record battle form */}
        {isOnline && user && (
          <div className="border border-pip-mid/30 rounded bg-panel p-3 space-y-3">
            <div className="text-muted text-xs tracking-wider">RECORD BATTLE</div>
            <form onSubmit={handleRecordBattle} className="flex gap-2 flex-wrap items-end">
              <div className="flex-1 min-w-32">
                <label className="text-muted text-xs block mb-1">OPPONENT</label>
                <select
                  value={battleOpponent}
                  onChange={e => setBattleOpponent(e.target.value)}
                  className="w-full text-xs py-1 px-2"
                >
                  <option value="">Select opponent...</option>
                  {displayPlayers.filter(p => !p.isMe).map(p => (
                    <option key={p.userId} value={p.userId}>{p.username}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-muted text-xs block mb-1">RESULT</label>
                <div className="flex gap-1">
                  {['win','loss','draw'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBattleResult(r)}
                      className={`text-xs px-3 py-1 border rounded transition-colors font-bold ${
                        battleResult === r
                          ? r === 'win' ? 'border-pip text-pip bg-pip-dim/20'
                            : r === 'loss' ? 'border-danger text-danger bg-danger/10'
                            : 'border-muted text-muted bg-muted/10'
                          : 'border-muted/30 text-muted hover:text-pip hover:border-pip'
                      }`}
                    >{r.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={!battleOpponent || battleSubmitting}
                className="text-xs border border-amber text-amber font-bold px-4 py-1.5 rounded hover:bg-amber/10 transition-colors disabled:opacity-40"
              >{battleSubmitting ? '...' : 'RECORD'}</button>
            </form>
            {!roundBattles[user.id]?.ready && (
              <button
                onClick={handleNoBattles}
                className="text-xs text-muted border border-muted/30 rounded px-3 py-1.5 hover:text-pip hover:border-pip transition-colors"
              >NO BATTLES THIS ROUND</button>
            )}
          </div>
        )}

        {/* Next Round button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleNextRound}
            disabled={!allReady && displayPlayers.length > 1 && isOnline}
            className={`flex-1 py-3 text-sm font-bold tracking-widest border rounded transition-all ${
              allReady || displayPlayers.length <= 1 || !isOnline
                ? 'border-amber text-amber hover:bg-amber/10'
                : 'border-muted/30 text-muted opacity-40 cursor-not-allowed'
            }`}
            style={allReady || displayPlayers.length <= 1 || !isOnline ? { boxShadow: '0 0 12px var(--color-amber-glow)' } : {}}
          >
            {allReady || displayPlayers.length <= 1 || !isOnline
              ? '▶ NEXT ROUND'
              : `NEXT ROUND (${displayPlayers.filter(p => roundBattles[p.userId]?.ready).length}/${displayPlayers.length} ready)`
            }
          </button>
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
