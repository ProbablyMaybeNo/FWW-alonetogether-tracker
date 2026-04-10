import { useState, useEffect } from 'react'
import { X, BookOpen } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { calcRosterTotalCaps } from '../../utils/calculations'
import { SCAVENGER_OBJECTIVES } from '../../data/scavengerObjectives'
import { defaultInhabitantsState } from '../../utils/inhabitantsState'


const PHASES = [
  {
    num: 1,
    name: 'THE ROAD AHEAD',
    subtitle: 'Build Roster',
    battles: 'None',
    rules: [
      '750 Caps',
      'Max 3 Uniques',
      'Leader must be 1 unique and determines faction',
      '1 Leader Perk and/or Heroic',
      '1 heavy weapon per 250 caps',
      'Basic loadouts only',
      '+150 armor only caps fund',
      'No Perks, Equipment, or Boosts (Except for leader)',
    ],
  },
  {
    num: 2,
    name: 'GATHER SUPPLIES',
    subtitle: 'Loot & Survive',
    battles: '2–3',
    rules: [
      'Track FATE only — no Injury, Battle, or Removed counts.',
      'Permanent deaths apply.',
      'All non-Dead conditions reset at Phase 3 start.',
      'Caps and loot carry forward.',
    ],
  },
  {
    num: 3,
    name: 'STAKING A CLAIM',
    subtitle: 'Build Settlement',
    battles: 'None',
    rules: [
      'Spend caps on structures and recruits only.',
      'Free start: 2× Small Generator, Stores, Maintenance Shed, Listening Post.',
      'Unspent caps carry into Phase 4.',
    ],
  },
  {
    num: 4,
    name: 'FIGHTING FOR THE FRONTIER',
    subtitle: 'Open Campaign Loop',
    battles: 'Until end',
    rules: [
      'Repeat Settlement Round Sequence (Steps 1–5) each round.',
      'Force: 500 caps default, 1,000 cap hard ceiling.',
      '+50 cap bonus every battle.',
      'Final Score = Caps + living roster value.',
    ],
  },
]


