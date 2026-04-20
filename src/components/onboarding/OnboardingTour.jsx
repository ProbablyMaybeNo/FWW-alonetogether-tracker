import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

const TOUR_KEY = 'fww-tour-done'

export function isTourComplete() {
  try { return !!localStorage.getItem(TOUR_KEY) } catch { return false }
}

const MODE_INFO = {
  'alone-together': {
    label: 'ALONE TOGETHER',
    color: 'text-pip',
    desc: 'Campaign Handbook settlements with Homestead Survival Mode. You have a full settlement (Barracks, Medical Centre) and access to Survival bonuses — no Resources counter or settlement damage tracking.',
  },
  'basic': {
    label: 'BASIC',
    color: 'text-info',
    desc: 'Restricted to Campaign Handbook rules. Abstract settlement sheet only — no Resources, no Settlement Events, no structure damage tracking.',
  },
  'homestead': {
    label: 'HOMESTEAD EXPANSION',
    color: 'text-amber',
    desc: 'Full Homestead Expansion rules. Track Resources, draw Settlement Events each round, manage structure damage and repairs, monitor your Defense Rating, and build from the full expanded structure list.',
  },
}

function WelcomeBody({ settings }) {
  const mode = MODE_INFO[settings?.settlementMode] || MODE_INFO['alone-together']

  return (
    <div className="space-y-3 text-xs">

      {/* Mode badge */}
      <div className="border border-pip-mid/30 rounded px-3 py-2 bg-panel-light">
        <div className="text-label text-xs tracking-wider mb-1">CAMPAIGN MODE</div>
        <div className={`font-bold tracking-wider ${mode.color}`}>{mode.label}</div>
        <p className="text-pip mt-1 leading-relaxed">{mode.desc}</p>
      </div>

      {/* Shared vs personal */}
      <div className="space-y-1.5">
        <div className="text-label text-xs tracking-wider">HOW TRACKING WORKS</div>
        <div className="flex gap-2">
          <span className="text-pip shrink-0">▸</span>
          <span className="text-pip leading-relaxed">
            <span className="text-amber font-bold">Your data is private.</span> Your roster, settlement, caps, quests, and objectives belong to you — only you can view and edit them.
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-pip shrink-0">▸</span>
          <span className="text-pip leading-relaxed">
            <span className="text-amber font-bold">Campaign state is shared.</span> Phase, round number, and battle count sync live across all players instantly.
          </span>
        </div>
        <div className="flex gap-2">
          <span className="text-pip shrink-0">▸</span>
          <span className="text-pip leading-relaxed">
            <span className="text-amber font-bold">Invite players</span> by sharing your campaign join code. Find it in the menu → <span className="text-pip font-bold">CAMPAIGN SETTINGS</span>.
          </span>
        </div>
      </div>

    </div>
  )
}

