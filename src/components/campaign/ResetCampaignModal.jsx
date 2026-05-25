import { useState } from 'react'
import Modal from '../layout/Modal'
import { defaultBattlePageState } from '../../utils/battlePageState'
import { defaultInhabitantsState } from '../../utils/inhabitantsState'
import { defaultCampaignMapState } from '../../data/campaignMap'

// Free starting structures by mode (duplicated from HomesteadPage's runPhase3Setup;
// these are the AT-rules starting bundle).
const PHASE3_FREE_IDS = [1, 1, 53, 54, 50]               // 2× Generator-Small, Stores, Maint. Shed, Listening Post
const HOMESTEAD_FREE_IDS = [69, 1, 1, 53, 54, 50, 65, 77] // + Land, Resource Stand, Hut

const genId = () => Date.now() + Math.random()

function freshStructures(isHomesteadMode) {
  const ids = isHomesteadMode ? HOMESTEAD_FREE_IDS : PHASE3_FREE_IDS
  return ids.map(id => ({
    instanceId: genId(),
    structureId: id,
    usedThisRound: false,
    powered: false,
    condition: 'Undamaged',
    notes: '',
  }))
}

// Build the fresh per-player state. Keeps identity (player profile, settings) and
// the personal narrative log; resets everything gameplay-related.
function freshPlayerState(prev) {
  const isHomesteadMode = prev?.settings?.settlementMode === 'homestead'
  const landCount = isHomesteadMode ? 1 : 0
  return {
    ...prev,
    caps: 900,
    roster: [],
    settlement: {
      structures: freshStructures(isHomesteadMode),
      landPurchased: landCount > 0,
      landCount,
      resources: 0,
    },
    itemPool: { items: [] },
    questCards: [],
    drawnQuestIds: [],
    discardedQuestIds: [],
    eventCards: {},
    activeEvents: [],
    exploreCardsThisRound: 0,
    activeScavengerObjective: null,
    completedObjectives: [],
    objectiveProgress: {},
    secretPurposeHistory: [],
    settlementDeck: [],
    settlementDiscard: [],
    settlementItemDeck: { drawPile: [], discardPile: [], manuallyRestored: [] },
    boostHand: [],
    boostDeck: [],
    boostDiscard: [],
    battleRosterPresets: [],
    battlePageState: defaultBattlePageState(),
    activeBattle: null,
    phase1CapLimit: 750,
    // KEPT: player (name/faction/leader/settlement), settings, narrativeLog
  }
}

export default function ResetCampaignModal({
  isOpen, onClose,
  state, setState,
  isOnline,
  updateShared, saveCampaignBattles, saveCampaignNarratives,
  saveActiveBattle, saveCampaignMapState, saveBattlePageState, saveInhabitantsState,
}) {
  const [confirmText, setConfirmText] = useState('')
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')

  const isReady = confirmText.trim().toUpperCase() === 'RESET'

  async function handleReset() {
    if (!isReady || resetting) return
    setResetting(true)
    setError('')
    try {
      // 1. Wipe per-player state (own row). Other players need to press this
      //    same button on their own session to wipe theirs.
      setState(prev => freshPlayerState(prev))

      // 2. Wipe shared campaign state (everyone sees these immediately via realtime).
      if (isOnline) {
        await Promise.all([
          updateShared('phase', 1),
          updateShared('round', 1),
          updateShared('battleCount', 0),
          saveCampaignBattles({}),
          saveActiveBattle(null),
          saveCampaignMapState(defaultCampaignMapState()),
          saveBattlePageState(defaultBattlePageState()),
          saveInhabitantsState(defaultInhabitantsState()),
        ])
      }
      // Solo mode: shared state lives in localStorage via the same per-player save,
      // so the setState above + a tick of refresh is enough.

      onClose()
    } catch (e) {
      console.error('reset campaign:', e)
      setError(e?.message || 'Reset failed — check console.')
      setResetting(false)
    }
  }

  function handleClose() {
    if (resetting) return
    setConfirmText('')
    setError('')
    onClose()
  }

  const isHomesteadMode = state?.settings?.settlementMode === 'homestead'
  const startingStructCount = isHomesteadMode ? HOMESTEAD_FREE_IDS.length : PHASE3_FREE_IDS.length

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="RESET CAMPAIGN">
      <div className="space-y-4">
        <div className="border border-danger rounded p-3 bg-danger-dim/10">
          <p className="text-danger text-sm font-bold mb-2">⚠ THIS CANNOT BE UNDONE</p>
          <p className="text-pip text-xs leading-relaxed">
            Export your campaign first if you want a rollback. The reset takes effect immediately
            for you and is broadcast to all players.
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-amber text-xs tracking-widest font-bold">YOU WILL KEEP</p>
          <ul className="text-xs text-pip space-y-1 pl-4">
            <li>• All players in the campaign</li>
            <li>• Each player's name, faction, leader, settlement name, settings</li>
            <li>• Each player's MY JOURNAL personal narrative log</li>
            <li>• Shared campaign narratives</li>
          </ul>

          <p className="text-amber text-xs tracking-widest font-bold pt-2">EACH PLAYER STARTS WITH</p>
          <ul className="text-xs text-pip space-y-1 pl-4">
            <li>• <span className="text-amber font-bold">900 caps</span></li>
            <li>• <span className="text-amber font-bold">{startingStructCount}</span> free starting structures
              {' '}({isHomesteadMode ? 'Homestead bundle' : 'AT bundle'})
            </li>
            <li>• Empty roster, empty item pool, empty decks</li>
          </ul>

          <p className="text-amber text-xs tracking-widest font-bold pt-2">RESET TO DEFAULTS</p>
          <ul className="text-xs text-muted space-y-1 pl-4">
            <li>• Campaign: Phase 1, Round 1, 0 battles, no battle records</li>
            <li>• Map: fully reset (fog-of-war, no controlled territories or routes)</li>
            <li>• All inhabitants decks, battle setup state</li>
          </ul>
        </div>

        {isOnline && (
          <div className="border border-amber/40 rounded p-3 bg-amber-dim/10">
            <p className="text-amber text-xs leading-relaxed">
              <strong>Multiplayer note:</strong> the shared campaign state (phase/round/battles/narratives/map) resets for everyone immediately.
              Each <em>other</em> player's per-player data (their roster/caps/items/etc.) only resets when <em>they</em> press this button on their own session.
              Ask them to do the same after you.
            </p>
          </div>
        )}

        <div>
          <label className="text-muted text-xs tracking-wider block mb-1">Type <strong className="text-danger">RESET</strong> to confirm</label>
          <input
            type="text"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="RESET"
            disabled={resetting}
            className="w-full text-sm"
            autoFocus
          />
        </div>

        {error && <p className="text-danger text-xs">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleReset}
            disabled={!isReady || resetting}
            className="flex-1 py-2 border border-danger text-danger text-sm font-bold tracking-widest rounded hover:bg-danger-dim/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {resetting ? 'RESETTING…' : 'RESET CAMPAIGN'}
          </button>
          <button
            onClick={handleClose}
            disabled={resetting}
            className="px-4 py-2 border border-muted/40 text-muted text-sm rounded hover:text-pip hover:border-pip transition-colors disabled:opacity-40"
          >
            CANCEL
          </button>
        </div>
      </div>
    </Modal>
  )
}
