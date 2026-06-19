import { useRef, useState } from 'react'
import { ImagePlus, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { MAP_IMAGE_BUCKET as BUCKET } from '../../data/campaignMap'

const MAX_BYTES = 10 * 1024 * 1024 // matches the bucket's file_size_limit

// Upload / replace / remove the map background image.
// Image goes to the campaign-maps Storage bucket; only its public URL + path are
// stored in the shared map state (keeps the synced payload tiny).
export default function MapImageControls({ background, campaignId, setBackground, clearBackground }) {
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError(null)

    if (!supabase) { setError('Storage unavailable — sign in to upload a map.'); return }
    if (!file.type.startsWith('image/')) { setError('Pick an image file.'); return }
    if (file.size > MAX_BYTES) { setError('Image too large (max 10MB).'); return }

    setBusy(true)
    try {
      const ext = (file.name.split('.').pop() || 'png').toLowerCase()
      const path = `${campaignId || 'solo'}/map-${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })
      if (upErr) throw upErr

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
      const url = data?.publicUrl
      if (!url) throw new Error('Could not resolve public URL.')

      const prevPath = background?.path
      setBackground({ url, path })

      // Best-effort cleanup of the replaced image.
      if (prevPath && prevPath !== path) {
        supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {})
      }
    } catch (err) {
      setError(err?.message ?? 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    const path = background?.path
    clearBackground()
    if (path && supabase) {
      supabase.storage.from(BUCKET).remove([path]).catch(() => {})
    }
  }

  return (
    <div className="border border-pip-mid/40 rounded bg-panel">
      <div className="px-3 py-2 border-b border-pip-mid/30">
        <h3 className="text-amber text-xs tracking-widest font-bold">MAP IMAGE</h3>
        <p className="text-muted/60 text-[10px] tracking-wider mt-0.5">Upload a map picture to draw on</p>
      </div>
      <div className="p-2 space-y-2">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] tracking-widest px-3 py-2 border border-pip-dim/50 rounded text-pip hover:border-pip hover:bg-pip-dim/20 transition-colors disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          {busy ? 'UPLOADING…' : background?.url ? 'REPLACE MAP' : 'UPLOAD MAP'}
        </button>
        {background?.url && !busy && (
          <button
            onClick={handleRemove}
            className="w-full inline-flex items-center justify-center gap-1.5 text-[10px] tracking-widest px-3 py-1.5 border border-muted/40 rounded text-muted hover:border-danger hover:text-danger transition-colors"
          >
            <Trash2 size={12} /> REMOVE MAP
          </button>
        )}
        {error && <p className="text-danger text-[10px] tracking-wider">{error}</p>}
      </div>
    </div>
  )
}