const ALL_STEPS = [
  {
    id: 'welcome',
    target: null,
    placement: 'center',
    title: 'WELCOME, SURVIVOR',
    node: (settings) => <WelcomeBody settings={settings} />,
  },
  {
    id: 'menu',
    target: '[data-tour="menu-btn"]',
    placement: 'below',
    title: 'MENU',
    body: 'Open the slide-out menu to navigate between tabs, access account settings, export or import campaign data, manage campaign settings, or return to your campaign directory.',
  },
  {
    id: 'tabs',
    target: '[data-tour="tab-bar"]',
    placement: 'below',
    title: 'NAVIGATION TABS',
    body: 'Your five main sections. Each tab tracks a different part of your campaign — tap any tab to jump to it at any time.',
  },
  {
    id: 'campaign',
    target: '[data-tour="tab-campaign"]',
    placement: 'below',
    title: 'CAMPAIGN TAB',
    body: 'Shared across all players. Track campaign phase (1–4), current round, and battle count. When the campaign creator advances to the next round, everything resets automatically — units rest, structure uses clear, unavailable units return when applicable, boost hands return to the recovery pool, and item pools update.',
  },
  {
    id: 'player',
    target: '[data-tour="tab-player"]',
    placement: 'below',
    title: 'PLAYER TAB',
    body: 'Your personal overview — caps balance, active roster count, settlement power and water totals, active quests, and your current scavenger objective.',
  },
  {
    id: 'roster',
    target: '[data-tour="tab-roster"]',
    placement: 'below',
    title: 'ROSTER TAB',
    body: 'Your personal warband. Add units, track wounds and XP, assign perks and items, set fate status (Injured, Captured, Dead), and see each unit\'s cap value.',
  },
  {
    id: 'settlement',
    target: '[data-tour="tab-settlement"]',
    placement: 'below',
    title: 'SETTLEMENT TAB',
    body: 'Your personal settlement. Add structures, power them with Generators, then USE them each round to trigger their effects. Track damage, repair, and reinforce. Monitor power, water, and defense totals. The ITEM DECK tab holds your personal Settlement Item Deck — draw cards sequentially when looting or using structures that produce items.',
  },
  {
    id: 'battles',
    target: '[data-tour="tab-battles"]',
    placement: 'below',
    title: 'BATTLES TAB',
    body: 'Run table games: pick opponents, set scenario (environment, battlefield, purpose), shuffle and draw Creature / Stranger / Danger / Explore / Event decks (names for now), local population from your unit list, shared wasteland item deck, inhabitant decks, and handbook explore draws. Objectives & quests live here under a sub-tab.',
  },
  {
    id: 'events',
    target: '[data-tour="tab-events"]',
    placement: 'below',
    requiredSetting: 'useEventCards',
    title: 'EVENTS TAB',
    body: 'Draw and track settlement event cards each round. Active events affect your settlement and roster until resolved.',
  },
  {
    id: 'done',
    target: null,
    placement: 'center',
    title: 'YOU\'RE READY',
    body: "That's the full tour. You can relaunch it anytime from the menu → GETTING STARTED. Now get out there — the Wasteland isn't going to survive itself.",
  },
]

const PAD = 16
const TOOLTIP_W = 316
const ARROW_SIZE = 9

function getSpotlight(el) {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right }
}

function tooltipPos(spot, placement) {
  if (!spot) return null
  const vw = window.innerWidth

  if (placement === 'below') {
    let left = spot.left + spot.width / 2 - TOOLTIP_W / 2
    left = Math.max(PAD, Math.min(vw - TOOLTIP_W - PAD, left))
    const top = spot.bottom + ARROW_SIZE + 6
    const arrowLeft = (spot.left + spot.width / 2) - left
    return { top, left, arrowDir: 'up', arrowOffset: Math.max(14, Math.min(TOOLTIP_W - 22, arrowLeft)) }
  }

  if (placement === 'right') {
    const left = spot.right + ARROW_SIZE + 6
    const top = spot.top + spot.height / 2
    return { top, left, arrowDir: 'left', arrowOffset: spot.height / 2 }
  }

  return null
}

