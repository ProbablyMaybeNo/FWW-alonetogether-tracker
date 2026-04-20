import { useState } from 'react'
import { ChevronLeft, Swords } from 'lucide-react'
import { defaultActiveBattle, deckStatesFromBattlePage, shuffleArray } from '../../utils/activeBattle'
import { normalizeBattlePageState } from '../../utils/battlePageState'
import battleEnvironments from '../../data/battle/battleEnvironments.json'
import battleBattlefields from '../../data/battle/battleBattlefields.json'
import battlePurposes from '../../data/battle/battlePurposes.json'
import battleScenarios from '../../data/battle/battleScenarios.json'

const GAME_MODES = [
  { id: 'skirmish', label: 'Skirmish' },
  { id: 'wasteland', label: 'Into the Wasteland' },
  { id: 'vault', label: 'Into the Vault' },
]

export default function BattleSetupPanel({
  targetPlayer,
  currentUserId,
  battlePage,
  saveActiveBattle,
  onClose,
}) {
  const isOffline = !targetPlayer || targetPlayer.userId === 'offline-opp'

  const [scenario, setScenario] = useState({
    environmentId: null, battlefieldId: null, purposeId: null, scenarioId: null,
  })
  const [pointsLimit, setPointsLimit] = useState(500)
  const [turnLimit, setTurnLimit] = useState(null)
  const [gameMode, setGameMode] = useState('skirmish')
  const [wastelandItemsCount, setWastelandItemsCount] = useState(6)
  const [wastelandRaw, setWastelandRaw] = useState('6')
  const [decksEnabled, setDecksEnabled] = useState({
    creature: true, stranger: true, danger: true, explore: true, event: true,
  })
  const [sending, setSending] = useState(false)

  function commitWasteland(raw) {
    let v = Number(raw)
    if (Number.isNaN(v) || v < 2) v = 2
    v = Math.min(20, v)
    if (v % 2 !== 0) v = v - 1
    setWastelandItemsCount(v)
    setWastelandRaw(String(v))
  }

  async function handleSend() {
    setSending(true)
    try {
      const targetId = isOffline ? null : targetPlayer?.userId
      const opponentIds = targetId ? [targetId] : []

      // Build deck states from the challenger's pre-configured decks
      const bp = normalizeBattlePageState(battlePage)
      const ab = defaultActiveBattle()
      const mergedDecks = deckStatesFromBattlePage(bp, ab)
      for (const k of ['creature', 'stranger', 'danger', 'explore', 'event']) {
        if (decksEnabled[k] === false) {
          mergedDecks[k] = { drawPile: [], discardPile: [], lastDrawn: null }
        }
      }

      const payload = {
        ...ab,
        status: isOffline ? 'roster_build' : 'pending',
        lastUpdatedBy: currentUserId,
        deckStates: mergedDecks,
        setup: {
          ...ab.setup,
          challengerId: currentUserId,
          participantUserIds: [currentUserId, ...opponentIds],
          opponentUserIds: opponentIds,
          scenario,
          pointsLimit,
          turnLimit,
          gameMode,
          wastelandItemsCount,
          decksEnabled,
          counterProposal: null,
        },
      }

      await saveActiveBattle(payload)
      onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="text-muted hover:text-pip transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-title text-xs font-bold tracking-widest flex-1">
          BATTLE SETUP
          {!isOffline && targetPlayer && (
            <span className="text-pip ml-2">vs {targetPlayer.username}</span>
          )}
        </h2>
      </div>

      <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
        <h3 className="text-title font-bold tracking-wider">SCENARIO</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="space-y-0.5">
            <span className="text-muted">Environment</span>
            <select value={scenario.environmentId ?? ''} onChange={e => setScenario(p => ({ ...p, environmentId: e.target.value ? Number(e.target.value) : null }))} className="w-full text-xs">
              <option value="">—</option>
              {battleEnvironments.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Battlefield</span>
            <select value={scenario.battlefieldId ?? ''} onChange={e => setScenario(p => ({ ...p, battlefieldId: e.target.value ? Number(e.target.value) : null }))} className="w-full text-xs">
              <option value="">—</option>
              {battleBattlefields.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Purpose</span>
            <select value={scenario.purposeId ?? ''} onChange={e => setScenario(p => ({ ...p, purposeId: e.target.value ? Number(e.target.value) : null }))} className="w-full text-xs">
              <option value="">—</option>
              {battlePurposes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Scenario</span>
            <select value={scenario.scenarioId ?? ''} onChange={e => setScenario(p => ({ ...p, scenarioId: e.target.value ? Number(e.target.value) : null }))} className="w-full text-xs">
              <option value="">—</option>
              {battleScenarios.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
        <h3 className="text-title font-bold tracking-wider">CONFIGURATION</h3>
        <div className="flex flex-wrap gap-3">
          <label className="space-y-0.5">
            <span className="text-muted">Caps limit</span>
            <input type="number" min={50} step={50} value={pointsLimit} onChange={e => setPointsLimit(Number(e.target.value) || 500)} className="w-24 text-xs" />
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Turn limit</span>
            <input type="number" min={1} value={turnLimit ?? ''} onChange={e => setTurnLimit(e.target.value === '' ? null : Number(e.target.value))} className="w-20 text-xs" placeholder="none" />
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Game mode</span>
            <select value={gameMode} onChange={e => setGameMode(e.target.value)} className="text-xs">
              {GAME_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="space-y-0.5">
            <span className="text-muted">Wasteland cards / player</span>
            <input
              type="number"
              min={2}
              max={20}
              step={2}
              value={wastelandRaw}
              onChange={e => setWastelandRaw(e.target.value)}
              onBlur={e => commitWasteland(e.target.value)}
              className="w-20 text-xs"
            />
          </label>
        </div>
      </div>

      <div className="border border-pip-dim/40 rounded-lg bg-panel-light p-3 space-y-2 text-xs">
        <h3 className="text-title font-bold tracking-wider">DECKS IN PLAY</h3>
        <div className="flex flex-wrap gap-4">
          {['creature', 'stranger', 'danger', 'explore', 'event'].map(key => (
            <label key={key} className="flex items-center gap-1.5 cursor-pointer min-h-[44px]">
              <input type="checkbox" checked={decksEnabled[key]} onChange={() => setDecksEnabled(p => ({ ...p, [key]: !p[key] }))} />
              <span className="uppercase">{key}</span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full py-4 rounded-lg font-bold tracking-[0.2em] text-sm border-2 border-amber/80 bg-amber/15 text-amber shadow-[0_0_24px_rgba(245,158,11,0.35)] disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
      >
        <Swords size={18} />
        {isOffline ? 'START BATTLE' : sending ? 'SENDING...' : 'SEND CHALLENGE'}
      </button>
    </div>
  )
}
