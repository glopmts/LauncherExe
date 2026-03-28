import { ToastMessage } from '../../app'
import styles from './toast.module.scss'

interface Props {
  message: ToastMessage
}

const ICONS = {
  success: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  )
}

export function Toast({ message }: Props) {
  return (
    <div className={`${styles.toast} ${styles[message.type]}`}>
      <span className={styles.icon}>{ICONS[message.type]}</span>
      <span className={styles.text}>{message.text}</span>
    </div>
  )
}
