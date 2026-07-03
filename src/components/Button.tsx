import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'

/*
 * Latón se reserva para la acción principal de cada contexto (variant
 * "primary"); el resto de las acciones usan "ghost" sobre trazo.
 */
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-laton text-nogal hover:bg-laton/85',
  ghost: 'border border-trazo text-sepia hover:text-pergamino',
}

export function Button({
  variant = 'ghost',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`rounded-xs px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  )
}
