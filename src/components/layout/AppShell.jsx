import { useState } from 'react'
import { Menu, X, User, Download, Upload, Swords, LogOut, LayoutGrid } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import AccountModal from '../modals/AccountModal'
import CampaignModal from '../modals/CampaignModal'
import { TABS } from './TabShell'

export default function AppShell({ campaignId, onExport, onImportClick, onLeaveCampaign, onReset, activeTab, onTabChange, settings = {} }) {
  const { signOut, profile, isSupabaseConfigured } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showCampaign, setShowCampaign] = useState(false)

  function closeMenu() { setMenuOpen(false) }

  return (
    <>
      <header className="relative flex items-center px-3 py-2.5 border-b-2 border-pip-dim/60 bg-panel" style={{ minHeight: '48px' }}>
        {/* Left: hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-1.5 text-pip hover:text-amber transition-colors z-10 relative"
          aria-label="Open menu"
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Center: title (absolute so it's truly centered) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2">
            <span className="text-pip font-bold tracking-[0.3em] text-sm" style={{ textShadow: '0 0 12px var(--color-pip-glow)' }}>FWW</span>
            <span className="text-amber tracking-[0.15em] text-sm" style={{ textShadow: '0 0 10px var(--color-amber-glow)' }}>ALONE TOGETHER</span>
          </div>
        </div>

        {/* Right: account */}
        <div className="ml-auto flex items-center gap-2 z-10 relative">
          {profile?.username && (
            <span className="text-pip text-xs hidden md:inline tracking-wider">{profile.username}</span>
          )}
          <button
            onClick={() => setShowAccount(true)}
            className="p-1.5 text-pip hover:text-amber transition-colors"
            title="Account"
          >
            <User size={16} />
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={closeMenu}
        />
      )}

      {/* Slide-out left menu */}
      <div
        className={`fixed top-0 left-0 h-full w-52 z-50 bg-panel border-r border-pip-mid/50 flex flex-col transition-transform duration-200 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ boxShadow: menuOpen ? '4px 0 24px rgba(0,0,0,0.6)' : 'none' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-pip-mid/30">
          <span className="text-pip text-xs font-bold tracking-widest">MENU</span>
          <button onClick={closeMenu} className="text-pip hover:text-amber transition-colors">
            <X size={14} />
          </button>
        </div>

        <nav className="flex flex-col flex-1 py-2 overflow-y-auto">
          {/* Tab navigation */}
          <div className="px-4 py-1.5 text-muted/50 text-xs tracking-widest border-b border-pip-dim/20 mb-1">NAVIGATE</div>
          {TABS.filter(tab => tab.id !== 'events' || settings.useEventCards).map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => { onTabChange?.(tab.id); closeMenu() }}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs tracking-widest transition-colors w-full text-left border-b border-pip-mid/10 ${
                  isActive ? 'text-amber bg-amber-dim/10 font-bold' : 'text-pip hover:bg-pip-dim/20 hover:text-amber'
                }`}
              >
                <Icon size={14} />
                {tab.label}
                {isActive && <span className="ml-auto text-amber text-xs">●</span>}
              </button>
            )
          })}

          {/* Actions */}
          <div className="px-4 py-1.5 text-muted/50 text-xs tracking-widest border-b border-pip-dim/20 mt-2 mb-1">ACTIONS</div>
          <NavItem icon={User} label="ACCOUNT" onClick={() => { setShowAccount(true); closeMenu() }} />
          <NavItem icon={Download} label="EXPORT" onClick={() => { onExport?.(); closeMenu() }} />
          <NavItem icon={Upload} label="IMPORT" onClick={() => { onImportClick?.(); closeMenu() }} />
          {isSupabaseConfigured && campaignId && (
            <NavItem icon={Swords} label="CAMPAIGN" onClick={() => { setShowCampaign(true); closeMenu() }} />
          )}
          {isSupabaseConfigured && campaignId && (
            <NavItem icon={LayoutGrid} label="ALL CAMPAIGNS" onClick={() => { onLeaveCampaign?.(); closeMenu() }} />
          )}
        </nav>

        <div className="p-3 border-t border-pip-mid/20">
          {isSupabaseConfigured && (
            <NavItem icon={LogOut} label="SIGN OUT" onClick={() => { signOut(); closeMenu() }} danger />
          )}
        </div>
      </div>

      {showAccount && <AccountModal onClose={() => setShowAccount(false)} />}
      {showCampaign && campaignId && (
        <CampaignModal
          campaignId={campaignId}
          onClose={() => setShowCampaign(false)}
          onLeaveCampaign={onLeaveCampaign}
          onReset={onReset}
        />
      )}
    </>
  )
}

function NavItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 text-xs tracking-widest transition-colors w-full text-left border-b border-pip-mid/10 ${
        danger ? 'text-danger hover:bg-danger/10' : 'text-pip hover:bg-pip-dim/20 hover:text-amber'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
