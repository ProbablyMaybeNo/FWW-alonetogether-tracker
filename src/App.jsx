import { useState, useRef } from 'react'
import { CampaignProvider, useCampaign } from './context/CampaignContext'
import { useAuth } from './context/AuthContext'
import TabShell from './components/layout/TabShell'
import AppShell from './components/layout/AppShell'
import CampaignPage from './components/campaign/CampaignPage'
import PlayerPage from './components/overview/OverviewPage'
import RosterPage from './components/roster/RosterPage'
import SettlementPage from './components/settlement/SettlementPage'
import EventsPage from './components/events/EventsPage'
import ObjectivesPage from './components/objectives/ObjectivesPage'
import LoginPage from './components/auth/LoginPage'
import CampaignDirectory from './components/auth/CampaignDirectory'
import OnboardingTour, { isTourComplete } from './components/onboarding/OnboardingTour'

function AppContent({ campaignId, onLeaveCampaign }) {
  const [activeTab, setActiveTab] = useState('campaign')
  const { state, exportData, importData, syncing } = useCampaign()
  const settings = state?.settings ?? {}
  const fileRef = useRef(null)
  const [showTour, setShowTour] = useState(() => !isTourComplete())

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

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'campaign'   && <CampaignPage campaignId={campaignId} />}
        {activeTab === 'player'     && <PlayerPage onTabChange={setActiveTab} />}
        {activeTab === 'roster'     && <RosterPage />}
        {activeTab === 'settlement' && <SettlementPage />}
        {activeTab === 'objectives' && <ObjectivesPage />}
        {activeTab === 'events' && settings.useEventCards && <EventsPage />}
      </main>

      {showTour && state && (
        <OnboardingTour settings={settings} onDone={() => setShowTour(false)} />
      )}
    </div>
  )
}

function AuthGate() {
  const { user, loading, isSupabaseConfigured } = useAuth()
  const [soloMode, setSoloMode] = useState(false)
  const [campaignId, setCampaignId] = useState(() => {
    try {
      const stored = localStorage.getItem('fww-last-campaign')
      if (stored) return JSON.parse(stored).id ?? null
    } catch { /* ignore */ }
    return null
  })

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
