import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function Modal({ isOpen, onClose, title, children, wide = false }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
    if (isOpen) window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const panelClass = wide
    ? 'w-full max-w-4xl max-md:w-full max-md:h-full max-md:max-h-none max-md:rounded-none max-md:m-0'
    : 'w-full max-w-2xl'

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-start justify-center bg-black/70 pt-8 px-4 ${wide ? 'max-md:pt-0 max-md:px-0' : ''}`}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className={`bg-panel border border-pip-mid/60 rounded-lg shadow-lg shadow-pip-glow ${panelClass} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-pip-dim shrink-0">
          <h2 className="text-pip text-lg tracking-wider font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-danger transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={20} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0 max-h-[90vh]">
          {children}
        </div>
        <div className="shrink-0 pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />
      </div>
    </div>
  )
}
