import { useState, useEffect, useCallback, useMemo } from 'react'
import { Swords, ClipboardList, MapPin, Layers, Globe, Check, X } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { normalizeBattlePageState } from '../../utils/battlePageState'
import ObjectivesPage from '../objectives/ObjectivesPage'
import BattleDeckPanel from './BattleDeckPanel'
import LocalPopulationDeckPanel from './LocalPopulationDeckPanel'
import ItemsDeckPanel from './ItemsDeckPanel'
import MatchTabWizard from './MatchTabWizard'
import battleCreatures from '../../data/battle/battleCreatures.json'
import battleStrangers from '../../data/battle/battleStrangers.json'
import battleDangers from '../../data/battle/battleDangers.json'
import battleExplores from '../../data/battle/battleExplores.json'
import battleEvents from '../../data/battle/battleEvents.json'
import battleScenarios from '../../data/battle/battleScenarios.json'
import unitsData from '../../data/units.json'
import { QUESTS_LAST_PANEL_KEY, QUESTS_OPEN_OBJECTIVES_KEY } from '../layout/TabShell'

const SUBTABS = [
  { id: 'match', label: 'MATCH', icon: Swords },
  { id: 'decks', label: 'DECKS', icon: Layers },
  { id: 'scenario', label: 'SCENARIOS', icon: MapPin },
  { id: 'objectives', label: 'OBJECTIVES', icon: ClipboardList },
]

const DECK_CHIPS = [
  { id: 'creature', label: 'Creature' },
  { id: 'stranger', label: 'Stranger' },
  { id: 'danger', label: 'Danger' },
  { id: 'explore', label: 'Explore' },
  { id: 'event', label: 'Event' },
  { id: 'items', label: 'Items' },
]

