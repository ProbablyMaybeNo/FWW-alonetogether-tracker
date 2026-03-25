import { useState, useRef } from 'react'
import { CampaignProvider, useCampaign } from './context/CampaignContext'
import TabShell from './components/layout/TabShell'
import OverviewPage from './components/overview/OverviewPage'
import RosterPage from './components/roster/RosterPage'
import SettlementPage from './components/settlement/SettlementPage'
import EventsPage from './components/events/EventsPage'
import ObjectivesPage from './components/objectives/ObjectivesPage'
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

export default function App() {
  return (
    <CampaignProvider>
      <AppContent />
    </CampaignProvider>
  )
}
