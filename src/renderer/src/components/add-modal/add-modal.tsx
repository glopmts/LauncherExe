import { useEffect, useState } from 'react'
import { AppEntry } from '../../types/interfaces'
import styles from './add-modal.module.scss'

interface Props {
  initial: AppEntry | null
  onSave: (entry: AppEntry) => void
  onClose: () => void
}

const CATEGORIES = ['game', 'app', 'tool', 'other'] as const
const ACCENT_COLORS = ['#6c63ff', '#22d3ee', '#4ade80', '#fbbf24', '#f87171', '#f472b6', '#a78bfa', '#34d399']

// ── Safe accessor — throws a readable error if preload didn't load
function api() {
  if (!window.electronAPI) {
    throw new Error(
      'window.electronAPI is undefined. ' +
        'The Electron preload script did not load correctly. ' +
        'Check that preload.js exists in the same folder as main.js (out/main/).'
    )
  }
  return window.electronAPI
}

export function AddModal({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [exePath, setExePath] = useState(initial?.path ?? '')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    (initial?.category as (typeof CATEGORIES)[number]) ?? 'app'
  )
  const [cover, setCover] = useState<string | undefined>(initial?.cover)
  const [icon, setIcon] = useState<string | undefined>(undefined)
  const [color, setColor] = useState(initial?.color ?? ACCENT_COLORS[0])
  const [pathError, setPathError] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // ── Browse EXE and auto-detect info
  const browseExe = async () => {
    setApiError('')
    let p: string | null

    try {
      p = await api().openExeDialog()
    } catch (err) {
      setApiError(String(err))
      return
    }

    if (!p) return

    setExePath(p)
    setPathError('')

    // Auto-fill name from filename immediately
    const fallbackName =
      p

        .replace(/\\/g, '/')
        .split('/')
        .pop()
        ?.replace(/\.exe$/i, '') ?? ''
    if (!name) setName(fallbackName)

    // Detect icon + product name via PowerShell
    setDetecting(true)
    try {
      const info = await api().getExeInfo(p)
      if (info) {
        if (!name && info.name) setName(info.name)
        else if (info.name && info.name !== fallbackName) setName(info.name)
        if (info.iconDataUrl) setIcon(info.iconDataUrl)
      }
    } catch {
      /* silent — icon detection failure is non-critical */
    } finally {
      setDetecting(false)
    }
  }

  const browseCover = async () => {
    setApiError('')
    try {
      const img = await api().openImageDialog()
      if (img) setCover(img)
    } catch (err) {
      setApiError(String(err))
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    if (!exePath.trim()) {
      setPathError('Select an executable')
      return
    }

    setSaving(true)
    setApiError('')

    try {
      const exists = await api().fileExists(exePath)
      if (!exists) {
        setPathError('File not found at this path')
        setSaving(false)
        return
      }
    } catch (err) {
      setApiError(String(err))
      setSaving(false)
      return
    }

    const entry: AppEntry = {
      id: initial?.id ?? crypto.randomUUID(),
      name: name.trim(),
      path: exePath,
      category,
      cover,
      color,
      launchCount: initial?.launchCount ?? 0,
      addedAt: initial?.addedAt ?? new Date().toISOString(),
      lastLaunched: initial?.lastLaunched,
      pinned: initial?.pinned ?? false
    }
    onSave(entry)
    setSaving(false)
  }

  // What to show in the cover slot: custom cover > extracted icon > initials
  const previewSrc = cover ?? icon ?? null

  return (
    <div className={styles.backdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h3>{initial ? 'Edit App' : 'Add App'}</h3>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* API error banner — shown when preload is missing */}
        {apiError && (
          <div className={styles.apiErrorBanner}>
            <strong>Electron API unavailable</strong>
            <span>{apiError}</span>
          </div>
        )}

        {/* Body */}
        <div className={styles.body}>
          {/* Cover row */}
          <div className={styles.coverRow}>
            <div
              className={`${styles.coverPreview} ${detecting ? styles.detecting : ''}`}
              style={{
                background: previewSrc ? undefined : `${color}22`,
                borderColor: `${color}44`
              }}
              onClick={browseCover}
              title="Click to upload a custom cover image"
            >
              {detecting && (
                <div className={styles.detectSpinner}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                  </svg>
                </div>
              )}
              {!detecting && previewSrc ? (
                <img
                  src={previewSrc}
                  alt="preview"
                  style={{
                    objectFit: cover ? 'cover' : 'contain',
                    padding: cover ? 0 : '8px'
                  }}
                />
              ) : !detecting ? (
                <div className={styles.coverPlaceholder} style={{ color }}>
                  {name ? name.slice(0, 2).toUpperCase() : '?'}
                </div>
              ) : null}
              <div className={styles.coverHint}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {cover ? 'Change cover' : 'Upload cover'}
              </div>
            </div>

            <div className={styles.colorPicker}>
              <span className={styles.fieldLabel}>Accent color</span>
              <div className={styles.colors}>
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c}
                    className={`${styles.colorDot} ${color === c ? styles.colorSelected : ''}`}
                    style={{ background: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>

              <div className={styles.coverActions}>
                {icon && !cover && (
                  <span className={styles.iconBadge}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Icon detected
                  </span>
                )}
                {cover && (
                  <button className={styles.removeCover} onClick={() => setCover(undefined)}>
                    ✕ Remove cover
                  </button>
                )}
                {icon && (
                  <button className={styles.removeCover} onClick={() => setIcon(undefined)}>
                    ✕ Remove icon
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Name */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Name *</label>
            <input
              className={styles.input}
              type="text"
              placeholder="My App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Executable path */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Executable *</label>
            <div className={styles.pathRow}>
              <input
                className={`${styles.input} ${pathError ? styles.inputError : ''}`}
                type="text"
                placeholder="C:\path\to\app.exe"
                value={exePath}
                onChange={(e) => {
                  setExePath(e.target.value)
                  setPathError('')
                }}
              />
              <button
                className={`${styles.browseBtn} ${detecting ? styles.browseBusy : ''}`}
                onClick={browseExe}
                disabled={detecting}
              >
                {detecting ? (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={styles.spin}
                  >
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                ) : (
                  'Browse'
                )}
              </button>
            </div>
            {detecting && <span className={styles.detectingMsg}>Detecting icon and app name…</span>}
            {pathError && <span className={styles.errorMsg}>{pathError}</span>}
          </div>

          {/* Category */}
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Category</label>
            <div className={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  className={`${styles.catBtn} ${category === c ? styles.catActive : ''}`}
                  onClick={() => setCategory(c)}
                  style={category === c ? { borderColor: color, color, background: `${color}18` } : {}}
                >
                  {c === 'game' && '⬡ '}
                  {c === 'app' && '⬢ '}
                  {c === 'tool' && '◎ '}
                  {c === 'other' && '○ '}
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleSave}
            disabled={!name.trim() || !exePath.trim() || saving || detecting}
            style={{ background: color, boxShadow: `0 0 16px ${color}55` }}
          >
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add App'}
          </button>
        </div>
      </div>
    </div>
  )
}
