import { useState } from 'react'
import { Swords, Clock, Check, X } from 'lucide-react'
import { normalizeActiveBattle } from '../../utils/activeBattle'
import BattleSetupPanel from './BattleSetupPanel'
import battleScenarios from '../../data/battle/battleScenarios.json'

export default function MatchTab({
  opponentRows,
  isOnline,
  activeBattle: activeBattleProp,
  saveActiveBattle,
  currentUserId,
  battlePage,
}) {
  const [setupTargetId, setSetupTargetId] = useState(null)
  const [countering, setCountering] = useState(false)
  const [counterCaps, setCounterCaps] = useState(500)

  const ab = normalizeActiveBattle(activeBattleProp)
  const status = activeBattleProp?.status ?? null
  const challengerId = ab.setup?.challengerId ?? null
  const opponentIds = ab.setup?.opponentUserIds ?? []
  const counterProposal = ab.setup?.counterProposal ?? null

  const iAmChallenger = challengerId === currentUserId
  const iAmOpponent = !iAmChallenger && opponentIds.includes(currentUserId)

  const opponents = opponentRows.filter(p => !p.isMe)
  const challengerRow = opponentRows.find(p => p.userId === challengerId)
  const opponentRow = opponentRows.find(p => opponentIds.includes(p.userId) && p.userId !== currentUserId)

  async function cancelBattle() {
    await saveActiveBattle(null)
  }

  async function acceptChallenge() {
    const base = normalizeActiveBattle(activeBattleProp)
    const updatedSetup = counterProposal
      ? { ...base.setup, pointsLimit: counterProposal.pointsLimit, counterProposal: null }
      : { ...base.setup, counterProposal: null }
    await saveActiveBattle({
      ...base,
      status: 'roster_build',
      lastUpdatedBy: currentUserId,
      setup: updatedSetup,
    })
  }

  async function sendCounter() {
    const base = normalizeActiveBattle(activeBattleProp)
    await saveActiveBattle({
      ...base,
      lastUpdatedBy: currentUserId,
      setup: {
        ...base.setup,
        counterProposal: { pointsLimit: counterCaps, proposedBy: currentUserId },
      },
    })
    setCountering(false)
  }

  // Battle in progress — just show a status card (tracker is the full-screen overlay)
  if (status === 'active' || status === 'roster_build') {
    const label = status === 'roster_build' ? 'BUILDING ROSTERS' : 'BATTLE IN PROGRESS'
    return (
      <div className="border border-amber/40 rounded-lg bg-panel p-6 text-center space-y-2">
        <Swords size={20} className="text-amber mx-auto" />
        <p className="text-amber text-sm font-bold tracking-wider">● {label}</p>
        <p className="text-muted text-xs">The battle tracker is open as an overlay.</p>
      </div>
    )
  }

  // Setup panel open (challenging a player)
  if (setupTargetId !== null) {
    const target = opponentRows.find(p => p.userId === setupTargetId) ?? null
    return (
      <BattleSetupPanel
        targetPlayer={target}
        currentUserId={currentUserId}
        battlePage={battlePage}
        saveActiveBattle={saveActiveBattle}
        onClose={() => setSetupTargetId(null)}
      />
    )
  }

  // I sent a challenge — waiting for opponent
  if ((status === 'pending' || status === 'setup') && iAmChallenger) {
    const scenarioName = battleScenarios.find(s => s.id === ab.setup.scenario?.scenarioId)?.name
    const hasCounter = counterProposal && counterProposal.proposedBy !== currentUserId

    if (hasCounter) {
      return (
        <div className="border border-amber/50 rounded-lg bg-panel p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-amber" />
            <span className="text-amber text-xs font-bold tracking-wider">COUNTER-PROPOSAL RECEIVED</span>
          </div>
          <div className="space-y-1 text-xs">
            <p className="text-muted">Your caps limit: <span className="text-pip">{ab.setup.pointsLimit}</span></p>
            <p className="text-muted">Counter-proposal: <span className="text-amber font-bold">{counterProposal.pointsLimit} caps</span></p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={acceptChallenge}
              className="flex-1 text-xs border border-pip text-pip font-bold py-2.5 rounded hover:bg-pip/10 transition-colors"
            >
              ACCEPT COUNTER
            </button>
            <button
              onClick={cancelBattle}
              className="flex-1 text-xs border border-danger/50 text-danger font-bold py-2.5 rounded hover:bg-danger/10 transition-colors"
            >
              CANCEL BATTLE
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="border border-pip/40 rounded-lg bg-panel p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-pip" />
          <span className="text-pip text-xs font-bold tracking-wider">CHALLENGE SENT</span>
        </div>
        <div className="space-y-1 text-xs text-muted">
          <p>Opponent: <span className="text-pip font-bold">{opponentRow?.username ?? 'Player'}</span></p>
          {scenarioName && <p>Scenario: <span className="text-pip">{scenarioName}</span></p>}
          <p>Caps limit: <span className="text-pip">{ab.setup.pointsLimit}</span></p>
          <p>Wasteland cards: <span className="text-pip">{ab.setup.wastelandItemsCount} per player</span></p>
        </div>
        <p className="text-muted text-xs italic">Waiting for opponent to respond…</p>
        <button
          onClick={cancelBattle}
          className="text-xs border border-muted/30 text-muted px-4 py-2 rounded hover:text-danger hover:border-danger transition-colors min-h-[44px]"
        >
          CANCEL CHALLENGE
        </button>
      </div>
    )
  }

  // I received a challenge
  if ((status === 'pending' || status === 'setup') && iAmOpponent) {
    const scenario = battleScenarios.find(s => s.id === ab.setup.scenario?.scenarioId)

    if (countering) {
      return (
        <div className="border border-amber/40 rounded-lg bg-panel p-4 space-y-3">
          <h3 className="text-amber text-xs font-bold tracking-wider">PROPOSE COUNTER</h3>
          <label className="block space-y-1">
            <span className="text-muted text-xs">Your proposed caps limit</span>
            <input
              type="number"
              min={50}
              step={50}
              value={counterCaps}
              onChange={e => setCounterCaps(Number(e.target.value) || 500)}
              className="w-full text-xs"
            />
          </label>
          <div className="flex gap-2">
            <button
              onClick={sendCounter}
              className="flex-1 text-xs border border-amber text-amber font-bold py-2.5 rounded hover:bg-amber/10 min-h-[44px]"
            >
              SEND COUNTER
            </button>
            <button
              onClick={() => setCountering(false)}
              className="flex-1 text-xs border border-muted/30 text-muted py-2.5 rounded hover:text-pip hover:border-pip min-h-[44px]"
            >
              BACK
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="border border-amber/50 rounded-lg bg-panel p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Swords size={14} className="text-amber" />
          <span className="text-amber text-xs font-bold tracking-wider">CHALLENGE RECEIVED</span>
        </div>
        <div className="space-y-1 text-xs text-muted">
          <p>From: <span className="text-pip font-bold">{challengerRow?.username ?? 'Player'}</span></p>
          {scenario && <p>Scenario: <span className="text-pip">{scenario.name}</span></p>}
          <p>Caps limit: <span className="text-pip">{ab.setup.pointsLimit}</span></p>
          <p>Wasteland cards: <span className="text-pip">{ab.setup.wastelandItemsCount} per player</span></p>
          <p>Game mode: <span className="text-pip capitalize">{ab.setup.gameMode ?? 'skirmish'}</span></p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={acceptChallenge}
            className="text-xs border border-pip text-pip font-bold py-3 rounded hover:bg-pip/10 transition-colors flex items-center justify-center gap-1 min-h-[44px]"
          >
            <Check size={12} /> ACCEPT
          </button>
          <button
            onClick={() => { setCounterCaps(ab.setup.pointsLimit ?? 500); setCountering(true) }}
            className="text-xs border border-amber text-amber font-bold py-3 rounded hover:bg-amber/10 transition-colors min-h-[44px]"
          >
            COUNTER
          </button>
          <button
            onClick={cancelBattle}
            className="text-xs border border-danger/50 text-danger font-bold py-3 rounded hover:bg-danger/10 transition-colors flex items-center justify-center gap-1 min-h-[44px]"
          >
            <X size={12} /> DECLINE
          </button>
        </div>
      </div>
    )
  }

  // Default: player list + challenge buttons
  return (
    <div className="space-y-3">
      <div className="border border-pip-dim/40 rounded-lg bg-panel overflow-hidden">
        <div className="px-3 py-2 bg-panel-light border-b border-pip-dim/30">
          <h2 className="text-amber text-xs font-bold tracking-widest">PLAYERS</h2>
        </div>
        <div className="divide-y divide-pip-dim/20">
          {opponents.length === 0 && isOnline && (
            <p className="text-muted text-xs p-4">No other players in this campaign.</p>
          )}
          {opponents.map(p => (
            <div key={p.userId} className="flex items-center gap-3 px-3 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-pip text-xs font-bold">{p.username}</p>
                <p className="text-muted text-xs">{p.faction} · {p.settlement}</p>
              </div>
              <button
                onClick={() => setSetupTargetId(p.userId)}
                disabled={!!status && status !== 'setup'}
                className="flex items-center gap-1.5 text-xs border border-amber/60 text-amber font-bold px-3 py-2 rounded min-h-[44px] hover:bg-amber/10 transition-colors disabled:opacity-40"
              >
                <Swords size={12} /> CHALLENGE
              </button>
            </div>
          ))}
        </div>
      </div>

      {!isOnline && (
        <div className="border border-pip-dim/30 rounded-lg bg-panel p-4 text-center space-y-2">
          <p className="text-muted text-xs">Offline — challenge flow unavailable online, but you can run a local battle.</p>
          <button
            onClick={() => setSetupTargetId('offline-opp')}
            disabled={!!status && status !== 'setup'}
            className="text-xs border border-amber/60 text-amber font-bold px-4 py-2 rounded min-h-[44px] hover:bg-amber/10 transition-colors disabled:opacity-40 inline-flex items-center gap-2"
          >
            <Swords size={12} /> START LOCAL BATTLE
          </button>
        </div>
      )}
    </div>
  )
}
