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
        {activeTab === 'settlement' && <SettlementPage />}
        {activeTab === 'battles' && <BattlesPage campaignId={campaignId} onTabChange={setActiveTab} />}
        {activeTab === 'events' && settings.useEventCards && <EventsPage />}
      </main>

      {showTour && state && (
        <OnboardingTour settings={settings} onDone={() => setShowTour(false)} />
      )}

      {(activeBattle?.status === 'active' || activeBattle?.status === 'roster_build') && (
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

      {activeBattle?.status === 'ended' && (
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
