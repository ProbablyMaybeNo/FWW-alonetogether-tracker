import { LayoutDashboard, Users, Building2, Target, Map } from 'lucide-react'

const TABS = [
  { id: 'overview',    label: 'OVERVIEW',     icon: LayoutDashboard },
  { id: 'roster',      label: 'ROSTER',       icon: Users },
  { id: 'settlement',  label: 'SETTLEMENT',   icon: Building2 },
  { id: 'objectives',  label: 'OBJECTIVES',   icon: Target },
  { id: 'events',      label: 'EVENTS',        icon: Map },
]

export default function TabShell({ activeTab, onTabChange }) {
  return (
    <nav className="flex border-b-2 border-pip-dim bg-panel">
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-xs transition-all duration-150 relative
              ${active
                ? 'text-pip font-bold bg-panel-light'
                : 'text-muted hover:text-pip hover:bg-panel-alt'
              }`}
          >
            {active && (
              <span
                className="absolute top-0 left-0 right-0 h-0.5 bg-pip"
                style={{ boxShadow: '0 0 8px var(--color-pip), 0 0 16px var(--color-pip-glow)' }}
              />
            )}
            <Icon size={14} className={active ? 'text-pip' : ''} />
            <span className="hidden sm:inline tracking-wider">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
