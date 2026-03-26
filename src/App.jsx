import { useState, useRef } from 'react'
import { CampaignProvider, useCampaign } from './context/CampaignContext'
import { useAuth } from './context/AuthContext'
import TabShell from './components/layout/TabShell'
import OverviewPage from './components/overview/OverviewPage'
import RosterPage from './components/roster/RosterPage'
import SettlementPage from './components/settlement/SettlementPage'
import EventsPage from './components/events/EventsPage'
import ObjectivesPage from './components/objectives/ObjectivesPage'
import LoginPage from './components/auth/LoginPage'
import CampaignLobby from './components/auth/CampaignLobby'
import { Download, Upload } from 'lucide-react'

function AppContent() {
  const [activeTab, setActiveTab] = useState('overview')
  const { exportData, importData } = useCampaign()
  const fileRef = useRef(null)

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-pip-dim bg-panel">
        <div className="flex items-center gap-2">
          <span className="text-pip text-xs tracking-widest">FWW</span>
          <span className="text-pip-dim text-xs">ALONE TOGETHER</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={exportData} className="p-1.5 text-pip-dim hover:text-pip" title="Export Campaign">
            <Download size={16} />
          </button>
          <button onClick={() => fileRef.current?.click()} className="p-1.5 text-pip-dim hover:text-pip" title="Import Campaign">
            <Upload size={16} />
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </header>

      <TabShell activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto">
        {activeTab === 'overview'    && <OverviewPage onTabChange={setActiveTab} />}
        {activeTab === 'roster'      && <RosterPage />}
        {activeTab === 'settlement'  && <SettlementPage />}
        {activeTab === 'objectives'  && <ObjectivesPage />}
        {activeTab === 'events'      && <EventsPage />}
      </main>
    </div>
  )
}

/**
 * AuthGate handles the three-state routing:
 *  1. Supabase not configured OR soloMode → render the main app directly
 *  2. Supabase configured AND no user → LoginPage
 *  3. Supabase configured AND user AND no campaignId → CampaignLobby
 *  4. Supabase configured AND user AND campaignId → main app
 */
function AuthGate() {
  const { user, loading, isSupabaseConfigured } = useAuth()
  const [soloMode, setSoloMode] = useState(false)
  const [campaignId, setCampaignId] = useState(() => {
    // Restore last campaign from localStorage on load
    try {
      const stored = localStorage.getItem('fww-last-campaign')
      if (stored) return JSON.parse(stored).id ?? null
    } catch { /* ignore */ }
    return null
  })

  // Not configured or user chose solo → straight to app
  if (!isSupabaseConfigured || soloMode) {
    return (
      <CampaignProvider>
        <AppContent />
      </CampaignProvider>
    )
  }

  // Supabase configured but still loading session
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

  // No user → login screen
  if (!user) {
    return <LoginPage onSolo={() => setSoloMode(true)} />
  }

  // User logged in but no campaign selected → lobby
  if (!campaignId) {
    return (
      <CampaignLobby
        onEnterCampaign={(id) => setCampaignId(id)}
        onSolo={() => setSoloMode(true)}
      />
    )
  }

  // Fully authenticated with a campaign selected → main app
  return (
    <CampaignProvider>
      <AppContent />
    </CampaignProvider>
  )
}

export default function App() {
  return <AuthGate />
}
