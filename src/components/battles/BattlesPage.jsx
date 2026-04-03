import { useState, useEffect, useCallback, useMemo } from 'react'
import { Swords, ClipboardList, MapPin, Layers, Globe } from 'lucide-react'
import { useCampaign } from '../../context/CampaignContext'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { normalizeBattlePageState, defaultBattlePageState } from '../../utils/battlePageState'
import ObjectivesPage from '../objectives/ObjectivesPage'
import InhabitantsDeckSection from '../campaign/InhabitantsDeckSection'
import CardDrawer from '../overview/CardDrawer'
import ActiveEvents from '../overview/ActiveEvents'
import BattleDeckPanel from './BattleDeckPanel'
import LocalPopulationDeckPanel from './LocalPopulationDeckPanel'
import WastelandItemBattleDeck from './WastelandItemBattleDeck'
import battleCreatures from '../../data/battle/battleCreatures.json'
import battleStrangers from '../../data/battle/battleStrangers.json'
import battleDangers from '../../data/battle/battleDangers.json'
import battleExplores from '../../data/battle/battleExplores.json'
import battleEvents from '../../data/battle/battleEvents.json'
import battleEnvironments from '../../data/battle/battleEnvironments.json'
import battleBattlefields from '../../data/battle/battleBattlefields.json'
import battlePurposes from '../../data/battle/battlePurposes.json'
import unitsData from '../../data/units.json'

const SUBTABS = [
  { id: 'setup', label: 'SETUP', icon: Swords },
  { id: 'objectives', label: 'OBJECTIVES & QUESTS', icon: ClipboardList },
  { id: 'scenario', label: 'SCENARIO', icon: MapPin },
  { id: 'decks', label: 'DECKS', icon: Layers },
]

