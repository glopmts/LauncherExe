import { useUpdater } from '@/hooks/useUpdater'

const statusLabel: Record<string, string> = {
  idle: 'App atualizado',
  checking: 'Verificando...',
  available: 'Atualização disponível',
  downloading: 'Baixando...',
  ready: 'Pronto para instalar',
  error: 'Erro na atualização'
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UpdaterBadge() {
  const { status, progress, info, error, check, download, install } = useUpdater()

  if (status === 'idle') return null

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.header}>
          <StatusDot status={status} />
          <span style={styles.label}>{statusLabel[status]}</span>
        </div>

        {status === 'available' && info && (
          <div style={styles.body}>
            <span style={styles.version}>v{info.version}</span>
            <button style={styles.btn} onClick={download}>
              Baixar
            </button>
          </div>
        )}

        {status === 'downloading' && (
          <div style={styles.body}>
            <div style={styles.trackWrap}>
              <div style={styles.track}>
                <div style={{ ...styles.fill, width: `${progress}%` }} />
              </div>
              <span style={styles.pct}>{Math.round(progress)}%</span>
              <span style={styles.pct}>{formatBytes(progress)}%</span>
            </div>
          </div>
        )}

        {status === 'ready' && (
          <div style={styles.body}>
            <span style={styles.hint}>Reinicie para aplicar</span>
            <button style={{ ...styles.btn, ...styles.btnGreen }} onClick={install}>
              Reiniciar
            </button>
          </div>
        )}

        {status === 'error' && (
          <div style={styles.body}>
            <span style={styles.err}>{error ?? 'Erro desconhecido'}</span>
            <button style={{ ...styles.btn, ...styles.btnMuted }} onClick={check}>
              Tentar novamente
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusDot({ status }: { status: string }) {
  const color: Record<string, string> = {
    checking: '#60a5fa',
    available: '#fbbf24',
    downloading: '#818cf8',
    ready: '#34d399',
    error: '#f87171'
  }
  const isAnimated = status === 'checking' || status === 'downloading'

  return (
    <span
      style={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color[status] ?? '#6b7280',
        display: 'inline-block',
        flexShrink: 0,
        animation: isAnimated ? 'pulse 1.4s ease-in-out infinite' : 'none'
      }}
    />
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    position: 'fixed',
    bottom: 20,
    right: 20,
    zIndex: 9999,
    fontFamily: '"DM Mono", "Fira Mono", monospace'
  },
  card: {
    background: 'rgba(15, 15, 20, 0.92)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '10px 14px',
    minWidth: 220,
    maxWidth: 300,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: '0.02em',
    fontWeight: 500
  },
  body: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  version: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: '0.05em'
  },
  hint: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)'
  },
  err: {
    fontSize: 11,
    color: '#f87171',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  btn: {
    fontSize: 11,
    fontFamily: 'inherit',
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.85)',
    cursor: 'pointer',
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    transition: 'background 0.15s'
  },
  btnGreen: {
    background: 'rgba(52,211,153,0.15)',
    borderColor: 'rgba(52,211,153,0.3)',
    color: '#6ee7b7'
  },
  btnMuted: {
    background: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.5)'
  },
  trackWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flex: 1
  },
  track: {
    flex: 1,
    height: 3,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    background: 'linear-gradient(90deg, #818cf8, #a78bfa)',
    borderRadius: 99,
    transition: 'width 0.3s ease'
  },
  pct: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    minWidth: 30,
    textAlign: 'right'
  }
}
