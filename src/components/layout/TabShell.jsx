import { Flag, LayoutDashboard, Users, Building2, Swords, Scroll } from 'lucide-react'

const TABS = [
  { id: 'campaign', label: 'CAMPAIGN', shortLabel: 'Campaign', icon: Flag },
  { id: 'player', label: 'OVERVIEW', shortLabel: 'Overview', icon: LayoutDashboard },
  { id: 'roster', label: 'ROSTER', shortLabel: 'Roster', icon: Users },
  { id: 'settlement', label: 'SETTLEMENT', shortLabel: 'Settlement', icon: Building2 },
  { id: 'battles', label: 'BATTLES', shortLabel: 'Battles', icon: Swords },
  { id: 'events', label: 'QUESTS', shortLabel: 'Quests', icon: Scroll },
]

export { TABS }

export default function TabShell({ activeTab, onTabChange }) {
  return (
    <>
      {/* Desktop top tab bar */}
      <nav data-tour="tab-bar" className="hidden md:flex border-b-2 border-pip-dim bg-panel">
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              data-tour={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-xs transition-all duration-150 relative
                ${active
                  ? 'text-amber font-bold bg-panel-light'
                  : 'text-pip/50 hover:text-amber hover:bg-panel-alt'
                }`}
            >
              {active && (
                <span
                  className="absolute top-0 left-0 right-0 h-0.5 bg-amber"
                  style={{ boxShadow: '0 0 8px var(--color-amber), 0 0 16px var(--color-amber-glow)' }}
                />
              )}
              <Icon size={14} className={active ? 'text-amber' : 'text-pip/50'} />
              <span className="hidden sm:inline tracking-wider">{tab.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Mobile bottom navigation */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t-2 border-pip-dim bg-panel flex items-stretch justify-around"
        style={{
          paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.45)',
        }}
        aria-label="Main navigation"
      >
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              data-tour={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-h-[44px] px-1 py-1.5 text-xs transition-colors ${
                active
                  ? 'text-amber font-bold'
                  : 'text-pip/45'
              }`}
              style={active ? { textShadow: '0 0 10px var(--color-amber-glow)' } : undefined}
            >
              <Icon
                size={18}
                className={active ? 'text-amber' : 'text-pip/45'}
                strokeWidth={active ? 2.25 : 2}
                style={active ? { filter: 'drop-shadow(0 0 6px var(--color-amber-glow))' } : undefined}
              />
              <span className="leading-none tracking-tight text-xs max-w-[4.5rem] truncate text-center">
                {tab.shortLabel}
              </span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