export default function BattlesPage({ campaignId, onTabChange }) {
  const { state, saveBattlePageState, isOnline, sharedState } = useCampaign()
  const { user } = useAuth()
  const [subTab, setSubTab] = useState('setup')
  const [displayPlayers, setDisplayPlayers] = useState([])

  const round = state?.round ?? 0
  const battlePage = useMemo(() => normalizeBattlePageState(state?.battlePageState), [state?.battlePageState])

  const patchBattle = useCallback(async (updater) => {
    const base = normalizeBattlePageState(state?.battlePageState)
    const next = typeof updater === 'function' ? updater(structuredClone(base)) : { ...base, ...updater }
    await saveBattlePageState(next)
  }, [state?.battlePageState, saveBattlePageState])

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
        isMe: p.user_id === user?.id,
      })))
    }
    load()
    return () => { cancelled = true }
  }, [campaignId, isOnline, user?.id, sharedState?._playerListVersion])

  const myRow = useMemo(() => ({
    userId: user?.id ?? 'solo-local',
    username: state?.player?.name || 'You',
    isMe: true,
  }), [user?.id, state?.player?.name])

  const opponentChoices = displayPlayers.length > 0 ? displayPlayers : [myRow]

  function toggleOpponent(id) {
    patchBattle(b => {
      const cur = new Set(b.setup.opponentUserIds || [])
      if (cur.has(id)) cur.delete(id)
      else cur.add(id)
      return { ...b, setup: { ...b.setup, opponentUserIds: [...cur] } }
    })
  }

  async function handleStartBattle() {
    await patchBattle(b => ({
      ...b,
      sessionActive: true,
      sessionStartedAt: Date.now(),
    }))
  }

  async function handleEndBattle() {
    const d = defaultBattlePageState()
    await patchBattle(b => ({
      ...d,
      setup: b.setup,
      scenario: b.scenario,
      sessionActive: false,
      sessionStartedAt: null,
    }))
  }

  function setScenarioField(field, value) {
    patchBattle(b => ({
      ...b,
      scenario: { ...b.scenario, [field]: value },
    }))
  }

  const envVal = battlePage.scenario.environmentId
  const bfVal = battlePage.scenario.battlefieldId
  const purpVal = battlePage.scenario.purposeId

  return (
    <div className="p-4 space-y-4 max-w-5xl mx-auto">
      <div className="border border-pip-mid/40 rounded-lg bg-panel-light px-3 py-2 flex flex-wrap items-center gap-3">
        <Swords size={18} className="text-amber shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-pip text-sm font-bold tracking-widest">BATTLES</h1>
          <p className="text-muted text-[10px] mt-0.5">
            Run table games: decks, scenario, objectives. Round <span className="text-pip font-bold">{round}</span> (shared from Campaign).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onTabChange?.('campaign')}
          className="text-xs border border-pip/50 text-pip rounded px-3 py-1.5 hover:bg-pip-dim/20 flex items-center gap-1 shrink-0"
        >
          <Globe size={12} /> REPORT ON CAMPAIGN
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
              className={`flex items-center gap-1.5 px-3 py-2 text-[10px] sm:text-xs tracking-wider rounded-t border border-b-0 transition-colors ${
                on ? 'border-pip-mid/60 bg-panel-light text-pip font-bold' : 'border-transparent text-muted hover:text-pip'
              }`}
            >
              <Icon size={12} /> {t.label}
            </button>
          )
        })}
      </div>

      {subTab === 'setup' && (
        <div className="space-y-4">
          <div className="border border-pip-dim/40 rounded-lg bg-panel p-4 space-y-3">
            <h2 className="text-pip text-xs font-bold tracking-widest border-b border-pip-dim/30 pb-2">GAME MODE</h2>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs border border-amber/60 text-amber px-3 py-1.5 rounded font-bold bg-amber/10">
                BASIC SKIRMISH
              </span>
              <span className="text-muted text-[10px] self-center">More modes later</span>
            </div>
          </div>

          <div className="border border-pip-dim/40 rounded-lg bg-panel p-4 space-y-3">
            <h2 className="text-pip text-xs font-bold tracking-widest border-b border-pip-dim/30 pb-2">OPPONENTS THIS GAME</h2>
            <p className="text-muted text-[10px]">Select any players at the table (stored for this device / shared campaign).</p>
            <div className="flex flex-wrap gap-2">
              {opponentChoices.map(p => (
                <label key={p.userId || p.username} className="flex items-center gap-2 text-xs cursor-pointer border border-pip-dim/40 rounded px-2 py-1">
                  <input
                    type="checkbox"
                    checked={(battlePage.setup.opponentUserIds || []).includes(p.userId)}
                    onChange={() => toggleOpponent(p.userId)}
                    disabled={p.isMe}
                  />
                  <span className={p.isMe ? 'text-muted' : 'text-pip'}>{p.username}{p.isMe ? ' (you)' : ''}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="border border-pip-dim/40 rounded-lg bg-panel p-4 flex flex-wrap gap-3 items-center">
            <span className="text-xs text-muted">
              Session:{' '}
              <strong className={battlePage.sessionActive ? 'text-pip' : 'text-muted'}>
                {battlePage.sessionActive ? 'ACTIVE' : 'IDLE'}
              </strong>
            </span>
            <button
              type="button"
              onClick={handleStartBattle}
              disabled={battlePage.sessionActive}
              className="text-xs border border-pip text-pip font-bold px-4 py-2 rounded hover:bg-pip-dim/20 disabled:opacity-40"
            >
              START BATTLE
            </button>
            <button
              type="button"
              onClick={handleEndBattle}
              disabled={!battlePage.sessionActive}
              className="text-xs border border-danger/50 text-danger font-bold px-4 py-2 rounded hover:bg-danger/10 disabled:opacity-40"
            >
              END BATTLE (reset deck piles)
            </button>
          </div>
        </div>
      )}

      {subTab === 'objectives' && <ObjectivesPage />}

      {subTab === 'scenario' && (
        <div className="border border-pip-dim/40 rounded-lg bg-panel p-4 space-y-4">
          <h2 className="text-pip text-xs font-bold tracking-widest">BATTLEFIELD SETUP (NAMES ONLY)</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-muted text-[10px] block mb-1">ENVIRONMENT</label>
              <select
                value={envVal ?? ''}
                onChange={e => setScenarioField('environmentId', e.target.value ? Number(e.target.value) : null)}
                className="w-full text-xs"
              >
                <option value="">—</option>
                {battleEnvironments.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted text-[10px] block mb-1">BATTLEFIELD</label>
              <select
                value={bfVal ?? ''}
                onChange={e => setScenarioField('battlefieldId', e.target.value ? Number(e.target.value) : null)}
                className="w-full text-xs"
              >
                <option value="">—</option>
                {battleBattlefields.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-muted text-[10px] block mb-1">PURPOSE</label>
              <select
                value={purpVal ?? ''}
                onChange={e => setScenarioField('purposeId', e.target.value ? Number(e.target.value) : null)}
                className="w-full text-xs"
              >
                <option value="">—</option>
                {battlePurposes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {subTab === 'decks' && (
        <div className="space-y-6">
          <p className="text-muted text-xs">
            Standard skirmish decks (names only). Card rules can be added later. Shuffle before play; draw and resolve to discard.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <BattleDeckPanel title="CREATURE" deckKey="creature" cards={battleCreatures} battlePage={battlePage} patchBattle={patchBattle} />
            <BattleDeckPanel title="STRANGER" deckKey="stranger" cards={battleStrangers} battlePage={battlePage} patchBattle={patchBattle} />
            <BattleDeckPanel title="DANGER" deckKey="danger" cards={battleDangers} battlePage={battlePage} patchBattle={patchBattle} />
            <BattleDeckPanel title="EXPLORE (BATTLE)" deckKey="explore" cards={battleExplores} battlePage={battlePage} patchBattle={patchBattle} />
            <BattleDeckPanel title="EVENT (BATTLEFIELD)" deckKey="event" cards={battleEvents} battlePage={battlePage} patchBattle={patchBattle} />
          </div>

          <LocalPopulationDeckPanel battlePage={battlePage} patchBattle={patchBattle} unitsData={unitsData} />

          <WastelandItemBattleDeck battlePage={battlePage} patchBattle={patchBattle} isOnline={isOnline} />

          <InhabitantsDeckSection round={round} />

          <div>
            <h2 className="text-pip text-sm tracking-widest font-bold mb-2 border-b border-pip-mid/50 pb-1">
              HANDBOOK EXPLORE / SETTLEMENT DRAWS
            </h2>
            <p className="text-muted text-xs mb-3 italic">
              Track event cards on your roster; draws here add to active consequences for the handbook explore deck.
            </p>
            <div className="grid md:grid-cols-2 gap-3 mb-4">
              <CardDrawer deckType="explore" title="DRAW EXPLORE CARD" />
              {state?.settings?.useEventCards && (
                <CardDrawer deckType="settlement" title="DRAW SETTLEMENT EVENT" />
              )}
            </div>
            <ActiveEvents />
          </div>
        </div>
      )}
    </div>
  )
}