function NarrativeModal({ player, onClose }) {
  if (!player) return null
  const entries = player.narrativeLog || []
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="bg-panel border border-pip rounded-lg overflow-hidden flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pip-dim/30 bg-panel-light">
            <span className="text-pip text-sm font-bold tracking-wider">{player.username} — NARRATIVE LOG</span>
            <button onClick={onClose} className="text-muted hover:text-danger p-1"><X size={14} /></button>
          </div>
          <div className="overflow-y-auto flex-1">
            {entries.length === 0 ? (
              <p className="text-muted text-xs text-center py-8">No narrative entries yet.</p>
            ) : (
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-pip-dim/30 bg-panel-light">
                    <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-8">RND</th>
                    <th className="text-left text-info px-4 py-2 tracking-wider font-normal w-32">TITLE</th>
                    <th className="text-left text-info px-4 py-2 tracking-wider font-normal">NARRATIVE</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry, i) => (
                    <tr key={entry.id ?? i} className="border-b border-pip-dim/20 hover:bg-panel-light">
                      <td className="px-4 py-2 text-pip font-bold">{entry.round ?? '—'}</td>
                      <td className="px-4 py-2 text-amber font-bold">{entry.title}</td>
                      <td className="px-4 py-2 text-pip leading-relaxed">{entry.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const NARRATIVE_FONT = "'Alagard', 'Cinzel Decorative', Georgia, serif"
const NARRATIVE_GLOW = '0 0 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.2)'

function PlayerRoundNarrativeModal({ player, round, onClose }) {
  if (!player) return null
  const entries = (player.narrativeLog || []).filter(e => e.round === round)
  return (
    <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="max-w-xl w-full" onClick={e => e.stopPropagation()}>
        <div className="bg-panel border border-pip rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-pip-dim/30 bg-panel-light">
            <span className="text-pip text-sm font-bold tracking-wider">{player.username} — ROUND {round}</span>
            <button onClick={onClose} className="text-muted hover:text-danger p-1"><X size={14} /></button>
          </div>
          <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-muted text-xs text-center py-6">No narrative entries for this round.</p>
            ) : entries.map((e, i) => (
              <div key={e.id ?? i} className="space-y-1">
                {e.title && <div className="text-amber text-xs font-bold tracking-wider">{e.title}</div>}
                <p className="text-pip text-sm leading-relaxed">{e.content}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CampaignPage({ campaignId, onTabChange }) {
  const { state, setState, updateShared, isOnline, sharedState, saveInhabitantsState, saveCampaignBattles, saveCampaignNarratives, syncError } = useCampaign()
  const { user } = useAuth()
  const [allPlayers, setAllPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [battleOpponent, setBattleOpponent] = useState('')
  const [battleResult, setBattleResult] = useState('win')
  const [battleSubmitting, setBattleSubmitting] = useState(false)
  // Creator battle recording on behalf of another player
  const [creatorRecordFor, setCreatorRecordFor] = useState('')
  const [creatorOpponent, setCreatorOpponent] = useState('')
  const [creatorResult, setCreatorResult] = useState('win')
  const [narrativePlayer, setNarrativePlayer] = useState(null)
  const [showAddCampNarrative, setShowAddCampNarrative] = useState(false)
  const [newCampEntry, setNewCampEntry] = useState({ round: '', title: '', content: '' })
  const [campNarrativeError, setCampNarrativeError] = useState('')
  const [playerRoundNarrative, setPlayerRoundNarrative] = useState(null) // { player, round }

  const phase = state?.phase ?? 1
  const round = state?.round ?? 0
  const battleCount = state?.battleCount ?? 0
  const phaseInfo = PHASES[phase - 1] || PHASES[0]
  const isAT = !state?.settings?.settlementMode || state.settings.settlementMode === 'alone-together'
  const isCreator = !isOnline || !sharedState || !sharedState.createdBy ||
    !!(user?.id && user.id === sharedState.createdBy)

  const campaignNarratives = sharedState?.campaignNarratives ?? []
  const displayedNarrative = campaignNarratives.find(n => n.display) ?? null

  async function handleAddCampNarrative(e) {
    e.preventDefault()
    setCampNarrativeError('')
    const r = parseInt(newCampEntry.round, 10)
    if (!newCampEntry.content.trim()) { setCampNarrativeError('Narrative content is required.'); return }
    if (isNaN(r)) { setCampNarrativeError('Round number is required.'); return }
    const entry = {
      id: Date.now(),
      round: r,
      title: newCampEntry.title.trim(),
      content: newCampEntry.content.trim(),
      display: campaignNarratives.length === 0,
      createdAt: new Date().toISOString(),
    }
    try {
      await saveCampaignNarratives([...campaignNarratives, entry])
      setNewCampEntry({ round: String(round), title: '', content: '' })
      setShowAddCampNarrative(false)
    } catch (err) {
      setCampNarrativeError(err?.message ?? 'Failed to save — check Supabase column exists.')
    }
  }

  async function handleToggleDisplay(id) {
    const updated = campaignNarratives.map(n => ({ ...n, display: n.id === id }))
    await saveCampaignNarratives(updated)
  }

  async function handleDeleteCampNarrative(id) {
    const updated = campaignNarratives.filter(n => n.id !== id)
    // if deleted entry was displayed, auto-display the most recent remaining one
    const wasDisplayed = campaignNarratives.find(n => n.id === id)?.display
    if (wasDisplayed && updated.length > 0) updated[updated.length - 1].display = true
    await saveCampaignNarratives(updated)
  }

  async function resetInhabitantsSession(nextRound = round) {
    const base = { ...defaultInhabitantsState(), ...state?.inhabitantsState }
    await saveInhabitantsState({
      ...base,
      session: { round: nextRound, items: [] },
      pendingDraw: null,
    })
  }

  useEffect(() => {
    if (!isOnline || !campaignId) return
    fetchAllPlayers()
  }, [campaignId, isOnline, sharedState?._playerListVersion])

  async function fetchAllPlayers() {
    if (!supabase || !campaignId) return
    setLoadingPlayers(true)
    try {
      const { data: players, error: playersErr } = await supabase
        .from('campaign_players')
        .select('user_id')
        .eq('campaign_id', campaignId)
      if (playersErr) {
        console.error('fetchAllPlayers players error:', playersErr)
        throw playersErr
      }

      const { data: playerData, error: playerDataErr } = await supabase
        .from('player_data')
        .select('user_id, caps, roster, settlement, quest_cards, completed_objectives, active_scavenger_objective, player_info, narrative_log')
        .eq('campaign_id', campaignId)
      if (playerDataErr) console.error('fetchAllPlayers player_data error:', playerDataErr)

      const dataMap = {}
      ;(playerData || []).forEach(pd => { dataMap[pd.user_id] = pd })

      setAllPlayers((players || []).map(p => {
        const pd = dataMap[p.user_id] || {}
        const roster = pd.roster || []
        const structures = pd.settlement?.structures || []
        return {
          userId: p.user_id,
          username: pd.player_info?.name || 'Player',
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
          narrativeLog: pd.narrative_log || [],
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
    narrativeLog: state.narrativeLog || [],
  } : null

  // Always use live local state for "me" so name/faction changes show immediately without a refresh
  const displayPlayers = (isOnline && allPlayers.length > 0)
    ? allPlayers.map(p => (myStats && p.isMe) ? myStats : p)
    : (myStats ? [myStats] : [])

  function handlePhaseSet(val) {
    const n = parseInt(val, 10)
    if (isNaN(n)) return
    const newPhase = Math.max(1, Math.min(4, n))
    if (isOnline) updateShared('phase', newPhase)
    else setState(prev => ({ ...prev, phase: newPhase }))
  }

  async function handleRoundChange(val) {
    const n = parseInt(val, 10)
    const newRound = isNaN(n) ? 0 : n
    if (isOnline) await updateShared('round', newRound)
    else setState(prev => ({ ...prev, round: newRound }))
    await resetInhabitantsSession(newRound)
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

    await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    await resetInhabitantsSession(round)
    setBattleOpponent('')
    setBattleSubmitting(false)
  }

  async function handleNoBattles() {
    if (!user?.id) return
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }
    roundData[user.id] = { ready: true, noBattles: true, matches: [] }
    await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    await resetInhabitantsSession(round)
  }

  async function handleNextRound() {
    if (!isCreator) return
    if (!allReady && displayPlayers.length > 1) return
    const newRound = round + 1
    if (isOnline) await updateShared('round', newRound)
    else setState(prev => ({ ...prev, round: newRound }))
    await resetInhabitantsSession(newRound)
  }

  async function handleCreatorRecordBattle(e) {
    e.preventDefault()
    if (!creatorRecordFor || !creatorOpponent || !isCreator) return
    setBattleSubmitting(true)
    const mirrorResult = creatorResult === 'win' ? 'loss' : creatorResult === 'loss' ? 'win' : 'draw'
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }

    const myRecord = roundData[creatorRecordFor] ?? { ready: true, noBattles: false, matches: [] }
    roundData[creatorRecordFor] = {
      ...myRecord, ready: true, noBattles: false,
      matches: [...(myRecord.matches ?? []), { opponentId: creatorOpponent, result: creatorResult }],
    }
    const oppRecord = roundData[creatorOpponent] ?? { ready: true, noBattles: false, matches: [] }
    roundData[creatorOpponent] = {
      ...oppRecord, ready: true,
      matches: [...(oppRecord.matches ?? []), { opponentId: creatorRecordFor, result: mirrorResult }],
    }
    await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    await resetInhabitantsSession(round)
    setCreatorRecordFor('')
    setCreatorOpponent('')
    setBattleSubmitting(false)
  }

  async function handleCreatorNoBattles(playerId) {
    if (!isCreator) return
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }
    roundData[playerId] = { ready: true, noBattles: true, matches: [] }
    await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    await resetInhabitantsSession(round)
  }

  if (!state) return <div className="p-8 text-center text-muted text-xs tracking-wider">LOADING...</div>

  return (
    <div className="p-4 space-y-6 max-w-5xl mx-auto">
      <NarrativeModal player={narrativePlayer} onClose={() => setNarrativePlayer(null)} />
      <PlayerRoundNarrativeModal
        player={playerRoundNarrative?.player}
        round={playerRoundNarrative?.round}
        onClose={() => setPlayerRoundNarrative(null)}
      />

      {syncError && (
        <div className="border border-danger/50 bg-danger/10 rounded px-3 py-2 text-danger text-xs tracking-wider">
          SYNC ERROR: {syncError}
        </div>
      )}

      {/* ── Phase Banner ── */}
      <div
        className="bg-panel-light border border-amber/40 rounded-lg px-4 py-3"
        style={{ boxShadow: '0 0 12px var(--color-amber-glow)' }}
      >
        {/* Phase name — AT only */}
        {isAT && (
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-amber text-xl font-bold tracking-widest">PHASE {phase}</span>
              <span className="text-amber/80 text-base font-bold tracking-wider">— {phaseInfo.name}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-1">
              <span className="text-muted text-xs"><span className="text-pip/70 uppercase tracking-wider text-[10px]">Objective:</span> {phaseInfo.subtitle}</span>
              <span className="text-muted text-xs"><span className="text-pip/70 uppercase tracking-wider text-[10px]">Battles:</span> {phaseInfo.battles}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {phaseInfo.rules.map((r, i) => (
                <span key={i} className="text-muted/80 text-xs">
                  <span className="text-amber/60 mr-1">›</span>{r}
                </span>
              ))}
            </div>
          </div>
        )}
        {!isAT && (
          <div className="text-pip text-xs tracking-wider opacity-50">Campaign Mode — Phase tracking disabled</div>
        )}
      </div>

      {/* ── Round / Battles Controls ── */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Phase — AT mode only: editable for creator, read-only for others */}
        {isAT && isCreator && (
          <div className="flex items-center gap-2">
            <span className="text-pip text-xs tracking-wider">PHASE</span>
            <input
              type="number" min="1" max="4" value={phase}
              onChange={e => handlePhaseSet(e.target.value)}
              className="text-sm py-1 px-2 w-12 text-center font-bold"
            />
            <span className="text-pip text-xs">/4</span>
          </div>
        )}
        {isAT && !isCreator && (
          <span className="text-pip text-xs tracking-wider">PHASE {phase} / 4</span>
        )}
        {/* Round — +/- stepper for creator or solo, read-only for members */}
        <div className={`flex items-center gap-2 ${isAT ? 'border-l border-pip-dim/30 pl-4' : ''}`}>
          <span className="text-pip text-xs tracking-wider">ROUND</span>
          {isCreator || !isOnline ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleRoundChange(Math.max(0, round - 1))}
                disabled={round <= 0}
                className="px-2 py-1 border border-muted rounded text-muted hover:text-pip hover:border-pip disabled:opacity-30 transition-colors text-sm leading-none"
              >−</button>
              <input
                type="number" min="0" value={round}
                onChange={e => void handleRoundChange(e.target.value)}
                className="text-sm py-1 px-2 w-14 text-center font-bold"
              />
              <button
                onClick={() => handleRoundChange(round + 1)}
                className="px-2 py-1 border border-muted rounded text-muted hover:text-pip hover:border-pip transition-colors text-sm leading-none"
              >+</button>
            </div>
          ) : (
            <span className="text-amber font-bold text-lg w-16 text-center">{round}</span>
          )}
        </div>
        {/* Battles */}
        <div className="flex items-center gap-2 border-l border-pip-dim/30 pl-4">
          <span className="text-pip text-xs tracking-wider">BATTLES</span>
          <span className="text-pip font-bold text-lg">{battleCount}</span>
          {(isCreator || !isOnline) && (
            <button
              onClick={handleBattleInc}
              className="text-xs border border-muted/50 text-muted hover:text-pip hover:border-pip rounded px-2 py-0.5 transition-colors"
            >+1</button>
          )}
        </div>
      </div>

      {/* ── Player Table ── */}
      <div>
        <div className="flex items-center gap-3 mb-3 border-b border-pip-mid/50 pb-2">
          <h2 className="text-amber text-sm tracking-widest font-bold flex-1">
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
                  <th key={h} className={`text-info tracking-wider py-2 pr-3 font-normal ${h === 'PLAYER' || h === 'FACTION' ? 'text-left' : 'text-right'}`}>{h}</th>
                ))}
                <th key="JOURNAL" className="text-info tracking-wider py-2 pr-3 font-normal text-right">JOURNAL</th>
              </tr>
            </thead>
            <tbody>
              {displayPlayers.map((p, i) => (
                <tr key={p.userId || i} className={`border-b border-pip-dim/20 hover:bg-panel-light transition-colors ${p.isMe ? 'bg-pip-dim/10' : ''}`}>
                  <td className="py-2.5 pr-3">
                    <span className={`font-bold ${p.isMe ? 'text-pip' : 'text-pip'}`}>{p.username}</span>
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
                  <td className="py-2 text-right">
                    <button
                      onClick={() => setNarrativePlayer(p)}
                      className="p-1.5 border border-pip/30 rounded text-muted hover:text-amber hover:border-amber transition-colors"
                      title="View narrative log"
                    >
                      <BookOpen size={12} />
                    </button>
                  </td>
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

      {/* ── Round Status ── */}
      <div className="border border-pip-mid/40 rounded-lg bg-panel p-4">
        <div className="flex items-center gap-3 flex-wrap mb-3">
          <h2 className="text-amber text-sm tracking-widest font-bold flex-1">
            ROUND {round} STATUS
          </h2>
          <span className="text-muted text-xs">
            {displayPlayers.filter(p => roundBattles[p.userId]?.ready).length}/{displayPlayers.length} reported
          </span>
          {isOnline && (
            <button
              onClick={() => onTabChange?.('battles')}
              className="text-xs border border-pip/50 text-pip rounded px-3 py-1.5 hover:bg-pip-dim/20 transition-colors"
            >
              RECORD ON BATTLES TAB →
            </button>
          )}
        </div>

        {/* Compact player ready status */}
        <div className="flex flex-wrap gap-2 mb-4">
          {displayPlayers.map(p => {
            const record = roundBattles[p.userId]
            return (
              <div
                key={p.userId}
                className={`flex items-center gap-2 border rounded px-3 py-1.5 text-xs ${
                  record?.ready
                    ? 'border-pip/40 bg-pip-dim/10 text-pip'
                    : 'border-pip/20 text-pip/40'
                }`}
              >
                <span className="font-bold">{p.username}</span>
                {record?.ready ? (
                  record.noBattles ? (
                    <span className="text-muted">— no battles</span>
                  ) : (
                    <span className="text-pip">
                      {(record.matches ?? []).map(m => m.result.toUpperCase()).join(', ')}
                    </span>
                  )
                ) : (
                  <span className="text-muted italic">pending</span>
                )}
                {record?.ready && <span className="text-pip ml-1">✓</span>}
              </div>
            )
          })}
        </div>

        {/* Next Round button — creator only */}
        {(isCreator || !isOnline) && (
          <button
            onClick={handleNextRound}
            disabled={!allReady && displayPlayers.length > 1 && isOnline}
            className={`w-full py-3 text-sm font-bold tracking-widest border rounded transition-all ${
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
        )}
        {isOnline && !isCreator && (
          <div className="text-xs text-muted text-center py-2 tracking-wider">
            {displayPlayers.filter(p => roundBattles[p.userId]?.ready).length}/{displayPlayers.length} players reported — waiting for campaign creator to advance round
          </div>
        )}
      </div>

      {/* ── Campaign Narrative ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 border-b border-pip-mid/50 pb-2">
          <h2 className="text-amber text-sm tracking-widest font-bold flex-1">CAMPAIGN NARRATIVE</h2>
          {isCreator && (
            <button
              onClick={() => {
                if (!showAddCampNarrative) setNewCampEntry({ round: String(round), title: '', content: '' })
                setShowAddCampNarrative(v => !v)
              }}
              className="text-xs border border-pip/50 text-pip rounded px-3 py-1 hover:bg-pip-dim/20 transition-colors"
            >
              {showAddCampNarrative ? 'CANCEL' : '+ ADD ENTRY'}
            </button>
          )}
        </div>

        {/* Add entry form — creator only */}
        {isCreator && showAddCampNarrative && (
          <form onSubmit={handleAddCampNarrative} className="border border-amber/30 rounded bg-panel p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-label text-xs block mb-1 tracking-wider">ROUND</label>
                <input
                  type="number" min="1" value={newCampEntry.round}
                  onChange={e => setNewCampEntry(p => ({ ...p, round: e.target.value }))}
                  placeholder={String(round)}
                  className="w-full text-sm py-1.5 px-2"
                />
              </div>
              <div>
                <label className="text-label text-xs block mb-1 tracking-wider">TITLE (optional)</label>
                <input
                  value={newCampEntry.title}
                  onChange={e => setNewCampEntry(p => ({ ...p, title: e.target.value }))}
                  placeholder="The Siege of Sanctuary..."
                  className="w-full text-sm py-1.5 px-2"
                />
              </div>
            </div>
            <div>
              <label className="text-label text-xs block mb-1 tracking-wider">NARRATIVE</label>
              <textarea
                value={newCampEntry.content}
                onChange={e => setNewCampEntry(p => ({ ...p, content: e.target.value }))}
                placeholder="What happened this round..."
                rows={4}
                className="w-full text-sm py-2 px-3 resize-none"
              />
            </div>
            {campNarrativeError && (
              <div className="text-danger text-xs border border-danger/40 bg-danger/10 px-3 py-2 rounded">{campNarrativeError}</div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 border border-pip text-pip text-xs rounded hover:bg-pip-dim/20 transition-colors">
                ADD ENTRY
              </button>
            </div>
          </form>
        )}

        {/* Display box — shown entry in scripty glowing font */}
        {displayedNarrative ? (
          <div
            className="border border-white/20 rounded-lg p-6 bg-black/40"
            style={{ boxShadow: '0 0 24px rgba(255,255,255,0.08), inset 0 0 32px rgba(0,0,0,0.3)' }}
          >
            <div className="text-xs tracking-widest mb-4 opacity-50" style={{ color: 'white' }}>
              ROUND {displayedNarrative.round}
            </div>
            {displayedNarrative.title && (
              <div
                className="mb-3 text-2xl"
                style={{ fontFamily: NARRATIVE_FONT, color: 'white', textShadow: NARRATIVE_GLOW }}
              >
                {displayedNarrative.title}
              </div>
            )}
            <div
              className="text-base leading-relaxed"
              style={{ fontFamily: NARRATIVE_FONT, color: 'white', textShadow: NARRATIVE_GLOW, fontWeight: 400 }}
            >
              {displayedNarrative.content}
            </div>

            {/* Player narrative rows for the same round */}
            {(() => {
              const r = displayedNarrative.round
              const playerRows = displayPlayers.filter(p =>
                (p.narrativeLog || []).some(e => e.round === r)
              )
              if (playerRows.length === 0) return null
              return (
                <div className="mt-5 border-t border-white/10 pt-4 space-y-1">
                  <div className="text-xs tracking-widest mb-2 opacity-40" style={{ color: 'white' }}>
                    PLAYER ACCOUNTS — ROUND {r}
                  </div>
                  {playerRows.map(p => {
                    const entry = (p.narrativeLog || []).find(e => e.round === r)
                    return (
                      <div
                        key={p.userId}
                        onClick={() => setPlayerRoundNarrative({ player: p, round: r })}
                        className="flex items-center gap-3 rounded px-3 py-2 cursor-pointer hover:bg-white/5 transition-colors border border-white/5"
                      >
                        <span className="text-xs font-bold shrink-0" style={{ color: 'rgba(255,255,255,0.7)' }}>{p.username}</span>
                        <span className="text-xs truncate opacity-40" style={{ color: 'white' }}>
                          {entry?.title ? `${entry.title} — ` : ''}{entry?.content?.substring(0, 80)}
                          {(entry?.content?.length ?? 0) > 80 ? '…' : ''}
                        </span>
                        <span className="ml-auto text-xs opacity-30" style={{ color: 'white' }}>›</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="border border-pip-dim/20 rounded-lg p-6 text-center text-muted text-xs tracking-wider">
            {campaignNarratives.length === 0
              ? isCreator ? 'No narrative entries yet. Add your first entry above.' : 'No campaign narrative yet.'
              : 'No entry set to display. Toggle one in the table below.'}
          </div>
        )}

        {/* Narrative table — creator only */}
        {isCreator && campaignNarratives.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-pip-mid/40">
                  <th className="text-info tracking-wider py-2 pr-3 font-normal text-left w-12">RND</th>
                  <th className="text-info tracking-wider py-2 pr-3 font-normal text-left">TITLE / CONTENT</th>
                  <th className="text-info tracking-wider py-2 pr-3 font-normal text-center w-20">DISPLAY</th>
                  <th className="text-info tracking-wider py-2 font-normal text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {[...campaignNarratives].reverse().map(n => (
                  <tr key={n.id} className={`border-b border-pip-dim/20 hover:bg-panel-light transition-colors ${n.display ? 'bg-pip-dim/10' : ''}`}>
                    <td className="py-2.5 pr-3 text-pip font-bold">{n.round}</td>
                    <td className="py-2.5 pr-3">
                      {n.title && <div className="text-amber font-bold mb-0.5">{n.title}</div>}
                      <div className="text-pip/70 truncate max-w-xs">{n.content}</div>
                    </td>
                    <td className="py-2.5 pr-3 text-center">
                      <button
                        onClick={() => handleToggleDisplay(n.id)}
                        className={`w-10 h-5 rounded-full border transition-colors relative ${
                          n.display ? 'bg-pip border-pip' : 'bg-transparent border-muted/50'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                          n.display ? 'right-0.5 bg-black' : 'left-0.5 bg-muted/50'
                        }`} />
                      </button>
                    </td>
                    <td className="py-2.5 text-center">
                      <button onClick={() => handleDeleteCampNarrative(n.id)} className="text-muted hover:text-danger transition-colors p-1">
                        <X size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Scavenger Objectives Board ── */}
      {displayPlayers.some(p => p.activeObjectiveId != null || p.completedObjectiveIds?.length > 0) && (
        <div>
          <h2 className="text-amber text-sm tracking-widest font-bold mb-3 border-b border-pip-mid/50 pb-1">
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

    </div>
  )
}
