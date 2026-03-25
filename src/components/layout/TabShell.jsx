import { LayoutDashboard, Users, Building2, Target, Map } from 'lucide-react'

const TABS = [
  { id: 'overview',    label: 'OVERVIEW',     icon: LayoutDashboard },
  { id: 'roster',      label: 'ROSTER',       icon: Users },
  { id: 'settlement',  label: 'SETTLEMENT',   icon: Building2 },
  { id: 'objectives',  label: 'OBJECTIVES',   icon: Target },
  { id: 'events',      label: 'EXPLORE CARDS', icon: Map },
]

export default function TabShell({ activeTab, onTabChange }) {
  return (
    <nav className="flex border-b border-pip-dim bg-panel">
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-xs transition-colors
              ${active
                ? 'text-pip border-b-2 border-pip bg-panel-light'
                : 'text-pip-dim hover:text-pip hover:bg-panel-alt'
              }`}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