export default function OnboardingTour({ settings = {}, onDone }) {
  const steps = ALL_STEPS.filter(s => !s.requiredSetting || settings[s.requiredSetting])

  const [idx, setIdx] = useState(0)
  const [spot, setSpot] = useState(null)
  const current = steps[idx]

  const measure = useCallback(() => {
    if (!current?.target) { setSpot(null); return }
    const el = document.querySelector(current.target)
    setSpot(el ? getSpotlight(el) : null)
  }, [current])

  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  function finish() {
    try { localStorage.setItem(TOUR_KEY, '1') } catch {}
    onDone()
  }

  function next() {
    if (idx < steps.length - 1) setIdx(i => i + 1)
    else finish()
  }

  function prev() {
    if (idx > 0) setIdx(i => i - 1)
  }

  const isLast = idx === steps.length - 1
  const tip = spot ? tooltipPos(spot, current.placement) : null
  const centered = !tip
  const sp = spot ? { ...spot, pad: 5 } : null

  const bodyContent = current.node
    ? current.node(settings)
    : <p className="text-pip text-xs leading-relaxed">{current.body}</p>

  return (
    <div className="fixed inset-0 font-mono" style={{ zIndex: 9000, pointerEvents: 'none' }}>

      {/* === OVERLAY === */}
      {sp ? (
        <>
          <div onClick={finish} style={{ position: 'fixed', pointerEvents: 'all', top: 0, left: 0, right: 0, height: Math.max(0, sp.top - sp.pad), background: 'rgba(0,0,0,0.82)' }} />
          <div onClick={finish} style={{ position: 'fixed', pointerEvents: 'all', top: sp.bottom + sp.pad, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)' }} />
          <div onClick={finish} style={{ position: 'fixed', pointerEvents: 'all', top: sp.top - sp.pad, left: 0, width: Math.max(0, sp.left - sp.pad), height: sp.height + sp.pad * 2, background: 'rgba(0,0,0,0.82)' }} />
          <div onClick={finish} style={{ position: 'fixed', pointerEvents: 'all', top: sp.top - sp.pad, left: sp.right + sp.pad, right: 0, height: sp.height + sp.pad * 2, background: 'rgba(0,0,0,0.82)' }} />
          {/* highlight ring */}
          <div style={{ position: 'fixed', pointerEvents: 'none', top: sp.top - sp.pad, left: sp.left - sp.pad, width: sp.width + sp.pad * 2, height: sp.height + sp.pad * 2, borderRadius: 5, border: '2px solid var(--color-pip)', boxShadow: '0 0 0 1px var(--color-pip-dim), 0 0 18px var(--color-pip-glow)', zIndex: 9001 }} />
          <div style={{ position: 'fixed', pointerEvents: 'none', top: sp.top - sp.pad - 3, left: sp.left - sp.pad - 3, width: sp.width + (sp.pad + 3) * 2, height: sp.height + (sp.pad + 3) * 2, borderRadius: 7, border: '1px solid var(--color-pip-mid)', opacity: 0.4, zIndex: 9001 }} />
        </>
      ) : (
        <div onClick={finish} style={{ position: 'fixed', pointerEvents: 'all', inset: 0, background: 'rgba(0,0,0,0.88)' }} />
      )}

      {/* === TOOLTIP === */}
      <div
        style={{
          position: 'fixed',
          pointerEvents: 'all',
          zIndex: 9002,
          width: TOOLTIP_W,
          ...(centered
            ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
            : { top: tip.top, left: tip.left }
          ),
          background: 'var(--color-panel)',
          border: '1px solid rgba(0,182,90,0.45)',
          borderRadius: 5,
          boxShadow: '0 0 32px rgba(0,0,0,0.9), 0 0 16px var(--color-pip-glow)',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        {/* Arrow up */}
        {tip?.arrowDir === 'up' && (
          <div style={{ position: 'absolute', top: -(ARROW_SIZE), left: tip.arrowOffset - ARROW_SIZE, width: 0, height: 0, borderLeft: `${ARROW_SIZE}px solid transparent`, borderRight: `${ARROW_SIZE}px solid transparent`, borderBottom: `${ARROW_SIZE}px solid rgba(0,182,90,0.45)` }} />
        )}
        {/* Arrow left */}
        {tip?.arrowDir === 'left' && (
          <div style={{ position: 'absolute', left: -(ARROW_SIZE), top: tip.arrowOffset - ARROW_SIZE, width: 0, height: 0, borderTop: `${ARROW_SIZE}px solid transparent`, borderBottom: `${ARROW_SIZE}px solid transparent`, borderRight: `${ARROW_SIZE}px solid rgba(0,182,90,0.45)` }} />
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-pip-mid/30">
          <span className="text-title text-xs font-bold tracking-widest">{current.title}</span>
          <button onClick={finish} className="text-muted hover:text-pip transition-colors ml-3 shrink-0" title="Skip tour">
            <X size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {bodyContent}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 pb-3 pt-1">
          <span className="text-dim text-xs tracking-wider">{idx + 1} / {steps.length}</span>
          <div className="flex gap-2">
            {idx > 0 && (
              <button onClick={prev} className="px-3 py-1.5 text-xs border border-pip-mid/40 text-pip rounded hover:bg-pip-dim/20 transition-colors tracking-wider">
                BACK
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 text-xs border border-pip text-pip rounded hover:bg-pip-dim/30 transition-colors tracking-wider font-bold"
              style={{ boxShadow: '0 0 8px var(--color-pip-glow)' }}
            >
              {isLast ? 'DONE' : 'NEXT →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
