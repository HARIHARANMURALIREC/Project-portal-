import { forwardRef } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500/30 shadow-sm dark:bg-primary-500 dark:hover:bg-primary-400',
  secondary:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-300/50 dark:border-slate-600 dark:bg-app-surface dark:text-slate-200 dark:hover:bg-neutral-900',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/30 shadow-sm dark:bg-red-500 dark:hover:bg-red-400',
  ghost:
    'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-300/50 dark:text-slate-300 dark:hover:bg-neutral-900',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className = '', disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled}
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    />
  )
})
