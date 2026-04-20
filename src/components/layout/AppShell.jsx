import { useState, useEffect, useRef } from 'react'
import { Menu, X, User, Download, Upload, LogOut, LayoutGrid, HelpCircle, Settings, UserPlus, Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import AccountModal from '../modals/AccountModal'
import CampaignModal from '../modals/CampaignModal'
import SnapshotModal from '../modals/SnapshotModal'
import { TABS } from './TabShell'

export default function AppShell({ campaignId, onExport, onImportClick, onLeaveCampaign, onReset, activeTab, onTabChange, settings = {}, onStartTour }) {
  const { signOut, profile, isSupabaseConfigured } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAccount, setShowAccount] = useState(false)
  const [showCampaign, setShowCampaign] = useState(false)
  const [showAddPlayer, setShowAddPlayer] = useState(false)
  const [showSnapshots, setShowSnapshots] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  function closeMenu() { setMenuOpen(false) }

  // Close user dropdown on outside click
  useEffect(() => {
    if (!showUserMenu) return
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showUserMenu])

  return (
    <>
      <header className="relative flex items-center px-3 py-2.5 border-b-2 border-pip-dim/60 bg-panel" style={{ minHeight: '48px' }}>
        {/* Left: hamburger */}
        <button
          data-tour="menu-btn"
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

        {/* Right: account dropdown */}
        <div className="ml-auto flex items-center gap-2 z-10 relative" ref={userMenuRef}>
          {profile?.username && (
            <span className="text-pip text-xs hidden md:inline tracking-wider">{profile.username}</span>
          )}
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="p-1.5 text-pip hover:text-amber transition-colors"
            title="Account"
          >
            <User size={16} />
          </button>
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-panel border border-pip-mid/40 rounded shadow-lg z-50">
              <button
                onClick={() => { setShowAccount(true); setShowUserMenu(false) }}
                className="w-full text-left px-3 py-2 text-xs text-pip hover:bg-pip-dim/20 tracking-wider"
              >ACCOUNT</button>
              {isSupabaseConfigured && (
                <button
                  onClick={() => { signOut(); setShowUserMenu(false) }}
                  className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger/10 tracking-wider"
                >SIGN OUT</button>
              )}
            </div>
          )}
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
          <span className="text-title text-xs font-bold tracking-widest">MENU</span>
          <button onClick={closeMenu} className="text-pip hover:text-amber transition-colors">
            <X size={14} />
          </button>
        </div>

        <nav className="flex flex-col flex-1 py-2 overflow-y-auto">
          {/* NAVIGATE */}
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

          {/* ACTIONS */}
          <div className="px-4 py-1.5 text-muted/50 text-xs tracking-widest border-b border-pip-dim/20 mt-2 mb-1">ACTIONS</div>
          <NavItem icon={HelpCircle} label="GETTING STARTED" onClick={() => { onStartTour?.(); closeMenu() }} />
          <NavItem icon={Camera} label="SAVES" onClick={() => { setShowSnapshots(true); closeMenu() }} />
          <NavItem icon={Download} label="EXPORT" onClick={() => { onExport?.(); closeMenu() }} />
          <NavItem icon={Upload} label="IMPORT" onClick={() => { onImportClick?.(); closeMenu() }} />
          {isSupabaseConfigured && campaignId && (
            <NavItem icon={UserPlus} label="ADD PLAYER" onClick={() => { setShowAddPlayer(true); closeMenu() }} />
          )}

          {/* CAMPAIGN */}
          <div className="px-4 py-1.5 text-muted/50 text-xs tracking-widest border-b border-pip-dim/20 mt-2 mb-1">CAMPAIGN</div>
          {isSupabaseConfigured && campaignId && (
            <NavItem icon={Settings} label="SETTINGS" onClick={() => { setShowCampaign(true); closeMenu() }} />
          )}
          {isSupabaseConfigured && campaignId && (
            <NavItem icon={LayoutGrid} label="DIRECTORY" onClick={() => { onLeaveCampaign?.(); closeMenu() }} />
          )}
          <NavItem icon={User} label="ACCOUNT" onClick={() => { setShowAccount(true); closeMenu() }} />
          {isSupabaseConfigured && (
            <NavItem icon={LogOut} label="LOG OUT" onClick={() => { signOut(); closeMenu() }} danger />
          )}
        </nav>
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
      {showSnapshots && <SnapshotModal campaignId={campaignId} onClose={() => setShowSnapshots(false)} />}
      {showAddPlayer && campaignId && (
        <AddPlayerModal
          campaignId={campaignId}
          onClose={() => setShowAddPlayer(false)}
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

function AddPlayerModal({ campaignId, onClose }) {
  const [joinCode, setJoinCode] = useState('')
  const [email, setEmail] = useState('')
  const [copied, setCopied] = useState(false)

  const appUrl = 'https://fww-alonetogether-tracker.vercel.app'
  const bodyText = `Join my FWW Alone Together campaign! Use invite code: ${joinCode} at ${appUrl}`

  useEffect(() => {
    if (!supabase || !campaignId) return
    supabase
      .from('campaigns')
      .select('join_code')
      .eq('id', campaignId)
      .single()
      .then(({ data }) => {
        if (data?.join_code) setJoinCode(data.join_code)
      })
  }, [campaignId])

  function handleCopyCode() {
    if (!joinCode) return
    navigator.clipboard.writeText(joinCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleOpenEmail() {
    window.location.href = `mailto:${email}?subject=FWW Campaign Invite&body=${encodeURIComponent(bodyText)}`
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-panel border border-pip-mid/50 rounded-lg w-full max-w-md p-5 space-y-4 relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted hover:text-pip transition-colors">
          <X size={16} />
        </button>
        <div>
          <div className="text-title text-sm font-bold tracking-widest mb-1">INVITE PLAYER</div>
          <div className="text-muted text-xs">Share this invite code with a new player</div>
        </div>

        {/* Code display */}
        <div className="border border-amber/40 rounded bg-panel-light px-4 py-3 text-center">
          <div className="text-xs text-muted tracking-wider mb-1">INVITE CODE</div>
          <div className="text-amber font-bold text-2xl tracking-widest">
            {joinCode || '...'}
          </div>
        </div>

        {/* Email body preview */}
        <div>
          <label className="text-xs text-pip tracking-wider block mb-1">MESSAGE</label>
          <textarea
            readOnly
            value={bodyText}
            rows={3}
            className="w-full text-xs py-2 px-3 bg-panel-alt border border-pip-dim/30 rounded resize-none text-muted"
          />
        </div>

        {/* Recipient email */}
        <div>
          <label className="text-xs text-pip tracking-wider block mb-1">RECIPIENT EMAIL</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="player@example.com"
            className="w-full text-xs py-2 px-3"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleOpenEmail}
            disabled={!email || !joinCode}
            className="flex-1 py-2 border border-pip text-title text-xs font-bold tracking-wider rounded hover:bg-pip-dim/20 transition-colors disabled:opacity-40"
          >
            OPEN EMAIL
          </button>
          <button
            onClick={handleCopyCode}
            disabled={!joinCode}
            className="px-4 py-2 border border-amber text-title text-xs font-bold tracking-wider rounded hover:bg-amber/10 transition-colors disabled:opacity-40"
          >
            {copied ? 'COPIED!' : 'COPY CODE'}
          </button>
        </div>
      </div>
    </div>
  )
}
