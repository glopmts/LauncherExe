import { Link } from 'react-router-dom'
import styles from './not-found.module.scss'

const NotFound = () => {
  return (
    <div className={styles.content}>
      <h1>404 - Página Não Encontrada</h1>
      <p>A página que você está procurando não existe.</p>
      <Link to="/" className={styles.link}>
        Voltar para a página inicial
      </Link>
    </div>
  )
}

export default NotFound
