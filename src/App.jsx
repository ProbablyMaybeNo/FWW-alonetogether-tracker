import { useState, useEffect, useRef } from 'react'
import { CampaignProvider, useCampaign } from './context/CampaignContext'
import { useAuth } from './context/AuthContext'
import TabShell from './components/layout/TabShell'
import AppShell from './components/layout/AppShell'
import CampaignPage from './components/campaign/CampaignPage'
import PlayerPage from './components/overview/OverviewPage'
import RosterPage from './components/roster/RosterPage'
import SettlementPage from './components/settlement/SettlementPage'
import EventsPage from './components/events/EventsPage'
import BattlesPage from './components/battles/BattlesPage'
import LoginPage from './components/auth/LoginPage'
import CampaignDirectory from './components/auth/CampaignDirectory'
import OnboardingTour, { isTourComplete } from './components/onboarding/OnboardingTour'
import LiveBattleTracker from './components/battles/LiveBattleTracker'
import PostBattleSummary from './components/battles/PostBattleSummary'
import battleScenarios from './data/battle/battleScenarios.json'
import { supabase } from './lib/supabase'
import {
  canonicalBattleHostUserId,
  participantIdsFromBattle,
  outcomeLabel,
  buildLiveBattleRecord,
  appendLiveBattleRecordToBattles,
} from './utils/postBattlePropagation'

