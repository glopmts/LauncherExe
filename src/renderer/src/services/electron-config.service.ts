interface Settings {
  autoLaunch?: boolean
  theme?: 'light' | 'dark' | 'system'
  notificationsEnabled?: boolean
  [key: string]: unknown
}

class ElectronConfigService {
  private static instance: ElectronConfigService

  static getInstance(): ElectronConfigService {
    if (!ElectronConfigService.instance) {
      ElectronConfigService.instance = new ElectronConfigService()
    }
    return ElectronConfigService.instance
  }

  async setAutoLaunch(enabled: boolean): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        console.warn('electronAPI API não disponível')
        return false
      }

      const result = await window.electronAPI.setAutoLaunch(enabled)
      return result.success
    } catch (error) {
      console.error('Erro ao configurar auto launch:', error)
      return false
    }
  }

  async getAutoLaunchStatus(): Promise<boolean> {
    try {
      if (!window.electronAPI) {
        return false
      }

      const result = await window.electronAPI.getAutoLaunchStatus()
      return result.enabled || false
    } catch (error) {
      console.error('Erro ao obter status do auto launch:', error)
      return false
    }
  }

  async requestNotificationPermission(): Promise<boolean> {
    try {
      // Running inside Electron — notifications are always granted
      if (window.electronAPI) {
        return true
      }

      // Fallback: plain browser context (dev server without Electron)
      if (!('Notification' in window)) return false
      if (Notification.permission === 'granted') return true
      if (Notification.permission === 'denied') return false

      const result = await Notification.requestPermission()
      return result === 'granted'
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificação:', error)
      return false
    }
  }

  async sendTestNotification(): Promise<void> {
    try {
      if (!window.electronAPI) {
        new Notification('Teste de Notificação', {
          body: 'Esta é uma notificação de teste do seu aplicativo!',
          icon: '/icon.png'
        })
        return
      }

      await window.electronAPI.showNotification({
        title: 'Teste de Notificação',
        body: 'Esta é uma notificação de teste do seu aplicativo!',
        silent: false
      })
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error)
    }
  }

  async saveSettings(settings: Partial<Settings>): Promise<boolean> {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings))

      if (window.electronAPI) {
        const result = await window.electronAPI.saveSettings(settings)
        return result.success
      }

      return true
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      return false
    }
  }

  async loadSettings(): Promise<Settings> {
    try {
      const localSettings = localStorage.getItem('app-settings')
      const settings: Settings = localSettings ? JSON.parse(localSettings) : {}

      if (window.electronAPI) {
        const electronSettings = await window.electronAPI.loadSettings()
        return { ...settings, ...electronSettings }
      }

      return settings
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      return {}
    }
  }

  // Função para abrir a pasta de dados
  async openAppDataFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API não disponível')
      }

      const result = await window.electronAPI.openAppDataFolder()
      if (!result.success) {
        throw new Error(result.error || 'Erro ao abrir pasta de dados')
      }

      const appDataPath = await this.getAppDataPath()

      return { success: true, path: appDataPath }
    } catch (error) {
      console.error('Erro ao abrir pasta de dados:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      return { success: false, error: errorMessage }
    }
  }

  // Função para obter o caminho da pasta de dados
  async getAppDataPath(): Promise<string> {
    try {
      if (!window.electronAPI) {
        throw new Error('Electron API não disponível')
      }

      const path = await window.electronAPI.getAppDataPath()
      return path
    } catch (error) {
      console.error('Erro ao obter caminho da pasta de dados:', error)
      return ''
    }
  }

  // Função adicional para acessar dados específicos
  async acessLocalData(): Promise<Settings> {
    try {
      if (!window.electronAPI) {
        console.warn('Electron API não disponível')
        return {}
      }

      // 1. Obter o caminho da pasta de dados
      const appDataPath = await window.electronAPI.getAppDataPath()
      console.log('Pasta de dados:', appDataPath)

      // 2. Carregar as configurações
      const settings = await window.electronAPI.loadSettings()
      console.log('Configurações carregadas:', settings)

      // 3. Opcional: Se você tiver um handler para listar arquivos, use-o
      // Se você implementar o listAppDataFiles no main e no preload, descomente abaixo
      // const files = await window.electronAPI.listAppDataFiles()
      // console.log('Arquivos na pasta:', files)

      return settings || {}
    } catch (error) {
      console.error('Erro ao acessar dados locais:', error)
      return {}
    }
  }
}

export const electronConfig = ElectronConfigService.getInstance()
