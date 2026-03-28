import { useEffect, useState } from 'react'

type PerformanceMode = 'focused' | 'background' | 'hidden'

export function usePerformanceMode() {
  const [mode, setMode] = useState<PerformanceMode>('focused')

  useEffect(() => {
    // Escutar mudanças de performance do main process
    if (window.electronAPI?.onPerformanceMode) {
      window.electronAPI.onPerformanceMode(setMode)
    }

    // Também escutar visibility API do navegador
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setMode('hidden')
      } else if (!document.hasFocus()) {
        setMode('background')
      } else {
        setMode('focused')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('blur', () => setMode('background'))
    window.addEventListener('focus', () => setMode('focused'))

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('blur', () => setMode('background'))
      window.removeEventListener('focus', () => setMode('focused'))
    }
  }, [])

  return mode
}