function AppContent({ campaignId, onLeaveCampaign }) {
  const [activeTab, setActiveTab] = useState('campaign')
  const {
    state,
    setState,
    exportData,
    importData,
    syncing,
    sharedState,
    saveActiveBattle,
    userId: campaignUserId,
    updateShared,
    saveCampaignBattles,
    saveCampaignNarratives,
    isOnline,
  } = useCampaign()
  const { user: authUser } = useAuth()
  const settings = state?.settings ?? {}
  const fileRef = useRef(null)
  const [showTour, setShowTour] = useState(() => !isTourComplete())
  const lastProcessedRoundRef = useRef(null)
  const finalizeKeyRef = useRef(null)
  const finalizeLockRef = useRef(false)

  useEffect(() => {
    if (!sharedState?.round || !state) return
    const currentRound = sharedState.round

    // Skip initial load
    if (lastProcessedRoundRef.current === null) {
      lastProcessedRoundRef.current = currentRound
      return
    }

    // Only process when round actually advances
    if (lastProcessedRoundRef.current >= currentRound) return
    lastProcessedRoundRef.current = currentRound

    // Round-end cleanup for this player
    setState(prev => {
      if (!prev) return prev

      // Sell unsaved items: recovery + stored (but NOT locker or stores/equipped)
      const itemsToSell = (prev.itemPool?.items ?? []).filter(
        i => i.location === 'recovery' || i.location === 'stored' || i.location === 'Temp Pool' || i.location === 'Maint. Shed'
      )
      const capsFromSales = itemsToSell.reduce((sum, i) => sum + (i.caps ?? 0), 0)

      // Move locker items to stored (settlement pool) for next round
      const updatedItems = (prev.itemPool?.items ?? [])
        .filter(i => !['recovery', 'stored', 'Temp Pool', 'Maint. Shed'].includes(i.location))
        .map(i => {
          if (i.location === 'locker' || i.location === 'Locker') {
            return { ...i, location: 'stored' }
          }
          return i
        })

      // Reset structures: usedThisRound → false, powered → false
      const updatedStructures = (prev.settlement?.structures ?? []).map(s => ({
        ...s,
        usedThisRound: false,
        powered: false,
      }))

      // Reset units: perksThisRound → 0, Delayed → Active
      const updatedRoster = (prev.roster ?? []).map(u => ({
        ...u,
        perksThisRound: 0,
        fate: u.fate === 'Delayed' ? 'Active' : u.fate,
      }))

      // Move boost hand → recovery pool (players decide what to keep in stores)
      const boostHandItems = (prev.boostHand ?? []).map(b => ({
        id: Date.now() + Math.random(),
        boostId: b.boostId,
        name: b.name,
        caps: 0,
        subType: 'Boost',
        isBoost: true,
        boostType: b.boostType,
        location: 'recovery',
        assignedUnit: null,
      }))

      return {
        ...prev,
        caps: (prev.caps ?? 0) + capsFromSales,
        exploreCardsThisRound: 0,
        itemPool: { ...prev.itemPool, items: [...updatedItems, ...boostHandItems] },
        settlement: { ...prev.settlement, structures: updatedStructures },
        roster: updatedRoster,
        boostHand: [],
      }
    })
  }, [sharedState?.round])

  // Host-side battle finalize watcher — must be declared before the !state early
  // return to keep hook order stable. Runs whenever activeBattle changes, regardless
  // of which modal is mounted. Previously this lived inside PostBattleSummary, but
  // the host's modal unmounts the moment they apply their own results, so if they
  // applied before the opponent the finalize never fired and the campaign got stuck
  // on "Finalizing battle…".
  const activeBattleForFinalize = state?.activeBattle
  const uidForFinalize = authUser?.id ?? campaignUserId ?? 'solo-local'
  useEffect(() => {
    if (!activeBattleForFinalize) { finalizeKeyRef.current = null; return }
    const parts = participantIdsFromBattle(activeBattleForFinalize)
    if (parts.length === 0) return
    const applied = activeBattleForFinalize.postBattleAppliedBy || {}
    if (!parts.every(id => applied[id])) return

    const hostUserId = canonicalBattleHostUserId(parts)
    const iAmHost = !isOnline || uidForFinalize === hostUserId
    if (!iAmHost) return

    const key = Object.values(applied).filter(Boolean).sort().join('|')
    if (finalizeKeyRef.current === key) return
    if (finalizeLockRef.current) return
    finalizeLockRef.current = true
    finalizeKeyRef.current = key

    ;(async () => {
      try {
        const round = state?.round ?? 0
        const roundKey = String(round)
        const oc = activeBattleForFinalize.outcome && typeof activeBattleForFinalize.outcome === 'object' ? activeBattleForFinalize.outcome : {}

        const names = {}
        for (const id of parts) {
          if (id === uidForFinalize) names[id] = state?.player?.name || 'You'
          else names[id] = `Player ${String(id).slice(0, 6)}…`
        }
        if (isOnline && campaignId && supabase) {
          try {
            const { data: rows } = await supabase
              .from('player_data')
              .select('user_id, player_info')
              .eq('campaign_id', campaignId)
            for (const row of rows || []) {
              if (row.player_info?.name) names[row.user_id] = row.player_info.name
            }
          } catch (e) { console.warn('finalize: name lookup failed', e) }
        }

        const record = buildLiveBattleRecord({
          activeBattle: activeBattleForFinalize,
          outcome: oc,
          participantUserIds: parts,
          playerNames: names,
        })
        const nextBattles = appendLiveBattleRecordToBattles(
          sharedState?.battles ?? state?.battles ?? {},
          roundKey,
          record,
        )
        await saveCampaignBattles(nextBattles)

        const scen = battleScenarios.find(s => s.id === activeBattleForFinalize.setup?.scenario?.scenarioId)
        const pLabels = parts.map(id => `${names[id]} (${outcomeLabel(oc[id])})`).join(' · ')
        const line = `${pLabels} — ${scen?.name || 'Battle'} (Turn ${activeBattleForFinalize.turn ?? 1})`

        if (!isOnline) {
          setState(prev => ({
            ...prev,
            battleCount: (prev.battleCount ?? 0) + 1,
            narrativeLog: [
              ...(prev.narrativeLog || []),
              { id: Date.now(), title: 'Battle', content: line, round },
            ],
          }))
        } else {
          const battleCount = (sharedState?.battleCount ?? state?.battleCount ?? 0) + 1
          await updateShared('battleCount', battleCount)
          const narratives = sharedState?.campaignNarratives ?? []
          await saveCampaignNarratives([
            ...narratives,
            {
              id: Date.now(),
              round,
              title: 'Battle',
              content: line,
              display: false,
              createdAt: new Date().toISOString(),
            },
          ])
        }
        await saveActiveBattle(null)
      } catch (e) {
        console.error('host finalize battle:', e)
        finalizeKeyRef.current = null
      } finally {
        finalizeLockRef.current = false
      }
    })()
  }, [activeBattleForFinalize, uidForFinalize, isOnline, campaignId, state, sharedState, saveCampaignBattles, updateShared, saveCampaignNarratives, saveActiveBattle, setState])

  if (!state) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-terminal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family-mono)',
        color: 'var(--color-pip)',
        fontSize: '0.75rem',
        letterSpacing: '0.2em',
      }}>
        {syncing ? 'SYNCING...' : 'LOADING...'}
      </div>
    )
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importData(file)
      alert('Campaign data imported successfully!')
    } catch {
      alert('Failed to import. Please check the file format.')
    }
    e.target.value = ''
  }

  function handleLeaveCampaign() {
    localStorage.removeItem('fww-last-campaign')
    onLeaveCampaign?.()
  }

  const activeBattle = state?.activeBattle
  const uid = authUser?.id ?? campaignUserId ?? 'solo-local'

  const isParticipant = !!activeBattle && (activeBattle.setup?.participantUserIds ?? []).includes(uid)
  const iHaveEnded = !!activeBattle?.battleEndedBy?.[uid]
  const iHaveApplied = !!activeBattle?.postBattleAppliedBy?.[uid]
  const battlePending = activeBattle?.status === 'pending' || activeBattle?.status === 'setup'
  // Per-player overlay gating: each player flows through roster-build → tracker → post-battle
  // independently of the other player. Stops the "waiting for opponent" lock.
  const showLiveBattle = isParticipant && !battlePending && !iHaveEnded && !iHaveApplied
  const showPostBattle = isParticipant && iHaveEnded && !iHaveApplied

  return (
    <div className="min-h-screen flex flex-col">
      <AppShell
        campaignId={campaignId}
        onExport={exportData}
        onImportClick={() => fileRef.current?.click()}
        onLeaveCampaign={handleLeaveCampaign}
        onReset={handleLeaveCampaign}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        settings={settings}
        onStartTour={() => setShowTour(true)}
      />
      <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

      <TabShell activeTab={activeTab} onTabChange={setActiveTab} settings={settings} />

      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        {activeTab === 'campaign'   && <CampaignPage campaignId={campaignId} onTabChange={setActiveTab} />}
        {activeTab === 'player'     && <PlayerPage onTabChange={setActiveTab} />}
        {activeTab === 'roster'     && <RosterPage />}
        {activeTab === 'settlement' && <SettlementPage onTabChange={setActiveTab} />}
        {activeTab === 'battles' && <BattlesPage campaignId={campaignId} onTabChange={setActiveTab} />}
        {activeTab === 'events' && settings.useEventCards && <EventsPage />}
      </main>

      {showTour && state && (
        <OnboardingTour settings={settings} onDone={() => setShowTour(false)} />
      )}

      {showLiveBattle && (
        <LiveBattleTracker
          activeBattle={activeBattle}
          currentUserId={uid}
          saveActiveBattle={saveActiveBattle}
          roster={state?.roster ?? []}
          state={state}
          setState={setState}
          campaignId={campaignId}
          isOnline={!!isOnline}
        />
      )}

      {showPostBattle && (
        <PostBattleSummary
          campaignId={campaignId}
          activeBattle={activeBattle}
          currentUserId={uid}
          saveActiveBattle={saveActiveBattle}
          setState={setState}
          updateShared={updateShared}
          saveCampaignBattles={saveCampaignBattles}
          saveCampaignNarratives={saveCampaignNarratives}
          sharedState={sharedState}
          state={state}
          isOnline={!!isOnline}
          onNavigateBattlesTab={() => setActiveTab('battles')}
        />
      )}
    </div>
  )
}

