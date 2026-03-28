import React, { ButtonHTMLAttributes } from 'react'
import { Link } from 'react-router-dom'
import styles from './button.module.scss'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type ButtonType = 'button' | 'submit' | 'reset' | 'link'

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  type?: ButtonType
  href?: string // Para tipo 'link'
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  children,
  ...rest
}) => {
  const classes = [styles.button, styles[variant], styles[size], className].filter(Boolean).join(' ')

  if (type === 'link') {
    const { href, ...linkProps } = rest
    const linkClasses = [styles.configLink, styles[variant], styles[size], className].filter(Boolean).join(' ')
    return (
      <Link to={href || ''} className={linkClasses} {...(linkProps as React.AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {children}
      </Link>
    )
  }

  return (
    <button className={classes} type={type as 'button' | 'submit' | 'reset'} {...rest}>
      {children}
    </button>
  )
}

export default Button
