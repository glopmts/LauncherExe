import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { electronConfig } from '../../services/electron-config.service'
import styles from './config-page.module.scss'

interface ConfigOption {
  id: number
  name: string
  description: string
  isActive: boolean
  type: 'toggle' | 'button'
  handle: () => Promise<void> | void
}

const ConfigPage = () => {
  const navigate = useNavigate()

  const [options, setOptions] = useState<ConfigOption[]>([
    {
      id: 1,
      name: 'Notificações',
      description:
        'Gerencie suas preferências de notificações, incluindo alertas de mensagens, atualizações de status e lembretes.',
      isActive: true,
      type: 'toggle',
      handle: async () => {
        const option = options.find((opt) => opt.id === 1)
        if (option) {
          if (option.isActive) {
            await electronConfig.sendTestNotification()
          } else {
            await electronConfig.requestNotificationPermission()
          }
          await electronConfig.saveSettings({ notifications: option.isActive })
        }
      }
    },
    {
      id: 2,
      name: 'Privacidade',
      description:
        'Ajuste suas configurações de privacidade para controlar quem pode ver suas informações e atividades.',
      isActive: false,
      type: 'button',
      handle: () => {
        console.log('Abrir configurações de privacidade')
        // Aqui você pode abrir um modal ou navegar para outra página
      }
    },
    {
      id: 3,
      name: 'Inicializar com o sistema',
      description: 'Escolha se o aplicativo deve iniciar automaticamente quando você ligar seu computador.',
      isActive: false,
      type: 'toggle',
      handle: async () => {
        const option = options.find((opt) => opt.id === 3)
        if (option) {
          const success = await electronConfig.setAutoLaunch(option.isActive)
          if (success) {
            await electronConfig.saveSettings({ autoLaunch: option.isActive })
          } else {
            // Reverter o estado se falhar
            option.isActive = !option.isActive
            setOptions([...options])
          }
        }
      }
    },
    {
      id: 4,
      name: 'Dados do Aplicativo',
      description: 'Acesse a pasta onde o aplicativo armazena suas configurações e dados locais.',
      isActive: false,
      type: 'button',
      handle: async () => {
        try {
          const result = await electronConfig.openAppDataFolder()
          if (result.success) {
            console.log('Pasta aberta com sucesso:', result.path)
          } else {
            console.error('Erro ao abrir pasta:', result.error)
          }
        } catch (error) {
          console.error('Erro ao abrir pasta de dados:', error)
        }
      }
    },
    {
      id: 5,
      name: 'Logs Aplicação',
      description: 'Acesse a pagina logs aplicativo',
      isActive: false,
      type: 'button',
      handle: async () => {
        navigate('/logs')
      }
    }
  ])

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testLocalData = async () => {
      const data = await electronConfig.acessLocalData()
      console.log('Dados locais:', data)
    }
    testLocalData()
  }, [])

  // Carregar configurações salvas
  useEffect(() => {
    const loadSavedSettings = async () => {
      try {
        setLoading(true)
        const settings = await electronConfig.loadSettings()
        const autoLaunchStatus = await electronConfig.getAutoLaunchStatus()
        setOptions((prevOptions) =>
          prevOptions.map((opt) => {
            if (opt.id === 1 && settings.notifications !== undefined) {
              return { ...opt, isActive: Boolean(settings.notifications) }
            }
            if (opt.id === 3) {
              return { ...opt, isActive: Boolean(autoLaunchStatus) }
            }
            return opt
          })
        )
      } catch (error) {
        console.error('Erro ao carregar configurações:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSavedSettings()
  }, [])

  const handleOptionToggle = async (optionId: number) => {
    const optionIndex = options.findIndex((opt) => opt.id === optionId)
    if (optionIndex === -1) return

    // Atualizar estado local primeiro para feedback imediato
    const updatedOptions = [...options]
    updatedOptions[optionIndex] = {
      ...updatedOptions[optionIndex],
      isActive: !updatedOptions[optionIndex].isActive
    }

    setOptions(updatedOptions)

    // Executar o handler da opção
    await updatedOptions[optionIndex].handle()
  }

  const handleOptionClick = async (optionId: number) => {
    const option = options.find((opt) => opt.id === optionId)
    if (option && option.type === 'button') {
      await option.handle()
    }
  }

  if (loading) {
    return (
      <div className={styles.configPage}>
        <div className={styles.loadingContainer}>
          <p>Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.configPage}>
      <div className={styles.header}>
        <h1>Configurações</h1>
        <p>Personalize sua experiência no aplicativo</p>
      </div>

      <div className={styles.configOptions}>
        {options.map((option) => (
          <div
            key={option.id}
            className={`${styles.configOption} ${option.isActive ? styles.active : ''}`}
            onClick={() => option.type === 'button' && handleOptionClick(option.id)}
          >
            <div className={styles.optionInfo}>
              <h2>{option.name}</h2>
              <p>{option.description}</p>
            </div>

            <div className={styles.optionControl}>
              {option.type === 'toggle' ? (
                <button
                  className={`${styles.toggleButton} ${option.isActive ? styles.active : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOptionToggle(option.id)
                  }}
                >
                  <span className={styles.toggleSlider}></span>
                  <span className={styles.toggleLabel}>{option.isActive ? 'Ativado' : 'Desativado'}</span>
                </button>
              ) : (
                <button
                  className={styles.actionButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleOptionClick(option.id)
                  }}
                >
                  Gerenciar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.footer}>
        <p className={styles.note}>Algumas configurações podem exigir reinicialização do aplicativo para ter efeito.</p>
      </div>
    </div>
  )
}

export default ConfigPage