function AuthGate() {
  const { user, loading, isSupabaseConfigured } = useAuth()
  const [soloMode, setSoloMode] = useState(false)
  const [campaignId, setCampaignId] = useState(null)

  useEffect(() => {
    if (!user) {
      setCampaignId(null)
      return
    }
    try {
      const stored = localStorage.getItem('fww-last-campaign')
      if (stored) setCampaignId(JSON.parse(stored).id ?? null)
    } catch { /* ignore */ }
  }, [user?.id])

  if (!isSupabaseConfigured || soloMode) {
    return (
      <CampaignProvider>
        <AppContent />
      </CampaignProvider>
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-terminal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-family-mono)',
        color: 'var(--color-pip)',
        fontSize: '0.75rem',
        letterSpacing: '0.2em',
      }}>
        INITIALIZING...
      </div>
    )
  }

  if (!user) {
    return <LoginPage onSolo={() => setSoloMode(true)} />
  }

  if (!campaignId) {
    return (
      <CampaignDirectory
        onEnterCampaign={(id) => setCampaignId(id)}
        onSolo={() => setSoloMode(true)}
      />
    )
  }

  return (
    <CampaignProvider campaignId={campaignId} userId={user.id}>
      <AppContent
        campaignId={campaignId}
        onLeaveCampaign={() => setCampaignId(null)}
      />
    </CampaignProvider>
  )
}

export default function App() {
  return <AuthGate />
}
