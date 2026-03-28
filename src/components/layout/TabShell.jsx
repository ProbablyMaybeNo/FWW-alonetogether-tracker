import { Globe, User, Users, Building2, Target, Zap } from 'lucide-react'

const TABS = [
  { id: 'campaign',    label: 'CAMPAIGN',     icon: Globe },
  { id: 'player',      label: 'PLAYER',       icon: User },
  { id: 'roster',      label: 'ROSTER',       icon: Users },
  { id: 'settlement',  label: 'SETTLEMENT',   icon: Building2 },
  { id: 'objectives',  label: 'OBJECTIVES',   icon: Target },
  { id: 'events',      label: 'EVENTS',       icon: Zap },
]

export { TABS }

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
                : 'text-pip hover:text-amber hover:bg-panel-alt'
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