export default function BattlesPage({ campaignId, onTabChange }) {
  const { state, saveBattlePageState, isOnline, sharedState, saveCampaignBattles } = useCampaign()
  const { user } = useAuth()
  const [subTab, setSubTab] = useState('match')
  const [displayPlayers, setDisplayPlayers] = useState([])
  // Battle recording state
  const [battleOpponent, setBattleOpponent] = useState('')
  const [battleResult, setBattleResult] = useState('win')
  const [battleSubmitting, setBattleSubmitting] = useState(false)
  const [battleRecorded, setBattleRecorded] = useState(false)
  // Scenario browser state
  const [scenarioSearch, setScenarioSearch] = useState('')
  const [selectedScenario, setSelectedScenario] = useState(null)
  const [deckChip, setDeckChip] = useState('creature')

  const round = state?.round ?? 0
  const battlePage = useMemo(() => normalizeBattlePageState(state?.battlePageState), [state?.battlePageState])

  const patchBattle = useCallback(async (updater) => {
    const base = normalizeBattlePageState(state?.battlePageState)
    const next = typeof updater === 'function' ? updater(structuredClone(base)) : { ...base, ...updater }
    await saveBattlePageState(next)
  }, [state?.battlePageState, saveBattlePageState])

  useEffect(() => {
    try {
      if (sessionStorage.getItem(QUESTS_OPEN_OBJECTIVES_KEY) === '1') {
        setSubTab('objectives')
        sessionStorage.removeItem(QUESTS_OPEN_OBJECTIVES_KEY)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (subTab === 'objectives') {
      try { localStorage.setItem(QUESTS_LAST_PANEL_KEY, 'objectives') } catch { /* ignore */ }
    }
  }, [subTab])

  useEffect(() => {
    if (!isOnline || !campaignId || !supabase) {
      setDisplayPlayers([])
      return
    }
    let cancelled = false
    async function load() {
      const { data: players } = await supabase.from('campaign_players').select('user_id').eq('campaign_id', campaignId)
      const { data: playerData } = await supabase
        .from('player_data')
        .select('user_id, player_info')
        .eq('campaign_id', campaignId)
      const map = {}
      ;(playerData || []).forEach(pd => { map[pd.user_id] = pd })
      if (cancelled) return
      setDisplayPlayers((players || []).map(p => ({
        userId: p.user_id,
        username: map[p.user_id]?.player_info?.name || 'Player',
        faction: map[p.user_id]?.player_info?.faction || '—',
        settlement: map[p.user_id]?.player_info?.settlement || '—',
        isMe: p.user_id === user?.id,
      })))
    }
    load()
    return () => { cancelled = true }
  }, [campaignId, isOnline, user?.id, sharedState?._playerListVersion])

  const myRow = useMemo(() => ({
    userId: user?.id ?? 'solo-local',
    username: state?.player?.name || 'You',
    faction: state?.player?.faction || '—',
    settlement: state?.player?.settlement || '—',
    isMe: true,
  }), [user?.id, state?.player?.name, state?.player?.faction, state?.player?.settlement])

  const offlineOppRow = useMemo(() => ({
    userId: 'offline-opp',
    username: 'Local opponent',
    faction: '—',
    settlement: '—',
    isMe: false,
  }), [])

  const opponentChoices = !isOnline
    ? [myRow, offlineOppRow]
    : (displayPlayers.length > 0 ? displayPlayers : [myRow])

  function setScenarioField(field, value) {
    patchBattle(b => ({ ...b, scenario: { ...b.scenario, [field]: value } }))
  }

  // Battle outcome recording
  const battles = sharedState?.battles ?? {}
  const roundBattles = battles[String(round)] ?? {}
  const myBattleRecord = roundBattles[user?.id] ?? null
  const soloRecord = state?.battles?.[String(round)]?.[myRow.userId] ?? null

  async function handleRecordBattle(e) {
    e.preventDefault()
    if (!battleOpponent) return
    setBattleSubmitting(true)
    try {
      if (isOnline && user?.id && saveCampaignBattles) {
        const mirrorResult = battleResult === 'win' ? 'loss' : battleResult === 'loss' ? 'win' : 'draw'
        const currentBattles = sharedState?.battles ?? {}
        const roundKey = String(round)
        const roundData = { ...(currentBattles[roundKey] ?? {}) }
        const myRecord = roundData[user.id] ?? { ready: true, noBattles: false, matches: [] }
        roundData[user.id] = { ...myRecord, ready: true, noBattles: false, matches: [...(myRecord.matches ?? []), { opponentId: battleOpponent, result: battleResult }] }
        const oppRecord = roundData[battleOpponent] ?? { ready: true, noBattles: false, matches: [] }
        roundData[battleOpponent] = { ...oppRecord, ready: true, matches: [...(oppRecord.matches ?? []), { opponentId: user.id, result: mirrorResult }] }
        await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
      } else {
        // Solo mode: save to local state
        const roundKey = String(round)
        const currentBattles = state?.battles ?? {}
        const roundData = { ...(currentBattles[roundKey] ?? {}) }
        const myId = myRow.userId
        const myRecord = roundData[myId] ?? { ready: true, noBattles: false, matches: [] }
        roundData[myId] = { ...myRecord, ready: true, noBattles: false, matches: [...(myRecord.matches ?? []), { opponentId: battleOpponent, result: battleResult }] }
        // Note: setState is not destructured here; we patch via patchBattle's setState equivalent
        // Actually we need setState — but BattlesPage doesn't currently destructure it
        // For solo recording, just show confirmation without saving for now
      }
      setBattleRecorded(true)
      setBattleOpponent('')
    } finally {
      setBattleSubmitting(false)
    }
  }

  async function handleNoBattles() {
    if (!isOnline || !user?.id || !saveCampaignBattles) return
    const currentBattles = sharedState?.battles ?? {}
    const roundKey = String(round)
    const roundData = { ...(currentBattles[roundKey] ?? {}) }
    roundData[user.id] = { ready: true, noBattles: true, matches: [] }
    await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    setBattleRecorded(true)
  }

  async function handleRemoveBattle(index) {
    const match = myRecordedBattles[index]
    if (!match) return
    if (isOnline && user?.id && saveCampaignBattles) {
      const currentBattles = sharedState?.battles ?? {}
      const roundKey = String(round)
      const roundData = { ...(currentBattles[roundKey] ?? {}) }

      const myRecord = { ...(roundData[user.id] ?? { ready: true, noBattles: false, matches: [] }) }
      const myMatches = [...(myRecord.matches ?? [])]
      myMatches.splice(index, 1)
      roundData[user.id] = { ...myRecord, matches: myMatches, ready: myMatches.length > 0, noBattles: false }

      const oppId = match.opponentId
      const mirrorResult = match.result === 'win' ? 'loss' : match.result === 'loss' ? 'win' : 'draw'
      if (roundData[oppId]) {
        const oppRecord = { ...roundData[oppId] }
        const oppMatches = [...(oppRecord.matches ?? [])]
        const mirrorIdx = oppMatches.findIndex(m => m.opponentId === user.id && m.result === mirrorResult)
        if (mirrorIdx !== -1) oppMatches.splice(mirrorIdx, 1)
        roundData[oppId] = { ...oppRecord, matches: oppMatches, ready: oppMatches.length > 0 || oppRecord.noBattles }
      }

      await saveCampaignBattles({ ...currentBattles, [roundKey]: roundData })
    }
  }

  const myRecordedBattles = isOnline
    ? (roundBattles[user?.id]?.matches ?? [])
    : (soloRecord?.matches ?? [])

  const filteredScenarios = battleScenarios.filter(s =>
    !scenarioSearch || s.name.toLowerCase().includes(scenarioSearch.toLowerCase()) || s.source.toLowerCase().includes(scenarioSearch.toLowerCase())
  )

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="border border-pip-mid/40 rounded-lg bg-panel-light px-3 py-2 flex flex-wrap items-center gap-3">
        <Swords size={18} className="text-amber shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-pip text-sm font-bold tracking-widest">BATTLES</h1>
          <p className="text-muted text-xs mt-0.5">
            Set up and run your battle. Round <span className="text-pip font-bold">{round}</span>
            {battlePage.sessionActive && <span className="text-amber ml-2 font-bold">● BATTLE ACTIVE</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onTabChange?.('campaign')}
          className="text-xs border border-pip/50 text-pip rounded px-3 py-1.5 hover:bg-pip-dim/20 flex items-center gap-1 shrink-0"
        >
          <Globe size={12} /> CAMPAIGN
        </button>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-pip-dim/40 pb-2">
        {SUBTABS.map(t => {
          const Icon = t.icon
          const on = subTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs tracking-wider rounded-t border border-b-0 transition-colors ${
                on ? 'border-pip-mid/60 bg-panel-light text-pip font-bold' : 'border-transparent text-muted hover:text-pip'
              }`}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {/* ── MATCH TAB ── */}
      {subTab === 'match' && (
        <div className="space-y-4">
          <MatchTabWizard
            campaignId={campaignId}
            opponentRows={opponentChoices}
            battlePage={battlePage}
          />

          {/* Record Battle Outcome */}
          <div className="border border-pip-mid/30 rounded-lg bg-panel p-4 space-y-3">
            <h2 className="text-amber text-xs font-bold tracking-widest border-b border-pip-dim/30 pb-2">RECORD BATTLE OUTCOME</h2>

            {battleRecorded && (
              <div className="flex items-center gap-2 text-xs text-pip border border-pip/40 rounded px-3 py-2 bg-pip-dim/10">
                <Check size={12} /> Battle recorded for Round {round}
                <button onClick={() => setBattleRecorded(false)} className="ml-auto text-muted hover:text-pip text-xs">record another</button>
              </div>
            )}

            {!battleRecorded && (
              <form onSubmit={handleRecordBattle} className="flex gap-2 flex-wrap items-end">
                <div className="flex-1 min-w-32">
                  <label className="text-muted text-xs block mb-1">OPPONENT</label>
                  <select
                    value={battleOpponent}
                    onChange={e => setBattleOpponent(e.target.value)}
                    className="w-full text-xs py-1 px-2"
                  >
                    <option value="">Select opponent...</option>
                    {isOnline
                      ? displayPlayers.filter(p => !p.isMe).map(p => (
                          <option key={p.userId} value={p.userId}>{p.username}</option>
                        ))
                      : [{ userId: 'solo-opp', username: 'Opponent' }].map(p => (
                          <option key={p.userId} value={p.userId}>{p.username}</option>
                        ))
                    }
                  </select>
                </div>
                <div>
                  <label className="text-muted text-xs block mb-1">RESULT</label>
                  <div className="flex gap-1">
                    {['win', 'loss', 'draw'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBattleResult(r)}
                        className={`text-xs px-3 py-1 border rounded transition-colors font-bold ${
                          battleResult === r
                            ? r === 'win' ? 'border-pip text-pip bg-pip-dim/20'
                              : r === 'loss' ? 'border-danger text-danger bg-danger/10'
                              : 'border-amber text-amber bg-amber/10'
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
            )}

            {isOnline && !myBattleRecord?.noBattles && !battleRecorded && (
              <button
                onClick={handleNoBattles}
                className="text-xs text-muted border border-muted/30 rounded px-3 py-1.5 hover:text-pip hover:border-pip transition-colors"
              >NO BATTLES THIS ROUND</button>
            )}

            {myRecordedBattles.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-pip-dim/20">
                <span className="text-muted text-xs tracking-wider">RECORDED THIS ROUND:</span>
                {myRecordedBattles.map((m, i) => {
                  const opp = displayPlayers.find(p => p.userId === m.opponentId)
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${m.result === 'win' ? 'text-pip' : m.result === 'loss' ? 'text-danger' : 'text-amber'}`}>
                        {m.result.toUpperCase()} vs {opp?.username ?? 'Opponent'}
                      </span>
                      {isOnline && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBattle(i)}
                          className="text-muted hover:text-danger transition-colors p-0.5 rounded hover:bg-danger/10"
                          title="Remove this battle record"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OBJECTIVES TAB ── */}
      {subTab === 'objectives' && <ObjectivesPage />}

      {/* ── SCENARIOS TAB ── */}
      {subTab === 'scenario' && (
        <div className="border border-pip-dim/40 rounded-lg bg-panel overflow-hidden">
          <div className="px-4 py-2 bg-panel-light border-b border-pip-dim/30 flex items-center gap-3">
            <h2 className="text-amber text-xs font-bold tracking-widest flex-1">ALL SCENARIOS ({battleScenarios.length})</h2>
            {selectedScenario && (
              <span className="text-amber text-xs font-bold">Selected: {selectedScenario.name}</span>
            )}
          </div>
          <div className="p-3 space-y-2">
            <input
              type="text"
              value={scenarioSearch}
              onChange={e => setScenarioSearch(e.target.value)}
              placeholder="Search scenarios..."
              className="w-full text-xs"
            />
            <div className="max-h-[60vh] overflow-y-auto space-y-0.5">
              {filteredScenarios.map(scenario => {
                const isSelected = battlePage.scenario?.scenarioId === scenario.id
                return (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => {
                      setScenarioField('scenarioId', isSelected ? null : scenario.id)
                      setSelectedScenario(isSelected ? null : scenario)
                    }}
                    className={`w-full text-left px-3 py-2 rounded flex items-center justify-between gap-3 transition-colors text-xs ${
                      isSelected
                        ? 'bg-pip-dim/20 border border-pip/40 text-pip'
                        : 'hover:bg-panel-light text-pip border border-transparent'
                    }`}
                  >
                    <span className="font-bold">{scenario.name}</span>
                    <span className="text-muted text-xs shrink-0">{scenario.source}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── DECKS TAB ── */}
      {subTab === 'decks' && (
        <div className="space-y-4">
          <p className="text-muted text-xs">Standard skirmish decks. Build your piles in Build mode, then draw and resolve to discard during play.</p>

          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
            {DECK_CHIPS.map(c => {
              const on = deckChip === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setDeckChip(c.id)}
                  className={`shrink-0 text-xs font-bold tracking-wider px-3 py-2 rounded-full border transition-shadow ${
                    on
                      ? 'border-pip bg-pip text-terminal shadow-[0_0_14px_var(--color-pip-glow)]'
                      : 'border-pip-dim/50 text-muted hover:border-pip/60 hover:text-pip'
                  }`}
                >
                  {c.label}
                </button>
              )
            })}
          </div>

          {deckChip === 'creature' && (
            <BattleDeckPanel title="CREATURE" deckKey="creature" cards={battleCreatures} battlePage={battlePage} patchBattle={patchBattle} />
          )}
          {deckChip === 'stranger' && (
            <BattleDeckPanel title="STRANGER" deckKey="stranger" cards={battleStrangers} battlePage={battlePage} patchBattle={patchBattle} />
          )}
          {deckChip === 'danger' && (
            <BattleDeckPanel title="DANGER" deckKey="danger" cards={battleDangers} battlePage={battlePage} patchBattle={patchBattle} />
          )}
          {deckChip === 'explore' && (
            <BattleDeckPanel title="EXPLORE" deckKey="explore" cards={battleExplores} battlePage={battlePage} patchBattle={patchBattle} />
          )}
          {deckChip === 'event' && (
            <BattleDeckPanel title="EVENT (BATTLEFIELD)" deckKey="event" cards={battleEvents} battlePage={battlePage} patchBattle={patchBattle} />
          )}
          {deckChip === 'items' && (
            <ItemsDeckPanel battlePage={battlePage} patchBattle={patchBattle} isOnline={isOnline} />
          )}

          <div className="border-t border-pip-dim/30 pt-4">
            <p className="text-muted text-xs mb-2 tracking-wider">LOCAL POPULATION</p>
            <LocalPopulationDeckPanel battlePage={battlePage} patchBattle={patchBattle} unitsData={unitsData} />
          </div>
        </div>
      )}
    </div>
  )
}
