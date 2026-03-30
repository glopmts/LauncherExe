import { useEffect, useState } from 'react'
import { logger } from '../utils/logger'

interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

interface DownloadProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

type UpdateStatus = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error'

export function useUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [info, setInfo] = useState<UpdateInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Verificar se a API existe
    if (!window.electronAPI) {
      logger.error('Updater API not available')
      return
    }

    const api = window.electronAPI

    // Configurar listeners
    api.onChecking(() => {
      setStatus('checking')
      setError(null)
    })

    api.onAvailable((updateInfo: UpdateInfo) => {
      setStatus('available')
      setInfo(updateInfo)
    })

    api.onNotAvailable(() => {
      setStatus('idle')
    })

    api.onProgress((progressData: DownloadProgress) => {
      setStatus('downloading')
      setProgress(progressData.percent)
    })

    api.onDownloaded(() => {
      setStatus('ready')
    })

    api.onError((errorMsg: string) => {
      setStatus('error')
      setError(errorMsg)
    })

    // Cleanup
    return () => {
      // Remover listeners se necessário
    }
  }, [])

  const check = async () => {
    try {
      await window.electronAPI.check()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erro ao verificar atualização')
    }
  }

  const close = () => {
    setStatus('idle')
    setError(null)
    setInfo(null)
  }

  const download = async () => {
    try {
      await window.electronAPI.download()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Erro ao baixar atualização')
    }
  }

  const install = async () => {
    try {
      await window.electronAPI.install()
    } catch (err) {
      logger.error('Erro ao instalar:' + err)
    }
  }

  return {
    status,
    progress,
    info,
    error,
    close,
    check,
    download,
    install
  }
}
