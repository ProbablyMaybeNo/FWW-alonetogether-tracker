import { useState, useEffect, useCallback, useMemo } from 'react'
import { Swords, ClipboardList, MapPin, Layers, Globe } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { normalizeBattlePageState } from '../../utils/battlePageState'
import ObjectivesPage from '../objectives/ObjectivesPage'
import BattleDeckPanel from './BattleDeckPanel'
import LocalPopulationDeckPanel from './LocalPopulationDeckPanel'
import MatchTab from './MatchTab'
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
]

export default function BattlesPage({ campaignId, onTabChange }) {
  const { state, saveBattlePageState, isOnline, sharedState, saveActiveBattle } = useCampaign()
  const { user } = useAuth()
  const [subTab, setSubTab] = useState('match')
  const [displayPlayers, setDisplayPlayers] = useState([])
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
        <MatchTab
          opponentRows={opponentChoices}
          isOnline={isOnline}
          activeBattle={state?.activeBattle ?? null}
          saveActiveBattle={saveActiveBattle}
          currentUserId={user?.id ?? 'solo-local'}
          battlePage={battlePage}
        />
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
          <div className="border-t border-pip-dim/30 pt-4">
            <p className="text-muted text-xs mb-2 tracking-wider">LOCAL POPULATION</p>
            <LocalPopulationDeckPanel battlePage={battlePage} patchBattle={patchBattle} unitsData={unitsData} />
          </div>
        </div>
      )}
    </div>
  )
}
