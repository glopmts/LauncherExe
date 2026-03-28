import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconApp,
  IconArrowLeft,
  IconCheck,
  IconCopy,
  IconEdit,
  IconFolder,
  IconInfo,
  IconPin,
  IconPlay,
  IconTrash
} from '../../components/icones-svg'
import { useAppContext } from '../../context/app-context'
import { AppEntry } from '../../types/interfaces'
import styles from './details.module.scss'

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatDateTime(iso?: string) {
  if (!iso) return 'Nunca'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const Details = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { handleDelete } = useAppContext()

  const [app, setApp] = useState<AppEntry | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const storedApps = await window.electronAPI.getApp()
        const appsWithIcons = await Promise.all(
          storedApps.map(async (a: AppEntry) => {
            const icon = await window.electronAPI.getExeIcon(a.path)
            return { ...a, icon }
          })
        )
        setApp(appsWithIcons.find((a: AppEntry) => a.id === id) || null)
      } catch (err) {
        console.error('Erro ao carregar app:', err)
        setApp(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleCopyPath = () => {
    if (!app) return
    navigator.clipboard.writeText(app.path).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleLaunch = () => {
    if (app?.path) window.electronAPI?.launch?.(app.path)
  }

  if (loading) return <div className={styles.loader}>Carregando</div>
  if (!app) return <div className={styles.infor}>App não encontrado</div>

  return (
    <div className={styles.main}>
      {/* Back */}
      <button className={styles.back} onClick={() => navigate(-1)}>
        <IconArrowLeft /> Voltar
      </button>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={styles.coverWrapper}>
          {app.icon ? (
            <img className={styles.coverImg} src={app.icon} alt={app.name} />
          ) : app.cover ? (
            <img className={styles.coverImg} src={app.cover} alt={app.name} />
          ) : (
            <div className={styles.coverFallback}>
              <IconApp />
            </div>
          )}
        </div>

        <div className={styles.heroInfo}>
          <div className={styles.titleRow}>
            <h1 className={styles.appName}>{app.name}</h1>
            {app.pinned && (
              <span className={styles.pinBadge}>
                <IconPin /> Fixado
              </span>
            )}
          </div>

          <div className={styles.metaRow}>
            <span className={`${styles.categoryBadge} ${styles[app.category]}`}>{app.category}</span>
            <span className={styles.statPill}>
              <strong>{app.launchCount}</strong> execuções
            </span>
            {app.color && (
              <span className={styles.statPill}>
                <span className={styles.colorDot} style={{ background: app.color }} />
                {app.color}
              </span>
            )}
          </div>

          {app.tags && app.tags.length > 0 && (
            <div className={styles.tags}>
              {app.tags.map((tag) => (
                <span key={tag} className={styles.tag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleLaunch}>
          <IconPlay /> Executar
        </button>
        <button className={styles.btnGhost}>
          <IconEdit /> Editar
        </button>
        <div className={styles.divider} />
        <button
          className={styles.btnDanger}
          onClick={() => {
            handleDelete(app.id)
            navigate(-1)
          }}
        >
          <IconTrash /> Remover
        </button>
      </div>

      {/* Grid */}
      <div className={styles.grid}>
        {/* Main column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Path */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>
                <IconFolder />
              </span>
              <h2 className={styles.cardTitle}>Localização</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.pathBox}>
                <span className={styles.pathText}>{app.path}</span>
                <button
                  className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
                  onClick={handleCopyPath}
                  title="Copiar caminho"
                >
                  {copied ? <IconCheck /> : <IconCopy />}
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Estatísticas</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.statsRow}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Execuções</span>
                  <span className={styles.statValue}>{app.launchCount}</span>
                  <span className={styles.statSub}>total de aberturas</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Último uso</span>
                  <span className={styles.statValue} style={{ fontSize: 13, paddingTop: 4 }}>
                    {app.lastLaunched ? formatDate(app.lastLaunched) : '—'}
                  </span>
                  <span className={styles.statSub}>
                    {app.lastLaunched
                      ? new Date(app.lastLaunched).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                      : 'nunca usado'}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Tags</span>
                  <span className={styles.statValue}>{app.tags?.length ?? 0}</span>
                  <span className={styles.statSub}>etiquetas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardIcon}>
                <IconInfo />
              </span>
              <h2 className={styles.cardTitle}>Informações</h2>
            </div>
            <div className={styles.cardBody}>
              <div className={styles.infoList}>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>ID</span>
                  <span className={`${styles.infoVal} ${styles.accent}`}>{app.id.slice(0, 8)}…</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Categoria</span>
                  <span className={styles.infoVal}>{app.category}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Fixado</span>
                  <span className={styles.infoVal}>{app.pinned ? 'Sim' : 'Não'}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Adicionado</span>
                  <span className={styles.infoVal}>{formatDate(app.addedAt)}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Último uso</span>
                  <span className={styles.infoVal}>{formatDateTime(app.lastLaunched)}</span>
                </div>
                {app.color && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoKey}>Cor</span>
                    <span className={styles.infoVal}>
                      <span className={styles.colorDot} style={{ background: app.color }} />
                      {app.color}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Details
